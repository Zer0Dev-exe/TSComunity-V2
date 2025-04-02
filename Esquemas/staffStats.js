const {model, Schema} = require('mongoose');

let statsStaff = new Schema({
    ID: String,
    Renovaciones: Number,
    TicketsCerrados: Number,
    TicketCerradosValorados: Number,
    Estrellas: Number,
    TicketsAtendidos: { type: Number, default: 0 },
});

module.exports = model("statsofstaff", statsStaff);