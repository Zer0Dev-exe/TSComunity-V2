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
const STAFF_CHANNEL_PREFIX = '﹏︿';
const STAFF_CHANNEL_SUFFIX = '︿﹏'; // 🎨 Sufijo decorativo al final
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
 * Normaliza el nombre de usuario para crear nombres de canal consistentes
 * @param {string} displayName 
 * @returns {string}
 */
function normalizeStaffName(displayName) {
  return displayName
    .toLowerCase()
    .normalize('NFD') // Descompone acentos
    .replace(/[\u0300-\u036f]/g, '') // Elimina diacríticos (acentos)
    .replace(/[^\w\s-]/g, '') // Solo letras, números, espacios y guiones
    .replace(/\s+/g, '-') // Espacios → guiones
    .replace(/-+/g, '-') // Múltiples guiones → uno solo
    .replace(/^-|-$/g, '') // Quita guiones al inicio/final
    .trim();
}

/**
 * Busca un canal de staff existente de forma más robusta
 * @param {Guild} guild 
 * @param {string} staffId 
 * @param {string} staffDisplayName 
 * @param {string} targetCategoryId 
 * @returns {Channel|null}
 */
function findExistingStaffChannel(guild, staffId, staffDisplayName, targetCategoryId) {
  const normalizedName = normalizeStaffName(staffDisplayName);
  
  // Buscar canales de staff en la categoría objetivo
  const staffChannelsInCategory = guild.channels.cache.filter(ch => 
    ch.type === 0 &&
    ch.parentId === targetCategoryId &&
    ch.name.startsWith(STAFF_CHANNEL_PREFIX)
  );

  console.log(`🔍 [${staffDisplayName}] Buscando canal existente para "${normalizedName}"`);
  console.log(`   Canales de staff en categoría: ${staffChannelsInCategory.size}`);

  // Patrones de búsqueda en orden de prioridad
  const searchPatterns = [
    // 1. Nombre completo con sufijo actual
    `${STAFF_CHANNEL_PREFIX}${normalizedName}${STAFF_CHANNEL_SUFFIX}`,
    // 2. Nombre con prefix actual (cualquier sufijo)
    new RegExp(`^${escapeRegex(STAFF_CHANNEL_PREFIX)}${escapeRegex(normalizedName)}`),
    // 3. Búsqueda por ID de staff en el topic del canal
    null // Se maneja por separado
  ];

  // Buscar por patrones de nombre
  for (const pattern of searchPatterns.slice(0, 2)) {
    for (const [, channel] of staffChannelsInCategory) {
      const matches = typeof pattern === 'string' 
        ? channel.name === pattern
        : pattern.test(channel.name);
        
      if (matches) {
        console.log(`✅ [${staffDisplayName}] Canal encontrado por patrón: ${channel.name}`);
        return channel;
      }
    }
  }

  // Búsqueda por topic (como fallback)
  for (const [, channel] of staffChannelsInCategory) {
    if (channel.topic && channel.topic.includes(staffDisplayName)) {
      console.log(`✅ [${staffDisplayName}] Canal encontrado por topic: ${channel.name}`);
      return channel;
    }
  }

  console.log(`❌ [${staffDisplayName}] No se encontró canal existente`);
  return null;
}

/**
 * Escapa caracteres especiales para regex
 */
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
 * CORREGIDA para encontrar y reutilizar canales de staff existentes correctamente
 */
async function organizeStaffGroup(guild, staffInfo, channelsOfStaff, targetCategoryId, startPosition, associationByChannel) {
  const { staffId, staffDisplayName } = staffInfo;
  
  console.log(`👤 [${staffDisplayName}] Iniciando organización en categoría ${targetCategoryId}, posición ${startPosition}`);
  console.log(`   Canales a procesar: [${channelsOfStaff.map(ch => ch.name).join(', ')}]`);
  
  // 1) Crear nombre normalizado del canal de staff
  const normalizedStaffName = normalizeStaffName(staffDisplayName);
  const staffChannelName = `${STAFF_CHANNEL_PREFIX}${normalizedStaffName}${STAFF_CHANNEL_SUFFIX}`
    .slice(0, 100); // Límite de Discord

  console.log(`📝 [${staffDisplayName}] Nombre normalizado: "${normalizedStaffName}"`);
  console.log(`📝 [${staffDisplayName}] Nombre objetivo: "${staffChannelName}"`);

  // 2) Buscar canal de staff existente usando la función mejorada
  let staffChannel = findExistingStaffChannel(guild, staffId, staffDisplayName, targetCategoryId);

  if (staffChannel) {
    // Verificar si necesita renombrar
    if (staffChannel.name !== staffChannelName) {
      console.log(`🔧 [${staffDisplayName}] Renombrando canal: ${staffChannel.name} → ${staffChannelName}`);
      try {
        await staffChannel.setName(staffChannelName, {
          reason: `Actualizando nombre del canal de ${staffDisplayName}`
        });
        await sleep(DELAY_BETWEEN_REQUESTS_MS);
      } catch (e) {
        console.warn(`⚠️ [${staffDisplayName}] Error renombrando canal:`, e.message);
      }
    } else {
      console.log(`✅ [${staffDisplayName}] Canal existente correcto: ${staffChannel.name}`);
    }
  } else {
    // 3) Crear nuevo canal de staff si no existe
    console.log(`🔨 [${staffDisplayName}] Creando canal de staff: ${staffChannelName}`);
    try {
      staffChannel = await guild.channels.create({
        name: staffChannelName,
        type: 0,
        parent: targetCategoryId,
        topic: `📋 Canales asignados a ${staffDisplayName} (ID: ${staffId})`,
        reason: 'Canal de organización por staff',
        permissionOverwrites: createStaffOnlyPermissions(guild)
      });
      
      await sleep(DELAY_BETWEEN_CREATES_MS);
      console.log(`✅ [${staffDisplayName}] Canal staff creado: ${staffChannel.id}`);
    } catch (e) {
      console.error(`❌ [${staffDisplayName}] Error creando canal de staff:`, e.message);
      return null;
    }
  }

  // 4) Ordenar canales alfabéticamente (MEJORADO)
  const sortedChannels = channelsOfStaff.sort((a, b) => {
    // Remover emojis y caracteres especiales para ordenar
    const cleanA = a.name.replace(/[^\w\s-]/g, '').trim().toLowerCase() || a.name.toLowerCase();
    const cleanB = b.name.replace(/[^\w\s-]/g, '').trim().toLowerCase() || b.name.toLowerCase();
    return cleanA.localeCompare(cleanB, 'es', { sensitivity: 'base', numeric: true });
  });

  console.log(`📝 [${staffDisplayName}] Orden alfabético determinado:`, sortedChannels.map(ch => `${ch.name}(${ch.id})`));

  // 5) PRIMERO: Mover todos los canales a la categoría correcta SIN posicionamiento
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

  // 6) SEGUNDO: Posicionar el canal de staff en la posición inicial
  try {
    console.log(`📍 [${staffDisplayName}] Posicionando canal staff en posición ${startPosition}`);
    await staffChannel.setPosition(startPosition, {
      reason: `Organizando por staff: ${staffDisplayName}`
    });
    await sleep(DELAY_BETWEEN_REQUESTS_MS);
  } catch (e) {
    console.error(`❌ [${staffDisplayName}] Error posicionando canal staff:`, e.message);
  }

  // 7) TERCERO: Posicionar cada canal en orden secuencial
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

  // 8) Actualizar mensaje en canal de staff
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

    // 5) NUEVO SISTEMA: Procesar todos los staff en orden alfabético secuencial
    console.log('\n🗂️ === PROCESANDO STAFF EN ORDEN ALFABÉTICO GLOBAL ===');
    
    // Calcular distribución equilibrada
    const staffPerCategory = Math.ceil(staffWithInfo.length / TARGET_CATEGORY_IDS.length);
    console.log(`   📊 Distribución objetivo: ~${staffPerCategory} staff por categoría`);
    
    // Contadores para cada categoría
    const categoryCounters = TARGET_CATEGORY_IDS.map(() => ({ position: 0, staffCount: 0 }));
    let currentCategoryIndex = 0;
    
    // Procesar cada staff en orden alfabético
    for (let staffIndex = 0; staffIndex < staffWithInfo.length; staffIndex++) {
      const staffInfo = staffWithInfo[staffIndex];
      
      // Determinar categoría actual
      const targetCategoryId = TARGET_CATEGORY_IDS[currentCategoryIndex];
      const categoryCounter = categoryCounters[currentCategoryIndex];
      
      console.log(`\n👤 [${staffIndex + 1}/${staffWithInfo.length}] Procesando ${staffInfo.staffDisplayName}`);
      console.log(`   📌 Asignado a Categoría ${currentCategoryIndex + 1} (${targetCategoryId})`);
      console.log(`   📍 Posición inicial en categoría: ${categoryCounter.position}`);
      
      const result = await organizeStaffGroup(
        guild, 
        staffInfo, 
        staffInfo.channels, 
        targetCategoryId, 
        categoryCounter.position, 
        associationByChannel
      );
      
      if (result) {
        results.push(result);
        categoryCounter.position = result.finalPosition;
        categoryCounter.staffCount++;
        console.log(`✅ ${staffInfo.staffDisplayName} completado en Categoría ${currentCategoryIndex + 1}`);
        console.log(`   📍 Próxima posición libre en esta categoría: ${categoryCounter.position}`);
      } else {
        console.error(`❌ Falló el procesamiento de ${staffInfo.staffDisplayName}`);
      }
      
      // Cambiar a la siguiente categoría si hemos alcanzado el límite
      if (categoryCounter.staffCount >= staffPerCategory && currentCategoryIndex < TARGET_CATEGORY_IDS.length - 1) {
        console.log(`📦 Categoría ${currentCategoryIndex + 1} completada con ${categoryCounter.staffCount} staff`);
        currentCategoryIndex++;
      }
    }
    
    // Mostrar distribución final
    console.log('\n📊 === DISTRIBUCIÓN FINAL POR CATEGORÍAS ===');
    TARGET_CATEGORY_IDS.forEach((catId, index) => {
      const counter = categoryCounters[index];
      console.log(`   Categoría ${index + 1} (${catId}): ${counter.staffCount} staff, posición final: ${counter.position}`);
    });

    // 6) Procesar canales sin asignar en la última categoría
    if (canalesSinAsignar.length > 0) {
      const lastCategoryId = TARGET_CATEGORY_IDS[TARGET_CATEGORY_IDS.length - 1];
      console.log(`\n❓ === PROCESANDO SIN ASIGNAR (${canalesSinAsignar.length} canales) ===`);
      console.log(`   Categoría destino: ${lastCategoryId}`);
      
      // Encontrar la última posición usada en la última categoría
      const lastCategoryIndex = TARGET_CATEGORY_IDS.length - 1;
      const lastPosition = categoryCounters[lastCategoryIndex].position;
      
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

    // 7) Limpiar canales obsoletos
    await cleanupObsoleteStaffChannels(guild, results);

    // 8) Resumen final
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