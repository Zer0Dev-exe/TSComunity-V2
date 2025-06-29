const { EmbedBuilder, PermissionsBitField, ChannelType, ButtonBuilder, ButtonStyle, ActionRowBuilder, ButtonBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, MediaGalleryBuilder, MediaGalleryItemBuilder } = require("discord.js")

module.exports = {
    name: "send",
    aliases: ["p"],
    args: true,
    run: async(message, client, args) => {

        const ALLOWED_ROLES_IDS = ['1106553480803516437', '1107345436492185753', '1106553536839422022']

        const hasPermission = message.member.roles.cache.some(role => ALLOWED_ROLES_IDS.includes(role.id))

        if (!hasPermission) return message.reply('No tienes permisos webon')

        if (!args.length) return message.reply('Tienes q poner algun argumento webon')

        await message.delete()

        if (args[0] === '1') {
            const embeds = [
    new EmbedBuilder()
        .setColor(16248066)
        .setTitle("Jerarquía de roles <:staff:1385559419948896276>")
        .setDescription("- <@&1107331844866846770> – Staffs en fase de prueba de 15 días de duración para determinar si entran al equipo como <@&1107329826982989906>es.\n\n- <@&1107329826982989906> – Staffs oficiales del servidor que se encargan de moderar y mantener un ambiente ordenado.\n\n- <@&1202685031219200040> – Staffs responsables de instruir a los <@&1107329826982989906>es y orientar a los <@&1107331844866846770>es durante su periodo de prueba.\n\n- <@&1363927756617941154> - Staffs responsables de supervisar todo el equipo y trabajar activamente con el equipo administrativo del servidor.\n\n- <@&1106553536839422022>, <@&1107345436492185753> y <@&1106553480803516437> – Equipo administrativo del servidor."),
        new EmbedBuilder()
        .setColor(2224400)
        .setTitle("Criterios de ascenso / descenso 📝")
        .setDescription("Los ascensos y descensos no tienen una fecha fija, pueden variar dependiendo del momento y las necesidades del servidor. Aun así, suelen tomarse periodos mensuales como referencia.\n\nLo que más valoramos a la hora de ascender es la iniciativa de proponer ideas, impulsar nuevos proyectos y tener la motivación de sacar adelante todo lo que pueda mejorar el servidor.\n")
        .setFields(
            {
                name: "Criterios de ascenso <:arriba:1385557672660828181>",
                value: "\n- Madurez y Responsabilidad\n\n- Atender Tickets Correctamente\n\n- Cumplir y Superar las Expectativas\n\n- Apoyar el Crecimiento del Servidor",
                inline: true,
            },
            {
                name: "Criterios de descenso <:abajo:1385557717921304636>",
                value: "- Generar Problemas\n\n- Faltar el Respeto\n\n- No realizar tareas\n\n- Falta de Participación",
                inline: true,
            },
        ),
    new EmbedBuilder()
        .setColor(16711680)
        .setTitle("Sistema de sanciones <a:warns:1385559677894393877>")
        .setDescription("Para mantener un ambiente positivo y seguro para todos, es esencial cumplir con las directrices establecidas en el canal <#1102632956490690661>.\n\nCuando un usuario es sancionado o apela una sanción, el bot <@678344927997853742> le notificará automáticamente por MD.  Durante el período de muteo, dicho usuario solo podrá ver el canal <#1108017147952771112> dentro del servidor.\n\nAdemás, en TS Community Brawl contamos con un sistema de automoderación que sanciona de forma automática ciertas conductas no permitidas, como el envío de enlaces a servidores externos.")
        .setFields(
            {
                name: "Warn <:warn:1385557884548546640>",
                value: "Llamada de atención que se emite ante infracciones leves. Su objetivo es informar que se ha incumplido una norma y advertir sobre la posibilidad de sanciones más graves si la conducta no mejora.\n\n**Sistema de Warns <a:warns:1385559677894393877>**",
                inline: false,
            },
            {
                name: "1 Warn <:warn:1385557884548546640>",
                value: "1 hora mute <:mute:1385557781721120880>",
                inline: true,
            },
            {
                name: "2 Warns <:warn:1385557884548546640>",
                value: "12 horas mute <:mute:1385557781721120880>",
                inline: true,
            },
            {
                name: "3 Warns <:warn:1385557884548546640>",
                value: "24 horas mute <:mute:1385209518224310373>",
                inline: true,
            },
            {
                name: "4 Warns <:warn:1385557884548546640>",
                value: "72 horas mute <:mute:1385557781721120880>",
                inline: true,
            },
            {
                name: "5 Warns <:warn:1385557884548546640>",
                value: "Baneo <a:ban:1385557552724709516>",
                inline: true,
            },
            {
                name: "** **",
                value: "** **",
                inline: true,
            },
            {
                name: "Mute <:mute:1385557781721120880>",
                value: "Sanción temporal que restringe la capacidad de comunicarse. El usuario solo puede ver el canal de <#1108017147952771112>. Se aplica en situaciones como actividad sospechosa, hackeos o faltas graves tras advertencias previas.",
                inline: false,
            },
            {
                name: "Ban <a:ban:1385557552724709516>",
                value: "Sanción permanente que bloquea el acceso al servidor. Se aplica por acumulación de faltas o de forma inmediata ante infracciones graves como acoso, amenazas, actividades maliciosas o sabotaje de la comunidad.",
                inline: false,
            },
        ),
];

message.channel.send({ embeds: embeds })
        } else if (args[0] === '2') {
            const embeds = [
    new EmbedBuilder()
        .setColor(4121252)
        .setTitle("Renovación de asociaciones <:caza:1385557933693337620>")
        .setDescription(
            "Una vez que un staff entra al equipo de <@&1107329826982989906>, se le asignan una serie de asociaciones que deberá renovar en intervalos de tiempo fijos, según el periodo de renovación establecido para cada una. Puedes consultar qué asociaciones tiene cada staff en <#1339987513401413735>.\n\n" +
            "Cuando llegue el momento de renovar, el bot <@1292238307656470621> te avisará automáticamente por MD. Además, cuando renueves, el bot enviará un mensaje al canal de asociaciones con la fecha, el representante, el encargado y los puntos obtenidos. Estos puntos se suman a tu marcador y sirven para generar un ranking que se puede revisar con el comando </asociaciones leaderboard:1341827712402329663>.\n\n### Métodos de renovación:"
        )
        .setFields(
            {
                name: "Escribir al representante :incoming_envelope:",
                value:
                "1. Enviar un mensaje directo al representante indicando que vienes de TS Comunity Brawl para renovar.\n\n" +
                "2. Pregunta si se usa la misma plantilla que antes. Si ha cambiado, pide la nueva.\n\n" +
                "3. Asegurate de que ellos publican nuestra <#1269721664783126641> antes de tu publicar la suya.\n\n" +
                "4. Publica su la plantilla en el canal correspondiente del servidor.\n\n" +
                "5. El bot del servidor enviará automáticamente un mensaje mencionando al representante, al encargado y la fecha de la próxima renovación.",
                inline: true
            },
            {
                name: "Abrir un ticket 🎫",
                value:
                "1. Únete al servidor con el que necesitas renovar.\n\n" +
                "2. Abrir un ticket de tipo alianza/renovación y explicar que vienes de TS Comunity Brawl para renovar.\n\n" +
                "3. Preguntar si se usa la misma plantilla. Si ha cambiado, pedir la nueva.\n\n" +
                "4. Asegurate de que ellos publican nuestra <#1269721664783126641> antes de tu publicar la suya.\n\n" +
                "5. Publica su la plantilla en el canal correspondiente del servidor.\n\n" +
                "6. El bot del servidor enviará automáticamente un mensaje mencionando al representante, al encargado y la fecha de la próxima renovación.",
                inline: true
            }
        ),

    new EmbedBuilder()
        .setColor(3447003)
        .setTitle("Comandos")
        .setDescription("***<> → requerido\n[] → opcional***")
        .setFields(
            {
                name: "Moderación <:mod:1385561146886721648>",
                value: "`.warns`\n> Permisos: todos los miembros del servidor.\n> Uso: `.warns [@usuario]`\n\n`.warn`\n> Permisos: <@&1107329826982989906>es y superior.\n> Uso: `.warn <@usuario> <motivo>`\n\n`.mute`\n> Permisos: <@&1107329826982989906>es y superior.\n> Uso: `.mute <@usuario> <motivo>`\n\n`.unwarn`\n> Permisos: <@&1107329826982989906>es y superior.\n> Uso: `.unwarn <@usuario> [motivo]`\n\n`.unmute`\n> Permisos: <@&1107329826982989906>es y superior.\n> Uso: `.unmute <@usuario> [motivo]`\n\n`.ban`\n> Permisos: <@&1202685031219200040>es y superior.\n> Uso: `.ban <@usuario> <motivo>`\n\n`.unban`\n> Permisos: <@&1202685031219200040>es y superior.\n> Uso: `.unban <@usuario> <motivo>`\n\n`.lock`\n> Permisos: <@&1363927756617941154>es y superior.\n> Uso: `.lock [#canal] [motivo]`\n\n`.unlock`\n> Permisos: <@&1363927756617941154>es y superior.\n> Uso: `.unlock [#canal] [motivo]`",
                inline: false,
            },
            {
                name: "Asociaciones <:caza:1385557933693337620>",
                value: "</asociaciones tuyas:1341827712402329663>\n> Permisos: <@&1107329826982989906>es y superior.\n> Uso: `/asociaciones tuyas`\n\n</asociaciones lista:1341827712402329663>\n> Permisos: <@&1107329826982989906>es y superior.\n> Uso: `/asociaciones lista`\n\n</asociaciones leaderboard:1341827712402329663>\n> Permisos: <@&1107329826982989906>es y superior.\n> Uso: `/asociaciones leaderboard`\n\n</asociaciones agregar:1341827712402329663>\n> Permisos: <@&1202685031219200040>es y superior.\n> Uso: `/asociaciones agregar <nombre> <categoria> <dias> <representante>`\n\n</asociaciones agregar-manual:1341827712402329663>\n> Permisos: <@&1202685031219200040>es y superior.\n> Uso: `/asociaciones agregar-manual <canal> <dias> <representante>`\n\n</asociaciones remover:1341827712402329663>\n> Permisos: <@&1202685031219200040>es y superior.\n> Uso: `/asociaciones remove <canal>`\n\n</asociaciones editar:1341827712402329663>\n> Permisos: <@&1202685031219200040>es y superior.\n> Uso: `/asociaciones editar <canal> [encargado] [dias] [representante]`",
                inline: false,
            },
            {
                name: "Sorteos <a:sorteos:1385557593124114562>",
                value: "Para realizar sorteos es necesario el rol de <@&1222993479110492264> que debe ser pedido al equipo administrativo.\n\n`a!gstart`\n> Permisos: <@&1222993479110492264> y superior.\n> Uso: `.a!gstart <duración> <ganadores> <premio>`\n\n`a!greroll`\n> Permisos: <@&1222993479110492264> y superior.\n> Uso: `.a!greroll`\n\n`a!gend`\n> Permisos: <@&1222993479110492264> y superior.\n> Uso: `.a!gend`",
                inline: false,
            },
            {
                name: "Otros <a:ojos:1385557634220036096> ",
                value: "`.form`\n> Permisos: todos los miembros del servidor.\n> Uso: `.form`\n\n`t!leaderboard wlc`\n> Permisos: todos los miembros del servidor.\n> Uso: `t!leaderboard wlc`\n\n`t!revivirchat`\n> Permisos: <@&1107331844866846770> y superior.\n> Uso: `t!revivirchat <mensaje>`",
                inline: false,
            },
        ),
];
message.channel.send({ embeds: embeds })
        } else if (args[0] === 'normas') {


            const image = new MediaGalleryItemBuilder()
                .setURL('https://media.discordapp.net/attachments/1300019620815568906/1300028312445386752/Copy_of_Copy_of_POSTULACIONES_1.png?ex=686258b7&is=68610737&hm=b8fb73f2d4c5c4d0a950edf69c3c8c8284e98681b34d981450daaf2309ec81a4&format=webp&quality=lossless&width=792&height=198&')
                .setDescription('normas')
            
            const mediaGallery = new MediaGalleryBuilder()
                .setId(1)
                .addItems([image])
            
            const separator = new SeparatorBuilder()

            const text = new TextDisplayBuilder().setContent(`
                **Normas** :scroll:
                Nuestras reglas son muy sencillas de seguir, a pesar de que algo no este incluido en las reglas, puedes ser sancionado de igual manera.
                
                ### 1. Términos de Servicio de Discord
                > Debes seguir los [**Términos de Servicio**](https://discord.com/terms) y las [**Pautas de la Comunidad**](https://discord.com/guidelines) de Discord en todo momento.
                
                ### 2. Sin Toxicidad
                > No esta permitida la [**toxicidad**](https://es.wikipedia.org/wiki/Toxicidad#:~:text=La%20toxicidad%20es%20la%20capacidad,entrar%20en%20contacto%20con%20%C3%A9l.). Las palabras que se asemejen a insultos o que se utilicen como sustitutos de insultos se considerarán insultos y seras sancionado de igual manera.
                
                ### 3. Sin NSFW
                > No esta permitido el contenido **NSFW**. Antes de publicar algo, asegúrate de que sea apropiado para todo el mundo. Si te saltas la auto moderación para hablar sobre contenido NSFW, serás sancionado de igual manera.
                
                ### 4. Sin Spam
                > No esta permitido el **spam**. Aunque el spam lo hagas por medio de un mensaje directo, serás sancionado de igual manera.
                
                ### 5. Sin Contenido Malicioso
                > No se permite ningún tipo de **contenido malicioso**, esto incluye: el phising, capturadores de IP, viruses...
            `)

            const container = new ContainerBuilder()
                .addMediaGalleryComponents([mediaGallery])
                .addSeparatorComponents(separator)
                .addTextDisplayComponents(text)
                .setAccentColor(16749062)

            await message.channel.send({
            components: [container],
            flags: MessageFlags.IsComponentsV2
            })
        }
    }
 };