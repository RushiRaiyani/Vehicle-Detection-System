const express = require("express");
const auth = require("../middleware/auth");
const Log = require("../models/Log");

const router = express.Router();
router.use(auth);

// ─── GET LOGS FOR A COLLECTION ───────────────────────────────────────
router.get("/:collectionId", async (req, res) => {
    try {
        const logs = await Log.find({ collectionId: req.params.collectionId })
            .populate("detectedByUser", "name email")
            .sort({ detectedAt: -1 });

        res.json({ logs });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── CREATE LOG ENTRIES (batch) ──────────────────────────────────────
router.post("/", async (req, res) => {
    try {
        const { plates, collectionId, sourceType } = req.body;

        if (!plates || !Array.isArray(plates) || plates.length === 0) {
            return res.status(400).json({ error: "Plates array is required" });
        }
        if (!collectionId) return res.status(400).json({ error: "Collection ID is required" });
        if (!sourceType) return res.status(400).json({ error: "Source type is required" });

        const logEntries = plates
            .filter((p) => p.text && p.text !== "NOT_READABLE")
            .map((p) => ({
                vehicleNumber: p.text,
                detectedByUser: req.user._id,
                collectionId,
                sourceType,
                detectedAt: new Date(),
            }));

        if (logEntries.length === 0) {
            return res.status(400).json({ error: "No readable plates to save" });
        }

        const logs = await Log.insertMany(logEntries);
        res.status(201).json({ logs, count: logs.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── DELETE A SINGLE LOG ─────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
    try {
        const log = await Log.findByIdAndDelete(req.params.id);
        if (!log) return res.status(404).json({ error: "Log not found" });
        res.json({ message: "Log deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
