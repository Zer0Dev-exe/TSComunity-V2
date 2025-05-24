const { Events } = require("discord.js");
const User = require("../../Esquemas/userSchema.js");

const DOUBLE_BOOSTER_ROLE_NAME = "Doble Booster";

module.exports = {
  name: "guildMemberUpdate",

  async execute(oldMember, newMember) {
    const oldBoost = oldMember.premiumSince;
    const newBoost = newMember.premiumSince;

    const hasJustBoosted = !oldBoost && newBoost;
    const hasJustUnboosted = oldBoost && !newBoost;

    const role = newMember.guild.roles.cache.find(r => r.name === DOUBLE_BOOSTER_ROLE_NAME);
    if (!role) return;

    let userData = await User.findOne({ id: newMember.id });

    if (!userData) {
      userData = new User({
        id: newMember.id,
        bienvenidas: 0,
        boostCount: 0,
      });
    }

    if (hasJustBoosted) {
      userData.boostCount += 1;
      await userData.save();

      if (userData.boostCount >= 2) {
        try {
          await newMember.roles.add(role);
          console.log(`✅ Añadido el rol "${DOUBLE_BOOSTER_ROLE_NAME}" a ${newMember.user.tag}`);
        } catch (err) {
          console.error("❌ Error al añadir el rol:", err);
        }
      }
    }

    if (hasJustUnboosted) {
      userData.boostCount = 0 // Evita que sea < 0
      await userData.save()

        try {
          if (newMember.roles.cache.has(role.id)) {
            await newMember.roles.remove(role);
          }
        } catch (err) {
          console.error("❌ Error al quitar el rol:", err);
        }
    }
  }
}