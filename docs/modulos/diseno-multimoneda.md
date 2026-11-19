# Diseño: Multimoneda — arquitecto de datos, 2026-11-18

_Agente `arquitecto-de-datos`. Base fiscal y contable: `dictamen-multimoneda-2026-11-18.md` (contador-guatemala, mismo
día). Pendiente de las respuestas del usuario (§19) y de las validaciones del contador (§20). **Nada de esto se programa
hasta que el usuario responda.** Hoja de ruta: punto 6 de `docs/HOJA-DE-RUTA.md` («Multimoneda»); recoge lo anotado en
`diseno-bancos-segunda-parte.md` §11.8 y corrige C-10 (§8.7)._

## 0. Resumen

- La **moneda de libros es el quetzal**, fija para todas las empresas (Código de Comercio art. 369). Una moneda
  extranjera solo existe en: cuentas bancarias, documentos de compra y lo que se paga o abona sobre ellos.
- Los **tipos de cambio son de toda la instalación** (es un dato público del Banguat): tabla nueva `core.tipos_de_cambio`,
  de solo agregar, con versiones. La llena una **tarea diaria** desde el servicio web del Banguat (06:00, con reintentos
  y relleno por rango) y, si falla, **soporte** los ingresa a mano. La app **no se detiene** si no hay publicación.
- Un **módulo activable nuevo, `multimoneda`**, decide si una cuenta puede crear cuentas y documentos en moneda
  extranjera, y tiene los reportes (Tipos de cambio y Diferencial cambiario). Sin él, todo sigue en quetzales.
- **Cada registro guarda su tipo de cambio y su equivalente en quetzales**; nunca se recalcula. Los montos quedan en la
  moneda del registro (lo que dice el banco o la factura) y al lado su valor en quetzales.
- Facturas: tipo **fijo**, la referencia del Banguat de la **fecha de emisión**. Pagos cruzados y conversiones entre
  cuentas: tipo **acordado**, editable. Pagos en la misma moneda extranjera: la referencia del día, fija.
- El **diferencial cambiario no se guarda partida por partida en v1: se calcula** a partir de esos hechos (método B
  acumulativo o C con reversión, por empresa) en un reporte con el detalle por partida y su naturaleza fiscal. Cuando
  exista Contabilidad, un **cierre cambiario mensual** congela el cálculo y publica un evento (no hace partidas).
- **Lo que hay hoy no cambia**: todas las columnas nuevas nacen en `GTQ`, tipo `1` y equivalente igual al monto.

## 1. Lo que hay hoy (revisado en el código y en la base de desarrollo)

| Dónde | Qué hay | Efecto en este diseño |
|---|---|---|
| `core.monedas` (`core/monedas/infraestructura/persistencia/monedas.tablas.ts`, migraciones `0000` y `0001`) | Catálogo global ISO 4217: `codigo char(3)` PK, `nombre`, `simbolo`, `decimales smallint default 2`. Semilla: GTQ y USD. **Sin RLS**, sin marcas de tiempo. El contexto `core/monedas` solo tiene la tabla (sin dominio, casos de uso ni API) | Se amplía (§6.1) y el contexto recibe dominio, casos de uso y API |
| `core.empresas.moneda_base` | `char(3) not null default 'GTQ'` con FK a `core.monedas`. El dominio (`empresas/dominio/empresa.ts`) la fija siempre en GTQ | **Sin cambio**: queda como invariante «siempre GTQ» (PU-1) |
| `core/base-datos/columnas.ts` | Dinero `numeric(14,2)`; `politicaPorEmpresa`, `politicaPorCuenta`, `politicasDeSoloAgregar` (por cuenta) y `…PorEmpresa` | Falta una política de solo agregar **de toda la instalación** (§6.1) |
| `core.feriados` (contexto `core/calendario`) | Tabla de toda la instalación, sin RLS, que solo carga soporte (`configuracion.feriados.crear`, `soloSuperacceso`); `calendarioLaboral` es una instancia del core que reciben los módulos al armarse | **Es el precedente** de los tipos de cambio (tabla global, servicio del core para los módulos) |
| `principal.ts` | Tareas con `setInterval`: sesiones (cada hora), auditoría y archivos huérfanos (cada día); `DEPURAR_HUERFANOS` como variable de entorno | La carga del Banguat se programa aquí (§4.3) |
| Migrador (`core/base-datos/migrador.ts`) | En cada corrida da `select, insert, update, delete` sobre **todas** las tablas del esquema a `arrancar_app` | Un `revoke` no sirve: lo de solo agregar se hace con RLS (§6.1) |
| `bancos.cuentas_bancarias`, `bancos.movimientos`, `transferencias`, `desglose_de_movimientos`, `saldos_iniciales` | Ningún monto dice su moneda; `monto numeric(14,2)` siempre en quetzales. `bancos.md` ya anota «moneda (solo GTQ hasta que exista *Moneda extranjera*)» | §6.3 |
| `libro_de_compras.documentos`, `lineas_de_documento`, `retenciones`, `dte_recibidos` | Todos los montos fiscales en GTQ, fijos al registrar. La bandeja de DTE **rechaza** las filas que no son GTQ (`moneda_no_admitida`, `convertidor-de-fila-sat.ts`) y avisa «se supuso quetzales» si el archivo no trae la moneda. `diseno-datos-libro-de-compras.md` dejó dicho «se agrega con `default 'GTQ'` sin romper nada» | §6.4 |
| `cuentas_por_pagar.*` | Saldo **derivado**, nunca guardado (U4): `total − retenciones − pagos − notas − ajustes…`. Llaves compuestas `(id, empresa_id, proveedor_id)` entre documento, contraseña, pago y notas. Moneda extranjera «fuera de esta versión» (CP4) | §6.5 |
| Mediador (`core/mediador`) | Órdenes (un módulo responde) y avisos; salta los módulos inactivos de la cuenta (`ModuloNoDisponible`). EM-2 (`diseno-em2-cierre-de-la-carga.md` §2) diseñó `preguntarATodos`, **aún sin programar** | El cálculo del diferencial usa `preguntarATodos` (§9.2) |
| Contratos y eventos (`core/contratos/*.contratos.ts`) | El dinero viaja en **centavos enteros**; Libro de compras y Cuentas por pagar publican eventos «para Contabilidad»; Bancos todavía no publica eventos | §9 |
| Base de desarrollo (solo leída) | 2 cuentas bancarias, 10 movimientos, 0 documentos de compra, 2 monedas | Los rellenos de las migraciones son triviales hoy |

## 2. Principios (las reglas que todo lo demás sigue)

1. **Moneda de libros: GTQ**, igual para todas las empresas (PU-1). Ninguna empresa tiene moneda funcional distinta en
   v1. Las restricciones de la base escriben `'GTQ'` literal.
2. **Monto en su moneda, y su equivalente en quetzales al lado.** El monto de un registro es el que dice su papel (el
   estado de cuenta, la factura, el cheque). El equivalente en quetzales y el tipo usado se guardan en el mismo registro,
   **al hacerlo**, y no se recalculan nunca (dictamen §6). Solo una **corrección** del registro (otra fecha u otro
   monto, con su permiso y su auditoría) vuelve a calcular el suyo.
3. **Dos clases de tipo de cambio:**
   - **De referencia** (Banguat, fecha de la operación): facturas, notas de crédito y de débito, movimientos de Bancos,
     pagos en la misma moneda, saldos iniciales, ajustes. **No se edita.**
   - **Acordado** (el del comprobante real): conversiones entre cuentas de distinta moneda y pagos cruzados (cuenta en
     una moneda, deuda en otra). **Se edita**; por omisión, la referencia del día (PU-6).
4. **Nunca se suman monedas distintas.** Todo total que junta registros de varias monedas se da **por moneda** y, si hace
   falta un total único, en quetzales con los equivalentes guardados (o al tipo de una fecha de corte, dicho en el
   reporte).
5. **Partidas monetarias y no monetarias.** Solo se revalúan las monetarias: saldos de cuentas bancarias y saldos por
   pagar (y a favor) en moneda extranjera. Anticipos, inventario y activos fijos (módulos futuros) quedan al tipo
   histórico y **no pueden** entrar al cálculo del diferencial (§8.2).
6. **El diferencial se deriva de los hechos guardados** (tipos y equivalentes de cada operación más los tipos de cierre
   de mes), como el saldo de Cuentas por pagar. Se congela solo cuando exista el **cierre cambiario** (§8.5).
7. **Sin supuestos de rubro ni de régimen.** El trato fiscal del diferencial depende del régimen de ISR de la empresa
   (lo da Libro de compras, si está activo) y se presenta como **sugerencia** con su fundamento (PU-9).

## 3. Dónde vive cada cosa

### 3.1 Opciones

| Opción | Cómo | A favor | En contra |
|---|---|---|---|
| **A. Núcleo + módulo `multimoneda`** | `core`: catálogo de monedas, tipos de cambio, carga del Banguat y el servicio `tiposDeCambio` (como `calendarioLaboral`). Módulo activable `multimoneda` (`dependeDe: []`): dice qué monedas puede usar la cuenta (orden del mediador), sus reportes, su configuración y, después, el cierre cambiario | Bancos, Libro y Cuentas por pagar ponen llave foránea a `core.monedas` y leen tipos del core sin depender de un módulo opcional; se vende como agregado; las empresas solo en quetzales no ven nada nuevo | Una pieza más (el módulo) |
| B. Todo en el núcleo, siempre disponible | Lo mismo sin módulo: cualquier cuenta usa las monedas activas del catálogo | Más simple | No se puede vender aparte ni ocultar a quien no lo usa; el menú y los formularios muestran la moneda a todos |
| C. Todo en un módulo `multimoneda` con su esquema | Tablas de tipos en `multimoneda.*` | Todo junto | Bancos no puede poner llaves ni leer sus tablas sin depender de él (`docs/PLAN.md` §3.2), y Bancos no debe depender de un módulo opcional |

**Recomendado: A** (PU-2). Clave `multimoneda`, nombre «Multimoneda», descripción «Cuentas, facturas y pagos en dólares
u otras monedas, con el tipo de cambio del Banco de Guatemala».

### 3.2 Qué pasa si el módulo está inactivo

- Ninguna pantalla ofrece otra moneda; los servidores de Bancos, Libro y Cuentas por pagar preguntan
  `multimoneda.monedas_disponibles` y, con `ModuloNoDisponible`, solo aceptan GTQ (`MonedaNoDisponible`, 422).
- **Lo ya registrado en otra moneda sigue funcionando** si se desactiva el módulo después: pagar una factura en dólares,
  conciliar una cuenta en dólares o ver un reporte no pasan por esa orden (el tipo de cambio lo da el core). Solo se
  impide **crear** cuentas o documentos nuevos en otra moneda (PU-15).

## 4. Tipos de cambio

### 4.1 Qué es «el tipo de una fecha»

- `fecha` = el **día en que rige** (la vigencia que publica el Banguat; dictamen §6: entra en vigor a las 00:00 del día
  hábil siguiente a su cálculo). Siempre en **quetzales por una unidad** de la moneda extranjera.
- **Vigente en la fecha F** = la versión más reciente de la fila con la mayor `fecha ≤ F`. Si esa fila es de F, el tipo es
  **exacto**; si es de antes, es **anterior** y la respuesta lo dice (`fechaDelTipo`).
- Regla de uso (constante del dominio, no configuración: `DIAS_MAXIMOS_CON_TIPO_ANTERIOR = 7`, PU-10):
  - exacto: se usa sin aviso;
  - anterior con hasta 7 días: se usa **con aviso** («No hay tipo de cambio publicado para el dd/mm/aaaa; se usó el del
    dd/mm/aaaa (Q 7.64489)») y el registro guarda `fecha_del_tipo_de_cambio`; el formulario pide confirmarlo
    (`confirmarTipoAnterior: true`, como otros avisos que se confirman);
  - más viejo, o una fecha **futura** sin publicación: `TipoDeCambioNoDisponible` (422), que pide a soporte cargarlo.
- Una operación registrada con tipo anterior **no cambia sola** cuando el Banguat publica después: sale en la lista
  «Operaciones con tipo de cambio por revisar» (§8.6). Si el oficial resultó distinto, el usuario anula y registra de
  nuevo con las herramientas que ya existen (el documento es inmutable).

### 4.2 Versiones y corrección

- La tabla **solo crece** (RLS de solo agregar, §6.1). Corregir un tipo = **agregar una versión** de la misma moneda y
  fecha; la vigente es la última (`registrado_en`). Nada se borra.
- La carga automática agrega una fila `banguat` por moneda y fecha **una sola vez** (índice único parcial); nunca
  reemplaza a otra. Un ingreso manual de soporte (`manual`) puede ir antes (el Banguat no respondió; cuando responde, su
  fila queda como versión más nueva y manda) o después (soporte corrige al Banguat; su fila queda como la más nueva).
- Todo cambio de tipo afecta solo lo que se registre **después**: lo registrado guarda su propio tipo.

### 4.3 Carga desde el Banguat

| Tema | Diseño |
|---|---|
| Servicio | `https://www.banguat.gob.gt/variables/ws/TipoCambio.asmx`, SOAP 1.1 (`POST`, `text/xml`, `SOAPAction`). URL en la variable de entorno `URL_TIPO_DE_CAMBIO_BANGUAT` (esa por omisión; las pruebas apuntan a un servidor falso local). Variable `CARGAR_TIPOS_DE_CAMBIO` (`false` por omisión en todas partes hasta hacer las comprobaciones C-1 a C-4 desde una red que alcance al Banguat; luego se enciende con `true`), como `DEPURAR_HUERFANOS` |
| Operaciones | `TipoCambioDia` para el día (USD: `CambioDolar/VarDolar{fecha, referencia}`). `TipoCambioRango` (o `TipoCambioRangoMoneda` por moneda) para rellenar huecos. **V-13:** comprobar en MM-3, con una llamada real, que en el rango el USD trae `compra = venta = referencia`; si no, el relleno del USD usa la operación que sí traiga la referencia |
| Qué monedas | Las **activas** del catálogo con `codigo_banguat` (USD = 2). Las demás monedas del Banguat (calculadas entre 8:00 y 9:00 a partir del USD) se piden en la vuelta de las 09:30 |
| Horario | Primera vuelta a las **06:00** de Guatemala (`core.regional.zona_horaria` de la instalación). Un temporizador cada 15 minutos decide si toca: si falta el tipo de **hoy** de alguna moneda activa, reintenta a las 06:30, 07:00, 08:00, 09:30, 11:00, 13:00, 16:00 y 20:00; al día siguiente sigue igual. Al **arrancar** la app, y una vez al día, revisa los **últimos 45 días** y rellena huecos con el rango |
| Sin publicación | Nunca bloquea nada: deja la consulta en la bitácora y la app sigue con la regla de §4.1 |
| Una sola carga a la vez | `pg_try_advisory_lock` con una clave fija durante la vuelta (si un día hay dos procesos, el segundo no hace nada); además el índice único parcial impide duplicar filas `banguat` |
| Validación | Respuesta de hasta 256 KB y 10 s de espera; solo HTTPS, sin seguir redirecciones a otro dominio. Se rechaza todo XML con `<!DOCTYPE` o `<!ENTITY` y se extraen solo los elementos esperados (sin dependencia nueva; si se prefiere un analizador, con entidades apagadas: lo revisa `seguridad`). Cada valor pasa por Zod: fecha `dd/mm/aaaa` válida y no futura más allá de mañana, referencia `^\d{1,6}(\.\d{1,8})?$` y > 0; el USD además dentro de una banda de cordura (constante `5 a 15`): fuera de ella no se guarda y la consulta queda como `valor_fuera_de_rango` |
| Variación grande | Si la referencia nueva difiere más de **3 %** de la del día anterior se guarda, pero el panel de soporte la muestra con aviso (constante del dominio) |
| Bitácora | Cada vuelta deja una fila en `core.consultas_al_banguat` (§6.1): operación, rango, resultado, filas nuevas y el error (recortado a 500 caracteres, sin el cuerpo de la respuesta) |
| Fuente | Toda pantalla y todo reporte que muestre tipos dice «Fuente: Banco de Guatemala» (condición del servicio, dictamen §6) |

### 4.4 Ingreso manual (soporte)

- Solo **superacceso** (PU-3): permiso `configuracion.tipos-de-cambio.crear` (`soloSuperacceso`). Pide moneda, fecha,
  referencia (compra y venta opcionales) y **motivo** (1–300). Si ya existe una versión para esa fecha, se presenta como
  «Corregir» y muestra la vigente.
- «Cargar ahora» (`configuracion.tipos-de-cambio.crear`): corre la vuelta del Banguat para hoy o para un rango
  (`desde`/`hasta`, máximo 366 días) sin esperar el horario.
- No hay importación desde Excel: el relleno por rango del Banguat cubre el historial.

## 5. Qué tipo usa cada operación de Arrancar

| Operación (módulo) | Fecha del tipo | Clase | Se edita | Notas |
|---|---|---|---|---|
| Factura, nota de crédito o de débito, recibo en moneda extranjera (Libro de compras) | Emisión | Referencia | No (PU-5) | Libro y crédito fiscal en GTQ al tipo de la emisión, como la SAT (dictamen §3). La nota usa **su** fecha de emisión (V-4) |
| Retención de IVA o ISR de ese documento (Libro de compras) | La del documento | — | No | Base y monto en GTQ, como hoy; su equivalente en la moneda del documento = `redondear(retención / tipo)` (V-3) |
| Documento recibido en Cuentas por pagar | El del libro (copiado) | — | No | Para un saldo inicial: el tipo de la **fecha de corte** (V-7) |
| Nota, cheque o depósito en una cuenta en moneda extranjera, registrado en Bancos | La del movimiento | Referencia | No | Cheque **posfechado** en moneda extranjera: no se permite en v1 (PU-11) |
| Saldo inicial de una cuenta en moneda extranjera y sus partidas de apertura | La del saldo inicial (corte) | Referencia | No | El cuadre contra `saldo_segun_libros_anteriores` (GTQ) compara el equivalente |
| Transferencia entre dos cuentas de **distinta** moneda (compra o venta de divisas) | La de la transferencia | Acordado | Sí: se escriben **lo que salió** y **lo que entró**; el tipo real se deduce | La pata en moneda extranjera va a la referencia del día; la diferencia con lo que de verdad entró o salió en quetzales es el **diferencial de la conversión** (§8.3, V-5) |
| Transferencia entre dos cuentas de la misma moneda extranjera | La de la transferencia | Referencia | No | Las dos patas al mismo tipo: sin diferencial |
| Inverso de un movimiento (anulación con inverso) | — | Copia el del original | No | Deshace el mismo valor en quetzales (V-9) |
| Pago en la misma moneda extranjera de la deuda (Cuentas por pagar) | La del pago | Referencia | No (PU-6) | Diferencial realizado contra la base de la deuda (§8.3) |
| Pago cruzado: cuenta en GTQ, deuda en moneda extranjera | La del pago | Acordado | Sí (por omisión la referencia) | Se escribe cuánto de la deuda se paga y el tipo, o los quetzales pagados |
| Pago cruzado: cuenta en moneda extranjera, deuda en GTQ | La del pago | Acordado | Sí | La deuda no tiene diferencial; la cuenta bancaria sí (dictamen §3) |
| Aplicar a la cuenta de apertura (saldo inicial ya pagado) | — | El del documento | No | No es un pago real: se liquida al valor en libros |
| Aplicación de una nota de crédito a una factura (automática, manual o en contraseña) | La de la aplicación | Referencia | No | Misma moneda de nota y factura (PU-13) |
| Ajuste de saldo (diferencia menor, no recuperable, compensado) | La del ajuste | Referencia | No | Su efecto (pérdida, ingreso, transitoria) va en GTQ al tipo de su fecha |
| Retiro de efectivo y pago en efectivo | — | — | — | Solo quetzales en v1 (PU-13) |
| Reintegro del proveedor | La del reintegro | Referencia | No | Misma moneda de la nota y de la cuenta (PU-13) |
| Cierre de mes para el diferencial | Último día del mes | Referencia | No | Obligatorio al 31 de diciembre (dictamen §4) |

## 6. Datos

Convenciones: `tipo_de_cambio numeric(16,8)` (no es dinero: el Banguat da 5 decimales para el USD y las monedas cruzadas
pueden necesitar más); en el código, un objeto de valor `TipoDeCambio` (`core/compartido/dominio/tipo-de-cambio.ts`) que
guarda el valor como entero escalado `× 10⁸` (`bigint`), viaja como texto en la API y convierte centavos con aritmética
entera y redondeo desde la mitad: `aQuetzales(centavos)` y `aMoneda(centavosEnQuetzales)`. Dinero en `numeric(14,2)`.
Toda llave foránea con índice (el de la llave o uno que empiece por sus columnas).

### 6.1 Núcleo (`core`, migración `0024_multimoneda`)

**`core.monedas` (cambia).**

| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `activa` | `boolean` | no, `default true` | Solo las activas se ofrecen y se cargan del Banguat |
| `codigo_banguat` | `smallint` | sí | Código del Banguat (USD = 2). `unique`. Las demás se verifican con `VariablesDisponibles` en MM-3 |
| `letras_singular` | `text` | sí | «QUETZAL», «DÓLAR»: monto en letras de cheques y comprobantes |
| `letras_plural` | `text` | sí | «QUETZALES», «DÓLARES» |

Restricciones: `monedas_decimales_validos check (decimales between 0 and 4)`; `monedas_activa_con_dos_decimales check (not
activa or decimales = 2)` — en v1 solo se activan monedas de dos decimales, porque todo el dinero es `numeric(14,2)`;
`monedas_letras_completas check ((letras_singular is null) = (letras_plural is null))`. Datos: GTQ y USD con sus letras
y `codigo_banguat` del USD = 2; las demás monedas que se acuerden (PU-4) se siembran **inactivas**. Sin RLS (catálogo
público de la instalación, como hoy).

**`core.tipos_de_cambio` (nueva).** De toda la instalación, sin `empresa_id` ni `cuenta_id`.

| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | `uuid` PK | no | `idPrimario()` |
| `moneda` | `char(3)` | no | FK `core.monedas(codigo)` |
| `fecha` | `date` | no | Día en que rige |
| `referencia` | `numeric(16,8)` | no | Quetzales por unidad |
| `compra` | `numeric(16,8)` | sí | Si el servicio la trae |
| `venta` | `numeric(16,8)` | sí | Si el servicio la trae |
| `origen` | `text` | no | `banguat` o `manual` |
| `consulta_id` | `uuid` | sí | FK `core.consultas_al_banguat(id)`; obligatoria si `origen = 'banguat'` |
| `motivo` | `text` | sí | Obligatorio si `manual` (1–300, sin espacios en los extremos) |
| `registrado_por` | `uuid` | sí | Usuario de soporte (`deLaTransaccion.usuario()`); obligatorio si `manual`, nulo en la tarea |
| `registrado_en` | `timestamptz` | no | `default now()` |

Restricciones: `tipos_de_cambio_no_gtq check (moneda <> 'GTQ')`; `…_referencia_positiva check (referencia > 0)`;
`…_compra_venta_positivas check ((compra is null or compra > 0) and (venta is null or venta > 0))`; `…_origen_valido`;
`…_manual_completo check (origen <> 'manual' or (motivo is not null and registrado_por is not null))`;
`…_banguat_con_consulta check (origen <> 'banguat' or consulta_id is not null)`.
Índices: `tipos_de_cambio_vigente_idx (moneda, fecha desc, registrado_en desc)` (búsqueda de la vigente);
`tipos_de_cambio_banguat_unico unique (moneda, fecha) where origen = 'banguat'`; `tipos_de_cambio_consulta_idx
(consulta_id)`.
**RLS: solo agregar en toda la instalación.** Helper nuevo `politicasDeSoloAgregarEnLaInstalacion()` en `columnas.ts`:
`insert` con `with check (true)` y `select` con `using (true)` para `arrancar_app`, sin políticas de `update` ni
`delete` (RLS los rechaza aunque el migrador dé el `grant`). Es el mismo mecanismo de `core.auditoria`.

**`core.consultas_al_banguat` (nueva).** La bitácora de la carga, también de solo agregar en la instalación.

| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | `uuid` PK | no | |
| `iniciada_en` / `terminada_en` | `timestamptz` | no / no | Se inserta al terminar, con las dos |
| `operacion` | `text` | no | `TipoCambioDia`, `TipoCambioRango`, `TipoCambioRangoMoneda` |
| `desde`, `hasta` | `date` | sí | Solo en las de rango |
| `resultado` | `text` | no | `exito`, `sin_datos`, `error`, `valor_fuera_de_rango` |
| `filas_nuevas` | `smallint` | no, `default 0` | |
| `detalle` | `text` | sí | Error recortado (≤ 500) |
| `disparada_por` | `uuid` | sí | Soporte con «Cargar ahora»; nulo si fue la tarea |

Índice `consultas_al_banguat_fecha_idx (iniciada_en desc)`. Crece unas pocas filas al día (≈ 3,000 al año): **no se
depura** (no hace falta decidir una retención).

**Auditoría.** `core.tipos_de_cambio` no se borra ni se cambia, y cada versión lleva quién, cuándo y por qué: **la tabla
es su propio rastro**. No se escribe en `core.auditoria` porque esa tabla exige una cuenta y estos datos son de toda la
instalación (soporte puede trabajar sin empresa activa).

### 6.2 Módulo `multimoneda` (esquema `multimoneda`)

- En v1 **no tiene tablas**: la migración `0000` solo crea el esquema (lo hace el generador). Su configuración,
  permisos y reportes van en su `modulo.ts`.
- Con el cierre cambiario (§8.5, fase posterior) recibe `multimoneda.cierres_cambiarios` y `multimoneda.lineas_de_cierre`.

### 6.3 Bancos (`bancos`, migración `00xx_multimoneda`; el número se toma al programar, después de BS-9)

**`bancos.cuentas_bancarias` (cambia).** `moneda char(3) not null default 'GTQ'` con FK `core.monedas(codigo)`;
`unique cuentas_bancarias_id_moneda_unico (id, moneda)` (destino de las llaves de abajo); índice
`cuentas_bancarias_moneda_idx (empresa_id, moneda)` (cubre la FK y los reportes por moneda).

**`bancos.movimientos` (cambia).**

| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `moneda` | `char(3)` | no, `default 'GTQ'` | La de su cuenta: FK compuesta `movimientos_cuenta_y_moneda_fk (cuenta_bancaria_id, moneda) → cuentas_bancarias(id, moneda)`. Así **la base impide cambiar la moneda de una cuenta con movimientos** (la FK no deja actualizar) |
| `tipo_de_cambio` | `numeric(16,8)` | no, `default 1` | |
| `monto_en_quetzales` | `numeric(14,2)` | no | Equivalente; relleno = `monto` |
| `fecha_del_tipo_de_cambio` | `date` | sí | Fecha de la publicación usada si fue de referencia; nulo en GTQ y si el tipo es acordado |

Restricciones: `movimientos_quetzales_sin_cambio check (moneda <> 'GTQ' or (tipo_de_cambio = 1 and monto_en_quetzales =
monto and fecha_del_tipo_de_cambio is null))`; `movimientos_tipo_y_equivalente_positivos check (tipo_de_cambio > 0 and
monto_en_quetzales > 0)`. El índice `movimientos_cuenta_fecha_idx (cuenta_bancaria_id, fecha)` ya cubre la nueva FK.
`monto`, `interes_bruto`, `isr_retenido` y la conciliación siguen en la moneda de la cuenta.

**`bancos.desglose_de_movimientos` (cambia).** `monto_en_quetzales numeric(14,2) not null` (relleno = `monto`): el
reparto en quetzales del equivalente del movimiento, por el método del mayor residuo (la suma cuadra al centavo). Lo
escribe quien fija el desglose. Lo usan Flujo de efectivo y Movimientos por concepto.

**`bancos.transferencias` (cambia).**

| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `moneda_origen` | `char(3)` | no, `default 'GTQ'` | FK `(cuenta_origen_id, moneda_origen) → cuentas_bancarias(id, moneda)` |
| `moneda_destino` | `char(3)` | no, `default 'GTQ'` | FK `(cuenta_destino_id, moneda_destino) → cuentas_bancarias(id, moneda)` |
| `monto_destino` | `numeric(14,2)` | no | Lo que entró a la cuenta destino; relleno = `monto` |
| `diferencial_en_quetzales` | `numeric(14,2)` | no, `default 0` | Equivalente de la pata destino − equivalente de la pata origen (positivo = ganancia) |

Restricciones: `transferencias_misma_moneda check (moneda_origen <> moneda_destino or (monto_destino = monto and
diferencial_en_quetzales = 0))`; `transferencias_monto_destino_positivo check (monto_destino > 0)`. Los índices
`transferencias_origen_idx` y `…_destino_idx` cubren las FK nuevas.

**`bancos.saldos_iniciales`, `conciliaciones`, `chequeras`, `cheques`, `conceptos`:** sin columnas nuevas. La moneda
sale de la cuenta; la conciliación y la impresión del cheque van en la moneda de la cuenta.

**Relleno y convivencia.** La migración agrega las columnas con su `default`, rellena `monto_en_quetzales = monto` y
`monto_destino = monto`, y después pone `not null`; no reemplaza nada (las llaves nuevas se suman a las que hay). Todo lo
existente queda GTQ, tipo 1, sin diferencial. Recordatorio de `DONDE-QUEDAMOS.md`: el `when` del journal de Bancos debe
ser mayor que el último.

### 6.4 Libro de compras (`libro_de_compras`, migración `00xx_multimoneda`)

Qué significa cada monto (para no confundirse): en Libro de compras **los montos fiscales que hay hoy siguen en GTQ**
(`total`, `base`, `iva`, `iva_no_acreditable`, `idp`, `exento`, `otros_impuestos`, y los de líneas y retenciones), porque
el libro, el crédito fiscal y las retenciones se declaran en quetzales. Lo nuevo guarda la moneda y el total **en la
moneda de la factura**.

**`libro_de_compras.documentos` (cambia).**

| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `moneda` | `char(3)` | no, `default 'GTQ'` | FK `core.monedas(codigo)`; índice `documentos_moneda_idx (empresa_id, moneda) where moneda <> 'GTQ'` (pequeño; cubre la FK para lo que no es GTQ y sirve a la lista «por revisar») |
| `tipo_de_cambio` | `numeric(16,8)` | no, `default 1` | Referencia de la fecha de emisión |
| `fecha_del_tipo_de_cambio` | `date` | sí | Fecha de la publicación usada |
| `total_en_moneda` | `numeric(14,2)` | no | Total de la factura en su moneda; relleno = `total` |

Restricciones: `documentos_quetzales_sin_cambio check (moneda <> 'GTQ' or (tipo_de_cambio = 1 and total_en_moneda = total
and fecha_del_tipo_de_cambio is null))`; `documentos_extranjera_con_tipo check (moneda = 'GTQ' or (tipo_de_cambio > 0 and
fecha_del_tipo_de_cambio is not null))`; `documentos_total_en_moneda_positivo` (mismo signo y regla que `total`).

**`libro_de_compras.lineas_de_documento` (cambia).** `total_en_moneda numeric(14,2) not null` (relleno = `total`), con
`check (total_en_moneda > 0)`. El dominio garantiza que la suma de las líneas da el `total_en_moneda` del documento.

**`libro_de_compras.dte_recibidos` (cambia).** `moneda char(3) not null default 'GTQ'` con FK. En la bandeja los montos
quedan **como vienen en el archivo** (moneda original); la conversión se hace al registrar.

**Sin cambio:** `retenciones` (GTQ), `facturas_anteriores` (solo GTQ en v1, PU-14), `periodos`, `folios_del_libro`,
catálogos.

### 6.5 Cuentas por pagar (`cuentas_por_pagar`, migración `00xx_multimoneda`, después de CP4-12 y CP5-11)

Qué significa cada monto: en Cuentas por pagar el **monto es la deuda**, así que `total`, `retenciones`, `saldo_al_inicio`,
`retenciones_por_practicar` y todos los montos de pagos, notas, ajustes y reintegros quedan **en la moneda del documento**
(en GTQ, como hoy, para todo lo existente). Así el cálculo del saldo, que nunca suma monedas, **no cambia**. Al lado va su
equivalente en quetzales.

| Tabla | Columnas nuevas | Llaves y restricciones |
|---|---|---|
| `documentos` | `moneda char(3) not null default 'GTQ'` (FK `core.monedas`); `tipo_de_cambio numeric(16,8) not null default 1` (copiado del libro; en saldo inicial, el de la fecha de corte); `fecha_del_tipo_de_cambio date null`; `total_en_quetzales numeric(14,2) not null` y `retenciones_en_quetzales numeric(14,2) not null` (copiados del libro: los montos fiscales; relleno = `total` y `retenciones`) | `unique documentos_id_moneda_unico (id, empresa_id, proveedor_id, moneda)`; `check (moneda <> 'GTQ' or (tipo_de_cambio = 1 and total_en_quetzales = total and retenciones_en_quetzales = retenciones))`; índice `(empresa_id, moneda)` |
| `contrasenas` | `moneda char(3) not null default 'GTQ'` | `unique (id, empresa_id, proveedor_id, moneda)`. **Una contraseña, una moneda** (PU-12) |
| `contrasena_documentos` | `moneda char(3) not null default 'GTQ'` | Las dos llaves compuestas existentes se **reemplazan** por las mismas con `moneda` al final (hacia `contrasenas` y hacia `documentos`): la base impide meter un documento en una contraseña de otra moneda |
| `aplicaciones_de_notas` | `moneda char(3) not null default 'GTQ'`; `tipo_de_cambio numeric(16,8) not null default 1`; `monto_en_quetzales numeric(14,2) not null` (relleno = `monto`) | Las llaves `aplicaciones_nota_fk` y `aplicaciones_cargo_fk` se reemplazan por las mismas con `moneda`: nota y factura de la misma moneda |
| `pagos` | `moneda char(3) not null default 'GTQ'` (la de la cuenta bancaria; en la cuenta de apertura, la de los cargos); `moneda_de_los_cargos char(3) not null default 'GTQ'`; `tipo_de_cambio numeric(16,8) not null default 1` (el de la liquidación, aplicado a todo el pago); `tipo_de_referencia numeric(16,8) null` (la del Banguat de la fecha, para mostrar lo acordado contra lo oficial); `monto_en_quetzales numeric(14,2) not null` (relleno = `monto`) | FK `core.monedas` en las dos monedas; `check (moneda = moneda_de_los_cargos or forma in ('cheque', 'nota_de_debito'))` (solo los pagos con movimiento propio pueden cruzar monedas; `nota_ligada`: la nota y los cargos en la misma moneda, PU-13); `check (moneda <> 'GTQ' or moneda_de_los_cargos <> 'GTQ' or (tipo_de_cambio = 1 and monto_en_quetzales = monto))`; `check (forma <> 'efectivo' or (moneda = 'GTQ' and moneda_de_los_cargos = 'GTQ'))`. **Un pago, cargos de una sola moneda** (PU-12) |
| `aplicaciones_de_pagos` | `moneda char(3) not null default 'GTQ'` (la del cargo); `monto_pagado numeric(14,2) not null` (en la moneda del pago; relleno = `monto`); `monto_en_quetzales numeric(14,2) not null` (lo que se liquidó en quetzales; relleno = `monto`) | `aplicaciones_de_pagos_cargo_fk` se reemplaza con `moneda` al final; `check (monto_pagado > 0 and monto_en_quetzales > 0)`. `monto` y `retencion_descontada` siguen en la moneda del cargo |
| `ajustes_de_saldo` | `moneda char(3) not null default 'GTQ'`; `tipo_de_cambio numeric(16,8) not null default 1`; `monto_en_quetzales numeric(14,2) not null` | Llave hacia el documento con `moneda` |
| `reintegros` | `moneda char(3) not null default 'GTQ'`; `tipo_de_cambio numeric(16,8) not null default 1`; `monto_en_quetzales numeric(14,2) not null` | — |
| `aplicaciones_de_reintegros` | `moneda char(3) not null default 'GTQ'` | Llave hacia la nota con `moneda` |
| `retiros_de_efectivo` | — | Solo GTQ en v1: lo cuida el dominio (la cuenta del retiro debe ser GTQ) |

Todas con el mismo `check` de «GTQ ⇒ tipo 1 y equivalente igual al monto». Relleno: `default 'GTQ'`, `tipo 1` y
equivalentes = montos. Reemplazar llaves compuestas: `drop constraint` + `add constraint` en la misma migración (las
tablas son chicas y la migración corre en una transacción). `MENSAJES_POR_RESTRICCION` recibe un texto para cada
restricción nueva («La contraseña y el documento son de distinta moneda», etc.).

### 6.6 RLS y llaves entre esquemas

- Todas las columnas nuevas de Bancos, Libro y Cuentas por pagar viven en tablas que ya tienen `politicaPorEmpresa()`:
  no hay política nueva. Las FK nuevas apuntan a `core.monedas` (núcleo, permitido) o a tablas del mismo módulo.
- Ningún módulo pone llave hacia `multimoneda` (no está en su `dependeDe`). Las líneas del cierre futuro apuntan a
  registros de otros módulos **sin llave** (como `documento_de_origen_id`).
- `core.tipos_de_cambio` y `core.consultas_al_banguat`: RLS de solo agregar en la instalación (§6.1).

## 7. Reglas por módulo

### 7.1 Núcleo: el servicio `tiposDeCambio`

- Instancia única en `core/monedas/contexto.ts`, como `calendarioLaboral`; los módulos la reciben al armarse (puerto
  propio en cada módulo, adaptador en su `infraestructura`). Métodos:
  - `vigente(moneda, fecha): Promise<TipoVigente>` → `{ moneda, fecha, fechaDelTipo, referencia, origen, exacto }`, con
    la regla de §4.1 (lanza `TipoDeCambioNoDisponible`); para `GTQ` devuelve `1`, exacto.
  - `delCierre(moneda, mes)` → el vigente del último día del mes (para el diferencial).
  - `serie(moneda, desde, hasta)` → para reportes.
- Lee con la transacción en curso si la hay (misma foto que el caso de uso); guarda en memoria lo leído y se invalida al
  agregar una versión.

### 7.2 Bancos

1. **Cuenta en moneda extranjera:** se crea con `moneda` solo si `multimoneda.monedas_disponibles` la incluye. Cambiar la
   moneda solo sin movimientos (`MonedaDeCuentaConMovimientos`, 409; la FK lo garantiza también) y queda en la auditoría
   (`corregir`, recurso `bancos.cuentas-bancarias`, con la cuenta como estaba).
2. **Notas, cheques y depósitos** de una cuenta extranjera: `tipo_de_cambio` = vigente de la fecha (§4.1) y
   `monto_en_quetzales = aQuetzales(monto)`. Corregir la fecha o el monto de una nota recalcula los dos (es una
   corrección, ya auditada). **Cheque posfechado** en moneda extranjera: `PosfechadoEnMonedaExtranjera` (422; PU-11).
3. **Saldo inicial** de una cuenta extranjera: el tipo de la fecha del saldo; sus partidas de apertura también. El cuadre
   con los libros anteriores compara el equivalente en quetzales y lo dice.
4. **Transferencia entre monedas distintas**: pide `monto` (sale, en la moneda de origen) y `montoDestino` (entra). La
   pata extranjera va al tipo de referencia del día; la pata en GTQ, a su monto. `diferencial_en_quetzales =
   equivalente(destino) − equivalente(origen)`. Entre dos monedas extranjeras distintas (USD↔EUR) las dos patas van a su
   referencia y el diferencial es la diferencia de los equivalentes. Muestra el tipo real deducido
   (`quetzales / moneda`) y lo compara con la referencia: si difiere más de **2 %**, aviso que se confirma («revise los
   montos»).
5. **Inverso:** copia `moneda`, `tipo_de_cambio`, `monto_en_quetzales` y `fecha_del_tipo_de_cambio` del original. Anular
   una transferencia anula sus dos patas con sus equivalentes; su diferencial sale del cálculo porque queda anulada.
6. **Órdenes de otros módulos** (`emitir_cheque_de_origen`, `registrar_nota_de_origen`): reciben `monedaEsperada` y, si
   la cuenta es extranjera o el pago cruza monedas, `tipoDeCambio` y `montoEnQuetzalesCentavos`; sin ellos, Bancos usa la
   referencia. Si la cuenta no es de `monedaEsperada`: `MonedaDeLaCuentaDistinta` (422).
7. **Intereses con ISR (H8)** en una cuenta extranjera: `interes_bruto` e `isr_retenido` en la moneda de la cuenta; el
   reporte de intereses muestra además su equivalente al tipo del movimiento (V-11).
8. **Monto en letras** (impresión de cheques, IC-2): `montoEnLetras(centavos, moneda)` usa `letras_singular`/`letras_plural`
   del catálogo; sin letras, la moneda no se puede imprimir (`MonedaSinLetras`). Formato exacto para dólares: V-10.

### 7.3 Libro de compras

1. **Moneda del documento:** GTQ por omisión; otra solo si `multimoneda.monedas_disponibles` la incluye. El tipo es la
   referencia de la **fecha de emisión** (§4.1), fijo.
2. **Lo que escribe el usuario** son los montos **de la factura**, en su moneda (como hoy en quetzales). El dominio
   convierte cada línea antes de su cálculo fiscal de siempre:
   - `total_en_quetzales_del_documento = aQuetzales(Σ líneas en moneda)`; cada línea recibe su parte por el **mayor
     residuo**, así la suma de las líneas en GTQ da el total en GTQ al centavo;
   - igual para `exento`, `otros_impuestos` e `idp` escrito; después corre el cálculo actual de base, IVA, IVA no
     acreditable y retenciones **sobre los quetzales** (el motor fiscal no cambia).
   - **V-2:** la SAT podría convertir el IVA por su lado (`IVA en dólares × tipo`) y diferir en un centavo; se compara
     con un archivo real de DTE en dólares antes de MM-L2.
3. **Combustible** en un documento extranjero: `CombustibleEnMonedaExtranjera` (422) en v1 (el IDP es por galón en
   quetzales; PU-14).
4. **Notas de crédito y de débito** sobre una factura del libro: la misma moneda que la factura (`MonedaDistintaALaFactura`);
   su tipo es el de **su** emisión (V-4). Notas sobre facturas del sistema anterior: solo GTQ en v1 (PU-14).
5. **Bandeja de DTE:** con el módulo activo, la fila con una moneda disponible se acepta (guarda `moneda` y los montos
   originales); si no, sigue el rechazo `moneda_no_admitida`. Al registrar desde la bandeja se convierte como en el punto
   2. **Verificar en MM-L2** con un archivo real qué columnas trae la SAT en moneda original y cuáles en quetzales (V-2).
6. **Retenciones:** sin cambio (base y monto en GTQ). El destino recibe su equivalente en la moneda del documento.
7. **Reportes fiscales** (Libro de compras y servicios, IVA crédito fiscal, retenciones, constancias, análisis): en GTQ,
   sin cambio. La lista y la ficha del documento muestran moneda, total en moneda, tipo y su fecha. Si la SAT pide la
   moneda en el libro: V-12.
8. **Orden nueva** `libro-de-compras.regimen_en_la_fecha` (la atiende Libro de compras con su historial fiscal): da el
   régimen de IVA e ISR vigente en una fecha, para la sugerencia fiscal del diferencial.

### 7.4 Cuentas por pagar

1. **Recibir el documento** del libro con su moneda, tipo, total y retenciones en moneda (`total`, `retenciones`) y en
   quetzales (`total_en_quetzales`, `retenciones_en_quetzales`).
2. **Saldo inicial** en moneda extranjera (formulario y Excel): `moneda` y montos en esa moneda; el tipo es el de la
   **fecha de corte** (día anterior a la fecha de inicio), no se edita (V-7). Requiere el módulo activo.
3. **Contraseñas:** una moneda; solo documentos de esa moneda (`MonedaDistintaEnLaContrasena`, 422; la base también lo
   impide). Un proveedor con facturas en dos monedas recibe dos contraseñas.
4. **Notas de crédito** de Cuentas por pagar: solo contra cargos de su misma moneda. Cada aplicación guarda el tipo de su
   fecha y su equivalente.
5. **Pagos** (CP4). Un pago cubre cargos de **una** moneda (`MonedasMezcladasEnElPago`) y sale de una cuenta:
   - **Misma moneda** (GTQ/GTQ o USD/USD): `tipo_de_cambio` = referencia de la fecha del pago (1 si GTQ), no se edita;
     `monto_pagado = monto`; `monto_en_quetzales = aQuetzales(monto)`.
   - **Deuda extranjera, cuenta en GTQ:** el usuario escribe por cargo cuánto de la deuda paga (en su moneda) y un tipo
     para todo el pago (por omisión la referencia); `monto_pagado = aQuetzales(monto)` = `monto_en_quetzales`.
     También puede escribir los quetzales y el sistema deduce la parte de la deuda (`aMoneda`).
   - **Deuda en GTQ, cuenta extranjera:** escribe los quetzales que liquida por cargo y el tipo;
     `monto_pagado = aMoneda(monto)`, `monto_en_quetzales = monto`. El movimiento de Bancos lleva el monto en la moneda
     de la cuenta, el tipo acordado y como equivalente **la suma de lo liquidado en quetzales**.
   - **Retención** de un cargo extranjero: se descuenta su equivalente en la moneda del cargo (copiado del documento); no
     se paga ni genera diferencial (se liquida contra la retención por pagar en GTQ).
   - El **diferencial realizado** de cada cargo se calcula y se **muestra** en la ventana antes de confirmar, según el
     método de la empresa (§8.3); no se guarda aparte: sale de lo guardado.
   - **Bancarización** (pagos en efectivo y R9): el umbral de Q30,000 se compara con `total_en_quetzales` del cargo (V-12).
   - **Efectivo:** solo cargos en GTQ y retiros de una cuenta en GTQ (PU-13).
   - **Cuenta de apertura** de un saldo inicial extranjero: se liquida al tipo del documento.
   - **Reaplicar** un pago: solo a cargos de la misma moneda de los cargos originales.
   - **Anular**: sin cambio (las líneas quedan no vigentes y salen del cálculo).
6. **Ajustes de saldo** y **reintegros**: en la moneda del documento o de la nota, con el tipo de su fecha y su
   equivalente; el reintegro, a una cuenta de la misma moneda.
7. **Reportes R1–R12** (`diseno-cp5-reportes.md`): ninguno suma monedas. Saldos por proveedor y antigüedad, documentos a
   una fecha, estado de cuenta, saldos a favor, contraseñas, pagos realizados y notas de débito sin aplicar van **por
   moneda** (secciones con sus totales; el estado de cuenta, uno por moneda), con una columna «Equivalente en quetzales
   al dd/mm/aaaa» (tipo de la fecha de corte, dicho en el pie) en la sección extranjera y un total general en GTQ. Ajustes
   del mes: monto en moneda y en quetzales, totales en GTQ. Bancarización: en GTQ. Posfechados y retiros: solo GTQ.

### 7.5 Multimoneda

- Atiende `multimoneda.monedas_disponibles`: las monedas activas del catálogo distintas de GTQ (sin lista por empresa en
  v1; PU-4).
- Reportes: **Tipos de cambio** (serie por moneda y rango, con origen y «Fuente: Banco de Guatemala») y **Diferencial
  cambiario** del mes (§8.4). Lista **Operaciones con tipo de cambio por revisar** (§8.6).

## 8. Diferencial cambiario

### 8.1 Convenciones

- `T(F)` = tipo vigente del día F (§4.1); `F_M` = último día del mes M. Todo resultado en GTQ, **positivo = ganancia**,
  negativo = pérdida. Se restan **equivalentes ya redondeados** (no tipos), así las sumas cuadran con los quetzales
  guardados.
- **Activo** (cuenta bancaria, saldo a favor de una nota): efecto = valor nuevo − valor en libros.
  **Pasivo** (cargo por pagar): efecto = valor en libros − valor nuevo.
- Cada partida tiene un **valor original en quetzales**: el de su registro (documento: `total_en_quetzales −
  retenciones_en_quetzales` y su monto en moneda sin la retención; cuenta: la suma de los equivalentes de sus
  movimientos).

### 8.2 Partidas que entran

| Partida | Forma | Quién la informa | Monetaria |
|---|---|---|---|
| Cuenta bancaria en moneda extranjera | **Fondo** (saldo y movimientos) | Bancos | Sí |
| Cargo por pagar en moneda extranjera (sin la retención pendiente) | **Partida** (documento con sus liquidaciones) | Cuentas por pagar | Sí |
| Nota de crédito con saldo a favor en moneda extranjera | Partida, activo | Cuentas por pagar | Sí (V-8) |
| Conversión entre cuentas (transferencia de monedas distintas) | Realizado puntual | Bancos | — |
| Anticipos, inventario, activos fijos (futuros) | — | — | **No**: el contrato exige `monetaria: true` y el módulo rechaza otra cosa (`PartidaNoMonetaria`) |

### 8.3 Cálculo por método (configuración `multimoneda.diferencial.metodo`, PU-7)

**B. Acumulativo (por omisión).** Base de una partida al empezar el mes M: el valor a `T(F_{M−1})` si ya existía al
cierre anterior; si nació en M, su valor original.
- Partida (pasivo), con valor en libros `V` al empezar M y liquidaciones `s` en M (monto `a_s` en moneda, quetzales
  `q_s`): **realizado** de cada una = `aQuetzales(a_s, base) − q_s`; lo que queda en libros = `V − Σ aQuetzales(a_s,
  base)`; **no realizado** al cierre = lo que queda − `aQuetzales(saldo_final, T(F_M))`.
- Fondo (cuenta bancaria): `V_inicio = aQuetzales(saldo_inicio, T(F_{M−1}))` (o la suma de su apertura);
  `V_libros = V_inicio + Σ ± monto_en_quetzales` de los movimientos del mes; **no realizado** = `aQuetzales(saldo_final,
  T(F_M)) − V_libros`. Las conversiones aportan su `diferencial_en_quetzales` como **realizado**.
- La base del mes siguiente es `T(F_M)`. En un activo (saldo a favor) los signos se invierten.

**C. Con reversión.** Base siempre el valor original. Realizado = `valor original proporcional − q_s`; no realizado al
cierre = valor original de lo que queda − su valor a `T(F_M)`, y se **reversa el día 1** del mes siguiente (lo hará
Contabilidad con el evento del cierre).

**Invariante para las pruebas:** en una partida ya liquidada, la suma de todos sus efectos (realizados y no realizados de
todos los meses) es la misma con B y con C: `valor original − Σ q_s`. En un fondo, la suma de los no realizados de B al
cierre de M es igual al acumulado de C en ese cierre.

Cambiar el método a media año no se impide por configuración (es de soporte), pero el reporte del mes avisa si el método
del año cambió y, con el cierre cambiario, la base rechazará un cierre con método distinto al de los cierres anteriores
del mismo año (`MetodoDeCierreDistintoEnElAnio`).

### 8.4 Reporte «Diferencial cambiario» (Multimoneda → Reportes; imprimir y exportar)

- Filtro: mes (y moneda). Lo arma `multimoneda` preguntando a todos los módulos activos sus partidas (§9.2) y calculando
  con el método de la empresa. **Un solo lugar con la fórmula** (dominio de `multimoneda`, con pruebas exhaustivas).
- Columnas por partida: origen (módulo, documento o cuenta, con enlace), moneda, saldo en moneda al inicio y al cierre,
  base, tipo de cierre, realizado, no realizado, ganancia o pérdida, **naturaleza** (cuenta bancaria, cuenta por pagar,
  saldo a favor, conversión) y **trato en el ISR sugerido** según el régimen vigente al cierre (orden
  `libro-de-compras.regimen_en_la_fecha`; sin Libro de compras activo: «sin régimen, no se sugiere»). Tabla del dictamen
  §5 en el dominio, con la leyenda «Sugerencia para la conciliación del ISR; la decide su contador».
- Totales: realizado y no realizado, ganancias y pérdidas, por naturaleza y en total, en GTQ.
- Pie: tipos de cierre usados por moneda, «Fuente: Banco de Guatemala», método.
- Sirve de **registro mensual** de los saldos en moneda extranjera que pide el art. 21 num. 28 para deducir la pérdida no
  realizada de cuentas por pagar (V-14).

### 8.5 Cierre cambiario y evento para Contabilidad (fase posterior, PU-8)

- Ventana «Cierre cambiario del mes» en Multimoneda (operación): calcula como el reporte, guarda el resultado y publica
  `multimoneda.cierre_cambiario_registrado` con todas las líneas. **No hace partidas** (eso es de Contabilidad). Anularlo
  pide permiso, motivo y auditoría, y publica `…_anulado`.
- Tablas: `multimoneda.cierres_cambiarios` (`empresa_id`, `mes date` día 1, `fecha_de_corte`, `metodo`, `estado
  registrado|anulado`, registro y anulación con quién, cuándo y motivo; único `(empresa_id, mes) where estado =
  'registrado'`; `politicaPorEmpresa`) y `multimoneda.lineas_de_cierre` (`cierre_id` con llave compuesta con la empresa,
  `modulo`, `recurso`, `registro_id` **sin llave**, `moneda` FK, `naturaleza`, `realizado boolean`, `saldo_en_moneda`,
  `tipo_base`, `tipo_de_cierre`, `diferencial numeric(14,2)` con `check <> 0`; índices por cierre y por
  `(empresa_id, modulo, registro_id)`; `politicaPorEmpresa`).
- Reglas a decidir entonces: meses en orden desde el primero con partidas extranjeras; operaciones extranjeras con fecha
  en un mes cerrado, rechazadas (como un período declarado del libro) salvo anular el cierre.
- **El diferencial realizado se contabilizaría en la partida del cierre** (fin de mes), no el día del pago: el evento del
  pago lleva los hechos (tipo y quetzales) y la línea realizada sale en el cierre (V-6).

### 8.6 Operaciones con tipo de cambio por revisar

Lista en Multimoneda (pregunta a los módulos, §9.2): operaciones extranjeras cuyo `fecha_del_tipo_de_cambio` es anterior a
su fecha, o cuyo tipo difiere del vigente hoy para su fecha (el Banguat publicó después o soporte corrigió). Muestra el
tipo usado, el vigente y la diferencia en quetzales, con enlace a la operación. No corrige nada.

### 8.7 Corrección de C-10

`dictamen-bancos-segunda-parte-2026-11-16.md` (C-10) y `diseno-bancos-segunda-parte.md` (§12 y §16.2) dicen «el no
realizado sin efecto en ISR»: el contador lo corrige (dictamen de Multimoneda §1). Debe decir: «todo diferencial va a
resultados (NIIF para las Pymes 30.10); en el ISR, la ganancia (realizada o no) es renta bruta y la pérdida no realizada
solo se deduce si viene de cuentas por cobrar o por pagar, según el régimen (ver `dictamen-multimoneda-2026-11-18.md`
§1 y §5)». No se toca aquí: espera PU-16.

## 9. Contratos entre módulos

### 9.1 Órdenes

| Orden | Atiende | Datos → respuesta |
|---|---|---|
| `multimoneda.monedas_disponibles` (nueva) | Multimoneda | `{}` → `{ monedas: { codigo, nombre, simbolo, decimales }[] }` (sin GTQ) |
| `libro-de-compras.regimen_en_la_fecha` (nueva) | Libro de compras | `{ fecha }` → `{ regimenIva, regimenIsr } \| null` |
| `bancos.medios_de_pago` (cambia) | Bancos | `CuentaParaPagar` suma `moneda` |
| `bancos.emitir_cheque_de_origen`, `bancos.registrar_nota_de_origen` (cambian) | Bancos | Datos suman `monedaEsperada`, `tipoDeCambio?` (texto) y `montoEnQuetzalesCentavos?`; respuestas suman `moneda`, `tipoDeCambio`, `montoEnQuetzalesCentavos` |
| `cuentas-por-pagar.recibir_documento` (cambia el tipo) | Cuentas por pagar | `DocumentoParaDestino` suma `moneda`, `tipoDeCambio`, `fechaDelTipoDeCambio`, `totalEnMonedaCentavos`, `retencionesEnMonedaCentavos` (opcionales al leer, GTQ si faltan). `totalCentavos` y `retencionesCentavos` **siguen en GTQ** |

### 9.2 Preguntas a todos (`preguntarATodos`, de EM-2; si EM-2 no lo programó aún, lo trae MM-D1)

```ts
interface PreguntasEntreModulos {
  /** Las partidas en moneda extranjera de la empresa en el mes, con sus hechos (sin calcular el diferencial). */
  'multimoneda.partidas_en_moneda_extranjera': {
    datos: { desde: string; hasta: string };
    respuesta: { partidas: PartidaEnMonedaExtranjera[] };
  };
  /** Operaciones con tipo anterior a su fecha o distinto del vigente (§8.6). */
  'multimoneda.operaciones_con_tipo_por_revisar': {
    datos: { desde: string; hasta: string };
    respuesta: { operaciones: OperacionConTipoPorRevisar[] };
  };
}
interface PartidaEnMonedaExtranjera {
  modulo: string; recurso: string; registroId: string; descripcion: string; ruta: string | null;
  moneda: string; monetaria: true;
  naturaleza: 'cuenta_bancaria' | 'cuenta_por_pagar' | 'saldo_a_favor' | 'conversion';
  sentido: 'activo' | 'pasivo';
  forma: 'fondo' | 'partida' | 'realizado';
  fechaDeOrigen: string;                 // emisión, corte o apertura
  valorOriginalEnQuetzalesCentavos: number;
  montoOriginalCentavos: number;         // en moneda, sin la retención
  saldoAlInicioCentavos: number;         // en moneda, al día anterior a `desde`
  saldoAlFinalCentavos: number;          // en moneda, a `hasta`
  movimientosEnQuetzalesCentavos?: number; // fondo: suma con signo de los equivalentes del mes
  liquidaciones?: { fecha: string; montoCentavos: number; enQuetzalesCentavos: number; clase: 'pago' | 'nota' | 'ajuste' | 'apertura' }[];
  diferencialCentavos?: number;          // realizado puntual (conversión)
}
```

Bancos y Cuentas por pagar responden con lo que **ya guardan**; no calculan diferenciales. Un módulo futuro con partidas
monetarias (Cuentas por cobrar, Préstamos, Caja chica en dólares) solo se suscribe.

### 9.3 Eventos (bus) que cambian

- `libro-de-compras.documento_registrado` (hereda `DocumentoParaDestino`): moneda, tipo y totales en moneda.
- `cuentas-por-pagar.pago_registrado`: `moneda`, `monedaDeLosCargos`, `tipoDeCambio`, `montoEnQuetzalesCentavos`; en
  `aplicaciones[]`: `moneda`, `montoPagadoCentavos`, `montoEnQuetzalesCentavos`. Igual en `pago_reaplicado` y
  `pago_anulado` (los montos que revierte), `ajuste_registrado`/`…_anulado` y `reintegro_registrado`/`…_anulado`.
- Bancos aún no publica eventos; cuando lo haga (con Contabilidad), cada movimiento lleva moneda, tipo y equivalente, y la
  transferencia su `diferencialEnQuetzalesCentavos`.
- Nuevo, en la fase del cierre: `multimoneda.cierre_cambiario_registrado` y `…_anulado`.

## 10. Permisos

| Permiso | Módulo | Para | Notas |
|---|---|---|---|
| `configuracion.monedas.editar` | core, `soloSuperacceso` | Activar, desactivar y completar monedas (código del Banguat, letras) | |
| `configuracion.tipos-de-cambio.crear` | core, `soloSuperacceso` | Ingresar o corregir un tipo y «Cargar ahora» | |
| — (solo sesión) | core | Leer monedas y tipos (`GET`) | Datos públicos, como los feriados |
| `multimoneda.tipos-de-cambio.ver` / `.exportar` | multimoneda | Reporte de tipos de cambio | Reportes: imprime y exporta |
| `multimoneda.diferencial.ver` / `.exportar` | multimoneda | Reporte del diferencial y lista por revisar | |
| `multimoneda.cierres.crear` / `.anular` | multimoneda | Fase del cierre (§8.5) | Se declaran en su paso |

Bancos, Libro y Cuentas por pagar **no** necesitan permisos nuevos: usar otra moneda es parte de crear la cuenta, el
documento o el pago (sus permisos de siempre); lo que se activa es el módulo. Sin migración de permisos.

## 11. Configuración (declarada en `multimoneda/modulo.ts`; niveles empresa e instalación)

| Clave | Esquema | Predeterminado | Niveles | Pública |
|---|---|---|---|---|
| `multimoneda.diferencial.metodo` | `z.enum(['acumulativo', 'reversion'])` | `'acumulativo'` | instalación, empresa | sí (la ventana de pago lo usa para mostrar el diferencial) |

Variables de entorno del servidor (no son configuración por niveles): `CARGAR_TIPOS_DE_CAMBIO` y
`URL_TIPO_DE_CAMBIO_BANGUAT` (§4.3). Las demás cifras (7 días, 3 %, 2 %, banda del USD, horario) son constantes del
dominio: se pueden volver variables después sin migración.

## 12. Auditoría

| Qué | Cómo |
|---|---|
| Tipo de cambio manual o corregido | Versión nueva e inmutable con quién, cuándo y motivo (§6.1); no va a `core.auditoria` |
| Cambio de moneda de una cuenta bancaria sin movimientos | `corregir`, `bancos.cuentas-bancarias`, con la cuenta como estaba |
| Anular, eliminar o corregir cualquier registro que ahora tiene moneda | Como hoy; el DTO de `anterior` ya incluye moneda, tipo y equivalente |
| Anular un cierre cambiario (fase posterior) | `anular`, `multimoneda.cierres-cambiarios`, con el cierre y sus líneas |

## 13. Errores nuevos (código propio, `{ error: { codigo, mensaje, detalles } }`)

| Clase (familia) | Código | HTTP | Cuándo |
|---|---|---|---|
| `TipoDeCambioNoDisponible` (Regla) | `tipo_de_cambio_no_disponible` | 422 | Sin tipo en los 7 días anteriores o fecha futura; `detalles: { moneda, fecha, ultimaFechaPublicada }` |
| `TipoAnteriorSinConfirmar` (Regla) | `tipo_de_cambio_anterior_sin_confirmar` | 422 | Se usaría un tipo anterior y el formulario no lo confirmó |
| `MonedaNoDisponible` (Regla) | `moneda_no_disponible` | 422 | Moneda inactiva o módulo inactivo |
| `MonedaDeCuentaConMovimientos` (Conflicto) | `moneda_de_cuenta_con_movimientos` | 409 | Cambiar la moneda de una cuenta con movimientos |
| `MonedaDeLaCuentaDistinta` (Regla) | `moneda_de_la_cuenta_distinta` | 422 | Orden de Bancos con otra moneda esperada |
| `MonedaDistintaEnLaContrasena`, `MonedaDistintaALaFactura`, `MonedasMezcladasEnElPago` (Regla) | sus claves | 422 | §7.3, §7.4 |
| `PosfechadoEnMonedaExtranjera`, `CombustibleEnMonedaExtranjera`, `EfectivoEnMonedaExtranjera` (Regla) | sus claves | 422 | PU-11, PU-13, PU-14 |
| `TipoDeCambioInvalido` (DatoInvalido) | `tipo_de_cambio_invalido` | 400 | Formato o rango del tipo acordado |
| `MonedaSinLetras` (Regla) | `moneda_sin_letras` | 422 | Imprimir un cheque de una moneda sin letras |
| `PartidaNoMonetaria` (error de programación) | — | 500 | Un módulo responde una partida no monetaria |

## 14. API

**Núcleo**
- `GET /api/monedas` (sesión) → `{ codigo, nombre, simbolo, decimales, activa, codigoBanguat, letrasSingular, letrasPlural }[]`.
- `PATCH /api/monedas/:codigo` (`configuracion.monedas.editar`) → `{ activa?, codigoBanguat?, letrasSingular?, letrasPlural? }`.
- `GET /api/tipos-de-cambio?moneda=&desde=&hasta=` (sesión; máximo 366 días) → serie vigente por día.
- `GET /api/tipos-de-cambio/vigente?moneda=&fecha=` (sesión) → `{ moneda, fecha, fechaDelTipo, referencia, compra,
  venta, origen, exacto, utilizable }` (`utilizable = false` si pasa de 7 días; no lanza: el formulario decide qué
  mostrar).
- `GET /api/tipos-de-cambio/:moneda/:fecha/versiones` (`configuracion.tipos-de-cambio.crear`).
- `POST /api/tipos-de-cambio` (`configuracion.tipos-de-cambio.crear`) → `{ moneda, fecha, referencia, compra?, venta?,
  motivo }` (201; corrige si ya había).
- `POST /api/tipos-de-cambio/cargar` (`configuracion.tipos-de-cambio.crear`) → `{ desde?, hasta? }` → la consulta hecha.
- `GET /api/tipos-de-cambio/consultas?limite=` (`configuracion.tipos-de-cambio.crear`) → bitácora y estado («última
  carga correcta», monedas sin el tipo de hoy).

**Multimoneda**
- `GET /api/multimoneda/tipos-de-cambio?moneda=&desde=&hasta=` (`.ver`) y `…/exportar` (`.exportar`).
- `GET /api/multimoneda/diferencial?mes=AAAA-MM&moneda=` (`multimoneda.diferencial.ver`) y `…/exportar`.
- `GET /api/multimoneda/por-revisar?desde=&hasta=` (`multimoneda.diferencial.ver`).

**Bancos, Libro de compras y Cuentas por pagar** (los recursos que ya existen; texto para tipo y montos):
- Cuentas bancarias: `moneda` al crear (y al editar sin movimientos); todo listado de cuentas la trae.
- Movimientos, notas, cheques, saldos iniciales: respuestas con `moneda`, `tipoDeCambio`, `montoEnQuetzales`,
  `fechaDelTipoDeCambio`; los cuerpos piden `confirmarTipoAnterior?`.
- Transferencias: `montoDestino` obligatorio si las monedas difieren; respuesta con `diferencialEnQuetzales`.
- Documentos de compra: cuerpo con `moneda` (los montos de las líneas, **en la moneda del documento**) y
  `confirmarTipoAnterior?`; respuesta con los montos fiscales en GTQ como hoy más `moneda`, `tipoDeCambio`,
  `fechaDelTipoDeCambio`, `totalEnMoneda` y, por línea, `totalEnMoneda`.
- El formulario del documento pide el tipo al `vigente` del núcleo; Libro de compras no necesita una ruta propia.
- Cuentas por pagar: documentos, contraseñas, pagos y reportes con `moneda` (y equivalentes); el cuerpo del pago suma
  `tipoDeCambio?` (solo si cruza monedas) y, por cargo, `monto` (en la moneda del cargo) o `montoEnQuetzales`.

## 15. Cliente

**Piezas comunes (core)**
- `almacenes/monedas.ts`: el catálogo (se pide una vez por sesión) y si el módulo está activo.
- `CampoDeMoneda.vue` (selector: GTQ y las disponibles; no aparece si el módulo está inactivo o la pantalla no lo
  admite).
- `TipoDeCambioDeLaOperacion.vue`: muestra «Tipo de cambio: Q 7.64489 (Banguat, dd/mm/aaaa)», el aviso de tipo anterior
  con su casilla de confirmación, y en las operaciones acordadas el campo editable con la referencia al lado y la
  diferencia en %.
- `formatearMonto(valor, moneda)` ya acepta la moneda: toda pantalla con montos extranjeros pasa el código (símbolo del
  catálogo). `formatearTipoDeCambio` (5 decimales por omisión) va a `utilidades/formato.ts`.
- Lógica pura `conversion-de-montos.ts` (con pruebas): `aQuetzales`, `aMoneda` y el reparto por mayor residuo, iguales
  a las del servidor, solo para mostrar (el servidor manda).

**Plataforma (soporte)**: páginas `PlataformaTiposDeCambio.vue` (calendario del mes por moneda, origen de cada día,
estado de la última carga, «Cargar ahora», «Ingresar o corregir» con motivo, versiones) y `PlataformaMonedas.vue`
(activar y completar).

**Multimoneda** (`cliente/src/modulos/multimoneda/`): menú Reportes → «Tipos de cambio», «Diferencial cambiario»,
«Operaciones por revisar». Sin Administración ni Operación en v1.

**Bancos**: campo Moneda en la cuenta (bloqueado con movimientos); símbolo en listas, ficha, conciliación y cheque;
`TipoDeCambioDeLaOperacion` en notas, cheques y saldo inicial de cuentas extranjeras; transferencia con «Sale» y «Entra»
cuando las monedas difieren, el tipo real deducido y el diferencial; reportes por moneda y Flujo de efectivo en GTQ con
la línea «Efecto de las variaciones en el tipo de cambio».

**Libro de compras**: Moneda en el formulario del documento (los montos se escriben en esa moneda), resumen con los
quetzales por línea y en total; ficha y lista con moneda y tipo; bandeja de DTE con la moneda.

**Cuentas por pagar**: moneda en listas, fichas, contraseñas y reportes; saldo inicial con Moneda; Nuevo pago filtra
cuentas y cargos por moneda, pide el tipo solo si cruza monedas y muestra el diferencial realizado estimado por cargo.

## 16. Excel (según la sección del menú)

| Recurso | Sección | Cambio |
|---|---|---|
| Cuentas bancarias | Administración (importa y exporta) | Columna «Moneda» (código; vacía = GTQ; otra solo con el módulo activo) |
| Saldos iniciales de Bancos | Administración | La moneda sale de la cuenta; la exportación muestra moneda, tipo y equivalente |
| Saldos iniciales de Cuentas por pagar | Administración | Columna «Moneda» (vacía = GTQ); montos en esa moneda |
| Reportes de Bancos, Cuentas por pagar y Libro | Reportes (imprimen y exportan) | Columnas «Moneda», «Tipo de cambio» y «Equivalente en quetzales» donde aplique; totales por moneda |
| Tipos de cambio y Diferencial cambiario | Reportes de Multimoneda | Imprimir y exportar; sin importar |
| Notas, transferencias, pagos | Operación | Sin Excel (como hoy) |

## 17. Convivencia y riesgos

- **Datos existentes:** todo queda en GTQ, tipo 1 y equivalente igual al monto; ninguna pantalla cambia para quien no
  activa el módulo. Las restricciones nuevas se cumplen con los rellenos (se prueba con una base con datos de las
  semillas `--demo` antes de unir).
- **Sumas que hoy mezclarían monedas:** el riesgo mayor. Por eso, en cada módulo, **los reportes se adaptan en un paso
  anterior** al que permite crear cosas en otra moneda (MM-B3 antes de MM-B4, MM-C4 antes de MM-C5). Una prueba por
  reporte con dos monedas.
- **Trabajos en curso:** Bancos segunda parte (BS-2 a BS-9, BS-R1/R2), impresión de cheques (IC), EM-2, CP4-10 a CP4-12 y
  CP5-5 a CP5-11 tocan las mismas tablas y pantallas. La fase A (núcleo y módulo) **no los toca y puede empezar ya**;
  Bancos, después de BS-9 e IC-2; Libro, cuando se quiera (no tiene trabajo abierto); Cuentas por pagar, después de
  CP4-12 y CP5-11. Los números de migración se toman al programar.
- **Rendimiento:** la tabla de tipos crece ≈ 365 filas por moneda y año; la búsqueda usa el índice `(moneda, fecha desc,
  registrado_en desc)` y la memoria del servicio. El cálculo del diferencial lee un mes por vez.
- **Seguridad:** la carga hace solicitudes salientes a un solo dominio fijo (variable de entorno), sin datos de clientes;
  respuesta acotada, sin entidades XML; nada de lo recibido llega al navegador sin validar. Revisión de `seguridad` en
  MM-3.
- **Lo que no cubre v1:** moneda funcional distinta de GTQ, ventas y cuentas por cobrar (no existen; seguirán el mismo
  patrón con el tipo fijo de la emisión del DTE), anticipos, posfechados extranjeros, efectivo en dólares, monedas con
  decimales distintos de 2, partidas contables.

## 18. Pasos (un commit cada uno; servidor y cliente por separado)

**Fase A — Núcleo y módulo (puede empezar ya)**

| Paso | Qué | Pruebas clave | Depende de |
|---|---|---|---|
| **MM-1** (servidor, datos del núcleo) | Migración `core/0024_multimoneda`: columnas de `core.monedas` y semilla, `core.tipos_de_cambio`, `core.consultas_al_banguat`, `politicasDeSoloAgregarEnLaInstalacion`; objeto de valor `TipoDeCambio` | `update` y `delete` rechazados por RLS; únicos y checks; conversiones y redondeo (0.01, mitades, montos máximos de `numeric(14,2)`, ida y vuelta) | — |
| **MM-2** (servidor, núcleo) | Contexto `core/monedas`: puertos, servicio `tiposDeCambio` (vigente, exacto, anterior, 7 días, futura), casos de uso y rutas de §14 (sin la carga), permisos `soloSuperacceso` | Vigente con versiones, con hueco, de 7 y de 8 días, GTQ; corregir crea versión; 403 sin superacceso | MM-1 |
| **MM-3** (servidor, carga del Banguat) | Cliente SOAP y extracción, validación, banda, variación, horario y reintentos, relleno de 45 días, candado, bitácora, `principal.ts`, variables de entorno, `POST …/cargar`. **Antes:** una llamada real de prueba para cerrar V-13 y anotar el resultado en este documento | Servidor falso local: éxito, sin datos, 500, demora, respuesta enorme, `<!DOCTYPE>`, valor fuera de banda, fin de semana, reintento; dos cargas a la vez | MM-2 |
| **MM-4** (cliente, Plataforma) — hecho | Páginas de tipos de cambio y monedas | Unitarias de la lógica; QA en el navegador | MM-3 |
| **MM-5** (servidor, módulo) | `npm run generar -- modulo multimoneda`; permisos, configuración, orden `monedas_disponibles`, reporte de tipos (ver y exportar) | Orden con módulo activo e inactivo; Excel del reporte | MM-2 |
| **MM-6** (cliente, módulo y piezas comunes) | Menú, reporte de tipos, `almacenes/monedas`, `CampoDeMoneda`, `TipoDeCambioDeLaOperacion`, `conversion-de-montos.ts` | Pruebas de la lógica pura | MM-5 |

**Fase B — Bancos (después de BS-9 e IC-2)**

| Paso | Qué | Depende de |
|---|---|---|
| **MM-B1** (servidor, datos) | Migración de §6.3 con rellenos y mensajes | MM-1 |
| **MM-B2** (servidor, reglas) | §7.2 puntos 1 a 7, órdenes con moneda, DTO y auditoría | MM-B1, MM-5 |
| **MM-B3** (servidor, reportes) | Saldos por cuenta, Flujo de efectivo (GTQ, línea de efecto del tipo, cuadre), Movimientos, por concepto, cheques caducos, intereses; Excel de cuentas con Moneda; monto en letras con moneda | MM-B2 |
| **MM-B4** (cliente) | §15 Bancos | MM-B3, MM-6 |
| **MM-B5** (servidor) | Respuestas de Bancos a las preguntas de §9.2 (fondo y conversiones; por revisar) | MM-B2, MM-D1 |

**Fase C — Libro de compras (cuando se quiera; antes de la fase D)**

| Paso | Qué | Depende de |
|---|---|---|
| **MM-L1** (servidor, datos) | Migración de §6.4 | MM-1 |
| **MM-L2** (servidor, reglas) | §7.3: conversión por línea, combustible, notas, bandeja con moneda (verificar con un archivo real, V-2), contrato `DocumentoParaDestino`, orden `regimen_en_la_fecha` | MM-L1, MM-5 |
| **MM-L3** (cliente) | §15 Libro de compras | MM-L2, MM-6 |

**Fase D — Cuentas por pagar (después de CP4-12, CP5-11 y la fase C)**

| Paso | Qué | Depende de |
|---|---|---|
| **MM-C1** (servidor, datos) | Migración de §6.5 (columnas, llaves con moneda, rellenos, mensajes) | MM-1 |
| **MM-C2** (servidor, documentos) | Recibir con moneda, saldos iniciales extranjeros (y Excel), contraseñas de una moneda, notas de la misma moneda, ajustes y reintegros | MM-C1, MM-L2 |
| **MM-C3** (servidor, pagos) | §7.4.5: misma moneda, cruzados en los dos sentidos, retención, bancarización, efectivo, apertura, reaplicar, eventos | MM-C2, MM-B2 |
| **MM-C4** (servidor, reportes) | R1 a R12 por moneda | MM-C3 |
| **MM-C5** (cliente) | §15 Cuentas por pagar | MM-C4, MM-B4 |
| **MM-C6** (servidor) | Respuestas a las preguntas de §9.2 (partidas, liquidaciones, por revisar) | MM-C3, MM-D1 |

**Fase E — Diferencial**

| Paso | Qué | Depende de |
|---|---|---|
| **MM-D1** (servidor) | `preguntarATodos` si falta; contrato; calculadora B y C en el dominio de `multimoneda` con pruebas exhaustivas (invariantes de §8.3, retención, nota, apertura, conversión, cruce de año); reporte, exportar y sugerencia fiscal por régimen; lista por revisar | MM-5 (los datos llegan con MM-B5 y MM-C6) |
| **MM-D2** (cliente) | Reportes «Diferencial cambiario» y «Operaciones por revisar» | MM-D1, MM-6 |
| **MM-QA** | `pruebas-qa`: cuenta en USD, factura en USD, pago en USD, pago cruzado en los dos sentidos, conversión, reporte del mes con método B y con C, Banguat apagado (tipo anterior y aviso) | Todo lo anterior |
| **MM-E** (con Contabilidad) | Cierre cambiario (§8.5), eventos, permisos `multimoneda.cierres.*` | PU-8 |

Paso de documentos aparte (sin código): corregir C-10 en Bancos si el usuario lo aprueba (PU-16) y anotar en `PLAN.md` y
`HOJA-DE-RUTA.md` lo que se decida.

## 19. Preguntas para el usuario

| # | Pregunta | Opciones | Recomendación |
|---|---|---|---|
| PU-1 | ¿El quetzal es la moneda de libros fija de todas las empresas? (contador, pregunta 1) | (a) Sí, sin moneda funcional distinta en v1; (b) cada empresa elige su moneda de libros | **(a)**: lo exige el Código de Comercio art. 369 y simplifica todo |
| PU-2 | ¿Dónde vive Multimoneda? | (a) Núcleo (monedas y tipos) + módulo activable `multimoneda`; (b) todo en el núcleo, siempre disponible; (c) todo en un módulo con su esquema | **(a)** (§3) |
| PU-3 | ¿Quién ingresa los tipos de cambio cuando el Banguat no responde? | (a) Solo soporte, para toda la instalación, más la carga automática; (b) también cada cuenta, con un permiso, en una tabla propia que reemplaza al oficial solo en su cuenta | **(a)**: el tipo de referencia es uno solo para todo el país; (b) permite tipos distintos al oficial en lo fiscal |
| PU-4 | ¿Qué monedas activamos además del USD, y se limita por empresa? (contador, pregunta 5) | (a) Solo USD activo; las demás se siembran inactivas y soporte las activa cuando un cliente las pida, sin lista por empresa; (b) USD y EUR activos; (c) lista de monedas por empresa | **(a)** |
| PU-5 | ¿El tipo de las facturas en moneda extranjera es siempre la referencia del Banguat de la fecha de emisión, sin editarlo? (contador, pregunta 3) | (a) Sí; (b) editable con permiso | **(a)**: así el libro cuadra con lo que la SAT trae precargado |
| PU-6 | ¿Cuándo se edita el tipo en pagos y conversiones? (contador, pregunta 4) | (a) Solo cuando hay conversión real: pagos cruzados y transferencias entre monedas; en pagos de la misma moneda, la referencia fija; (b) editable en todo pago y cobro | **(a)**: en un pago de dólares a una deuda en dólares no hay comprobante con otro tipo; editarlo solo movería el diferencial |
| PU-7 | Método del diferencial (contador, pregunta 2) | (a) B acumulativo por omisión, C con reversión como opción por empresa (la cambia soporte); (b) solo B | **(a)** |
| PU-8 | ¿Qué del diferencial va en v1? | (a) Solo el reporte calculado (detalle por partida, sin guardar ni partidas), y el cierre cambiario registrado con su evento cuando llegue Contabilidad; (b) también el cierre registrado ya, sin Contabilidad | **(a)**: sin Contabilidad, el cierre registrado no tiene quién lo use y obligaría a bloquear meses |
| PU-9 | ¿El sistema marca cada diferencial como deducible o no? (contador, pregunta 6) | (a) Sí, como sugerencia según el régimen de la empresa, con su fundamento y la leyenda «la decide su contador»; (b) solo la naturaleza (realizado, cuenta), sin sugerir; (c) nada | **(a)**: es lo que más trabajo ahorra al contador externo y no decide por él |
| PU-10 | ¿Qué pasa si falta el tipo del día? | (a) Usar el anterior hasta 7 días con aviso que se confirma, y la lista «por revisar»; después, bloquear hasta que soporte lo cargue; (b) bloquear siempre que falte el del día; (c) usar el anterior sin límite | **(a)** |
| PU-11 | ¿Cheques posfechados en cuentas en moneda extranjera? | (a) No en v1; (b) sí, con tipo provisional que una tarea corrige en su fecha | **(a)**: el tipo de su fecha aún no existe; (b) se puede agregar después |
| PU-12 | ¿Una contraseña y un pago llevan una sola moneda de cargos? | (a) Sí (dos contraseñas si el proveedor tiene facturas en dos monedas); (b) mezclar monedas | **(a)** |
| PU-13 | ¿Efectivo, reintegros y notas de crédito en v1? | (a) Efectivo solo en quetzales; reintegros y notas de crédito solo en la moneda de la factura y de la cuenta; (b) permitir cruces también ahí | **(a)** |
| PU-14 | ¿Combustible y notas sobre facturas del sistema anterior en moneda extranjera? | (a) Solo en quetzales en v1; (b) permitirlos | **(a)**: son casos raros y el IDP es en quetzales por galón |
| PU-15 | Si se desactiva Multimoneda con datos en otra moneda | (a) Lo existente sigue funcionando (pagar, conciliar, reportes); solo no se crean cuentas ni documentos nuevos en otra moneda; (b) impedir desactivarlo mientras haya datos | **(a)** |
| PU-16 | ¿Se corrige C-10 en el diseño y el dictamen de Bancos? (contador, pregunta 7) | (a) Sí, con una nota que remita a este dictamen; (b) no | **(a)** |

## 20. Por validar con `contador-guatemala` (antes de los pasos que lo usan)

| # | Qué | Paso |
|---|---|---|
| V-1 | Cotejar con el PDF oficial el art. 21 num. 28, el art. 23 lit. o) y lo que anuló la sentencia del expediente 293-2013 (pendiente del dictamen) | MM-D1 |
| V-2 | Conversión de un DTE en dólares: ¿la SAT convierte el total y el IVA por separado? Nuestro cálculo (IVA desde el total en GTQ, por línea) puede diferir un centavo. Ver con un archivo real qué columnas vienen en moneda original | MM-L2 |
| V-3 | Retenciones sobre documentos en dólares: el tipo de la emisión (certificación) para IVA e ISR a domiciliados; el de la fecha de pago solo para no domiciliados (hoy no se manejan) | MM-L2 |
| V-4 | Nota de crédito en dólares: su IVA al tipo de **su** emisión, y su aplicación a la factura como liquidación al tipo de la fecha de aplicación | MM-L2, MM-C2 |
| V-5 | Conversión de divisas con el banco: la pata en dólares al tipo de referencia del día y el diferencial contra lo que de verdad entró (en vez de contra el valor en libros): el total es igual, pero cambia cuánto es «realizado deducible» y cuánto «revaluación de bancos no deducible» | MM-B2 |
| V-6 | ¿Se acepta que el diferencial realizado se contabilice en la partida del cierre mensual y no el día del pago? | MM-E |
| V-7 | Saldos iniciales en dólares (bancos y por pagar): al tipo de la fecha de corte | MM-B2, MM-C2 |
| V-8 | Saldo a favor de una nota de crédito en dólares: partida monetaria (se revalúa) | MM-D1 |
| V-9 | Inverso de un movimiento en dólares: al mismo tipo del original | MM-B2 |
| V-10 | Monto en letras de cheques en dólares («MIL DÓLARES CON 25/100»), singular «UN DÓLAR» | MM-B3 |
| V-11 | ISR retenido por el banco sobre intereses de una cuenta en dólares: conversión y constancia | MM-B3 |
| V-12 | Libro de compras de la SAT: ¿pide la moneda o el total original? Bancarización de un pago en dólares: tipo de qué fecha | MM-L2, MM-C3 |
| V-13 | (Técnico, en MM-3) `TipoCambioRango` del USD: ¿`compra = venta = referencia`?; un fin de semana y un asueto; códigos y unidades de las otras monedas (¿quetzales por unidad?) | MM-3 |
|  | **Resuelto en parte (2026-11-18, llamada real):** en el rango el USD (moneda `2`) trae `compra = venta`, y coincide con la `referencia` de `TipoCambioDia` (7.64489 el 18/11/2026). El sábado 14 y el domingo 15 de noviembre traen el valor vigente del viernes (7.64312): **hay una fila por día calendario**. Un rango futuro responde `<Vars />` con `TotalItems` 0 (sin error). `TipoCambioDia` solo trajo el USD (`CambioDolar/VarDolar`). **Pendiente:** un asueto entre semana y los códigos y unidades de las otras monedas | MM-3 |
| V-14 | ¿El reporte mensual del diferencial (impreso o exportado) sirve como el «registro mensual» del art. 21 num. 28? | MM-D1 |

## Respuestas del usuario (2026-11-18)

Todas las recomendaciones: **PU-1** (a) quetzal fijo como moneda de libros; **PU-2** (a) monedas y tipos en el núcleo más
el módulo activable «multimoneda»; **PU-3** (a) solo soporte, para toda la instalación; **PU-4** (a) solo USD activo;
**PU-5** (a) referencia del Banguat de la emisión, fija; **PU-6** (a) editable solo con conversión real; **PU-7** (a) B
por omisión y C por empresa; **PU-8** (a) solo el reporte calculado en la versión 1; **PU-9** (a) sugerencia de
deducibilidad con la leyenda; **PU-10** (a) el anterior hasta 7 días con aviso y lista, luego bloqueo; **PU-11** a
**PU-15** (a); **PU-16** (a) corregir C-10 en el diseño y el dictamen de Bancos con una nota.

## Adenda 2026-11-18: todas las monedas del Banguat

_Agente `arquitecto-de-datos`. Decisión del usuario (2026-11-18), que **reemplaza PU-4 (a)** («solo USD activo»):
«soportemos todos los tipos de cambio que da el Banguat; guardar los ids de cada uno y un select en la ventana de monedas;
los que tengan ese dato en el select se van a actualizar el tipo de cambio cada noche con un cron». Base fiscal:
`dictamen-multimoneda-monedas-del-banguat-2026-11-18.md` (contador, mismo día; veredicto «correcto con ajustes», A-1 a
A-6 y D-1 a D-7). Lo que esta adenda no toca queda como está arriba. MM-1 y MM-2 aún no se programaron, así que los
cambios entran en su migración original (no hace falta una migración de corrección)._

### A.1 Qué cambia, en una tabla

| Antes (§4.3, §6.1, PU-4) | Ahora |
|---|---|
| Solo el USD tiene `codigo_banguat` (= 2, sembrado); las demás se siembran inactivas «si se acuerdan» | Se siembran inactivas y **sin código** las monedas ISO de la lista del Banguat (A.4). Soporte asigna el código con un **selector** en la ventana de Monedas, que se llena con `VariablesDisponibles` guardado en la tabla nueva `core.monedas_del_banguat` (A.3) |
| Se cargan «las activas con `codigo_banguat`» | Se carga **toda moneda con código** (lo dijo el usuario; D-1 en A.13). Activar sigue siendo aparte y solo para monedas de dos decimales |
| Una vuelta a las 06:00 con reintentos hasta las 20:00 | Tres vueltas al día en la hora de `core.regional.zona_horaria` (D-5): 06:00 el USD (con sus reintentos), 09:30 las demás y una vuelta de noche que adelanta el USD de mañana y repite las demás que faltaron. **Solo el USD reintenta** (A-4) |
| Banda 5 a 15 para el USD; 3 % de variación con aviso | USD igual. Las demás: sin banda; aviso con más de 3 %, **rechazo** con más de 25 % (protege de un cambio de unidad o de un código mal puesto) y aviso por el cruce implícito contra el USD (A-5) |
| Referencia del rango = `compra` = `venta` del USD (comprobado en MM-3a) | Para toda moneda: `compra = venta` → esa es la referencia; si difieren, `valor_ambiguo` y no se guarda (A-6, D-3) |
| Regla de 7 días igual para todas | Además, para las demás monedas, un «día sin cálculo» (fin de semana o asueto) usa el último publicado **sin pedir confirmación** (D-4) |

### A.2 Lo que ya hizo MM-3a y qué hay que cambiarle

MM-3a (rama `worktree-wf_af6cd921-5c2-3`, commit `9c022cbe`, revisada y lista para integrar) programó en `core/monedas`,
sin base de datos: el puerto `FuenteDeTiposDeCambio` (`tipoDelDia`, `tiposDelRango`), `ClienteBanguat` (SOAP 1.1 con
`fetch`, HTTPS, 10 s, 256 KB, sin redirecciones, sin analizador XML), la extracción (`extractor-de-respuestas.ts`), la
validación (`reglas-de-publicacion.ts`: fecha, formato `^\d{1,6}(\.\d{1,8})?$`, banda del USD, variación de 3 %),
`FuenteConReintentos`, el rango de relleno de 45 días (`huecos-de-publicacion.ts`) y el doble en memoria. Una llamada real
cerró parte de V-13: el rango del USD trae una fila **por día calendario** (el fin de semana repite el viernes) y
`compra = venta = referencia`.

**Recomendación: integrar MM-3a tal como está** (ya revisada) y hacer los cambios en un paso nuevo, MM-3a′, encima. Lo
que cambia MM-3a′:

| Pieza de MM-3a | Hoy | Cambio |
|---|---|---|
| `MONEDAS_POR_CODIGO_BANGUAT` (extractor) | Mapa fijo `2 → USD` | Se quita. Las operaciones reciben las monedas a pedir como argumento (`{ moneda: 'EUR', codigoBanguat: 28 }[]`), que salen de `core.monedas` en MM-3b. Un código que llega sin haberse pedido se ignora |
| Puerto `FuenteDeTiposDeCambio` | `tipoDelDia`, `tiposDelRango` (solo USD) | Suma `tiposDeLaMoneda({ hoy, desde, hasta, moneda, codigoBanguat })` (`TipoCambioRangoMoneda`) y `monedasDisponibles()` (`VariablesDisponibles` → `{ codigo, descripcion }[]`). `tipoDelDia` lee también `CambioDia/Var` si viene, solo de las monedas pedidas |
| `PublicacionDeTipoDeCambio` | `moneda`, `fecha`, `referencia` | Suma `codigoBanguat`, `compra` y `venta` (texto; se guardan en `core.tipos_de_cambio`) |
| Rechazo `sin_referencia` | Escribe `moneda: 'USD'` fijo | Se renombra `valor_ambiguo` (dictamen A-6) y lleva la moneda real de la fila |
| `referenciaEscalada` | Solo `^\d{1,6}(\.\d{1,8})?$` | Acepta también notación científica y más de 8 decimales: `^\d{1,6}(\.\d{1,20})?([eE][-+]?\d{1,2})?$`, texto de hasta 32 caracteres, convertido **sin pasar por `number`** (mantisa y exponente a `bigint`) y redondeado desde la mitad a 8 decimales. Si queda en 0 o pasa de `99999999.99999999`, `dato_invalido` |
| Reglas por moneda | `BANDAS_DE_CORDURA` solo USD | Igual para el USD. Constante nueva `VARIACION_PARA_RECHAZAR_EN_PORCIENTO = 25` para las demás (A.7) y función `cruceImplicito(valor, referenciaUsd)` para el aviso |
| `fechasSinPublicacion` | Cuenta todo día calendario | Recibe qué días se esperan: todos para el USD; para las demás, los hábiles (lunes a viernes sin los asuetos de `calendarioLaboral`) mientras C-2 no diga otra cosa |
| Grabaciones de prueba | USD del día y del rango | Suman `VariablesDisponibles`, `TipoCambioRangoMoneda` del EUR con fin de semana, un valor en notación científica, `compra ≠ venta` y un código no pedido |

Las **comprobaciones reales** del dictamen (C-1 a C-4, A.12) se hacen al empezar MM-3a′ y su resultado se anota en esta
adenda. C-1 da la lista definitiva de códigos y fija `CODIGOS_DEL_BANGUAT_EXCLUIDOS` (A.3).

### A.3 De dónde sale la lista del selector

| Opción | Cómo | A favor | En contra |
|---|---|---|---|
| A. Consultar al abrir la ventana | El servidor llama a `VariablesDisponibles` cada vez | Siempre al día | Lento; el servicio corta conexiones (le pasó al contador); sin el Banguat no se puede ni ver la lista; no permite llave foránea |
| B. Caché en memoria | La primera llamada se guarda unas horas | Rápido | Se pierde al reiniciar; con dos instancias, dos copias; tampoco permite llave |
| **C. Tabla `core.monedas_del_banguat`** | La llena la tarea (una vez por semana, y al arrancar si está vacía o vieja) y un botón «Actualizar lista» | Funciona sin el Banguat; `core.monedas.codigo_banguat` lleva **llave foránea** (no se puede guardar un código que el Banguat nunca dio); queda la historia de lo que ofreció | Una tabla más (pequeña: unas 30 filas) |

**Recomendada: C.**

**`core.monedas_del_banguat` (nueva).** Catálogo de toda la instalación, sin RLS (como `core.monedas`) y sin autoría (la
escribe la tarea, sin usuario).

| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `codigo` | `smallint` PK | no | El `moneda:int` del Banguat. `check (codigo > 0)` |
| `descripcion` | `text` | no | Tal como llega, sin espacios en los extremos y recortada a 120. `check (char_length(descripcion) between 1 and 120)` |
| `disponible` | `boolean` | no, `default true` | `false` si dejó de venir en `VariablesDisponibles`. La fila **no se borra**: la puede usar una moneda y tiene historia |
| `vista_por_primera_vez` | `timestamptz` | no, `default now()` | |
| `vista_por_ultima_vez` | `timestamptz` | no, `default now()` | Última actualización en que vino |

- Sin índices extra: la llave desde `core.monedas` apunta a la PK, y del otro lado la cubre su índice único.
- **Semilla:** solo `(2, 'Dólares de EE.UU.')` (el USD ya comprobado en MM-3a), para que el USD nazca con su código. La
  primera actualización corrige la descripción.
- **Actualización** (`ActualizarMonedasDelBanguat`): `insert … on conflict (codigo) do update set descripcion,
  disponible = true, vista_por_ultima_vez`, y luego `disponible = false` a las que no vinieron. Si la respuesta viene vacía
  o con error, **no toca nada** (un Banguat caído no deja la lista «no disponible»). Cada actualización deja su fila en la
  bitácora (`operacion = 'VariablesDisponibles'`, `vuelta = 'lista'`).
- **Cuándo:** al arrancar, si la tabla solo tiene la semilla o la última vista pasa de 7 días; los lunes, en la vuelta de
  las 09:30; y con «Actualizar lista» (soporte).
- **Qué ofrece el selector:** las `disponible`, menos las de `CODIGOS_DEL_BANGUAT_EXCLUIDOS` (constante del dominio que se
  llena con C-1 según D-2: DEG, los bolívares retirados y el colón salvadoreño), y las asignadas a otra moneda se muestran
  deshabilitadas («Euro (28), ya es de EUR»). Si una moneda ya tiene un código que luego quedó excluido o no disponible,
  se sigue mostrando, marcado.

### A.4 `core.monedas` (cambia lo dicho en §6.1)

| Columna | Tipo | Nulo | Cambio |
|---|---|---|---|
| `activa` | `boolean` | no | **`default false`** (antes `true`): con unas 25 monedas sembradas, lo seguro es que nazcan apagadas. La migración pone `true` a GTQ y USD |
| `codigo_banguat` | `smallint` | sí | Ahora con **llave foránea** a `core.monedas_del_banguat(codigo)`, `on delete restrict`; sigue `unique` (el índice único sirve a la llave) |
| `letras_singular`, `letras_plural` | `text` | sí | Sin cambio |

Restricción nueva: `monedas_gtq_sin_codigo check (codigo <> 'GTQ' or codigo_banguat is null)`. Las de §6.1 siguen:
`monedas_activa_con_dos_decimales` impide activar JPY o KRW en v1 (D-6), pero **sí** pueden tener código, y su serie se
carga (A.6).

**Código estable (A-2).** `core.tipos_de_cambio` guarda también el código con que se cargó cada fila (A.5). Regla: una
moneda con filas `banguat` solo puede quedar con **ese mismo código o sin código**; otro mezclaría dos series. Se hace
cumplir en dos lugares:
- Dominio (`EditarMoneda`): `CodigoDelBanguatConOtraSerie` (Conflicto, 409, `detalles: { moneda, codigoDeLaSerie }`).
- Base: disparador `core.monedas_codigo_banguat_estable` (`before update of codigo_banguat`): si `new.codigo_banguat is not
  null` y existe una fila de `core.tipos_de_cambio` con `moneda = new.codigo`, `origen = 'banguat'` y `codigo_banguat <>
  new.codigo_banguat`, `raise exception` con su `errcode` propio. Usa `tipos_de_cambio_vigente_idx` (empieza por `moneda`).
  Si un día se comprueba que un código estaba mal, el arreglo es un procedimiento de soporte documentado, no una
  pantalla: las filas no se borran.

**Semilla de MM-1** (todas con `activa = false`, `codigo_banguat = null` y sin letras; nombres y decimales de ISO 4217).
Son las monedas de la lista pública del Banguat (dictamen §1) menos DEG, bolívares y colón salvadoreño (D-2 b). Así el
selector solo **une**, y en v1 no hace falta crear monedas desde la pantalla (si el Banguat agrega una, va en una
migración de datos). Símbolos que no se confunden con `US$` ni con `Q`:

| Código | Nombre | Símbolo | Decimales |
|---|---|---|---|
| EUR | Euro | € | 2 |
| GBP | Libra esterlina | £ | 2 |
| CHF | Franco suizo | CHF | 2 |
| CAD | Dólar canadiense | CA$ | 2 |
| MXN | Peso mexicano | MX$ | 2 |
| JPY | Yen japonés | JP¥ | 0 |
| HNL | Lempira | L | 2 |
| NIO | Córdoba | C$ | 2 |
| CRC | Colón costarricense | ₡ | 2 |
| DKK, NOK, SEK | Corona danesa, noruega y sueca | DKK, NOK, SEK | 2 |
| ARS | Peso argentino | AR$ | 2 |
| BRL | Real brasileño | R$ | 2 |
| KRW | Won surcoreano | ₩ | 0 |
| HKD | Dólar de Hong Kong | HK$ | 2 |
| TWD | Nuevo dólar taiwanés | NT$ | 2 |
| CNY | Yuan renminbi | CN¥ | 2 |
| PKR, INR | Rupia pakistaní e india | PKR, ₹ | 2 |
| COP | Peso colombiano | COL$ | 2 |
| DOP | Peso dominicano | RD$ | 2 |
| MYR | Ringgit malayo | RM | 2 |

Si C-1 trae una moneda que no está aquí (por ejemplo AUD, que aparece en la tabla 158-2023), se agrega a la semilla
antes de programar MM-1 (si MM-1 ya salió, en una migración de datos aparte).

### A.5 `core.tipos_de_cambio` y `core.consultas_al_banguat` (cambian lo dicho en §6.1)

**`core.tipos_de_cambio`**: una columna y una restricción más.

| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `codigo_banguat` | `smallint` | sí | El código con que se pidió la fila; FK `core.monedas_del_banguat(codigo)`. `tipos_de_cambio_banguat_con_codigo check (origen <> 'banguat' or codigo_banguat is not null)`; nulo en las `manual` |

Índice de la llave: `tipos_de_cambio_codigo_banguat_idx (codigo_banguat)`. `referencia`, `compra` y `venta` siguen en
`numeric(16,8)`: con 8 decimales, el yen (unos 0.05) conserva 6 a 7 cifras significativas, las mismas que da el
`xs:float` del servicio. Siempre **quetzales por una unidad**; si C-3 encuentra una moneda publicada por cada 100, la
carga divide con una constante del dominio por código (sin columna nueva).

**`core.consultas_al_banguat`**: ahora una fila por **llamada** (por moneda en las de rango), no por vuelta.

| Columna | Cambio |
|---|---|
| `operacion` | Admite además `TipoCambioRangoMoneda`, `TipoCambioFechaInicialMoneda` y `VariablesDisponibles` (check) |
| `vuelta` (nueva) | `text not null`, check en `madrugada`, `manana`, `noche`, `arranque`, `relleno`, `manual`, `lista`, `muestra` |
| `moneda` (nueva) | `char(3)` nula, FK `core.monedas(codigo)`; nula en `VariablesDisponibles` y en `TipoCambioDia` (puede traer varias) |
| `codigo_banguat` (nueva) | `smallint` nula, sin llave (una muestra puede ser de un código que luego sale de la lista) |
| `resultado` | Admite además `valor_ambiguo` y `variacion_excesiva` (check) |
| `filas_rechazadas` (nueva) | `smallint not null default 0` |

Índice nuevo `consultas_al_banguat_moneda_idx (moneda, iniciada_en desc)`: sirve a la llave y al estado «última carga
por moneda». Volumen: unas 25 monedas × 2 a 3 llamadas al día ≈ 25,000 filas al año. Sigue sin depurarse (no es
auditoría; si un día pesa, se decide una retención).

### A.6 Qué se carga y cuándo

**Qué monedas.** Toda moneda de `core.monedas` con `codigo_banguat`, activa o no (decisión del usuario). Diferencia con el
dictamen (A-3, D-1 a), que pide solo las activas. Mi lectura: la regla de los dos decimales es para **usar** la moneda
(activarla), no para guardar su serie; cargar una inactiva no la ofrece a nadie y deja ver su serie (unidad, huecos)
**antes** de activarla. El costo son unas 2 llamadas al día por moneda. Si el usuario prefiere (a), es un filtro (`and
activa`) en una sola consulta del repositorio: no cambia tablas.

**Horario**, en la hora de `core.regional.zona_horaria` leída en el nivel **instalación** (la tarea no tiene empresa). Un
temporizador cada 15 minutos en `principal.ts` llama a `CargarTiposDeCambio.siTocaAhora()`; qué toca lo decide una
función pura del dominio (`vueltaQueToca(ahora, zona, ultimasConsultas)`), con pruebas de reloj fijo.

| Vuelta | Hora | Qué pide | Reintentos |
|---|---|---|---|
| `madrugada` | 06:00 | USD: `TipoCambioDia` | Si falta el USD de hoy: 06:30, 07:00, 08:00, 09:30, 11:00, 13:00, 16:00 y 20:00 (como §4.3) |
| `manana` | 09:30 | Cada otra moneda con código: `TipoCambioRangoMoneda(hoy − 6, hoy)` (trae hoy y rellena la semana) | **Ninguno**. Si no está el de hoy, la bitácora dice `sin_datos` |
| `noche` | 21:00 (C-4 puede moverla) | USD: `TipoCambioRango(hoy, mañana)` (adelanta el de mañana, ya publicado); y, una vez, las otras monedas a las que les falte el de hoy | Ninguno |
| `arranque` y `relleno` | Al arrancar y una vez al día (en la vuelta `manana`) | Por moneda, **solo si tiene huecos** en los últimos 45 días: el USD contra días calendario y las demás contra días hábiles (A.2). Una llamada de rango por moneda | Ninguno |

- **Moneda recién asignada:** al guardar el código, después del `commit`, se pide en segundo plano su relleno de 45 días
  (`vuelta = 'relleno'`). El historial más viejo, con «Cargar ahora» por rango (máximo 366 días, §4.4).
- **Ritmo:** las llamadas van **una tras otra**, con 1 s entre monedas; cada una con `FuenteConReintentos` (2 y 5 s) solo
  ante `FuenteNoDisponible`. Con 25 monedas, una vuelta dura menos de un minuto si el Banguat responde.
- **Candado:** la vuelta completa toma `pg_try_advisory_lock` con una clave fija propia en una conexión dedicada, como
  `cerrojo-de-depuracion.drizzle.ts`. Otra instancia no hace nada; un «Cargar ahora» simultáneo responde 409
  `CargaDelBanguatEnCurso`. El índice único parcial `(moneda, fecha) where origen = 'banguat'` impide duplicados aunque el
  candado fallara (`on conflict do nothing`).
- **Aviso de moneda sin publicar (A-4):** el estado de `GET /api/tipos-de-cambio/consultas` marca toda moneda con código
  cuya última fecha cargada tenga más de **3 días hábiles** de atraso (constante del dominio); para el USD, más de 1 día.

### A.7 Qué valor se guarda por moneda

| Caso | Se guarda | Resultado en la bitácora |
|---|---|---|
| USD del día (`VarDolar.referencia`) | `referencia`; `compra` y `venta` nulas | `exito` |
| Cualquier moneda en un rango con `compra = venta` (comparadas ya normalizadas a 8 decimales) | `referencia = compra = venta` | `exito` |
| `compra ≠ venta` | **Nada** (D-3 a); soporte puede ingresarlo a mano con motivo | `valor_ambiguo` |
| USD fuera de 5 a 15 | Nada | `valor_fuera_de_rango` |
| Otra moneda que cambia más de 25 % contra su último valor de los 7 días anteriores | Nada; aviso en el panel | `variacion_excesiva` |
| Otra moneda que cambia entre 3 % y 25 %, o cuyo cruce implícito (valor ÷ referencia del USD del mismo día) cambia más de 3 % | Se guarda; el panel lo muestra con aviso (se calcula al leer, sin columna) | `exito` |
| Primera carga de una moneda (sin valor anterior) | Se guarda | `exito` |

`fecha` es siempre el día en que rige (§4.1): para el USD, la que trae el servicio; para las demás, el día de su cálculo
(dictamen §1, vigencia), que es la fecha que trae la fila.

### A.8 Uso del tipo: `tiposDeCambio.vigente` (cambia MM-2)

`TipoVigente` suma `motivoDelAnterior: 'dia_sin_calculo' | 'falta_publicacion' | null`:
- **USD:** como §4.1 (todo anterior es `falta_publicacion`: aviso, confirmación y lista «por revisar»).
- **Otras monedas (D-4 b):** si la fecha pedida es sábado, domingo o asueto de `calendarioLaboral` y el tipo usado es del
  último día hábil anterior, `dia_sin_calculo`: se usa **sin pedir confirmación** y no entra en «por revisar» (sí guarda
  `fecha_del_tipo_de_cambio`). Si es un día hábil sin publicación (también **hoy antes de las 09:30**),
  `falta_publicacion`, con la regla de §4.1. El tope de 7 días sigue para todas.
- Si C-2 muestra que el Banguat publica todos los días también las demás monedas, `dia_sin_calculo` no se da nunca y todo
  queda como el USD, sin cambiar el contrato.

### A.9 API, permisos, errores, auditoría y Excel

**API del núcleo (cambia §14):**
- `GET /api/monedas` suma `descripcionBanguat` (de A.3) y `tieneSerieDelBanguat` (la pantalla bloquea cambiar el código).
- `PATCH /api/monedas/:codigo` igual (`codigoBanguat: number | null`), con los errores de abajo.
- `GET /api/monedas/banguat` (`configuracion.monedas.editar`) → `{ codigo, descripcion, disponible, excluida, asignadaA,
  vistaPorUltimaVez }[]`: lo que llena el selector.
- `POST /api/monedas/banguat/actualizar` (`configuracion.monedas.editar`) → corre la actualización de A.3 y devuelve
  `{ consulta, lista }` (la consulta hecha y la lista) (409 `CargaDelBanguatEnCurso` si hay una vuelta en curso).
- `GET /api/monedas/banguat/:codigo/muestra` (`configuracion.monedas.editar`) → los valores de los últimos 7 días de ese
  código (`TipoCambioRangoMoneda`) **sin guardarlos** (la consulta queda con `vuelta = 'muestra'`). Sirve para que
  soporte vea «8.81 Q por unidad» antes de unir «Euro» con EUR (riesgo «código mal asignado»). Límite de 10 por minuto por
  usuario (429), porque sale a un servicio externo.

**Permisos:** ninguno nuevo; todo lo anterior usa `configuracion.monedas.editar` (`soloSuperacceso`). Leer monedas sigue
siendo solo de sesión.

**Errores nuevos:**

| Clase (familia) | Código | HTTP | Cuándo |
|---|---|---|---|
| `CodigoDelBanguatConOtraSerie` (Conflicto) | `codigo_del_banguat_con_otra_serie` | 409 | A.4 |
| `CodigoDelBanguatEnUso` (Conflicto) | `codigo_del_banguat_en_uso` | 409 | Otra moneda ya lo tiene; `detalles: { moneda }` |
| `CodigoDelBanguatNoOfrecido` (Regla) | `codigo_del_banguat_no_ofrecido` | 422 | No está en la lista, no está disponible o está excluido (salvo que ya fuera el de esa moneda) |
| `CodigoDelBanguatEnGtq` (Regla) | `codigo_del_banguat_en_gtq` | 422 | Ponerle código al quetzal |
| `CargaDelBanguatEnCurso` (Conflicto) | `carga_del_banguat_en_curso` | 409 | «Cargar ahora» o «Actualizar lista» con el candado tomado |

**Auditoría.** Como los asuetos (`QuitarAsueto`, precedente del core): `EditarMoneda` llama a `auditoria.registrar` dentro
de su unidad de trabajo con `recurso: 'core.monedas'`, `registroId` el código y `anterior` la moneda como estaba:
`inactivar` o `reactivar` al cambiar `activa`, y `corregir` al **quitar o cambiar** `codigo_banguat` (la moneda deja de
cargarse: es lo más parecido a inactivar la carga). Asignar un código por primera vez no se audita (no quita nada).
`core.monedas_del_banguat` no se audita: es copia de lo que dice el Banguat y nunca se borra (queda `disponible = false`).
`core.tipos_de_cambio` y la bitácora siguen siendo su propio rastro (§6.1).

**Excel:** sin cambios. La ventana de Monedas es de Soporte/Plataforma (no es Administración de una empresa): no importa
ni exporta. El reporte «Tipos de cambio» de Multimoneda (Reportes: imprime y exporta) ya filtra por moneda; ahora su
selector ofrece toda moneda con serie, activa o no.

### A.10 Pantalla de Monedas (cambia MM-4)

`PlataformaMonedas.vue` (la página solo arma) con `usarMonedasDePlataforma` y la lógica pura `edicion-de-moneda.ts` (con
pruebas):
- Lista: código, nombre, símbolo, decimales, **activa**, **moneda del Banguat** («Euro (28)» o «—»), última fecha cargada y
  aviso de atraso (A.6). Filtros «Con código» y «Activas».
- Ventana de edición (`v-model`; emite `guardar` y `cerrar`): interruptor **Activa** (deshabilitado si los decimales no
  son 2, con el porqué); **selector «Moneda del Banguat»** con las opciones de `GET /api/monedas/banguat` (descripción y
  código; las de otra moneda, deshabilitadas con el nombre de su dueña; opción «Sin código: no se carga») y botón «Ver
  muestra», que trae los 7 días antes de guardar. Con `tieneSerieDelBanguat`, el selector solo deja el mismo código o
  quitarlo, con el texto «Ya tiene tipos cargados con este código». Letras singular y plural.
- Botón «Actualizar lista del Banguat» con la fecha de la última actualización.
- Quitar el código o desactivar piden confirmación con `usarAvisos().confirmar`.
- `PlataformaTiposDeCambio.vue` (MM-4, como estaba) suma la vuelta y la moneda en la bitácora, y los avisos de A.7.

### A.11 Convivencia y riesgos (suma a §17)

- **MM-3a sin integrar todavía:** si se integra antes de MM-3a′, nada se rompe (solo carga el USD). Rehacerla en su rama
  perdería su revisión: no lo recomiendo.
- **Orden del core:** sigue EM-2 → correo → MM-1; el número de la migración se toma al programar (no tiene por qué ser
  `0024`).
- **Fuente no oficial:** el servicio web «no es un servicio oficial» (dictamen §1). Por eso el ingreso manual de soporte
  sigue siendo la vía para corregir, y la leyenda «Fuente: Banco de Guatemala» va en toda pantalla y reporte.
- **Carga al Banguat:** de 50 a 75 llamadas al día con 25 monedas, en serie: aceptable. Si C-1 a C-4 muestran cortes
  frecuentes, se sube la pausa entre monedas (constante).
- **Seguridad:** las salidas nuevas (`VariablesDisponibles`, la muestra) usan el mismo `ClienteBanguat` (URL fija, topes y
  extracción sin entidades). Las descripciones del Banguat llegan al navegador: se recortan, se guardan como texto y Vue
  las escapa. La muestra tiene su límite por minuto. Revisión de `seguridad` en MM-3a′ y MM-3b.

### A.12 Comprobaciones con llamadas reales (amplían V-13; al empezar MM-3a′)

| # | Qué | Decide |
|---|---|---|
| C-1 | `VariablesDisponibles` completa: códigos y descripciones | La semilla de A.4 y `CODIGOS_DEL_BANGUAT_EXCLUIDOS` |
| C-2 | `TipoCambioRangoMoneda` del EUR y del JPY en una semana con fin de semana y un asueto: unidad, `compra = venta`, decimales, huecos, notación científica | A.2 (días esperados), A.7 y A.8 |
| C-3 | ¿Alguna moneda publicada por cada 100 unidades? | La constante de división de A.5 |
| C-4 | Desde qué hora de la noche `TipoCambioDia` o `TipoCambioRango` ya dan el USD de mañana | La hora de la vuelta `noche` |
| C-5 | Un DTE real en EUR y lo que la SAT precarga (contador, V-2) | MM-L2; no bloquea la fase A |

**Resultado (2026-11-18, al programar MM-3b): C-1 a C-4 sin hacer.** Desde el entorno del agente la conexión TCP a
`www.banguat.gob.gt:443` abre, pero el saludo TLS no recibe respuesta (probado con `curl`, TLS 1.2 y 1.3, las dos IP, hasta
60 s), así que no hubo ninguna llamada válida. Nada contradice la adenda; solo no está confirmada. Quedan con lo supuesto:
`CODIGOS_DEL_BANGUAT_EXCLUIDOS` vacío (C-1), días esperados de las demás monedas = hábiles (C-2), unidad por una moneda
(C-3) y la vuelta de noche a las 21:00 (C-4, constante `HORA_DE_LA_NOCHE`). Hay que repetirlas desde otra red antes de
activar la carga en producción.

### A.13 Decisiones pendientes del usuario (del dictamen, con la posición del arquitecto)

| # | Pregunta | Contador | Arquitecto | Qué se asumió aquí |
|---|---|---|---|---|
| D-1 | ¿Cargar todas las monedas con código o solo las activas con código? | Solo las activas | **Todas con código**, como pidió el usuario (A.6) | Todas con código |
| D-2 | ¿Qué entra en el selector? | Todas menos DEG, bolívares y colón salvadoreño | Igual | (b) |
| D-3 | Si `compra ≠ venta` | No cargar automático | Igual | (a) |
| D-4 | Documento en otra moneda de un día sin cálculo | Último publicado sin confirmar; aviso solo si faltó una publicación esperada | Igual | (b) |
| D-5 | ¿Solo de noche? | 06:00 el USD, 09:30 las demás y una vuelta de noche | Igual: con solo la de noche, todo documento de la mañana en otra moneda sale con aviso | (b) |
| D-6 | ¿Cero decimales (JPY, KRW) en v1? | No se activan | Igual (su serie sí se carga) | (a) |
| D-7 | ¿Consultar a la SAT por los DTE en EUR? | Sí, si un cliente real factura en EUR | Igual | Pendiente; no bloquea |

### A.14 Pasos (reemplazan las filas MM-1 a MM-4 de §18; un commit cada uno)

| Paso | Qué | Pruebas clave | Depende de |
|---|---|---|---|
| **MM-1** (servidor, datos del núcleo) | Lo de §6.1 más: `core.monedas_del_banguat` y su semilla; `core.monedas` con `activa default false`, la llave y el check del GTQ, y la semilla de A.4; disparador `monedas_codigo_banguat_estable`; `codigo_banguat` en `core.tipos_de_cambio`; columnas, checks e índice nuevos de `core.consultas_al_banguat`; `TipoDeCambio` | Las de §18 más: la llave rechaza un código inexistente; dos monedas con el mismo código; GTQ con código; activar JPY falla; el disparador rechaza cambiar el código con filas `banguat` y deja quitarlo o dejar el mismo; una fila `banguat` sin código falla | C-1 (para la semilla) |
| **MM-2** (servidor, núcleo) | Lo de §18 más: `EditarMoneda` con las reglas de A.4 y A.9 y su auditoría; `tiposDeCambio.vigente` con `motivoDelAnterior` (A.8); `GET /api/monedas/banguat` | Código ofrecido, en uso, excluido, con otra serie (en el dominio y en el disparador) y en GTQ; auditoría de inactivar, reactivar y quitar el código; vigente del EUR un sábado (`dia_sin_calculo`), un martes sin publicación (`falta_publicacion`), y del USD un domingo | MM-1 |
| **MM-3a′** (servidor, sin base) | Comprobaciones C-1 a C-4 (se anotan aquí) y los cambios de A.2 al cliente, al extractor y a las reglas | Notación científica (`5.1E-05` → `0.00005100`); más de 8 decimales, con redondeo; `compra ≠ venta` → `valor_ambiguo` con su moneda; código no pedido, ignorado; `VariablesDisponibles` con y sin filas; `<!DOCTYPE>` en las operaciones nuevas; días esperados del USD y de las demás | MM-3a integrada |
| **MM-3b** (servidor, carga) | Lo que MM-3a dejó para después, para todas las monedas: bitácora por llamada, candado, `vueltaQueToca` y temporizador de 15 min, vueltas de A.6, relleno contra lo guardado, rechazos y avisos de A.7, actualización de la lista (A.3), relleno al asignar un código, `principal.ts`, variables de entorno, `POST …/cargar`, `POST /api/monedas/banguat/actualizar` y `GET …/muestra` con su límite | Con reloj fijo: cada vuelta a su hora en `America/Guatemala` y con otra zona; el USD reintenta y las demás no; una moneda sin publicación el sábado no reintenta ni avisa; 4 días hábiles de atraso avisan; 30 % de variación no se guarda; el relleno solo pide con huecos; dos vueltas a la vez (la segunda no hace nada; la manual da 409); lista vacía o con error no marca nada «no disponible»; una moneda que desaparece queda `disponible = false` | MM-2, MM-3a′ |
| **MM-4** (cliente, Plataforma) — hecho | `PlataformaTiposDeCambio.vue` (como estaba, más A.10) y `PlataformaMonedas.vue` con el selector, la muestra y «Actualizar lista» | Unitarias de `edicion-de-moneda.ts` (qué opciones se habilitan, bloqueo con serie, activa con decimales ≠ 2); QA en el navegador con el servidor falso del Banguat | MM-3b |

**MM-4 hecho (2026-11-18)**: servidor (`GET /api/tipos-de-cambio/consultas`, `GET /api/monedas/banguat/:codigo/muestra?moneda=` con 10 por minuto, relleno al activar con código, `POST /api/monedas/banguat/actualizar` → `{ consulta, lista }`) y las dos páginas de Plataforma. Falta el QA en el navegador, el aviso de cruce implícito de A.7 y mover «Cargar ahora» fuera de la solicitud HTTP.

MM-5 y los siguientes no cambian.

### Respuestas del usuario a la adenda (2026-11-18)

- **D-1:** se actualizan **solo las monedas activas que tengan código** del Banguat (lo del contador).
- **D-5:** **tres vueltas** en hora de Guatemala: 06:00 el dólar, 09:30 las demás monedas y una vuelta de noche que adelanta
  el dólar de mañana.
- **D-2:** el selector ofrece todas las monedas de `VariablesDisponibles` **menos** el DEG, los tres bolívares retirados y
  el colón salvadoreño.
- **D-3, D-4, D-6 y comprobaciones:** con compra ≠ venta no se carga sola (solo a mano); en días sin cálculo del Banguat se
  usa el último publicado sin pedir confirmación (aviso solo si faltó una publicación esperada); las monedas sin decimales
  tienen código pero no se activan en v1; antes de MM-3b se hacen las llamadas reales C-1 a C-4 al Banguat.

## Adenda B (2026-11-18): resultado de C-1 a C-4

_Agente `arquitecto-de-datos`. Aquí va el resultado de las llamadas reales C-1 a C-4 (hechas al empezar MM-3a′), una
segunda muestra de 15 llamadas (B.2) y el rediseño de lo que esas llamadas desmienten. La carga automática sigue
**apagada por omisión** (`CARGAR_TIPOS_DE_CAMBIO`, commit `6a49e8cb` de la rama `worktree-wf_c1facbe4-e32-7`) hasta
terminar los pasos de B.12. Lo que esta adenda no toca queda como está en la adenda A. Base: lo programado en `main`
(MM-1, MM-2, MM-3a, MM-3a′ y la migración core `0029_multimoneda`) y en la rama `worktree-wf_c1facbe4-e32-7` (MM-3b y
MM-5, sin integrar)._

### B.1 Resultado de C-1 a C-4 (tal como se anotó)


Llamadas reales con curl, SOAP 1.1, User-Agent genérico, 3 a 5 s entre llamadas (18 respuestas útiles más unos 10 intentos fallidos de conexión, dentro del tope de 30). Respuestas crudas en `scratchpad/banguat/` (`c1-variables.xml`, `c2-*`, `c3-*`, `c4-*`).

**Falla de red anotada.** Desde esta máquina, `https://www.banguat.gob.gt/` se resolvía a 45.191.247.197 y 190.56.46.37: conectaba el TCP pero el saludo TLS nunca contestaba (tiempo agotado a 20 y 45 s, también con TLS 1.2, sin ALPN y con la otra IP; el HTTP plano sí responde 302 a https). El mismo servicio **sí responde en `https://banguat.gob.gt/variables/ws/TipoCambio.asmx`** (sin `www`; otra IP, detrás de Cloudflare). Todas las respuestas útiles vienen de ese nombre. Conviene confirmar desde producción que el `www` de la URL fija responde (si el `www` falla desde ciertas redes, `URL_TIPO_DE_CAMBIO_BANGUAT` debe poder apuntar al otro nombre).

#### B.1 · C-1. `VariablesDisponibles` (40 filas; faltan los códigos 10 y 20)

| Cód. | Descripción del Banguat | Moneda | ¿Se ofrece? |
|---|---|---|---|
| 1 | Quetzales | GTQ | No (es la moneda base) |
| 2 | Dólares de EE.UU. | USD | Sí (ya sembrado) |
| 3 | Yenes Japoneses | JPY | Sí |
| 4 | Francos Belgas | BEF | Excluir (retirada por el euro) |
| 5 | Francos Suizos | CHF | Sí |
| 6 | Francos Franceses | FRF | Excluir (retirada) |
| 7 | Dólares Canadienses | CAD | Sí |
| 8 | Liras Italianas | ITL | Excluir (retirada) |
| 9 | Libras Esterlinas | GBP | Sí |
| 11 | Marcos Alemanes | DEM | Excluir (retirada) |
| 12 | Pesetas Españolas | ESP | Excluir (retirada) |
| 13 | Chelines Austríacos | ATS | Excluir (retirada) |
| 14 | Florines Holandeses | NLG | Excluir (retirada) |
| 15 | Coronas Suecas | SEK | Sí |
| 16 | Colones Costarricenses | CRC | Sí |
| 17 | Colones Salvadoreños | SVC | Excluir (D-2) |
| 18 | Pesos Mexicanos | MXN | Sí |
| 19 | Lempiras Hondureños | HNL | Sí |
| 21 | Córdobas Nicaragüenses | NIO | Sí |
| 22 | Bolivares Venezolanos | VEB/VEF | Excluir (D-2) |
| 23 | Corona Danesa | DKK | Sí |
| **24** | **Euro** | EUR | Sí (**el euro es el 24, no el 28**) |
| 25 | Corona Noruega | NOK | Sí |
| 26 | DEG | XDR | Excluir (D-2) |
| 27 | Escudo Portugués | PTE | Excluir (retirada) |
| **28** | **Unidad de Cuenta del BID** | (sin ISO común) | Excluir |
| 29 | Peso Argentina | ARS | Sí |
| 30 | Real Brasileño | BRL | Sí |
| 31 | Won Coreano | KRW | Sí |
| 32 | Dólar Hong Kong | HKD | Sí |
| 33 | Dólar Taiwán | TWD | Sí |
| 34 | Yuan China | CNY | Sí |
| 35 | Rupia Pakistán | PKR | Sí |
| 36 | Rupee India | INR | Sí |
| 37 | Bolivar Fuerte | VEF | Excluir (D-2) |
| 38 | Peso Colombiano | COP | Sí |
| 39 | Peso Dominicano | DOP | Sí |
| 40 | Ringgit Malasia | MYR | Sí |
| 41 | Bolívar Soberano | VES | Excluir (D-2) |
| **42** | **Zloty** | **PLN** | Sí (**falta en la semilla**) |

Hallazgos de C-1:
- No hay AUD, CLP ni CZK, etc.
- **Error por corregir:** las pruebas de la rama de MM-3a usan `codigoBanguat: 28` como «Euro»; el 28 es la Unidad de Cuenta del BID. El euro es el **24**. Los datos de grabación y cualquier ejemplo de la adenda deben usar 24.
- La descripción trae ortografía irregular («Peso Argentina», «Rupee India», «DEG»): se guarda tal cual (A.3) y no sirve para identificar la moneda; la unión con `core.monedas` la hace Soporte por código.

**`CODIGOS_DEL_BANGUAT_EXCLUIDOS` propuesto:** `[1, 4, 6, 8, 11, 12, 13, 14, 17, 22, 26, 27, 28, 37, 41]`.

**Semilla de A.4 contra `0029_multimoneda.sql`:** la migración siembra EUR, GBP, CHF, CAD, MXN, JPY, HNL, NIO, CRC, DKK, NOK, SEK, ARS, BRL, KRW, HKD, TWD, CNY, PKR, INR, COP, DOP y MYR (23). Con la lista de arriba, cada código ofrecido tiene su moneda **excepto el 42 (Zloty polaco, PLN, 2 decimales, símbolo `zł`)**: falta agregarla en una migración de datos de MM-1 (o en una nueva si MM-1 ya salió). Ninguna moneda de la semilla queda sin código en el Banguat.

#### B.1 · C-2. `TipoCambioRangoMoneda` 2026-10-16 a 2026-10-23 (EUR = 24, JPY = 3)

| Fecha | EUR compra / venta | JPY compra / venta |
|---|---|---|
| vie 16/10 | 1.1256 / 1.1257 | 157.75 / 157.76 |
| sáb 17, dom 18 | sin fila | sin fila |
| lun 19/10 | 1.1214 / 1.1215 | 158.43 / 158.44 |
| mar 20/10 (asueto Día de la Revolución) | 1.1237 / 1.1238 | 158.16 / 158.18 |
| mié 21/10 | 1.1227 / 1.1228 | 158.04 / 158.05 |
| jue 22/10 | 1.1195 / 1.1195 | 157.28 / 157.29 |
| vie 23/10 | 1.12 / 1.12 | 156.78 / 156.79 |

- **Unidad: NO es quetzales por unidad.** Son **cruces contra el dólar** con la convención de mercado: el euro (24) y la libra (9) vienen como **dólares por una unidad** (EUR 1.1257, GBP 1.3199), y CHF, CAD, JPY, MXN, KRW, COP, CRC, HNL, PLN, INR y DOP vienen como **unidades de la moneda por un dólar** (JPY 157.76, CHF 0.84, CAD 1.43). Para pasar a quetzales hay que usar el USD del mismo día (`TipoCambioRangoMoneda` del 2): EUR = 1.1257 × 7.6xxx, JPY = 7.6xxx / 157.76. Esto contradice la hipótesis de A.5 («siempre quetzales por unidad») y el supuesto de «un valor por moneda» de A.7: **hay que decidir la normalización** (ver abajo).
- `compra = venta`: **solo a veces**. Con 4 decimales difieren por 0.0001 (EUR) o 0.01 a 0.02 (JPY); en MXN, KRW, COP, CRC, HNL, DOP, INR y PLN difieren casi todos los días (CRC y DOP hasta 6 a 7 unidades de diferencia). En el USD siempre es igual. La regla de A.7 `compra ≠ venta → valor_ambiguo` **rechazaría casi todas las monedas**.
- Decimales: EUR 4 (a veces menos: `1.12`), JPY 2, MXN 4, KRW 1 a 2 (`1336`), COP 2 a 4, USD 5. Sin ceros a la derecha fijos. Ninguno pasa de 5.
- Días: **fin de semana sin fila** (a diferencia del USD, que repite el viernes). **El asueto del 20/10 sí trae fila con valor distinto**: el Banguat publica en los asuetos guatemaltecos (sigue el mercado internacional). Por tanto, «días esperados» = lunes a viernes **sin** descontar `calendarioLaboral`; con los asuetos esperados se daría un falso `dia_sin_calculo`. Semana Santa 2026 no se probó.
- Notación científica: ninguna en estas respuestas (ni en la muestra de C-3).
- Estructura: `<Var><moneda/><fecha dd/mm/aaaa/><venta/><compra/></Var>` dentro de `TipoCambioRangoMonedaResult`; el orden es **venta antes que compra**.

#### B.1 · C-3. Muestra del 16 al 18/11/2026 (USD, CHF, CAD, GBP, MXN, KRW, COP, CRC, HNL, PLN, INR, DOP; 18/11, venta / compra)

| Cód. | Moneda | 18/11 | Lectura |
|---|---|---|---|
| 2 | USD | 7.64489 (=) | quetzales por dólar |
| 5 | CHF | 0.8427 / 0.8426 | CHF por USD |
| 7 | CAD | 1.4312 / 1.4312 | CAD por USD |
| 9 | GBP | 1.3165 / 1.3164 | **USD por GBP** |
| 18 | MXN | 18.5717 / 18.5677 | MXN por USD |
| 31 | KRW | 1333.1 / 1332.5 | KRW por USD |
| 38 | COP | 3312.6 / 3311.25 | COP por USD |
| 16 | CRC | 449.04 / 444.77 | CRC por USD |
| 19 | HNL | 27.0502 / 26.9156 | HNL por USD |
| 42 | PLN | 4.0202 / 4.0191 | PLN por USD |
| 36 | INR | 93.45 / 93.44 | INR por USD |
| 39 | DOP | 60.377 / 59.946 | DOP por USD |

(Además, JPY 157.76 el 16/10 y EUR 1.1257, de C-2.) No se muestrearon 15, 21, 23, 25, 29, 30, 32 a 35, 40 (no se probaron para no pasar del tope). **No hay publicación «por cada 100 unidades»**: ningún valor es un múltiplo de 100 evidente ni la descripción lo dice; el yen y el won vienen por unidad (157.76 y 1336 por dólar). **Constante de división: ninguna** (el mapa queda vacío). Lo que sí hace falta es otra constante: **qué monedas se publican como «dólares por unidad»** (EUR y GBP comprobadas; en el resto, no verificadas: 24 y 9 en el mapa; sin verificar).

#### B.1 · C-4. Hora local y «el de mañana»

- Hora de la prueba: **23:19 (America/Guatemala, CST, UTC-6), 2026-11-18**.
- `TipoCambioDia` a las 23:19: **solo el de hoy** (18/11/2026, 7.64489). No adelanta nada.
- `TipoCambioRango` (18 a 20/11) a las 23:19: trae **18/11 (7.64489) y 19/11 (7.64682)**, **pero no el 20/11**. `TipoCambioRangoMoneda` del 2 dio lo mismo. O sea, **el tipo de mañana (2026-11-19) ya estaba publicado a las 23:19**, y se obtiene con el rango, no con `TipoCambioDia`.
- **No se pudo comprobar desde qué hora** aparece (solo hubo una ventana, de 23:11 a 23:20). No hay base para mover la vuelta `noche` de las 21:00; si el Banguat publica el de mañana después de las 21:00, la vuelta de las 21:00 no lo encontraría. Hace falta una sonda repetida (por ejemplo cada hora desde las 14:00 durante 2 a 3 días) o dejar la vuelta con reintentos a las 21:00, 22:00 y 23:30. Para el USD, las fechas ya publicadas a futuro incluyen el siguiente día calendario/hábil (el 19/11 es jueves; no se probó un viernes, que debería dar el sábado, domingo y lunes).

#### B.1 · Lo que decide cada comprobación

1. **`CODIGOS_DEL_BANGUAT_EXCLUIDOS`** = `[1, 4, 6, 8, 11, 12, 13, 14, 17, 22, 26, 27, 28, 37, 41]`.
2. **Semilla A.4:** agregar **PLN (Zloty, `zł`, 2 decimales)**; el resto coincide con `0029`. Euro = código 24.
3. **Constante de división por 100:** ninguna.
4. **Cambio de fondo (decisión pendiente del arquitecto y del contador):** las monedas distintas del USD no vienen en quetzales. Opciones: (a) guardar el cruce tal cual con una columna de «convención» (`usd_por_unidad` o `unidades_por_usd`) y calcular el tipo en quetzales al usarlo; (b) convertir al cargar a quetzales por unidad con el USD del mismo día y guardar eso (se pierde el cruce original; JPY queda en 0.0484, en el límite de `numeric(16,8)` con pocas cifras significativas; mejor `1/…` calculado con alta precisión y redondeo a 8 decimales). Debe revisarlo `contador-guatemala` (¿el tipo oficial para un DTE en EUR es el cruce × tipo USD del Banguat?).
5. **A.7 `compra ≠ venta`:** no puede rechazar. Para las demás monedas hay que escoger una regla (por ejemplo el promedio, o la venta) con el contador; la regla actual dejaría sin cargar CRC, DOP, HNL, MXN, KRW, COP, INR y PLN.
6. **Días esperados de las demás monedas:** lunes a viernes **sin** descontar asuetos (el 20/10 se publicó). `dia_sin_calculo` solo para sábado y domingo.
7. **Banda del USD (5 a 15) y variación del 25 %:** el 25 % de A.7 sigue siendo razonable para cruces (variación diaria observada menor a 1 %); pero la banda y el `cruceImplicito` deben aplicarse sobre el valor ya normalizado.
8. **Hora de la vuelta `noche`:** no cambia; ver «no comprobado».

#### B.1 · Lo que no se pudo comprobar

- La hora exacta en que el Banguat publica el USD (y el de las demás) del día siguiente (solo se probó a las 23:19).
- Que `https://www.banguat.gob.gt` responda desde producción (aquí el TLS del `www` no contestó; se usó `banguat.gob.gt`).
- La convención (dólares por unidad o unidades por dólar) de las monedas no muestreadas (15, 21, 23, 25, 29, 30, 32 a 35, 40) y de la EUR/GBP al revés en otras fechas; hay que revisar las 24 respuestas completas o la lista oficial del Banguat.
- Semana Santa 2026 (solo se probó el asueto del 20/10), y cómo se ven los viernes para el USD de mañana.
- `TipoCambioFechaInicialMoneda` y el `CambioDia/Var` de `TipoCambioDia` (no vino en esta respuesta: solo `VarDolar`).
- Notación científica y valores muy pequeños: no aparecieron (el JPY por unidad en quetzales sí sería pequeño, pero el Banguat no lo publica así).

### B.2 Segunda muestra (15 llamadas, 2026-11-18, 23:21 a 23:24 hora de Guatemala)

Mismo método (curl, SOAP 1.1, `https://banguat.gob.gt/variables/ws/TipoCambio.asmx`, User-Agent genérico, 4 a 5 s entre
llamadas). Respuestas crudas `b-moneda<código>.xml`, `b-semana-santa-24.xml`, `b-semana-santa-2.xml`,
`b-navidad-24.xml` y `b-2015-24.xml` junto a las de B.1. Las 15 dieron HTTP 200.

**Convención de los códigos que faltaban** (`TipoCambioRangoMoneda` del 16 al 18/11/2026; el 18/11, venta / compra):

| Cód. | Moneda | 18/11 venta / compra | Convención | Decimales vistos |
|---|---|---|---|---|
| 15 | SEK | 10.1651 / 10.1634 | unidades por USD | 4 |
| 21 | NIO | 36.6243 / 36.6243 (igual los tres días) | unidades por USD | 4 |
| 23 | DKK | 6.8153 / 6.8148 | unidades por USD | 4 |
| 25 | NOK | 9.6849 / 9.6829 | unidades por USD | 4 |
| 29 | ARS | 1556.18018 / 1555.84009 | unidades por USD | hasta 5 |
| 30 | BRL | 5.8 / 5.7991 | unidades por USD | 1 a 4 |
| 32 | HKD | 7.8461 / 7.846 | unidades por USD | 4 |
| 33 | TWD | 33.022 / 32.947 | unidades por USD | 3 |
| 34 | CNY | 6.6683 / 6.6674 | unidades por USD | 4 |
| 35 | PKR | 276.7 / 276.525 (igual los tres días) | unidades por USD | 1 a 3 |
| 40 | MYR | 4.118 / 4.1115 | unidades por USD | 3 a 4 |

Con esto, **todas las monedas ofrecidas tienen convención comprobada**: el euro (24) y la libra (9) vienen en **dólares
por una unidad**; las otras 21 (3, 5, 7, 15, 16, 18, 19, 21, 23, 25, 29, 30, 31, 32 a 36, 38 a 40 y 42), en **unidades
por un dólar**. Es la convención del mercado internacional (EUR/USD y GBP/USD «directas»; las demás «indirectas»).

**El euro en 2015** (5 a 7/01/2015): 1.19275 / 1.19265: también dólares por euro. La convención **no cambió** en 11 años.

**Días** (refuerza C-2):

| Rango | USD (2) | EUR (24) |
|---|---|---|
| Semana Santa 2026 (30/03 a 06/04) | Fila los 8 días; **repite el 7.64121 del miércoles 1/04 el jueves y viernes santos, el sábado y el domingo** | Fila de lunes a viernes, **también el jueves 2/04 y el viernes 3/04 santos**; nada el sábado ni el domingo |
| Navidad y Año Nuevo (22/12/2025 a 02/01/2026) | (no se pidió) | Fila **todos los días de lunes a viernes, incluso el 24, 25 y 31/12 y el 1/01**; con más diferencial esos días (25/12: 1.1792 / 1.1776) |

Conclusión: las demás monedas se publican **de lunes a viernes, sin excepción por asuetos guatemaltecos ni por los
feriados del mercado internacional**. El USD, en cambio, no se calcula en los asuetos guatemaltecos (repite el último).
El cruce de un asueto se combina con ese USD repetido (B.3).

**Lo que sigue sin comprobar:** desde qué hora sale el USD de mañana (las 30 llamadas fueron entre las 23:11 y las 23:24)
y desde qué hora del día sale el cruce del día (el dictamen dice de 8:00 a 9:00; ninguna llamada se hizo de mañana).
No hay más llamadas en este paso: las dos cosas se ven en la bitácora en producción (B.9).

### B.3 Cómo se pasa a quetzales por unidad

`core.tipos_de_cambio.referencia` es, y debe seguir siendo, **quetzales por una unidad** (§4.1, `TipoDeCambio` del
núcleo, y lo que ya guardan o guardarán Bancos, Libro de compras y Cuentas por pagar). Lo que cambia es cómo se llega a
ese número para las monedas distintas del USD.

| Opción | Qué se guarda | A favor | En contra |
|---|---|---|---|
| **A. Normalizar al cargar, guardando lo publicado** | `referencia` en quetzales por unidad, calculada con el USD del Banguat **del mismo día**; además `compra` y `venta` tal como se publicaron, la `convencion` y la fila del USD usado | Los consumidores no cambian (siguen leyendo Q por unidad); cada valor se puede rehacer y explicar («1.31645 USD/GBP × 7.64489 = 10.06411544»); el reporte y la auditoría ven el dato original | Depende de que el USD del día esté cargado antes (orden de las vueltas); tres columnas más |
| B. Normalizar al cargar y guardar solo el resultado | `referencia` en Q por unidad | Lo más simple | Se pierde lo que publicó el Banguat: no se puede revisar un valor raro ni detectar un error de convención después; contradice «guardar lo que dice la fuente» de §4.2 |
| C. Guardar solo el cruce y convertir al usar | `referencia` en la convención publicada; `vigente` combina con el USD al leer | Fiel a la fuente | Cambia el significado de `referencia` según la moneda; `vigente`, `TipoDeCambio`, los reportes y el diferencial cambiario (§8) tendrían que conocer convenciones; un USD corregido cambiaría el EUR de días ya registrados. Rechazada |
| D. Guardar el cruce en una tabla aparte y el Q por unidad en `tipos_de_cambio` | Dos tablas | Separa fuente y resultado | Duplica la versión, el índice único y la bitácora sin ganar nada sobre A |

**Base legal (dictamen de cruces, §1).** La fórmula es la metodología oficial de la Junta Monetaria, no una aproximación:
**JM-126-2006, numeral 2** (reformada por JM-55-2010; antes JM-130-2001, numeral 2), dictada en virtud del Decreto
94-2000, art. 4: el tipo de las demás monedas «se determinará por la equivalencia de la moneda extranjera de que se trate
con relación al dólar…, al cual se aplicará el Tipo de Cambio de Referencia del quetzal respecto al dólar», con
cotizaciones tomadas entre las 8:00 y las 9:00, y «tendrán vigencia durante el día de que se trate, debiéndose citar la
fuente». De ahí la vigencia de un solo día (B.9) y que se guarde lo publicado (opción A). El servicio web no es fuente
oficial («no constituye un servicio oficial de información»), otra razón para guardar el dato original.

**Recomendada: A** (dictamen: correcto). Fórmula, con aritmética entera (`bigint`, sin `number`), igual que `referenciaEscalada`:

- `p` = valor publicado del día (B.5: el promedio de compra y venta **del cruce publicado**, sacado antes de convertir),
  con todos sus decimales (hasta 9).
- `d` = `referencia` del USD **del Banguat** para la **misma fecha** (`origen = 'banguat'`, código 2). El USD tiene fila
  todos los días calendario (también en asuetos, repitiendo), así que todo día con cruce tiene su USD.
- `usd_por_unidad` (EUR, GBP): `referencia = d × p`.
- `unidades_por_usd` (las demás): `referencia = d ÷ p`.
- El cálculo se hace con 20 decimales y se redondea **una sola vez**, desde la mitad, a 8 (`numeric(16,8)`). Si queda en
  0 (no pasa con ninguna moneda de la lista: la menor es el COP, 0.00230829), `dato_invalido`.

Comprobación con los datos de B.1 (18/11/2026, USD 7.64489):

| Moneda | Publicado (compra / venta) | Promedio | Q por unidad |
|---|---|---|---|
| GBP | 1.3164 / 1.3165 USD por GBP | 1.31645 | 10.06411544 |
| CHF | 0.8426 / 0.8427 CHF por USD | 0.84265 | 9.07243814 |
| MXN | 18.5677 / 18.5717 MXN por USD | 18.5697 | 0.41168624 |
| CRC | 444.77 / 449.04 CRC por USD | 446.905 | 0.01710630 |
| COP | 3311.25 / 3312.6 COP por USD | 3311.925 | 0.00230829 |

**Por qué el USD del Banguat y no el «vigente».** Si soporte corrigió a mano el USD de un día (§4.4), el cruce ya cargado
no cambia solo (las filas no se editan). Usar siempre la fila `banguat` del USD hace el cálculo reproducible y es lo que
hace el propio Banguat («el cálculo parte de su equivalencia con relación al dólar»). Si el USD del Banguat de ese día
estaba mal, soporte corrige también las demás monedas de ese día con versiones `manual` (procedimiento de §4.4; el panel
lo avisa: B.8).

**Si falta el USD de esa fecha**, la fila de la otra moneda **no se guarda**: la consulta queda con resultado nuevo
`sin_dolar_del_dia` y el día sigue siendo un hueco, que se vuelve a pedir en la vuelta `noche` o en el relleno del día
siguiente (B.9). No se usa el USD de otro día: el dictamen pide no inventar la cotización (dictamen §3, vigencia).

**Precisión (riesgo, no bloquea).** Con 8 decimales, el error relativo de redondeo es como mucho `0.5 × 10⁻⁸ ÷
referencia`. En el COP (0.0023) es 2.2 × 10⁻⁶: un documento de Q100,000 en pesos colombianos puede diferir hasta Q0.22
del cálculo con el cruce exacto; en el CRC, Q0.03; en el MXN, menos de un centavo. Ampliar la escala obligaría a cambiar
`TipoDeCambio` (8 decimales) y las columnas de tipo de cambio de todos los módulos: no lo recomiendo en v1. **El contador
lo acepta en v1 (V-15 resuelto):** la diferencia es menor que el redondeo de un DTE a centavos por línea y el dato
original queda guardado; no hace falta bloquear COP ni ARS (P-B6 cerrada en a).

### B.4 Convención por código: columna en `core.monedas_del_banguat`

| Opción | Cómo | A favor | En contra |
|---|---|---|---|
| **A. Columna `convencion` fijada por migración de datos** | La migración escribe la convención de los 40 códigos conocidos; la tarea que actualiza la lista **nunca** la toca; un código nuevo nace sin convención y no se ofrece hasta otra migración | Comprobada una vez con llamadas reales (B.1 y B.2), versionada en git, visible en la base; un código nuevo no se carga mal por defecto | Un código nuevo necesita un commit para usarse (raro: la lista no cambia en años) |
| B. Constante del dominio (`USD_POR_UNIDAD = {9, 24}`) | Lo demás se asume `unidades_por_usd` | Sin migración | Un código nuevo se cargaría con una convención supuesta; la base no sabe cómo se calculó cada fila |
| C. Adivinarla por magnitud (si el valor es menor que 2, es `usd_por_unidad`) | Al cargar | Sin datos | Falla con CHF (0.84, unidades por USD) y con cualquier moneda cerca de la paridad. Rechazada |
| D. Que soporte la elija en la ventana | Selector | Flexible | Un error de un clic carga una serie entera mal; el usuario pidió solo **unir** códigos. Rechazada |

**Recomendada: A**, con la comprobación de magnitud de B.6 como red.

**Columna nueva** en `core.monedas_del_banguat`:

| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `convencion` | `text` | sí | `check (convencion in ('quetzales_por_unidad', 'usd_por_unidad', 'unidades_por_usd'))` (`monedas_del_banguat_convencion_valida`). Nula = sin comprobar: el código **no se ofrece ni se carga** |

**Datos que pone la migración** (todos con su `descripcion` tal como la dio C-1, `disponible = true`; `on conflict
(codigo) do update set convencion = excluded.convencion` para que la fila del 2 ya sembrada también la reciba):

| Convención | Códigos |
|---|---|
| `quetzales_por_unidad` | 2 (USD) |
| `usd_por_unidad` | 9 (GBP), 24 (EUR) |
| `unidades_por_usd` | 3, 5, 7, 15, 16, 18, 19, 21, 23, 25, 29, 30, 31, 32, 33, 34, 35, 36, 38, 39, 40, 42 |
| nula (excluidos, B.7) | 1, 4, 6, 8, 11, 12, 13, 14, 17, 22, 26, 27, 28, 37, 41 |

- **`ActualizarMonedasDelBanguat`** (rama de MM-3b): su `on conflict do update` sigue tocando solo `descripcion`,
  `disponible` y `vista_por_ultima_vez`. Una prueba de integración lo comprueba (la convención sobrevive a una
  actualización; un código nuevo entra con convención nula).
- **Permisos de la columna:** `arrancar_app` ya escribe la tabla (la tarea); no se le quita el `update` de la tabla, pero
  el repositorio no expone `convencion` para escribir. Opción más estricta (P-B7): `revoke update (convencion)` por
  columna. Recomiendo hacerlo: cuesta una línea en la migración y lo deja fijo también ante un error del código.
- **Sin auditoría:** es catálogo de instalación escrito por migración (queda en git), como la semilla de monedas.
- **Sin índice:** la tabla tiene unas 40 filas y se lee por la PK.

### B.5 Compra distinta de venta

Lo observado: en el USD siempre son iguales; en las demás difieren casi todos los días. El diferencial va de 0.008 %
(GBP) a 0.96 % (CRC); los días de feriado internacional se abre (EUR del 25/12: 0.14 %). Ojo: «venta» es **el número
mayor en la convención publicada**, no «la venta de la moneda extranjera»: en Q por unidad, la venta del GBP da el valor
más alto (10.06449769) y la del CHF el más bajo (9.07189985). Elegir «venta» o «compra» no tiene el mismo sentido en el
euro que en el peso mexicano.

| Opción | Regla | A favor | En contra |
|---|---|---|---|
| a. No cargar (D-3 del usuario, regla de A.7) | `compra ≠ venta` → `valor_ambiguo` | Ya programado | Deja sin cargar casi todo (solo el NIO tuvo compra = venta los tres días; el EUR, a veces). Esa respuesta se dio suponiendo que el caso sería raro |
| **b. Promedio de compra y venta** | `p = (compra + venta) ÷ 2`, exacto (a lo más un decimal más) | Es el «medio» del mercado, la referencia usual; trata igual las dos convenciones; con compra = venta da el mismo valor que hoy | No es un número que el Banguat imprima |
| c. Venta | `p = venta` | Un número publicado | En Q por unidad, sube el EUR y baja el MXN: sesgo opuesto según la convención |
| d. Compra | `p = compra` | Igual que c | Igual que c, al revés |

**Recomendada: b (promedio)**, con dos salvaguardas:
- Si el diferencial `(venta − compra) ÷ promedio` pasa de **3 %** (constante `DIFERENCIAL_MAXIMO_EN_PORCIENTO`), la fila
  no se guarda y la consulta queda `valor_ambiguo` (se reutiliza el resultado; detalle con el diferencial). El mayor visto
  fue 0.96 %.
- Si `venta < compra`, `dato_invalido`.

**Dictamen (V-14, correcto con ajuste).** Ninguna norma dice qué hacer con compra ≠ venta en el cruce; el promedio sigue
el espíritu de JM-126-2006 (una sola referencia para el USD, numerales 1 y 4), es el medio usual del mercado y cabe en
NIIF para PYMES 30.8 y 30.9. Por eso:

- **Es una política contable de la instalación, no «la referencia del Banguat».** Así se nombra en la documentación, en
  la ventana de muestra y en el reporte, que lo dice en una nota: «Q por unidad = promedio del cruce publicado ×
  referencia USD» (o «referencia USD ÷ promedio del cruce publicado» en las monedas de unidades por dólar). Ningún texto
  de la app llama «tipo del Banguat» al valor en quetzales de una moneda distinta del USD; el USD sí lo es.
- **Orden fijo: primero el promedio del cruce publicado, después la conversión.** `p = (compra + venta) ÷ 2` en la
  convención publicada y luego `d × p` o `d ÷ p` (B.3). En las monedas de unidades por dólar, `d ÷ promedio` **no** es
  igual al promedio de `d ÷ compra` y `d ÷ venta` (CRC: unos Q2 por cada Q100,000). Prueba unitaria en MM-3a″ con el CRC
  del 18/11 (compra 444.77, venta 449.04, USD 7.64489): `normalizarAQuetzales` da 0.01710630 (`7.64489 ÷ 446.905`) y no
  0.01710669 (promedio de `7.64489 ÷ 444.77` y `7.64489 ÷ 449.04`).
- **Peso del medio diferencial:** CRC 0.48 %, DOP 0.36 %, HNL 0.25 % (en Q100,000 en colones, promedio contra venta
  mueve unos Q480). Para esas monedas importa C-6 (B.13) antes de encender su carga; ver Q-1.
- **Condición de C-5:** si la consulta pública del Banguat resulta mostrar un valor **en quetzales** para las demás
  monedas, Arrancar debe reproducir **ese** valor y esta política se ajusta antes de MM-3d (la columna `compra`/`venta`
  guardada permite recalcular sin perder nada).

Reemplaza la respuesta D-3 del usuario (P-B2, confirmada por el contador).

### B.6 Comprobaciones al cargar (reemplazan las filas de A.7 para las demás monedas)

En orden; la primera que falla decide el resultado. El USD sigue como está (banda 5 a 15, aviso con 3 %).

| # | Comprobación | Si falla |
|---|---|---|
| 1 | El código tiene `convencion` | No se pide (no entra en `monedasACargar`); si llega igual, `sin_convencion` (resultado nuevo) |
| 2 | Formato, fecha, `venta ≥ compra > 0` | `dato_invalido` |
| 3 | Diferencial de hasta 3 % (B.5) | `valor_ambiguo` |
| 4 | Hay USD `banguat` de esa fecha (B.3) | `sin_dolar_del_dia` (resultado nuevo); queda como hueco |
| 5 | **Inversión probable** contra el valor publicado anterior (promedio de la fila `banguat` más reciente de los 7 días anteriores, en la misma convención): si `p` cambió más de 5 % **y** `p × anterior` está más cerca de 1 que `p ÷ anterior` | `convencion_dudosa` (resultado nuevo): no se guarda; aviso en el panel |
| 6 | Variación del valor en quetzales de más de 25 % contra el anterior | `variacion_excesiva` (como A.7). El aviso del panel y la bitácora dicen la salida: «Si la variación es real (una devaluación), ingrese el tipo a mano con su motivo» y llevan a la ventana de ingreso manual (§4.4). Una devaluación real grande (ARS de diciembre de 2023, más de 50 %) cae aquí a propósito |
| 7 | Variación de más de 3 % del **valor publicado** o del valor en quetzales | Se guarda con aviso (sustituye al «cruce implícito» de A.7, que ya no tiene sentido: el cruce es el dato de entrada) |

Por qué la 5 y no solo la 6: si el euro llegara un día «al revés» (0.8883 EUR por USD en vez de 1.1257 USD por EUR), el
valor en quetzales cambiaría 21 %, **por debajo** del 25 % de rechazo, y se guardaría. Con la 5: `0.8883 × 1.1257 ≈ 1`
→ rechazo. El umbral de 5 % evita el falso positivo de una moneda cerca de la paridad (CHF 0.84; un movimiento normal de
2 % no llega a evaluarse). Un salto real grande (el ARS de 800 a 1,500) no se confunde: `p × anterior` queda lejísimos
de 1. Sin valor anterior (primera carga), solo valen la 1 a la 4: por eso la «muestra» de A.9 pasa a enseñar también el
valor en quetzales (B.10) antes de unir el código.

Cálculo entero: con `p` y `a` escalados × 10⁹, «más cerca de 1» compara `|P·A − 10¹⁸| × A` contra
`|P − A| × 10¹⁸` (`P` y `A` son `p` y `a` × 10⁹). Función pura `inversionProbable(publicado, anterior)` en `dominio/reglas-de-publicacion.ts`, con pruebas
de EUR invertido, CHF moviéndose 2 % cerca de la paridad y ARS devaluado 87 %.

`core.consultas_al_banguat.resultado`: el check suma `sin_dolar_del_dia`, `convencion_dudosa` y `sin_convencion`.

### B.7 `core.tipos_de_cambio`: columnas nuevas

| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `convencion` | `text` | sí | Copia de la convención con que se calculó (no se lee de `monedas_del_banguat` al usar: la fila se explica sola). Check de los tres valores. `tipos_de_cambio_banguat_con_convencion check (origen <> 'banguat' or convencion is not null)`; nula en `manual` |
| `dolar_usado_id` | `uuid` | sí | FK `core.tipos_de_cambio(id)` (la fila del USD del Banguat usada), `on delete restrict`. Índice `tipos_de_cambio_dolar_usado_idx`. `tipos_de_cambio_cruce_con_dolar check ((coalesce(convencion, '') in ('usd_por_unidad', 'unidades_por_usd')) = (dolar_usado_id is not null))` |
| `compra`, `venta` | `numeric(16,8)` | sí | **Cambia el significado**: ahora son **tal como los publicó el Banguat, en su convención** (en el USD coinciden con quetzales, así que para él nada cambia). `tipos_de_cambio_cruce_con_compra_y_venta check (coalesce(convencion, '') not in ('usd_por_unidad', 'unidades_por_usd') or (compra is not null and venta is not null and venta >= compra))`. El mayor visto (ARS 1556.18018) cabe |

- Sin columna para el promedio: sale de `compra` y `venta`. `referencia` se rehace con `compra`, `venta`, `convencion` y
  la fila `dolar_usado_id`; una prueba de integración lo comprueba fila por fila.
- **RLS:** sin cambio (política de solo agregar en la instalación, `politicasDeSoloAgregarEnLaInstalacion`); la llave a
  la misma tabla no necesita política nueva.
- **Datos existentes.** En producción no hay filas `banguat` de otras monedas: MM-3b no está integrado y la carga está
  apagada. Las del USD (si las hay, de pruebas o de carga manual por rango) reciben `convencion = 'quetzales_por_unidad'`
  con un `update` de la migración. Si existe alguna fila `banguat` de otra moneda (una base de desarrollo que corrió la
  rama de MM-3b), la migración **se detiene** con un `raise exception` que explica el procedimiento (recrear la base de
  desarrollo); no borra nada sola. Las filas `manual` no cambian (Q por unidad, como siempre).
- **Migración nueva**, no se edita `0029` (ya está en `main`, después vinieron `0030` y `0031`): `00xx_cruces_del_banguat`
  en `core` (número al programar). Contiene B.4 (columna y datos de `monedas_del_banguat`, `revoke` de P-B7), B.7, el
  check de resultados de B.6, la guarda de datos existentes y la moneda PLN (B.8).

### B.8 PLN en la semilla y otras correcciones de datos

- **PLN:** la misma migración agrega `('PLN', 'Zloty polaco', 'zł', 2)` a `core.monedas` (inactiva, sin código, sin
  letras, `on conflict do nothing`). No se edita `0029`.
- **Euro = 24.** El 28 es la Unidad de Cuenta del BID. Hay que cambiar 28 por 24 en todas las pruebas y dobles que lo
  usan como euro, en `main` y en la rama de MM-3b: `moneda.prueba.ts`, `reglas-de-publicacion.prueba.ts`,
  `extractor-de-respuestas.prueba.ts`, `cliente-banguat.prueba.ts`, `monedas.prueba.ts`, `fuente-con-reintentos.prueba.ts`,
  `cargas-de-tipos.prueba.ts`, `cargas-de-tipos-en-memoria.ts`, `catalogo-de-monedas-en-memoria.ts`,
  `cargar-tipos-de-cambio.prueba.ts`, `multimoneda-de-core.soporte.ts`, `tipos-de-cambio-de-core.prueba.ts` y
  `pruebas-api/monedas.api.prueba.ts` (buscar `codigoBanguat: 28`, `codigo: 28` y «Euro (28)»; también el texto de A.3 y
  A.10). Los valores de prueba del euro pasan a ser **dólares por euro** (1.1257), no 8.8.
- **Grabaciones de prueba** (`respuestas-grabadas-del-banguat.ts`): se reemplazan por recortes de las respuestas reales de
  B.1 y B.2 (EUR con fin de semana y asueto; CRC con compra ≠ venta; ARS con 5 decimales; USD de Semana Santa repetido),
  sin datos de quien llamó.
- **`CODIGOS_DEL_BANGUAT_EXCLUIDOS`** = `{1, 4, 6, 8, 11, 12, 13, 14, 17, 22, 26, 27, 28, 37, 41}`. D-2 del usuario
  nombra el DEG (26), los tres bolívares (22, 37, 41) y el colón salvadoreño (17); además van el quetzal (1, es la base),
  las monedas europeas retiradas por el euro (4, 6, 8, 11 a 14, 27) y la Unidad de Cuenta del BID (28), que no son
  monedas en circulación (P-B5). El selector ofrece: `disponible` **y** no excluido **y** `convencion` no nula.
- **El USD no puede quedarse sin código** mientras otra moneda tenga código (sin él no hay cruces): `EditarMoneda`
  rechaza con `CodigoDelDolarNecesario` (Regla, 422, `codigo_del_dolar_necesario`, `detalles: { monedas }`).

### B.9 Días esperados, horario y URL

- **Días esperados de las demás monedas:** lunes a viernes, **sin** descontar asuetos (B.2). Función pura
  `esDiaDePublicacionDeCruces(fecha)` en el dominio; deja de usarse `calendarioLaboral` para esto:
  - `VueltasDeCarga.diasHabiles` y la condición de la vuelta `noche` (`esHabil(hoy)`) pasan a esa función.
  - `tiposDeCambio.vigente` (A.8): `dia_sin_calculo` **solo** en sábado y domingo. Un asueto sin la fila esperada es
    `falta_publicacion`. Así se respeta D-4 del usuario («aviso solo si faltó una publicación esperada») con los días
    reales.
  - El aviso de atraso de 3 días hábiles (A.6) cuenta lunes a viernes.
  - **Sábado y domingo no se sintetiza nada** (dictamen de cruces, §2): no se arma un EUR del sábado con el USD del
    sábado. Ese día no existe referencia del EUR; `vigente` devuelve la del último día publicado (el viernes) por la
    regla de D-4. Prueba en MM-3c: tras un viernes con EUR y un sábado con USD, no aparece fila de EUR del sábado.
  - **Asueto guatemalteco** (V-16, resuelto): el cruce del día × el USD repetido de ese día, que es el último publicado y
    el que rige (JM-126-2006, numeral 1).
- **Orden dentro de una vuelta:** el USD siempre primero (`monedasACargar` ordena el código 2 al inicio), para que el
  relleno de 45 días tenga el USD antes de normalizar las demás. La vuelta `manana` (09:30) usa el USD que dejaron la
  `noche` anterior o la `madrugada`; si falta, sus monedas quedan `sin_dolar_del_dia` y la vuelta `noche` las repite
  (ya pide «las demás que faltaron hoy»).
- **Hora del USD de mañana (C-4 sin cerrar):** a las 23:19 ya estaba. Recomiendo que la vuelta `noche` reintente solo el
  USD de mañana a las **21:00, 22:00 y 23:30** si no llegó (2 llamadas más como mucho, solo el USD). La bitácora en
  producción dirá en pocas semanas a qué hora aparece; entonces se ajusta la constante. Lo mismo para la vuelta de las
  09:30: si la bitácora muestra `sin_datos` frecuentes de mañana, se mueve. El efecto de no tener el USD de mañana es
  menor: la `madrugada` de las 06:00 lo trae igual.
- **URL:** desde la red de prueba, `https://www.banguat.gob.gt` no completó el TLS y `https://banguat.gob.gt` sí (otra IP,
  detrás de Cloudflare; responde 200 sin redirección, que `ClienteBanguat` no sigue).

  | Opción | A favor | En contra |
  |---|---|---|
  | **a. Cambiar `URL_BANGUAT_POR_OMISION` a `https://banguat.gob.gt/variables/ws/TipoCambio.asmx`** | El único nombre que respondió; sigue la variable `URL_TIPO_DE_CAMBIO_BANGUAT` para volver al `www` | Si el Banguat cambia de proveedor, puede dejar de servir el nombre corto (igual que el `www` hoy) |
  | b. Dejar `www` y fijar la variable en producción | Sin cambio de código | Toda instalación nueva nace con una URL que puede no responder |
  | c. Dos URL con respaldo automático | Resiste la caída de una | Más código y un segundo destino que revisar en seguridad; no lo justifica un servicio que se consulta pocas veces al día |

  **Recomendada: a**, y **comprobar desde el servidor de producción** con un `curl` antes de encender
  `CARGAR_TIPOS_DE_CAMBIO`. El espacio de nombres SOAP (`http://www.banguat.gob.gt/variables/ws/`) **no cambia**: es un
  identificador XML, no una dirección. Revisión de `seguridad` (cambia el destino de una salida a internet).

### B.10 API, pantallas, Excel, permisos y auditoría

- **API** (sin rutas nuevas):
  - `GET /api/monedas/banguat` suma `convencion` y `ofrecida` (no excluida, disponible y con convención).
  - `GET /api/monedas/banguat/:codigo/muestra` devuelve por fecha `compra`, `venta`, `convencion`, `promedio`, el USD del
    Banguat guardado de esa fecha y la `referencia` en quetzales (nula si no hay USD guardado). No guarda nada (como A.9).
  - `GET /api/tipos-de-cambio/...` (serie, versiones, consultas) suma `convencion`, `compra`, `venta` y la `referencia` del
    USD usado; los resultados nuevos de B.6 en la bitácora.
- **Pantallas (MM-4):** en Monedas, la columna «Moneda del Banguat» dice «Euro (24) · USD por unidad»; el selector solo
  habilita las `ofrecida`; «Ver muestra» enseña lo publicado y el valor en quetzales, con la frase «1.31645 USD por GBP ×
  7.64489 = Q10.06411544». En Tipos de cambio, el detalle de una fila muestra lo publicado, la convención y el USD usado; la
  bitácora traduce `sin_dolar_del_dia`, `convencion_dudosa` y `sin_convencion`.
- **Excel:** el reporte «Tipos de cambio» de Multimoneda (Reportes: imprime y exporta; rama de MM-5) suma las columnas
  «Compra publicada», «Venta publicada», «Convención» y «Dólar usado» (`tipos-de-cambio.columnas.ts`), y una nota al pie
  (impresa y en el Excel) con la política contable de B.5: «Q por unidad = promedio del cruce publicado × referencia USD». Las ventanas de
  Plataforma no importan ni exportan (A.9).
- **Permisos:** ninguno nuevo.
- **Auditoría:** sin cambios; `core.tipos_de_cambio` y la bitácora son su propio rastro y nunca se borran; la convención
  la fija una migración. `CodigoDelDolarNecesario` no deja rastro (rechaza; no cambia nada).

### B.11 Convivencia con lo ya programado

| Pieza | Dónde | Cambio |
|---|---|---|
| `PublicacionDeTipoDeCambio` | `main` | `referencia` sigue en Q por unidad; `compra` y `venta` pasan a ser lo publicado; suma `convencion` y `dolarUsadoId` |
| `validarPublicacion` / `esAmbiguo` | `main` | Deja de rechazar `compra ≠ venta`; la validación de un cruce ya no da la referencia: devuelve el promedio y la convención, y la normalización (B.3) se hace en la carga, que tiene el USD guardado |
| `cruceImplicito` | `main` | Se quita (B.6, regla 7) |
| `CODIGOS_DEL_BANGUAT_EXCLUIDOS` | `main` | Se llena (B.8) |
| `URL_BANGUAT_POR_OMISION` | `main` | B.9 |
| `ConsultarAlBanguat`, `evaluarVariaciones`, `VueltasDeCarga`, `vueltaQueToca`, `CargasDeTipos` | rama MM-3b | Normalización con el USD guardado, comprobaciones de B.6, días de B.9, orden USD primero, reintentos de la noche |
| `tipo-vigente.ts` | rama MM-3b | `dia_sin_calculo` solo sábado y domingo |
| Reporte de tipos de cambio | rama MM-5 | Columnas de B.10 |
| Bancos, Libro de compras, Cuentas por pagar | — | Nada: leen `referencia` (Q por unidad) por `tiposDeCambio.vigente` |

**Recomendación sobre la rama `worktree-wf_c1facbe4-e32-7`:** integrarla **como está** (MM-3b y MM-5, con la carga
apagada) y hacer encima los pasos de B.12, como se hizo con MM-3a → MM-3a′; rehacerla perdería su revisión. Lo único que
no puede pasar es encender `CARGAR_TIPOS_DE_CAMBIO` antes de MM-3c (P-B8).

### B.12 Pasos nuevos (un commit cada uno)

| Paso | Qué | Pruebas clave | Depende de |
|---|---|---|---|
| **MM-1b** (servidor, datos del núcleo) **HECHO 2026-11-19** (migración `core/0033_cruces_del_banguat`) | Migración `00xx_cruces_del_banguat`: `convencion` en `monedas_del_banguat` con los datos de B.4 y su `revoke`; `convencion`, `dolar_usado_id`, checks e índice en `tipos_de_cambio`; resultados nuevos en `consultas_al_banguat`; guarda de datos existentes; PLN. Tablas Drizzle | La convención sobrevive a `ActualizarMonedasDelBanguat`; un código nuevo nace sin convención; una fila de cruce sin USD, sin compra o con `venta < compra` falla; una `manual` sin convención pasa; la app no puede cambiar `convencion`; PLN existe inactiva; la guarda detiene la migración con una fila `banguat` de otra moneda | Nada (V-14 ya resuelto) |
| **MM-3a″** (servidor, dominio, sin base) | `CODIGOS_DEL_BANGUAT_EXCLUIDOS`; URL; 28 → 24 en `main`; grabaciones reales; `validarPublicacion` sin `valor_ambiguo` por `compra ≠ venta` (solo diferencial > 3 %); `promedioPublicado`, `normalizarAQuetzales`, `inversionProbable`, `esDiaDePublicacionDeCruces`; se quita `cruceImplicito` | Los cinco ejemplos de B.3 dan exactamente esos valores; promedio con un decimal más (ARS); el CRC del 18/11 da 0.01710630 (promedio del cruce y luego conversión) y no 0.01710669 (B.5); diferencial de 3.01 % rechazado; `venta < compra` inválido; EUR invertido → inversión; CHF ±2 % y ARS +87 % no; jueves santo y 25/12 son días de publicación, el sábado no | MM-1b (tipos) o ninguno si se programa sin base |
| **MM-3c** (servidor, carga; sobre la rama de MM-3b integrada) | `ConsultarAlBanguat` normaliza con el USD `banguat` de la fecha y guarda `convencion` y `dolar_usado_id`; comprobaciones de B.6 en orden; `monedasACargar` solo con convención y el USD primero; días de B.9; reintentos de la noche; `vigente` con `dia_sin_calculo` solo en fin de semana; `muestra` con el valor en quetzales; `CodigoDelDolarNecesario`; 28 → 24 en las pruebas de la rama; columnas del reporte (MM-5) | Con reloj fijo: EUR del lunes con el USD del lunes; EUR sin USD → `sin_dolar_del_dia` y se rellena al llegar el USD; EUR de un asueto con el USD repetido; EUR invertido → `convencion_dudosa`; un sábado no es hueco y un asueto sí; `vigente` del EUR un sábado (`dia_sin_calculo`) y un 20 de octubre sin fila (`falta_publicacion`); quitar el código del USD con el EUR unido → 422; la referencia guardada se rehace con su fila | MM-1b, MM-3a″, rama de MM-3b integrada |
| **MM-4** (cliente, Plataforma) | Como A.14, más B.10 | Unitarias de `edicion-de-moneda.ts` (solo `ofrecida`; texto de la convención); QA con el servidor falso devolviendo cruces | MM-3c |
| **MM-3d** (operación, sin código) | **Antes de encender:** C-5 (la consulta pública del Banguat, ¿muestra quetzales para las demás monedas?; si sí, ajustar B.5) y, si hay clientes en CRC, DOP o HNL (Q-1), C-6. Luego `curl` desde producción a la URL de B.9; encender `CARGAR_TIPOS_DE_CAMBIO`; revisar la bitácora la primera semana (horas de B.9) | C-5: comparar en 3 a 5 fechas la consulta pública con la fórmula de B.3 | MM-3c, MM-4, P-B8, C-5 (C-6 según Q-1) |

### B.13 Validación de `contador-guatemala` (dictamen de cruces)

Dictamen completo: `dictamen-multimoneda-cruces-2026-11-18.md` (veredicto: **correcto con ajustes**, ya aplicados en B.3,
B.5, B.6, B.9, B.10 y B.12). Fe de erratas del dictamen anterior: al inicio de
`dictamen-multimoneda-monedas-del-banguat-2026-11-18.md` (la frase «de México» es JM-126-2006; Código de Comercio art.
369, no 368; el servicio web no publica quetzales para las demás monedas).

| # | Qué | Estado |
|---|---|---|
| V-14 | Q por unidad = promedio del cruce publicado × (o ÷) el USD del Banguat del mismo día | **Resuelto, con la condición de C-5.** La fórmula es la de JM-126-2006, numeral 2; el promedio es política contable de la instalación (B.5) |
| V-15 | Redondeo a 8 decimales en COP y ARS | **Resuelto: se acepta en v1** (B.3); no se bloquean |
| V-16 | Asueto guatemalteco: cruce del día × USD repetido | **Resuelto: correcto** (JM-126-2006, numeral 1; B.9) |
| C-5 | ¿La consulta pública del Banguat (`banguat.gob.gt/tipo_cambio/`) muestra un valor **en quetzales** para el EUR y las demás, y cuál (compra, venta o medio)? | **Pendiente, antes de MM-3d.** Abrirla en un navegador en 3 a 5 fechas y comparar con B.3; si muestra quetzales, Arrancar reproduce ese valor y B.5 se ajusta. No bloquea MM-1b, MM-3a″ ni MM-3c |
| C-6 | ¿Qué tipo usa la precarga de Declaraguate o el libro de compras para un DTE en EUR o CRC? | **Pendiente, antes de encender la carga de CRC, DOP y HNL si hay clientes en ellas (Q-1).** Un DTE real o una consulta a la SAT (Código Tributario, art. 102; Q-2) |

### B.14 Preguntas para el usuario

La primera opción es la recomendada.

| # | Pregunta | Opciones | Recomendación |
|---|---|---|---|
| P-B1 | ¿Cómo pasamos las monedas distintas del dólar a quetzales? | A. Calcular al cargar con el dólar del Banguat del mismo día y guardar también lo publicado; B. Guardar solo el resultado; C. Guardar el cruce y convertir al usar | **A** (B.3): es la metodología oficial (JM-126-2006, numeral 2, confirmada por el contador), nada cambia para los módulos que usan el tipo y cada valor se puede explicar |
| P-B2 | Cuando compra y venta son distintas (casi siempre), ¿qué valor tomamos? Su respuesta D-3 («no cargar») dejaría casi todas las monedas sin tipo | a. Promedio del cruce publicado, como política contable, y no cargar si la diferencia pasa de 3 %; b. Venta; c. Compra; d. No cargar | **a** (B.5): el contador lo confirma; ninguna norma obliga a compra ni a venta y el promedio es lo más neutral. Se revisa si C-5 muestra que el Banguat publica otro valor en quetzales |
| P-B3 | ¿Dónde se decide si una moneda viene «en dólares por unidad» o «en unidades por dólar»? | A. Columna fijada por migración; B. Constante en el código; C. Adivinarlo por el tamaño del número; D. Que soporte lo elija | **A**, con el rechazo automático si un día llega «al revés» (B.6) |
| P-B4 | ¿Qué días se espera tipo de las demás monedas? | a. Lunes a viernes, también en asuetos (lo que muestra el Banguat), sin inventar sábados ni domingos; b. Lunes a viernes sin asuetos (lo de la adenda A) | **a** (B.2 y B.9, confirmada por el contador): con b, un asueto con publicación pasaría sin aviso y uno sin publicación también |
| P-B5 | ¿Excluimos del selector, además del DEG, los bolívares y el colón salvadoreño, el quetzal, las monedas europeas retiradas por el euro y la Unidad de Cuenta del BID? | Sí / No | **Sí** (B.8, confirmada por el contador): no son monedas en circulación y se confundirían con el euro |
| P-B6 | Las monedas de valor muy bajo (peso colombiano, peso argentino) pierden hasta Q0.22 por cada Q100,000 por el redondeo a 8 decimales. | a. Aceptarlo en v1; b. No dejar activarlas en v1; c. Ampliar los decimales del tipo en todos los módulos | **a**: el contador lo acepta (V-15); es menos que el redondeo de un DTE a centavos y el dato original queda guardado |
| P-B7 | ¿Bloqueamos en la base que la app cambie la convención (solo la cambia una migración)? | Sí / No | **Sí**: una línea en la migración; el contador lo ve como buen control interno |
| P-B8 | ¿Integramos MM-3b y MM-5 como están (con la carga apagada) y corregimos encima, o los corregimos antes en su rama? | Integrar y corregir encima / Corregir en la rama | **Integrar y corregir encima** (B.11); la carga sigue apagada hasta MM-3d |
| P-B9 | La dirección `www.banguat.gob.gt` no respondió desde aquí y `banguat.gob.gt` sí. ¿Cambiamos la dirección por omisión? | a. Cambiar a `banguat.gob.gt`; b. Dejar `www` y configurarla en producción; c. Las dos con respaldo | **a**, y probar desde el servidor de producción antes de encender la carga |
| P-B10 | ¿Agregamos el zloty polaco (PLN), que el Banguat publica y faltó en la lista? | Sí / No | **Sí**, inactivo y sin código, como las demás |
| Q-1 | ¿Algún cliente factura o compra hoy en colones costarricenses, pesos dominicanos o lempiras (las monedas con más diferencia entre compra y venta)? | a. Sí: hacer C-6 antes de encender la carga de esas monedas; b. No: encender con las demás y dejar C-6 para cuando aparezca uno | Depende del dato; si hay alguno, **a** (en Q100,000 en colones, promedio contra venta mueve unos Q480) |
| Q-2 | ¿Presentamos una consulta formal a la SAT (Código Tributario, art. 102) sobre el tipo para DTE en monedas distintas del USD? | a. No por ahora: basta con C-5 y C-6; b. Sí, ya | **a**, salvo que un cliente tenga volumen relevante en esas monedas |

### Respuestas del usuario a la Adenda B

_2026-11-19._ P-B1 **A** (calcular al cargar con el dólar del mismo día y guardar lo publicado). P-B2 **a**: promedio del
cruce publicado como **política contable** de la instalación, sin cargar si el diferencial pasa de 3 %. P-B3 **A**
(columna `convencion` fijada por migración). P-B4 **a** (lunes a viernes, también en asuetos, sin sábados ni domingos).
P-B5 **sí** (se excluyen quetzal, monedas europeas retiradas, bolívares, colón salvadoreño, DEG y Unidad de Cuenta del
BID). P-B6 **a** (se acepta el redondeo a 8 decimales en v1). P-B7 **sí** (la app no cambia la convención). P-B8
**integrar MM-3b y MM-5 como están y corregir encima** (ya integrado). P-B9 **a** (`banguat.gob.gt` sin `www`). P-B10
**sí** (zloty polaco). Q-1 **b**: no hay clientes en CRC, DOP ni HNL por ahora, así que C-6 queda para cuando aparezca
uno. Q-2 **a**: no se consulta a la SAT por ahora; basta con C-5 y C-6.

### MM-1b: lo programado

Migración `core/0033_cruces_del_banguat` (generada con `bd:generar`; la guarda, los datos y el orden de las sentencias, a
mano): guarda que se detiene con `raise exception` si hay filas `banguat` de otra moneda; `convencion` en
`core.monedas_del_banguat` con los 40 códigos de C-1 (los 15 excluidos quedan sin convención); `convencion`,
`dolar_usado_id`, checks e índice en `core.tipos_de_cambio`; resultados `sin_dolar_del_dia`, `convencion_dudosa` y
`sin_convencion` en `core.consultas_al_banguat`; el zloty polaco (PLN). P-B7 se cumple en `RESTRICCIONES_DE_PRIVILEGIOS`
(`actualizarSolo` de `core.monedas_del_banguat`: descripción, disponible y vista por última vez), no con un `revoke` suelto
de la migración, porque el migrador rehace los `grant` en cada corrida. Pruebas: `cruces-de-core.prueba.ts`.
