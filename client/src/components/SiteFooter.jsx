export default function Footer() {
  const year = new Date().getFullYear();

  const footerStyle = {
    background:
      "linear-gradient(180deg, rgba(226,246,214,0.96) 0%, rgba(214,238,212,0.97) 58%, rgba(206,231,214,0.98) 100%)",
  };

  return (
    <footer className="app-footer" style={footerStyle}>
      <div className="app-footer-blend" aria-hidden />
      <div className="max-w-6xl mx-auto px-4">
        <div className="py-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-6">
              <div className="flex items-center gap-3">
                <img
                  src="/Logo.png"
                  alt="Online Domoupravitel logo"
                  className="h-10 w-10 rounded-2xl object-contain border border-slate-200 bg-white p-1 shadow-sm"
                />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900">Онлайн Домоуправител</div>
                  <div className="text-xs text-slate-600">Подреден вход с ясни правила и спокойна комуникация</div>
                </div>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-slate-700">
                Платформа за управление на вход с фокус върху прозрачност, контрол на достъпа и удобни плащания.
                Всеки вход работи отделно със собствена история и справки.
              </p>

              <div className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <span className="font-semibold text-slate-900">© {year}</span>
                <span className="text-slate-500">Онлайн Домоуправител</span>
                <span className="text-slate-400">•</span>
                <span>Всички права запазени</span>
              </div>

              <div className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                <span className="font-semibold">Контакт:</span>
                <a className="font-black hover:underline" href="tel:+359876227738">
                  +359876227738
                </a>
              </div>
            </div>

            <div className="md:col-span-6">
              <div className="text-sm font-semibold text-slate-900">Как работи</div>
              <div className="mt-3 text-sm leading-relaxed text-slate-700 space-y-3">
                <p>
                  Достъпът до данните е защитен чрез код за вход и одобрение от домоуправител. Живущите виждат само
                  информацията, която се отнася за техния вход.
                </p>
                <p>
                  Плащанията се отчитат автоматично и винаги има ясна следа кой, кога и какво е платил.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200/80 text-xs text-slate-600">
            Нужни са ти допълнителни настройки за твоя вход? Свържи се с нас и ще ги добавим.
          </div>
        </div>
      </div>
    </footer>
  );
}
