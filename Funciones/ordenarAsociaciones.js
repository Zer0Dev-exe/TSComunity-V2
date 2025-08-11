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
const TARGET_CATEGORY_IDS = ['1217154240175407196', '1267736691083317300'];
const STAFF_ROLE_IDS = ['1107331844866846770', '1107329826982989906', '1202685031219200040', '1363927756617941154'];

// ajustes por defecto - MÁS CONSERVADORES PARA EVITAR RATE LIMITS
const STAFF_CHANNEL_PREFIX = 'staff-';
const DELAY_BETWEEN_REQUESTS_MS = 2000;
const DELAY_BETWEEN_CREATES_MS = 3000;
const DELAY_BETWEEN_MOVES_MS = 2500;
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

  const asoByChannel = new Map(asociaciones.map(a => [String(a.Canal), a]));
  
  for (let i = 0; i < sortedChannels.length; i++) {
    const channel = sortedChannels[i];
    const aso = asoByChannel.get(channel.id);
    
    if (!aso) continue;
    
    if (!isUnassigned) {
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
 */
function createStaffOnlyPermissions(guild) {
  const overwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionsBitField.Flags.ViewChannel]
    }
  ];

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
 * CORREGIDA para evitar conflictos de posición y asegurar orden correcto
 */
async function organizeStaffGroup(guild, staffInfo, channelsOfStaff, targetCategoryId, startPosition, associationByChannel) {
  const { staffId, staffDisplayName } = staffInfo;
  
  console.log(`👤 [${staffDisplayName}] Iniciando organización en categoría ${targetCategoryId}, posición ${startPosition}`);
  console.log(`   Canales a procesar: [${channelsOfStaff.map(ch => ch.name).join(', ')}]`);
  
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
    console.log(`🔨 [${staffDisplayName}] Creando canal de staff: ${staffChannelName}`);
    try {
      staffChannel = await guild.channels.create({
        name: staffChannelName,
        type: 0,
        parent: targetCategoryId,
        topic: `📋 Canales asignados a ${staffDisplayName}`,
        reason: 'Canal de organización por staff',
        permissionOverwrites: createStaffOnlyPermissions(guild)
      });
      
      await sleep(DELAY_BETWEEN_CREATES_MS);
      console.log(`✅ [${staffDisplayName}] Canal staff creado: ${staffChannel.id}`);
    } catch (e) {
      console.error(`❌ [${staffDisplayName}] Error creando canal de staff:`, e.message);
      return null;
    }
  } else {
    console.log(`📍 [${staffDisplayName}] Canal staff existente encontrado: ${staffChannel.id}`);
  }

  // 3) Ordenar canales alfabéticamente (MEJORADO)
  const sortedChannels = channelsOfStaff.sort((a, b) => {
    // Remover emojis y caracteres especiales para ordenar
    const cleanA = a.name.replace(/[^\w\s-]/g, '').trim().toLowerCase() || a.name.toLowerCase();
    const cleanB = b.name.replace(/[^\w\s-]/g, '').trim().toLowerCase() || b.name.toLowerCase();
    return cleanA.localeCompare(cleanB, 'es', { sensitivity: 'base', numeric: true });
  });

  console.log(`📝 [${staffDisplayName}] Orden alfabético determinado:`, sortedChannels.map(ch => `${ch.name}(${ch.id})`));

  // 4) PRIMERO: Mover todos los canales a la categoría correcta SIN posicionamiento
  console.log(`📦 [${staffDisplayName}] Moviendo ${sortedChannels.length} canales a categoría ${targetCategoryId}`);
  
  for (let i = 0; i < sortedChannels.length; i++) {
    const channel = sortedChannels[i];
    
    try {
      // Solo mover a la categoría si no está en la correcta
      if (channel.parentId !== targetCategoryId) {
        console.log(`   📦 Moviendo ${channel.name} desde categoría ${channel.parentId} → ${targetCategoryId}`);
        await channel.setParent(targetCategoryId, {
          reason: `Organizando canales de ${staffDisplayName}`
        });
        await sleep(DELAY_BETWEEN_MOVES_MS);
      } else {
        console.log(`   ✓ ${channel.name} ya está en la categoría correcta`);
      }
    } catch (e) {
      console.error(`❌ [${staffDisplayName}] Error moviendo ${channel.name} a categoría:`, e.message);
      continue; // Continuar con el siguiente
    }
  }

  // 5) SEGUNDO: Posicionar el canal de staff en la posición inicial
  try {
    console.log(`📍 [${staffDisplayName}] Posicionando canal staff en posición ${startPosition}`);
    await staffChannel.setPosition(startPosition, {
      reason: `Organizando por staff: ${staffDisplayName}`
    });
    await sleep(DELAY_BETWEEN_REQUESTS_MS);
  } catch (e) {
    console.error(`❌ [${staffDisplayName}] Error posicionando canal staff:`, e.message);
  }

  // 6) TERCERO: Posicionar cada canal en orden secuencial
  let currentPosition = startPosition + 1;
  let successfulMoves = 0;

  console.log(`📍 [${staffDisplayName}] Posicionando canales desde posición ${currentPosition}`);

  for (let i = 0; i < sortedChannels.length; i++) {
    const channel = sortedChannels[i];
    
    try {
      console.log(`   📍 Posicionando ${channel.name} en posición ${currentPosition}`);
      
      await channel.setPosition(currentPosition, {
        reason: `Organizando canales de ${staffDisplayName} - orden alfabético`
      });
      
      successfulMoves++;
      currentPosition++;
      await sleep(DELAY_BETWEEN_MOVES_MS);
      
    } catch (e) {
      console.error(`❌ [${staffDisplayName}] Error posicionando ${channel.name}:`, e.message);
      // IMPORTANTE: Incrementar posición incluso si falla para mantener consistencia
      currentPosition++;
    }
  }

  console.log(`✅ [${staffDisplayName}] Posicionamiento completado: ${successfulMoves}/${sortedChannels.length} canales movidos exitosamente`);

  // 7) Actualizar mensaje en canal de staff
  try {
    const staffAsociaciones = [];
    for (const channel of sortedChannels) {
      const aso = associationByChannel.get(channel.id);
      if (aso) {
        staffAsociaciones.push(aso);
      }
    }
    
    const container = createContainerForStaff(staffAsociaciones, staffId, staffDisplayName, sortedChannels);
    const messagePayload = { 
      components: [container], 
      flags: MessageFlags.IsComponentsV2 
    };

    const fetched = await staffChannel.messages.fetch({ limit: LIMIT_FETCH_MESSAGES }).catch(() => null);
    let botMsg = null;
    if (fetched) botMsg = fetched.find(m => m.author.id === guild.client.user.id);

    if (botMsg) {
      await botMsg.edit(messagePayload);
    } else {
      await staffChannel.send(messagePayload);
    }
    
    await sleep(DELAY_BETWEEN_REQUESTS_MS);
    console.log(`📝 [${staffDisplayName}] Mensaje actualizado con ${staffAsociaciones.length} asociaciones`);

  } catch (err) {
    console.error(`❌ [${staffDisplayName}] Error actualizando mensaje:`, err.message);
  }

  return {
    staffId,
    staffDisplayName,
    staffChannelId: staffChannel.id,
    staffChannelName,
    assignedChannelsCount: channelsOfStaff.length,
    movedChannelsCount: successfulMoves,
    targetCategory: targetCategoryId,
    category: staffId === 'unassigned' ? 'unassigned' : 'assigned',
    finalPosition: currentPosition // La siguiente posición libre
  };
}

/**
 * Organiza canales por staff dentro de las mismas categorías
 * CORREGIDA para mejor distribución y debugging
 */
async function organizaPorStaff(client) {
  if (organizationInProgress) {
    console.log('⏳ Organización ya en progreso, saltando ejecución...');
    return [];
  }
  
  organizationInProgress = true;
  const startTime = Date.now();
  console.log('🔒 === INICIANDO ORGANIZACIÓN POR STAFF ===');

  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    if (!guild) throw new Error('Guild no encontrado');

    const me = guild.members.me || (await guild.members.fetch(client.user.id));
    if (!me.permissions.has('ManageChannels')) {
      console.warn('⚠️ El bot NO tiene permisos ManageChannels');
      return [];
    }

    // 1) Obtener todos los canales válidos
    const sourceChannels = guild.channels.cache.filter(ch => 
      ch.isTextBased() && 
      ch.type === 0 && 
      TARGET_CATEGORY_IDS.includes(ch.parentId) &&
      !ch.name.startsWith(STAFF_CHANNEL_PREFIX)
    );

    console.log(`📋 Canales encontrados: ${sourceChannels.size} en categorías [${TARGET_CATEGORY_IDS.join(', ')}]`);
    
    if (sourceChannels.size === 0) {
      console.log('❌ No hay canales para organizar');
      return [];
    }

    // 2) Obtener asociaciones de BD
    const canalIds = Array.from(sourceChannels.keys());
    const asociacionesDB = await Asociacion.find({ Canal: { $in: canalIds } });
    const associationByChannel = new Map(asociacionesDB.map(a => [String(a.Canal), a]));

    console.log(`🗄️ Asociaciones en BD: ${asociacionesDB.length}/${sourceChannels.size} canales`);

    // 3) Agrupar por staff
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

    console.log(`📊 Distribución: ${gruposAsignados.size} staff con canales, ${canalesSinAsignar.length} sin asignar`);

    // 4) Preparar información de staff ordenada
    const staffWithInfo = [];
    
    for (const [staffId, channels] of gruposAsignados.entries()) {
      let staffDisplayName = staffId;
      
      try {
        const staffMember = await guild.members.fetch(staffId);
        staffDisplayName = staffMember.displayName || staffMember.user.username;
      } catch (e) {
        console.warn(`⚠️ No se pudo obtener info del staff ${staffId}: ${e.message}`);
      }
      
      staffWithInfo.push({
        staffId,
        staffDisplayName,
        channels
      });
    }
    
    // Ordenar alfabéticamente
    staffWithInfo.sort((a, b) => a.staffDisplayName.localeCompare(b.staffDisplayName, 'es', { sensitivity: 'base' }));
    
    console.log('👥 Staff ordenado:', staffWithInfo.map(s => `${s.staffDisplayName}(${s.channels.length})`));

    const results = [];

    // 5) DISTRIBUCIÓN MEJORADA: Asignar staff a categorías de forma equitativa
    console.log('\n🗂️ === DISTRIBUYENDO STAFF POR CATEGORÍAS ===');
    
    const categoryAssignments = new Map();
    TARGET_CATEGORY_IDS.forEach(catId => categoryAssignments.set(catId, []));
    
    // Distribución round-robin para balancear carga
    staffWithInfo.forEach((staff, index) => {
      const targetCategoryIndex = index % TARGET_CATEGORY_IDS.length;
      const targetCategoryId = TARGET_CATEGORY_IDS[targetCategoryIndex];
      categoryAssignments.get(targetCategoryId).push(staff);
      
      console.log(`   📌 ${staff.staffDisplayName} → Categoría ${targetCategoryIndex + 1} (${targetCategoryId})`);
    });

    // 6) Procesar cada categoría
    for (let catIndex = 0; catIndex < TARGET_CATEGORY_IDS.length; catIndex++) {
      const categoryId = TARGET_CATEGORY_IDS[catIndex];
      const staffInCategory = categoryAssignments.get(categoryId);
      
      console.log(`\n🗂️ === PROCESANDO CATEGORÍA ${catIndex + 1}/${TARGET_CATEGORY_IDS.length}: ${categoryId} ===`);
      console.log(`   Staff asignados: [${staffInCategory.map(s => s.staffDisplayName).join(', ')}]`);
      
      let currentPosition = 0;
      
      // Procesar cada staff en esta categoría
      for (const staffInfo of staffInCategory) {
        console.log(`\n👤 Procesando ${staffInfo.staffDisplayName} (${staffInfo.channels.length} canales)`);
        
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
          currentPosition = result.finalPosition;
          console.log(`✅ ${staffInfo.staffDisplayName} completado. Próxima posición libre: ${currentPosition}`);
        } else {
          console.error(`❌ Falló el procesamiento de ${staffInfo.staffDisplayName}`);
        }
      }
      
      console.log(`🏁 Categoría ${catIndex + 1} completada con ${staffInCategory.length} grupos de staff`);
    }

    // 7) Procesar canales sin asignar en la última categoría
    if (canalesSinAsignar.length > 0) {
      const lastCategoryId = TARGET_CATEGORY_IDS[TARGET_CATEGORY_IDS.length - 1];
      console.log(`\n❓ === PROCESANDO SIN ASIGNAR (${canalesSinAsignar.length} canales) ===`);
      console.log(`   Categoría destino: ${lastCategoryId}`);
      
      // Encontrar la última posición usada en esa categoría
      const lastCategoryResults = results.filter(r => r.targetCategory === lastCategoryId);
      const lastPosition = lastCategoryResults.length > 0 
        ? Math.max(...lastCategoryResults.map(r => r.finalPosition || 0))
        : 0;
      
      console.log(`   Posición inicial para sin asignar: ${lastPosition}`);
      
      const unassignedResult = await organizeStaffGroup(
        guild,
        { staffId: 'unassigned', staffDisplayName: 'Sin Asignar' },
        canalesSinAsignar,
        lastCategoryId,
        lastPosition,
        associationByChannel
      );
      
      if (unassignedResult) {
        results.push(unassignedResult);
      }
    }

    // 8) Limpiar canales obsoletos
    await cleanupObsoleteStaffChannels(guild, results);

    // 9) Resumen final
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ === ORGANIZACIÓN COMPLETADA EN ${duration}s ===`);
    console.log(`   📊 Resultados:`);
    console.log(`      • Staff procesados: ${results.filter(r => r.category === 'assigned').length}`);
    console.log(`      • Canales sin asignar: ${results.filter(r => r.category === 'unassigned').length}`);
    console.log(`      • Total canales organizados: ${results.reduce((sum, r) => sum + r.assignedChannelsCount, 0)}`);
    console.log(`      • Total movimientos exitosos: ${results.reduce((sum, r) => sum + r.movedChannelsCount, 0)}`);
    
    console.log(`   🗂️ Distribución por categorías:`);
    TARGET_CATEGORY_IDS.forEach((catId, index) => {
      const groupsInCat = results.filter(r => r.targetCategory === catId);
      const channelsInCat = groupsInCat.reduce((sum, r) => sum + r.assignedChannelsCount, 0);
      console.log(`      - Categoría ${index + 1} (${catId}): ${groupsInCat.length} grupos, ${channelsInCat} canales`);
    });

    return results;
    
  } catch (error) {
    console.error('❌ ERROR CRÍTICO en organizaPorStaff:', error);
    throw error;
  } finally {
    organizationInProgress = false;
    console.log('🔓 Mutex liberado');
  }
}

/**
 * Limpia canales de staff obsoletos
 */
async function cleanupObsoleteStaffChannels(guild, currentResults) {
  try {
    console.log('\n🧹 === LIMPIANDO CANALES OBSOLETOS ===');
    
    const activeStaffChannelIds = new Set(currentResults.map(r => r.staffChannelId).filter(Boolean));
    
    const allStaffChannels = guild.channels.cache.filter(ch => 
      ch.type === 0 && 
      ch.name.startsWith(STAFF_CHANNEL_PREFIX) &&
      TARGET_CATEGORY_IDS.includes(ch.parentId)
    );

    console.log(`   Canales staff encontrados: ${allStaffChannels.size}`);
    console.log(`   Canales staff activos: ${activeStaffChannelIds.size}`);

    let removedCount = 0;
    for (const [, staffChannel] of allStaffChannels) {
      if (!activeStaffChannelIds.has(staffChannel.id)) {
        try {
          console.log(`🗑️ Eliminando canal obsoleto: ${staffChannel.name}`);
          await staffChannel.delete('Canal de staff sin canales asignados');
          removedCount++;
          await sleep(DELAY_BETWEEN_REQUESTS_MS);
        } catch (e) {
          console.warn(`⚠️ No se pudo eliminar ${staffChannel.name}:`, e.message);
        }
      }
    }
    
    console.log(`✅ Limpieza completada: ${removedCount} canales eliminados`);
  } catch (error) {
    console.error('❌ Error en cleanup:', error.message);
  }
}

module.exports = organizaPorStaff;