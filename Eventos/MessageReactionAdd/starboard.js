const { Events, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");

const schemaSc = require('../../Esquemas/configuracionSv.js')
const starData = require('../../Esquemas/starboardSchema.js')

module.exports = {
  name: "messageReactionAdd",

  async execute(reaction, user, client) {
    // Ignorar reacciones de bots
    if (user.bot) return;

    // Verificar si la reacción es la estrella
    if (reaction.emoji.name !== '⭐') return;

    // Asegurarse de que el mensaje y el canal existan
    if (!reaction.message || !reaction.message.guild) return;

    // Buscar la configuración en la base de datos
    const data = await schemaSc.findOne({})
    if (!data) {
        console.log('No se encontró la configuración en la base de datos.');
        return;
    }

    // Contar las reacciones
    const reactionCount = reaction.count;

    // Verificar si el conteo de reacciones alcanza el mínimo requerido
    if (reactionCount >= data.EstrellasMin) {
        // Buscar si ya existe un registro del mensaje en la base de datos
        const dataMensaje = await starData.findOne({ IdMensaje: reaction.message.id });
        if (!dataMensaje) {
            // Crear un nuevo embed para el starboard
            const embed = new EmbedBuilder()
                .setAuthor({ name: `${reaction.message.author.username}`, iconURL: `${reaction.message.author.avatarURL()}` })
                .setDescription(reaction.message.content)
                .setFooter({ text: `ID Mensaje: ${reaction.message.id}` })
                .setColor('Random');

            // Crear un botón que redirija al mensaje original
            const button = new ButtonBuilder()
                .setLabel('Ir al mensaje')
                .setStyle(ButtonStyle.Link)
                .setURL(`https://discord.com/channels/${reaction.message.guild.id}/${reaction.message.channel.id}/${reaction.message.id}`);

            // Crear una fila de acción para el botón
            const row = new ActionRowBuilder().addComponents(button);

            if (reaction.message.attachments.size > 0) {
                const attachment = reaction.message.attachments.first(); // Tomamos el primer adjunto
                    embed.setImage(attachment.url)
            }

            // Enviar el embed y el botón al canal de starboard
            const canal = reaction.message.guild.channels.cache.get(data.CanalStarboard);
            if (canal) {
                const sentMessage = await canal.send({ content: `:star: **${reactionCount} estrellas** ${reaction.message.channel}`, embeds: [embed], components: [row] });
                
                // Actualizar el registro en la base de datos con el ID del mensaje enviado
                await starData.create({ IdMensaje: reaction.message.id, IdMensajeStarboard: sentMessage.id });
            } else {
                console.log('Canal de starboard no encontrado.');
            }
        } else {
            // Si ya existe un registro, actualizar el contenido del mensaje en el starboard
            const starboardMessageId = dataMensaje.IdMensajeStarboard; // Asegúrate de que este campo exista en tu esquema
            const canal = reaction.message.guild.channels.cache.get(data.CanalStarboard);
            if (canal) {
                try {
                    const starboardMessage = await canal.messages.fetch(starboardMessageId);
                    if (starboardMessage) {
                        // Editar el mensaje existente
                        await starboardMessage.edit({ content: `:star: **${reactionCount} estrellas** ${reaction.message.channel}` });
                    } else {
                        console.log('Mensaje en el starboard no encontrado.');
                    }
                } catch (error) {
                    console.error('Error al intentar editar el mensaje en el starboard:', error);
                }
            } else {
                console.log('Canal de starboard no encontrado.');
            }
        }
    }
  }
}