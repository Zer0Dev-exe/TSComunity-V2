const {model, Schema} = require('mongoose');

let apiTokenSchema = new Schema({
    Usuario: String,
    Token: String,
});

module.exports = model("apiTokenData", apiTokenSchema);