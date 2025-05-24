const { EmbedBuilder, PermissionsBitField, ChannelType } = require("discord.js");

module.exports = {
    name: "zer0hetero",
    aliases: [""],
    args: false,
    run: async(message, client, args) => {

        const schema = require('../Esquemas/tareasAsociaciones.js')

        const data = await schema.find({ })

        const idsPermitidos = ['1018285858362769608', '1036203420891238412', '838441772794511411']


        const messageContent = data.filter(doc => idsPermitidos.includes(doc.userId)).map(doc => {
            const unixTime = Math.floor(doc.expirationDate.getTime() / 1000)

            return `<@${doc.userId}> → <#${doc.channelId}> - <t:${unixTime}:R>`
        }).join('\n')

        message.reply(messageContent)
    }
 };