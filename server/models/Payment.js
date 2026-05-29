import mongoose from "mongoose";

const paidBySchema = new mongoose.Schema(
  {
    // Null при плащане на ръка за апартамент без регистриран потребител.
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    // Stripe-only
    // stripe = онлайн плащане, manual = отбелязано от домоуправителя.
    method: { type: String, enum: ["stripe", "manual"], default: "stripe" },

    paidAt: { type: Date, default: Date.now },
    // Име, което домоуправителят въвежда при ръчно плащане.
    payerName: { type: String, default: "" },

    // Stripe details (за UI: “Платено чрез Stripe • ****1234”)
    stripeSessionId: { type: String, default: "" },
    stripePaymentIntentId: { type: String, default: "" },

    apartment: { type: String, default: "" },
    apartments: { type: [String], default: [] },
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
    apartments: { type: [String], default: [] },

    description: { type: String, required: true },
    dateFrom: { type: Date, default: null },
    dateTo: { type: Date, default: null },

    
    amount: { type: Number, required: true },


    status: { type: String, enum: ["paid", "unpaid"], default: "unpaid" },
    paidAt: { type: Date, default: null },


    paidBy: { type: [paidBySchema], default: [] },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Payment", paymentSchema);
