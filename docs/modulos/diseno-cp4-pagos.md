# Diseño CP4: pagos a proveedores de Cuentas por pagar — arquitecto de datos, 2026-11-13

Estado: **propuesta para aprobar**. Aterriza el paso **CP4** de `cuentas-por-pagar.md` («Pagos: órdenes a *Bancos* para
emitir y anular cheques —también posfechados— y notas de débito con origen y concepto; el aviso de Bancos cuando se
anulan desde allá; el usuario elige las facturas autorizadas y los montos de cada pago; las retenciones se descuentan en
el primer pago de cada factura»), con lo que le dejaron anotado CP1 (`diseno-datos-cuentas-por-pagar.md` §7), U8
(`diseno-u8-saldos-iniciales-cuentas-por-pagar.md` §2, «Consecuencias para CP4»), CP2 (`diseno-cp2-notas-de-credito.md`
§9.4), CP3 (`diseno-cp3-contrasenas.md` §9.5) y los dictámenes (`dictamen-u8-saldos-iniciales-2026-11-08.md`,
`dictamen-cp2-cp3-2026-11-08.md`, `validacion-h7-h11-retenciones.md`). Va **después de CP3 y de U8l-2** (usa sus tablas y
sus migraciones `0006` y `0007`). Lo nuevo que aparezca al programar va a §14.

**Ya decidido y que no se vuelve a preguntar:**

| Tema | Decisión | Fuente |
|---|---|---|
| Todo pago va por contraseña | Una contraseña se paga con 1 o N pagos; **solo se paga lo autorizado** | `cuentas-por-pagar.md`, Decisiones |
| Qué cubre cada pago | El usuario elige qué cargos **autorizados** de la contraseña paga y cuánto a cada uno | Reglas de contraseñas, pagos y anulaciones |
| Formas que crean dinero | **Cheque** (también **posfechado**: cuenta en Bancos en su fecha) o **nota de débito** (transferencia o débito) de una cuenta bancaria, creados en Bancos por el mediador con el proveedor como beneficiario | `cuentas-por-pagar.md`, Flujo 6; hoja de ruta (posfechados) |
| Permiso entre módulos | El permiso de pagar de Cuentas por pagar basta para crear el cheque o la nota en Bancos | Decisiones |
| Concepto en Bancos | Lo fija este módulo y no se cambia en Bancos: `pago_a_proveedor` (Operación) o uno de **Inversión** si las facturas son de activo fijo (P2); con el módulo activo, un cheque manual no usa «Pago a proveedores» (P3, ya hecho) | Decisiones; `bancos.md` P3, P6 |
| Pago mixto gasto y activo | **Un solo pago con varias líneas**; el flujo de efectivo reparte por el concepto de cada factura | Respuestas del 2026-09-29 (tarde) |
| Retenciones | Ya vienen **fijadas** de Libro de compras (al registrar). Cuentas por pagar **no** las calcula ni las fecha: solo las **descuenta una sola vez, en el primer pago** de cada cargo | `validacion-h7-h11-retenciones.md`; decisión del 2026-09-29 y del 2026-10-04 |
| Saldos iniciales y retenciones | El saldo de un saldo inicial **ya va neto de todas** las retenciones: **no** se descuentan otra vez (`retencion_descontada = 0`); con `retenciones_por_practicar > 0` se **avisa sin descontar** | U8 §2, C-U8-2 |
| Nota de débito ya registrada en Bancos (seguros, débitos automáticos, FEL del banco) | Forma de pago que **liga** la nota (marcada en Bancos «para uso de Cuentas por pagar») a las facturas de la contraseña, sin emitir otro pago; varias notas por contraseña y aplicaciones parciales; la nota marcada lleva el concepto «Pago a proveedores» contra la transitoria «Pagos a proveedores por aplicar»; una nota ligada no se desmarca ni se anula sin anular antes lo que la liga; al cierre de cada mes se listan las marcadas sin ligar para desmarcarlas con auditoría | Respuestas del 2026-09-29; seguimiento del contador del 2026-09-29 |
| Dos formas extra de los saldos iniciales | «**Ligar al cheque o nota de saldo inicial de Bancos**» y «**Aplicar a la cuenta de apertura**» (la excepción), con permiso propio, en la contraseña | Hoja de ruta; U8 |
| Apertura con la carga cerrada | Aplicar a la cuenta de apertura con la carga **cerrada** es una **corrección de error de períodos anteriores** (NIIF para las Pymes secc. 10.21) o un ajuste del período, **no** un movimiento contra la cuenta puente | Dictamen U8, «Cambios» 10 |
| Reintegro del proveedor | El saldo a favor (saldo libre de una nota de crédito) que el proveedor **devuelve** es un **cobro**, no un ajuste: entra por **Bancos o en efectivo** | U13; usuario y contador, 2026-11-08 (bitácora) |
| Diferencias al pagar | Las de **centavos** pueden ir como ajuste (tabla `ajustes_de_saldo`); un **descuento de precio exige nota de crédito** del proveedor (Ley del IVA arts. 17 y 29 lit. d) | CP2-e; dictamen CP2-CP3, CP2-e y «otros» 14 |
| Bancarización | Umbral `cuentas-por-pagar.bancarizacion.umbral` (instalación, Q30,000) de CP2-3; aviso **sin bloquear** | CP2 §6.5; dictamen C-CP2-1 |
| Anular un pago desde aquí | Anula también el cheque o la nota en Bancos, en la misma transacción | Reglas de contraseñas, pagos y anulaciones |
| Anular el cheque o la nota desde Bancos | Se permite; Bancos avisa **dentro de la transacción** y este módulo revierte lo suyo (anula el pago y devuelve el saldo) o **rechaza** y no se anula nada | Igual |
| Contraseña con pagos | No se anula (`ContrasenaConPagos`) | CP3 §5.3 |
| Contraseña anulada | Sin reversión; suelta sus documentos | CP3 |
| Separación de funciones | Permisos distintos para registrar, autorizar y pagar; nada depende del tipo de rol | PLAN §3.5; `cuentas-por-pagar.md` |
| Saldos | **Calculados**, no guardados | U4 |
| Pantallas de Operación | Sin Excel; los reportes de pagos son de CP5 | Regla de secciones |
| Cualquier rubro y régimen | Nada supone rubro, régimen ni que la empresa sea **agente de retención**: si no lo es, sus documentos llegan con `retenciones = 0` y no hay nada que descontar | CLAUDE.md |
| Fuera de esta versión | Anticipos a proveedores, moneda extranjera, pagos programados en lote de varios proveedores, descuentos por pronto pago | `cuentas-por-pagar.md`, «Fuera de esta versión» |

## 1. Lo encontrado en el código y la base

1. **Cuentas por pagar** (`servidor/src/modulos/cuentas-por-pagar/`): `dependeDe: ['libro-de-compras', 'bancos']` (U10),
   así que sus tablas **sí** pueden llevar llaves hacia `bancos.*` y leerlas desde `infraestructura`. Tablas en `main`:
   `documentos`, `aplicaciones_de_notas` (con `forma`, `fecha`, `referencia`), `condiciones_de_proveedor` y
   `ajustes_de_saldo` (solo notas de crédito; `causa`, `estado`, anulación). CP3 (`contrasenas`, `contrasena_documentos`,
   `aplicaciones_de_notas.contrasena_id`) y U8l-2 (`documento_afectado_id` → id propio, `factura_del_sistema_anterior`)
   están aprobados pero **todavía no en `main`**.
2. **Migraciones de Cuentas por pagar** (`migraciones/meta/_journal.json`): la última en `main` es
   `0005_cp2_anulacion_del_ajuste` (`when` 1794536194742). CP3-1 tomará la **`0006_cp3_contrasenas`** y U8l-2 la
   **`0007_u8l_notas_sobre_saldos_iniciales`**. Esta es la **`0008_cp4_pagos`**, con `when` mayor que el de la `0007`.
   (Aviso para CP3: su §3.4 y su paso CP3-1 todavía dicen «`0005`»; la bitácora del 2026-11-12 ya la movió a la `0006`.
   Corregirlo al programar CP3-1.)
3. **Reglas ampliables** (`dominio/reglas-de-baja.ts`): `REGLAS_PARA_ANULAR`, `REGLAS_PARA_ELIMINAR` y
   `REGLAS_PARA_DESAUTORIZAR` (vacía, «los pagos (CP4) sumarán aquí»); U8 `REGLAS_PARA_CORREGIR_SALDO_INICIAL`; CP2
   `REGLAS_PARA_QUITAR_APLICACION` (vacía «para CP3 y CP4»); CP3 dejará `REGLAS_PARA_ANULAR_CONTRASENA` y
   `REGLAS_PARA_QUITAR_DE_CONTRASENA`.
4. **Saldos** (`dominio/saldos.ts`, SQL `ConsultaBaseDeDocumentos`): cargo = `coalesce(saldo_al_inicio, total −
   retenciones) − aplicado`; nota = `coalesce(saldo_al_inicio, total) − aplicado − ajustado`. La retención ya se resta
   siempre del neto: «descontarla en el primer pago» es un dato del pago, no del saldo (CP1 §4.2).
5. **Libro de compras** guarda cada retención en `libro_de_compras.retenciones` (`impuesto`, `monto`, `fecha`,
   `constancia_numero`, `constancia_fecha`, `resolucion`). Cuentas por pagar puede **leerla** desde `infraestructura`
   (Libro de compras está en su `dependeDe`) para el comprobante del pago y el aviso de constancia sin emitir.
6. **Bancos** (`servidor/src/modulos/bancos/`, `dependeDe: []`):
   - `bancos.movimientos` ya tiene `modulo_de_origen` y `documento_de_origen_id` (P6; sin llave, juntos o ninguno, check
     `movimientos_origen_completo`). `Movimiento.crear(…, { origen })` es la única puerta; ninguna ruta lo acepta. Con
     origen solo se bloquea **reclasificar** (`NoSeReclasificaLoDeOtroModulo`); **corregir, eliminar, anular y
     blanquear** un movimiento con origen hoy **no** avisan a nadie (B7: «Pendiente: llega con esos módulos»).
   - Un movimiento lleva **un solo** `concepto_id` (llave compuesta con la empresa). No existe desglose por concepto.
   - Conceptos de sistema: `transferencia`, `pago_a_proveedor` (débito, Operación, «Pagos a proveedores»),
     `saldo_inicial`, `sin_clasificar`. **No hay** uno de sistema de Inversión para pagos de activo fijo («Compra de
     activo» es sugerido y editable: este módulo no lo puede buscar por clave) ni uno para el reintegro de un proveedor.
   - Puerto `CuentasPorPagarActivo` (P3) sobre los módulos activos. **No existe** `core/contratos/bancos.contratos.ts`
     ni ningún manejador del mediador en Bancos.
   - **No existe la «nota marcada para uso de Cuentas por pagar»**: ninguna columna, regla ni pantalla (decisión del
     2026-09-29 sin programar). Una nota de débito tampoco puede elegir hoy el concepto `pago_a_proveedor`.
   - **El saldo inicial de una cuenta es una sola nota** (`movimientos.saldo_inicial`, único por cuenta,
     `movimientos_un_saldo_inicial`). **No hay cheques ni notas en circulación al empezar**: la «Ventana de saldos
     iniciales con notas y cheques» es de *Bancos, segunda parte* (`HOJA-DE-RUTA.md`) y no está diseñada. Por eso la
     forma «ligar al cheque o nota de saldo inicial de Bancos» **no tiene todavía a qué ligarse** (§5.6, pregunta CP4-c).
   - Anular un cheque (`AnularCheque`): con su mes abierto, «a la antigua» (marca `anulado_en`, sin inverso, fuera del
     saldo); con su mes conciliado, nota de crédito inversa. Una nota se anula con su inverso (`AnularMovimiento`). Blanquear
     **borra** el movimiento del cheque y libera el número.
   - Migraciones: la última en `main` es `0030_h2_saldo_del_estado_de_cuenta`; Bancos H2b (en curso en otra sesión) tiene
     reservada la **`0031_h2_archivo_del_estado_de_cuenta`**. La de este diseño es la **`0032`** (o la siguiente libre).
7. **`Reversible`**: el plan pide «extraer `Reversible` del código de Bancos al core» antes de CP4. B7 dejó escrito que el
   patrón común «se discutirá cuando llegue `Partida.revertir` en Contabilidad». En este diseño **ningún registro de
   Cuentas por pagar crea su inverso**: el pago se **anula** (estado) y el inverso lo crea Bancos con su propio código.
   Extraerlo ahora no lo usaría nadie (pregunta CP4-a).
8. **Correlativos** (`core.correlativos`, `CorrelativosPostgres`): el patrón `numero integer` + `anio_de_numero integer
   not null default 0` con único `(empresa_id, anio_de_numero, numero)` que usan Bancos y CP3.
9. **Auditoría**: `AccionAuditada` ya tiene `anular`, `corregir`, `quitar` y `ajustar` (CP2-4). No hace falta una nueva.
10. **Base de desarrollo** (solo lectura, 2026-11-13): `cuentas_por_pagar.documentos` sin filas; `bancos.movimientos` con
    10 filas, ninguna con origen, una de saldo inicial. Tablas nuevas: no hay datos que convertir.

## 2. Modelo

### 2.1 Qué es un pago y qué no

| Hecho | Qué es | Dónde se guarda | Mueve dinero en Bancos |
|---|---|---|---|
| **Pago con cheque** | Sale dinero; Cuentas por pagar ordena a Bancos emitir el cheque con origen | `pagos` (`forma = 'cheque'`) + `aplicaciones_de_pagos` | Sí: lo crea |
| **Pago con nota de débito** | Transferencia o débito que sale de una cuenta; lo crea Bancos por orden | `pagos` (`forma = 'nota_de_debito'`) | Sí: lo crea |
| **Ligar una nota de débito ya registrada** | El banco ya debitó (seguro, débito automático); la nota está **marcada** en Bancos y se aplica a facturas | `pagos` (`forma = 'nota_ligada'`) | No: usa la que existe |
| **Ligar al cheque o nota de saldo inicial de Bancos** | Factura de saldo inicial pagada antes del corte con un documento todavía en circulación | `pagos` (`forma = 'saldo_inicial_de_bancos'`) | No | 
| **Aplicar a la cuenta de apertura** | Saldo inicial que ya estaba pagado y se cargó por error o por historial (la excepción) | `pagos` (`forma = 'cuenta_de_apertura'`) | No |
| **Diferencia de centavos** | Lo que queda de un cargo después del pago y no se va a perseguir | `ajustes_de_saldo` (sobre el **cargo**, causa `diferencia_menor`) | No |
| **Reintegro del proveedor** | El proveedor devuelve el saldo a favor de una o varias notas de crédito; es un **cobro**, no un pago, y **no** va por contraseña | `reintegros` + `aplicaciones_de_reintegros` | Por depósito sí (lo crea); en efectivo no |

Las tres primeras formas son las «normales»; las dos de saldo inicial son excepciones con permiso propio. **Un pago
tiene una sola forma** y, si mueve dinero, **un solo movimiento** de Bancos. Una contraseña puede tener varios pagos de
formas distintas (un cheque por una parte y una nota ligada por otra).

### 2.2 Saldo derivado (sigue sin guardarse, U4)

```
saldo de un cargo  = neto
                   − Σ aplicaciones de notas recibidas (todas las formas)          (CP1, CP2, CP3)
                   − Σ aplicaciones de pagos vigentes (monto)                      (CP4)
                   − Σ ajustes vigentes del cargo (diferencias de centavos)        (CP4)
   con neto = coalesce(saldo_al_inicio, total − retenciones)                       (U8)

saldo libre de una nota de crédito = base − Σ aplicaciones hechas − Σ ajustes vigentes
                                   − Σ aplicaciones de reintegros vigentes         (CP4)
   con base = coalesce(saldo_al_inicio, total)                                     (U8)
```

`retencion_descontada` **no** entra en el saldo: la retención ya está restada en el neto. Es el dato que dice en qué
pago se «descontó» para el comprobante y para el proveedor: el primer pago de una factura de Q11,200.00 con Q1,200.00 de
retención que paga Q5,000.00 **cubre** Q6,200.00 de la factura (Q5,000.00 en dinero y Q1,200.00 en constancia); el
segundo, de Q5,000.00, cubre Q5,000.00. «Pagado» y «pagado en parte» siguen sin ser estados: salen del saldo
(`estadoDePago`: `pendiente`, `en_parte`, `pagado`).

### 2.3 Efecto contable de cada forma (para el evento; Contabilidad no existe todavía)

| Forma | Partida que Contabilidad sacará del evento | `efecto` en el evento |
|---|---|---|
| Cheque o nota de débito | Debe Proveedores / Haber Bancos (la cuenta de la cuenta bancaria) | `banco` |
| Nota ligada | Debe Proveedores / Haber «Pagos a proveedores por aplicar» (la nota marcada ya hizo Debe transitoria / Haber Bancos) | `transitoria_por_aplicar` |
| Saldo inicial de Bancos | Debe Proveedores / Haber cuenta puente de apertura (el dinero ya salió antes del corte) — **a validar** (C-CP4-3) | `apertura` |
| Cuenta de apertura, **carga abierta** | Debe Proveedores / Haber cuenta puente de apertura (es parte de la apertura) | `apertura` |
| Cuenta de apertura, **carga cerrada** | Corrección de error de períodos anteriores (NIIF para las Pymes 10.21) o ajuste del período; **no** contra la puente | `correccion_de_error` |
| Diferencia de centavos de un cargo | Debe Proveedores / Haber otros ingresos (diferencias) — **a validar** (C-CP4-5) | `ingreso` (nuevo en `EfectoDeAjuste`) |
| Reintegro por depósito | Debe Bancos / Haber Proveedores (cuenta deudora del proveedor) | `banco` |
| Reintegro en efectivo | Debe Caja / Haber Proveedores | `efectivo` |

## 3. Datos (esquema `cuentas_por_pagar`)

Decisiones generales:

| Tema | Decisión | Por qué |
|---|---|---|
| Una tabla de pagos o una por forma | **Una** (`pagos`) con `forma`, y checks por forma | Contraseña, saldos, anulación, comprobante y reportes tratan igual a todas; las diferencias son dos columnas nulas |
| Encabezado y líneas | `pagos` (un movimiento, una fecha, un monto) + `aplicaciones_de_pagos` (cuánto a cada cargo) | Un cheque paga varias facturas (el plan: `pago_aplicaciones`). Se llama `aplicaciones_de_pagos` por simetría con `aplicaciones_de_notas` |
| Anular | Los pagos **no se borran**: se anulan (estado), y sus líneas quedan con `vigente = false` | Correlativo, rastro del cheque y del proveedor; el único parcial de la retención (abajo) solo mira lo vigente |
| Reintegros | Tablas propias (`reintegros` + `aplicaciones_de_reintegros`), fuera de la contraseña | Es un cobro: no lo autoriza nadie ni va en la contraseña; consume saldo libre de notas, no saldo de cargos |
| Empresa o cuenta | Todas **por empresa** (`politicaPorEmpresa()`) | Lo que se debe y lo que se paga es de cada empresa |
| Alcance por registro | Ninguno | El plan no lo pide |
| Llaves hacia Bancos | `movimiento_id → bancos.movimientos (id)`, **no action**, con índice | Bancos está en el `dependeDe` (PLAN §3.2); un movimiento que tuvo pagos no se borra (§6.3) |

### 3.1 Tabla nueva `cuentas_por_pagar.pagos`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK (`idPrimario`); es el `documento_de_origen_id` del movimiento en Bancos |
| `empresa_id` | uuid | no | FK `core.empresas` on delete cascade |
| `proveedor_id` | uuid | no | solo para las llaves compuestas |
| `contrasena_id` | uuid | no | FK `pagos_contrasena_fk (contrasena_id, empresa_id, proveedor_id) → contrasenas (id, empresa_id, proveedor_id)` (`contrasenas_id_proveedor_unico`), no action |
| `numero` | integer | no | correlativo `cuentas-por-pagar.pagos`; check `pagos_numero_positivo`: `numero > 0` |
| `anio_de_numero` | integer | no | `default 0`; el año si la empresa reinicia sus correlativos (el de `fecha`) |
| `forma` | text | no | check `pagos_forma_valida`: `forma in ('cheque', 'nota_de_debito', 'nota_ligada', 'cuenta_de_apertura')` (CP4-13 suma `'saldo_inicial_de_bancos'`, §5.6) |
| `fecha` | date | no | cheque y nota de débito: la del movimiento (el cheque **posfechado** lleva la suya); nota ligada y apertura: la de la aplicación (§5.2) |
| `monto` | numeric(14,2) | no | check `pagos_monto_positivo`: `> 0`. Σ `aplicaciones_de_pagos.monto` (lo revisa el dominio; prueba de consistencia) |
| `movimiento_id` | uuid | sí | FK `pagos_movimiento_fk → bancos.movimientos (id)`, no action. Check `pagos_movimiento_de_su_forma`: `(forma = 'cuenta_de_apertura') = (movimiento_id is null)` |
| `referencia` | text | sí | Nota ligada: opcional (p. ej. número de póliza del seguro). Apertura: opcional (cheque o comprobante del sistema anterior). Cheque y nota de débito: va a Bancos, no se guarda aquí → check `pagos_referencia_de_su_forma`: `referencia is null or forma in ('nota_ligada', 'cuenta_de_apertura')`; check `pagos_referencia_valida`: `referencia is null or (char_length(referencia) between 1 and 100 and referencia = btrim(referencia))` |
| `motivo` | text | sí | Solo en `cuenta_de_apertura`, obligatorio: check `pagos_motivo_de_apertura`: `(forma = 'cuenta_de_apertura') = (motivo is not null)`; `pagos_motivo_rango`: `motivo is null or char_length(motivo) between 1 and 300` |
| `con_carga_cerrada` | boolean | sí | Solo en `cuenta_de_apertura`: la carga inicial estaba cerrada al registrarlo (decide `efecto`, §2.3). Check `pagos_carga_de_apertura`: `(forma = 'cuenta_de_apertura') = (con_carga_cerrada is not null)` |
| `observaciones` | text | sí | check `pagos_observaciones_validas`: `is null or (char_length between 1 and 500 and = btrim)` |
| `estado` | text | no | `default 'vigente'`; check `pagos_estado_valido`: `in ('vigente', 'anulado')` |
| `anulado_en` | timestamptz | sí | |
| `anulado_por` | uuid | sí | |
| `motivo_de_anulacion` | text | sí | check `pagos_motivo_de_anulacion_rango`: `is null or char_length between 1 and 300` |
| `...marcasDeTiempo`, `...autoria` | | | `creado_por` = quien pagó |

Check de estado `pagos_anulacion_completa`: `(estado = 'anulado') = (anulado_en is not null and anulado_por is not null
and motivo_de_anulacion is not null)` (con la lección de CP2-2: en `vigente` los tres nulos).

Únicos e índices:

| Nombre | Definición | Para |
|---|---|---|
| `pagos_numero_unico` | unique `(empresa_id, anio_de_numero, numero)` | El correlativo no se repite |
| `pagos_llave_unica` | unique `(id, empresa_id, proveedor_id, contrasena_id)` | Destino de la llave compuesta de `aplicaciones_de_pagos` (garantiza misma empresa, proveedor y contraseña) |
| `pagos_movimiento_creado_unico` | unique `(movimiento_id) where forma in ('cheque', 'nota_de_debito')` | Un cheque o una nota creados por un pago son de **ese** pago. Una nota ligada sí puede cubrir varios pagos (varias contraseñas) |
| `pagos_movimiento_idx` | `(movimiento_id) where movimiento_id is not null` | Llave y aviso de Bancos (`¿quién usa este movimiento?`) |
| `pagos_contrasena_idx` | `(contrasena_id)` | Pagos de una contraseña; cubre la llave |
| `pagos_lista_idx` | `(empresa_id, estado, fecha)` | Lista con filtros (y «Pagos realizados» de CP5) |

RLS: `politicaPorEmpresa()`.

### 3.2 Tabla nueva `cuentas_por_pagar.aplicaciones_de_pagos`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `empresa_id` | uuid | no | FK `core.empresas` on delete cascade |
| `proveedor_id` | uuid | no | para las llaves |
| `pago_id` | uuid | no | FK `aplicaciones_de_pagos_pago_fk (pago_id, empresa_id, proveedor_id, contrasena_id) → pagos (id, empresa_id, proveedor_id, contrasena_id)`, no action |
| `contrasena_id` | uuid | no | para las llaves (la del pago) |
| `cargo_id` | uuid | no | FK `aplicaciones_de_pagos_cargo_fk (cargo_id, empresa_id, proveedor_id) → documentos (id, empresa_id, proveedor_id)` **on delete cascade** (decisión de abajo) **y** FK `aplicaciones_de_pagos_en_la_contrasena_fk (contrasena_id, cargo_id) → contrasena_documentos (contrasena_id, documento_id)` (`contrasena_documentos_par_unico`), **no action** |
| `monto` | numeric(14,2) | no | Lo que este pago entrega al proveedor por ese cargo; check `aplicaciones_de_pagos_monto_positivo`: `> 0` |
| `retencion_descontada` | numeric(14,2) | no | `default 0`; check `aplicaciones_de_pagos_retencion_valida`: `>= 0`. Las retenciones del cargo si este es su **primer pago vigente**; si no, 0. Siempre 0 en un saldo inicial (U8) |
| `vigente` | boolean | no | `default true`; pasa a `false` al anular el pago |
| `...marcasDeTiempo`, `...autoria` | | | |

| Nombre | Definición | Para |
|---|---|---|
| `aplicaciones_de_pagos_par_unico` | unique `(pago_id, cargo_id)` | Un cargo una vez por pago; cubre la llave del pago |
| `aplicaciones_de_pagos_retencion_una_vez` | unique `(cargo_id) where vigente and retencion_descontada > 0` | **La base garantiza** que la retención de un cargo se descuenta **en un solo pago vigente** (también con dos usuarios a la vez) |
| `aplicaciones_de_pagos_cargo_idx` | `(cargo_id) where vigente` | Saldo del cargo (la subconsulta `pagado_al_cargo`) |
| `aplicaciones_de_pagos_contrasena_idx` | `(contrasena_id, cargo_id)` | Índice de la llave hacia `contrasena_documentos` |
| `aplicaciones_de_pagos_cargo_todas_idx` | `(cargo_id)` | Índice de la llave hacia `documentos` (la cascada) |

RLS: `politicaPorEmpresa()`.

**Lo que garantiza la base:** que el cargo es del proveedor y la empresa del pago, que **está en la contraseña del
pago** (llave a `contrasena_documentos`; por eso un cargo con pagos —vigentes o anulados— no se puede quitar de su
contraseña, §5.8) y que la retención no se descuenta dos veces. **Lo que revisa el dominio** (otras filas, con las filas
bloqueadas): que el cargo esté **autorizado**, no anulado y sea de clase cargo; que `monto <= saldo`; que Σ montos =
`pagos.monto`; que `retencion_descontada` sea exactamente las retenciones del cargo o 0; que `vigente` coincida con el
estado del pago (prueba de consistencia, como CP3).

**Decisión: `on delete cascade` hacia el documento** (como CP2-i y CP3-g). Un cargo con pagos **vigentes** no se da de
baja (regla `noTenerPagosVigentes`, §5.8), así que la cascada solo se lleva líneas de pagos **anulados**, que quedan en el
`anterior` de la auditoría del documento eliminado. Con `no action`, un saldo inicial con un pago anulado no se podría
eliminar nunca con la carga abierta (U8 no lo anula). La llave hacia `contrasena_documentos` es `no action` a propósito:
al eliminar el documento, las dos cascadas (la de `contrasena_documentos` de CP3 y esta) borran las filas en la misma
sentencia y la revisión `no action` del final ya no encuentra nada.

### 3.3 Tablas nuevas de reintegros

`cuentas_por_pagar.reintegros` (encabezado: un cobro, una forma, a lo sumo un movimiento):

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id`, `empresa_id`, `proveedor_id` | | no | como `pagos`; `proveedor_id` con FK `reintegros_proveedor_fk → terceros.proveedores (id)`, no action, con índice |
| `numero`, `anio_de_numero` | integer | no | correlativo `cuentas-por-pagar.reintegros` (el recibo que la empresa le extiende al proveedor); único `reintegros_numero_unico (empresa_id, anio_de_numero, numero)` |
| `forma` | text | no | check `reintegros_forma_valida`: `in ('deposito', 'efectivo')` (pregunta CP4-h: ligar una nota de crédito ya registrada) |
| `fecha` | date | no | la del depósito o la del recibo de caja |
| `monto` | numeric(14,2) | no | `> 0`; Σ de sus aplicaciones |
| `movimiento_id` | uuid | sí | FK `reintegros_movimiento_fk → bancos.movimientos (id)`, no action; único parcial `reintegros_movimiento_unico (movimiento_id) where movimiento_id is not null`; check `reintegros_movimiento_de_su_forma`: `(forma = 'deposito') = (movimiento_id is not null)` |
| `referencia` | text | sí | En efectivo **obligatoria** (número del recibo de caja o de la boleta): check `reintegros_referencia_en_efectivo`: `forma <> 'efectivo' or referencia is not null`; `reintegros_referencia_valida` (1–100, sin espacios al borde) |
| `observaciones`, `estado`, `anulado_en`, `anulado_por`, `motivo_de_anulacion` | | | como `pagos`, con `reintegros_anulacion_completa` |
| `...marcasDeTiempo`, `...autoria` | | | |

`cuentas_por_pagar.aplicaciones_de_reintegros`: `id`, `empresa_id`, `proveedor_id`, `reintegro_id` (FK compuesta
`(reintegro_id, empresa_id, proveedor_id) → reintegros (id, empresa_id, proveedor_id)` con el único
`reintegros_id_proveedor_unico`), `nota_id` (FK compuesta a `documentos (id, empresa_id, proveedor_id)`, **on delete
cascade** con la misma razón que §3.2), `monto > 0`, `vigente boolean default true`, autoría y marcas. Único
`(reintegro_id, nota_id)`; índice `(nota_id) where vigente` (saldo libre) e índice `(nota_id)`. RLS por empresa.

Lo que revisa el dominio: que `nota_id` sea una **nota de crédito** registrada o autorizada (como el ajuste, CP2 §5.3),
fuera de una contraseña vigente (`NotaEnContrasena`), y que el monto no pase de su saldo libre.

### 3.4 Cambios en `cuentas_por_pagar.ajustes_de_saldo` (CP2)

Para las diferencias de centavos de un **cargo** (CP2-e):

| Columna o restricción | Regla |
|---|---|
| `pago_id` uuid, nulo | FK `ajustes_pago_fk (pago_id) → pagos (id)`, no action; índice parcial `ajustes_pago_idx (pago_id) where pago_id is not null`. El ajuste que nació con un pago se **anula con él** (§5.4) |
| Comentario de la tabla y TSDoc | «Baja del saldo libre de una nota **o** de una diferencia menor de un cargo» |

El check `ajustes_causa_valida` no cambia. Que un ajuste sobre un **cargo** solo use `diferencia_menor` lo revisa el
dominio (la clase del documento es otra fila), igual que hoy revisa que el documento sea una nota. El efecto ya no sale
solo de la causa: `diferencia_menor` sobre una nota es `perdida`; sobre un cargo, `ingreso` (§2.3, C-CP4-5).

### 3.5 Migración `0008_cp4_pagos`

Con `npm run bd:generar -w servidor -- cuentas-por-pagar cp4_pagos`, revisada a mano (las llaves compuestas, la que va a
`contrasena_documentos` y los únicos parciales pueden pedir escribirse a mano, como en la `0001`). Requiere en `main` la
`0006` (CP3-1) y la `0007` (U8l-2); `when` mayor que el de la `0007`. Orden:

1. `create table pagos` con checks, únicos, índices, llaves (la de `bancos.movimientos` y la compuesta a `contrasenas`) y
   RLS.
2. `create table aplicaciones_de_pagos` con lo de §3.2.
3. `create table reintegros` y `aplicaciones_de_reintegros` (§3.3).
4. `alter table ajustes_de_saldo add column pago_id uuid`, llave e índice.

Sin relleno (tablas nuevas; `ajustes_de_saldo.pago_id` nace nulo). Sin migración de permisos (son nuevos). Ninguna
migración en otro esquema desde este módulo (lo de Bancos va en su propia migración, §6.5). El correlativo no necesita
fila previa.

### 3.6 Mensajes de restricciones (`MENSAJES_POR_RESTRICCION`)

| Restricción | Mensaje |
|---|---|
| `aplicaciones_de_pagos_retencion_una_vez` | «Otro pago de este documento ya descontó su retención; vuelva a abrir la ventana.» (dos pagos a la vez; el dominio lo revisa antes) |
| `pagos_movimiento_creado_unico`, `reintegros_movimiento_unico`, `pagos_numero_unico`, `reintegros_numero_unico` | Sin mensaje: error de programación |
| `aplicaciones_de_pagos_en_la_contrasena_fk` (`23503` al quitar de la contraseña un documento con pagos) | Sin mensaje propio (el `23503` responde `RecursoEnUso`); la regla `noTenerPagosEnLaContrasena` (§5.8) lo ataja antes |

## 4. Integración con CP1, U8, CP2, CP3 y U8-l (lo que cambia en el código existente)

| Pieza | Cambio |
|---|---|
| `saldoDe()` / `AplicadoAlDocumento` (dominio) | Suma `pagadoCentavos` (Σ `monto` de aplicaciones de pagos vigentes), `ajustadoCentavos` también en cargos y `reintegradoCentavos` en notas (§2.2) |
| SQL (`ConsultaBaseDeDocumentos`, `consultas-de-saldos.drizzle.ts`) | Subconsultas `pagado_al_cargo`, `ajustado_del_documento` (ya existe para notas: se generaliza) y `reintegrado_de_la_nota`, con `leftJoin` como las de CP2; la fila trae `pagado` y `reintegrado` |
| DTO `DocumentoPorPagarDto` | `pagado`, `reintegrado`, `estadoDePago` (`pendiente`/`en_parte`/`pagado`, solo cargos); ficha con `pagos: PagoDelDocumentoDto[]` (número, forma, fecha, monto, retención descontada, estado) y, en la nota, `reintegros` |
| `FichaDelDocumentoDto` (auditoría) | Los pagos (vigentes y anulados) y reintegros del documento, para el `anterior` de una baja |
| `HechosDelDocumento` / `accionesDelDocumento` | `tienePagosVigentes`, `tieneReintegrosVigentes`; `puedeDesautorizar`, `puedeAnular` y `puedeEliminar` falsos con pagos vigentes; `puedeAjustar` también en un **cargo** con saldo `> 0` y `<=` el tope de diferencia menor; `puedeReintegrar` en una nota con saldo libre, registrada o autorizada, fuera de una contraseña |
| CP1 reglas de baja | `noTenerPagosVigentes` **al principio** de `REGLAS_PARA_ANULAR` y `REGLAS_PARA_ELIMINAR` (antes que `noEstarEnContrasena` de CP3: con pagos, quitarlo de la contraseña o anularla tampoco se puede y el mensaje correcto es «anule el pago N») y en `REGLAS_PARA_DESAUTORIZAR` → `DocumentoConPagos`. `noTenerReintegrosVigentes` en anular y eliminar una nota → `NotaConReintegros` |
| CP1 bajas por aviso de Libro de compras | Sin cambio de código: corren las listas. Libro de compras muestra el mensaje |
| U8 `REGLAS_PARA_CORREGIR_SALDO_INICIAL` | Suma `noTenerPagosVigentes` («no tiene pagos», lo que U8 §5 dejó anotado). Uno con pagos solo anulados se puede corregir o eliminar (la cascada se lleva sus líneas) |
| CP2 `REGLAS_PARA_QUITAR_APLICACION` | Suma «el cargo tiene pagos vigentes» → `DocumentoConPagos` (quitar la aplicación haría que lo pagado pase de lo que se debía) |
| CP2 ajuste (`AjustarSaldo`) | Acepta un **cargo** con causa `diferencia_menor` (§5.4); para una nota no cambia. `EFECTO_DE_LA_CAUSA` pasa a depender de la clase (`efectoDelAjuste(causa, clase)`) |
| CP2 `noTenerAjustesVigentes` | Mira también los ajustes de un cargo |
| CP3 `REGLAS_PARA_ANULAR_CONTRASENA` | `noTenerPagosVigentes` → `ContrasenaConPagos` |
| CP3 `REGLAS_PARA_QUITAR_DE_CONTRASENA` | `noTenerPagosEnLaContrasena` (vigentes **o anulados**: la llave lo exige) → `DocumentoConPagosEnLaContrasena` |
| CP3 editar con pagos | CP3 §9.5 decía «cerrará `puedeEditar` al primer pago». Este diseño propone **no cerrarla** (pregunta CP4-e): con pagos se sigue pudiendo cambiar la fecha prometida, agregar documentos y quitar los que no tienen pagos |
| CP3 `ContrasenaDto` y su impresión | Cada cargo gana `pagado` (vivo) y la contraseña `pagos` (lista corta) y `estadoDePago`; la impresión suma la columna «Pagado» en lo vivo (rotulada «al dd/mm/aaaa»). La lista gana la etiqueta «Pagada» o «Pagada en parte» |
| CP3 reparto de notas | Sin cambio: reparte sobre el saldo de cada cargo, que ahora resta lo pagado. Si una contraseña con pagos rehace su reparto (agregar una nota), la nota cubre lo que quede |
| U8-l | Sin cambio: la nota sobre factura anterior se aplica sola al saldo inicial; si ese saldo inicial ya está pagado del todo, la nota queda libre (aviso de U8-l) y se reintegra, se aplica o se ajusta |

## 5. Reglas

### 5.1 Pagar con cheque o nota de débito

Una petición crea **un** pago con **una** forma, para uno o varios cargos (1 a 100) de **una** contraseña, en la
transacción del caso de uso (`RegistrarPago`), con `pagos.emitir`:

1. Pide la carga inicial (`CargaInicial`, bloqueo compartido) si algún cargo es saldo inicial (para la fecha mínima).
2. **Revisión temprana sin bloquear** (para no gastar un número de cheque en algo que se va a rechazar): la contraseña es
   **vigente** (`ContrasenaAnulada`); cada cargo está en ella (`DocumentoFueraDeLaContrasena`), es de clase cargo, **está
   autorizado** (`DocumentoSinAutorizar`: «solo se paga lo autorizado»), no anulado, sin repetir; cada monto `> 0` y
   `<=` su saldo (`PagoMayorQueElSaldo`); fecha (paso 5).
3. **Orden a Bancos** (§6.1) por el mediador: `bancos.emitir_cheque_de_origen` o `bancos.registrar_nota_de_origen`, con
   el origen `{ modulo: 'cuentas-por-pagar', documentoId: <id del pago, generado antes> }`, el beneficiario (§5.7), el
   monto total, la fecha y el **desglose por concepto** (§6.2). Bancos aplica **todas** sus reglas (cuenta y chequera
   activas, cheque disponible, saldo y sobregiro, saldo inicial primero, mes conciliado) y responde el
   `movimientoId`, el número del cheque o de la nota y la cuenta. Si Bancos lanza, no se guarda nada.
4. **Bloquea** la contraseña y después los cargos (`for update`, en orden de id) y **vuelve a revisar** el paso 2 con las
   filas bloqueadas (dos pagos a la vez del mismo cargo: el segundo falla aquí y se deshace también su cheque). Orden de
   bloqueo de todo el módulo: **Empresas → Bancos → Cuentas por pagar** (§10.6).
5. **Fecha**: por omisión hoy. No anterior a la fecha de la contraseña, ni a la **fecha de recepción** en el libro de
   cada cargo, ni a la **fecha de inicio** si algún cargo es saldo inicial (`FechaDePagoInvalida`, dice la mínima): pagar
   antes de recibir la factura sería un anticipo, que está fuera de esta versión. **Sí puede ser futura** (cheque
   posfechado; Bancos lo cuenta en su fecha). En la nota de débito, futura solo si Bancos lo admite (lo decide su regla).
6. **Retención**: por cada cargo de `origen = 'libro_de_compras'` con `retenciones > 0` y **sin** otra aplicación
   vigente con `retencion_descontada > 0`, esta línea lleva `retencion_descontada = retenciones` (el primer pago
   vigente); si no, 0. Los saldos iniciales siempre 0 (U8). El monto en dinero no cambia: el saldo ya era neto.
7. **Número**: `correlativos.siguiente('cuentas-por-pagar.pagos', fecha)`, después de validar.
8. Inserta el pago (`estado = 'vigente'`) y sus líneas; si la petición trae **diferencias** (§5.4), crea esos ajustes con
   `pago_id`.
9. Sin auditoría (alta; `creado_por`). Evento `cuentas-por-pagar.pago_registrado` al confirmar (§7.4).
10. Responde el `PagoDto` con los **avisos** que no bloquean (§5.5).

**Propuesta de la ventana** (solo pantalla, el usuario la cambia): los cargos **autorizados** de la contraseña con saldo,
por vencimiento (el más viejo primero), cada uno con `propuesto = saldo`. Los no autorizados se muestran apagados con
«Sin autorizar: no se puede pagar».

### 5.2 Ligar una nota de débito ya registrada (`forma = 'nota_ligada'`)

Con `pagos.ligar-notas-de-debito`. Igual que §5.1 salvo:

- No hay orden de emitir. La nota la elige el usuario entre las **marcadas para Cuentas por pagar** (§6.3) de la
  empresa con **disponible** `> 0`, donde `disponible = monto de la nota − Σ montos de los pagos vigentes que la ligan`.
- Se **bloquea primero la nota en Bancos** (`select … for update` sobre `bancos.movimientos` desde `infraestructura`,
  lectura permitida por el `dependeDe`, solo para bloquear: el mismo recurso de CP1 §4.7) y después la contraseña y los
  cargos. La nota debe ser de débito, vigente (ni revertida, ni inverso, ni anulada), **marcada** y de la misma empresa
  (`MovimientoNoLigable`).
- `monto del pago <= disponible` (`PagoMayorQueLaNota`).
- **Fecha** de la aplicación: por omisión hoy; no futura, ni anterior a la de la nota en Bancos, ni a las mínimas de
  §5.1.5 (`FechaDePagoInvalida`). Es la fecha en que se aplica la transitoria contra Proveedores (§2.3).
- Aviso, sin bloquear, si algún cargo tiene activo fijo: «La nota quedó con el concepto “Pago a proveedores”
  (Operación); este documento es de activo fijo» (C-CP4-4). Aviso si la nota es de un **año anterior** al de la
  aplicación (seguimiento del contador del 2026-09-29: «nota de diciembre y FEL de enero»).
- Sin retenciones nuevas: si el cargo tiene retenciones (una FEL gravada de un seguro con retención), la regla de §5.1.6
  vale igual.

### 5.3 Aplicar a la cuenta de apertura (`forma = 'cuenta_de_apertura'`)

Con `pagos.aplicar-a-apertura`. La excepción para lo que **ya estaba pagado** y se cargó como saldo inicial:

1. Pide la carga inicial. **Todos** los cargos del pago son `origen = 'saldo_inicial'` (`SoloSaldosIniciales`).
2. Autorizados (la regla general: solo se paga lo autorizado) y en la contraseña, como §5.1.
3. **Con la carga abierta**: se rechaza si el saldo inicial todavía se puede corregir o eliminar (registrado y sin
   movimientos) → `CorrijaElSaldoInicial` («la carga está abierta: corrija o elimine el saldo inicial en Saldos
   iniciales»). Si ya no se puede (autorizado o con notas aplicadas o pagos), se permite y queda `con_carga_cerrada =
   false` (`efecto = 'apertura'`, contra la cuenta puente). **Con la carga cerrada**: `con_carga_cerrada = true`
   (`efecto = 'correccion_de_error'`, NIIF para las Pymes secc. 10). Pregunta CP4-d.
4. **Motivo obligatorio** (1–300) y referencia opcional (cheque o comprobante del sistema anterior). Fecha por omisión
   hoy; no futura ni anterior a la fecha de inicio.
5. Sin retención descontada (U8). Sin movimiento.
6. **Auditoría `ajustar`**, recurso `cuentas-por-pagar.pagos`, `anterior` = las fichas de los cargos antes del pago, con
   el motivo: es dar por pagada una deuda sin dinero (como el ajuste de U13).
7. Aviso fijo de la ventana (texto del contador): «Use esta forma solo si el documento ya se había pagado antes de la
   fecha de inicio. Con la carga inicial cerrada es una corrección de error de períodos anteriores: avise a su
   contador.»

### 5.4 Diferencias al pagar

- En la ventana de pago, si después del monto escrito a un cargo le queda un saldo **mayor que cero y hasta el tope**
  `cuentas-por-pagar.ajustes.tope_diferencia_menor` (Q25 por omisión, empresa e instalación; CP2), la ventana ofrece
  «Dar por saldada la diferencia de Q0.03» (casilla, apagada por omisión). Si se marca, la petición trae `diferencias:
  [{ cargoId, monto }]` y se crea un ajuste del **cargo** con causa `diferencia_menor`, `pago_id` = este pago, motivo
  fijo «Diferencia al pagar con el pago N» y fecha la del pago (permiso `ajustes.crear` además de `pagos.emitir`).
- Si la diferencia **pasa del tope**, no se ofrece: el cargo queda pagado en parte y la ventana dice «Si el proveedor le
  hizo un descuento, pídale la nota de crédito (Ley del IVA, arts. 17 y 29)». No hay forma de «descuento sin nota».
- Fuera de un pago, la ficha de un cargo con saldo `<=` tope ofrece «Ajustar diferencia» (CP2 §5.3 con la causa fija
  `diferencia_menor`, `pago_id` nulo).
- Anular el pago **anula** sus ajustes (`AnularAjuste` dentro de la misma transacción, con el motivo del pago).
- Evento `ajuste_registrado` con `efecto = 'ingreso'` en un cargo (§2.3).

### 5.5 Avisos que no bloquean (en la respuesta del pago y en la ventana antes de confirmar)

| Caso | Aviso |
|---|---|
| Cargo del libro con retención que este pago descuenta y **sin constancia** en Libro de compras (`retenciones.constancia_numero` nulo en alguna) | «La retención de IVA (o ISR) de la factura S-N no tiene constancia registrada: emítala en Retenciones Web y entréguela con este pago.» |
| Saldo inicial con `retenciones_por_practicar > 0` (U8 §2, consecuencia 2) | «Este documento tiene Q… de retenciones por practicar del sistema anterior: emita la constancia en Retenciones Web y entérela. Arrancar no las descuenta del pago.» |
| Bancarización (§5.7) | «Este pago es parte de Q… pagados a este proveedor en el mes (umbral Q30,000.00): …» |
| Nota ligada de activo fijo o de un año anterior | §5.2 |
| Cheque posfechado | «El cheque cuenta en Bancos el dd/mm/aaaa; el documento queda pagado desde hoy.» |

### 5.6 Ligar al cheque o nota de saldo inicial de Bancos (`forma = 'saldo_inicial_de_bancos'`)

**No se puede programar todavía**: Bancos no registra cheques ni notas en circulación al empezar (§1.6). Lo que queda
definido para que no haya que rediseñar:

- Será igual que la nota ligada (§5.2) —mismo bloqueo, mismo «disponible», un movimiento puede cubrir varios pagos—
  pero el movimiento debe ser una **partida del saldo inicial** de Bancos (cheque o nota de débito en circulación al
  empezar, como lo marque el diseño de Bancos) y **todos** los cargos, `origen = 'saldo_inicial'`. Permiso propio
  `pagos.ligar-saldos-iniciales-de-bancos`. Fecha de la aplicación: la fecha de inicio por omisión.
- Valor frente a «cuenta de apertura»: si el cheque viejo se **anula** después (caducó, no se entregó), Bancos avisa y el
  pago se anula solo: la factura vuelve a deberse. Con «cuenta de apertura» eso se perdería.
- Llega en el paso **CP4-13**, con su migración (`pagos_forma_valida` suma el valor) **después** de que Bancos diseñe y
  programe sus saldos iniciales con notas y cheques (*Bancos, segunda parte*). Mientras tanto, lo que se pagó con un
  cheque anterior al corte se resuelve con «cuenta de apertura» y la referencia del cheque (pregunta CP4-c y C-CP4-3).

### 5.7 Beneficiario y bancarización

- **Beneficiario** del cheque o de la nota: el nombre del proveedor en Terceros (razón social si la tiene), **no
  editable** en CP4 (bancarización: el pago va al proveedor de la factura). Un pago a un cesionario (factura cambiaria
  cedida) queda fuera de esta versión (pregunta CP4-g).
- **Cheque no negociable**: por omisión encendido (como ya hace Bancos). Si los cargos del pago tienen total `>=` umbral, o
  si lo pagado al proveedor en el **mes calendario** de la fecha del pago (pagos vigentes con dinero, más este) llega al
  umbral, la ventana avisa al apagarlo: «Bancarización (Decreto 20-2006): los pagos de Q30,000.00 o más a un mismo
  proveedor en el mes deben hacerse por el sistema bancario a nombre del proveedor; emita el cheque no negociable.» (con
  el umbral real; C-CP4-2 confirma el texto y si «no negociable» es exigible).
- «Cuenta de apertura» no es un pago del período (no mueve dinero): no entra en la suma del mes.

### 5.8 Bajas y reglas que suma CP4 en los otros pasos

| Regla | Dónde | Error |
|---|---|---|
| `noTenerPagosVigentes` | Anular, eliminar y desautorizar documentos (antes que CP3), corregir o eliminar un saldo inicial, quitar una aplicación de nota del cargo, anular una contraseña | `DocumentoConPagos` / `ContrasenaConPagos` |
| `noTenerPagosEnLaContrasena` | Quitar un documento de la contraseña (vigentes o anulados; lo exige la llave) | `DocumentoConPagosEnLaContrasena` |
| `noTenerReintegrosVigentes` | Anular o eliminar una nota de crédito | `NotaConReintegros` |
| `REGLAS_PARA_ANULAR_PAGO` | Anular un pago (desde aquí o por aviso de Bancos); vacía salvo `noEstarCobrado` (pregunta CP4-f); Contabilidad sumará la del mes cerrado | `PagoCobrado` |

### 5.9 Anular un pago

**Desde Cuentas por pagar** (`AnularPago`, `pagos.anular`), con motivo (1–300) y, si mueve dinero, la **fecha del inverso**
(por omisión hoy; la valida Bancos):

1. Bloquea el pago; vigente → si no, `PagoYaAnulado`. Corre `REGLAS_PARA_ANULAR_PAGO`.
2. Cheque o nota de débito: orden `bancos.anular_movimiento_de_origen { movimientoId, origen, motivo, fecha }` (§6.1).
   Bancos decide cómo (cheque de mes abierto: a la antigua; mes conciliado: inverso; nota: inverso), revisa sus reglas
   (mes conciliado del inverso, sobregiro) y **no** devuelve el aviso de §6.3 a quien lo ordenó (lleva `origen`). Si
   lanza, nada cambia.
3. Nota ligada y cuenta de apertura: **nada** en Bancos; la nota recupera su disponible.
4. `estado = 'anulado'`, `anulado_en/por`, `motivo_de_anulacion`; sus líneas `vigente = false` (la retención descontada
   queda libre para el siguiente pago del cargo); anula sus ajustes de diferencia (§5.4).
5. Auditoría `anular`, recurso `cuentas-por-pagar.pagos`, `anterior` = `PagoDto` como estaba (con sus líneas y el
   movimiento), con el motivo.
6. Evento `cuentas-por-pagar.pago_anulado` al confirmar (§7.4).

**Por aviso de Bancos** (`bancos.movimiento_por_cambiar`, §6.3): el manejador busca los pagos **vigentes** con ese
`movimiento_id`:

| Cambio que pide Bancos | Pago creado por Cuentas por pagar (cheque, nota de débito) | Nota ligada |
|---|---|---|
| `anular` (también la anulación en lote de cheques caducos) | Corre `REGLAS_PARA_ANULAR_PAGO`; si pasan, hace los pasos 4 a 6 (sin volver a ordenar a Bancos) con el motivo del aviso | **Rechaza** con `MovimientoLigadoAPagos`: «La nota está aplicada al pago N de la contraseña M: anule primero ese pago en Cuentas por pagar.» (decidido: no se anula sin anular antes lo que la liga) |
| `eliminar`, `blanquear`, `corregir` (monto, fecha, cuenta, beneficiario) | **Rechaza** con `MovimientoDeCuentasPorPagar`: «Lo emitió Cuentas por pagar (pago N): anule el pago desde allá.» | Rechaza con `MovimientoLigadoAPagos` |
| `desmarcar` / `reclasificar` | No aplica (ya está bloqueado por P6) | Rechaza con `MovimientoLigadoAPagos` |
| `eliminar` de un movimiento que solo tiene pagos **anulados** | Rechaza: «Tuvo pagos en Cuentas por pagar: anúlelo en vez de eliminarlo.» (la llave `no action` lo exigiría igual) | Igual |

El manejador es **idempotente** (sin pagos vigentes con ese movimiento y sin pagos anulados en un `eliminar`, no hace
nada) y corre en la transacción de Bancos: si lanza, Bancos no cambia nada.

### 5.10 Reintegros

`RegistrarReintegro` (`reintegros.crear`), desde la ficha de una nota de crédito o desde la pantalla «Notas de crédito»
(varias notas del mismo proveedor en un reintegro, 1–100):

1. Pide la carga inicial; bloquea las notas (en orden de id): notas de crédito **registradas o autorizadas** (como el
   ajuste), del mismo proveedor, fuera de una contraseña vigente; cada monto `> 0` y `<=` su saldo libre
   (`ReintegroMayorQueElSaldoLibre`).
2. Fecha: por omisión hoy; no futura ni anterior a la recepción de cada nota ni a la fecha de inicio si alguna es saldo
   inicial (`FechaDeReintegroInvalida`).
3. **Depósito**: orden `bancos.registrar_nota_de_origen` con `tipo = 'credito'`, la cuenta elegida, el monto, el
   proveedor como «beneficiario» (quien depositó), la referencia (número de boleta o transferencia) y el concepto de
   sistema `reintegro_de_proveedor` (§6.2). **Efectivo**: referencia **obligatoria** (número del recibo de caja). Sin
   movimiento.
4. Número `cuentas-por-pagar.reintegros`; inserta; sin auditoría (alta); evento `reintegro_registrado`.

`AnularReintegro` (`reintegros.anular`): motivo; depósito → orden de anular a Bancos (como §5.9); auditoría `anular`,
recurso `cuentas-por-pagar.reintegros`; evento `reintegro_anulado`. Bancos, al anular la nota de crédito desde allá,
avisa igual que con un pago (mismo manejador: anula el reintegro).

Aviso en efectivo, sin bloquear: «El efectivo recibido debe depositarse o entrar a la caja de la empresa; Arrancar no
lleva caja todavía.»

## 6. Bancos: contratos y cambios (sin importarse entre módulos)

### 6.1 Órdenes nuevas (`core/contratos/bancos.contratos.ts`, las atiende Bancos)

```ts
type OrigenDeMovimientoContrato = { modulo: string; documentoId: string };
type LineaDeConcepto = { claveDeSistema: 'pago_a_proveedor' | 'pago_a_proveedor_de_activo' | 'reintegro_de_proveedor'; montoCentavos: number };

declare module './mediador.contratos.js' {
  interface OrdenesEntreModulos {
    /** Cuentas activas, chequeras activas con su siguiente cheque disponible y saldo de cada cuenta, para la ventana de pago. */
    'bancos.medios_de_pago': { datos: { fecha: string }; respuesta: MediosDePago };
    /** Emite el siguiente cheque disponible (o el indicado) de la chequera, con origen y conceptos fijos. */
    'bancos.emitir_cheque_de_origen': {
      datos: { origen: OrigenDeMovimientoContrato; chequeraId: string; chequeId?: string; fecha: string;
               montoCentavos: number; beneficiario: string; noNegociable: boolean;
               conceptos: LineaDeConcepto[]; referencia?: string; observaciones?: string };
      respuesta: { movimientoId: string; chequeId: string; numeroDeCheque: number; cuentaBancariaId: string };
    };
    /** Registra una nota de débito (pago por transferencia o débito) o de crédito (reintegro), con origen y conceptos fijos. */
    'bancos.registrar_nota_de_origen': {
      datos: { origen: OrigenDeMovimientoContrato; cuentaBancariaId: string; tipo: 'debito' | 'credito'; fecha: string;
               montoCentavos: number; beneficiario: string; conceptos: LineaDeConcepto[]; referencia?: string;
               observaciones?: string };
      respuesta: { movimientoId: string; numero: number; anioDeNumero: number };
    };
    /** Anula un movimiento que creó el módulo que lo pide (cheque a la antigua o con inverso, nota con inverso); no le devuelve el aviso. */
    'bancos.anular_movimiento_de_origen': {
      datos: { origen: OrigenDeMovimientoContrato; movimientoId: string; motivo: string; fecha?: string };
      respuesta: { forma: 'sin_inverso' | 'con_inverso'; inversoId: string | null };
    };
  }
  interface AvisosEntreModulos {
    /**
     * Antes de cambiar un movimiento que tiene origen en otro módulo o que está marcado para Cuentas por pagar: el
     * módulo revisa sus reglas y revierte lo suyo (anular) o lanza su error (se deshace todo). Idempotente.
     */
    'bancos.movimiento_por_cambiar': {
      movimientoId: string; moduloDeOrigen: string | null; documentoDeOrigenId: string | null;
      cambio: 'anular' | 'eliminar' | 'blanquear' | 'corregir' | 'reclasificar' | 'desmarcar';
      motivo: string | null; fecha: string | null;
    };
  }
}
```

Cada orden corre el **mismo caso de uso** que la pantalla de Bancos (`EmitirCheque`, `CrearMovimiento`, `AnularCheque`,
`AnularMovimiento`) con el origen y los conceptos ya resueltos por clave; Bancos no pide su propio permiso (decidido). El
concepto por clave de sistema no se valida contra P3 (P3 solo rige al que elige a mano).

### 6.2 Conceptos de sistema nuevos y desglose (pago mixto)

| Clave | Nombre | Aplica a | Flujo | Para |
|---|---|---|---|---|
| `pago_a_proveedor` (ya existe) | Pago a proveedores | débito | Operación, «Pagos a proveedores» | Cargos sin activo fijo; notas marcadas |
| `pago_a_proveedor_de_activo` (**nuevo**) | Pago a proveedores de activo fijo | débito | **Inversión**, «Compra de activos» | Cargos con `tiene_activo_fijo` (P2, C-U8-6) |
| `reintegro_de_proveedor` (**nuevo**) | Reintegro de proveedores | crédito | Operación, «Pagos a proveedores» (resta de las salidas del grupo) — C-CP4-6 | Reintegros por depósito |

**Desglose** (decisión del 2026-09-29: un pago, varias líneas): tabla nueva **`bancos.desglose_de_movimientos`**
(`id`, `empresa_id`, `movimiento_id` FK a `movimientos` **on delete cascade** con índice, `concepto_id` con la llave
compuesta a `conceptos (id, empresa_id)`, `monto numeric(14,2) > 0`, autoría y marcas, único `(movimiento_id,
concepto_id)`, `politicaPorEmpresa()`). Solo existe cuando un movimiento lleva **dos o más** conceptos; entonces
`movimientos.concepto_id` es el de mayor monto (el que se ve en las listas) y la suma del desglose es el monto (lo revisa
Bancos al crearlo; nadie más lo escribe). Los reportes por concepto (flujo de efectivo, movimientos por concepto) usan
el desglose cuando existe (`coalesce` con el concepto del movimiento; un inverso usa el desglose de su original).
Cuentas por pagar arma las líneas sumando los montos de sus cargos por `tiene_activo_fijo`; con una sola clase, una sola
línea y sin desglose.

### 6.3 Reglas nuevas en Bancos

1. **Movimiento con origen** (`modulo_de_origen` no nulo): **no se corrige, ni se elimina, ni se blanquea** en Bancos
   (hoy solo no se reclasifica). Anularlo sí, pero antes manda `bancos.movimiento_por_cambiar` (`cambio = 'anular'`),
   también desde la anulación en lote de cheques caducos (H6b). `puedeCorregir`, `puedeEliminar` y `puedeBlanquear` en
   falso; la tarjeta dice «Origen: Cuentas por pagar, pago N» con enlace.
2. **Nota marcada para Cuentas por pagar**: una **nota de débito** sin origen con el concepto de sistema
   `pago_a_proveedor` (no hace falta columna nueva: el concepto **es** la marca; pregunta CP4-b). Con Cuentas por pagar
   activo, «Marcar para Cuentas por pagar» (al registrar la nota o después, `bancos.notas.editar`) le pone ese concepto;
   «Desmarcar» (motivo obligatorio, auditoría `corregir` con el concepto anterior) le pone el concepto que se elija, y
   antes manda el aviso (`cambio = 'desmarcar'`): si está ligada, se rechaza. Corregirla, anularla o eliminarla también
   mandan el aviso. Sin Cuentas por pagar activo no se puede marcar. Hoy P3 prohíbe elegir `pago_a_proveedor` en una nota:
   la excepción es solo la acción «Marcar».
3. **Cuentas por pagar inactivo**: hoy el plan dice que Bancos anula solo y deja rastro en la auditoría. Este diseño
   propone (pregunta CP4-i), como U6 en Libro de compras, que Bancos **rechace** anular, eliminar, corregir o desmarcar
   un movimiento con origen `cuentas-por-pagar` o marcado mientras el módulo esté inactivo («Active Cuentas por pagar para
   anular este pago»), con el puerto `CuentasPorPagarActivo` que ya existe. Si no se aprueba, los pagos de Cuentas por
   pagar quedarían vigentes con un cheque anulado al volver a activar el módulo.
4. **Aprobación de cheques y transferencias** (*Bancos, segunda parte*, sin diseñar): cuando exista, la orden de Cuentas
   por pagar dejará el movimiento «por aprobar» igual que uno manual (CP1 §7.2); se decide allí.

### 6.4 Lo que Cuentas por pagar lee de Bancos sin orden (`infraestructura`, permitido por el `dependeDe`)

- Las notas marcadas con su disponible (para la ventana de ligar y el listado de «marcadas sin aplicar»).
- La cuenta, el número de cheque o de nota, la fecha, el estado (anulado, revertido, conciliado) y el beneficiario del
  movimiento de cada pago (para la ficha, el comprobante y la regla `noEstarCobrado`).
- Bloquear la nota marcada (`for update`) al ligarla (§5.2).

### 6.5 Migración de Bancos `0032_cp4_pagos_de_cuentas_por_pagar`

`npm run bd:generar -w servidor -- bancos cp4_pagos_de_cuentas_por_pagar` (o la siguiente libre si H2b tomó más): tabla
`desglose_de_movimientos` con RLS; conceptos de sistema `pago_a_proveedor_de_activo` y `reintegro_de_proveedor` en
`CONCEPTOS_DE_SISTEMA` y, en las empresas que ya tienen catálogo, `insert` de los dos (a mano, como la `0022`: sin tocar
uno que ya tenga ese nombre; si existe uno sugerido con el mismo nombre, se le pone la clave). Sin datos que convertir
(ningún movimiento tiene origen).

## 7. Permisos, auditoría, errores, eventos y configuración

### 7.1 Permisos (`modulo.ts`, PLAN §3.5)

| Permiso | Para |
|---|---|
| `cuentas-por-pagar.pagos.ver` | Lista y ficha de pagos, medios de pago, comprobante, pagos en la ficha de la contraseña y del documento |
| `cuentas-por-pagar.pagos.emitir` | Pagar con cheque o nota de débito (crea el movimiento en Bancos sin pedir permisos de Bancos) |
| `cuentas-por-pagar.pagos.ligar-notas-de-debito` | Ligar una nota de débito marcada |
| `cuentas-por-pagar.pagos.aplicar-a-apertura` | Aplicar saldos iniciales a la cuenta de apertura |
| `cuentas-por-pagar.pagos.ligar-saldos-iniciales-de-bancos` | (CP4-13) Ligar al cheque o nota de saldo inicial de Bancos |
| `cuentas-por-pagar.pagos.anular` | Anular un pago (anula también su movimiento en Bancos) |
| `cuentas-por-pagar.reintegros.crear` | Registrar un reintegro (depósito o efectivo) |
| `cuentas-por-pagar.reintegros.anular` | Anular un reintegro |
| `cuentas-por-pagar.ajustes.crear` (ya existe) | También la diferencia de centavos de un cargo |

Sin `editar` (un pago no se corrige: se anula y se hace otro), sin `eliminar`, sin `importar`/`exportar` (Operación).
Ninguno es `soloSuperacceso`. Sin migración de permisos (son nuevos). **Separación de funciones**: el permiso de pagar
es otro que el de autorizar (ya decidido); este diseño **no** agrega «quien autorizó no paga» (pregunta CP4-j). En
Bancos, marcar y desmarcar usan `bancos.notas.editar` (y `bancos.notas.crear` al registrarla marcada).

### 7.2 Auditoría

| Hecho | Acción | Recurso | `anterior` |
|---|---|---|---|
| Pagar con cheque, nota de débito o nota ligada | ninguna (alta; `creado_por`) | — | — |
| Aplicar a la cuenta de apertura | `ajustar` | `cuentas-por-pagar.pagos` | Fichas de los cargos antes; con motivo |
| Anular un pago (desde aquí o por aviso) | `anular` | `cuentas-por-pagar.pagos` | `PagoDto`; con motivo |
| Ajuste de diferencia de un cargo | `ajustar` (CP2) | `cuentas-por-pagar.ajustes` | Ficha del cargo antes; motivo fijo |
| Registrar un reintegro | ninguna (alta) | — | — |
| Anular un reintegro | `anular` | `cuentas-por-pagar.reintegros` | `ReintegroDto`; con motivo |
| Bancos: desmarcar una nota | `corregir` | `bancos.notas` | La nota con su concepto anterior; con motivo |
| Bancos: anular un movimiento por orden | `anular` (como hoy) | `bancos.cheques` o `bancos.notas` | Como hoy; motivo «Anulado desde Cuentas por pagar: …» |

### 7.3 Errores nuevos (código propio; `dominio/errores-de-pagos.ts`)

| Clase | Familia | Código | Mensaje |
|---|---|---|---|
| `DocumentoSinAutorizar` | `ReglaDeNegocioInfringida` | `documento_sin_autorizar` | «El documento … no está autorizado: solo se paga lo autorizado.» |
| `DocumentoFueraDeLaContrasena` | `DatoInvalido` (campo `aplicaciones.<i>.cargoId`) | `documento_fuera_de_la_contrasena` | «El documento … no está en esta contraseña.» |
| `PagoMayorQueElSaldo` | `DatoInvalido` (campo `aplicaciones.<i>.monto`) | `pago_mayor_que_el_saldo` | «El documento … solo debe Q….» |
| `PagoSinDocumentos` / `DemasiadosDocumentosEnPago` | `DatoInvalido` (campo `aplicaciones`) | `pago_sin_documentos` / `demasiados_documentos_en_pago` | «Elija al menos un documento.» / «Un pago lleva hasta 100 documentos.» |
| `FechaDePagoInvalida` | `DatoInvalido` (campo `fecha`) | `fecha_de_pago_invalida` (ya lo usa CP3 para `fechaDePago`: este va en `fecha`) | «La fecha no puede ser anterior al dd/mm/aaaa (contraseña, recepción de los documentos o fecha de inicio).» |
| `MovimientoNoLigable` | `DatoInvalido` (campo `movimientoId`) | `movimiento_no_ligable` | «Esa nota no está marcada para Cuentas por pagar, está anulada o es de otra empresa.» |
| `PagoMayorQueLaNota` | `DatoInvalido` (campo `aplicaciones`) | `pago_mayor_que_la_nota` | «A la nota … solo le quedan Q… por aplicar.» |
| `SoloSaldosIniciales` | `ReglaDeNegocioInfringida` | `solo_saldos_iniciales` | «La cuenta de apertura solo se usa con saldos iniciales.» |
| `CorrijaElSaldoInicial` | `ReglaDeNegocioInfringida` | `corrija_el_saldo_inicial` | «La carga inicial está abierta y el saldo inicial … se puede corregir o eliminar: hágalo en Saldos iniciales.» |
| `PagoYaAnulado` | `ReglaDeNegocioInfringida` | `pago_ya_anulado` | «El pago N ya está anulado.» |
| `PagoCobrado` | `ReglaDeNegocioInfringida` | `pago_cobrado` | «El cheque del pago N ya está conciliado (el banco lo pagó): no se anula. Si el proveedor devolvió el dinero, regístrelo como reintegro.» (si se aprueba CP4-f) |
| `DocumentoConPagos` | `ReglaDeNegocioInfringida` | `documento_con_pagos` | «El documento … tiene el pago N: anúlelo primero.» |
| `DocumentoConPagosEnLaContrasena` | `ReglaDeNegocioInfringida` | `documento_con_pagos_en_la_contrasena` | «El documento … tuvo pagos en esta contraseña: no se quita.» |
| `ContrasenaConPagos` (CP3 lo dejó nombrado) | `ReglaDeNegocioInfringida` | `contrasena_con_pagos` | «La contraseña N tiene pagos vigentes: anúlelos primero.» |
| `MovimientoLigadoAPagos` | `ReglaDeNegocioInfringida` | `movimiento_ligado_a_pagos` | «La nota está aplicada al pago N de la contraseña M: anule primero ese pago en Cuentas por pagar.» |
| `MovimientoDeCuentasPorPagar` | `ReglaDeNegocioInfringida` | `movimiento_de_cuentas_por_pagar` | «Lo emitió Cuentas por pagar (pago N): anule el pago desde allá.» |
| `ReintegroMayorQueElSaldoLibre` | `DatoInvalido` (campo `notas.<i>.monto`) | `reintegro_mayor_que_el_saldo_libre` | «La nota … solo tiene Q… a favor.» |
| `FechaDeReintegroInvalida` | `DatoInvalido` (campo `fecha`) | `fecha_de_reintegro_invalida` | «La fecha no puede ser futura ni anterior al dd/mm/aaaa.» |
| `ReferenciaDeEfectivoObligatoria` | `DatoInvalido` (campo `referencia`) | `referencia_de_efectivo_obligatoria` | «Escriba el número del recibo de caja.» |
| `ReintegroYaAnulado` | `ReglaDeNegocioInfringida` | `reintegro_ya_anulado` | «El reintegro N ya está anulado.» |
| `NotaConReintegros` | `ReglaDeNegocioInfringida` | `nota_con_reintegros` | «La nota … tiene reintegros vigentes: anúlelos primero.» |

`ContrasenaAnulada`, `NotaEnContrasena`, `MotivoInvalido` y los de Bancos (`SaldoInsuficiente`, `ChequeNoDisponible`,
`MesConciliado`…) ya existen y pasan tal cual. Un pago o un reintegro que no existe responde `RecursoNoEncontrado`.

### 7.4 Eventos (`core/contratos/cuentas-por-pagar.contratos.ts` y `dominio/eventos-de-pagos.ts`)

```ts
type EfectoDePago = 'banco' | 'transitoria_por_aplicar' | 'apertura' | 'correccion_de_error';

'cuentas-por-pagar.pago_registrado': {
  empresaId: string; pagoId: string; numero: number; contrasenaId: string; proveedorId: string;
  forma: 'cheque' | 'nota_de_debito' | 'nota_ligada' | 'cuenta_de_apertura';
  fecha: string; montoCentavos: number; movimientoId: string | null; cuentaBancariaId: string | null;
  efecto: EfectoDePago;
  aplicaciones: Array<{ documentoId: string; documentoDeCompraId: string | null; origen: 'libro_de_compras' | 'saldo_inicial';
                        montoCentavos: number; retencionDescontadaCentavos: number; tieneActivoFijo: boolean }>;
};
'cuentas-por-pagar.pago_anulado': {
  empresaId: string; pagoId: string; fecha: string;            // la de la anulación (C5)
  montoCentavos: number; efecto: EfectoDePago; movimientoId: string | null;
};
'cuentas-por-pagar.reintegro_registrado': { empresaId; reintegroId; proveedorId; forma: 'deposito' | 'efectivo';
  fecha; montoCentavos; movimientoId: string | null; notas: Array<{ documentoId; montoCentavos }> };
'cuentas-por-pagar.reintegro_anulado': { empresaId; reintegroId; fecha; montoCentavos; forma };
```

`EfectoDeAjuste` suma `'ingreso'`. El plan llamaba al primero `…pago_emitido`: se llama `pago_registrado` porque una nota
ligada no se emite. Nadie los escucha todavía (Contabilidad). `pago_registrado` es también lo que usará el **aviso de pago
por correo** (CP7).

### 7.5 Configuración

**Ninguna nueva.** Se usan `cuentas-por-pagar.bancarizacion.umbral` (instalación, CP2) y
`cuentas-por-pagar.ajustes.tope_diferencia_menor` (instalación y empresa, CP2), y las de Bancos (sobregiro, misma fecha
en anulación).

## 8. Contrato de la API

Prefijo `/api/cuentas-por-pagar`. Dinero como texto con dos decimales; fechas `AAAA-MM-DD`.

**Solicitud de pago** (`esquemaPago`, Zod, unión por `forma`):

```ts
{
  forma: 'cheque' | 'nota_de_debito' | 'nota_ligada' | 'cuenta_de_apertura';
  fecha?: string;                                  // por omisión hoy
  chequeraId?: uuid; chequeId?: uuid;              // cheque (por omisión el siguiente disponible)
  noNegociable?: boolean;                          // cheque, por omisión true
  cuentaBancariaId?: uuid;                         // nota de débito
  movimientoId?: uuid;                             // nota ligada
  referencia?: string | null;                      // va a Bancos (cheque, nota de débito) o se guarda (ligada, apertura)
  motivo?: string;                                 // cuenta de apertura, obligatorio
  observaciones?: string | null;
  aplicaciones: Array<{ cargoId: uuid; monto: string }>;   // 1–100
  diferencias?: Array<{ cargoId: uuid; monto: string }>;   // §5.4
}
```

**`PagoDto`**: `id`, `numero` (formateado), `contrasena { id, numero }`, `proveedor { id, nombre, nit }`, `forma`,
`fecha`, `monto`, `movimiento` (`{ id, cuentaBancariaNombre, tipo, numeroDeCheque | numero, fecha, conciliado, anulado }
| null`), `referencia`, `motivo`, `conCargaCerrada`, `observaciones`, `estado`, `aplicaciones` (`documentoId`, `tipo`,
`serie`, `numero`, `origen`, `total`, `retenciones`, `retencionDescontada`, `monto`, `cubre` = monto + retención),
`diferencias` (ajustes), `anulacion`, `creadoPorNombre`, `creadoEn`, `avisos` (solo en la respuesta de registrar) y
`puedeAnular` (calculado en el servidor).

| Método y ruta | Permiso | Cuerpo / consulta | Respuesta |
|---|---|---|---|
| `GET /contrasenas/:id/para-pagar` | `pagos.ver` | — | `{ cargos: CargoParaPagarDto[], noAutorizados, fechaMinima, sumaDelMesAlProveedor, umbralDeBancarizacion, topeDiferenciaMenor }`; cada cargo con `saldo`, `propuesto`, `retencionPorDescontar`, `retencionesPorPracticar`, `constanciasPendientes`, `tieneActivoFijo`, `sobreUmbralDeBancarizacion` |
| `GET /pagos/medios` | `pagos.ver` | `fecha?` | La respuesta de `bancos.medios_de_pago` (cuentas y chequeras activas, siguiente cheque, saldo) |
| `GET /pagos/notas-para-ligar` | `pagos.ver` | `cuentaBancariaId?`, `desde?`, `hasta?`, `soloConDisponible` (true) | Notas marcadas con `monto`, `aplicado`, `disponible`, `fecha`, `referencia`, cuenta |
| `POST /contrasenas/:id/pagos` | según `forma`: `pagos.emitir`, `pagos.ligar-notas-de-debito` o `pagos.aplicar-a-apertura` (y `ajustes.crear` si trae `diferencias`) | solicitud | 201, `PagoDto` |
| `GET /pagos` | `pagos.ver` | `proveedorId?`, `contrasenaId?`, `forma?`, `estado?` (`vigente` por omisión), `desde?`, `hasta?`, `cuentaBancariaId?`, `pagina`, `limite` | página de `PagoResumenDto` |
| `GET /pagos/:id` | `pagos.ver` | — | `PagoDto` |
| `GET /pagos/:id/comprobante` | `pagos.ver` | — | `ComprobanteDePagoDto` (§9) |
| `POST /pagos/:id/anular` | `pagos.anular` | `{ motivo, fecha? }` | `PagoDto` |
| `POST /reintegros` | `reintegros.crear` | `{ proveedorId, forma, fecha?, cuentaBancariaId?, referencia?, observaciones?, notas: [{ notaId, monto }] }` | 201, `ReintegroDto` |
| `GET /reintegros/:id` | `documentos.ver` | — | `ReintegroDto` |
| `POST /reintegros/:id/anular` | `reintegros.anular` | `{ motivo, fecha? }` | `ReintegroDto` |
| `POST /documentos/:id/ajustes` (CP2) | `ajustes.crear` | en un cargo, solo `causa = 'diferencia_menor'` | 201, ficha |

El permiso de `POST /contrasenas/:id/pagos` depende del cuerpo: la ruta usa `proteger({ permiso: 'cuentas-por-pagar.pagos.ver' })`
para la sesión y el caso de uso exige el de la forma (el controlador lo recibe como en `autorizar-propios`); la prueba de
API cubre cada forma sin su permiso (403). Alternativa equivalente: tres rutas (`/pagos`, `/pagos/ligar`,
`/pagos/apertura`) cada una con su `proteger`; se elige al programar (recomendado: tres rutas, el guardia de siempre).

Bancos: `POST /bancos/notas/:id/marcar` (`bancos.notas.editar`), `POST /bancos/notas/:id/desmarcar { motivo, conceptoId }`
(`bancos.notas.editar`), y `marcarParaCuentasPorPagar?: boolean` en el registro de una nota de débito. `MovimientoDto`
gana `marcadaParaCuentasPorPagar` y `puedeMarcar`/`puedeDesmarcar`.

**Excel:** ninguno (Operación). «Pagos realizados», «Notas marcadas sin aplicar» y el estado de cuenta son de CP5.

## 9. Cliente

- `servicios/`: `ApiPagos` (`pagos.api.ts`: `paraPagar`, `medios`, `notasParaLigar`, `registrar`, `listar`, `obtener`,
  `comprobante`, `anular`) y `ApiReintegros`; tipos en `servicios/tipos.ts`.
- **Ficha de la contraseña** (`FichaDeContrasena.vue`, CP3): sección «Pagos» (número, forma, fecha, monto, estado, enlace
  a la ficha) y botón «Registrar pago» (`v-permiso` de cualquiera de las tres formas, solo si hay cargos autorizados con
  saldo). Columna «Pagado» y etiqueta «Pagada» / «Pagada en parte».
- `paginas/NuevoPago.vue` (formulario en página, ≤ 120 líneas; ruta `/cuentas-por-pagar/contrasenas/:id/pagar`):
  pestañas por forma según permisos (Cheque, Transferencia o débito, Nota ya registrada, Cuenta de apertura —esta última
  solo si la contraseña tiene saldos iniciales—); los cargos autorizados con su saldo, retención que se descontará y monto
  propuesto editable, los no autorizados apagados; total que se recalcula; medio (chequera con el siguiente número o
  cuenta; nota marcada con su disponible); fecha (aviso de posfechado); no negociable (aviso de bancarización al
  apagarlo); referencia; motivo en apertura con su aviso fijo; casilla de diferencia menor por cargo; avisos de §5.5
  antes de confirmar. Lógica pura en `composables/pagos/edicion-de-pago.ts` (propuesta, totales, retención por
  descontar, diferencia ofrecible, suma del mes y aviso de bancarización, armado del cuerpo) con su `*.prueba.ts`.
  Componentes: `CargosDelPago`, `MedioDePago`, `NotasParaLigar`, `AvisosDelPago`.
- `paginas/Pagos.vue` (Operación): lista con filtros (proveedor, forma, estado, fechas, cuenta), tarjetas `TarjetaDeRegistro`
  con número, proveedor, contraseña, forma («Cheque 1523 · Banco X»), fecha, monto, etiqueta «Anulado» o «Posfechado».
- `paginas/FichaDePago.vue`: datos, movimiento de Bancos (enlace si el usuario tiene `bancos.*.ver`), líneas con lo que
  cubre cada una, diferencias, «Comprobante» y «Anular» (`VentanaDeMotivo` con la fecha del inverso si mueve dinero; si
  el cheque es de un mes conciliado, la ventana lo explica).
- `paginas/ComprobanteDePago.vue` (página de impresión, como la contraseña de CP3; `window.print()`): empresa, proveedor,
  pago N, forma y documento bancario, fecha; por documento: tipo, serie y número, total, **retención (con número de
  constancia o «constancia por emitir»)**, notas aplicadas, **pagado** y saldo que queda; total del cheque; leyenda «Las
  retenciones se documentan con su constancia.»; firmas «Entregado» y «Recibido por el proveedor». Lógica pura en
  `composables/pagos/comprobante-de-pago.ts`.
- **Documentos por pagar y su ficha**: columna «Pagado», filtro y etiqueta de estado de pago; sección «Pagos»; en un cargo
  con saldo hasta el tope, «Ajustar diferencia» (reutiliza `VentanaDeAjuste` de CP2 con la causa fija); por qué no se
  anula si tiene pagos.
- **Notas de crédito** (CP2): «Registrar reintegro» en la ficha y en la pantalla (selección de notas del mismo proveedor);
  `componentes/VentanaDeReintegro.vue` (forma, cuenta o referencia del recibo, fecha, montos por nota con el saldo libre;
  aviso de efectivo). Sección «Reintegros» en la ficha con «Anular». Lógica pura en `composables/reintegro.ts`.
- **Bancos** (cliente): en la nota de débito, casilla «Pago a proveedor que se aplicará en Cuentas por pagar» al
  registrarla (solo con el módulo activo) y acciones «Marcar» / «Desmarcar» (ventana con motivo y concepto); etiqueta
  «Para Cuentas por pagar»; en un movimiento con origen, «Origen: Cuentas por pagar · Pago N» con enlace y sin corregir,
  eliminar ni blanquear; los mensajes de rechazo del aviso se muestran tal cual.
- `modulo.ts` y `textos.ts`: rutas `/cuentas-por-pagar/pagos`, `/pagos/:id`, `/pagos/:id/comprobante`,
  `/contrasenas/:id/pagar`; menú «Pagos» en `seccion: 'operacion'`.

## 10. Convivencia y riesgos

1. **CP3 primero.** Los pagos cuelgan de `contrasenas` y `contrasena_documentos`; la `0008` no se genera antes de que
   CP3-1 y U8l-2 estén en `main` (el `snapshot` de drizzle-kit es una cadena: nunca dos ramas generando migraciones de
   Cuentas por pagar a la vez).
2. **Bancos en otra sesión.** H2b toca `conciliaciones` y su migración `0031`; los pasos de Bancos de este diseño
   (CP4-B1 a B3) tocan `movimientos`, conceptos y reportes por concepto. No se programan en paralelo con H2b en la misma
   rama; el que entra segundo toma la migración siguiente y rebasa.
3. **Saldos calculados (U4).** Cada consulta suma tres subconsultas más (pagos, ajustes de cargos, reintegros), todas por
   índices parciales `where vigente`. CP1 dejó para CP4 revisar el rendimiento: el paso CP4-2 incluye una prueba de carga
   (20,000 documentos, 30,000 pagos) con `explain analyze` de la lista y del saldo por proveedor; si pasa de ~200 ms, se
   evalúa guardar el saldo (no antes).
4. **Retención en el primer pago.** Si el primer pago se anula, la retención «vuelve» y la lleva el siguiente pago que se
   registre; un segundo pago ya existente no cambia (su comprobante ya se entregó). El único parcial impide dos líneas
   vigentes con retención.
5. **Cheque posfechado.** El documento queda pagado desde que se registra el pago (el pasivo se cancela al entregar el
   cheque, C-CP4-1); Bancos lo cuenta en su fecha. Un reporte «a una fecha de corte» (CP5) usará `pagos.fecha`.
6. **Orden de bloqueo: Empresas → Bancos → Cuentas por pagar.** Pagar: carga inicial, orden a Bancos (que bloquea lo
   suyo), luego contraseña y cargos. Ligar: carga inicial, la nota en Bancos (`for update` por lectura), luego contraseña
   y cargos. Anular desde Bancos: Bancos bloquea su movimiento y avisa; el manejador solo bloquea el pago (no los
   cargos: anular un pago solo sube saldos). Ningún paso bloquea filas de Libro de compras (las constancias y fechas de
   recepción se leen sin bloqueo). No invierte el orden «libro, luego Cuentas por pagar» de CP1 ni el «Empresas, luego
   Cuentas por pagar» de U8.
7. **Un cheque que se gasta y se deshace.** Si la revisión con las filas bloqueadas falla después de la orden a Bancos,
   la transacción entera se deshace: el cheque vuelve a «disponible» y el correlativo de la nota no deja hueco (H9 se
   deshace con la transacción).
8. **Conciliación.** Un pago anulado deja en Bancos el par original + inverso, que la conciliación marca junto (B7) si
   ninguno pasó por el banco. Con CP4-f aprobado, un cheque ya conciliado no se anula desde Cuentas por pagar.
9. **Cheques caducos (H6b).** La anulación en lote manda el aviso por cada cheque con origen: el lote es todo o nada, así
   que un cheque de un pago que no se puede anular frena el lote con su mensaje (la pantalla de caducos ya muestra el
   error por cheque).
10. **Flujo de efectivo.** Con el desglose, un cheque que paga una factura de gasto y otra de activo reparte entre
    Operación e Inversión. Las notas ligadas quedan en Operación aunque el cargo sea de activo fijo (aviso, C-CP4-4).
11. **Aviso de pago por correo (CP7).** Sale de `pago_registrado` y del comprobante; no cambia datos de CP4.
12. **Borrar la empresa:** cascadas por `empresa_id`; las llaves `no action` se revisan al final del comando.

## 11. Pasos (un commit cada uno; servidor y cliente por separado)

Cada commit corre `npm run revisar` y sus pruebas y actualiza la bitácora de `PLAN.md`. Servidor con
`programador-backend`, cliente con `programador-frontend`, QA con `pruebas-qa`.

**Bancos** (puede ir en paralelo con CP3, no con H2b en la misma rama):

1. **CP4-B1 (servidor, Bancos, datos y conceptos):** migración `0032` (§6.5), `desglose_de_movimientos`, conceptos de
   sistema nuevos, reportes por concepto con el desglose. **Pruebas:** tabla (suma, RLS, cascada), migración repetible,
   flujo de efectivo con un movimiento desglosado y con su inverso.
2. **CP4-B2 (servidor, Bancos, contratos y reglas):** `core/contratos/bancos.contratos.ts` (§6.1), manejadores de las
   cuatro órdenes sobre los casos de uso existentes, aviso `movimiento_por_cambiar` en anular, anular cheques caducos,
   eliminar, blanquear, corregir y desmarcar; reglas de §6.3 (origen, marcadas, módulo inactivo si se aprueba CP4-i);
   marcar y desmarcar con su auditoría. **Pruebas:** cada orden con un módulo de prueba que escucha; rechazo del aviso
   deshace todo; corregir/eliminar/blanquear con origen (rechazo); marcar sin Cuentas por pagar activo (rechazo).
3. **CP4-B3 (cliente, Bancos):** marcar/desmarcar, etiqueta, origen con enlace, acciones ocultas según el servidor.

**Cuentas por pagar** (después de CP3-4 y U8l-3 en `main`, y de CP4-B2):

4. **CP4-1 (servidor, datos):** migración `0008` (§3.5), tablas, restricciones, mensajes de §3.6. **Pruebas de tablas:**
   cada check, llave de la contraseña (cargo fuera de ella falla), retención dos veces en vigentes (falla) y una anulada
   + una vigente (pasa), movimiento creado en dos pagos (falla) y nota ligada en dos (pasa), cascada al eliminar el
   documento con un pago anulado, quitar de la contraseña un documento con pago (falla), RLS;
   `politicas-de-los-modulos` y `llaves-entre-esquemas`.
5. **CP4-2 (servidor, saldos y reglas):** §2.2 en dominio y SQL, DTO de documentos y de contraseñas (`pagado`,
   `estadoDePago`), reglas de §5.8 en todas las listas, `accionesDelDocumento`; prueba de rendimiento (§10.3).
   **Pruebas:** saldo con pagos vigentes y anulados, con ajuste de cargo y con reintegro; cada regla nueva desde aquí y
   por aviso de Libro de compras (las filas se siembran: los casos de uso llegan en CP4-3).
6. **CP4-3 (servidor, pagar con cheque y nota de débito):** `RegistrarPago` (§5.1), puertos `PagosEnBancos` (las órdenes)
   y `RetencionesDelLibro` (constancias, lectura), desglose por activo fijo, retención en el primer pago, diferencias
   (§5.4), avisos (§5.5, §5.7), `ListarCargosParaPagar`, `MediosDePago`, eventos, permisos `pagos.ver` y `pagos.emitir`,
   rutas. **Pruebas** puras (propuesta, retención por descontar, desglose, suma del mes) y de API: cheque, cheque
   posfechado, nota de débito, cargo sin autorizar (rechazo), monto mayor que el saldo, dos cargos uno de activo fijo
   (desglose en Bancos), retención solo en el primero, saldo inicial sin retención y con aviso de por practicar,
   constancia por emitir, diferencia de Q0.03 y de Q30 (no ofrecida), saldo insuficiente en Bancos (nada se guarda),
   dos pagos a la vez, sin permiso.
7. **CP4-4 (servidor, anular):** `AnularPago` (§5.9), manejador de `bancos.movimiento_por_cambiar`, `REGLAS_PARA_ANULAR_PAGO`
   (con `noEstarCobrado` si se aprueba CP4-f), auditoría, evento. **Pruebas:** anular cheque de mes abierto y de mes
   conciliado, desde aquí y desde Bancos (también caducos en lote), la retención pasa al siguiente pago, eliminar o
   corregir en Bancos (rechazo), idempotencia.
8. **CP4-5 (servidor, nota ligada):** forma `nota_ligada` (§5.2), `NotasParaLigar`, permiso. **Pruebas:** varias
   contraseñas sobre una nota, disponible, nota no marcada, desmarcar o anular la nota ligada en Bancos (rechazo), anular
   el pago (la nota recupera disponible), aviso de activo fijo y de año anterior.
9. **CP4-6 (servidor, cuenta de apertura):** forma `cuenta_de_apertura` (§5.3), permiso, auditoría `ajustar`, `efecto`
   según la carga. **Pruebas:** carga abierta con saldo corregible (rechazo) y con saldo autorizado (pasa, `apertura`),
   carga cerrada (`correccion_de_error`), cargo del libro (rechazo), sin motivo.
10. **CP4-7 (servidor, reintegros):** §5.10, tablas ya creadas, orden de nota de crédito con `reintegro_de_proveedor`,
    permisos, auditoría, eventos, reglas de la nota. **Pruebas:** depósito y efectivo (referencia obligatoria), varias
    notas, mayor que el saldo libre, nota en una contraseña (rechazo), anular desde aquí y desde Bancos, anular la nota
    con reintegro (rechazo).
11. **CP4-8 (servidor, lista, ficha y comprobante):** `ListarPagos`, `ObtenerPago`, `ComprobanteDePago` (con constancias
    del libro). **Pruebas** de contenido.
12. **CP4-9 (cliente, pagar):** `NuevoPago` con sus componentes y lógica pura; sección «Pagos» de la contraseña.
13. **CP4-10 (cliente, pagos):** lista, ficha, anular, comprobante.
14. **CP4-11 (cliente, documentos, notas y reintegros):** columna y filtro de estado de pago, «Ajustar diferencia»,
    reintegros en Notas de crédito.
15. **CP4-12 (QA):** proveedor con tres facturas (una con retención de IVA sin constancia, una de activo fijo, una de
    más de Q30,000) y un saldo inicial con retenciones por practicar; contraseña; pago parcial con cheque (retención en
    el primero, avisos), segundo pago por transferencia, diferencia de centavos; nota de débito de un seguro marcada en
    Bancos y ligada; intentar anular en Bancos la nota ligada y el cheque (uno rechazado, el otro anula el pago);
    anular un pago desde Cuentas por pagar (cheque vuelve en Bancos); cheque caduco en lote; cuenta de apertura con la
    carga cerrada; reintegro por depósito y en efectivo de una nota con saldo a favor; flujo de efectivo con el
    desglose; permisos por separado; celular.
16. **CP4-13 (después de *Bancos, segunda parte*: saldos iniciales con notas y cheques):** forma
    `saldo_inicial_de_bancos` (§5.6), su migración y su permiso.

## 12. Preguntas para el usuario (con recomendación)

- **CP4-a. Extraer `Reversible` al core antes de CP4.** El plan lo pide, pero en este diseño Cuentas por pagar no crea
  inversos (anula estados) y Bancos sigue usando su propio código. *Recomendado: no extraerlo ahora; dejarlo para
  Contabilidad (`Partida.revertir`), como dijo B7.*
- **CP4-b. Cómo se marca una nota de débito «para Cuentas por pagar».** (A) La marca **es** el concepto de sistema
  `pago_a_proveedor` en una nota de débito sin origen (sin columna nueva, una sola verdad, el flujo ya sale bien); (B)
  columna nueva `reservada_para`. *Recomendado: A.*
- **CP4-c. Ligar al cheque o nota de saldo inicial de Bancos.** Bancos todavía no registra cheques en circulación al
  empezar. ¿Se deja para después de *Bancos, segunda parte* (paso CP4-13) y mientras tanto se usa «cuenta de apertura»
  con la referencia del cheque? *Recomendado: sí.* ¿O se adelanta el diseño de los saldos iniciales de Bancos con
  notas y cheques antes de CP4?
- **CP4-d. Cuenta de apertura con la carga abierta.** ¿Se permite solo cuando el saldo inicial ya no se puede corregir ni
  eliminar (autorizado o con movimientos), marcándolo como parte de la apertura, y con la carga cerrada como corrección
  de error? *Recomendado: sí.*
- **CP4-e. Editar una contraseña con pagos.** CP3 dejó «cerrar la edición al primer pago»; así una factura en disputa
  dentro de una contraseña pagada en parte no se puede quitar ni anular. ¿Se permite, con pagos, cambiar la fecha
  prometida, agregar documentos y quitar los que **no** tienen pagos? *Recomendado: sí; solo no se anula la contraseña
  ni se quita un documento con pagos.*
- **CP4-f. Anular un pago cuyo cheque o nota ya se concilió (el banco lo pagó).** ¿Se rechaza («si el proveedor devolvió
  el dinero, regístrelo como reintegro») o se permite con el inverso (B7)? *Recomendado: rechazar.*
- **CP4-g. Beneficiario.** ¿Siempre el proveedor, sin editarlo (bancarización), dejando los pagos a un cesionario de una
  factura cambiaria para después? *Recomendado: sí.*
- **CP4-h. Reintegro ligando una nota de crédito ya registrada en Bancos** (el proveedor transfirió y alguien ya la
  registró). *Recomendado: no en CP4 (se anula o elimina en Bancos y se registra desde Cuentas por pagar); se agrega
  después con el mismo mecanismo de la nota ligada si hace falta.*
- **CP4-i. Bancos con Cuentas por pagar inactivo.** El plan dice que Bancos anula solo y queda en la auditoría; U6 decidió
  lo contrario para Libro de compras. ¿Bancos **rechaza** cambiar un movimiento con origen en Cuentas por pagar o marcado
  mientras el módulo esté inactivo? *Recomendado: sí, igual que U6 (si no, los pagos quedan vigentes con un cheque
  anulado).*
- **CP4-j. Separación de funciones al pagar.** ¿Basta con permisos distintos (autorizar ≠ pagar), o también se exige que
  quien **autorizó** no registre el pago (con un permiso de excepción como `autorizar-propios`)? *Recomendado: solo
  permisos distintos; el reporte de pagos (CP5) muestra quién autorizó y quién pagó.*
- **CP4-k. Pago en efectivo de facturas.** El reintegro sí acepta efectivo; pagar facturas en efectivo no está en CP4 (va
  con Caja chica). ¿De acuerdo? *Recomendado: sí.*
- **CP4-l. Comprobante de pago.** ¿Se incluye en CP4 (página de impresión con retenciones y constancias, lo que el
  proveedor recibe con el cheque), o va con CP5/CP7? *Recomendado: en CP4.*
- **CP4-m. Correlativos propios** de pagos y de reintegros (el reintegro es el recibo que la empresa extiende). *Recomendado:
  sí, por empresa, con el reinicio anual de la empresa.*

## 13. Lo que debe validar `contador-guatemala`

- **C-CP4-1. Retención en el primer pago y cheque posfechado.** ¿Es correcto mostrar la retención completa en el primer
  pago (comprobante: «cubre» = dinero + retención) y que el documento quede pagado desde que se entrega un cheque
  posfechado (art. del Código de Comercio sobre el cheque pagadero a la vista: confirmar)? ¿Debe avisarse algo del plazo
  de entero cuando el pago es posterior al mes de la retención (la constancia ya lleva la fecha de recepción)?
- **C-CP4-2. Bancarización al pagar.** Texto del aviso; si la suma por proveedor y **mes calendario** es la correcta
  (Deloitte, Decreto 20-2006 arts. 20 y 21); si «no negociable» y «a nombre del proveedor» son exigibles para que el
  cheque cuente como medio bancario; si un reintegro en efectivo de Q30,000 o más tiene alguna consecuencia.
- **C-CP4-3. Ligar al cheque de saldo inicial de Bancos.** Si la factura se pagó con un cheque emitido antes del corte,
  ¿debía estar en el saldo inicial de Proveedores? ¿La partida del enlace es contra la cuenta puente de apertura? ¿Basta
  «cuenta de apertura» con la referencia del cheque mientras Bancos no tenga sus partidas en circulación?
- **C-CP4-4. Nota ligada y activo fijo.** La nota marcada queda en Operación («Pago a proveedores»); si la factura ligada
  es de activo fijo, ¿se acepta el aviso o debe reclasificarse la parte ligada a Inversión en el flujo de efectivo?
- **C-CP4-5. Diferencia de centavos en un cargo.** ¿Otros ingresos (diferencias) o menor gasto? ¿Efecto fiscal? ¿El tope de
  Q25 sirve igual que para las notas?
- **C-CP4-6. Reintegro del proveedor.** Partida (Bancos o Caja contra Proveedores), concepto y grupo en el flujo de
  efectivo (¿resta de «Pagos a proveedores» u «Otros cobros»?); documento que la empresa extiende (recibo) y si el
  proveedor debe dar algún documento.
- **C-CP4-7. Cuenta de apertura.** Confirmar el `efecto`: con la carga abierta contra la puente; con la carga cerrada,
  corrección de error (NIIF para las Pymes 10.21) o ajuste del período según la importancia; texto del aviso.
- **C-CP4-8. Anular un pago ya cobrado** (CP4-f) y anular un pago de un mes ya declarado o cerrado: fecha de la reversión
  (C5: la de la anulación).

## 14. Pendiente nuevo

- **P-CP4-1:** CP3 §3.4 y su paso CP3-1 dicen migración `0005`; la correcta es la `0006` (bitácora del 2026-11-12).
  Corregir el texto al programar CP3-1.
