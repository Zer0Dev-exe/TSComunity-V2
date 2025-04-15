const { SlashCommandBuilder } = require('discord.js');

const countries = require('../../json/countries.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('descripcion')
        .setDescription('Proporciona dos nombres opcionales para cambiar el texto de respuesta')
        .addStringOption(option => 
            option.setName('club-arriba')
                .setDescription('El club que tenga más copas que el tuyo')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('club-abajo')
                .setDescription('El club que tenga menos copas que el tuyo')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('copas')
                .setDescription('Cantidad de copas que tenga el club de requisito')
                .setRequired(false)
                .setMinValue(0)
                .setMaxValue(100))
        .addIntegerOption(option =>
            option.setName('top-global')
                .setDescription('Maximo top global en el que ha estado el club')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(1000))
                .addIntegerOption(option =>
            option.setName('top-local')
                .setDescription('Maximo top local en el que ha estado el club')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(1000))
            .addStringOption(option => 
            option
                .setName('region')
                .setDescription('La región del club')
                .setRequired(false)
                .setAutocomplete(true)
                  ),

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
        const copas = interaction.options.getInteger('copas')
        const global = interaction.options.getInteger('top-global');
        const local = interaction.options.getInteger('top-local');
        const region = interaction.options.getString('region');

        const copasOutput = copas ? `|+${copas}k🏆` : ''

        const countriEmoji = countries[region].emoji

        let tops

        if (global && local) {
            if (!region) return interaction.reply('Para usar la opción de top local debes añadir una región')
            top = `|${global}🌍${local}${countriEmoji}`
        } else if (global) {
            top = `|${global}🌍$`
        } else if (local) {
            if (!region) return interaction.reply('Para usar la opción de top local debes añadir una región')
            top = `|${local}${countriEmoji}`
        } else {
            top = ''
        }

        // Determina la respuesta según los argumentos proporcionados
        let respuesta;

        if (nombre1 && nombre2) {
            respuesta = `<c5>TS Comunity</c>⚔️|ᴅɪꜱᴄ➜8nu3ZdDkp7 <c3>▲${nombre1}</c>|<c9>▼${nombre2}</c>${copasOutput}${tops}`; 
        } else if (nombre1) {
            respuesta = `<c5>TS Comunity</c>⚔️|ᴅɪꜱᴄ➜8nu3ZdDkp7 <c3>▲${nombre1}</c>${copasOutput}${tops}`;
        } else if (nombre2) {
            respuesta = `<c5>TS Comunity</c>⚔️|ᴅɪꜱᴄ➜8nu3ZdDkp7 <c9>▼${nombre2}</c>${copasOutput}${tops}`;
        } else {
            respuesta = 'Por favor, proporciona al menos un nombre.';
        }

        // Responde al usuario con un bloque de código
        await interaction.reply({
            content: `\`\`\`${respuesta}\`\`\``,
            ephemeral: false
        });
    },
                async autocomplete(interaction) {
                const focusedValue = interaction.options.getFocused(); // Lo que el usuario está escribiendo
                const filtered = Object.keys(countries)
                  .filter(pais => pais.toLowerCase().startsWith(focusedValue.toLowerCase()))
                  .slice(0, 25); // Límite de 25 para Discord
            
                await interaction.respond(
                  filtered.map(pais => ({
                    name: pais,
                    value: pais
                  }))
                );
              }
};
