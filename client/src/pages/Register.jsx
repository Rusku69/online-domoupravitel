import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";
import zxcvbn from "zxcvbn";
import { navigateWithTransition } from "../lib/viewTransition";

function Pill({ children }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
      {children}
    </span>
  );
}

function MiniCard({ icon, title, desc }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center text-base shadow-sm border border-slate-200">
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
  if (tone === "red") return "text-rose-900 bg-rose-50 border-rose-200";
  if (tone === "orange") return "text-amber-900 bg-amber-50 border-amber-200";
  if (tone === "yellow") return "text-yellow-900 bg-yellow-50 border-yellow-200";
  if (tone === "green") return "text-emerald-900 bg-emerald-50 border-emerald-200";
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

  // Текстът е "препоръчително", не "задължително"
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
    if (ok) navigateWithTransition(navigate, "/login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <div className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <Pill>1 месец безплатно • после 1 € / апартамент / месец</Pill>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-3">Създай профил</h1>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Не те караме да пишеш блок/вход тук. Влизаш в стаята с код и тогава се записват данните.
                </p>
              </div>

              <div className="p-6">
                {error && (
                  <div className="mb-4 text-sm text-rose-900 bg-rose-50 border border-rose-200 rounded-2xl p-3">
                    {error}
                  </div>
                )}

                <form onSubmit={onSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Име</label>
                    <input
                      className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                      placeholder="Име и фамилия"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Телефон</label>
                    <input
                      className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                      placeholder="+359..."
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                    <div className="text-xs text-slate-500 mt-1">Препоръчително: реален номер.</div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Имейл</label>
                    <input
                      className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                      placeholder="example@email.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                    />
                    <div className="text-xs text-slate-500 mt-1">
                      Препоръчително: реален имейл (за възстановяване на парола и важни известия). За домоуправители е
                      силно препоръчително.
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Парола</label>
                    <input
                      type="password"
                      className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                      placeholder="••••••••"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      required
                    />

                    {/* password strength UI */}
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
                    className="w-full rounded-2xl py-3.5 bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition shadow-sm disabled:opacity-60"
                  >
                    {loading ? "Регистрация..." : "Създай акаунт"}
                  </button>

                  <div className="text-sm text-slate-600 text-center pt-2">
                    Имаш акаунт?{" "}
                    <Link to="/login" className="font-semibold text-slate-900 underline underline-offset-2 hover:opacity-80">
                      Вход
                    </Link>
                  </div>
                </form>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-xs text-slate-500">Как работи</div>
                <div className="text-2xl font-bold mt-1 text-slate-900">Влизане с код</div>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  След регистрация отиваш в „Стая“, въвеждаш код + апартамент и чакаш одобрение.
                </p>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  Данните се виждат само след одобрение и са изолирани за конкретния вход.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <MiniCard icon="1" title="Контрол" desc="Никой не влиза без код и одобрение." />
                <MiniCard icon="2" title="За вход" desc="Стаята е за конкретен вход, не за целия блок." />
                <MiniCard icon="3" title="Обяви" desc="Всичко важно за входа е на едно място." />
                <MiniCard icon="4" title="Плащания" desc="Такси по вход/апартамент, ясно и подредено." />
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-sm font-semibold text-slate-900">Домоуправител</div>
                <div className="text-sm text-slate-600 mt-1 leading-relaxed">
                  Домоуправител ставаш след админ одобрение. Това пази системата чиста и намалява злоупотребите.
                </div>
                <div className="mt-3 text-xs text-slate-500">
                  Ако ще кандидатстваш като домоуправител, препоръчително е да потвърдиш имейла си веднага след регистрацията.
                </div>
              </div>

              <div className="text-xs text-slate-500">
                След като влезеш в стаята и бъдеш одобрен, ще виждаш само модули, които са активни за твоя вход.
              </div>
            </div>
          </div>
        </div>
      </div>

      
    </div>
  );
}
