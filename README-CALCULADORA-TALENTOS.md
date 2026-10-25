# Calculadora propia de talentos · Pacto Escarlata

La página `/talentos` renderiza una calculadora React propia y ya no intenta incrustar TalentsForever mediante iframe.

## Funciones
- Nueve clases y sus árboles publicados en los datos de TalentsForever.
- Asignación y retirada de rangos, presupuesto por nivel, límites de fila y requisitos de talentos.
- Panel de descripción, reinicio por árbol o build, y enlace compartible.
- Diseño responsive con la estética de Pacto Escarlata.

## Datos, proxy y atribución
La calculadora solicita `/api/talents-data`. La Pages Function `functions/api/[[path]].ts` sirve como proxy same-origin hacia `https://talentsforever.com/data.json` y cachea la respuesta durante una hora para evitar problemas CORS. El resto de rutas `/api` continúa dirigiéndose al Worker de Pacto Escarlata.

Los datos se publican bajo CC BY 4.0 y requieren atribución a [TalentsForever](https://talentsforever.com/). Los nombres, textos e iconos de World of Warcraft pertenecen a sus respectivos titulares. No es una herramienta oficial de Blizzard.

## Probar
```bash
npm install
npm run build
npm run dev
```
Abre `/talentos`. Para probar el endpoint de datos local, usa el entorno de Pages Functions (por ejemplo, `wrangler pages dev`) o despliega a Cloudflare Pages; el servidor de desarrollo básico de Vite no ejecuta automáticamente las Pages Functions.

## Notas
- La calculadora muestra la fecha `generated` incluida en el JSON.
- Reglas de puntos aplicadas según la fuente: un punto por nivel desde el 10 hasta 51 a nivel 60; las filas se desbloquean cada cinco puntos en filas anteriores y los requisitos explícitos exigen el rango máximo.
- Fuente de datos: [TalentsForever](https://talentsforever.com/) · [licencia CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
