import { useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../store/auth";
import { PageHeader, HelpCard, ErrorBox, SuccessBox } from "../components/PageBits";

function fmtDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("bg-BG");
  } catch {
    return "—";
  }
}

function fmtDateTime(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("bg-BG");
  } catch {
    return "—";
  }
}

export default function Payments() {
  const { user } = useAuth();
  const isManager = user?.role === "manager";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  // create form (manager)
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [apartment, setApartment] = useState(""); // "" => всички
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // filters / archive feel
  const [q, setQ] = useState("");
  const [scopeFilter, setScopeFilter] = useState("all"); // all | all_apts | single_apt
  const [statusFilter, setStatusFilter] = useState("all"); // all | paid_any | unpaid_all | paid_by_me | unpaid_by_me
  const [showCount, setShowCount] = useState(50);

  const load = async () => {
    try {
      setLoading(true);
      setErr("");
      const res = await api.get("/api/payments");
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setErr(e?.response?.data?.message || "Грешка при зареждане");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // показваме съобщение при връщане от Stripe success/cancel
  // auto refresh + clean URL
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);

      const paid = params.get("paid") === "1";
      const canceled = params.get("canceled") === "1";

      if (paid) {
        setMsg("Плащането е успешно. Благодарим!");
        load();
      } else if (canceled) {
        setErr("Плащането беше отказано/прекъснато.");
      }

      if (paid || canceled) {
        window.history.replaceState({}, "", window.location.pathname);
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const myId = user?.id || user?._id;

  // за resident: намираме "моето" плащане за конкретно начисление
  const myPaidMap = useMemo(() => {
    const map = new Map();
    for (const p of items) {
      const hit = (p.paidBy || []).find((x) => String(x.user?._id || x.user) === String(myId));
      if (hit) map.set(String(p._id), hit);
    }
    return map;
  }, [items, myId]);

  const createPayment = async (e) => {
    e.preventDefault();
    try {
      setErr("");
      setMsg("");

      await api.post("/api/payments/create", {
        description,
        amount, // EUR
        apartment,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
      });

      setMsg("Начислението е добавено.");
      setDescription("");
      setAmount("");
      setApartment("");
      setDateFrom("");
      setDateTo("");
      await load();
    } catch (e2) {
      setErr(e2?.response?.data?.message || "Грешка при създаване");
    }
  };

  // Stripe Checkout (guest)
  const payWithStripe = async (id) => {
    try {
      setErr("");
      setMsg("");

      const res = await api.post(`/api/payments/${id}/checkout`);
      const url = res?.data?.url;

      if (!url) {
        setErr("Липсва Stripe checkout URL.");
        return;
      }

      window.location.href = url;
    } catch (e) {
      setErr(e?.response?.data?.message || "Грешка при Stripe плащане");
    }
  };

  const filtered = useMemo(() => {
    const query = String(q || "").trim().toLowerCase();

    return items.filter((p) => {
      const isForAll = !String(p.apartment || "").trim();
      const isForSingle = !!String(p.apartment || "").trim();

      if (scopeFilter === "all_apts" && !isForAll) return false;
      if (scopeFilter === "single_apt" && !isForSingle) return false;

      const paidCount = (p.paidBy || []).length;
      const paidAny = paidCount > 0;

      const myPaid = myPaidMap.get(String(p._id)) || null;
      const myPaidBool = !!myPaid;

      if (statusFilter === "paid_any" && !paidAny) return false;
      if (statusFilter === "unpaid_all" && paidAny) return false;

      if (!isManager) {
        if (statusFilter === "paid_by_me" && !myPaidBool) return false;
        if (statusFilter === "unpaid_by_me" && myPaidBool) return false;
      }

      if (!query) return true;

      const hay = `${p?.description || ""} ${p?.apartment || ""} ${fmtDate(p?.dateFrom)} ${fmtDate(p?.dateTo)}`.toLowerCase();
      return hay.includes(query);
    });
  }, [items, q, scopeFilter, statusFilter, isManager, myPaidMap]);

  const shortList = useMemo(() => filtered.slice(0, showCount), [filtered, showCount]);

  const stats = useMemo(() => {
    const total = items.length;
    const filteredCount = filtered.length;

    let paidAny = 0;
    let unpaidAll = 0;

    for (const p of items) {
      const paidCount = (p.paidBy || []).length;
      if (paidCount > 0) paidAny += 1;
      else unpaidAll += 1;
    }

    return { total, filteredCount, paidAny, unpaidAll };
  }, [items, filtered]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-sky-50 p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <PageHeader
          title="Плащания"
          subtitle={
            <>
              Тук се управляват начисленията за входа. Няма избор на вход — ти вече си във конкретната стая.
              <br />
              Важно: ако начислението е за конкретен апартамент, ще го вижда само този апартамент.
              <br />
              Плащането става през Stripe Checkout като гост. Всички суми са в EUR (€).
            </>
          }
          right={
            <button
              onClick={load}
              className="rounded-2xl px-4 py-2 text-sm font-semibold border border-sky-200 text-sky-700 hover:bg-sky-50"
            >
              Обнови
            </button>
          }
        />

        <ErrorBox>{err}</ErrorBox>
        <SuccessBox>{msg}</SuccessBox>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* MAIN */}
          <div className="lg:col-span-2 space-y-4">
            {/* Summary / material */}
            <div className="rounded-3xl border border-sky-100 bg-white p-6 shadow-soft">
              <div className="font-black text-slate-900">Обобщение</div>
              <div className="text-sm text-slate-600 mt-2">
                Тази секция показва списък с начисления и статус на плащанията. Начисление може да бъде “за всички” или “за конкретен апартамент”.
                При плащане системата записва кой потребител е платил чрез Stripe webhook.
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-xs text-slate-500">Общо начисления</div>
                  <div className="text-2xl font-black text-slate-900">{stats.total}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-xs text-slate-500">Показани</div>
                  <div className="text-2xl font-black text-slate-900">{stats.filteredCount}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-xs text-slate-500">Има платили</div>
                  <div className="text-2xl font-black text-slate-900">{stats.paidAny}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-xs text-slate-500">Без платили</div>
                  <div className="text-2xl font-black text-slate-900">{stats.unpaidAll}</div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <div className="font-semibold">Бележка</div>
                <div className="mt-1">
                  Вътрешният баланс (в “Справки”) се увеличава само ако финансите са заключени. Това е отчетност в системата, не банково салдо.
                </div>
              </div>
            </div>

            {/* Manager create */}
            {isManager && (
              <div className="rounded-3xl border border-sky-100 bg-white p-6 shadow-soft">
                <div className="font-black text-slate-900">Ново начисление</div>
                <div className="text-sm text-slate-600 mt-2">
                  Създаваш начисление за всички (празен апартамент) или за конкретен апартамент (пример: 12). Сумата е в EUR (€).
                </div>

                <form onSubmit={createPayment} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-500 mb-1">Описание</label>
                    <input
                      className="w-full border rounded-2xl px-4 py-3"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="пример: Почистване, Осветление, Асансьор..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Сума (EUR)</label>
                    <input
                      className="w-full border rounded-2xl px-4 py-3"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="пример: 5"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Апартамент (празно = за всички)</label>
                    <input
                      className="w-full border rounded-2xl px-4 py-3"
                      value={apartment}
                      onChange={(e) => setApartment(e.target.value)}
                      placeholder="пример: 12"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1">От дата (по желание)</label>
                    <input
                      type="date"
                      className="w-full border rounded-2xl px-4 py-3"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1">До дата (по желание)</label>
                    <input
                      type="date"
                      className="w-full border rounded-2xl px-4 py-3"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <button className="w-full rounded-2xl px-4 py-3 text-sm font-semibold bg-sky-600 text-white hover:bg-sky-700">
                      Запази начисление
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Archive list */}
            <div className="rounded-3xl border border-sky-100 bg-white p-6 shadow-soft">
              <div className="font-black text-slate-900">Начисления</div>
              <div className="text-sm text-slate-600 mt-2">
                {isManager
                  ? "Виждаш всички начисления в стаята. Ако апартамент е попълнен — начислението е само за него."
                  : "Виждаш начисленията за всички и тези, които са само за твоя апартамент."}
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs text-slate-500 mb-1">Търсене</label>
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="пример: почистване, асансьор, ап. 12..."
                    className="w-full border rounded-2xl px-4 py-3"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">Обхват</label>
                  <select
                    value={scopeFilter}
                    onChange={(e) => setScopeFilter(e.target.value)}
                    className="w-full border rounded-2xl px-4 py-3 bg-white"
                  >
                    <option value="all">Всички</option>
                    <option value="all_apts">Само за всички</option>
                    <option value="single_apt">Само за апартамент</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">Показване</label>
                  <select
                    value={showCount}
                    onChange={(e) => setShowCount(Number(e.target.value))}
                    className="w-full border rounded-2xl px-4 py-3 bg-white"
                  >
                    {[25, 50, 100].map((n) => (
                      <option key={n} value={n}>
                        {n} начисления
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs text-slate-500 mb-1">Статус</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full border rounded-2xl px-4 py-3 bg-white"
                  >
                    <option value="all">Всички</option>
                    <option value="paid_any">Има платили</option>
                    <option value="unpaid_all">Без платили</option>
                    {!isManager && <option value="paid_by_me">Платени от мен</option>}
                    {!isManager && <option value="unpaid_by_me">Неплатени от мен</option>}
                  </select>
                </div>

                <div className="md:col-span-2 flex items-end">
                  <button
                    onClick={() => {
                      setQ("");
                      setScopeFilter("all");
                      setStatusFilter("all");
                      setShowCount(50);
                    }}
                    className="w-full rounded-2xl px-4 py-3 text-sm font-semibold border border-slate-200 hover:bg-slate-50"
                  >
                    Изчисти филтри
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="text-sm text-slate-500 mt-4">Зареждане...</div>
              ) : shortList.length === 0 ? (
                <div className="text-sm text-slate-500 mt-4">Няма начисления по тези критерии.</div>
              ) : (
                <div className="mt-4 space-y-3">
                  {shortList.map((p) => {
                    const myPaid = myPaidMap.get(String(p._id)) || null;
                    const scope = p.apartment ? `Само за ап. ${p.apartment}` : "За всички апартаменти";

                    const paidCount = (p.paidBy || []).length;
                    const amountNum = Number(p.amount) || 0;
                    const collected = paidCount * amountNum;

                    return (
                      <div key={p._id} className="rounded-3xl border border-slate-200 p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-black text-slate-900">{p.description}</div>
                            <div className="text-sm text-slate-600 mt-1">
                              {scope} • {Number(p.amount).toFixed(2)} €
                            </div>
                            <div className="text-xs text-slate-500 mt-2">
                              Период: {fmtDate(p.dateFrom)} → {fmtDate(p.dateTo)}
                            </div>

                            {isManager && (
                              <div className="text-xs text-slate-500 mt-2">
                                Събрано: <b>{Number(collected).toFixed(2)} €</b>
                              </div>
                            )}
                          </div>

                          {!isManager && (
                            <div className="text-right">
                              <div
                                className={`inline-flex text-xs px-2 py-1 rounded-full ${
                                  myPaid ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                                }`}
                              >
                                {myPaid ? "Платено" : "Неплатено"}
                              </div>

                              {myPaid && (
                                <div className="mt-1 text-[11px] text-slate-500">
                                  {myPaid.method === "stripe" ? "Платено чрез Stripe" : "Платено"} • {fmtDateTime(myPaid.paidAt)}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Resident actions */}
                        {!isManager && !myPaid && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              onClick={() => payWithStripe(p._id)}
                              className="rounded-2xl px-4 py-2 text-xs font-semibold bg-sky-600 text-white hover:bg-sky-700"
                            >
                              Плати със Stripe
                            </button>
                          </div>
                        )}

                        {/* Manager details */}
                        {isManager && (
                          <div className="mt-4">
                            <div className="text-xs text-slate-500">Платили: {(p.paidBy || []).length}</div>

                            {(p.paidBy || []).length > 0 && (
                              <div className="mt-3 rounded-2xl border border-slate-200 overflow-hidden">
                                {(p.paidBy || []).map((x, idx) => {
                                  const u = x.user || null;
                                  const name = u?.name || "—";
                                  const apt = u?.apartment || "—";
                                  const methodLabel = x.method === "stripe" ? "Stripe" : x.method || "—";

                                  return (
                                    <div
                                      key={idx}
                                      className="flex items-start justify-between gap-4 border-b last:border-b-0 px-4 py-3 text-sm"
                                    >
                                      <div className="min-w-0">
                                        <div className="font-semibold text-slate-900 truncate">{name}</div>
                                        <div className="text-xs text-slate-500">
                                          Апартамент: <b>{apt}</b> • Метод: <b>{methodLabel}</b>
                                        </div>
                                      </div>
                                      <div className="shrink-0 text-xs text-slate-500">
                                        {fmtDateTime(x.paidAt)}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {filtered.length > shortList.length && (
                    <div className="pt-2">
                      <button
                        onClick={() => setShowCount((x) => Math.min((x || 0) + 50, 500))}
                        className="rounded-2xl px-4 py-2 text-sm font-semibold border border-slate-200 hover:bg-slate-50"
                      >
                        Покажи още
                      </button>
                      <div className="text-xs text-slate-500 mt-2">
                        Показваш {shortList.length} от {filtered.length} резултата.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ASIDE HELP */}
          <div className="space-y-4">
            <HelpCard title="Плащане през Stripe">
              <ul className="list-disc pl-5 mt-2 space-y-2">
                <li>Натискаш “Плати със Stripe” и се отваря Stripe Checkout.</li>
                <li>Плащаш с карта като гост (няма акаунт).</li>
                <li>След успех системата отбелязва плащането чрез webhook.</li>
              </ul>
            </HelpCard>

            <HelpCard title="Политика за начисления">
              <div className="text-sm text-slate-700 space-y-2">
                <div>
                  Начисление за конкретен апартамент се вижда само от този апартамент.
                </div>
                <div>
                  Начисление “за всички” се вижда от всички апартаменти в стаята.
                </div>
                <div>
                  Ако има период, добра практика е да се попълва, за да е ясно какво покрива сумата.
                </div>
              </div>
            </HelpCard>

            <HelpCard title="Ако не се зарежда">
              Ако получиш съобщение, че входът не е активен — trial/абонаментът е изтекъл.
              Проверяваш статуса в <b>Стая</b> или <b>Табло</b>.
            </HelpCard>
          </div>
        </div>
      </div>
    </div>
  );
}
