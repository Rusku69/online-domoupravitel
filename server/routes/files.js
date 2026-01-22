import express from "express";
import multer from "multer";
import jwt from "jsonwebtoken";
import File from "../models/File.js";
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

// настройка за uploads/
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// ✅ Качване на файл (в стаята)
router.post("/", requireAuth, upload.single("file"), async (req, res) => {
  try {
    const newFile = await File.create({
      roomId: req.user.roomId,
      filename: req.file.filename,
      path: req.file.path,
      uploadedBy: req.user._id,
    });

    res.status(201).json({ message: "Файлът е качен успешно!", file: newFile });
  } catch (error) {
    res.status(500).json({ message: "Грешка при качване на файл", error: error.message });
  }
});

// ✅ Вземане на файлове (само стаята)
router.get("/", requireAuth, async (req, res) => {
  try {
    const files = await File.find({ roomId: req.user.roomId }).populate("uploadedBy", "name email");
    res.json(files);
  } catch (error) {
    res.status(500).json({ message: "Грешка при зареждане на файлове", error: error.message });
  }
});

// ✅ Изтриване (само manager, и само за стаята)
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    if (req.user.role !== "manager") {
      return res.status(403).json({ message: "Само домоуправител може да трие файлове" });
    }

    const { id } = req.params;
    const deleted = await File.findOneAndDelete({ _id: id, roomId: req.user.roomId });

    if (!deleted) return res.status(404).json({ message: "Файлът не е намерен" });

    res.json({ message: "Файлът е изтрит успешно" });
  } catch (error) {
    res.status(500).json({ message: "Грешка при изтриване на файл", error: error.message });
  }
});

export default router;
