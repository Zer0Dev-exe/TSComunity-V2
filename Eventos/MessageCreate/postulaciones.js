const {
    Events,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder
  } = require("discord.js");
  
module.exports = {
  name: "messageCreate",

  async execute(message, client) {
    const channelId = '1153043300081737828'

    const condition = message.channel.id === channelId && message.embeds.length > 0 && message.embeds[0].title === 'Postulaciones de TS Community Brawl'

    if (!condition) return

    const guild = message.guild
    const embed = message.embeds[0]
    const userID = embed.fields[0].value.replace('> ', '')
    const user = await getUser()
    
    async function getUser() {
		if (guild.members.cache.has(userID)) {
            return guild.members.cache.get(userID);
        }
        const member = guild.members.cache.find(member => 
            member.user.username.toLowerCase() === userID.toLowerCase() || 
            member.displayName.toLowerCase() === userID.toLowerCase()
        )

        if (member) {
            return member;
        }

        const fetchedMember = await guild.members.fetch({ query: userID, limit: 1 })
        if (fetchedMember.size > 0) {
            return fetchedMember.first()
        }
        return null
    }

    const postEmbed = new EmbedBuilder()
    .setTitle('Revisión de la Postulación')
    .addFields(
        { name: 'Usuario', value: `<@${user.id}>`, inline: true },
        { name: 'Estado', value: `Pendiente`, inline: true }
    )
    .setColor('Orange')

    const accept = new ButtonBuilder()
    .setCustomId('accept')
    .setLabel('Aceptar')
    .setStyle(ButtonStyle.Success)
    const decline = new ButtonBuilder()
    .setCustomId('decline')
    .setLabel('Rechazar')
    .setStyle(ButtonStyle.Danger)

    const row = new ActionRowBuilder()
    .addComponents(accept, decline)

    message.channel.send({
        embeds: [postEmbed],
        components: [row]
    }).then(msg => {
    	msg.react('✅')
    	msg.react('❓')
    	msg.react('❌')   
    })
  }
}