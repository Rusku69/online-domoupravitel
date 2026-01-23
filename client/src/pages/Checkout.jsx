import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import api from "../lib/api";
import SiteFooter from "../components/SiteFooter";

export default function Checkout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const pay = async () => {
    try {
      setLoading(true);

      // Stripe Checkout
      const res = await api.post(`/api/payments/${id}/checkout`);
      const url = res?.data?.url;

      if (!url) {
        alert("Липсва Stripe checkout URL.");
        return;
      }

      // Redirect към Stripe Checkout
      window.location.href = url;
    } catch (e) {
      alert(e?.response?.data?.message || "Грешка при Stripe плащане");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <div className="flex-1 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            {/* Left: main card */}
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <div className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  Плащане през Stripe
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-3">Плащане</h1>

                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Плащането се извършва през Stripe Checkout (възможно е и като гост, без допълнителна регистрация в Stripe).
                  Всички суми са в EUR (€). След успешно плащане статусът се отчита автоматично от системата.
                </p>
              </div>

              <div className="p-6">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <div className="font-semibold text-slate-900">Какво се случва след като натиснеш “Плати”</div>
                  <ul className="mt-2 list-disc pl-5 space-y-1 text-slate-700">
                    <li>Системата създава Stripe Checkout сесия за конкретното начисление.</li>
                    <li>Пренасочваш се към защитена страница на Stripe за плащане.</li>
                    <li>При успех Stripe изпраща webhook към backend-а, и плащането се отбелязва като платено.</li>
                  </ul>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-xs font-semibold text-slate-500">Начисление</div>
                    <div className="mt-1 font-semibold text-slate-900 break-all">{id}</div>
                    <div className="mt-2 text-xs text-slate-500">
                      Това е идентификаторът на начислението в системата.
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-xs font-semibold text-slate-500">Валута</div>
                    <div className="mt-1 text-lg font-black text-slate-900">EUR (€)</div>
                    <div className="mt-2 text-xs text-slate-500">
                      UI и бекенд логиката са настроени за EUR.
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-col sm:flex-row gap-2 sm:justify-end">
                  <button
                    onClick={() => navigate("/payments")}
                    className="rounded-2xl px-5 py-3 text-sm font-semibold border border-slate-300 text-slate-900 hover:bg-slate-100 transition"
                  >
                    Назад
                  </button>

                  <button
                    disabled={loading}
                    onClick={pay}
                    className="rounded-2xl px-5 py-3 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60 transition shadow-sm"
                  >
                    {loading ? "Пренасочване..." : "Плати със Stripe"}
                  </button>
                </div>

                <div className="mt-4 text-xs text-slate-500">
                  Ако прозорецът за плащане не се отвори, провери дали браузърът не блокира пренасочвания. След плащане можеш да се върнеш към “Плащания” и да обновиш данните.
                </div>
              </div>
            </div>

            {/* Right: more material */}
            <div className="space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-xs text-slate-500">Сигурност</div>
                <div className="text-2xl font-bold mt-1 text-slate-900">Защо Stripe Checkout</div>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Плащането се обработва от Stripe, което означава, че данните на картата не минават през нашия сайт.
                  Системата получава резултат (успех/неуспех) чрез webhook и отбелязва плащането в базата.
                </p>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  Практика: ако плащането е успешно, но не виждаш статус “Платено”, отвори “Плащания” и направи refresh.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-sm font-semibold text-slate-900">1) Пренасочване</div>
                  <div className="text-sm text-slate-600 mt-1 leading-relaxed">
                    Натискаш бутона и отиваш на Stripe Checkout за конкретното начисление.
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-sm font-semibold text-slate-900">2) Потвърждение</div>
                  <div className="text-sm text-slate-600 mt-1 leading-relaxed">
                    Stripe обработва плащането и връща резултат. При успех webhook записва плащането.
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-sm font-semibold text-slate-900">3) Отчитане</div>
                  <div className="text-sm text-slate-600 mt-1 leading-relaxed">
                    Системата добавя запис в paidBy[] и UI показва, че начислението е платено.
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-sm font-semibold text-slate-900">4) Връщане</div>
                  <div className="text-sm text-slate-600 mt-1 leading-relaxed">
                    Връщаш се към страницата с плащания и проверяваш статуса.
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-sm font-semibold text-slate-900">Полезни връзки</div>
                <div className="mt-3 flex flex-col gap-2 text-sm">
                  <button
                    onClick={() => navigate("/payments")}
                    className="rounded-2xl px-4 py-3 text-sm font-semibold border border-slate-300 text-slate-900 hover:bg-slate-100 transition"
                  >
                    Назад към плащания
                  </button>

                  <Link
                    to="/dashboard"
                    className="rounded-2xl px-4 py-3 text-sm font-semibold border border-slate-300 text-slate-900 hover:bg-slate-100 transition text-center"
                  >
                    Табло
                  </Link>
                </div>

                <div className="mt-3 text-xs text-slate-500">
                  Ако начислението е изтрито или невалидно, системата ще върне грешка при създаване на Checkout.
                </div>
              </div>

              <div className="text-xs text-slate-500">
                Плащанията са част от процеса за прозрачност: домоуправителят вижда обща картина, живущият вижда само своите плащания.
              </div>
            </div>
          </div>
        </div>
      </div>

      
    </div>
  );
}
