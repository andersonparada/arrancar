# Adenda a CP4: pagos en efectivo con un retiro del banco — arquitecto de datos, 2026-11-14

Estado: **aprobado, listo para programar** (2026-11-14). El usuario aceptó la adenda con **todos** los «Cambios que el
diseño debe recibir» del dictamen del contador (`dictamen-cp4-efectivo-2026-11-14.md`, «correcto con ajustes») y
respondió las preguntas de §12: CP4-E-a = **A**; CP4-E-b con **«no negociable» encendido** y **sin cheque al portador**;
CP4-E-c = **mismo correlativo** de pagos; CP4-E-d = **B condicionado al régimen** (E-2); CP4-E-e = **M2**; CP4-E-f =
**aviso a fin de mes**; CP4-E-g con el **faltante como flujo de Operación** (E-1); CP4-E-h = **texto con usuario
opcional**. Precisó además: **un retiro (un cheque o una nota de débito) paga a uno o varios proveedores**; no se hace
un cheque por proveedor. Este documento ya trae todo aplicado (lo agregado está en la tabla «Decidido el 2026-11-14»);
lo que cambia del diseño de CP4 ya está escrito en `diseno-cp4-pagos.md`.

Adenda a `diseno-cp4-pagos.md` (CP4, aprobado el 2026-11-13). Nace de la decisión del usuario del **2026-11-14**, que
**cambia CP4-k** («pago de facturas en efectivo: con Caja chica»): «imagina que voy a sacar dinero y quiero pagar en
efectivo a varios proveedores: debemos soportarlo». Es decir: un **retiro del banco** cuyo efectivo se usa para pagar a
**uno o varios proveedores** (y varias contraseñas de cada uno), cada proveedor con su pago y su recibo firmado. Caja
chica no existe y esta adenda no la crea, pero no la debe estorbar (§9).

Resuelve también **un solo pago (un cheque, una nota o un recibo) para varias contraseñas del mismo proveedor** (§10,
M2), que cambia la forma de `pagos` para **todas** las formas y por eso va antes de CP4-3 (paso CP4-V1).

Lo que esta adenda **no** cambia de CP4: solo se paga lo autorizado y cada cargo pagado está en una contraseña vigente;
la retención se descuenta una sola vez en el primer pago vigente de cada cargo; los saldos son calculados; el pago no se
corrige, se reaplica o se anula; Bancos rechaza cambiar lo que tiene origen en Cuentas por pagar si ese módulo está
inactivo.

**Decidido el 2026-11-14 (aprobación de la adenda, con el dictamen del contador):**

| Tema | Decisión | Dónde |
|---|---|---|
| Cómo se registra el retiro | Desde Cuentas por pagar, que ordena a Bancos el cheque o la nota con origen = el retiro (opción A) | CP4-E-a, §2.2 |
| Un retiro, varios proveedores | **Un** retiro (un cheque o una nota de débito) paga a **uno o varios** proveedores. Por proveedor, **un pago y un recibo** (cada uno puede cubrir varias contraseñas de ese proveedor). La pantalla **reparte** un retiro entre varios proveedores **en una sola operación** (varios pagos de una vez, todo o nada) | Usuario; dictamen punto 5; §2.1, §4.2 |
| Formas de retiro | Cheque (a nombre del custodio o de la empresa) o nota de débito (ventanilla o cajero). **«No negociable» encendido por omisión**; beneficiario **obligatorio** y **nunca «al portador»** | CP4-E-b, E-4, §2.3 |
| Número del recibo | El del pago (`cuentas-por-pagar.pagos`), sin talonario aparte | CP4-E-c, §4.3 |
| Bancarización en efectivo | **Bloqueo** salvo permiso `pagos.efectivo-sin-bancarizar` y motivo, **solo si la empresa pierde algo** según su régimen y el documento (crédito fiscal, deducción del ISR o ambos); sin efecto fiscal, ni aviso ni bloqueo; el texto nombra solo el efecto que aplica y la rectificación (Código Tributario art. 106) | CP4-E-d, E-2, E-5, §5 |
| Efectivo en el aviso de los pagos bancarios | La suma del mes de CP4 §5.7 **cuenta el efectivo**; el aviso sale también al registrar el cheque o la nota que hace llegar el mes al umbral | Dictamen punto 1 y cambio 4, §5.4 |
| Crédito fiscal ya tomado | Arrancar **no** rectifica ni toca el Libro de compras: el reporte de CP5 marca la factura «crédito fiscal en riesgo por bancarización» | Dictamen cambio 5, §5.5 |
| Varias contraseñas en un pago | **M2**: el pago es del proveedor; cada línea dice su contraseña | CP4-E-e, §10 |
| Lo que sobra | Se deposita al liquidar o queda en el retiro mientras siga abierto; **aviso a fin de mes** si un retiro de un mes anterior sigue abierto (sin bloqueo ni plazo configurable) | CP4-E-f, §4.5 |
| Lo que falta | Faltante con motivo y auditoría al liquidar; **es flujo de Operación** (concepto de sistema «Faltante de efectivo»); la cuenta (por cobrar al custodio o pérdida) la decide Contabilidad | CP4-E-g, E-1, §3.4, §6 |
| Custodio | Texto obligatorio con **usuario opcional**; aviso si el custodio es usuario y liquida su propio retiro | CP4-E-h, E-8, §3.1, §4.5 |
| Retiros por liquidar | Lista con **fecha de corte** (efectivo en manos de custodios al cierre) | E-7, §4.5, §7.5 |
| Flujo de efectivo de Bancos | El pago en efectivo sale en la fecha del retiro, con **leyenda** en el reporte; resolver P-CPE-2 antes de que Contabilidad emita estados financieros | Dictamen punto 4 y cambio 7, §6 |
| Partida del retiro | «Efectivo para pagos a proveedores» es **Caja** (subcuenta a cargo del custodio) | Dictamen punto 3, §6 |

## 1. Lo encontrado en el código y la base (verificado contra `main` el 2026-11-14)

1. **`cuentas_por_pagar.pagos`** (migración `0008_cp4_pagos`, en `main`, CP4-1): `forma in ('cheque', 'nota_de_debito',
   'nota_ligada', 'cuenta_de_apertura')`; `pagos_movimiento_de_su_forma`: `(forma = 'cuenta_de_apertura') =
   (movimiento_id is null)`; `pagos_referencia_de_su_forma`: referencia solo en `nota_ligada` y `cuenta_de_apertura`;
   `contrasena_id not null` con la llave compuesta `pagos_contrasena_fk`, el índice `pagos_contrasena_idx` y el único
   `pagos_llave_unica (id, empresa_id, proveedor_id, contrasena_id)`, destino de `aplicaciones_de_pagos_pago_fk`.
   `pagos_movimiento_creado_unico`: un cheque o una nota creados por un pago son de **ese** pago. **Sin casos de uso en
   `main`**: CP4-2 (saldos y reglas) se está programando en otra sesión y no trae migración.
2. **Bancos** (`dependeDe: []`): las cuentas son solo `monetaria` o `ahorro`; **no existe una cuenta de caja** ni un
   movimiento de efectivo. Un retiro cabe como **cheque** (a nombre de quien lo cobra en ventanilla) o como **nota de
   débito** (retiro en ventanilla con boleta, retiro en cajero). La «transferencia a la caja» **no cabe**: no hay caja a
   donde transferir (llegará con Caja chica).
3. **Órdenes de CP4-B2a ya en `main`** (`servidor/src/modulos/core/contratos/bancos.contratos.ts`):
   `emitir_cheque_de_origen` (con `beneficiario` y `noNegociable`), `registrar_nota_de_origen` (`tipo 'debito' |
   'credito'`), `anular_movimiento_de_origen`, `fijar_desglose_de_conceptos` y el aviso `movimiento_por_cambiar`. Un
   movimiento **con origen** ya no se corrige, elimina ni blanquea en Bancos; anularlo manda el aviso; con Cuentas por
   pagar inactivo se rechaza (`RevisorDeCambios`). `fijar_desglose_de_conceptos` con origen **cambia el concepto del
   movimiento al de mayor monto** (el que se ve en las listas) y exige claves del **mismo tipo** (débito o crédito).
4. **Conceptos de sistema** (`CONCEPTOS_DE_SISTEMA` en `bancos/dominio/conceptos-iniciales.ts`, `0032`): `transferencia`
   y `saldo_inicial` (sin flujo), `pago_a_proveedor` (Operación), `pago_a_proveedor_de_activo` (Inversión),
   `reintegro_de_proveedor(_de_activo)`, `sin_clasificar`. `ClaveDeConceptoDeSistema` es una unión cerrada en el
   contrato.
5. **Régimen de la empresa** (para §5): `libro_de_compras.datos_fiscales_de_empresa` guarda el historial (`vigente_desde`,
   `regimen_iva`, `regimen_isr`; sin filas «no se supone ningún régimen»), y cada documento del libro trae
   `regimen_iva_de_la_empresa` (copiado al registrar), `periodo`, `iva` e `iva_no_acreditable`. Cuentas por pagar los
   puede **leer** desde `infraestructura` (Libro de compras está en su `dependeDe`).
6. **Migraciones** (verificado contra `main` y las ramas el 2026-11-14): la última de Cuentas por pagar es la
   **`0008_cp4_pagos`** y la de Bancos la **`0032_cp4_pagos_de_cuentas_por_pagar`**; ninguna rama tiene una `0009` de
   Cuentas por pagar ni una `0033` de Bancos. Quedan así: **`0009_cp4_pago_de_varias_contrasenas`** (CP4-V1),
   **`0010_cp4_pagos_en_efectivo`** (CP4-E1) y Bancos **`0033_cp4_efectivo_para_pagos`** (CP4-EB). Se vuelve a verificar
   contra `main` al generarlas: nunca dos ramas generando migraciones del mismo módulo a la vez.
7. **`AccionAuditada`** ya tiene `anular`, `corregir`, `reabrir`, `ajustar`: no hace falta una nueva.
8. **Base de desarrollo** (solo lectura): `cuentas_por_pagar.pagos` vacía. No hay datos que convertir.

## 2. Modelo

### 2.1 Tres hechos, no uno

| Hecho | Qué es | Dónde | Mueve dinero en Bancos |
|---|---|---|---|
| **Retiro de efectivo para pagos** | Sale dinero del banco a manos de una persona (el **custodio**) para pagar a uno o varios proveedores. **No es un pago**: es efectivo de la empresa (Caja) en otra bolsa | `retiros_de_efectivo` (nuevo) | Sí: **un** cheque o **una** nota de débito creados por orden, con origen = el retiro |
| **Pago en efectivo** | El custodio entrega efectivo a **un** proveedor contra cargos autorizados de **una o varias** de sus contraseñas, y el proveedor firma **un** recibo | `pagos` con `forma = 'efectivo'` y `retiro_id` | No: consume el disponible del retiro |
| **Liquidación del retiro** | Se cierra el retiro: lo que sobró se **deposita** de vuelta y, si falta efectivo, se deja constancia del **faltante** con motivo | Columnas de `retiros_de_efectivo` | Por el depósito, sí (nota de crédito por orden); el faltante se clasifica en el desglose del retiro |

```
disponible del retiro = monto − Σ pagos en efectivo vigentes del retiro − devuelto − faltante
```

**Un retiro paga a uno o varios proveedores** (decisión del usuario): el usuario saca el efectivo **una vez** y lo
reparte. Por cada proveedor se registra **un pago** (con su número, su recibo y su retención), que puede cubrir cargos de
**varias contraseñas** de ese proveedor (M2, §10). La pantalla «Pagar en efectivo» registra **todos los pagos de un
reparto en una sola operación** (§4.2): el usuario elige el retiro, agrega los proveedores, marca en cada uno los cargos y
montos, y confirma una vez; o se guardan todos o ninguno. Un mismo proveedor puede recibir más de un pago del mismo
retiro **en operaciones distintas** (p. ej. lunes y miércoles); dentro de una operación aparece una sola vez.

### 2.2 Cómo se registra el retiro (CP4-E-a: **A**)

| Opción | Cómo | Decisión |
|---|---|---|
| **A. Retiro creado desde Cuentas por pagar** | Pantalla «Retiros de efectivo» en Cuentas por pagar; Cuentas por pagar crea la fila y ordena a Bancos el cheque o la nota **con origen = el retiro**. Las reglas de Bancos para lo que tiene origen ya existen | **Aprobada** |
| B. Movimiento registrado en Bancos y marcado | Marcar en Bancos un cheque o nota ya escrito | Queda como P-CPE-4 («ligar un retiro registrado en Bancos»), sin cambiar tablas, si el usuario lo pide |
| C. Sin retiro | Efectivo suelto en el pago | Descartada (es lo que hará Caja chica bien hecho) |

### 2.3 Formas de retiro (CP4-E-b)

| Forma | Cabe | Cómo |
|---|---|---|
| **Cheque** a nombre del custodio o de la empresa, que se cambia en ventanilla | **Sí** | `bancos.emitir_cheque_de_origen`. Beneficiario **obligatorio**: por omisión el custodio, editable (p. ej. el nombre de la empresa). **«No negociable» encendido por omisión** (E-4: a nombre del beneficiario se cobra igual en ventanilla; el usuario lo puede apagar). **No posfechado**: fecha hoy o pasada (`FechaDeRetiroInvalida`) |
| Cheque **al portador** | **No** | Se rechaza el beneficiario vacío o «al portador» (`BeneficiarioDelRetiroInvalido`; se compara sin mayúsculas, tildes ni espacios: «al portador», «portador», «alportador»). Código de Comercio arts. 497–499: sin beneficiario es al portador |
| **Nota de débito** (retiro en ventanilla con boleta, retiro en cajero) | **Sí** | `bancos.registrar_nota_de_origen` con `tipo = 'debito'`, beneficiario = el custodio, referencia = número de la boleta o del comprobante del cajero. Fecha hoy o pasada |
| Transferencia a la caja | **No** | No hay cuenta de caja en Bancos; llega con Caja chica (§9) |

**Ayuda** de la ventana (E-9, informativa; el texto se coteja con la Ley contra el Lavado de Dinero antes de ponerlo):
«El banco puede pedirle el formulario IVE-BA-03 si el retiro en efectivo es grande (US$10,000 o más, o su equivalente).»

## 3. Datos

### 3.1 Tabla nueva `cuentas_por_pagar.retiros_de_efectivo`

Por empresa (`politicaPorEmpresa()`), sin alcance por registro, **sin proveedor** (cubre a uno o varios).

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK (`idPrimario`); es el `documento_de_origen_id` del cheque o nota del retiro **y** del depósito de la devolución |
| `empresa_id` | uuid | no | FK `core.empresas` on delete cascade |
| `numero` | integer | no | Correlativo `cuentas-por-pagar.retiros`; check `retiros_numero_positivo`: `numero > 0` |
| `anio_de_numero` | integer | no | `default 0`; único `retiros_numero_unico (empresa_id, anio_de_numero, numero)` |
| `forma` | text | no | check `retiros_forma_valida`: `in ('cheque', 'nota_de_debito')` |
| `fecha` | date | no | La del cheque o la nota (no futura: lo revisa el dominio con la fecha de hoy de la empresa) |
| `monto` | numeric(14,2) | no | check `retiros_monto_positivo`: `> 0` |
| `movimiento_id` | uuid | no | FK `retiros_movimiento_fk → bancos.movimientos (id)`, **no action**; único `retiros_movimiento_unico (movimiento_id)` (también es su índice) |
| `custodio` | text | no | Nombre de quien lleva y entrega el efectivo (sale en el recibo); check `retiros_custodio_valido`: `char_length(custodio) between 1 and 150 and custodio = btrim(custodio)` |
| `custodio_usuario_id` | uuid | sí | **Nuevo (CP4-E-h):** el usuario de Arrancar que es el custodio, si lo es. FK `retiros_custodio_usuario_fk → core.usuarios (id)` **on delete set null** (como `archivos.subido_por`: el nombre queda en `custodio`); índice `retiros_custodio_usuario_idx (custodio_usuario_id) where custodio_usuario_id is not null`. Si se elige, `custodio` = su nombre (nombres y apellidos) |
| `observaciones` | text | sí | check `retiros_observaciones_validas`: `is null or (char_length between 1 and 500 and = btrim)` |
| `estado` | text | no | `default 'abierto'`; check `retiros_estado_valido`: `in ('abierto', 'liquidado', 'anulado')` |
| `fecha_de_liquidacion` | date | sí | |
| `liquidado_en` | timestamptz | sí | |
| `liquidado_por` | uuid | sí | |
| `devuelto` | numeric(14,2) | no | `default 0`; check `retiros_devuelto_valido`: `>= 0`. Lo que se depositó de vuelta |
| `movimiento_de_devolucion_id` | uuid | sí | FK `retiros_devolucion_fk → bancos.movimientos (id)`, no action; único parcial `retiros_devolucion_unica (movimiento_de_devolucion_id) where movimiento_de_devolucion_id is not null` |
| `faltante` | numeric(14,2) | no | `default 0`; check `retiros_faltante_valido`: `>= 0` |
| `motivo_de_faltante` | text | sí | check `retiros_motivo_de_faltante`: `(faltante > 0) = (motivo_de_faltante is not null)`; `retiros_motivo_de_faltante_rango`: `is null or char_length between 1 and 300` |
| `anulado_en` | timestamptz | sí | |
| `anulado_por` | uuid | sí | |
| `motivo_de_anulacion` | text | sí | `retiros_motivo_de_anulacion_rango`: `is null or char_length between 1 and 300` |
| `...marcasDeTiempo`, `...autoria` | | | `creado_por` = quien registró el retiro |

Checks de estado (los de anulación con la lección de CP2-2: en los otros estados, los tres nulos):

- `retiros_anulacion_completa`: `(estado = 'anulado') = (anulado_en is not null and anulado_por is not null and
  motivo_de_anulacion is not null)`.
- `retiros_liquidacion_completa`: `(estado = 'liquidado') = (fecha_de_liquidacion is not null and liquidado_en is not
  null and liquidado_por is not null)`.
- `retiros_abierto_sin_liquidar`: `estado = 'liquidado' or (devuelto = 0 and faltante = 0 and
  movimiento_de_devolucion_id is null)`.
- `retiros_devolucion_con_deposito`: `(devuelto > 0) = (movimiento_de_devolucion_id is not null)`.
- `retiros_liquidacion_no_pasa_del_monto`: `devuelto + faltante <= monto`.

Lo que revisa el dominio (otras filas, con el retiro bloqueado): al liquidar, `Σ pagos vigentes + devuelto + faltante =
monto`; siempre, `Σ pagos vigentes <= monto − devuelto − faltante` (prueba de consistencia, como en CP3). El custodio
usuario debe estar **activo** y **entrar a la empresa** (`core.empresa_usuarios`): si no, `CustodioInvalido`.

Otros índices y únicos:

| Nombre | Definición | Para |
|---|---|---|
| `retiros_llave_unica` | unique `(id, empresa_id)` | Destino de la llave compuesta desde `pagos` (el retiro es de la misma empresa) |
| `retiros_lista_idx` | `(empresa_id, estado, fecha)` | Lista «Retiros por liquidar» y la fecha de corte |

RLS: `politicaPorEmpresa()`.

### 3.2 Cambios en `cuentas_por_pagar.pagos` (además de M2, §10)

| Columna o restricción | Regla |
|---|---|
| `forma` | `pagos_forma_valida` suma `'efectivo'` |
| `retiro_id` uuid, **nulo** | FK `pagos_retiro_fk (retiro_id, empresa_id) → retiros_de_efectivo (id, empresa_id)` (`retiros_llave_unica`), no action; índice `pagos_retiro_idx (retiro_id) where retiro_id is not null`. Check `pagos_retiro_de_su_forma`: `(forma = 'efectivo') = (retiro_id is not null)` |
| `pagos_movimiento_de_su_forma` | Pasa a `(forma in ('cuenta_de_apertura', 'efectivo')) = (movimiento_id is null)`: el movimiento es del **retiro**, no del pago (así `pagos_movimiento_creado_unico` y el aviso de Bancos no se confunden) |
| `pagos_referencia_de_su_forma` | Suma `'efectivo'`: número del recibo **del proveedor**, si le dio uno (opcional) |
| `recibido_por` text, nulo | Nombre de quien recibió el efectivo por el proveedor (el que firma). Check `pagos_recibido_por_de_su_forma`: `recibido_por is null or forma = 'efectivo'`; `pagos_recibido_por_valido`: `is null or (char_length between 1 and 150 and = btrim)`. Opcional: se puede escribir a mano en el recibo |
| `motivo_sin_bancarizar` text, nulo | Solo si se usó la excepción de bancarización (§5): check `pagos_motivo_sin_bancarizar_de_su_forma`: `motivo_sin_bancarizar is null or forma = 'efectivo'`; `pagos_motivo_sin_bancarizar_rango`: `is null or char_length between 1 and 300` |

No se agrega «un pago por proveedor y retiro» como único: un proveedor puede recibir dos pagos del mismo retiro en
operaciones distintas (§2.1). La regla «una vez por operación» la revisa el caso de uso.

### 3.3 Migración `0010_cp4_pagos_en_efectivo` (Cuentas por pagar)

`npm run bd:generar -w servidor -- cuentas-por-pagar cp4_pagos_en_efectivo`, revisada a mano, **después** de que la
`0009_cp4_pago_de_varias_contrasenas` (CP4-V1, §10) esté en `main` (su `when` mayor). Pasos:

1. `create table retiros_de_efectivo` con checks, únicos, índices, llaves (las dos a `bancos.movimientos` y la de
   `core.usuarios`) y RLS.
2. `alter table pagos`: `drop constraint` y `add constraint` de `pagos_forma_valida`, `pagos_movimiento_de_su_forma` y
   `pagos_referencia_de_su_forma` con su texto nuevo; `add column retiro_id`, `recibido_por`, `motivo_sin_bancarizar`;
   la llave, el índice y los checks nuevos.

**Datos existentes:** ninguno que convertir (`pagos` vacía; CP4 no tiene casos de uso en `main`). Las restricciones que
cambian solo **amplían** lo permitido: ninguna fila vieja puede fallar. Sin migración de permisos (son nuevos). El
correlativo `cuentas-por-pagar.retiros` no necesita fila previa.

### 3.4 Bancos: migración `0033_cp4_efectivo_para_pagos`

Solo conceptos (como la `0032`): **tres** conceptos de sistema nuevos, en `CONCEPTOS_DE_SISTEMA` y, en las empresas que
ya tienen catálogo, por `insert` (a uno sin clave con el mismo nombre se le pone la clave; repetible):

| Clave | Nombre | Aplica a | Flujo | Para |
|---|---|---|---|---|
| `efectivo_para_pagos` | Efectivo para pagos a proveedores | débito | **Sin flujo** (del banco a la caja sigue siendo efectivo: NIIF para las Pymes Sección 7, 7.2; NIC 7 párr. 9 por la jerarquía de la Sección 10) | La parte del retiro que no se ha gastado y la que se devolvió |
| `devolucion_de_efectivo_para_pagos` | Devolución de efectivo para pagos | crédito | **Sin flujo** | El depósito del sobrante |
| `faltante_de_efectivo` | Faltante de efectivo | débito | **Operación** (E-1: el efectivo que se pierde sale del efectivo de la empresa) | La parte del retiro que se dio por faltante al liquidar |

`ClaveDeConceptoDeSistema` (`core/contratos/bancos.contratos.ts`) suma las tres claves. Ningún cambio de reglas en Bancos:
el retiro y su devolución **tienen origen**, así que ya les aplica todo lo de CP4-B2a.

**Leyenda en el flujo de efectivo de Bancos** (dictamen cambio 7): si en el período hay movimientos con
`efectivo_para_pagos` o `faltante_de_efectivo` (en el concepto o en el desglose), el reporte (pantalla, impresión y
Excel) muestra: «Los pagos en efectivo a proveedores se muestran en la fecha del retiro del banco, no en la del pago. Es
un reporte de gestión.» Bancos lo sabe por sus propios conceptos; no lee Cuentas por pagar.

## 4. Reglas

### 4.1 Registrar el retiro (`RegistrarRetiroDeEfectivo`, `retiros.crear`)

1. Datos: forma, cuenta bancaria (nota) o chequera y cheque (cheque), fecha (hoy por omisión; **no futura**:
   `FechaDeRetiroInvalida`), monto, custodio (texto, o un usuario de la empresa que lo llena), beneficiario del cheque
   (por omisión el custodio; obligatorio, nunca «al portador»: `BeneficiarioDelRetiroInvalido`), «no negociable»
   (**encendido** por omisión), referencia de la nota (boleta), observaciones. Genera el id antes.
2. Orden a Bancos: `emitir_cheque_de_origen` (con el beneficiario y `noNegociable`) o `registrar_nota_de_origen` (`tipo =
   'debito'`, beneficiario = el custodio), con `origen = { modulo: 'cuentas-por-pagar', documentoId: <id del retiro> }` y
   `conceptos = [{ efectivo_para_pagos, monto }]`. Bancos aplica sus reglas (saldo, sobregiro, chequera, mes
   conciliado). Si lanza, nada se guarda.
3. Número `correlativos.siguiente('cuentas-por-pagar.retiros', fecha)`; inserta (`estado = 'abierto'`).
4. Sin auditoría (alta). Evento `cuentas-por-pagar.retiro_registrado`. Responde el `RetiroDto` con los avisos de Bancos y
   los suyos:
   - si la empresa tiene algún efecto de bancarización (§5.2) y el monto es `>=` umbral: «Va a sacar Q… en efectivo para
     pagar proveedores. Si a un mismo proveedor le paga en efectivo y lo pagado en el mes llega a Q30,000.00, ese pago no
     respalda [el costo para el ISR / el crédito fiscal del IVA] (Decreto 20-2006, art. 20).» (solo los efectos que
     apliquen);
   - si hay **otros retiros abiertos de un mes anterior** (aviso a fin de mes, §4.5).

### 4.2 Pagar en efectivo: repartir un retiro (`RegistrarPagosEnEfectivo`, `pagos.pagar-en-efectivo`)

**Una operación registra de 1 a 20 pagos** (uno por proveedor) contra **un** retiro, en **una** transacción: o se guardan
todos o ninguno. Cada pago es igual al pago con cheque de CP4 §5.1 (cargos autorizados en contraseñas vigentes del
proveedor, monto `<=` saldo, fecha mínima = emisión del DTE y fecha de inicio, retención en el primer pago vigente,
diferencias de centavos como residuo, avisos de constancia y de entero, número `cuentas-por-pagar.pagos`), salvo:

- **No hay orden de emitir.** El retiro debe estar **abierto** y ser de la empresa (`RetiroNoDisponible`).
- **Cada proveedor una sola vez** en la operación (`ProveedorRepetidoEnElReparto`); 1–20 pagos
  (`DemasiadosPagosEnElReparto`), cada uno con 1–100 cargos y **300 cargos en total** como máximo (el mismo
  `DemasiadosDocumentosEnPago`, campo `pagos`).
- **Bloqueos** (orden Empresas → Bancos → Cuentas por pagar, CP4 §10.6): carga inicial si algún cargo es saldo inicial;
  el movimiento del retiro en Bancos (`for update` desde `infraestructura`, solo para bloquear, como la nota ligada); el
  retiro; un **bloqueo de bancarización por proveedor** (`pg_advisory_xact_lock` con la empresa y el proveedor, en orden
  de id de proveedor) para que dos operaciones a la vez no pasen las dos bajo el umbral; las contraseñas de **todos** los
  pagos (en orden de id); los cargos de **todos** los pagos (en orden de id). Con todo bloqueado se vuelve a revisar.
- `Σ montos de todos los pagos <= disponible` (`PagoMayorQueElRetiro`: «Al retiro N solo le quedan Q… en efectivo; este
  reparto suma Q….»). Si el efectivo **no alcanza**, se hace otro retiro: no se paga «de la bolsa del custodio» (eso es
  *Cuentas por liquidar*, fuera de esta versión).
- **Fecha** (de cada pago; la pantalla pone la misma a todos y deja cambiarla): por omisión hoy; **no futura** (no hay
  efectivo posfechado) ni anterior a la del retiro, más las mínimas de CP4 §5.1.5 (`FechaDePagoInvalida`).
- **Bancarización** por pago: §5. Con efecto fiscal y la regla disparada, bloquea salvo permiso y motivo **de ese pago**.
- **Números**: uno por pago, en el orden en que vienen en la operación, después de validar todo.
- **Desglose del retiro** (al final, una sola vez, con el retiro bloqueado): Cuentas por pagar suma, en **todos** los
  pagos vigentes del retiro, lo aplicado a cargos con y sin `tiene_activo_fijo`, y manda `bancos.fijar_desglose_de_conceptos`
  (origen = el retiro) con `pago_a_proveedor` (sin activo), `pago_a_proveedor_de_activo` (con activo),
  `faltante_de_efectivo` (el faltante, si está liquidado) y `efectivo_para_pagos` (el resto: disponible + devuelto); sin
  líneas en cero. Idempotente; se vuelve a mandar al anular o reaplicar un pago del retiro y al liquidarlo o reabrirlo.
  El concepto que se ve en las listas de Bancos pasa a ser el de mayor monto (lo hace Bancos): no importa, el retiro se
  reconoce por su origen.
- `recibido_por` y `referencia` (recibo del proveedor) opcionales, por pago. `movimiento_id` nulo.
- Errores **por pago y por línea**: los campos van con su índice (`pagos.<i>.aplicaciones.<j>.monto`,
  `pagos.<i>.motivoSinBancarizar`) para que la pantalla los muestre en su proveedor.
- Un evento `pago_registrado` **por pago** (con `forma = 'efectivo'`, `efecto = 'efectivo'`, `retiroId` y
  `sinBancarizar`, §7.4). Responde el retiro con su disponible nuevo, los pagos creados (con su número, para imprimir los
  recibos) y los avisos.

Desde la ficha de una contraseña, «Registrar pago» en efectivo abre la misma pantalla con **ese proveedor** y esa
contraseña ya elegidos (una operación de un solo pago).

### 4.3 Recibo del pago en efectivo (CP4-E-c: mismo correlativo)

El comprobante de pago de CP4 (§9 del diseño; leyenda «no es documento tributario») **es** el recibo: misma página
(`ComprobanteDePago.vue`) con el título **«Recibo de pago en efectivo»** cuando la forma es `efectivo`. **Un recibo por
proveedor** (dictamen punto 5): como el pago es por proveedor, un recibo = un pago.

- **Número**: el del pago (`cuentas-por-pagar.pagos`); no hay talonario aparte.
- **Contenido** (validado por el contador): empresa (nombre y NIT), proveedor (nombre del NIT y NIT), número y fecha,
  retiro N y custodio que entrega, **por contraseña** (número) y por documento (tipo, serie y número del DTE, total,
  retención con su constancia o «constancia por emitir», notas aplicadas, **pagado en efectivo**, saldo que queda), total
  en números y **en letras**, recibo del proveedor (si lo dio), leyendas «Las retenciones se documentan con su
  constancia.» y **«Este recibo no es un documento tributario.»**, firmas **«Entregado por (custodio)»** y **«Recibí
  conforme (nombre, DPI y firma de quien recibe por el proveedor)»** (el nombre sale de `recibido_por` si se escribió; el
  DPI va a mano, no se guarda). Del proveedor **basta su factura FEL** ya registrada.
- **Original y copia** en la misma hoja (como la contraseña de CP3): el original firmado se queda en la empresa.
- **Varios a la vez**: al terminar un reparto, «Imprimir recibos» imprime los de todos sus pagos, cada uno en su hoja.
- Guardar la **foto del recibo firmado** queda como pendiente (P-CPE-1).

### 4.4 Anular y reaplicar un pago en efectivo (`AnularPago`, `pagos.anular`; `ReaplicarPago`, `pagos.reaplicar`)

Se anula **un pago** (un proveedor); los demás del mismo reparto no cambian. No tiene movimiento propio: nada se anula en
Bancos.

1. Bloquea el movimiento del retiro (Bancos), el retiro y el pago. Pago vigente (`PagoYaAnulado`).
2. `REGLAS_PARA_ANULAR_PAGO`: `noEstarCobrado` **no aplica** (no hay cheque que cobrar); se suma **`retiroAbierto`**: si
   el retiro está **liquidado**, se rechaza con `RetiroLiquidado` («El retiro N ya se liquidó: reábralo para anular este
   pago»).
3. Estado `anulado`, líneas `vigente = false`, anula sus ajustes de diferencia (CP4 §5.9); el retiro recupera
   disponible; se vuelve a fijar el desglose.
4. Auditoría `anular`, recurso `cuentas-por-pagar.pagos`, `anterior` = `PagoDto`, con motivo (que diga qué pasó con el
   efectivo: «el proveedor lo devolvió», «se registró en el proveedor equivocado»…). Evento `pago_anulado` con
   `anulacionEnBancos = null` y `retiroId`.

**Reaplicar**: igual que CP4 §5.11 con M2 (cargos de cualquier contraseña vigente del **mismo proveedor**, misma suma),
bloqueando primero el movimiento y el retiro; se vuelve a fijar el desglose. Se permite con el retiro liquidado (el
efectivo no cambia). La bancarización no se vuelve a evaluar (el dinero y la fecha no cambian).

### 4.5 Liquidar y reabrir el retiro (`retiros.liquidar`)

**Liquidar** (`LiquidarRetiro`), con el retiro abierto:

1. Bloquea el movimiento del retiro, el retiro y sus pagos. Calcula `sobrante = monto − Σ pagos vigentes`.
2. El usuario dice cuánto **devuelve** (depósito) y cuánto **falta**, con `devuelto + faltante = sobrante`
   (`LiquidacionNoCuadra`). Faltante `> 0` exige motivo (`MotivoDeFaltanteObligatorio`).
3. Si `devuelto > 0`: orden `registrar_nota_de_origen` (`tipo = 'credito'`, cuenta elegida —por omisión la del retiro—,
   fecha, beneficiario = el custodio, referencia = boleta de depósito, `conceptos = [{
   devolucion_de_efectivo_para_pagos, devuelto }]`, origen = el retiro). Si lanza, nada cambia.
4. Fecha de liquidación: no futura, ni anterior a la del retiro ni a la del último pago vigente
   (`FechaDeLiquidacionInvalida`).
5. `estado = 'liquidado'`; fija el desglose del retiro con el faltante en **`faltante_de_efectivo`** (Operación, E-1).
6. **Aviso** (E-8, no bloquea): si `custodio_usuario_id` es el usuario que liquida: «Usted es el custodio de este
   retiro: conviene que lo liquide otra persona.» La ventana lo muestra antes de confirmar (`liquidaElCustodio` en el
   `RetiroDto`) y la respuesta lo repite.
7. Auditoría: **solo si hay faltante**, `ajustar`, recurso `cuentas-por-pagar.retiros`, `anterior` = `RetiroDto`, con el
   motivo. Sin faltante, sin auditoría (cierre normal; queda `liquidado_por`). Evento `retiro_liquidado`.

**Reabrir** (`ReabrirRetiro`), con el retiro liquidado: con motivo; si hubo devolución, orden
`anular_movimiento_de_origen` del depósito (Bancos decide con o sin inverso; si su mes está conciliado y Bancos lo
rechaza, no se reabre). Limpia `devuelto`, `faltante`, `motivo_de_faltante`, la liquidación y el movimiento de
devolución; `estado = 'abierto'`; fija el desglose. Auditoría `reabrir`, recurso `cuentas-por-pagar.retiros`, `anterior`
= `RetiroDto`. Evento `retiro_reabierto`.

**Sin liquidar** (CP4-E-f: aviso a fin de mes): un retiro puede quedar abierto (efectivo en manos del custodio), sin
plazo ni bloqueo. Si su fecha es de un **mes anterior** al de hoy, sale el aviso fijo «El retiro N es de mm/aaaa y aún
tiene Q… sin usar: liquídelo o úselo; ese efectivo es de la empresa y está a cargo de (custodio).» en la lista de
retiros, en su ficha, al elegirlo para pagar y al registrar otro retiro (§4.1).

**Retiros por liquidar con fecha de corte** (E-7): la lista acepta `corte` (por omisión hoy) y muestra los retiros con
`fecha <= corte`, no anulados, y que al corte seguían abiertos (`estado = 'abierto'` o `fecha_de_liquidacion > corte`),
con el **disponible al corte** = monto − pagos vigentes con fecha `<=` corte, y el total. Sirve para saber el efectivo en
manos de custodios al cierre. Limitación: un pago anulado después del corte no cuenta (se mira el estado de hoy); la
versión imprimible y exportable es de CP5 (P-CPE-3).

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

## 5. Bancarización del pago en efectivo (CP4-E-d: **B condicionado al régimen**)

### 5.1 La norma

Decreto 20-2006 (Disposiciones legales para el fortalecimiento de la administración tributaria), **art. 20, reformado
por el art. 27 del Decreto 4-2012** (resumen del contador; el texto literal se coteja con la publicación oficial antes de
ponerlo en la ayuda): los pagos **a partir de Q30,000.00** que generen costos o gastos deducibles o créditos fiscales
deben hacerse por **medios del sistema bancario distintos del dinero en efectivo** que **individualicen al vendedor o
prestador** (cheque, tarjeta, transferencia); se tratan como **una sola operación** los pagos al **mismo proveedor en un
mes calendario** que lleguen al umbral y los pagos **parciales o fraccionados** de una operación de Q30,000.00 o más; si
no se cumple, el costo o gasto **no es deducible** del ISR y el IVA **no genera crédito fiscal**. El art. 21 pide
conservar los documentos bancarios 4 años. El Criterio SAT 5-2021: el efectivo **nunca** es pago bancarizado. Se usa la
variable `cuentas-por-pagar.bancarizacion.umbral` (instalación, Q30,000).

### 5.2 Efecto fiscal según el régimen y el documento (E-2)

Por cada **cargo** del pago se calcula qué perdería la empresa:

| Efecto | Hay efecto si | Fuente |
|---|---|---|
| **Crédito fiscal del IVA** | Cargo del libro con `regimen_iva_de_la_empresa = 'general'` **y** `iva − iva_no_acreditable > 0`. Saldo inicial: si el régimen de IVA de la empresa **a la fecha de inicio** es `general` (no se sabe el IVA: se supone tomado) | `libro_de_compras.documentos` (copiado al registrar) o `datos_fiscales_de_empresa` |
| **Deducción del ISR** | El régimen de ISR de la empresa vigente en el **período del documento** (saldo inicial: a la fecha de inicio) es `utilidades` | `libro_de_compras.datos_fiscales_de_empresa` (la fila vigente) |
| **Ninguno** | Ninguno de los dos (p. ej. pequeño contribuyente, ISR opcional simplificado o exento) | — |

**Empresa sin datos fiscales** (ninguna fila vigente): no se supone régimen; **aviso sin bloqueo** «Complete los datos
fiscales de la empresa en Libro de compras para saber si este pago en efectivo afecta el costo o el crédito fiscal.»
(interpretación del arquitecto, a confirmar: N-1 de §14).

El efecto del **pago** es la unión de los de sus cargos. Con efecto **ninguno**: ni aviso ni bloqueo, aunque se pase del
umbral.

### 5.3 Cuándo se dispara y qué pasa

Con este pago incluido (y los demás pagos de la misma operación al mismo proveedor: no hay, cada proveedor va una vez):

1. algún cargo del pago tiene **total** `>=` umbral (operación de Q30,000 o más, aunque se pague por partes), **o**
2. el pago en efectivo es `>=` umbral, **o**
3. la **suma del mes calendario** de la fecha del pago de lo pagado al proveedor por **todas** las formas (cheques, notas
   de débito, notas ligadas y efectivo vigentes; no la cuenta de apertura), **aplicado a cargos** (antes de retenciones:
   lo que se suma es `monto` de las líneas), es `>=` umbral.

Si se dispara y el pago **tiene efecto**: se rechaza con `EfectivoSobreElUmbral` salvo que el usuario tenga
**`pagos.efectivo-sin-bancarizar`** y escriba un **motivo** (1–300, `pagos.motivo_sin_bancarizar`;
`MotivoSinBancarizarObligatorio` si falta; sin el permiso, el motivo se rechaza con 403). El evento lleva `sinBancarizar
= true` para que Contabilidad lo marque como no deducible o sin crédito. El motivo y quien lo registró quedan en el pago
(`creado_por`); sin auditoría aparte (es un alta). Si no se dispara: nada.

**Texto** (E-5; solo los efectos que apliquen; lo cotejó el contador):

> Bancarización (Decreto 20-2006, art. 20): lo pagado a (proveedor) en mm/aaaa llega a Q… [o: la factura S-N es de Q30,000.00
> o más]. Los pagos de Q30,000.00 o más a un mismo proveedor en el mes, o de una operación de ese monto aunque se pague por
> partes, deben hacerse por cheque, transferencia o tarjeta a nombre del proveedor. Si paga en efectivo, [ese costo no es
> deducible del ISR] [y] [el IVA de (facturas) no es crédito fiscal; si ya lo tomó, rectifique la declaración de ese mes
> (Código Tributario, art. 106)]. Arrancar solo suma los pagos registrados en Cuentas por pagar.

La última frase es la limitación E-6 (pagos al proveedor hechos fuera de Cuentas por pagar no se ven).

### 5.4 El efectivo en el aviso de los pagos bancarios (CP4 §5.7, dictamen cambio 4)

- La suma del mes de CP4 §5.7 cuenta también el **efectivo**.
- El aviso de CP4 §5.7 se condiciona igual al efecto fiscal (§5.2): sin efecto, no sale.
- Al registrar un **cheque, nota de débito o nota ligada** que hace que el mes del proveedor llegue al umbral y ese mes
  tiene **pagos en efectivo** con efecto, el aviso (no bloquea: el cheque sí está bancarizado) dice: «Con este pago, lo
  pagado a (proveedor) en mm/aaaa llega a Q…: los pagos en efectivo de ese mes (recibos N, M) dejan de respaldar [el
  costo] [y] [el crédito fiscal] (Decreto 20-2006, art. 20). Consulte a su contador.»
- La regla se evalúa **al registrar**; lo que cambie después (otro pago, una anulación) lo ve en vivo el reporte de CP5.

### 5.5 Consecuencias fuera de este paso

- **CP5**: reporte «Pagos en efectivo sobre el umbral» calculado **en vivo** por mes y proveedor (también los que se
  volvieron problema después), con la marca **«crédito fiscal en riesgo por bancarización»** en cada factura con efecto
  de IVA, y la leyenda de la limitación E-6. Arrancar **no** rectifica nada ni toca el Libro de compras (P-CPE-3).
- **ISR**: el costo no deducible lo marca Contabilidad con `sinBancarizar` (y el reporte de CP5).
- El **retiro** en sí no tiene efecto de bancarización (es dinero de la empresa); solo el aviso de §4.1.
- Duda que deja el contador (media): si la SAT rechaza solo lo pagado en efectivo o toda la operación. El aviso habla de
  la operación completa (lo más prudente).

## 6. Contabilidad (para los eventos; Contabilidad no existe todavía)

| Hecho | Partida | Flujo de efectivo |
|---|---|---|
| Retiro | Debe **Caja – Efectivo para pagos a proveedores** (subcuenta a cargo del custodio) / Haber Bancos | **No es flujo**: del banco a la caja sigue siendo efectivo |
| Pago en efectivo | Debe Proveedores / Haber Caja – Efectivo para pagos a proveedores | **Operación** («Pagos a proveedores»), o **Inversión** si el cargo es de activo fijo |
| Devolución (depósito del sobrante) | Debe Bancos / Haber Caja – Efectivo para pagos a proveedores | No es flujo |
| Faltante | Debe **Cuenta por cobrar al custodio** o **pérdida** (la elige el contador; la pérdida es deducible solo con prueba, p. ej. denuncia) / Haber Caja – Efectivo para pagos a proveedores | **Operación** (E-1) |
| Retenciones | Ya están en Libro de compras (se descuentan una vez, como en los otros pagos) | — |

**Cómo se ve en el flujo de efectivo de Bancos** (el único que existe hoy, hecho sobre movimientos del banco): el
movimiento del retiro lleva el **desglose** de §4.2 —lo pagado en Operación o Inversión, el faltante en Operación, el
resto sin flujo—; el depósito de la devolución, sin flujo. Así el flujo cuenta lo que de verdad se pagó o se perdió y
nada de lo que sobró.

**Limitación aceptada como reporte de gestión** (dictamen punto 4): el desglose vive en el movimiento del retiro, así que
el flujo pone el pago en la **fecha del retiro**, no en la del pago; y el flujo de un mes ya impreso cambia al pagar,
anular, reaplicar o liquidar (como la nota ligada, CP4 §10.10). Por eso la **leyenda** de §3.4. **P-CPE-2 debe
resolverse antes de que Contabilidad emita estados financieros.**

## 7. Permisos, errores, API y cliente

### 7.1 Permisos (`modulo.ts` de Cuentas por pagar)

| Permiso | Para |
|---|---|
| `cuentas-por-pagar.retiros.ver` | Lista (con fecha de corte) y ficha de retiros, disponible al pagar |
| `cuentas-por-pagar.retiros.crear` | Registrar un retiro (crea el cheque o la nota en Bancos sin pedir permisos de Bancos, como `pagos.emitir`) |
| `cuentas-por-pagar.retiros.liquidar` | Liquidar y reabrir un retiro (crea o anula el depósito) |
| `cuentas-por-pagar.retiros.anular` | Anular un retiro sin pagos |
| `cuentas-por-pagar.pagos.pagar-en-efectivo` | Repartir el efectivo de un retiro en pagos |
| `cuentas-por-pagar.pagos.efectivo-sin-bancarizar` | Pagar en efectivo sobre el umbral, con motivo (§5.3) |

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
| `BeneficiarioDelRetiroInvalido` | `DatoInvalido` (`beneficiario`) | `beneficiario_del_retiro_invalido` | «Escriba a nombre de quién va el cheque (el custodio o la empresa); no se emite al portador.» |
| `CustodioInvalido` | `DatoInvalido` (`custodioUsuarioId`) | `custodio_invalido` | «Ese usuario no está activo o no entra a esta empresa.» |
| `RetiroNoDisponible` | `DatoInvalido` (`retiroId`) | `retiro_no_disponible` | «Ese retiro está liquidado, anulado o no existe.» |
| `PagoMayorQueElRetiro` | `DatoInvalido` (`pagos`) | `pago_mayor_que_el_retiro` | «Al retiro N solo le quedan Q… en efectivo; este reparto suma Q….» |
| `ProveedorRepetidoEnElReparto` | `DatoInvalido` (`pagos.<i>.proveedorId`) | `proveedor_repetido_en_el_reparto` | «(Proveedor) aparece dos veces: júntelo en un solo pago.» |
| `DemasiadosPagosEnElReparto` | `DatoInvalido` (`pagos`) | `demasiados_pagos_en_el_reparto` | «Un reparto lleva de 1 a 20 proveedores.» |
| `EfectivoSobreElUmbral` | `ReglaDeNegocioInfringida` | `efectivo_sobre_el_umbral` | Texto de §5.3 (con el índice del pago en `detalles`) |
| `MotivoSinBancarizarObligatorio` | `DatoInvalido` (`pagos.<i>.motivoSinBancarizar`) | `motivo_sin_bancarizar_obligatorio` | «Escriba por qué se paga en efectivo sobre el umbral.» |
| `RetiroConPagos` | `ReglaDeNegocioInfringida` | `retiro_con_pagos` | «El retiro N tiene los pagos …: anúlelos primero.» |
| `RetiroLiquidado` | `ReglaDeNegocioInfringida` | `retiro_liquidado` | «El retiro N ya se liquidó: reábralo primero.» |
| `RetiroCobrado` | `ReglaDeNegocioInfringida` | `retiro_cobrado` | «El banco ya pagó el cheque del retiro N: deposite el efectivo y liquide el retiro.» |
| `RetiroYaAnulado` / `RetiroNoLiquidado` | `ReglaDeNegocioInfringida` | `retiro_ya_anulado` / `retiro_no_liquidado` | «El retiro N ya está anulado.» / «El retiro N no está liquidado.» |
| `LiquidacionNoCuadra` | `DatoInvalido` (`devuelto`) | `liquidacion_no_cuadra` | «Lo devuelto más lo que falta debe ser Q… (lo que no se pagó).» |
| `MotivoDeFaltanteObligatorio` | `DatoInvalido` (`motivoDeFaltante`) | `motivo_de_faltante_obligatorio` | «Escriba por qué falta efectivo.» |
| `FechaDeLiquidacionInvalida` | `DatoInvalido` (`fecha`) | `fecha_de_liquidacion_invalida` | «La fecha no puede ser futura ni anterior al dd/mm/aaaa.» |

`MovimientoDeCuentasPorPagar`, `PagoYaAnulado`, `FechaDePagoInvalida`, `DemasiadosDocumentosEnPago` y los de Bancos pasan
tal cual. Mensajes de restricciones (`MENSAJES_POR_RESTRICCION`): ninguno nuevo (los checks los ataja el dominio antes).

### 7.4 Eventos (`core/contratos/cuentas-por-pagar.contratos.ts`)

- `EfectoDePago` suma `'efectivo'`; `pago_registrado` suma `forma: … | 'efectivo'`, `retiroId: string | null`,
  `sinBancarizar: boolean` y (M2) `contrasenaIds: string[]` en vez de `contrasenaId`; `pago_anulado` y `pago_reaplicado`
  suman `retiroId`.
- Nuevos: `retiro_registrado { empresaId, retiroId, numero, forma, fecha, montoCentavos, movimientoId,
  cuentaBancariaId, custodio, custodioUsuarioId }`, `retiro_liquidado { …, fecha, devueltoCentavos, faltanteCentavos,
  movimientoDeDevolucionId }`, `retiro_reabierto { …, fecha, fechaDeLiquidacion, devueltoCentavos, faltanteCentavos,
  anulacionEnBancos }`, `retiro_anulado { …, fecha, fechaOriginal, anulacionEnBancos }`. Nadie los escucha todavía.

### 7.5 API (prefijo `/api/cuentas-por-pagar`)

| Método y ruta | Permiso | Cuerpo / consulta | Respuesta |
|---|---|---|---|
| `GET /retiros` | `retiros.ver` | `estado?` (`abierto` por omisión), `corte?` (por liquidar a esa fecha, §4.5), `desde?`, `hasta?`, `soloConDisponible?`, `pagina`, `limite` | página de `RetiroResumenDto` (número, forma y documento bancario, fecha, custodio, monto, pagado, disponible —al corte si se pidió—, estado, `deMesAnterior`) y el total disponible |
| `GET /retiros/:id` | `retiros.ver` | — | `RetiroDto` (con sus pagos: número, proveedor, contraseñas, monto, estado; liquidación; movimientos; `puedeAnular`, `puedeLiquidar`, `puedeReabrir`, `liquidaElCustodio`, avisos) |
| `POST /retiros` | `retiros.crear` | `{ forma, fecha?, chequeraId?, chequeId?, noNegociable? (true), beneficiario?, cuentaBancariaId?, referencia?, monto, custodio?, custodioUsuarioId?, observaciones? }` (custodio o usuario, uno de los dos) | 201, `RetiroDto` con `avisos` |
| `POST /retiros/:id/pagos` | `pagos.pagar-en-efectivo` (y `ajustes.crear` si hay diferencias; `pagos.efectivo-sin-bancarizar` si algún pago trae motivo, revisado en el caso de uso) | `{ pagos: Array<{ proveedorId, fecha?, recibidoPor?, referencia?, observaciones?, motivoSinBancarizar?, aplicaciones: [{ cargoId, monto }], diferencias?: [{ cargoId, monto }] }> }` (1–20) | 201, `{ retiro: RetiroResumenDto, pagos: PagoDto[], avisos }` |
| `POST /retiros/:id/liquidar` | `retiros.liquidar` | `{ fecha?, devuelto, cuentaBancariaId?, referencia?, faltante, motivoDeFaltante? }` | `RetiroDto` |
| `POST /retiros/:id/reabrir` | `retiros.liquidar` | `{ motivo, fecha? }` | `RetiroDto` |
| `POST /retiros/:id/anular` | `retiros.anular` | `{ motivo, fecha? }` | `RetiroDto` |

`GET /proveedores/:id/para-pagar` (CP4 §8 con M2) suma, si el usuario tiene `pagos.pagar-en-efectivo`, la suma del mes
**en efectivo** y **total** y, por cargo, `efectoFiscal: { creditoFiscal, deduccionIsr }` y `sinDatosFiscales`, para que
la pantalla anticipe el bloqueo. `GET /pagos/proveedores-por-pagar` (CP4 §8) da el selector de proveedores del reparto.
El comprobante (`GET /pagos/:id/comprobante`) suma `retiro`, `custodio`, `recibidoPor` y `totalEnLetras`. La prueba de
API cubre cada ruta sin su permiso (403) y el motivo de la excepción sin `pagos.efectivo-sin-bancarizar` (403).

### 7.6 Cliente

- `paginas/Retiros.vue` (Operación, menú «Retiros de efectivo» dentro de Cuentas por pagar): lista «por liquidar» con
  disponible y antigüedad (`TarjetaDeRegistro`), filtro de estado y **fecha de corte** con el total, aviso de los de mes
  anterior, botones «Retirar efectivo» y «Pagar en efectivo».
- `componentes/VentanaDeRetiro.vue`: forma (Cheque / Retiro en ventanilla o cajero), cuenta y chequera con el siguiente
  número (de `GET /pagos/medios`), monto, fecha, custodio (texto o «elegir un usuario»), beneficiario (cheque, por omisión
  el custodio; sin opción «al portador»), «no negociable» encendido, boleta (nota), avisos de §4.1 y la ayuda IVE-BA-03.
  Lógica pura en `composables/retiros/edicion-de-retiro.ts` con su `*.prueba.ts`.
- `paginas/FichaDeRetiro.vue`: datos, movimiento de Bancos (enlace con permiso), pagos con enlace a su ficha, disponible,
  acciones «Pagar en efectivo», «Liquidar» (`VentanaDeLiquidacion`: sobrante calculado, devuelto + faltante que cuadran,
  cuenta y boleta, motivo del faltante, aviso si liquida el custodio; lógica pura en `composables/retiros/liquidacion.ts`),
  «Reabrir» y «Anular» (`VentanaDeMotivo`).
- **`paginas/PagoEnEfectivo.vue`** (formulario en página, ≤ 120 líneas; ruta `/cuentas-por-pagar/retiros/:id/pagar`, o
  `/cuentas-por-pagar/pagos/efectivo?proveedorId=&contrasenaId=` desde la ficha de la contraseña, que pide elegir el
  retiro): arriba el retiro con su disponible y lo que queda **mientras se reparte**; «Agregar proveedor» (selector de
  `proveedores-por-pagar`); por proveedor una sección plegable (`ProveedorDelReparto`) con sus cargos autorizados
  **agrupados por contraseña** (`CargosDelPago` de CP4-9), montos propuestos editables, «Recibido por», recibo del
  proveedor, fecha, el aviso o bloqueo de bancarización con el motivo si tiene el permiso, y su total; quitar un
  proveedor; un solo «Registrar pagos». Los errores vuelven a su proveedor y su línea. Al terminar: «Imprimir recibos»
  (todos) y enlaces a cada pago. Lógica pura en `composables/pagos/reparto-de-efectivo.ts` (totales, disponible que
  queda, proveedor repetido, límites, reglas de bancarización de §5 por pago, armado del cuerpo) con su `*.prueba.ts`.
- `paginas/RecibosDeEfectivo.vue` (impresión; `?pagos=id,id`): los recibos de un reparto, cada uno en su hoja, con el
  mismo componente que `ComprobanteDePago.vue`.
- `ComprobanteDePago.vue`: título «Recibo de pago en efectivo», custodio, por contraseña, total en letras, firmas y
  leyenda (§4.3).
- `FichaDePago.vue`: forma «Efectivo · Retiro N (custodio)»; anular sin fecha de inverso; el motivo de la excepción de
  bancarización, si lo hay.
- `NuevoPago.vue` (CP4-9) **no** lleva pestaña de efectivo: desde la contraseña, «Pagar en efectivo» lleva a
  `PagoEnEfectivo.vue` (un solo lugar para el efectivo).
- Rutas `/cuentas-por-pagar/retiros`, `/retiros/:id`, `/retiros/:id/pagar`, `/pagos/efectivo`, `/pagos/recibos`; textos
  en `textos.ts`.

## 8. Convivencia con CP4 y riesgos

1. **CP4-2 (en programación)**: esta adenda **no cambia sus saldos** (el saldo sale de `aplicaciones_de_pagos`, que no
   cambia) ni sus reglas de baja (`noTenerPagosVigentes` no mira la forma). Dos cuidados: (a) los pagos de una
   contraseña y `ContrasenaConPagos` se buscan por **`aplicaciones_de_pagos.contrasena_id`** (ya tiene índice), no por
   `pagos.contrasena_id`, que CP4-V1 quita; (b) los tipos de `forma` y `estadoDePago` no asumen que toda forma tiene
   movimiento ni que lo «comprometido» sale solo de un cheque (el efectivo nunca es futuro). Si CP4-2 llega a `main`
   usando `pagos.contrasena_id`, CP4-V1 lo cambia.
2. **Orden de bloqueo**: movimiento en Bancos → retiro → bancarización por proveedor (advisory) → pago → contraseñas →
   cargos; `fijar_desglose` vuelve al movimiento ya bloqueado. Igual que la nota ligada; no invierte ningún orden
   existente. El bloqueo de bancarización solo lo toma el efectivo: un cheque registrado a la vez que un pago en efectivo
   al mismo proveedor puede no verse en la suma del otro (raro); el reporte de CP5, en vivo, lo muestra.
3. **Rendimiento**: el disponible del retiro suma los pagos vigentes con `retiro_id` (índice parcial); la suma del mes
   usa `pagos_proveedor_fecha_idx` (CP4-V1). Una operación de 20 pagos y 300 cargos bloquea a lo sumo 300 filas.
4. **Conciliación**: el cheque del retiro se concilia como cualquier otro; una vez cobrado, el retiro no se anula (se
   liquida con devolución).
5. **Cheques caducos (H6b)**: el cheque de un retiro con pagos frena el lote con `RetiroConPagos`.
6. **Flujo de efectivo**: §6, limitación de fecha y leyenda.
7. **Borrar la empresa**: cascadas por `empresa_id`; las llaves `no action` se revisan al final del comando. Borrar un
   usuario deja el custodio como texto (`set null`).

## 9. Encaje con la futura Caja chica (y Cuentas por liquidar)

- El retiro **es** una «cuenta por liquidar» acotada a pagar proveedores. Cuando se diseñen *Caja chica y Cuentas por
  liquidar* (`HOJA-DE-RUTA.md`, punto 7), hay dos caminos, ninguno bloqueado por esta adenda:
  1. Ese módulo trae su propia forma de pago a proveedores (`pagos.forma = 'caja'` con llave a su movimiento de caja) y
     los retiros siguen siendo de Cuentas por pagar.
  2. O ese módulo **absorbe** los retiros: una migración de datos los convierte en sus anticipos por liquidar y
     `pagos.retiro_id` pasa a apuntar a su tabla. Se decide al diseñarlo.
- `efectivo_para_pagos` y `devolucion_de_efectivo_para_pagos` son **sin flujo**, como «Fondo de caja chica»; si Caja chica
  tiene cuentas de caja, la «transferencia a la caja» se agrega allí sin tocar estos.
- Nada aquí crea una «cuenta de caja» en Bancos ni un saldo de caja de la empresa: lo único que se sabe es el disponible
  de cada retiro abierto (y la lista con fecha de corte).

## 10. Un pago para varias contraseñas del mismo proveedor (CP4-E-e: **M2**)

En la práctica guatemalteca es común pagar en un cheque el mes de un proveedor que entregó varias contraseñas; con el
efectivo, el recibo de un proveedor también puede cubrir varias. **M2**: el pago es **del proveedor** y cada línea dice su
contraseña. Vale para **todas** las formas.

**Migración `0009_cp4_pago_de_varias_contrasenas`** (Cuentas por pagar; `bd:generar … cp4_pago_de_varias_contrasenas`,
revisada a mano; la primera después de la `0008`):

1. `drop constraint aplicaciones_de_pagos_pago_fk`, `pagos_contrasena_fk`, `pagos_llave_unica`; `drop index
   pagos_contrasena_idx`; `drop column pagos.contrasena_id`.
2. `add constraint pagos_id_proveedor_unico unique (id, empresa_id, proveedor_id)`; nueva `aplicaciones_de_pagos_pago_fk
   (pago_id, empresa_id, proveedor_id) → pagos (id, empresa_id, proveedor_id)`, no action (su índice sigue siendo
   `aplicaciones_de_pagos_par_unico (pago_id, cargo_id)`, que empieza por `pago_id`, como hoy).
3. `pagos_proveedor_fk (proveedor_id) → terceros.proveedores (id)`, no action (como `contrasenas_proveedor_fk`), con
   índice **`pagos_proveedor_fecha_idx (proveedor_id, fecha)`** (sirve también a la suma del mes de la bancarización).
   Antes la llave a la contraseña ya garantizaba el proveedor; sin ella hace falta esta.

`aplicaciones_de_pagos.contrasena_id` se queda: con la llave `aplicaciones_de_pagos_en_la_contrasena_fk` la base sigue
garantizando que cada cargo está en su contraseña; con la nueva llave al pago, que es del proveedor y la empresa del pago.
El dominio exige que la contraseña de cada línea sea la **vigente** del cargo (única por `contrasena_documentos_vigente_unico`;
el servidor la pone, el cliente no la manda).

**Datos existentes:** ninguno (`pagos` vacía en `main` y en desarrollo; si alguna fila existiera, cada pago tiene una sola
contraseña y basta con quitar la columna: sus líneas ya la llevan).

Los cambios que M2 hace en el diseño de CP4 (rutas por proveedor, `PagoDto.contrasenas`, comprobante por contraseña,
evento con `contrasenaIds`, reaplicar entre contraseñas del proveedor, ventana que suma otras contraseñas) **ya están
escritos en `diseno-cp4-pagos.md`** (§3.1, §3.2, §5.1, §5.11, §7.4, §8, §9 y §11).

## 11. Pasos (un commit cada uno; servidor y cliente por separado)

Estado al 2026-11-14 (verificado contra `main`): CP4-B1, CP4-B2a y CP4-1 (`0008`) en `main`; CP4-2 en programación (sin
migración). Esta adenda **no frena CP4-2**. Servidor con `programador-backend`, cliente con `programador-frontend`, QA con
`pruebas-qa`. Cada commit corre `npm run revisar` y sus pruebas y actualiza la bitácora de `PLAN.md`.

| Paso | Qué | Va después de |
|---|---|---|
| **CP4-V1** (servidor, varias contraseñas) | Migración **`0009_cp4_pago_de_varias_contrasenas`** (§10), `pagos.tablas.ts` y `aplicaciones_de_pagos` con las llaves e índice nuevos; ajustar lo que CP4-2 haya hecho con `pagos.contrasena_id`. **Pruebas de tablas**: línea de otra contraseña del mismo proveedor (pasa), de otro proveedor (falla), cargo fuera de su contraseña (falla), proveedor inexistente (falla); `politicas-de-los-modulos` y `llaves-entre-esquemas` | CP4-2 en `main`; **antes de CP4-3** |
| **CP4-EB** (servidor, Bancos) | Migración **`0033_cp4_efectivo_para_pagos`** (tres conceptos, §3.4), `CONCEPTOS_DE_SISTEMA`, `ClaveDeConceptoDeSistema`, **leyenda** del flujo de efectivo (pantalla, impresión y Excel). **Pruebas**: migración repetible, flujo con un retiro desglosado (parte en Operación, parte en Inversión, faltante en Operación, resto sin flujo), su devolución, la leyenda solo cuando hay esos conceptos | Ya se puede (CP4-B2a en `main`); en paralelo con CP4-2 y CP4-V1 (otro módulo), nunca con otra migración de Bancos |
| **CP4-E1** (servidor, datos) | Migración **`0010_cp4_pagos_en_efectivo`** (§3.3), `retiros-de-efectivo.tablas.ts`, cambios en `pagos.tablas.ts`. **Pruebas de tablas**: cada check (estado, anulación, liquidación, devolución con depósito, faltante con motivo, retiro solo en efectivo, movimiento nulo en efectivo, recibido por y motivo sin bancarizar solo en efectivo), llave compuesta del retiro, custodio usuario con `set null`, RLS, `politicas-de-los-modulos` y `llaves-entre-esquemas` | CP4-V1 en `main` (nunca en paralelo con otra migración de Cuentas por pagar) |
| CP4-3 a CP4-5 | Como el diseño de CP4, ya con M2 (rutas por proveedor) y con la suma del mes y el aviso de §5.4 (el efectivo aún no existe: la consulta ya lo incluye por `forma`) | CP4-3 después de CP4-V1 |
| **CP4-E2** (servidor, retiros) | `RegistrarRetiroDeEfectivo` (beneficiario, no negociable, custodio usuario), `AnularRetiro`, `ListarRetiros` (con corte), `ObtenerRetiro`, el caso del retiro en el manejador de `movimiento_por_cambiar`, permisos `retiros.ver/crear/anular`, eventos, rutas. **Pruebas** de API: cheque y nota, posfechado (rechazo), beneficiario vacío o «Al Portador» (rechazo), no negociable por omisión, custodio usuario de otra empresa (rechazo), saldo insuficiente (nada se guarda), anular sin pagos desde aquí y desde Bancos, cobrado (rechazo), corregir o eliminar en Bancos (rechazo), Cuentas por pagar inactivo (rechazo), lista con corte, aviso de mes anterior, sin permiso | CP4-EB, CP4-E1 y CP4-4 (el manejador) |
| **CP4-E3** (servidor, repartir y pagar en efectivo) | `RegistrarPagosEnEfectivo` (1–20 pagos, todo o nada), disponible, bloqueo de bancarización, desglose del retiro, efecto fiscal por régimen y documento (§5.2, puerto de lectura de datos fiscales), regla y permiso de excepción, anular y reaplicar (`retiroAbierto`), suma del mes con efectivo y aviso de «contaminación» en los pagos bancarios (§5.4). **Pruebas**: un reparto a tres proveedores (uno con dos contraseñas), proveedor repetido (rechazo), más que el disponible (rechazo; nada se guarda), un pago malo hace fallar todo el reparto, fecha anterior al retiro (rechazo), retención en el primer pago, cargo de activo fijo (desglose), umbral por cargo, por pago y por mes con empresa general (bloqueo; con permiso y motivo pasa), con pequeño contribuyente (nada), con ISR opcional simplificado y IVA general (solo crédito fiscal en el texto), sin datos fiscales (aviso), cheque que lleva el mes al umbral con efectivo previo (aviso), anular un pago (disponible y desglose vuelven), con el retiro liquidado (rechazo), reaplicar, dos repartos a la vez al mismo proveedor (el segundo ve al primero) | CP4-E2 y CP4-5 (patrón de la nota ligada) |
| **CP4-E4** (servidor, liquidar y recibo) | `LiquidarRetiro` (faltante en `faltante_de_efectivo`, aviso del custodio), `ReabrirRetiro`, el caso de la devolución en el manejador, permiso `retiros.liquidar`, auditoría, eventos; recibo en `ComprobanteDePago` (título, custodio, por contraseña, total en letras). **Pruebas**: liquidar sin sobrante, con devolución (depósito sin flujo), con faltante (auditoría `ajustar`, desglose en Operación), que no cuadra (rechazo), liquida el custodio (aviso), reabrir (anula el depósito), anular el depósito desde Bancos (reabre), depósito conciliado (no reabre), contenido del recibo (leyenda) | CP4-E3 y CP4-8 (comprobante) |
| CP4-9 a CP4-11 | Como el diseño de CP4 (con M2) | — |
| **CP4-E5** (cliente) | Retiros (lista con corte, ventana, ficha, liquidar, reabrir, anular), `PagoEnEfectivo` (reparto), `RecibosDeEfectivo`, recibo. Lógica pura con pruebas | CP4-E4, CP4-9 y CP4-10 |
| CP4-12 (QA) | Suma: retiro con cheque no negociable a nombre del custodio; **un reparto** a dos proveedores (uno con dos contraseñas) en una operación; recibos impresos (uno por proveedor); un pago sobre el umbral (bloqueo y excepción con permiso); empresa pequeño contribuyente (sin bloqueo); anular uno; liquidar con devolución y faltante; reabrir; intentar anular en Bancos el cheque del retiro (rechazo) y el depósito (reabre); flujo de efectivo con el desglose y la leyenda; lista con fecha de corte; un cheque por dos contraseñas; celular | CP4-E5 y CP4-11 |

## 12. Preguntas para el usuario (respondidas el 2026-11-14)

- **CP4-E-a. Cómo se registra el retiro.** **Respondida: A** (desde Cuentas por pagar, con origen). B queda como P-CPE-4.
- **CP4-E-b. Formas de retiro.** **Respondida:** cheque (a nombre del custodio o de la empresa) y nota de débito; **«no
  negociable» encendido** por omisión y **sin cheque al portador** (se rechaza el beneficiario vacío o «al portador»).
- **CP4-E-c. Número del recibo.** **Respondida:** el **mismo correlativo** de pagos.
- **CP4-E-d. Bancarización.** **Respondida: B condicionado al régimen** (E-2): bloqueo salvo permiso y motivo, solo si la
  empresa pierde crédito fiscal o deducción del ISR; el texto nombra solo eso.
- **CP4-E-e. Varias contraseñas en un pago.** **Respondida: M2**, antes de CP4-3 (CP4-V1). Con la precisión del usuario:
  un retiro paga a **uno o varios proveedores** con un pago y un recibo por proveedor, repartido en una sola operación.
- **CP4-E-f. Lo que sobra.** **Respondida:** se deposita al liquidar o queda en el retiro; **aviso a fin de mes** (sin
  plazo configurable ni bloqueo).
- **CP4-E-g. Lo que falta.** **Respondida:** faltante con motivo y auditoría; **flujo de Operación** (E-1); la cuenta la
  decide Contabilidad.
- **CP4-E-h. Custodio.** **Respondida:** texto con **usuario opcional**; aviso si el custodio liquida su propio retiro.

## 13. Validado por `contador-guatemala` (2026-11-14)

Dictamen `dictamen-cp4-efectivo-2026-11-14.md`: **correcto con ajustes**, ya aplicados (los nueve «Cambios que el diseño
debe recibir»): cita del art. 20 reformado (§5.1); concepto «Faltante de efectivo» en la `0033` y en el desglose (§3.4,
§4.5); bancarización por régimen y documento con textos por efecto (§5.2, §5.3); el efectivo en el aviso de los pagos
bancarios (§5.4); marca en el reporte de CP5 sin tocar el Libro de compras (§5.5); no negociable encendido y sin al
portador (§2.3); leyenda en el flujo y P-CPE-2 antes de los estados financieros (§3.4, §6); lista con fecha de corte y
aviso del custodio (§4.5); cita NIIF corregida y limitación de la suma del mes (§3.4, §5.3). También E-9 (IVE-BA-03 en
la ayuda, §2.3).

## 14. Pendientes y lo nuevo para decidir

- **P-CPE-1:** foto del recibo firmado como archivo del pago (con la revisión de archivos); fuera de esta adenda.
- **P-CPE-2 (antes de los estados financieros de Contabilidad):** el flujo con la fecha del pago, no la del retiro (el
  reporte de flujo de Bancos leería los pagos en efectivo por una orden a Cuentas por pagar, o lo hace Contabilidad).
- **P-CPE-3:** reportes de CP5: «Pagos en efectivo sobre el umbral» (con «crédito fiscal en riesgo por bancarización» y la
  leyenda E-6) y «Retiros por liquidar» a una fecha de corte, imprimibles y exportables.
- **P-CPE-4:** opción B de §2.2 (ligar un retiro registrado en Bancos), si el usuario la pide.
- **P-CPE-5 (menor, para el coordinador):** el aviso de bancarización de CP2 (aplicar notas, `cargos-para-aplicar`) no
  mira el régimen; alinearlo con §5.2 cuando se toque CP2. No frena nada.
- **N-1 (usuario):** empresa **sin datos fiscales** en Libro de compras: se propone **aviso sin bloqueo** (§5.2). La
  alternativa es tratarla como régimen general (bloquear). Recomendado: aviso, porque «sin filas no se supone ningún
  régimen» es la regla de Libro de compras.
- **N-2 (contador):** confirmar la tabla de §5.2: (a) solo el régimen de IVA `general` tiene crédito fiscal que perder
  (¿y `contribuyente_agropecuario`?); (b) solo ISR `utilidades` pierde deducción (opcional simplificado y exento no);
  (c) el régimen que cuenta es el del **período del documento** (cuando se tomó el crédito y se causó el gasto), no el
  de la fecha del pago; (d) un **saldo inicial** de una empresa general se supone con crédito fiscal tomado.
- **N-3 (contador, vigencia):** una fuente consultada (IURISTEC) menciona que la Corte de Constitucionalidad **suspendió
  provisionalmente** el art. 27 del Decreto 4-2012 en octubre de 2012 (expediente 2836-2012). El dictamen da la vigencia
  2026 como media-alta y la práctica aplica Q30,000; conviene confirmar el resultado final de ese expediente antes de
  poner la cita en la ayuda. No cambia el diseño (el umbral es una variable).
- **Interpretaciones del arquitecto (a confirmar al programar, no frenan):** máximo 20 proveedores y 300 cargos por
  reparto; la fecha de cada pago del reparto puede ser distinta; el efectivo no va como pestaña de `NuevoPago` sino en su
  propia pantalla de reparto; el bloqueo de bancarización por proveedor solo lo toma el efectivo.
