import { Link } from "react-router-dom";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="py-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Brand */}
            <div className="md:col-span-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black shadow-sm">
                  OD
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900">Онлайн Домоуправител</div>
                  <div className="text-xs text-slate-500">Плащания • Обяви • Сигнали • Справки</div>
                </div>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-slate-600">
                Платформа за управление на вход с фокус върху прозрачност, контрол на достъпа и реални плащания. Всеки
                вход работи изолирано със собствена история и справки.
              </p>

              <div className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <span className="font-semibold text-slate-900">© {year}</span>
                <span className="text-slate-500">Онлайн Домоуправител</span>
                <span className="text-slate-400">•</span>
                <span>Всички права запазени</span>
              </div>
            </div>

            {/* Navigation */}
            <div className="md:col-span-3">
              <div className="text-sm font-semibold text-slate-900">Навигация</div>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link
                    to="/"
                    className="inline-flex items-center text-slate-600 hover:text-slate-900 hover:underline underline-offset-4 transition"
                  >
                    Начало
                  </Link>
                </li>
                <li>
                  <Link
                    to="/login"
                    className="inline-flex items-center text-slate-600 hover:text-slate-900 hover:underline underline-offset-4 transition"
                  >
                    Вход
                  </Link>
                </li>
                <li>
                  <Link
                    to="/register"
                    className="inline-flex items-center text-slate-600 hover:text-slate-900 hover:underline underline-offset-4 transition"
                  >
                    Регистрация
                  </Link>
                </li>
                <li>
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center text-slate-600 hover:text-slate-900 hover:underline underline-offset-4 transition"
                  >
                    Табло
                  </Link>
                </li>
              </ul>
            </div>

            {/* How it works */}
            <div className="md:col-span-4">
              <div className="text-sm font-semibold text-slate-900">Как работи</div>
              <div className="mt-3 text-sm leading-relaxed text-slate-600 space-y-3">
                <p>
                  Достъпът до данните е защитен чрез код за вход и одобрение от домоуправител. Живущите виждат само
                  информацията, която се отнася за техния вход.
                </p>
                <p>
                  Плащанията се извършват през Stripe Checkout, а статусът им се отчита автоматично чрез webhook, без
                  ръчни отбелязвания.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200 text-xs text-slate-500">
            Поддръжка и допълнителни секции могат да бъдат добавени при разширяване на услугата.
          </div>
        </div>
      </div>
    </footer>
  );
}
