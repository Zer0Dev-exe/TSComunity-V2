const { EmbedBuilder, PermissionsBitField, ChannelType } = require("discord.js");

module.exports = {
    name: "pepehetero",
    aliases: [""],
    args: false,
    run: async(message, client, args) => {

        const schema = require('../Esquemas/tareasAsociaciones.js')

        const data = await schema.find({})

        const messageContent = data.map(doc => {
            const unixTime = Math.floor(doc.expirationDate.getTime() / 1000)

            return `<@${doc.userId}> → <#${doc.channelId}> - <t:${unixTime}:R>`
        }).join('\n')

        message.reply(messageContent)
    }
 };