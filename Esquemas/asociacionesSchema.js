const {model, Schema} = require('mongoose');

let asociacionesSchema = new Schema({
    Representante: String,
    Renovacion: Number,
    Asignado: String,
    Canal: String,
    Categoria: String
});

module.exports = model("asociacoinesData", asociacionesSchema);