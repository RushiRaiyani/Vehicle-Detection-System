"""
Flask micro-service exposing ML detection endpoints.
Run: python app.py
"""

import os
import uuid
import json
from flask import Flask, request, jsonify, send_from_directory, Response
from flask_cors import CORS

from detect_image_wrapper import detect_image
from detect_video_wrapper import detect_video, detect_video_stream

app = Flask(__name__)
CORS(app)

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


# ─── IMAGE DETECTION ENDPOINT ─────────────────────────────────────────
@app.route("/detect/image", methods=["POST"])
def detect_image_route():
    # Check if a file was uploaded in the request
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    # Get the uploaded file
    file = request.files["file"]

    # Generate a unique filename for storing the file temporarily
    ext = os.path.splitext(file.filename)[1] or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    # Save the file to the server
    file.save(filepath)

    try:
        # Call the ML detection function for a single image
        result = detect_image(filepath)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        # Remove the uploaded file to keep server clean
        if os.path.exists(filepath):
            os.remove(filepath)


# ─── VIDEO DETECTION ENDPOINT ─────────────────────────────────────────
@app.route("/detect/video", methods=["POST"])
def detect_video_route():
    # Check if a file was uploaded
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    # Get the uploaded video file
    file = request.files["file"]

    # Generate a unique filename for temporary storage
    ext = os.path.splitext(file.filename)[1] or ".mp4"
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    # Save the video to the server
    file.save(filepath)

    try:
        # Call the ML detection function for videos
        result = detect_video(filepath)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        # Remove the uploaded video after processing
        if os.path.exists(filepath):
            os.remove(filepath)


# ─── VIDEO DETECTION STREAMING ENDPOINT ──────────────────────────────
@app.route("/detect/video/stream", methods=["POST"])
def detect_video_stream_route():
    """SSE endpoint – streams plate detections in real-time."""
    # Check if a file was uploaded
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    # Get the uploaded video file
    file = request.files["file"]

    # Generate unique filename for temporary storage
    ext = os.path.splitext(file.filename)[1] or ".mp4"
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    # Save video to server
    file.save(filepath)

    def generate():
        try:
            # Stream detection events from ML function
            for event in detect_video_stream(filepath):
                yield event
        except Exception as e:
            # Send error event if streaming fails
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"
        finally:
            # Clean up uploaded video after streaming
            if os.path.exists(filepath):
                os.remove(filepath)

    # Return the response as Server-Sent Events (SSE)
    return Response(
        generate(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


# ─── SERVE OUTPUT FILES ───────────────────────────────────────────────
@app.route("/output/<filename>", methods=["GET"])
def serve_output(filename):
    # Serve the annotated image/video file from output folder
    return send_from_directory(OUTPUT_DIR, filename)


if __name__ == "__main__":
    app.run()