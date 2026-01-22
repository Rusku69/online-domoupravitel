import jwt from "jsonwebtoken";
import User from "../models/User.js";

export default async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    if (!token) return res.status(401).json({ message: "Няма токен" });

    if (!process.env.JWT_SECRET) {
      console.error("❌ JWT_SECRET липсва в .env");
      return res.status(500).json({ message: "Сървърна грешка (JWT_SECRET липсва)" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      // ✅ по-точно поведение:
      if (err?.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Токенът е изтекъл" });
      }
      return res.status(401).json({ message: "Невалиден токен" });
    }

    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(404).json({ message: "Потребителят не е намерен" });

    req.user = user;
    next();
  } catch (e) {
    console.error("❌ requireAuth error:", e);
    return res.status(500).json({ message: "Сървърна грешка при автентикация" });
  }
}
