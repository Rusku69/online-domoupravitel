import { Link } from "react-router-dom";

export default function SiteFooter() {
  return (
    <footer className="border-t border-sky-100 bg-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-sky-600 flex items-center justify-center shadow-soft">
              <span className="text-white font-black text-lg">ОД</span>
            </div>
            <div>
              <div className="font-semibold text-slate-900">Онлайн Домоуправител</div>
              <div className="text-xs text-slate-500">
                Управление на входове — модерно, подредено и ясно.
              </div>
            </div>
          </Link>

          <div className="text-xs text-slate-500">
            © {new Date().getFullYear()} Онлайн Домоуправител • Всички права запазени
          </div>
        </div>
      </div>
    </footer>
  );
}
