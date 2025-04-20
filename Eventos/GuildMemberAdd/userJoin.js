const {
  Events,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder
} = require("discord.js")

module.exports = {
name: "guildMemberAdd",

async execute(member, client) {
  const guild = member.guild
  const channel = guild.channels.cache.get('1096150563667837011')

  if (!channel) return
  const displayName = member.displayName

  const embed = new EmbedBuilder()
      .setColor('Blue')
      .setTitle(`¡${displayName} acaba de unirse a ${guild.name}!`)
      .setURL('https://discord.js.org')
      .setThumbnail(member.user.displayAvatarURL())
      .addFields(
          { name: ':verificacion: Verificación', value: `<#1112754769472270449>`, inline: true },
          { name: ':info: Info Server', value: `<#1300074754757234688>`, inline: true },
      )
      .setTimestamp()
      .setFooter({
          text: `Eres el miembro #${guild.memberCount} de ${guild.name}`,
          iconURL: guild.iconURL()
      })
  
  const saludar = new ButtonBuilder()
      .setCustomId(`saludar-${member.user.id}`)
      .setLabel('👋')
      .setStyle(ButtonStyle.Secondary)

  const row = new ActionRowBuilder()
      .addComponents(saludar)

  channel.send({ embeds: [embed], components: [row] })
}
}