const { EmbedBuilder } = require('discord.js');
const Asociacion = require('../Esquemas/asociacionesSchema')

module.exports = async function actualizarListaAsociaciones(client) {
    try {
        console.log('iniciando')
function embed({ asociation }) {
  // Detectar a quién están asignadas (todas tendrán el mismo .Asignado)
  const asignado = asociation[0]?.Asignado || 'SinAsignar'


  const embed = new EmbedBuilder()
    .setDescription(
      asignado === 'SinAsignar'
        ? '### 📋 Asociaciones sin asignar'
        : `### 📌 Asociaciones de <@${asignado}>`
    )
    .setColor(asignado === 'SinAsignar' ? 0xffcc00 : 0x00b0f4);

  // Si el array está vacío...
  if (asociation.length === 0) {
    if (asignado === 'SinAsignar') {
      embed.setDescription('### 📋 Asociaciones sin asignar\nNo hay asociaciones sin asignar.');
    } else {
      embed.setDescription(`### 📌 Asociaciones de <@${asignado}>\nEl usuario no tiene asociaciones-`);
    }
    return embed;
  }

  for (const aso of asociation) {
    if (!asignado === 'SinAsignar') {
    embed.addFields({
      name: aso.Canal ? `<:canales:1340014379080618035> <#${aso.Canal}>` : "<:canales:1340014379080618035> Sin canal",
      value: [
        aso.Renovacion ? `🗓️ ${aso.Renovacion} días` : 'No definido',
        aso.Representante ? `<:representante:1340014390342193252> <@${aso.Representante}>` : '<:representante:1340014390342193252> Sin representante',
      ].join('\n'),
      inline: false
    });
    } else {
        embed.addFields({
            name: `<:canales:1340014379080618035> <#${aso.Canal}>`
        })
    }
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


const categoria1Id = '1217154240175407196';
const categoria2Id = '1267736691083317300';

// 1. Obtener todos los canales de ambas categorías
const canalesEnCategorias = client.channels.cache.filter(channel =>
  channel.type === 0 && // Solo canales de texto
  (channel.parentId === categoria1Id || channel.parentId === categoria2Id)
);

// 2. Obtener todos los canales ya registrados
const todasAsociaciones = await Asociacion.find({ Canal: { $ne: null } });

const asociations = (
  await Promise.all(
    todasAsociaciones.map(async (aso) => {
      try {
        await client.channels.fetch(aso.Canal);
        return aso; // Canal válido
      } catch {
        return null; // Canal no existe
      }
    })
  )
).filter(Boolean);

// 3. Crear un Set con los IDs ya registrados
const canalesRegistrados = new Set(asociations.map(aso => aso.Canal));

// 4. Filtrar los canales que no están registrados
const canalesNoRegistrados = canalesEnCategorias.filter(channel => !canalesRegistrados.has(channel.id));

// 5. Añadir los canales faltantes a la base de datos
for (const canal of canalesNoRegistrados.values()) {
  asociations.push({ Canal: canal, Asignado, undefined })
}

const agrupado = asociations.reduce((acc, aso) => {
  const key = aso.Asignado || 'SinAsignar';
  if (!acc[key]) acc[key] = [];
  acc[key].push(aso);
  return acc;
}, {});

// Aseguramos que 'SinAsignar' exista aunque esté vacío
if (!agrupado['SinAsignar']) {
  agrupado['SinAsignar'] = [];
}

// Convertimos a array, pero sacamos la clave 'SinAsignar' para ponerla al final
const expectedAsociations = [
  ...Object.entries(agrupado)
    .filter(([key]) => key !== 'SinAsignar')
    .map(([, value]) => value),
  agrupado['SinAsignar'] // siempre al final
];


  // 🔁 Si faltan mensajes (1 resumen + divisiones), reinicia todo
  const expectedMessages = expectedAsociations.length
  console.log(expectedMessages, expectedAsociations)
  if (botMessages.length !== expectedMessages) {
    for (const msg of botMessages) {
      await msg.delete().catch(() => {});
    }

    for (const asociation of expectedAsociations) {

      await channel.send({
        embeds: [embed({ asociation })],
          allowedMentions: { users: [] }
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
      embeds: [embed({ asociation })],
          allowedMentions: { users: [] }
    });
  }
    } catch (error) {
        console.error(`Error en el proceso de actualización: ${error}`);
    }
}