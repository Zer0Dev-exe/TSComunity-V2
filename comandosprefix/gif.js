const { EmbedBuilder, PermissionsBitField, ChannelType } = require("discord.js")

const { getGif } = require('../Eventos/Funciones/getGif.js')

module.exports = {
    name: "gif",
    aliases: [],
    args: true,

    run: async(message, client, args) => {

        if (!args) return message.reply('Tienes que añadir un argumento')

        const gif = await getGif(args.join(' '))

        if (!gif) {
            const embed = new EmbedBuilder()
            .setColor('Red')
            .setTitle('No se encontro ningun Gif')
            message.reply({ embeds: [embed] })
            return
          }

        console.log(gif)

        const embed = new EmbedBuilder()
        .setColor('Blue')
        .setTitle('Gif Encontrado')

        if (gif) {
            if (gif.url) {
                embed.setImage(gif.url)
            }
            if (gif.title) {
                embed.setFooter({ text: gif.title })
            }
        }

        message.reply({ embeds: [embed] })
    }
 };