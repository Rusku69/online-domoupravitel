import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";
import "./Home.css";

function Badge({ children, accent = false }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
        accent
          ? "border-[color:var(--od-green-soft)] bg-[color:var(--od-green-soft)] text-[color:var(--od-green-deep)]"
          : "border-slate-200/85 bg-[rgba(248,255,241,0.86)] text-slate-700"
      }`}
    >
      {children}
    </span>
  );
}

function MetricCard({ label, value, hint, delayClass = "" }) {
  return (
    <div className={`home-card home-fade ${delayClass} p-4 sm:p-5`}>
      <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-extrabold text-slate-900">{value}</div>
      <div className="mt-1 text-xs text-slate-600">{hint}</div>
    </div>
  );
}

function SectionHead({ eyebrow, title, subtitle }) {
  return (
    <div className="home-fade">
      <div className="text-[11px] uppercase tracking-[0.12em] font-bold text-[color:var(--od-blue)]">{eyebrow}</div>
      <h2 className="home-title mt-2 text-3xl sm:text-4xl text-slate-900">{title}</h2>
      <p className="mt-3 max-w-3xl text-sm sm:text-base text-slate-700 leading-relaxed">{subtitle}</p>
    </div>
  );
}

function StepCard({ n, title, desc, delayClass }) {
  return (
    <div className={`home-card home-step-card home-fade ${delayClass}`}>
      <div className="home-step-dot">{n}</div>
      <div>
        <div className="font-bold text-slate-900">{title}</div>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function FeatureTile({ icon, title, desc, delayClass = "" }) {
  return (
    <div className={`home-card home-feature-tile home-fade ${delayClass}`}>
      <div className="home-feature-icon">{icon}</div>
      <div>
        <div className="font-bold text-slate-900">{title}</div>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function PricingCard({ title, price, subtitle, items, featured }) {
  return (
    <div className={`home-fade rounded-3xl border p-6 sm:p-7 ${featured ? "home-pricing-featured" : "home-card"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={`text-sm font-bold ${featured ? "text-white/85" : "text-slate-700"}`}>{title}</div>
          <div className={`mt-2 text-4xl font-extrabold ${featured ? "text-white" : "text-slate-900"}`}>{price}</div>
          <p className={`mt-2 text-sm leading-relaxed ${featured ? "text-white/85" : "text-slate-600"}`}>{subtitle}</p>
        </div>
        {featured && (
          <span className="rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-bold text-white">
            Най-избирано
          </span>
        )}
      </div>

      <ul className={`mt-5 space-y-2 text-sm ${featured ? "text-white/90" : "text-slate-700"}`}>
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span className={`mt-[2px] text-xs ${featured ? "text-white" : "text-[color:var(--od-green-deep)]"}`}>●</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <Link
        to="/register"
        className={`mt-6 inline-flex w-full items-center justify-center rounded-2xl px-5 py-3 text-sm font-bold transition ${
          featured ? "bg-white text-slate-900 hover:bg-slate-100" : "home-btn-primary text-white"
        }`}
      >
        Започни
      </Link>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const authTimerRef = useRef(null);
  const [pendingAuthRoute, setPendingAuthRoute] = useState("");
  const [authLeaving, setAuthLeaving] = useState(false);

  useEffect(() => {
    return () => {
      if (authTimerRef.current) {
        window.clearTimeout(authTimerRef.current);
      }
    };
  }, []);

  const goAuth = (to) => (e) => {
    if (pendingAuthRoute) return;
    if (e.defaultPrevented) return;
    if (e.button !== 0) return;
    if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) return;

    e.preventDefault();
    setPendingAuthRoute(to);

    const runNavigate = () => navigate(to);

    if (typeof document !== "undefined" && "startViewTransition" in document) {
      document.startViewTransition(runNavigate);
      return;
    }

    setAuthLeaving(true);
    authTimerRef.current = window.setTimeout(runNavigate, 240);
  };

  const authClass = (base, to) => `${base} home-auth-link ${pendingAuthRoute === to ? "home-auth-link-going" : ""}`;
  const loggedHomeCtaTo = user?.role === "admin" ? "/admin" : "/dashboard";
  const loggedHomeCtaLabel = user?.role === "admin" ? "Админ страница" : "Към таблото";

  return (
    <div className={`home-page min-h-screen flex flex-col text-slate-900 ${authLeaving ? "home-auth-leaving" : ""}`}>
      <div className="home-ambient home-ambient-a" aria-hidden />
      <div className="home-ambient home-ambient-b" aria-hidden />
      <header className="home-header sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-3">
            <img src="/Logo.png" alt="Онлайн Домоуправител" className="h-11 w-11 rounded-2xl object-contain bg-white p-1" />
            <div>
              <div className="text-sm font-bold text-slate-900">Онлайн Домоуправител</div>
              <div className="text-xs text-slate-500">Подреден вход. Ясни правила. Спокойствие.</div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {user ? (
              <Link to={loggedHomeCtaTo} className="home-btn-primary rounded-2xl px-5 py-2.5 text-sm font-bold text-white">
                {loggedHomeCtaLabel}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={goAuth("/login")}
                  className={authClass(
                    "rounded-2xl px-4 sm:px-5 py-2.5 text-sm font-bold border border-slate-300 text-slate-800 hover:bg-white transition",
                    "/login"
                  )}
                >
                  Вход
                </Link>
                <Link
                  to="/register"
                  onClick={goAuth("/register")}
                  className={authClass("home-btn-primary rounded-2xl px-4 sm:px-5 py-2.5 text-sm font-bold text-white", "/register")}
                >
                  Регистрация
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <div className="home-header-blend" aria-hidden />

      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-4 pt-8 sm:pt-12 pb-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
            <div className="lg:col-span-7 home-fade">
              <div className="flex flex-wrap gap-2">
                <Badge>Достъп с код и одобрение</Badge>
                <Badge>Отделни данни за всеки вход</Badge>
                <Badge accent>Плащане с карта</Badge>
              </div>

              <h1 className="home-title mt-5 text-4xl sm:text-5xl lg:text-6xl leading-[1.05] text-slate-900">
                Модерен вход без хаос в чатове и тетрадки.
              </h1>

              <p className="mt-4 text-base sm:text-lg text-slate-700 leading-relaxed max-w-2xl">
                Всичко важно за входа е на едно място: съобщения, такси, сигнали и справки. Всеки вижда само
                информацията за своя вход.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Link
                  to="/register"
                  onClick={goAuth("/register")}
                  className={authClass("home-btn-primary rounded-2xl px-6 py-3.5 text-sm font-bold text-white text-center", "/register")}
                >
                  Започни с 1 месец тест
                </Link>
                <Link
                  to="/login"
                  onClick={goAuth("/login")}
                  className={authClass(
                    "rounded-2xl px-6 py-3.5 text-sm font-bold border border-slate-300 text-slate-800 hover:bg-white transition text-center",
                    "/login"
                  )}
                >
                  Вече имам акаунт
                </Link>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <MetricCard
                  label="Достъп"
                  value="Код + одобрение"
                  hint="Само реални живущи влизат в стаята."
                  delayClass="home-delay-1"
                />
                <MetricCard label="Плащания" value="Онлайн и бързо" hint="Ясно плащане към входа с карта." delayClass="home-delay-2" />
                <MetricCard label="Сигнали" value="Със статус" hint="Ново, в процес, решено, отхвърлено." delayClass="home-delay-3" />
              </div>
            </div>

            <div className="lg:col-span-5 home-fade home-delay-2">
              <div className="home-showcase">
                <div className="home-showcase-header">
                  <div className="text-xs font-bold uppercase tracking-[0.1em] text-[color:var(--od-blue)]">В реална среда</div>
                  <div className="text-sm text-slate-700">Спокоен и подреден процес за целия вход</div>
                </div>

                <div className="home-logo-panel">
                  <img src="/Logo.png" alt="Илюстрация Онлайн Домоуправител" className="w-full max-w-[330px] mx-auto" />
                </div>

                <div className="home-role-grid">
                  <div className="home-role-chip">
                    <span>Домоуправител</span>
                    <b>Контрол на входа</b>
                  </div>
                  <div className="home-role-chip">
                    <span>Живущ</span>
                    <b>Ясен достъп до важната информация</b>
                  </div>
                  <div className="home-role-chip home-role-chip-wide">
                    <span>Админ</span>
                    <b>Поддръжка и одобрения</b>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 pb-12">
          <SectionHead
            eyebrow="Процес"
            title="Стартираш бързо, без объркване"
            subtitle="Процесът е кратък и подреден. Всеки вход има собствена стая и собствена история."
          />

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 relative">
            <div className="home-step-line" aria-hidden />
            <StepCard
              n="1"
              title="Регистрация и заявка"
              desc="Домоуправителят подава заявка за своя вход и получава одобрение."
              delayClass="home-delay-1"
            />
            <StepCard
              n="2"
              title="Код за входа"
              desc="Създава се стая, в която живущите влизат с код и апартамент."
              delayClass="home-delay-2"
            />
            <StepCard
              n="3"
              title="Одобрение на живущи"
              desc="Само одобрените профили виждат пълната информация в стаята."
              delayClass="home-delay-3"
            />
          </div>

          <div className="mt-4 home-card p-5 sm:p-6 home-fade home-delay-2">
            <div className="text-xs font-bold uppercase tracking-[0.12em] text-[color:var(--od-blue)]">Важно</div>
            <p className="mt-2 text-sm sm:text-base text-slate-700 leading-relaxed">
              Ако в блока има няколко входа, данните остават разделени. Вход А не вижда информацията на вход Б.
            </p>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 pb-12">
          <SectionHead
            eyebrow="Функционалности"
            title="Всичко нужно за ежедневието на входа"
            subtitle="Публични съобщения, такси, сигнали и отчетност в един ясен работен поток."
          />

          <div className="home-bento mt-6">
            <FeatureTile
              icon="О"
              title="Обяви за входа"
              desc="Събрания, ремонти, срокове и напомняния с ясна история."
              delayClass="home-delay-1"
            />
            <FeatureTile
              icon="Т"
              title="Такси и плащания"
              desc="Домоуправителят задава такса, живущите плащат удобно онлайн."
              delayClass="home-delay-2"
            />
            <FeatureTile
              icon="С"
              title="Сигнали"
              desc="Проблемите се подават бързо и се следят по статус до решение."
              delayClass="home-delay-3"
            />
            <FeatureTile
              icon="Р"
              title="Справки"
              desc="По-ясна картина за разходи, движения и текущо състояние."
              delayClass="home-delay-1"
            />
            <FeatureTile
              icon="К"
              title="Контрол на достъп"
              desc="Код, одобрение и роли пазят информацията само за правилните хора."
              delayClass="home-delay-2"
            />
            <FeatureTile
              icon="П"
              title="Ясни роли"
              desc="Админ, Домоуправител и Живущ с точни права и отговорности."
              delayClass="home-delay-3"
            />
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 pb-12">
          <SectionHead
            eyebrow="Абонамент"
            title="Прост и предвидим модел"
            subtitle="1 месец безплатен тест. След това цената зависи от броя апартаменти във входа."
          />

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <PricingCard
              title="Тест период"
              price="0 €"
              subtitle="Пробваш цялата система за 30 дни и виждаш дали пасва на входа."
              items={[
                "Стая за входа и код за достъп",
                "Одобрение на живущи",
                "Обяви, такси, сигнали и справки",
                "Ясни роли и права",
              ]}
            />
            <PricingCard
              title="Активен абонамент"
              price="1 € / апартамент"
              subtitle="След теста плащането се изчислява справедливо според реалния брой апартаменти."
              items={[
                "Пълен достъп за всички одобрени",
                "Онлайн плащане с карта",
                "История и отчетност",
                "Подредена работа във входа",
              ]}
              featured
            />
          </div>

          <div className="mt-3 text-xs text-slate-500">Пример: 30 апартамента = 30 € на месец след тест периода.</div>
        </section>

        <section className="max-w-6xl mx-auto px-4 pb-14">
          <div className="home-cta home-fade">
            <div>
              <h3 className="home-title text-3xl sm:text-4xl text-slate-900">Готови ли сте да подредите входа?</h3>
              <p className="mt-3 text-sm sm:text-base text-slate-700 leading-relaxed">
                Стартирате за минути и веднага имате работеща среда за комуникация, такси и сигнали.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              {user ? (
                <Link to={loggedHomeCtaTo} className="home-btn-primary rounded-2xl px-6 py-3 text-sm font-bold text-white text-center">
                  {loggedHomeCtaLabel}
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    onClick={goAuth("/register")}
                    className={authClass("home-btn-primary rounded-2xl px-6 py-3 text-sm font-bold text-white text-center", "/register")}
                  >
                    Регистрация
                  </Link>
                  <Link
                    to="/login"
                    onClick={goAuth("/login")}
                    className={authClass(
                      "rounded-2xl px-6 py-3 text-sm font-bold border border-slate-300 text-slate-800 hover:bg-white transition text-center",
                      "/login"
                    )}
                  >
                    Вход
                  </Link>
                </>
              )}
            </div>
            <div className="home-contact-chip">
              Контакт: <a href="tel:+359876227738">+359876227738</a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
