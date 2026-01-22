import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../store/auth";
import api from "../lib/api";

export default function Reports() {
  const { user, token } = useAuth();
  const isManager = user?.role === "manager";
  const roomId = user?.roomId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Данни за получаване на средства
  const [recipientName, setRecipientName] = useState("");
  const [iban, setIban] = useState("");
  const [locked, setLocked] = useState(false);

  // Баланс
  const [initialAmount, setInitialAmount] = useState("");
  const [balance, setBalance] = useState(0);

  // Разходи
  const [expenses, setExpenses] = useState([]);
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseNote, setExpenseNote] = useState("");

  const expensesTotal = useMemo(() => {
    if (!Array.isArray(expenses)) return 0;
    return expenses.reduce((sum, e) => sum + Number(e?.amount || 0), 0);
  }, [expenses]);

  const expensesSorted = useMemo(() => {
    const arr = Array.isArray(expenses) ? [...expenses] : [];
    arr.sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0));
    return arr;
  }, [expenses]);

  const expensesOldestFirst = useMemo(() => {
    const arr = Array.isArray(expenses) ? [...expenses] : [];
    arr.sort((a, b) => new Date(a?.createdAt || 0) - new Date(b?.createdAt || 0));
    return arr;
  }, [expenses]);

  const fmtMoney = (n) => `${Number(n || 0).toFixed(2)} €`;

  // ===============================
  // LOAD finance data on refresh
  // ===============================
  useEffect(() => {
    let alive = true;

    if (!roomId || !token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    api
      .get(`/api/rooms/${roomId}/finance`)
      .then((res) => {
        if (!alive) return;
        const data = res.data || {};
        setRecipientName(data.holderName || "");
        setIban(data.iban || "");
        setBalance(Number(data.balance || 0));
        setExpenses(Array.isArray(data.expenses) ? data.expenses : []);
        setLocked(!!data.locked);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e?.response?.data?.message || e?.message || "Грешка при зареждане.");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [roomId, token]);

  // ===============================
  // LOCK payout details
  // ===============================
  const lockPayoutDetails = async () => {
    setError("");
    setSuccess("");

    const start = Number(initialAmount);

    if (!recipientName.trim() || !iban.trim()) {
      setError("Попълни име на получателя и IBAN.");
      return;
    }
    if (!Number.isFinite(start) || start < 0) {
      setError("Невалиден начален баланс.");
      return;
    }

    try {
      const res = await api.post(`/api/rooms/${roomId}/finance/lock`, {
        holderName: recipientName,
        iban,
        initialAmount: start,
      });

      const data = res.data || {};
      setLocked(true);
      setRecipientName(data.holderName || recipientName);
      setIban(data.iban || iban);
      setBalance(Number(data.balance || 0));
      setExpenses(Array.isArray(data.expenses) ? data.expenses : []);
      setInitialAmount("");
      setSuccess("Данните са записани и заключени успешно.");
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Грешка при запис.");
    }
  };

  // ===============================
  // ADD expense
  // ===============================
  const addExpense = async () => {
    setError("");
    setSuccess("");

    const value = Number(expenseAmount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Невалидна сума за разход.");
      return;
    }

    try {
      const res = await api.post(`/api/rooms/${roomId}/finance/expense`, {
        amount: value,
        description: expenseNote,
      });

      const data = res.data || {};
      setBalance(Number(data.balance || 0));
      setExpenses(Array.isArray(data.expenses) ? data.expenses : []);
      setExpenseAmount("");
      setExpenseNote("");
      setSuccess("Разходът е добавен.");
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Грешка при добавяне на разход.");
    }
  };

  // KPI helpers
  const expensesCount = Array.isArray(expenses) ? expenses.length : 0;

  const lastExpense = useMemo(() => {
    if (!expensesSorted.length) return null;
    return expensesSorted[0];
  }, [expensesSorted]);

  const lastExpenseText = useMemo(() => {
    if (!lastExpense) return "—";
    const dt = lastExpense.createdAt ? new Date(lastExpense.createdAt).toLocaleString("bg-BG") : "—";
    const desc = lastExpense.description || "Разход";
    return `${dt} • ${desc} • -${fmtMoney(lastExpense.amount)}`;
  }, [lastExpense]);

  // Кумулативни разходи (старо -> ново) за таблица
  const expensesCumulative = useMemo(() => {
    const rows = [];
    let sum = 0;
    for (const e of expensesOldestFirst) {
      const a = Number(e?.amount || 0);
      sum += a;
      rows.push({ e, cumulative: sum });
    }
    return rows;
  }, [expensesOldestFirst]);

  if (!user || !isManager) return <div className="p-6">403</div>;
  if (loading) return <div className="p-6">Зареждане...</div>;

  return (
    <div className="min-h-screen bg-sky-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="rounded-3xl bg-white p-6 shadow-soft">
          <h1 className="text-2xl font-black text-slate-900">Финансови справки</h1>
          <p className="mt-2 text-sm text-slate-600">
            Тук домоуправителят задава данните за получаване на средства (IBAN) и води вътрешен баланс на входа.
            Модулът е предназначен за прозрачност и отчетност пред живущите.
          </p>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <div className="font-semibold">Важно</div>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>
                Балансът тук е <b>вътрешен счетоводен баланс</b> в системата – не е банково салдо и не извършва реални
                банкови преводи.
              </li>
              <li>
                След заключване, IBAN и получателят <b>не могат да се променят</b> от домоуправителя (само admin може да
                има override, ако добавите това).
              </li>
              <li>
                Плащанията се отчитат <b>чрез Stripe</b> (webhook). При успешно плащане балансът се увеличава, ако
                финансите са заключени.
              </li>
              <li>
                Всички суми в този модул се показват в <b>EUR (€)</b>.
              </li>
            </ul>
          </div>

          {/* Quick nav */}
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            <div className="font-semibold text-slate-900">Навигация</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <a href="#summary" className="rounded-full border border-slate-200 px-3 py-1 hover:bg-slate-50">
                Обобщение
              </a>
              <a href="#how" className="rounded-full border border-slate-200 px-3 py-1 hover:bg-slate-50">
                Как работи
              </a>
              <a href="#payout" className="rounded-full border border-slate-200 px-3 py-1 hover:bg-slate-50">
                Данни за получаване
              </a>
              <a href="#balance" className="rounded-full border border-slate-200 px-3 py-1 hover:bg-slate-50">
                Баланс
              </a>
              <a href="#expenses" className="rounded-full border border-slate-200 px-3 py-1 hover:bg-slate-50">
                Разходи
              </a>
              <a href="#policy" className="rounded-full border border-slate-200 px-3 py-1 hover:bg-slate-50">
                Политика и отчетност
              </a>
              <a href="#faq" className="rounded-full border border-slate-200 px-3 py-1 hover:bg-slate-50">
                Въпроси
              </a>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}
          {success && (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {success}
            </div>
          )}
        </div>

        {/* Summary */}
        <div id="summary" className="rounded-3xl bg-white p-6 shadow-soft">
          <h2 className="text-lg font-bold text-slate-900">Обобщение</h2>
          <p className="mt-2 text-sm text-slate-600">
            Тази секция е бърз преглед на текущото финансово състояние. Данните са предназначени за вътрешен отчет на входа.
          </p>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs font-semibold text-slate-600">Текущ баланс</div>
              <div className="mt-1 text-2xl font-black text-sky-700">{fmtMoney(balance)}</div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs font-semibold text-slate-600">Общо разходи</div>
              <div className="mt-1 text-2xl font-black text-slate-900">{fmtMoney(expensesTotal)}</div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs font-semibold text-slate-600">Брой разходи</div>
              <div className="mt-1 text-2xl font-black text-slate-900">{expensesCount}</div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs font-semibold text-slate-600">Статус</div>
              <div className="mt-1 text-lg font-bold text-slate-900">
                {locked ? "Заключено" : "Не е заключено"}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {locked
                  ? "Stripe плащанията увеличават баланса при успех."
                  : "За автоматично отчитане, първо заключи данните."}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <div className="font-semibold">Последно движение</div>
            <div className="mt-1">
              <b>Последен разход:</b> {lastExpenseText}
            </div>
          </div>
        </div>

        {/* How it works */}
        <div id="how" className="rounded-3xl bg-white p-6 shadow-soft">
          <h2 className="text-lg font-bold text-slate-900">Как работи модулът</h2>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-700">
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="font-semibold">1) Настройка</div>
              <p className="mt-2">
                Въвеждаш <b>име на получател</b>, <b>IBAN</b> и <b>начален баланс</b>. Това са референтни данни за входа.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="font-semibold">2) Заключване</div>
              <p className="mt-2">
                Натискаш “Запази и заключи”. След това данните се пазят в базата и остават видими след refresh.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="font-semibold">3) Разходи и баланс</div>
              <p className="mt-2">
                Добавяш разходи (ремонти, услуги). Балансът се намалява автоматично, а разходите остават като история.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <div className="font-semibold">Движение по баланса</div>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>
                <b>Балансът</b> се увеличава при отчетени плащания (Stripe webhook), когато финансите са заключени.
              </li>
              <li>
                <b>Балансът</b> се намалява при добавяне на разход.
              </li>
              <li>
                <b>Общо разходи</b> е сумата на всички записи в “История на разходите”.
              </li>
            </ul>
          </div>
        </div>

        {/* Payout details */}
        <div id="payout" className="rounded-3xl bg-white p-6 shadow-soft">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Данни за получаване на средства</h2>
              <p className="mt-1 text-sm text-slate-600">
                Това са данните, които се използват като официални за входа (примерно за публикуване на табло/обява към живущите).
              </p>
            </div>

            {locked ? (
              <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                Заключено
              </span>
            ) : (
              <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                Не е заключено
              </span>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-600">Получател</div>
              <input
                disabled={locked}
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Име на получателя"
                className="w-full border rounded-2xl px-4 py-3 disabled:bg-slate-100"
              />
              <div className="text-xs text-slate-500">
                Пример: “Сдружение на собствениците – Вход А”
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-600">IBAN</div>
              <input
                disabled={locked}
                value={iban}
                onChange={(e) => setIban(e.target.value)}
                placeholder="IBAN"
                className="w-full border rounded-2xl px-4 py-3 disabled:bg-slate-100"
              />
              <div className="text-xs text-slate-500">
                Използва се за визуализация/информация. Реален превод не се извършва автоматично.
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-600">Начален баланс</div>
              <input
                disabled={locked}
                type="number"
                value={initialAmount}
                onChange={(e) => setInitialAmount(e.target.value)}
                placeholder="Начален баланс (€)"
                className="w-full border rounded-2xl px-4 py-3 disabled:bg-slate-100"
              />
              <div className="text-xs text-slate-500">
                Ако започвате от 0, въведете 0 и заключете.
              </div>
            </div>
          </div>

          {!locked && (
            <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <div className="text-sm text-slate-600">
                След заключване данните се пазят перманентно и не могат да се редактират от домоуправителя.
              </div>
              <button
                onClick={lockPayoutDetails}
                className="rounded-2xl px-5 py-3 bg-sky-600 text-white font-semibold"
              >
                Запази и заключи
              </button>
            </div>
          )}

          {locked && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <div className="font-semibold">Заключени данни</div>
              <div className="mt-1">
                <b>Получател:</b> {recipientName || "—"} <br />
                <b>IBAN:</b> {iban || "—"}
              </div>
            </div>
          )}
        </div>

        {/* Balance */}
        {locked && (
          <div id="balance" className="rounded-3xl bg-white p-6 shadow-soft">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Вътрешен баланс</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Балансът се променя при разходи (намалява) и при плащания (Stripe webhook).
                </p>
              </div>

              <div className="text-3xl font-black text-sky-700">
                {Number(balance || 0).toFixed(2)} €
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-xs font-semibold text-slate-600">Общо разходи</div>
                <div className="mt-1 text-lg font-bold text-slate-900">
                  {Number(expensesTotal || 0).toFixed(2)} €
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-xs font-semibold text-slate-600">Брой разходи</div>
                <div className="mt-1 text-lg font-bold text-slate-900">
                  {Array.isArray(expenses) ? expenses.length : 0}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-xs font-semibold text-slate-600">Статус</div>
                <div className="mt-1 text-lg font-bold text-slate-900">
                  {locked ? "Заключено" : "Не е заключено"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Expenses */}
        {locked && (
          <div id="expenses" className="rounded-3xl bg-white p-6 shadow-soft">
            <h2 className="text-lg font-bold text-slate-900">Разходи</h2>
            <p className="mt-1 text-sm text-slate-600">
              Добавяй разходи с кратко описание. Всеки разход намалява баланса и остава като история.
            </p>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-600">Сума</div>
                <input
                  type="number"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  placeholder="Сума (€)"
                  className="w-full border rounded-2xl px-4 py-3"
                />
                <div className="text-xs text-slate-500">Пример: 120.50</div>
              </div>

              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-600">Описание</div>
                <input
                  value={expenseNote}
                  onChange={(e) => setExpenseNote(e.target.value)}
                  placeholder="Описание"
                  className="w-full border rounded-2xl px-4 py-3"
                />
                <div className="text-xs text-slate-500">
                  Пример: “Смяна на осветление на етажа”
                </div>
              </div>

              <div className="flex items-end">
                <button
                  onClick={addExpense}
                  className="w-full rounded-2xl px-4 py-3 bg-slate-900 text-white font-semibold"
                >
                  Добави разход
                </button>
              </div>
            </div>

            <div className="mt-5">
              <div className="text-sm font-semibold text-slate-800">История на разходите</div>

              {!expenses?.length ? (
                <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Няма добавени разходи. Когато добавиш първия, ще се появи тук.
                </div>
              ) : (
                <>
                  <div className="mt-3 rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="grid grid-cols-12 gap-2 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600">
                      <div className="col-span-1">№</div>
                      <div className="col-span-3">Дата</div>
                      <div className="col-span-6">Описание</div>
                      <div className="col-span-2 text-right">Сума</div>
                    </div>

                    {expensesSorted.map((e, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-12 gap-2 border-t px-4 py-3 text-sm items-center"
                      >
                        <div className="col-span-1 text-slate-500">{expensesSorted.length - i}</div>
                        <div className="col-span-3 text-slate-600">
                          {e.createdAt ? new Date(e.createdAt).toLocaleString("bg-BG") : "—"}
                        </div>
                        <div className="col-span-6 min-w-0">
                          <div className="font-semibold text-slate-900 truncate">
                            {e.description || "Разход"}
                          </div>
                        </div>
                        <div className="col-span-2 text-right font-bold text-red-700">
                          -{Number(e.amount || 0).toFixed(2)} €
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-sm font-semibold text-slate-900">Кумулативен преглед</div>
                    <div className="text-xs text-slate-500 mt-1">
                      Тази таблица показва как нараства общата сума на разходите с времето (от най-стария към най-новия).
                    </div>

                    <div className="mt-3 rounded-2xl border border-slate-200 overflow-hidden">
                      <div className="grid grid-cols-12 gap-2 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600">
                        <div className="col-span-1">№</div>
                        <div className="col-span-3">Дата</div>
                        <div className="col-span-5">Описание</div>
                        <div className="col-span-2 text-right">Разход</div>
                        <div className="col-span-1 text-right">Общо</div>
                      </div>

                      {expensesCumulative.map((row, idx) => {
                        const e = row.e;
                        return (
                          <div key={idx} className="grid grid-cols-12 gap-2 border-t px-4 py-3 text-sm items-center">
                            <div className="col-span-1 text-slate-500">{idx + 1}</div>
                            <div className="col-span-3 text-slate-600">
                              {e.createdAt ? new Date(e.createdAt).toLocaleString("bg-BG") : "—"}
                            </div>
                            <div className="col-span-5 min-w-0">
                              <div className="truncate font-semibold text-slate-900">{e.description || "Разход"}</div>
                            </div>
                            <div className="col-span-2 text-right font-bold text-red-700">
                              -{Number(e.amount || 0).toFixed(2)} €
                            </div>
                            <div className="col-span-1 text-right font-bold text-slate-900">
                              {Number(row.cumulative || 0).toFixed(2)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <div className="font-semibold">Бележка за прозрачност</div>
              <p className="mt-1">
                Препоръчително е разходите да се добавят с конкретно описание (фактура/протокол), за да са ясни при проверка и отчет.
              </p>
            </div>
          </div>
        )}

        {/* Policy */}
        <div id="policy" className="rounded-3xl bg-white p-6 shadow-soft">
          <h2 className="text-lg font-bold text-slate-900">Политика за прозрачност и отчетност</h2>
          <div className="mt-3 text-sm text-slate-700 space-y-3">
            <p>
              Този модул има за цел да осигури лесен и ясен вътрешен отчет. Всяка промяна по баланса следва конкретно събитие:
              плащане (отразено чрез Stripe webhook) или разход (въведен от домоуправителя).
            </p>
            <p>
              Практиката при управление на етажна собственост показва, че най-честите проблеми идват от неясни разходи или липса на единна история.
              Затова системата пази история на разходите и показва текущото състояние по прозрачен начин.
            </p>
            <p>
              Препоръчва се домоуправителят да въвежда разходи с максимално конкретно описание: дата, изпълнител, основание и при възможност номер на документ.
              Това улеснява отчетите и намалява споровете между живущите.
            </p>
            <p>
              Забележка: IBAN полето е информативно. То може да се използва за публикуване в обява/табло, но системата не прави банкови преводи.
              Плащанията по начисления се обработват през Stripe Checkout.
            </p>
          </div>
        </div>

        {/* FAQ */}
        <div id="faq" className="rounded-3xl bg-white p-6 shadow-soft">
          <h2 className="text-lg font-bold text-slate-900">Често задавани въпроси</h2>
          <div className="mt-3 space-y-3 text-sm text-slate-700">
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="font-semibold text-slate-900">Това банков баланс ли е?</div>
              <div className="mt-1">
                Не. Това е вътрешен счетоводен баланс за нуждите на отчетността в системата.
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="font-semibold text-slate-900">Защо трябва да заключвам данните?</div>
              <div className="mt-1">
                Заключването фиксира получател и IBAN, така че информацията да е стабилна и да не се променя случайно след време.
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="font-semibold text-slate-900">Как се увеличава балансът?</div>
              <div className="mt-1">
                При успешно плащане през Stripe (checkout.session.completed webhook) и когато финансите са заключени.
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="font-semibold text-slate-900">Мога ли да редактирам разход?</div>
              <div className="mt-1">
                В текущата версия разходите се добавят като история. Ако искате редакция/анулиране, това може да се добави като отделен процес с права и логове.
              </div>
            </div>
          </div>
        </div>

        {/* Not locked state helper */}
        {!locked && (
          <div className="rounded-3xl bg-white p-6 shadow-soft">
            <h2 className="text-lg font-bold text-slate-900">Преди да започнеш</h2>
            <p className="mt-2 text-sm text-slate-600">
              За да се активира балансът и разходите, първо въведи данните за получаване на средства и ги заключи.
              Това гарантира, че след refresh данните няма да изчезнат.
            </p>

            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <b>Съвет:</b> Ако не сте сигурни какъв е стартовият баланс, въведете 0, заключете и започнете да въвеждате разходите оттук нататък.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
