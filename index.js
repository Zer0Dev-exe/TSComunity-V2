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
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // Si necesitas leer el contenido del mensaje
    GatewayIntentBits.GuildMembers, // Si necesitas acceder a miembros
  ],
  partials: [
    Partials.Channel, // Si usas canales parciales (DMs, etc.)
  ],
  allowedMentions: {
    parse: ['users', 'roles', 'everyone'],
    repliedUser: false
  }
});

client.commands = new Collection();
client.prefixs = new Collection();
client.aliases = new Collection();

client.login(token).then(async () => {
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

const actualizarClubes = require('./Funciones/actualizarClubes.js');
setInterval(() => actualizarClubes(client), 10000);

const Schema = require('./Esquemas/clubsSchema.js')
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
> [GuilleVGX - Brawl Stars](https://discord.gg/77sQHhmZkm)
> [GoDeik TEAM](https://discord.gg/h2mSWgcMag)
> [Templo de los ricochets (iKaoss community)](https://discord.gg/6VhNHVMgcr)
> [Rol & Role coaching](https://discord.gg/b7eZh27aDH)
> [Brawl Stars Fénix](https://discord.gg/T2QCXxXX8a)
> [ELPIPEKAS - BRAWL STARS](https://discord.gg/pPpdwrMuBk)
> [Pizza BS](https://discord.gg/jcmeX4bS9g)
> [Cats World BS](https://discord.gg/n6qqa5CyN7)
> [Team Turtle](https://discord.gg/jg9Yet8pNW)
    
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

const actualizarListaAsociaciones = require('./Funciones/actualizarAsociaciones.js')
setInterval(async () => await actualizarListaAsociaciones(client), 100000);

const ordenarAsociaciones = require('./Funciones/ordenarAsociaciones.js')
setInterval(async () => await ordenarAsociaciones(client), 1000 * 60 * 30);

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
const canales = ['1112754769472270449']

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


const tareasAsociaciones = require('./Esquemas/tareasAsociaciones.js'); // Asegúrate de usar la ruta correcta

// Verificar tareas pendientes cada 10 minutos
setInterval(async () => {
  try {
    // Obtener todas las tareas desde la base de datos
    const tasks = await tareasAsociaciones.find({});
    const now = Date.now(); // Hora actual en milisegundos

    for (const task of tasks) {
      console.log(task)
      const expirationTime = new Date(task.expirationDate).getTime();

      if (expirationTime <= now) {
        // Si la tarea ya expiró, enviar el mensaje y eliminarla
        try {
          const encargado = await client.users.fetch(task.userId); // Obtener el usuario encargado
          if (encargado) {
            // Enviar mensaje al encargado
            await encargado.send(
              `🔔 ¡<@${task.userId}>! Ya es hora de renovar tu asociación asignada, <#${task.channelId}>.`
            );
          }
          // Eliminar la tarea después de completarse
          await tareasAsociaciones.deleteOne({ _id: task._id });
        } catch (err) {
          console.error(`❌ Error al enviar mensaje al encargado para el canal ${task.channelId}:`, err);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error al recuperar las tareas pendientes:', error);
  }
}, 600000); // Ejecutar cada 10 minutos

const tagRoleManager = require("./Funciones/tagRole");

tagRoleManager(client, "1380229272316154027");