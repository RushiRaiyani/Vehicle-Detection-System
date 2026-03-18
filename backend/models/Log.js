const mongoose = require("mongoose");

const logSchema = new mongoose.Schema(
    {
        vehicleNumber: { type: String, required: true, trim: true },
        detectedAt: { type: Date, default: Date.now },
        detectedByUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        collectionId: { type: mongoose.Schema.Types.ObjectId, ref: "Collection", required: true },
        sourceType: { type: String, enum: ["image", "video"], required: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Log", logSchema);
