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
| Servicio | `https://www.banguat.gob.gt/variables/ws/TipoCambio.asmx`, SOAP 1.1 (`POST`, `text/xml`, `SOAPAction`). URL en la variable de entorno `URL_TIPO_DE_CAMBIO_BANGUAT` (esa por omisión; las pruebas apuntan a un servidor falso local). Variable `CARGAR_TIPOS_DE_CAMBIO` (`true` por omisión en producción, `false` en pruebas), como `DEPURAR_HUERFANOS` |
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
| **MM-4** (cliente, Plataforma) | Páginas de tipos de cambio y monedas | Unitarias de la lógica; QA en el navegador | MM-3 |
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
