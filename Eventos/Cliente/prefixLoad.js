const { Events } = require('discord.js')
require('dotenv').config()
module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {

        const prefix = process.env.PREFIX
        if(!message.content.startsWith(prefix) || message.author.bot) return;

        const args = message.content.slice(prefix.length).split(/ +/);
        const command = args.shift().toLowerCase();
        const comando = 
            client.prefixs.get(command) ||
            client.prefixs.find(
                (cmd) => command.aliases && cmd.aliases.includes(command)
            )

        if(!comando) return;
        try {
            comando.run(message, client, args)
        } catch(error) {
            message.reply(`Error`)
            console.log(error)
        }
    }
}