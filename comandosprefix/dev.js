const { EmbedBuilder } = require("discord.js");
const { exec } = require("child_process");

module.exports = {
    name: "dev",
    aliases: ["mbot"],
    args: true,
    run: async (message, client, args) => {
        if (!message.member.permissions.has("Administrator")) {
            return message.reply("No tienes permisos para usar este comando.");
        }

        const subcommand = args[0]?.toLowerCase();

        if (subcommand === "reiniciar") {
            const embed = new EmbedBuilder()
                .setTitle("Reiniciando el bot")
                .setColor("#00ff99")
                .setDescription("Reiniciando el bot en 2 segundos...");
            await message.channel.send({ embeds: [embed] });

            setTimeout(() => {
                exec("pm2 restart 12", (error, stdout, stderr) => {
                    if (error) {
                        return message.channel.send(`Error al reiniciar con PM2: \`${error.message}\``);
                    }
                    if (stderr) {
                        return message.channel.send(`stderr: \`${stderr}\``);
                    }
                    message.channel.send(`Bot reiniciado con PM2:\n\`\`\`bash\n${stdout}\n\`\`\``);
                });
            }, 2000);
        } else if (subcommand === "git") {
            const embed = new EmbedBuilder()
                .setTitle("Actualizando desde Git")
                .setColor("#00ff99")
                .setDescription("Obteniendo los últimos cambios del repositorio...");
            await message.channel.send({ embeds: [embed] });

            exec("git pull", (error, stdout, stderr) => {
                if (error) {
                    return message.channel.send(`Error: \`${error.message}\``);
                }
                if (stderr) {
                    return message.channel.send(`stderr: \`${stderr}\``);
                }
                message.channel.send(`\`\`\`bash\n${stdout}\n\`\`\``);
            });
        } else if (subcommand === "logs") {
            const embed = new EmbedBuilder()
                .setTitle("Mostrando logs de PM2")
                .setColor("#00ff99")
                .setDescription("Obteniendo los últimos 20 registros del bot...");
            await message.channel.send({ embeds: [embed] });

            exec("pm2 logs 12 --lines 20 --nostream", (error, stdout, stderr) => {
                if (error) {
                    return message.channel.send(`Error al obtener logs de PM2: \`${error.message}\``);
                }
                if (stderr) {
                    return message.channel.send(`stderr: \`${stderr}\``);
                }
                // Limita la longitud del mensaje para Discord (máx 2000 caracteres)
                const output = stdout.length > 1900 ? stdout.slice(-1900) : stdout;
                message.channel.send(`\`\`\`bash\n${output}\n\`\`\``);
            });
        } else if (subcommand === "help") {
            const embed = new EmbedBuilder()
                .setTitle("Comandos de administración del bot")
                .setColor("#9f38f1")
                .setDescription("Lista de subcomandos disponibles para `dev`:")
                .addFields(
                    { name: "reiniciar", value: "Reinicia el bot usando PM2." },
                    { name: "git", value: "Hace git pull para traer los últimos cambios del repositorio." },
                    { name: "logs", value: "Muestra los últimos 20 logs del proceso PM2 del bot." },
                    { name: "help", value: "Muestra este mensaje de ayuda." }
                );
            await message.channel.send({ embeds: [embed] });
        } else {
            message.reply("Comando no reconocido. Usa `reiniciar`, `git`, `logs` o `help`.");
        }
    }
};