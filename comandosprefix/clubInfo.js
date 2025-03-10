const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const axios = require("axios");
const token = process.env.BS_APIKEY;
const SchemaClubes = require('../Esquemas/clubsSchema.js');

module.exports = {
    name: "c",
    aliases: ["p"],
    args: false,
    run: async (message, client, args) => {
        const trophiesThresholds = [
            { threshold: 55000, emoji: '<:50k:1239975155665473597>' },
            { threshold: 30000, emoji: '<:30k:1239975154369429627>' },
            { threshold: 16000, emoji: '<:16k:1239975692993691738>' },
            { threshold: 10000, emoji: '<:10k:1239975694533136424>' },
            { threshold: 8000, emoji: '<:8000:1239975738246172724>' },
            { threshold: 6000, emoji: '<:6000:1239976512057512120>' },
            { threshold: 4000, emoji: '<:4000:1239976152924160071>' },
            { threshold: 3000, emoji: '<:3000:1239976154681704559>' },
            { threshold: 2000, emoji: '<:2000:1239979538818138122>' },
            { threshold: 1000, emoji: '<:1000:1239977041051521084>' },
            { threshold: 500, emoji: '<:500:1239977042615861298>' },
            { threshold: 0, emoji: '<:Norank:1239970118025482311>' },
        ];

        const showMembers = (club, option) => {
            if (option === "memberlist") {
                const miembros = club.members.sort((a, b) => b.trophies - a.trophies); // Ordenar por copas de mayor a menor

                const membersField = miembros.map(member => {
                    const emoji = trophiesThresholds.find(threshold => member.trophies >= threshold.threshold).emoji;
                    let roleText = '';
                    if (member.role === 'president') {
                        roleText = '| <:Presi:1202692085019447377> Presidente';
                    } else if (member.role === 'vicePresident') {
                        roleText = '| <:1110136571400831037:1165754219203149915> Vicepresidente';
                    } else if (member.role === 'senior') {
                        roleText = '| <:Veteranos:1235270875113062472> Veterano';
                    } else {
                        roleText = '';
                    }

                    return `${emoji} ${member.trophies} ${member.name} ${roleText}`;
                });

                return membersField;
            } else if (option === "staff") {
                const vices = club.members.filter(member => member.role === 'vicePresident').map(vice => {
                    const emoji = trophiesThresholds.find(threshold => vice.trophies >= threshold.threshold).emoji;
                    return `${emoji} ${vice.trophies} ${vice.name}`;
                }).join('\n') || 'Ninguno';
                
                const presi = club.members.filter(member => member.role === 'president').map(president => {
                    const emoji = trophiesThresholds.find(threshold => president.trophies >= threshold.threshold).emoji;
                    return `${emoji} ${president.trophies} ${president.name}`;
                }).join(' ') || 'Ninguno';
                
                const veteranos = club.members.filter(member => member.role === 'senior').map(senior => {
                    const emoji = trophiesThresholds.find(threshold => senior.trophies >= threshold.threshold).emoji;
                    return `${emoji} ${senior.trophies} ${senior.name}`;
                }).join('\n') || 'Ninguno';

                const vicecantidad = club.members.filter(member => member.role === 'vicePresident').length;
                const veteranocantidad = club.members.filter(member => member.role === 'senior').length;

                return { vices, presi, veteranos, vicecantidad, veteranocantidad };
            }
        };

        const paginateMembers = async (message, membersList, page = 1, clubName, embedMessage) => {
            const totalPages = Math.ceil(membersList.length / 15);
            const currentPage = Math.min(page, totalPages);
            const start = (currentPage - 1) * 15;
            const end = currentPage * 15;
            const currentPageMembers = membersList.slice(start, end).join('\n');

            const embed = new EmbedBuilder()
                .setTitle(`${clubName} - Página ${currentPage}/${totalPages}`)
                .setColor('Random')
                .addFields({ name: 'Miembros', value: currentPageMembers || 'Ninguno', inline: true });

            const prevButton = new ButtonBuilder()
                .setCustomId('prev')
                .setLabel('Página Anterior')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentPage === 1);

            const nextButton = new ButtonBuilder()
                .setCustomId('next')
                .setLabel('Página Siguiente')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentPage === totalPages);

            const row = new ActionRowBuilder().addComponents(prevButton, nextButton);

            if (embedMessage) {
                await embedMessage.edit({ embeds: [embed], components: [row] });
            } else {
                embedMessage = await message.reply({ embeds: [embed], components: [row] });
            }

            const filter = (interaction) => interaction.user.id === message.author.id;

            const collector = embedMessage.createMessageComponentCollector({ filter, time: 60000 });

            collector.on('collect', async (interaction) => {
                if (interaction.customId === 'prev' && currentPage > 1) {
                    await interaction.deferUpdate();
                    await paginateMembers(message, membersList, currentPage - 1, clubName, embedMessage);
                } else if (interaction.customId === 'next' && currentPage < totalPages) {
                    await interaction.deferUpdate();
                    await paginateMembers(message, membersList, currentPage + 1, clubName, embedMessage);
                }
            });
        };

        const fetchClub = async (clubTag) => {
            const url = `https://api.brawlstars.com/v1/clubs/%23${clubTag}`;
            const clubfetch = await axios.get(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
            });
            return clubfetch.data;
        };

        const argumentos = args.map(arg => arg.toLowerCase());

        if (!args.length) {
          return await message.reply('en mantenimiento esta parte')
        }

        const clubTagOrName = argumentos[0].startsWith('#') ? argumentos[0].replace('#', '') : argumentos[0];
        const option = argumentos[1]; // Default to "memberlist" if no option is provided

        try {
            const clubData = argumentos[0].startsWith('#')
                ? await fetchClub(clubTagOrName)
                : await SchemaClubes.findOne({ Alias: clubTagOrName });

            if (!clubData) return message.reply('No se encontró información del club en las bases de datos.');

            const club = clubData.ClubTag ? await fetchClub(clubData.ClubTag) : clubData;

            if (option === "memberlist") {
                const membersList = showMembers(club, "memberlist");
                await paginateMembers(message, membersList, 1, club.name, null);
            } else if (option === "staff") {
                const { vices, presi, veteranos, vicecantidad, veteranocantidad } = showMembers(club, "staff");

                const embed = new EmbedBuilder()
                    .setTitle(`${club.name} - Staff`)
                    .setColor('Random')
                    .addFields(
                        { name: 'Presidente', value: presi || 'No disponible', inline: true },
                        { name: `Vicepresidentes (${vicecantidad})`, value: vices || 'Ninguno', inline: true },
                        { name: `Veteranos (${veteranocantidad})`, value: veteranos || 'Ninguno', inline: true }
                    );

                return message.reply({ embeds: [embed] });
            } else {
              const mediaTrofeos = Math.floor(club.trophies / 30)

              const miembrosplus = club.members.sort((a, b) => b.trophies - a.trophies).slice(0, 5)
              const miembrosminus = club.members.sort((a, b) => a.trophies - b.trophies).slice(0, 5)

              const trophiesThresholds = [
                { threshold: 50000, emoji: '<:50k:1239975155665473597>' },
                { threshold: 30000, emoji: '<:30k:1239975154369429627>' },
                { threshold: 16000, emoji: '<:16k:1239975692993691738>' },
                { threshold: 10000, emoji: '<:10k:1239975694533136424>' },
                { threshold: 8000, emoji: '<:8000:1239975738246172724>' },
                { threshold: 6000, emoji: '<:6000:1239976512057512120>' },
                { threshold: 4000, emoji: '<:4000:1239976152924160071>' },
                { threshold: 3000, emoji: '<:3000:1239976154681704559>' },
                { threshold: 2000, emoji: '<:2000:1239979538818138122>' },
                { threshold: 1000, emoji: '<:1000:1239977041051521084>' },
                { threshold: 500, emoji: '<:500:1239977042615861298>' },
                { threshold: 0, emoji: '<:Norank:1239970118025482311>' },
              ];
              let MTrofeos = trophiesThresholds.find(threshold => mediaTrofeos >= threshold.threshold).emoji + ` ${mediaTrofeos}`;
              let trofeosReq = trophiesThresholds.find(threshold => club.requiredTrophies >= threshold.threshold).emoji + ` ${club.requiredTrophies}`;

              const membersField = miembrosplus.map((member) => {
                let memberT = trophiesThresholds.find(threshold => member.trophies >= threshold.threshold).emoji + ` ${member.trophies} ${member.name}`;
                return `${memberT}`
              }).join('\n')

              const membersField2 = miembrosminus.map((member) => {
                let memberT = trophiesThresholds.find(threshold => member.trophies >= threshold.threshold).emoji + ` ${member.trophies} ${member.name}`;
                return `${memberT}`
              }).join('\n')
              var type = club.type
              if(type === "inviteOnly") type = "🔒 Solo Invitacion"
              if(type === "open") type = "✅ Abierto"
              if(type === "closed") type = "❌ Cerrado"
              
              const vices = club.members.filter(member => member.role === 'vicePresident').map(vice => vice.name).join('\n<:1110136571400831037:1165754219203149915> ');
              const vicecantidad = club.members.filter(member => member.role === 'vicePresident').length
              const presi = club.members.filter(member => member.role === 'president').map(vice => vice.name).join(' ');
              const veteranos = club.members.filter(member => member.role === 'senior').map(vice => vice.name).join('\n<:Veteranos:1235270875113062472> ');
              const veteranocantidad = club.members.filter(member => member.role === 'senior').length

              const embed = new EmbedBuilder()
              .setTitle(`${club.name}`)
              .setColor('Random')
              .setDescription(`\`\`\`${club.description}\`\`\``)
              .setThumbnail(`https://cdn-old.brawlify.com/club/${club.badgeId}.png`)
              .addFields(
                { name: 'Trofeos', value: `<:trophy:1178100595530420355> ${club.trophies}`, inline: true },
                { name: 'Media Trofeos', value: `${MTrofeos}`, inline: true},
                { name: 'Trofeos Requeridos', value: `${trofeosReq}`, inline: true },
                { name: 'Miembros', value: `<:roles:1170835674061099078> ${club.members.length}/30`, inline: true },
                { name: 'Tipo', value: `${type}`, inline: true },
                { name: 'Tag', value: `<:blancoo:1083039900816912486> ${club.tag}`, inline: true },
                { name: 'Presidente (1)', value: `<:Presi:1202692085019447377> ${presi}`, inline: true },
                { name: `VicePresidentes (${vicecantidad})`, value: `<:1110136571400831037:1165754219203149915> ${vices}`, inline: true },
                { name: `Veteranos (${veteranocantidad})`, value: `<:Veteranos:1235270875113062472> ${veteranos}`, inline: true },
                { name: `Miembros mas Altos`, value: `${membersField}`, inline: true },
                { name: 'Miembros mas Bajos', value: `${membersField2}`, inline: true }
              )
              await message.reply({ embeds: [embed]})
            }
        } catch (error) {
            return message.reply('Ocurrió un error al obtener la información del club.');
        }
    }
};