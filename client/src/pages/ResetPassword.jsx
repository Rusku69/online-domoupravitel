import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "../lib/api";

function passwordStrength(pw) {
  if (pw.length < 8) return { label: "Слаба", color: "red" };
  if (!/[A-Z]/.test(pw) || !/[0-9]/.test(pw)) return { label: "Средна", color: "yellow" };
  return { label: "Силна", color: "green" };
}

export default function ResetPassword() {
  const [params] = useSearchParams();
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  const token = params.get("token");
  const email = params.get("email");

  const strength = password ? passwordStrength(password) : null;

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");

    if (!token || !email) {
      return setErr("Невалиден линк.");
    }

    try {
      const res = await api.post("/api/auth/reset-password", {
        token,
        email,
        newPassword: password,
      });

      setDone(true);
      setMsg(res.data.message || "Паролата е сменена.");
    } catch (e) {
      setErr(e?.response?.data?.message || "Грешка при смяна на парола.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-sky-50 p-4">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-soft p-6">
        <h1 className="text-2xl font-bold mb-4">🔑 Нова парола</h1>

        {err && <div className="mb-3 text-sm text-red-700 bg-red-50 p-3 rounded-xl">{err}</div>}
        {msg && <div className="mb-3 text-sm text-green-700 bg-green-50 p-3 rounded-xl">{msg}</div>}

        {!done ? (
          <form onSubmit={submit} className="space-y-3">
            <input
              type="password"
              className="w-full border rounded-xl px-4 py-3"
              placeholder="Нова парола"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {strength && (
              <div
                className={`text-xs ${
                  strength.color === "red"
                    ? "text-red-600"
                    : strength.color === "yellow"
                    ? "text-yellow-600"
                    : "text-green-600"
                }`}
              >
                Сила на паролата: {strength.label}
              </div>
            )}

            <button className="w-full rounded-xl bg-sky-600 text-white py-3 font-semibold hover:bg-sky-700">
              Смени паролата
            </button>
          </form>
        ) : (
          <Link
            to="/login"
            className="inline-block mt-4 w-full text-center rounded-xl bg-sky-600 text-white py-3 font-semibold hover:bg-sky-700"
          >
            Вход
          </Link>
        )}
      </div>
    </div>
  );
}
