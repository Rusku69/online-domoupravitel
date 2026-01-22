import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";
import zxcvbn from "zxcvbn";

function Pill({ children }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full bg-sky-100 text-sky-700 border border-sky-200">
      {children}
    </span>
  );
}

function MiniCard({ icon, title, desc }) {
  return (
    <div className="rounded-3xl border border-sky-100 bg-white p-5 shadow-soft">
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center text-lg shadow-sm">
          {icon}
        </div>
        <div>
          <div className="font-semibold text-slate-900">{title}</div>
          <div className="text-sm text-slate-600 mt-1 leading-relaxed">{desc}</div>
        </div>
      </div>
    </div>
  );
}

function strengthLabel(score) {
  switch (score) {
    case 0:
      return { text: "много слаба", tone: "red" };
    case 1:
      return { text: "слаба", tone: "orange" };
    case 2:
      return { text: "средна", tone: "yellow" };
    case 3:
      return { text: "силна", tone: "green" };
    case 4:
      return { text: "много силна", tone: "green" };
    default:
      return { text: "—", tone: "gray" };
  }
}

function toneClasses(tone) {
  if (tone === "red") return "text-red-700 bg-red-50 border-red-100";
  if (tone === "orange") return "text-orange-700 bg-orange-50 border-orange-100";
  if (tone === "yellow") return "text-yellow-800 bg-yellow-50 border-yellow-100";
  if (tone === "green") return "text-green-700 bg-green-50 border-green-100";
  return "text-slate-700 bg-slate-50 border-slate-200";
}

export default function Register() {
  const navigate = useNavigate();
  const { register, loading, error } = useAuth();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
  });

  const z = useMemo(() => zxcvbn(form.password || ""), [form.password]);
  const score = z?.score ?? 0;
  const s = strengthLabel(score);

  // ✅ Текстът е "препоръчително", не "задължително"
  const recommendation = useMemo(() => {
    if (!form.password) return "";
    if ((form.password || "").length < 8) {
      return "Препоръчително: поне 8 символа.";
    }
    if (score <= 1) {
      return "Препоръчително: добави главни/малки букви, цифри и символ (пример: ! ? #).";
    }
    if (score === 2) {
      return "ОК е, но за домоуправители е добре да е по-силна.";
    }
    return "Добра парола. За домоуправители това е силно препоръчително.";
  }, [form.password, score]);

  const onSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      name: (form.name || "").trim(),
      phone: (form.phone || "").trim(),
      email: (form.email || "").trim(),
      password: form.password,
    };

    const ok = await register(payload);
    if (ok) navigate("/login");
  };

  return (
    <div className="min-h-screen bg-sky-50">
      <header className="sticky top-0 z-20 bg-white/75 backdrop-blur border-b border-sky-100">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-sky-600 flex items-center justify-center shadow-soft">
              <span className="text-white font-black text-lg">ОД</span>
            </div>
            <div>
              <div className="font-semibold text-slate-900 leading-tight">Онлайн Домоуправител</div>
              <div className="text-xs text-slate-500">Регистрация</div>
            </div>
          </Link>

          <Link
            to="/login"
            className="rounded-2xl px-5 py-2.5 text-sm font-semibold border border-sky-200 text-sky-700 hover:bg-sky-50 transition"
          >
            Вход
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          <div className="rounded-3xl border border-sky-100 bg-white shadow-soft overflow-hidden">
            <div className="p-6 border-b border-sky-100">
              <Pill>🚀 1 месец безплатно • после 1 лв/апартамент/вход</Pill>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-3">Създай профил</h1>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Не те караме да пишеш блок/вход тук. Влизаш в стаята с код и тогава се записват данните.
              </p>
            </div>

            <div className="p-6">
              {error && (
                <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-2xl p-3">
                  {error}
                </div>
              )}

              <form onSubmit={onSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Име</label>
                  <input
                    className="w-full border border-sky-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                    placeholder="Име и фамилия"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">Телефон</label>
                  <input
                    className="w-full border border-sky-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                    placeholder="+359..."
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                  <div className="text-xs text-slate-500 mt-1">
                    Препоръчително: реален номер. 
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">Имейл</label>
                  <input
                    className="w-full border border-sky-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                    placeholder="example@email.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                  <div className="text-xs text-slate-500 mt-1">
                    Препоръчително: реален имейл (за възстановяване на парола и важни известия).
                    За домоуправители е силно препоръчително.
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">Парола</label>
                  <input
                    type="password"
                    className="w-full border border-sky-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                  />

                  {/* ✅ password strength UI */}
                  {form.password ? (
                    <div className={`mt-2 text-xs border rounded-2xl p-3 ${toneClasses(s.tone)}`}>
                      <div>
                        Сила на паролата: <b>{s.text}</b>
                      </div>
                      {recommendation ? <div className="mt-1">{recommendation}</div> : null}
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-slate-500">
                      Препоръчително: поне 8 символа. За домоуправители – по-силна парола.
                    </div>
                  )}
                </div>

                <button
                  disabled={loading}
                  className="w-full rounded-2xl py-3.5 bg-sky-600 text-white font-semibold text-sm hover:bg-sky-700 transition shadow-soft disabled:opacity-60"
                >
                  {loading ? "Регистрация..." : "Създай акаунт"}
                </button>

                <div className="text-sm text-slate-600 text-center pt-2">
                  Имаш акаунт?{" "}
                  <Link to="/login" className="font-semibold text-sky-700 hover:underline">
                    Вход
                  </Link>
                </div>
              </form>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl bg-gradient-to-r from-sky-700 via-sky-600 to-sky-700 text-white p-6 shadow-soft">
              <div className="text-xs text-sky-50/90">Как работи</div>
              <div className="text-2xl font-bold mt-1">Влизане с код</div>
              <p className="text-sm text-sky-50/90 mt-2 leading-relaxed">
                След регистрация отиваш в „Стая“, въвеждаш код + апартамент и чакаш одобрение.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <MiniCard icon="🔒" title="Контрол" desc="Никой не влиза без код и одобрение." />
              <MiniCard icon="🏢" title="За вход" desc="Стаята е за конкретен вход, не за целия блок." />
              <MiniCard icon="📣" title="Обяви" desc="Всичко важно за входа е на едно място." />
              <MiniCard icon="💳" title="Плащания" desc="Такси по вход/апартамент, ясно и подредено." />
            </div>

            <div className="rounded-3xl border border-sky-100 bg-white p-6 shadow-soft">
              <div className="text-sm font-semibold text-sky-700">Домоуправител</div>
              <div className="text-sm text-slate-600 mt-1">
                Домоуправител ставаш само след admin одобрение (CEO).
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="border-t border-sky-100 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-8 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-sky-600 flex items-center justify-center shadow-soft">
              <span className="text-white font-black">ОД</span>
            </div>
            <div>
              <div className="font-semibold text-slate-900">Онлайн Домоуправител</div>
              <div>По-малко хаос. Повече контрол.</div>
            </div>
          </div>
          <div>© {new Date().getFullYear()} Всички права запазени</div>
        </div>
      </footer>
    </div>
  );
}
