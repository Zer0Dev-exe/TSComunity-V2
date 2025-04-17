try {

    const clubName = club.name.replace('TS ', '')
    const guild = interaction.guild;

    const nombreRol = `🔰 Miembro ${clubName}`

    const rolesClub = guild.roles.cache
    .filter(role => role.name.startsWith('🔰 Miembro'))
    .sort((a, b) => a.position - b.position)
    const ultimoRolClub = rolesClub.last()
    const nuevaPosicion = ultimoRolClub.position + 1

    const nuevoRol = await guild.roles.create({
        name: nombreRol,
        color: 'Blue',
        permissions: [],
        position: nuevaPosicion,
        reason: `Rol creado para el club TS ${clubName}`
    })

    await guild.channels.cache.get('1320856783958441994').permissionOverwrites.edit(nuevoRol, {
      ViewChannel: true,
      SendMessages: false,
      ReadMessageHistory: true
    })

    await guild.channels.cache.get('1335991815026905159').permissionOverwrites.edit(nuevoRol, {
        ViewChannel: true,
        SendMessages: false,
        ReadMessageHistory: true
      })

    await guild.channels.cache.get('1238144649592307732').permissionOverwrites.edit(nuevoRol, {
        ViewChannel: true,
        SendMessages: false,
        ReadMessageHistory: true,
        AddReactions: true
    })

    await guild.channels.cache.get('1238145240209166450').permissionOverwrites.edit(nuevoRol, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
        AddReactions: true,
        SendTTSMessages: true,
        EmbedLinks: true,
        AttachFiles: true,
        UseExternalEmojis: true,
        UseExternalStickers: true,
        UseApplicationCommands: true
    })

    await guild.channels.cache.get('1238155718780129311').permissionOverwrites.edit(nuevoRol, {
        ViewChannel: true,
        SendMessages: false,
        ReadMessageHistory: true
      })

} catch (error) {
    console.error(error)
}