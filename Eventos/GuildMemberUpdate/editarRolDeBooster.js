const { Events } = require("discord.js")

const DOUBLE_BOOSTER_ROLE_NAME = 'Doble Booster'

// Mapa temporal para guardar miembros que han boosteado más de una vez
const boostCountMap = new Map()

module.exports = {
  name: "guildMemberUpdate",

  async execute(oldMember, newMember, client) {
  // Solo proceder si hay cambio en el boost (premiumSince)
  const oldBoost = oldMember.premiumSince;
  const newBoost = newMember.premiumSince;

  const hasJustBoosted = !oldBoost && newBoost;
  const hasJustUnboosted = oldBoost && !newBoost;

  const role = newMember.guild.roles.cache.find(r => r.name === DOUBLE_BOOSTER_ROLE_NAME);
  if (!role) return console.warn(`❌ Rol "${DOUBLE_BOOSTER_ROLE_NAME}" no encontrado.`);

  if (hasJustBoosted) {
    const count = boostCountMap.get(newMember.id) || 0;
    boostCountMap.set(newMember.id, count + 1);

    if (count + 1 >= 2) {
      try {
        await newMember.roles.add(role);
      } catch (err) {
        console.error('❌ Error al añadir el rol:', err);
      }
    }
  }

  if (hasJustUnboosted) {
    const count = boostCountMap.get(newMember.id) || 0;
    boostCountMap.set(newMember.id, count - 1);

    if (count - 1 < 2) {
      try {
        await newMember.roles.remove(role);
      } catch (err) {
        console.error('❌ Error al quitar el rol:', err);
      }
    }
  }
  }
}