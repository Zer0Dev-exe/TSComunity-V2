const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Asociacion = require("../../Esquemas/asociacionesSchema.js"); // Cambia al modelo correcto

module.exports = {
    data: new SlashCommandBuilder()
      .setName("asociaciones")
      .setDescription("Comandos para manejar asociaciones.")
      .addSubcommand((subcommand) =>
        subcommand
          .setName("agregar")
          .setDescription("Crea y asocia un canal de texto a tu lista.")
          .addStringOption((option) =>
            option.setName("nombre").setDescription("El nombre del canal a crear.").setRequired(true)
          )
          .addChannelOption((option) =>
            option
              .setName("categoria")
              .setDescription("La categoría donde se creará el canal.")
              .setRequired(true)
              .addChannelTypes(4) // Solo categorías
          )
          .addNumberOption((option) =>
            option
              .setName("renovacion-dias")
              .setDescription("Número de días hasta la renovación.")
              .setRequired(true)
          )
          .addUserOption((option) =>
            option
              .setName("representante")
              .setDescription("Elige al representante responsable de esta asociación.")
              .setRequired(true)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("remover")
          .setDescription("Elimina un canal de tu lista de asociaciones.")
          .addChannelOption((option) =>
            option.setName("canal").setDescription("El canal a eliminar.").setRequired(true)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("tuyas")
          .setDescription("Muestra todos los canales asociados a ti.")
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("agregar-manual")
          .setDescription("Asocia un canal existente manualmente.")
          .addChannelOption((option) =>
            option
              .setName("canal")
              .setDescription("El canal a asociar manualmente.")
              .setRequired(true)
          )
          .addNumberOption((option) =>
            option
              .setName("renovacion-dias")
              .setDescription("Número de días hasta la renovación.")
              .setRequired(true)
          )
          .addUserOption((option) =>
            option
              .setName("representante")
              .setDescription("Elige al representante responsable de esta asociación.")
              .setRequired(true)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("asignar")
          .setDescription("Asigna un usuario a un canal.")
          .addUserOption((option) =>
            option
              .setName("usuario")
              .setDescription("El usuario a asignar.")
              .setRequired(true)
          )
          .addChannelOption((option) =>
            option
              .setName("canal")
              .setDescription("El canal al que asignar el usuario.")
              .setRequired(true)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("lista")
          .setDescription("Muestra todos los canales asociados en el servidor.")
      ),
  
    async execute(interaction) {
      const subcommand = interaction.options.getSubcommand();
  
      switch (subcommand) {
        case "agregar": {
          const nombre = interaction.options.getString("nombre");
          const categoria = interaction.options.getChannel("categoria");
          const renovacion = interaction.options.getNumber("renovacion-dias");
          const representante = interaction.options.getUser("representante");
  
          // Crear el canal en la categoría especificada
          const canal = await interaction.guild.channels.create({
            name: nombre,
            type: 0, // Tipo de canal de texto
            parent: categoria.id,
          });
  
          // Guardar la asociación en la base de datos
          const nuevaAsociacion = new Asociacion({
            Representante: representante.id,
            Renovacion: renovacion,
            Canal: canal.id,
            Categoria: categoria.id,
          });

          const embed = new EmbedBuilder()
            .setTitle("Nueva Asociación Creada")
            .addFields(
              { name: "Canal", value: `<#${canal.id}>`, inline: true },
              { name: "Renovación", value: `${renovacion} días`, inline: true },
              { name: "Representante", value: `<@${representante.id}>`, inline: true }
            )
            .setColor("#0099ff") // Puedes cambiar el color
            .setTimestamp() // Añadir un timestamp si lo deseas
            .setFooter({ text: "Asociación creada correctamente." });
  
          await nuevaAsociacion.save();
          return interaction.reply(
            { embeds: [embed]}
          );
        }
  
        case "remover": {
          const canal = interaction.options.getChannel("canal");
  
          const resultado = await Asociacion.deleteOne({
            Canal: canal.id,
          });
  
          if (resultado.deletedCount > 0) {
            return interaction.reply(`Canal ${canal} eliminado correctamente.`);
          } else {
            return interaction.reply("No se encontró el canal en tus asociaciones.");
          }
        }

        case "tuyas": {
            const asignado = interaction.user.id;
            const asociaciones = await Asociacion.find({ Asignado: asignado });

            if (asociaciones.length === 0) {
                return interaction.reply("No tienes canales asociados.");
            }

            const lista = asociaciones
                .map(
                    (a) =>
                        `- **Canal:** <#${a.Canal}>\n- **Renovación:** ${a.Renovacion} días\n- **Representante:** <@${a.Representante}> / ${a.Representante}\n`
                )
                .join("\n");

            const embed = new EmbedBuilder()
                .setColor('Purple')
                .setTitle(`Canales asociados a ${interaction.user.username}`)
                .setDescription(`Aquí tienes una lista de los canales asociados a tu cuenta:\n\n${lista}`)
                .setFooter({ text: "Si tienes alguna pregunta, no dudes en contactarnos." })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }

  
        case "agregar-manual": {
          const canal = interaction.options.getChannel("canal");
          const renovacion = interaction.options.getNumber("renovacion-dias");
          const representante = interaction.options.getUser("representante");
  
          const data = await Asociacion.findOne({ Canal: canal.id })
          if(data) return interaction.reply('Ya estaba creada esta asociacion')
          const nuevaAsociacion = new Asociacion({
            Representante: representante.id,
            Renovacion: renovacion,
            Canal: canal.id,
            Categoria: canal.parentId,
          });
  
          await nuevaAsociacion.save();
  
          // Crear un embed visual para la respuesta
          const embed = new EmbedBuilder()
            .setTitle("Nueva Asociación Creada")
            .addFields(
              { name: "Canal", value: `<#${canal.id}>`, inline: true },
              { name: "Renovación", value: `${renovacion} días`, inline: true },
              { name: "Representante", value: `<@${representante.id}>`, inline: true }
            )
            .setColor("#0099ff") // Puedes cambiar el color
            .setTimestamp() // Añadir un timestamp si lo deseas
            .setFooter({ text: "Asociación creada correctamente." });
  
          // Responder con el embed
          return interaction.reply({
            embeds: [embed]
          });
        }
  
        case "asignar": {
          const usuario = interaction.options.getUser("usuario");
          const canal = interaction.options.getChannel("canal");
          const data = await Asociacion.findOne({ Canal: canal.id})
          if(!data) return await interaction.reply('No está guardado este canal en la base de datos, primero usa /asociaciones agregar o agregar-manual')
          // Actualizar la asociación con el nuevo usuario asignado
          const asociacion = await Asociacion.findOneAndUpdate(
            { Canal: canal.id },
            { Asignado: usuario.id },
            { new: true } // Devuelve el documento actualizado
          );
  
          if (!asociacion) {
            return interaction.reply("No se encontró la asociación para ese canal.");
          }
  
          const embed = new EmbedBuilder()
          .setColor('Purple')
          .setDescription(`Se ha añadido a ${usuario} correctamente el canal ${canal}`)
          return interaction.reply(
            { embeds: [embed]}
          );
        }

        case "lista": {
            const asociaciones = await Asociacion.find();
        
            if (asociaciones.length === 0) {
                return interaction.reply("No hay asociaciones registradas en este servidor.");
            }
        
            const lista = asociaciones
                .map(
                    (a) =>
                        `- 📺 <#${a.Canal}>\n- 🔄 ${a.Renovacion} días\n- 🙋 ${a.Representante}\n- 📝: ${a.Asignado ? a.Asignado : "No hay"}\n`
                )
                .join("\n");
        
            const embeds = [];
            let chunk = '';
            let embed = new EmbedBuilder()
                .setColor("Purple")
                .setTitle("Lista de todas las asociaciones")
                .setFooter({ text: "Si tienes alguna pregunta, no dudes en contactarnos." })
                .setTimestamp();
        
            // Dividir la lista en partes si supera el límite de 1023 caracteres
            lista.split('\n').forEach(line => {
                if ((chunk + line + '\n').length <= 1023) {
                    chunk += line + '\n';
                } else {
                    embed.setDescription(`Aquí tienes una lista de todos los canales asociados:\n\n${chunk}`);
                    embeds.push(embed);
                    chunk = line + '\n';  // Iniciar un nuevo "chunk"
                    embed = new EmbedBuilder()
                        .setColor("Purple")
                        .setFooter({ text: "Si tienes alguna pregunta, no dudes en contactarnos." })
                        .setTimestamp();
                }
            });
        
            // Añadir el último "chunk"
            if (chunk) {
                embed.setDescription(`Aquí tienes una lista de todos los canales asociados:\n\n${chunk}`);
                embeds.push(embed);
            }
        
            return interaction.reply({ embeds });
        }

        default:
          return interaction.reply("Comando no reconocido.");
      }
    },
  };
  