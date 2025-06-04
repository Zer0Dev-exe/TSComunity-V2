const { SlashCommandBuilder } = require('discord.js');
const apiTokenData = require('../../Esquemas/apiTokenSchema');

const MAIN_DEV = '817515739711406140';

// Simple random token generator
function generateToken(length = 64) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < length; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('token')
        .setDescription('Manage API tokens (owner only)')
        .addSubcommand(sub =>
            sub.setName('create')
                .setDescription('Create a new API token')
                .addUserOption(opt => opt.setName('usuario').setDescription('Selecciona un usuario').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('update')
                .setDescription('Update an existing API token')
                .addUserOption(opt => opt.setName('usuario').setDescription('Selecciona un usuario').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('delete')
                .setDescription('Delete an API token')
                .addUserOption(opt => opt.setName('usuario').setDescription('Selecciona un usuario').setRequired(true))
        ),

    async execute(interaction) {
        if (interaction.user.id !== MAIN_DEV) {
            return interaction.reply({ content: 'No tienes permiso para usar este comando.', ephemeral: true });
        }

        const sub = interaction.options.getSubcommand();
        const usuarioObj = interaction.options.getUser('usuario');
        const usuario = usuarioObj.id;

        if (sub === 'create') {
            const existing = await apiTokenData.findOne({ Usuario: usuario });
            if (existing) {
                return interaction.reply({ content: 'Este usuario ya tiene un token asignado.', ephemeral: true });
            }
            const token = generateToken();
            await apiTokenData.create({ Usuario: usuario, Token: token });
            try {
                await usuarioObj.send(`✅ **Se te ha asignado un nuevo token:**\n\`${token}\``);
            } catch (err) {
                return interaction.reply({ content: 'No pude enviarle DM al usuario (puede que tenga los DMs cerrados).', ephemeral: true });
            }
            return interaction.reply({ content: 'Token creado y enviado por DM al usuario seleccionado.', ephemeral: true });
        }

        if (sub === 'update') {
            const token = generateToken();
            const updated = await apiTokenData.findOneAndUpdate(
                { Usuario: usuario },
                { Token: token },
                { new: true }
            );
            if (!updated) {
                return interaction.reply({ content: 'Usuario no encontrado en la base de datos.', ephemeral: true });
            }
            try {
                await usuarioObj.send(`🔄 **Tu token ha sido actualizado:**\n\`${token}\``);
            } catch (err) {
                return interaction.reply({ content: 'No pude enviarle DM al usuario (puede que tenga los DMs cerrados).', ephemeral: true });
            }
            return interaction.reply({ content: 'Token actualizado y enviado por DM al usuario seleccionado.', ephemeral: true });
        }

        if (sub === 'delete') {
            const deleted = await apiTokenData.findOneAndDelete({ Usuario: usuario });
            if (!deleted) {
                return interaction.reply({ content: 'Usuario no encontrado en la base de datos.', ephemeral: true });
            }
            try {
                await usuarioObj.send(`❌ **Tu token ha sido eliminado.** Si crees que esto es un error, contacta al soporte.`);
            } catch (err) {
                return interaction.reply({ content: 'No pude enviarle DM al usuario (puede que tenga los DMs cerrados).', ephemeral: true });
            }
            return interaction.reply({ content: 'Token eliminado y notificado por DM al usuario seleccionado.', ephemeral: true });
        }
    }
};
