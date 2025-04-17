const { SlashCommandBuilder, EmbedBuilder, Guild, ButtonStyle, ActionRowBuilder, ButtonBuilder, PermissionsBitField } = require('discord.js');
const axios = require('axios');
const Schema = require('../../Esquemas/clubsSchema.js');
const apiKey = process.env.BS_APIKEY;

const countries = require('../../json/countries.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clubadmin')
    .setDescription('Comandos para gerentes de Clubes')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addSubcommandGroup(group => 
      group
        .setName('clubes')
        .setDescription('Comandos de clubes')
        .addSubcommand(subcommand =>
          subcommand
            .setName('agregar')
            .setDescription('Agrega un club a la lista de clubes del servidor')
            .addStringOption(option => 
              option
                .setName('tag-club')
                .setDescription('El tag del club que deseas agregar')
                .setRequired(true)
            )            .addStringOption(option => 
                option
                  .setName('alias')
                  .setDescription('El alias del club')
                  .setRequired(true)
              )
            .addStringOption(option => 
              option
                .setName('region')
                .setDescription('La región del club')
                .setRequired(true)
                .setAutocomplete(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('remover')
            .setDescription('Remueve un club a la lista de clubes del servidor')
            .addStringOption(option => 
              option
                .setName('tag-club')
                .setDescription('El tag del club que deseas remover')
                .setRequired(true)
            )
        )        
         .addSubcommand(subcommand =>
          subcommand
            .setName('mostrar')
            .setDescription('Muestra la configuración de un club')
            .addStringOption(option => 
              option
                .setName('tag-club')
                .setDescription('Tag del club a mostrar')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
        subcommand
            .setName('editar')
            .setDescription('Edita la configuración de un club')
            .addStringOption(option => 
              option
                .setName('tag-club')
                .setDescription('El tag del club que deseas agregar')
                .setRequired(true)
            )            .addStringOption(option => 
                option
                  .setName('alias')
                  .setDescription('El alias del club')
                  .setRequired(false)
              )
            .addStringOption(option => 
              option
                .setName('region')
                .setDescription('La región del club')
                .setRequired(false)
                .setAutocomplete(true)
            )
        )
    ),

  // Aquí manejamos el autocompletado y la ejecución del comando
     async execute(interaction, client) {

        const rolesAdmin = ['1106553480803516437', '1107345436492185753', '1106553536839422022', '1313248021403930715', '1333361374000054314'];
        if (!interaction.member.roles.cache.some(role => rolesAdmin.includes(role.id))) return interaction.reply({ content: 'No tienes permisos suficientes', ephemeral: true });

        if(interaction.options.getSubcommandGroup() === 'clubes') {
            if(interaction.options.getSubcommand() === 'agregar') {
                
                const tag = await interaction.options.getString('tag-club');      
                const alias = await interaction.options.getString('alias');
                const region = await interaction.options.getString('region');
                if (!tag.includes('#')) return await interaction.reply({ content: `Este tag no es válido: **${tag}** `});
                
                try {
                    const response = await axios.get(`https://api.brawlstars.com/v1/clubs/%23${tag.replace('#', '')}`, {
                        headers: {
                            Authorization: `Bearer ${apiKey}`,
                        }
                    });
                    const club = response.data;

                      const clubName = club.name.replace('TS ', '')
                      const guild = interaction.guild;
                  
                      const nombreRol = `🔰 Miembro ${clubName}`
                  
                      const rolesClub = guild.roles.cache
                      .filter(role => role.name.startsWith('🔰 Miembro'))
                      .sort((a, b) => a.position - b.position)
                      const ultimoRolClub = rolesClub.last()
                      const nuevaPosicion = ultimoRolClub.position + 1
                  
                      const nuevoRol = await guild.roles.create({
                          name: nombreRol,
                          color: 'Blue',
                          permissions: [],
                          position: nuevaPosicion,
                          reason: `Rol creado para el club TS ${clubName}`
                      })
                  
                      await guild.channels.cache.get('1320856783958441994').permissionOverwrites.edit(nuevoRol, {
                        ViewChannel: true,
                        SendMessages: false,
                        ReadMessageHistory: true
                      })
                  
                      await guild.channels.cache.get('1335991815026905159').permissionOverwrites.edit(nuevoRol, {
                          ViewChannel: true,
                          SendMessages: false,
                          ReadMessageHistory: true
                        })
                  
                      await guild.channels.cache.get('1238144649592307732').permissionOverwrites.edit(nuevoRol, {
                          ViewChannel: true,
                          SendMessages: false,
                          ReadMessageHistory: true,
                          AddReactions: true
                      })
                  
                      await guild.channels.cache.get('1238145240209166450').permissionOverwrites.edit(nuevoRol, {
                          ViewChannel: true,
                          SendMessages: true,
                          ReadMessageHistory: true,
                          AddReactions: true,
                          SendTTSMessages: true,
                          EmbedLinks: true,
                          AttachFiles: true,
                          UseExternalEmojis: true,
                          UseExternalStickers: true,
                          UseApplicationCommands: true
                      })
                  
                      await guild.channels.cache.get('1238155718780129311').permissionOverwrites.edit(nuevoRol, {
                          ViewChannel: true,
                          SendMessages: false,
                          ReadMessageHistory: true
                        })

                    const data = await Schema.findOne({ ClubTag: tag.replace('#', '') });
                    if(data) return await interaction.reply('Este tag ya estaba guardado');
                    let createdData
                    await Schema.create({ ClubTag: tag.replace('#', ''), Region: region, Alias: alias }).then(data => { createdData = data })

                    const embed = new EmbedBuilder()
                    .setTitle(`Nuevo club con el tag ${tag}`)
                    .setColor('Blue')
                    .addFields(
                      {name: 'Alias', value: createdData.Alias, inline: true },
                      { name: 'Región', value: createdData.Region, inline: true },
                    )
        
                     await interaction.reply({ embeds: [embed] });

                } catch(error) {
                    await interaction.reply(error);
                }

            } else if(interaction.options.getSubcommand() === 'remover') {
                const tag = await interaction.options.getString('tag-club');
                if(!tag.includes('#')) return await interaction.reply({ content: `Este tag no es válido: **${tag}**` });
                try {
                    const data = await Schema.findOne({ ClubTag: tag.replace('#', '') });
                    if(data) {
                        await data.delete();
                        await interaction.reply({ content: `Se ha eliminado el club con tag **${tag}** de la base de datos` });
                    } else {
                        return await interaction.reply('No se ha encontrado ese dato para eliminar, es inexistente');
                    }
                } catch(e) {
                    await interaction.reply(`${e}`);
                }
            } else if(interaction.options.getSubcommand() === 'mostrar') {
                const tag = await interaction.options.getString('tag-club');

                if(!tag.includes('#')) return await interaction.reply({ content: `Este tag no es válido: **${tag}** `});
                const data = await Schema.findOne({ ClubTag: tag.replace('#', '') });

                if (!data) return interaction.reply('No he encontrado ningun club con esta tag en la base de datos')
                const alias = data.Alias ? data.Alias : '*El club no cuenta con ningun alias*'
                const region = data.Region ? data.Region : '*El club no cuenta con ninguna region*'

                const embed = new EmbedBuilder()
                .setTitle(`Club con el tag ${tag}`)
                .setColor('Blue')
                .addFields(
                    {name: 'Alias', value: alias, inline: true },
                    { name: 'Región', value: region, inline: true },
                )
        
              await interaction.reply({ embeds: [embed] });
            } else if(interaction.options.getSubcommand() === 'editar') {
                const tag = await interaction.options.getString('tag-club')      
                const alias = await interaction.options.getString('alias')
                const region = await interaction.options.getString('region')
                
                if(!tag.includes('#')) return await interaction.reply({ content: `Este tag no es válido: **${tag}** `});
                
                const data = await Schema.findOne({ ClubTag: tag.replace('#', '') });
                if (!data) return interaction.reply('No he encontrado ningun club con esta tag en la base de datos')
                
                data.Alias = alias ? alias : data.Alias
                data.Region = region ? region : data.Region

				await data.save()
                
                const embedAlias = data.Alias ? data.Alias : '*El club no cuenta con ningun alias*'
                const embedRegion = data.Region ? data.Region : '*El club no cuenta con ninguna region*'
                
                    const embed = new EmbedBuilder()
                    .setTitle(`Club con el tag ${tag} editado`)
                    .setColor('Blue')
                    .addFields(
                      {name: 'Alias', value: embedAlias, inline: true },
                      { name: 'Región', value: embedRegion, inline: true },
                    )
        
                     await interaction.reply({ embeds: [embed] });
            }
        }},

            async autocomplete(interaction) {
                const focusedValue = interaction.options.getFocused(); // Lo que el usuario está escribiendo
                const filtered = Object.keys(countries)
                  .filter(pais => pais.toLowerCase().startsWith(focusedValue.toLowerCase()))
                  .slice(0, 25); // Límite de 25 para Discord
            
                await interaction.respond(
                  filtered.map(pais => ({
                    name: pais,
                    value: pais
                  }))
                );
              }
            };
