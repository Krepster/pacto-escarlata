# Pacto Escarlata — Profesiones

## Cambios
- El catálogo incluye las 12 profesiones principales/secundarias reconocidas por las referencias de Warcraft Forever.
- Se añaden rutas locales `/profesiones/<slug>` para cada ficha.
- La navegación superior incluye enlaces a las 12 fichas.
- Cada ficha presenta propósito, progresión según tipo de profesión, novedades de referencia y enlaces a las fuentes.
- Las profesiones de fabricación/secundarias con recetas enlazan al planificador de subida oficial; las de recolección se distinguen de las rutas de fabricación.

## Importante sobre los datos
Las rutas y costes oficiales pueden cambiar según la casa de subastas y la beta. Esta entrega enlaza a las fuentes actualizadas y no inventa cantidades de materiales ni publica una lista de compra local sin validación. Los ejemplos de novedades se muestran como ejemplos, no como catálogo exhaustivo.

## Validación
No se ha podido completar `npm ci` en el entorno de preparación porque agotó el tiempo de ejecución. Por tanto, no se ha confirmado una compilación en este entorno. Ejecutar localmente:

```powershell
npm ci
npm run build
npm run dev
```

Probar `/profesiones` y cada ruta de profesión antes de subir los cambios a `main`. No se ha realizado ningún push ni despliegue.

## Fuentes consultadas
- https://warcraftforever.games/es/professions
- https://warcraftforever.games/es/guides/profession-leveling
- https://www.wow-professions.com/forever


## Rutas de subida 1–300

Las tablas locales de Alquimia, Herrería, Encantamiento, Ingeniería, Peletería, Sastrería, Cocina y Primeros auxilios utilizan como referencia rutas calculadas desde el cliente beta de WoW Forever, build 1.60.1.70205, publicadas en METAMMO: https://metammo.com/wow-forever/professions. Los recuentos son estimaciones; las recetas que dependen de un patrón pueden requerir conseguirlo antes. Herboristería, Minería, Desuello y Pesca progresan mediante recolección y se documentan por tramos de habilidad, no mediante tablas de fabricación. Revisar datos tras cambios de beta/versión.
