import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },   // име на файла
    path: { type: String, required: true },       // път в сървъра
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" } // кой го е качил
  },
  { timestamps: true }
);

export default mongoose.model("File", fileSchema);
