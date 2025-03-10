const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('noaccount')
        .setDescription('Comando para verificarse sin cuenta de Brawl Stars'),
    
    async execute(interaction) {

        const role = interaction.guild.roles.cache.get('1102603911157797006');
        const member = interaction.member;

        try {
            if (member.roles.cache.has(role.id)) {
                return interaction.reply({
                    content: 'Ya estabas previamente verificado en el servidor.',
                    ephemeral: true
                })
            }

            await member.roles.add(role);

            interaction.reply({
                content: `¡Se te ha arregado el rol <@&${role.id}> con éxito!`,
                ephemeral: true
            })
        } catch (error) {
            console.error(error)
            interaction.reply({
                content: 'Hubo un error al intentar asignarte el rol. Por favor, contacta a un administrador.',
                ephemeral: true
            })
        }
    }
}