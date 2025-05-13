const {model, Schema} = require('mongoose');

let servidorData = new Schema({
    Miembros: Number,
    Boosts: Number,
    Staffs: Array
});

module.exports = model("servidordata", servidorData);