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

module.exports = {
name: "interactionCreate",

async execute(interaction, client) {
    console.log('1')
  const condition = interaction.isButton() && interaction.customId.startsWith('saludar-')
  console.log(interaction.customId)
  if (!condition) return
  console.log('2')

  const userID = interaction.customId.replace('saludar-', '')


  try {
      const schema = require('../../Esquemas/userSchema.js')

      const data = await schema.find({ id: interaction.user.id })

      if (data) {
          data.bienvenidas += 1;
          await data.save();
      } else {
          await schema.create({ id: interaction.user.id, bienvenidas: 1 });
      }

      const newData = await schema.find({ id: interaction.user.id })

      console.log('3')

      const member = await interaction.guild.members.fetch(interaction.user.id)
      const displayName = member.displayName

      const member2 = await interaction.guild.members.fetch(userID)
      const displayName2 = member2.displayName

      const saludar = new ButtonBuilder()
          .setCustomId(`saludar-${member.user.id}`)
          .setLabel('👋')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)

      const row = new ActionRowBuilder()
          .addComponents(saludar)

      await interaction.update({
          components: [row]
        })

        console.log('4')

    
      const embed = new EmbedBuilder()
      .setColor('Blue')
      .setDescription(`**${displayName}** le da la bienvenida a **${displayName2}**\n-# **${displayName}** ha dado **${newData.bienvenidas}** bienvenidas en total`)

      await interaction.channel.send({ embeds: [embed] })
      console.log('5')
  } catch(error) {
      console.log(error)
  }
}
}