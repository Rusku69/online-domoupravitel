import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "../lib/api";
import SiteFooter from "../components/SiteFooter";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = params.get("token");
    const email = params.get("email");

    if (!token || !email) {
      setStatus("error");
      setMessage("Невалиден линк за потвърждение.");
      return;
    }

    api
      .post("/api/auth/verify-email", { token, email })
      .then((res) => {
        setStatus("success");
        setMessage(res.data.message || "Имейлът е потвърден.");
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err?.response?.data?.message || "Грешка при потвърждение.");
      });
  }, [params]);

  const isLoading = status === "loading";
  const isSuccess = status === "success";
  const isError = status === "error";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-slate-900 flex items-center justify-center shadow-sm">
              <span className="text-white font-black text-lg">OD</span>
            </div>
            <div>
              <div className="font-semibold text-slate-900 leading-tight">Онлайн Домоуправител</div>
              <div className="text-xs text-slate-500">Потвърждение на имейл</div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="rounded-2xl px-5 py-2.5 text-sm font-semibold border border-slate-300 text-slate-900 hover:bg-slate-100 transition"
            >
              Вход
            </Link>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            {/* Left: result card */}
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <div className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  Проверка на линк
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-3">Потвърждение на имейл</h1>

                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Тази стъпка потвърждава, че имейлът е валиден и че имаш достъп до него. След потвърждението можеш да
                  използваш всички функции на акаунта си.
                </p>
              </div>

              <div className="p-6">
                {isLoading && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                    <div className="font-semibold text-slate-900">Проверка...</div>
                    <div className="mt-1 text-slate-600">
                      Моля, изчакай. Потвърждението може да отнеме няколко секунди.
                    </div>
                  </div>
                )}

                {isSuccess && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
                    <div className="font-semibold">Успешно потвърждение</div>
                    <div className="mt-1 text-emerald-900/90">{message}</div>

                    <div className="mt-4 flex flex-col sm:flex-row gap-2">
                      <Link
                        to="/login?verified=1"
                        className="inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition shadow-sm"
                      >
                        Към вход
                      </Link>
                      <Link
                        to="/"
                        className="inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold border border-slate-300 text-slate-900 hover:bg-slate-100 transition"
                      >
                        Начална страница
                      </Link>
                    </div>

                    <div className="mt-4 text-xs text-emerald-900/80">
                      Ако си домоуправител, потвърденият имейл е силно препоръчителен за по-сигурна работа и възстановяване на достъп.
                    </div>
                  </div>
                )}

                {isError && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-900">
                    <div className="font-semibold">Проблем при потвърждение</div>
                    <div className="mt-1 text-rose-900/90">{message}</div>

                    <div className="mt-4 flex flex-col sm:flex-row gap-2">
                      <Link
                        to="/login"
                        className="inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition shadow-sm"
                      >
                        Вход
                      </Link>
                      <Link
                        to="/"
                        className="inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold border border-slate-300 text-slate-900 hover:bg-slate-100 transition"
                      >
                        Начална страница
                      </Link>
                    </div>

                    <div className="mt-4 text-xs text-rose-900/80">
                      Най-често причината е изтекъл или вече използван линк. Ако имаш достъп до акаунта, можеш да поискаш ново потвърждение.
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: more material */}
            <div className="space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-xs text-slate-500">Защо се прави това</div>
                <div className="text-2xl font-bold mt-1 text-slate-900">Сигурност и надежден достъп</div>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Потвърждението на имейл е стандартна защита. То намалява риска някой да регистрира чужд имейл и помага при
                  възстановяване на парола и известия.
                </p>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  Ако си влязъл в системата и имейлът ти е непотвърден, в профила/логина можеш да изпратиш нов имейл за потвърждение.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-sm font-semibold text-slate-900">1) Отвори линка</div>
                  <div className="text-sm text-slate-600 mt-1 leading-relaxed">
                    Линкът съдържа token и email. Ако липсва част от него, проверката няма да мине.
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-sm font-semibold text-slate-900">2) Потвърждение</div>
                  <div className="text-sm text-slate-600 mt-1 leading-relaxed">
                    Системата валидира token-а и маркира имейла като потвърден.
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-sm font-semibold text-slate-900">3) Вход</div>
                  <div className="text-sm text-slate-600 mt-1 leading-relaxed">
                    След успешно потвърждение можеш да влезеш нормално и да продължиш работа.
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-sm font-semibold text-slate-900">4) Ако има проблем</div>
                  <div className="text-sm text-slate-600 mt-1 leading-relaxed">
                    Линковете изтичат. При нужда изпрати ново потвърждение от системата.
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-sm font-semibold text-slate-900">Често задавани въпроси</div>
                <div className="mt-3 space-y-3 text-sm text-slate-600 leading-relaxed">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="font-semibold text-slate-900">Линкът ми дава грешка</div>
                    <div className="mt-1">
                      Провери дали е копиран изцяло. Ако е стар линк, изпрати ново потвърждение от профила/логина.
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="font-semibold text-slate-900">Трябва ли ми потвърждение?</div>
                    <div className="mt-1">
                      Препоръчително е за всички. За домоуправители е силно препоръчително.
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-500">
                След потвърждение, достъпът до данните за входа остава защитен чрез роли, одобрение и изолация по room.
              </div>
            </div>
          </div>
        </div>
      </div>

      
    </div>
  );
}
