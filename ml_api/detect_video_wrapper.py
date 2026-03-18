"""
Video detection wrapper — reuses logic from fixed_video_detection.ipynb
Does NOT modify any existing ML files.
"""

import os
import re
import uuid
from collections import Counter

import cv2
import torch
import numpy as np
import easyocr
from ultralytics import YOLO

# ─── paths ────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))  # ml_api folder
MODEL_PATH = os.path.join(BASE_DIR, "runs/detect/license_plate_detector/weights/best.pt")
OUTPUT_DIR = os.path.join(BASE_DIR, "ml_api", "output")

YOLO_CONF = 0.25
PAD_RATIO = 0.1
MIN_PLATE_AREA = 2500
OCR_FRAME_SKIP = 3

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(os.path.join(OUTPUT_DIR, "crops"), exist_ok=True)

# ─── lazy-loaded globals ─────────────────────────────────────────────
_model = None
_reader = None


def _get_model():
    global _model
    if _model is None:
        _model = YOLO(MODEL_PATH)
    return _model


def _get_reader():
    global _reader
    if _reader is None:
        _reader = easyocr.Reader(["en"], gpu=torch.cuda.is_available())
    return _reader


# ─── helpers (from fixed_video_detection.ipynb) ───────────────────────
def add_padding(xyxy, shape, ratio):
    x1, y1, x2, y2 = map(int, xyxy)
    pad_x = int((x2 - x1) * ratio)
    pad_y = int((y2 - y1) * ratio)
    x1 = max(0, x1 - pad_x)
    y1 = max(0, y1 - pad_y)
    x2 = min(shape[1], x2 + pad_x)
    y2 = min(shape[0], y2 + pad_y)
    return x1, y1, x2, y2


def preprocess_plate(img):
    h, w = img.shape[:2]
    if w < 200:
        img = cv2.resize(img, (w * 2, h * 2), interpolation=cv2.INTER_CUBIC)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.bilateralFilter(gray, 11, 17, 17)
    thresh = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 15, 3
    )
    return thresh


def ocr_plate(img):
    reader = _get_reader()
    img_processed = preprocess_plate(img)
    results = reader.readtext(img_processed)
    texts = []
    for _, text, conf in results:
        if conf > 0.4:
            cleaned = re.sub(r"[^A-Z0-9]", "", text.upper())
            if len(cleaned) >= 5:
                texts.append(cleaned)
    if len(texts) == 0:
        return "NOT_READABLE"
    return texts[0]


def vote_plate(texts):
    cleaned = []
    for t in texts:
        t = re.sub(r"[^A-Z0-9]", "", t.upper())
        if len(t) >= 5:
            cleaned.append(t)
    if len(cleaned) == 0:
        return "NOT_READABLE"
    counter = Counter(cleaned)
    return counter.most_common(1)[0][0]


# ─── SSE streaming pipeline ───────────────────────────────────────────
def detect_video_stream(video_path: str):
    """
    Generator that yields SSE-formatted events as plates are detected.
    Events: plate, progress, done, error
    """
    import json

    model = _get_model()

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        yield f"event: error\ndata: {json.dumps({'error': 'Could not open video file'})}\n\n"
        return

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    output_filename = f"{uuid.uuid4().hex}.mp4"
    output_path = os.path.join(OUTPUT_DIR, output_filename)

    writer = cv2.VideoWriter(
        output_path, cv2.VideoWriter_fourcc(*"mp4v"), fps, (width, height)
    )

    tracks = {}
    emitted_tracks = set()  # track IDs already sent to client
    frame_idx = 0
    FINALIZE_GAP = 30  # frames without seeing a track → finalize it
    last_seen = {}  # track_id → last frame_idx seen

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        results = model.track(
            frame, conf=YOLO_CONF, persist=True, tracker="bytetrack.yaml"
        )

        seen_this_frame = set()

        for r in results:
            if r.boxes is None:
                continue
            for box in r.boxes:
                if box.id is None:
                    continue
                track_id = int(box.id[0])
                seen_this_frame.add(track_id)
                last_seen[track_id] = frame_idx

                xyxy = box.xyxy[0].cpu().numpy()
                x1, y1, x2, y2 = add_padding(xyxy, frame.shape, PAD_RATIO)
                crop = frame[y1:y2, x1:x2]
                if crop.size == 0:
                    continue
                area = (x2 - x1) * (y2 - y1)

                if track_id not in tracks:
                    tracks[track_id] = {
                        "ocr_results": [],
                        "best_crop": crop,
                        "best_area": area,
                    }

                if area > tracks[track_id]["best_area"]:
                    tracks[track_id]["best_area"] = area
                    tracks[track_id]["best_crop"] = crop

                if area > MIN_PLATE_AREA and frame_idx % OCR_FRAME_SKIP == 0:
                    plate_text = ocr_plate(crop)
                    if plate_text != "NOT_READABLE":
                        tracks[track_id]["ocr_results"].append(plate_text)

                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                cv2.putText(
                    frame, f"ID {track_id}", (x1, y1 - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2,
                )

        writer.write(frame)
        frame_idx += 1

        # Finalize tracks that haven't been seen for FINALIZE_GAP frames
        for tid in list(tracks.keys()):
            if tid in emitted_tracks:
                continue
            if tid not in seen_this_frame and (frame_idx - last_seen.get(tid, 0)) > FINALIZE_GAP:
                plate = vote_plate(tracks[tid]["ocr_results"])
                if plate != "NOT_READABLE":
                    emitted_tracks.add(tid)
                    yield f"event: plate\ndata: {json.dumps({'text': plate, 'trackId': tid, 'samplesUsed': len(tracks[tid]['ocr_results'])})}\n\n"

        # Progress event every 30 frames
        if frame_idx % 30 == 0:
            pct = round((frame_idx / total_frames * 100), 1) if total_frames > 0 else 0
            yield f"event: progress\ndata: {json.dumps({'frame': frame_idx, 'totalFrames': total_frames, 'percent': pct})}\n\n"

    cap.release()
    writer.release()

    # Emit any remaining un-emitted tracks
    for tid, data in tracks.items():
        if tid in emitted_tracks:
            continue
        plate = vote_plate(data["ocr_results"])
        if plate != "NOT_READABLE":
            emitted_tracks.add(tid)
            yield f"event: plate\ndata: {json.dumps({'text': plate, 'trackId': tid, 'samplesUsed': len(data['ocr_results'])})}\n\n"

    # Final done event
    all_plates = []
    for tid, data in tracks.items():
        plate = vote_plate(data["ocr_results"])
        all_plates.append({"text": plate, "trackId": tid, "samplesUsed": len(data["ocr_results"])})

    yield f"event: done\ndata: {json.dumps({'plates': all_plates, 'outputFileName': output_filename, 'totalFrames': frame_idx})}\n\n"


# ─── main pipeline (non-streaming fallback) ──────────────────────────
def detect_video(video_path: str) -> dict:
    """
    Process video, return detected plates and annotated output video path.
    Returns: {plates: [{text, trackId, samplesUsed}], outputFileName: str}
    """
    model = _get_model()

    cap = cv2.VideoCapture(video_path)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)

    output_filename = f"{uuid.uuid4().hex}.mp4"
    output_path = os.path.join(OUTPUT_DIR, output_filename)

    writer = cv2.VideoWriter(
        output_path, cv2.VideoWriter_fourcc(*"mp4v"), fps, (width, height)
    )

    tracks = {}
    frame_idx = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        results = model.track(
            frame, conf=YOLO_CONF, persist=True, tracker="bytetrack.yaml"
        )

        for r in results:
            if r.boxes is None:
                continue
            for box in r.boxes:
                if box.id is None:
                    continue
                track_id = int(box.id[0])
                xyxy = box.xyxy[0].cpu().numpy()
                x1, y1, x2, y2 = add_padding(xyxy, frame.shape, PAD_RATIO)
                crop = frame[y1:y2, x1:x2]
                if crop.size == 0:
                    continue
                area = (x2 - x1) * (y2 - y1)

                if track_id not in tracks:
                    tracks[track_id] = {
                        "ocr_results": [],
                        "best_crop": crop,
                        "best_area": area,
                    }

                if area > tracks[track_id]["best_area"]:
                    tracks[track_id]["best_area"] = area
                    tracks[track_id]["best_crop"] = crop

                if area > MIN_PLATE_AREA and frame_idx % OCR_FRAME_SKIP == 0:
                    plate_text = ocr_plate(crop)
                    if plate_text != "NOT_READABLE":
                        tracks[track_id]["ocr_results"].append(plate_text)

                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                cv2.putText(
                    frame, f"ID {track_id}", (x1, y1 - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2,
                )

        writer.write(frame)
        frame_idx += 1

    cap.release()
    writer.release()

    # ─── final results ────────────────────────────────────────────────
    plates = []
    for tid, data in tracks.items():
        plate = vote_plate(data["ocr_results"])
        plates.append({
            "text": plate,
            "trackId": tid,
            "samplesUsed": len(data["ocr_results"]),
        })

    return {"plates": plates, "outputFileName": output_filename}
