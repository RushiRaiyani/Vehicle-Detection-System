const express = require("express");
const { v4: uuidv4 } = require("uuid");
const auth = require("../middleware/auth");
const Collection = require("../models/Collection");
const User = require("../models/User");
const Log = require("../models/Log");

const router = express.Router();

// All collection routes require auth
router.use(auth);

// ─── LIST USER'S COLLECTIONS ─────────────────────────────────────────
router.get("/", async (req, res) => {
    try {
        const collections = await Collection.find({
            $or: [{ owner: req.user._id }, { members: req.user._id }],
        })
            .populate("owner", "name email")
            .populate("members", "name email")
            .sort({ createdAt: -1 });

        // attach log counts
        const result = await Promise.all(
            collections.map(async (col) => {
                const logsCount = await Log.countDocuments({ collectionId: col._id });
                return { ...col.toObject(), logsCount };
            })
        );

        res.json({ collections: result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── GET SINGLE COLLECTION ──────────────────────────────────────────
router.get("/:id", async (req, res) => {
    try {
        const collection = await Collection.findById(req.params.id)
            .populate("owner", "name email")
            .populate("members", "name email");

        if (!collection) {
            return res.status(404).json({ error: "Collection not found" });
        }

        const logsCount = await Log.countDocuments({ collectionId: collection._id });

        res.json({ collection: { ...collection.toObject(), logsCount } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── CREATE COLLECTION ───────────────────────────────────────────────
router.post("/", async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: "Collection name is required" });

        // Generate unique 8-char group code
        const groupCode = uuidv4().split("-")[0].toUpperCase();

        const collection = await Collection.create({
            name,
            owner: req.user._id,
            groupCode,
            members: [req.user._id],
        });

        // Add to user's joined collections
        await User.findByIdAndUpdate(req.user._id, {
            $addToSet: { joinedCollections: collection._id },
        });

        const populated = await Collection.findById(collection._id)
            .populate("owner", "name email")
            .populate("members", "name email");

        res.status(201).json({ collection: { ...populated.toObject(), logsCount: 0 } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── JOIN COLLECTION ─────────────────────────────────────────────────
router.post("/join", async (req, res) => {
    try {
        const { groupCode } = req.body;
        if (!groupCode) return res.status(400).json({ error: "Group code is required" });

        const collection = await Collection.findOne({ groupCode: groupCode.toUpperCase() });
        if (!collection) return res.status(404).json({ error: "Invalid group code" });

        // Check if already a member
        if (collection.members.includes(req.user._id)) {
            return res.status(400).json({ error: "You are already a member of this collection" });
        }

        collection.members.push(req.user._id);
        await collection.save();

        await User.findByIdAndUpdate(req.user._id, {
            $addToSet: { joinedCollections: collection._id },
        });

        const populated = await Collection.findById(collection._id)
            .populate("owner", "name email")
            .populate("members", "name email");

        const logsCount = await Log.countDocuments({ collectionId: collection._id });

        res.json({ collection: { ...populated.toObject(), logsCount } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── DELETE COLLECTION (owner only) ──────────────────────────────────
router.delete("/:id", async (req, res) => {
    try {
        const collection = await Collection.findById(req.params.id);
        if (!collection) return res.status(404).json({ error: "Collection not found" });

        if (collection.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: "Only the owner can delete a collection" });
        }

        // Remove collection from all members' joinedCollections
        await User.updateMany(
            { joinedCollections: collection._id },
            { $pull: { joinedCollections: collection._id } }
        );

        // Delete all logs in the collection
        await Log.deleteMany({ collectionId: collection._id });

        await Collection.findByIdAndDelete(req.params.id);

        res.json({ message: "Collection deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
