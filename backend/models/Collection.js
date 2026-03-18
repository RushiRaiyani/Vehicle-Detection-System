const mongoose = require("mongoose");

const collectionSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        groupCode: { type: String, required: true, unique: true },
        members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    },
    { timestamps: true }
);

module.exports = mongoose.model("Collection", collectionSchema);
