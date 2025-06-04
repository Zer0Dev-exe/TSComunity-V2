const { EmbedBuilder, PermissionsBitField, ChannelType } = require("discord.js");

module.exports = {
    name: "follar",
    aliases: ["p"],
    args: false,
    run: async(message, client, args) => {
        const ids = [
            "1243585546979250300",
            "1243589238662889578",
            "1243595599375237263",
            "1193326762336198713"
        ]
      message.reply(`Has sido follado por <@${ids[Math.floor(Math.random() * ids.length)]}>! ahora eres furro 😏`);
    }
 };