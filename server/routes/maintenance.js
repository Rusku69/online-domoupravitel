import express from "express";
import jwt from "jsonwebtoken";
import Maintenance from "../models/Maintenance.js";
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

// ✅ Създаване на заявка (в стаята)
router.post("/", requireAuth, async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title || !description) return res.status(400).json({ message: "Липсват данни" });

    const request = await Maintenance.create({
      roomId: req.user.roomId,
      title,
      description,
      createdBy: req.user._id,
      status: "open",
    });

    res.status(201).json({ message: "Заявката е подадена!", request });
  } catch (error) {
    res.status(500).json({ message: "Грешка при създаване на заявка", error: error.message });
  }
});

// ✅ Вземане на всички заявки (само стаята)
router.get("/", requireAuth, async (req, res) => {
  try {
    const requests = await Maintenance.find({ roomId: req.user.roomId })
      .sort({ createdAt: -1 })
      .populate("createdBy", "name email");
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: "Грешка при зареждане на заявки", error: error.message });
  }
});

// ✅ Обновяване на статус (само manager, само стая)
router.put("/:id", requireAuth, async (req, res) => {
  try {
    if (req.user.role !== "manager") {
      return res.status(403).json({ message: "Само домоуправител може да обновява статус" });
    }

    const { id } = req.params;
    const { status } = req.body;

    const updated = await Maintenance.findOneAndUpdate(
      { _id: id, roomId: req.user.roomId },
      { status },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Заявката не е намерена" });

    res.json({ message: "Заявката е обновена", request: updated });
  } catch (error) {
    res.status(500).json({ message: "Грешка при обновяване", error: error.message });
  }
});

// ✅ Изтриване (само manager, само стая)
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    if (req.user.role !== "manager") {
      return res.status(403).json({ message: "Само домоуправител може да трие заявки" });
    }

    const { id } = req.params;
    const deleted = await Maintenance.findOneAndDelete({ _id: id, roomId: req.user.roomId });

    if (!deleted) return res.status(404).json({ message: "Заявката не е намерена" });

    res.json({ message: "Заявката е изтрита успешно" });
  } catch (error) {
    res.status(500).json({ message: "Грешка при изтриване", error: error.message });
  }
});

export default router;
