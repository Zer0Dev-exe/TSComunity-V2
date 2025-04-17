require('dotenv').config()
const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
  ChannelType,
  AttachmentBuilder
} = require("discord.js");

const Canvas = require('canvas');
const axios = require('axios');
const path = require('path');
const { exec } = require('node:child_process');

const { loadEvents } = require("./Handlers/cargarEventos");
const { loadCommands } = require("./Handlers/cargarComandos");
const { loadPrefix } = require('./Handlers/cargarPrefix');
const process = require('node:process');
const token = process.env.TOKEN;

process.on('unhandledRejection', async (reason, promise) => {
  console.log('Unhandled Rejection error at:', promise, 'reason', reason);
});

process.on('uncaughtException', (err) => {
  console.log('Uncaught Exception', err);
});

process.on('uncaughtExceptionMonitor', (err, origin) => {
  console.log('Uncaught Exception Monitor', err, origin);
});

const client = new Client({
  intents: [Object.keys(GatewayIntentBits)],
  partials: [Object.keys(Partials), Partials.Channel],
  allowedMentions: {
    parse: ["users"]
  },
});

client.commands = new Collection();
client.prefixs = new Collection();
client.aliases = new Collection();

client.login(token).then(async () => {
  // Cargar eventos, comandos y prefijos
  loadEvents(client);
  loadCommands(client);
  loadPrefix(client);
});

module.exports = client;

const BRAWL_STARS_API_KEY = process.env.BS_APIKEY
async function fetchPlayerStats(playerTag) {
    try {
        const response = await axios.get(`https://api.brawlstars.com/v1/players/${encodeURIComponent(playerTag)}`, {
            headers: {
                'Authorization': `Bearer ${BRAWL_STARS_API_KEY}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error al obtener los datos del jugador:', error);
        throw error;
    }
}

// Función para crear la imagen de las estadísticas
async function createStatsImage(playerData) {
    const width = 800;
    const height = 400;
    const canvas = Canvas.createCanvas(width, height);
    const context = canvas.getContext('2d');

    // Cargar fondo
    context.fillStyle = '#1E1E1E';
    context.fillRect(0, 0, width, height);

    // Posición y tamaño del ícono de jugador
    const iconSize = 50;
    const iconX = 50;
    const iconY = 40;

    // Obtener y cargar el ícono del jugador desde el CDN
    if (playerData.icon && playerData.icon.id) {
        const iconURL = `https://cdn.brawlify.com/profile-icons/regular/${playerData.icon.id}.png`; // Usamos el CDN para obtener la imagen
        try {
            const response = await axios.get(iconURL, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(response.data, 'binary');
            const playerIcon = await Canvas.loadImage(buffer);
            context.drawImage(playerIcon, iconX, iconY, iconSize, iconSize);
        } catch (error) {
            console.error('Error al obtener el ícono del jugador:', error);
        }
    }

    // Texto del nombre del jugador con el ícono al lado
    context.font = 'bold 30px sans-serif';
    context.fillStyle = '#FFFFFF';
    context.fillText(`Estadísticas de ${playerData.name}`, iconX + iconSize + 20, iconY + 35);

    // Agregar estadísticas del jugador
    context.font = '20px sans-serif';
    context.fillText(`Trofeos: ${playerData.trophies}`, 50, 150);
    context.fillText(`Nivel de experiencia: ${playerData.expLevel}`, 50, 200);
    context.fillText(`Victorias 3v3: ${playerData['3vs3Victories']}`, 50, 250);
    context.fillText(`Victorias en Solo: ${playerData.soloVictories}`, 50, 300);
    context.fillText(`Victorias en Duo: ${playerData.duoVictories}`, 50, 350);

    return canvas.toBuffer();
}

client.on('messageCreate', async message => {
    if (message.content.startsWith('>>stats')) {
        const args = message.content.split(' ');
        const playerTag = args[1];

        if (!playerTag) {
            return message.reply('Por favor, proporciona un tag de jugador. Ejemplo: `!stats #PLAYER_TAG`');
        }

        try {
            const playerData = await fetchPlayerStats(playerTag);
            const imageBuffer = await createStatsImage(playerData);

            // Enviamos la imagen usando AttachmentBuilder
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'stats.png' });
            message.channel.send({ files: [attachment] });
        } catch (error) {
            console.error(error);
            message.reply('Hubo un error al obtener las estadísticas del jugador.');
        }
    }
})

const Schema = require('./Esquemas/clubsSchema.js')

setInterval(async () => {
    try {
        const token = process.env.BS_APIKEY;
        const data = await Schema.find();
        const cantidad = data.length;
        let totalCopas = 0;
        let totalMiembros = 0;
        let totalVices = 0;
        let totalVeteranos = 0;
        const canal = await client.channels.cache.get('1102591330070302862');
        if (!canal) {
            console.error('Canal no encontrado');
            return;
        }
        const mensaje1 = await canal.messages.fetch('1336726116143988736').catch(() => null);
        if (!mensaje1) {
            console.error('Mensaje no encontrado');
            return;
        }
        const clubDetalles = [];
        const totalClubes = data.length;

        for (const doc of data) {
            const countries = require('./json/countries.json')
            const countri = doc.Region ? doc.Region : 'España'
            const countriCode = countries[countri].codigo
            const countriEmoji = countries[countri].emoji
            const clubTag = doc.ClubTag

            const url = `https://api.brawlstars.com/v1/clubs/%23${doc.ClubTag}`;
            try {
                const response = await axios.get(url, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json",
                    },
                });
                const responseRankings = await axios.get(`https://api.brawlstars.com/v1/rankings/${countriCode}/clubs`, {
                    headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                    },
                })
                const responseGlobalRankings = await axios.get(`https://api.brawlstars.com/v1/rankings/global/clubs`, {
                    headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                    },
                })

                const club = response.data;
                totalCopas += club.trophies;
                totalMiembros += club.members.length;
                totalVices += club.members.filter(member => member.role === 'vicePresident').length;
                totalVeteranos += club.members.filter(member => member.role === 'senior').length;

                // Obtener el presidente antes de cualquier otra operación
                const presi = club.members.find(member => member.role === 'president');
                const presiName = presi ? presi.name : 'No disponible';
                const presiTag = presi ? presi.tag.replace('#', '') : ''; // Reemplaza el '#' por nada

                let tipo = club.type;
                if (tipo === "inviteOnly") tipo = "<:InvitacionBN:1333582486139043890> \`Invitación\`";
                if (tipo === "open") tipo = "<:AbiertoBN:1333582488160833636> \`Abierto\`";
                if (tipo === "closed") tipo = "<:CerradoBN:1333582484629094400> \`Cerrado\`";


                const globalRankings = responseGlobalRankings.data
                const globalRankingsV = globalRankings.items
                const globalFindClubRanking = globalRankingsV.find((c) => c.tag === `#${clubTag}`)
                const globalclubRanking = globalFindClubRanking ? `🌍 \`#${globalFindClubRanking.rank.toString()}\` ` : ''


                const rankings = responseRankings.data
                const rankingClubs = rankings.items
                const findClubRanking = rankingClubs.find((c) => c.tag === `#${clubTag}`)
                const clubRanking = findClubRanking ? `${countriEmoji} \`#${findClubRanking.rank.toString()}\`\n` : ''

                clubDetalles.push({
                    name: `**ㅤ**`,
                    value: `<:CoronaAzulao:1237349756347613185> **[${club.name}](https://brawltime.ninja/club/${doc.ClubTag.replace('#', '')})**\n<:trophy:1178100595530420355> \`${club.trophies.toLocaleString()}\`\n${globalclubRanking}${clubRanking}<:Presi:1202692085019447377> ${presiName !== 'No disponible' ? `[${presiName}](https://brawltime.ninja/profile/${presiTag})` : presiName}\n<:trofeosmasaltos:1178100593181601812> \`${club.requiredTrophies.toLocaleString()}\`\n<:MiembrosClan:1202693897306898492> \`${club.members.length}\`\n${tipo}`,
                    inline: true,
                    trophies: club.trophies // Añadir la cantidad de trofeos para la ordenación
                });
                

            } catch (error) {
                console.error(`Error al obtener datos para el club con tag ${doc.ClubTag}:`, error);
                clubDetalles.push({
                    name: `Error en el club ${doc.ClubTag}`,
                    value: `No se pudieron obtener datos para este club.`,
                    trophies: 0 // Añadir 0 trofeos para la ordenación
                });
            }
        }

        // Ordenar los clubes por la cantidad de trofeos
        clubDetalles.sort((a, b) => b.trophies - a.trophies);

        const currentDate = new Date();
        const formattedDate = currentDate.toLocaleString('es-ES', { 
            timeZone: 'Europe/Madrid', // Cambia este valor según tu ubicación
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit', 
            hour12: false 
        });

        const resumenEmbed = new EmbedBuilder()
            .setDescription(`# Información clubes TS`)
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

        const clubesEmbed = new EmbedBuilder()
            .setDescription('# Lista de Clubes TS Comunity Brawl')
            .setColor('#10ceec')
            .setFooter({ text: `Última actualización: ${formattedDate}`, iconURL: `${client.user.avatarURL()}` });

        // Agregar los detalles de cada club como fields
        clubDetalles.forEach(club => {
            clubesEmbed.addFields({ name: club.name, value: club.value, inline: true });
        });
        // Editar el primer mensaje con la información general
        await mensaje1.edit({ embeds: [resumenEmbed, clubesEmbed] });
    } catch (error) {
        console.error(`Error en el proceso de actualización: ${error.message}`);
    }
}, 60000);

setInterval(async () => {
    const token = process.env.BS_APIKEY
    const data = await Schema.find()
    const guild = client.guilds.cache.get('1093864130030612521')
    const channel = guild.channels.cache.get('1335991815026905159')
    const timeStampt = await channel.messages.fetch('1335992875753930825')
    const message = await channel.messages.fetch('1335992876856774697')

    const now = new Date();
    const formattedDate = now.toLocaleString('es-ES', { 
        timeZone: 'Europe/Madrid',
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit', 
        hour12: false 
    })
    const members = `+${Math.floor(guild.memberCount / 100) * 100}`
    const clubs = data.length
    const clubsDetails = []

    for (const doc of data) {
    try {
        const clubTag = doc.ClubTag
        const response = await axios.get(`https://api.brawlstars.com/v1/clubs/%23${clubTag}`, {
            headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            },
        })
        const countries = require('./json/countries.json')
        const countri = doc.Region ? doc.Region : 'España'
        const countriCode = countries[countri].codigo
        const countriEmoji = countries[countri].emoji
        const responseRankings = await axios.get(`https://api.brawlstars.com/v1/rankings/${countriCode}/clubs`, {
            headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            },
        })
        const club = response.data
        const name = club.name
        const trophies = `${club.trophies.toLocaleString('es').padEnd(10)}🏆`
        const requiredTrophies = club.requiredTrophies < 1000 ? `+ ${club.requiredTrophies} 🏆` : `+ ${club.requiredTrophies / 1000}k 🏆`
        // const members = club.members.length < 10 ? `0${club.members.length}/30 👤` : `${club.members.length}/30 👤`

        const rankings = responseRankings.data
        const rankingClubs = rankings.items
        const findClubRanking = rankingClubs.find((c) => c.tag === `#${clubTag}`)
        const clubRanking = findClubRanking ? `Rank #${findClubRanking.rank.toString().padEnd(4)}${countriEmoji}` : ''

        clubsDetails.push({
            'value': `${name.padEnd(17)}${trophies.padEnd(17)}${requiredTrophies.padEnd(17)}${clubRanking}`,
            'trophies': club.trophies
        })
    } catch (error) {
        console.error(`Error al obtener datos para el club con tag ${doc.ClubTag}:`, error)
    }
    }
timeStampt.edit(`
# Plantilla de Promoción de Clubes
> Esta plantilla, pensada para promocionar los clubes de la comunidad en canales cómo <#1211751809534660608> de otros servidores es editada automaticamente con información del servidor y los clubes de la comunidad cada 2 minutos.
    
## Cómo y quién puede promocionar
> Cualquier usuario con acceso a este canal podra utilizar la plantilla.
> 
> **Pasos a seguir:**
> - **1. Copia la plantilla en tu portapapeles.**
> *Asegurate de hacerlo cada vez que quieras promocionar, para que la plantilla incluya información actualizada.*
> - **2. Únete a un servidor y ve a su canal pensado para promocionar clubes.**
> *En este servidor el canal seria <#1211751809534660608>.*
> - **3. Pega la plantilla en el canal.**
> *Asegurate de que en los anteriores 2 mensajes nadie haya publicado la plantilla.*
    
## Servidores donde se puede promocionar
> [Brawl Monkey Kingdom](https://discord.gg/hzm3QeuynD)
> [GuilleVGX - Brawl Stars](https://discord.gg/77sQHhmZkm)
> [GoDeik TEAM](https://discord.gg/h2mSWgcMag)
> [Templo de los ricochets (iKaoss community)](https://discord.gg/6VhNHVMgcr)
> [Rol & Role coaching](https://discord.gg/b7eZh27aDH)
> [Brawl Stars Fénix](https://discord.gg/T2QCXxXX8a)
> [ELPIPEKAS - BRAWL STARS](https://discord.gg/pPpdwrMuBk)
> [Pizza BS](https://discord.gg/jcmeX4bS9g)
> [Cats World BS](https://discord.gg/n6qqa5CyN7)
> [Team Turtle](https://discord.gg/jg9Yet8pNW)
> [BrawlStation](https://discord.gg/qfWKdvVPjs)
    
*Plantilla actualizada cada 2 min, última actualización a las \`${formattedDate}\`.*
    ** **
`)
const clubsValues = clubsDetails
.sort((a, b) => b.trophies - a.trophies)
.map(item => item.value)
.join('\n')

message.edit(`
# \`T\` \`S\`   \`C\` \`O\` \`M\` \`U\` \`N\` \`I\` \`T\` \`Y\`
** **
**__Somos una amplia cadena de clubes que cuenta cuenta con clubes tanto en el top Español como en el Global __**
   
### 📙 QUE OFRECEMOS
> - \`${clubs}\` clubes de Brawl Stars
> - Comunidad de Discord con \`${members}\` miembros
> - Staff experimentado en la creación de clubes

### 🔎 QUE BUSCAMOS
> - Miembros activos para nuestros clubes
> - Personas interesadas en la creación de clubes

### 🛡️ NUESTROS CLUBES
\`\`\`${clubsValues}\`\`\`

### 📨 ¡INTERESADOS AL MD!
`)
}, 60000)

const Asociacion = require('./Esquemas/asociacionesSchema.js');

async function actualizarListaAsociaciones() {
  const canalId = "1339987513401413735"; // ID del canal donde están los mensajes
  const canal = await client.channels.fetch(canalId);
  if (!canal) return;

  // IDs de los mensajes a editar
  const mensaje1_ID = "1340662419999031308";
  const mensaje2_ID = "1340662444372267029";
  const mensaje3_ID = "1340662681006374963";

  const asociaciones = await Asociacion.find();
  if (asociaciones.length === 0) return;

  let agrupadoPorAsignado = {};
  let sinAsignar = [];

  // Agrupar asociaciones por Asignado
  asociaciones.forEach(a => {
    if (a.Asignado) {
      if (!agrupadoPorAsignado[a.Asignado]) {
        agrupadoPorAsignado[a.Asignado] = [];
      }
      agrupadoPorAsignado[a.Asignado].push(a);
    } else {
      sinAsignar.push(a);
    }
  });

  // Función para obtener el nombre de usuario
  async function obtenerNombreUsuario(id) {
    try {
      const miembro = await canal.guild.members.fetch(id);
      return miembro ? miembro.displayName : `UsuarioDesconocido(${id})`;
    } catch (error) {
      return `UsuarioDesconocido(${id})`; // Si el miembro no está en el servidor
    }
  }

  // Generar los embeds de asociaciones asignadas
  let embedsAsignados = [];
  for (const [asignado, asociaciones] of Object.entries(agrupadoPorAsignado)) {
    const nombreUsuario = await obtenerNombreUsuario(asignado);
    let embed = new EmbedBuilder()
      .setColor("Purple")
      .setTimestamp()
      .setTitle(`Asociaciones de ${nombreUsuario}`);

    let descripcion = "";
    asociaciones.forEach(a => {
      const nuevaLinea = `<:canales:1340014379080618035> <#${a.Canal}>\n⌛ ${a.Renovacion} días\n<:representante:1340014390342193252> <@${a.Representante}>\n\n`;
      if (descripcion.length + nuevaLinea.length > 4096) {
        embed.setDescription(descripcion);
        embedsAsignados.push(embed);
        embed = new EmbedBuilder()
          .setColor("Purple")
          .setTimestamp()
          .setTitle(`Asociaciones de ${nombreUsuario}`);
        descripcion = nuevaLinea;
      } else {
        descripcion += nuevaLinea;
      }
    });

    if (descripcion) {
      embed.setDescription(descripcion);
      embedsAsignados.push(embed);
    }
  }

  // Generar los embeds de asociaciones sin asignar
  let embedsSinAsignar = [];
  if (sinAsignar.length > 0) {
    let embed = new EmbedBuilder()
      .setColor("Purple")
      .setTimestamp()
      .setTitle("Asociaciones sin asignar");

    let descripcion = "";
    sinAsignar.forEach(a => {
      const nuevaLinea = `<:canales:1340014379080618035> <#${a.Canal}>\n⌛ ${a.Renovacion} días\n<:representante:1340014390342193252> <@${a.Representante}>\n\n`;
      if (descripcion.length + nuevaLinea.length > 4096) {
        embed.setDescription(descripcion);
        embedsSinAsignar.push(embed);
        embed = new EmbedBuilder()
          .setColor("Purple")
          .setTimestamp()
          .setTitle("Asociaciones sin asignar");
        descripcion = nuevaLinea;
      } else {
        descripcion += nuevaLinea;
      }
    });

    if (descripcion) {
      embed.setDescription(descripcion);
      embedsSinAsignar.push(embed);
    }
  } else {
    // Si no hay asociaciones sin asignar, se envía un mensaje indicando esto
    embedsSinAsignar.push(new EmbedBuilder()
      .setColor("Purple")
      .setTimestamp()
      .setTitle("Asociaciones sin asignar")
      .setDescription("No hay asociaciones sin asignar en este momento."));
  }

  try {
    // Obtener los mensajes a editar
    const mensaje1 = await canal.messages.fetch(mensaje1_ID);
    const mensaje2 = await canal.messages.fetch(mensaje2_ID);
    const mensaje3 = await canal.messages.fetch(mensaje3_ID);

    // Dividir los embeds asignados en los dos primeros mensajes (máx. 10 por mensaje)
    const embeds1 = embedsAsignados.slice(0, 10);
    const embeds2 = embedsAsignados.slice(10, 20);
    const embeds3 = embedsSinAsignar; // Siempre actualizar el mensaje 3 con asociaciones sin asignar

    // Editar los mensajes con los embeds correctos
    if (embeds1.length > 0) await mensaje1.edit({ embeds: embeds1 });
    if (embeds2.length > 0) await mensaje2.edit({ embeds: embeds2 });
    if (embeds3.length > 0) await mensaje3.edit({ embeds: embeds3 });

  } catch (error) {
    console.error("Error al editar los mensajes:", error);
  }
}

setInterval(actualizarListaAsociaciones, 120000);

client.on('interactionCreate', async interaction => {
  if (interaction.isAutocomplete()) {
   const command = client.commands.get(interaction.commandName);
    if (!command || !command.autocomplete) return;
    try {
      await command.autocomplete(interaction);
    } catch (error) {
      console.error('❌ Error en autocompletado:', error);
    }
  }
});


// CANALES PARA BORRAR MENSAJES BORrAR EL DE HALLOWEEN
const canales = ['1112754769472270449'];

async function borrarMensajes() {
    for (const channelId of canales) {
        try {
            const servidor = await client.guilds.fetch('1093864130030612521');
            const channel = await servidor.channels.fetch(channelId);
            if (!channel || channel.type !== ChannelType.GuildText) {
                console.warn(`El canal con ID ${channelId} no es un canal de texto válido o no se encontró.`);
                continue;
            }

            setInterval(async () => {
                try {
                    const fetched = await channel.messages.fetch({ limit: 100 });
                    const messagesToDelete = fetched.filter(message => !message.pinned);
                    
                    for (const message of messagesToDelete.values()) {
                        await message.delete().catch(err => console.error(`Error al borrar el mensaje con ID ${message.id}:`, err));
                    }
                } catch (error) {
                    console.error(`Error al borrar mensajes del canal ${channelId}:`, error);
                }
            }, 5000); // Ejecuta cada 5 segundos
        } catch (error) {
            console.error(`Error al acceder al canal ${channelId}:`, error);
        }
    }
}
borrarMensajes()