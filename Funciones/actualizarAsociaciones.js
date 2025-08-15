const {
  ActionRowBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  MediaComponentBuilder,
  ThumbnailBuilder,
  SectionBuilder,
  SeparatorBuilder,
  MessageFlags,
  EmbedBuilder
} = require('discord.js');
const Asociacion = require('../Esquemas/asociacionesSchema');

// Constante para el prefijo de canales de staff
const STAFF_CHANNEL_PREFIX = '﹏︿';

module.exports = async function actualizarListaAsociaciones(client) {
  try {
    const TARGET_CHANNEL_ID = '1339987513401413735';
    const categoria1Id = '1217154240175407196';
    const categoria2Id = '1267736691083317300';

    // -------------------------
    // helpers
    // -------------------------
    const isV2 = (msg) => Boolean((msg.flags ?? 0) & MessageFlags.IsComponentsV2);

    /**
     * Función de comparación personalizada para ordenar canales considerando formato especial
     * Misma lógica que organizaPorStaff: extrae el nombre sin emojis para ordenar correctamente
     * @param {string} nameA 
     * @param {string} nameB 
     * @returns {number}
     */
    const compareChannelNames = (nameA, nameB) => {
      // Si ambos nombres están vacíos, son iguales
      if (!nameA && !nameB) return 0;
      if (!nameA) return 1; // nameA vacío va al final
      if (!nameB) return -1; // nameB vacío va al final
      
      // Extraer el nombre sin emojis para ordenar correctamente (igual que organizaPorStaff)
      const cleanNameA = nameA.replace(/[^\w\s-]/g, '').trim() || nameA;
      const cleanNameB = nameB.replace(/[^\w\s-]/g, '').trim() || nameB;
      
      // Ordenamiento alfabético con configuración en español, case-insensitive
      return cleanNameA.localeCompare(cleanNameB, 'es', { 
        sensitivity: 'base', 
        numeric: true
      });
    };

    /**
     * Helper para obtener el nombre del canal desde un objeto aso o ID de canal
     * @param {Object|string} asoOrChannelId - Objeto asociación o ID del canal
     * @returns {string} Nombre del canal o string vacío
     */
    const getChannelName = (asoOrChannelId) => {
      try {
        const channelId = typeof asoOrChannelId === 'string' ? asoOrChannelId : String(asoOrChannelId.Canal);
        const ch = client.channels.cache.get(channelId);
        return ch ? ch.name : '';
      } catch {
        return '';
      }
    };

    /**
     * Crea un ContainerBuilder para una lista de asociaciones (una "división")
     * @param {Array<Object>} asociation
     * @returns {ContainerBuilder}
     */
    function createContainerForAsociation(asociation) {
      const asignado = asociation[0]?.Asignado || 'SinAsignar';
      // ✅ FIX: Definir 'ahora' dentro de la función
      const ahora = Date.now();

      const container = new ContainerBuilder()
        .setAccentColor(asignado === 'SinAsignar' ? 0xffcc00 : 0x00b0f4)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            asignado === 'SinAsignar'
              ? `### 📋 Sin asignar — ${asociation.length}`
              : `### 📌 <@${asignado}> — ${asociation.length}`
          )
        );

      if (!asociation || asociation.length === 0) {
        container
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              asignado === 'SinAsignar'
                ? 'No hay asociaciones sin asignar.'
                : 'El usuario no tiene asociaciones.'
            )
          );
        return container;
      }

      for (const aso of asociation) {
        // Construimos el bloque según si está asignado o no
        if (asignado !== 'SinAsignar') {
const renovacionTimestamp = aso.UltimaRenovacion
  ? Math.floor(
      (new Date(aso.UltimaRenovacion).getTime() + aso.Renovacion * 24 * 60 * 60 * 1000) / 1000
    )
  : null;

const msRenovacion = (aso.Renovacion || 0) * 24 * 60 * 60 * 1000;
const renovada = aso.UltimaRenovacion
  ? (ahora - new Date(aso.UltimaRenovacion).getTime()) < msRenovacion
  : false;

          container
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
            [
              aso.Canal
                ? `<:canales:1340014379080618035> <#${aso.Canal}>`
                : '<:canales:1340014379080618035> Sin canal',

              renovacionTimestamp
                ? `🗓️ <t:${renovacionTimestamp}:R>`
                : '🗓️ No definido',

              aso.Representante
                ? `<:representante:1340014390342193252> <@${aso.Representante}>`
                : '<:representante:1340014390342193252> Sin representante',

              renovada
                ? '✅ **Renovada**'
                : '❌ **No renovada**'
            ].join('\n')
              )
            );
        } else {
          container
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                aso.Canal ? `<:canales:1340014379080618035> <#${aso.Canal}>` : '<:canales:1340014379080618035> Sin canal'
              )
            );
        }
      }

      return container;
    }

    /**
     * Crea un Embed resumen con:
     * - total asociaciones
     * - asociaciones sin asignar
     * - asociaciones sin renovar (compara lastRenovacion con Renovacion en días)
     * - asociaciones con renovación definida / indefinida
     * @param {Array<Object>} asociations
     * @param {number} sinAsignarCount - Cantidad de canales sin asignar
     * @returns {EmbedBuilder}
     */
    function createSummaryEmbed(asociations, sinAsignarCount) {
      const ahora = Date.now();
      const total = asociations.length;

      const sinRenovar = asociations.filter(a => {
        // Buscamos posibles nombres de campo para la fecha de última renovación
        const last = a.UltimaRenovacion ?? null;
        const renovacionDays = a.Renovacion ?? a.renovacion ?? null; // número de días

        if (!renovacionDays) {
          // Si no hay periodo de renovación definido, consideramos que está sin definir -> contamos como "sin renovar"
          return true;
        }

        if (!last) {
          // Si no hay fecha de última renovación, consideramos sin renovar
          return true;
        }

        const lastMs = (new Date(last)).getTime();
        if (Number.isNaN(lastMs)) return true;

        const renovacionMs = Number(renovacionDays) * 24 * 60 * 60 * 1000;
        return (ahora - lastMs) > renovacionMs;
      }).length;

      const embed = new EmbedBuilder()
        .setTitle('📊 Resumen de asociaciones')
        .setColor(0x7289DA)
        .addFields(
          { name: 'Total', value: `${total + sinAsignarCount}`, inline: true },
          { name: 'Sin asignar', value: `${sinAsignarCount}`, inline: true },
          { name: 'Sin renovar', value: `${sinRenovar}`, inline: true },
        );

      return embed;
    }

    // -------------------------
    // inicio del flujo
    // -------------------------
    const channel = await client.channels.fetch(TARGET_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) throw new Error('Canal no encontrado o no es de texto.');

    const guild = channel.guild; // necesario para resolver miembros

    // Recuperamos los últimos mensajes del canal del bot
    const fetchedMessages = await channel.messages.fetch({ limit: 100 });
    const sortedMessages = Array.from(fetchedMessages.values()).sort(
      (a, b) => a.createdTimestamp - b.createdTimestamp
    );
    const botMessages = sortedMessages.filter(msg => msg.author.id === client.user.id);

    // Mensaje resumen -> el primer mensaje del bot que NO sea V2 (embed tradicional)
    const summaryMsg = botMessages.find(msg => !isV2(msg));
    // Mensajes V2 -> aquellos con flags V2 (container builders)
    const divisionMsgs = botMessages.filter(msg => isV2(msg)).sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    // LOGGING MEJORADO
    console.log(`📋 Estado inicial de mensajes:`);
    console.log(`   - Total mensajes del bot: ${botMessages.length}`);
    console.log(`   - Mensaje resumen (non-V2): ${summaryMsg ? '✅' : '❌'}`);
    console.log(`   - Mensajes V2: ${divisionMsgs.length}`);

    // Obtenemos canales de las dos categorías (filtramos por parentId y excluimos canales de staff)
    const canalesEnCategorias = client.channels.cache.filter(ch =>
      ch.isTextBased() && 
      (ch.parentId === categoria1Id || ch.parentId === categoria2Id) &&
      !ch.name.startsWith(STAFF_CHANNEL_PREFIX)
    );

    // Traemos todas las asociaciones con Canal definido (las que están registradas)
    const todasAsociacionesDB = await Asociacion.find({ Canal: { $ne: null } });

    // Verificamos que el canal existe realmente en el cliente (evita entradas huérfanas)
    const asociations = (
      await Promise.all(
        todasAsociacionesDB.map(async (aso) => {
          try {
            const fetchedChannel = await client.channels.fetch(aso.Canal);
            // Verificar también que no sea un canal de staff
            if (fetchedChannel && !fetchedChannel.name.startsWith(STAFF_CHANNEL_PREFIX)) {
              return aso;
            }
            return null;
          } catch {
            return null;
          }
        })
      )
    ).filter(Boolean);

    // Set de canales ya registrados
    const canalesRegistrados = new Set(asociations.map(aso => aso.Canal));

    // Canales en categorías que NO están registrados
    const canalesNoRegistrados = canalesEnCategorias.filter(c => !canalesRegistrados.has(c.id));

    // -------------------------
    // Agrupar y ordenar (MEJORADO)
    // -------------------------
    // Agrupamos por Asignado (o 'SinAsignar')
    const agrupado = asociations.reduce((acc, aso) => {
      const key = aso.Asignado || 'SinAsignar';
      if (!acc[key]) acc[key] = [];
      acc[key].push(aso);
      return acc;
    }, {});

    // Aseguramos que exista SinAsignar
    if (!agrupado['SinAsignar']) agrupado['SinAsignar'] = [];

    for (const [key, group] of Object.entries(agrupado)) {
      group.sort((a, b) => {
        const nameA = getChannelName(a);
        const nameB = getChannelName(b);
        return compareChannelNames(nameA, nameB);
      });
    }

    // 2) Ordenar las claves (staffs) alfabéticamente por displayName (excluyendo 'SinAsignar')
    const staffEntries = Object.entries(agrupado).filter(([key]) => key !== 'SinAsignar');

    // Resolvemos displayNames de forma cache-first (menos peticiones) y luego ordenamos
    const staffWithNames = await Promise.all(
      staffEntries.map(async ([key, arr]) => {
        let nameFallback = String(key);
        try {
          // intentamos cache primero
          const cached = guild.members.cache.get(key);
          if (cached) {
            nameFallback = cached.displayName || cached.user.username;
          } else {
            const member = await guild.members.fetch(key).catch(() => null);
            if (member) nameFallback = member.displayName || member.user.username;
          }
        } catch (e) {
          console.warn(`No se pudo resolver nombre para staff ${key}:`, e.message);
        }
        return { key, name: nameFallback, arr };
      })
    );

    // Ordenar staff alfabéticamente (mismo método que organizaPorStaff)
    staffWithNames.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));

    // Construimos expectedAsociations: staffs ordenados + SinAsignar al final
    const expectedAsociations = [
      ...staffWithNames.map(s => [...agrupado[s.key]]),
      [...agrupado['SinAsignar']]
    ];

    for (const canal of canalesNoRegistrados.values()) {
      expectedAsociations[expectedAsociations.length - 1].push({ 
        Canal: canal.id, 
        Asignado: 'SinAsignar' 
      });
    }

    // Re-ordenamos la agrupación SinAsignar por nombre de canal una vez añadidos los no registrados
    const sinAsignarGroup = expectedAsociations[expectedAsociations.length - 1];
    
    sinAsignarGroup.sort((a, b) => {
      const nameA = getChannelName(a);
      const nameB = getChannelName(b);
      return compareChannelNames(nameA, nameB);
    });

    // Esperamos 1 mensaje resumen + N divisiones
    const expectedMessages = 1 + expectedAsociations.length;
    const sinAsignarCount = expectedAsociations[expectedAsociations.length - 1].length;

    console.log(`🎯 Divisiones esperadas: ${expectedAsociations.length}`);
    console.log(`📝 Mensajes V2 actuales: ${divisionMsgs.length}`);

    // Si no existe mensaje resumen -> limpiamos y creamos todo desde cero
    if (!summaryMsg) {
      console.log('🔄 No hay mensaje resumen, recreando todo...');
      // borramos todos los mensajes del bot que había
      await Promise.all(botMessages.map(m => m.delete().catch(() => {})));

      // Enviamos resumen (embed tradicional)
      const summaryEmbed = createSummaryEmbed(asociations, sinAsignarCount);
      await channel.send({
        embeds: [summaryEmbed],
        allowedMentions: { users: [] }
      });

      // Enviamos cada división como componente V2 (ContainerBuilder)
      for (const asociation of expectedAsociations) {
        const container = createContainerForAsociation(asociation);
        await channel.send({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { users: [] }
        });
      }

      return;
    }

    // Si hay menos mensajes de bot de los esperados -> reiniciamos todo (para mantener orden)
    if (botMessages.length < expectedMessages) {
      console.log('🔄 Menos mensajes de los esperados, recreando todo...');
      // borrar y recrear
      await Promise.all(botMessages.map(m => m.delete().catch(() => {})));

      // recreate summary
      const summaryEmbed = createSummaryEmbed(asociations, sinAsignarCount);
      await channel.send({
        embeds: [summaryEmbed],
        allowedMentions: { users: [] }
      });

      for (const asociation of expectedAsociations) {
        const container = createContainerForAsociation(asociation);
        await channel.send({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { users: [] }
        });
      }

      return;
    }
    
    // 1) editamos el summaryMsg con datos nuevos
    const newSummaryEmbed = createSummaryEmbed(asociations, sinAsignarCount);
    await summaryMsg.edit({
      embeds: [newSummaryEmbed]
    });

    // 2) editamos/actualizamos cada división (V2)
    // Alineamos mensajes V2 que ya existían por orden cronológico
    // Si hay menos mensajes V2 que divisiones, enviaremos los faltantes
    for (let i = 0; i < expectedAsociations.length; i++) {
      const asociation = expectedAsociations[i];
      const msg = divisionMsgs[i];

      const container = createContainerForAsociation(asociation);

      if (msg) {
        // edit existente (recuerda añadir flags para V2)
        await msg.edit({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { users: [] }
        }).catch(async (err) => {
          console.error(`❌ Error editando mensaje V2 ${msg.id}:`, err);
          // si falla la edición, borramos y re-enviamos
          try {
            await msg.delete().catch(() => {});
            await channel.send({
              components: [container],
              flags: MessageFlags.IsComponentsV2,
              allowedMentions: { users: [] }
            });
          } catch (e) {
            console.error('Error recreando mensaje V2:', e);
          }
        });
      } else {
        // si no existe mensaje V2 para esta división, lo creamos
        console.log(`📤 Creando nuevo mensaje V2 para división ${i}`);
        await channel.send({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { users: [] }
        }).catch(e => console.error('Error enviando nuevo mensaje V2:', e));
      }
    }

    // ✅ LÓGICA CORREGIDA PARA ELIMINAR MENSAJES SOBRANTES
    if (divisionMsgs.length > expectedAsociations.length) {
      // ✅ FIX: Ordenar mensajes por timestamp DESCENDENTE para eliminar los más recientes primero
      const mensajesOrdenados = [...divisionMsgs].sort((a, b) => b.createdTimestamp - a.createdTimestamp);
      const cantidadAEliminar = divisionMsgs.length - expectedAsociations.length;
      const mensajesSobrantes = mensajesOrdenados.slice(0, cantidadAEliminar);
      
      console.log(`🗑️ ELIMINACIÓN DE MENSAJES SOBRANTES:`);
      console.log(`   - Mensajes V2 actuales: ${divisionMsgs.length}`);
      console.log(`   - Divisiones esperadas: ${expectedAsociations.length}`);
      console.log(`   - Mensajes sobrantes a eliminar: ${mensajesSobrantes.length}`);
      console.log(`   - IDs de mensajes sobrantes: ${mensajesSobrantes.map(m => m.id).join(', ')}`);
      
      let eliminadosExitosos = 0;
      let erroresEliminacion = 0;
      
      // Eliminar uno por uno con mejor manejo de errores
      for (let i = 0; i < mensajesSobrantes.length; i++) {
        const msgSobrante = mensajesSobrantes[i];
        
        try {
          console.log(`🗑️ Eliminando mensaje sobrante ${i + 1}/${mensajesSobrantes.length}: ${msgSobrante.id}`);
          
          // ✅ FIX: Re-fetch del mensaje para asegurar que existe
          const msgActualizado = await channel.messages.fetch(msgSobrante.id).catch(() => null);
          
          if (msgActualizado) {
            await msgActualizado.delete();
            eliminadosExitosos++;
            console.log(`✅ Eliminado exitosamente: ${msgSobrante.id}`);
          } else {
            console.log(`⚠️ El mensaje ${msgSobrante.id} ya no existe`);
          }
          
          // Delay para evitar rate limiting
          if (i < mensajesSobrantes.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 250));
          }
          
        } catch (error) {
          erroresEliminacion++;
          console.error(`❌ Error eliminando mensaje sobrante ${msgSobrante.id}:`, {
            message: error.message,
            code: error.code,
            httpStatus: error.httpStatus
          });
          
          // Si es un error conocido, continuamos
          if (error.code === 10008) { // Unknown Message
            console.log(`ℹ️ Mensaje ${msgSobrante.id} ya no existe (normal)`);
          } else if (error.code === 50013) { // Missing Permissions
            console.log(`⚠️ Sin permisos para eliminar ${msgSobrante.id}`);
          } else {
            console.log(`🔄 Error inesperado con código ${error.code}, continuando...`);
          }
        }
      }
      
      console.log(`📊 Resultado eliminación: ${eliminadosExitosos} exitosos, ${erroresEliminacion} errores`);
      
      // ✅ FIX: Verificación final más robusta
      if (erroresEliminacion > 0 || eliminadosExitosos < mensajesSobrantes.length) {
        console.log('🔄 Realizando verificación final...');
        
        // Re-fetch todos los mensajes para verificar el estado actual
        const verificacionMessages = await channel.messages.fetch({ limit: 100 });
        const verificacionBotMessages = Array.from(verificacionMessages.values())
          .filter(msg => msg.author.id === client.user.id)
          .sort((a, b) => a.createdTimestamp - b.createdTimestamp);
        const verificacionV2Messages = verificacionBotMessages.filter(msg => isV2(msg));
        
        console.log(`📋 Verificación final:`);
        console.log(`   - Total mensajes del bot: ${verificacionBotMessages.length}`);
        console.log(`   - Mensajes V2 restantes: ${verificacionV2Messages.length}`);
        console.log(`   - Mensajes V2 esperados: ${expectedAsociations.length}`);
        
        if (verificacionV2Messages.length > expectedAsociations.length) {
          const sobrantes = verificacionV2Messages.length - expectedAsociations.length;
          console.log(`🚨 AÚN HAY ${sobrantes} MENSAJE(S) V2 SOBRANTE(S)`);
          console.log(`   - IDs restantes: ${verificacionV2Messages.map(m => m.id).join(', ')}`);
          
          // ✅ FIX: Intento adicional de eliminación más agresivo
          const mensajesParaSegundaEliminacion = verificacionV2Messages
            .sort((a, b) => b.createdTimestamp - a.createdTimestamp)
            .slice(0, sobrantes);
          
          console.log('🔄 Realizando segunda pasada de eliminación...');
          for (const msgExtra of mensajesParaSegundaEliminacion) {
            try {
              await msgExtra.delete();
              console.log(`✅ Segunda eliminación exitosa: ${msgExtra.id}`);
              await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
              console.error(`❌ Segunda eliminación fallida: ${msgExtra.id}`, error.message);
            }
          }
        } else {
          console.log('✅ Verificación final exitosa: número correcto de mensajes V2');
        }
      }
    } else {
      console.log(`✅ No hay mensajes sobrantes que eliminar`);
    }

  } catch (error) {
    console.error(`❌ Error en el proceso de actualización:`, {
      message: error.message,
      stack: error.stack
    });
  }
}