const { EmbedBuilder } = require("discord.js");
const axios = require("axios");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const TAG = "TS";
const ROLE_ID = "1380228270729199798";
const GUILD_ID = "1093864130030612521";

// Función principal
async function tagRoleManager(client, logChannelId) {
  const guild = await client.guilds.fetch(GUILD_ID);
  const logChannel = await client.channels.fetch(logChannelId);

  while (true) {
    try {
      await guild.members.fetch();

      for (const member of guild.members.cache.values()) {
        try {
          const response = await axios.get(`https://discord.com/api/v10/users/${member.user.id}`, {
            headers: { Authorization: `Bot ${client.token}` },
          });

          const data = response.data;
          const primaryGuild = data.primary_guild || data.clan;
          const hasTag = primaryGuild?.tag === TAG;
          const hasRole = member.roles.cache.has(ROLE_ID);

          // Dar rol si tiene la etiqueta y no lo tiene
          if (hasTag && !hasRole) {
            await member.roles.add(ROLE_ID);

            const embed = new EmbedBuilder()
              .setTitle("🏷️ Usuario con etiqueta TS encontrado")
              .addFields(
                { name: "Usuario", value: `<@${data.id}> (${data.global_name || member.user.username})`, inline: false },
                { name: "Tag", value: primaryGuild.tag, inline: true },
                { name: "Servidor (ID)", value: primaryGuild.identity_guild_id, inline: true },
                { name: "Badge Hash", value: primaryGuild.badge || "No disponible", inline: false },
                { name: "Activo", value: primaryGuild.identity_enabled ? "Sí" : "No", inline: true }
              )
              .setThumbnail(`https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png`)
              .setColor("Blurple");

            await logChannel.send({ embeds: [embed] });
          }

          // Quitar rol si ya no tiene la etiqueta
          if (!hasTag && hasRole) {
            await member.roles.remove(ROLE_ID);
            await logChannel.send(`❌ Se quitó el rol a <@${member.id}> por no tener la etiqueta "${TAG}".`);
          }

        } catch (err) {
          console.error(`Error al obtener info de ${member.user.id}:`, err.response?.data || err.message);
        }

        await sleep(3000); // Espera entre usuarios
      }

      await logChannel.send("🔁 Ciclo de verificación completado. Esperando antes del siguiente... <@817515739711406140>");

    } catch (error) {
      console.error("Error en el ciclo de tagRoleManager:", error);
      await logChannel.send("⚠️ Hubo un error durante el ciclo de verificación.");
    }

    await sleep(1000 * 60 * 10); // Espera 10 minutos antes de repetir el ciclo
  }
}

module.exports = tagRoleManager;
