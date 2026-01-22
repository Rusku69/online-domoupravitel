import Room from "../../models/Room.js";

export async function migrateRooms() {
  try {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const res1 = await Room.updateMany(
      { $or: [{ trialEndsAt: null }, { trialEndsAt: { $exists: false } }] },
      { $set: { trialEndsAt: in30Days } }
    );

    console.log("✅ migrateRooms done:", {
      trialAssigned: res1.modifiedCount ?? res1.nModified ?? 0,
    });
  } catch (e) {
    console.error("❌ migrateRooms error:", e.message);
  }
}
