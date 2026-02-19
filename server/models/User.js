import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },

    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    emailVerified: { type: Boolean, default: false },
    // За нови акаунти: join/manager-request се разрешават само след verify email.
    // Старите акаунти остават без промяна (false/missing).
    mustVerifyEmailForRoomActions: { type: Boolean, default: false },

    password: { type: String, required: true, minlength: 8 },

    phone: { type: String, default: "" },
    phoneVerified: { type: Boolean, default: false },

    role: {
      type: String,
      enum: ["admin", "manager", "resident"],
      default: "resident",
    },

    city: { type: String, default: "" },
    building: { type: String, default: "" },
    entrance: { type: String, default: "" },
    apartment: { type: String, default: "" },

    managerRequestStatus: {
      type: String,
      enum: ["none", "pending", "approved", "rejected"],
      default: "none",
    },
    managerRequestCity: { type: String, default: "" },
    managerRequestBuilding: { type: String, default: "" },
    managerRequestEntrance: { type: String, default: "" },
    managerRequestApartment: { type: String, default: "" },
    managerRequestedAt: { type: Date, default: null },

    // Email verification token (HASH)
    emailVerifyTokenHash: { type: String, default: "" },
    emailVerifyExpires: { type: Date, default: null },

    // Password reset token (HASH)
    passwordResetTokenHash: { type: String, default: "" },
    passwordResetExpires: { type: Date, default: null },

    isPaid: { type: Boolean, default: false },
    subscriptionExpires: { type: Date, default: null },

    roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room", default: null },
    memberStatus: {
      type: String,
      enum: ["pending", "approved"],
      default: "pending",
    },
  },
  { timestamps: true }
);

// basic email regex
function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
}

// basic phone sanity (E.164-ish). empty allowed.
function isValidPhone(v) {
  const s = String(v || "").trim();
  if (!s) return true;
  return /^\+?[1-9]\d{7,14}$/.test(s);
}

userSchema.pre("validate", function (next) {
  try {
    if (!isValidEmail(this.email)) {
      const err = new Error("Невалиден имейл.");
      err.statusCode = 400;
      return next(err);
    }
    if (!isValidPhone(this.phone)) {
      const err = new Error("Невалиден телефон (ползвай формат +359...).");
      err.statusCode = 400;
      return next(err);
    }
    next();
  } catch (e) {
    next(e);
  }
});

// Hash password on save
userSchema.pre("save", async function (next) {
  try {
    if (!this.isModified("password")) return next();
    const saltRounds = 10;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (err) {
    next(err);
  }
});

// Hide sensitive fields in responses
userSchema.set("toJSON", {
  transform: function (doc, ret) {
    delete ret.password;
    delete ret.emailVerifyTokenHash;
    delete ret.emailVerifyExpires;
    delete ret.passwordResetTokenHash;
    delete ret.passwordResetExpires;
    return ret;
  },
});

export default mongoose.model("User", userSchema);
