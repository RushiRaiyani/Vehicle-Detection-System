const express = require("express");
const multer = require("multer");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const auth = require("../middleware/auth");

const router = express.Router();
// router.use(auth); // Make detection routes public

// Multer config – store in backend/uploads/
const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    //Where to save the file
    destination: (_req, _file, cb) => cb(null, uploadDir),
    // What to name the saved file
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 200 * 1024 * 1024 } }); // 200 MB

const ML_API = process.env.ML_API_URL || "http://127.0.0.1:5000";

// ─── DETECT IMAGE ────────────────────────────────────────────────────
router.post("/image", upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    try {
        const form = new FormData();

        //Reads the uploaded file from disk and Prepares the file to send to Flask ML API
        form.append("file", fs.createReadStream(req.file.path), req.file.originalname);

        // Sends a POST request to Flask /detect/image
        const response = await axios.post(`${ML_API}/detect/image`, form, {
            headers: form.getHeaders(),
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
        });

        res.json(response.data);
    } catch (err) {
        const msg = err.response?.data?.error || err.message;
        res.status(500).json({ error: `ML API error: ${msg}` });
    } finally {
        // clean up uploaded file
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    }
});

// ─── DETECT VIDEO (non-streaming fallback) ───────────────────────────
router.post("/video", upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    try {
        const form = new FormData();
        form.append("file", fs.createReadStream(req.file.path), req.file.originalname);

        const response = await axios.post(`${ML_API}/detect/video`, form, {
            headers: form.getHeaders(),
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 600000, // 10 min timeout for long videos
        });

        res.json(response.data);
    } catch (err) {
        // User-friendly error for timeouts / long videos
        if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
            return res.status(408).json({
                error: "The uploaded video is too long and processing timed out. Please use a shorter video (under 2 minutes recommended)."
            });
        }
        const msg = err.response?.data?.error || err.message;
        res.status(500).json({ error: `ML API error: ${msg}` });
    } finally {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    }
});

// ─── DETECT VIDEO SSE STREAM ─────────────────────────────────────────
router.post("/video/stream", upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // Set SSE headers
    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
    });

    try {
        const form = new FormData();
        form.append("file", fs.createReadStream(req.file.path), req.file.originalname);

        const response = await axios.post(`${ML_API}/detect/video/stream`, form, {
            headers: form.getHeaders(),
            responseType: "stream",
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 0, // no timeout for streaming
        });

        // Pipe the SSE stream from Flask directly to the client
        response.data.on("data", (chunk) => {
            res.write(chunk);
        });

        response.data.on("end", () => {
            res.end();
        });

        response.data.on("error", (err) => {
            const errorEvent = `event: error\ndata: ${JSON.stringify({ error: "Stream interrupted: " + err.message })}\n\n`;
            res.write(errorEvent);
            res.end();
        });

        // Handle client disconnect
        req.on("close", () => {
            response.data.destroy();
        });

    } catch (err) {
        const msg = err.code === "ECONNABORTED"
            ? "The uploaded video is too long. Please use a shorter video."
            : (err.response?.data?.error || err.message || "Video processing failed");

        const errorEvent = `event: error\ndata: ${JSON.stringify({ error: msg })}\n\n`;
        res.write(errorEvent);
        res.end();
    } finally {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    }
});

// ─── SERVE OUTPUT FILE (proxy to ML API) ─────────────────────────────
router.get("/output/:filename", async (req, res) => {
    try {
        const response = await axios.get(`${ML_API}/output/${req.params.filename}`, {
            responseType: "stream",
        });

        // Forward content-type
        res.set("Content-Type", response.headers["content-type"]);
        res.set("Content-Disposition", `attachment; filename="${req.params.filename}"`);
        response.data.pipe(res);
    } catch (err) {
        res.status(404).json({ error: "Output file not found" });
    }
});

module.exports = router;
