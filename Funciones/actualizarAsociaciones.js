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
     * Crea un ContainerBuilder para una lista de asociaciones (una "división")
     * @param {Array<Object>} asociation
     * @returns {ContainerBuilder}
     */
    function createContainerForAsociation(asociation) {
      const asignado = asociation[0]?.Asignado || 'SinAsignar';

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
          const renovacionTimestamp = aso.UltimaRenovacion ? Math.floor(new Date(aso.UltimaRenovacion).getTime() / 1000) : null;

          container
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                [
                  aso.Canal ? `<:canales:1340014379080618035> <#${aso.Canal}>` : '<:canales:1340014379080618035> Sin canal',
                  aso.Renovacion ? `🗓️ <t:${renovacionTimestamp}:R>` : 'No definido',
                  aso.Representante ? `<:representante:1340014390342193252> <@${aso.Representante}>` : '<:representante:1340014390342193252> Sin representante'
                ].join('\n')
              )
            );
        } else {
          container
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                [
                  aso.Canal ? `<:canales:1340014379080618035> <#${aso.Canal}>` : '<:canales:1340014379080618035> Sin canal'
                ].join('\n')
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
     * @returns {EmbedBuilder}
     */
    function createSummaryEmbed(asociations) {
      const ahora = Date.now();
      const total = asociations.length;

          const canalesEnCategorias = client.channels.cache.filter(ch =>
      ch.isTextBased() && (ch.parentId === categoria1Id || ch.parentId === categoria2Id)
    );

    const canalesRegistrados = new Set(asociations.map(aso => aso.Canal));

    // Canales en categorías que NO están registrados
    const canalesNoRegistrados = canalesEnCategorias.filter(c => !canalesRegistrados.has(c.id));


      const sinRenovar = asociations.filter(a => {
        // Buscamos posibles nombres de campo para la fecha de última renovación
        const last = a.UltimaRenovacion ?? null

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
          { name: 'Total', value: `${total}`, inline: true },
          { name: 'Sin asignar', value: `${canalesNoRegistrados.length}`, inline: true },
          { name: 'Sin renovar', value: `${sinRenovar}`, inline: true },
        )

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

    // Obtenemos canales de las dos categorías (filtramos por parentId)
    const canalesEnCategorias = client.channels.cache.filter(ch =>
      ch.isTextBased() && (ch.parentId === categoria1Id || ch.parentId === categoria2Id)
    );

    // Traemos todas las asociaciones con Canal definido (las que están registradas)
    const todasAsociacionesDB = await Asociacion.find({ Canal: { $ne: null } });

    // Verificamos que el canal existe realmente en el cliente (evita entradas huérfanas)
    const asociations = (
      await Promise.all(
        todasAsociacionesDB.map(async (aso) => {
          try {
            await client.channels.fetch(aso.Canal);
            return aso;
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
    // Agrupar y ordenar
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

    // Helper para obtener el nombre del canal desde un objeto aso (si existe en cache)
    const channelNameFromAso = (aso) => {
      try {
        const ch = client.channels.cache.get(String(aso.Canal));
        return ch ? ch.name : '';
      } catch {
        return '';
      }
    };

    // 1) Ordenar internamente cada grupo por nombre de canal (alfabético)
    for (const key of Object.keys(agrupado)) {
      agrupado[key].sort((a, b) => {
        const nameA = channelNameFromAso(a);
        const nameB = channelNameFromAso(b);
        return nameA.localeCompare(nameB, undefined, { sensitivity: 'base', numeric: true });
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
          /* ignore, mantenemos fallback */
        }
        return { key, name: nameFallback, arr };
      })
    );

    staffWithNames.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }));

    // Construimos expectedAsociations: staffs ordenados + SinAsignar al final
    const expectedAsociations = [
      ...staffWithNames.map(s => [...agrupado[s.key]]),
      [...agrupado['SinAsignar']]
    ];

    // 3) Añadimos canales no registrados a la última agrupación (SinAsignar)
    for (const canal of canalesNoRegistrados.values()) {
      expectedAsociations[expectedAsociations.length - 1].push({ Canal: canal.id, Asignado: 'SinAsignar' });
    }

    // Re-ordenamos la agrupación SinAsignar por nombre de canal una vez añadidos los no registrados
    expectedAsociations[expectedAsociations.length - 1].sort((a, b) => {
      const nameA = channelNameFromAso(a) || client.channels.cache.get(String(a.Canal))?.name || '';
      const nameB = channelNameFromAso(b) || client.channels.cache.get(String(b.Canal))?.name || '';
      return nameA.localeCompare(nameB, undefined, { sensitivity: 'base', numeric: true });
    });

    // Esperamos 1 mensaje resumen + N divisiones
    const expectedMessages = 1 + expectedAsociations.length;

    // Si no existe mensaje resumen -> limpiamos y creamos todo desde cero
    if (!summaryMsg) {
      // borramos todos los mensajes del bot que había
      await Promise.all(botMessages.map(m => m.delete().catch(() => {})));

      // Enviamos resumen (embed tradicional)
      const summaryEmbed = createSummaryEmbed(asociations);
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
      // borrar y recrear
      await Promise.all(botMessages.map(m => m.delete().catch(() => {})));

      // recreate summary
      const summaryEmbed = createSummaryEmbed(asociations);
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

    // Si llegamos aquí -> actualizamos los mensajes existentes:
    // 1) editamos el summaryMsg con datos nuevos
    const newSummaryEmbed = createSummaryEmbed(asociations);
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
          console.error('Error editando msg V2, intentando recrear:', err);
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
        await channel.send({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { users: [] }
        }).catch(e => console.error('Error enviando nuevo mensaje V2:', e));
      }
    }

  } catch (error) {
    console.error(`Error en el proceso de actualización: ${error}`);
  }
}
