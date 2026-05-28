import { useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../store/auth";
import { PageHeader, HelpCard, ErrorBox, SuccessBox } from "../components/PageBits";
import SiteFooter from "../components/SiteFooter";
import { getUserApartments } from "../lib/apartments";

function fmtDateTime(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("bg-BG");
  } catch {
    return "—";
  }
}

// Лека класификация (frontend-only), за да има повече “материал” и контекст без backend промени
function detectCategory(s) {
  const t = String(s?.title || "").toLowerCase();
  const d = String(s?.description || "").toLowerCase();
  const x = `${t} ${d}`;

  if (x.includes("вода") || x.includes("теч") || x.includes("канал") || x.includes("тръба")) return "Вода/Канал";
  if (x.includes("ток") || x.includes("крушк") || x.includes("освет") || x.includes("табло")) return "Електро";
  if (x.includes("асансьор") || x.includes("лифт")) return "Асансьор";
  if (x.includes("врата") || x.includes("брава") || x.includes("домофон")) return "Достъп/Домофон";
  if (x.includes("почиств") || x.includes("мръс") || x.includes("миризма")) return "Почистване";
  if (x.includes("шум") || x.includes("наруш") || x.includes("правил")) return "Правила/Ред";
  return "Друго";
}

export default function Signals() {
  const { user } = useAuth();
  const isManager = user?.role === "manager";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [floor, setFloor] = useState("");
  const [apartment, setApartment] = useState("");

  // UI filters / “registry” feel
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCount, setShowCount] = useState(50);

  const myId = user?.id || user?._id;
  const ownedApartments = useMemo(() => getUserApartments(user), [user]);

  useEffect(() => {
    setApartment((current) => {
      if (current && ownedApartments.includes(current)) return current;
      return ownedApartments[0] || "";
    });
  }, [ownedApartments]);

  const load = async () => {
    try {
      setLoading(true);
      setErr("");
      const res = await api.get("/api/signals");
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

  const create = async (e) => {
    e.preventDefault();
    try {
      setErr("");
      setMsg("");

      await api.post("/api/signals", {
        title,
        description,
        floor,
        apartment: apartment || ownedApartments[0] || user?.apartment || "",
      });

      setMsg("Сигналът е изпратен.");
      setTitle("");
      setDescription("");
      setFloor("");
      await load();
    } catch (e2) {
      setErr(e2?.response?.data?.message || "Грешка при изпращане");
    }
  };

  const updateStatus = async (id, status) => {
    try {
      setErr("");
      setMsg("");
      await api.put(`/api/signals/${id}`, { status });
      setMsg("Статусът е обновен.");
      await load();
    } catch (e) {
      setErr(e?.response?.data?.message || "Грешка при обновяване");
    }
  };

  const badge = (s) => {
    const map = {
      open: "bg-amber-50 text-amber-900 border-amber-200",
      in_progress: "bg-slate-50 text-slate-900 border-slate-200",
      done: "bg-emerald-50 text-emerald-900 border-emerald-200",
      rejected: "bg-rose-50 text-rose-900 border-rose-200",
    };
    const label = {
      open: "Отворен",
      in_progress: "В процес",
      done: "Завършен",
      rejected: "Отхвърлен",
    };
    return (
      <span className={`inline-flex text-xs px-2.5 py-1 rounded-full border ${map[s] || "bg-slate-100 text-slate-700 border-slate-200"}`}>
        {label[s] || "—"}
      </span>
    );
  };

  // privacy — resident вижда само своите сигнали
  const visibleItems = useMemo(() => {
    if (isManager) return items;

    const uid = String(myId || "");
    return items.filter((s) => {
      const createdById = String(s?.createdBy?._id || s?.createdBy || "");
      return createdById && uid && createdById === uid;
    });
  }, [items, isManager, myId]);

  const stats = useMemo(() => {
    const total = visibleItems.length;
    const by = { open: 0, in_progress: 0, done: 0, rejected: 0, other: 0 };
    for (const s of visibleItems) {
      const st = s?.status || "";
      if (by[st] !== undefined) by[st] += 1;
      else by.other += 1;
    }

    const newest = visibleItems?.[0] || null;
    const newestText = newest ? `${fmtDateTime(newest.createdAt)} • ${newest.title || "—"}` : "—";

    return { total, by, newestText };
  }, [visibleItems]);

  const filtered = useMemo(() => {
    const query = String(q || "").trim().toLowerCase();

    return visibleItems.filter((s) => {
      if (statusFilter !== "all" && String(s?.status || "") !== statusFilter) return false;

      if (!query) return true;

      // при resident не включваме createdBy.name в търсенето (анонимност в UI)
      const hay = isManager
        ? `${s?.title || ""} ${s?.description || ""} ${s?.createdBy?.name || ""} ${s?.floor || ""} ${s?.apartment || ""}`.toLowerCase()
        : `${s?.title || ""} ${s?.description || ""} ${s?.floor || ""} ${s?.apartment || ""}`.toLowerCase();

      return hay.includes(query);
    });
  }, [visibleItems, q, statusFilter, isManager]);

  const shortList = useMemo(() => filtered.slice(0, showCount), [filtered, showCount]);

  const templateText = useMemo(() => {
    return [
      "Заглавие:",
      "- (кратко описание на проблема)",
      "",
      "Детайли:",
      "1) Къде е проблемът (етаж/стълбище/до кой апартамент):",
      "2) Какво точно се случва (симптоми):",
      "3) От кога е (приблизително):",
      "4) Има ли риск/опасност (вода, ток, хлъзгаво):",
      "5) Достъп/контакт (ако е необходимо):",
    ].join("\n");
  }, []);

  const listTitle = isManager ? "Регистър сигнали" : "Моите сигнали";
  const listSubtitle = isManager
    ? "Като домоуправител можеш да променяш статуса, за да е ясно какво се случва."
    : "Виждаш само твоите сигнали и техния статус. Други сигнали не се показват, за да има анонимност.";

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <div className="flex-1 p-6">
        <div className="max-w-6xl mx-auto space-y-4">
          <PageHeader
            title="Сигнали"
            subtitle={
              <>
                Подай проблем/ремонт към домоуправителя. Няма избор на вход — входът е фиксиран по стаята.
                <br />
                {isManager
                  ? "Като домоуправител виждаш всички сигнали и управляваш статуса."
                  : "Като живущ виждаш само твоите сигнали и техния статус."}
              </>
            }
            right={
              <button
                onClick={load}
                className="rounded-2xl px-4 py-2 text-sm font-semibold border border-slate-300 text-slate-900 hover:bg-slate-100 transition"
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
              {/* Summary */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="font-black text-slate-900">Обобщение</div>
                <div className="text-sm text-slate-600 mt-2">
                  {isManager
                    ? "Това е регистър на проблеми и заявки. Целта е проследимост: кога е подадено, къде е и в какъв статус е."
                    : "Тук виждаш само твоите сигнали. Това осигурява анонимност и намалява излишни дискусии между живущите."}
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-xs text-slate-500">{isManager ? "Общо сигнали" : "Мои сигнали"}</div>
                    <div className="text-2xl font-black text-slate-900">{stats.total}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-xs text-slate-500">Отворени</div>
                    <div className="text-2xl font-black text-slate-900">{stats.by.open}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-xs text-slate-500">В процес</div>
                    <div className="text-2xl font-black text-slate-900">{stats.by.in_progress}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-xs text-slate-500">Завършени</div>
                    <div className="text-2xl font-black text-slate-900">{stats.by.done}</div>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <div className="font-semibold">Последен сигнал</div>
                  <div className="mt-1">{stats.newestText}</div>
                </div>
              </div>

              {/* Create */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="font-black text-slate-900">Нов сигнал</div>
                <div className="text-sm text-slate-600 mt-2">
                  Напиши ясно какво е проблемът и къде се намира. Колкото по-конкретно, толкова по-бързо се решава.
                </div>

                <form onSubmit={create} className="mt-4 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Заглавие</label>
                    <input
                      className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="пример: Изгоряла крушка на стълбището"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Етаж (по желание)</label>
                      <input
                        className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                        value={floor}
                        onChange={(e) => setFloor(e.target.value)}
                        placeholder="пример: 3"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Апартамент</label>
                      {ownedApartments.length > 0 ? (
                        <select
                          className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                          value={apartment}
                          onChange={(e) => setApartment(e.target.value)}
                        >
                          {ownedApartments.map((apt) => (
                            <option key={apt} value={apt}>
                              Ап. {apt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                          value={apartment}
                          onChange={(e) => setApartment(e.target.value)}
                          placeholder="пример: 12"
                        />
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Описание</label>
                    <textarea
                      className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 min-h-[130px]"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Опиши проблема: къде е, от кога, има ли риск/опасност..."
                    />
                  </div>

                  <button className="w-full rounded-2xl px-4 py-3.5 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition shadow-sm">
                    Изпрати сигнал
                  </button>
                </form>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <div className="font-semibold">Шаблон (по желание)</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Можеш да копираш и да попълниш по точки. Това помага сигналът да е максимално ясен.
                  </div>
                  <pre className="mt-3 text-xs whitespace-pre-wrap leading-relaxed text-slate-700">{templateText}</pre>
                </div>
              </div>

              {/* Registry list */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="font-black text-slate-900">{listTitle}</div>
                <div className="text-sm text-slate-600 mt-2">{listSubtitle}</div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Търсене</label>
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="пример: вода, ток, асансьор, апартамент..."
                      className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Статус</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                    >
                      <option value="all">Всички</option>
                      <option value="open">Отворен</option>
                      <option value="in_progress">В процес</option>
                      <option value="done">Завършен</option>
                      <option value="rejected">Отхвърлен</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Показване</label>
                    <select
                      value={showCount}
                      onChange={(e) => setShowCount(Number(e.target.value))}
                      className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                    >
                      {[25, 50, 100].map((n) => (
                        <option key={n} value={n}>
                          {n} сигнала
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {loading ? (
                  <div className="text-sm text-slate-500 mt-4">Зареждане...</div>
                ) : shortList.length === 0 ? (
                  <div className="text-sm text-slate-500 mt-4">
                    {isManager ? "Няма сигнали по тези критерии." : "Нямаш подадени сигнали по тези критерии."}
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {shortList.map((s) => {
                      const cat = detectCategory(s);

                      return (
                        <div key={s._id} className="rounded-3xl border border-slate-200 p-5 bg-white shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="font-black text-slate-900">{s.title}</div>
                                {badge(s.status)}
                              </div>

                              <div className="text-xs text-slate-500 mt-1">
                                {fmtDateTime(s.createdAt)}
                                {isManager ? ` • ${s.createdBy?.name || "—"}` : ""}
                                {" • "}
                                {cat}
                              </div>

                              <div className="text-sm text-slate-700 mt-3 whitespace-pre-wrap leading-relaxed">
                                {s.description}
                              </div>

                              <div className="text-xs text-slate-500 mt-3">
                                {s.floor ? `Етаж: ${s.floor} • ` : ""}
                                {s.apartment ? `Ап: ${s.apartment} • ` : ""}
                                Статус: {badge(s.status)}
                              </div>
                            </div>

                            <div className="shrink-0">{badge(s.status)}</div>
                          </div>

                          {isManager && (
                            <div className="mt-4 flex flex-wrap gap-2">
                              <button
                                onClick={() => updateStatus(s._id, "open")}
                                className="rounded-2xl px-3 py-2 text-xs font-semibold border border-slate-300 text-slate-900 hover:bg-slate-100 transition"
                              >
                                Отворен
                              </button>
                              <button
                                onClick={() => updateStatus(s._id, "in_progress")}
                                className="rounded-2xl px-3 py-2 text-xs font-semibold border border-slate-300 text-slate-900 hover:bg-slate-100 transition"
                              >
                                В процес
                              </button>
                              <button
                                onClick={() => updateStatus(s._id, "done")}
                                className="rounded-2xl px-3 py-2 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition"
                              >
                                Завършен
                              </button>
                              <button
                                onClick={() => updateStatus(s._id, "rejected")}
                                className="rounded-2xl px-3 py-2 text-xs font-semibold border border-rose-300 text-rose-900 hover:bg-rose-50 transition"
                              >
                                Отхвърли
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {filtered.length > shortList.length && (
                      <div className="pt-2">
                        <button
                          onClick={() => setShowCount((x) => Math.min((x || 0) + 50, 500))}
                          className="rounded-2xl px-4 py-2.5 text-sm font-semibold border border-slate-300 text-slate-900 hover:bg-slate-100 transition"
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
              <HelpCard title="Как да пишеш добър сигнал">
                <ul className="list-disc pl-5 mt-2 space-y-2">
                  <li>Къде точно е проблемът (етаж/до кой апартамент/стълбище)?</li>
                  <li>От кога е и дали се влошава?</li>
                  <li>Има ли опасност (ток, вода, хлъзгаво)?</li>
                </ul>
              </HelpCard>

              <HelpCard title="Анонимност и видимост">
                <div className="text-sm text-slate-700 space-y-2">
                  <div>Живущите виждат само своите сигнали и техния статус.</div>
                  <div>Домоуправителят вижда всички сигнали, за да може да ги обработва и да управлява статуса.</div>
                  <div>
                    За пълна анонимност е препоръчително това правило да се наложи и в backend (API да връща само “моите” за Живущ).
                  </div>
                </div>
              </HelpCard>

              <HelpCard title="Ако секцията е заключена">
                Ако получиш съобщение, че входът не е активен — trial/абонаментът е изтекъл. Проверяваш статуса в <b>Стая</b> или <b>Табло</b>.
              </HelpCard>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-sm font-semibold text-slate-900">Работен процес</div>
                <div className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Добра практика е домоуправителят да сменя статуса при всяко движение: приемане, започване на работа, завършване или отказ с причина.
                  Така сигналите стават “история”, а не чат.
                </div>
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  Категорията в списъка е frontend-only и служи за по-лесно ориентиране без промени по backend-а.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      
    </div>
  );
}
