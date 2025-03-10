const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('descripcion')
        .setDescription('Proporciona dos nombres opcionales para cambiar el texto de respuesta')
        .addIntegerOption(option =>
            option.setName('copas')
                .setDescription('Cantidad de copas que tenga el club de requisito')
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(100))
        .addStringOption(option => 
            option.setName('club-arriba')
                .setDescription('El club que tenga más copas que el tuyo')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('club-abajo')
                .setDescription('El club que tenga menos copas que el tuyo')
                .setRequired(false)),

    async execute(interaction) {
        const allowedRoles = ['1106553480803516437', '1107345436492185753', '1106553536839422022', '1313248021403930715', '1320857124242456577', '1320857188591337635', '1320857245751181454'];

        // Verifica si el miembro tiene alguno de los roles permitidos
        const memberRoles = interaction.member.roles.cache;
        const hasPermission = allowedRoles.some(roleId => memberRoles.has(roleId));

        if (!hasPermission) {
            await interaction.reply({
                content: 'No tienes permiso para usar este comando.',
                ephemeral: true
            });
            return;
        }

        const nombre1 = interaction.options.getString('club-arriba');
        const nombre2 = interaction.options.getString('club-abajo');
        const copas = interaction.options.getInteger('copas');

        // Determina la respuesta según los argumentos proporcionados
        let respuesta;

        if (nombre1 && nombre2) {
            respuesta = `<c5>TS Comunity</c>⚔️|ᴅɪꜱᴄ➜8nu3ZdDkp7 <c3>▲TS ${nombre1}</c>|<c9>▼TS ${nombre2}</c>|+${copas}k🏆`; 
        } else if (nombre1) {
            respuesta = `<c5>TS Comunity</c>⚔️|ᴅɪꜱᴄ➜8nu3ZdDkp7 <c3>▲TS ${nombre1}</c>|+${copas}k🏆`;
        } else if (nombre2) {
            respuesta = `<c5>TS Comunity</c>⚔️|ᴅɪꜱᴄ➜8nu3ZdDkp7 <c9>▼TS ${nombre2}</c>|+${copas}k🏆`;
        } else {
            respuesta = 'Por favor, proporciona al menos un nombre.';
        }

        // Responde al usuario con un bloque de código
        await interaction.reply({
            content: `\`\`\`${respuesta}\`\`\``,
            ephemeral: false
        });
    },
};
