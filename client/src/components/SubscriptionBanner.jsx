export default function SubscriptionBanner({ room }) {
  const sub = room?.subscription || null;
  if (!sub) return null;

  const active = !!sub.active;
  const trialEndsAt = sub.trialEndsAt ? new Date(sub.trialEndsAt) : null;
  const paidUntil = sub.subscriptionExpires ? new Date(sub.subscriptionExpires) : null;

  const fmt = (d) => (d ? d.toLocaleDateString("bg-BG") : "—");

  return (
    <div
      className={`rounded-3xl border p-5 shadow-sm ${
        active ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-black text-slate-900">
            {active ? "Входът е активен" : "Входът не е активен"}
          </div>

          <div className="text-sm text-slate-700 mt-1">
            Trial до: <b>{fmt(trialEndsAt)}</b> • Платено до: <b>{fmt(paidUntil)}</b>
          </div>
        </div>

        <span
          className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${
            active
              ? "border-emerald-300 bg-white text-emerald-900"
              : "border-rose-300 bg-white text-rose-900"
          }`}
        >
          {active ? "Активен" : "Неактивен"}
        </span>
      </div>

      {!active && (
        <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-700 leading-relaxed">
          Функциите са заключени, докато не се активира абонаментът за входа (или докато trial периодът не е активен).
        </div>
      )}
    </div>
  );
}
