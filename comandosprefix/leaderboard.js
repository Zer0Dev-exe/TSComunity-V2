const { EmbedBuilder, PermissionsBitField, ChannelType } = require("discord.js");

module.exports = {
    name: "leaderboard",
    aliases: ['lb', 'top'],
    args: true,
    run: async(message, client, args) => {

        if (args[0] === 'wlc' || args[0] === 'welcomes' || args[0] === 'bienvenidas') {
            const userData = require('../Esquemas/userSchema.js'); // Cargar el esquema de los usuarios

            try {
                // Buscar todos los documentos de usuarios y ordenarlos por bienvenidas en orden descendente
                const ranking = await userData.find().sort({ bienvenidas: -1 }).limit(20)          // Limitar a los primeros 10
      
                if (ranking.length === 0) {
                    return
                }
      
                // Construir una cadena de texto con los primeros 10 puestos
                let topText = '';
                ranking.forEach((user, index) => {
                  if (user.id) {
                    topText += `\`${(index + 1).toString().padStart(3, '0')} -${user.bienvenidas.toString().padStart(7, ' ')} → \`<@${user.id}>\n`
                  }
                })
      
                // Crear el embed con la información
                const embed = new EmbedBuilder()
                    .setColor('Blue')
                    .setTitle('Top de Bienvenidas')
                    .setDescription(`\` ## - Puntos - Usuario                     \`\n${topText}`)
      
                // Enviar el embed al canal
                return message.reply({ embeds: [embed] });
            } catch (error) {
                console.error('Error al obtener el ranking:', error);
                return
            }
        }
    }
 };