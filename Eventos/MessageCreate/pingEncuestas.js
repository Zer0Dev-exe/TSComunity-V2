const { Events, EmbedBuilder } = require("discord.js")

const cooldowns = new Map();

module.exports = {
  name: "messageCreate",

  async execute(message, client) {
    if (message.author.bot) return;
    if(message.channel.id !== '1128317797529833552') return;
    if(!message.poll) {
        return;
    } else {
        message.reply({ content: 'Nueva encuesta creada !! <@&1173984415836291132>', allowedMentions: { parse: ['roles'] }});
    }
  }
}