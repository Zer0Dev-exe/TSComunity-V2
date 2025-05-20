const { EmbedBuilder, PermissionsBitField, ChannelType } = require("discord.js");

module.exports = {
    name: "pepegay",
    aliases: [""],
    args: false,
    run: async(message, client, args) => {
        const schema = require('../Esquemas/tareasAsociaciones.js')

        try {
        const data = await schema.find({})

        const resultado = data.map((d, i) => {
  return `#${i + 1}
• Canal: \`${d.channelId}\`
• Usuario: <@${d.userId}>
• Expira: <t:${Math.floor(new Date(d.expirationDate).getTime() / 1000)}:R>\n`;
}).join("\n");

        message.channel.send(resultado)
        } catch(error) {
            console.log(error)
        }
    }
 };