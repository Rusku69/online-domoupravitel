import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");

    const em = String(email || "").trim().toLowerCase();
    if (!em) return setErr("Въведи имейл.");

    try {
      setLoading(true);
      const res = await api.post("/api/auth/forgot-password", { email: em });
      setMsg(res.data?.message || "✅ Ако имейлът съществува, ще получиш линк.");
    } catch (e2) {
      setErr(e2?.response?.data?.message || "Грешка при изпращане на линка.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-sky-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-soft border border-sky-100 p-6">
        <div className="text-xs text-slate-500">Смяна на парола</div>
        <h1 className="text-2xl font-black text-slate-900 mt-1">Забравена парола</h1>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
          Въведи имейла си. Ако съществува в системата, ще получиш линк за нова парола.
        </p>

        {err && (
          <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-2xl p-3">
            {err}
          </div>
        )}
        {msg && (
          <div className="mt-4 text-sm text-green-700 bg-green-50 border border-green-100 rounded-2xl p-3">
            {msg}
          </div>
        )}

        <form onSubmit={submit} className="mt-4 space-y-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Имейл</label>
            <input
              className="w-full border border-sky-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
          </div>

          <button
            disabled={loading}
            className="w-full rounded-2xl py-3.5 bg-sky-600 text-white font-semibold text-sm hover:bg-sky-700 transition shadow-soft disabled:opacity-60"
          >
            {loading ? "Изпращане..." : "Изпрати линк"}
          </button>
        </form>

        <div className="mt-4 text-sm text-slate-600 text-center">
          Връщане към{" "}
          <Link to="/login" className="font-semibold text-sky-700 hover:underline">
            Вход
          </Link>
        </div>
      </div>
    </div>
  );
}
