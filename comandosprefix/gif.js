const { EmbedBuilder, PermissionsBitField, ChannelType } = require("discord.js");

require('dotenv').config()

const TENORKEY = process.env.TENORKEY

module.exports = {
    name: "gif",
    aliases: [],
    args: true,

    run: async(message, client, args) => {

        if (!args) return message.reply('Tienes que añadir un argumento')

            async function getGif(query) {
                const response = await axios.get('https://tenor.googleapis.com/v2/search', {
                  params: {
                    key: TENORKEY,
                    q: query,
                    limit: 20
                  }
                })
              
                const results = response.data.results
              
                if (results.length > 0) {
                  const randomIndex = Math.floor(Math.random() * results.length)
                  const gifData = results[randomIndex]
                  return {
                    url: gifData.media_formats.gif.url,
                    title: gifData.content_description || null
                  }
                } else {
                  return null
                }
              }

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
            if (gif.title) [
                embed.setFooter({ text: gif.title })
            ]
        }

        message.reply({ embeds: [embed] })
    }
 };