const axios = require('axios');
const { EmbedBuilder } = require('discord.js');
const Schema = require('../Esquemas/clubsSchema'); // Ajusta la ruta si es diferente
const countries = require('../json/countries.json');

module.exports = async function actualizarClubes(client) {
    try {
        const token = process.env.BS_APIKEY;
        const data = await Schema.find();
        const totalClubes = data.length;

        let totalCopas = 0;
        let totalMiembros = 0;
        let totalVices = 0;
        let totalVeteranos = 0;

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

        
        const pageEmbed = ({ index, clubes }) => {
            return new EmbedBuilder()
            .setDescription(`# Clubes TS - Página ${index}`)
            .setColor('#10ceec')
            .setFooter({ text: `Última actualización: ${formattedDate}`, iconURL: client.user.avatarURL() })
            .addFields(clubes.map(club => ({ name: club.name, value: club.value, inline: true })))
        }

        const channel = await client.channels.fetch('1102591330070302862');
        if (!channel || !channel.isTextBased())
            throw new Error('Canal no encontrado o no es de texto.');

        const fetchedMessages = await channel.messages.fetch({ limit: 100 });
        const sortedMessages = Array.from(fetchedMessages.values()).sort(
            (a, b) => a.createdTimestamp - b.createdTimestamp
        );
        const botMessages = sortedMessages.filter(
            (msg) => msg.author.id === client.user.id
        );

        const summaryMsg = botMessages[0]; // Primer mensaje → resumen
        const clubsMsgs = botMessages.slice(1); // El resto → divisiones

function agruparEnBloques(array, tamano = 15) {
  const bloques = [];
  for (let i = 0; i < array.length; i += tamano) {
    bloques.push(array.slice(i, i + tamano));
  }
  return bloques;
}
const pages = agruparEnBloques(clubDetalles)

  // 🔁 Si faltan mensajes (1 resumen + divisiones), reinicia todo
  const expectedMessages = 1 + pages.length
  if (botMessages.length !== expectedMessages) {
    for (const msg of botMessages) {
      await msg.delete().catch(() => {});
    }

    // ⬆️ Crear mensaje resumen
    await channel.send({
      embeds: [resumenEmbed]
    });

    // 📤 Crear 1 mensaje por división
    let index = 1
    for (const page of pages) {

      await channel.send({
        embeds: [pageEmbed({ index, clubes: page })]
      })
      index++
    }

    return;
  }

  // ✅ Actualizar resumen si existe
  if (summaryMsg) {
    await summaryMsg.edit({
      embeds: [
        resumenEmbed
      ]
    });
  }

  // 🧩 Actualizar mensajes de cada división
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const msg = clubsMsgs[i];
    if (!msg) continue

    await msg.edit({
      embeds: [pageEmbed({ index: i + 1, clubes: page })]
    });
  }
    } catch (error) {
        console.error(`Error en el proceso de actualización: ${error}`);
    }
};