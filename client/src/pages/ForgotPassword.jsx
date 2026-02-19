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
      setMsg(res.data?.message || "Ако имейлът съществува, ще получиш линк.");
    } catch (e2) {
      setErr(e2?.response?.data?.message || "Грешка при изпращане на линка.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Body */}
      <div className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            {/* Form */}
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <div className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  Смяна на парола
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-3">Забравена парола</h1>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Въведи имейла си. Ако съществува в системата, ще получиш линк за нова парола.
                </p>
              </div>

              <div className="p-6">
                {err && (
                  <div className="mb-4 text-sm text-rose-900 bg-rose-50 border border-rose-200 rounded-2xl p-3">
                    {err}
                  </div>
                )}
                {msg && (
                  <div className="mb-4 text-sm text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
                    {msg}
                  </div>
                )}

                <form onSubmit={submit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Имейл</label>
                    <input
                      className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                      placeholder="example@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      required
                    />
                    <div className="mt-2 text-xs text-slate-500">
                      Ще изпратим линк за смяна. Линковете са с ограничена валидност.
                    </div>
                  </div>

                  <button
                    disabled={loading}
                    className="w-full rounded-2xl py-3.5 bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition shadow-sm disabled:opacity-60"
                  >
                    {loading ? "Изпращане..." : "Изпрати линк"}
                  </button>

                  <div className="text-sm text-slate-600 text-center pt-2">
                    Връщане към{" "}
                    <Link
                      to="/login"
                      className="font-semibold text-slate-900 underline underline-offset-2 hover:opacity-80"
                    >
                      Вход
                    </Link>
                  </div>
                </form>
              </div>
            </div>

            {/* Right: more material */}
            <div className="space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-xs text-slate-500">Какво да знаеш</div>
                <div className="text-2xl font-bold mt-1 text-slate-900">Как работи процесът</div>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Когато изпратиш заявка, системата проверява дали имейлът съществува. Ако да, изпраща линк за смяна на парола.
                  Това става по един и същ начин за всички акаунти, за да не се разкрива дали конкретен имейл е регистриран.
                </p>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  Ако не получиш имейл до няколко минути, провери и папка Spam/Promotions.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-sm font-semibold text-slate-900">1) Въведи имейл</div>
                  <div className="text-sm text-slate-600 mt-1 leading-relaxed">
                    Използвай имейла, с който си се регистрирал. Препоръчително е да е реален за по-лесно възстановяване.
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-sm font-semibold text-slate-900">2) Отвори линка</div>
                  <div className="text-sm text-slate-600 mt-1 leading-relaxed">
                    Линкът те води към страница за нова парола. Важи ограничено време.
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-sm font-semibold text-slate-900">3) Задай нова парола</div>
                  <div className="text-sm text-slate-600 mt-1 leading-relaxed">
                    Избери парола, която няма да използваш другаде. Комбинирай букви и цифри.
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-sm font-semibold text-slate-900">4) Влез отново</div>
                  <div className="text-sm text-slate-600 mt-1 leading-relaxed">
                    След смяната можеш да влезеш нормално и да продължиш работа във входа.
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-sm font-semibold text-slate-900">Често срещани проблеми</div>
                <div className="mt-3 space-y-3 text-sm text-slate-600 leading-relaxed">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="font-semibold text-slate-900">Не получавам имейл</div>
                    <div className="mt-1">
                      Провери Spam/Promotions. Ако пак няма, опитай отново след малко или провери дали имейлът е изписан правилно.
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="font-semibold text-slate-900">Линкът е изтекъл</div>
                    <div className="mt-1">
                      Заяви нов линк. Старите линкове се деактивират след определено време.
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-500">
                Достъпът до данните за входа остава защитен чрез роли, одобрение и изолация по room.
              </div>
            </div>
          </div>
        </div>
      </div>

      
    </div>
  );
}
