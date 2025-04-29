const { EmbedBuilder, PermissionsBitField, ChannelType } = require("discord.js")
const axios = require('axios')

require('dotenv').config()

const TENORKEY = process.env.TENORKEY

async function getGif(query) {
    const response = await axios.get('https://tenor.googleapis.com/v2/search', {
        params: {
            key: TENORKEY,
            q: query,
            limit: 40,
            contentfilter: 'high',
            media_filter: 'minimal',
            locale: 'en_US',
            ar_range: 'all'
          }
    })
  
    const results = response.data.results
  
    if (results.length > 0) {
      const randomIndex = Math.floor(Math.random() * results.length)
      const gifData = results[randomIndex]
      return {
        url: gifData.media_formats.gif.url,
        title: gifData.content_description || null
      }
    } else {
      return null
    }
}

module.exports = { getGif }