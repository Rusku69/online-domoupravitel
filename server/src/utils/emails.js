import nodemailer from "nodemailer";

export function makeTransport() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    throw new Error("SMTP env липсва (SMTP_USER/SMTP_PASS)");
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },

    // IMPORTANT за Render
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    socketTimeout: 30_000,
  });
}

export async function sendEmail({ to, subject, html }) {
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;
  const transporter = makeTransport();
  await transporter.sendMail({ from, to, subject, html });
}
