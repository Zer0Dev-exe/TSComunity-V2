const {model, Schema} = require('mongoose');

let rolesStaff = new Schema({
    Servidor: String,
    RolesStaff: Array,
    CanalStarboard: String,
    EstrellasMin: Number
});

module.exports = model("rolesstaffts", rolesStaff);