export default function SubscriptionBanner({ room }) {
  const sub = room?.subscription || null;
  if (!sub) return null;

  const active = !!sub.active;
  const trialEndsAt = sub.trialEndsAt ? new Date(sub.trialEndsAt) : null;
  const paidUntil = sub.subscriptionExpires ? new Date(sub.subscriptionExpires) : null;

  const fmt = (d) => (d ? d.toLocaleDateString("bg-BG") : "—");

  return (
    <div
      className={`rounded-2xl border p-4 ${
        active ? "border-green-100 bg-green-50" : "border-red-100 bg-red-50"
      }`}
    >
      <div className="font-semibold text-slate-900">
        {active ? "✅ Входът е активен" : "⚠️ Входът не е активен"}
      </div>

      <div className="text-sm text-slate-700 mt-1">
        Trial до: <b>{fmt(trialEndsAt)}</b> • Платено до: <b>{fmt(paidUntil)}</b>
      </div>

      {!active && (
        <div className="text-xs text-slate-600 mt-2">
          Функциите са заключени, докато не се активира абонаментът за входа (или докато trial периодът не е активен).
        </div>
      )}
    </div>
  );
}
