import { Link } from "react-router-dom";
import { useAuth } from "../store/auth";
import SiteFooter from "../components/SiteFooter";

function Pill({ children, tone = "neutral" }) {
  const map = {
    neutral: "border-slate-200 bg-white text-slate-700",
    soft: "border-slate-200 bg-slate-50 text-slate-700",
    accent: "border-emerald-200 bg-emerald-50 text-emerald-900",
    ink: "border-slate-300 bg-white text-slate-900",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium shadow-sm ${
        map[tone] || map.neutral
      }`}
    >
      {children}
    </span>
  );
}

function Stat({ label, value, hint }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-black tracking-tight text-slate-900">{value}</div>
      {hint ? <div className="mt-2 text-xs leading-relaxed text-slate-600">{hint}</div> : null}
    </div>
  );
}

function Feature({ title, desc, meta }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition">
      <div className="flex items-start justify-between gap-4">
        <div className="text-base font-semibold text-slate-900">{title}</div>
        {meta ? <Pill tone="soft">{meta}</Pill> : null}
      </div>
      <div className="mt-3 text-sm leading-relaxed text-slate-600">{desc}</div>
    </div>
  );
}

function Step({ n, title, desc }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-sm font-black">
          {n}
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <div className="mt-1 text-sm leading-relaxed text-slate-600">{desc}</div>
        </div>
      </div>
    </div>
  );
}

function PricingCard({ title, price, subtitle, items, primary, ctaText }) {
  return (
    <div
      className={`rounded-3xl border p-7 shadow-sm transition ${
        primary ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-900"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className={`text-sm font-semibold ${primary ? "text-white/90" : "text-slate-700"}`}>{title}</div>
          <div className="mt-2 text-4xl font-black tracking-tight">{price}</div>
          <div className={`mt-2 text-sm leading-relaxed ${primary ? "text-white/80" : "text-slate-600"}`}>
            {subtitle}
          </div>
        </div>
        {primary && (
          <span className="rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs font-semibold">
            Препоръчано
          </span>
        )}
      </div>

      <ul className={`mt-6 space-y-2 text-sm ${primary ? "text-white/85" : "text-slate-700"}`}>
        {items.map((x, i) => (
          <li key={i} className="flex gap-2">
            <span className={`${primary ? "text-white/80" : "text-slate-900"} font-bold`}>•</span>
            <span>{x}</span>
          </li>
        ))}
      </ul>

      <div className="mt-7">
        <Link
          to="/register"
          className={`inline-flex w-full items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition ${
            primary ? "bg-white text-slate-900 hover:bg-slate-100" : "bg-slate-900 text-white hover:bg-slate-800"
          }`}
        >
          {ctaText || "Започни"}
        </Link>
      </div>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <div className="flex-1">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black">
                OD
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">Онлайн Домоуправител</div>
                <div className="text-xs text-slate-500">Плащания • Обяви • Сигнали • Справки</div>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              {user ? (
                <Link
                  to="/dashboard"
                  className="rounded-2xl px-5 py-2.5 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition"
                >
                  Към таблото
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="rounded-2xl px-5 py-2.5 text-sm font-semibold border border-slate-300 text-slate-900 hover:bg-slate-100 transition"
                  >
                    Вход
                  </Link>
                  <Link
                    to="/register"
                    className="rounded-2xl px-5 py-2.5 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition"
                  >
                    Регистрация
                  </Link>
                </>
              )}
            </div>
          </div>
        </header>

        <section className="max-w-6xl mx-auto px-4 pt-10 pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7">
              <div className="flex flex-wrap gap-2">
                <Pill tone="soft">Достъп с код + одобрение</Pill>
                <Pill tone="soft">Изолация по вход (room)</Pill>
                <Pill tone="accent">Stripe плащания</Pill>
              </div>

              <h1 className="mt-6 text-4xl sm:text-5xl font-black tracking-tight leading-tight">
                Управление на входа, което не разчита на бележки и чатове.
              </h1>

              <p className="mt-4 text-base leading-relaxed text-slate-700">
                Онлайн Домоуправител събира на едно място обяви, начисления, сигнали и справки за конкретен вход.
                Достъпът е защитен: живущите влизат с код и се одобряват от домоуправителя. Всеки вижда само това, което е
                за неговия вход.
              </p>

              <div className="mt-7 flex flex-col sm:flex-row gap-3">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center rounded-2xl px-6 py-3.5 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition"
                >
                  Започни (1 месец тест)
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-2xl px-6 py-3.5 text-sm font-semibold border border-slate-300 text-slate-900 hover:bg-slate-100 transition"
                >
                  Вече имам акаунт
                </Link>
              </div>

              <div className="mt-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Stat label="Структура" value="Вход → стая" hint="Данните не се смесват между различни входове." />
                <Stat label="Плащания" value="Stripe Checkout" hint="Реален webhook и автоматично отчитане." />
                <Stat label="Сигнали" value="Статуси" hint="Нов → в процес → решен / отхвърлен." />
              </div>

              <div className="mt-7 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-xs font-semibold text-slate-500">За кого е</div>
                <div className="mt-2 text-sm leading-relaxed text-slate-700">
                  Модулите са направени за реални ситуации: такса вход, ремонт, авария, недовършена услуга, обява за
                  събрание, прозрачност по разходи. Домоуправителят има контрол и история, а живущите имат яснота без да
                  търсят в чатове.
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Pill tone="ink">Домоуправител</Pill>
                  <Pill tone="ink">Живущ</Pill>
                  <Pill tone="ink">Админ</Pill>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-xs text-slate-500">Как протича работата</div>
                <div className="mt-2 text-lg font-semibold text-slate-900">Ясен процес, без излишна сложност</div>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Регистрация → стая → код → заявка → одобрение. След това начисленията, сигналите и справките са на едно
                  място. Данните са изолирани по вход и не се смесват между различни сгради или входове.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {["Обяви", "Плащания", "Сигнали", "Справки"].map((x) => (
                    <span
                      key={x}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700"
                    >
                      {x}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-xs text-slate-500">Защо не е просто чат</div>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Информацията във входа често се губи в чатове и стари съобщения. Тук всяко нещо си има място – обяви,
                  плащания, сигнали и справки, с история и проследимост.
                </p>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  Достъпът до реалните данни е само за одобрени потребители в конкретния вход.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 pb-10">
          <div className="flex items-end justify-between gap-4 mb-5">
            <div>
              <h2 className="text-2xl font-bold">Старт за минути</h2>
              <p className="text-sm text-slate-600 mt-1">Кратко, ясно и без настройки, които объркват.</p>
            </div>
            <div className="hidden md:flex gap-2">
              <Pill tone="soft">Код за вход</Pill>
              <Pill tone="soft">Одобрение</Pill>
              <Pill tone="soft">Роли</Pill>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Step n="1" title="Регистрация" desc="Домоуправителят кандидатства и се одобрява от администратор." />
            <Step n="2" title="Стая и код" desc="Създаваш стая за входа и споделяш кода на живущите." />
            <Step n="3" title="Одобрение" desc="Само одобрени профили виждат и използват функционалностите." />
          </div>

          <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-semibold text-slate-500">Детайл, който прави разлика</div>
            <div className="mt-2 text-sm leading-relaxed text-slate-700">
              Дори да имате един блок с няколко входа, информацията остава разделена. Вход А не вижда нищо за вход Б.
              Това намалява хаоса и спира типичните проблеми с достъп и “кой какво е видял”.
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 pb-12">
          <div className="mb-5">
            <h2 className="text-2xl font-bold">Модули и функционалности</h2>
            <p className="text-sm text-slate-600 mt-1">
              Целта е да покрива ежедневните неща във входа, с ясна история и отчетност.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Feature
              title="Обяви"
              meta="Информация"
              desc="Публикации за входа: събрания, ремонти, напомняния. Живущите виждат само това, което е за тях."
            />
            <Feature
              title="Начисления"
              meta="Такси"
              desc="Домоуправителят създава начисление, живущите плащат през Stripe Checkout. След успех webhook записва плащането."
            />
            <Feature
              title="Сигнали"
              meta="Поддръжка"
              desc="Подаване на проблеми и проследяване на статуси: нов, в процес, решен, отхвърлен. Живущите виждат само своите."
            />
            <Feature
              title="Справки"
              meta="Отчетност"
              desc="Вътрешен баланс, история на разходи и прегледи. Подходящо за прозрачност и отчет към живущите."
            />
            <Feature
              title="Контрол на достъп"
              meta="Сигурност"
              desc="Код + одобрение + роли. Достъпът е ограничен, а данните не се виждат от външни хора."
            />
            <Feature
              title="Роли и права"
              meta="Управление"
              desc="Живущ, домоуправител и админ с различни права. Това държи ред в работата и отговорностите."
            />
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 pb-12">
          <div className="mb-5">
            <h2 className="text-2xl font-bold">Абонамент</h2>
            <p className="text-sm text-slate-600 mt-1 leading-relaxed">
              Има тест период и след него таксуване според броя апартаменти. Моделът е удобен за входове, защото мащабира
              справедливо.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Pill tone="accent">1 месец тест</Pill>
              <Pill tone="soft">1 € / апартамент / месец</Pill>
              <Pill tone="soft">EUR (€)</Pill>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <PricingCard
              title="Тест период"
              price="0 €"
              subtitle="Пробваш всички модули 30 дни. Подходящо за първо пускане във входа."
              items={["Стая (вход) + код", "Одобрение на живущи", "Обяви, начисления, сигнали, справки", "Роли и контрол на достъп"]}
              ctaText="Започни теста"
            />

            <PricingCard
              title="Активен абонамент"
              price="1 € / апартамент"
              subtitle="Таксуване спрямо броя апартаменти във входа. Ясно и лесно за обяснение към живущите."
              primary
              items={["Пълен достъп за входа", "Stripe плащания", "История и справки", "Подреден процес за работа"]}
              ctaText="Регистрация"
            />
          </div>

          <div className="mt-4 text-xs text-slate-500">Пример: 24 апартамента → 24 € / месец след тест периода.</div>
        </section>

        <section className="max-w-6xl mx-auto px-4 pb-14">
          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div>
              <div className="text-2xl font-bold text-slate-900">Готов ли си да го пуснеш за входа?</div>
              <div className="text-sm text-slate-600 mt-2 leading-relaxed">
                Регистрация → стая → код → одобрение. След това всичко е подредено и проследимо.
              </div>
            </div>
            <div className="flex gap-2">
              {user ? (
                <Link
                  to="/dashboard"
                  className="rounded-2xl px-6 py-3 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition"
                >
                  Към таблото
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="rounded-2xl px-6 py-3 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition"
                  >
                    Регистрация
                  </Link>
                  <Link
                    to="/login"
                    className="rounded-2xl px-6 py-3 text-sm font-semibold border border-slate-300 text-slate-900 hover:bg-slate-100 transition"
                  >
                    Вход
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="mt-6 text-xs text-slate-500">Реалните данни за входа се виждат само след вход, код и одобрение.</div>
        </section>
      </div>

      
    </div>
  );
}
