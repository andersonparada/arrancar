# Plan: fila de revisión de PDF y limpieza de archivos huérfanos (core)

_2026-11-13. Complementa `diseno-h2-evidencia-de-conciliacion.md`: va **antes de su paso 4** (H2b,
archivo del estado de cuenta). Resuelve los pendientes de seguridad S1, S2 y S10. Solo servidor, solo
`core`; no toca Bancos, Libro de compras ni Cuentas por pagar._

## 0. Decidido por el usuario (2026-11-13)

| Tema | Decisión |
|---|---|
| S1 · Fila con tope | Sí: máximo **10 en espera**, hasta **60 s** de espera, **2 por cuenta** (en espera o en revisión); si se pasa, **429**. |
| S2 · PDF que genera la app | **Prioridad en la misma fila** (no una fila aparte). |
| S10 · Archivos huérfanos | **Tarea diaria** que borra los archivos sueltos con más de 24 horas. |

## 1. Lo que hay hoy

- `InspectorQpdf` (`core/archivos/infraestructura/qpdf/inspector-qpdf.ts`) revisa de uno en uno con
  `Semaforo(1)`: la espera no tiene tope ni tiempo límite, y todos esperan igual.
- `DocumentosProtegidos.revisar(contenido, nombre)` lo usan las subidas de usuarios (fuera de la
  transacción); `guardar(operador, contenido, opciones)` lo usa el Libro de compras para el PDF que
  genera la app (dentro de la transacción).
- `guardarRevisado` ya borra el archivo si la transacción se deshace, pero un proceso que muere a
  medias puede dejar un archivo en disco sin fila en `core.archivos`.
- `principal.ts` ya corre una tarea diaria (`depurarAuditoria`) con `setInterval`.

## 2. Paso A — Fila de revisión con tope y prioridad

### 2.1 Pieza nueva: `FilaDeRevision`

En `core/archivos/infraestructura/qpdf/fila-de-revision.ts` (lógica pura, sin qpdf, con reloj y
temporizador inyectables para las pruebas). Reemplaza al `Semaforo` dentro de `InspectorQpdf`.

```ts
type OrigenDeRevision = 'usuario' | 'sistema';
interface TurnoDeRevision { cuentaId: string; origen: OrigenDeRevision }

fila.ejecutar(turno, tarea): Promise<Resultado>
```

Reglas:

1. Corre **una** revisión a la vez (como hoy).
2. Origen `usuario`:
   - Si la cuenta ya tiene **2** turnos de usuario (en espera o corriendo) → rechaza enseguida.
   - Si ya hay **10** turnos de usuario en espera → rechaza enseguida.
   - Si espera más de **60 s** → sale de la fila y rechaza.
3. Origen `sistema`: pasa **delante** de todos los de usuario que esperan (entre los de sistema, en
   orden de llegada); no cuenta para el tope de 10 ni para el de 2 por cuenta. También sale a los
   60 s de espera.
4. Nunca interrumpe la revisión que ya corre. Al terminar (bien o con error) siempre libera el turno
   y descuenta de la cuenta.
5. Los topes son **constantes de seguridad** exportadas (`LIMITES_DE_LA_FILA`), como
   `LIMITES_DE_QPDF`; no son configuración.

### 2.2 Errores

`RevisionDePdfSaturada` en `core/archivos/dominio/documento.ts`, de la familia de «demasiadas
solicitudes» de `core/compartido` (la que ya responde **429** en el límite de subidas; si no existe
como familia, se crea ahí). Código `revision_de_pdf_saturada`; mensaje único para los tres casos:
«Hay muchos archivos en revisión. Intente de nuevo en un momento.» `detalles.motivo`:
`fila_llena` | `cuenta_al_tope` | `espera_agotada`. Cabecera `Retry-After: 30`.

Para el origen `sistema` que agota la espera se lanza `PdfNoSePudoRevisar` (ya previsto por quien
genera el PDF).

### 2.3 Cómo llega el turno

- Puerto `InspectorDePdf.inspeccionar(contenido, turno)`.
- `DocumentosProtegidos.revisar(operador, contenido, nombre)`: gana `operador` como primer
  parámetro (la cuenta sale del operador; confirmar el nombre del campo en `Operador`). Turno
  `usuario`.
- `DocumentosProtegidos.guardar(operador, contenido, opciones)`: **sin cambio de firma**; por dentro
  usa turno `sistema`. Así el Libro de compras no se toca.
- Actualizar `GestorDeDocumentos`, `PreparadorDeDocumentos`, los dobles de prueba
  (`dobles-de-archivos.ts`) y cualquier llamada a `revisar` (hoy solo core; H2b la usará después).

### 2.4 Pruebas

- `fila-de-revision.prueba.ts` (reloj falso): orden de llegada; `sistema` pasa delante; 11.º de
  usuario rechazado con `fila_llena`; 3.º de la misma cuenta rechazado con `cuenta_al_tope` y otra
  cuenta sí entra; a los 60 s sale con `espera_agotada` y su lugar queda libre; una tarea que falla
  libera el turno y descuenta la cuenta; `sistema` no cuenta para los topes.
- `inspector-qpdf.prueba.ts`: sigue pasando, ahora con turno.
- API (con la ruta de subida que exista hoy que use `revisar`, o prueba del gestor si ninguna):
  la respuesta es 429 con el código y `Retry-After`.

## 3. Paso B — Tarea diaria de archivos huérfanos

### 3.1 Base de datos (migración de core, `--custom`)

La app entra como `arrancar_app` con RLS por empresa, y la tarea corre sin empresa. Igual que
`core.depurar_auditoria`, una función `security definer` con `search_path` fijo:

```sql
core.rutas_de_archivos_registradas(rutas text[]) returns setof text
-- devuelve, de las rutas recibidas, las que están en core.archivos
-- (ruta_original o ruta_miniatura). Solo lee. `grant execute` a arrancar_app.
```

Recibe como máximo 500 rutas por llamada (lo valida la función). No expone nada más que «esta ruta
existe»: quien la llama ya tiene que conocer la ruta. Revisar el número de migración al programar.

### 3.2 Caso de uso `DepurarArchivosHuerfanos` (`core/archivos/aplicacion/casos-uso/`)

1. Recorre la carpeta de archivos (la raíz de `RutasDeArchivo`), sin seguir enlaces simbólicos y sin
   salir de la raíz.
2. Candidatos: archivos normales con **más de 24 horas** de modificados (una subida en curso nunca
   es candidata).
3. En tandas de 500 pregunta a la función cuáles están registrados; los demás se borran.
4. Tope de **1,000 borrados por corrida**; si se alcanza, lo dice en el registro y sigue al día
   siguiente.
5. Si la consulta falla, **no borra nada** de esa tanda. Nunca borra carpetas.
6. Registra en el log solo conteos (revisados, borrados) y, por archivo borrado, la ruta relativa;
   nunca contenido. No va a `core.auditoria` (no es un registro de negocio de ninguna empresa).
7. Lo inverso (fila sin archivo en disco) no se toca: `abrir` ya responde 404.

Puertos: `ExploradorDeArchivos` (listar candidatos, borrar) y `RegistroDeRutas` (la función). En
`principal.ts`, junto a la depuración de la auditoría: al arrancar y cada 24 h, con `catch` que
registra el error.

### 3.3 Pruebas

- Unitarias con dobles: borra solo lo no registrado y viejo; respeta 24 h; tope de 1,000; consulta
  que falla no borra; tandas de 500.
- Integración (carpeta temporal y base de pruebas): un archivo registrado de otra empresa **no** se
  borra (la función ve todas las empresas); uno suelto viejo sí; uno suelto nuevo no; un enlace
  simbólico que apunta fuera no se sigue ni se borra su destino.

## 4. Pasos (un commit cada uno)

1. **Core · fila de revisión** (§2). `programador-backend`.
2. **Core · huérfanos** (§3). `programador-backend`.
3. **Revisión del agente `seguridad`** de los dos antes de unir a `main` (agotamiento de la fila por
   una cuenta, fugas de turnos, recorrido de carpetas, función `security definer`).

Después sigue el paso 4 de `diseno-h2-evidencia-de-conciliacion.md` (H2b servidor), que usa
`revisar(operador, …)` ya con fila.

## 5. Notas de implementación (2026-11-13)

**Fila (commit 83e9ec0 y ajustes):**

- `Retry-After`: `DemasiadasSolicitudes` ganó `reintentarEnSegundos?` y el manejador de errores lo convierte en
  la cabecera. Ninguna ruta de subida usa `revisar` todavía, así que el 429 se probó con el manejador real en una
  aplicación Fastify mínima y con el gestor.
- Firmas: `revisar(operador, contenido, nombre)` e `inspeccionar(contenido, turno)`; `guardar` no cambió y usa turno
  `sistema`. Su TSDoc advierte que nunca debe recibir contenido subido por un usuario (se salta los topes).
- El turno `sistema` tiene tope propio: 5 en espera (`LIMITES_DE_LA_FILA.enEsperaDelSistema`); el sexto falla con
  `PdfNoSePudoRevisar`. Sigue con prioridad y sin tope por cuenta.
- Al agotarse una espera se revisa que el turno siga en la fila antes de sacarlo.

**Huérfanos (commit fd45109 y ajustes):**

- Migración `0023_rutas_de_archivos_registradas`: dos índices (`ruta_original`, `ruta_miniatura`, declarados también
  en `archivos.tablas.ts`) y la función `security definer` con `row_security = off` (falla en vez de devolver vacío),
  escrita como `UNION` de dos semijoins.
- Solo son candidatas las rutas con la forma de `RutasDeArchivo.esGenerada` (`<uuid>/<aaaa>/<mm>/<uuid>[_min].(webp|pdf)`):
  no se toca `instalacion/logo.png` ni nada más. Una extensión nueva obliga a actualizar ese patrón.
- La raíz no puede ser `/`, la carpeta de trabajo ni una de sus padres (`RaizDeArchivosInsegura`): la tarea no se
  programa y queda un error en el registro.
- Antes de borrar se compara `realpath` de la carpeta con la esperada (cierra el cambio de una carpeta por un enlace);
  `ENOENT` es «ya no estaba».
- Si la consulta falla, la corrida se detiene y relanza el error (más estricto que «no borra esa tanda»). Si una tanda
  completa de 500 vuelve sin ninguna registrada, se detiene sin borrarla y avisa.
- Varias instancias: `pg_try_advisory_lock(7301913001)` en una conexión propia; quien no lo obtiene salta la corrida.
- Interruptor `DEPURAR_HUERFANOS` (por omisión `true`; `false` la apaga y se registra al arrancar), en
  `configuracion.ts`, `.env.ejemplo`, `infra/.env.ejemplo` y `infra/docker-compose.yml`. La nota de restaurar bases viejas
  está en `docs/PLAN.md`, «Respaldos y copia fuera del servidor».
- El rastro de los borrados queda solo en el registro (ruta relativa, que incluye el id de la empresa); no hay tabla.
- El caso de uso recibe `ahora?: () => Date` porque el `Reloj` existente es por empresa.
