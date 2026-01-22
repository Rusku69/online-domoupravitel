import express from "express";
import Announcement from "../models/Announcement.js";
import requireAuth from "../middleware/requireAuth.js";
import requireRoomActive from "../middleware/requireRoomActive.js";

const router = express.Router();

// ✅ всички обяви само за стаята (и само ако входът е активен + approved member)
router.get("/", requireAuth, requireRoomActive, async (req, res) => {
  try {
    const announcements = await Announcement.find({ roomId: req.user.roomId })
      .populate("createdBy", "name email role")
      .sort({ createdAt: -1 });

    res.json(announcements);
  } catch (err) {
    res.status(500).json({ message: "Грешка при зареждане на обяви", error: err.message });
  }
});

// ✅ само manager може да създава
router.post("/", requireAuth, requireRoomActive, async (req, res) => {
  try {
    if (req.user.role !== "manager") {
      return res.status(403).json({ message: "Само домоуправител може да публикува" });
    }

    const { title, content } = req.body;
    if (!title || !content) return res.status(400).json({ message: "Липсва заглавие/съдържание" });

    const announcement = await Announcement.create({
      roomId: req.user.roomId,
      title,
      content,
      createdBy: req.user._id,
    });

    res.status(201).json({ message: "Обявата е публикувана!", announcement });
  } catch (err) {
    res.status(500).json({ message: "Грешка при създаване", error: err.message });
  }
});

// ✅ update (само manager)
router.put("/:id", requireAuth, requireRoomActive, async (req, res) => {
  try {
    if (req.user.role !== "manager") {
      return res.status(403).json({ message: "Само домоуправител може да редактира" });
    }

    const { title, content } = req.body;

    const updated = await Announcement.findOneAndUpdate(
      { _id: req.params.id, roomId: req.user.roomId },
      { title, content },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Не е намерена" });

    res.json({ message: "Обновено", announcement: updated });
  } catch (err) {
    res.status(500).json({ message: "Грешка при редакция", error: err.message });
  }
});

// ✅ delete (само manager)
router.delete("/:id", requireAuth, requireRoomActive, async (req, res) => {
  try {
    if (req.user.role !== "manager") {
      return res.status(403).json({ message: "Само домоуправител може да трие" });
    }

    const deleted = await Announcement.findOneAndDelete({
      _id: req.params.id,
      roomId: req.user.roomId,
    });

    if (!deleted) return res.status(404).json({ message: "Не е намерена" });

    res.json({ message: "Изтрита" });
  } catch (err) {
    res.status(500).json({ message: "Грешка при изтриване", error: err.message });
  }
});

export default router;
