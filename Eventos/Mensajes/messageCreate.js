const { EmbedBuilder } = require("discord.js");
const fs = require("fs");

let lastMsgId = null; // Store the last message ID in memory

module.exports = {
  name: "messageCreate",

  async execute(message, client) {
    const canal = client.channels.cache.get('1096162299837939834');

    if (message.author.id === client.user.id) return;
    if(message.author.bot) return;

    if (message.channel.id === canal.id) {
      const embed = new EmbedBuilder()
        .setTitle('Recordatorio | Fase BETA')
        .setColor('#852ffd')
        .setThumbnail(client.user.avatarURL())
        .setDescription('¿Buscas con quien jugar a Brawl Stars? Usa el <@&1180483997281824768> para llegar a más personas y di con qué clase de gente buscas jugar. Aunque no abuses del ping o serás sancionado. ¡Recuerda no unirte a equipos sin avisar antes, y no discrimines a la gente por su nivel de copas! Todos empezamos por algún lado.\n\n-# Ayudemonos entre todos a que la moderación sea facil y eviteis sanciones.');

      // Try to delete the previous message if it exists
      if (lastMsgId) {
        try {
          const lastMsg = await canal.messages.fetch(lastMsgId);
          if (lastMsg) {
            await lastMsg.delete();
          }
        } catch (error) {
          console.error("No se pudo encontrar o eliminar el mensaje anterior:", error);
        }
      }

      try {
        // Send the new message immediately
        const msg = await canal.send({ embeds: [embed] });

        lastMsgId = msg.id;

        // Save the new msgId to lastMessage.json
        const msgData = { msgId: msg.id };
        fs.writeFileSync("./lastMessage.json", JSON.stringify(msgData, null, 2));
      } catch (error) {
        console.error('Error al enviar el mensaje:', error);
      }
    }
  }
};
