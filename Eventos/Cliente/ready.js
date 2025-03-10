require('dotenv').config()
const {Client, ActivityType, GatewayDispatchEvents, EmbedBuilder} = require('discord.js');
const mongoose = require('mongoose')
const mongodbURL = process.env.MONGODBURL;
const wait = require('node:timers/promises').setTimeout;
var colors = require('colors');
const { Classic } = require('musicard')
const { Riffy } = require("riffy");
const fs = require('fs')
// keep yourself safe
module.exports = {
    name: "ready",
    once: true,
    async execute(client) {
        try {

        const targetGuild = client.guilds.cache.get('1093864130030612521')
        
        await wait(3000);
        await console.log(`[   TS-EVREADY     ]`.underline.red + " --- Empezando ".red + `  ${client.user.tag}`.red);

        if (!mongodbURL) return;
        const nodes = [
            {
                host: "lavalinkv4-eu.serenetia.com",
                password: "https://dsc.gg/ajidevserver",
                port: "443",
                secure: true,
            },
          ];
        
          client.riffy = new Riffy(client, nodes, {
              send: (payload) => {
                  const guild = client.guilds.cache.get(payload.d.guild_id);
                  if (guild) guild.shard.send(payload);
              },
              defaultSearchPlatform: "ytmsearch", // <--- Change here
              restVersion: "v4" // or v3 based on your lavalink version
          });

        client.riffy.init(client.user.id);

        // This will send log when the lavalink node is connected.
client.riffy.on("nodeConnect", node => {
    console.log(`[   TS-LAVALINK    ]`.underline.yellow + " --- Empezando ".yellow + `  ${node.name}`.yellow)
})

// This will send log when the lavalink node faced an error.
client.riffy.on("nodeError", (node, error) => {
    console.log(`Node "${node.name}" encountered an error: ${error.message}.`)
})

// This is the event handler for track start.
client.riffy.on("trackStart", async (player, track) => {
    const channel = client.channels.cache.get(player.textChannel);

    const url = track.info.thumbnail;
    const tiempo = track.info.length;

    const minutos = Math.floor(tiempo / 60000) % 60;
    const segundos = Math.floor(tiempo / 1000) % 60;

    const musicard = await Classic({
        thumbnailImage: url,
        backgroundColor: "#070707",
        progress: 0, // Set the initial progress to 0
        progressColor: "#FF7A00",
        progressBarColor: "#5F2D00",
        name: track.info.title,
        nameColor: "#FF7A00",
        author: `By ${track.info.author}`,
        authorColor: "#696969",
        startTime: "0:00",
        endTime: `${minutos}:${segundos.toString().padStart(2, '0')}`,
        timeColor: "#FF7A00"
    });

    fs.writeFileSync("musicard.png", musicard);

    channel.send({ files: ["musicard.png"] });
});


// This is the event handler for queue end.
client.riffy.on("queueEnd", async (player) => {
    const channel = client.channels.cache.get(player.textChannel);
    
	// Set this to true if you want to enable autoplay.
	const autoplay = true;

    if (autoplay) {
        player.autoplay(player)
    } else {
        const embed = new EmbedBuilder()
        .setTitle('La cola ha sido acabada')
        .setDescription('Pon una canción o escribe !parar para sacar el bot del canal')
        .setColor('#4180fa')
        channel.send({ embeds: [embed]});
    }
})

// This will update the voice state of the player.
client.on("raw", (d) => {
    if (![GatewayDispatchEvents.VoiceStateUpdate, GatewayDispatchEvents.VoiceServerUpdate,].includes(d.t)) return;
    client.riffy.updateVoiceState(d);
});

        mongoose.set('strictQuery', true)

        await mongoose.connect(mongodbURL || '', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        })
        if (mongoose.connect) {
            console.log(`[   TS-MONGOBD     ]`.underline.blue + " --- Empezando  ".blue + ` Base de Datos en Funcionamiento`.blue);
        } else {
            console.log('No pude conectarme a la base de datos.')
        }

        const activities = [
            `Vigilando ${targetGuild.memberCount} miembros`,
        ];

        setInterval(() => {
            const status = activities[Math.floor(Math.random() * activities.length)];
            client.user.setPresence({ 
            status: 'idle',
            activities: [{
                type: ActivityType.Custom,
                name: `Prueba`,
                state: `${status}`
            }]
            });
        }, 20000);
    } catch(error) {
        console.error(error);
    }
        
    },
};