const { MessageFlags, PermissionsBitField } = require('discord.js');
const Asociacion = require('../Esquemas/asociacionesSchema');

// CONFIG — reemplaza estos IDs por los de tu servidor
const GUILD_ID = '1093864130030612521';
const TARGET_CATEGORY_IDS = ['1217154240175407196', '1267736691083317300']; // mismas categorías
const STAFF_ROLE_IDS = ['1107331844866846770', '1107329826982989906', '1202685031219200040', '1363927756617941154']; // roles que pueden ver canales de staff

// ajustes por defecto
const STAFF_CHANNEL_PREFIX = 'staff-';
const DELAY_BETWEEN_REQUESTS_MS = 1000;
const DELAY_BETWEEN_CREATES_MS = 1500;
const LIMIT_FETCH_MESSAGES = 20;

/**
 * Sleep util
 * @param {number} ms
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Crea permisos para que solo el staff pueda ver el canal
 * @param {Guild} guild 
 * @returns {Array} array de overwrites
 */
function createStaffOnlyPermissions(guild) {
  const overwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionsBitField.Flags.ViewChannel]
    }
  ];

  // dar permisos a roles de staff
  STAFF_ROLE_IDS.forEach(roleId => {
    overwrites.push({
      id: roleId,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory
      ]
    });
  });

  return overwrites;
}

/**
 * Organiza canales por staff dentro de las mismas categorías
 * Distribuje equitativamente entre las categorías disponibles
 *
 * @param {Client} client
 */
async function organizaPorStaff(client) {
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    if (!guild) throw new Error('Guild no encontrado');

    const me = guild.members.me || (await guild.members.fetch(client.user.id));
    const canManageChannels = me.permissions.has('ManageChannels');
    if (!canManageChannels) {
      console.warn('El bot NO tiene ManageChannels; crear/mover canales puede fallar.');
      return;
    }

    console.log('🚀 Iniciando organización por staff...');

    // 1) Obtener todos los canales de las categorías fuente (excluyendo canales de staff)
    const sourceChannels = guild.channels.cache.filter(ch => 
      ch.isTextBased() && 
      ch.type === 0 && 
      TARGET_CATEGORY_IDS.includes(ch.parentId) &&
      !ch.name.startsWith(STAFF_CHANNEL_PREFIX)
    );

    if (sourceChannels.size === 0) {
      console.log('❌ No se encontraron canales para organizar.');
      return [];
    }

    console.log(`📋 Encontrados ${sourceChannels.size} canales para organizar`);

    // 2) Obtener asociaciones de la base de datos
    const canalIds = Array.from(sourceChannels.keys());
    const asociacionesDB = await Asociacion.find({ Canal: { $in: canalIds } });
    const associationByChannel = new Map(asociacionesDB.map(a => [String(a.Canal), a]));

    console.log(`🗄️ Encontradas ${asociacionesDB.length} asociaciones en BD`);

    // 3) Agrupar canales por staff asignado
    const gruposAsignados = new Map();
    const canalesSinAsignar = [];

    for (const [, ch] of sourceChannels) {
      const aso = associationByChannel.get(ch.id);
      
      if (aso && aso.Asignado) {
        const staffId = String(aso.Asignado);
        if (!gruposAsignados.has(staffId)) gruposAsignados.set(staffId, []);
        gruposAsignados.get(staffId).push(ch);
      } else {
        canalesSinAsignar.push(ch);
      }
    }

    console.log(`📊 Grupos: ${gruposAsignados.size} staff asignados, ${canalesSinAsignar.length} sin asignar`);

    const results = [];
    let positionCounter = 0;

    // 4) Procesar canales asignados (distribuir entre categorías)
    const sortedStaffKeys = Array.from(gruposAsignados.keys()).sort((a, b) => {
      if (/^\d+$/.test(a) && /^\d+$/.test(b)) {
        return a.localeCompare(b, undefined, { numeric: true });
      }
      return String(a).localeCompare(String(b));
    });

    for (let i = 0; i < sortedStaffKeys.length; i++) {
      const staffId = sortedStaffKeys[i];
      const channelsOfStaff = gruposAsignados.get(staffId);
      
      // Distribuir equitativamente entre las categorías
      const targetCategoryId = TARGET_CATEGORY_IDS[i % TARGET_CATEGORY_IDS.length];
      
      console.log(`👤 Procesando staff ${staffId} con ${channelsOfStaff.length} canales en categoría ${targetCategoryId}`);

      // Obtener información del miembro del staff
      let staffMember = null;
      let staffDisplayName = staffId;
      try {
        staffMember = await guild.members.fetch(staffId);
        staffDisplayName = staffMember.displayName || staffMember.user.username;
      } catch (e) {
        console.warn(`No se pudo obtener info del staff ${staffId}:`, e.message);
      }

      // Crear nombre del canal de staff
      const sanitized = staffDisplayName.toLowerCase()
        .replace(/[^a-z0-9-_]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80);
      const staffChannelName = `${STAFF_CHANNEL_PREFIX}${sanitized}`;

      // 5) Crear o encontrar canal de staff en la categoría correspondiente
      let staffChannel = guild.channels.cache.find(ch => 
        ch.name === staffChannelName && 
        ch.type === 0 &&
        ch.parentId === targetCategoryId
      );

      if (!staffChannel) {
        console.log(`🔨 Creando canal de staff: ${staffChannelName} en categoría ${targetCategoryId}`);
        try {
          staffChannel = await guild.channels.create({
            name: staffChannelName,
            type: 0,
            parent: targetCategoryId,
            topic: `📋 Canales asignados a ${staffDisplayName}`,
            reason: 'Canal de organización por staff',
            permissionOverwrites: createStaffOnlyPermissions(guild),
            position: positionCounter++
          });
          
          await sleep(DELAY_BETWEEN_CREATES_MS);
        } catch (e) {
          console.error(`❌ Error creando canal de staff ${staffChannelName}:`, e);
          continue;
        }
      } else {
        // Actualizar canal existente
        try {
          await staffChannel.setTopic(`📋 Canales asignados a ${staffDisplayName}`);
          await sleep(DELAY_BETWEEN_REQUESTS_MS);
          
          await staffChannel.permissionOverwrites.set(createStaffOnlyPermissions(guild));
          await sleep(DELAY_BETWEEN_REQUESTS_MS);

          // Mover al inicio de la categoría si no está ahí
          await staffChannel.setPosition(positionCounter++);
          await sleep(DELAY_BETWEEN_REQUESTS_MS);
        } catch (e) {
          console.warn(`⚠️ Error actualizando canal de staff ${staffChannelName}:`, e);
        }
      }

      // 6) Mover canales del staff a la misma categoría (después del canal organizador)
      let movedCount = 0;
      for (const channel of channelsOfStaff) {
        if (channel.parentId !== targetCategoryId) {
          try {
            console.log(`📦 Moviendo canal ${channel.name} a categoría ${targetCategoryId}`);
            await channel.setParent(targetCategoryId, { lockPermissions: false });
            movedCount++;
            await sleep(DELAY_BETWEEN_REQUESTS_MS);
          } catch {
            console.warn(`📦 Error moviendo canal ${channel.name} a categoría ${targetCategoryId}`)
          }
          
          // Posicionar después del canal de staff
          try {
            await channel.setPosition(positionCounter++);
            await sleep(DELAY_BETWEEN_REQUESTS_MS);
          } catch (e) {
            console.warn(`⚠️ Error posicionando canal ${channel.name}:`, e);
          }
        } else {
          // Si ya está en la categoría correcta, solo reposicionar
          try {
            await channel.setPosition(positionCounter++);
            await sleep(DELAY_BETWEEN_REQUESTS_MS);
          } catch (e) {
            console.warn(`⚠️ Error reposicionando canal ${channel.name}:`, e);
          }
        }
      }

      // 7) Actualizar mensaje en canal de staff
      try {
        const lines = channelsOfStaff.map(c => `• <#${c.id}> — \`${c.name}\``);
        const content = `**📋 Canales de ${staffDisplayName}**\n\n${lines.length ? lines.join('\n') : '_Ningún canal asignado_'}\n\n*Total: ${lines.length} canales*`;

        const fetched = await staffChannel.messages.fetch({ limit: LIMIT_FETCH_MESSAGES }).catch(() => null);
        let botMsg = null;
        if (fetched) botMsg = fetched.find(m => m.author.id === client.user.id);

        if (botMsg) {
          await botMsg.edit({ content });
        } else {
          await staffChannel.send({ content });
        }

        await sleep(DELAY_BETWEEN_REQUESTS_MS);
      } catch (err) {
        console.error(`❌ Error actualizando mensaje en canal de staff ${staffChannelName}:`, err);
      }

      results.push({
        staffId,
        staffDisplayName,
        staffChannelId: staffChannel.id,
        staffChannelName,
        assignedChannelsCount: channelsOfStaff.length,
        movedChannelsCount: movedCount,
        targetCategory: targetCategoryId,
        category: 'assigned'
      });
    }

    // 8) Procesar canales sin asignar AL FINAL de la última categoría
    if (canalesSinAsignar.length > 0) {
      const lastCategoryId = TARGET_CATEGORY_IDS[TARGET_CATEGORY_IDS.length - 1];
      
      console.log(`❓ Procesando ${canalesSinAsignar.length} canales sin asignar en última categoría: ${lastCategoryId}`);

      const unassignedChannelName = `${STAFF_CHANNEL_PREFIX}sin-asignar`;

      // Crear o encontrar canal de sin asignar en la última categoría
      let unassignedChannel = guild.channels.cache.find(ch => 
        ch.name === unassignedChannelName && 
        ch.type === 0 &&
        ch.parentId === lastCategoryId
      );

      if (!unassignedChannel) {
        console.log(`🔨 Creando canal sin asignar: ${unassignedChannelName}`);
        try {
          unassignedChannel = await guild.channels.create({
            name: unassignedChannelName,
            type: 0,
            parent: lastCategoryId,
            topic: '📋 Canales sin asignar a ningún staff',
            reason: 'Canal de organización para canales sin asignar',
            permissionOverwrites: createStaffOnlyPermissions(guild),
            position: positionCounter++
          });
          
          await sleep(DELAY_BETWEEN_CREATES_MS);
        } catch (e) {
          console.error(`❌ Error creando canal sin asignar:`, e);
        }
      } else {
        // Actualizar canal existente y mover al final
        try {
          await unassignedChannel.setTopic('📋 Canales sin asignar a ningún staff');
          await sleep(DELAY_BETWEEN_REQUESTS_MS);
          
          await unassignedChannel.permissionOverwrites.set(createStaffOnlyPermissions(guild));
          await sleep(DELAY_BETWEEN_REQUESTS_MS);

          // Posicionar al final de todo
          await unassignedChannel.setPosition(positionCounter++);
          await sleep(DELAY_BETWEEN_REQUESTS_MS);
        } catch (e) {
          console.warn(`⚠️ Error actualizando canal sin asignar:`, e);
        }
      }

      // Mover canales sin asignar a la última categoría y posicionarlos al final
      let movedUnassignedCount = 0;
      for (const channel of canalesSinAsignar) {
        try {
          if (channel.parentId !== lastCategoryId) {
            console.log(`📦 Moviendo canal sin asignar ${channel.name} a última categoría`);
            await channel.setParent(lastCategoryId, { lockPermissions: false });
            movedUnassignedCount++;
            await sleep(DELAY_BETWEEN_REQUESTS_MS);
          }
          
          // Posicionar al final
          await channel.setPosition(positionCounter++);
          await sleep(DELAY_BETWEEN_REQUESTS_MS);
        } catch (e) {
          console.error(`❌ Error moviendo canal sin asignar ${channel.name}:`, e);
        }
      }

      // Actualizar mensaje en canal sin asignar
      if (unassignedChannel) {
        try {
          const lines = canalesSinAsignar.map(c => `• <#${c.id}> — \`${c.name}\``);
          const content = `**❓ Canales Sin Asignar**\n\n${lines.length ? lines.join('\n') : '_No hay canales sin asignar_'}\n\n*Total: ${lines.length} canales*`;

          const fetched = await unassignedChannel.messages.fetch({ limit: LIMIT_FETCH_MESSAGES }).catch(() => null);
          let botMsg = null;
          if (fetched) botMsg = fetched.find(m => m.author.id === client.user.id);

          if (botMsg) {
            await botMsg.edit({ content });
          } else {
            await unassignedChannel.send({ content });
          }

          await sleep(DELAY_BETWEEN_REQUESTS_MS);
        } catch (err) {
          console.error(`❌ Error actualizando mensaje en canal sin asignar:`, err);
        }
      }

      results.push({
        staffId: 'unassigned',
        staffDisplayName: 'Sin Asignar',
        staffChannelId: unassignedChannel?.id,
        staffChannelName: unassignedChannelName,
        assignedChannelsCount: canalesSinAsignar.length,
        movedChannelsCount: movedUnassignedCount,
        targetCategory: lastCategoryId,
        category: 'unassigned'
      });
    }

    // 9) Limpiar canales de staff obsoletos
    await cleanupObsoleteStaffChannels(guild, results);

    console.log('✅ organizaPorStaff completado:');
    console.log(`   • ${results.filter(r => r.category === 'assigned').length} canales de staff asignados`);
    console.log(`   • ${results.filter(r => r.category === 'unassigned').length} canal sin asignar`);
    console.log(`   • Total canales organizados: ${results.reduce((sum, r) => sum + r.assignedChannelsCount, 0)}`);
    console.log(`   • Distribución por categorías:`);
    
    TARGET_CATEGORY_IDS.forEach(catId => {
      const countInCat = results.filter(r => r.targetCategory === catId).length;
      console.log(`     - Categoría ${catId}: ${countInCat} grupos`);
    });

    return results;
  } catch (error) {
    console.error('❌ Error en organizaPorStaff:', error);
    throw error;
  }
}

/**
 * Limpia canales de staff que ya no tienen canales asignados
 * @param {Guild} guild 
 * @param {Array} currentResults 
 */
async function cleanupObsoleteStaffChannels(guild, currentResults) {
  try {
    console.log('🧹 Limpiando canales de staff obsoletos...');
    
    const activeStaffChannelIds = new Set(currentResults.map(r => r.staffChannelId).filter(Boolean));
    
    // Buscar todos los canales que empiecen con el prefijo de staff en las categorías target
    const allStaffChannels = guild.channels.cache.filter(ch => 
      ch.type === 0 && 
      ch.name.startsWith(STAFF_CHANNEL_PREFIX) &&
      TARGET_CATEGORY_IDS.includes(ch.parentId)
    );

    for (const [, staffChannel] of allStaffChannels) {
      if (!activeStaffChannelIds.has(staffChannel.id)) {
        // Este canal de staff ya no tiene canales asignados
        try {
          console.log(`🗑️ Eliminando canal de staff obsoleto: ${staffChannel.name}`);
          await staffChannel.delete('Canal de staff sin canales asignados');
          await sleep(DELAY_BETWEEN_REQUESTS_MS);
        } catch (e) {
          console.warn(`⚠️ No se pudo eliminar canal obsoleto ${staffChannel.name}:`, e);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error en cleanup de canales obsoletos:', error);
  }
}

module.exports = organizaPorStaff;