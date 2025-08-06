const { EmbedBuilder } = require('discord.js');
const Asociacion = require('../Esquemas/asociacionesSchema')

module.exports = async function actualizarListaAsociaciones(client) {
    try {
function embed({ asociation }) {
  // Detectar a quién están asignadas (todas tendrán el mismo .Asignado)
  const asignado = asociation[0]?.Asignado || 'SinAsignar'

  const embed = new EmbedBuilder()
    .setDescription(
      asignado === 'SinAsignar'
        ? '### 📋 Asociaciones sin asignar'
        : `### 📌 Asociaciones de <@${asignado}>`
    )
    .setColor(asignado === 'SinAsignar' ? 0xffcc00 : 0x00b0f4)

  if (asociation.length === 0) {
    embed.setDescription("No hay asociaciones.");
    return embed;
  }

  for (const aso of asociation) {
    embed.addFields({
      name: aso.Canal ? `<:canales:1340014379080618035> <#${aso.Canal}>` : "<:canales:1340014379080618035> Sin canal",
      value: [
        aso.Renovacion ? `🗓️ ${aso.Renovacion} días` : 'No definido',
        aso.Representante ? `<:representante:1340014390342193252> <@${aso.Representante}>` : '<:representante:1340014390342193252> Sin representante',
      ].join('\n'),
      inline: false
    });
  }

  return embed;
}

        const channel = await client.channels.fetch('1339987513401413735');
        if (!channel || !channel.isTextBased())
            throw new Error('Canal no encontrado o no es de texto.');

        const fetchedMessages = await channel.messages.fetch({ limit: 100 });
        const sortedMessages = Array.from(fetchedMessages.values()).sort(
            (a, b) => a.createdTimestamp - b.createdTimestamp
        );
        const botMessages = sortedMessages.filter(
            (msg) => msg.author.id === client.user.id
        )


    const asociations = await Asociacion.find().filter(Boolean);
    const expectedAsociations = Object.values(
    asociations.reduce((acc, aso) => {
        const key = aso.Asignado || 'SinAsignar'; // por si hay alguno sin asignado
        if (!acc[key]) acc[key] = [];
        acc[key].push(aso);
        return acc;
    }, {})
    );
    
  // 🔁 Si faltan mensajes (1 resumen + divisiones), reinicia todo
  const expectedMessages = expectedAsociations.length
  if (botMessages.length !== expectedMessages) {
    for (const msg of botMessages) {
      await msg.delete().catch(() => {});
    }

    for (const asociation of expectedAsociations) {

      await channel.send({
        embeds: [embed({ asociation })]
      })
    }

    return;
  }


  // 🧩 Actualizar mensajes de cada división
  for (let i = 0; i < expectedAsociations.length; i++) {
    const asociation = expectedAsociations[i];
    const msg = botMessages[i];
    if (!msg) continue

    await msg.edit({
      embeds: [embed({ asociation })]
    });
  }
    } catch (error) {
        console.error(`Error en el proceso de actualización: ${error}`);
    }
};

module.exports = { actualizarListaAsociaciones }