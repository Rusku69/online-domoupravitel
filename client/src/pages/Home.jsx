import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { useAuth } from "../store/auth";

function Pill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
      {children}
    </span>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function Feature({ title, desc }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition">
      <div className="text-base font-semibold text-slate-900">{title}</div>
      <div className="mt-2 text-sm leading-relaxed text-slate-600">{desc}</div>
    </div>
  );
}

function Step({ n, title, desc }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
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

/**
 * Мини “табло” за вход → апартаменти (нова визия, по-реалистично).
 * Запазва идеята ти, но изглежда като истински продукт.
 */
function EntranceApartmentsDemo() {
  const [entrance, setEntrance] = useState("А");
  const [apCount, setApCount] = useState(24);

  const dueDate = useMemo(() => {
    const d = new Date();
    d.setDate(10);
    d.setHours(23, 59, 59, 999);
    return d;
  }, []);

  const statusOf = (n) => {
    const r = n % 3;
    if (r === 0) return { k: "paid", label: "Платено", cls: "bg-emerald-50 border-emerald-200 text-emerald-900" };
    if (r === 1) return { k: "late", label: "Просрочено", cls: "bg-rose-50 border-rose-200 text-rose-900" };
    return { k: "unpaid", label: "Неплатено", cls: "bg-amber-50 border-amber-200 text-amber-900" };
  };

  const apartments = useMemo(() => {
    return Array.from({ length: apCount }).map((_, i) => {
      const ap = i + 1;
      const s = statusOf(ap);
      const note =
        s.k === "paid"
          ? `Ап. ${ap} • Платено в срок`
          : s.k === "late"
          ? `Ап. ${ap} • Просрочено`
          : `Ап. ${ap} • Няма плащане`;
      return { ap, s, note, due: `Срок: ${dueDate.toLocaleDateString("bg-BG")}` };
    });
  }, [apCount, dueDate]);

  const cols = apCount <= 18 ? 6 : apCount <= 30 ? 6 : 8;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs text-slate-500">Табло</div>
          <div className="text-sm font-semibold text-slate-900">Вход {entrance} • апартаменти • статус</div>
        </div>
        <Pill>Преглед</Pill>
      </div>

      <div className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="text-xs text-slate-500">Вход:</div>
            <div className="flex gap-2">
              {["А", "Б", "В"].map((x) => (
                <button
                  key={x}
                  onClick={() => setEntrance(x)}
                  className={`text-xs px-3 py-1.5 rounded-2xl border transition ${
                    entrance === x
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {x}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:ml-auto">
            <div className="text-xs text-slate-500">Апартаменти:</div>
            <select
              value={apCount}
              onChange={(e) => setApCount(Number(e.target.value))}
              className="text-xs border border-slate-200 rounded-2xl px-3 py-2 bg-white"
            >
              {[12, 18, 24, 30, 36].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {apartments.map((x) => (
            <div key={x.ap} className="relative group">
              <div
                className={`h-11 rounded-2xl border ${x.s.cls} flex items-center justify-center text-xs font-black transition group-hover:scale-[1.02] cursor-default`}
              >
                {x.ap}
              </div>

              <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-2 opacity-0 group-hover:opacity-100 group-hover:-translate-y-10 transition duration-150 z-10">
                <div className="w-56 rounded-2xl border border-slate-200 bg-white shadow-lg p-3">
                  <div className="text-xs font-semibold text-slate-900">{x.s.label}</div>
                  <div className="mt-1 text-xs text-slate-600">{x.note}</div>
                  <div className="mt-1 text-[11px] text-slate-500">{x.due}</div>
                  <div className="mt-2 text-[11px] text-slate-500">
                    Домоуправител: детайли • Живущ: само своите данни
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded bg-emerald-200 border border-emerald-300" />
            Платено
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded bg-rose-200 border border-rose-300" />
            Просрочено
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded bg-amber-200 border border-amber-300" />
            Неплатено
          </div>
        </div>
      </div>
    </div>
  );
}

function PricingCard({ title, price, subtitle, items, primary, ctaText }) {
  return (
    <div
      className={`rounded-3xl border p-7 shadow-sm transition ${
        primary
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-white text-slate-900"
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
            primary
              ? "bg-white text-slate-900 hover:bg-slate-100"
              : "bg-slate-900 text-white hover:bg-slate-800"
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
    <div className="min-h-screen bg-[#0b1220]">
      {/* Top bar / nav */}
      <header className="border-b border-white/10 bg-[#0b1220]/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-white text-slate-900 flex items-center justify-center font-black">
              OD
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Онлайн Домоуправител</div>
              <div className="text-xs text-white/60">Плащания • Обяви • Сигнали • Справки</div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {user ? (
              <Link
                to="/dashboard"
                className="rounded-2xl px-5 py-2.5 text-sm font-semibold bg-white text-slate-900 hover:bg-slate-100 transition"
              >
                Към таблото
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-2xl px-5 py-2.5 text-sm font-semibold border border-white/20 text-white hover:bg-white/5 transition"
                >
                  Вход
                </Link>
                <Link
                  to="/register"
                  className="rounded-2xl px-5 py-2.5 text-sm font-semibold bg-white text-slate-900 hover:bg-slate-100 transition"
                >
                  Регистрация
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-10 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="flex flex-wrap gap-2">
              <Pill>Достъп с код + одобрение</Pill>
              <Pill>Изолация по вход (room)</Pill>
              <Pill>Stripe плащания</Pill>
            </div>

            <h1 className="mt-6 text-4xl sm:text-5xl font-black tracking-tight text-white leading-tight">
              Управление на входа, което не разчита на бележки и чатове.
            </h1>

            <p className="mt-4 text-base leading-relaxed text-white/70">
              Домоуправителят управлява обяви, начисления, сигнали и справки в една система.
              Живущите виждат само информацията за своя вход и само след одобрение.
            </p>

            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <Link
                to="/register"
                className="inline-flex items-center justify-center rounded-2xl px-6 py-3.5 text-sm font-semibold bg-white text-slate-900 hover:bg-slate-100 transition"
              >
                Започни (1 месец безплатно)
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-2xl px-6 py-3.5 text-sm font-semibold border border-white/20 text-white hover:bg-white/5 transition"
              >
                Вече имам акаунт
              </Link>
            </div>

            <div className="mt-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Stat label="Вход" value="Стая + код" />
              <Stat label="Плащания" value="Stripe Checkout" />
              <Stat label="Сигнали" value="Анонимност" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-sm">
              <div className="text-xs text-white/60">Какво получаваш</div>
              <div className="mt-2 text-xl font-semibold text-white">
                Подреден процес за реален вход
              </div>
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                Регистрация → стая → код → заявки → одобрение → начисления/сигнали/справки.
                Без смесване между блокове и входове.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {["Обяви", "Плащания", "Сигнали", "Справки"].map((x) => (
                  <span
                    key={x}
                    className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/80"
                  >
                    {x}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white p-2">
              <EntranceApartmentsDemo />
            </div>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="max-w-6xl mx-auto px-4 pb-10">
        <div className="flex items-end justify-between gap-4 mb-5">
          <div>
            <h2 className="text-2xl font-bold text-white">Старт за минути</h2>
            <p className="text-sm text-white/70 mt-1">
              Без “настройки”, които плашат. Ясен flow.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Step n="1" title="Регистрация" desc="Домоуправителят кандидатства и се одобрява от admin." />
          <Step n="2" title="Стая и код" desc="Създаваш стая за входа и споделяш кода на живущите." />
          <Step n="3" title="Одобрение" desc="Само одобрени профили виждат данните за този вход." />
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 pb-12">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-white">Функционалности</h2>
          <p className="text-sm text-white/70 mt-1">
            Създадено за входове — не е общ чат с файлове.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Feature title="Обяви" desc="Публикации за входа. Само правилните хора виждат съдържанието." />
          <Feature title="Начисления" desc="Такси за вход или апартамент. Плащане през Stripe Checkout." />
          <Feature title="Сигнали" desc="Подаване и статуси: нов / в процес / решен / отхвърлен." />
          <Feature title="Справки" desc="Обобщения, история, баланс и разходи (вътрешен баланс)." />
          <Feature title="Контрол на достъп" desc="Код + одобрение. Реално спира външни хора." />
          <Feature title="Преглед по апартаменти" desc="Визуално табло за статуса по апартаменти при начисления." />
        </div>
      </section>

      {/* Pricing (запазено като секция, но нов дизайн + 1 €) */}
      <section className="max-w-6xl mx-auto px-4 pb-12">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-white">Абонамент</h2>
          <p className="text-sm text-white/70 mt-1 leading-relaxed">
            1 месец тест период. След това: <b className="text-white">1 € / апартамент / месец</b>.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PricingCard
            title="Тест период"
            price="0 €"
            subtitle="Пробваш всички модули 30 дни."
            items={[
              "Стая (вход) + код",
              "Одобрение на живущи",
              "Обяви, начисления, сигнали, справки",
              "Табло по апартаменти",
            ]}
            ctaText="Започни теста"
          />

          <PricingCard
            title="Активен абонамент"
            price="1 € / апартамент"
            subtitle="Таксуване според броя апартаменти във входа."
            primary
            items={[
              "Пълен достъп за входа",
              "Stripe плащания",
              "История и справки",
              "Поддръжка при нужда",
            ]}
            ctaText="Регистрация"
          />
        </div>

        <div className="mt-4 text-xs text-white/60">
          Пример: 24 апартамента → 24 € / месец след тест периода.
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 pb-14">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-7 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div>
            <div className="text-2xl font-bold text-white">Готов ли си да го пуснеш за входа?</div>
            <div className="text-sm text-white/70 mt-2 leading-relaxed">
              Регистрация → стая → код → одобрение. После всичко е под контрол и подредено.
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              to="/register"
              className="rounded-2xl px-6 py-3 text-sm font-semibold bg-white text-slate-900 hover:bg-slate-100 transition"
            >
              Регистрация
            </Link>
            <Link
              to="/login"
              className="rounded-2xl px-6 py-3 text-sm font-semibold border border-white/20 text-white hover:bg-white/5 transition"
            >
              Вход
            </Link>
          </div>
        </div>
      </section>

      {/* Footer ще е глобален (Layout/App.jsx) */}
    </div>
  );
}
