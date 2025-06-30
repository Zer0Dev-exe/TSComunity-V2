const { EmbedBuilder } = require("discord.js");
const axios = require("axios");

module.exports = {
  name: "tagrole",
  aliases: ["p"],
  args: false,
  run: async (message, client, args) => {
    try {
      const guildId = "1093864130030612521";
      const roleId = "1380228270729199798"; // 🔁 Reemplaza con el ID del rol

      const guild = await client.guilds.fetch(guildId);
      const member = await guild.members.fetch(message.author.id);
      const botToken = client.token;

      try {
        const response = await axios.get(`https://discord.com/api/v10/users/${member.user.id}`, {
          headers: { Authorization: `Bot ${botToken}` },
        });

        const data = response.data;
        const primaryGuild = data.primary_guild || data.clan;
        const hasRole = member.roles.cache.has(roleId);
        const role = guild.roles.cache.get(roleId);

        if (!role) {
          console.warn("⚠️ El rol con ese ID no existe en el servidor.");
          return message.reply("⚠️ El rol configurado no existe.");
        }

        // Si tiene el tag TS
        if (primaryGuild && primaryGuild.tag === "TS") {
          if (hasRole) {
            await message.reply("❌ Ya tenías el rol, así que te lo quité.");
          } else {
            await member.roles.add(roleId);
            await message.reply("✅ Tienes el tag TS, así que se te asignó el rol.");
          }

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

          await message.channel.send({ embeds: [embed] });
        } else {
          // No tiene el tag
          if (hasRole) {
            await member.roles.remove(roleId);
            await message.reply("🚫 Ya no tienes el tag TS, así que se te quitó el rol.");
          } else {
            await message.reply("🔍 No tienes el tag TS, así que no se hizo ningún cambio.");
          }
        }
      } catch (err) {
        console.error(`Error al obtener info de ${member.user.id}:`, err.response?.data || err.message);
        return message.reply("❌ Hubo un error al verificar tu información.");
      }
    } catch (error) {
      console.error("Error en comando tagrole:", error);
      message.reply("⚠️ Hubo un error al ejecutar el comando.");
    }
  },
};
