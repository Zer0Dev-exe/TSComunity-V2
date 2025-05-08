const {model, Schema} = require('mongoose');

let tareasAsociaciones = new Schema({
    channelId: String,
    userId: String,
    expirationDate: Date
  });

module.exports = model("tareasAsociaciones", tareasAsociaciones)