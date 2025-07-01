const axios = require('axios');
const { EmbedBuilder } = require('discord.js');
const Schema = require('../Esquemas/clubsSchema'); // Ajusta la ruta si es diferente
const countries = require('../json/countries.json');
const contarCaracteresEmbed = require('./contarCaracteresEmbed.js')


module.exports = async function actualizarClubes(client) {
    try {
        const token = process.env.BS_APIKEY;
        const data = await Schema.find();
        const totalClubes = data.length;

        let totalCopas = 0;
        let totalMiembros = 0;
        let totalVices = 0;
        let totalVeteranos = 0;

        const canal = await client.channels.cache.get('1102591330070302862');
        if (!canal) return console.error('Canal no encontrado');
        const mensaje1 = await canal.messages.fetch('1336726116143988736').catch(() => null);
        if (!mensaje1) return console.error('Mensaje no encontrado');

        const clubDetalles = [];

        for (const doc of data) {
            const countri = doc.Region || 'España';
            const { codigo: countriCode, emoji: countriEmoji } = countries[countri] || {};
            const clubTag = doc.ClubTag;

            try {
                const [clubRes, rankingRes, globalRankingRes] = await Promise.all([
                    axios.get(`https://api.brawlstars.com/v1/clubs/%23${clubTag}`, { headers: { Authorization: `Bearer ${token}` } }),
                    axios.get(`https://api.brawlstars.com/v1/rankings/${countriCode}/clubs`, { headers: { Authorization: `Bearer ${token}` } }),
                    axios.get(`https://api.brawlstars.com/v1/rankings/global/clubs`, { headers: { Authorization: `Bearer ${token}` } }),
                ]);

                const club = clubRes.data;
                totalCopas += club.trophies;
                totalMiembros += club.members.length;
                totalVices += club.members.filter(m => m.role === 'vicePresident').length;
                totalVeteranos += club.members.filter(m => m.role === 'senior').length;

                const presi = club.members.find(m => m.role === 'president');
                const presiName = presi ? presi.name : 'No disponible';

                let tipo = club.type;
                if (tipo === "inviteOnly") tipo = "<:InvitacionBN:1333582486139043890> `Invitación`";
                else if (tipo === "open") tipo = "<:AbiertoBN:1333582488160833636> `Abierto`";
                else if (tipo === "closed") tipo = "<:CerradoBN:1333582484629094400> `Cerrado`";

                const globalClub = globalRankingRes.data.items.find(c => c.tag === `#${clubTag}`);
                const globalRanking = globalClub ? `🌍 \`#${globalClub.rank}\` ` : '';

                const localClub = rankingRes.data.items.find(c => c.tag === `#${clubTag}`);
                const localRanking = localClub ? `${countriEmoji} \`#${localClub.rank}\`\n` : '';

                clubDetalles.push({
                    name: `**ㅤ**`,
                    value: `<:CoronaAzulao:1237349756347613185> **[${club.name}](https://brawltime.ninja/es/club/${clubTag.replace('#', '')})**\n` +
                           `<:trophy:1178100595530420355> \`${club.trophies.toLocaleString()}\`\n` +
                           `${globalRanking}${localRanking}` +
                           `<:Presi:1202692085019447377> [${presiName}](https://brawltime.ninja/es/profile/${presi.tag.replace('#', '')})\n` +
                           `<:req:1385558827826544640> \`${club.requiredTrophies.toLocaleString()}\`\n` +
                           `<:MiembrosClan:1202693897306898492> \`${club.members.length}\`\n` +
                           `${tipo}`,
                    trophies: club.trophies
                });

            } catch (err) {
                console.error(`Error en el club ${clubTag}:`, err.message);
                clubDetalles.push({
                    name: `Error en el club ${clubTag}`,
                    value: `No se pudieron obtener datos.`,
                    trophies: 0
                });
            }
        }

        clubDetalles.sort((a, b) => b.trophies - a.trophies);

        const currentDate = new Date();
        const formattedDate = currentDate.toLocaleString('es-ES', {
            timeZone: 'Europe/Madrid',
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false
        });

        const resumenEmbed = new EmbedBuilder()
            .setDescription(`# Información Clubes TS`)
            .setThumbnail(client.user.avatarURL())
            .addFields(
                { name: 'Total Trofeos:', value: `<:trophy:1178100595530420355> \`${totalCopas.toLocaleString()}\``, inline: true },
                { name: 'Total Clubs:', value: `<:club:1178100590002307122> \`${totalClubes}\``, inline: true },
                { name: 'Total Miembros:', value: `<:MiembrosClan:1202693897306898492> \`${totalMiembros}\``, inline: true },
                { name: 'Promedio Trofeos:', value: `<:trophy:1178100595530420355> \`${Math.round(totalCopas / totalClubes).toLocaleString()}\``, inline: true },
                { name: 'Total Vices:', value: `<:VicePresi:1202692129827328082> \`${totalVices}\``, inline: true },
                { name: 'Total Veteranos:', value: `<:Reclamar:1164688584129908918> \`${totalVeteranos}\``, inline: true }
            )
            .setColor('#822ffd');

        const clubesEmbed1 = clubDetalles.slice(0, 12);
        const clubesEmbed2 = clubDetalles.slice(12, 24);

        const embed1 = new EmbedBuilder()
            .setDescription(`# Clubes TS - Página 1`)
            .setColor('#10ceec')
            .setFooter({ text: `Última actualización: ${formattedDate}`, iconURL: client.user.avatarURL() });

        clubesEmbed1.forEach(club => embed1.addFields({ name: club.name, value: club.value, inline: true }));

        const embed2 = new EmbedBuilder()
            .setDescription(`# Clubes TS - Página 2`)
            .setColor('#10ceec')
            .setFooter({ text: `Última actualización: ${formattedDate}`, iconURL: client.user.avatarURL() });

        clubesEmbed2.forEach(club => embed2.addFields({ name: club.name, value: club.value, inline: true }));

        const embedsToSend = [resumenEmbed, embed1];
        if (clubesEmbed2.length > 0) embedsToSend.push(embed2);

        await mensaje1.edit({ embeds: embedsToSend });

    } catch (error) {
        console.error(`Error en el proceso de actualización: ${error.message}`);
    }

    const guild = client.guilds.cache.get('1093864130030612521')
    const channel = guild.channels.cache.get('1127922884568957010')
    await channel.send(
        `Resumen Embed: ${contarCaracteresEmbed(resumenEmbed)}\n` +
        `Embed 1: ${contarCaracteresEmbed(embed1)}\n` +
        `Embed 2: ${contarCaracteresEmbed(embed2)}\n`
    )
};