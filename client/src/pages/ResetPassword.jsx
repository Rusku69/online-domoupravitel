import { useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "../lib/api";
import SiteFooter from "../components/SiteFooter";

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

  const strength = useMemo(() => (password ? passwordStrength(password) : null), [password]);

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

  const strengthClasses = useMemo(() => {
    if (!strength) return "";
    if (strength.color === "red") return "text-rose-900 bg-rose-50 border-rose-200";
    if (strength.color === "yellow") return "text-yellow-900 bg-yellow-50 border-yellow-200";
    return "text-emerald-900 bg-emerald-50 border-emerald-200";
  }, [strength]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <div className="flex-1">

        {/* Body */}
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            {/* Left: form */}
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <div className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  Нова парола
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-3">Смяна на парола</h1>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Въведи нова парола за акаунта. Линкът е валиден само за ограничено време.
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

                {!done ? (
                  <form onSubmit={submit} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Нова парола</label>
                      <input
                        type="password"
                        className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <div className="mt-2 text-xs text-slate-500">
                        Препоръчително: поне 8 символа, комбинация от букви и цифри.
                      </div>
                    </div>

                    {strength && (
                      <div className={`text-xs border rounded-2xl p-3 ${strengthClasses}`}>
                        Сила на паролата: <b>{strength.label}</b>
                        <div className="mt-1 text-[11px] opacity-90">
                          По-силната парола намалява риска от злоупотреби при достъп до данните за входа.
                        </div>
                      </div>
                    )}

                    <button
                      className="w-full rounded-2xl bg-slate-900 text-white py-3.5 font-semibold text-sm hover:bg-slate-800 transition shadow-sm"
                    >
                      Смени паролата
                    </button>

                    <div className="text-xs text-slate-500">
                      Ако линкът е изтекъл, използвай “Забравена парола” от страницата за вход.
                    </div>
                  </form>
                ) : (
                  <Link
                    to="/login"
                    className="inline-flex w-full items-center justify-center mt-2 rounded-2xl bg-slate-900 text-white py-3.5 font-semibold text-sm hover:bg-slate-800 transition shadow-sm"
                  >
                    Към вход
                  </Link>
                )}
              </div>
            </div>

            {/* Right: explanation / more material */}
            <div className="space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-xs text-slate-500">Какво да знаеш</div>
                <div className="text-2xl font-bold mt-1 text-slate-900">Сигурност и достъп</div>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Смяната на парола е стандартна мярка за сигурност. След успешна смяна можеш да влезеш отново и да продължиш
                  работа във входа си.
                </p>
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  Ако получаваш грешка “Невалиден линк”, провери дали линкът е копиран изцяло и дали параметрите token/email
                  присъстват в адреса.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-sm font-semibold text-slate-900">1) Въведи нова парола</div>
                  <div className="text-sm text-slate-600 mt-1 leading-relaxed">
                    Избери парола, която няма да използваш другаде. Добра практика е да е поне 8–10 символа.
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-sm font-semibold text-slate-900">2) Влез отново</div>
                  <div className="text-sm text-slate-600 mt-1 leading-relaxed">
                    След смяната, системата ще те върне към страницата за вход, за да продължиш работа.
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-sm font-semibold text-slate-900">3) Провери имейла</div>
                  <div className="text-sm text-slate-600 mt-1 leading-relaxed">
                    Ако очакваш съобщение и не го виждаш, провери и папка Spam/Promotions.
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-sm font-semibold text-slate-900">4) Ако има проблем</div>
                  <div className="text-sm text-slate-600 mt-1 leading-relaxed">
                    Върни се към “Забравена парола” и заяви нов линк. Старите линкове изтичат.
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-sm font-semibold text-slate-900">Често срещани случаи</div>
                <div className="mt-3 space-y-3 text-sm text-slate-600 leading-relaxed">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="font-semibold text-slate-900">Линкът не работи</div>
                    <div className="mt-1">
                      Най-често причината е изтекло време или непълен адрес. Заяви нов линк от страницата за вход.
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="font-semibold text-slate-900">Паролата е “слаба”</div>
                    <div className="mt-1">
                      Добави главни/малки букви и цифри. Това повишава сигурността и намалява риска от достъп от друг човек.
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-500">
                След успешна смяна на парола, достъпът до данните за входа си остава защитен чрез роли, одобрение и изолация по room.
              </div>
            </div>
          </div>
        </div>
      </div>

      
    </div>
  );
}
