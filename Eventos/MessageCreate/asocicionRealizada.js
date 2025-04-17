const {
    Events,
    EmbedBuilder
  } = require("discord.js");
  
module.exports = {
  name: "messageCreate",

  async execute(message, client) {
    if (message.author.bot) return;

    const data = require('./Esquemas/asociacionesSchema.js'); // Asegurar nombre correcto
    const staffData = require('./Esquemas/staffStats.js'); // Revisar nombre

    try {
        const documentos = await data.find({});
        const doc = documentos.find(documento => documento.Canal === message.channel.id);

        if (!doc) return;

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
            staffDoc = await staffData.findOne({ ID: asignado })
        }

        const ranking = await staffData.find().sort({ Renovaciones: -1 });
        const posicion = ranking.findIndex(user => user.ID === asignado) + 1;


        console.log("Valores antes del embed:");
        console.log("Renovación Timestamp:", renovacionTimestamp);
        console.log("Representante:", representante);
        console.log("Asignado:", asignado);
        console.log("StaffDoc:", staffDoc);
        console.log("Posición:", posicion);


        const embed = new EmbedBuilder()
            .setColor('Blue')
            .setAuthor({ 
                name: 'Nueva Renovación de Asociación Realizada', 
                iconURL: guild.iconURL(),
            })
            .setDescription(`> ୧📅୨ **Renovación • <t:${renovacionTimestamp}:T>, <t:${renovacionTimestamp}:R>**\n> ୧👤﻿୨ **Representante • <@${representante}>**\n> ୧🔧୨ **Encargado • <@${asignado}>**\n### ✦₊⁺⋆｡︵︵୧ ``D`` ``A`` ``T`` ``O`` ``S`` ୨ ︵︵｡⋆⁺₊✦\n> ୧<:emoji_162:1339643027525861467>୨ **Renovaciones Totales • ${staffDoc.Renovaciones}**\n> ୧<:ranking:1339643077824086108>୨ **Rango Total • #${posicion}**\n\n***Para evitar este ping añadete el rol <@&1219196487011930194> en ⁠ <id:customize>.***`)
            .setFooter({ text: `Renovación con ${server}` })
            .setTimestamp()

        message.channel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Error al consultar la base de datos:', error);
    }
  }
}