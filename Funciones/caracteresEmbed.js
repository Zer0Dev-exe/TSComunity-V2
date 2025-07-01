module.exports = function contarCaracteresEmbed(embed) {
    let total = 0;

    const raw = embed.toJSON(); // Forma segura

    if (raw.title) total += raw.title.length;
    if (raw.description) total += raw.description.length;
    if (raw.footer?.text) total += raw.footer.text.length;
    if (raw.author?.name) total += raw.author.name.length;

    if (raw.fields) {
        for (const field of raw.fields) {
            total += field.name.length + field.value.length;
        }
    }

    return total;
}