const {model, Schema} = require('mongoose');

let ticketSchema = new Schema({
    Miembro: String,
    Canal: String,
    Staff: String,
    Staffs: Array,
    Cerrado: Boolean,
    Tipo: String,
    LastClaimed: { type: Date, default: null }, // Campo para registrar la última reclamación
    Valorado: Boolean
});

module.exports = model("dataticketsystem", ticketSchema);