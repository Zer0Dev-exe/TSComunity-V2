module.exports = function contarCaracteresEmbed(embed) {
    let total = 0;

    if (embed.data.title) total += embed.data.title.length;
    if (embed.data.description) total += embed.data.description.length;
    if (embed.data.footer?.text) total += embed.data.footer.text.length;
    if (embed.data.author?.name) total += embed.data.author.name.length;

    if (embed.data.fields) {
        for (const field of embed.data.fields) {
            total += field.name.length + field.value.length;
        }
    }

    return total;
}