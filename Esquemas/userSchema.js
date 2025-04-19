const {model, Schema} = require('mongoose')

let userSchema = new Schema({
    id: String,
    bienvenidas: Number
})

module.exports = model("userSchema", userSchema)