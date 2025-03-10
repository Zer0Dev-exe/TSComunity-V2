const { EmbedBuilder } = require("discord.js");
const { exec } = require('child_process');

module.exports = {
    name: "fullmongo",
    aliases: ["uyip"],
    args: false,
    run: async (message, client, args) => {
        const projectName = args.toString(); // Nombre del proyecto recibido en los argumentos
        const username = "admin"; // Nombre del usuario
        const password = "TSMongoAtlasAdmin"; // Contraseña del usuario
        const ipAddress = "0.0.0.0/0"; // Permitir acceso desde cualquier lugar
        const clusterName = "ClusterAlemania"; // Nombre del cluster
        const region = "EU_CENTRAL_1"; // Región de Frankfurt

        // Crear el embed inicial con los primeros campos
        let embed = new EmbedBuilder()
            .setTitle("Progreso de Creación en MongoDB Atlas")
            .setDescription("Iniciando la creación del proyecto y configuraciones...")
            .setColor('Yellow')  // Color inicial mientras se está procesando
            .setTimestamp();

        // Enviar el mensaje con el embed inicial
        const sentMessage = await message.reply({ embeds: [embed] });

        // Crear el proyecto en Atlas
        exec(`atlas projects create ${projectName}`, (error, stdout, stderr) => {
            if (error || stderr) {
                console.error(`Error al crear el proyecto: ${error || stderr}`);
                embed.addFields({ name: 'Paso 1: Crear Proyecto', value: '❌ Error al crear el proyecto.', inline: true });
                embed.setColor('Red'); // Cambiar a rojo si hay error
                return sentMessage.edit({ embeds: [embed] });
            }

            try {
                const response = JSON.parse(stdout);
                const newProjectId = response.id;

                if (newProjectId) {
                    embed.addFields({ name: 'Paso 1: Crear Proyecto', value: '✅ Proyecto creado exitosamente.', inline: true });
                    sentMessage.edit({ embeds: [embed] });

                    // Comando para crear el cluster
                    const createClusterCommand = `atlas clusters create ${clusterName} --projectId ${newProjectId} --region ${region} --provider AWS --tier M0`;

                    exec(createClusterCommand, (clusterError, clusterStdout, clusterStderr) => {
                        if (clusterError || clusterStderr) {
                            console.error(`Error al crear el cluster: ${clusterError || clusterStderr}`);
                            embed.addFields({ name: 'Paso 2: Crear Cluster', value: '❌ Error al crear el cluster.', inline: true });
                            embed.setColor('Red'); // Cambiar a rojo si hay error
                            return sentMessage.edit({ embeds: [embed] });
                        }

                        embed.addFields({ name: 'Paso 2: Crear Cluster', value: '✅ Cluster creado exitosamente.', inline: true });
                        sentMessage.edit({ embeds: [embed] });

                        // Comando para añadir la IP al Access List
                        const addIpCommand = `atlas accessLists create ${ipAddress} --projectId ${newProjectId}`;

                        exec(addIpCommand, (ipError, ipStdout, ipStderr) => {
                            if (ipError || ipStderr) {
                                console.error(`Error al añadir IP: ${ipError || ipStderr}`);
                                embed.addFields({ name: 'Paso 3: Añadir IP al Access List', value: '❌ Error al añadir la IP.', inline: true });
                                embed.setColor('Red'); // Cambiar a rojo si hay error
                                return sentMessage.edit({ embeds: [embed] });
                            }

                            embed.addFields({ name: 'Paso 3: Añadir IP al Access List', value: '✅ IP añadida exitosamente.', inline: true });
                            sentMessage.edit({ embeds: [embed] });

                            // Comando para crear el usuario
                            const role = "atlasAdmin@admin"; // Rol de administrador global en Atlas
                            const addUserCommand = `atlas dbusers create --projectId ${newProjectId} --username ${username} --password ${password} --role "${role}"`;

                            exec(addUserCommand, (userError, userStdout, userStderr) => {
                                if (userError || userStderr) {
                                    console.error(`Error al crear el usuario: ${userError || userStderr}`);
                                    embed.addFields({ name: 'Paso 4: Crear Usuario', value: '❌ Error al crear el usuario.', inline: true });
                                    embed.setColor('Red'); // Cambiar a rojo si hay error
                                    return sentMessage.edit({ embeds: [embed] });
                                }

                                embed.addFields({ name: 'Paso 4: Crear Usuario', value: '✅ Usuario creado exitosamente.', inline: true });
                                embed.setColor('Green'); // Cambiar a verde si todo es exitoso
                                sentMessage.edit({ embeds: [embed] });

                                console.log(`Usuario creado: ${userStdout}`);
                            });
                        });
                    });
                } else {
                    embed.addFields({ name: 'Paso 1: Crear Proyecto', value: '❌ No se pudo obtener el ID del proyecto.', inline: true });
                    embed.setColor('Red');
                    sentMessage.edit({ embeds: [embed] });
                }
            } catch (err) {
                console.error("Error al parsear la salida del proyecto:", err);
                embed.addFields({ name: 'Paso 1: Crear Proyecto', value: '❌ Error al procesar la respuesta del proyecto.', inline: true });
                embed.setColor('Red');
                sentMessage.edit({ embeds: [embed] });
            }
        });
    }
};
