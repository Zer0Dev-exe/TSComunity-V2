const { CommandInteraction, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events, ChannelType, PermissionsBitField, CommandInteractionOptionResolver } = require("discord.js");
const Schema = require('../../Esquemas/ticketSchema.js')
const Configuracion = require('../../Esquemas/configuracionSv.js')

module.exports = {
  name: "interactionCreate",

  async execute(interaction, client) {
    //TICKETS
    if(interaction.isSelectMenu() ) {

        if(interaction.customId === "select-ticket") {

          const configuracion = await Configuracion.findOne()
          const rolesStaff = configuracion.RolesStaff;
          const mencionesRoles = rolesStaff.map(roleId => `<@&${roleId}>`);
          const mensaje = mencionesRoles.join(' ');

            const values = interaction.values[0];
            if (values === '1') { // Soporte
              // Comprobar si ya existe un ticket de soporte para este usuario antes de mostrar el modal
              const Data = await Schema.findOne({ Miembro: interaction.member.id, Tipo: 'Soporte' });

              if (Data) {
                  // Si ya existe un ticket, informar al usuario sin mostrar el formulario
                  await interaction.reply({ content: `Ya tienes un ticket de soporte creado en <#${Data.Canal}>.`, ephemeral: true });
              } else {
                  // Si no existe un ticket, mostrar el formulario de soporte
                  const modal = new ModalBuilder({
                      customId: `formsoporte`,
                      title: 'Crear Ticket de Soporte',
                  });

                  const dudas = new TextInputBuilder({
                      customId: 'duda',
                      label: "¿Cuál es tu problema o duda a resolver?",
                      style: TextInputStyle.Paragraph,
                  });

                  const firstActionRow = new ActionRowBuilder().addComponents(dudas);

                  modal.addComponents(firstActionRow);

                  await interaction.showModal(modal);

                  // Esperar la respuesta del modal
                  const filter = (modalInteraction) => modalInteraction.customId === `formsoporte`;

                  interaction.awaitModalSubmit({ filter, time: 300_000 })
                      .then(async (modalInteraction) => {
                          try {
                              // Hacemos la respuesta efímera
                              await modalInteraction.deferReply({ ephemeral: true });

                              // Obtener los valores del modal
                              const ansdudas = modalInteraction.fields.getTextInputValue('duda');

                              // Crear un canal para el soporte
                              const soporteChannel = await interaction.guild.channels.create({
                                  name: `#soporte-${interaction.user.username}`,
                                  type: ChannelType.GuildText,
                                  parent: '1096144326393864234', // Ajusta el ID del parent si es necesario
                                  permissionOverwrites: [
                                      {
                                          id: interaction.guild.roles.everyone.id,
                                          deny: [PermissionFlagsBits.ViewChannel],
                                      },
                                      {
                                          id: interaction.member.id,
                                          allow: [
                                              PermissionFlagsBits.ViewChannel,
                                              PermissionFlagsBits.SendMessages,
                                              PermissionFlagsBits.ReadMessageHistory,
                                              PermissionFlagsBits.EmbedLinks,
                                              PermissionFlagsBits.AttachFiles,
                                          ],
                                      },
                                  ],
                              });

                              // Añadir permisos para el staff
                              const config = await Configuracion.findOne({});
                              if (config.RolesStaff && Array.isArray(config.RolesStaff)) {
                                  for (const roleId of config.RolesStaff) {
                                      const role = interaction.guild.roles.cache.get(roleId);
                                      if (role) {
                                          await soporteChannel.permissionOverwrites.create(role, {
                                              ViewChannel: true,
                                              SendMessages: true,
                                              ReadMessageHistory: true,
                                              EmbedLinks: true,
                                              AttachFiles: true,
                                          });
                                      }
                                  }
                              }

                              // Guardar los datos del soporte en la base de datos
                              await Schema.create({
                                  Miembro: interaction.member.id,
                                  Canal: soporteChannel.id,
                                  Cerrado: false,
                                  Tipo: 'Soporte',
                              });

                              // Crear el embed para el canal de soporte
                              const embed = new EmbedBuilder()
                                  .setTitle('Soporte')
                                  .setDescription('Por favor, espera pacientemente a que un miembro del staff te atienda.')
                                  .addFields(
                                      { name: '¿Cuál es tu problema o duda a resolver?', value: `\`\`\`\n${ansdudas}\n\`\`\`` }
                                  )
                                  .setColor('#357ff7'); // Color azul para indicar soporte

                              const botones = new ActionRowBuilder().addComponents(
                                  new ButtonBuilder()
                                      .setCustomId('reclamar')
                                      .setLabel('Reclamar')
                                      .setStyle(ButtonStyle.Danger)
                                      .setEmoji('📌'),
                                  new ButtonBuilder()
                                      .setCustomId('cerrarticket')
                                      .setLabel('Cerrar Ticket')
                                      .setStyle(ButtonStyle.Success)
                                      .setEmoji('🔒')
                              );

                              // Enviar el mensaje en el canal de soporte con embed y botones
                              await soporteChannel.send({ 
                                  allowedMentions:{parse: ['users', 'roles'] },
                                  content: `${interaction.user} ha abierto un ticket de tipo Soporte\n||${mensaje}||`, 
                                  embeds: [embed], 
                                  components: [botones] 
                              }).then(async (message) => {
                                await message.pin();
                              });

                              // Responder al usuario informándole que se ha creado el ticket de soporte
                              await modalInteraction.editReply({ content: `Tu ticket ha sido creado en ${soporteChannel}`, ephemeral: true });

                          } catch (error) {
                              console.error('Error al crear el ticket de soporte:', error);
                              await modalInteraction.editReply({ content: 'Ocurrió un error al intentar crear tu ticket. Por favor, inténtalo nuevamente.', ephemeral: true });
                          }
                      })
                      .catch((error) => {
                          console.error('Error en la respuesta del modal:', error);
                          modalInteraction.followUp({ content: 'El tiempo para enviar el formulario ha expirado o ocurrió un error.', ephemeral: true });
                      });
              }

          } else if(values === '2') { // REPORTE
            // Comprobar si ya existe un ticket de reporte para este usuario antes de mostrar el modal
            const Data = await Schema.findOne({ Miembro: interaction.member.id, Tipo: 'Reporte' });

            if (Data) {
                // Si ya existe un ticket, informar al usuario sin mostrar el formulario
                await interaction.reply({ content: `Ya tienes un ticket de reporte creado en <#${Data.Canal}>.`, ephemeral: true });
            } else {
                // Si no existe un ticket, mostrar el formulario de reporte
                const modal = new ModalBuilder({
                    customId: `formreporte`,
                    title: 'Crear Ticket de Reporte',
                });

                const id = new TextInputBuilder({
                    customId: 'idreport',
                    label: "Adjunta el ID del miembro que deseas reportar",
                    style: TextInputStyle.Short,
                });

                const pruebas = new TextInputBuilder({
                    customId: 'prueba',
                    label: "Pruebas, enlace de mensaje por ejemplo",
                    style: TextInputStyle.Paragraph,
                });

                // Crear ActionRows para cada TextInput
                const idActionRow = new ActionRowBuilder().addComponents(id);
                const pruebasActionRow = new ActionRowBuilder().addComponents(pruebas);

                modal.addComponents(idActionRow, pruebasActionRow);

                await interaction.showModal(modal);

                // Esperar la respuesta del modal
                const filter = (modalInteraction) => modalInteraction.customId === `formreporte`;

                interaction.awaitModalSubmit({ filter, time: 300_000 })
                    .then(async (modalInteraction) => {
                        try {
                            // Hacemos la respuesta efímera
                            await modalInteraction.deferReply({ ephemeral: true });

                            // Obtener los valores del modal
                            const idAns = modalInteraction.fields.getTextInputValue('idreport');
                            const pruebasAns = modalInteraction.fields.getTextInputValue('prueba');

                            // Crear un canal para el reporte
                            const reporteChannel = await interaction.guild.channels.create({
                                name: `#reporte-${interaction.user.username}`,
                                type: ChannelType.GuildText,
                                parent: '1096144326393864234', // Ajusta el ID del parent si es necesario
                                permissionOverwrites: [
                                    {
                                        id: interaction.guild.roles.everyone.id,
                                        deny: [PermissionFlagsBits.ViewChannel],
                                    },
                                    {
                                        id: interaction.member.id,
                                        allow: [
                                            PermissionFlagsBits.ViewChannel,
                                            PermissionFlagsBits.SendMessages,
                                            PermissionFlagsBits.ReadMessageHistory,
                                            PermissionFlagsBits.EmbedLinks,
                                            PermissionFlagsBits.AttachFiles,
                                        ],
                                    },
                                ],
                            });

                            // Añadir permisos para el staff
                            const config = await Configuracion.findOne({});
                            if (config.RolesStaff && Array.isArray(config.RolesStaff)) {
                                for (const roleId of config.RolesStaff) {
                                    const role = interaction.guild.roles.cache.get(roleId);
                                    if (role) {
                                        await reporteChannel.permissionOverwrites.create(role, {
                                            ViewChannel: true,
                                            SendMessages: true,
                                            ReadMessageHistory: true,
                                            EmbedLinks: true,
                                            AttachFiles: true,
                                        });
                                    }
                                }
                            }

                            // Guardar los datos del reporte en la base de datos
                            await Schema.create({
                                Miembro: interaction.member.id,
                                Canal: reporteChannel.id,
                                Cerrado: false,
                                Tipo: 'Reporte',
                            });

                            // Crear el embed para el canal de reporte
                            const embed = new EmbedBuilder()
                                .setTitle('Reporte')
                                .setDescription('Gracias por tu reporte. Un miembro del staff revisará tu reporte lo antes posible.')
                                .addFields(
                                    { name: 'ID del Miembro Reportado', value: `\`\`\`${idAns}\`\`\`` },
                                    { name: 'Pruebas', value: `\`\`\`${pruebasAns}\`\`\`` }
                                )
                                .setColor('#ff3e3e'); // Color rojo para indicar reporte

                            const botones = new ActionRowBuilder().addComponents(
                                new ButtonBuilder()
                                    .setCustomId('reclamar')
                                    .setLabel('Reclamar')
                                    .setStyle(ButtonStyle.Danger)
                                    .setEmoji('📌'),
                                new ButtonBuilder()
                                    .setCustomId('cerrarticket')
                                    .setLabel('Cerrar Ticket')
                                    .setStyle(ButtonStyle.Success)
                                    .setEmoji('🔒')
                            );

                            // Enviar el mensaje en el canal de reporte con embed y botones
                            await reporteChannel.send({ 
                                content: `${interaction.user} ha abierto un ticket de tipo reporte\n||${mensaje}||`, 
                                embeds: [embed], 
                                components: [botones]
                                , allowedMentions:{parse: ['users', 'roles'] }
                            }).then(async (message) => {
                                await message.pin();
                              });

                            // Responder al usuario informándole que se ha creado el ticket de reporte
                            await modalInteraction.editReply({ content: `Tu reporte ha sido creado en ${reporteChannel}`, ephemeral: true });

                        } catch (error) {
                            console.error('Error al crear el reporte:', error);
                            await modalInteraction.editReply({ content: 'Ocurrió un error al intentar crear tu reporte. Por favor, inténtalo nuevamente.', ephemeral: true });
                        }
                    })
                    .catch((error) => {
                        console.error('Error en la respuesta del modal:', error);
                        modalInteraction.followUp({ content: 'El tiempo para enviar el formulario ha expirado o ocurrió un error.', ephemeral: true });
                    });
            }

          
              
            } if(values === '3') { // ALIANZA AFFY
              // Comprobar si ya existe un ticket de alianza o afiliación para este usuario antes de mostrar el modal
              const Data = await Schema.findOne({ Miembro: interaction.member.id, Tipo: 'Alianza' });

              if (Data) {
                  // Si ya existe un ticket, informar al usuario sin mostrar el formulario
                  await interaction.reply({ content: `Ya tienes un ticket de alianza o afiliación creado en <#${Data.Canal}>.`, ephemeral: true });
              } else {
                  // Si no existe un ticket, mostrar el formulario de alianza o afiliación
                  const modal = new ModalBuilder({
                      customId: `formally`,
                      title: 'Alianza o Afiliación',
                  });

                  // Pregunta 1: ¿Deseas realizar alianza o afiliación?
                  const tipoAlianza = new TextInputBuilder({
                      customId: 'tipoAlianza',
                      label: "¿Alianza o afiliación?",
                      style: TextInputStyle.Short,
                  });

                  // Pregunta 2: ¿Cuántos miembros tiene el servidor?
                  const miembrosServidor = new TextInputBuilder({
                      customId: 'miembrosServidor',
                      label: "Miembros del servidor",
                      style: TextInputStyle.Short,
                  });

                  // Pregunta 3: ¿Tu servidor cumple con la normativa de Discord?
                  const normativaDiscord = new TextInputBuilder({
                      customId: 'normativaDiscord',
                      label: "¿Cumple normativa de Discord?",
                      style: TextInputStyle.Short,
                  });

                  // Pregunta 4: ¿Tu servidor cumple con los requisitos de pacto?
                  const requisitosPacto = new TextInputBuilder({
                      customId: 'requisitosPacto',
                      label: "¿Cumple requisitos del pacto?",
                      style: TextInputStyle.Short,
                  });

                  // Crear ActionRows para cada pregunta
                  const tipoAlianzaRow = new ActionRowBuilder().addComponents(tipoAlianza);
                  const miembrosServidorRow = new ActionRowBuilder().addComponents(miembrosServidor);
                  const normativaDiscordRow = new ActionRowBuilder().addComponents(normativaDiscord);
                  const requisitosPactoRow = new ActionRowBuilder().addComponents(requisitosPacto);

                  // Añadir los ActionRows al modal
                  modal.addComponents(
                      tipoAlianzaRow,
                      miembrosServidorRow,
                      normativaDiscordRow,
                      requisitosPactoRow
                  );

                  await interaction.showModal(modal);

                  // Esperar la respuesta del modal
                  const filter = (modalInteraction) => modalInteraction.customId === `formally`;

                  interaction.awaitModalSubmit({ filter, time: 300_000 })
                      .then(async (modalInteraction) => {
                          try {
                              // Hacer la respuesta efímera
                              await modalInteraction.deferReply({ ephemeral: true });

                              // Obtener los valores del formulario
                              const tipoAlianzaAns = modalInteraction.fields.getTextInputValue('tipoAlianza');
                              const miembrosServidorAns = modalInteraction.fields.getTextInputValue('miembrosServidor');
                              const normativaDiscordAns = modalInteraction.fields.getTextInputValue('normativaDiscord');
                              const requisitosPactoAns = modalInteraction.fields.getTextInputValue('requisitosPacto');

                              // Crear un canal para la alianza o afiliación
                              const alianzaChannel = await interaction.guild.channels.create({
                                  name: `#alianza-${interaction.user.username}`,
                                  type: ChannelType.GuildText,
                                  parent: '1096144326393864234', // Ajusta el ID del parent si es necesario
                                  permissionOverwrites: [
                                      {
                                          id: interaction.guild.roles.everyone.id,
                                          deny: [PermissionFlagsBits.ViewChannel],
                                      },
                                      {
                                        id: '1170449867823382649',
                                        allow: [
                                          PermissionFlagsBits.ViewChannel,
                                          PermissionFlagsBits.SendMessages,
                                          PermissionFlagsBits.ReadMessageHistory,
                                          PermissionFlagsBits.EmbedLinks,
                                          PermissionFlagsBits.AttachFiles,
                                        ],
                                      },
                                      {
                                          id: interaction.member.id,
                                          allow: [
                                              PermissionFlagsBits.ViewChannel,
                                              PermissionFlagsBits.SendMessages,
                                              PermissionFlagsBits.ReadMessageHistory,
                                              PermissionFlagsBits.EmbedLinks,
                                              PermissionFlagsBits.AttachFiles,
                                          ],
                                      },
                                  ],
                              });

                              // Añadir permisos para el staff
                              const config = await Configuracion.findOne({});
                              if (config.RolesStaff && Array.isArray(config.RolesStaff)) {
                                  for (const roleId of config.RolesStaff) {
                                      const role = interaction.guild.roles.cache.get(roleId);
                                      if (role) {
                                          await alianzaChannel.permissionOverwrites.create(role, {
                                              ViewChannel: true,
                                              SendMessages: true,
                                              ReadMessageHistory: true,
                                              EmbedLinks: true,
                                              AttachFiles: true,
                                          });
                                      }
                                  }
                              }

                              // Guardar los datos de la alianza o afiliación en la base de datos
                              await Schema.create({
                                  Miembro: interaction.member.id,
                                  Canal: alianzaChannel.id,
                                  Cerrado: false,
                                  Tipo: 'Alianza',
                              });

                              // Crear el embed para el canal de alianza o afiliación
                              const embed = new EmbedBuilder()
                                  .setTitle('Alianza o Afiliación')
                                  .setDescription('Por favor, espera pacientemente a que un miembro del staff te atienda.')
                                  .addFields(
                                      { name: 'Tipo de solicitud', value: `\`\`\`${tipoAlianzaAns}\`\`\`` },
                                      { name: 'Miembros del servidor', value: `\`\`\`${miembrosServidorAns}\`\`\`` },
                                      { name: '¿Cumple normativa de Discord?', value: `\`\`\`${normativaDiscordAns}\`\`\`` },
                                      { name: '¿Cumple requisitos del pacto?', value: `\`\`\`${requisitosPactoAns}\`\`\`` }
                                  )
                                  .setColor('#357ff7'); // Color azul para indicar solicitud

                              const botones = new ActionRowBuilder().addComponents(
                                  new ButtonBuilder()
                                      .setCustomId('reclamar')
                                      .setLabel('Reclamar')
                                      .setStyle(ButtonStyle.Danger)
                                      .setEmoji('📌'),
                                  new ButtonBuilder()
                                      .setCustomId('cerrarticket')
                                      .setLabel('Cerrar Ticket')
                                      .setStyle(ButtonStyle.Success)
                                      .setEmoji('🔒')
                              );

                              // Enviar el mensaje en el canal de alianza o afiliación con embed y botones
                              await alianzaChannel.send({ 
                                  content: `${interaction.user} ha abierto un ticket de tipo Alianza / Afiliación\n||${mensaje}<@&1170449867823382649>||`, 
                                  embeds: [embed], 
                                  components: [botones] 
                                  , allowedMentions:{parse: ['users', 'roles'] }
                              }).then(async (message) => {
                                await message.pin();
                              });

                              // Responder al usuario informándole que se ha creado el ticket
                              await modalInteraction.editReply({ content: `Tu ticket ha sido creado en ${alianzaChannel}`, ephemeral: true });

                          } catch (error) {
                              console.error('Error al crear el ticket de alianza o afiliación:', error);
                              await modalInteraction.editReply({ content: 'Ocurrió un error al intentar crear tu ticket. Por favor, inténtalo nuevamente.', ephemeral: true });
                          }
                      })
                      .catch((error) => {
                          console.error('Error en la respuesta del modal:', error);
                          modalInteraction.followUp({ content: 'El tiempo para enviar el formulario ha expirado o ocurrió un error.', ephemeral: true });
                      });
              }

              
            } if(values === '4') { // ASOCIACION
              // Comprobar si ya existe un ticket de asociación para este usuario antes de mostrar el modal
              const Data = await Schema.findOne({ Miembro: interaction.member.id, Tipo: 'Asociación' });

              if (Data) {
                  // Si ya existe un ticket, informar al usuario sin mostrar el formulario
                  await interaction.reply({ content: `Ya tienes un ticket de asociación creado en <#${Data.Canal}>.`, ephemeral: true });
              } else {
                  // Si no existe un ticket, mostrar el formulario de asociación
                  const modal = new ModalBuilder({
                      customId: `formsocio`,
                      title: 'Formulario de Asociación',
                  });

                  // Pregunta 1: ¿Cuántos miembros tiene tu servidor?
                  const miembrosServidor = new TextInputBuilder({
                      customId: 'miembrosServidor',
                      label: "Miembros de tu servidor",
                      style: TextInputStyle.Short,
                  });

                  // Pregunta 2: ¿Tu servidor cumple con la normativa de Discord?
                  const normativaDiscord = new TextInputBuilder({
                      customId: 'normativaDiscord',
                      label: "¿Cumple normativa de Discord?",
                      style: TextInputStyle.Short,
                  });

                  // Pregunta 3: ¿Tu servidor cumple con los requisitos de pacto?
                  const requisitosPacto = new TextInputBuilder({
                      customId: 'requisitosPacto',
                      label: "¿Cumple requisitos del pacto?",
                      style: TextInputStyle.Short,
                  });

                  // Pregunta 4: ¿Cada cuánto renovar la asociación?
                  const renovarAsociacion = new TextInputBuilder({
                      customId: 'renovarAsociacion',
                      label: "Renovación de la asociación (frecuencia)",
                      style: TextInputStyle.Short,
                  });

                  // Crear ActionRows para cada pregunta
                  const miembrosServidorRow = new ActionRowBuilder().addComponents(miembrosServidor);
                  const normativaDiscordRow = new ActionRowBuilder().addComponents(normativaDiscord);
                  const requisitosPactoRow = new ActionRowBuilder().addComponents(requisitosPacto);
                  const renovarAsociacionRow = new ActionRowBuilder().addComponents(renovarAsociacion);

                  // Añadir los ActionRows al modal
                  modal.addComponents(
                      miembrosServidorRow,
                      normativaDiscordRow,
                      requisitosPactoRow,
                      renovarAsociacionRow
                  );

                  await interaction.showModal(modal);

                  // Esperar la respuesta del modal
                  const filter = (modalInteraction) => modalInteraction.customId === `formsocio`;

                  interaction.awaitModalSubmit({ filter, time: 300_000 })
                      .then(async (modalInteraction) => {
                          try {
                              // Hacer la respuesta efímera
                              await modalInteraction.deferReply({ ephemeral: true });

                              // Obtener los valores del formulario
                              const miembrosServidorAns = modalInteraction.fields.getTextInputValue('miembrosServidor');
                              const normativaDiscordAns = modalInteraction.fields.getTextInputValue('normativaDiscord');
                              const requisitosPactoAns = modalInteraction.fields.getTextInputValue('requisitosPacto');
                              const renovarAsociacionAns = modalInteraction.fields.getTextInputValue('renovarAsociacion');

                              // Crear un canal para la asociación
                              const socioChannel = await interaction.guild.channels.create({
                                  name: `#asociacion-${interaction.user.username}`,
                                  type: ChannelType.GuildText,
                                  parent: '1096144326393864234', // Ajusta el ID del parent si es necesario
                                  permissionOverwrites: [
                                      {
                                          id: interaction.guild.roles.everyone.id,
                                          deny: [PermissionFlagsBits.ViewChannel],
                                      },
                                      {
                                          id: interaction.member.id,
                                          allow: [
                                              PermissionFlagsBits.ViewChannel,
                                              PermissionFlagsBits.SendMessages,
                                              PermissionFlagsBits.ReadMessageHistory,
                                              PermissionFlagsBits.EmbedLinks,
                                              PermissionFlagsBits.AttachFiles,
                                          ],
                                      },
                                  ],
                              });

                              // Añadir permisos para el staff
                              const config = await Configuracion.findOne({});
                              if (config.RolesStaff && Array.isArray(config.RolesStaff)) {
                                  for (const roleId of config.RolesStaff) {
                                      const role = interaction.guild.roles.cache.get(roleId);
                                      if (role) {
                                          await socioChannel.permissionOverwrites.create(role, {
                                              ViewChannel: true,
                                              SendMessages: true,
                                              ReadMessageHistory: true,
                                              EmbedLinks: true,
                                              AttachFiles: true,
                                          });
                                      }
                                  }
                              }

                              // Guardar los datos de la asociación en la base de datos
                              await Schema.create({
                                  Miembro: interaction.member.id,
                                  Canal: socioChannel.id,
                                  Cerrado: false,
                                  Tipo: 'Asociación',
                              });

                              // Crear el embed para el canal de asociación
                              const embed = new EmbedBuilder()
                                  .setTitle('Asociación')
                                  .setDescription('Por favor, espera pacientemente a que un miembro del staff te atienda.')
                                  .addFields(
                                      { name: 'Miembros del servidor', value: `\`\`\`${miembrosServidorAns}\`\`\`` },
                                      { name: '¿Cumple la normativa de Discord?', value: `\`\`\`${normativaDiscordAns}\`\`\`` },
                                      { name: '¿Cumple los requisitos del pacto?', value: `\`\`\`${requisitosPactoAns}\`\`\`` },
                                      { name: 'Renovación de la asociación', value: `\`\`\`${renovarAsociacionAns}\`\`\`` }
                                  )
                                  .setColor('#357ff7'); // Color azul para indicar solicitud

                              const botones = new ActionRowBuilder().addComponents(
                                  new ButtonBuilder()
                                      .setCustomId('reclamar')
                                      .setLabel('Reclamar')
                                      .setStyle(ButtonStyle.Danger)
                                      .setEmoji('📌'),
                                  new ButtonBuilder()
                                      .setCustomId('cerrarticket')
                                      .setLabel('Cerrar Ticket')
                                      .setStyle(ButtonStyle.Success)
                                      .setEmoji('🔒')
                              );

                              // Enviar el mensaje en el canal de asociación con embed y botones
                              await socioChannel.send({ 
                                  content: `${interaction.user} ha abierto un ticket de tipo Asociación\n||${mensaje}||`, 
                                  embeds: [embed], 
                                  components: [botones] 
                                  , allowedMentions:{parse: ['users', 'roles'] }
                              }).then(async (message) => {
                                await message.pin();
                              });

                              // Responder al usuario informándole que se ha creado el ticket
                              await modalInteraction.editReply({ content: `Tu ticket ha sido creado en ${socioChannel}`, ephemeral: true });

                          } catch (error) {
                              console.error('Error al crear el ticket de asociación:', error);
                              await modalInteraction.editReply({ content: 'Ocurrió un error al intentar crear tu ticket. Por favor, inténtalo nuevamente.', ephemeral: true });
                          }
                      })
                      .catch((error) => {
                          console.error('Error en la respuesta del modal:', error);
                          modalInteraction.followUp({ content: 'El tiempo para enviar el formulario ha expirado o ocurrió un error.', ephemeral: true });
                      });
              }

              
            } if(values === '5') { // POSTULACION
                interaction.reply({ // PONER TEXTOOOOOOOOOOOOO PONER TEXTOOOOOOOOOOOOO PONER TEXTOOOOOOOOOOOOO PONER TEXTOOOOOOOOOOOOO PONER TEXTOOOOOOOOOOOOO PONER TEXTOOOOOOOOOOOOO PONER TEXTOOOOOOOOOOOOO PONER TEXTOOOOOOOOOOOOO PONER TEXTOOOOOOOOOOOOO PONER TEXTOOOOOOOOOOOOO PONER TEXTOOOOOOOOOOOOO
                    content: "https://docs.google.com/forms/d/e/1FAIpQLSeyoj46uMzH7qliXpifjIYQbdLoJKyrbGzR38eyZhOHk-Frrw/viewform?usp=sf_link",
                    ephemeral: true
                })
              // Comprobar si ya existe un ticket de postulación para este usuario antes de mostrar el modal
              const Data = await Schema.findOne({ Miembro: interaction.member.id, Tipo: 'Postulación' });

              if (Data) {
                  // Si ya existe un ticket, informar al usuario sin mostrar el formulario
                  await interaction.reply({ content: `Ya tienes un ticket de postulación creado en <#${Data.Canal}>.`, ephemeral: true });
              } else {
                  // Si no existe un ticket, mostrar el formulario de postulación
                  const modal = new ModalBuilder({
                      customId: `formpostulacion`,
                      title: 'Formulario de Postulación',
                  });

                  // Pregunta: ¿A qué deseas postular? (Staff, Editor, Cazador)
                  const puestoPostulacion = new TextInputBuilder({
                      customId: 'puestoPostulacion',
                      label: "¿A qué deseas postular?",
                      style: TextInputStyle.Short,
                  });

                  // Crear ActionRow para la pregunta
                  const puestoPostulacionRow = new ActionRowBuilder().addComponents(puestoPostulacion);

                  // Añadir el ActionRow al modal
                  modal.addComponents(puestoPostulacionRow);

                  await interaction.showModal(modal);

                  // Esperar la respuesta del modal
                  const filter = (modalInteraction) => modalInteraction.customId === `formpostulacion`;

                  interaction.awaitModalSubmit({ filter, time: 300_000 })
                      .then(async (modalInteraction) => {
                          try {
                              // Hacer la respuesta efímera
                              await modalInteraction.deferReply({ ephemeral: true });

                              // Obtener el valor del formulario
                              const puestoPostulacionAns = modalInteraction.fields.getTextInputValue('puestoPostulacion');

                              // Aquí puedes continuar con la lógica para crear el canal y guardar la información en la base de datos
                              const postulacionChannel = await interaction.guild.channels.create({
                                  name: `#postulacion-${interaction.user.username}`,
                                  parent:'1096144326393864234',
                                  type: ChannelType.GuildText,
                                  permissionOverwrites: [
                                      {
                                          id: interaction.guild.roles.everyone.id,
                                          deny: [PermissionFlagsBits.ViewChannel],
                                      },
                                      {
                                          id: interaction.member.id,
                                          allow: [
                                              PermissionFlagsBits.ViewChannel,
                                              PermissionFlagsBits.SendMessages,
                                              PermissionFlagsBits.ReadMessageHistory,
                                          ],
                                      },
                                  ],
                              });

                              // Guardar en la base de datos
                              await Schema.create({
                                  Miembro: interaction.member.id,
                                  Canal: postulacionChannel.id,
                                  Cerrado: false,
                                  Tipo: 'Postulación',
                              });

                              // Enviar un mensaje al canal de postulaciones
                              const embed = new EmbedBuilder()
                                  .setTitle('Postulación')
                                  .setDescription(`${interaction.user.displayName} se quiere postular`)
                                  .addFields(
                                    { name: 'Puesto al que desea postular', value: `\`\`\`${puestoPostulacionAns}\`\`\``},
                                  )
                                  .setColor('#357ff7');

                                  const botones = new ActionRowBuilder().addComponents(
                                    new ButtonBuilder()
                                        .setCustomId('reclamar')
                                        .setLabel('Reclamar')
                                        .setStyle(ButtonStyle.Danger)
                                        .setEmoji('📌'),
                                    new ButtonBuilder()
                                        .setCustomId('cerrarticket')
                                        .setLabel('Cerrar Ticket')
                                        .setStyle(ButtonStyle.Success)
                                        .setEmoji('🔒')
                                );

                              await postulacionChannel.send({ content: `${interaction.user} ha abierto un ticket de tipo Postulaciones\n||${mensaje}||`, embeds: [embed], components: [botones], allowedMentions:{parse: ['users', 'roles'] } }).then(async (message) => {
                                await message.pin();
                              });

                              // Confirmar al usuario que su postulación ha sido creada
                              await modalInteraction.editReply({ content: `Tu postulación para **${puestoPostulacionAns}** ha sido creada en ${postulacionChannel}.`, ephemeral: true });

                          } catch (error) {
                              console.error(error);
                              await modalInteraction.editReply({ content: 'Hubo un error al procesar tu postulación. Inténtalo de nuevo más tarde.', ephemeral: true });
                          }
                      });
              }

            } if(values === '6') { // POSTULACION CLUB
              // Comprobar si ya existe un ticket de postulación para este usuario
              const Data = await Schema.findOne({ Miembro: interaction.member.id, Tipo: 'Postulación de Club' });

              if (Data) {
                  // Si ya existe un ticket, informar al usuario sin mostrar el formulario
                  await interaction.reply({ content: `Ya tienes un ticket de postulación de club creado en <#${Data.Canal}>.`, ephemeral: true });
              } else {
                  // Si no existe un ticket, mostrar el formulario de postulación
                  const modal = new ModalBuilder({
                      customId: `postclub`,
                      title: 'Formulario de Postulación de Club',
                  });

                  // Pregunta 1: ¿A qué club deseas postular?
                  const clubPostular = new TextInputBuilder({
                      customId: 'clubPostular',
                      label: "¿A qué club deseas postular?",
                      style: TextInputStyle.Short,
                  });

                  // Pregunta 2: ¿Qué rol deseas obtener? Miembro Veterano o Vicepresidente
                  const rolDeseado = new TextInputBuilder({
                      customId: 'rolDeseado',
                      label: "¿Rol deseado?",
                      style: TextInputStyle.Short,
                  });

                  // Crear ActionRows para cada pregunta
                  const clubPostularRow = new ActionRowBuilder().addComponents(clubPostular);
                  const rolDeseadoRow = new ActionRowBuilder().addComponents(rolDeseado);

                  // Añadir los ActionRows al modal
                  modal.addComponents(clubPostularRow, rolDeseadoRow);

                  await interaction.showModal(modal);

                  // Esperar la respuesta del modal
                  const filter = (modalInteraction) => modalInteraction.customId === `postclub`;

                  interaction.awaitModalSubmit({ filter, time: 300_000 })
                      .then(async (modalInteraction) => {
                          try {
                              // Hacer la respuesta efímera
                              await modalInteraction.deferReply({ ephemeral: true });

                              // Obtener los valores del formulario
                              const clubPostularAns = modalInteraction.fields.getTextInputValue('clubPostular');
                              const rolDeseadoAns = modalInteraction.fields.getTextInputValue('rolDeseado');

                              // Aquí puedes continuar con la lógica para crear el canal y guardar la información en la base de datos
                              const clubChannel = await interaction.guild.channels.create({
                                  name: `#postulacion-club-${interaction.user.username}`,
                                  type: ChannelType.GuildText,
                                  parent: '1096144326393864234',
                                  permissionOverwrites: [
                                      {
                                          id: interaction.guild.roles.everyone.id,
                                          deny: [PermissionFlagsBits.ViewChannel],
                                      },
                                      {
                                          id: interaction.member.id,
                                          allow: [
                                              PermissionFlagsBits.ViewChannel,
                                              PermissionFlagsBits.SendMessages,
                                              PermissionFlagsBits.ReadMessageHistory,
                                          ],
                                      },
                                  ],
                              });

                              // Guardar en la base de datos
                              await Schema.create({
                                  Miembro: interaction.member.id,
                                  Canal: clubChannel.id,
                                  Cerrado: false,
                                  Tipo: 'Postulación de Club',
                              });

                              // Enviar un mensaje al canal de postulaciones
                              const embed = new EmbedBuilder()
                                  .setTitle('Postulación de Club')
                                  .setDescription(`${interaction.user.displayName} se ha postulado`)
                                  .addFields(
                                    { name: 'Club al que desea postular', value: `\`\`\`${clubPostularAns}\`\`\`` },
                                    { name: 'Rol deseado en el club', value: `\`\`\`${rolDeseadoAns}\`\`\`` }
                                  )
                                  .setColor('#357ff7');

                                  const botones = new ActionRowBuilder().addComponents(
                                    new ButtonBuilder()
                                        .setCustomId('reclamar')
                                        .setLabel('Reclamar')
                                        .setStyle(ButtonStyle.Danger)
                                        .setEmoji('📌'),
                                    new ButtonBuilder()
                                        .setCustomId('cerrarticket')
                                        .setLabel('Cerrar Ticket')
                                        .setStyle(ButtonStyle.Success)
                                        .setEmoji('🔒')
                                );

                              await clubChannel.send({ content: `${interaction.user} ha abierto un ticket de tipo Postulaciones a Club\n||${mensaje}||`, embeds: [embed], components: [botones], allowedMentions:{parse: ['users', 'roles'] } }).then(async (message) => {
                                await message.pin();
                              });

                              // Confirmar al usuario que su postulación ha sido creada
                              await modalInteraction.editReply({ content: `Tu postulación para el club **${clubPostularAns}** como **${rolDeseadoAns}** ha sido creada en ${clubChannel}.`, ephemeral: true });

                          } catch (error) {
                              console.error(error);
                              await modalInteraction.editReply({ content: 'Hubo un error al procesar tu postulación. Inténtalo de nuevo más tarde.', ephemeral: true });
                          }
                      });
              }

              
            } if(values === '7') { // RECLAMAR RECOMPENSAS
              // Comprobar si ya existe un reclamo para este usuario
              const Data = await Schema.findOne({ Miembro: interaction.member.id, Tipo: 'Reclamo' });

              if (Data) {
                  // Si ya existe un reclamo, informar al usuario sin mostrar el formulario
                  await interaction.reply({ content: `Ya tienes un reclamo registrado en <#${Data.Canal}>.`, ephemeral: true });
              } else {
                  // Si no existe un reclamo, mostrar el formulario de reclamo
                  const modal = new ModalBuilder({
                      customId: `formreclamar`,
                      title: 'Formulario de Reclamo',
                  });

                  // Pregunta: Adjunta enlace de mensaje como prueba
                  const enlacePrueba = new TextInputBuilder({
                      customId: 'enlacePrueba',
                      label: "Adjunta enlace de mensaje como prueba",
                      style: TextInputStyle.Short,
                  });

                  // Crear ActionRow para la pregunta
                  const enlacePruebaRow = new ActionRowBuilder().addComponents(enlacePrueba);

                  // Añadir el ActionRow al modal
                  modal.addComponents(enlacePruebaRow);

                  await interaction.showModal(modal);

                  // Esperar la respuesta del modal
                  const filter = (modalInteraction) => modalInteraction.customId === `formreclamar`;

                  interaction.awaitModalSubmit({ filter, time: 300_000 })
                      .then(async (modalInteraction) => {
                          try {
                              // Hacer la respuesta efímera
                              await modalInteraction.deferReply({ ephemeral: true });

                              // Obtener el enlace de prueba del formulario
                              const enlacePruebaAns = modalInteraction.fields.getTextInputValue('enlacePrueba');

                              // Aquí puedes continuar con la lógica para crear el canal y guardar la información en la base de datos
                              const reclamoChannel = await interaction.guild.channels.create({
                                  name: `#reclamo-${interaction.user.username}`,
                                  type: ChannelType.GuildText,
                                  parent: '1096144326393864234',
                                  permissionOverwrites: [
                                      {
                                          id: interaction.guild.roles.everyone.id,
                                          deny: [PermissionFlagsBits.ViewChannel],
                                      },
                                      {
                                          id: interaction.member.id,
                                          allow: [
                                              PermissionFlagsBits.ViewChannel,
                                              PermissionFlagsBits.SendMessages,
                                              PermissionFlagsBits.ReadMessageHistory,
                                          ],
                                      },
                                  ],
                              });

                              // Guardar en la base de datos
                              await Schema.create({
                                  Miembro: interaction.member.id,
                                  Canal: reclamoChannel.id,
                                  Cerrado: false,
                                  Tipo: 'Reclamo',
                              });

                              // Enviar un mensaje al canal de reclamos
                              const embed = new EmbedBuilder()
                                  .setTitle('Reclamar Recompensas')
                                  .setDescription(`${interaction.user} ha presentado un reclamo.`)
                                  .addFields(
                                    { name: 'Enlace de prueba', value: `\`\`\`${enlacePruebaAns}\`\`\`` }
                                  )
                                  .setColor('#ff0000');

                                  const botones = new ActionRowBuilder().addComponents(
                                    new ButtonBuilder()
                                        .setCustomId('reclamar')
                                        .setLabel('Reclamar')
                                        .setStyle(ButtonStyle.Danger)
                                        .setEmoji('📌'),
                                    new ButtonBuilder()
                                        .setCustomId('cerrarticket')
                                        .setLabel('Cerrar Ticket')
                                        .setStyle(ButtonStyle.Success)
                                        .setEmoji('🔒')
                                );

                              await reclamoChannel.send({ content: `${interaction.user} ha abierto un ticket de tipo Reclamar Recompensas\n||${mensaje}||`, embeds: [embed], components: [botones], allowedMentions:{parse: ['users', 'roles'] } }).then(async (message) => {
                                await message.pin();
                              });

                              // Confirmar al usuario que su reclamo ha sido creado
                              await modalInteraction.editReply({ content: `Tu reclamo ha sido creado en ${reclamoChannel}.`, ephemeral: true });

                          } catch (error) {
                              console.error(error);
                              await modalInteraction.editReply({ content: 'Hubo un error al procesar tu reclamo. Inténtalo de nuevo más tarde.', ephemeral: true });
                          }
                      });
              }

              
            } if(values === '8') { // OTRO
              // Comprobar si ya existe un caso de ayuda para este usuario
              const Data = await Schema.findOne({ Miembro: interaction.member.id, Tipo: 'Ayuda' });

              if (Data) {
                  // Si ya existe un caso, informar al usuario sin mostrar el formulario
                  await interaction.reply({ content: `Ya tienes un caso de ayuda abierto en <#${Data.Canal}>.`, ephemeral: true });
              } else {
                  // Si no existe un caso, mostrar el formulario de ayuda
                  const modal = new ModalBuilder({
                      customId: `formotro`,
                      title: 'Formulario de Ayuda',
                  });

                  // Pregunta: ¿En qué te podemos ayudar?
                  const ayuda = new TextInputBuilder({
                      customId: 'ayuda',
                      label: "¿En qué te podemos ayudar?",
                      style: TextInputStyle.Paragraph, // Usamos Paragraph para permitir más texto
                  });

                  // Crear ActionRow para la pregunta
                  const ayudaRow = new ActionRowBuilder().addComponents(ayuda);

                  // Añadir el ActionRow al modal
                  modal.addComponents(ayudaRow);

                  await interaction.showModal(modal);

                  // Esperar la respuesta del modal
                  const filter = (modalInteraction) => modalInteraction.customId === `formotro`;

                  interaction.awaitModalSubmit({ filter, time: 300_000 })
                      .then(async (modalInteraction) => {
                          try {
                              // Hacer la respuesta efímera
                              await modalInteraction.deferReply({ ephemeral: true });

                              // Obtener la respuesta de ayuda del formulario
                              const ayudaAns = modalInteraction.fields.getTextInputValue('ayuda');

                              // Crear un canal para la ayuda
                              const ayudaChannel = await interaction.guild.channels.create({
                                  name: `#ayuda-${interaction.user.username}`,
                                  type: ChannelType.GuildText,
                                  parent: '1096144326393864234',
                                  permissionOverwrites: [
                                      {
                                          id: interaction.guild.roles.everyone.id,
                                          deny: [PermissionFlagsBits.ViewChannel],
                                      },
                                      {
                                          id: interaction.member.id,
                                          allow: [
                                              PermissionFlagsBits.ViewChannel,
                                              PermissionFlagsBits.SendMessages,
                                              PermissionFlagsBits.ReadMessageHistory,
                                          ],
                                      },
                                  ],
                              });

                              // Guardar en la base de datos
                              await Schema.create({
                                  Miembro: interaction.member.id,
                                  Canal: ayudaChannel.id,
                                  Cerrado: false,
                                  Tipo: 'Ayuda',
                              });

                              // Enviar un mensaje al canal de ayuda
                              const embed = new EmbedBuilder()
                                  .setTitle('Otro')
                                  .setDescription(`${interaction.user} ha solicitado ayuda.`)
                                  .addFields(
                                    { name: 'Motivo', value: `\`\`\`${ayudaAns}\`\`\`` }
                                  )
                                  .setColor('#00ff00');

                                  const botones = new ActionRowBuilder().addComponents(
                                    new ButtonBuilder()
                                        .setCustomId('reclamar')
                                        .setLabel('Reclamar')
                                        .setStyle(ButtonStyle.Danger)
                                        .setEmoji('📌'),
                                    new ButtonBuilder()
                                        .setCustomId('cerrarticket')
                                        .setLabel('Cerrar Ticket')
                                        .setStyle(ButtonStyle.Success)
                                        .setEmoji('🔒')
                                );

                              await ayudaChannel.send({ content: `${interaction.user} ha abierto un ticket de tipo Otro\n||${mensaje}||`, embeds: [embed], components: [botones], allowedMentions:{parse: ['users', 'roles'] } }).then(async (message) => {
                                await message.pin();
                              });

                              // Confirmar al usuario que su solicitud de ayuda ha sido creada
                              await modalInteraction.editReply({ content: `Tu solicitud de ayuda ha sido creada en ${ayudaChannel}.`, ephemeral: true });

                          } catch (error) {
                              console.error(error);
                              await modalInteraction.editReply({ content: 'Hubo un error al procesar tu solicitud de ayuda. Inténtalo de nuevo más tarde.', ephemeral: true });
                          }
                      });
              }

              
            }
        }
    }
  }
}