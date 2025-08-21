const {model, Schema} = require('mongoose');

let tareasAsociaciones = new Schema({
  channelId: { type: String, required: true },
  userId: { type: String, required: true },
  expirationDate: { type: Date, required: true },

  firstNotified: { type: Date, default: null },
  lastNotified: { type: Date, default: null },
  reminderCount: { type: Number, default: 0 }
})

module.exports = model("tareasAsociaciones", tareasAsociaciones)