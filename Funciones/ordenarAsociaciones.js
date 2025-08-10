const {
  ActionRowBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  MediaComponentBuilder,
  ThumbnailBuilder,
  SectionBuilder,
  SeparatorBuilder,
  MessageFlags,
  EmbedBuilder,
  PermissionsBitField
} = require('discord.js');

const Asociacion = require('../Esquemas/asociacionesSchema');

// CONFIG — reemplaza estos IDs por los de tu servidor
const GUILD_ID = '1093864130030612521';
const TARGET_CATEGORY_IDS = ['1217154240175407196', '1267736691083317300']; // mismas categorías
const STAFF_ROLE_IDS = ['1107331844866846770', '1107329826982989906', '1202685031219200040', '1363927756617941154']; // roles que pueden ver canales de staff

// ajustes por defecto - MÁS CONSERVADORES PARA EVITAR RATE LIMITS
const STAFF_CHANNEL_PREFIX = 'staff-';
const DELAY_BETWEEN_REQUESTS_MS = 2000;  // 2 segundos (era 1)
const DELAY_BETWEEN_CREATES_MS = 3000;   // 3 segundos (era 1.5)
const DELAY_BETWEEN_MOVES_MS = 2500;     // 2.5 segundos para moves críticos
const LIMIT_FETCH_MESSAGES = 20;

// MUTEX para evitar ejecuciones simultáneas
let organizationInProgress = false;

/**
 * Sleep util
 * @param {number} ms
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Crea un container para mostrar las asociaciones de un staff
 * @param {Array} asociaciones - Array de asociaciones del staff
 * @param {String} staffId - ID del staff o 'SinAsignar'
 * @param {String} staffDisplayName - Nombre para mostrar del staff
 * @param {Array} sortedChannels - Canales ordenados alfabéticamente
 * @returns {ContainerBuilder} Container formateado
 */
function createContainerForStaff(asociaciones, staffId, staffDisplayName, sortedChannels) {
  const isUnassigned = staffId === 'unassigned' || staffId === 'SinAsignar';
  
  const container = new ContainerBuilder()
    .setAccentColor(isUnassigned ? 0xffcc00 : 0x00b0f4)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        isUnassigned
          ? `### 📋 Sin asignar — ${asociaciones.length}`
          : `### 📌 <@${staffId}> — ${asociaciones.length}`
      )
    );

  if (!asociaciones || asociaciones.length === 0) {
    container
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          isUnassigned
            ? 'No hay asociaciones sin asignar.'
            : 'El usuario no tiene asociaciones.'
        )
      );
    return container;
  }

  // Crear un mapa de asociaciones por canal para acceso rápido
  const asoByChannel = new Map(asociaciones.map(a => [String(a.Canal), a]));
  
  // Usar el orden de sortedChannels para mantener consistencia
  for (let i = 0; i < sortedChannels.length; i++) {
    const channel = sortedChannels[i];
    const aso = asoByChannel.get(channel.id);
    
    if (!aso) continue; // Skip si no hay asociación
    
    if (!isUnassigned) {
      // Para staff asignado - mostrar toda la info
  const renovacionTimestamp = aso.UltimaRenovacion
  ? Math.floor(
      (new Date(aso.UltimaRenovacion).getTime() + aso.Renovacion * 24 * 60 * 60 * 1000) / 1000
    )
  : null;

      container
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            [
              aso.Canal ? `<:canales:1340014379080618035> <#${aso.Canal}>` : '<:canales:1340014379080618035> Sin canal',
              aso.Renovacion ? `🗓️ <t:${renovacionTimestamp}:R>` : '🗓️ No definido',
              aso.Representante ? `<:representante:1340014390342193252> <@${aso.Representante}>` : '<:representante:1340014390342193252> Sin representante'
            ].join('\n')
          )
        );
    } else {
      // Para sin asignar - solo mostrar canal
      container
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `${aso.Canal ? `<:canales:1340014379080618035> <#${aso.Canal}>` : '<:canales:1340014379080618035> Sin canal'}`
          )
        );
    }
  }

  return container;
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
        PermissionsBitField.Flags.ReadMessageHistory
      ],
      deny: [
        PermissionsBitField.Flags.SendMessages,
      ]
    });
  });

  return overwrites;
}

/**
 * Organiza un grupo de canales (staff + sus canales asignados) en una posición específica
 * @param {Guild} guild
 * @param {Object} staffInfo - Info del staff
 * @param {Array} channelsOfStaff - Canales asignados al staff
 * @param {String} targetCategoryId - ID de la categoría destino
 * @param {Number} startPosition - Posición inicial donde colocar el grupo
 * @param {Map} associationByChannel - Mapa de asociaciones
 * @returns {Object} Información del resultado
 */
async function organizeStaffGroup(guild, staffInfo, channelsOfStaff, targetCategoryId, startPosition, associationByChannel) {
  const { staffId, staffDisplayName } = staffInfo;
  
  console.log(`👤 Organizando grupo de ${staffDisplayName} en posición ${startPosition} (${channelsOfStaff.length} canales)`);
  
  // 1) Crear nombre del canal de staff
  const staffChannelName = `${STAFF_CHANNEL_PREFIX}${staffDisplayName}`
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);

  // 2) Crear o encontrar canal de staff
  let staffChannel = guild.channels.cache.find(ch => 
    ch.name === staffChannelName && 
    ch.type === 0 &&
    ch.parentId === targetCategoryId
  );

  if (!staffChannel) {
    console.log(`🔨 Creando canal de staff: ${staffChannelName}`);
    try {
      staffChannel = await guild.channels.create({
        name: staffChannelName,
        type: 0,
        parent: targetCategoryId,
        position: startPosition,
        topic: `📋 Canales asignados a ${staffDisplayName}`,
        reason: 'Canal de organización por staff',
        permissionOverwrites: createStaffOnlyPermissions(guild)
      });
      
      await sleep(DELAY_BETWEEN_CREATES_MS);
    } catch (e) {
      console.error(`❌ Error creando canal de staff ${staffChannelName}:`, e);
      return null;
    }
  } else {
    // Mover y actualizar canal existente
    try {
      console.log(`📍 Posicionando canal staff ${staffChannelName} en ${startPosition}`);
      await staffChannel.setPosition(startPosition);
      await sleep(DELAY_BETWEEN_REQUESTS_MS);
      
      await staffChannel.setTopic(`📋 Canales asignados a ${staffDisplayName}`);
      await sleep(DELAY_BETWEEN_REQUESTS_MS);
      
      await staffChannel.permissionOverwrites.set(createStaffOnlyPermissions(guild));
      await sleep(DELAY_BETWEEN_REQUESTS_MS);
    } catch (e) {
      console.warn(`⚠️ Error actualizando canal de staff ${staffChannelName}:`, e);
    }
  }

  // 3) Ordenar canales alfabéticamente (con limpieza de emojis)
  const sortedChannels = channelsOfStaff.sort((a, b) => {
    // Extraer el nombre sin emojis para ordenar correctamente
    const nameA = a.name.replace(/[^\w\s-]/g, '').trim() || a.name;
    const nameB = b.name.replace(/[^\w\s-]/g, '').trim() || b.name;
    return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
  });

  console.log(`📝 Orden alfabético para ${staffDisplayName}:`, sortedChannels.map(ch => ch.name));

  // 4) Mover y posicionar cada canal en orden
  let currentPosition = startPosition + 1; // Después del canal de staff
  let movedCount = 0;

  for (const channel of sortedChannels) {
    try {
      // Primero mover a la categoría si no está ahí

        console.log(`📦 Moviendo ${channel.name} a categoría ${targetCategoryId}`);
        await channel.edit({
            parent: targetCategoryId,
            position: currentPosition
        });
        movedCount++;
        currentPosition++;
        await sleep(DELAY_BETWEEN_MOVES_MS); // Delay más largo para moves
      
    } catch (e) {
      console.error(`❌ Error procesando canal ${channel.name}:`, e);
      // Continuar con el siguiente canal en caso de error
    }
  }

  // 5) Actualizar mensaje en canal de staff
  try {
    const staffAsociaciones = [];
    for (const channel of sortedChannels) {
      const aso = associationByChannel.get(channel.id);
      if (aso) {
        staffAsociaciones.push(aso);
      }
    }
    
    console.log(`📋 Actualizando mensaje para ${staffDisplayName} con ${staffAsociaciones.length} asociaciones`);
    
    const container = createContainerForStaff(staffAsociaciones, staffId, staffDisplayName, sortedChannels);
    const messagePayload = { 
      components: [container], 
      flags: MessageFlags.IsComponentsV2 
    };

    const fetched = await staffChannel.messages.fetch({ limit: LIMIT_FETCH_MESSAGES }).catch(() => null);
    let botMsg = null;
    if (fetched) botMsg = fetched.find(m => m.author.id === guild.client.user.id);

    if (botMsg) {
      console.log(`✏️ Editando mensaje existente en ${staffChannelName}`);
      await botMsg.edit(messagePayload);
    } else {
      console.log(`📝 Enviando nuevo mensaje en ${staffChannelName}`);
      await staffChannel.send(messagePayload);
    }
    
    await sleep(DELAY_BETWEEN_REQUESTS_MS);

  } catch (err) {
    console.error(`❌ Error actualizando mensaje para ${staffDisplayName}:`, err);
  }

  return {
    staffId,
    staffDisplayName,
    staffChannelId: staffChannel.id,
    staffChannelName,
    assignedChannelsCount: channelsOfStaff.length,
    movedChannelsCount: movedCount,
    targetCategory: targetCategoryId,
    category: staffId === 'unassigned' ? 'unassigned' : 'assigned',
    finalPosition: currentPosition // La siguiente posición libre
  };
}

/**
 * Organiza canales por staff dentro de las mismas categorías
 * Distribuge equitativamente entre las categorías disponibles
 *
 * @param {Client} client
 */
async function organizaPorStaff(client) {
  // MUTEX: Evitar ejecuciones simultáneas
  if (organizationInProgress) {
    console.log('⏳ Organización ya en progreso, saltando ejecución...');
    return [];
  }
  
  organizationInProgress = true;
  const startTime = Date.now();
  console.log('🔒 Iniciando organización (mutex activado)');

  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    if (!guild) throw new Error('Guild no encontrado');

    const me = guild.members.me || (await guild.members.fetch(client.user.id));
    const canManageChannels = me.permissions.has('ManageChannels');
    if (!canManageChannels) {
      console.warn('El bot NO tiene ManageChannels; crear/mover canales puede fallar.');
      return [];
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

    // 4) Preparar información de staff
    const staffWithInfo = [];
    
    for (const staffId of gruposAsignados.keys()) {
      let staffMember = null;
      let staffDisplayName = staffId;
      
      try {
        staffMember = await guild.members.fetch(staffId);
        staffDisplayName = staffMember.displayName || staffMember.user.username;
      } catch (e) {
        console.warn(`No se pudo obtener info del staff ${staffId}:`, e.message);
      }
      
      staffWithInfo.push({
        staffId,
        staffDisplayName,
        channels: gruposAsignados.get(staffId)
      });
    }
    
    // Ordenar staff alfabéticamente por display name
    staffWithInfo.sort((a, b) => a.staffDisplayName.localeCompare(b.staffDisplayName, 'es', { sensitivity: 'base' }));
    
    console.log('📋 Orden alfabético de staff:', staffWithInfo.map(s => s.staffDisplayName));

    const results = [];

    // 5) Procesar cada categoría independientemente - AQUÍ ESTÁ LA CLAVE
    for (let catIndex = 0; catIndex < TARGET_CATEGORY_IDS.length; catIndex++) {
      const categoryId = TARGET_CATEGORY_IDS[catIndex];
      console.log(`\n🗂️ === PROCESANDO CATEGORÍA ${catIndex + 1}/${TARGET_CATEGORY_IDS.length}: ${categoryId} ===`);
      
      // Obtener staff asignados a esta categoría (distribución equitativa)
      const staffForThisCategory = staffWithInfo.filter((_, index) => index % TARGET_CATEGORY_IDS.length === catIndex);
      
      console.log(`👥 Staff en esta categoría:`, staffForThisCategory.map(s => s.staffDisplayName));
      
      // *** CLAVE: CADA CATEGORÍA EMPIEZA DESDE POSICIÓN 0 ***
      let currentPosition = 0; // ← ESTO ES LO IMPORTANTE
      
      // Procesar cada staff en esta categoría
      for (const staffInfo of staffForThisCategory) {
        console.log(`\n📍 Procesando ${staffInfo.staffDisplayName} desde posición ${currentPosition}`);
        
        const result = await organizeStaffGroup(
          guild, 
          staffInfo, 
          staffInfo.channels, 
          categoryId, 
          currentPosition, 
          associationByChannel
        );
        
        if (result) {
          results.push(result);
          currentPosition = result.finalPosition; // Siguiente posición libre
          console.log(`✅ ${staffInfo.staffDisplayName} completado. Próxima posición: ${currentPosition}`);
        }
      }
      
      console.log(`🏁 Categoría ${categoryId} completada con ${staffForThisCategory.length} grupos`);
    }

    // 6) Procesar canales sin asignar AL FINAL de la última categoría
    if (canalesSinAsignar.length > 0) {
      const lastCategoryId = TARGET_CATEGORY_IDS[TARGET_CATEGORY_IDS.length - 1];
      console.log(`\n❓ === PROCESANDO SIN ASIGNAR EN ÚLTIMA CATEGORÍA: ${lastCategoryId} ===`);
      
      // Calcular posición inicial para sin asignar (después del último staff en esa categoría)
      const lastCategoryResults = results.filter(r => r.targetCategory === lastCategoryId);
      const lastPosition = lastCategoryResults.length > 0 
        ? Math.max(...lastCategoryResults.map(r => r.finalPosition || 0))
        : 0;
      
      console.log(`📍 Sin asignar empezará en posición ${lastPosition}`);
      
      const unassignedInfo = {
        staffId: 'unassigned',
        staffDisplayName: 'Sin Asignar'
      };
      
      const unassignedResult = await organizeStaffGroup(
        guild,
        unassignedInfo,
        canalesSinAsignar,
        lastCategoryId,
        lastPosition,
        associationByChannel
      );
      
      if (unassignedResult) {
        results.push(unassignedResult);
      }
    }

    // 7) Limpiar canales de staff obsoletos
    await cleanupObsoleteStaffChannels(guild, results);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ === ORGANIZACIÓN COMPLETADA EN ${duration}s ===`);
    console.log(`   • ${results.filter(r => r.category === 'assigned').length} canales de staff asignados`);
    console.log(`   • ${results.filter(r => r.category === 'unassigned').length} canal sin asignar`);
    console.log(`   • Total canales organizados: ${results.reduce((sum, r) => sum + r.assignedChannelsCount, 0)}`);
    console.log(`   • Distribución por categorías:`);
    
    TARGET_CATEGORY_IDS.forEach((catId, index) => {
      const countInCat = results.filter(r => r.targetCategory === catId).length;
      console.log(`     - Categoría ${index + 1} (${catId}): ${countInCat} grupos`);
    });

    return results;
  } catch (error) {
    console.error('❌ Error en organizaPorStaff:', error);
    throw error;
  } finally {
    organizationInProgress = false;
    console.log('🔓 Mutex liberado');
  }
}

/**
 * Limpia canales de staff que ya no tienen canales asignados
 * @param {Guild} guild 
 * @param {Array} currentResults 
 */
async function cleanupObsoleteStaffChannels(guild, currentResults) {
  try {
    console.log('\n🧹 Limpiando canales de staff obsoletos...');
    
    const activeStaffChannelIds = new Set(currentResults.map(r => r.staffChannelId).filter(Boolean));
    
    // Buscar todos los canales que empiecen con el prefijo de staff en las categorías target
    const allStaffChannels = guild.channels.cache.filter(ch => 
      ch.type === 0 && 
      ch.name.startsWith(STAFF_CHANNEL_PREFIX) &&
      TARGET_CATEGORY_IDS.includes(ch.parentId)
    );

    let removedCount = 0;
    for (const [, staffChannel] of allStaffChannels) {
      if (!activeStaffChannelIds.has(staffChannel.id)) {
        // Este canal de staff ya no tiene canales asignados
        try {
          console.log(`🗑️ Eliminando canal de staff obsoleto: ${staffChannel.name}`);
          await staffChannel.delete('Canal de staff sin canales asignados');
          removedCount++;
          await sleep(DELAY_BETWEEN_REQUESTS_MS);
        } catch (e) {
          console.warn(`⚠️ No se pudo eliminar canal obsoleto ${staffChannel.name}:`, e);
        }
      }
    }
    
    console.log(`✅ Limpieza completada: ${removedCount} canales eliminados`);
  } catch (error) {
    console.error('❌ Error en cleanup de canales obsoletos:', error);
  }
}

module.exports = organizaPorStaff;