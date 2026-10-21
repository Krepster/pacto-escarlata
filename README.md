# Pacto Escarlata — Cloudflare-first

Base inicial para la hermandad Pacto Escarlata (Alianza · WoW Forever · PvE Normal), pensada para funcionar sin VPS ni prueba temporal.

## Arquitectura
- Frontend: React + Vite + TypeScript, publicado en Cloudflare Pages.
- API: Cloudflare Workers (TypeScript).
- Base de datos: Cloudflare D1 (SQL administrado).
- Código: GitHub.
- Coste objetivo: 0 €/mes dentro de los límites del plan gratuito. Las cuotas y condiciones de proveedores pueden cambiar.

Esta versión sustituye FastAPI/PostgreSQL por Workers/D1. Es una adaptación necesaria para no depender de un servidor Python siempre encendido.

## Desarrollo local
Requisitos: Node.js LTS, npm, cuenta de Cloudflare y Git.

```bash
npm install
npm run dev
```

La web se sirve en Vite. La API Worker se configura con Wrangler; para probar todo localmente:
```bash
npm run dev:worker
```
Consulta `wrangler.toml` y ejecuta una vez:
```bash
npx wrangler d1 migrations apply pacto-escarlata-db --local
```

## Publicar en Cloudflare
1. Crea un repositorio GitHub vacío `pacto-escarlata` y sube este proyecto.
2. En Cloudflare, crea una base de datos D1 llamada `pacto-escarlata-db`.
3. Copia el ID de D1 a `wrangler.toml`, sustituyendo `REEMPLAZAR_CON_ID_D1`.
4. Aplica migraciones en remoto:
   ```bash
   npx wrangler d1 migrations apply pacto-escarlata-db --remote
   ```
5. Despliega el Worker:
   ```bash
   npm run deploy:worker
   ```
6. Crea un proyecto Cloudflare Pages conectado a GitHub, raíz del proyecto `/`, build `npm run build`, directorio `dist`.
7. En Pages, define `VITE_API_BASE_URL` con la URL pública del Worker (por ejemplo `https://pacto-escarlata-api.TU_SUBDOMINIO.workers.dev/api`).
8. Para probar una publicación, ejecuta `npm run build` y comprueba el flujo desde la URL de Pages.

## GitHub
```bash
git init
git add .
git commit -m "chore: bootstrap Pacto Escarlata on Cloudflare"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/pacto-escarlata.git
git push -u origin main
```
No se ha creado el repositorio remoto automáticamente. Sustituye `TU_USUARIO`.

## Estado
La portada y el endpoint de estado son funcionales. La migración D1 crea tablas iniciales para miembros, personajes, eventos e inscripciones. Aún falta implementar autenticación, permisos, formularios persistentes y panel de administración antes de abrir el registro al público.

## Cambios de la portada (revisión web)
- El bloque «La hermandad» ahora es una galería/carrusel visual con controles y puntos de navegación.
- Se ha eliminado el enlace duplicado «Reclutamiento». La acción principal es «Únete al pacto».
- Se ha añadido un apartado «Plantilla» que consulta `GET /api/roster`; el bot de Discord todavía debe construirse e integrarse para registrar personajes.
- Configura `VITE_DISCORD_INVITE_URL` con la invitación real del servidor antes de publicar. La web no puede adivinar esa URL.
- Las imágenes de ejemplo son imágenes de ambiente fantástico externas; sustitúyelas por capturas propias o imágenes de WoW que tengas permiso para usar en `guildGallery` dentro de `src/App.tsx`.


## Bot de Discord: registro de personajes (implementación local)

El Worker incluye el endpoint de Discord Interactions `POST /api/discord/interactions` y el comando `/registrar`. Al enviar el formulario, el bot valida los datos y crea una solicitud `pending` en D1; no publica el personaje en el roster hasta que un administrador lo apruebe.

### Configuración manual necesaria

1. En Discord Developer Portal, abre la aplicación/bot de Pacto Escarlata y copia **Application ID**, **Public Key** y **Bot Token**. No compartas ni subas el token a Git.
2. Define los secretos en el Worker local con Wrangler (el token del bot no se necesita para recibir interacciones):
   ```bash
   npx wrangler secret put DISCORD_PUBLIC_KEY
   npx wrangler secret put DISCORD_GUILD_ID
   ```
   `DISCORD_GUILD_ID` puede estar ya configurado en el entorno; no lo dupliques si existe. La clave pública debe ser la de la misma aplicación de Discord.
3. Configura la URL de interacciones en Discord Developer Portal como `https://TU-WORKER.workers.dev/api/discord/interactions`. Para pruebas locales, Discord no puede llamar directamente a `localhost`; usa un túnel HTTPS temporal o un Worker de desarrollo aislado.
4. Registra el comando de servidor con las variables de entorno `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID` y `DISCORD_GUILD_ID` en tu terminal local: `npm run register:discord-command`. El script reemplaza los comandos de esa aplicación en ese servidor por `/registrar`; ejecútalo solo si eso es lo que quieres.
5. Aplica la nueva migración únicamente al D1 **local** para probar: `npx wrangler d1 migrations apply pacto-escarlata-db --local`. No uses `--remote` en esta fase.

### Seguridad y alcance

- Las interacciones se verifican con la firma Ed25519 de Discord.
- Solo se aceptan interacciones del servidor configurado en `DISCORD_GUILD_ID`.
- Los registros se guardan como `pending`; los endpoints de administración existentes gestionan aprobación/rechazo.
- No se ha desplegado el Worker, aplicado migración remota ni cambiado producción.
