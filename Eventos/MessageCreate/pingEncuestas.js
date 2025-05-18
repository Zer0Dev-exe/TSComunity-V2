const { Events, EmbedBuilder } = require("discord.js")

const cooldowns = new Map();

module.exports = {
  name: "messageCreate",

  async execute(message, client) {
    if (message.author.bot) return;
    if(message.channel.id !== '1128317797529833552' && message.channel.id !== '1096318697053884457') return;

    const poll = message.poll

    if (!poll) return 

    console.log(poll)

    message.reply({ content: `${poll.question} <@&1173984415836291132>`, allowedMentions: { parse: ['roles'] }});
  
  }
}