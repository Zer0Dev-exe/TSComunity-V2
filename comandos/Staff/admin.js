const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const schema = require('../../Esquemas/configuracionSv.js'); // El esquema proporcionado
module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin')
        .setDescription('Comandos de admin')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addSubcommandGroup(group =>
            group
                .setName('starboard')
                .setDescription('Configurar starboard')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('configurar')
                        .setDescription('Configura el starboard')
                        .addChannelOption(option =>
                            option
                                .setName('canal')
                                .setDescription('El canal donde se publicarán los mensajes destacados')
                                .setRequired(true))
                        .addIntegerOption(option =>
                            option
                                .setName('estrellas')
                                .setDescription('La cantidad de estrellas necesarias para destacar un mensaje')
                                .setRequired(true))
                )
        )
        .addSubcommandGroup(group =>
            group
                .setName('dbstaffroles')
                .setDescription('Roles de staff en la DB')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('agregar')
                        .setDescription('Agregar rol de Staff a la lista de roles')
                        .addRoleOption(option =>
                            option.setName('rol')
                                .setDescription('Rol a agregar')
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('remover')
                        .setDescription('Remover rol de Staff a la lista de roles')
                        .addRoleOption(option =>
                            option.setName('rol')
                                .setDescription('Rol a remover')
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('lista')
                        .setDescription('Ver los roles guardados en la base de datos')
                )
        ),

    async execute(interaction, client) {
        if (interaction.options.getSubcommandGroup() === 'starboard') {
            if (interaction.options.getSubcommand() === 'configurar') {
                const channel = interaction.options.getChannel('canal');
                const estrellas = interaction.options.getInteger('estrellas');

                // Busca si ya existe configuración para el servidor
                let data = await schema.findOne({ Servidor: interaction.guild.id });

                if (data) {
                    // Si existe, actualiza los campos
                    await schema.updateOne(
                        { Servidor: interaction.guild.id },
                        {
                            $set: {
                                CanalStarboard: channel.id,
                                EstrellasMin: estrellas
                            }
                        }
                    );
                    interaction.reply({
                        content: `Configuración actualizada:\n- Canal Starboard: <#${channel.id}>\n- Estrellas mínimas: ${estrellas}`,
                        ephemeral: true
                    });
                } else {
                    // Si no existe, crea una nueva entrada
                    await schema.create({
                        Servidor: interaction.guild.id,
                        RolesStaff: [], // Puede inicializarse vacío o con datos predefinidos
                        CanalStarboard: channel.id,
                        EstrellasMin: estrellas
                    });
                    interaction.reply({
                        content: `Nueva configuración creada:\n- Canal Starboard: <#${channel.id}>\n- Estrellas mínimas: ${estrellas}`,
                    });
                }

            }
        }
        if (interaction.options.getSubcommandGroup() === 'dbstaffroles') {

            const rol = interaction.options.getRole('rol'); // Obtener el rol proporcionado

            // Comprobar si el subcomando es 'agregar'
            if (interaction.options.getSubcommand() === 'agregar') {
                let data = await schema.findOne({ Servidor: interaction.guild.id });

                if (!data) {
                    // Si no existe ningún documento para este servidor, se crea uno nuevo con el rol
                    data = new schema({
                        Servidor: interaction.guild.id,
                        RolesStaff: [rol.id]
                    });
                } else {
                    // Asegúrate de que 'RolesStaff' sea un array
                    if (!Array.isArray(data.RolesStaff)) {
                        data.RolesStaff = [];
                    }

                    // Verificar si el rol ya está en la lista
                    if (data.RolesStaff.includes(rol.id)) {
                        return interaction.reply('Este rol ya está registrado como rol de Staff.');
                    }

                    // Agregar el rol al array
                    data.RolesStaff.push(rol.id);
                }

                // Guardar los cambios en la base de datos
                await data.save();
                await interaction.reply(`El rol ${rol} ha sido agregado como rol de Staff.`);

            } else if (interaction.options.getSubcommand() === 'remover') {
                let data = await schema.findOne({ Servidor: interaction.guild.id });

                if (!data || !Array.isArray(data.RolesStaff) || data.RolesStaff.length === 0) {
                    return interaction.reply('No hay roles registrados en esta base de datos.');
                }

                // Verificar si el rol está en la lista antes de removerlo
                if (!data.RolesStaff.includes(rol.id)) {
                    return interaction.reply('Este rol no está registrado en la base de datos.');
                }

                // Remover el rol del array
                data.RolesStaff = data.RolesStaff.filter(id => id !== rol.id);

                // Guardar los cambios en la base de datos
                await data.save();
                await interaction.reply(`El rol ${rol} ha sido removido de la lista de roles de Staff.`);
            } else if (interaction.options.getSubcommand() === 'lista') {
                let data = await schema.findOne({ Servidor: interaction.guild.id });

                if (!data || !Array.isArray(data.RolesStaff) || data.RolesStaff.length === 0) {
                    return interaction.reply('No hay roles registrados en esta base de datos.');
                }

                // Crear un embed para mostrar los roles
                const embed = new EmbedBuilder()
                    .setTitle('Roles de Staff')
                    .setDescription('Lista de todos los roles de Staff registrados:')
                    .setColor('Blue');

                // Agregar cada rol mencionado en el embed
                const rolesMencionados = data.RolesStaff.map(roleId => `<@&${roleId}>`).join('\n');

                // Si no hay roles mencionados (por si acaso el array está vacío)
                if (!rolesMencionados) {
                    return interaction.reply('No hay roles registrados en esta base de datos.');
                }

                embed.addFields({ name: 'Roles', value: rolesMencionados });

                // Enviar el embed al canal
                await interaction.reply({ embeds: [embed] });
            }
        }
    }
};