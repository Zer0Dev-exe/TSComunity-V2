const {model, Schema} = require('mongoose')

let userSchema = new Schema({
    id: String,
    bienvenidas: Number,
    boostCount: { type: Number, default: 1 }
})

module.exports = model("userSchema", userSchema)