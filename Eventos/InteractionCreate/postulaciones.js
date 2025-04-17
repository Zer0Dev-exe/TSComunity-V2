const {
    Events,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle
  } = require("discord.js");
  
module.exports = {
  name: "interactionCreate",

  async execute(interaction, client) {
    const condition = interaction.isButton && (interaction.customId === 'accept' || interaction.customId === 'decline')

    if (!condition) return

    const userID = interaction.message.embeds[0].fields[0].value.replace('<@', '').replace('>', '')
    const member = interaction.guild.members.cache.get(userID)
    const guild = interaction.guild
    const postInfo = {
        'value': interaction.customId === 'accept' ? `¡Enhorabuena <@${userID}>, nos complace anunciarte de que tu postulación en **${guild.name}** ha sido **aceptada**! Tras revisar tu postulación, hemos reconocido tu potencial y dedicación y estamos seguros de que haras un gran trabajo en la comunidad.` : `Lo sentimos <@${userID}>, tu postulación en **${guild.name}** ha sido **rechazada**! Si bien valoramos tu interés en unirte a nuestra comunidad, tu solicitud no cumplió con algunas de las expectativas o requisitos que buscamos en este momento. Te animamos a seguir mejorando y, si lo deseas, volver a postularte en el futuro.`,
        'color': interaction.customId === 'accept' ? 'Green' : 'Red',
        'status': interaction.customId === 'accept' ? 'Aceptada' : 'Rechazada'
    }
    
    
    const modal = new ModalBuilder({
        customId: `modal`,
        title: 'Gestionar postulación'
    })
    
    const message = new TextInputBuilder({
        customId: 'message',
        label: "Mensaje a enviar",
        style: TextInputStyle.Paragraph,
        value: postInfo.value,
        required: true
    })
    const note = new TextInputBuilder({
        customId: 'note',
        label: "Nota extra",
        style: TextInputStyle.Paragraph,
        setPlaceholder: 'Nota extra para el usuario',
        required: false
    })

    const firstActionRow = new ActionRowBuilder().addComponents(message)
    const secondActionRow = new ActionRowBuilder().addComponents(note)

    modal.addComponents(firstActionRow, secondActionRow)

    await interaction.showModal(modal)

    const filter = (modalInteraction) => modalInteraction.customId === `modal`

    interaction.awaitModalSubmit({ filter, time: 300_000 })
    .then(async (modalInteraction) => {
        try {
            const guild = modalInteraction.guild
            const authorID = modalInteraction.user.id
            const author = guild.members.cache.get(authorID)
            const authorName = author.displayName || author.username
            const authorAvatar = author.displayAvatarURL({ format: 'png', dynamic: true })

            const message = modalInteraction.fields.getTextInputValue('message')
            const note = modalInteraction.fields.getTextInputValue('note')
            const formattedNote = note ? note : '*No se ha añadido ninguna nota.*'

            const embed = new EmbedBuilder()
            .setAuthor({ name: authorName, iconURL: authorAvatar })
            .setTitle('Revisión de la Postulación')
            .setDescription(`> ${message}`)
            .addFields(
                { name: 'Nota Extra', value: `> ${formattedNote}` }
            )
            .setFooter({ text: `Mensaje enviado desde ${guild.name}`, iconURL: guild.iconURL() })
            .setTimestamp()
            .setColor(postInfo.color)
            .setThumbnail(guild.iconURL())

            const server = new ButtonBuilder()
            .setLabel('Saltar al Servidor')
            .setURL(postInfo.status === 'Aceptada' ? 'https://discord.com/channels/1093864130030612521/1096318697053884457' : 'https://discord.com/channels/1093864130030612521/1096150563667837011')
            .setStyle(ButtonStyle.Link)
        
            const row = new ActionRowBuilder()
            .addComponents(server) 

            await member.send({
                content: `<@${userID}>`,
                embeds: [embed],
                components: [row]
            })

            const postEmbed = new EmbedBuilder()
            .setTitle('Revisión de la Postulación')
            .addFields(
                { name: 'Usuario', value: `<@${userID}>`, inline: true },
                { name: 'Estado', value: postInfo.status, inline: true },
                { name: `${postInfo.status} por`, value: `<@${authorID}>`, inline: true }
            )
            .setColor(postInfo.color)
            
             const disableAccept = new ButtonBuilder()
            .setCustomId('accept')
            .setLabel('Aceptar')
            .setStyle(ButtonStyle.Success)
            .setDisabled(true)
            const disabledDecline = new ButtonBuilder()
            .setCustomId('decline')
            .setLabel('Rechazar')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(true)
        
            const disabledRow = new ActionRowBuilder()
            .addComponents(disableAccept, disabledDecline)

            await modalInteraction.message.edit({
                embeds: [postEmbed],
                components: [disabledRow]
            })
		await modalInteraction.deferUpdate({ ephemeral: true })
        } catch (error) {
            modalInteraction.reply({
                content: 'A ocurrido un error al contactar con el usuario',
                ephemeral: true
            })
            console.log(error)
        }
    })
  }
}