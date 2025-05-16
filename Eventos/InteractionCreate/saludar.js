
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

const { getGif } = require('../Funciones/getGif.js')

module.exports = {
name: "interactionCreate",

async execute(interaction, client) {

  const condition = interaction.isButton() && interaction.customId.startsWith('saludar-')

  if (!condition) return

  const userID = interaction.customId.replace('saludar-', '')

  if (userID === interaction.user.id) return interaction.reply({ content: 'No te puedes saludar a ti mismo', ephemeral: true })

  const saludar = new ButtonBuilder()
  .setCustomId(`saludar-disabled`)
  .setEmoji('👋')
  .setLabel('¡Saludar!')
  .setStyle(ButtonStyle.Secondary)
  .setDisabled(true)

  const row = new ActionRowBuilder()
  .addComponents(saludar)

      const member = await interaction.guild.members.fetch(interaction.user.id)

      if (!member) return

      const displayName = member.displayName

      let member2
      try {
        member2 = await interaction.guild.members.fetch(userID)
      } catch(error) {
        await interaction.update({ components: [row] })
        await interaction.followUp({ content: 'El usuario no se encuentra en el servidor', ephemeral: true })
        return
      }

      const displayName2 = member2.displayName

      await interaction.update({
          components: [row]
        })

    try {
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
      
      const gif = await getGif('anime welcome')

      if (gif) {
        if (gif.url) {
            embed.setImage(gif.url)
        }
        if (gif.title) [
            embed.setFooter({ text: gif.title })
        ]
    }
      await interaction.followUp({ content: `<@${userID}>`, embeds: [embed] })
  } catch(error) {
      console.log(error)
  }
}
}
