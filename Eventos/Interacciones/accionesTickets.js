const { CommandInteraction, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require("discord.js");
const Schema = require('../../Esquemas/ticketSchema.js');
const statsStaff = require('../../Esquemas/staffStats.js');
const configuracion = require('../../Esquemas/configuracionSv.js');
const wait = require('node:timers/promises').setTimeout;
const { createTranscript } = require('discord-html-transcripts');

module.exports = {
  name: "interactionCreate",

  async execute(interaction, client) {
    // TICKETS
        if (interaction.isButton()) {

        if (interaction.customId === "reclamar") {
            // Retrieve guild configuration
            const serverConfig = await configuracion.findOne({ Servidor: interaction.guild.id });
            
            if (!serverConfig) {
            return interaction.reply({ content: 'Configuración del servidor no encontrada.', ephemeral: true });
            }

            const userRoles = interaction.member.roles.cache.map(role => role.id); // Get the user's role IDs
            const requiredRoles = serverConfig.RolesStaff; // Array of allowed roles from config

            // Check if the user has any of the required roles
            const hasRequiredRole = userRoles.some(role => requiredRoles.includes(role));

            if (!hasRequiredRole) {
            // User does not have any of the required roles
            return interaction.reply({ content: 'No tienes permiso para reclamar este ticket.', ephemeral: true });
            }
            const staffId = interaction.user.id; // ID del usuario que reclama
        
            // Busca el ticket en la base de datos (ajusta la condición según sea necesario)
            const ticketData = await Schema.findOne({ /* condición para encontrar el ticket */ });
        
            if (!ticketData) {
                return await interaction.reply({ content: 'No se encontró el ticket que intentas reclamar.', ephemeral: true });
            }
        
            // Verifica si ha pasado más de 5 minutos desde la última reclamación
            const now = new Date();
            if (ticketData.LastClaimed && (now - ticketData.LastClaimed) < 5 * 60 * 1000) {
                return await interaction.reply({ content: 'Debes esperar 5 minutos antes de reclamar nuevamente.', ephemeral: true });
            }
        
            // Actualiza la última reclamación
            ticketData.LastClaimed = now;
        
            // Actualiza el staff que está reclamando el ticket
            ticketData.Staff = interaction.user.username; // O el ID del staff
            ticketData.Staffs.push(interaction.user.username); // Agrega al arreglo de Staffs
            await ticketData.save(); // Guarda los cambios en el ticket
        
            // Busca las estadísticas del staff en la base de datos
            let statsData = await statsStaff.findOne({ ID: staffId });
        
            // Comprueba si existen datos para el staff
            if (!statsData) {
                // Si no hay datos, se crean nuevas estadísticas
                statsData = new statsStaff({
                    ID: staffId,
                    TicketsCerrados: 0,
                    TicketCerradosValorados: 0,
                    Estrellas: 0,
                    TicketsAtendidos: 0 // Inicializar TicketsAtendidos
                });
            }
        
            // Aumenta el contador de TicketsAtendidos
            statsData.TicketsAtendidos += 1;
            await statsData.save(); // Guarda los cambios en las estadísticas
        
            // Crea un embed para notificar la reclamación
            // Get the member from the interaction
            const member = interaction.member;

            // Retrieve the highest role
            const highestRole = member.roles.highest; // Get the highest role of the member
            const roleColor = highestRole.color || '#00FF00'; // Use the role color, or a default color if it has no color

            // Create the embed using the highest role color
            const claimEmbed = new EmbedBuilder()
                .setColor(roleColor) // Set the color to the highest role's color
                .setTitle('¡Reclamación Realizada!')
                .setThumbnail(interaction.user.avatarURL()) // Set user's avatar as thumbnail
                .setDescription(`${interaction.user.username} ha reclamado el ticket.`)
                .addFields(
                    { name: 'Tickets Atendidos', value: `${statsData.TicketsAtendidos.toString()}` },
                    { name: 'Rol', value: highestRole.name } // Show the highest role in one field
                )

        
            // Envía el embed al canal donde se hizo la reclamación
            await interaction.reply({ embeds: [claimEmbed] });
        
            // Responde a la interacción para confirmar que se ha procesado
            await interaction.reply({ content: 'Reclamación registrada con éxito.', ephemeral: true });

        } else if (interaction.customId === "cerrarticket") {
            // Pregunta si realmente quiere cerrar el ticket
            const confirmationEmbed = new EmbedBuilder()
                .setColor('#975af8') // Color del embed
                .setTitle('¿Estás seguro de que quieres cerrar este ticket?')
                .setDescription('Haz clic en los botones de abajo para confirmar o cancelar.')
                .setFooter({ text: 'Tienes 30 segundos para responder.' });
        
            const confirmButton = new ButtonBuilder()
                .setCustomId('confirm_close')
                .setLabel('Sí, cerrar ticket')
                .setStyle(ButtonStyle.Danger);
        
            const cancelButton = new ButtonBuilder()
                .setCustomId('cancel_close')
                .setLabel('No, cancelar')
                .setStyle(ButtonStyle.Success);
        
            const row = new ActionRowBuilder()
                .addComponents(confirmButton, cancelButton);
        
            // Envía el mensaje de confirmación
            await interaction.reply({
                embeds: [confirmationEmbed],
                components: [row],
            });
        
            // Establece un collector para manejar la respuesta del usuario
            const filter = i => {
                return ['confirm_close', 'cancel_close'].includes(i.customId) && i.user.id === interaction.user.id;
            };
        
            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 30000 }); // 30 segundos
        
            collector.on('collect', async i => {
                await i.deferUpdate(); // Asegúrate de responder al usuario para eliminar la carga de la interacción
                if (i.customId === 'confirm_close') {
                    // Lógica para cerrar el ticket
                    const deleteButton = new ButtonBuilder()
                        .setCustomId('eliminar-ticket')
                        .setLabel('Eliminar Ticket')
                        .setStyle(ButtonStyle.Success);
        
                    const valorButton = new ButtonBuilder()
                        .setCustomId('valorar-ticket')
                        .setLabel('Valorar Ticket')
                        .setStyle(ButtonStyle.Primary);
        
                    const row2 = new ActionRowBuilder()
                        .addComponents(deleteButton, valorButton);

                    const data = await Schema.findOne({ Canal: interaction.channel.id });
                    await interaction.followUp({ content: `<@${data.Miembro}> El ticket ha sido cerrado.`, components: [row2], allowedMentions:{parse: ['users', 'roles'] } });
                    collector.stop(); // Detiene el collector
        
                    if (!data) {
                        // Maneja el caso donde `data` no existe
                        console.error("No se encontró el ticket o los datos.");
                        return; // O puedes lanzar un error, o enviar un mensaje al usuario.
                    }
        
                    // Si los datos existen, se establece 'Cerrado' a true y se guarda
                    data.Cerrado = true; // Cambia el estado a cerrado
                    await data.save(); // Guarda los cambios en la base de datos
        
                } else if (i.customId === 'cancel_close') {
                    // Elimina el mensaje de confirmación si se cancela
                    await interaction.deleteReply(); // Borra el embed de confirmación
                    collector.stop(); // Detiene el collector
                }
            });
        
            collector.on('end', collected => {
                if (collected.size === 0) {
                    // Si no hay respuesta, puedes enviar un mensaje indicando que se agotó el tiempo
                    interaction.followUp({ content: 'El tiempo para confirmar el cierre del ticket ha expirado.' });
                }
            });
        } else if (interaction.customId === "valorar-ticket") {

            // Find the ticket data based on the channel ID
            const ticketData = await Schema.findOne({ Canal: interaction.channel.id });
        
            if (!ticketData) {
                return await interaction.reply({ content: 'No se encontró el ticket para valorar.', ephemeral: true });
            }
        
            // Check if the user trying to rate is the member who opened the ticket
            if (ticketData.Miembro !== interaction.user.id) {
                return await interaction.reply({ content: 'Solo el creador del ticket puede valorarlo.', ephemeral: true });
            }
        
            // Find the staff stats based on the staff ID
            const staffStats = await statsStaff.findOne({ Staff: ticketData.Staff });
        
            if (!staffStats) {
                return await interaction.reply({ content: 'No se encontraron estadísticas para este staff.', ephemeral: true });
            }

            if (ticketData.Valorado) {
                console.log('Aqui')
                return await interaction.reply({ content: 'Ya has valorado este ticket una vez.', ephemeral: true });
            }
        
            // Create rating buttons (1-5)
            const ratingButtons = new ActionRowBuilder()
                .addComponents(
                    [1, 2, 3, 4, 5].map(star => 
                        new ButtonBuilder()
                            .setCustomId(`rating_${star}`)
                            .setLabel(`${star} ⭐`)
                            .setStyle(ButtonStyle.Primary)
                    )
                );
        
            await interaction.reply({
                content: 'Por favor selecciona una calificación entre 1 y 5:',
                components: [ratingButtons],
                ephemeral: true // Optional: if you want this message to be ephemeral
            });
        }
        
        // Handling rating selection
        else if (interaction.customId.startsWith("rating_")) {
            const rating = parseInt(interaction.customId.split("_")[1]); // Get the rating from the customId
        
            // Find the ticket data again based on the channel ID
            const ticketData = await Schema.findOne({ Canal: interaction.channel.id });
        
            if (!ticketData) {
                return await interaction.reply({ content: 'No se encontró el ticket para valorar.', ephemeral: true });
            }
        
            // Check if the user trying to rate is the member who opened the ticket
            if (ticketData.Miembro !== interaction.user.id) {
                return await interaction.reply({ content: 'Solo el creador del ticket puede valorarlo.', ephemeral: true });
            }
        
            // Update the stats for the staff who attended the ticket
            const staffStats = await statsStaff.findOne({ Staff: ticketData.Staff });
        
            if (!staffStats) {
                return await interaction.reply({ content: 'No se encontraron estadísticas para este staff.', ephemeral: true });
            }

            if (ticketData.Valorado) {
                return await interaction.reply({ content: 'Ya has valorado este ticket una vez.', ephemeral: true });
            }
        
            // Increment the stats
            staffStats.TicketCerradosValorados = (staffStats.TicketCerradosValorados || 0) + 1; // Increment number of rated tickets
            staffStats.Estrellas = (staffStats.Estrellas || 0) + rating; // Add the rating to the total stars
            await staffStats.save(); // Save the updated staff stats

            await wait(2000); // Ensure 'wait' is properly defined
            ticketData.Valorado = true; // Use '=' to assign the value
            await ticketData.save(); // Save the updated ticket data
        
            await interaction.reply({ content: `Gracias por tu valoración de ${rating} estrellas!`, ephemeral: true });
            const canalLog = await client.channels.cache.get('1168938988267110421')
            const transcript = await createTranscript(interaction.channel, {
                limit: -1,
                returnBuffer: false,
                filename: `${interaction.channel.name}.html`,
            })
            const msg = await canalLog.send({ files: [transcript]})

            const embed = new EmbedBuilder()
            .setTitle(`Cerrado por ${interaction.user.displayName}`)
            .addFields(
                { name: 'ID Staff:', value: `${interaction.user.id}`}
            )
            .setColor('Random')
            const boton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                    .setLabel('Abrir')
                    .setURL(`https://mahto.id/chat-exporter?url=${msg.attachments.first()?.url}`)
                    .setStyle(ButtonStyle.Link),

                    new ButtonBuilder()
                    .setLabel('Descargar')
                    .setURL(`${msg.attachments.first()?.url}`)
                    .setStyle(ButtonStyle.Link)
                )
            await msg.edit({ embeds: [embed], components: [boton]})
            await interaction.channel.send('Eliminando el ticket, muchas gracias por dar tu opinión')
            await wait(5000)
            await Schema.deleteOne({ Canal: interaction.channel.id })
            await interaction.channel.delete()

        } else if (interaction.customId === "eliminar-ticket") {
            // Retrieve guild configuration
            const serverConfig = await configuracion.findOne({ Servidor: interaction.guild.id });
            
            if (!serverConfig) {
            return interaction.reply({ content: 'Configuración del servidor no encontrada.', ephemeral: true });
            }

            const userRoles = interaction.member.roles.cache.map(role => role.id); // Get the user's role IDs
            const requiredRoles = serverConfig.RolesStaff; // Array of allowed roles from config

            // Check if the user has any of the required roles
            const hasRequiredRole = userRoles.some(role => requiredRoles.includes(role));

            if (!hasRequiredRole) {
            // User does not have any of the required roles
            return interaction.reply({ content: 'No tienes permiso para reclamar este ticket.', ephemeral: true });
            }

            const data = await Schema.findOne({ Canal: interaction.channel.id })
            if(!data) return;
            const canalLog = await client.channels.cache.get('1168938988267110421')
            await interaction.reply({ content: `Eliminado ticket`, ephemeral: true })
            const transcript = await createTranscript(interaction.channel, {
                limit: -1,
                returnBuffer: false,
                filename: `${interaction.channel.name}.html`,
            })
            const msg = await canalLog.send({ files: [transcript]})

            const embed = new EmbedBuilder()
            .setTitle(`Cerrado por ${interaction.user.displayName}`)
            .addFields(
                { name: 'ID Staff:', value: `${interaction.user.id}`}
            )
            .setColor('Random')
            const boton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                    .setLabel('Abrir')
                    .setURL(`https://mahto.id/chat-exporter?url=${msg.attachments.first()?.url}`)
                    .setStyle(ButtonStyle.Link),

                    new ButtonBuilder()
                    .setLabel('Descargar')
                    .setURL(`${msg.attachments.first()?.url}`)
                    .setStyle(ButtonStyle.Link)
                )
            await msg.edit({ embeds: [embed], components: [boton]})
            await interaction.channel.send('Cerrando el ticket, muchas gracias por dar tu opinión')
            await wait(5000)
            await Schema.deleteOne({ Canal: interaction.channel.id })
            await interaction.channel.delete()
        }
        
    }
  }
}