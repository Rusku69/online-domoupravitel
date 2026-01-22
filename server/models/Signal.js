import mongoose from "mongoose";

const signalSchema = new mongoose.Schema(
  {
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true }, // ✅ важно

    building: { type: String, default: "" },
    entrance: { type: String, default: "" },
    apartment: { type: String, default: "" },
    floor: { type: String, default: "" },
    visibility: { type: String, enum: ["room", "private"], default: "room" },

    title: { type: String, required: true },
    description: { type: String, required: true },

    status: {
      type: String,
      enum: ["open", "in-progress", "resolved"],
      default: "open",
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Signal", signalSchema);
