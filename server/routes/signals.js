import express from "express";
import Signal from "../models/Signal.js";
import requireAuth from "../middleware/requireAuth.js";
import requireRoomActive from "../middleware/requireRoomActive.js";
import { getUserApartments } from "../src/utils/apartments.js";

const router = express.Router();

router.get("/", requireAuth, requireRoomActive, async (req, res) => {
  try {
    const isManager = req.user.role === "manager";
    const filter = { roomId: req.user.roomId };

    if (!isManager) {
      filter.createdBy = req.user._id;
    }

    const signals = await Signal.find(filter)
      .sort({ createdAt: -1 })
      .populate("createdBy", "name email apartment apartments entrance");

    res.json(signals);
  } catch (err) {
    res.status(500).json({ message: "Грешка при зареждане на сигналите", error: err.message });
  }
});

router.post("/", requireAuth, requireRoomActive, async (req, res) => {
  try {
    const { title, description, floor, apartment } = req.body;
    if (!title || !description) return res.status(400).json({ message: "Липсват данни" });

    const ownedApartments = getUserApartments(req.user);
    const selectedApartment = String(apartment || "").trim();
    const fallbackApartment = ownedApartments[0] || String(req.user.apartment || "").trim();
    const apartmentForSignal = selectedApartment || fallbackApartment;

    if (selectedApartment && ownedApartments.length && !ownedApartments.includes(selectedApartment)) {
      return res.status(400).json({ message: "Можеш да подадеш сигнал само за свой апартамент." });
    }

    const signal = await Signal.create({
      roomId: req.user.roomId,
      building: req.user.building || "",
      entrance: (req.user.entrance || "").trim().toUpperCase(),
      floor: String(floor || "").trim(),
      apartment: apartmentForSignal,
      title: String(title).trim(),
      description: String(description).trim(),
      visibility: "private",
      createdBy: req.user._id,
    });

    res.status(201).json({ message: "Сигналът е изпратен!", signal });
  } catch (err) {
    res.status(500).json({ message: "Грешка при създаване на сигнала", error: err.message });
  }
});

router.put("/:id", requireAuth, requireRoomActive, async (req, res) => {
  try {
    if (req.user.role !== "manager") return res.status(403).json({ message: "Нямате права" });

    const patch = {};
    if (req.body.status) patch.status = req.body.status;
    if (req.body.visibility && ["room", "private"].includes(req.body.visibility)) {
      patch.visibility = req.body.visibility;
    }

    const updated = await Signal.findOneAndUpdate(
      { _id: req.params.id, roomId: req.user.roomId },
      patch,
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Сигналът не е намерен" });

    res.json({ message: "Сигналът е обновен", signal: updated });
  } catch (err) {
    res.status(500).json({ message: "Грешка при обновяване", error: err.message });
  }
});

export default router;
