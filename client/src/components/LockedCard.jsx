import { Link } from "react-router-dom";

export default function LockedCard({
  title = "⚠️ Достъпът е заключен",
  desc = "Тази секция е достъпна само ако входът е в активен trial или има платен абонамент.",
}) {
  return (
    <div className="rounded-3xl border border-red-200 bg-red-50 p-6 shadow-soft">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="shrink-0 h-10 w-10 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center text-lg">
          ⚠️
        </div>

        <div className="min-w-0">
          <div className="text-lg font-black text-slate-900">{title}</div>
          <div className="text-sm text-slate-700 mt-1 leading-relaxed">{desc}</div>
        </div>
      </div>

      {/* Helper text */}
      <div className="mt-4 rounded-2xl border border-red-200 bg-white px-4 py-3 text-xs text-slate-700 leading-relaxed">
        <div>
          Ако си <b>живущ</b>: свържи се с домоуправителя.
        </div>
        <div className="mt-1">
          Ако си <b>домоуправител</b>: активирай абонамента за входа.
        </div>
      </div>

      {/* Actions */}
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          to="/room"
          className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold border border-red-300 text-red-700 hover:bg-red-100 transition"
        >
          Виж стаята
        </Link>

        <Link
          to="/subscription"
          className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold bg-sky-600 text-white hover:bg-sky-700 transition shadow-soft"
        >
          Абонамент
        </Link>
      </div>
    </div>
  );
}
