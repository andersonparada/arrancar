# Adenda a CP4: pagos en efectivo con un retiro del banco — arquitecto de datos, 2026-11-14

Estado: **propuesta para aprobar** (no se programa hasta que el usuario responda §12 y el contador valide §13).

Adenda a `diseno-cp4-pagos.md` (CP4, aprobado el 2026-11-13). Nace de la decisión del usuario del **2026-11-14**, que
**cambia CP4-k** («pago de facturas en efectivo: con Caja chica»): «imagina que voy a sacar dinero y quiero pagar en
efectivo a varios proveedores: debemos soportarlo». Es decir: un **retiro del banco** cuyo efectivo se usa para pagar
**varias contraseñas de varios proveedores**, cada pago con su recibo firmado. Caja chica no existe y esta adenda no la
crea, pero no la debe estorbar (§9).

Responde también la pregunta del coordinador sobre **un solo cheque para varias contraseñas del mismo proveedor**
(§10): el diseño aprobado **no** lo permite y aquí se propone cómo.

Lo que esta adenda **no** cambia de CP4: todo pago va por contraseña y solo se paga lo autorizado; la retención se
descuenta una sola vez en el primer pago vigente de cada cargo; los saldos son calculados; el pago no se corrige, se
reaplica o se anula; Bancos rechaza cambiar lo que tiene origen en Cuentas por pagar si ese módulo está inactivo.

## 1. Lo encontrado en el código y la base (main, 2026-11-14, después de CP4-1, CP4-B1 y CP4-B2a)

1. **`cuentas_por_pagar.pagos`** (migración `0008_cp4_pagos`, en `main`): `forma in ('cheque', 'nota_de_debito',
   'nota_ligada', 'cuenta_de_apertura')`; `pagos_movimiento_de_su_forma`: `(forma = 'cuenta_de_apertura') =
   (movimiento_id is null)`; `pagos_referencia_de_su_forma`: referencia solo en `nota_ligada` y `cuenta_de_apertura`;
   `contrasena_id not null` con la llave compuesta `pagos_contrasena_fk` y el único `pagos_llave_unica (id, empresa_id,
   proveedor_id, contrasena_id)`, destino de la llave de `aplicaciones_de_pagos`. `pagos_movimiento_creado_unico`: un
   cheque o una nota creados por un pago son de **ese** pago. Sin casos de uso todavía (CP4-2 se está programando).
2. **Bancos** (`dependeDe: []`): las cuentas son solo `monetaria` o `ahorro`; **no existe una cuenta de caja** ni un
   movimiento de efectivo. Un retiro hoy cabe como **cheque** (a nombre de quien lo cobra en ventanilla) o como **nota de
   débito** (retiro en ventanilla con boleta, retiro en cajero). La «transferencia a la caja» **no cabe**: no hay caja a
   donde transferir (llegará con Caja chica).
3. **Órdenes de CP4-B2a ya en `main`** (`core/contratos/bancos.contratos.ts`): `emitir_cheque_de_origen`,
   `registrar_nota_de_origen`, `anular_movimiento_de_origen`, `fijar_desglose_de_conceptos` y el aviso
   `movimiento_por_cambiar`. Un movimiento **con origen** ya no se corrige, elimina ni blanquea en Bancos; anularlo manda
   el aviso; con Cuentas por pagar inactivo se rechaza (`RevisorDeCambios`). `fijar_desglose_de_conceptos` con origen
   **cambia el concepto del movimiento al de mayor monto** (el que se ve en las listas); sin origen solo acepta notas
   marcadas.
4. **Conceptos de sistema** (`CONCEPTOS_DE_SISTEMA`, `0032`): `transferencia` y `saldo_inicial` (sin flujo),
   `pago_a_proveedor` (Operación), `pago_a_proveedor_de_activo` (Inversión), `reintegro_de_proveedor(_de_activo)`,
   `sin_clasificar`. Sugeridos: «Fondo de caja chica» (**sin flujo**) y «Reintegro de caja chica» (Operación): el
   precedente es que llevar dinero del banco a una caja **no es flujo** y gastarlo sí. `ClaveDeConceptoDeSistema` es una
   unión cerrada en el contrato.
5. **Migraciones**: Cuentas por pagar va en la `0008`; Bancos en la `0032`. Las siguientes libres son la **`0009`** de
   Cuentas por pagar y la **`0033`** de Bancos (verificar contra `main` al generarlas: nunca dos ramas a la vez).
6. **`AccionAuditada`** ya tiene `anular`, `corregir`, `reabrir`, `ajustar`: no hace falta una nueva.

## 2. Modelo propuesto

### 2.1 Tres hechos, no uno

| Hecho | Qué es | Dónde | Mueve dinero en Bancos |
|---|---|---|---|
| **Retiro de efectivo para pagos** | Sale dinero del banco a manos de una persona (el **custodio**) para pagar proveedores. **No es un pago**: es efectivo de la empresa en otra bolsa | `retiros_de_efectivo` (nuevo) | Sí: cheque o nota de débito creados por orden, con origen = el retiro |
| **Pago en efectivo** | El custodio entrega efectivo al proveedor contra los cargos autorizados de una contraseña, y el proveedor firma el recibo | `pagos` con `forma = 'efectivo'` y `retiro_id` | No: consume el disponible del retiro |
| **Liquidación del retiro** | Se cierra el retiro: lo que sobró se **deposita** de vuelta y, si falta efectivo, se deja constancia del **faltante** con motivo | Columnas de `retiros_de_efectivo` | Por el depósito, sí (nota de crédito por orden) |

```
disponible del retiro = monto − Σ pagos en efectivo vigentes del retiro − devuelto − faltante
```

Un retiro cubre **N pagos** de **varios proveedores y varias contraseñas** (como la nota ligada). Cada pago sigue siendo
de **una** contraseña (o de varias del mismo proveedor si se aprueba §10), con su número, su recibo y su retención.

### 2.2 Opciones para registrar el retiro (pregunta CP4-E-a)

| Opción | Cómo | A favor | En contra |
|---|---|---|---|
| **A. Retiro creado desde Cuentas por pagar (recomendada)** | Pantalla «Retiros de efectivo» en Cuentas por pagar: cuenta, cheque o nota de débito, monto, fecha, custodio. Cuentas por pagar crea la fila y ordena a Bancos el cheque o la nota **con origen = el retiro** | Las reglas de Bancos para lo que tiene origen **ya existen** (no se corrige, elimina ni blanquea; anular avisa; módulo inactivo rechaza): Bancos casi no cambia. Hay dónde guardar custodio, número, estado y liquidación. Mismo patrón que el pago con cheque | El usuario no puede «convertir» un cheque que ya escribió en Bancos: lo anula allá y lo vuelve a hacer aquí (o se agrega B después) |
| B. Movimiento registrado en Bancos y **marcado** (como la nota marcada) | En Bancos, casilla «Efectivo para pagos de Cuentas por pagar» en un cheque o nota de débito; la marca es un concepto de sistema nuevo | El usuario trabaja donde ya escribe sus cheques | Hoy solo se marcan **notas de débito** (la marca es el concepto `pago_a_proveedor`): habría que marcar cheques, sumar otra marca al `RevisorDeCambios`, a `fijar_desglose` sin origen, a desmarcar y a la conciliación. Y el custodio, el número y la liquidación no tienen dónde vivir en Bancos (Bancos no puede leer Cuentas por pagar): Cuentas por pagar tendría que crear su fila al primer uso. Más piezas y dos lugares para lo mismo |
| C. Sin retiro: «efectivo» suelto en el pago | El pago en efectivo no apunta a nada de Bancos | Simple | El efectivo no sale de ningún lado: Bancos no lo ve, el flujo no lo cuenta, no se sabe cuánto tiene el custodio ni qué sobró. Es lo que hará Caja chica bien hecho |

**Recomendación: A.** Si después el usuario quiere aprovechar un cheque ya registrado en Bancos, se agrega B como
«ligar un retiro registrado en Bancos» sin cambiar las tablas (la fila del retiro existiría igual; solo cambia quién
crea el movimiento).

### 2.3 Qué formas de retiro caben con lo que Bancos ya tiene (pregunta CP4-E-b)

| Forma | Cabe | Cómo |
|---|---|---|
| **Cheque** a nombre del custodio (o de la empresa) que se cambia en ventanilla | **Sí** | `bancos.emitir_cheque_de_origen`. Beneficiario: el que escriba el usuario, por omisión el custodio; **no negociable apagado por omisión** (se cambia en ventanilla; el contador confirma, §13). **No posfechado**: fecha hoy o pasada (`RetiroPosfechado`) |
| Cheque **al portador** | **A validar** (§13): el beneficiario es texto libre, así que técnicamente cabe escribiendo «Al portador»; la recomendación es **no** ofrecerlo como opción y que el contador diga si se permite | — |
| **Nota de débito** (retiro en ventanilla con boleta, retiro en cajero) | **Sí** | `bancos.registrar_nota_de_origen` con `tipo = 'debito'`, referencia = número de la boleta o del comprobante del cajero. Fecha hoy o pasada |
| Transferencia a la caja | **No** | No hay cuenta de caja en Bancos; llega con Caja chica (§9) |

## 3. Datos

### 3.1 Tabla nueva `cuentas_por_pagar.retiros_de_efectivo`

Por empresa (`politicaPorEmpresa()`), sin alcance por registro, sin proveedor (cubre a varios).

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK; es el `documento_de_origen_id` del cheque o nota del retiro **y** del depósito de la devolución |
| `empresa_id` | uuid | no | FK `core.empresas` on delete cascade |
| `numero`, `anio_de_numero` | integer | no | Correlativo `cuentas-por-pagar.retiros` (`anio_de_numero default 0`); único `retiros_numero_unico (empresa_id, anio_de_numero, numero)`; check `retiros_numero_positivo` |
| `forma` | text | no | check `retiros_forma_valida`: `in ('cheque', 'nota_de_debito')` |
| `fecha` | date | no | La del cheque o la nota (no futura: lo revisa el dominio, la fecha de «hoy» es de Guatemala) |
| `monto` | numeric(14,2) | no | check `retiros_monto_positivo`: `> 0` |
| `movimiento_id` | uuid | no | FK `retiros_movimiento_fk → bancos.movimientos (id)`, **no action**; único `retiros_movimiento_unico (movimiento_id)` (también es su índice) |
| `custodio` | text | no | Quien lleva y entrega el efectivo; check `retiros_custodio_valido`: `char_length between 1 and 150 and = btrim` |
| `observaciones` | text | sí | check `retiros_observaciones_validas` (1–500, sin espacios al borde) |
| `estado` | text | no | `default 'abierto'`; check `retiros_estado_valido`: `in ('abierto', 'liquidado', 'anulado')` |
| `fecha_de_liquidacion` | date | sí | |
| `liquidado_en` | timestamptz | sí | |
| `liquidado_por` | uuid | sí | |
| `devuelto` | numeric(14,2) | no | `default 0`; check `retiros_devuelto_valido`: `>= 0`. Lo que se depositó de vuelta |
| `movimiento_de_devolucion_id` | uuid | sí | FK `retiros_devolucion_fk → bancos.movimientos (id)`, no action; único parcial `retiros_devolucion_unica (movimiento_de_devolucion_id) where … is not null` |
| `faltante` | numeric(14,2) | no | `default 0`; check `retiros_faltante_valido`: `>= 0` |
| `motivo_de_faltante` | text | sí | check `retiros_motivo_de_faltante`: `(faltante > 0) = (motivo_de_faltante is not null)`; rango 1–300 |
| `anulado_en`, `anulado_por`, `motivo_de_anulacion` | | sí | Como `pagos`, con `retiros_anulacion_completa` y rango 1–300 |
| `...marcasDeTiempo`, `...autoria` | | | `creado_por` = quien retiró |

Checks de estado:

- `retiros_liquidacion_completa`: `(estado = 'liquidado') = (fecha_de_liquidacion is not null and liquidado_en is not
  null and liquidado_por is not null)`.
- `retiros_abierto_sin_liquidar`: `estado = 'liquidado' or (devuelto = 0 and faltante = 0 and
  movimiento_de_devolucion_id is null)`.
- `retiros_devolucion_con_deposito`: `(devuelto > 0) = (movimiento_de_devolucion_id is not null)`.
- `retiros_liquidacion_no_pasa_del_monto`: `devuelto + faltante <= monto`.

Lo que revisa el dominio (otras filas, con el retiro bloqueado): `Σ pagos vigentes + devuelto + faltante = monto` al
liquidar; `Σ pagos vigentes <= monto − devuelto − faltante` siempre (prueba de consistencia, como en CP3).

Otros índices y únicos:

| Nombre | Definición | Para |
|---|---|---|
| `retiros_llave_unica` | unique `(id, empresa_id)` | Destino de la llave compuesta desde `pagos` (el retiro es de la misma empresa) |
| `retiros_lista_idx` | `(empresa_id, estado, fecha)` | Lista «Retiros por liquidar» |

### 3.2 Cambios en `cuentas_por_pagar.pagos`

| Columna o restricción | Regla |
|---|---|
| `forma` | `pagos_forma_valida` suma `'efectivo'` |
| `retiro_id` uuid, **nulo** | FK `pagos_retiro_fk (retiro_id, empresa_id) → retiros_de_efectivo (id, empresa_id)`, no action; índice `pagos_retiro_idx (retiro_id) where retiro_id is not null`. Check `pagos_retiro_de_su_forma`: `(forma = 'efectivo') = (retiro_id is not null)` |
| `pagos_movimiento_de_su_forma` | Pasa a `(forma in ('cuenta_de_apertura', 'efectivo')) = (movimiento_id is null)`: el movimiento es del **retiro**, no del pago (así `pagos_movimiento_creado_unico` y el aviso de Bancos no se confunden) |
| `pagos_referencia_de_su_forma` | Suma `'efectivo'`: número del recibo **del proveedor**, si le dio uno (opcional) |
| `recibido_por` text, nulo | Nombre de quien recibió el efectivo por el proveedor (el que firma). Check `pagos_recibido_por_de_su_forma`: `recibido_por is null or forma = 'efectivo'`; rango 1–150 sin espacios al borde. Opcional al registrar: se puede dejar en blanco y escribirse a mano en el recibo |
| `motivo_sin_bancarizar` text, nulo | Solo si se usó la excepción de bancarización (§5, opción B): check `pagos_motivo_sin_bancarizar_de_su_forma`: `motivo_sin_bancarizar is null or forma = 'efectivo'`; rango 1–300 |

### 3.3 Migración `0009_cp4_pagos_en_efectivo` (Cuentas por pagar)

`npm run bd:generar -w servidor -- cuentas-por-pagar cp4_pagos_en_efectivo`, revisada a mano. Si el usuario aprueba
también §10 (varias contraseñas), esa va **antes** como `0009_cp4_pago_de_varias_contrasenas` y esta pasa a la
**`0010`** (§11 fija el orden). Pasos:

1. `create table retiros_de_efectivo` con checks, únicos, índices, llaves (las dos a `bancos.movimientos`) y RLS.
2. `alter table pagos`: `drop constraint` y `add constraint` de `pagos_forma_valida`, `pagos_movimiento_de_su_forma` y
   `pagos_referencia_de_su_forma` con su texto nuevo; `add column retiro_id`, `recibido_por`, `motivo_sin_bancarizar`;
   la llave, el índice y los tres checks nuevos.

**Datos existentes:** ninguno que convertir (CP4 no tiene casos de uso en `main`; en desarrollo `pagos` está vacío). Las
restricciones que cambian solo **amplían** lo permitido: ninguna fila vieja puede fallar. Sin migración de permisos (son
nuevos). El correlativo `cuentas-por-pagar.retiros` no necesita fila previa.

### 3.4 Bancos: migración `0033_cp4_efectivo_para_pagos`

Solo conceptos (como la `0032`): dos conceptos de sistema nuevos, en `CONCEPTOS_DE_SISTEMA` y, en las empresas que ya
tienen catálogo, por `insert` (a uno sin clave con el mismo nombre se le pone la clave; repetible):

| Clave | Nombre | Aplica a | Flujo | Para |
|---|---|---|---|---|
| `efectivo_para_pagos` | Efectivo para pagos a proveedores | débito | **Sin flujo** (del banco a la caja: sigue siendo efectivo, NIIF para las Pymes 7.2 y 7.17) | El retiro mientras no se gaste, y lo que sobra o falta |
| `devolucion_de_efectivo_para_pagos` | Devolución de efectivo para pagos | crédito | **Sin flujo** | El depósito del sobrante |

`ClaveDeConceptoDeSistema` (`core/contratos/bancos.contratos.ts`) suma las dos claves. Ningún cambio de reglas en Bancos:
el retiro y su devolución **tienen origen**, así que ya les aplica todo lo de CP4-B2a.

## 4. Reglas

### 4.1 Registrar el retiro (`RegistrarRetiroDeEfectivo`, `retiros.crear`)

1. Datos: forma, cuenta bancaria (nota) o chequera y cheque (cheque), fecha (hoy por omisión; **no futura**:
   `FechaDeRetiroInvalida`), monto, custodio, beneficiario del cheque (por omisión el custodio), referencia de la nota
   (boleta), observaciones. Genera el id antes.
2. Orden a Bancos: `emitir_cheque_de_origen` (con `noNegociable` del usuario, apagado por omisión) o
   `registrar_nota_de_origen` (`tipo = 'debito'`), con `origen = { modulo: 'cuentas-por-pagar', documentoId: <id del
   retiro> }` y `conceptos = [{ efectivo_para_pagos, monto }]`. Bancos aplica sus reglas (saldo, sobregiro, chequera, mes
   conciliado). Si lanza, nada se guarda.
3. Número `correlativos.siguiente('cuentas-por-pagar.retiros', fecha)`; inserta (`estado = 'abierto'`).
4. Sin auditoría (alta). Evento `cuentas-por-pagar.retiro_registrado`. Responde el `RetiroDto` con los avisos de Bancos.
5. Aviso que no bloquea, si el monto es **mayor o igual al umbral de bancarización**: «Va a sacar Q… en efectivo para
   pagar proveedores. Un pago en efectivo a un proveedor que llegue a Q30,000.00 en el mes no respalda el gasto ni el
   crédito fiscal (Decreto 20-2006, art. 20).»

### 4.2 Pagar en efectivo (`RegistrarPago` con `forma = 'efectivo'`, `pagos.pagar-en-efectivo`)

Igual que el pago con cheque (CP4 §5.1: contraseña vigente, cargos autorizados y en ella, monto `<=` saldo, fecha mínima
= emisión del DTE y fecha de inicio, retención en el primer pago, diferencias de centavos como residuo, avisos de
constancia y de entero, número `cuentas-por-pagar.pagos`), salvo:

- **No hay orden de emitir.** El usuario elige un retiro **abierto** con disponible `> 0` (`RetiroNoDisponible`: anulado,
  liquidado o de otra empresa).
- **Bloqueos** (orden Empresas → Bancos → Cuentas por pagar, CP4 §10.6): carga inicial si hace falta; el movimiento del
  retiro en Bancos (`for update` desde `infraestructura`, solo para bloquear, como la nota ligada); el retiro; la
  contraseña; los cargos.
- `monto del pago <= disponible` (`PagoMayorQueElRetiro`: «Al retiro N solo le quedan Q… en efectivo»). Si el efectivo
  **no alcanza**, se hace otro retiro: no se paga «de la bolsa del custodio» (eso es *Cuentas por liquidar*, fuera de
  esta versión).
- **Fecha**: por omisión hoy; **no futura** (no hay efectivo posfechado) ni anterior a la del retiro, más las mínimas de
  CP4 §5.1.5 (`FechaDePagoInvalida`).
- **Bancarización**: §5. Puede bloquear (si se aprueba la opción B o C).
- **Desglose del retiro** (después de insertar, con el retiro bloqueado): Cuentas por pagar suma, en **todos** los pagos
  vigentes del retiro, lo aplicado a cargos con y sin `tiene_activo_fijo`, y manda `bancos.fijar_desglose_de_conceptos`
  (con origen = el retiro) con `pago_a_proveedor` (sin activo), `pago_a_proveedor_de_activo` (con activo) y
  `efectivo_para_pagos` (el resto: disponible + devuelto + faltante). Idempotente; se vuelve a mandar al anular o
  reaplicar un pago del retiro y al liquidarlo o reabrirlo. El concepto que se ve en las listas de Bancos pasa a ser el
  de mayor monto (lo hace Bancos): no importa, el retiro se reconoce por su origen.
- `recibido_por` y `referencia` (recibo del proveedor) opcionales. `movimiento_id` nulo.
- Evento `pago_registrado` con `forma = 'efectivo'`, `efecto = 'efectivo'`, `retiroId` y `sinBancarizar` (§8).

### 4.3 Recibo del pago en efectivo (pregunta CP4-E-c)

El comprobante de pago de CP4 (§9 del diseño; leyenda «no es documento tributario») **es** el recibo: misma página
(`ComprobanteDePago.vue`) con el título **«Recibo de pago en efectivo»** cuando la forma es `efectivo`.

- **Número**: el del pago (`cuentas-por-pagar.pagos`), recomendado: un solo correlativo para todos los pagos, como ya
  decidió CP4-m. Alternativa: correlativo propio de recibos de efectivo (`cuentas-por-pagar.recibos-de-efectivo`), solo
  si el usuario quiere talonarios separados.
- **Contenido**: empresa (nombre y NIT), proveedor (nombre del NIT y NIT), número y fecha, retiro N y custodio que
  entrega, contraseña, por documento (tipo, serie y número, total, retención con su constancia o «constancia por
  emitir», notas aplicadas, **pagado en efectivo**, saldo que queda), total en números y **en letras**, recibo del
  proveedor (si lo dio), leyendas «Las retenciones se documentan con su constancia.» y **«Este recibo no es un documento
  tributario.»**, firmas **«Entregado por (custodio)»** y **«Recibí conforme (nombre, DPI y firma de quien recibe por el
  proveedor)»** (el nombre sale de `recibido_por` si se escribió; el DPI va a mano, no se guarda).
- **Original y copia** en la misma hoja (como la contraseña de CP3): el original firmado se queda en la empresa.
- Guardar la **foto del recibo firmado** (archivo, con la revisión de archivos de `seguridad-de-archivos.md`) queda como
  pendiente (P-CPE-1), no en esta adenda.

### 4.4 Anular un pago en efectivo (`AnularPago`, `pagos.anular`)

No tiene movimiento propio: nada se anula en Bancos.

1. Bloquea el movimiento del retiro (Bancos), el retiro y el pago. Pago vigente (`PagoYaAnulado`).
2. `REGLAS_PARA_ANULAR_PAGO`: `noEstarCobrado` **no aplica** (no hay cheque que cobrar); se suma **`retiroAbierto`**: si
   el retiro está **liquidado**, se rechaza con `RetiroLiquidado` («El retiro N ya se liquidó: reábralo para anular este
   pago»), porque el efectivo que «vuelve» tendría que volver a una liquidación cerrada.
3. Estado `anulado`, líneas `vigente = false`, anula sus ajustes de diferencia (como CP4 §5.9); el retiro recupera
   disponible; se vuelve a fijar el desglose.
4. Auditoría `anular`, recurso `cuentas-por-pagar.pagos`, `anterior` = `PagoDto`, con motivo (que debería decir qué pasó
   con el efectivo: «el proveedor lo devolvió», «se registró en el proveedor equivocado»…). Evento `pago_anulado` con
   `anulacionEnBancos = null`.

**Reaplicar** (`ReaplicarPago`, `pagos.reaplicar`): igual que CP4 §5.11 (mismos cargos de la contraseña, misma suma),
bloqueando primero el movimiento y el retiro; se vuelve a fijar el desglose. Se permite con el retiro liquidado (el
efectivo no cambia).

### 4.5 Liquidar y reabrir el retiro (`retiros.liquidar`)

**Liquidar** (`LiquidarRetiro`), con el retiro abierto:

1. Bloquea el movimiento del retiro, el retiro y sus pagos. Calcula `sobrante = monto − Σ pagos vigentes`.
2. El usuario dice cuánto **devuelve** (depósito) y cuánto **falta**, con `devuelto + faltante = sobrante`
   (`LiquidacionNoCuadra`). Faltante `> 0` exige motivo (`MotivoDeFaltanteObligatorio`).
3. Si `devuelto > 0`: orden `registrar_nota_de_origen` (`tipo = 'credito'`, cuenta elegida —por omisión la del retiro—,
   fecha, referencia = boleta de depósito, `conceptos = [{ devolucion_de_efectivo_para_pagos, devuelto }]`, origen = el
   retiro). Si lanza, nada cambia.
4. Fecha de liquidación: no futura, ni anterior a la del retiro ni a la del último pago vigente.
5. `estado = 'liquidado'`; fija el desglose del retiro (el faltante queda en `efectivo_para_pagos` mientras el contador
   no diga otra cosa, §13).
6. Auditoría: **solo si hay faltante**, `ajustar`, recurso `cuentas-por-pagar.retiros`, `anterior` = `RetiroDto`, con
   el motivo (es efectivo que se da por perdido o a cargo del custodio). Sin faltante, sin auditoría (es el cierre
   normal; queda `liquidado_por`). Evento `retiro_liquidado`.

**Reabrir** (`ReabrirRetiro`), con el retiro liquidado: con motivo; si hubo devolución, orden
`anular_movimiento_de_origen` del depósito (Bancos decide con o sin inverso; si está conciliado, Bancos lo rechaza con su
regla de mes conciliado y no se reabre). Limpia `devuelto`, `faltante`, `motivo_de_faltante`, la liquidación y el
movimiento de devolución; `estado = 'abierto'`; fija el desglose. Auditoría `reabrir`, recurso
`cuentas-por-pagar.retiros`, `anterior` = `RetiroDto`. Evento `retiro_reabierto`.

**Sin liquidar**: un retiro puede quedar abierto (efectivo en manos del custodio). La lista «Retiros por liquidar» los
muestra con su antigüedad y disponible; aviso fijo en la pantalla si alguno es de un mes anterior: «El retiro N es de
mm/aaaa y aún tiene Q… sin usar: liquídelo o úselo; ese efectivo es de la empresa y está a cargo de (custodio).»

### 4.6 Anular el retiro (`AnularRetiro`, `retiros.anular`) y avisos de Bancos

**Desde Cuentas por pagar**, con motivo y fecha del inverso: el retiro está **abierto** y **sin pagos vigentes**
(`RetiroConPagos`: «El retiro N tiene los pagos …: anúlelos primero»); `noEstarCobrado` sí aplica (cheque conciliado →
`RetiroCobrado`: «El banco ya pagó el cheque del retiro N: deposite el efectivo y liquide el retiro»). Orden
`anular_movimiento_de_origen`; `estado = 'anulado'`; auditoría `anular`, recurso `cuentas-por-pagar.retiros`; evento
`retiro_anulado` con `anulacionEnBancos`.

**Por aviso de Bancos** (`bancos.movimiento_por_cambiar`, el manejador de CP4-4 suma este caso: busca el movimiento en
`retiros_de_efectivo.movimiento_id` y en `movimiento_de_devolucion_id`):

| Cambio que pide Bancos | Movimiento del **retiro** | Movimiento de la **devolución** |
|---|---|---|
| `anular` (también cheques caducos en lote) | Con pagos vigentes → **rechaza** `RetiroConPagos`; liquidado → rechaza `RetiroLiquidado`; abierto sin pagos → anula el retiro (pasos de arriba sin volver a ordenar) | **Reabre** el retiro (como `ReabrirRetiro`, sin volver a ordenar), con el motivo del aviso |
| `eliminar`, `blanquear`, `corregir` | Ya los rechaza Bancos por tener origen; el manejador rechaza igual por si acaso: `MovimientoDeCuentasPorPagar` («Lo emitió Cuentas por pagar (retiro N)…») | Igual |
| `reclasificar`, `desmarcar` | No aplica (con origen no se reclasifica ni se marca) | No aplica |

Idempotente, en la transacción de Bancos. Con Cuentas por pagar inactivo, Bancos ya rechaza (`ModuloDeOrigenInactivo`).

## 5. Bancarización del pago en efectivo (pregunta CP4-E-d)

El Decreto 20-2006, art. 20 (Ley Antievasión II) pide que los pagos **desde Q30,000.00** que generen costos o gastos
deducibles o créditos fiscales se hagan por medios bancarios; si no, ese costo y ese crédito fiscal **no se respaldan**
(dictamen `dictamen-cp4-2026-11-13.md`, C-CP4-2; la suma por mes tiene certeza media). Pagar en efectivo es justo lo que
la norma no reconoce. Se usa la misma variable `cuentas-por-pagar.bancarizacion.umbral` (instalación, Q30,000).

**Cuándo se dispara** (a validar por el contador, §13): con este pago incluido,

1. algún cargo del pago tiene **total** `>=` umbral (la operación es de Q30,000 o más, aunque se pague por partes), **o**
2. el pago en efectivo es `>=` umbral, **o**
3. la **suma del mes calendario** de lo pagado al proveedor por **todas** las formas (cheques, notas, ligadas y
   efectivo; no la cuenta de apertura) es `>=` umbral (fraccionamiento).

**Opciones:**

| Opción | Qué pasa | A favor | En contra |
|---|---|---|---|
| A. Aviso fuerte | La ventana pide marcar «Entiendo que este pago no respalda el gasto ni el crédito fiscal» antes de confirmar; no bloquea | Simple; respeta que el dueño decide | Es fácil de ignorar; el costo fiscal llega meses después |
| **B. Bloqueo con permiso y motivo (recomendada)** | Se rechaza (`EfectivoSobreElUmbral`) salvo que el usuario tenga **`pagos.efectivo-sin-bancarizar`** y escriba un **motivo** (1–300, se guarda en `pagos.motivo_sin_bancarizar`); el evento lleva `sinBancarizar = true` para que Contabilidad lo marque como **no deducible** | Separa quien opera de quien asume el riesgo fiscal; deja rastro en el pago y en el reporte | Un permiso más |
| C. Bloqueo total | Nunca se paga en efectivo sobre el umbral | Cero riesgo | Hay casos reales (proveedor del agro sin cuenta) donde el dueño acepta perder la deducción |

**Recomendación: B.** El motivo y quien lo registró quedan en el pago (`creado_por`); no hace falta auditoría aparte (es
un alta). Texto del aviso o del rechazo (lo coteja el contador): «Bancarización (Decreto 20-2006, art. 20): los pagos a un
mismo proveedor que suman Q30,000.00 o más en el mes deben hacerse por cheque, transferencia o tarjeta a nombre del
proveedor. Si paga en efectivo, ese costo **no es deducible** del ISR y el IVA de sus facturas **no es crédito fiscal**.
El IVA de la factura S-N ya se tomó como crédito fiscal en mm/aaaa: consulte a su contador.»

**Consecuencias:**

- La regla 3 hace que el aviso de los **otros** pagos (CP4 §5.7) también sume el efectivo del mes. Cambia el texto de
  §5.7 («cuentan cheques, notas de débito y notas ligadas» → «y efectivo»); a validar.
- La regla se evalúa **al registrar**: un pago en efectivo de Q5,000 del día 3 no avisa, y un cheque de Q28,000 del día
  20 hace que el mes llegue al umbral. El reporte de CP5 «Pagos en efectivo sobre el umbral» lo calcula **en vivo** por
  mes y proveedor, para que el contador vea también los que se volvieron problema después.
- **Crédito fiscal ya tomado**: Libro de compras registró el IVA en el mes de la factura. Si después se paga en efectivo
  sobre el umbral, el crédito no procede: Arrancar **no** rectifica nada (solo avisa); el contador decide (§13).
- El **retiro** en sí no tiene efecto de bancarización (es dinero de la empresa); solo el aviso de §4.1.

## 6. Contabilidad (para los eventos; Contabilidad no existe todavía)

| Hecho | Partida | Flujo de efectivo |
|---|---|---|
| Retiro | Debe **Efectivo para pagos a proveedores** (caja, a cargo del custodio) / Haber Bancos | **No es flujo**: del banco a la caja sigue siendo efectivo |
| Pago en efectivo | Debe Proveedores / Haber Efectivo para pagos a proveedores | **Operación** («Pagos a proveedores»), o **Inversión** si el cargo es de activo fijo |
| Devolución (depósito del sobrante) | Debe Bancos / Haber Efectivo para pagos a proveedores | No es flujo |
| Faltante | Debe **Cuenta por cobrar al custodio** o **pérdida** (la elige el contador) / Haber Efectivo para pagos a proveedores | A decidir por el contador (§13) |
| Retenciones | Ya están en Libro de compras (se descuentan una vez, como en los otros pagos) | — |

**Cómo se ve en el flujo de efectivo de Bancos** (el único que existe hoy, hecho sobre movimientos del banco): el
movimiento del retiro lleva el **desglose** de §4.2: la parte pagada en Operación o Inversión, el resto **sin flujo**; el
depósito de la devolución, sin flujo. Así el flujo cuenta lo que de verdad se pagó y nada de lo que sobró.

**Limitación** (para la QA y el contador): el desglose vive en el movimiento del retiro, así que el flujo pone el pago en
la **fecha del retiro**, no en la del pago. Si se retira el 30 y se paga el 2 del mes siguiente, el pago sale en el mes
del retiro; y el flujo de un mes ya impreso cambia al pagar, anular, reaplicar o liquidar (lo mismo que con la nota
ligada, CP4 §10.10). Contabilidad lo hará bien con la fecha del evento. Alternativa si el contador no la acepta: que el
reporte de flujo de Bancos lea los pagos en efectivo por una orden nueva a Cuentas por pagar (Bancos no puede leer sus
tablas); es más trabajo y se deja como pendiente.

## 7. Permisos, errores, API y cliente

### 7.1 Permisos (`modulo.ts` de Cuentas por pagar)

| Permiso | Para |
|---|---|
| `cuentas-por-pagar.retiros.ver` | Lista y ficha de retiros, disponible al pagar |
| `cuentas-por-pagar.retiros.crear` | Registrar un retiro (crea el cheque o la nota en Bancos sin pedir permisos de Bancos, como `pagos.emitir`) |
| `cuentas-por-pagar.retiros.liquidar` | Liquidar y reabrir un retiro (crea o anula el depósito) |
| `cuentas-por-pagar.retiros.anular` | Anular un retiro sin pagos |
| `cuentas-por-pagar.pagos.pagar-en-efectivo` | Pagar con el efectivo de un retiro |
| `cuentas-por-pagar.pagos.efectivo-sin-bancarizar` | Solo con la opción B de §5: pagar en efectivo sobre el umbral, con motivo |

Sin `editar` ni `eliminar` (el retiro se anula o se reabre), sin Excel (Operación). Ninguno `soloSuperacceso`. Sin
migración de permisos. `pagos.anular` y `pagos.reaplicar` sirven también para el efectivo.

### 7.2 Auditoría

| Hecho | Acción | Recurso | `anterior` |
|---|---|---|---|
| Registrar retiro, pagar en efectivo, liquidar sin faltante | ninguna (alta o cierre normal) | — | — |
| Liquidar con faltante | `ajustar` | `cuentas-por-pagar.retiros` | `RetiroDto`; motivo |
| Reabrir (desde aquí o por aviso de Bancos) | `reabrir` | `cuentas-por-pagar.retiros` | `RetiroDto`; motivo |
| Anular retiro (desde aquí o por aviso) | `anular` | `cuentas-por-pagar.retiros` | `RetiroDto`; motivo |
| Anular o reaplicar un pago en efectivo | `anular` / `corregir` (CP4) | `cuentas-por-pagar.pagos` | `PagoDto`; motivo |

### 7.3 Errores nuevos (`dominio/errores-de-retiros.ts` y `errores-de-pagos.ts`)

| Clase | Familia | Código | Mensaje |
|---|---|---|---|
| `FechaDeRetiroInvalida` | `DatoInvalido` (`fecha`) | `fecha_de_retiro_invalida` | «El retiro no puede tener fecha futura.» |
| `RetiroNoDisponible` | `DatoInvalido` (`retiroId`) | `retiro_no_disponible` | «Ese retiro está liquidado, anulado o no existe.» |
| `PagoMayorQueElRetiro` | `DatoInvalido` (`aplicaciones`) | `pago_mayor_que_el_retiro` | «Al retiro N solo le quedan Q… en efectivo.» |
| `EfectivoSobreElUmbral` | `ReglaDeNegocioInfringida` | `efectivo_sobre_el_umbral` | Texto de §5 (solo opciones B y C) |
| `MotivoSinBancarizarObligatorio` | `DatoInvalido` (`motivoSinBancarizar`) | `motivo_sin_bancarizar_obligatorio` | «Escriba por qué se paga en efectivo sobre el umbral.» |
| `RetiroConPagos` | `ReglaDeNegocioInfringida` | `retiro_con_pagos` | «El retiro N tiene los pagos …: anúlelos primero.» |
| `RetiroLiquidado` | `ReglaDeNegocioInfringida` | `retiro_liquidado` | «El retiro N ya se liquidó: reábralo primero.» |
| `RetiroCobrado` | `ReglaDeNegocioInfringida` | `retiro_cobrado` | «El banco ya pagó el cheque del retiro N: deposite el efectivo y liquide el retiro.» |
| `RetiroYaAnulado` / `RetiroNoLiquidado` | `ReglaDeNegocioInfringida` | `retiro_ya_anulado` / `retiro_no_liquidado` | «El retiro N ya está anulado.» / «El retiro N no está liquidado.» |
| `LiquidacionNoCuadra` | `DatoInvalido` (`devuelto`) | `liquidacion_no_cuadra` | «Lo devuelto más lo que falta debe ser Q… (lo que no se pagó).» |
| `MotivoDeFaltanteObligatorio` | `DatoInvalido` (`motivoDeFaltante`) | `motivo_de_faltante_obligatorio` | «Escriba por qué falta efectivo.» |
| `FechaDeLiquidacionInvalida` | `DatoInvalido` (`fecha`) | `fecha_de_liquidacion_invalida` | «La fecha no puede ser futura ni anterior al dd/mm/aaaa.» |

`MovimientoDeCuentasPorPagar`, `PagoYaAnulado`, `FechaDePagoInvalida` y los de Bancos pasan tal cual. Mensajes de
restricciones (`MENSAJES_POR_RESTRICCION`): ninguno nuevo (los únicos son errores de programación; los checks los ataja
el dominio antes).

### 7.4 Eventos (`core/contratos/cuentas-por-pagar.contratos.ts`)

- `EfectoDePago` suma `'efectivo'`; `pago_registrado` suma `forma: … | 'efectivo'`, `retiroId: string | null` y
  `sinBancarizar: boolean`; `pago_anulado` y `pago_reaplicado` suman `retiroId`.
- Nuevos: `retiro_registrado { empresaId, retiroId, numero, forma, fecha, montoCentavos, movimientoId,
  cuentaBancariaId, custodio }`, `retiro_liquidado { …, fecha, devueltoCentavos, faltanteCentavos,
  movimientoDeDevolucionId }`, `retiro_reabierto { …, fecha, fechaDeLiquidacion, devueltoCentavos, faltanteCentavos,
  anulacionEnBancos }`, `retiro_anulado { …, fecha, fechaOriginal, anulacionEnBancos }`. Nadie los escucha todavía.

### 7.5 API (prefijo `/api/cuentas-por-pagar`)

| Método y ruta | Permiso | Cuerpo / consulta | Respuesta |
|---|---|---|---|
| `GET /retiros` | `retiros.ver` | `estado?` (`abierto` por omisión), `desde?`, `hasta?`, `soloConDisponible?`, `pagina`, `limite` | página de `RetiroResumenDto` (número, forma y documento bancario, fecha, custodio, monto, pagado, disponible, estado, antigüedad) |
| `GET /retiros/:id` | `retiros.ver` | — | `RetiroDto` (con sus pagos: número, proveedor, contraseña, monto, estado; liquidación; movimientos; `puedeAnular`, `puedeLiquidar`, `puedeReabrir`) |
| `POST /retiros` | `retiros.crear` | `{ forma, fecha?, chequeraId?, chequeId?, noNegociable?, beneficiario?, cuentaBancariaId?, referencia?, monto, custodio, observaciones? }` | 201, `RetiroDto` con `avisos` |
| `POST /retiros/:id/liquidar` | `retiros.liquidar` | `{ fecha?, devuelto, cuentaBancariaId?, referencia?, faltante, motivoDeFaltante? }` | `RetiroDto` |
| `POST /retiros/:id/reabrir` | `retiros.liquidar` | `{ motivo, fecha? }` | `RetiroDto` |
| `POST /retiros/:id/anular` | `retiros.anular` | `{ motivo, fecha? }` | `RetiroDto` |
| `POST /contrasenas/:id/pagos/efectivo` | `pagos.pagar-en-efectivo` (y `ajustes.crear` con diferencias) | La solicitud de CP4 §8 con `forma = 'efectivo'`, `retiroId`, `recibidoPor?`, `referencia?`, `motivoSinBancarizar?` | 201, `PagoDto` (con `retiro { id, numero, custodio }` y `recibidoPor`) |

`GET /contrasenas/:id/para-pagar` suma `retirosAbiertos` (número, custodio, disponible) si el usuario tiene
`pagos.pagar-en-efectivo`, y la suma del mes **en efectivo** y **total** para la regla de §5. El comprobante
(`GET /pagos/:id/comprobante`) suma `retiro`, `custodio`, `recibidoPor` y `totalEnLetras`. La prueba de API cubre la ruta
sin su permiso (403) y el motivo de la excepción sin `pagos.efectivo-sin-bancarizar` (403 o `EfectivoSobreElUmbral`).

### 7.6 Cliente

- `paginas/Retiros.vue` (Operación, menú «Retiros de efectivo» dentro de Cuentas por pagar): lista «por liquidar» con
  disponible y antigüedad (`TarjetaDeRegistro`), filtro de estado, botón «Retirar efectivo».
- `componentes/VentanaDeRetiro.vue`: forma (Cheque / Retiro en ventanilla o cajero), cuenta y chequera con el siguiente
  número (de `GET /pagos/medios`), monto, fecha, custodio, beneficiario (cheque, por omisión el custodio), boleta (nota),
  aviso de §4.1. Lógica pura en `composables/retiros/edicion-de-retiro.ts` con su `*.prueba.ts`.
- `paginas/FichaDeRetiro.vue`: datos, movimiento de Bancos (enlace con permiso), pagos con enlace a su ficha, disponible,
  acciones «Liquidar» (`VentanaDeLiquidacion`: sobrante calculado, devuelto + faltante que cuadran, cuenta y boleta,
  motivo del faltante; lógica pura en `composables/retiros/liquidacion.ts`), «Reabrir» y «Anular» (`VentanaDeMotivo`).
- `NuevoPago.vue` (CP4-9): pestaña **«Efectivo»** (con `v-permiso`): elegir el retiro con su disponible, «Recibido
  por» (opcional), recibo del proveedor (opcional), aviso o bloqueo de bancarización con el motivo si tiene el permiso;
  sin «no negociable» ni posfechado. `edicion-de-pago.ts` suma la regla de §5 y el tope del disponible.
- `ComprobanteDePago.vue`: título «Recibo de pago en efectivo», custodio, total en letras, firmas y leyenda (§4.3).
- `FichaDePago.vue`: forma «Efectivo · Retiro N (custodio)»; anular sin fecha de inverso; el motivo de la excepción de
  bancarización, si lo hay.
- Rutas `/cuentas-por-pagar/retiros` y `/retiros/:id`; textos en `textos.ts`.

## 8. Convivencia con CP4 y riesgos

1. **CP4-2 (en curso)**: esta adenda **no cambia sus saldos** (el saldo sale de `aplicaciones_de_pagos`, que no cambia)
   ni sus reglas de baja (`noTenerPagosVigentes` no mira la forma). Dos cuidados para que no haya que rehacer nada:
   (a) los pagos de una contraseña y `ContrasenaConPagos` se buscan por **`aplicaciones_de_pagos.contrasena_id`** (ya
   tiene índice), no por `pagos.contrasena_id` (que desaparece si se aprueba §10); (b) los tipos de `forma` y
   `estadoDePago` no asumen que toda forma tiene movimiento ni que el «comprometido» sale de un cheque (el efectivo nunca
   es futuro). Si CP4-2 ya usó `pagos.contrasena_id`, se cambia en el paso de §10.
2. **Orden de bloqueo**: movimiento en Bancos → retiro → pago → contraseña → cargos; `fijar_desglose` vuelve al
   movimiento ya bloqueado. Igual que la nota ligada; no invierte ningún orden existente.
3. **Rendimiento**: el disponible del retiro suma los pagos vigentes con `retiro_id` (índice parcial). Pocos retiros
   abiertos por empresa.
4. **Conciliación**: el cheque del retiro se concilia como cualquier otro; una vez cobrado, el retiro no se anula (se
   liquida con devolución).
5. **Cheques caducos (H6b)**: el cheque de un retiro con pagos frena el lote con `RetiroConPagos` (el efectivo ya se
   entregó: el cheque no puede estar sin cobrar; si pasa, es un error de registro que se revisa).
6. **Flujo de efectivo**: §6, limitación de fecha.
7. **Borrar la empresa**: cascadas por `empresa_id`; las llaves `no action` se revisan al final del comando.

## 9. Encaje con la futura Caja chica (y Cuentas por liquidar)

- El retiro **es** una «cuenta por liquidar» acotada a pagar proveedores (custodio, efectivo entregado, liquidación con
  devolución o faltante). Cuando se diseñen *Caja chica y Cuentas por liquidar* (`HOJA-DE-RUTA.md`, punto 7), hay dos
  caminos, ninguno bloqueado por esta adenda:
  1. Ese módulo trae su propia forma de pago a proveedores (`pagos.forma = 'caja'` con llave a su movimiento de caja,
     por un `dependeDe` de Cuentas por pagar hacia Caja o por una orden) y los retiros siguen siendo de Cuentas por
     pagar.
  2. O ese módulo **absorbe** los retiros: una migración de datos los convierte en sus anticipos por liquidar y
     `pagos.retiro_id` pasa a apuntar a su tabla. Se decide al diseñarlo.
- Los conceptos `efectivo_para_pagos` y `devolucion_de_efectivo_para_pagos` son **sin flujo**, como «Fondo de caja chica»:
  si Caja chica tiene cuentas de caja, la «transferencia a la caja» se agrega allí sin tocar estos.
- Nada aquí crea una «cuenta de caja» en Bancos ni un saldo de caja de la empresa: lo único que se sabe es el disponible
  de cada retiro abierto.

## 10. ¿Un solo cheque para varias contraseñas del mismo proveedor? (pregunta CP4-E-e)

**Hoy no se puede.** `pagos.contrasena_id` es obligatorio y la llave de `aplicaciones_de_pagos` exige que cada línea sea
de la contraseña del pago; `pagos_movimiento_creado_unico` impide que dos pagos compartan el cheque. El único camino es
juntar los documentos en una contraseña (anular las otras si no tienen pagos y agregar sus documentos, CP4-e), pero el
proveedor tiene en la mano los originales de las contraseñas que se anulan. En la práctica guatemalteca es **común**
pagar en un cheque el mes de un proveedor que entregó varias contraseñas, así que **sí hace falta** (también para el
efectivo: un recibo por varias contraseñas).

| Opción | Cómo | A favor | En contra |
|---|---|---|---|
| **M2. El pago es del proveedor; cada línea dice su contraseña (recomendada)** | Se **quita** `pagos.contrasena_id`; `aplicaciones_de_pagos.contrasena_id` (que ya existe, con la llave a `contrasena_documentos`) dice de qué contraseña es cada cargo. La llave de las líneas pasa a `(pago_id, empresa_id, proveedor_id) → pagos (id, empresa_id, proveedor_id)` | Un pago = un cheque = un comprobante, como hoy; la base sigue garantizando que cada cargo está en su contraseña y es del proveedor del pago; nada de lotes | Migración que quita una columna (sin datos aún); la ventana parte del proveedor o deja «agregar otra contraseña del proveedor» |
| M1. Varios pagos comparten un cheque | Un pago por contraseña, todos con el mismo `movimiento_id`; el origen apunta a un «lote» nuevo | No cambia la forma de `pagos` | Tabla de lotes, un comprobante por pago para un solo cheque, anular uno anula el cheque de todos: más reglas |
| M3. No hacerlo | Juntar documentos en una contraseña | Nada que programar | El problema de los originales en papel |

**Migración de M2** (`0009_cp4_pago_de_varias_contrasenas`, antes de la de efectivo): `drop constraint
aplicaciones_de_pagos_pago_fk`, `pagos_contrasena_fk`, `pagos_llave_unica`; `drop index pagos_contrasena_idx`; `drop
column pagos.contrasena_id`; `add constraint pagos_id_proveedor_unico unique (id, empresa_id, proveedor_id)`; nueva
`aplicaciones_de_pagos_pago_fk (pago_id, empresa_id, proveedor_id) → pagos`; `pagos_proveedor_fk (proveedor_id) →
terceros.proveedores (id)` no action con índice **`pagos_proveedor_fecha_idx (proveedor_id, fecha)`** (sirve además a la
suma del mes de la bancarización). Sin datos que convertir (`pagos` vacía; si CP4-3 llegara antes, cada pago tiene una
sola contraseña y basta con quitar la columna).

**Cambios de M2 en el diseño de CP4**: la ruta pasa a `POST /pagos` (y `/pagos/ligar`, `/pagos/apertura`,
`/pagos/efectivo`) con `proveedorId` y `aplicaciones: [{ cargoId, monto }]` (la contraseña de cada cargo es su
contraseña **vigente**, única por `contrasena_documentos_vigente_unico`; el servidor la pone); desde la ficha de la
contraseña se abre con esa contraseña elegida y se pueden **sumar las otras contraseñas vigentes del proveedor** con
cargos autorizados. Reaplicar: cargos de cualquier contraseña vigente del proveedor. `PagoDto.contrasena` pasa a
`contrasenas: [{ id, numero }]`; el comprobante agrupa por contraseña; el evento `pago_registrado` cambia `contrasenaId`
por `contrasenaIds`. Límite de 100 cargos por pago, igual.

## 11. Pasos (un commit cada uno; servidor y cliente por separado)

Estado al 2026-11-14: en `main` CP4-B1, CP4-B2a y CP4-1; CP4-2 en curso. Esta adenda **no frena CP4-2**.

| Paso | Qué | Va después de |
|---|---|---|
| **CP4-V1** (servidor, solo si se aprueba §10) | Migración `0009_cp4_pago_de_varias_contrasenas`, llaves e índice; ajustar lo que CP4-2 haya hecho con `pagos.contrasena_id`; corregir §8 y §11 del diseño de CP4 (rutas, DTO, evento). **Pruebas de tablas**: línea de otra contraseña del mismo proveedor (pasa), de otro proveedor (falla), cargo fuera de su contraseña (falla) | CP4-2; **antes de CP4-3** |
| **CP4-EB** (servidor, Bancos) | Migración `0033_cp4_efectivo_para_pagos` (dos conceptos), `CONCEPTOS_DE_SISTEMA`, `ClaveDeConceptoDeSistema`. **Pruebas**: migración repetible, flujo con un retiro desglosado (parte en Operación, parte en Inversión, resto sin flujo) y su devolución | Ya se puede (después de CP4-B2a, en `main`) |
| **CP4-E1** (servidor, datos) | Migración `0009` o `0010` de Cuentas por pagar (§3.3), tabla y checks, `pagos.tablas.ts` y sus restricciones. **Pruebas de tablas**: cada check (estado, liquidación, devolución con depósito, faltante con motivo, retiro solo en efectivo, movimiento nulo en efectivo), llave compuesta del retiro, RLS, `politicas-de-los-modulos` y `llaves-entre-esquemas` | CP4-V1 (o CP4-2 si no hay V1); nunca en paralelo con otra migración de Cuentas por pagar |
| CP4-3 a CP4-5 | Como el diseño de CP4 | — |
| **CP4-E2** (servidor, retiros) | `RegistrarRetiroDeEfectivo`, `AnularRetiro`, `ListarRetiros`, `ObtenerRetiro`, el caso del retiro en el manejador de `movimiento_por_cambiar`, permisos `retiros.ver/crear/anular`, eventos, rutas. **Pruebas** de API: cheque y nota, posfechado (rechazo), saldo insuficiente (nada se guarda), anular sin pagos desde aquí y desde Bancos, cobrado (rechazo), corregir o eliminar en Bancos (rechazo), Cuentas por pagar inactivo (rechazo), sin permiso | CP4-EB, CP4-E1 y CP4-4 (el manejador) |
| **CP4-E3** (servidor, pagar en efectivo) | Forma `efectivo` en `RegistrarPago`, disponible, desglose del retiro, regla de bancarización (§5, la opción que se apruebe) y el permiso de excepción, anular y reaplicar (`retiroAbierto`), suma del mes con efectivo en el aviso de §5.7. **Pruebas**: varios proveedores y contraseñas con un retiro, mayor que el disponible (rechazo), fecha anterior al retiro (rechazo), retención en el primer pago, cargo de activo fijo (desglose), umbral por cargo, por pago y por mes (bloqueo o aviso; con permiso y motivo pasa), anular el pago (disponible y desglose vuelven), con el retiro liquidado (rechazo), reaplicar, anular el retiro con pagos desde Bancos (rechazo) | CP4-E2 y CP4-5 (patrón de la nota ligada) |
| **CP4-E4** (servidor, liquidar y recibo) | `LiquidarRetiro`, `ReabrirRetiro`, el caso de la devolución en el manejador, permiso `retiros.liquidar`, auditoría, eventos; recibo en `ComprobanteDePago` (título, custodio, total en letras). **Pruebas**: liquidar sin sobrante, con devolución (depósito en Bancos sin flujo), con faltante (auditoría `ajustar`), que no cuadra (rechazo), reabrir (anula el depósito), anular el depósito desde Bancos (reabre), depósito conciliado (no reabre), contenido del recibo (leyenda) | CP4-E3 y CP4-8 (comprobante) |
| CP4-9 a CP4-11 | Como el diseño de CP4 | — |
| **CP4-E5** (cliente) | Retiros (lista, ventana, ficha, liquidar, reabrir, anular), pestaña «Efectivo» en `NuevoPago`, recibo. Lógica pura con pruebas | CP4-E4, CP4-9 y CP4-10 |
| CP4-12 (QA) | Suma: retiro con cheque; tres pagos a dos proveedores y tres contraseñas; recibos impresos; un pago sobre el umbral (bloqueo y excepción con permiso); anular uno; liquidar con devolución y faltante; reabrir; intentar anular en Bancos el cheque del retiro (rechazo) y el depósito (reabre); flujo de efectivo con el desglose; celular. Con §10: un cheque por dos contraseñas | CP4-E5 y CP4-11 |

Cada commit corre `npm run revisar` y sus pruebas y actualiza la bitácora de `PLAN.md`.

## 12. Preguntas para el usuario

- **CP4-E-a. Cómo se registra el retiro.** A (desde Cuentas por pagar, con origen), B (en Bancos y marcado) o C (sin
  retiro). **Recomendado: A**; B puede sumarse después.
- **CP4-E-b. Formas de retiro.** Cheque (a nombre del custodio o de la empresa) y nota de débito (ventanilla o cajero);
  **sin** transferencia a caja (no existe) ni cheque al portador como opción (lo dice el contador). ¿De acuerdo?
- **CP4-E-c. Número del recibo.** **Recomendado:** el mismo correlativo de pagos (el recibo es el comprobante del pago
  en efectivo); alternativa: talonario propio de recibos de efectivo.
- **CP4-E-d. Bancarización.** A (aviso fuerte), B (bloqueo salvo permiso `pagos.efectivo-sin-bancarizar` con motivo) o C
  (bloqueo total). **Recomendado: B.**
- **CP4-E-e. Un cheque (o un recibo) para varias contraseñas del mismo proveedor.** M2 (el pago es del proveedor y cada
  línea dice su contraseña), M1 (varios pagos comparten cheque) o M3 (no). **Recomendado: M2, antes de CP4-3.**
- **CP4-E-f. Lo que sobra.** Se **deposita** al liquidar (nota de crédito en Bancos), o **queda** en el retiro para
  otros pagos mientras siga abierto (sin plazo, con aviso al pasar de mes). **Recomendado:** las dos (es lo que hace el
  diseño); ¿quiere un plazo máximo para liquidar (p. ej. una variable `cuentas-por-pagar.retiros.dias_para_liquidar`)?
- **CP4-E-g. Lo que falta.** Faltante con motivo y auditoría al liquidar; la cuenta (por cobrar al custodio o pérdida)
  la decide Contabilidad. ¿De acuerdo? (Que el custodio pague de su bolsa y se le reembolse es *Cuentas por liquidar*,
  fuera de esta versión.)
- **CP4-E-h. Custodio.** Texto libre (puede no ser usuario de Arrancar). ¿O debe ser un usuario de la cuenta?

## 13. Lo que debe validar `contador-guatemala`

1. **Bancarización en efectivo** (§5): qué dispara la regla (total del cargo, pago, suma del mes con todas las formas);
   si el efectivo debe sumarse también al aviso de los pagos bancarios (cambio a CP4 §5.7); texto del aviso; qué pasa con
   el **IVA ya tomado como crédito fiscal** cuando después se paga en efectivo sobre el umbral (¿rectificar el mes de la
   factura?, ¿Arrancar debe marcarlo en Libro de compras?), y con el costo no deducible (ISR).
2. **Cheque para retirar efectivo**: a nombre del custodio o de la empresa; si se permite «al portador»; «no negociable»
   apagado por omisión (¿se puede cambiar en ventanilla un cheque no negociable a nombre de una persona?).
3. **Partidas** de §6: cuenta «Efectivo para pagos a proveedores» (¿subcuenta de Caja o «fondos por liquidar» a cargo
   del custodio?), y el **faltante** (¿cuenta por cobrar al custodio, gasto o pérdida?; ¿afecta el flujo de efectivo?).
4. **Flujo de efectivo**: retiro y devolución sin flujo, pago en Operación o Inversión; y si es aceptable que en Bancos el
   pago se fije en la **fecha del retiro** (limitación de §6) o hay que leer la fecha del pago.
5. **Recibo** (§4.3): contenido mínimo (nombre, DPI y firma de quien recibe; total en letras; leyenda no tributaria),
   original y copia; si el proveedor debe dar además su propio recibo o basta su factura ya registrada.
6. **Retenciones en efectivo**: descontarlas en el primer pago igual que con cheque (CP4 §5.1.6), y que el recibo muestre
   la constancia.
7. **Varias contraseñas en un pago** (§10): ningún problema fiscal previsto; confirmar que un comprobante con documentos
   de varias contraseñas no choca con nada.

## 14. Pendientes

- **P-CPE-1:** foto del recibo firmado como archivo del pago (con la revisión de archivos); fuera de esta adenda.
- **P-CPE-2:** si el contador no acepta la fecha del retiro en el flujo (§6), el reporte de flujo de Bancos leerá los
  pagos en efectivo por una orden a Cuentas por pagar.
- **P-CPE-3:** reporte de CP5 «Pagos en efectivo sobre el umbral» y «Retiros por liquidar» (este último ya sale de la
  lista con filtro; el de CP5 es imprimible y exportable).
- **P-CPE-4:** opción B de §2.2 (ligar un retiro registrado en Bancos), si el usuario la pide.
