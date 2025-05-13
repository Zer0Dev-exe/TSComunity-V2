const { Events, EmbedBuilder } = require("discord.js")

const cooldowns = new Map();

module.exports = {
  name: "messageCreate",

  async execute(message, client) {
    if (message.author.bot) return;

    // Verificar si el mensaje contiene una invitación de servidor
    const invitacionRegex = /(?:https?:\/\/)?(?:www\.)?(?:discord\.gg|discord\.com\/invite)\/\w+/i;
    if (!invitacionRegex.test(message.content)) return;


    const data = require('../../Esquemas/asociacionesSchema.js');
    const staffData = require('../../Esquemas/staffStats.js');
    const tareasAsociaciones = require('../../Esquemas/tareasAsociaciones.js'); // Ruta a tasksSchema.js

    try {
        const documentos = await data.find({});
        const doc = documentos.find(documento => documento.Canal === message.channel.id);
        if (!doc) return;

        // Cooldown de 10 minutos por canal
        const lastUsed = cooldowns.get(message.channel.id);
        if (lastUsed && Date.now() - lastUsed < 10 * 60 * 1000) return;
        cooldowns.set(message.channel.id, Date.now());

        const renovacionTimestamp = Math.floor((Date.now() + doc.Renovacion * 86400000) / 1000);
        const representante = doc.Representante;
        const asignado = doc.Asignado;

        const server = message.channel.name
            .replace('-', ' ')
            .replace(/^\s*[^a-zA-Z0-9]+/, '')
            .replace(/\b\w/g, letra => letra.toUpperCase());

        const guild = message.guild;

        let staffDoc = await staffData.findOne({ ID: asignado });

        if (staffDoc) {
            staffDoc.Renovaciones = (staffDoc.Renovaciones || 0) + 1;
            await staffDoc.save();
        } else {
            await staffData.create({ ID: asignado, Renovaciones: 1 });
            staffDoc = await staffData.findOne({ ID: asignado });
        }

        const ranking = await staffData.find().sort({ Renovaciones: -1 });
        const posicion = ranking.findIndex(user => user.ID === asignado) + 1;

        const embed = new EmbedBuilder()
            .setColor('Blue')
            .setAuthor({ 
                name: 'Nueva Renovación de Asociación Realizada', 
                iconURL: guild.iconURL(),
            })
            .setDescription(`> ୧📅୨ **Renovación • <t:${renovacionTimestamp}:d> (<t:${renovacionTimestamp}:R>)**
> ୧👤﻿୨ **Representante • <@${representante}>**
> ୧🔧୨ **Encargado • <@${asignado}>**
### ✦₊⁺⋆｡︵︵୧ \`D\` \`A\` \`T\` \`O\` \`S\` ୨ ︵︵｡⋆⁺₊✦
> ୧<:emoji_162:1339643027525861467>୨ **Renovaciones Totales • ${staffDoc.Renovaciones}**
> ୧<:ranking:1339643077824086108>୨ **Rango Total • #${posicion}**

-# Para evitar este ping añadete el rol <@&1219196487011930194> en ⁠ <id:customize>.`)

        try {
            await message.channel.send({ embeds: [embed] })
            const expirationDate = new Date(Date.now() + doc.Renovacion * 86400000); // Tiempo en días -> milisegundos
            await tareasAsociaciones.create({ channelId: message.channel.id, userId: asignado, expirationDate: expirationDate })

        } catch (err) {
            console.error("❌ Error al enviar el mensaje embed:", err);
        }
    } catch (error) {
        console.error('Error al consultar la base de datos:', error);
    }
  }
}