import { useEffect, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../store/auth";
import { PageHeader, HelpCard, ErrorBox, SuccessBox } from "../components/PageBits";
import SiteFooter from "../components/SiteFooter";
import { roleLabel } from "../lib/roles";

export default function Account() {
  const { user, fetchUser } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");

  const [loading, setLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  const [pwEmail, setPwEmail] = useState(user?.email || "");

  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setName(user?.name || "");
    setPhone(user?.phone || "");
    setPwEmail(user?.email || "");
  }, [user?.name, user?.phone, user?.email]);

  const clearAlerts = () => {
    setErr("");
    setMsg("");
  };

  const save = async () => {
    try {
      clearAlerts();
      setLoading(true);

      await api.put("/api/auth/me", {
        name: String(name || "").trim(),
        phone: String(phone || "").trim(),
      });

      setMsg("Запазено.");
      await fetchUser();
    } catch (e) {
      setErr(e?.response?.data?.message || "Грешка при запазване");
    } finally {
      setLoading(false);
    }
  };

  const resendVerify = async () => {
    try {
      clearAlerts();
      setVerifyLoading(true);

      const res = await api.post("/api/auth/resend-verify-email");
      setMsg(res?.data?.message || "Изпратен е имейл за потвърждение.");

      await fetchUser();
    } catch (e) {
      setErr(e?.response?.data?.message || "Грешка при изпращане на имейл за потвърждение");
    } finally {
      setVerifyLoading(false);
    }
  };

  const requestPasswordReset = async () => {
    try {
      clearAlerts();
      setPwLoading(true);

      const email = String(pwEmail || "").trim().toLowerCase();
      if (!email) {
        setErr("Въведи имейл.");
        return;
      }

      const res = await api.post("/api/auth/forgot-password", { email });
      setMsg(res?.data?.message || "Ако имейлът съществува, ще получиш линк.");
    } catch (e) {
      setErr(e?.response?.data?.message || "Грешка при заявка за смяна на парола");
    } finally {
      setPwLoading(false);
    }
  };

  if (!user) return null;

  const emailVerified = !!user.emailVerified;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <div className="flex-1 p-6">
        <div className="max-w-5xl mx-auto space-y-4">
          <PageHeader
            title="Акаунт"
            subtitle={
              <>
                Тук виждаш профила си и можеш да коригираш име и телефон.
                <br />
                Входът и апартаментът се определят от процеса за присъединяване към стая.
              </>
            }
          />

          <ErrorBox>{err}</ErrorBox>
          <SuccessBox>{msg}</SuccessBox>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* MAIN */}
            <div className="lg:col-span-2 space-y-4">
              {/* Summary / material */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="font-black text-slate-900">Обобщение</div>
                <div className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Тази страница е предназначена за управление на основните данни за профила. Име и телефон са видими за
                  домоуправителя при процеса на одобрение и при комуникация във входа. Имейлът е идентификатор за вход и
                  се използва за потвърждение и възстановяване на парола.
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <div className="font-semibold">Какво се управлява тук</div>
                  <ul className="mt-2 list-disc pl-5 space-y-1">
                    <li>Име и телефон (редактируеми).</li>
                    <li>Имейл (само за преглед).</li>
                    <li>Потвърждение на имейл и заявка за смяна на парола.</li>
                  </ul>

                  <div className="font-semibold mt-4">Какво не се променя от тази страница</div>
                  <ul className="mt-2 list-disc pl-5 space-y-1">
                    <li>Град, блок, вход и апартамент (идват от стаята и членството).</li>
                    <li>Роля и статус на членство (управляват се от домоуправител/Админ процеса).</li>
                  </ul>
                </div>
              </div>

              {/* PROFILE */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="font-black text-slate-900">Данни</div>

                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Име</label>
                    <input
                      className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Твоето име"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Телефон</label>
                    <input
                      className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="пример: +359..."
                    />
                    <div className="text-xs text-slate-500 mt-1">
                      Препоръка: формат <b>+359...</b>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Имейл</label>
                    <input
                      className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-slate-50 text-slate-700"
                      value={user.email || ""}
                      disabled
                    />
                  </div>

                  <button
                    onClick={save}
                    disabled={loading}
                    className="w-full rounded-2xl px-4 py-3.5 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60 transition shadow-sm"
                  >
                    {loading ? "Запазване..." : "Запази"}
                  </button>
                </div>
              </div>

              {/* EMAIL VERIFY */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="font-black text-slate-900">Потвърждение на имейл</div>

                <div className="mt-3 text-sm text-slate-700">
                  Статус:{" "}
                  {emailVerified ? (
                    <b className="text-emerald-700">Потвърден</b>
                  ) : (
                    <b className="text-amber-700">Непотвърден</b>
                  )}
                </div>

                {!emailVerified ? (
                  <>
                    <div className="mt-2 text-sm text-slate-600 leading-relaxed">
                      За живущи потвърждението не е задължително.
                      <br />
                      За домоуправители е препоръчително (по-сигурен достъп и по-лесно възстановяване на парола).
                    </div>

                    <button
                      onClick={resendVerify}
                      disabled={verifyLoading}
                      className="mt-4 w-full rounded-2xl px-4 py-3 text-sm font-semibold border border-slate-300 text-slate-900 hover:bg-slate-100 disabled:opacity-60 transition"
                    >
                      {verifyLoading ? "Изпращане..." : "Изпрати имейл за потвърждение"}
                    </button>

                    <div className="text-xs text-slate-500 mt-2">
                      Провери и папки Spam/Promotions. След клика може да те върне към Login.
                    </div>
                  </>
                ) : (
                  <div className="mt-2 text-sm text-slate-600">
                    Имейлът е потвърден и може да се използва за възстановяване на парола.
                  </div>
                )}
              </div>

              {/* CHANGE PASSWORD */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="font-black text-slate-900">Смяна на парола</div>
                <div className="mt-2 text-sm text-slate-600">
                  Пращаме линк за смяна на парола на имейла (валиден 30 минути).
                </div>

                <div className="mt-4 space-y-2">
                  <label className="block text-xs font-semibold text-slate-600">Имейл</label>
                  <input
                    className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                    value={pwEmail}
                    onChange={(e) => setPwEmail(e.target.value)}
                    placeholder="example@email.com"
                  />

                  <button
                    onClick={requestPasswordReset}
                    disabled={pwLoading}
                    className="w-full rounded-2xl px-4 py-3.5 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60 transition shadow-sm"
                  >
                    {pwLoading ? "Изпращане..." : "Изпрати линк за смяна на парола"}
                  </button>

                  <div className="text-xs text-slate-500 mt-1">
                    Ако не получиш имейл, провери Spam. Възможно е домейнът на пощата да има забавяне.
                  </div>
                </div>
              </div>

              {/* Security / material */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="font-black text-slate-900">Сигурност и поверителност</div>
                <div className="mt-2 text-sm text-slate-700 space-y-3">
                  <div>
                    Достъпът до секциите във входа е свързан със стая и одобрение. Това намалява риска от достъп на външни лица.
                  </div>
                  <div>
                    За сигнали е добра практика живущите да виждат само своите сигнали, а домоуправителят да има общ преглед за обработка.
                  </div>
                  <div>
                    Препоръчително е домоуправителят да има потвърден имейл, за да се намалят проблеми при възстановяване на парола.
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <div className="font-semibold">Практическа бележка</div>
                  <div className="mt-1">
                    Ако смениш телефон, запази промените тук. Телефонът може да се използва при комуникация за ремонти, достъп или спешни ситуации.
                  </div>
                </div>
              </div>
            </div>

            {/* ASIDE */}
            <div className="space-y-4">
              <HelpCard title="Твоят вход">
                <div className="text-sm text-slate-700 mt-2">
                  Град: <b>{user.city || "—"}</b>
                  <br />
                  Блок: <b>{user.building || "—"}</b>
                  <br />
                  Вход: <b>{user.entrance || "—"}</b>
                  <br />
                  Апартамент: <b>{user.apartment || "—"}</b>
                </div>
              </HelpCard>

              <HelpCard title="Роля и достъп">
                <div className="text-sm text-slate-700 mt-2">
                  Роля: <b>{roleLabel(user.role)}</b>
                  <br />
                  Статус: <b>{user.memberStatus || "—"}</b>
                  <br />
                  Имейл:{" "}
                  {emailVerified ? (
                    <b className="text-emerald-700">потвърден</b>
                  ) : (
                    <b className="text-amber-700">непотвърден</b>
                  )}
                </div>
              </HelpCard>

              <HelpCard title="Идентификация">
                <div className="text-sm text-slate-700 mt-2">
                  User ID: <b>{user._id || user.id || "—"}</b>
                  <br />
                  Room ID: <b>{user.roomId || "—"}</b>
                </div>
                <div className="text-xs text-slate-500 mt-2"></div>
              </HelpCard>
            </div>
          </div>
        </div>
      </div>

      
    </div>
  );
}
