const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionsBitField, CommandInteractionOptionResolver, ThreadAutoArchiveDuration } = require('discord.js');
const configuracion = require('../../Esquemas/configuracionSv.js'); // El esquema proporcionado
const scTicket = require('../../Esquemas/ticketSchema.js')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Comandos de ticket')
        .addSubcommand(subcommand =>
            subcommand
            .setName('cerrar')
            .setDescription('Cerrar ticket')
            .addChannelOption(option => 
                option
                .setName('canal')
                .setDescription('Ticket que desees cerrar')
                .setRequired(true)
            )
        )
        .addSubcommandGroup(group =>
            group
                .setName('usuario')
                .setDescription('Usuario agregar/remover')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('agregar')
                        .setDescription('Agregar usuario al ticket')
                        .addUserOption(option =>
                            option.setName('usuario')
                                .setDescription('Usuario a agregar')
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('remover')
                        .setDescription('Remover usuario del ticket')
                        .addUserOption(option =>
                            option.setName('usuario')
                                .setDescription('Usuario a remover')
                                .setRequired(true)
                        )
                )
        ).addSubcommandGroup(group =>
            group
                .setName('rol')
                .setDescription('Permitir/denegar roles')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('agregar')
                        .setDescription('Agregar rol al ticket')
                        .addRoleOption(option =>
                            option.setName('rol')
                                .setDescription('Rol a agregar')
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('remover')
                        .setDescription('Remover rol del ticket')
                        .addRoleOption(option =>
                            option.setName('rol')
                                .setDescription('Rol a remover')
                                .setRequired(true)
                        )
                )
        ),

    async execute(interaction, client) {

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
        const data = await scTicket.findOne({ Canal: interaction.channel.id })
        if(!data) return await interaction.reply({ content: 'Este canal no está en la base de datos de Tickets', ephemeral: true })

        if (interaction.options.getSubcommand() === 'cerrar') {
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

                    const data = await scTicket.findOne({ Canal: interaction.channel.id });
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
        }

        if (interaction.options.getSubcommandGroup() === 'usuario') {

            const usuario = await interaction.options.getUser(usuario)
            if (interaction.options.getSubcommand() === 'agregar') {

                await interaction.channel.permissionOverwrites.edit(usuario.id, {
                    ViewChannel: true,
                    ReadMessageHistory: true,
                    AttachFiles: true
                });

                const embed = new EmbedBuilder()
                .setDescription(`${usuario} ha sido agregado al ticket`)
                .setColor('Green')

                await interaction.reply({ embeds: [embed]})

            } else if (interaction.options.getSubcommand() === 'remover') {

                await interaction.channel.permissionOverwrites.edit(usuario.id, {
                    ViewChannel: false,
                    ReadMessageHistory: false,
                    AttachFiles: false
                });

                const embed = new EmbedBuilder()
                .setDescription(`${usuario} ha sido removido del ticket`)
                .setColor('Red')

                await interaction.reply({ embeds: [embed]})

            }
        } else if (interaction.options.getSubcommandGroup() === 'rol') {
            const rol = await interaction.options.getRole('rol')

            if (interaction.options.getSubcommand() === 'agregar') {

                await interaction.channel.permissionOverwrites.edit(rol.id, {
                    ViewChannel: true,
                    ReadMessageHistory: true,
                    AttachFiles: true
                });

                const embed = new EmbedBuilder()
                .setDescription(`El rol ${rol} sido agregado al ticket`)
                .setColor('Green')

                await interaction.reply({ embeds: [embed]})

            } else if (interaction.options.getSubcommand() === 'remover') {

                await interaction.channel.permissionOverwrites.edit(rol.id, {
                    ViewChannel: false,
                    ReadMessageHistory: false,
                    AttachFiles: false
                });

                const embed = new EmbedBuilder()
                .setDescription(`El rol ${rol} sido removido del ticket`)
                .setColor('Red')

                await interaction.reply({ embeds: [embed]})
            }
        }
    }
}
