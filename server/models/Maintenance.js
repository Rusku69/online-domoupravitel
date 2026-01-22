import mongoose from "mongoose";

const maintenanceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },       // Пример: "Не свети лампата"
    description: { type: String, required: true }, // Подробности
    status: { 
      type: String, 
      enum: ["new", "in-progress", "resolved"], 
      default: "new" 
    },                                             // Състояние на заявката
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Кой е подал
  },
  { timestamps: true }
);

export default mongoose.model("Maintenance", maintenanceSchema);
