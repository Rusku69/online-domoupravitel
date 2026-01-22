import { useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../store/auth";
import { PageHeader, HelpCard, ErrorBox, SuccessBox } from "../components/PageBits";

function fmtDateTime(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("bg-BG");
  } catch {
    return "—";
  }
}

// Лека класификация (frontend-only), за да има "материал" и филтри без backend промени
function detectCategory(a) {
  const t = String(a?.title || "").toLowerCase();
  const c = String(a?.content || "").toLowerCase();
  const s = `${t} ${c}`;

  if (s.includes("събрание") || s.includes("протокол") || s.includes("решение")) return "Събрание";
  if (s.includes("ремонт") || s.includes("асансьор") || s.includes("ток") || s.includes("вода") || s.includes("замяна"))
    return "Ремонт и поддръжка";
  if (s.includes("срок") || s.includes("краен") || s.includes("до ") || s.includes("напомняне")) return "Срокове";
  if (s.includes("правило") || s.includes("забран") || s.includes("тишина") || s.includes("общи части")) return "Правила";
  if (s.includes("такса") || s.includes("плащане") || s.includes("начисление") || s.includes("финанси")) return "Финанси";
  return "Общо";
}

export default function Announcements() {
  const { user } = useAuth();
  const isManager = user?.role === "manager";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  // form (manager)
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // UI filters / archive feel
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("Всички");
  const [showCount, setShowCount] = useState(50);

  const load = async () => {
    try {
      setLoading(true);
      setErr("");
      const res = await api.get("/api/announcements");
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

      if (!title.trim() || !content.trim()) {
        setErr("Попълни заглавие и съдържание.");
        return;
      }

      await api.post("/api/announcements", { title: title.trim(), content: content.trim() });
      setMsg("Обявата е публикувана.");
      setTitle("");
      setContent("");
      await load();
    } catch (e2) {
      setErr(e2?.response?.data?.message || "Грешка при публикуване");
    }
  };

  const remove = async (id) => {
    try {
      setErr("");
      setMsg("");
      await api.delete(`/api/announcements/${id}`);
      setMsg("Обявата е изтрита.");
      await load();
    } catch (e) {
      setErr(e?.response?.data?.message || "Грешка при изтриване");
    }
  };

  const categories = useMemo(() => {
    const set = new Set(["Всички"]);
    for (const a of items) set.add(detectCategory(a));
    return Array.from(set);
  }, [items]);

  const filtered = useMemo(() => {
    const query = String(q || "").trim().toLowerCase();
    return items.filter((a) => {
      const cat = detectCategory(a);
      if (category !== "Всички" && cat !== category) return false;

      if (!query) return true;
      const hay = `${a?.title || ""} ${a?.content || ""} ${a?.createdBy?.name || ""}`.toLowerCase();
      return hay.includes(query);
    });
  }, [items, q, category]);

  const shortList = useMemo(() => filtered.slice(0, showCount), [filtered, showCount]); // safety / archive feel

  const stats = useMemo(() => {
    const total = items.length;
    const totalFiltered = filtered.length;
    const newest = items[0] || null; // assuming backend returns newest first; if not, it's still ok for display
    const newestText = newest ? `${fmtDateTime(newest.createdAt)} • ${newest.createdBy?.name || "—"}` : "—";

    // category counts
    const map = {};
    for (const a of items) {
      const cat = detectCategory(a);
      map[cat] = (map[cat] || 0) + 1;
    }

    return { total, totalFiltered, newestText, byCategory: map };
  }, [items, filtered]);

  const templateText = useMemo(() => {
    return [
      "Заглавие:",
      "- (кратко и ясно; ако има срок, включи го)",
      "",
      "Информация:",
      "1) Какво се случва:",
      "2) Кога (дата/час):",
      "3) Къде:",
      "4) Кой/контакт:",
      "5) Какво трябва да направят живущите:",
      "",
      "Срокове:",
      "- Краен срок: (ако има)",
      "",
      "Бележка:",
      "- (допълнителни условия/детайли)",
    ].join("\n");
  }, []);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-sky-50 p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <PageHeader
          title="Обяви"
          subtitle={
            <>
              Обявите са официалните съобщения за входа: ремонти, събрания, правила, важни срокове.
              <br />
              Домоуправителят публикува, а живущите само четат. Няма избор на блок/вход — всичко е по стаята.
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
            {/* Summary */}
            <div className="rounded-3xl border border-sky-100 bg-white p-6 shadow-soft">
              <div className="font-black text-slate-900">Обобщение</div>
              <div className="text-sm text-slate-600 mt-2">
                Това е централното място за официални съобщения. Подходящо е за информация, която трябва да остане
                видима във времето: срокове, правила, решения, ремонти, напомняния.
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-xs text-slate-500">Общо обяви</div>
                  <div className="text-2xl font-black text-slate-900">{stats.total}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-xs text-slate-500">Резултати по филтър</div>
                  <div className="text-2xl font-black text-slate-900">{stats.totalFiltered}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-xs text-slate-500">Последна публикация</div>
                  <div className="text-sm font-semibold text-slate-900 mt-1">{stats.newestText}</div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <div className="font-semibold">Структура на информацията</div>
                <div className="mt-1">
                  Добра практика е всяка обява да съдържа ясно: какво, кога, къде, кой и срок (ако има).
                  Така се намаляват въпросите и недоразуменията.
                </div>
              </div>
            </div>

            {/* Manager: Create */}
            {isManager && (
              <div className="rounded-3xl border border-sky-100 bg-white p-6 shadow-soft">
                <div className="font-black text-slate-900">Нова обява</div>
                <div className="text-sm text-slate-600 mt-2">
                  Пиши кратко и ясно. Ако има срок — напиши го в текста, за да няма объркване.
                </div>

                <form onSubmit={create} className="mt-4 space-y-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Заглавие</label>
                    <input
                      className="w-full border rounded-2xl px-4 py-3"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="пример: Събрание на входа — неделя 19:00"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Съдържание</label>
                    <textarea
                      className="w-full border rounded-2xl px-4 py-3 min-h-[160px]"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Опиши: какво се случва, кога, къде, какво трябва да направят живущите..."
                    />
                  </div>

                  <button className="w-full rounded-2xl px-4 py-3 text-sm font-semibold bg-sky-600 text-white hover:bg-sky-700">
                    Публикувай
                  </button>
                </form>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <div className="font-semibold">Шаблон (по желание)</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Можеш да копираш и да попълниш по точки. Това прави обявите по-ясни.
                  </div>
                  <pre className="mt-3 text-xs whitespace-pre-wrap leading-relaxed text-slate-700">
                    {templateText}
                  </pre>
                </div>
              </div>
            )}

            {/* Archive / List */}
            <div className="rounded-3xl border border-sky-100 bg-white p-6 shadow-soft">
              <div className="font-black text-slate-900">Всички обяви</div>
              <div className="text-sm text-slate-600 mt-2">
                Най-новите са най-отгоре. Можеш да търсиш по заглавие, текст или автор и да филтрираш по тип.
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Търсене</label>
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="пример: събрание, ремонт, срок, име..."
                    className="w-full border rounded-2xl px-4 py-3"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">Тип</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full border rounded-2xl px-4 py-3 bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c} {c !== "Всички" ? `(${stats.byCategory?.[c] || 0})` : ""}
                      </option>
                    ))}
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
                        {n} обяви
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {loading ? (
                <div className="text-sm text-slate-500 mt-4">Зареждане...</div>
              ) : shortList.length === 0 ? (
                <div className="text-sm text-slate-500 mt-4">Няма публикувани обяви по тези критерии.</div>
              ) : (
                <div className="mt-4 space-y-3">
                  {shortList.map((a) => {
                    const cat = detectCategory(a);
                    return (
                      <div key={a._id} className="rounded-3xl border border-slate-200 p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-black text-slate-900">{a.title}</div>
                            <div className="text-xs text-slate-500 mt-1">
                              {fmtDateTime(a.createdAt)} • {a.createdBy?.name || "—"} • {cat}
                            </div>
                          </div>

                          {isManager && (
                            <button
                              onClick={() => remove(a._id)}
                              className="rounded-2xl px-3 py-2 text-xs font-semibold border border-red-200 text-red-700 hover:bg-red-50"
                            >
                              Изтрий
                            </button>
                          )}
                        </div>

                        <div className="text-sm text-slate-700 mt-3 whitespace-pre-wrap leading-relaxed">
                          {a.content}
                        </div>
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

          {/* ASIDE */}
          <div className="space-y-4">
            <HelpCard title="За какво са обявите">
              <ul className="list-disc pl-5 mt-2 space-y-2">
                <li>Официална информация за входа (ремонти, събрания, срокове).</li>
                <li>Правила и напомняния (пример: тишина, общи части).</li>
                <li>Всички живущи ги виждат на едно място.</li>
              </ul>
            </HelpCard>

            <HelpCard title="Добра практика">
              Публикувай обяви с ясни точки: <b>Кога</b>, <b>Къде</b>, <b>Какво</b>, <b>Кой</b>.
              Ако има срок — напиши го в текста и го повтори накрая.
            </HelpCard>

            <HelpCard title="Политика за публикуване">
              <div className="text-sm text-slate-700 space-y-2">
                <div>
                  Обявите трябва да са кратки, проверими и по възможност да съдържат конкретика (дата/час/място/срок).
                </div>
                <div>
                  Ако обявата е свързана с ремонт или услуга, добра практика е да се упомене как се осигурява достъп,
                  кой е изпълнителят и дали има шум/ограничения.
                </div>
                <div>
                  Ако обявата съдържа решение от събрание, препоръчително е да има текст: “Решението влиза в сила от …”.
                </div>
              </div>
            </HelpCard>
          </div>
        </div>
      </div>
    </div>
  );
}
