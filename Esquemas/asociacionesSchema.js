const {model, Schema} = require('mongoose');

let asociacionesSchema = new Schema({
    Representante: String,
    Renovacion: Number,
    UltimaRenovacion: Date,
    Asignado: String,
    Canal: String,
    Categoria: String
});

module.exports = model("asociacoinesData", asociacionesSchema);