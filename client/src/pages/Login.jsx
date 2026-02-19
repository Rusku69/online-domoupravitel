import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";
import api from "../lib/api";
import { navigateWithTransition } from "../lib/viewTransition";

function InfoCard({ icon, title, desc }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition">
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

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const { login, loading, error, user, token, fetchUser } = useAuth();

  const qs = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const verified = qs.get("verified") === "1";
  const presetEmail = qs.get("email") || "";
  const presetToken = qs.get("token") || "";

  const [form, setForm] = useState({
    email: presetEmail,
    password: "",
  });

  // Forgot password UI
  const [forgotEmail, setForgotEmail] = useState(presetEmail);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState("");
  const [forgotErr, setForgotErr] = useState("");

  // Resend verify UI (optional)
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState("");
  const [verifyErr, setVerifyErr] = useState("");

  // Optional hint if someone came here with token/email (we don't reset from Login)
  const showResetHint = !!presetToken && !!presetEmail;

  // If logged in and user missing, load it
  useEffect(() => {
    if (token && !user) fetchUser();
  }, [token, user, fetchUser]);

  // keep preset email in sync if query changes
  useEffect(() => {
    if (presetEmail) {
      setForm((p) => ({ ...p, email: presetEmail }));
      setForgotEmail(presetEmail);
    }
  }, [presetEmail]);

  const onSubmit = async (e) => {
    e.preventDefault();
    const ok = await login(form.email, form.password);
    if (ok) navigateWithTransition(navigate, "/dashboard");
  };

  const sendForgot = async () => {
    try {
      setForgotErr("");
      setForgotMsg("");
      setForgotLoading(true);

      const email = String(forgotEmail || "").trim().toLowerCase();
      if (!email) {
        setForgotErr("Въведи имейл.");
        return;
      }

      const res = await api.post("/api/auth/forgot-password", { email });
      setForgotMsg(res?.data?.message || "Ако имейлът съществува, ще получиш линк.");
    } catch (e) {
      setForgotErr(e?.response?.data?.message || "Грешка при заявка за смяна на парола");
    } finally {
      setForgotLoading(false);
    }
  };

  const resendVerify = async () => {
    try {
      setVerifyErr("");
      setVerifyMsg("");
      setVerifyLoading(true);

      const res = await api.post("/api/auth/resend-verify-email");
      setVerifyMsg(res?.data?.message || "Изпратен е имейл за потвърждение.");
      await fetchUser();
    } catch (e) {
      setVerifyErr(e?.response?.data?.message || "Грешка при изпращане на имейл за потвърждение");
    } finally {
      setVerifyLoading(false);
    }
  };

  const emailVerified = !!user?.emailVerified;
  const canResendVerify = !!token && !!user && !emailVerified;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* BODY */}
      <div className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            {/* LEFT: FORM */}
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <div className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  Вход в системата
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-3">Добре дошъл обратно</h1>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Влез, за да управляваш стаята на входа: обяви, начисления, сигнали и справки.
                </p>
              </div>

              <div className="p-6">
                {/* Verified banner */}
                {verified && (
                  <div className="mb-4 text-sm text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
                    Имейлът е потвърден. Можеш да влезеш.
                  </div>
                )}

                {/* Reset hint if arrived with token/email */}
                {showResetHint && (
                  <div className="mb-4 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-2xl p-3">
                    Имаш линк за смяна на парола. Отиди на{" "}
                    <Link
                      className="font-semibold text-slate-900 underline underline-offset-2 hover:opacity-80"
                      to={`/reset-password?token=${encodeURIComponent(presetToken)}&email=${encodeURIComponent(
                        presetEmail
                      )}`}
                    >
                      Reset Password
                    </Link>
                    .
                  </div>
                )}

                {/* Auth error */}
                {error && (
                  <div className="mb-4 text-sm text-rose-900 bg-rose-50 border border-rose-200 rounded-2xl p-3">
                    {error}
                  </div>
                )}

                <form onSubmit={onSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Имейл</label>
                    <input
                      className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                      placeholder="example@email.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                    />
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
                  </div>

                  <button
                    disabled={loading}
                    className="w-full rounded-2xl py-3.5 bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition shadow-sm disabled:opacity-60"
                  >
                    {loading ? "Влизане..." : "Влез"}
                  </button>

                  <div className="text-sm text-slate-600 text-center pt-2">
                    Нямаш акаунт?{" "}
                    <Link to="/register" className="font-semibold text-slate-900 underline underline-offset-2 hover:opacity-80">
                      Регистрация
                    </Link>
                  </div>
                </form>

                {/* RESEND VERIFY (optional, shows only if logged and not verified) */}
                {canResendVerify && (
                  <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5">
                    <div className="font-semibold text-slate-900">Потвърждение на имейл</div>
                    <div className="text-sm text-slate-600 mt-1">
                      Имейлът ти е <b className="text-amber-700">непотвърден</b>. За домоуправители е силно препоръчително.
                    </div>

                    {verifyErr && (
                      <div className="mt-3 text-sm text-rose-900 bg-rose-50 border border-rose-200 rounded-2xl p-3">
                        {verifyErr}
                      </div>
                    )}
                    {verifyMsg && (
                      <div className="mt-3 text-sm text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
                        {verifyMsg}
                      </div>
                    )}

                    <button
                      onClick={resendVerify}
                      disabled={verifyLoading}
                      className="mt-3 w-full rounded-2xl py-3 border border-slate-300 text-slate-900 font-semibold text-sm hover:bg-slate-50 transition disabled:opacity-60"
                    >
                      {verifyLoading ? "Изпращане..." : "Изпрати имейл за потвърждение"}
                    </button>

                    <div className="text-xs text-slate-500 mt-2">
                      Провери и папка <b>Spam</b>/<b>Promotions</b>.
                    </div>
                  </div>
                )}

                {/* FORGOT PASSWORD */}
                <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5">
                  <div className="font-semibold text-slate-900">Забравена парола?</div>
                  <div className="text-sm text-slate-600 mt-1">
                    Въведи имейл и ще изпратим линк за смяна (валиден 30 минути).
                  </div>

                  {forgotErr && (
                    <div className="mt-3 text-sm text-rose-900 bg-rose-50 border border-rose-200 rounded-2xl p-3">
                      {forgotErr}
                    </div>
                  )}

                  {forgotMsg && (
                    <div className="mt-3 text-sm text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
                      {forgotMsg}
                    </div>
                  )}

                  <div className="mt-3 space-y-2">
                    <input
                      className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                      placeholder="example@email.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                    />
                    <button
                      onClick={sendForgot}
                      disabled={forgotLoading}
                      className="w-full rounded-2xl py-3 bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition disabled:opacity-60"
                    >
                      {forgotLoading ? "Изпращане..." : "Изпрати линк за смяна"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: EXPLANATION */}
            <div className="space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-xs text-slate-500">Какво получаваш</div>
                <div className="text-2xl font-bold mt-1 text-slate-900">Ред и контрол във входа</div>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Всичко е организирано по стая (вход). Влизане с код + одобрение и ясна история на действията.
                </p>

                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  {["Обяви", "Плащания", "Сигнали", "Справки", "Одобрение"].map((x) => (
                    <span key={x} className="px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-700">
                      {x}
                    </span>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  Сигурността е проста: код за стая + одобрение. Данните не се смесват между различни входове.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoCard
                  icon="1"
                  title="Само за вашия вход"
                  desc="Няма смесване между блокове и входове. Данните са изолирани по roomId."
                />
                <InfoCard
                  icon="2"
                  title="Достъп след одобрение"
                  desc="Живущите не виждат нищо, докато домоуправителят не ги одобри."
                />
                <InfoCard
                  icon="3"
                  title="Такси и начисления"
                  desc="Домоуправителят създава начисления по вход/апартамент, живущите виждат своето."
                />
                <InfoCard
                  icon="4"
                  title="Ясни справки"
                  desc="Филтри, периоди, суми — всичко подредено и полезно."
                />
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-sm font-semibold text-slate-900">Абонамент</div>
                <div className="text-2xl font-black text-slate-900 mt-1">1 месец безплатно</div>
                <div className="text-sm text-slate-600 mt-1 leading-relaxed">
                  След тест периода: <b>1 € / апартамент / месец</b>.
                </div>

                <div className="mt-4 flex gap-2">
                  <Link
                    to="/register"
                    className="rounded-2xl px-5 py-3 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition shadow-sm"
                  >
                    Направи акаунт
                  </Link>
                  <Link
                    to="/"
                    className="rounded-2xl px-5 py-3 text-sm font-semibold border border-slate-300 text-slate-900 hover:bg-slate-100 transition"
                  >
                    Виж началото
                  </Link>
                </div>

                <div className="mt-4 text-xs text-slate-500">
                  Таксуването се определя от броя апартаменти във входа. Всички суми се показват в EUR.
                </div>
              </div>

              <div className="text-xs text-slate-500">
                Ако имаш проблем с входа, провери дали имейлът е изписан правилно и дали профилът е одобрен от домоуправителя.
              </div>
            </div>
          </div>
        </div>
      </div>

      
    </div>
  );
}
