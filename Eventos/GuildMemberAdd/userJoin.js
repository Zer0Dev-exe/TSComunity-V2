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

    const embed = new EmbedBuilder()
        .setColor('Blue')
        .setTitle(`¡${member.user.username} acaba de unirse a ${guild.name}!`)
        .setURL('https://discord.js.org')
        .setThumbnail(member.user.displayAvatarURL())
        .addFields(
            { name: '<:verificacion:1362849933019058449> Verificación', value: `<#1112754769472270449>`, inline: true },
            { name: '<:info:1362850080880722040> Info Server', value: `<#1300074754757234688>`, inline: true },
        )
        .setTimestamp()
        .setFooter({
            text: `Eres el miembro #${guild.memberCount} de ${guild.name}`,
            iconURL: guild.iconURL()
        })
    
    channel.send({ embeds: [embed] })
  }
}