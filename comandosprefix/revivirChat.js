const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require("discord.js");

// Objeto para almacenar la última vez que se usó el comando en cada canal
const lastUsed = {};
const schema = require('../Esquemas/configuracionSv.js')

module.exports = {
    name: "revivirchat",
    aliases: ["b"],
    args: false,
    run: async (message, client, args) => {
        // Verificar si el usuario tiene al menos uno de los roles permitidos
        const data = await schema.findOne();
        if (!data || !data.RolesStaff || !Array.isArray(data.RolesStaff)) {
            return message.reply("⚠️ Error: No se encontraron roles permitidos en la base de datos.");
        }
        
        const allowedRoles = data.RolesStaff; // Array of role IDs from the schema

        // Verificar si el usuario tiene al menos uno de los roles permitidos
        const hasPermission = message.member.roles.cache.some(role => allowedRoles.includes(role.id));
        if (!hasPermission) {
            return message.reply("⚠️ No tienes permiso para usar este comando.");
        }

        const cooldown = 18000; // 5 horas en segundos
        const now = Date.now();
        const lastUsedTime = lastUsed[message.channel.id] || 0;

        if (now - lastUsedTime < cooldown * 1000) {
            const timeLeft = ((cooldown * 1000 - (now - lastUsedTime)) / 1000 / 60).toFixed(1);
            return message.reply(`⚠️ Este comando solo se puede usar cada 5 horas. Intenta nuevamente en ${timeLeft} minutos.`);
        }

        const showUserButton = new ButtonBuilder()
            .setCustomId("showUser")
            .setLabel(`Enviado por ${message.author.username}`)
            .setDisabled(true)
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder().addComponents(showUserButton);
        // Si pasa el cooldown, se envía el mensaje y se actualiza el tiempo de uso
        message.channel.send({
            content: `<@&1173666295556866089>`,
            components: [row],
            allowedMentions: { parse: ["users", "roles"] }
        });

        // Eliminar el mensaje de comando después de enviarlo
        message.delete();

        // Actualizar el tiempo de última ejecución del comando en este canal
        lastUsed[message.channel.id] = now;
    }
};
