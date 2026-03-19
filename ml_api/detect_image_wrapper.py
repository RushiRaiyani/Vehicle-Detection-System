import os
import re
import uuid
import cv2
import torch
import numpy as np
import easyocr
from ultralytics import YOLO

# ─── paths ─────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))  # ml_api folder
MODEL_PATH = os.path.join(BASE_DIR, "runs/detect/license_plate_detector/weights/best.pt")
OUTPUT_DIR = os.path.join(BASE_DIR, "output")

YOLO_CONF_THRESH = 0.25
OCR_CONF_THRESH = 0.20
PAD_RATIO = 0.08

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(os.path.join(OUTPUT_DIR, "crops"), exist_ok=True)

# ─── lazy-loaded globals ───────────────────────────────
_model = None
_reader = None

def _get_model():
    global _model
    if _model is None:
        print("[ML_API] Loading YOLO model from:", MODEL_PATH)
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(f"YOLO model not found at {MODEL_PATH}")
        _model = YOLO(MODEL_PATH)
    return _model

def _get_reader():
    global _reader
    if _reader is None:
        print("[ML_API] Initializing EasyOCR reader (CPU mode)")
        _reader = easyocr.Reader(["en"], gpu=False)  # Force CPU for Render
    return _reader

# ─── helpers ──────────────────────────────────────────
def add_padding(xyxy, img_shape, pad_ratio):
    x1, y1, x2, y2 = map(int, xyxy)
    pad_x = int((x2 - x1) * pad_ratio)
    pad_y = int((y2 - y1) * pad_ratio)
    x1 = max(0, x1 - pad_x)
    x2 = min(img_shape[1], x2 + pad_x)
    y1 = max(0, y1 - pad_y)
    y2 = min(img_shape[0], y2 + pad_y)
    return x1, y1, x2, y2

def warp_plate(img, xyxy):
    x1, y1, x2, y2 = xyxy
    width, height = x2 - x1, y2 - y1
    pts1 = np.float32([[x1, y1], [x2, y1], [x1, y2], [x2, y2]])
    pts2 = np.float32([[0, 0], [width, 0], [0, height], [width, height]])
    M = cv2.getPerspectiveTransform(pts1, pts2)
    return cv2.warpPerspective(img, M, (width, height))

def preprocess_plate(cropped_img):
    gray = cv2.cvtColor(cropped_img, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape
    gray = cv2.resize(gray, (w*2, h*2))
    gray = cv2.fastNlMeansDenoising(gray, h=10)
    gray = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                 cv2.THRESH_BINARY, 11, 2)
    return gray

def clean_text(text):
    text = text.upper()
    text = re.sub(r"[^A-Z0-9]", "", text)
    return text

def ocr_plate(cropped_img):
    reader = _get_reader()
    try:
        processed = preprocess_plate(cropped_img)
        results = reader.readtext(processed)
        for _, detected_text, conf in results:
            if conf > OCR_CONF_THRESH:
                cleaned = clean_text(detected_text)
                if len(cleaned) >= 4:
                    return cleaned
        results = reader.readtext(cropped_img)
        for _, detected_text, conf in results:
            if conf > OCR_CONF_THRESH:
                cleaned = clean_text(detected_text)
                if len(cleaned) >= 4:
                    return cleaned
    except Exception as e:
        print("[ML_API] OCR failed:", e)
    return ""

# ─── main pipeline ─────────────────────────────────────
def detect_image(image_path: str) -> dict:
    print("[ML_API] Detecting image:", image_path)
    model = _get_model()
    device = "cpu"
    print("[ML_API] Using device:", device)

    results = model.predict(image_path, imgsz=640, conf=YOLO_CONF_THRESH,
                            device=device, save=False)

    plates = []
    output_filename = f"{uuid.uuid4().hex}.jpg"
    output_path = os.path.join(OUTPUT_DIR, output_filename)

    for result in results:
        img = result.orig_img.copy()
        for det in result.boxes:
            try:
                xyxy = det.xyxy[0].cpu().numpy()
                conf = float(det.conf[0])
                xyxy_padded = add_padding(xyxy, img.shape, PAD_RATIO)
                x1, y1, x2, y2 = xyxy_padded

                cropped_plate = warp_plate(img, xyxy_padded)
                if cropped_plate.size == 0:
                    continue

                plate_text = ocr_plate(cropped_plate)

                cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 2)
                label = plate_text if plate_text else "NOT_READABLE"
                cv2.putText(img, label, (x1, max(y1-10,0)),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0,255,0),2)

                plates.append({"text": plate_text if plate_text else "NOT_READABLE",
                               "confidence": round(conf, 4)})

            except Exception as e:
                print("[ML_API] Error processing box:", e)

    cv2.imwrite(output_path, img)
    print("[ML_API] Output saved to:", output_path)
    return {"plates": plates, "outputFileName": output_filename}
