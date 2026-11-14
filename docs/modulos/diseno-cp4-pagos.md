# Diseño CP4: pagos a proveedores de Cuentas por pagar — arquitecto de datos, 2026-11-13

Estado: **aprobado, listo para programar** (2026-11-13). El usuario aceptó todas las recomendaciones (CP4-a a m, §12) y
**todos** los «Cambios que el diseño debe recibir» del dictamen del contador (`dictamen-cp4-2026-11-13.md`, «correcto con
ajustes»), con estas precisiones: se **quita** la forma `saldo_inicial_de_bancos`, su permiso y el paso CP4-13 (el
cheque de apertura que se anula y revive el pasivo queda anotado para *Bancos, segunda parte*, §5.6); el **desglose de la
nota ligada por activo fijo va en CP4** (no solo aviso, §5.2); y dos cambios a lo ya decidido: una contraseña con pagos
**se sigue editando** y se quitan los documentos sin pagos, con «REIMPRESIÓN» si ya estaba impresa (CP4-e; también
cambia `diseno-cp3-contrasenas.md`), y Bancos **rechaza** cambiar los movimientos de un pago si Cuentas por pagar está
inactivo (CP4-i). Este documento ya trae todo aplicado (lo agregado está en la tabla «Decidido el 2026-11-13»).

> **Adenda del 2026-11-14 (propuesta, por aprobar):** el usuario cambió CP4-k: el pago en efectivo a varios proveedores
> con un **retiro del banco** entra en CP4, sin esperar a Caja chica. Diseño en `diseno-cp4-pagos-en-efectivo.md`
> (retiros de efectivo, forma `efectivo`, recibo, bancarización, liquidación) con una propuesta más: **un pago para
> varias contraseñas del mismo proveedor** (§10 de la adenda, a decidir antes de CP4-3).

Aterriza el paso **CP4** de `cuentas-por-pagar.md` («Pagos: órdenes a *Bancos* para
emitir y anular cheques —también posfechados— y notas de débito con origen y concepto; el aviso de Bancos cuando se
anulan desde allá; el usuario elige las facturas autorizadas y los montos de cada pago; las retenciones se descuentan en
el primer pago de cada factura»), con lo que le dejaron anotado CP1 (`diseno-datos-cuentas-por-pagar.md` §7), U8
(`diseno-u8-saldos-iniciales-cuentas-por-pagar.md` §2, «Consecuencias para CP4»), CP2 (`diseno-cp2-notas-de-credito.md`
§9.4), CP3 (`diseno-cp3-contrasenas.md` §9.5) y los dictámenes (`dictamen-u8-saldos-iniciales-2026-11-08.md`,
`dictamen-cp2-cp3-2026-11-08.md`, `validacion-h7-h11-retenciones.md`). Va **después de CP3 y de U8l-2** (usa sus tablas y
sus migraciones `0006`, ya en `main`, y `0007`, reservada). Lo nuevo que aparezca al programar va a §14.

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
| Forma extra de los saldos iniciales | «**Aplicar a la cuenta de apertura**» (la excepción), con permiso propio, en la contraseña. «Ligar al cheque o nota de saldo inicial de Bancos» **se quitó** (2026-11-13, C-CP4-3) | Hoja de ruta; U8; dictamen CP4 |
| Apertura con la carga cerrada | Aplicar a la cuenta de apertura con la carga **cerrada** es una **corrección de error de períodos anteriores** (NIIF para las Pymes secc. 10.21) o un ajuste del período, **no** un movimiento contra la cuenta puente | Dictamen U8, «Cambios» 10 |
| Reintegro del proveedor | El saldo a favor (saldo libre de una nota de crédito) que el proveedor **devuelve** es un **cobro**, no un ajuste: entra por **Bancos o en efectivo** | U13; usuario y contador, 2026-11-08 (bitácora) |
| Diferencias al pagar | Las de **centavos** pueden ir como ajuste (tabla `ajustes_de_saldo`), **solo como residuo de un pago vigente** (C-CP4-5); un **descuento de precio exige nota de crédito** del proveedor (Ley del IVA arts. 17 y 29 lit. d) | CP2-e; dictamen CP2-CP3, CP2-e y «otros» 14; dictamen CP4 |
| Bancarización | Umbral `cuentas-por-pagar.bancarizacion.umbral` (instalación, Q30,000) de CP2-3; aviso **sin bloquear** | CP2 §6.5; dictamen C-CP2-1 |
| Anular un pago desde aquí | Anula también el cheque o la nota en Bancos, en la misma transacción | Reglas de contraseñas, pagos y anulaciones |
| Anular el cheque o la nota desde Bancos | Se permite; Bancos avisa **dentro de la transacción** y este módulo revierte lo suyo (anula el pago y devuelve el saldo) o **rechaza** y no se anula nada | Igual |
| Contraseña con pagos | No se anula (`ContrasenaConPagos`); **sí se edita**: fecha prometida, agregar documentos y quitar los que no tienen pagos (cambia CP3 §9.5) | CP3 §5.3; CP4-e (2026-11-13) |
| Contraseña anulada | Sin reversión; suelta sus documentos | CP3 |
| Separación de funciones | Permisos distintos para registrar, autorizar y pagar; nada depende del tipo de rol | PLAN §3.5; `cuentas-por-pagar.md` |
| Saldos | **Calculados**, no guardados | U4 |
| Pantallas de Operación | Sin Excel; los reportes de pagos son de CP5 | Regla de secciones |
| Cualquier rubro y régimen | Nada supone rubro, régimen ni que la empresa sea **agente de retención**: si no lo es, sus documentos llegan con `retenciones = 0` y no hay nada que descontar | CLAUDE.md |
| Fuera de esta versión | Anticipos a proveedores, moneda extranjera, pagos programados en lote de varios proveedores, descuentos por pronto pago | `cuentas-por-pagar.md`, «Fuera de esta versión» |

**Decidido el 2026-11-13 (aprobación de CP4, con el dictamen del contador):**

| Tema | Decisión | Dónde |
|---|---|---|
| `Reversible` | No se extrae al core en CP4; espera a `Partida.revertir` (Contabilidad) | CP4-a, §1.7 |
| Nota marcada | La marca **es** el concepto de sistema `pago_a_proveedor` en una nota de débito sin origen | CP4-b, §6.3 |
| Saldo inicial de Bancos | **Sin** forma `saldo_inicial_de_bancos`, sin permiso, sin CP4-13; el cheque de apertura que se anula va en *Bancos, segunda parte* | CP4-c, C-CP4-3, §5.6 |
| Cuenta de apertura | Carga abierta: con la **fecha de inicio**, contra la puente; se rechaza si el saldo inicial no tiene movimientos (aunque esté autorizado: se quita de la contraseña, se desautoriza y se corrige). Carga cerrada: corrección de error | CP4-d, C-CP4-7, §5.3 |
| Contraseña con pagos | Se edita; se quitan los documentos sin pagos; aviso de «REIMPRESIÓN» si ya estaba impresa | CP4-e, §4 |
| Pago cobrado | No se anula: se **reaplica** (mismo proveedor y contraseña, auditoría `corregir`) | CP4-f, C-CP4-8, §5.11 |
| Beneficiario | Siempre el **nombre del NIT** del proveedor (nunca el comercial), no editable; cesionarios fuera de esta versión | CP4-g, C-CP4-2, §5.7 |
| Reintegro ligando una nota de crédito ya registrada | No en CP4 | CP4-h |
| Cuentas por pagar inactivo | Bancos **rechaza** cambiar movimientos con origen en Cuentas por pagar o marcados | CP4-i, §6.3 |
| Separación de funciones | Solo permisos distintos; el reporte de pagos (CP5) muestra quién autorizó y quién pagó | CP4-j |
| Pago de facturas en efectivo | ~~Con Caja chica~~ **Cambiado el 2026-11-14:** con un retiro del banco, en CP4 (adenda `diseno-cp4-pagos-en-efectivo.md`, por aprobar) | CP4-k |
| Comprobante de pago | En CP4, con retenciones, constancias y la leyenda «no es documento tributario» | CP4-l, §9 |
| Correlativos | Propios de pagos y de reintegros («Recibo de reintegro»), por empresa, con el reinicio anual | CP4-m |
| Cheque posfechado | El documento queda **comprometido** desde hoy y **pagado en la fecha del cheque** (NIIF para las Pymes 11.36); bancarización con la fecha del cheque; Bancos avisa si el saldo de hoy menos los posfechados no alcanza (el cheque se paga a la vista, Código de Comercio art. 501) | C-CP4-1, §2.4, §6.3 |
| Retenciones | El aviso de entero va **por mes de retención**, no atado al pago | C-CP4-1, §5.5 |
| Bancarización | Texto nuevo (sin «no negociable» obligatorio); cuentan cheques, notas de débito y notas ligadas; no la cuenta de apertura; el reintegro en efectivo solo avisa depositarlo | C-CP4-2, §5.7 |
| Nota ligada de activo fijo | **Desglose** en Bancos: la parte ligada a cargos de activo fijo pasa a Inversión | C-CP4-4, §5.2, §6.2 |
| Diferencia de centavos de un cargo | Otros ingresos, sin IVA; solo como residuo de un pago vigente; aviso si viene de una retención mal calculada; tope propio para los pagos | C-CP4-5, §5.4, §7.5 |
| Reintegro | Operación, o Inversión si la factura de la nota es de activo fijo; recibo no tributario | C-CP4-6, §5.10 |
| Fecha mínima del pago | La **emisión del DTE** (no la recepción), con aviso si es anterior a la recepción | Dictamen, otros 3, §5.1 |
| `pago_anulado` | Lleva `anulacionEnBancos` y la fecha original | C-CP4-8, §7.4 |

## 1. Lo encontrado en el código y la base

1. **Cuentas por pagar** (`servidor/src/modulos/cuentas-por-pagar/`): `dependeDe: ['libro-de-compras', 'bancos']` (U10),
   así que sus tablas **sí** pueden llevar llaves hacia `bancos.*` y leerlas desde `infraestructura`. Tablas en `main`:
   `documentos`, `aplicaciones_de_notas` (con `forma`, `fecha`, `referencia`), `condiciones_de_proveedor` y
   `ajustes_de_saldo` (solo notas de crédito; `causa`, `estado`, anulación). Las tablas de CP3 (`contrasenas`,
   `contrasena_documentos`, `aplicaciones_de_notas.contrasena_id`) ya están en `main` (CP3-1); sus casos de uso (CP3-2 a
   CP3-5) y U8l-2 (`documento_afectado_id` → id propio, `factura_del_sistema_anterior`) están aprobados pero **todavía no
   en `main`**.
2. **Migraciones de Cuentas por pagar** (`migraciones/meta/_journal.json`, verificado contra `main` el 2026-11-14): la
   última en `main` es **`0006_cp3_contrasenas`** (CP3-1). U8l-2 tiene reservada la
   **`0007_u8l_notas_sobre_saldos_iniciales`**. Esta es la **`0008_cp4_pagos`**, con `when` mayor que el de la `0007`.
   (P-CP4-1, resuelto: el diseño de CP3 ya dice `0006`.)
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
     iniciales con notas y cheques» es de *Bancos, segunda parte* (`HOJA-DE-RUTA.md`) y no está diseñada. La forma
     «ligar al cheque o nota de saldo inicial de Bancos» se quitó (§5.6, C-CP4-3).
   - Anular un cheque (`AnularCheque`): con su mes abierto, «a la antigua» (marca `anulado_en`, sin inverso, fuera del
     saldo); con su mes conciliado, nota de crédito inversa. Una nota se anula con su inverso (`AnularMovimiento`). Blanquear
     **borra** el movimiento del cheque y libera el número.
   - Migraciones (verificado contra `main` el 2026-11-14): la última en `main` es `0030_h2_saldo_del_estado_de_cuenta`;
     Bancos H2b (en curso en otra sesión) tiene reservada la **`0031_h2_archivo_del_estado_de_cuenta`**. La de este
     diseño es la **`0032_cp4_pagos_de_cuentas_por_pagar`**, acordada con esa sesión: se genera después de que la `0031`
     esté en `main` (§10.2).
7. **`Reversible`**: el plan pide «extraer `Reversible` del código de Bancos al core» antes de CP4. B7 dejó escrito que el
   patrón común «se discutirá cuando llegue `Partida.revertir` en Contabilidad». En este diseño **ningún registro de
   Cuentas por pagar crea su inverso**: el pago se **anula** (estado) y el inverso lo crea Bancos con su propio código.
   Extraerlo ahora no lo usaría nadie. **Decidido (CP4-a): no se extrae en CP4.**
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
| **Aplicar a la cuenta de apertura** | Saldo inicial que ya estaba pagado y se cargó por error o por historial (la excepción) | `pagos` (`forma = 'cuenta_de_apertura'`) | No |
| **Diferencia de centavos** | Lo que queda de un cargo **como residuo de un pago vigente** y no se va a perseguir | `ajustes_de_saldo` (sobre el **cargo**, causa `diferencia_menor`, con `pago_id`) | No |
| **Reintegro del proveedor** | El proveedor devuelve el saldo a favor de una o varias notas de crédito; es un **cobro**, no un pago, y **no** va por contraseña | `reintegros` + `aplicaciones_de_reintegros` | Por depósito sí (lo crea); en efectivo no |

Las tres primeras formas son las «normales»; la cuenta de apertura es la excepción, con permiso propio. **Un pago
tiene una sola forma** y, si mueve dinero, **un solo movimiento** de Bancos. Una contraseña puede tener varios pagos de
formas distintas (un cheque por una parte y una nota ligada por otra).

### 2.2 Saldo derivado (sigue sin guardarse, U4)

```
saldo de un cargo  = neto
                   − Σ aplicaciones de notas recibidas (todas las formas)          (CP1, CP2, CP3)
                   − Σ aplicaciones de pagos vigentes (monto)                      (CP4)
                   − Σ ajustes vigentes del cargo (diferencias de centavos)        (CP4)
   con neto = coalesce(saldo_al_inicio, total − retenciones)                       (U8)

de lo pagado:  pagado       = Σ montos de pagos vigentes con fecha <= hoy
               comprometido = Σ montos de pagos vigentes con fecha >  hoy     (cheques posfechados, §2.4)

saldo libre de una nota de crédito = base − Σ aplicaciones hechas − Σ ajustes vigentes
                                   − Σ aplicaciones de reintegros vigentes         (CP4)
   con base = coalesce(saldo_al_inicio, total)                                     (U8)
```

`retencion_descontada` **no** entra en el saldo: la retención ya está restada en el neto. Es el dato que dice en qué
pago se «descontó» para el comprobante y para el proveedor: el primer pago de una factura de Q11,200.00 con Q1,200.00 de
retención que paga Q5,000.00 **cubre** Q6,200.00 de la factura (Q5,000.00 en dinero y Q1,200.00 en constancia); el
segundo, de Q5,000.00, cubre Q5,000.00. «Pagado» y «pagado en parte» siguen sin ser estados: salen del saldo
(`estadoDePago`: `pendiente`, `en_parte`, `comprometido`, `pagado`; §2.4).

### 2.4 Cheque posfechado: comprometido hasta su fecha (C-CP4-1)

El cheque se paga **a la vista** (Código de Comercio art. 501): el proveedor puede cobrarlo antes de la fecha escrita.
Por eso el pago posfechado **compromete** el documento desde hoy (nadie lo puede volver a pagar: el saldo ya lo resta) y
el documento queda **pagado en la fecha del cheque** (NIIF para las Pymes 11.36: el pasivo se da de baja cuando se
extingue). No hay columna nueva: `pagos.fecha > hoy` es el posfechado y «hoy» es la fecha de Guatemala que ya usan los
casos de uso.

| Dato | Regla |
|---|---|
| `saldo` | Resta **todo** lo vigente, también lo comprometido (lo que se puede volver a pagar) |
| `estadoDePago` | `pagado` si el saldo es 0 y no hay comprometido; `comprometido` si el saldo es 0 y hay comprometido; `en_parte` si se pagó o comprometió algo y queda saldo; `pendiente` si no |
| Reportes a una fecha de corte (CP5) | Usan `pagos.fecha <= corte`: un posfechado no rebaja el pasivo antes de su fecha |
| Bancarización | Cuenta en el **mes de la fecha del cheque** (§5.7) |
| Evento `pago_registrado` | Lleva `fecha` (la del cheque) y `posfechado`; Contabilidad fecha la partida en `fecha` |
| Bancos | Lo cuenta en el saldo en su fecha (ya decidido) y **avisa** si el saldo de hoy menos los posfechados no alcanza (§6.3) |

### 2.3 Efecto contable de cada forma (para el evento; Contabilidad no existe todavía)

| Forma | Partida que Contabilidad sacará del evento | `efecto` en el evento |
|---|---|---|
| Cheque o nota de débito | Debe Proveedores / Haber Bancos (la cuenta de la cuenta bancaria) | `banco` |
| Nota ligada | Debe Proveedores / Haber «Pagos a proveedores por aplicar» (la nota marcada ya hizo Debe transitoria / Haber Bancos). En el flujo de efectivo, la parte ligada a cargos de activo fijo es **Inversión** por el desglose (C-CP4-4) | `transitoria_por_aplicar` |
| Cuenta de apertura, **carga abierta** | Debe Proveedores / Haber cuenta puente de apertura, **con la fecha de inicio** (C-CP4-7) | `apertura` |
| Cuenta de apertura, **carga cerrada** | Corrección de error de períodos anteriores (NIIF para las Pymes 10.19–10.23); **no** contra la puente; la cuenta la elige el contador | `correccion_de_error` |
| Diferencia de centavos de un cargo | Debe Proveedores / Haber **otros ingresos** (diferencias), sin IVA (C-CP4-5) | `ingreso` (nuevo en `EfectoDeAjuste`) |
| Reintegro por depósito | Debe Bancos / Haber Proveedores; flujo en Operación, o **Inversión** si la factura de la nota es de activo fijo (C-CP4-6) | `banco` |
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
| `forma` | text | no | check `pagos_forma_valida`: `forma in ('cheque', 'nota_de_debito', 'nota_ligada', 'cuenta_de_apertura')` |
| `fecha` | date | no | cheque y nota de débito: la del movimiento (el cheque **posfechado** lleva la suya: `fecha > hoy` es «comprometido», §2.4); nota ligada: la de la aplicación (§5.2); apertura: la fecha de inicio con la carga abierta (§5.3) |
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
| `vigente` | boolean | no | `default true`; pasa a `false` al anular el pago. Al **reaplicar** (§5.11) las líneas del pago se borran y se crean otra vez (el `anterior` de la auditoría guarda las de antes) |
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
| `forma` | text | no | check `reintegros_forma_valida`: `in ('deposito', 'efectivo')` (CP4-h, decidido: ligar una nota de crédito ya registrada no va en CP4) |
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
| Check `ajustes_pago_solo_diferencia` | `pago_id is null or causa = 'diferencia_menor'` |
| Comentario de la tabla y TSDoc | «Baja del saldo libre de una nota **o** de una diferencia menor de un cargo» |

El check `ajustes_causa_valida` no cambia. Que un ajuste sobre un **cargo** solo use `diferencia_menor` **y lleve
`pago_id`** de un pago vigente que lo incluye (solo como residuo, C-CP4-5) lo revisa el dominio (la clase del documento
y las líneas del pago son otras filas), igual que hoy revisa que el documento sea una nota. El efecto ya no sale
solo de la causa: `diferencia_menor` sobre una nota es `perdida`; sobre un cargo, `ingreso` (§2.3, C-CP4-5).

### 3.5 Migración `0008_cp4_pagos`

Con `npm run bd:generar -w servidor -- cuentas-por-pagar cp4_pagos`, revisada a mano (las llaves compuestas, la que va a
`contrasena_documentos` y los únicos parciales pueden pedir escribirse a mano, como en la `0001`). Requiere en `main` la
`0006` (CP3-1) y la `0007` (U8l-2); `when` mayor que el de la `0007`. Orden:

1. `create table pagos` con checks, únicos, índices, llaves (la de `bancos.movimientos` y la compuesta a `contrasenas`) y
   RLS.
2. `create table aplicaciones_de_pagos` con lo de §3.2.
3. `create table reintegros` y `aplicaciones_de_reintegros` (§3.3).
4. `alter table ajustes_de_saldo add column pago_id uuid`, llave, índice y check `ajustes_pago_solo_diferencia`.

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
| DTO `DocumentoPorPagarDto` | `pagado`, `comprometido` (§2.4), `reintegrado`, `estadoDePago` (`pendiente`/`en_parte`/`comprometido`/`pagado`, solo cargos); ficha con `pagos: PagoDelDocumentoDto[]` (número, forma, fecha, monto, retención descontada, estado) y, en la nota, `reintegros` |
| `FichaDelDocumentoDto` (auditoría) | Los pagos (vigentes y anulados) y reintegros del documento, para el `anterior` de una baja |
| `HechosDelDocumento` / `accionesDelDocumento` | `tienePagosVigentes`, `tieneReintegrosVigentes`; `puedeDesautorizar`, `puedeAnular` y `puedeEliminar` falsos con pagos vigentes; `puedeAjustar` **sigue solo en notas** (la diferencia de un cargo se salda desde el pago, §5.4); `puedeReintegrar` en una nota con saldo libre, registrada o autorizada, fuera de una contraseña |
| CP1 reglas de baja | `noTenerPagosVigentes` **al principio** de `REGLAS_PARA_ANULAR` y `REGLAS_PARA_ELIMINAR` (antes que `noEstarEnContrasena` de CP3: con pagos, quitarlo de la contraseña o anularla tampoco se puede y el mensaje correcto es «anule el pago N») y en `REGLAS_PARA_DESAUTORIZAR` → `DocumentoConPagos`. `noTenerReintegrosVigentes` en anular y eliminar una nota → `NotaConReintegros` |
| CP1 bajas por aviso de Libro de compras | Sin cambio de código: corren las listas. Libro de compras muestra el mensaje |
| U8 `REGLAS_PARA_CORREGIR_SALDO_INICIAL` | Suma `noTenerPagosVigentes` («no tiene pagos», lo que U8 §5 dejó anotado). Uno con pagos solo anulados se puede corregir o eliminar (la cascada se lleva sus líneas) |
| CP2 `REGLAS_PARA_QUITAR_APLICACION` | Suma «el cargo tiene pagos vigentes» → `DocumentoConPagos` (quitar la aplicación haría que lo pagado pase de lo que se debía) |
| CP2 ajuste (`AjustarSaldo`) | La ruta de CP2 sigue **solo con notas** (en un cargo responde el error de hoy). El ajuste de un cargo lo crean `RegistrarPago` y `SaldarDiferenciaDelPago` (§5.4) con el mismo dominio. `EFECTO_DE_LA_CAUSA` pasa a depender de la clase (`efectoDelAjuste(causa, clase)`) |
| CP2 `noTenerAjustesVigentes` | Mira también los ajustes de un cargo |
| CP3 `REGLAS_PARA_ANULAR_CONTRASENA` | `noTenerPagosVigentes` → `ContrasenaConPagos` |
| CP3 `REGLAS_PARA_QUITAR_DE_CONTRASENA` | `noTenerPagosEnLaContrasena` (vigentes **o anulados**: la llave lo exige) → `DocumentoConPagosEnLaContrasena` |
| CP3 editar con pagos | **Decidido (CP4-e), cambia CP3 §9.5:** `puedeEditar` **no** se cierra al primer pago: se sigue pudiendo cambiar la fecha prometida, agregar documentos y quitar los que no tienen pagos. Si la contraseña ya se imprimió (`impresa_en`), quitar o agregar un documento confirma «Esta contraseña ya se imprimió: imprima la nueva (saldrá con “REIMPRESIÓN”) y cámbiela por el original que tiene el proveedor» (la marca la pone la impresión, CP3 §5.5) |
| CP3 `ContrasenaDto` y su impresión | Cada cargo gana `pagado` y `comprometido` (vivos) y la contraseña `pagos` (lista corta) y `estadoDePago`; la impresión suma la columna «Pagado» en lo vivo (rotulada «al dd/mm/aaaa»; un cheque posfechado se suma con la marca «cheque al dd/mm/aaaa»). La lista gana la etiqueta «Pagada», «Pagada en parte» o «Comprometida» |
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
   `<=` su saldo (`PagoMayorQueElSaldo`); beneficiario (§5.7); fecha (paso 5).
3. **Orden a Bancos** (§6.1) por el mediador: `bancos.emitir_cheque_de_origen` o `bancos.registrar_nota_de_origen`, con
   el origen `{ modulo: 'cuentas-por-pagar', documentoId: <id del pago, generado antes> }`, el beneficiario (§5.7), el
   monto total, la fecha y el **desglose por concepto** (§6.2: suma de los cargos con y sin activo fijo). Bancos aplica
   **todas** sus reglas (cuenta y chequera activas, cheque disponible, saldo y sobregiro, saldo inicial primero, mes
   conciliado) y responde el `movimientoId`, el número del cheque o de la nota, la cuenta y sus **avisos** (el de fondos
   de un posfechado, §6.3). Si Bancos lanza, no se guarda nada.
4. **Bloquea** la contraseña y después los cargos (`for update`, en orden de id) y **vuelve a revisar** el paso 2 con las
   filas bloqueadas (dos pagos a la vez del mismo cargo: el segundo falla aquí y se deshace también su cheque). Orden de
   bloqueo de todo el módulo: **Empresas → Bancos → Cuentas por pagar** (§10.6).
5. **Fecha** (dictamen, otros 3): por omisión hoy. No anterior a la **fecha de emisión** del DTE de cada cargo (en un
   saldo inicial, su fecha de emisión) ni a la **fecha de inicio** si algún cargo es saldo inicial
   (`FechaDePagoInvalida`, dice la mínima). Si es anterior a la **fecha de recepción** en el libro de algún cargo o a la
   fecha de la contraseña, **avisa sin bloquear** (en el agro se paga antes de recibir el DTE). La fecha de la contraseña
   deja de ser mínima: un pago anterior a la recepción se registra después, cuando ya hay contraseña. **Sí puede ser
   futura** (cheque posfechado, §2.4). En la nota de débito, futura solo si Bancos lo admite (lo decide su regla).
6. **Retención**: por cada cargo de `origen = 'libro_de_compras'` con `retenciones > 0` y **sin** otra aplicación
   vigente con `retencion_descontada > 0`, esta línea lleva `retencion_descontada = retenciones` (el primer pago
   vigente); si no, 0. Los saldos iniciales siempre 0 (U8). El monto en dinero no cambia: el saldo ya era neto.
7. **Número**: `correlativos.siguiente('cuentas-por-pagar.pagos', fecha)`, después de validar.
8. Inserta el pago (`estado = 'vigente'`) y sus líneas; si la petición trae **diferencias** (§5.4), crea esos ajustes con
   `pago_id`.
9. Sin auditoría (alta; `creado_por`). Evento `cuentas-por-pagar.pago_registrado` al confirmar (§7.4).
10. Responde el `PagoDto` con los **avisos** que no bloquean (§5.5), los suyos y los de Bancos.

**Propuesta de la ventana** (solo pantalla, el usuario la cambia): los cargos **autorizados** de la contraseña con saldo,
por vencimiento (el más viejo primero), cada uno con `propuesto = saldo`. Los no autorizados se muestran apagados con
«Sin autorizar: no se puede pagar». Antes de confirmar muestra el beneficiario que irá en el cheque o la nota.

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
- **Desglose por activo fijo (C-CP4-4, en CP4):** después de insertar el pago, Cuentas por pagar calcula, con la nota
  bloqueada, cuánto de la nota está ligado a cargos con `tiene_activo_fijo` en **todos** sus pagos vigentes y manda
  `bancos.fijar_desglose_de_conceptos` (§6.1) con el reparto absoluto: `pago_a_proveedor_de_activo` por esa suma y
  `pago_a_proveedor` por el resto (lo no ligado sigue en Operación). La orden es idempotente: se vuelve a mandar al anular
  o reaplicar un pago que liga la nota (§5.9, §5.11). El concepto de la nota **no cambia** (es la marca, §6.2), así que
  la nota sigue marcada aunque toda quede en Inversión.
- **Aviso de retención no descontada** (dictamen, otros 2): si una línea lleva `retencion_descontada > 0`: «El banco
  debitó la nota sin descontar la retención de Q… de la factura S-N: quedan Q… de la nota por aplicar. Revise la
  retención en Libro de compras (si no la practicó, corríjala allí; si la practicó, el proveedor le debe ese monto).»
- Aviso si la nota es de un **año anterior** al de la aplicación (seguimiento del contador del 2026-09-29: «nota de
  diciembre y FEL de enero»).
- Sin retenciones nuevas: si el cargo tiene retenciones (una FEL gravada de un seguro con retención), la regla de §5.1.6
  vale igual.

### 5.3 Aplicar a la cuenta de apertura (`forma = 'cuenta_de_apertura'`)

Con `pagos.aplicar-a-apertura`. La excepción para lo que **ya estaba pagado** y se cargó como saldo inicial:

1. Pide la carga inicial. **Todos** los cargos del pago son `origen = 'saldo_inicial'` (`SoloSaldosIniciales`).
2. Autorizados (la regla general: solo se paga lo autorizado) y en la contraseña, como §5.1.
3. **Con la carga abierta** (CP4-d, C-CP4-7): se rechaza si algún saldo inicial **no tiene movimientos** (ni
   aplicaciones de notas de ninguna forma, ni pagos vigentes, ni ajustes), **aunque esté autorizado** o en la contraseña →
   `CorrijaElSaldoInicial` («la carga inicial está abierta y el saldo inicial … no tiene movimientos: quítelo de la
   contraseña, desautorícelo y corríjalo o elimínelo en Saldos iniciales»). Si tiene movimientos, se permite con
   `con_carga_cerrada = false`, `efecto = 'apertura'` (contra la puente) y **fecha = la fecha de inicio** (no se elige).
   **Con la carga cerrada**: `con_carga_cerrada = true`, `efecto = 'correccion_de_error'` (NIIF para las Pymes 10.19–10.23;
   la cuenta la elige el contador en Contabilidad); fecha por omisión hoy, no futura ni anterior a la fecha de inicio.
4. **Motivo obligatorio** (1–300) y referencia opcional (cheque o comprobante del sistema anterior).
5. Sin retención descontada (U8). Sin movimiento. No cuenta para la bancarización (§5.7).
6. **Auditoría `ajustar`**, recurso `cuentas-por-pagar.pagos`, `anterior` = las fichas de los cargos antes del pago, con
   el motivo: es dar por pagada una deuda sin dinero (como el ajuste de U13).
7. Avisos fijos de la ventana (texto del contador; se coteja antes de ponerlo en la ayuda):
   - Siempre: «Use esta forma solo si el documento ya se había pagado antes de la fecha de inicio.»
   - Carga abierta: «La carga inicial está abierta: se registra con la fecha de inicio (dd/mm/aaaa) contra la cuenta
     puente de apertura.»
   - Carga cerrada: «La carga inicial está cerrada: es una corrección de error de períodos anteriores. Avise a su
     contador, que elige la cuenta.»

### 5.4 Diferencias al pagar (solo como residuo de un pago vigente, C-CP4-5)

- En la ventana de pago, si después del monto escrito a un cargo le queda un saldo **mayor que cero y hasta el tope**
  `cuentas-por-pagar.pagos.tope_diferencia` (§7.5), la ventana ofrece «Dar por saldada la diferencia de Q0.03» (casilla,
  apagada por omisión). Si se marca, la petición trae `diferencias: [{ cargoId, monto }]` y se crea un ajuste del
  **cargo** con causa `diferencia_menor`, `pago_id` = este pago, motivo fijo «Diferencia al pagar con el pago N» y fecha
  la del pago (permiso `ajustes.crear` además del de la forma). Cada `cargoId` debe estar en las líneas del pago
  (`DiferenciaFueraDelPago`).
- Después, mientras el pago esté **vigente**, la ficha del pago ofrece lo mismo por línea («Dar por saldada la
  diferencia», `SaldarDiferenciaDelPago`, `ajustes.crear`), si el cargo sigue con saldo `> 0` y `<=` tope: es el mismo
  residuo, para cuando se olvidó la casilla. Fecha: la del pago o posterior, no futura.
- **Fuera de un pago no hay ajuste de un cargo**: la ruta de CP2 sigue solo con notas. Así no se «saldan» facturas
  pequeñas sin pagarlas (error señalado por el dictamen).
- Si la diferencia **pasa del tope**, no se ofrece: el cargo queda pagado en parte y la ventana dice «Si el proveedor le
  hizo un descuento, pídale la nota de crédito (Ley del IVA, arts. 17 y 29)». No hay forma de «descuento sin nota».
- **Aviso de retención mal calculada:** si el cargo tiene retenciones, junto a la casilla: «Si la diferencia viene de la
  retención (el proveedor calculó otra), no la salde: revise la retención en Libro de compras.»
- Anular el pago **anula** sus ajustes (`AnularAjuste` dentro de la misma transacción, con el motivo del pago); reaplicarlo
  también (§5.11).
- Evento `ajuste_registrado` con `efecto = 'ingreso'` en un cargo (§2.3; otros ingresos, sin IVA).

### 5.5 Avisos que no bloquean (en la respuesta del pago y en la ventana antes de confirmar)

| Caso | Aviso |
|---|---|
| Cargo del libro con retención que este pago descuenta y **sin constancia** en Libro de compras (`retenciones.constancia_numero` nulo en alguna) | «La retención de IVA (o ISR) de la factura S-N no tiene constancia registrada: emítala en Retenciones Web y entréguela con este pago.» |
| **Entero por mes de retención** (C-CP4-1): retención del cargo con `retenciones.fecha` de un mes anterior al de la fecha del pago | «La retención de la factura S-N es de mm/aaaa: se entera con ese mes, aunque el pago sea después. Revísela en Libro de compras → Retenciones.» (las constancias pendientes se ven allí, §9) |
| Saldo inicial con `retenciones_por_practicar > 0` (U8 §2, consecuencia 2) | «Este documento tiene Q… de retenciones por practicar del sistema anterior: emita la constancia en Retenciones Web y entérela. Arrancar no las descuenta del pago.» |
| Bancarización (§5.7) | El texto de §5.7 |
| Fecha anterior a la recepción o a la contraseña (§5.1.5) | «La fecha del pago es anterior a la recepción de la factura S-N (dd/mm/aaaa).» |
| Nota ligada: retención no descontada o año anterior | §5.2 |
| Cheque posfechado | «El cheque lleva fecha dd/mm/aaaa: el documento queda comprometido y se da por pagado en esa fecha. El cheque se paga a la vista: el proveedor puede cobrarlo antes.» Más el aviso de fondos de Bancos (§6.3) |
| Diferencia de un cargo con retención | §5.4 |

### 5.6 Quitado: ligar al cheque o nota de saldo inicial de Bancos (C-CP4-3)

El contador corrigió la premisa: un cheque **entregado** antes del corte ya pagó la factura, así que esa factura no va en
el saldo inicial de Proveedores (el cheque es una partida en circulación de Bancos); un cheque **sin entregar** se anula
en el sistema anterior y el pago se registra como cheque nuevo. No hay forma `saldo_inicial_de_bancos`, ni permiso
`pagos.ligar-saldos-iniciales-de-bancos`, ni paso CP4-13. Lo que se pagó antes del corte y se cargó por error se resuelve
con «cuenta de apertura» (§5.3).

**Anotado para *Bancos, segunda parte*** (ventana de saldos iniciales con notas y cheques, `HOJA-DE-RUTA.md`): si un
cheque en circulación de la apertura se **anula** después (caducó, no se cobró), el pasivo con el beneficiario **revive**
(la factura que pagó vuelve a deberse). Ese diseño decide cómo se registra (por ejemplo, un aviso a Cuentas por pagar que
crea el documento por pagar al proveedor, o la partida de Contabilidad contra Proveedores) y lo valida el contador.

### 5.7 Beneficiario y bancarización (C-CP4-2)

- **Beneficiario** del cheque o de la nota: el **nombre del NIT** del proveedor, **nunca el comercial**, no editable
  (CP4-g). Se toma de Terceros: persona jurídica, `razon_social`; individual, `nombres` y `apellidos`. Si la jurídica no
  tiene razón social (Terceros la deja vacía si hay nombre comercial), se usa el `nombre_emisor` del DTE más reciente de
  los cargos del pago (es el nombre que la SAT tiene para ese NIT). Si tampoco hay (solo saldos iniciales), se rechaza con
  `ProveedorSinNombreDelNit` («Escriba la razón social del proveedor en Terceros: el cheque va a nombre del NIT»). Un
  pago a un cesionario (factura cambiaria cedida) queda fuera de esta versión.
- **Suma del mes**: lo pagado al proveedor en el **mes calendario de la fecha del pago** (en un posfechado, el de la fecha
  del cheque) con **cheques, notas de débito y notas ligadas** vigentes, más este pago. **No** cuenta la cuenta de
  apertura. Un reintegro en efectivo no tiene efecto de bancarización (solo el aviso de depositarlo, §5.10).
- **Aviso** (sin bloquear) si los cargos del pago tienen total `>=` umbral o la suma del mes llega al umbral (texto del
  contador; se coteja con el Decreto 20-2006 art. 20 antes de ponerlo en la ayuda): «Bancarización (Decreto 20-2006):
  los pagos a un mismo proveedor que suman Q30,000.00 o más en el mes deben hacerse por medios bancarios (cheque,
  transferencia o tarjeta) a nombre del proveedor para que el gasto y el crédito fiscal se puedan respaldar. Se recomienda
  emitir el cheque no negociable.» (con el umbral real). «No negociable» **no** es exigible: el aviso ya no depende de
  apagar la casilla, que sigue encendida por omisión, como hoy en Bancos.

### 5.8 Bajas y reglas que suma CP4 en los otros pasos

| Regla | Dónde | Error |
|---|---|---|
| `noTenerPagosVigentes` | Anular, eliminar y desautorizar documentos (antes que CP3), corregir o eliminar un saldo inicial, quitar una aplicación de nota del cargo, anular una contraseña | `DocumentoConPagos` / `ContrasenaConPagos` |
| `noTenerPagosEnLaContrasena` | Quitar un documento de la contraseña (vigentes o anulados; lo exige la llave). La contraseña con pagos sí se edita (CP4-e) | `DocumentoConPagosEnLaContrasena` |
| `noTenerReintegrosVigentes` | Anular o eliminar una nota de crédito | `NotaConReintegros` |
| `REGLAS_PARA_ANULAR_PAGO` | Anular un pago (desde aquí o por aviso de Bancos): `noEstarCobrado` (CP4-f); Contabilidad sumará la del mes cerrado | `PagoCobrado` |
| `REGLAS_PARA_REAPLICAR_PAGO` | Reaplicar un pago (§5.11): vacía en CP4; Contabilidad sumará la del mes cerrado | — |

### 5.9 Anular un pago

**Desde Cuentas por pagar** (`AnularPago`, `pagos.anular`), con motivo (1–300) y, si mueve dinero, la **fecha del inverso**
(por omisión hoy; la valida Bancos):

1. Bloquea el pago; vigente → si no, `PagoYaAnulado`. Corre `REGLAS_PARA_ANULAR_PAGO` (`noEstarCobrado`: el movimiento
   está conciliado → `PagoCobrado`, que ofrece reaplicar o registrar un reintegro).
2. Cheque o nota de débito: orden `bancos.anular_movimiento_de_origen { movimientoId, origen, motivo, fecha }` (§6.1).
   Bancos decide cómo (cheque de mes abierto: a la antigua; mes conciliado: inverso; nota: inverso), revisa sus reglas
   (mes conciliado del inverso, sobregiro), **no** devuelve el aviso de §6.3 a quien lo ordenó (lleva `origen`) y
   responde la forma (`sin_inverso` o `con_inverso`). Si lanza, nada cambia.
3. Nota ligada: **nada** se anula en Bancos; la nota recupera su disponible y se vuelve a fijar su desglose (§5.2).
   Cuenta de apertura: nada en Bancos.
4. `estado = 'anulado'`, `anulado_en/por`, `motivo_de_anulacion`; sus líneas `vigente = false` (la retención descontada
   queda libre para el siguiente pago del cargo); anula sus ajustes de diferencia (§5.4).
5. Auditoría `anular`, recurso `cuentas-por-pagar.pagos`, `anterior` = `PagoDto` como estaba (con sus líneas y el
   movimiento), con el motivo.
6. Evento `cuentas-por-pagar.pago_anulado` al confirmar, con `anulacionEnBancos` y la fecha original (§7.4).

**Por aviso de Bancos** (`bancos.movimiento_por_cambiar`, §6.3): el manejador busca los pagos **vigentes** con ese
`movimiento_id`:

| Cambio que pide Bancos | Pago creado por Cuentas por pagar (cheque, nota de débito) | Nota ligada |
|---|---|---|
| `anular` (también la anulación en lote de cheques caducos) | Corre `REGLAS_PARA_ANULAR_PAGO`; si pasan, hace los pasos 4 a 6 (sin volver a ordenar a Bancos) con el motivo del aviso y la `formaDeAnulacion` que trae el aviso | **Rechaza** con `MovimientoLigadoAPagos`: «La nota está aplicada al pago N de la contraseña M: anule primero ese pago en Cuentas por pagar.» (decidido: no se anula sin anular antes lo que la liga) |
| `eliminar`, `blanquear`, `corregir` (monto, fecha, cuenta, beneficiario) | **Rechaza** con `MovimientoDeCuentasPorPagar`: «Lo emitió Cuentas por pagar (pago N): anule el pago desde allá.» | Rechaza con `MovimientoLigadoAPagos` |
| `desmarcar` / `reclasificar` | No aplica (ya está bloqueado por P6) | Rechaza con `MovimientoLigadoAPagos` |
| `eliminar` de un movimiento que solo tiene pagos **anulados** | Rechaza: «Tuvo pagos en Cuentas por pagar: anúlelo en vez de eliminarlo.» (la llave `no action` lo exigiría igual) | Igual |

El manejador es **idempotente** (sin pagos vigentes con ese movimiento y sin pagos anulados en un `eliminar`, no hace
nada) y corre en la transacción de Bancos: si lanza, Bancos no cambia nada. Quitar la marca de **conciliado** de un
movimiento (conciliación) no necesita aviso: Cuentas por pagar lee `conciliado` en vivo para `noEstarCobrado`.

### 5.10 Reintegros

`RegistrarReintegro` (`reintegros.crear`), desde la ficha de una nota de crédito o desde la pantalla «Notas de crédito»
(varias notas del mismo proveedor en un reintegro, 1–100):

1. Pide la carga inicial; bloquea las notas (en orden de id): notas de crédito **registradas o autorizadas** (como el
   ajuste), del mismo proveedor, fuera de una contraseña vigente; cada monto `> 0` y `<=` su saldo libre
   (`ReintegroMayorQueElSaldoLibre`).
2. Fecha: por omisión hoy; no futura ni anterior a la recepción de cada nota ni a la fecha de inicio si alguna es saldo
   inicial (`FechaDeReintegroInvalida`).
3. **Depósito**: orden `bancos.registrar_nota_de_origen` con `tipo = 'credito'`, la cuenta elegida, el monto, el
   proveedor como «beneficiario» (quien depositó, §5.7), la referencia (número de boleta o transferencia) y los
   conceptos (C-CP4-6): `reintegro_de_proveedor_de_activo` por lo de las notas cuya **factura** (el documento afectado;
   sin él, la nota misma) tiene `tiene_activo_fijo`, y `reintegro_de_proveedor` por el resto (desglose si hay de los dos,
   §6.2). **Efectivo**: referencia **obligatoria** (número del recibo de caja o de la boleta). Sin movimiento.
4. Número `cuentas-por-pagar.reintegros` (el **Recibo de reintegro**, CP4-m); inserta; sin auditoría (alta); evento
   `reintegro_registrado`.

`AnularReintegro` (`reintegros.anular`): motivo; depósito → orden de anular a Bancos (como §5.9); auditoría `anular`,
recurso `cuentas-por-pagar.reintegros`; evento `reintegro_anulado`. Bancos, al anular la nota de crédito desde allá,
avisa igual que con un pago (mismo manejador: anula el reintegro).

Aviso en efectivo, sin bloquear (C-CP4-2: sin efecto de bancarización): «Deposite el efectivo recibido o regístrelo en la
caja de la empresa; Arrancar no lleva caja todavía.»

**Recibo de reintegro** (C-CP4-6): página de impresión con empresa, proveedor (nombre del NIT y NIT), número, fecha,
forma (depósito con cuenta y boleta, o efectivo con su referencia), notas de crédito con serie, número y monto, total en
números y letras, firmas «Recibido por (empresa)» y «Entregado por (proveedor)» y la leyenda **«Este recibo no es un
documento tributario.»** Del proveedor basta la nota de crédito (NCRE) y la boleta.

### 5.11 Reaplicar un pago (C-CP4-8, CP4-f)

Para un pago **vigente** que se aplicó a los cargos equivocados (sobre todo uno ya cobrado, que no se anula): en vez de
anularlo, se cambia **a qué cargos** cubre. `ReaplicarPago` (`pagos.reaplicar`), con motivo (1–300):

1. Pide la carga inicial si algún cargo (de antes o de después) es saldo inicial; bloquea, en este orden, la nota ligada
   si es esa forma, el pago, la contraseña y los cargos de antes y de después (en orden de id).
2. `REGLAS_PARA_REAPLICAR_PAGO`. Mismo proveedor y **misma contraseña** (los cargos nuevos están en ella; la llave lo
   exige), autorizados, de clase cargo; cada monto `> 0` y `<=` su saldo **sin contar este pago**; Σ montos =
   `pagos.monto` (`ReaplicacionConOtroMonto`: el dinero no cambia). En la cuenta de apertura, solo saldos iniciales.
3. Anula los ajustes de diferencia del pago (vuelven a ofrecerse, §5.4); borra sus líneas y crea las nuevas con la
   retención recalculada (§5.1.6; el único parcial la sigue cuidando). `fecha`, `numero`, `forma` y movimiento no cambian.
4. Cheque o nota de débito: si cambia la suma de activo fijo, `bancos.fijar_desglose_de_conceptos` sobre su movimiento
   (solo la clasificación del flujo; el monto y la conciliación no cambian). Nota ligada: se vuelve a fijar el desglose
   de la nota (§5.2).
5. Auditoría `corregir`, recurso `cuentas-por-pagar.pagos`, `anterior` = `PagoDto` como estaba, con el motivo.
6. Evento `cuentas-por-pagar.pago_reaplicado` con las líneas de antes y de después (§7.4).

## 6. Bancos: contratos y cambios (sin importarse entre módulos)

### 6.1 Órdenes nuevas (`core/contratos/bancos.contratos.ts`, las atiende Bancos)

```ts
type OrigenDeMovimientoContrato = { modulo: string; documentoId: string };
type ClaveDeConceptoDeSistema = 'pago_a_proveedor' | 'pago_a_proveedor_de_activo'
  | 'reintegro_de_proveedor' | 'reintegro_de_proveedor_de_activo';
type LineaDeConcepto = { claveDeSistema: ClaveDeConceptoDeSistema; montoCentavos: number };
type AvisoDeBancos = { codigo: string; mensaje: string };

declare module './mediador.contratos.js' {
  interface OrdenesEntreModulos {
    /** Cuentas activas, chequeras activas con su siguiente cheque disponible y saldo de cada cuenta, para la ventana de pago. */
    'bancos.medios_de_pago': { datos: { fecha: string }; respuesta: MediosDePago };
    /** Emite el siguiente cheque disponible (o el indicado) de la chequera, con origen y conceptos fijos. */
    'bancos.emitir_cheque_de_origen': {
      datos: { origen: OrigenDeMovimientoContrato; chequeraId: string; chequeId?: string; fecha: string;
               montoCentavos: number; beneficiario: string; noNegociable: boolean;
               conceptos: LineaDeConcepto[]; referencia?: string; observaciones?: string };
      respuesta: { movimientoId: string; chequeId: string; numeroDeCheque: number; cuentaBancariaId: string;
                   avisos: AvisoDeBancos[] };                       // p. ej. fondos de un posfechado (§6.3)
    };
    /** Registra una nota de débito (pago por transferencia o débito) o de crédito (reintegro), con origen y conceptos fijos. */
    'bancos.registrar_nota_de_origen': {
      datos: { origen: OrigenDeMovimientoContrato; cuentaBancariaId: string; tipo: 'debito' | 'credito'; fecha: string;
               montoCentavos: number; beneficiario: string; conceptos: LineaDeConcepto[]; referencia?: string;
               observaciones?: string };
      respuesta: { movimientoId: string; numero: number; anioDeNumero: number; avisos: AvisoDeBancos[] };
    };
    /** Anula un movimiento que creó el módulo que lo pide (cheque a la antigua o con inverso, nota con inverso); no le devuelve el aviso. */
    'bancos.anular_movimiento_de_origen': {
      datos: { origen: OrigenDeMovimientoContrato; movimientoId: string; motivo: string; fecha?: string };
      respuesta: { forma: 'sin_inverso' | 'con_inverso'; inversoId: string | null };
    };
    /**
     * Fija (reemplaza) el reparto por concepto de un movimiento con origen del módulo que lo pide o de una nota marcada
     * para Cuentas por pagar. Solo clasifica el flujo: el monto, la fecha y la conciliación no cambian. Idempotente.
     */
    'bancos.fijar_desglose_de_conceptos': {
      datos: { movimientoId: string; origen: OrigenDeMovimientoContrato | null; conceptos: LineaDeConcepto[] };
      respuesta: { conDesglose: boolean };
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
      formaDeAnulacion: 'sin_inverso' | 'con_inverso' | null;   // solo en `anular`
      motivo: string | null; fecha: string | null;
    };
  }
}
```

Cada orden corre el **mismo caso de uso** que la pantalla de Bancos (`EmitirCheque`, `CrearMovimiento`, `AnularCheque`,
`AnularMovimiento`) con el origen y los conceptos ya resueltos por clave; Bancos no pide su propio permiso (decidido). El
concepto por clave de sistema no se valida contra P3 (P3 solo rige al que elige a mano). `fijar_desglose_de_conceptos`
valida: movimiento vigente de la empresa; con `origen`, que sea el suyo; sin `origen`, que sea una nota **marcada** y que
quien pide sea Cuentas por pagar; Σ líneas = monto del movimiento; claves del mismo tipo (débito o crédito) que el
movimiento.

### 6.2 Conceptos de sistema nuevos y desglose (pago mixto, nota ligada y reintegro)

| Clave | Nombre | Aplica a | Flujo | Para |
|---|---|---|---|---|
| `pago_a_proveedor` (ya existe) | Pago a proveedores | débito | Operación, «Pagos a proveedores» | Cargos sin activo fijo; notas marcadas |
| `pago_a_proveedor_de_activo` (**nuevo**) | Pago a proveedores de activo fijo | débito | **Inversión**, «Compra de activos» | Cargos con `tiene_activo_fijo` (P2, C-U8-6), también la parte de una nota ligada (C-CP4-4) |
| `reintegro_de_proveedor` (**nuevo**) | Reintegro de proveedores | crédito | Operación, «Pagos a proveedores» (resta de las salidas del grupo) — C-CP4-6 | Reintegros por depósito |
| `reintegro_de_proveedor_de_activo` (**nuevo**) | Reintegro de proveedores de activo fijo | crédito | **Inversión**, «Compra de activos» (resta) — C-CP4-6 | Reintegros de notas cuya factura es de activo fijo |

**Desglose** (decisión del 2026-09-29: un pago, varias líneas): tabla nueva **`bancos.desglose_de_movimientos`**
(`id`, `empresa_id`, `movimiento_id` FK a `movimientos` **on delete cascade** con índice, `concepto_id` con la llave
compuesta a `conceptos (id, empresa_id)`, `monto numeric(14,2) > 0`, autoría y marcas, único `(movimiento_id,
concepto_id)`, `politicaPorEmpresa()`). Existe **solo cuando el reparto no es «todo al concepto del movimiento»**: dos o
más conceptos, o uno distinto del de `movimientos.concepto_id` (la nota marcada que quedó toda en Inversión). En un
movimiento con origen, `movimientos.concepto_id` es el de mayor monto (el que se ve en las listas); en una nota
**marcada**, sigue siendo `pago_a_proveedor` **siempre** (es la marca, CP4-b) aunque el desglose la reparta. La suma del
desglose es el monto (lo revisa Bancos al crearlo o al fijarlo; solo lo escriben la creación con conceptos y
`fijar_desglose_de_conceptos`). Los reportes por concepto (flujo de efectivo, movimientos por concepto) usan el desglose
cuando existe (`coalesce` con el concepto del movimiento; un inverso usa el desglose de su original, también el que tenía
la nota al anularse). Cuentas por pagar arma las líneas sumando los montos de sus cargos por `tiene_activo_fijo`; con una
sola clase, una sola línea y sin desglose.

### 6.3 Reglas nuevas en Bancos

1. **Movimiento con origen** (`modulo_de_origen` no nulo): **no se corrige, ni se elimina, ni se blanquea** en Bancos
   (hoy solo no se reclasifica). Anularlo sí, pero antes manda `bancos.movimiento_por_cambiar` (`cambio = 'anular'`, con
   la `formaDeAnulacion` que va a usar), también desde la anulación en lote de cheques caducos (H6b). `puedeCorregir`,
   `puedeEliminar` y `puedeBlanquear` en falso; la tarjeta dice «Origen: Cuentas por pagar, pago N» con enlace.
2. **Nota marcada para Cuentas por pagar** (CP4-b, decidido): una **nota de débito** sin origen con el concepto de
   sistema `pago_a_proveedor` (sin columna nueva: el concepto **es** la marca). Con Cuentas por pagar activo, «Marcar
   para Cuentas por pagar» (al registrar la nota o después, `bancos.notas.editar`) le pone ese concepto; «Desmarcar»
   (motivo obligatorio, auditoría `corregir` con el concepto anterior) le pone el concepto que se elija, y antes manda el
   aviso (`cambio = 'desmarcar'`): si está ligada, se rechaza. Corregirla, anularla o eliminarla también mandan el aviso.
   Sin Cuentas por pagar activo no se puede marcar. Hoy P3 prohíbe elegir `pago_a_proveedor` en una nota: la excepción es
   solo la acción «Marcar». Una nota marcada con desglose no se reclasifica (el desglose lo fija Cuentas por pagar).
3. **Cuentas por pagar inactivo** (CP4-i, decidido; cambia lo que decía el plan): Bancos **rechaza** anular, eliminar,
   corregir, blanquear o desmarcar un movimiento con origen `cuentas-por-pagar` o marcado mientras el módulo esté
   inactivo («Active Cuentas por pagar para cambiar este movimiento: es del pago N»), con el puerto
   `CuentasPorPagarActivo` que ya existe (como U6 en Libro de compras). Error de Bancos `ModuloDeOrigenInactivo`.
4. **Aviso de fondos de un cheque posfechado** (C-CP4-1): al emitir un cheque con fecha posterior a hoy —desde Cuentas por
   pagar **y** desde la pantalla de Bancos, el riesgo es el mismo—, Bancos calcula `saldo de hoy − Σ cheques posfechados
   vigentes de la cuenta − este cheque`; si es negativo, **avisa sin bloquear**: «El cheque se paga a la vista (Código
   de Comercio art. 501): si el proveedor lo cobra hoy, la cuenta no tiene fondos. Emitir un cheque sin fondos puede ser
   delito (Código Penal art. 268).» (texto del contador; se coteja antes de la ayuda). Va en la respuesta de la orden
   (`avisos`) y en la de `EmitirCheque`.
5. **Aprobación de cheques y transferencias** (*Bancos, segunda parte*, sin diseñar): cuando exista, la orden de Cuentas
   por pagar dejará el movimiento «por aprobar» igual que uno manual (CP1 §7.2); se decide allí.

### 6.4 Lo que Cuentas por pagar lee de Bancos sin orden (`infraestructura`, permitido por el `dependeDe`)

- Las notas marcadas con su disponible (para la ventana de ligar y el listado de «marcadas sin aplicar»).
- La cuenta, el número de cheque o de nota, la fecha, el estado (anulado, revertido, conciliado) y el beneficiario del
  movimiento de cada pago (para la ficha, el comprobante y la regla `noEstarCobrado`).
- Bloquear la nota marcada (`for update`) al ligarla o al reaplicar o anular un pago que la liga (§5.2).

### 6.5 Migración de Bancos `0032_cp4_pagos_de_cuentas_por_pagar`

`npm run bd:generar -w servidor -- bancos cp4_pagos_de_cuentas_por_pagar`, **después** de que la `0031` de H2b esté en
`main` (acordado con esa sesión; si hiciera falta otra antes, esta toma la siguiente libre y se corrige este documento):
tabla `desglose_de_movimientos` con RLS; conceptos de sistema `pago_a_proveedor_de_activo`, `reintegro_de_proveedor` y
`reintegro_de_proveedor_de_activo` en `CONCEPTOS_DE_SISTEMA` y, en las empresas que ya tienen catálogo, `insert` de los
tres (a mano, como la `0022`: sin tocar uno que ya tenga ese nombre; si existe uno sugerido con el mismo nombre, se le
pone la clave). Sin datos que convertir (ningún movimiento tiene origen).

## 7. Permisos, auditoría, errores, eventos y configuración

### 7.1 Permisos (`modulo.ts`, PLAN §3.5)

| Permiso | Para |
|---|---|
| `cuentas-por-pagar.pagos.ver` | Lista y ficha de pagos, medios de pago, comprobante, pagos en la ficha de la contraseña y del documento |
| `cuentas-por-pagar.pagos.emitir` | Pagar con cheque o nota de débito (crea el movimiento en Bancos sin pedir permisos de Bancos) |
| `cuentas-por-pagar.pagos.ligar-notas-de-debito` | Ligar una nota de débito marcada |
| `cuentas-por-pagar.pagos.aplicar-a-apertura` | Aplicar saldos iniciales a la cuenta de apertura |
| `cuentas-por-pagar.pagos.reaplicar` | Reaplicar un pago a otros cargos de su contraseña (§5.11) |
| `cuentas-por-pagar.pagos.anular` | Anular un pago (anula también su movimiento en Bancos) |
| `cuentas-por-pagar.reintegros.crear` | Registrar un reintegro (depósito o efectivo) |
| `cuentas-por-pagar.reintegros.anular` | Anular un reintegro |
| `cuentas-por-pagar.ajustes.crear` (ya existe) | También la diferencia de centavos de un cargo, al pagar o desde la ficha del pago |

Sin `editar` (un pago no se corrige: se reaplica o se anula), sin `eliminar`, sin `importar`/`exportar` (Operación).
Ninguno es `soloSuperacceso`. Sin migración de permisos (son nuevos). **Separación de funciones** (CP4-j): el permiso de
pagar es otro que el de autorizar; no se agrega «quien autorizó no paga». En Bancos, marcar y desmarcar usan
`bancos.notas.editar` (y `bancos.notas.crear` al registrarla marcada).

### 7.2 Auditoría

| Hecho | Acción | Recurso | `anterior` |
|---|---|---|---|
| Pagar con cheque, nota de débito o nota ligada | ninguna (alta; `creado_por`) | — | — |
| Aplicar a la cuenta de apertura | `ajustar` | `cuentas-por-pagar.pagos` | Fichas de los cargos antes; con motivo |
| Reaplicar un pago | `corregir` | `cuentas-por-pagar.pagos` | `PagoDto`; con motivo |
| Anular un pago (desde aquí o por aviso) | `anular` | `cuentas-por-pagar.pagos` | `PagoDto`; con motivo |
| Diferencia de un cargo (al pagar o desde el pago) | `ajustar` (CP2) | `cuentas-por-pagar.ajustes` | Ficha del cargo antes; motivo fijo |
| Registrar un reintegro | ninguna (alta) | — | — |
| Anular un reintegro | `anular` | `cuentas-por-pagar.reintegros` | `ReintegroDto`; con motivo |
| Bancos: desmarcar una nota | `corregir` | `bancos.notas` | La nota con su concepto anterior; con motivo |
| Bancos: anular un movimiento por orden | `anular` (como hoy) | `bancos.cheques` o `bancos.notas` | Como hoy; motivo «Anulado desde Cuentas por pagar: …» |
| Bancos: fijar el desglose | ninguna (clasificación que sigue al pago, que sí se audita al reaplicarlo o anularlo) | — | — |

### 7.3 Errores nuevos (código propio; `dominio/errores-de-pagos.ts`)

| Clase | Familia | Código | Mensaje |
|---|---|---|---|
| `DocumentoSinAutorizar` | `ReglaDeNegocioInfringida` | `documento_sin_autorizar` | «El documento … no está autorizado: solo se paga lo autorizado.» |
| `DocumentoFueraDeLaContrasena` | `DatoInvalido` (campo `aplicaciones.<i>.cargoId`) | `documento_fuera_de_la_contrasena` | «El documento … no está en esta contraseña.» |
| `PagoMayorQueElSaldo` | `DatoInvalido` (campo `aplicaciones.<i>.monto`) | `pago_mayor_que_el_saldo` | «El documento … solo debe Q….» |
| `PagoSinDocumentos` / `DemasiadosDocumentosEnPago` | `DatoInvalido` (campo `aplicaciones`) | `pago_sin_documentos` / `demasiados_documentos_en_pago` | «Elija al menos un documento.» / «Un pago lleva hasta 100 documentos.» |
| `FechaDePagoInvalida` | `DatoInvalido` (campo `fecha`) | `fecha_de_pago_invalida` (ya lo usa CP3 para `fechaDePago`: este va en `fecha`) | «La fecha no puede ser anterior al dd/mm/aaaa (emisión de los documentos o fecha de inicio).» |
| `ProveedorSinNombreDelNit` | `ReglaDeNegocioInfringida` | `proveedor_sin_nombre_del_nit` | «Escriba la razón social del proveedor en Terceros: el cheque va a nombre del NIT.» |
| `MovimientoNoLigable` | `DatoInvalido` (campo `movimientoId`) | `movimiento_no_ligable` | «Esa nota no está marcada para Cuentas por pagar, está anulada o es de otra empresa.» |
| `PagoMayorQueLaNota` | `DatoInvalido` (campo `aplicaciones`) | `pago_mayor_que_la_nota` | «A la nota … solo le quedan Q… por aplicar.» |
| `SoloSaldosIniciales` | `ReglaDeNegocioInfringida` | `solo_saldos_iniciales` | «La cuenta de apertura solo se usa con saldos iniciales.» |
| `CorrijaElSaldoInicial` | `ReglaDeNegocioInfringida` | `corrija_el_saldo_inicial` | «La carga inicial está abierta y el saldo inicial … no tiene movimientos: quítelo de la contraseña, desautorícelo y corríjalo o elimínelo en Saldos iniciales.» |
| `DiferenciaFueraDelPago` | `DatoInvalido` (campo `diferencias.<i>.cargoId`) | `diferencia_fuera_del_pago` | «Solo se salda la diferencia de un documento de este pago.» |
| `ReaplicacionConOtroMonto` | `DatoInvalido` (campo `aplicaciones`) | `reaplicacion_con_otro_monto` | «Al reaplicar, la suma debe seguir siendo Q… (el monto del pago).» |
| `PagoYaAnulado` | `ReglaDeNegocioInfringida` | `pago_ya_anulado` | «El pago N ya está anulado.» |
| `PagoCobrado` | `ReglaDeNegocioInfringida` | `pago_cobrado` | «El cheque del pago N ya está conciliado (el banco lo pagó): no se anula. Si se aplicó a otros documentos, reaplíquelo; si el proveedor devolvió el dinero, regístrelo como reintegro.» |
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
| Bancos: `ModuloDeOrigenInactivo` | `ReglaDeNegocioInfringida` | `modulo_de_origen_inactivo` | «Active Cuentas por pagar para cambiar este movimiento: es del pago N.» |

`ContrasenaAnulada`, `NotaEnContrasena`, `MotivoInvalido` y los de Bancos (`SaldoInsuficiente`, `ChequeNoDisponible`,
`MesConciliado`…) ya existen y pasan tal cual. Un pago o un reintegro que no existe responde `RecursoNoEncontrado`.

### 7.4 Eventos (`core/contratos/cuentas-por-pagar.contratos.ts` y `dominio/eventos-de-pagos.ts`)

```ts
type EfectoDePago = 'banco' | 'transitoria_por_aplicar' | 'apertura' | 'correccion_de_error';
type AplicacionDelEvento = { documentoId: string; documentoDeCompraId: string | null;
  origen: 'libro_de_compras' | 'saldo_inicial'; montoCentavos: number; retencionDescontadaCentavos: number;
  tieneActivoFijo: boolean };

'cuentas-por-pagar.pago_registrado': {
  empresaId: string; pagoId: string; numero: number; contrasenaId: string; proveedorId: string;
  forma: 'cheque' | 'nota_de_debito' | 'nota_ligada' | 'cuenta_de_apertura';
  fecha: string;               // la del cheque o de la aplicación: Contabilidad fecha la partida aquí (§2.4)
  posfechado: boolean; montoCentavos: number; movimientoId: string | null; cuentaBancariaId: string | null;
  efecto: EfectoDePago; aplicaciones: AplicacionDelEvento[];
};
'cuentas-por-pagar.pago_reaplicado': {
  empresaId: string; pagoId: string; fecha: string;            // la de la reaplicación
  fechaDelPago: string; efecto: EfectoDePago;
  antes: AplicacionDelEvento[]; despues: AplicacionDelEvento[];
};
'cuentas-por-pagar.pago_anulado': {
  empresaId: string; pagoId: string; fecha: string;            // la de la anulación (C5)
  fechaOriginal: string;                                       // la del pago (C-CP4-8)
  anulacionEnBancos: 'sin_inverso' | 'con_inverso' | null;     // null en nota ligada y cuenta de apertura
  montoCentavos: number; efecto: EfectoDePago; movimientoId: string | null;
};
'cuentas-por-pagar.reintegro_registrado': { empresaId; reintegroId; proveedorId; forma: 'deposito' | 'efectivo';
  fecha; montoCentavos; movimientoId: string | null;
  notas: Array<{ documentoId; montoCentavos; tieneActivoFijo: boolean }> };
'cuentas-por-pagar.reintegro_anulado': { empresaId; reintegroId; fecha; fechaOriginal; montoCentavos; forma;
  anulacionEnBancos: 'sin_inverso' | 'con_inverso' | null };
```

`EfectoDeAjuste` suma `'ingreso'`. El plan llamaba al primero `…pago_emitido`: se llama `pago_registrado` porque una nota
ligada no se emite. Nadie los escucha todavía (Contabilidad). `pago_registrado` es también lo que usará el **aviso de pago
por correo** (CP7).

### 7.5 Configuración

| Clave | Esquema | Niveles | Predeterminado | Para |
|---|---|---|---|---|
| `cuentas-por-pagar.pagos.tope_diferencia` (**nueva**, C-CP4-5) | dinero `>= 0` (como `ajustes.tope_diferencia_menor`) | instalación y empresa | **Q1.00** (contador, 2026-11-14, P-CP4-3: solo redondeos; lo demás suele ser retención mal calculada o descuento que exige nota de crédito) | Tope de la diferencia que se puede saldar como residuo de un pago; con 0 se apaga |

Se siguen usando `cuentas-por-pagar.bancarizacion.umbral` (instalación, CP2) y
`cuentas-por-pagar.ajustes.tope_diferencia_menor` (notas, CP2), y las de Bancos (sobregiro, misma fecha en anulación).

## 8. Contrato de la API

Prefijo `/api/cuentas-por-pagar`. Dinero como texto con dos decimales; fechas `AAAA-MM-DD`.

**Solicitud de pago** (`esquemaPago`, Zod, unión por `forma`):

```ts
{
  forma: 'cheque' | 'nota_de_debito' | 'nota_ligada' | 'cuenta_de_apertura';
  fecha?: string;                                  // por omisión hoy; apertura con la carga abierta: la fecha de inicio
  chequeraId?: uuid; chequeId?: uuid;              // cheque (por omisión el siguiente disponible)
  noNegociable?: boolean;                          // cheque, por omisión true
  cuentaBancariaId?: uuid;                         // nota de débito
  movimientoId?: uuid;                             // nota ligada
  referencia?: string | null;                      // va a Bancos (cheque, nota de débito) o se guarda (ligada, apertura)
  motivo?: string;                                 // cuenta de apertura, obligatorio
  observaciones?: string | null;
  aplicaciones: Array<{ cargoId: uuid; monto: string }>;   // 1–100
  diferencias?: Array<{ cargoId: uuid; monto: string }>;   // §5.4, solo cargos de `aplicaciones`
}
```

**`PagoDto`**: `id`, `numero` (formateado), `contrasena { id, numero }`, `proveedor { id, nombre, nit }`, `beneficiario`,
`forma`, `fecha`, `posfechado` (calculado: `fecha > hoy`), `monto`, `movimiento` (`{ id, cuentaBancariaNombre, tipo,
numeroDeCheque | numero, fecha, conciliado, anulado } | null`), `referencia`, `motivo`, `conCargaCerrada`,
`observaciones`, `estado`, `aplicaciones` (`documentoId`, `tipo`, `serie`, `numero`, `origen`, `total`, `retenciones`,
`retencionDescontada`, `monto`, `cubre` = monto + retención, `saldoDelDocumento`, `diferenciaOfrecible`),
`diferencias` (ajustes), `anulacion`, `creadoPorNombre`, `creadoEn`, `avisos` (solo en la respuesta de registrar y de
reaplicar) y, calculados en el servidor, `puedeAnular`, `puedeReaplicar` y `puedeSaldarDiferencia`.

| Método y ruta | Permiso | Cuerpo / consulta | Respuesta |
|---|---|---|---|
| `GET /contrasenas/:id/para-pagar` | `pagos.ver` | — | `{ cargos: CargoParaPagarDto[], noAutorizados, fechaMinima, fechaDeInicio, cargaCerrada, beneficiario, sumaDelMesAlProveedor, umbralDeBancarizacion, topeDiferencia }`; cada cargo con `saldo`, `propuesto`, `fechaDeEmision`, `fechaDeRecepcion`, `retencionPorDescontar`, `retencionesPorPracticar`, `constanciasPendientes`, `mesDeRetencion`, `tieneActivoFijo`, `sobreUmbralDeBancarizacion`, `tieneMovimientos` (para la cuenta de apertura) |
| `GET /pagos/medios` | `pagos.ver` | `fecha?` | La respuesta de `bancos.medios_de_pago` (cuentas y chequeras activas, siguiente cheque, saldo) |
| `GET /pagos/notas-para-ligar` | `pagos.ver` | `cuentaBancariaId?`, `desde?`, `hasta?`, `soloConDisponible` (true) | Notas marcadas con `monto`, `aplicado`, `disponible`, `fecha`, `referencia`, cuenta |
| `POST /contrasenas/:id/pagos` | según `forma`: `pagos.emitir`, `pagos.ligar-notas-de-debito` o `pagos.aplicar-a-apertura` (y `ajustes.crear` si trae `diferencias`) | solicitud | 201, `PagoDto` |
| `GET /pagos` | `pagos.ver` | `proveedorId?`, `contrasenaId?`, `forma?`, `estado?` (`vigente` por omisión), `posfechado?`, `desde?`, `hasta?`, `cuentaBancariaId?`, `pagina`, `limite` | página de `PagoResumenDto` |
| `GET /pagos/:id` | `pagos.ver` | — | `PagoDto` |
| `GET /pagos/:id/comprobante` | `pagos.ver` | — | `ComprobanteDePagoDto` (§9) |
| `POST /pagos/:id/reaplicar` | `pagos.reaplicar` | `{ motivo, aplicaciones: [{ cargoId, monto }] }` | `PagoDto` |
| `POST /pagos/:id/diferencias` | `ajustes.crear` | `{ cargoId, monto, fecha? }` | 201, `PagoDto` |
| `POST /pagos/:id/anular` | `pagos.anular` | `{ motivo, fecha? }` | `PagoDto` |
| `POST /reintegros` | `reintegros.crear` | `{ proveedorId, forma, fecha?, cuentaBancariaId?, referencia?, observaciones?, notas: [{ notaId, monto }] }` | 201, `ReintegroDto` |
| `GET /reintegros/:id` | `documentos.ver` | — | `ReintegroDto` |
| `GET /reintegros/:id/recibo` | `documentos.ver` | — | `ReciboDeReintegroDto` (§5.10) |
| `POST /reintegros/:id/anular` | `reintegros.anular` | `{ motivo, fecha? }` | `ReintegroDto` |

El permiso de `POST /contrasenas/:id/pagos` depende del cuerpo. Recomendado (se confirma al programar): **tres rutas**
(`/contrasenas/:id/pagos`, `/contrasenas/:id/pagos/ligar`, `/contrasenas/:id/pagos/apertura`), cada una con su
`proteger` de siempre; la alternativa es una ruta con `pagos.ver` en el guardia y el permiso de la forma en el caso de uso
(como `autorizar-propios`). La prueba de API cubre cada forma sin su permiso (403).

Bancos: `POST /bancos/notas/:id/marcar` (`bancos.notas.editar`), `POST /bancos/notas/:id/desmarcar { motivo, conceptoId }`
(`bancos.notas.editar`), y `marcarParaCuentasPorPagar?: boolean` en el registro de una nota de débito. `MovimientoDto`
gana `marcadaParaCuentasPorPagar`, `desglose` (`[{ concepto, monto }]` o vacío) y `puedeMarcar`/`puedeDesmarcar`; la
respuesta de emitir un cheque gana `avisos` (fondos de un posfechado).

**Excel:** ninguno (Operación). «Pagos realizados», «Notas marcadas sin aplicar» y el estado de cuenta son de CP5.

## 9. Cliente

- `servicios/`: `ApiPagos` (`pagos.api.ts`: `paraPagar`, `medios`, `notasParaLigar`, `registrar`, `listar`, `obtener`,
  `comprobante`, `reaplicar`, `saldarDiferencia`, `anular`) y `ApiReintegros` (con `recibo`); tipos en
  `servicios/tipos.ts`.
- **Ficha de la contraseña** (`FichaDeContrasena.vue`, CP3): sección «Pagos» (número, forma, fecha, monto, estado,
  «Posfechado», enlace a la ficha) y botón «Registrar pago» (`v-permiso` de cualquiera de las tres formas, solo si hay
  cargos autorizados con saldo). Columna «Pagado» y etiqueta «Pagada» / «Pagada en parte» / «Comprometida». Editar sigue
  disponible con pagos (CP4-e); «Quitar» se oculta en los documentos con pagos; con la contraseña impresa, quitar o
  agregar confirma el aviso de «REIMPRESIÓN» (§4).
- `paginas/NuevoPago.vue` (formulario en página, ≤ 120 líneas; ruta `/cuentas-por-pagar/contrasenas/:id/pagar`):
  pestañas por forma según permisos (Cheque, Transferencia o débito, Nota ya registrada, Cuenta de apertura —esta última
  solo si la contraseña tiene saldos iniciales—); los cargos autorizados con su saldo, retención que se descontará y monto
  propuesto editable, los no autorizados apagados; total que se recalcula; medio (chequera con el siguiente número o
  cuenta; nota marcada con su disponible); **beneficiario** (solo lectura); fecha (aviso de posfechado y de fecha
  anterior a la recepción; en apertura con la carga abierta, fija en la fecha de inicio); no negociable; referencia;
  motivo en apertura con sus avisos fijos; casilla de diferencia por cargo (con el aviso de retención); avisos de §5.5
  antes de confirmar y los de Bancos después. Lógica pura en `composables/pagos/edicion-de-pago.ts` (propuesta, totales,
  retención por descontar, diferencia ofrecible, suma del mes y aviso de bancarización, posfechado, fecha mínima, armado
  del cuerpo) con su `*.prueba.ts`. Componentes: `CargosDelPago`, `MedioDePago`, `NotasParaLigar`, `AvisosDelPago`.
- `paginas/Pagos.vue` (Operación): lista con filtros (proveedor, forma, estado, posfechado, fechas, cuenta), tarjetas
  `TarjetaDeRegistro` con número, proveedor, contraseña, forma («Cheque 1523 · Banco X»), fecha, monto, etiqueta «Anulado»
  o «Posfechado».
- `paginas/FichaDePago.vue`: datos, beneficiario, movimiento de Bancos (enlace si el usuario tiene `bancos.*.ver`),
  líneas con lo que cubre cada una, diferencias con «Dar por saldada la diferencia» por línea (`puedeSaldarDiferencia`),
  «Comprobante», «Reaplicar» (ventana o página con los cargos de la contraseña, motivo y la suma fija; lógica pura en
  `composables/pagos/reaplicacion.ts`) y «Anular» (`VentanaDeMotivo` con la fecha del inverso si mueve dinero; si está
  cobrado, el botón no aparece y la ficha dice «Cobrado: reaplíquelo o registre un reintegro»).
- `paginas/ComprobanteDePago.vue` (página de impresión, como la contraseña de CP3; `window.print()`): empresa, proveedor,
  beneficiario, pago N, forma y documento bancario, fecha (y «Cheque posfechado al dd/mm/aaaa»); por documento: tipo,
  serie y número, total, **retención (con número de constancia o «constancia por emitir»)**, notas aplicadas,
  **pagado** y saldo que queda; total del cheque; leyendas «Las retenciones se documentan con su constancia.» y **«Este
  comprobante no es un documento tributario.»**; firmas «Entregado» y «Recibido por el proveedor». Lógica pura en
  `composables/pagos/comprobante-de-pago.ts`.
- **Documentos por pagar y su ficha**: columna «Pagado», filtro y etiqueta de estado de pago (con «Comprometido»);
  sección «Pagos»; por qué no se anula si tiene pagos. **Sin** «Ajustar diferencia» en un cargo (solo desde el pago).
- **Notas de crédito** (CP2): «Registrar reintegro» en la ficha y en la pantalla (selección de notas del mismo proveedor);
  `componentes/VentanaDeReintegro.vue` (forma, cuenta o referencia del recibo, fecha, montos por nota con el saldo libre;
  aviso de efectivo). Sección «Reintegros» en la ficha con «Recibo» y «Anular». `paginas/ReciboDeReintegro.vue`
  (impresión, §5.10). Lógica pura en `composables/reintegro.ts`.
- **Constancias pendientes** (C-CP4-1): el aviso de entero enlaza a Libro de compras → Retenciones (mes de la retención,
  filtro «sin constancia»), que ya existe (L5-4b); CP4 no hace otra pantalla (P-CP4-2).
- **Bancos** (cliente): en la nota de débito, casilla «Pago a proveedor que se aplicará en Cuentas por pagar» al
  registrarla (solo con el módulo activo) y acciones «Marcar» / «Desmarcar» (ventana con motivo y concepto); etiqueta
  «Para Cuentas por pagar» y, si tiene desglose, el reparto en la ficha; en un movimiento con origen, «Origen: Cuentas
  por pagar · Pago N» con enlace y sin corregir, eliminar ni blanquear; al emitir un cheque posfechado, el aviso de
  fondos; los mensajes de rechazo del aviso se muestran tal cual.
- `modulo.ts` y `textos.ts`: rutas `/cuentas-por-pagar/pagos`, `/pagos/:id`, `/pagos/:id/comprobante`,
  `/contrasenas/:id/pagar`, `/reintegros/:id/recibo`; menú «Pagos» en `seccion: 'operacion'`.

## 10. Convivencia y riesgos

1. **CP3 y U8-l primero.** Los pagos cuelgan de `contrasenas` y `contrasena_documentos` (ya en `main`); la `0008` no se
   genera antes de que U8l-2 (`0007`) esté en `main` (el `snapshot` de drizzle-kit es una cadena: nunca dos ramas
   generando migraciones de Cuentas por pagar a la vez). Las reglas de CP4-2 tocan las listas que llenan CP3-3, CP3-4 y
   U8l-3, y la impresión de CP3-5: va después de esos pasos (§11).
2. **Bancos en otra sesión (H2).** Acordado: H2b usa la `0031`; la `0032` es de CP4 y se genera después de que la `0031`
   esté en `main`. Los pasos de Bancos de este diseño tocan `movimientos`, conceptos, cheques y reportes por concepto; lo
   que toca el código de la conciliación (el aviso `movimiento_por_cambiar` al desmarcar desde la conciliación, CP4-B2b)
   se programa **después de que H2b esté en `main`** (servidor y cliente). El que entra segundo rebasa.
3. **Saldos calculados (U4).** Cada consulta suma tres subconsultas más (pagos, ajustes de cargos, reintegros), todas por
   índices parciales `where vigente`; separar pagado y comprometido es un `filter (where fecha <= hoy)` en la misma
   subconsulta. CP1 dejó para CP4 revisar el rendimiento: el paso CP4-2 incluye una prueba de carga (20,000 documentos,
   30,000 pagos) con `explain analyze` de la lista y del saldo por proveedor; si pasa de ~200 ms, se evalúa guardar el
   saldo (no antes).
4. **Retención en el primer pago.** Si el primer pago se anula o se reaplica a otro cargo, la retención «vuelve» y la
   lleva el siguiente pago que se registre; un segundo pago ya existente no cambia (su comprobante ya se entregó). El
   único parcial impide dos líneas vigentes con retención.
5. **Cheque posfechado.** Comprometido desde hoy (el saldo lo resta: no se paga dos veces) y pagado en su fecha (§2.4);
   el estado cambia solo con el paso de los días (es calculado). Bancos lo cuenta en su fecha y avisa de fondos.
6. **Orden de bloqueo: Empresas → Bancos → Cuentas por pagar.** Pagar: carga inicial, orden a Bancos (que bloquea lo
   suyo), luego contraseña y cargos. Ligar, y reaplicar o anular un pago con nota ligada: carga inicial, la nota en
   Bancos (`for update` por lectura), luego pago, contraseña y cargos; `fijar_desglose_de_conceptos` vuelve a la nota ya
   bloqueada. Anular desde Bancos: Bancos bloquea su movimiento y avisa; el manejador solo bloquea el pago (no los
   cargos: anular un pago solo sube saldos). Ningún paso bloquea filas de Libro de compras (las constancias y fechas se
   leen sin bloqueo). No invierte el orden «libro, luego Cuentas por pagar» de CP1 ni el «Empresas, luego Cuentas por
   pagar» de U8.
7. **Un cheque que se gasta y se deshace.** Si la revisión con las filas bloqueadas falla después de la orden a Bancos,
   la transacción entera se deshace: el cheque vuelve a «disponible» y el correlativo de la nota no deja hueco (H9 se
   deshace con la transacción).
8. **Conciliación.** Un pago anulado deja en Bancos el par original + inverso, que la conciliación marca junto (B7) si
   ninguno pasó por el banco. Un cheque ya conciliado no se anula desde Cuentas por pagar (CP4-f): se reaplica.
9. **Cheques caducos (H6b).** La anulación en lote manda el aviso por cada cheque con origen: el lote es todo o nada, así
   que un cheque de un pago que no se puede anular frena el lote con su mensaje (la pantalla de caducos ya muestra el
   error por cheque).
10. **Flujo de efectivo.** Con el desglose, un cheque que paga una factura de gasto y otra de activo reparte entre
    Operación e Inversión; una nota ligada pasa a Inversión la parte ligada a activo fijo. Como la nota es de su fecha
    en Bancos y se liga después, **el flujo de un mes ya impreso puede cambiar** al ligarla o al reaplicar (solo la
    clasificación; ni el saldo ni la conciliación). Queda en la QA.
11. **Aviso de pago por correo (CP7).** Sale de `pago_registrado` y del comprobante; no cambia datos de CP4.
12. **Borrar la empresa:** cascadas por `empresa_id`; las llaves `no action` se revisan al final del comando.

## 11. Pasos (un commit cada uno; servidor y cliente por separado)

Cada commit corre `npm run revisar` y sus pruebas y actualiza la bitácora de `PLAN.md`. Servidor con
`programador-backend`, cliente con `programador-frontend`, QA con `pruebas-qa`.

**Orden respecto de lo que ya está en camino** (verificado contra `main` el 2026-11-14: Cuentas por pagar hasta la
`0006`, CP3-1 hecho; Bancos hasta la `0030`):

| Pasos de CP4 | Van después de | Por qué |
|---|---|---|
| CP4-B1, CP4-B2a | H2b servidor (paso 4 de H2, `0031`) en `main` | La `0032` sigue a la `0031` (acordado) |
| CP4-B2b | H2b completo en `main` (pasos 4 y 5 de H2) y CP4-B2a | Toca el código de la conciliación que cambia H2b |
| CP4-B3 | CP4-B2a (y H2b cliente, por la pantalla de conciliación) | Cliente de lo anterior |
| CP4-1 | U8l-2 (`0007`) en `main` | La `0008` sigue a la `0007` |
| CP4-2 | CP3-3, CP3-4, CP3-5 y U8l-3 en `main`, y CP4-1 | Suma reglas a las listas de CP3 y U8l-3 y la columna «Pagado» a la impresión de CP3 |
| CP4-3 a CP4-8 | CP4-2 y CP4-B2a | Usan los saldos y las órdenes a Bancos |
| CP4-9 a CP4-11 | CP3-6 y CP3-7 en `main`, CP4-8 y CP4-B3 | Pantallas sobre las de CP3 |
| CP4-12 (QA) | CP3-8, la QA de U8-l y CP4-11 | De punta a punta con todo |

**Adenda de efectivo** (`diseno-cp4-pagos-en-efectivo.md` §11, por aprobar): CP4-V1 (varias contraseñas, antes de
CP4-3), CP4-EB (Bancos, `0033`), CP4-E1 (datos), CP4-E2 a CP4-E4 (servidor, después de CP4-4, CP4-5 y CP4-8) y CP4-E5
(cliente, después de CP4-10); CP4-12 suma sus casos.

CP3-2 a CP3-8 y U8l-2 en adelante siguen su propio orden (U8l-2 y U8l-3 después de CP3-1 y no en paralelo con CP3-2 a
CP3-4); ninguno espera a CP4. Los pasos de Bancos de CP4 sí pueden avanzar en paralelo con CP3 y U8-l.

**Bancos:**

1. **CP4-B1 (servidor, Bancos, datos y conceptos):** migración `0032` (§6.5), `desglose_de_movimientos`, conceptos de
   sistema nuevos (cuatro claves en `CONCEPTOS_DE_SISTEMA`, tres nuevas), reportes por concepto con el desglose (también
   la nota marcada con desglose de un solo concepto). **Pruebas:** tabla (suma, RLS, cascada), migración repetible, flujo
   de efectivo con un movimiento desglosado, con su inverso y con una nota marcada toda en Inversión.
2. **CP4-B2a (servidor, Bancos, contratos y reglas fuera de la conciliación):** `core/contratos/bancos.contratos.ts`
   (§6.1), manejadores de las cinco órdenes sobre los casos de uso existentes (con `fijar_desglose_de_conceptos`), aviso
   `movimiento_por_cambiar` (con `formaDeAnulacion`) en anular, anular cheques caducos, eliminar, blanquear, corregir y
   desmarcar desde la pantalla de movimientos; reglas de §6.3 (origen, marcadas, `ModuloDeOrigenInactivo`, aviso de
   fondos del posfechado también en `EmitirCheque`); marcar y desmarcar con su auditoría. **Pruebas:** cada orden con un
   módulo de prueba que escucha; rechazo del aviso deshace todo; corregir/eliminar/blanquear con origen (rechazo);
   marcar sin Cuentas por pagar activo (rechazo); cambiar un movimiento con origen con el módulo inactivo (rechazo);
   posfechado con y sin fondos de hoy; desglose que no suma (rechazo) y nota no marcada sin origen (rechazo).
3. **CP4-B2b (servidor, Bancos, avisos desde la conciliación):** el aviso `movimiento_por_cambiar` (`cambio =
   'desmarcar'`) cuando una nota marcada se desmarca desde la conciliación (las marcadas sin ligar al cierre del mes) y
   cualquier otro cambio a un movimiento con origen o marcado que se haga desde allí. **Pruebas:** desmarcar desde la
   conciliación una nota ligada (rechazo) y una sin ligar (pasa, auditoría).
4. **CP4-B3 (cliente, Bancos):** marcar/desmarcar, etiqueta, desglose en la ficha, origen con enlace, acciones ocultas
   según el servidor, aviso de fondos al emitir un posfechado.

**Cuentas por pagar:**

5. **CP4-1 (servidor, datos):** migración `0008` (§3.5), tablas, restricciones, mensajes de §3.6. **Pruebas de tablas:**
   cada check (también `ajustes_pago_solo_diferencia`), llave de la contraseña (cargo fuera de ella falla), retención dos
   veces en vigentes (falla) y una anulada + una vigente (pasa), movimiento creado en dos pagos (falla) y nota ligada en
   dos (pasa), cascada al eliminar el documento con un pago anulado, quitar de la contraseña un documento con pago
   (falla), RLS; `politicas-de-los-modulos` y `llaves-entre-esquemas`.
6. **CP4-2 (servidor, saldos y reglas):** §2.2 y §2.4 en dominio y SQL (pagado, comprometido, `estadoDePago`), DTO de
   documentos y de contraseñas (con la columna «Pagado» de la impresión), reglas de §5.8 en todas las listas,
   `accionesDelDocumento`; CP3 sin cerrar `puedeEditar` con pagos; prueba de rendimiento (§10.3). **Pruebas:** saldo con
   pagos vigentes, anulados y posfechados (comprometido hoy, pagado al llegar la fecha), con ajuste de cargo y con
   reintegro; cada regla nueva desde aquí y por aviso de Libro de compras; contraseña con pagos editable y quitar un
   documento sin pagos (pasa) y con pagos (rechazo) (las filas se siembran: los casos de uso llegan en CP4-3).
7. **CP4-3 (servidor, pagar con cheque y nota de débito):** `RegistrarPago` (§5.1), puertos `PagosEnBancos` (las
   órdenes), `RetencionesDelLibro` (constancias y mes, lectura) y `NombreDelNit` (beneficiario, lectura de Terceros y del
   DTE), desglose por activo fijo, retención en el primer pago, diferencias (§5.4) y variable `pagos.tope_diferencia`,
   avisos (§5.5, §5.7 y los de Bancos), `ListarCargosParaPagar`, `MediosDePago`, eventos, permisos `pagos.ver` y
   `pagos.emitir`, rutas. **Pruebas** puras (propuesta, retención por descontar, desglose, suma del mes con posfechado,
   fecha mínima, beneficiario) y de API: cheque, cheque posfechado (comprometido, aviso de fondos), nota de débito, cargo
   sin autorizar (rechazo), monto mayor que el saldo, fecha anterior a la emisión (rechazo) y a la recepción (aviso), dos
   cargos uno de activo fijo (desglose en Bancos), retención solo en el primero, aviso de entero de un mes anterior,
   saldo inicial sin retención y con aviso de por practicar, constancia por emitir, diferencia de Q0.03 y de Q30 (no
   ofrecida), diferencia de un cargo que no está en el pago (rechazo), proveedor sin nombre del NIT (rechazo), saldo
   insuficiente en Bancos (nada se guarda), dos pagos a la vez, sin permiso.
8. **CP4-4 (servidor, anular, reaplicar y saldar diferencia):** `AnularPago` (§5.9), manejador de
   `bancos.movimiento_por_cambiar`, `REGLAS_PARA_ANULAR_PAGO` con `noEstarCobrado`, `ReaplicarPago` (§5.11) con
   `REGLAS_PARA_REAPLICAR_PAGO`, `SaldarDiferenciaDelPago` (§5.4), permisos `pagos.anular` y `pagos.reaplicar`,
   auditoría, eventos (`pago_anulado` con `anulacionEnBancos` y `fechaOriginal`, `pago_reaplicado`). **Pruebas:** anular
   cheque de mes abierto (`sin_inverso`) y de mes conciliado (`con_inverso`), desde aquí y desde Bancos (también caducos
   en lote), cobrado (rechazo), la retención pasa al siguiente pago, eliminar o corregir en Bancos (rechazo),
   idempotencia; reaplicar un cobrado a otro cargo (retención recalculada, desglose nuevo, auditoría), con otra suma
   (rechazo), a un cargo de otra contraseña (rechazo); saldar la diferencia después del pago y en un pago anulado
   (rechazo).
9. **CP4-5 (servidor, nota ligada):** forma `nota_ligada` (§5.2), `NotasParaLigar`, desglose por activo fijo con
   `fijar_desglose_de_conceptos`, permiso. **Pruebas:** varias contraseñas sobre una nota, disponible, nota no marcada,
   desmarcar o anular la nota ligada en Bancos (rechazo), anular el pago (la nota recupera disponible y su desglose
   vuelve), nota ligada a un cargo de activo fijo (desglose; toda en Inversión sigue marcada), aviso de retención no
   descontada y de año anterior.
10. **CP4-6 (servidor, cuenta de apertura):** forma `cuenta_de_apertura` (§5.3), permiso, auditoría `ajustar`, `efecto`
    y fecha según la carga. **Pruebas:** carga abierta con saldo sin movimientos, también autorizado (rechazo), con
    movimientos (pasa, `apertura`, fecha de inicio aunque se mande otra), carga cerrada (`correccion_de_error`), cargo del
    libro (rechazo), sin motivo, no entra en la suma de bancarización.
11. **CP4-7 (servidor, reintegros):** §5.10, tablas ya creadas, orden de nota de crédito con `reintegro_de_proveedor` y
    `reintegro_de_proveedor_de_activo`, `ReciboDeReintegro`, permisos, auditoría, eventos, reglas de la nota.
    **Pruebas:** depósito y efectivo (referencia obligatoria), varias notas (una de activo fijo: desglose), mayor que el
    saldo libre, nota en una contraseña (rechazo), anular desde aquí y desde Bancos, anular la nota con reintegro
    (rechazo), contenido del recibo (leyenda no tributaria).
12. **CP4-8 (servidor, lista, ficha y comprobante):** `ListarPagos` (filtro de posfechados), `ObtenerPago`,
    `ComprobanteDePago` (con constancias del libro y la leyenda no tributaria). **Pruebas** de contenido.
13. **CP4-9 (cliente, pagar):** `NuevoPago` con sus componentes y lógica pura; sección «Pagos» de la contraseña y su
    edición con pagos (aviso de «REIMPRESIÓN»).
14. **CP4-10 (cliente, pagos):** lista, ficha, saldar diferencia, reaplicar, anular, comprobante.
15. **CP4-11 (cliente, documentos, notas y reintegros):** columna y filtro de estado de pago (con «Comprometido»),
    reintegros en Notas de crédito, recibo de reintegro, enlace a las constancias pendientes.
16. **CP4-12 (QA):** proveedor con tres facturas (una con retención de IVA sin constancia de un mes anterior, una de
    activo fijo, una de más de Q30,000) y un saldo inicial con retenciones por practicar; contraseña impresa; pago
    parcial con cheque posfechado (comprometido, aviso de fondos, retención en el primero, avisos), segundo pago por
    transferencia, diferencia de centavos al pagar y después desde la ficha; editar la contraseña con pagos (quitar uno
    sin pagos: «REIMPRESIÓN»); nota de débito de un seguro marcada en Bancos y ligada a la factura de activo fijo
    (desglose en el flujo); intentar anular en Bancos la nota ligada y el cheque (uno rechazado, el otro anula el pago);
    conciliar un cheque e intentar anularlo (rechazo) y reaplicarlo; anular un pago desde Cuentas por pagar (cheque
    vuelve en Bancos); cheque caduco en lote; inactivar Cuentas por pagar e intentar anular el cheque en Bancos
    (rechazo); cuenta de apertura con la carga abierta y con la cerrada; reintegro por depósito y en efectivo con su
    recibo; flujo de efectivo con el desglose; permisos por separado; celular.

## 12. Preguntas para el usuario (respondidas el 2026-11-13)

El usuario aceptó todas las recomendaciones, con las correcciones del contador. Quedan como registro:

- **CP4-a. Extraer `Reversible` al core antes de CP4.** **Respondida:** no; se deja para Contabilidad
  (`Partida.revertir`), como dijo B7.
- **CP4-b. Cómo se marca una nota de débito «para Cuentas por pagar».** **Respondida: A**, la marca es el concepto de
  sistema `pago_a_proveedor` en una nota de débito sin origen.
- **CP4-c. Ligar al cheque o nota de saldo inicial de Bancos.** **Respondida (con C-CP4-3): no existe.** Se quitan la
  forma, su permiso y CP4-13; el cheque de apertura anulado queda para *Bancos, segunda parte* (§5.6).
- **CP4-d. Cuenta de apertura con la carga abierta.** **Respondida:** sí, con la fecha de inicio y rechazando también el
  saldo autorizado sin movimientos; con la carga cerrada, corrección de error (§5.3).
- **CP4-e. Editar una contraseña con pagos.** **Respondida:** sí (cambia CP3): fecha prometida, agregar documentos y
  quitar los que no tienen pagos, con el aviso de «REIMPRESIÓN» si ya estaba impresa; no se anula la contraseña ni se
  quita un documento con pagos.
- **CP4-f. Anular un pago ya conciliado.** **Respondida:** se rechaza **y** se puede reaplicar (§5.11); si el proveedor
  devolvió el dinero, reintegro.
- **CP4-g. Beneficiario.** **Respondida:** siempre el proveedor (nombre del NIT, nunca el comercial), sin editarlo;
  cesionarios para después.
- **CP4-h. Reintegro ligando una nota de crédito ya registrada en Bancos.** **Respondida:** no en CP4.
- **CP4-i. Bancos con Cuentas por pagar inactivo.** **Respondida:** sí, Bancos rechaza (cambia lo que decía el plan).
- **CP4-j. Separación de funciones al pagar.** **Respondida:** solo permisos distintos y el reporte de CP5.
- **CP4-k. Pago en efectivo de facturas.** **Respondida:** con Caja chica, avisando la bancarización en efectivo. **Cambiada el
  2026-11-14:** se paga en efectivo con un retiro del banco, en CP4; ver `diseno-cp4-pagos-en-efectivo.md`.
- **CP4-l. Comprobante de pago.** **Respondida:** en CP4, con retención, constancia y leyenda no tributaria.
- **CP4-m. Correlativos propios.** **Respondida:** sí, por empresa, con el reinicio anual; el del reintegro es el «Recibo
  de reintegro».

## 13. Lo que debía validar `contador-guatemala` (validado el 2026-11-13)

Dictamen `dictamen-cp4-2026-11-13.md`: **correcto con ajustes**, ya aplicados (los once «Cambios que el diseño debe
recibir»). Los textos marcados «confirmar» (Código de Comercio arts. 501–502, Código Penal art. 268, Decreto 20-2006
art. 20, AG 425-2006 art. 32 reformado) se cotejan con el texto oficial antes de ponerlos en la ayuda.

- **C-CP4-1.** Retención completa en el primer pago, correcto; aviso de entero por mes de retención (§5.5); posfechado
  comprometido y pagado en su fecha, aviso de fondos en Bancos (§2.4, §6.3).
- **C-CP4-2.** Umbral y suma por mes, bien; texto nuevo sin «no negociable» obligatorio; beneficiario = nombre del NIT;
  cuentan cheques, notas de débito y ligadas, no la apertura; efectivo del reintegro solo avisa (§5.7).
- **C-CP4-3.** Premisa incorrecta: forma quitada (§5.6).
- **C-CP4-4.** Inversión: desglose de la nota ligada (§5.2, §6.2).
- **C-CP4-5.** Otros ingresos, sin IVA; solo como residuo; aviso de retención mal calculada; tope propio (§5.4, §7.5).
- **C-CP4-6.** Reintegro: Bancos o Caja contra Proveedores, Operación o Inversión; recibo no tributario (§5.10).
- **C-CP4-7.** Cuenta de apertura con la fecha de inicio (carga abierta) o corrección de error (carga cerrada) (§5.3).
- **C-CP4-8.** Rechazar el cobrado y reaplicar; `pago_anulado` con `anulacionEnBancos` y fecha original (§5.9, §5.11).

## 14. Pendiente nuevo

- **P-CP4-1 (resuelto el 2026-11-14):** CP3 §3.4 y su paso CP3-1 decían migración `0005`; ya dicen `0006`, la real.
- **P-CP4-2 (para el usuario y el contador, no frena CP4):** el «reporte de constancias pendientes» del dictamen se
  cubre hoy con Libro de compras → Retenciones (por mes, filtro «sin constancia», L5-4b). Si hace falta una vista de
  **todos los meses** con las retenciones sin constancia, es un agregado de Libro de compras (Reportes), fuera de CP4.
- **P-CP4-3 (resuelto por el contador el 2026-11-14): Q1.00 por omisión** (con 0 se apaga; la empresa lo sube con su contador). Nota original: predeterminado de `cuentas-por-pagar.pagos.tope_diferencia`. Se dejó
  Q25.00 (el de las notas) para no decidir; el dictamen habla de «centavos» y quizá prefiera un tope menor (p. ej. Q1.00).
- **P-CP4-4 (interpretaciones del arquitecto, a confirmar con el usuario):** (a) la fecha de la contraseña deja de ser
  mínima del pago (se sigue de «fecha mínima = emisión del DTE»; queda como aviso); (b) el aviso de fondos de un
  posfechado también sale al emitirlo desde Bancos (el riesgo es el mismo); (c) la diferencia de un cargo también se
  puede saldar desde la ficha de un pago vigente (es el mismo residuo); (d) sin nombre del NIT (ni razón social ni DTE)
  el pago se rechaza en vez de usar el nombre comercial; (e) reaplicar lleva permiso propio `pagos.reaplicar`.
- **P-CP4-5 (para el coordinador):** el aviso `movimiento_por_cambiar` «al desmarcar en la conciliación» se entendió como
  la nota marcada que se desmarca desde la conciliación (CP4-B2b). Quitar la marca de **conciliado** a un movimiento no
  necesita aviso: Cuentas por pagar lee `conciliado` en vivo.
