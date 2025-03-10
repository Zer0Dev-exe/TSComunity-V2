const {model, Schema} = require('mongoose');

let starboard = new Schema({
    IdMensaje: String,
    IdMensajeStarboard: String,
});

module.exports = model("datastarboard", starboard);