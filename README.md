# Fichas técnicas de vidrio

Módulo Next.js para convertir los datos de prestaciones de un configurador de
vidrio en fichas técnicas PDF, y para administrar la cartera comercial
asociada: **clientes, proyectos, agentes de venta y especificaciones emitidas**.

## Funcionalidad

- **Entrada amigable**: se pega el bloque HTML del configurador o se arrastra un
  PDF/HTML para crear la ficha; el analizador detecta automáticamente los
  apartados, normas, iconos y valores.
- **Drag & drop**: en **Nueva ficha** puedes soltar un PDF de prestaciones o un
  archivo HTML/HTM/TXT del configurador sobre la página. El editor carga los
  datos y el asistente IA propone nombre y campos.
- **Editor de la ficha**: permite corregir etiquetas y valores, cambiar iconos,
  ocultar apartados del PDF, reordenarlos, añadir filas y composición de capas.
- **Composición estructurada**: cada capa se precarga desde el configurador con
  su tipo (sustrato, capa, cámara, butiral), material, espesor, tratamiento
  térmico, posición y estado de laminado. Las capas funcionales no suman
  espesor y el total se calcula solo con vidrio y cámaras. Las tarjetas y la
  barra del componente **Capa** se marcan en **rojo**; los sustratos, cámaras y
  el resto del diagrama de vidrio conservan el azul original.
- **PDF limpio**: se omiten las prestaciones sin valor, las secciones vacías,
  los metadatos vacíos y las capas sin material; no se imprimen guiones,
  “N/A” ni placeholders.
- **PDF fiel al original**: A4 con los logos configurables de la organización y
  del fabricante, diagrama del acristalamiento, apartados con iconos, pie legal
  y numeración de página.
- **Vista previa** antes de guardar, descarga del PDF guardado y duplicado para
  revisiones.
- **CRM ligero**: clientes, proyectos, agentes y fichas relacionadas, con
  filtros, estados de emisión y borrado en cascada controlado.
- **Asistente IA**: consulta el catálogo de fichas guardadas, compara
  prestaciones, revisa la coherencia frente a las normas y sugiere nombres
  comerciales o composiciones. También analiza imágenes o capturas.
- **Configuración por usuario**: cada navegador/perfil puede definir su propia
  API key, endpoint, modelo, razonamiento y valores predeterminados de las
  fichas nuevas desde **Configuración**. La clave no se guarda en el servidor.
- **Varios proveedores de IA**: guarda una lista de proveedores, cada uno con
  su propia clave, endpoint y modelo; elige uno predeterminado y cambia de
  proveedor desde el chat.
- **Branding totalmente editable**: nombre de la app, empresa, tagline, logo y
  línea de contacto. Se aplica en login, menú, configuración y PDFs; el logo se
  guarda con la ficha al emitirla.
- **Catálogo de productos**: sube fichas técnicas en PDF o imagen, extrae el
  perfil con IA, configura colores por tipo de capa y usa el producto para
  prellenar fichas o consultar predicciones en el asistente.
- **Composición flexible**: plantillas y validación para monolíticos, laminados,
  insulados, multi-laminados, multi-insulados e insulados con laminado.
- **Interfaz responsiva**: tablas con búsqueda, filtros, ordenamiento y detalle
  expandible; en pantallas pequeñas el catálogo se presenta en tarjetas.
- **Modo claro/oscuro**: selector en la cabecera y preferencia guardada por
  navegador.
- **Base de conocimiento normativa**: consulta asistida de normas aplicables,
  con referencia a sus numerales y tablas.

## Diseño

La interfaz usa un sistema de componentes y un lenguaje visual propio: sidebar,
dashboard, tarjetas de métricas, tablas, formularios y el chat del asistente.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS 4
- Prisma + SQLite
- `@react-pdf/renderer` para el PDF en el servidor
- Proveedor de IA configurable mediante un endpoint compatible con el estándar
  de chat completions

## Puesta en marcha

```bash
npm install
npx prisma db push     # crea prisma/dev.db
npm run db:seed        # datos de ejemplo (opcional)
npm run dev            # http://localhost:3020
```

Configura primero el acceso en `.env`:

```env
APP_PASSWORD="una-contraseña-larga"
APP_SESSION_SECRET="un-secreto-aleatorio-largo"
```

La aplicación redirige a `/login`. La contraseña es compartida para el equipo;
si necesitas cuentas individuales con roles, el siguiente paso es integrar
Auth.js o IIS Windows Authentication. Los cambios de contraseña no invalidan
sesiones existentes hasta que caduquen o rotes `APP_SESSION_SECRET`.

Para producción:

```bash
npm run build
npm run start          # http://localhost:3020
```

La base de datos se configura en `.env`:

```env
DATABASE_URL="file:./dev.db"
```

El servidor puede funcionar con una clave global. Cada usuario puede
sobrescribirla desde **Configuración** con su propia clave, endpoint y modelo.
La integración usa variables de entorno para la clave, el modelo, el endpoint y
el razonamiento; consulta `.env.example` para los nombres exactos y valores de
ejemplo.

`.env` está excluido de Git; usa `.env.example` como referencia. La clave
global del servidor nunca se envía al navegador. Si el usuario configura una
clave propia, se guarda en su navegador y solo se envía a las rutas de IA de
esta aplicación.

### Datos de ejemplo

`npm run db:seed` crea:

- 2 clientes, 2 agentes de venta y 2 proyectos.
- Una ficha de ejemplo con los valores del PDF de referencia, lista para abrir,
  previsualizar y descargar.

## Flujo de uso

1. **Nueva ficha** desde el menú lateral o desde un proyecto. También puedes
   arrastrar y soltar un PDF de prestaciones o un HTML del configurador
   directamente en el editor; se cargarán los datos y las sugerencias de IA.
2. Completa la **referencia/folio** (uso interno), el proyecto, el agente, la
   fecha y las normas. El **nombre comercial del vidrio** es el que se usa como
   título visible del PDF; si se deja vacío, se usa la referencia.
3. Pega el bloque de prestaciones, el bloque `app-configurator` del
   acristalamiento o ambos, y pulsa **Analizar HTML**.
   - Como alternativa, pulsa **Subir PDF** y elige un informe PDF con texto
     seleccionable. El sistema extrae los apartados, normas, valores, composición
     de capas, catálogo y estándar directamente del PDF, sin inventar datos.
   - Al terminar la importación, **el asistente IA analiza el PDF y propone** un
     nombre comercial, referencia, catálogo, normas, responsable del cálculo y
     notas internas. Puedes aplicar cada sugerencia por separado o pulsar
     **Aplicar todo**. Nada se guarda automáticamente: la decisión final es
     tuya. Ejemplo: un PDF de un vidrio templado monolítico propone un nombre
     comercial descriptivo.
   - Del bloque de prestaciones se extraen los apartados y valores.
   - Del configurador se extraen el nombre comercial, los materiales, el orden
     de las capas y sus espesores.
   - Las capas detectadas se fusionan con los tratamientos o espesores que ya
     hayas escrito, para no perder información.
4. Revisa la composición del vidrio. Las selecciones del configurador
   (tipo de capa, material, espesor, tratamiento y laminado) aparecen
   precargadas en el editor estructurado. Puedes cambiar el orden, añadir o
   quitar capas, o usar la edición avanzada por texto. El ancho de cada capa en
   el diagrama es proporcional a su espesor real, tanto en la vista previa como
   en el PDF.
5. Genera la **vista previa PDF** y guarda. Al marcar el estado como
   **Emitida** la ficha queda registrada en el historial.

> El folio/referencia ya no se imprime como título: el PDF muestra el nombre
> comercial del vidrio y conserva la referencia en los metadatos del archivo.
> Si el nombre comercial está vacío, el PDF usa la referencia como respaldo.

## Acceso y seguridad

- Todas las páginas y APIs requieren sesión, salvo `/login`.
- La sesión usa una cookie `HttpOnly`, `SameSite=Lax`, firmada con HMAC-SHA256
  y con caducidad de 12 horas.
- **Cerrar sesión** está en el pie del menú lateral.
- Login limitado a 5 intentos/minuto por IP.
- Rate limiting en APIs de IA y PDF, y límites de tamaño de archivo.
- Endpoints de IA personalizados: bloqueo de localhost, rangos privados,
  link-local y metadatos cloud; opcionalmente `AI_ALLOWED_HOSTS` para lista
  blanca.
- La clave del servidor solo se usa con el endpoint del servidor. Un endpoint
  personalizado exige una API key propia.
- CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy` y HSTS en producción.

> El rate limiting es en memoria por proceso. En múltiples instancias usa
> Redis. Para producción, sirve la app por **HTTPS** detrás de IIS/ARR y
> envía `X-Forwarded-Proto: https` para que la cookie sea `Secure`.

### Controles aplicados

- Autenticación por contraseña compartida y sesión firmada.
- Protección de todas las rutas y APIs.
- Rate limiting en login, IA y PDF.
- Bloqueo de endpoints de IA privados/loopback/metadatos.
- La clave global no se envía a endpoints personalizados.
- Lista blanca de iconos para evitar path traversal.
- Cabeceras de seguridad y CSP.
- `npm audit`: **0 vulnerabilidades** después de fijar `postcss` y
  `deepmerge-ts` con `overrides`.

### Riesgos residuales

- La contraseña es compartida; no hay cuentas ni roles individuales.
- El rate limiting es por proceso y confía en `X-Forwarded-For`; configúralo
  correctamente en IIS/ARR.
- La clave propia del usuario vive en `localStorage`; usa HTTPS y equipos
  confiables.
- El guard de endpoints valida DNS, pero un egress allowlist
  (`AI_ALLOWED_HOSTS`) es más fuerte contra DNS rebinding.
- Los datos enviados al proveedor de IA deben tratarse según la política de
  privacidad de la empresa.
- Rotar `APP_SESSION_SECRET` invalida todas las sesiones.

## Catálogo de productos

- Ruta: **`/productos`**.
- Sube una ficha técnica en **PDF, PNG, JPG o WebP**.
- La IA extrae nombre, código, categoría, fabricante, composición, apartados y
  valores clave.
- Antes de guardar puedes revisar el perfil y **configurar los colores** de:
  - Vidrio / sustrato.
  - Capa funcional.
  - Butiral / laminado.
  - Cámara / cámara de aire.
  - Serigrafía.
  - Otras capas.
- Los colores se aplican en la vista de composición, en la ficha y en el PDF.
- En **Nueva ficha** puedes seleccionar un producto del catálogo para cargar su
  composición, prestaciones y colores.
- En el detalle del producto puedes consultar el catálogo con IA y pedir
  predicciones o comparaciones.

### Composición

El editor incluye plantillas de composición:

- Monolítico.
- Laminado.
- Insulado.
- Insulado con laminado exterior/interior.
- Multi-insulado.
- Multi-laminado.
- Multi-insulado con laminados.

El análisis de composición identifica el tipo, cuenta vidrios, cámaras y
butirales, calcula el espesor y valida que cámaras y butirales estén entre
vidrios.

## Configuración de la app

La página **`/configuracion`** permite ajustar, por navegador/perfil:

- **Proveedores de IA**: guarda varios proveedores; cada uno conserva nombre,
  endpoint compatible con el estándar de chat completions, modelo y API key
  propia. Puedes marcar uno
  como predeterminado, probar cada conexión y seleccionar el proveedor de una
  conversación desde el chat.
- **Razonamiento**: activar o desactivar el razonamiento del modelo.
- **Identidad de la organización**: nombre de la app, empresa, tagline, logo y
  línea de contacto/soporte.
- **Valores predeterminados**: calculado por, catálogo y normas para fichas
  nuevas.
- **Sugerencias automáticas**: decidir si al importar un PDF se analiza
  automáticamente con IA.

La configuración se guarda en `localStorage`; no se escribe en SQLite ni se
comparte entre usuarios. Cada proveedor conserva su propia API key. La clave
solo viaja a esta aplicación al hacer una consulta de IA. Si el proveedor no
tiene clave propia, se usa la clave del servidor. **Probar este proveedor**
valida el endpoint y el modelo antes de usarlos. La configuración anterior de
un solo proveedor se migra automáticamente a la lista.

El logo acepta **PNG, JPG, SVG o WebP** hasta 1 MB. SVG/WebP se convierten en el
navegador a PNG para que `@react-pdf` pueda incrustarlos. El logo y los datos
de identidad se guardan con la ficha al guardarla, por lo que el PDF descargado
desde el historial conserva la marca usada en ese momento.

## Asistente IA

El asistente vive en **`/asistente`** (menú lateral) y también puede abrirse
desde el editor de una ficha guardada. Usa un proveedor de IA configurable a
través de un endpoint compatible con el estándar de chat completions. El
proveedor predeterminado se define en el servidor y cada usuario puede
configurar otro desde **Configuración**.

### Qué consulta

- **Catálogo de fichas guardadas**: resumen de hasta 60 fichas con folio,
  nombre comercial, cliente, proyecto, agente, estado, composición y valores
  clave (TL, RLe, SHGC, Ug, Rw, espesor, etc.).
- **Detalle ampliado** de la ficha abierta, de las fichas que coinciden con la
  pregunta y de las más recientes (hasta 4), incluyendo todos los apartados y
  las normas declaradas.
- **Contexto de la ficha abierta** cuando se entra desde el editor
  (`/asistente?specId=...`), con sus cambios guardados.
- **Lectura de imágenes**: se puede adjuntar una captura del configurador o una
  imagen de referencia para que el modelo la describa o extraiga información
  legible.

### Ejemplos de consultas

- «¿Qué fichas tengo con Rw ≥ 40 dB y qué cliente las solicitó?»
- «Compara las dos fichas más recientes y señala diferencias de prestaciones.»
- «Revisa qué datos normativos faltan en las fichas guardadas.»
- «Sugiere un nombre comercial para una composición 12 + 12 + PVB 1.52.»
- «Propón una composición para mejorar el control solar manteniendo buena TL.»

### Varios proveedores

En **Configuración → Proveedores de IA** puedes:

- Añadir varios proveedores.
- Editar nombre, endpoint, modelo, API key y razonamiento de cada uno.
- Marcar uno como **predeterminado** para sugerencias de PDF y opción inicial
  del chat.
- Probar cada conexión por separado.
- Eliminar proveedores; siempre debe quedar al menos uno.
- Cambiar de proveedor en el chat sin cambiar el predeterminado.

### Límites y seguridad

- El asistente es de **solo lectura**: no crea, modifica ni elimina fichas.
- Solo consulta fichas **guardadas**; los cambios sin guardar no forman parte
  del catálogo (salvo el contexto de la ficha abierta desde el editor).
- No certifica cumplimiento normativo. Señala coherencias, datos faltantes y
  recomendaciones orientativas que requieren validación técnica.
- Las imágenes adjuntas se limitan a 8 MB (PNG/JPG/WebP).
- La conversación se transmite por SSE desde el servidor. La clave global
  permanece en el servidor; la clave propia del usuario se guarda en su
  navegador.

### Sugerencias al importar un PDF

`POST /api/ai/suggest-fields` recibe:

```json
{
  "data": {
    "fileName": "ficha-vidrio.pdf",
    "documentTitle": "Vidrio templado monolítico",
    "layers": [{ "material": "Vidrio monolítico", "thickness": "12mm", "treatment": "Templado" }],
    "sections": [{ "title": "Factores Luminosos", "rows": [] }],
    "current": { "glassName": "", "reference": "FT-2026-003" }
  }
}
```

y responde con:

```json
{
  "suggestions": [
    { "field": "glassName", "value": "Vidrio templado monolítico", "reason": "..." }
  ],
  "alternatives": ["Vidrio templado monolítico"],
  "summary": "..."
}
```

El nombre se construye con el código o producto visible en el PDF más el tipo
de vidrio; si el PDF solo trae un código numérico, se propone un nombre
descriptivo basado en la composición. La interfaz muestra las propuestas y
permite aplicarlas una a una o todas, sin guardar automáticamente.

## Estructura

```
src/app
  page.tsx                 Panel de inicio
  clientes/                Listado, alta y detalle de clientes
  proyectos/               Listado, alta y detalle de proyectos
  agentes/                 Listado, alta y detalle de agentes
  fichas/                  Historial, nueva ficha y editor
  asistente/               Chat del asistente IA
  actions.ts               Server actions del CRM
  api/
    ai/chat/               Streaming hacia el proveedor de IA
    ai/suggest-fields/     Sugerencias de nombre y campos desde un PDF
    ai/test/               Prueba del proveedor de IA configurado
    auth/login/            Inicio de sesión
    auth/logout/           Cierre de sesión
    configuracion/         Panel de configuración por usuario
    productos/             Catálogo de productos
    productos/import/      Extracción de ficha técnica con IA
    productos/[id]/        Detalle y edición de producto
    pdf/                   Vista previa del PDF sin guardar
    clients/               CRUD de clientes
    agents/                CRUD de agentes
    projects/              CRUD de proyectos
    specs/                 CRUD de fichas
    specs/[id]/pdf/        PDF de una ficha guardada
    pdf-import/            Importación de un PDF del configurador
src/components
  SpecWorkbench.tsx        Editor + analizador + vista previa
  SettingsPanel.tsx        Configuración de IA y valores por usuario
  ProductImport.tsx        Carga y revisión de fichas de producto
  ProductEditor.tsx        Datos y colores del producto
  LayerColorEditor.tsx     Selector de colores por tipo de capa
  Asistente IA             Chat del asistente con streaming
  SpecsTable.tsx           Tabla reutilizable de fichas
src/lib
  parser de entrada        Parser del HTML del configurador
  ai-catalog.ts            Contexto de fichas guardadas para la IA
  ai-context.ts            Contexto de la ficha abierta
  ai-config.ts             Resolución de endpoint/modelo/clave y overrides
  ai-endpoint-guard.ts     Bloqueo de SSRF en endpoints de IA
  ai-product.ts            Extracción de perfiles de producto con IA
  products.ts              Normalización y modelo del catálogo
  composition.ts           Análisis, validación y plantillas de composición
  app-settings.ts          Preferencias por navegador (localStorage)
  auth-session.ts          Firma/verificación de la sesión
  rate-limit.ts            Límites en memoria por IP/ruta
  payload.ts               Normalización de datos de entrada
  pdf/spec-document.tsx    Documento PDF
  types.ts                 Modelo de prestaciones y estados
prisma
  schema.prisma            Clientes, proyectos, agentes y fichas
  seed.mjs                 Datos de ejemplo
public/assets              Logos e iconos extraídos del PDF de referencia
```

## API CRUD

Todas las entidades tienen operaciones completas. Las respuestas son JSON y
los errores devuelven `{ "error": "..." }` con el código HTTP correspondiente.

| Recurso | Listar / Crear | Consultar / Editar / Eliminar |
|---|---|---|
| Clientes | `GET /api/clients` · `POST /api/clients` | `GET/PATCH/DELETE /api/clients/:id` |
| Agentes | `GET /api/agents` · `POST /api/agents` | `GET/PATCH/DELETE /api/agents/:id` |
| Proyectos | `GET /api/projects` · `POST /api/projects` | `GET/PATCH/DELETE /api/projects/:id` |
| Fichas | `GET /api/specs` · `POST /api/specs` | `GET/PATCH/DELETE /api/specs/:id` |

Filtros disponibles en los listados:

- `GET /api/projects?q=&status=&clientId=&agentId=`
- `GET /api/specs?q=&status=&projectId=&agentId=`

Extras de fichas:

- `GET /api/specs/:id/pdf` — PDF de una ficha guardada (`?download=1` fuerza descarga).
- `POST /api/pdf` — genera una vista previa con datos aún no guardados.
- `POST /api/pdf-import` — importa un informe PDF del configurador. Recibe
  `multipart/form-data` con `file` y devuelve secciones, capas, estándar,
  catálogo, título del documento, texto plano y advertencias, sin guardar nada
  en la base de datos.
- `POST /api/ai/suggest-fields` — recibe los datos extraídos del PDF y devuelve
  sugerencias para los campos editables (`glassName`, `reference`, `catalog`,
  `standard`, `calculatedBy`, `notes`), con razones y alternativas de nombre.
  Acepta `ai` para usar la configuración del navegador. Es de solo lectura y no
  modifica la ficha.
- `POST /api/ai/test` — prueba la configuración de IA (endpoint, modelo y
  clave) con una petición mínima y devuelve el tiempo de respuesta.
- `POST /api/auth/login` — inicia sesión con `{ password }` y emite la cookie
  de sesión.
- `POST /api/auth/logout` — elimina la cookie de sesión.

Todas las rutas API requieren la cookie de sesión; sin ella responden `401`.

Catálogo de productos:

- `GET /api/products?q=&active=1` — listar o buscar productos.
- `POST /api/products` — guardar un perfil de producto.
- `GET/PATCH/DELETE /api/products/:id` — consultar, editar datos/colores o eliminar.
- `POST /api/products/import` — subir PDF/imagen y extraer un perfil con IA.
- `POST /api/ai/chat` — asistente técnico con streaming SSE. Recibe
  `{ messages, context, image, ai }`; construye el catálogo de fichas guardadas
  y llama al proveedor de IA configurado. La respuesta usa
  eventos `reasoning`, `content`, `error` y `done`.

En la interfaz, cada listado incluye acciones de **editar** y **eliminar**,
además del formulario de alta y la vista de detalle con edición.

## Pruebas del parser

```bash
npm run test:parser
npm run test:composition
```

El test usa un fixture con la misma estructura del bloque del configurador y
verifica apartados, iconos, normas, filas especiales (notas,
encabezados, filas ocultas al PDF), composición de capas y proporciones del
diagrama. También incluye un fixture del bloque `app-configurator` con las
capas de vidrio / butiral / vidrio.

`npm run test:composition` valida el fixture detallado
`scripts/sample-configurator-detailed.html`: sustrato de vidrio de 6 mm
templado, capa funcional, cámara de aire de 12 mm y segundo sustrato de 6 mm;
además comprueba que la capa funcional no sume espesor.

También se incluye una prueba E2E opcional del flujo completo (pegar, analizar,
guardar y previsualizar) con Edge en modo headless:

```bash
# 1. Servidor en marcha: npm run start
# 2. Edge con depuración remota:
#    msedge --headless=new --remote-debugging-port=9222 --user-data-dir=C:/tmp/edge-cdp about:blank
node scripts/ui-check.mjs
node scripts/crud-ui-check.mjs
```

`ui-check.mjs` valida el flujo de fichas (pegar, analizar, guardar y previsualizar).
`crud-ui-check.mjs` valida crear, editar y eliminar clientes, agentes y
proyectos desde la interfaz.

## Notas de implementación

- El parser trabaja en el navegador con `DOMParser`; no requiere enviar el HTML
  a ningún servicio. El HTML original se guarda junto a la ficha para poder
  reanalizarlo.
- La representación del acristalamiento usa el espesor de cada capa: el ancho de
  las barras es proporcional (12 mm / 1.52 mm / 12 mm se dibuja como 24.45 /
  3.1 / 24.45 pt). Si el configurador no informa el espesor de un interlayer, se
  usa 1.52 mm solo para el dibujo y se avisa en la interfaz.
- Las filas con `pdf-hide` del configurador que contienen información útil (por
  ejemplo, la declaración ambiental) sí se conservan; los enlaces y botones se
  descartan automáticamente.
- El PDF se genera en el servidor a partir de los datos normalizados, por lo que
  la vista previa incluye cambios aún no guardados.
- El endpoint del proveedor recibe `chat_template_kwargs` directamente en el
  cuerpo; no acepta `extra_body` como campo HTTP (el SDK de Python lo fusiona
  internamente, pero aquí usamos `fetch`). El razonamiento del modelo está
  desactivado por defecto para evitar latencia y respuestas incompletas; se
  activa mediante la variable de entorno correspondiente y entonces se muestra
  en un bloque plegable.
- Los assets se obtuvieron rasterizando el PDF de referencia con fondo blanco
  para que se incrusten correctamente en `@react-pdf/renderer`.

## Estados

- **Ficha**: Borrador → Revisada → Emitida → Archivada.
- **Proyecto**: Prospecto → En diseño → Cotizado → Adjudicado → Cerrado.

## Despliegue en IIS / Windows

Este proyecto está pensado para ejecutarse como proceso Node:

```bash
npm run build
npm run start
```

Detrás de IIS puede publicarse con `reverse proxy` (ARR) hacia el puerto 3020,
o con `iisnode`/`web.config` apuntando a `node_modules/next/dist/bin/next start`.
Asegúrate de que el usuario del sitio tenga permisos de escritura sobre
`prisma/dev.db` (y su carpeta) para poder guardar fichas y clientes.
