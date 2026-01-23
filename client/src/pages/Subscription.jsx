import { useState } from "react";
import api from "../lib/api";
import { useAuth } from "../store/auth";
import { PageHeader, HelpCard, ErrorBox, SuccessBox } from "../components/PageBits";
import { useNavigate } from "react-router-dom";
import SiteFooter from "../components/SiteFooter";

export default function Subscription() {
  const { user, fetchUser } = useAuth();
  const navigate = useNavigate();

  const isManager = user?.role === "manager";
  const isAdmin = user?.role === "admin";

  const [months, setMonths] = useState(1);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const renew = async () => {
    try {
      setErr("");
      setMsg("");
      setLoading(true);

      // Stripe-only (без method)
      await api.post("/api/subscription/renew", { months });

      setMsg("Абонаментът е подновен.");
      await fetchUser();
      setTimeout(() => navigate("/room"), 400);
    } catch (e) {
      setErr(e?.response?.data?.message || "Грешка при подновяване");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  if (!isManager && !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <div className="flex-1 p-6">
          <div className="max-w-3xl mx-auto">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="font-black text-slate-900">Достъп ограничен</div>
              <div className="text-sm text-slate-600 mt-2">
                Подновяването на абонамент е действие на домоуправителя (или администратор).
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                Ако си живущ, можеш да следиш статуса на входа и начисленията от таблото.
              </div>
            </div>
          </div>
        </div>

        
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <div className="flex-1 p-6">
        <div className="max-w-6xl mx-auto space-y-4">
          <PageHeader
            title="Подновяване на абонамент"
            subtitle={
              <>
                Тук домоуправителят подновява достъпа на входа.
                <br />
                Потокът е Stripe-first: реалното плащане се прави със Stripe, а системата обновява срока в базата.
              </>
            }
          />

          <ErrorBox>{err}</ErrorBox>
          <SuccessBox>{msg}</SuccessBox>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="font-black text-slate-900">Период</div>
                <div className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Избери период за подновяване. След потвърждение системата удължава срока на активност за стаята и
                  отключва модулите, които зависят от активен абонамент.
                </div>

                <div className="mt-5">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Период</label>
                  <select
                    value={months}
                    onChange={(e) => setMonths(Number(e.target.value))}
                    className="w-full border border-slate-200 rounded-2xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                  >
                    {[1, 2, 3, 6, 12].map((n) => (
                      <option key={n} value={n}>
                        {n} месец(а)
                      </option>
                    ))}
                  </select>
                  <div className="mt-2 text-xs text-slate-500">
                    Препоръка: за реална употреба обикновено се използва 3 или 12 месеца.
                  </div>
                </div>

                <button
                  onClick={renew}
                  disabled={loading}
                  className="mt-5 w-full rounded-2xl px-4 py-3.5 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60 transition shadow-sm"
                >
                  {loading ? "Обработка..." : "Потвърди подновяване"}
                </button>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  След обновяване системата синхронизира данните на потребителя и те връща към „Стая“, където се вижда статусът.
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <HelpCard title="Какво прави това">
                Удължава <b>subscriptionExpires</b> на стаята (Room). След това заключените секции се отключват.
              </HelpCard>

              <HelpCard title="Плащания">
                Реалните плащания се обработват чрез Stripe. След успешна обработка системата обновява статуса и срока в базата.
              </HelpCard>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-sm font-semibold text-slate-900">Бележка</div>
                <div className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Ако входът е в тест период, този екран е полезен за показване на процеса по преминаване към активен абонамент
                  и за демонстрация на ограниченията при неактивен достъп.
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-semibold text-slate-900">Прозрачност</div>
            <div className="mt-2 text-sm text-slate-600 leading-relaxed">
              Абонаментът е на ниво „вход“ (стая). Това означава, че всички живущи във входа работят с една и съща активност,
              история и справки. Управлението се извършва от домоуправителя.
            </div>
          </div>
        </div>
      </div>

      
    </div>
  );
}
