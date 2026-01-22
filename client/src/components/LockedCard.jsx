import { Link } from "react-router-dom";

export default function LockedCard({
  title = "⚠️ Достъпът е заключен",
  desc = "Тази секция е достъпна само ако входът е в активен trial или има платен абонамент.",
}) {
  return (
    <div className="rounded-3xl border border-red-100 bg-red-50 p-6 shadow-soft">
      <div className="text-lg font-black text-slate-900">{title}</div>
      <div className="text-sm text-slate-700 mt-2 leading-relaxed">{desc}</div>

      <div className="text-xs text-slate-600 mt-3">
        Ако си живущ: свържи се с домоуправителя.  
        Ако си домоуправител: активирай абонамента за входа.
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          to="/room"
          className="rounded-2xl px-4 py-2 text-sm font-semibold border border-red-200 text-red-700 hover:bg-red-100 transition"
        >
          Виж стаята
        </Link>
        <Link
          to="/subscription"
          className="rounded-2xl px-4 py-2 text-sm font-semibold bg-sky-600 text-white hover:bg-sky-700 transition shadow-soft"
        >
          Абонамент
        </Link>
      </div>
    </div>
  );
}
