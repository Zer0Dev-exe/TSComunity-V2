const { Schema, model} = require('mongoose')

let clubSchema = new Schema({
    ClubTag: String,
    Alias: String,
    Emoji: String,
    Rol: String,
    Canal: String,
    Color: String,
    Region: String,
})

module.exports = model("clubsData", clubSchema)