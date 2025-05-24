const { EmbedBuilder, PermissionsBitField, ChannelType } = require("discord.js");

module.exports = {
    name: "follar",
    aliases: [""],
    args: false,
    run: async(message, client, args) => {

        if (message.author.id !== '838441772794511411') return message.reply('Has sido follado por tumonulo')
        
        const splitedArgs = args.join(' ').split(',')

        for (let i = 1; i <= Number(splitedArgs[1]); i++) {
            await message.channel.send(`**${1}.**   ${splitedArgs[0]}`)
        }
    }
 };