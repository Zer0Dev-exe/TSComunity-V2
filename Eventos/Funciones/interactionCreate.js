const { CommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events, ChannelType, PermissionsBitField } = require("discord.js");

var timeout = []

module.exports = {
  name: "interactionCreate",

  async execute(interaction, client) {
    
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) {

        return interaction.reply({ content: "Los comandos están rotos, contacta con un desarrollador" })
      }
      else {
        
         
      }
      command.execute(interaction, client);

    }
    else if (interaction.isSelectMenu()) { 
    }
}
}