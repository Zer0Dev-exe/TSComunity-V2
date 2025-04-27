require('dotenv').config()

const {
  Events,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js")
const axios = require('axios');

const TENORKEY = process.env.TENORKEY

module.exports = {
name: "interactionCreate",

async execute(interaction, client) {

  const condition = interaction.isButton() && interaction.customId.startsWith('saludar-')

  if (!condition) return

  const userID = interaction.customId.replace('saludar-', '')

  .setCustomId(`saludar-disabled`)
  .setEmoji('👋')
  .setLabel('¡Saludar!')
  .setStyle(ButtonStyle.Secondary)

  const row = new ActionRowBuilder()
  .addComponents(saludar)

  async function getGif(query) {
    const response = await axios.get('https://tenor.googleapis.com/v2/search', {
      params: {
        key: TENORKEY,
        q: query,
        limit: 1
      }
    })

    if (response.data.results.length > 0) {
      return { url: response.data.results[0].media_formats.gif.url, title: response.data.results[0].title }
    } else {
      return null
    }
  }


  try {
      const member = await interaction.guild.members.fetch(interaction.user.id)

      if (!member) return

      const displayName = member.displayName

      const member2 = await interaction.guild.members.fetch(userID)

      if (!member2) {
        await interaction.update({ components: [row] })
        await interaction.followUp({ content: 'El usuario no se encuentra en el servidor', ephemeral: true })
        return
      }

      const displayName2 = member2.displayName

      await interaction.update({
          components: [row]
        })


      const schema = require('../../Esquemas/userSchema.js')

      const data = await schema.findOne({ id: interaction.user.id })

      if (data) {
          data.bienvenidas += 1;
          await data.save();
      } else {
          await schema.create({ id: interaction.user.id, bienvenidas: 1 });
      }

      const newData = await schema.findOne({ id: interaction.user.id })

      const embed = new EmbedBuilder()
      .setColor('Purple')
      .setDescription(`**${displayName}** le da la bienvenida a **${displayName2}**\n-# ${displayName} ha dado **${newData.bienvenidas}** bienvenidas en total`)
      
      const gif = await getGif('welcome')

      if (gif) {
        embed.setImage(gif.url)
        embed.setFooter(gif.title)
      }

      await interaction.followUp({ content: `<@${userID}>`, embeds: [embed] })
  } catch(error) {
      console.log(error)
  }
}
}
