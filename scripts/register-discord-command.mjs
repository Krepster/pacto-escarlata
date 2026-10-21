// Register the /registrar command in the configured Discord guild.
// Run manually with DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID and DISCORD_GUILD_ID set.
const token = process.env.DISCORD_BOT_TOKEN;
const applicationId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;
if (!token || !applicationId || !guildId) {
  console.error("Faltan DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID o DISCORD_GUILD_ID.");
  process.exit(1);
}
const response = await fetch(`https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands`, {
  method: "PUT",
  headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify([{
    name: "registrar",
    description: "Registrar un personaje en el roster de Pacto Escarlata",
    type: 1
  }])
});
const text = await response.text();
if (!response.ok) {
  console.error(`Discord API respondió ${response.status}: ${text}`);
  process.exit(1);
}
console.log("Comando /registrar registrado correctamente:");
console.log(text);
