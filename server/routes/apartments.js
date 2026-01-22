import express from "express";
import jwt from "jsonwebtoken";
import Apartment from "../models/Apartment.js";
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

// 👉 Създаване на апартамент (само manager)
router.post("/", requireAuth, async (req, res) => {
  try {
    if (req.user.role !== "manager") {
      return res.status(403).json({ message: "Само домоуправител може да добавя апартаменти" });
    }

    const { number, floor, owner, residents } = req.body;

    const apartment = await Apartment.create({
      roomId: req.user.roomId,
      number,
      floor,
      owner,
      residents,
    });

    res.status(201).json({ message: "Апартаментът е добавен!", apartment });
  } catch (error) {
    res.status(500).json({ message: "Грешка при добавяне на апартамент", error: error.message });
  }
});

// 👉 Вземане на всички апартаменти (само стаята)
router.get("/", requireAuth, async (req, res) => {
  try {
    const apartments = await Apartment.find({ roomId: req.user.roomId })
      .populate("owner", "name email")
      .populate("residents", "name email");

    res.json(apartments);
  } catch (error) {
    res.status(500).json({ message: "Грешка при зареждане на апартаменти", error: error.message });
  }
});

// 👉 Обновяване (само manager, само стая)
router.put("/:id", requireAuth, async (req, res) => {
  try {
    if (req.user.role !== "manager") {
      return res.status(403).json({ message: "Само домоуправител може да редактира" });
    }

    const { id } = req.params;
    const updated = await Apartment.findOneAndUpdate(
      { _id: id, roomId: req.user.roomId },
      req.body,
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Апартаментът не е намерен" });

    res.json({ message: "Апартаментът е обновен", apartment: updated });
  } catch (error) {
    res.status(500).json({ message: "Грешка при редактиране", error: error.message });
  }
});

// 👉 Изтриване (само manager, само стая)
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    if (req.user.role !== "manager") {
      return res.status(403).json({ message: "Само домоуправител може да трие" });
    }

    const { id } = req.params;
    const deleted = await Apartment.findOneAndDelete({ _id: id, roomId: req.user.roomId });

    if (!deleted) return res.status(404).json({ message: "Апартаментът не е намерен" });

    res.json({ message: "Апартаментът е изтрит успешно" });
  } catch (error) {
    res.status(500).json({ message: "Грешка при изтриване", error: error.message });
  }
});

export default router;
