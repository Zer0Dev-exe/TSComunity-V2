const { EmbedBuilder, PermissionsBitField, ChannelType } = require("discord.js");

module.exports = {
    name: "pepegay",
    aliases: [""],
    args: false,
    run: async(message, client, args) => {
        const schema = require('../Esquemas/tareasAsociaciones.js')

        try {
        const data = await schema.find({})

        message.channel.send(data || No hay data)
        }
    }
 };