const { EmbedBuilder, PermissionsBitField, ChannelType } = require("discord.js");

module.exports = {
    name: "send",
    aliases: ["p"],
    args: true,
    run: async(message, client, args) => {

        const ALLOWED_ROLES_IDS = ['1106553480803516437', '1107345436492185753', '1106553536839422022']

        const hasPermission = message.member.roles.cache.some(role => ALLOWED_ROLES_IDS.includes(role.id))

        if (!hasPermission) return message.reply('No tienes permisos webon')

        if (!args.length) return message.reply('Tienes q poner algun argumento webon')

        if (args[0] === '1') {
            const embeds = [
    new EmbedBuilder()
        .setColor(16248066)
        .setTitle("Jerarquía de roles <:z_AdministratorRole:1358168808359202937>")
        .setDescription("🔹 <@&1107331844866846770> – Staffs en fase de prueba de 15 días de duración para determinar si entran al equipo como <@&1107329826982989906>es.\n\n🔹 <@&1107329826982989906> – Staffs oficiales del servidor que se encargan de moderar y mantener un ambiente ordenado.\n\n🔹 <@&1202685031219200040> – Staffs responsables de instruir a los <@&1107329826982989906>es y orientar a los <@&1107331844866846770>es durante su periodo de prueba.\n\n🔹 <@&1363927756617941154> – Staffs responsables de supervisar todo el equipo y trabajar activamente con el equipo administrativo del servidor.\n\n🔹 <@&1106553536839422022>, <@&1107345436492185753> y <@&1106553480803516437> – Equipo administrativo del servidor."),
    new EmbedBuilder()
        .setColor(2224400)
        .setTitle("Criterios de ascenso / descenso 📝")
        .setDescription("Los ascensos y descensos no tienen una fecha fija, pueden variar dependiendo del momento y las necesidades del servidor. Aun así, suelen tomarse periodos mensuales como referencia.\n\nLo que más valoramos a la hora de ascender es la iniciativa de proponer ideas, impulsar nuevos proyectos y tener la motivación de sacar adelante todo lo que pueda mejorar el servidor.\n")
        .setFields(
            {
                name: "Criterios de ascenso <:spray_stuntshow:1114312688017879050>",
                value: "\n🔹 Madurez y Responsabilidad\n\n🔹 Atender Tickets Correctamente\n\n🔹 Cumplir y Superar las Expectativas\n\n🔹 Apoyar el Crecimiento del Servidor",
                inline: true,
            },
            {
                name: "Criterios de descenso <:spray_stuntshow2:1214969708248309841>",
                value: "🔹 Generar Problemas\n\n🔹 Faltar el Respeto\n\n🔹 No realizar tareas\n\n🔹 Falta de Participación",
                inline: true,
            },
        ),
    new EmbedBuilder()
        .setColor(16711680)
        .setTitle("Sistema de sanciones :no_entry_sign:")
        .setDescription("Para mantener un ambiente positivo y seguro para todos, es esencial cumplir con las directrices establecidas en el canal <#1102632956490690661>. La siguiente guía detalla el sistema de sanciones que se aplica cuando estas reglas son incumplidas.")
        .setFields(
            {
                name: "Warn <:Warning:1114310778980421682>",
                value: "Llamada de atención que se emite ante infracciones leves. Su objetivo es informar que se ha incumplido una norma y advertir sobre la posibilidad de sanciones más graves si la conducta no mejora.\n\nSistema de Warns <a:X_warn:1256225995673964574>",
                inline: false,
            },
            {
                name: "1 Warn <:Warning:1114310778980421682>",
                value: "1 hora mute <:mute:1385209518224310373>",
                inline: true,
            },
            {
                name: "2 Warns <:Warning:1114310778980421682>",
                value: "12 horas mute <:mute:1385209518224310373>",
                inline: true,
            },
            {
                name: "3 Warns <:Warning:1114310778980421682>",
                value: "24 horas mute <:mute:1385209518224310373>",
                inline: true,
            },
            {
                name: "4 Warns <:Warning:1114310778980421682>",
                value: "72 horas mute <:mute:1385209518224310373>",
                inline: true,
            },
            {
                name: "5 Warns <:Warning:1114310778980421682>",
                value: "Baneo <:tr:997264447091523584>",
                inline: true,
            },
            {
                name: "** **",
                value: "** **",
                inline: true,
            },
            {
                name: "Mute <:mute:1385209518224310373>",
                value: "Sanción temporal que restringe la capacidad de comunicarse. El usuario solo puede ver el canal de <#1108017147952771112>. Se aplica en situaciones como actividad sospechosa, hackeos o faltas graves tras advertencias previas.",
                inline: false,
            },
            {
                name: "Ban <:tr:997264447091523584>",
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
        .setTitle("Renovación de asociaciones :incoming_envelope:")
        .setDescription(
            "Una vez que un staff entra al equipo de <@&1107329826982989906>, se le asignan una serie de asociaciones que deberá renovar en intervalos de tiempo fijos, según el periodo de renovación establecido para cada una.\n\n" +
            "Puedes consultar qué asociaciones tiene cada staff en <#1339987513401413735>. Cuando llegue el momento de renovar, **el bot te avisará automáticamente por mensaje directo**, así que no necesitas preocuparte por recordarlo. Además, cuando renueves, el bot enviará un mensaje al canal de asociaciones con la fecha, el representante, el encargado y los puntos obtenidos. Estos puntos se suman a tu marcador y sirven para generar un ranking que se puede revisar con el comando </asociaciones leaderboard:1341827712402329663>."
        )
        .setFields(
            {
                name: "Escribir directamente al representante de la asociación",
                value:
                "1. Enviar un mensaje directo al representante indicando que venimos de **TS Community** para renovar.\n" +
                "2. Preguntar si se usa la misma plantilla que antes. Si ha cambiado, pedir la nueva.\n" +
                "3. Publicar la plantilla en el canal correspondiente del servidor.\n" +
                "4. El bot del servidor enviará automáticamente un mensaje mencionando al representante, al encargado y la fecha de la próxima renovación."
            },
            {
                name: "Abrir un ticket en el servidor con el que queremos renovar",
                value:
                "1. Unirse al servidor con el que se desea renovar.\n" +
                "2. Abrir un ticket de tipo **alianza** y explicar que venimos de **TS Community** para renovar.\n" +
                "3. Preguntar si se usa la misma plantilla. Si ha cambiado, pedir la nueva.\n" +
                "4. Publicar la plantilla en el canal correspondiente del servidor.\n" +
                "5. El bot del servidor enviará automáticamente un mensaje mencionando al representante, al encargado y la fecha de la próxima renovación."
            }
        ),

    new EmbedBuilder()
        .setColor(3447003)
        .setTitle("Comandos")
        .setDescription("***<> → requerido\n[] → opcional***")
        .setFields(
            {
                name: "Moderación <:Moderador:1295185006808797287>",
                value: "`.warns`\n> Permisos: todos los miembros del servidor.\n> Uso: `.warns [@usuario]`\n\n`.warn`\n> Permisos: <@&1107329826982989906>es y superior.\n> Uso: `.warn <@usuario> <motivo>`\n\n`.mute`\n> Permisos: <@&1107329826982989906>es y superior.\n> Uso: `.mute <@usuario> <motivo>`\n\n`.unwarn`\n> Permisos: <@&1107329826982989906>es y superior.\n> Uso: `.unwarn <@usuario> [motivo]`\n\n`.unmute`\n> Permisos: <@&1107329826982989906>es y superior.\n> Uso: `.unmute <@usuario> [motivo]`\n\n`.ban`\n> Permisos: <@&1202685031219200040>es y superior.\n> Uso: `.ban <@usuario> <motivo>`\n\n`.unban`\n> Permisos: <@&1202685031219200040>es y superior.\n> Uso: `.unban <@usuario> <motivo>`\n\n`.lock`\n> Permisos: <@&1363927756617941154>es y superior.\n> Uso: `.lock [#canal] [motivo]`\n\n`.unlock`\n> Permisos: <@&1363927756617941154>es y superior.\n> Uso: `.unlock [#canal] [motivo]`",
                inline: false,
            },
            {
                name: "Asociaciones [emoji]",
                value: "</asociaciones tuyas:1341827712402329663>\n> Permisos: <@&1107329826982989906>es y superior.\n> Uso: `/asociaciones tuyas`\n\n</asociaciones lista:1341827712402329663>\n> Permisos: <@&1107329826982989906>es y superior.\n> Uso: `/asociaciones lista`\n\n</asociaciones leaderboard:1341827712402329663>\n> Permisos: <@&1107329826982989906>es y superior.\n> Uso: `/asociaciones leaderboard`\n\n</asociaciones agregar:1341827712402329663>\n> Permisos: <@&1202685031219200040>es y superior.\n> Uso: `/asociaciones agregar <nombre> <categoria> <dias> <representante>`\n\n</asociaciones agregar-manual:1341827712402329663>\n> Permisos: <@&1202685031219200040>es y superior.\n> Uso: `/asociaciones agregar-manual <canal> <dias> <representante>`\n\n</asociaciones remove:1341827712402329663>\n> Permisos: <@&1202685031219200040>es y superior.\n> Uso: `/asociaciones remove <canal>`\n\n</asociaciones editar:1341827712402329663>\n> Permisos: <@&1202685031219200040>es y superior.\n> Uso: `/asociaciones editar <canal> [encargado] [dias] [representante]`",
                inline: false,
            },
            {
                name: "Sorteos <a:11pm_giveaway1:1070822226003234906>",
                value: "Para realizar sorteos es necesario el rol de <@&1222993479110492264> que debe ser pedido al equipo administrativo.\n\n`a!gstart`\n> Permisos: <@&1222993479110492264> y superior.\n> Uso: `.a!gstart <duración> <ganadores> <premio>`\n\n`a!greroll`\n> Permisos: <@&1222993479110492264> y superior.\n> Uso: `.a!greroll`\n\n`a!gend`\n> Permisos: <@&1222993479110492264> y superior.\n> Uso: `.a!gend`",
                inline: false,
            },
            {
                name: "Otros <a:eyethinkyouneedtocalmdown:1299594545180446742> ",
                value: "`.leaderboard wlc`\n> Permisos: todos los miembros del servidor.\n> Uso: `.leaderboard wlc`\n\n`.form`\n> Permisos: todos los miembros del servidor.\n> Uso: `.form`\n\n`t!revivirchat`\n> Permisos: <@&1107331844866846770> y superior.\n> Uso: `t!revivirchat <mensaje>`",
                inline: false,
            },
        ),
];
message.channel.send({ embeds: embeds })
        }
    }
 };