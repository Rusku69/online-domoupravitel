import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import requireAuth from "../middleware/requireAuth.js";
import { makeToken, hashToken } from "../src/utils/tokens.js";
import { sendEmail } from "../src/utils/emails.js";

const router = express.Router();

function signToken(user) {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET липсва");
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

function appUrl(path) {
  const base = (process.env.APP_URL || "http://localhost:5173").replace(/\/$/, "");
  return base + path;
}

function strongPasswordHint(pw) {
  const s = String(pw || "");
  if (s.length < 8) return "Паролата трябва да е поне 8 символа.";
  return "";
}

// ✅ helper: make & store verify token
async function setEmailVerifyToken(user) {
  const verifyToken = makeToken();
  user.emailVerifyTokenHash = hashToken(verifyToken);
  user.emailVerifyExpires = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h
  await user.save();
  return verifyToken;
}

// ✅ helper: send verify email (FRONTEND link) — PLAIN TEXT (no click tracking redirects)
async function sendVerifyEmail(email, verifyToken) {
  const link = appUrl(`/verify-email?token=${verifyToken}&email=${encodeURIComponent(email)}`);

  await sendEmail({
    to: email,
    subject: "Потвърди имейла си",
    html: `
      <div style="font-family:Arial,sans-serif">
        <h2>Потвърждение на имейл</h2>
        <p>Копирай и отвори линка в браузър (copy/paste):</p>
        <p style="word-break:break-all;font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">
          ${link}
        </p>
        <p>Линкът е валиден 24 часа.</p>
      </div>
    `,
  });
}

// ✅ normalize DB errors to proper HTTP responses
function handleMongoErrors(res, e, fallbackMessage = "Server error") {
  if (e?.code === 11000) {
    return res.status(409).json({ message: "Този имейл вече съществува." });
  }

  if (e?.name === "ValidationError") {
    const first = Object.values(e.errors || {})?.[0]?.message;
    return res.status(400).json({ message: first || "Невалидни данни." });
  }

  if (e?.statusCode && Number.isFinite(e.statusCode)) {
    return res.status(e.statusCode).json({ message: e.message || "Невалидни данни." });
  }

  return res.status(500).json({ message: fallbackMessage, error: e?.message });
}

/**
 * ✅ GET /api/auth/me
 */
router.get("/me", requireAuth, async (req, res) => {
  try {
    return res.json(req.user.toJSON());
  } catch (e) {
    return res.status(500).json({ message: "Me error", error: e.message });
  }
});

/**
 * ✅ PUT /api/auth/me
 */
router.put("/me", requireAuth, async (req, res) => {
  try {
    const name = String(req.body.name ?? "").trim();
    const phone = String(req.body.phone ?? "").trim();

    if (!name || name.length < 2) {
      return res.status(400).json({ message: "Името трябва да е поне 2 символа." });
    }

    req.user.name = name;
    req.user.phone = phone;
    await req.user.save();

    return res.json({ message: "✅ Запазено.", user: req.user.toJSON() });
  } catch (e) {
    return handleMongoErrors(res, e, "Update me error");
  }
});

/**
 * ✅ POST /api/auth/register
 */
router.post("/register", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const phone = String(req.body.phone || "").trim();

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Липсват име/имейл/парола." });
    }

    const hint = strongPasswordHint(password);
    if (hint) return res.status(400).json({ message: hint });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: "Този имейл вече съществува." });

    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: "resident",
      emailVerified: false,
      emailVerifyTokenHash: "",
      emailVerifyExpires: null,
    });

    // ✅ create token + send mail (не спира регистрацията ако mail не работи)
    try {
      const verifyToken = await setEmailVerifyToken(user);
      await sendVerifyEmail(email, verifyToken);
    } catch (mailErr) {
      console.error("Email verify send failed:", mailErr?.message);
    }

    const token = signToken(user);
    return res.status(201).json({
      message: "✅ Регистрация успешна. (Потвърждението на имейл е препоръчително.)",
      token,
      user: user.toJSON(),
    });
  } catch (e) {
    return handleMongoErrors(res, e, "Register error");
  }
});

/**
 * ✅ GET /api/auth/verify-email
 * (optional redirect flow)
 */
router.get("/verify-email", async (req, res) => {
  try {
    const email = String(req.query.email || "").trim().toLowerCase();
    const token = String(req.query.token || "").trim();

    if (!email || !token) return res.status(400).send("Missing email/token");

    const user = await User.findOne({ email });
    if (!user) return res.status(404).send("User not found");

    if (user.emailVerified) {
      return res.redirect(appUrl("/login?verified=1"));
    }

    if (!user.emailVerifyTokenHash || !user.emailVerifyExpires) {
      return res.status(400).send("No active token");
    }

    if (new Date(user.emailVerifyExpires) < new Date()) {
      return res.status(400).send("Token expired");
    }

    if (hashToken(token) !== user.emailVerifyTokenHash) {
      return res.status(400).send("Invalid token");
    }

    user.emailVerified = true;
    user.emailVerifyTokenHash = "";
    user.emailVerifyExpires = null;
    await user.save();

    return res.redirect(appUrl("/login?verified=1"));
  } catch (e) {
    return res.status(500).send("Verify error");
  }
});

/**
 * ✅ POST /api/auth/verify-email
 * This matches твоят VerifyEmail.jsx (POST with { token, email })
 */
router.post("/verify-email", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const token = String(req.body.token || "").trim();

    if (!email || !token) {
      return res.status(400).json({ message: "Липсва email/token." });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "Потребителят не е намерен." });

    if (user.emailVerified) {
      return res.json({ message: "✅ Имейлът вече е потвърден." });
    }

    if (!user.emailVerifyTokenHash || !user.emailVerifyExpires) {
      return res.status(400).json({ message: "Няма активен токен." });
    }

    if (new Date(user.emailVerifyExpires) < new Date()) {
      return res.status(400).json({ message: "Линкът е изтекъл. Изпрати ново потвърждение." });
    }

    if (hashToken(token) !== user.emailVerifyTokenHash) {
      return res.status(400).json({ message: "Невалиден токен. Изпрати ново потвърждение." });
    }

    user.emailVerified = true;
    user.emailVerifyTokenHash = "";
    user.emailVerifyExpires = null;
    await user.save();

    return res.json({ message: "✅ Имейлът е потвърден успешно." });
  } catch (e) {
    return res.status(500).json({ message: "Verify error", error: e.message });
  }
});

/**
 * ✅ POST /api/auth/resend-verify-email
 */
router.post("/resend-verify-email", requireAuth, async (req, res) => {
  try {
    const user = req.user;

    if (user.emailVerified) {
      return res.json({ message: "✅ Имейлът вече е потвърден." });
    }

    const verifyToken = await setEmailVerifyToken(user);

    try {
      await sendVerifyEmail(user.email, verifyToken);
    } catch (mailErr) {
      console.error("Resend verify failed:", mailErr?.message);
      return res.status(500).json({ message: "Не успях да изпратя имейл (mail provider error)." });
    }

    return res.json({ message: "✅ Изпратен е нов имейл за потвърждение." });
  } catch (e) {
    return res.status(500).json({ message: "Resend verify error", error: e.message });
  }
});

/**
 * ✅ POST /api/auth/login
 */
router.post("/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) return res.status(400).json({ message: "Липсват имейл/парола." });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Грешен имейл или парола." });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Грешен имейл или парола." });

    const token = signToken(user);
    return res.json({ token, user: user.toJSON() });
  } catch (e) {
    return res.status(500).json({ message: "Login error", error: e.message });
  }
});

/**
 * ✅ POST /api/auth/forgot-password
 */
router.post("/forgot-password", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ message: "Липсва имейл." });

    const user = await User.findOne({ email });
    if (!user) return res.json({ message: "✅ Ако имейлът съществува, ще получиш линк." });

    const resetToken = makeToken();
    user.passwordResetTokenHash = hashToken(resetToken);
    user.passwordResetExpires = new Date(Date.now() + 1000 * 60 * 30); // 30 min
    await user.save();

    const link = appUrl(`/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`);

    try {
      await sendEmail({
        to: email,
        subject: "Смяна на парола",
        html: `
          <div style="font-family:Arial,sans-serif">
            <h2>Смяна на парола</h2>
            <p>Копирай и отвори линка в браузър (copy/paste). Линкът е валиден 30 минути:</p>
            <p style="word-break:break-all;font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">
              ${link}
            </p>
          </div>
        `,
      });
    } catch (mailErr) {
      console.error("Reset email send failed:", mailErr?.message);
      // do not reveal details
    }

    return res.json({ message: "✅ Ако имейлът съществува, ще получиш линк." });
  } catch (e) {
    return res.status(500).json({ message: "Forgot password error", error: e.message });
  }
});

/**
 * ✅ POST /api/auth/reset-password
 */
router.post("/reset-password", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const token = String(req.body.token || "").trim();
    const newPassword = String(req.body.newPassword || "");

    if (!email || !token || !newPassword) {
      return res.status(400).json({ message: "Липсва email/token/newPassword." });
    }

    const hint = strongPasswordHint(newPassword);
    if (hint) return res.status(400).json({ message: hint });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Невалидни данни." });

    if (!user.passwordResetTokenHash || !user.passwordResetExpires) {
      return res.status(400).json({ message: "Няма активен reset токен." });
    }

    if (new Date(user.passwordResetExpires) < new Date()) {
      return res.status(400).json({ message: "Reset токенът е изтекъл." });
    }

    if (hashToken(token) !== user.passwordResetTokenHash) {
      return res.status(400).json({ message: "Невалиден токен." });
    }

    user.password = newPassword;
    user.passwordResetTokenHash = "";
    user.passwordResetExpires = null;
    await user.save();

    return res.json({ message: "✅ Паролата е сменена." });
  } catch (e) {
    return handleMongoErrors(res, e, "Reset password error");
  }
});

export default router;
