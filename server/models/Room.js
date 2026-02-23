import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true }, // напр "150-A-482913"
    city: { type: String, required: true },
    building: { type: String, required: true },
    entrance: { type: String, required: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // ✅ вход (room) settings
    apartmentsCount: { type: Number, default: null },
    trialEndsAt: { type: Date, default: null },
    subscriptionExpires: { type: Date, default: null },
    subscriptionRenewals: [
      {
        stripeSessionId: { type: String, default: "" },
        byUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        months: { type: Number, default: 0 },
        apartmentsCount: { type: Number, default: 0 },
        amountEur: { type: Number, default: 0 },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // 💰 Финанси на входа
    finance: {
      iban: { type: String, default: "" },
      holderName: { type: String, default: "" },
      balance: { type: Number, default: 0 },
      locked: { type: Boolean, default: false },
      expenses: [
        {
          amount: { type: Number, required: true },
          description: { type: String, default: "" },
          createdAt: { type: Date, default: Date.now },
        },
      ],
    },

    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        status: { type: String, enum: ["approved", "pending"], default: "pending" },

        apartment: { type: String, default: "" },
        nameSnapshot: { type: String, default: "" },
        phoneSnapshot: { type: String, default: "" },
        tenantTag: { type: Boolean, default: false },
      },
    ],
  },
  { timestamps: true }
);

roomSchema.index({ city: 1, building: 1, entrance: 1 }, { unique: true });

export default mongoose.model("Room", roomSchema);
