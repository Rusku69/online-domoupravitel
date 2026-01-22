import mongoose from "mongoose";

const apartmentSchema = new mongoose.Schema(
  {
    number: { type: String, required: true }, // Номер на апартамента (напр. "12")
    floor: { type: Number, required: true },  // Етаж
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Собственик
    residents: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Допълнителни живущи
  },
  { timestamps: true }
);

export default mongoose.model("Apartment", apartmentSchema);
