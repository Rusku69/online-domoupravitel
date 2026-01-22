import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    content: { type: String, required: true },   // Съобщението
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Кой го е пратил
    announcement: { type: mongoose.Schema.Types.ObjectId, ref: "Announcement", default: null } // По избор - под коя обява е
  },
  { timestamps: true }
);

export default mongoose.model("Message", messageSchema);
