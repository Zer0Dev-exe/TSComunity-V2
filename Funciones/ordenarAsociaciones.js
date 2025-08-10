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
 * Sanitiza una parte de nombre para convertirla en slug usable como nombre de canal
 * Si la parte queda vacía, devuelve null para que el caller ponga fallback.
 * @param {string} input
 * @returns {string|null}
 */
function slugifyName(input) {
  if (!input) return null;
  const slug = String(input)
    .toLowerCase()
    .normalize('NFKD') // intenta normalizar acentos
    .replace(/[\u0300-\u036f]/g, '') // eliminar marcas
    .replace(/[^\w\s-]/g, '') // eliminar caracteres no alfanuméricos
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90); // dejar margen para prefijo + id
  return slug.length > 0 ? slug : null;
}

/**
 * Crea un container para mostrar las asociaciones de un staff
 * @param {Array} asociaciones - Array de asociaciones del staff
 * @param {String} staffId - ID del staff o 'unassigned'
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
      const lastDate = aso.UltimaRenovacion ? new Date(aso.UltimaRenovacion) : null;
      const renovacionTimestamp = lastDate && !Number.isNaN(lastDate.getTime()) ? Math.floor(lastDate.getTime() / 1000) : null;

      container
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            [
              aso.Canal ? `<:canales:1340014379080618035> <#${aso.Canal}>` : '<:canales:1340014379080618035> Sin canal',
              aso.Renovacion ? `🗓️ ${renovacionTimestamp ? `<t:${renovacionTimestamp}:R>` : '🗓️ No definido'}` : '🗓️ No definido',
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
 * Crea un embed simple como fallback
 * @param {String} staffId 
 * @param {String} staffDisplayName 
 * @param {Array} sortedChannels 
 * @param {Array} staffAsociaciones 
 * @returns {EmbedBuilder}
 */
function createFallbackEmbed(staffId, staffDisplayName, sortedChannels, staffAsociaciones) {
  const isUnassigned = staffId === 'unassigned' || staffId === 'SinAsignar';
  
  return new EmbedBuilder()
    .setTitle(isUnassigned ? '📋 Sin asignar' : `📌 ${staffDisplayName}`)
    .setColor(isUnassigned ? 0xffcc00 : 0x00b0f4)
    .setDescription(
      sortedChannels.length > 0 
        ? sortedChannels.map((ch, idx) => `${idx + 1}. <#${ch.id}> — \`${ch.name}\``).join('\n')
        : 'No hay canales'
    )
    .setFooter({ text: `Total: ${staffAsociaciones.length} asociaciones` })
    .setTimestamp();
}

/**
 * Organiza canales por staff dentro de las mismas categorías
 * Distribuye equitativamente entre las categorías disponibles
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

    const results = [];
    
    // Obtener posiciones actuales de las categorías para empezar desde el final
    const categoryPositions = new Map();
    for (const catId of TARGET_CATEGORY_IDS) {
      const category = guild.channels.cache.get(catId);
      if (category) {
        const channelsInCategory = guild.channels.cache
          .filter(ch => ch.parentId === catId && ch.type === 0)
          .sort((a, b) => a.position - b.position);
        categoryPositions.set(catId, channelsInCategory.size);
      } else {
        categoryPositions.set(catId, 0);
      }
    }

    // 4) Procesar canales asignados (distribuir entre categorías)
    // Antes: se ordenaban por ID; ahora resolvemos displayNames (cache-first) y ordenamos por nombre
    const staffEntries = Array.from(gruposAsignados.entries()); // [ [staffId, channels[]], ... ]

    const staffWithNames = await Promise.all(
      staffEntries.map(async ([staffId, channelsArr]) => {
        let display = String(staffId);
        try {
          const cached = guild.members.cache.get(staffId);
          if (cached) display = cached.displayName || cached.user.username;
          else {
            const fetched = await guild.members.fetch(staffId).catch(() => null);
            if (fetched) display = fetched.displayName || fetched.user.username;
          }
        } catch (e) {
          // keep fallback
        }
        return { staffId, staffDisplayName: display, channelsArr };
      })
    );

    // Orden humano
    staffWithNames.sort((a, b) => a.staffDisplayName.localeCompare(b.staffDisplayName, undefined, { sensitivity: 'base', numeric: true }));

    for (let i = 0; i < staffWithNames.length; i++) {
      const { staffId, staffDisplayName, channelsArr } = staffWithNames[i];

      const channelsOfStaff = Array.from(channelsArr || []);
      if (channelsOfStaff.length === 0) {
        // no hay nada que hacer (protección extra)
        continue;
      }

      // Distribuir equitativamente entre las categorías
      const targetCategoryId = TARGET_CATEGORY_IDS[i % TARGET_CATEGORY_IDS.length];
      let currentPosition = categoryPositions.get(targetCategoryId) ?? 0;
      
      console.log(`👤 Procesando staff ${staffId} (${staffDisplayName}) con ${channelsOfStaff.length} canales en categoría ${targetCategoryId}`);

      // Generar staffChannelName de forma segura: si slug queda vacío, usar staffId
      const slugPart = slugifyName(staffDisplayName) || staffId;
      const staffChannelName = `${STAFF_CHANNEL_PREFIX}${slugPart}`.slice(0, 100);

      // 5) Buscar si hay un canal de staff existente con ese nombre en *cualquiera* de las categorías target
      let staffChannel = guild.channels.cache.find(ch =>
        ch.name === staffChannelName &&
        ch.type === 0 &&
        TARGET_CATEGORY_IDS.includes(ch.parentId)
      );

      // Si existe pero está en otra categoría target, lo moveremos a la target actual
      if (staffChannel && staffChannel.parentId !== targetCategoryId) {
        try {
          await staffChannel.setParent(targetCategoryId, { lockPermissions: false });
          await sleep(DELAY_BETWEEN_REQUESTS_MS);
        } catch (e) {
          console.warn(`⚠️ No se pudo mover canal existente ${staffChannel.name} a ${targetCategoryId}:`, e.message);
        }
      }

      // Si no existe, lo creamos en la categoría target
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
            position: currentPosition
          });
          
          currentPosition++;
          categoryPositions.set(targetCategoryId, currentPosition);
          
          await sleep(DELAY_BETWEEN_CREATES_MS);
        } catch (e) {
          console.error(`❌ Error creando canal de staff ${staffChannelName}:`, e);
          continue;
        }
      } else {
        // Actualizar canal existente (topic, permisos y posición)
        try {
          await staffChannel.setTopic(`📋 Canales asignados a ${staffDisplayName}`);
          await sleep(DELAY_BETWEEN_REQUESTS_MS);
          
          await staffChannel.permissionOverwrites.set(createStaffOnlyPermissions(guild));
          await sleep(DELAY_BETWEEN_REQUESTS_MS);

          // Mover a la posición correcta
          await staffChannel.setPosition(currentPosition);
          currentPosition++;
          categoryPositions.set(targetCategoryId, currentPosition);
          await sleep(DELAY_BETWEEN_REQUESTS_MS);
        } catch (e) {
          console.warn(`⚠️ Error actualizando canal de staff ${staffChannelName}:`, e);
        }
      }

      // 6) Ordenar canales del staff alfabéticamente ANTES de moverlos (orden humano)
      const sortedChannels = channelsOfStaff.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }));
      
      console.log(`📝 Orden alfabético para ${staffDisplayName}:`, sortedChannels.map(ch => ch.name));
      
      let movedCount = 0;
      let currentPos = categoryPositions.get(targetCategoryId) ?? 0;
      
      // Mover canales en el orden alfabético correcto
      for (let j = 0; j < sortedChannels.length; j++) {
        const channel = sortedChannels[j];
        
        try {
          // Mover a la categoría correcta si no está ahí
          if (channel.parentId !== targetCategoryId) {
            console.log(`📦 Moviendo canal ${channel.name} a categoría ${targetCategoryId}`);
            await channel.setParent(targetCategoryId, { lockPermissions: false });
            movedCount++;
            await sleep(DELAY_BETWEEN_REQUESTS_MS);
          }
          
          // Posicionar en orden secuencial después del canal de staff
          console.log(`📍 Posicionando ${channel.name} en posición ${currentPos}`);
          await channel.setPosition(currentPos);
          currentPos++;
          await sleep(DELAY_BETWEEN_REQUESTS_MS);
          
        } catch (e) {
          console.error(`❌ Error procesando canal ${channel.name}:`, e);
        }
      }
      
      // Actualizar contador de posición para esta categoría
      categoryPositions.set(targetCategoryId, currentPos);

      // 7) Actualizar mensaje en canal de staff
      try {
        // Buscar asociaciones de estos canales para el mensaje (en el mismo orden)
        const staffAsociaciones = [];
        for (const channel of sortedChannels) {
          const aso = associationByChannel.get(channel.id);
          if (aso) {
            staffAsociaciones.push(aso);
          }
        }
        
        console.log(`📋 Preparando mensaje para ${staffDisplayName} con ${staffAsociaciones.length} asociaciones`);
        
        // Intentar enviar container primero
        let messageSuccess = false;
        
        try {
          const container = createContainerForStaff(staffAsociaciones, staffId, staffDisplayName, sortedChannels);
          const messagePayload = { 
            components: [container], 
            flags: MessageFlags.IsComponentsV2 
          };

          const fetched = await staffChannel.messages.fetch({ limit: LIMIT_FETCH_MESSAGES }).catch(() => null);
          let botMsg = null;
          if (fetched) botMsg = fetched.find(m => m.author.id === client.user.id);

          if (botMsg) {
            console.log(`✏️ Editando mensaje existente en ${staffChannelName}`);
            await botMsg.edit(messagePayload);
          } else {
            console.log(`📝 Enviando nuevo mensaje en ${staffChannelName}`);
            await staffChannel.send(messagePayload);
          }
          
          messageSuccess = true;
          await sleep(DELAY_BETWEEN_REQUESTS_MS);
        } catch (containerErr) {
          console.warn(`⚠️ Error con container para ${staffDisplayName}:`, containerErr.message);
        }

        // Si el container falló, usar embed como fallback
        if (!messageSuccess) {
          console.log(`🔄 Usando embed fallback para ${staffDisplayName}`);
          
          const embed = createFallbackEmbed(staffId, staffDisplayName, sortedChannels, staffAsociaciones);
          const embedPayload = { embeds: [embed] };

          const fetched = await staffChannel.messages.fetch({ limit: LIMIT_FETCH_MESSAGES }).catch(() => null);
          let botMsg = null;
          if (fetched) botMsg = fetched.find(m => m.author.id === client.user.id);

          if (botMsg) {
            await botMsg.edit(embedPayload);
          } else {
            await staffChannel.send(embedPayload);
          }
          
          console.log(`✅ Fallback embed enviado para ${staffDisplayName}`);
          await sleep(DELAY_BETWEEN_REQUESTS_MS);
        }

      } catch (err) {
        console.error(`❌ Error general actualizando mensaje para ${staffDisplayName}:`, err);
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
      let finalPosition = categoryPositions.get(lastCategoryId) ?? 0;
      
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
            position: finalPosition
          });
          
          finalPosition++;
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

          // Posicionar correctamente
          await unassignedChannel.setPosition(finalPosition);
          finalPosition++;
          await sleep(DELAY_BETWEEN_REQUESTS_MS);
        } catch (e) {
          console.warn(`⚠️ Error actualizando canal sin asignar:`, e);
        }
      }

      // Ordenar canales sin asignar alfabéticamente y posicionarlos al final
      const sortedUnassigned = canalesSinAsignar.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }));
      console.log(`📝 Orden alfabético sin asignar:`, sortedUnassigned.map(ch => ch.name));
      
      let movedUnassignedCount = 0;
      let currentUnassignedPos = finalPosition;
      
      for (let k = 0; k < sortedUnassigned.length; k++) {
        const channel = sortedUnassigned[k];
        
        try {
          if (channel.parentId !== lastCategoryId) {
            console.log(`📦 Moviendo canal sin asignar ${channel.name} a última categoría`);
            await channel.setParent(lastCategoryId, { lockPermissions: false });
            movedUnassignedCount++;
            await sleep(DELAY_BETWEEN_REQUESTS_MS);
          }
          
          // Posicionar en orden secuencial
          console.log(`📍 Posicionando sin asignar ${channel.name} en posición ${currentUnassignedPos}`);
          await channel.setPosition(currentUnassignedPos);
          currentUnassignedPos++;
          await sleep(DELAY_BETWEEN_REQUESTS_MS);
        } catch (e) {
          console.error(`❌ Error moviendo canal sin asignar ${channel.name}:`, e);
        }
      }

      // Actualizar mensaje en canal sin asignar
      if (unassignedChannel) {
        try {
          // Crear asociaciones dummy para canales sin asignar
          const unassignedAsociaciones = sortedUnassigned.map(ch => ({
            Canal: ch.id,
            Asignado: 'SinAsignar',
            Renovacion: null,
            Representante: null
          }));

          console.log(`📋 Preparando mensaje sin asignar con ${unassignedAsociaciones.length} asociaciones`);
          
          // Intentar container primero
          let unassignedMessageSuccess = false;
          
          try {
            const container = createContainerForStaff(unassignedAsociaciones, 'unassigned', 'Sin Asignar', sortedUnassigned);
            const messagePayload = { 
              components: [container], 
              flags: MessageFlags.IsComponentsV2 
            };

            const fetched = await unassignedChannel.messages.fetch({ limit: LIMIT_FETCH_MESSAGES }).catch(() => null);
            let botMsg = null;
            if (fetched) botMsg = fetched.find(m => m.author.id === client.user.id);

            if (botMsg) {
              console.log(`✏️ Editando mensaje sin asignar`);
              await botMsg.edit(messagePayload);
            } else {
              console.log(`📝 Enviando nuevo mensaje sin asignar`);
              await unassignedChannel.send(messagePayload);
            }
            
            unassignedMessageSuccess = true;
            await sleep(DELAY_BETWEEN_REQUESTS_MS);
          } catch (containerErr) {
            console.warn(`⚠️ Error con container sin asignar:`, containerErr.message);
          }

          // Fallback con embed si el container falla
          if (!unassignedMessageSuccess) {
            console.log(`🔄 Usando embed fallback para sin asignar`);
            
            const embed = createFallbackEmbed('unassigned', 'Sin Asignar', sortedUnassigned, unassignedAsociaciones);
            const embedPayload = { embeds: [embed] };

            const fetched = await unassignedChannel.messages.fetch({ limit: LIMIT_FETCH_MESSAGES }).catch(() => null);
            let botMsg = null;
            if (fetched) botMsg = fetched.find(m => m.author.id === client.user.id);

            if (botMsg) {
              await botMsg.edit(embedPayload);
            } else {
              await unassignedChannel.send(embedPayload);
            }
            
            console.log(`✅ Fallback embed sin asignar enviado`);
            await sleep(DELAY_BETWEEN_REQUESTS_MS);
          }

        } catch (err) {
          console.error(`❌ Error general actualizando mensaje sin asignar:`, err);
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
