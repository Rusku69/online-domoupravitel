import express from "express";
import jwt from "jsonwebtoken";
import Message from "../models/Message.js";
import User from "../models/User.js";

const router = express.Router();

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
    if (!token) return res.status(401).json({ message: "Няма токен" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(404).json({ message: "Потребителят не е намерен" });

    if (!user.roomId) return res.status(403).json({ message: "Нямате избрана стая" });
    if (user.memberStatus && user.memberStatus !== "approved") {
      return res.status(403).json({ message: "Профилът не е одобрен за стаята" });
    }

    req.user = user;
    next();
  } catch (e) {
    return res.status(403).json({ message: "Невалиден токен" });
  }
};

// ✅ Създаване на съобщение (само за стаята)
router.post("/", requireAuth, async (req, res) => {
  try {
    const { content, announcement } = req.body;
    if (!content) return res.status(400).json({ message: "Липсва съдържание" });

    const message = await Message.create({
      roomId: req.user.roomId,
      content,
      sender: req.user._id,
      announcement: announcement || null,
    });

    res.status(201).json({ message: "Съобщението е изпратено!", data: message });
  } catch (error) {
    res.status(500).json({ message: "Грешка при създаване на съобщение", error: error.message });
  }
});

// ✅ Вземане на съобщения (само за стаята + optional по announcement)
router.get("/", requireAuth, async (req, res) => {
  try {
    const { announcementId } = req.query;

    const filter = { roomId: req.user.roomId };
    if (announcementId) filter.announcement = announcementId;

    const messages = await Message.find(filter)
      .populate("sender", "name email")
      .populate("announcement", "title");

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Грешка при зареждане на съобщения", error: error.message });
  }
});

// ✅ Изтриване (само manager, само стая)
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    if (req.user.role !== "manager") {
      return res.status(403).json({ message: "Само домоуправител може да трие съобщения" });
    }

    const { id } = req.params;
    const deleted = await Message.findOneAndDelete({ _id: id, roomId: req.user.roomId });

    if (!deleted) return res.status(404).json({ message: "Съобщението не е намерено" });

    res.json({ message: "Съобщението е изтрито успешно" });
  } catch (error) {
    res.status(500).json({ message: "Грешка при изтриване на съобщение", error: error.message });
  }
});

export default router;
