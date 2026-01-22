import mongoose from "mongoose";

const paidBySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // ✅ Stripe-only
    method: { type: String, enum: ["stripe"], default: "stripe" },

    paidAt: { type: Date, default: Date.now },

    // ✅ Stripe details (за UI: “Платено чрез Stripe • ****1234”)
    stripeSessionId: { type: String, default: "" },
    stripePaymentIntentId: { type: String, default: "" },

    cardLast4: { type: String, default: "" },
    cardBrand: { type: String, default: "" },
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true },

    building: { type: String, default: "" },
    entrance: { type: String, default: "" },
    apartment: { type: String, default: "" },

    description: { type: String, required: true },
    dateFrom: { type: Date, default: null },
    dateTo: { type: Date, default: null },

    // ✅ вече работим само в EUR (стойността е EUR)
    amount: { type: Number, required: true },

    // ⚠️ старите полета ги оставяме
    status: { type: String, enum: ["paid", "unpaid"], default: "unpaid" },
    paidAt: { type: Date, default: null },

    // ✅ кой е платил това начисление
    paidBy: { type: [paidBySchema], default: [] },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Payment", paymentSchema);
