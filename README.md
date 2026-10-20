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
