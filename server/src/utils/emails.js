// server/src/utils/emails.js
import nodemailer from "nodemailer";

/**
 * Primary: Resend API (recommended for Render/Vercel production)
 * Fallback: Nodemailer (if RESEND_API_KEY is missing)
 */

async function resendSend({ from, to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY липсва");
  }

  // Node 18+ има fetch. Ако нямаш (рядко), ще пробва да импортне node-fetch.
  let _fetch = globalThis.fetch;
  if (!_fetch) {
    const mod = await import("node-fetch");
    _fetch = mod.default;
  }

  const r = await _fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
    }),
  });

  const text = await r.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    // ignore json parse
  }

  if (!r.ok) {
    const msg = data?.message || data?.error || text || "Resend error";
    throw new Error(`Resend send failed: ${msg}`);
  }

  return data;
}

function makeNodemailerTransport() {
  // fallback only (if you ever need it)
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    throw new Error("SMTP env липсва (SMTP_USER/SMTP_PASS)");
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    socketTimeout: 30_000,
  });
}

export async function sendEmail({ to, subject, html }) {
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;

  if (!from) {
    throw new Error("EMAIL_FROM липсва (или SMTP_USER липсва)");
  }

  // ✅ Primary path: Resend
  if (process.env.RESEND_API_KEY) {
    await resendSend({ from, to, subject, html });
    return;
  }

  // 🔁 Fallback: Nodemailer (Gmail) — not recommended on Render, but kept as backup
  const transporter = makeNodemailerTransport();
  await transporter.sendMail({ from, to, subject, html });
}
