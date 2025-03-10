const { EmbedBuilder, PermissionsBitField, ChannelType } = require("discord.js");

module.exports = {
    name: "ping",
    aliases: ["p"],
    args: false,
    run: async(message, client, args) => {
      const embed = new EmbedBuilder()
      .setTitle('Latencia del bot')
      .setColor('#9f38f1')
      .setDescription(`Pong, la latencia del bot es ${client.ws.ping}ms!`)
      message.channel.send({ 
        embeds: [embed],
      })
    }
 };