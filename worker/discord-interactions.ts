
export interface DiscordBotEnv {
  DB: D1Database;
  DISCORD_PUBLIC_KEY: string;
  DISCORD_GUILD_ID: string;
  DISCORD_BOT_TOKEN: string;
  DISCORD_REVIEW_CHANNEL_ID: string;
  DISCORD_ADMIN_ROLE_ID: string;
}

type SubmittedComponent = {
  custom_id?: string;
  value?: string;
  values?: string[];
};

type ModalRow = {
  component?: SubmittedComponent;
  components?: SubmittedComponent[];
};

type Interaction = {
  type?: number;
  guild_id?: string;
  channel_id?: string;
  message?: { id?: string; channel_id?: string; embeds?: Array<Record<string, any>> };
  member?: {
    roles?: string[];
    permissions?: string;
    user?: {
      id?: string;
      username?: string;
      global_name?: string;
    };
  };
  user?: {
    id?: string;
    username?: string;
    global_name?: string;
  };
  data?: {
    name?: string;
    custom_id?: string;
    components?: ModalRow[];
    values?: string[];
  };
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

function hexBytes(
  hex: string,
  expected: number,
): Uint8Array<ArrayBuffer> | null {
  if (
    hex.length !== expected * 2 ||
    !new RegExp(`^[0-9a-fA-F]{${expected * 2}}$`).test(hex)
  ) {
    return null;
  }

  const bytes = new Uint8Array(new ArrayBuffer(expected));

  for (let i = 0; i < expected; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }

  return bytes;
}

async function validSignature(
  request: Request,
  raw: string,
  publicKeyHex: string,
) {
  const pub = hexBytes(publicKeyHex, 32);
  const sig = hexBytes(
    request.headers.get("X-Signature-Ed25519") ?? "",
    64,
  );
  const timestamp =
    request.headers.get("X-Signature-Timestamp") ?? "";

  if (!pub || !sig || !timestamp) return false;

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      pub,
      { name: "Ed25519" },
      false,
      ["verify"],
    );

    return await crypto.subtle.verify(
      { name: "Ed25519" },
      key,
      sig,
      new TextEncoder().encode(timestamp + raw),
    );
  } catch {
    return false;
  }
}

const ephemeral = (content: string) => ({
  type: 4,
  data: {
    content,
    flags: 64,
  },
});

const discordApi = async (env: DiscordBotEnv, path: string, init: RequestInit) => {
  return fetch(`https://discord.com/api/v10${path}`, {
    ...init,
    headers: {
      Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
};

const escapeDiscordText = (value: string) => value.replace(/[\\*_~`>|]/g, "\\$&");

async function postRosterReviewMessage(
  env: DiscordBotEnv,
  requestId: number,
  details: { discordId: string; username: string; character: string; className: string; specialization: string; role: string },
): Promise<boolean> {
  if (!env.DISCORD_BOT_TOKEN || !env.DISCORD_REVIEW_CHANNEL_ID) {
    console.error("Configuración Discord incompleta", {
      hasBotToken: Boolean(env.DISCORD_BOT_TOKEN),
      hasReviewChannelId: Boolean(env.DISCORD_REVIEW_CHANNEL_ID),
    });
    return false;
  }
  const response = await discordApi(env, `/channels/${env.DISCORD_REVIEW_CHANNEL_ID}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content: `Nueva solicitud de roster · <@${details.discordId}>`,
      embeds: [{
        title: `Solicitud #${requestId}`,
        color: 0x9b1c31,
        fields: [
          { name: "Personaje", value: escapeDiscordText(details.character), inline: true },
          { name: "Clase", value: escapeDiscordText(details.className), inline: true },
          { name: "Especialización", value: escapeDiscordText(details.specialization), inline: true },
          { name: "Rol", value: escapeDiscordText(details.role), inline: true },
          { name: "Discord", value: `${escapeDiscordText(details.username)} · ${details.discordId}`, inline: false },
          { name: "Estado", value: "Pendiente de revisión", inline: false },
        ],
        footer: { text: "Pacto Escarlata · Gestión de roster" },
      }],
      components: [{
        type: 1,
        components: [
          { type: 2, style: 3, label: "Aprobar", custom_id: `pacto_review|approve|${requestId}` },
          { type: 2, style: 4, label: "Rechazar", custom_id: `pacto_review|reject|${requestId}` },
        ],
      }],
      allowed_mentions: { users: [details.discordId] },
    }),
  });
  if (!response.ok) {
    console.error("Discord no pudo publicar la solicitud del roster:", response.status, await response.text());
    return false;
  }
  return true;
}

async function updateReviewMessage(
  env: DiscordBotEnv,
  interaction: Interaction,
  status: "approved" | "rejected",
  reviewer: string,
  ctx: ExecutionContext,
): Promise<void> {
  const messageId = interaction.message?.id;
  const channelId = interaction.channel_id ?? interaction.message?.channel_id;

  if (!messageId || !channelId || channelId !== env.DISCORD_REVIEW_CHANNEL_ID) return;

  const label = status === "approved" ? "APROBADA" : "RECHAZADA";
  const response = await discordApi(env, `/channels/${channelId}/messages/${messageId}`, {
    method: "PATCH",
    body: JSON.stringify({
      embeds: interaction.message?.embeds?.map((embed: Record<string, any>) => {
        const fields = Array.isArray(embed.fields)
          ? embed.fields.filter((field: any) => field?.name !== "Estado" && field?.name !== "Revisada por")
          : [];
        return {
          ...embed,
          color: status === "approved" ? 0x2e8b57 : 0x992d22,
          fields: [
            ...fields,
            { name: "Estado", value: label, inline: false },
            { name: "Revisada por", value: escapeDiscordText(reviewer), inline: false },
          ],
        };
      }) ?? [{ title: `Solicitud ${label}`, description: `Revisada por ${escapeDiscordText(reviewer)}` }],
      components: [{
        type: 1,
        components: [
          { type: 2, style: 3, label: "Aprobar", custom_id: "pacto_review|done|approve", disabled: true },
          { type: 2, style: 4, label: "Rechazar", custom_id: "pacto_review|done|reject", disabled: true },
        ],
      }],
    }),
  });

  if (!response.ok) {
    console.error("No se pudo actualizar el mensaje de revisión:", response.status, await response.text());
    return;
  }

  // Espera 5 segundos y elimina solo el mensaje de Discord; la solicitud queda en D1.
  ctx.waitUntil((async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, 5000));
    try {
      const deleteResponse = await discordApi(
        env,
        `/channels/${channelId}/messages/${messageId}`,
        { method: "DELETE" },
      );
      if (!deleteResponse.ok && deleteResponse.status !== 404) {
        console.error("No se pudo eliminar el mensaje revisado:", deleteResponse.status, await deleteResponse.text());
      }
    } catch (error) {
      console.error("Error eliminando el mensaje revisado:", error);
    }
  })());
}

const classes = {
  druid: {
    label: "Druida",
    specs: {
      balance: "Equilibrio",
      feral: "Feral",
      restoration: "Restauración",
    },
  },
  hunter: {
    label: "Cazador",
    specs: {
      beast_mastery: "Dominio de bestias",
      marksmanship: "Puntería",
      survival: "Supervivencia",
    },
  },
  mage: {
    label: "Mago",
    specs: {
      arcane: "Arcano",
      fire: "Fuego",
      frost: "Escarcha",
    },
  },
  paladin: {
    label: "Paladín",
    specs: {
      holy: "Sagrado",
      protection: "Protección",
      retribution: "Reprensión",
    },
  },
  priest: {
    label: "Sacerdote",
    specs: {
      discipline: "Disciplina",
      holy: "Sagrado",
      shadow: "Sombras",
    },
  },
  rogue: {
    label: "Pícaro",
    specs: {
      assassination: "Asesinato",
      combat: "Combate",
      subtlety: "Sutileza",
    },
  },
  shaman: {
    label: "Chamán",
    specs: {
      elemental: "Elemental",
      enhancement: "Mejora",
      restoration: "Restauración",
    },
  },
  warlock: {
    label: "Brujo",
    specs: {
      affliction: "Aflicción",
      demonology: "Demonología",
      destruction: "Destrucción",
    },
  },
  warrior: {
    label: "Guerrero",
    specs: {
      arms: "Armas",
      fury: "Furia",
      protection: "Protección",
    },
  },
} as const;

type ClassKey = keyof typeof classes;

type SpecKey<C extends ClassKey> =
  keyof (typeof classes)[C]["specs"] & string;

function isClassKey(value: string): value is ClassKey {
  return Object.prototype.hasOwnProperty.call(classes, value);
}

function isSpecKey(
  classKey: ClassKey,
  specKey: string,
): boolean {
  return Object.prototype.hasOwnProperty.call(
    classes[classKey].specs,
    specKey,
  );
}


function getAllowedRoles(
  classKey: ClassKey,
  specKey: string,
): string[] {
  // Feral puede ser tanque o DPS.
  if (classKey === "druid" && specKey === "feral") {
    return ["Tanque", "DPS"];
  }

  if (
    (classKey === "paladin" && specKey === "protection") ||
    (classKey === "warrior" && specKey === "protection")
  ) {
    return ["Tanque"];
  }

  if (
    (classKey === "druid" && specKey === "restoration") ||
    (classKey === "priest" &&
      (specKey === "discipline" || specKey === "holy")) ||
    (classKey === "paladin" && specKey === "holy") ||
    (classKey === "shaman" && specKey === "restoration")
  ) {
    return ["Sanador"];
  }

  return ["DPS"];
}


function registrationModal() {
  const classOptions = Object.entries(classes).map(
    ([value, item]) => ({
      label: item.label,
      value,
    }),
  );

  return {
    type: 9,
    data: {
      custom_id: "pacto_registrar_personaje",
      title: "Registrar personaje",
      components: [
        {
          type: 18,
          label: "Nombre del personaje",
          component: {
            type: 4,
            custom_id: "character_name",
            style: 1,
            placeholder: "Ej. Skyrex",
            required: true,
            min_length: 2,
            max_length: 32,
          },
        },
        {
          type: 18,
          label: "Clase",
          component: {
            type: 3,
            custom_id: "class_name",
            placeholder: "Selecciona tu clase",
            options: classOptions,
            required: true,
          },
        },
      ],
    },
  };
}

function selectionMessage(
  content: string,
  customId: string,
  placeholder: string,
  options: Array<{ label: string; value: string }>,
) {
  return {
    type: 4,
    data: {
      content,
      flags: 64,
      components: [
        {
          type: 1,
          components: [
            {
              type: 3,
              custom_id: customId,
              placeholder,
              options,
              min_values: 1,
              max_values: 1,
            },
          ],
        },
      ],
    },
  };
}

function readModalFields(
  components: ModalRow[] | undefined,
): Record<string, string> {
  const fields: Record<string, string> = {};

  for (const row of components ?? []) {
    const candidates = [
      ...(row.component ? [row.component] : []),
      ...(row.components ?? []),
    ];

    for (const item of candidates) {
      if (!item.custom_id) continue;

      if (typeof item.value === "string") {
        fields[item.custom_id] = item.value.trim();
      } else if (Array.isArray(item.values)) {
        fields[item.custom_id] = item.values[0] ?? "";
      }
    }
  }

  return fields;
}

function getUser(interaction: Interaction) {
  return interaction.member?.user ?? interaction.user;
}

function validCharacterName(character: string) {
  return (
    character.length >= 2 &&
    character.length <= 32 &&
    !character.includes("|")
  );
}

export async function handleDiscordInteractions(
  request: Request,
  env: DiscordBotEnv,
  ctx: ExecutionContext,
): Promise<Response> {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  if (!env.DISCORD_PUBLIC_KEY || !env.DISCORD_GUILD_ID) {
    return json({ error: "Discord no configurado" }, 503);
  }

  const raw = await request.text();

  if (raw.length > 20_000) {
    return json({ error: "Payload too large" }, 413);
  }

  if (!(await validSignature(
    request,
    raw,
    env.DISCORD_PUBLIC_KEY,
  ))) {
    return json({ error: "Invalid signature" }, 401);
  }

  let interaction: Interaction;

  try {
    interaction = JSON.parse(raw) as Interaction;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (interaction.type === 1) {
    return json({ type: 1 });
  }

  if (interaction.guild_id !== env.DISCORD_GUILD_ID) {
    return json(
      ephemeral(
        "Este comando solo está disponible en el servidor de Pacto Escarlata.",
      ),
    );
  }

  // Aprobación/rechazo desde los botones del canal privado de oficiales.
  if (interaction.type === 3 && interaction.data?.custom_id?.startsWith("pacto_review|")) {
    const parts = interaction.data.custom_id.split("|");
    const action = parts[1];
    const requestId = Number(parts[2]);
    const user = getUser(interaction);
    const memberRoles = interaction.member?.roles ?? [];

    if (!env.DISCORD_BOT_TOKEN || !env.DISCORD_REVIEW_CHANNEL_ID || !env.DISCORD_ADMIN_ROLE_ID) {
      return json(ephemeral("La revisión del roster no está configurada completamente en el Worker."));
    }
    if ((interaction.channel_id ?? interaction.message?.channel_id) !== env.DISCORD_REVIEW_CHANNEL_ID) {
      return json(ephemeral("Estos botones solo se pueden utilizar en el canal de revisión."));
    }
    if (!user?.id || !memberRoles.includes(env.DISCORD_ADMIN_ROLE_ID)) {
      return json(ephemeral("No tienes el rol autorizado para aprobar o rechazar solicitudes."));
    }
    if (!Number.isSafeInteger(requestId) || requestId <= 0 || !["approve", "reject"].includes(action ?? "")) {
      return json(ephemeral("Esta acción de revisión no es válida."));
    }

    try {
      const row = await env.DB.prepare(
        "SELECT id, discord_id, discord_username, character_name, class_name, specialization, role, status FROM roster_requests WHERE id = ?",
      ).bind(requestId).first<{ id: number; discord_id: string; discord_username: string; character_name: string; class_name: string; specialization: string; role: string; status: string }>();
      if (!row) return json(ephemeral("No se ha encontrado esta solicitud."));
      if (row.status !== "pending") return json(ephemeral(`Esta solicitud ya fue revisada: ${row.status === "approved" ? "aprobada" : "rechazada"}.`));

      const reviewer = (user.global_name || user.username || user.id).slice(0, 80);
      if (action === "approve") {
        const results = await env.DB.batch([
          env.DB.prepare(
            "INSERT INTO roster_members (character_name, class_name, specialization, role) SELECT ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM roster_requests WHERE id = ? AND status = 'pending')",
          ).bind(row.character_name, row.class_name, row.specialization, row.role, requestId),
          env.DB.prepare(
            "UPDATE roster_requests SET status = 'approved', reviewed_at = CURRENT_TIMESTAMP, reviewed_by = ? WHERE id = ? AND status = 'pending'",
          ).bind(reviewer, requestId),
        ]);
        if (!results[0]?.meta.changes || !results[1]?.meta.changes) {
          return json(ephemeral("La solicitud ya ha sido revisada por otro oficial."));
        }
        await updateReviewMessage(env, interaction, "approved", reviewer, ctx);
        return json(ephemeral(`Solicitud #${requestId} aprobada. ${row.character_name} ya forma parte del roster.`));
      }

      const result = await env.DB.prepare(
        "UPDATE roster_requests SET status = 'rejected', reviewed_at = CURRENT_TIMESTAMP, reviewed_by = ? WHERE id = ? AND status = 'pending'",
      ).bind(reviewer, requestId).run();
      if (!result.meta.changes) return json(ephemeral("La solicitud ya ha sido revisada por otro oficial."));
      await updateReviewMessage(env, interaction, "rejected", reviewer, ctx);
      return json(ephemeral(`Solicitud #${requestId} rechazada.`));
    } catch (error) {
      console.error("Error revisando solicitud desde Discord:", error);
      return json(ephemeral("No se pudo completar la revisión. Comprueba los logs del Worker local."));
    }
  }

  // Paso 1: abrir el formulario de personaje y clase.
  if (
    interaction.type === 2 &&
    interaction.data?.name === "registrar"
  ) {
    return json(registrationModal());
  }

  // Paso 2: recibir nombre y clase y mostrar sus especializaciones.
  if (
    interaction.type === 5 &&
    interaction.data?.custom_id === "pacto_registrar_personaje"
  ) {
    const fields = readModalFields(interaction.data.components);
    const character = fields.character_name ?? "";
    const classKey = fields.class_name ?? "";

    if (!validCharacterName(character) || !isClassKey(classKey)) {
      return json(
        ephemeral(
          "Nombre o clase no válidos. Vuelve a ejecutar /registrar.",
        ),
      );
    }

    const specOptions = Object.entries(
      classes[classKey].specs,
    ).map(([value, label]) => ({ label, value }));

    return json(
      selectionMessage(
        `Personaje: **${character}** · Clase: **${classes[classKey].label}**\nSelecciona tu especialización.`,
        `pacto_spec|${getUser(interaction)?.id ?? ""}|${character}|${classKey}`,
        "Selecciona tu especialización",
        specOptions,
      ),
    );
  }

  // Paso 3: recibir la especialización y mostrar los roles permitidos.
  if (
    interaction.type === 3 &&
    interaction.data?.custom_id?.startsWith("pacto_spec|")
  ) {
    const user = getUser(interaction);
    const parts = interaction.data.custom_id.split("|");
    const [, ownerId, character, classKeyRaw] = parts;
    const classKey = classKeyRaw ?? "";
    const specKey = interaction.data.values?.[0] ?? "";

    if (!user?.id || user.id !== ownerId) {
      return json(
        ephemeral("Este registro pertenece a otro usuario."),
      );
    }

    if (
      !validCharacterName(character ?? "") ||
      !isClassKey(classKey) ||
      !isSpecKey(classKey, specKey)
    ) {
      return json(
        ephemeral("Selección no válida. Vuelve a ejecutar /registrar."),
      );
    }

    const specLabel =
      classes[classKey].specs[
        specKey as SpecKey<typeof classKey>
      ];

    const roles = getAllowedRoles(classKey, specKey);
    const roleOptions = roles.map((role) => ({
      label: role,
      value: role,
    }));

    return json(
      selectionMessage(
        `Personaje: **${character}** · **${classes[classKey].label} — ${specLabel}**\nSelecciona tu rol.`,
        `pacto_role|${ownerId}|${character}|${classKey}|${specKey}`,
        "Selecciona tu rol",
        roleOptions,
      ),
    );
  }

  // Paso 4: validar todas las selecciones y guardar la solicitud.
  if (
    interaction.type === 3 &&
    interaction.data?.custom_id?.startsWith("pacto_role|")
  ) {
    const user = getUser(interaction);
    const parts = interaction.data.custom_id.split("|");
    const [, ownerId, character, classKeyRaw, specKey] = parts;
    const classKey = classKeyRaw ?? "";
    const role = interaction.data.values?.[0] ?? "";

    if (!user?.id || !user.username || user.id !== ownerId) {
      return json(
        ephemeral("Este registro pertenece a otro usuario."),
      );
    }

    if (
      !validCharacterName(character ?? "") ||
      !isClassKey(classKey) ||
      !isSpecKey(classKey, specKey ?? "") ||
      !getAllowedRoles(classKey, specKey ?? "").includes(role)
    ) {
      return json(
        ephemeral(
          "La combinación de clase, especialización y rol no es válida. Vuelve a ejecutar /registrar.",
        ),
      );
    }

    const className = classes[classKey].label;
    const specialization =
      classes[classKey].specs[
        specKey as SpecKey<typeof classKey>
      ];

    try {
      const duplicate = await env.DB.prepare(
        "SELECT id FROM roster_requests WHERE discord_id = ? AND lower(character_name) = lower(?) AND status = 'pending' LIMIT 1",
      )
        .bind(user.id, character)
        .first();

      if (duplicate) {
        return json(
          ephemeral(
            "Ya tienes una solicitud pendiente para ese personaje.",
          ),
        );
      }

      const insert = await env.DB.prepare(
        "INSERT INTO roster_requests (discord_id, discord_username, character_name, class_name, specialization, role, status) VALUES (?, ?, ?, ?, ?, ?, 'pending')",
      )
        .bind(
          user.id,
          (user.global_name || user.username).slice(0, 100),
          character,
          className,
          specialization,
          role,
        )
        .run();

      const requestId = Number(insert.meta.last_row_id);
      let notified = false;
      try {
        notified = await postRosterReviewMessage(env, requestId, {
          discordId: user.id,
          username: (user.global_name || user.username).slice(0, 100),
          character,
          className,
          specialization,
          role,
        });
      } catch (error) {
        console.error("Error publicando solicitud en el canal de oficiales:", error);
      }

      return json(
        ephemeral(
          notified
            ? `Solicitud #${requestId} enviada para ${character} (${className} — ${specialization}, ${role}). Los oficiales pueden revisarla en el canal privado.`
            : `Solicitud #${requestId} guardada para ${character}, pero no se pudo avisar al canal de oficiales. La solicitud sigue pendiente; revisa la configuración del bot y los logs locales.`,
        ),
      );
    } catch (error) {
      console.error("Error guardando la solicitud del roster:", error);

      return json(
        ephemeral(
          "No se pudo guardar la solicitud. Comprueba que las migraciones locales de D1 estén aplicadas.",
        ),
      );
    }
  }

  return json({ error: "Unknown interaction" }, 400);
}
