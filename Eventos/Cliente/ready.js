require('dotenv').config()
const {Client, ActivityType, GatewayDispatchEvents, EmbedBuilder} = require('discord.js');
const mongoose = require('mongoose')
const mongodbURL = process.env.MONGODBURL;
const wait = require('node:timers/promises').setTimeout;
var colors = require('colors');
const fs = require('fs')

module.exports = {
    name: "ready",
    once: true,
    async execute(client) {
        try {

        const targetGuild = client.guilds.cache.get('1093864130030612521')
        
        await wait(3000);
        await console.log(`[   TS-EVREADY     ]`.underline.red + " --- Empezando ".red + `  ${client.user.tag}`.red);

        if (!mongodbURL) return;

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