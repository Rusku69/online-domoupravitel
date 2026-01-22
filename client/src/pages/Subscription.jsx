import { useState } from "react";
import api from "../lib/api";
import { useAuth } from "../store/auth";
import { PageHeader, HelpCard, ErrorBox, SuccessBox } from "../components/PageBits";
import { useNavigate } from "react-router-dom";

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

      // ✅ CHANGED: Stripe-only (без method)
      await api.post("/api/subscription/renew", { months });

      setMsg("✅ Абонаментът е подновен.");
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
      <div className="min-h-screen bg-sky-50 p-6">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-3xl border border-sky-100 bg-white p-6 shadow-soft">
            <div className="font-black text-slate-900">🔒 Само домоуправител</div>
            <div className="text-sm text-slate-600 mt-2">
              Подновяването на абонамент е действие на домоуправителя (или admin).
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sky-50 p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <PageHeader
          title="💳 Подновяване на абонамент"
          subtitle={
            <>
              Тук домоуправителят подновява достъпа на входа.
              <br />
              В проекта това удължава срока в базата (демо логика). Реалното плащане се прави със Stripe.
            </>
          }
        />

        <ErrorBox>{err}</ErrorBox>
        <SuccessBox>{msg}</SuccessBox>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-3xl border border-sky-100 bg-white p-6 shadow-soft">
              <div className="font-black text-slate-900">Период</div>
              <div className="text-sm text-slate-600 mt-2">
                За предаване е достатъчно да покажеш UX-а и логиката за удължаване на срока.
              </div>

              <div className="mt-5">
                <label className="block text-xs text-slate-500 mb-1">Период</label>
                <select
                  value={months}
                  onChange={(e) => setMonths(Number(e.target.value))}
                  className="w-full border rounded-2xl px-4 py-3 bg-white"
                >
                  {[1, 2, 3, 6, 12].map((n) => (
                    <option key={n} value={n}>
                      {n} месец(а)
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={renew}
                disabled={loading}
                className="mt-5 w-full rounded-2xl px-4 py-3 text-sm font-semibold bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-60"
              >
                {loading ? "Обработка..." : "Потвърди подновяване"}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <HelpCard title="📌 Какво прави това">
              Удължава <b>subscriptionExpires</b> на стаята (Room). След това заключените секции се отключват.
            </HelpCard>

            <HelpCard title="⚙️ Реални плащания">
              Реалните плащания за абонамент се правят чрез Stripe. За демо/предаване тук показваме потока и
              удължаването на срока.
            </HelpCard>
          </div>
        </div>
      </div>
    </div>
  );
}
