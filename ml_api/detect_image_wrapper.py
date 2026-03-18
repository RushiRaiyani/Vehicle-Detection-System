import os
import re
import uuid
from pathlib import Path

import cv2
import torch
import numpy as np
import easyocr
from ultralytics import YOLO

# ─── paths (relative to the project root, one level up from ml_api/) ───
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "runs", "detect", "license_plate_detector", "weights", "best.pt")
OUTPUT_DIR = os.path.join(BASE_DIR, "ml_api", "output")

YOLO_CONF_THRESH = 0.25
OCR_CONF_THRESH = 0.20
PAD_RATIO = 0.08

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


# ─── helpers (from image_detection.ipynb) ─────────────────────────────
def add_padding(xyxy, img_shape, pad_ratio):
    # (x1, y1) → top-left corner of the box
    # (x2, y2) → bottom-right corner of the box
    x1, y1, x2, y2 = map(int, xyxy)
    pad_x = int((x2 - x1) * pad_ratio) # here x2-x1(width)* pad ratio which is for how much percent we want to add padding
    pad_y = int((y2 - y1) * pad_ratio)
    x1 = max(0, x1 - pad_x) #don’t go left of image boundary (0)
    x2 = min(img_shape[1], x2 + pad_x) # don’t go past right edge
    y1 = max(0, y1 - pad_y)
    y2 = min(img_shape[0], y2 + pad_y)
    return x1, y1, x2, y2


def warp_plate(img, xyxy):
    x1, y1, x2, y2 = xyxy
    width = x2 - x1
    height = y2 - y1
    pts1 = np.float32([[x1, y1], [x2, y1], [x1, y2], [x2, y2]]) # four corners of the detected plate in the original image
    pts2 = np.float32([[0, 0], [width, 0], [0, height], [width, height]]) # Define destination points (new rectangular shape)
    M = cv2.getPerspectiveTransform(pts1, pts2) # calculates a matrix M that maps pts1 → pts2
    warped = cv2.warpPerspective(img, M, (width, height))
    return warped


def preprocess_plate(cropped_img):
    gray = cv2.cvtColor(cropped_img, cv2.COLOR_BGR2GRAY) # OCR works best with black and white(so, Convert to grayscale)
    h, w = gray.shape
    gray = cv2.resize(gray, (w * 2, h * 2)) # Makes the image twice as large
    gray = cv2.fastNlMeansDenoising(gray, h=10) #Removes background noise or speckles
    # Letters → black, background → white (or vice versa)
    gray = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
    )
    return gray


def clean_text(text):
    text = text.upper()
    text = re.sub(r"[^A-Z0-9]", "", text)
    return text


def ocr_plate(cropped_img):
    reader = _get_reader() # Lazy loads EasyOCR
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
    return ""


# ─── main pipeline ────────────────────────────────────────────────────
def detect_image(image_path: str) -> dict:
    """
    Run plate detection on a single image.
    Returns: {plates: [{text, confidence}], outputImagePath: str}
    """
    model = _get_model()
    device = "cuda" if torch.cuda.is_available() else "cpu"

    # YOLO predicts bounding boxes where license plates appear
    # resizes the image for model input(640)
    results = model.predict(
        image_path, imgsz=640, conf=YOLO_CONF_THRESH, device=device, save=False
    )

    plates = []
    output_filename = f"{uuid.uuid4().hex}.jpg"
    output_path = os.path.join(OUTPUT_DIR, output_filename)

    for result in results:
        img = result.orig_img.copy()

        for det in result.boxes:
            xyxy = det.xyxy[0].cpu().numpy() # bounding box coordinates
            conf = float(det.conf[0])

            # Adds a small margin around the detected plate, so that OCR not cut off edges of letters
            xyxy_padded = add_padding(xyxy, img.shape, PAD_RATIO)
            x1, y1, x2, y2 = xyxy_padded

            # warp_plate transforms the plate into a rectangle (cropped image of just plate)
            cropped_plate = warp_plate(img, xyxy_padded)
            if cropped_plate.size == 0:
                continue

            plate_text = ocr_plate(cropped_plate)

            # Draws a green box around the detected plate(annotate image and put text of ocr above it)
            cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 2)
            label = plate_text if plate_text else "NOT READABLE"
            cv2.putText(
                img, label, (x1, max(y1 - 10, 0)),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2,
            )

            plates.append({"text": plate_text if plate_text else "NOT_READABLE", "confidence": round(conf, 4)})

        cv2.imwrite(output_path, img)

    return {"plates": plates, "outputFileName": output_filename}
