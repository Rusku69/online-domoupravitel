import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../lib/api";

export default function Checkout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const pay = async () => {
    try {
      setLoading(true);

      // ✅ CHANGED: Stripe Checkout
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
    <div className="min-h-screen bg-sky-50 p-6">
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-soft p-6">
        <h1 className="text-2xl font-bold mb-2">💳 Плащане</h1>
        <p className="text-sm text-gray-600 mb-4">
          Плащането се извършва през Stripe Checkout (като гост, без регистрация). Всички суми са в EUR (€).
        </p>

        <div className="flex gap-2 justify-end">
          <button
            onClick={() => navigate("/payments")}
            className="px-4 py-2 rounded-xl border"
          >
            Назад
          </button>
          <button
            disabled={loading}
            onClick={pay}
            className="px-4 py-2 rounded-xl bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-60"
          >
            {loading ? "Пренасочване..." : "Плати със Stripe"}
          </button>
        </div>
      </div>
    </div>
  );
}
