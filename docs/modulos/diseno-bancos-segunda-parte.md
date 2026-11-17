# Diseño de Bancos, segunda parte — arquitecto de datos, 2026-11-16

Estado: **propuesto, para aprobar** (falta el dictamen de `contador-guatemala`, §12). Aterriza la sección «Bancos,
segunda parte» de `docs/HOJA-DE-RUTA.md` y lo pendiente de `docs/modulos/bancos.md`, con la forma de
`diseno-cp4-pagos.md` y `diseno-cp5-reportes.md`. No rediseña lo que existe: lo que se cita del código está verificado
contra `main` (`73e773c`) el 2026-11-16.

El diseño tiene cinco partes, de distinta madurez:

| Parte | Qué | Madurez |
|---|---|---|
| **A** | Saldos iniciales con partidas (cheques en circulación, depósitos y débitos en tránsito), su cuadre y la primera conciliación; la partida de apertura que se anula después (revive el pasivo) | **Listo para programar** al aprobarse (§2 a §8) |
| **B** | Cómo encaja **CP4-B3** (cliente de Bancos para los pagos) con H2 paso 5, CP4-B2b y la parte A | Listo (§9) |
| **C** | Reportes: **Saldos por cuenta** y **Estado de cuenta** por cuenta | Listo para programar (§10) |
| **D** | Aprobación de cheques, notas y transferencias; formato de impresión de cheques y voucher (y «cheque impreso»); tarjeta de crédito; alcance por cuenta; foto del comprobante; beneficiario desde Terceros; notas de ajuste de conciliación | Modelo y opciones; cada tema pide su propio diseño corto antes de programar (§11) |
| **E** | Ajuste por diferencial cambiario | Solo anotado para *Multimoneda* (§11.8) |

**Ya decidido y que no se vuelve a preguntar:**

| Tema | Decisión | Fuente |
|---|---|---|
| Fecha de inicio y carga inicial | Una sola fecha de corte por empresa; carga abierta/cerrada en `empresas.cargas_iniciales`; reabrir con permiso, motivo y auditoría | Hoja de ruta, H5a |
| Saldo inicial de Bancos | Uno por cuenta, con fecha igual o anterior a la fecha de inicio, **solo con la carga abierta**, con notas y cheques; una cuenta abierta después de la fecha de inicio **no lleva saldo inicial** | Hoja de ruta |
| Primera conciliación | La del mes de la fecha de inicio (o del mes en que se abrió la cuenta) | Hoja de ruta |
| Cheques en circulación de la apertura | **Cheques con fecha real**, no una nota global, o el reporte de cheques caducos no los ve | `plan-hallazgos-contables.md` H6 |
| Cheque entregado antes del corte | Ya pagó la factura: no va en el saldo inicial de Cuentas por pagar; es una partida en circulación de Bancos. No hay forma de pago «ligar al saldo inicial de Bancos» | C-CP4-3, `diseno-cp4-pagos.md` §5.6 |
| Cheque de apertura anulado | El pasivo con el beneficiario **revive**; este diseño decide cómo y lo valida el contador | `diseno-cp4-pagos.md` §5.6 |
| Saldo inicial de Cuentas por pagar | Es lo que se debía «al cierre del día anterior a la fecha de inicio» | `diseno-u8-…` §2 |
| Conciliación | El usuario no decide ningún saldo: marca documentos y transcribe el saldo final solo para compararlo (H2) | B5.1, H2 |
| Auditoría | Todo lo que se elimina, anula o corrige deja rastro; nunca se borra | CLAUDE.md |

## 1. Lo encontrado en el código y la base

1. **Saldo inicial hoy** (B2, B6, B7, H1b): una **sola nota** `bancos.movimientos` con `saldo_inicial = true`, de crédito
   (o de débito si es negativo), concepto de sistema `saldo_inicial`, sin número correlativo. Índice único parcial
   `movimientos_un_saldo_inicial (cuenta_bancaria_id) where saldo_inicial and anulado_en is null`.
   `ReglasDeLaCuenta.revisarSaldoInicial` exige que sea única (`SaldoInicialRepetido`) y la primera por fecha
   (`SaldoInicialNoEsElPrimero`), y que ningún movimiento quede antes (`MovimientoAntesDelSaldoInicial`).
   `Movimiento.exigirClase` separa notas y saldo inicial. Se elimina (`EliminarSaldoInicial`) solo si la cuenta no tiene
   **ninguna** conciliación; no se anula. Se corrige con auditoría `corregir`.
2. **No usa la carga inicial ni la fecha de inicio**: ningún archivo de `modulos/bancos` llama a
   `empresas.obtener_carga_inicial`, y Bancos **no escucha** `empresas.fecha_de_inicio_por_cambiar` (sí Cuentas por pagar
   y Libro de compras). El contrato del aviso ya nombra a Bancos como futuro oyente.
3. **API y cliente del saldo inicial**: `/bancos/saldos-iniciales` (GET con `bancos.cuentas-bancarias.ver`; POST, PUT,
   DELETE con `bancos.saldos-iniciales.crear|editar|eliminar`), Excel con columnas Cuenta, Tipo, Fecha, Monto, Referencia,
   Observaciones (`.importar`/`.exportar`). En el cliente vive en la ficha de la cuenta (`SeccionDeSaldoInicial.vue`,
   `VentanaDeSaldoInicial.vue`, `CamposDeSaldoInicial.vue`, `usar-saldo-inicial.ts`, `edicion-de-saldo-inicial.ts`) y el
   Excel en la lista de cuentas. **No hay pantalla propia** en Administración.
4. **Conciliación** (`infraestructura/persistencia/conciliacion-candidatos.drizzle.ts`): saldo inicial de libros = saldo
   vigente al fin del mes anterior; saldo inicial de banco = la foto de la conciliación autorizada del mes anterior, o
   **cero en la primera** (corrección de QA del 2026-09-29: el saldo inicial es «un documento más que se marca»). Los
   candidatos son los vigentes hasta fin de mes sin marcar en otra conciliación. La primera conciliación **puede ser de
   cualquier mes**. El número de cheque sale de `bancos.cheques` (`leftJoin` por `movimiento_id`).
5. **Cheques**: siempre dentro de una chequera (`cheques.chequera_id not null`); la chequera inserta **todos** sus
   números como `disponible` (`desde`–`hasta`, `RangoDeChequesTraslapado`). El reporte de cheques caducos (H6a) y la
   anulación en lote (H6b) parten de `bancos.cheques` (`estado = 'emitido'`) y su `OrigenDeCheque` es
   `'cuentas_por_pagar' | 'suelto'`. `AnularCheque` con el mes abierto anula «a la antigua» (sin inverso, fuera del
   saldo); `conInversoSiempre` fuerza el inverso (H6b). El inverso **hereda** el concepto del original (H3b).
6. **Flujo de efectivo** (H3c): el concepto `saldo_inicial` es apertura, no flujo; entra solo al control
   («saldos iniciales del rango»). Actividad `ninguna` va a «Otros movimientos sin actividad».
7. **CP4 en Bancos**: CP4-B1, CP4-B2a y CP4-EB en `main` (migraciones `0032`, `0033`; contratos en
   `core/contratos/bancos.contratos.ts`; `RevisorDeCambios`, notas marcadas, desglose, aviso de fondos del posfechado).
   **En programación a la vez que este diseño:** H2 paso 5 (cliente del estado de cuenta en `ConciliarCuenta.vue`) y
   CP4-B2b (servidor: aviso `movimiento_por_cambiar` al desmarcar desde la conciliación). Falta CP4-B3 (cliente).
8. **Migraciones de Bancos**: la última en `main` es `0033_cp4_efectivo_para_pagos` (`when` 1794690461288). La de este
   diseño es la **`0034_saldos_iniciales_con_partidas`** (se confirma el número al generarla: si CP4-B2b o H2 trajeran
   una, esta toma la siguiente libre y se corrige aquí). Nunca dos ramas generando migraciones de Bancos a la vez.
9. **Base de desarrollo** (solo lectura, 2026-11-16): 2 cuentas, 10 movimientos, **un** saldo inicial (2026-09-01, sin
   marcar) en una cuenta que ya tiene movimientos de septiembre; 2 conciliaciones autorizadas de agosto (previas al saldo
   transcrito de H2); una empresa con fecha de inicio 2026-10-04 y la carga abierta. Es decir: hay datos «de antes» de la
   fecha de inicio y un saldo inicial que no coincide con ella. La migración debe respetarlos (§4.4).

**Errores del modelo actual que este diseño corrige:**

- Un saldo inicial global **esconde** los cheques en circulación al corte: no salen en cheques caducos, no se pueden
  anular uno por uno y la primera conciliación muestra el saldo inicial como «crédito en tránsito» hasta que se marca
  (que no es lo que dice ningún estado de cuenta).
- La primera conciliación arranca el banco en **cero** y mete el saldo inicial como «ingreso» del banco: el cuadro
  cuadrático no se parece al estado de cuenta (cuyo «saldo anterior» es el del corte).
- Nada impide registrar un saldo inicial con la carga cerrada, ni con una fecha distinta de la de Cuentas por pagar.

## 2. Modelo: qué es el saldo inicial de una cuenta

La práctica (y el documento de conciliación de B5.1): al corte, el **saldo en libros** de la cuenta es el saldo del
estado de cuenta ajustado por lo que el banco aún no ha visto:

```
saldo en libros al corte = saldo según el estado de cuenta al corte
                         + depósitos en tránsito          (la empresa los registró; el banco aún no)
                         − cheques en circulación          (entregados; el banco aún no los paga)
                         − débitos en tránsito             (notas de débito registradas que el banco aún no carga; raras)
```

Las notas **del banco** que la empresa no había registrado (comisiones, intereses, cheques rechazados) **no son partidas
de apertura**: se registran en el sistema anterior antes del corte (el saldo de apertura ya es el ajustado). Lo valida el
contador (C-1).

En Arrancar todo saldo sale de sumar `bancos.movimientos` (saldo de la cuenta, reportes, flujo, conciliación), así que
**cada parte es un movimiento** con `saldo_inicial = true`:

| Parte (`parte_de_apertura`) | Tipo del movimiento | Fecha | Monto | Cuántas | En la conciliación |
|---|---|---|---|---|---|
| `saldo_del_banco` | crédito (o débito si el saldo del banco es negativo) | **la fecha de corte** (fija) | saldo del estado de cuenta | **una** por cuenta | **No es candidato**: es lo que el banco ya «vio»; da el saldo inicial del banco de la primera conciliación |
| `cheque_en_circulacion` | cheque (con su número, §2.3) | la real del cheque, `<=` corte | el del cheque | 0..n | Candidato: se marca cuando el banco lo paga |
| `deposito_en_transito` | crédito | la real, `<=` corte | | 0..n | Candidato |
| `debito_en_transito` | débito | la real, `<=` corte | | 0..n | Candidato |
| `saldo_global` | crédito o débito | la que tenía | | solo los **existentes** (§4.4) | Candidato, como hoy |

**Fecha de corte** = el **día anterior a la fecha de inicio** de la empresa (como Cuentas por pagar, «al cierre del día
anterior»). No se elige: sale de Empresas. Así los saldos iniciales de los módulos cuadran a la misma fecha (P-2).

Las partidas llevan el concepto de sistema `saldo_inicial` (apertura, fuera del flujo), sin número correlativo (como
hoy) y sin origen.

### 2.1 Cabecera por cuenta (`bancos.saldos_iniciales`)

Una fila por cuenta con saldo inicial: ancla las partidas (llave), guarda lo que el usuario **transcribe solo para
comparar** (el saldo de la cuenta en la contabilidad del sistema anterior al corte) y sus observaciones. El monto y la
fecha del saldo del banco **no** se repiten aquí: viven en el movimiento `saldo_del_banco` (una sola fuente).

### 2.2 Cuadre

```
saldo en libros al corte (Arrancar) = Σ efecto de las partidas de la cuenta (saldo del banco incluido)
diferencia                           = saldo en libros al corte − saldo según libros del sistema anterior (transcrito)
```

La ventana muestra el cuadre por cuenta y el total de la empresa (que es el saldo de Bancos del balance de apertura). Si
no cuadra o falta el dato transcrito, **avisa sin bloquear** (P-10). Con la carga cerrada queda de solo lectura.

### 2.3 Número del cheque en circulación: chequera de apertura

Los cheques de apertura deben vivir en `bancos.cheques` para que el reporte de caducos, la anulación en lote, la
conciliación y la lista de cheques los traten igual sin cambiar sus consultas. Como un cheque siempre pertenece a una
chequera y la chequera crea todos sus números:

- **`chequeras.de_apertura`** (nueva): una chequera por cuenta y serie, que **crea el sistema** al registrar el primer
  cheque en circulación de esa serie. Solo tiene los cheques que se cargan (no crea el rango), siempre **inactiva** (nunca
  se ofrece para emitir); `desde`/`hasta` = el menor y el mayor de sus números (los mantiene el caso de uso).
- Si el número cae en una **chequera ya registrada** de la misma cuenta y serie y ese cheque está `disponible`, se usa ese
  (queda `emitido` con el movimiento de apertura): pasa cuando el usuario registró la chequera completa que venía usando.
  Si está emitido o anulado: `ChequeDeAperturaYaUsado`.
- Crear una chequera normal cuyo rango incluya un número de una chequera de apertura de la misma cuenta y serie:
  `RangoDeChequesTraslapado` (ya existe) con el texto «… el cheque N es de la carga inicial: empiece la chequera en el
  siguiente».
- Eliminar la partida: si el cheque es de la chequera de apertura se **borra** la fila (no se reutiliza); si era de una
  chequera normal, vuelve a `disponible` (como blanquear).

Alternativas descartadas: un `numero_de_cheque` suelto en `movimientos` (obliga a unir dos fuentes en caducos, lote,
conciliación y listas) o `cheques.chequera_id` nulable con `cuenta_bancaria_id` (rompe todas las uniones por chequera).

### 2.4 Primera conciliación de una cuenta con saldo del banco

Para la **primera** conciliación de una cuenta que tiene `saldo_del_banco`:

| Dato | Hoy | Con este diseño |
|---|---|---|
| Período permitido | cualquier mes | **el mes de la fecha de inicio** (el de corte + 1 día); otro → `PrimeraConciliacionDeOtroMes` con el período esperado |
| Saldo inicial del banco | 0 | el saldo del estado de cuenta al corte (efecto del `saldo_del_banco`) |
| Saldo inicial de libros | saldo al fin del mes anterior | saldo **al corte** (todas las partidas) |
| Movimientos del lado de libros | los del mes | los del mes **posteriores al corte** |
| Candidatos | vigentes hasta fin de mes | igual, **sin** el `saldo_del_banco` (nunca es candidato, en ningún mes) |

Si el corte es fin de mes (fecha de inicio el día 1), el saldo inicial del banco es el «saldo anterior» del estado de
cuenta del primer mes: la pantalla lo dice. Si la empresa empezó a mitad de mes, el cuadro dice «Saldo del banco al
dd/mm/aaaa (carga inicial)» y los movimientos del estado de cuenta anteriores al corte no se marcan (ya están en ese
saldo); el saldo final cuadra igual. Con todo marcado se mantiene la identidad de B5.1: saldo final del banco = saldo que
debe mostrar el estado de cuenta.

Las cuentas **sin** saldo del banco (abiertas después de la fecha de inicio, o con el saldo global de antes) siguen como
hoy, pero el servidor propone el período (§6.5).

### 2.5 La partida de apertura que se anula después (revive el pasivo o el activo)

Un cheque en circulación de la apertura que caduca o no se cobra se **anula**; un depósito en tránsito que el banco
rechaza, también. Reglas en Bancos:

1. **Siempre con inverso** (`conInversoSiempre`, como H6b), aunque el mes no esté conciliado: anular «a la antigua»
   cambiaría el saldo al corte, que ya es el de la contabilidad de apertura.
2. **La fecha del inverso debe ser posterior al corte** (`InversoDentroDeLaApertura`) y no caer en un mes conciliado
   (regla de siempre).
3. **Concepto del inverso**: no hereda `saldo_inicial` (eso lo pondría como «apertura» en el control del flujo de un mes
   posterior). Concepto de sistema nuevo **`anulacion_de_apertura`** («Partidas de apertura anuladas», aplica a ambos,
   actividad `ninguna`): sale en «Otros movimientos sin actividad» del flujo, porque no movió efectivo (lo valida el
   contador, C-3).
4. **Evento** `bancos.partida_de_apertura_anulada` al confirmar (bus de eventos, informativo): `movimientoId`,
   `inversoId`, `parte`, `fecha` del inverso, `monto`, `beneficiario`, `numeroDeCheque`. Para Contabilidad (partida) y
   para avisar.
5. El `saldo_del_banco` **no** se anula (`NoSeAnulaElSaldoDelBanco`): se corrige o se elimina con la carga abierta.

**Qué pasa con el pasivo** (P-7; lo decide el usuario con el dictamen):

| Opción | Cómo | A favor | En contra |
|---|---|---|---|
| A. Solo Bancos | Inverso con `anulacion_de_apertura` y un reporte de partidas de apertura anuladas para el contador | Nada fuera de Bancos | El pasivo no aparece en Cuentas por pagar: el saldo por proveedor (R1 de CP5) no cuadra con la contabilidad |
| B. Aviso que crea la deuda | En la transacción, Cuentas por pagar crea un cargo por el monto | Automático | El cheque de apertura no tiene proveedor (beneficiario es texto); no siempre se debe (prescrito, pagado de otra forma) |
| **C. Bandeja en Cuentas por pagar (recomendada)** | Bancos hace 1–4. Cuentas por pagar (que ya lee `bancos.*` por su `dependeDe`) lista los cheques de apertura anulados **sin decisión**; el usuario **reconoce la deuda** (elige el proveedor, prellenado por el nombre del NIT, y nace un cargo con origen nuevo `cheque_de_apertura_anulado`, fechado el día del inverso, sin Libro de compras, que se paga con el flujo normal) o la **descarta** con motivo (p. ej. prescrita: otros ingresos; ya pagada por otro medio). Sin Cuentas por pagar activo, queda la opción A | El usuario decide con el dato que tiene; funciona aunque Cuentas por pagar se active después | Es una adenda de Cuentas por pagar (origen nuevo en `documentos`, tabla de decisiones, bandeja): diseño corto propio, **CP-AP**, después de CP4-12 |

El depósito en tránsito rechazado revive una **cuenta por cobrar**: hasta que exista Cuentas por cobrar queda como la
opción A (concepto y reporte). Lo dicta el contador (C-4).

## 3. Datos (esquema `bancos`, migración `0034_saldos_iniciales_con_partidas`)

### 3.1 Tabla nueva `bancos.saldos_iniciales`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK (`idPrimario`) |
| `empresa_id` | uuid | no | FK `core.empresas` on delete cascade |
| `cuenta_bancaria_id` | uuid | no | FK `saldos_iniciales_cuenta_fk → bancos.cuentas_bancarias (id)`, no action; **único** `saldos_iniciales_cuenta_unico` (sirve de índice) |
| `saldo_segun_libros_anteriores` | numeric(14,2) | sí | Transcrito del sistema anterior, **solo para comparar** (puede ser negativo); nulo = sin dato |
| `observaciones` | text | sí | check `saldos_iniciales_observaciones_validas`: nulo o 1–500 y sin espacios a los lados |
| `...marcasDeTiempo`, `...autoria` | | | |

`politicaPorEmpresa()`. Sin alcance por registro (no lo hay en Bancos, §11.4). La evidencia (archivo del último estado
de cuenta o de la última conciliación del sistema anterior) queda para un paso opcional que reutiliza H2b (P-15): sería
`evidencia_archivo_id uuid null` → `core.archivos`, única.

### 3.2 Cambios en `bancos.movimientos`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `parte_de_apertura` | text | sí | check `movimientos_parte_de_apertura_valida`: nulo o `in ('saldo_del_banco', 'cheque_en_circulacion', 'deposito_en_transito', 'debito_en_transito', 'saldo_global')` |
| `saldo_inicial_id` | uuid | sí | FK `movimientos_saldo_inicial_fk → bancos.saldos_iniciales (id)`, no action; índice `movimientos_saldo_inicial_idx` |

Checks nuevos:

- `movimientos_apertura_completa`: `saldo_inicial = (parte_de_apertura is not null) and saldo_inicial = (saldo_inicial_id is not null)`
  (va después del relleno de §4.4).
- `movimientos_tipo_de_la_parte`: `parte_de_apertura is null or (parte_de_apertura in ('saldo_del_banco','saldo_global') and tipo in ('credito','debito')) or (parte_de_apertura = 'cheque_en_circulacion' and tipo = 'cheque') or (parte_de_apertura = 'deposito_en_transito' and tipo = 'credito') or (parte_de_apertura = 'debito_en_transito' and tipo = 'debito')`.

Índices:

- **Se reemplaza** `movimientos_un_saldo_inicial` por `movimientos_un_saldo_del_banco` único `(cuenta_bancaria_id)` where
  `parte_de_apertura in ('saldo_del_banco', 'saldo_global') and anulado_en is null` (sigue habiendo un solo saldo
  principal por cuenta; las partidas pueden ser muchas).
- `movimientos_apertura_idx (cuenta_bancaria_id, fecha) where saldo_inicial` (cuadre, primera conciliación y la regla de
  movimientos anteriores al corte; son pocas filas).

`saldo_inicial` (booleano) **se queda**: lo usan muchas consultas y `exigirClase`; el check lo ata a la parte.

### 3.3 Cambios en `bancos.chequeras`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `de_apertura` | boolean | no | `default false`. Check `chequeras_apertura_inactiva`: `not de_apertura or not activa`. Único parcial `chequeras_de_apertura_unica (cuenta_bancaria_id, coalesce(serie, '')) where de_apertura` |

### 3.4 Concepto de sistema nuevo

`anulacion_de_apertura` («Partidas de apertura anuladas», `aplica_a = 'ambos'`, `actividad_de_flujo = 'ninguna'`, grupo
nulo) en `CONCEPTOS_DE_SISTEMA` y, en las empresas que ya tienen catálogo, `insert` a mano como la `0022`/`0032` (sin
tocar uno con ese nombre; si existe uno sin clave con el mismo nombre, se le pone la clave). Repetible.

### 3.5 RLS, llaves y convivencia

Todas por empresa. Sin llaves hacia otros módulos (Bancos `dependeDe: []`). Cuentas por pagar ya puede leer
`bancos.movimientos` y `bancos.cheques` desde su `infraestructura` (lo necesitará la bandeja de CP-AP). Borrar la
empresa: cascadas por `empresa_id`; las `no action` se revisan al final del comando (como hoy).

## 4. Migración `0034` y datos existentes

### 4.1 Orden dentro de la migración

1. `saldos_iniciales` con su RLS y `grant` (lo da el migrador por esquema).
2. Columnas nuevas de `movimientos` y `chequeras` (nulables y `default false`).
3. Relleno (§4.4).
4. Checks `movimientos_apertura_completa` y `movimientos_tipo_de_la_parte`; reemplazo del índice único; índice parcial.
5. Concepto `anulacion_de_apertura` (§3.4).
6. Permisos (§7.1): `insert … select … on conflict do nothing` en `core.rol_permisos` **y** `core.usuario_permisos`.

Se genera con `npm run bd:generar -w servidor -- bancos saldos_iniciales_con_partidas` y se completa a mano (relleno,
concepto y permisos), con `when` mayor que el de la `0033`.

### 4.2 Lo que no cambia

Montos, fechas y conceptos de los movimientos existentes; las conciliaciones autorizadas (su documento y su foto no
cambian, porque el saldo global sigue siendo candidato); los correlativos.

### 4.3 Repetible

Todo con `if not exists`/`on conflict`; la prueba de migración la corre dos veces sobre datos sembrados.

### 4.4 Relleno de los saldos iniciales existentes

Por cada movimiento con `saldo_inicial = true` (vigente o anulado a la antigua):

- se crea su `saldos_iniciales` (una por cuenta; si una cuenta tuviera más de uno —solo posible con anulados antes de
  B7—, todos cuelgan de la misma cabecera) con `saldo_segun_libros_anteriores` nulo;
- `parte_de_apertura = 'saldo_global'` y `saldo_inicial_id` = esa cabecera.

Así **ninguna conciliación ni saldo cambia**. Un saldo global se puede **convertir** al modelo con partidas desde la
ventana nueva mientras la carga esté abierta, la cuenta no tenga conciliaciones y no haya movimientos normales con fecha
`<=` corte (§5.2): al escribir el saldo del estado de cuenta, el movimiento pasa a `saldo_del_banco` con la fecha de
corte (auditoría `corregir`). En la base de desarrollo, la cuenta con saldo del 2026-09-01 tiene movimientos de
septiembre anteriores a la fecha de inicio (2026-10-04): **no** se podrá convertir sin antes resolver esos movimientos;
la ventana lo explica.

## 5. Reglas

### 5.1 Registrar, corregir y eliminar la apertura

| Regla | Error |
|---|---|
| La empresa tiene fecha de inicio | `SinFechaDeInicio` (422): «Defina la fecha de inicio en Empresas antes de cargar los saldos iniciales.» |
| La carga inicial está **abierta** (crear, corregir, eliminar la cabecera o cualquier partida, convertir) | `CargaInicialCerrada` (422): «La carga inicial está cerrada: pida que la reabran en Empresas.» |
| Un saldo inicial por cuenta | `SaldoInicialRepetido` (ya existe) |
| Partida con fecha `<=` corte | `PartidaDespuesDelCorte` (400, campo `fecha`): «La partida debe ser del dd/mm/aaaa o antes (día anterior a la fecha de inicio).» |
| La cuenta no tiene movimientos normales con fecha `<=` corte | `CuentaConMovimientosAnteriores` (422): «La cuenta tiene N movimientos anteriores a la fecha de inicio: elimínelos o anúlelos antes de cargar el saldo inicial.» |
| Partida sin cabecera | `SinSaldoInicial` (422): «Registre primero el saldo según el estado de cuenta de la cuenta.» |
| Cambiar el saldo del banco o eliminar la cabecera con alguna conciliación de la cuenta (de cualquier estado) | `AperturaConConciliacion` (422): «Elimine la conciliación de mm/aaaa para corregir el saldo inicial.» |
| Corregir o eliminar una partida marcada en una conciliación | `exigirNoMarcadoEnConciliacion` (ya existe) y `MesConciliado` |
| Eliminar la cabecera | Borra **todas** sus partidas (con sus cheques de la chequera de apertura) en la misma transacción; motivo 1–500 |
| Cheque en circulación: beneficiario obligatorio, número `> 0`, serie opcional | `BeneficiarioObligatorio` (ya existe) |
| Número usado | `ChequeDeAperturaYaUsado` (422): «El cheque N de la serie S ya está emitido o anulado en la chequera X.» |
| Sobregiro | **Exenta** la apertura (es un hecho, no una decisión; P-9). Aviso si el saldo al corte es negativo y la empresa no permite sobregiro |
| Aviso, sin bloquear | Partida con más meses que `bancos.cheques.meses_de_vencimiento`: «El cheque N tiene más de 7 meses: el banco ya no está obligado a pagarlo; revise si sigue en circulación.» |

Bloqueos (orden de §10 de CP4): primero la carga inicial (`empresas.obtener_carga_inicial`, que ya toma el bloqueo
compartido), luego la cuenta bancaria (`for update`, para que dos cargas de la misma cuenta no se crucen), luego la
cabecera y la chequera de apertura.

### 5.2 Movimientos normales y la apertura

- Con `saldo_del_banco`: un movimiento normal (nota, cheque, transferencia, orden de otro módulo) con fecha `<=` corte →
  `MovimientoAntesDeLaApertura` (reemplaza a `MovimientoAntesDelSaldoInicial` para esa forma).
- Con `saldo_global`: la regla de hoy (`fecha < fecha del saldo`).
- **Sin saldo inicial** pero con fecha de inicio en la empresa: ¿se rechaza un movimiento **nuevo** anterior a la fecha de
  inicio? Recomendado **sí** (P-6): `MovimientoAntesDeLaFechaDeInicio`. Los existentes no se tocan; corregir uno ya
  anterior sigue igual.
- `ReglasDeLaCuenta.revisarSaldoInicial` se reescribe con estas tres ramas; `fechaDelSaldoInicial` pasa a devolver
  `{ parte, fecha }` del saldo principal.

### 5.3 Anular una partida (§2.5)

- Cheque en circulación: `AnularCheque` (pantalla de Cheques con `bancos.cheques.anular`, caducos en lote con
  `bancos.cheques-caducos.anular`, y la ventana de saldos iniciales con `bancos.saldos-iniciales.anular`) con
  `conInversoSiempre`; el inverso con `anulacion_de_apertura`.
- Depósito o débito en tránsito: `AnularMovimiento` gana el modo «partida de apertura» (hoy `exigirClase` lo impide para
  saldo inicial): inverso siempre, concepto `anulacion_de_apertura`.
- Fecha del inverso `>` corte (`InversoDentroDeLaApertura`); con la carga abierta o cerrada (es un hecho del período).
- Auditoría `anular` como hoy; evento `bancos.partida_de_apertura_anulada`.
- **No se blanquea** un cheque de apertura (`NoSeBlanqueaUnChequeDeApertura`; `puedeBlanquear` falso): no se emitió en
  Arrancar.

### 5.4 Cambio de la fecha de inicio

Bancos escucha `empresas.fecha_de_inicio_por_cambiar` (en la transacción de Empresas):

- Si alguna cuenta tiene `saldo_del_banco` → `FechaDeInicioConSaldosDeBancos` (422): «N cuentas bancarias tienen saldo
  inicial al dd/mm/aaaa: el saldo del estado de cuenta es de esa fecha. Elimínelos en Bancos → Saldos iniciales antes de
  cambiar la fecha de inicio.» (P-4: mover la fecha cambiaría el significado del saldo del banco).
- Con `saldo_global`: rechaza si alguno quedaría con fecha `>=` la nueva fecha de inicio (como Cuentas por pagar).

### 5.5 Lo que se mantiene

Un saldo inicial no se reclasifica (`NoSeReclasificaElSaldoInicial`); no lleva número; no tiene origen; Cuentas por
pagar no lo liga a nada (C-CP4-3). La primera conciliación autorizada bloquea todo lo `<=` su fin de mes (`MesConciliado`),
incluida la apertura.

## 6. Casos de uso, puertos y conciliación

### 6.1 Puertos nuevos

- `CargaInicial` (`obtener(operador) → { fechaDeInicio, cerrada }`) con `CargaInicialEnMediador`, copia del de Cuentas
  por pagar (los módulos no se importan).
- `ConsultasDeSaldosIniciales` (resumen por cuenta, ficha, cuadre) y `RepositorioDeSaldosIniciales` (cabecera).
- `ChequerasDeApertura` (buscar o crear la de la serie, mantener `desde`/`hasta`, ubicar un número en una chequera
  normal).

### 6.2 Casos de uso (`aplicacion/casos-uso/saldos-iniciales/`)

`ListarSaldosIniciales` (resumen y cuadre de la empresa), `ObtenerSaldoInicial` (ficha de una cuenta),
`GuardarSaldoInicial` (crea o corrige la cabecera y el `saldo_del_banco`; convierte un global), `EliminarSaldoInicial`
(se reescribe: cabecera y partidas), `AgregarPartidaDeApertura`, `CorregirPartidaDeApertura`,
`EliminarPartidaDeApertura`, `AnularPartidaDeApertura` (delegan en `AnularCheque`/`AnularMovimiento` con el modo nuevo),
`ValidarFechaDeInicioEnBancos` (oyente de §5.4). Todos en una unidad de trabajo. Los que crean movimientos usan
`Movimiento.crear` con `saldoInicial: true` y la parte; el cheque se crea en la chequera de apertura con el mismo dominio
`Cheque` (estado `emitido` sin pasar por `EmitirCheque`, que exige chequera activa).

Se retiran `CrearMovimiento`/`ActualizarMovimiento` con `saldoInicial: true` de la composición de saldos iniciales
(siguen sirviendo a las notas).

### 6.3 DTO

- `SaldoInicialResumenDto` (uno por cuenta de la empresa, también las que no tienen): `cuentaBancariaId`, `cuentaNombre`,
  `bancoNombre`, `forma` (`sin_saldo` | `con_partidas` | `global`), `fechaDeCorte`, `saldoSegunEstadoDeCuenta`,
  `totalDepositosEnTransito`, `totalChequesEnCirculacion`, `totalDebitosEnTransito`, `saldoEnLibrosAlCorte`,
  `saldoSegunLibrosAnteriores`, `diferencia`, `cuadra`, `tieneConciliaciones`, `puedeEditar`, `puedeEliminar`.
- `SaldosInicialesDto`: `{ fechaDeInicio, fechaDeCorte, cargaCerrada, cuentas: SaldoInicialResumenDto[], total }`.
- `SaldoInicialDto` (ficha): el resumen, `observaciones` y `partidas: PartidaDeAperturaDto[]` (`movimientoId`, `parte`,
  `fecha`, `monto`, `serie`, `numeroDeCheque`, `beneficiario`, `referencia`, `observaciones`, `conciliadaEn`
  (`{anio, mes}` o nulo), `revertida`, `puedeCorregir`, `puedeEliminar`, `puedeAnular`). Lo calcula el servidor
  (`acciones-posibles.ts`).
- `MovimientoDto`, `ChequeDto`, `ChequeListadoDto` y `ChequeEnCirculacionDto` ganan `parteDeApertura` (nulo si no es);
  `OrigenDeCheque` suma `'apertura'`.
- `Partida` de la conciliación gana `deApertura: boolean`; `ConciliacionDto` gana `saldoInicialDelBancoDeLaApertura`
  (`{ fecha, monto }` o nulo) para que la pantalla lo rotule.

### 6.4 Conciliación (servidor)

- `saldosInicialesDe` y `movimientosDelMesDe` reciben el «inicio efectivo» (corte + 1 en la primera de una cuenta con
  `saldo_del_banco`) y devuelven los saldos de §2.4.
- `candidatosDe` excluye `parte_de_apertura = 'saldo_del_banco'` siempre (también `idsDeCandidatosDe` y los pares
  compensados).
- `IniciarConciliacion` exige el período de §2.4 en la primera (`PrimeraConciliacionDeOtroMes`).

### 6.5 Período propuesto (servidor)

`GET /bancos/cuentas-bancarias/:id/conciliaciones` gana `periodoSiguiente`: el mes siguiente a la última; si no hay
ninguna, el de la fecha de inicio (con `saldo_del_banco`) o el del primer movimiento vigente; nulo si no hay nada que
conciliar. El cliente deja de calcularlo (`periodoPropuesto`), solo en `ListaDeConciliaciones` (no toca `ConciliarCuenta.vue`).

## 7. Permisos, auditoría, errores, eventos y configuración

### 7.1 Permisos (`modulo.ts`, PLAN §3.5)

| Permiso | Para | Nuevo |
|---|---|---|
| `bancos.saldos-iniciales.ver` | Pantalla «Saldos iniciales» (lista, ficha, cuadre) | **Sí**: la `0034` lo da a quien tiene `bancos.cuentas-bancarias.ver` (hoy ve el saldo inicial con ese permiso) |
| `bancos.saldos-iniciales.crear` | Registrar la cabecera y agregar partidas | Ya existe |
| `bancos.saldos-iniciales.editar` | Corregir la cabecera y las partidas, convertir un global | Ya existe |
| `bancos.saldos-iniciales.eliminar` | Eliminar la cabecera (con sus partidas) o una partida | Ya existe |
| `bancos.saldos-iniciales.anular` | Anular una partida desde la ventana | **Sí**: la `0034` lo da a quien tiene `bancos.cheques.anular` |
| `bancos.saldos-iniciales.importar` / `.exportar` | Los dos Excel (§8.2) y la plantilla | Ya existen |

Ninguno es `soloSuperacceso`. Las migraciones de permisos cubren `core.rol_permisos` y `core.usuario_permisos`.

### 7.2 Auditoría

| Hecho | Acción | Recurso | `anterior` |
|---|---|---|---|
| Registrar cabecera o partida | ninguna (alta; `creado_por`) | — | — |
| Corregir la cabecera (saldo del banco, saldo anterior, observaciones) o convertir un global | `corregir` | `bancos.saldos-iniciales` | `SaldoInicialDto` sin partidas |
| Corregir una partida | `corregir` | `bancos.movimientos` (como hoy el saldo inicial) | `PartidaDeAperturaDto` |
| Eliminar la cabecera | `eliminar`, con motivo | `bancos.saldos-iniciales` | `SaldoInicialDto` **con** sus partidas |
| Eliminar una partida | `eliminar`, con motivo | `bancos.movimientos` | `PartidaDeAperturaDto` |
| Anular una partida | `anular`, con motivo | `bancos.cheques` (cheque) o `bancos.movimientos` (nota), como hoy | Como hoy |

### 7.3 Errores nuevos (`dominio/errores-de-apertura.ts`; familia y código propio)

| Clase | Familia | Código |
|---|---|---|
| `SinFechaDeInicio` | `ReglaDeNegocioInfringida` | `sin_fecha_de_inicio` |
| `CargaInicialCerrada` | `ReglaDeNegocioInfringida` | `carga_inicial_cerrada` |
| `PartidaDespuesDelCorte` | `DatoInvalido` (`fecha`) | `partida_despues_del_corte` |
| `CuentaConMovimientosAnteriores` | `ReglaDeNegocioInfringida` | `cuenta_con_movimientos_anteriores` |
| `SinSaldoInicial` | `ReglaDeNegocioInfringida` | `sin_saldo_inicial` |
| `AperturaConConciliacion` | `ReglaDeNegocioInfringida` | `apertura_con_conciliacion` |
| `ChequeDeAperturaYaUsado` | `DatoInvalido` (`numeroDeCheque`) | `cheque_de_apertura_ya_usado` |
| `MovimientoAntesDeLaApertura` | `ReglaDeNegocioInfringida` | `movimiento_antes_de_la_apertura` |
| `MovimientoAntesDeLaFechaDeInicio` (si P-6) | `ReglaDeNegocioInfringida` | `movimiento_antes_de_la_fecha_de_inicio` |
| `InversoDentroDeLaApertura` | `DatoInvalido` (`fecha`) | `inverso_dentro_de_la_apertura` |
| `NoSeAnulaElSaldoDelBanco` | `ReglaDeNegocioInfringida` | `no_se_anula_el_saldo_del_banco` |
| `NoSeBlanqueaUnChequeDeApertura` | `ReglaDeNegocioInfringida` | `no_se_blanquea_un_cheque_de_apertura` |
| `PrimeraConciliacionDeOtroMes` | `ReglaDeNegocioInfringida` | `primera_conciliacion_de_otro_mes` |
| `FechaDeInicioConSaldosDeBancos` | `ReglaDeNegocioInfringida` | `fecha_de_inicio_con_saldos_de_bancos` |

Los `check` nuevos se nombran para que `traducirErrorDeBase` dé un mensaje claro si alguno salta (no deberían: los
revisa el dominio antes).

### 7.4 Eventos

`bancos.partida_de_apertura_anulada` (§2.5). Sin órdenes nuevas del mediador. Oyente nuevo:
`empresas.fecha_de_inicio_por_cambiar`.

### 7.5 Configuración

Ninguna variable nueva en la parte A. Usa `bancos.cheques.meses_de_vencimiento` (aviso) y `bancos.cuentas.permitir_sobregiro` (aviso).

## 8. API y Excel

### 8.1 Rutas (reemplazan las de `/bancos/saldos-iniciales`)

| Método y ruta | Permiso | Respuesta |
|---|---|---|
| `GET /bancos/saldos-iniciales` | `.ver` | `SaldosInicialesDto` |
| `GET /bancos/saldos-iniciales/:cuentaBancariaId` | `.ver` | `SaldoInicialDto` (404 si la cuenta no es de la empresa) |
| `PUT /bancos/saldos-iniciales/:cuentaBancariaId` | `.crear` si no existe, `.editar` si existe (la ruta exige uno de los dos y el caso de uso el que corresponde) | Cuerpo `{ saldoSegunEstadoDeCuenta, saldoSegunLibrosAnteriores?, observaciones? }`; devuelve `SaldoInicialDto` y `avisos` |
| `DELETE /bancos/saldos-iniciales/:cuentaBancariaId` | `.eliminar` | Cuerpo `{ motivo }`; 204 |
| `POST /bancos/saldos-iniciales/:cuentaBancariaId/partidas` | `.crear` | Cuerpo `{ parte, fecha, monto, serie?, numeroDeCheque?, beneficiario?, referencia?, observaciones? }` |
| `PUT /bancos/saldos-iniciales/:cuentaBancariaId/partidas/:movimientoId` | `.editar` | Igual |
| `DELETE /bancos/saldos-iniciales/:cuentaBancariaId/partidas/:movimientoId` | `.eliminar` | `{ motivo }`; 204 |
| `POST /bancos/saldos-iniciales/:cuentaBancariaId/partidas/:movimientoId/anular` | `.anular` | `{ motivo, fecha }` |

`saldoSegunEstadoDeCuenta` puede ser negativo (texto con dos decimales; el signo decide crédito o débito y el monto se
guarda positivo). Montos con `decimalObligatorio` (400 si no caben en `numeric(14,2)`).

### 8.2 Excel (Administración: importa y exporta)

| Recurso | Columnas | Notas |
|---|---|---|
| **Saldos iniciales** (`/bancos/saldos-iniciales/exportar`, `plantilla`, `importar`) | Cuenta (por nombre), Saldo según estado de cuenta, Saldo según libros anteriores, Observaciones | Exportar trae también fecha de corte, totales, saldo en libros y diferencia (el cuadre). Importar solo crea (cuentas sin saldo inicial) |
| **Partidas de apertura** (`/bancos/saldos-iniciales/partidas/exportar`, `plantilla`, `importar`) | Cuenta, Clase (Cheque en circulación, Depósito en tránsito, Débito en tránsito), Fecha, Serie, Número de cheque, Beneficiario u origen, Referencia, Monto, Observaciones | Exige la cabecera de la cuenta (la hoja de instrucciones dice el orden). Todo o nada, ensayo, 5,000 filas, como siempre |

El Excel viejo (Tipo, Fecha, Monto…) desaparece: la plantilla nueva lo reemplaza.

## 9. Cliente

### 9.1 Pantalla «Saldos iniciales» (Administración de Bancos)

- Ruta `/bancos/saldos-iniciales` (menú Administración, ícono `Landmark` o el que use el generador; permiso `.ver`).
- Encabezado con la fecha de inicio, la fecha de corte y el estado de la carga («Abierta» o «Cerrada: solo lectura»).
- Lista de **todas** las cuentas (`TarjetaDeRegistro`) con su cuadre: saldo del estado de cuenta, + depósitos, −
  cheques, − débitos, = saldo en libros, saldo anterior transcrito, diferencia (verde o rojo) o «Sin saldo inicial» (con
  el texto «Si la cuenta se abrió después de la fecha de inicio, no lleva saldo inicial»). Total de la empresa.
- Dos `AccionesDeIntercambio` con `nombre` («saldos iniciales» y «partidas de apertura»).
- **Ficha por cuenta** (`/bancos/saldos-iniciales/:cuentaBancariaId`): la fórmula del cuadre en grande, la ventana del
  saldo del banco (`CamposDeSaldoInicial` rehecho), y tres grupos de partidas (cheques, depósitos, débitos) con
  «Agregar», «Corregir», «Eliminar» y «Anular» según el servidor; insignia «Conciliado mm/aaaa» o «Anulado».
- Avisos del servidor (cheque viejo, saldo negativo sin sobregiro, no cuadra) con `usarAvisos`.
- Un saldo **global** muestra «Saldo inicial sin partidas (de antes)» y el botón «Separar en partidas» (convertir) si el
  servidor lo permite; si no, el motivo.
- La ficha de la cuenta bancaria **deja** `SeccionDeSaldoInicial` editable y muestra un resumen de solo lectura con
  enlace a esta pantalla. Se borran `VentanaDeSaldoInicial`, `usar-formulario-de-saldo-inicial`,
  `usar-eliminacion-de-saldo-inicial` y el segundo `AccionesDeIntercambio` de la lista de cuentas (verificar con `grep`).

### 9.2 En otras pantallas

- Cheques, ficha de chequera, cheques caducos y reporte de movimientos: insignia «Carga inicial» (`parteDeApertura`);
  sin «Blanquear»; la chequera de apertura se lista aparte («De la carga inicial», sin emitir).
- Anular un cheque de apertura: la `VentanaDeMotivo` explica «Se registrará una nota de crédito en la fecha que elija
  (después del dd/mm/aaaa). Si todavía se le debe al beneficiario, regístrelo en Cuentas por pagar.»
- Conciliación (después del paso 5 de H2, §9.4): «De la carga inicial» en las partidas y el rótulo del saldo inicial del
  banco.

### 9.3 Lógica pura con pruebas

`cuadre-de-saldo-inicial.ts` (fórmula en centavos, solo para mostrar: el servidor manda los totales),
`edicion-de-partida.ts` (formulario ↔ API; la serie y el número solo en cheques), `textos-de-apertura.ts`.

### 9.4 Encaje de CP4-B3 (cliente de Bancos para los pagos) y del trabajo en curso

CP4-B3 (`diseno-cp4-pagos.md` §11, paso 4) se parte en dos para no esperar a la conciliación:

| Paso | Contenido | Va después de |
|---|---|---|
| **CP4-B3a** (cliente, fuera de la conciliación) | Casilla «Para Cuentas por pagar» al registrar una nota de débito (con el módulo activo), «Marcar» y «Desmarcar» (con `VentanaDeMotivo`) según `puedeMarcar`/`puedeDesmarcar`, etiqueta de nota marcada, **desglose** en la tarjeta y en el reporte, «Origen: Cuentas por pagar, pago N» (enlace a `/cuentas-por-pagar/pagos/:id` cuando exista esa ruta, CP4-10; antes, texto), acciones ocultas según `puedeCorregir`/`puedeEliminar`/`puedeBlanquear`, avisos de la respuesta de emitir cheque (fondos del posfechado), mensajes de `ModuloDeOrigenInactivo` y `MovimientoDeOtroModulo` | Ya se puede (CP4-B2a en `main`); **no toca** `ConciliarCuenta.vue` ni `AccionesDeConciliacion.vue`. Antes de BS-6 (comparten tarjetas de cheques y notas) |
| **CP4-B3b** (cliente, en la conciliación) | Lista de notas marcadas sin aplicar del mes en la conciliación, con «Desmarcar» y el rechazo si están ligadas | H2 paso 5 y CP4-B2b en `main` |

## 10. Reportes (parte C)

| Reporte | Contenido | Ruta y permisos | Excel e impresión |
|---|---|---|---|
| **Saldos por cuenta** (a una fecha de corte) | Por cuenta: saldo en libros a la fecha; cheques posfechados emitidos con fecha posterior (comprometido); **disponible** = libros − posfechados; cheques en circulación, depósitos y débitos en tránsito a la fecha (incluye la apertura); saldo que debería mostrar el banco; última conciliación autorizada (mes) y si la cuenta está atrasada. Totales de la empresa. Detalle desplegable de las partidas en tránsito | `GET /api/bancos/saldos-por-cuenta?fecha=&cuentaBancariaId=`; permisos **nuevos** `bancos.saldos-por-cuenta.ver` y `.exportar` (la migración de su paso los da a quien tiene `bancos.movimientos.ver`/`.exportar`) | Imprimir y exportar |
| **Estado de cuenta** por cuenta | El reporte de Movimientos con la cuenta **obligatoria**, en formato de documento: encabezado (empresa, banco, cuenta, rango), saldo anterior, movimientos con número, concepto, débito, crédito, saldo y **«Conciliado en mm/aaaa»**, totales por tipo y saldo final | Reutiliza `GET /bancos/movimientos/reporte` (gana `conciliadoEn` por fila) y `bancos.movimientos.ver`/`.exportar`; página nueva `/bancos/estado-de-cuenta` | Imprimir y exportar |
| Flujo de efectivo y Movimientos | Ya existen (H3c, B6) | — | — |

Consultas: «a una fecha» = movimientos vigentes con `fecha <= corte` (los anulados a la antigua fuera, los inversos con su
fecha) y «en tránsito a la fecha» = candidatos a esa fecha que no estaban marcados en una conciliación de un mes `<=` la
fecha (la misma condición `marcadoDespuesDe` de la conciliación). Índices existentes (`movimientos_cuenta_fecha_idx`,
`movimientos_conciliacion_idx`) bastan; se prueba con `explain analyze` y 100,000 movimientos.

## 11. Parte D y E: temas que piden su propio diseño corto

Cada uno se planifica con el usuario antes de programar; aquí van el modelo propuesto y lo que hay que decidir.

### 11.1 Aprobación de cheques, notas de débito y transferencias (solicitar → aprobar)

- **Configuración** (empresa e instalación, públicas): `bancos.aprobaciones.cheques`, `bancos.aprobaciones.notas_de_debito`,
  `bancos.aprobaciones.transferencias` (booleanas, `false`) y `bancos.aprobaciones.monto_minimo` (texto con dos
  decimales, `'0.00'` = todo pasa por aprobación). Apagadas, todo se aprueba solo (como hoy).
- **Modelo recomendado: tabla aparte `bancos.solicitudes`** (tipo, estado `solicitada|aprobada|rechazada|cancelada`,
  número correlativo `bancos.solicitudes`, cuenta, cuenta destino, chequera, fecha, monto, beneficiario, concepto con
  llave compuesta, referencia, observaciones, no negociable, `resuelta_por/en`, `motivo_de_rechazo`, y al aprobar
  `movimiento_id`/`transferencia_id`; checks por tipo y estado; RLS por empresa). Aprobar corre el **mismo caso de uso**
  de hoy (`EmitirCheque`, `CrearMovimiento`, `RegistrarTransferencia`): el número de cheque y el correlativo se consumen
  al aprobar (sin huecos) y el sobregiro se revisa entonces. Descartado: un estado «por aprobar» en `movimientos`
  (ensuciaría saldo, conciliación, correlativos y reportes).
- Quien aprueba no puede ser quien solicitó; permisos `bancos.solicitudes.ver` y `.aprobar`; solicitar usa el permiso
  de la acción (`cheques.emitir`, `notas.crear`, `transferencias.crear`). Rechazar y cancelar con motivo (auditoría
  `anular`).
- **Cuentas por pagar**: recomendado que sus órdenes **no** pasen por esta aprobación (ya separa registrar, autorizar y
  pagar, CP4-j); si el usuario lo quiere, el pago quedaría «pendiente de aprobación» en Cuentas por pagar (cambia CP4). P-13.

### 11.2 Formato de impresión de cheques y voucher (y «cheque impreso»)

- **Capas**: formatos **de fábrica** en código (`dominio/formatos-de-cheque/`, uno por banco y modelo, medidos sobre
  cheques reales) → **formato de la cuenta suscriptora** (`bancos.formatos_de_cheque`, `cuenta_id` con
  `politicaPorCuenta()`, `base` = clave de fábrica y solo los campos que movió, en `jsonb` validado con Zod: posición
  `x_mm`, `y_mm`, ancho, tamaño de letra, alineación, más un desplazamiento general para calibrar la impresora) →
  **chequera** (`chequeras.formato_id` o la clave de fábrica). Gana la más específica.
- Campos: fecha (lugar y fecha), beneficiario, monto en números, **monto en letras** (función pura en el core, formato
  por validar, C-11), «No negociable», y el **voucher** (comprobante de egreso): cuenta, cheque, beneficiario, monto,
  concepto, observaciones, documentos que paga (Cuentas por pagar lo aporta por una orden suya, opcional si el módulo no
  está activo) y firmas (elaboró, revisó, autorizó, recibió).
- Impresión en el **navegador** con CSS en milímetros (`@page`), como los demás documentos; sin dependencia nueva.
- **Cheque impreso**: `cheques.impreso_en` y `impresiones`; reimprimir con permiso `bancos.cheques.reimprimir` y
  auditoría; **no se blanquea un cheque impreso** (cierra el `TODO` de `Cheque.blanquear`). «Entregado» queda fuera
  (P-14).
- Por investigar: medidas de los cheques de cada banco de Guatemala; si la pantalla de formatos lleva Excel (la regla de
  Administración dice que sí; se recomienda la excepción porque las posiciones no se capturan en una hoja, P-14).

### 11.3 Tarjeta de crédito

Tipo de cuenta `tarjeta_de_credito`: es un **pasivo** (saldo deudor), con fecha de corte y de pago, límite de crédito en
vez de sobregiro, consumos que pueden ser facturas de proveedores (forma de pago «tarjeta» en Cuentas por pagar) y pago
de la tarjeta desde una cuenta monetaria. El flujo de efectivo **no** debe contarla como efectivo (el pago de la tarjeta
es la salida). Recomendado: diseño propio con el contador, después de Multimoneda (las tarjetas suelen ser en dólares).

### 11.4 Alcance por cuenta bancaria

`bancos.accesos_a_cuentas_bancarias` con `ALCANCE_DE_CUENTAS_BANCARIAS` (`diseno-accesos-por-modulo.md`), políticas en
`cuentas_bancarias` y en todo lo que cuelga de una cuenta (movimientos, cheques, chequeras, conciliaciones, saldos
iniciales, solicitudes; transferencias por **cualquiera** de sus dos cuentas), permiso `bancos.cuentas-bancarias.ver-todas`
que la migración da a todos los roles actuales (nada cambia hasta que se asigne). Riesgos: rendimiento de la
subconsulta en reportes de toda la empresa; órdenes de Cuentas por pagar (`medios_de_pago` solo mostraría las cuentas
asignadas a quien paga). Diseño propio.

### 11.5 Foto o PDF del comprobante de un movimiento

`movimientos.comprobante_archivo_id` → `core.archivos` (único), con subir, quitar y abrir como el estado de cuenta de
H2b (qpdf, topes, auditoría `quitar`). Después de la QA de H2 (paso 7).

### 11.6 Beneficiario desde Terceros

Bancos no depende de Terceros: orden nueva de Terceros `terceros.buscar_beneficiarios` (por el mediador) y columna
`movimientos.tercero_id uuid null` **sin llave** (como `documento_de_origen_id`), guardando también el nombre. Ayuda a
la bandeja de CP-AP (prellenar el proveedor de un cheque de apertura anulado). Diseño corto.

### 11.7 Notas de ajuste de conciliación

Las notas del banco que se registran **desde** la conciliación (comisiones, intereses) se marcan
`registrada_al_conciliar_id` y el documento las muestra en su sección «Notas del banco registradas al conciliar». Toca
`ConciliarCuenta.vue`: después del paso 5 de H2 y de CP4-B3b.

### 11.8 Ajuste por diferencial cambiario (anotado para *Multimoneda*)

Con *Multimoneda* y *Contabilidad*: cuentas en dólares con su moneda, monto en la moneda de la cuenta y tipo de cambio
por movimiento; conciliación en la moneda de la cuenta; saldo inicial en dólares al corte con el tipo de cambio de esa
fecha; ventana que calcula la diferencia de cada cuenta en moneda extranjera (mensual o al cierre, con el tipo de cambio
de referencia del Banco de Guatemala) y genera la partida. Método, cuentas y tratamiento fiscal: los define el contador
en el diseño de Multimoneda. Nada de esto se programa aquí.

## 12. Lo que debe validar `contador-guatemala`

- **C-1.** La composición del saldo inicial (§2): saldo del estado de cuenta + depósitos en tránsito − cheques en
  circulación − débitos en tránsito = saldo en libros al corte; que las notas del banco no registradas **se ajustan antes
  del corte** y no son partidas de apertura.
- **C-2.** Fecha de corte = día anterior a la fecha de inicio, igual que Cuentas por pagar; empezar a mitad de mes
  (§2.4): ¿se acepta o se recomienda empezar el día 1?
- **C-3.** Cheque de apertura anulado: asiento (Debe Bancos / Haber Proveedores o Acreedores varios; si prescribió,
  otros ingresos), plazo de prescripción de la acción contra el librador, y su lugar en el flujo de efectivo (concepto
  `anulacion_de_apertura` sin actividad, o Operación restando pagos a proveedores). Opción A, B o C de §2.5.
- **C-4.** Depósito en tránsito de apertura rechazado: Debe Clientes / Haber Bancos; tratamiento hasta que exista Cuentas
  por cobrar.
- **C-5.** Cheque **posfechado** entregado antes del corte con fecha posterior: ¿partida de apertura o cheque normal en
  su fecha? (C-CP4-1 dice que la factura se paga en la fecha del cheque, así que seguiría en el saldo inicial de Cuentas
  por pagar.) Propuesta del arquitecto: no es partida de apertura (fecha `>` corte); se registra como cheque con su fecha
  y número, y en Cuentas por pagar como pago de ese saldo inicial.
- **C-6.** Cheques de apertura de más de seis meses: mismo trato que los caducos (H6); ¿aviso al cargarlos?
- **C-7.** ¿El cuadre con el saldo de los libros anteriores debe **bloquear** el cierre de la carga inicial, o basta el
  aviso?
- **C-8.** Saldos por cuenta: ¿«disponible» = libros − posfechados emitidos es la definición correcta para la empresa?
- **C-9.** Aprobación de pagos bancarios (§11.1): práctica de control interno (monto mínimo, quién aprueba, si los pagos
  de Cuentas por pagar deben pasar también).
- **C-10.** Tarjeta de crédito y diferencial cambiario: solo marco general ahora; el detalle con sus diseños.
- **C-11.** Monto en letras del cheque: formato usual en Guatemala («… QUETZALES CON 25/100» u otro).

## 13. Preguntas para el usuario (con recomendación)

- **P-1. Saldo de los libros anteriores.** ¿Se transcribe, por cuenta, el saldo de la contabilidad anterior al corte
  para comparar? **Recomendado: sí, opcional**, y la ventana dice «sin dato» si falta.
- **P-2. Fecha de corte.** ¿Fija = día anterior a la fecha de inicio? **Recomendado: sí** (cuadra con Cuentas por pagar).
- **P-3. Número de los cheques en circulación.** ¿Chequera de apertura automática y, si el número está disponible en una
  chequera registrada, usar ese? **Recomendado: sí** (§2.3).
- **P-4. Cambiar la fecha de inicio con saldos de Bancos con partidas.** **Recomendado: rechazar** hasta eliminarlos.
- **P-5. Primera conciliación.** ¿Obligatoria del mes de la fecha de inicio en las cuentas con saldo del banco? En las
  demás, ¿libre con la propuesta del servidor? **Recomendado: sí y sí.**
- **P-6. Movimientos anteriores a la fecha de inicio.** ¿Se rechazan los **nuevos** en cualquier cuenta de una empresa
  con fecha de inicio? **Recomendado: sí** (los existentes no cambian).
- **P-7. Cheque de apertura anulado.** ¿Opción A, B o C (§2.5)? **Recomendado: C** (bandeja en Cuentas por pagar, diseño
  corto CP-AP después de CP4-12); hasta entonces, A.
- **P-8. Saldos iniciales existentes.** ¿Quedan como «sin partidas (de antes)» y se pueden separar? **Recomendado: sí.**
- **P-9. Sobregiro en la apertura.** ¿Exenta, con aviso? **Recomendado: sí.**
- **P-10. Cuadre que no cuadra.** ¿Aviso o bloqueo? **Recomendado: aviso** (y lo que diga el contador, C-7).
- **P-11. Estado de cuenta.** ¿Formato de documento sobre el reporte de Movimientos (sin endpoint nuevo)?
  **Recomendado: sí.**
- **P-12. Orden.** Parte A → CP4-B3a en paralelo → reportes (parte C) → aprobaciones e impresión (diseños cortos) →
  foto del comprobante y beneficiario desde Terceros → alcance por cuenta → tarjeta después de Multimoneda.
  **Recomendado: así.**
- **P-13. Aprobaciones.** ¿Tabla aparte de solicitudes, monto mínimo y sin incluir los pagos de Cuentas por pagar?
  **Recomendado: sí.**
- **P-14. Impresión de cheques.** ¿Formatos en capas con «solo lo que se movió» sobre el de fábrica, impresión en el
  navegador, sin Excel, y «impreso» (no «entregado») para la regla de blanquear? **Recomendado: sí.**
- **P-15. Evidencia de la apertura.** ¿Adjuntar el último estado de cuenta o la última conciliación del sistema anterior
  a cada saldo inicial? **Recomendado: sí, opcional**, en un paso después de la QA de H2.

## 14. Pasos (un commit cada uno; servidor y cliente por separado)

Cada commit corre `npm run revisar` y sus pruebas y actualiza la bitácora de `PLAN.md`. Servidor con
`programador-backend`, cliente con `programador-frontend`, QA con `pruebas-qa`.

| Paso | Contenido | Va después de |
|---|---|---|
| **BS-1** (servidor, datos) | Migración `0034` (§3, §4): tabla, columnas, checks, índices, chequera de apertura, concepto, relleno, permisos `.ver` y `.anular`; `*.tablas.ts`; `CONCEPTOS_DE_SISTEMA`. **Pruebas:** cada check (parte y tipo, apertura completa), único del saldo principal (dos `saldo_del_banco` fallan; varias partidas pasan), chequera de apertura activa (falla), relleno sobre datos sembrados (global, conciliaciones intactas, saldos iguales antes y después), repetible, RLS, `politicas-de-los-modulos` | Nadie más generando migraciones de Bancos (CP4-B2b y H2 paso 5 sin migración; si no, se espera) |
| **BS-2** (servidor, saldos iniciales) | Puertos y casos de uso de §6.1–§6.3, reglas de §5.1, chequera de apertura (§2.3), rutas y Excel (§8), auditoría, oyente de §5.4, retiro de las rutas viejas. **Pruebas:** sin fecha de inicio, carga cerrada, partida después del corte, cuenta con movimientos anteriores, partida sin cabecera, cheque en chequera registrada disponible (pasa) y emitido (rechazo), chequera nueva traslapada con la de apertura (rechazo), eliminar cabecera con partidas (auditoría con todo), convertir un global (y rechazo con movimientos anteriores), cuadre y diferencia, sobregiro exento con aviso, cambio de fecha de inicio rechazado, Excel de los dos recursos (ensayo, errores por fila), permisos 403 | BS-1 |
| **BS-3** (servidor, reglas transversales) | §5.2 (movimiento antes de la apertura y, si P-6, antes de la fecha de inicio, también en las órdenes de otros módulos), §5.3 (anular con inverso siempre y concepto `anulacion_de_apertura`, fecha después del corte, sin blanquear), `OrigenDeCheque = 'apertura'` en caducos y lote, `parteDeApertura` en los DTO, evento. **Pruebas:** anular cheque de apertura con mes abierto (inverso igual), en lote, inverso antes del corte (rechazo), flujo de efectivo con el inverso en «sin actividad» y el control cuadrado, depósito en tránsito anulado, blanquear (rechazo), nota normal antes del corte (rechazo) | BS-2 |
| **BS-4** (servidor, conciliación) | §2.4, §6.4 y §6.5: primera conciliación con saldo del banco, candidatos sin `saldo_del_banco`, `deApertura`, `saldoInicialDelBancoDeLaApertura`, `periodoSiguiente`. **Pruebas:** identidad banco = estado de cuenta con todo marcado (corte fin de mes y a mitad de mes), primera de otro mes (rechazo), cheque de apertura cobrado en febrero sigue en circulación en enero, conciliación con saldo global sin cambios, documento de un mes autorizado sin cambios | BS-3 y **CP4-B2b en `main`** (toca el mismo código de conciliación) |
| **CP4-B3a** (cliente) | §9.4 | Ya se puede; antes de BS-6 |
| **BS-5** (cliente, pantalla) | §9.1 y §9.3; menú; ficha de la cuenta con resumen; limpieza | BS-2 (y BS-3 para anular) |
| **BS-6** (cliente, otras pantallas) | §9.2 salvo la conciliación | BS-3, CP4-B3a |
| **CP4-B3b** (cliente) | §9.4 | H2 paso 5 y CP4-B2b |
| **BS-7** (cliente, conciliación) | Partidas «De la carga inicial», rótulo del saldo inicial del banco, `periodoSiguiente` en `ListaDeConciliaciones` | BS-4, H2 paso 5 y CP4-B3b (toca `ConciliarCuenta.vue`) |
| **BS-8** (QA) | Empresa con fecha de inicio el 1 de enero: dos cuentas, una con 3 cheques en circulación (uno de 8 meses), un depósito en tránsito y Excel de partidas; otra abierta en febrero sin saldo inicial; cuadre con y sin dato; cerrar la carga e intentar corregir; primera conciliación de enero (saldo del banco rotulado, cheques cobrados marcados, uno queda); anular el viejo en febrero (nota de crédito, flujo sin actividad); intentar cambiar la fecha de inicio; permisos; celular | BS-7 |
| **BS-R1** (servidor) | Saldos por cuenta y `conciliadoEn` en el reporte de movimientos (§10), permisos y su migración (`0035` o la siguiente). **Pruebas:** a una fecha con posfechados, partidas en tránsito a la fecha (también de apertura), cuenta atrasada, Excel, 403, rendimiento | BS-3 |
| **BS-R2** (cliente) | Páginas «Saldos por cuenta» y «Estado de cuenta» (imprimir y exportar) | BS-R1 |
| D y CP-AP | Diseños cortos (§11, §2.5) con el usuario y el contador | Después de aprobar este documento |

`DONDE-QUEDAMOS.md` y `bancos.md` se actualizan al unir cada paso (lo hace el coordinador).

## 15. Convivencia y riesgos

1. **Trabajo en paralelo.** H2 paso 5 y CP4-B2b tocan la conciliación: BS-4, BS-7 y CP4-B3b van después. BS-1 a BS-3,
   BS-5, BS-6 y CP4-B3a no tocan `ConciliarCuenta.vue` ni `AccionesDeConciliacion.vue`. La `0034` se genera con nadie
   más generando migraciones de Bancos.
2. **Rutas que cambian.** `/bancos/saldos-iniciales` cambia de forma en BS-2; el cliente viejo deja de funcionar hasta
   BS-5. Si hace falta no romper `main` entre los dos, BS-2 conserva el `GET` viejo hasta BS-5 (el coordinador decide).
3. **Cuentas por pagar.** Sus órdenes a Bancos (cheque, nota) pasan por la regla de §5.2: un pago con fecha `<=` corte se
   rechaza en Bancos; Cuentas por pagar ya exige la fecha de inicio como mínima (CP4 §5.1), así que no debería pasar.
4. **Orden de bloqueo**: Empresas (carga) → cuenta bancaria → cabecera → chequera y movimientos. No invierte el de CP4.
5. **Flujo de efectivo.** Las partidas de apertura con fecha anterior al rango no entran; las del rango salen como
   «saldos iniciales del rango» en el control (como hoy el saldo global).
6. **Caducos.** Los cheques de apertura entran al reporte y al lote; el lote sigue todo o nada.
7. **Datos de desarrollo.** La cuenta con saldo del 2026-09-01 y movimientos de septiembre queda «global» y no se separa
   en partidas sin resolver esos movimientos: es el caso que la QA debe ver explicado.
