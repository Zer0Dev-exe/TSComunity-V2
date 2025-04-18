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
            { name: 'Cuenta creada el', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:D>`, inline: true },
            { name: 'Se unió el', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>`, inline: true },
            { name: '\u200B', value: '\u200B' },
            { name: 'ID de usuario', value: member.id, inline: true }
        )
        .setTimestamp()
        .setFooter({
            text: 'Bienvenida automática del servidor',
            iconURL: member.guild.iconURL()
        })
    
    channel.send({ embeds: [embed] })
  }
}