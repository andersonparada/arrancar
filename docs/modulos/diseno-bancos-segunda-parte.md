# Diseño de Bancos, segunda parte — arquitecto de datos, 2026-11-16

Estado: **aprobado, listo para programar** (usuario, 2026-11-16; bitácora de `PLAN.md`). Dictamen del contador:
`dictamen-bancos-segunda-parte-2026-11-16.md` («correcto con ajustes»); sus cambios 1 a 7 y 12 están incorporados aquí
(§0), el 8 va en Empresas y el 9 a 11 en los diseños cortos (§16). Orden de pasos en §14. Aterriza la sección «Bancos,
segunda parte» de `docs/HOJA-DE-RUTA.md` y lo pendiente de `docs/modulos/bancos.md`, con la forma de
`diseno-cp4-pagos.md` y `diseno-cp5-reportes.md`. No rediseña lo que existe: lo que se cita del código está verificado
contra `main` (`73e773c`) el 2026-11-16 y vuelto a revisar contra `main` (`69e0918`) al aprobarse.

## 0. Lo que cambió al aprobarse (2026-11-16)

El usuario aceptó P-1 a P-15 como se recomendaban (§13) y **todos** los cambios del dictamen. Dónde quedó cada uno:

| # del dictamen | Cambio | Dónde |
|---|---|---|
| 1 | Partida `error_del_banco` (crédito o débito, candidata en la conciliación) | §2, §3.2 (check de la `0034`), §5.1, §8 |
| 2 | Texto «solo cheques entregados al beneficiario» | §5.1, §8.2, §9.1 |
| 3 | Aviso de antigüedad con `bancos.cheques.meses_de_vencimiento` y el art. 508 (no «7 meses» fijo) | §5.1 |
| 4 | Aviso de depósito en tránsito de más de 30 días al corte | §5.1 |
| 5 | Bancos y Sobregiros por separado (sin compensar); disponible sin el sobregiro autorizado; fondos retenidos aclarados | §2.2, §6.3, §9.1, §10 |
| 6 | Posfechado de una chequera no registrada (respuesta del usuario: desde Saldos iniciales, en la chequera de apertura, con su fecha real, solo con la carga abierta) y posfechado cobrado antes de su fecha como candidato | §2, §2.3, §2.6, §5.1, §6.4 |
| 7 | Cerrar la carga con diferencias o sin el dato: confirmación con motivo y auditoría | §5.6 (lo que aporta Bancos) y §16.1 (Empresas) |
| 8 | Aviso en Empresas si la fecha de inicio no es día 1 | §16.1 |
| 9 | CP-AP: beneficiarios que no son proveedores, plazo de la deuda de fondo, «ya pagada» contra la cuenta de pago | §2.5 y §16.2 |
| 10 | Aprobaciones: sin las notas que solo registran cargos del banco | §11.1 y §16.2 |
| 11 | Monto en letras con relleno y pruebas exhaustivas | §11.2 y §16.2 |
| 12 | Cotejar con el Decreto 2-70 oficial los textos legales antes de la ayuda | §15 punto 8 |
| P-15 | Evidencia de la apertura **opcional, con aviso** al cerrar la carga si falta (respuesta del usuario) | §3.1 (columna en la `0034`), §5.6, paso BS-9 |
| P-1, P-6, P-11, P-14 | Matices del contador: el dato transcrito es el saldo **de la cuenta contable**; ayuda sobre notas del banco descubiertas después; leyenda del estado de cuenta; «entregado» más adelante | §2.1, §5.2, §10, §11.2 |

El diseño tiene cinco partes, de distinta madurez:

| Parte | Qué | Madurez |
|---|---|---|
| **A** | Saldos iniciales con partidas (cheques en circulación, depósitos y débitos en tránsito, errores del banco; y los posfechados entregados antes del corte), su cuadre y la primera conciliación; la partida de apertura que se anula después (revive el pasivo) | **Listo para programar** (§2 a §8; pasos BS-1 a BS-9) |
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
   **En programación a la vez que este diseño** (revisado contra `main` `69e0918` el 2026-11-16): H2 paso 5 (cliente
   del estado de cuenta en `ConciliarCuenta.vue`, worktree `agent-af5ce5db56b554796`) y CP4-B2b (servidor: aviso
   `movimiento_por_cambiar` al desmarcar desde la conciliación, worktree `agent-ae9ac59462c01ab88`): los dos
   **programando, sin commits fuera de `main` y sin migración** (la carpeta de migraciones de Bancos de ambos termina en
   la `0033`). CP4-B3a (cliente) **sin empezar**: no hay agente ni rama.
8. **Migraciones de Bancos**: la última en `main` es `0033_cp4_efectivo_para_pagos` (`when` 1794690461288), confirmado
   el 2026-11-16 en `main` `69e0918`. La de este diseño es la **`0034_saldos_iniciales_con_partidas`**; si al generarla
   alguien hubiera unido otra, toma la siguiente libre y se corrige aquí. Nunca dos ramas generando migraciones de Bancos
   a la vez (H2 paso 5 y CP4-B2b no traen migración). La siguiente libre después (BS-R1) es la `0035`.
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
                         ± errores del banco               (+ si el banco cargó de más o abonó de menos; − al revés)
```

Las notas **del banco** que la empresa no había registrado (comisiones, intereses, cheques rechazados) **no son partidas
de apertura**: se registran en el sistema anterior antes del corte (el saldo de apertura ya es el ajustado). Lo validó
el contador (C-1), que agregó el **error del banco** (un cargo o abono equivocado del banco, que este corregirá después).

En Arrancar todo saldo sale de sumar `bancos.movimientos` (saldo de la cuenta, reportes, flujo, conciliación), así que
**cada parte es un movimiento** con `saldo_inicial = true`:

| Parte (`parte_de_apertura`) | Tipo del movimiento | Fecha | Monto | Cuántas | En la conciliación |
|---|---|---|---|---|---|
| `saldo_del_banco` | crédito (o débito si el saldo del banco es negativo) | **la fecha de corte** (fija) | saldo del estado de cuenta | **una** por cuenta | **No es candidato**: es lo que el banco ya «vio»; da el saldo inicial del banco de la primera conciliación |
| `cheque_en_circulacion` | cheque (con su número, §2.3) | la real del cheque, `<=` corte | el del cheque | 0..n | Candidato: se marca cuando el banco lo paga |
| `deposito_en_transito` | crédito | la real, `<=` corte | | 0..n | Candidato |
| `debito_en_transito` | débito | la real, `<=` corte | | 0..n | Candidato |
| `error_del_banco` | crédito (el banco cargó de más o abonó de menos: suma) o débito (abonó de más o cargó de menos: resta) | la del error, `<=` corte | | 0..n | Candidato: se marca cuando el banco lo corrige |
| `saldo_global` | crédito o débito | la que tenía | | solo los **existentes** (§4.4) | Candidato, como hoy |
| `cheque_posfechado` | cheque (en la chequera de apertura, §2.3) | **la real del cheque, `>` corte** | el del cheque | 0..n | Candidato como todo cheque (también antes de su fecha, §2.6) |

`cheque_posfechado` **no es partida de apertura** (C-5): es un cheque entregado antes del corte con fecha posterior, que
cuenta en el saldo **en su fecha** como cualquier cheque. Se carga desde Saldos iniciales solo porque su chequera no está
registrada en Arrancar (respuesta del usuario al cambio 6). Por eso lleva `saldo_inicial = false`, cuelga de la cabecera
(`saldo_inicial_id`, para listarlo, bloquearlo con la carga cerrada y borrarlo con ella) y lleva un **concepto de egreso
que elige el usuario** (sale en el flujo de efectivo en su fecha, como un cheque normal), no `saldo_inicial`.

**Fecha de corte** = el **día anterior a la fecha de inicio** de la empresa (como Cuentas por pagar, «al cierre del día
anterior»). No se elige: sale de Empresas. Así los saldos iniciales de los módulos cuadran a la misma fecha (P-2).

Las partidas de apertura (todas menos `cheque_posfechado`) llevan el concepto de sistema `saldo_inicial` (apertura,
fuera del flujo), sin número correlativo (como hoy) y sin origen. El posfechado no lleva correlativo (es un cheque: su
número es el del cheque) ni origen.

### 2.1 Cabecera por cuenta (`bancos.saldos_iniciales`)

Una fila por cuenta con saldo inicial: ancla las partidas (llave), guarda lo que el usuario **transcribe solo para
comparar** —el saldo **de la cuenta contable** de esa cuenta bancaria en los libros del sistema anterior al corte (P-1,
precisión del contador), no el del estado de cuenta—, sus observaciones y, opcional, la **evidencia** (P-15). El monto y
la fecha del saldo del banco **no** se repiten aquí: viven en el movimiento `saldo_del_banco` (una sola fuente).

### 2.2 Cuadre

```
saldo en libros al corte (Arrancar) = Σ efecto de las partidas de la cuenta (saldo del banco incluido; sin posfechados)
diferencia                           = saldo en libros al corte − saldo según libros del sistema anterior (transcrito)
```

La ventana muestra el cuadre por cuenta y los totales de la empresa **sin compensar** (cambio 5, NIIF para las Pymes
2.52): **Bancos** = Σ de las cuentas con saldo en libros al corte positivo (activo) y **Sobregiros bancarios** = Σ de
las negativas, en valor absoluto (pasivo). No hay un «total neto». Si no cuadra o falta el dato transcrito, **avisa sin
bloquear**; al **cerrar** la carga en Empresas pide confirmación con motivo (§5.6). Con la carga cerrada queda de solo
lectura. Los posfechados se listan aparte («Cheques posfechados entregados antes del corte») y **no** entran al cuadre:
cuentan en su fecha.

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
- **El posfechado** (`cheque_posfechado`) usa la misma chequera de apertura y las mismas reglas de número. Si su
  chequera sí está registrada (y el número disponible), las mismas reglas lo ubican en ella; aun así se carga desde
  Saldos iniciales, para que la carga cerrada lo proteja igual que a las partidas.
- Texto de la ventana y de la hoja de instrucciones del Excel (cambio 2): «Solo cheques **entregados** al beneficiario
  antes del dd/mm/aaaa. Un cheque firmado que sigue en la oficina no está en circulación: no lo cargue (el pago no se
  hizo).»

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
| Candidatos | vigentes hasta fin de mes | igual, **sin** el `saldo_del_banco` (nunca es candidato, en ningún mes), y con los cheques de fecha posterior (§2.6) |

Si el corte es fin de mes (fecha de inicio el día 1), el saldo inicial del banco es el «saldo anterior» del estado de
cuenta del primer mes: la pantalla lo dice. Si la empresa empezó a mitad de mes, el cuadro dice «Saldo del banco al
dd/mm/aaaa (carga inicial)» y los movimientos del estado de cuenta anteriores al corte no se marcan (ya están en ese
saldo); el saldo final cuadra igual. Con todo marcado se mantiene la identidad de B5.1: saldo final del banco = saldo que
debe mostrar el estado de cuenta.

Las cuentas **sin** saldo del banco (abiertas después de la fecha de inicio, o con el saldo global de antes) siguen como
hoy, pero el servidor propone el período (§6.5).

### 2.5 La partida de apertura que se anula después (revive el pasivo o el activo)

Un cheque en circulación de la apertura que caduca o no se cobra se **anula**; un depósito en tránsito que el banco
rechaza, también, y un error del banco que este nunca corrige. Reglas en Bancos:

1. **Siempre con inverso** (`conInversoSiempre`, como H6b), aunque el mes no esté conciliado: anular «a la antigua»
   cambiaría el saldo al corte, que ya es el de la contabilidad de apertura.
2. **La fecha del inverso debe ser posterior al corte** (`InversoDentroDeLaApertura`) y no caer en un mes conciliado
   (regla de siempre).
3. **Concepto del inverso**: no hereda `saldo_inicial` (eso lo pondría como «apertura» en el control del flujo de un mes
   posterior). Concepto de sistema nuevo **`anulacion_de_apertura`** («Partidas de apertura anuladas», aplica a ambos,
   actividad `ninguna`): sale en «Otros movimientos sin actividad» del flujo, porque no movió efectivo (validado por el
   contador, C-3).
4. **Evento** `bancos.partida_de_apertura_anulada` al confirmar (bus de eventos, informativo): `movimientoId`,
   `inversoId`, `parte`, `fecha` del inverso, `monto`, `beneficiario`, `numeroDeCheque`, `pagador` (solo depósito en
   tránsito, punto 6). Para Contabilidad (partida), la bandeja de CP-AP y avisar.
6. **Depósito en tránsito rechazado** (C-4): al anularlo se pide el **pagador** (quién debe ese dinero: 1–150
   caracteres, obligatorio si el depósito no tiene «origen»), que se guarda en el `beneficiario` del inverso y viaja en
   el evento. La comisión del banco por el rechazo **no** va en el inverso: es una nota de débito aparte (la ventana lo
   dice). Asiento que hará Contabilidad: Debe Cuentas por cobrar (o Deudores varios) / Haber Bancos.
5. El `saldo_del_banco` **no** se anula (`NoSeAnulaElSaldoDelBanco`): se corrige o se elimina con la carga abierta.

**Qué pasa con el pasivo** (P-7, **decidido: opción C**, y la A mientras CP-AP no exista):

| Opción | Cómo | Decisión |
|---|---|---|
| A. Solo Bancos | Inverso con `anulacion_de_apertura` y un reporte de partidas de apertura anuladas para el contador | **Mientras tanto** (hasta CP-AP) y siempre sin Cuentas por pagar activo |
| B. Aviso que crea la deuda | En la transacción, Cuentas por pagar crea un cargo por el monto | Descartada: el beneficiario es texto y no siempre se debe |
| **C. Bandeja en Cuentas por pagar** | Bancos hace 1–5. Cuentas por pagar (que ya lee `bancos.*` por su `dependeDe`) lista los cheques de apertura anulados **sin decisión**; el usuario **reconoce la deuda** o la **descarta** con motivo. Diseño corto propio **CP-AP**, después de CP4-12, con los ajustes del contador de §16.2 | **Aprobada** |

Asiento (C-3): Debe Bancos / Haber Proveedores, o «Acreedores varios» si el beneficiario no es proveedor. La deuda
**revive** porque el cheque se recibe salvo buen cobro (C. Com. art. 410). La acción cambiaria del cheque prescribe a
los 6 meses (art. 513), pero la **deuda de fondo** sigue: 5 años (Código Civil art. 1508) o 2 años si es precio de
mercadería (art. 1514); la prescripción no opera sola (art. 1501) y se interrumpe con el reconocimiento (art. 1506). El
ingreso por una deuda prescrita es gravable en el régimen sobre las utilidades. Todo esto es texto de ayuda de CP-AP
(cotejar antes, §15 punto 8).

El depósito en tránsito rechazado revive una **cuenta por cobrar**: hasta que exista Cuentas por cobrar queda como la
opción A (concepto, pagador y reporte), según C-4.

### 2.6 Cheque cobrado antes de su fecha (todas las conciliaciones, cambio 6)

Un cheque es pagadero a la vista (C. Com. art. 501): el banco puede pagar un posfechado antes de su fecha. Hoy no es
candidato (solo lo son los de fecha `<=` fin de mes), así que el usuario no lo puede marcar y la conciliación no cuadra.
Con este diseño, en **cualquier** conciliación (no solo la primera):

- Son candidatos, además, los **cheques** vigentes con fecha **posterior** al fin de mes que no estén marcados en otra
  conciliación. Se muestran en un grupo propio, «Cheques con fecha posterior (posfechados)», con el aviso «Cheque con
  fecha dd/mm/aaaa: márquelo solo si el banco ya lo pagó».
- Sin marcar **no son partida** (todavía no están en libros: no son cheques en circulación).
- Marcados, entran al lado del banco como egreso y forman la partida nueva **«Cheques cobrados antes de su fecha»**, que
  **resta** en «saldo que debe mostrar el estado de cuenta» = libros + cheques en circulación + débitos en tránsito −
  créditos en tránsito − cheques cobrados antes de su fecha. La foto de la conciliación autorizada guarda su total
  (`foto_total_cobrados_antes_de_su_fecha`, §3.6).
- El mes siguiente el cheque entra a libros en su fecha y ya no es candidato (está marcado): las dos cuadráticas cuadran
  sin más.
- Solo cheques: notas y transferencias con fecha futura no son candidatos (no hay caso real).

## 3. Datos (esquema `bancos`, migración `0034_saldos_iniciales_con_partidas`)

### 3.1 Tabla nueva `bancos.saldos_iniciales`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK (`idPrimario`) |
| `empresa_id` | uuid | no | FK `core.empresas` on delete cascade |
| `cuenta_bancaria_id` | uuid | no | FK `saldos_iniciales_cuenta_fk → bancos.cuentas_bancarias (id)`, no action; **único** `saldos_iniciales_cuenta_unico` (sirve de índice) |
| `saldo_segun_libros_anteriores` | numeric(14,2) | sí | Saldo **de la cuenta contable** en los libros del sistema anterior al corte, transcrito **solo para comparar** (puede ser negativo); nulo = sin dato |
| `observaciones` | text | sí | check `saldos_iniciales_observaciones_validas`: nulo o 1–500 y sin espacios a los lados |
| `evidencia_archivo_id` | uuid | sí | FK `saldos_iniciales_evidencia_fk → core.archivos (id)`, no action; **único** `saldos_iniciales_evidencia_unica` (sirve de índice; un archivo es de un solo registro, como `conciliaciones.estado_de_cuenta_archivo_id` de la `0031`). Último estado de cuenta o última conciliación del sistema anterior (P-15). **Opcional**; la pone solo el servidor |
| `...marcasDeTiempo`, `...autoria` | | | |

`politicaPorEmpresa()`. Sin alcance por registro (no lo hay en Bancos, §11.4). La columna de la evidencia nace en la
`0034` (nula) para no pedir otra migración; subirla, verla y quitarla se programa en **BS-9**, después de la QA de H2
(paso 7), reutilizando el adjunto de H2b (qpdf, topes, `core.archivos`, auditoría `quitar`). Antes de BS-9 siempre es
nula y el aviso de cierre (§5.6) la cuenta como faltante.

### 3.2 Cambios en `bancos.movimientos`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `parte_de_apertura` | text | sí | check `movimientos_parte_de_apertura_valida`: nulo o `in ('saldo_del_banco', 'cheque_en_circulacion', 'deposito_en_transito', 'debito_en_transito', 'error_del_banco', 'saldo_global', 'cheque_posfechado')` |
| `saldo_inicial_id` | uuid | sí | FK `movimientos_saldo_inicial_fk → bancos.saldos_iniciales (id)`, no action; índice `movimientos_saldo_inicial_idx` |

Checks nuevos:

- `movimientos_apertura_completa`: `(parte_de_apertura is not null) = (saldo_inicial_id is not null) and saldo_inicial = coalesce(parte_de_apertura <> 'cheque_posfechado', false)`
  (va después del relleno de §4.4). Es decir: toda parte cuelga de una cabecera; es saldo inicial toda parte menos el
  posfechado; sin parte no hay saldo inicial.
- `movimientos_tipo_de_la_parte`: `parte_de_apertura is null or (parte_de_apertura in ('saldo_del_banco', 'saldo_global', 'error_del_banco') and tipo in ('credito', 'debito')) or (parte_de_apertura in ('cheque_en_circulacion', 'cheque_posfechado') and tipo = 'cheque') or (parte_de_apertura = 'deposito_en_transito' and tipo = 'credito') or (parte_de_apertura = 'debito_en_transito' and tipo = 'debito')`.

La regla de fechas (partida `<=` corte, posfechado `>` corte) **no** va en un check: el corte sale de Empresas y puede
cambiar mientras no haya saldos con partidas (§5.4); la revisa el dominio.

Índices:

- **Se reemplaza** `movimientos_un_saldo_inicial` por `movimientos_un_saldo_del_banco` único `(cuenta_bancaria_id)` where
  `parte_de_apertura in ('saldo_del_banco', 'saldo_global') and anulado_en is null` (sigue habiendo un solo saldo
  principal por cuenta; las partidas pueden ser muchas).
- `movimientos_apertura_idx (cuenta_bancaria_id, fecha) where saldo_inicial` (cuadre, primera conciliación y la regla de
  movimientos anteriores al corte; son pocas filas).

`saldo_inicial` (booleano) **se queda**: lo usan muchas consultas y `exigirClase`; el check lo ata a la parte. El
posfechado tiene `saldo_inicial = false` a propósito: para el saldo, el flujo, los reportes y la conciliación es un
cheque normal en su fecha.

### 3.3 Cambios en `bancos.chequeras`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `de_apertura` | boolean | no | `default false`. Check `chequeras_apertura_inactiva`: `not de_apertura or not activa`. Único parcial `chequeras_de_apertura_unica (cuenta_bancaria_id, coalesce(serie, '')) where de_apertura` |

### 3.4 Concepto de sistema nuevo

`anulacion_de_apertura` («Partidas de apertura anuladas», `aplica_a = 'ambos'`, `actividad_de_flujo = 'ninguna'`, grupo
nulo) en `CONCEPTOS_DE_SISTEMA` y, en las empresas que ya tienen catálogo, `insert` a mano como la `0022`/`0032` (sin
tocar uno con ese nombre; si existe uno sin clave con el mismo nombre, se le pone la clave). Repetible.

### 3.5 RLS, llaves y convivencia

Todas por empresa. Sin llaves hacia otros módulos (Bancos `dependeDe: []`); la de la evidencia va a `core.archivos`
(core, permitido). Cuentas por pagar ya puede leer
`bancos.movimientos` y `bancos.cheques` desde su `infraestructura` (lo necesitará la bandeja de CP-AP). Borrar la
empresa: cascadas por `empresa_id`; las `no action` se revisan al final del comando (como hoy).

### 3.6 Cambio en `bancos.conciliaciones`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `foto_total_cobrados_antes_de_su_fecha` | numeric(14,2) | sí | Total de los cheques marcados con fecha posterior al fin de mes (§2.6), en la foto al autorizar. Nula en las autorizadas antes de la `0034` (se leen como cero; su foto no cambia) y mientras no esté autorizada, como las demás `foto_*` |

## 4. Migración `0034` y datos existentes

### 4.1 Orden dentro de la migración

1. `saldos_iniciales` con su RLS y `grant` (lo da el migrador por esquema).
2. Columnas nuevas de `movimientos`, `chequeras` y `conciliaciones` (nulables y `default false`).
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
| La carga inicial está **abierta** (crear, corregir, eliminar la cabecera o cualquier partida —también el posfechado—, convertir) | `CargaInicialCerrada` (422): «La carga inicial está cerrada: pida que la reabran en Empresas.» |
| Un saldo inicial por cuenta | `SaldoInicialRepetido` (ya existe) |
| Partida con fecha `<=` corte (todas menos el posfechado) | `PartidaDespuesDelCorte` (400, campo `fecha`): «La partida debe ser del dd/mm/aaaa o antes (día anterior a la fecha de inicio).» |
| Posfechado con fecha `>` corte | `PosfechadoNoPosterior` (400, campo `fecha`): «Un cheque posfechado lleva fecha posterior al dd/mm/aaaa. Si es de esa fecha o antes, cárguelo como cheque en circulación.» |
| Posfechado: concepto de egreso obligatorio (de la empresa, activo, que aplique a cheques) | Errores de concepto que ya existen (`asignacion-de-concepto.ts`) |
| Error del banco: sentido (`credito` o `debito`) y descripción obligatorios (referencia u observaciones) | `DescripcionDelErrorObligatoria` (400, campo `observaciones`): «Describa el error del banco (qué cargó o abonó mal y cuándo lo corregirá).» |
| La cuenta no tiene movimientos normales con fecha `<=` corte | `CuentaConMovimientosAnteriores` (422): «La cuenta tiene N movimientos anteriores a la fecha de inicio: elimínelos o anúlelos antes de cargar el saldo inicial.» |
| Partida sin cabecera | `SinSaldoInicial` (422): «Registre primero el saldo según el estado de cuenta de la cuenta.» |
| Cambiar el saldo del banco o eliminar la cabecera con alguna conciliación de la cuenta (de cualquier estado) | `AperturaConConciliacion` (422): «Elimine la conciliación de mm/aaaa para corregir el saldo inicial.» |
| Corregir o eliminar una partida marcada en una conciliación | `exigirNoMarcadoEnConciliacion` (ya existe) y `MesConciliado` |
| Eliminar la cabecera | Borra **todas** sus partidas (con sus cheques de la chequera de apertura) en la misma transacción; motivo 1–500 |
| Cheque en circulación o posfechado: beneficiario obligatorio, número `> 0`, serie opcional; **solo cheques entregados** (texto de §2.3, cambio 2) | `BeneficiarioObligatorio` (ya existe) |
| Número usado | `ChequeDeAperturaYaUsado` (422): «El cheque N de la serie S ya está emitido o anulado en la chequera X.» |
| Sobregiro | **Exenta** la apertura y el posfechado (son hechos, no decisiones; P-9). Aviso si el saldo al corte es negativo y la empresa no permite sobregiro; en el posfechado, el aviso de fondos que ya da `EmitirCheque` (saldo de hoy menos posfechados, CP4-B2a) |
| Aviso de antigüedad (cambio 3), sin bloquear | Cheque en circulación cuya fecha tiene, **al corte**, `bancos.cheques.meses_de_vencimiento` meses o más (la variable, hoy 7 por omisión; nunca un número fijo en el texto): «El cheque N es del dd/mm/aaaa: al dd/mm/aaaa tiene M meses. Desde los 6 meses de su fecha el banco puede negarse a pagarlo (Código de Comercio, art. 508): revise si sigue en circulación.» M es la cuenta real de meses. Sale también en la ficha (insignia «Antiguo») |
| Aviso de depósito viejo (cambio 4), sin bloquear | Depósito en tránsito con **más de 30 días** al corte (constante del dominio, `DIAS_DE_DEPOSITO_EN_TRANSITO_SOSPECHOSO = 30`; no es configuración): «El depósito del dd/mm/aaaa tiene N días al corte: un depósito tarda uno o dos días en verse en el banco. Revise que de verdad se haya depositado.» Insignia «Revisar» en la ficha |

Bloqueos (orden de §10 de CP4): primero la carga inicial (`empresas.obtener_carga_inicial`, que ya toma el bloqueo
compartido), luego la cuenta bancaria (`for update`, para que dos cargas de la misma cuenta no se crucen), luego la
cabecera y la chequera de apertura.

### 5.2 Movimientos normales y la apertura

- Con `saldo_del_banco`: un movimiento normal (nota, cheque, transferencia, orden de otro módulo) con fecha `<=` corte →
  `MovimientoAntesDeLaApertura` (reemplaza a `MovimientoAntesDelSaldoInicial` para esa forma).
- Con `saldo_global`: la regla de hoy (`fecha < fecha del saldo`).
- **Sin saldo inicial** pero con fecha de inicio en la empresa: ¿se rechaza un movimiento **nuevo** anterior a la fecha de
  inicio? **Sí** (P-6, decidido): `MovimientoAntesDeLaFechaDeInicio`. Los existentes no se tocan; corregir uno ya
  anterior sigue igual.
- `ReglasDeLaCuenta.revisarSaldoInicial` se reescribe con estas tres ramas; `fechaDelSaldoInicial` pasa a devolver
  `{ parte, fecha }` del saldo principal.
- **Ayuda sobre notas del banco descubiertas después** (P-6, matiz del contador), en la ventana de saldos iniciales y en
  el mensaje de `MovimientoAntesDeLaApertura`: «Si después del corte aparece una nota del banco anterior al dd/mm/aaaa
  (una comisión o un interés que no se registró), no la registre con su fecha: regístrela con una fecha posterior al
  corte (la del primer mes) y avise a su contador, que decidirá si es un ajuste del período o la corrección de un error
  de períodos anteriores. Mientras la carga esté abierta, también puede corregir el saldo inicial.»

### 5.3 Anular una partida (§2.5)

- Cheque en circulación: `AnularCheque` (pantalla de Cheques con `bancos.cheques.anular`, caducos en lote con
  `bancos.cheques-caducos.anular`, y la ventana de saldos iniciales con `bancos.saldos-iniciales.anular`) con
  `conInversoSiempre`; el inverso con `anulacion_de_apertura`.
- Depósito o débito en tránsito y error del banco: `AnularMovimiento` gana el modo «partida de apertura» (hoy
  `exigirClase` lo impide para saldo inicial): inverso siempre, concepto `anulacion_de_apertura`; en el depósito, el
  pagador (§2.5 punto 6).
- **Posfechado**: no es partida de apertura. Con la carga abierta se **corrige o elimina** desde Saldos iniciales (no se
  anula ahí); con la carga cerrada se anula como **cualquier cheque** (pantalla de Cheques, reglas de siempre: «a la
  antigua» si su mes no está conciliado, inverso si lo está; el inverso hereda su concepto). No se blanquea (es de la
  chequera de apertura).
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
- Con posfechados cargados: los rechaza el primer punto (siempre hay `saldo_del_banco`, porque el posfechado exige la
  cabecera).

### 5.6 Revisión al cerrar la carga inicial (cambio 7 y P-15)

Cerrar la carga con diferencias o sin el dato es **confirmación con motivo y auditoría**, no bloqueo (C-7). El cierre es
de Empresas (§16.1); Bancos aporta su **revisión**, un caso de uso `RevisarCierreDeCargaEnBancos` que devuelve una lista
de hallazgos por cuenta:

| Hallazgo | Cuándo | Pide motivo |
|---|---|---|
| `no_cuadra` | Hay `saldo_segun_libros_anteriores` y la diferencia no es cero | **Sí** |
| `sin_dato_de_libros` | Cuenta con saldo inicial sin `saldo_segun_libros_anteriores` | **Sí** |
| `sin_evidencia` | Cuenta con saldo inicial sin `evidencia_archivo_id` (P-15: opcional) | No: solo aviso |
| `saldo_global` | Cuenta que sigue con el saldo «de antes» sin partidas | No: solo aviso |
| `sobregiro_sin_permiso` | Saldo en libros al corte negativo y la empresa no permite sobregiro | No: solo aviso |

Cuentas sin saldo inicial no dan hallazgo (pueden ser cuentas abiertas después). La forma en que Empresas junta las
revisiones de todos los módulos, pide el motivo y lo audita es del diseño corto de Empresas (§16.1); mientras no exista,
la pantalla de Saldos iniciales muestra los mismos hallazgos y Empresas cierra como hoy.

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
`ValidarFechaDeInicioEnBancos` (oyente de §5.4), `RevisarCierreDeCargaEnBancos` (§5.6). Todos en una unidad de
trabajo. Los que crean movimientos usan `Movimiento.crear` con `saldoInicial: true` y la parte (el posfechado, con
`saldoInicial: false`, la parte `cheque_posfechado` y el concepto que eligió el usuario); el cheque se crea en la
chequera de apertura con el mismo dominio `Cheque` (estado `emitido` sin pasar por `EmitirCheque`, que exige chequera
activa).

Se retiran `CrearMovimiento`/`ActualizarMovimiento` con `saldoInicial: true` de la composición de saldos iniciales
(siguen sirviendo a las notas).

### 6.3 DTO

- `SaldoInicialResumenDto` (uno por cuenta de la empresa, también las que no tienen): `cuentaBancariaId`, `cuentaNombre`,
  `bancoNombre`, `forma` (`sin_saldo` | `con_partidas` | `global`), `fechaDeCorte`, `saldoSegunEstadoDeCuenta`,
  `totalDepositosEnTransito`, `totalChequesEnCirculacion`, `totalDebitosEnTransito`, `totalErroresDelBanco` (con signo:
  positivo suma), `saldoEnLibrosAlCorte`, `saldoSegunLibrosAnteriores`, `diferencia`, `cuadra`, `totalPosfechados`
  (informativo, fuera del cuadre), `tieneEvidencia`, `tieneConciliaciones`, `puedeEditar`, `puedeEliminar`.
- `SaldosInicialesDto`: `{ fechaDeInicio, fechaDeCorte, cargaCerrada, cuentas: SaldoInicialResumenDto[], totalBancos,
  totalSobregiros, hallazgos }`: `totalBancos` suma las cuentas con saldo en libros al corte positivo y
  `totalSobregiros` las negativas en valor absoluto (cambio 5; **sin** total neto); `hallazgos` son los de §5.6.
- `SaldoInicialDto` (ficha): el resumen, `observaciones` y `partidas: PartidaDeAperturaDto[]` (`movimientoId`, `parte`,
  `tipo` (sentido del error del banco), `fecha`, `monto`, `serie`, `numeroDeCheque`, `beneficiario`, `referencia`,
  `observaciones`, `conceptoId` y `conceptoNombre` (solo posfechado), `conciliadaEn` (`{anio, mes}` o nulo), `revertida`,
  `avisos` (`antiguo`, `deposito_viejo`), `puedeCorregir`, `puedeEliminar`, `puedeAnular`). Lo calcula el servidor
  (`acciones-posibles.ts`).
- `MovimientoDto`, `ChequeDto`, `ChequeListadoDto` y `ChequeEnCirculacionDto` ganan `parteDeApertura` (nulo si no es);
  `OrigenDeCheque` suma `'apertura'`.
- `Partida` de la conciliación gana `deApertura: boolean` y `parteDeApertura`; `PartidasDeConciliacion` gana
  `cobradosAntesDeSuFecha: Partida[]` (§2.6); `ConciliacionDto` gana `saldoInicialDelBancoDeLaApertura` (`{ fecha,
  monto }` o nulo) para que la pantalla lo rotule y `posfechadosCandidatos` (los cheques con fecha posterior al fin de
  mes, marcados o no, para el grupo propio).

### 6.4 Conciliación (servidor)

- `saldosInicialesDe` y `movimientosDelMesDe` reciben el «inicio efectivo» (corte + 1 en la primera de una cuenta con
  `saldo_del_banco`) y devuelven los saldos de §2.4.
- `candidatosDe` excluye `parte_de_apertura = 'saldo_del_banco'` siempre (también `idsDeCandidatosDe` y los pares
  compensados).
- `IniciarConciliacion` exige el período de §2.4 en la primera (`PrimeraConciliacionDeOtroMes`).
- **Cheques cobrados antes de su fecha** (§2.6, todas las conciliaciones): `candidatosDe` (y `idsDeCandidatosDe`) suma
  `or (tipo = 'cheque' and fecha > finDelMes)` con las mismas condiciones de vigencia y de «no marcado en otra
  conciliación»; `calcularConciliacion` separa esos candidatos: sin marcar no son partida, marcados van al lado del banco
  y a `cobradosAntesDeSuFecha`, que resta en `saldoQueDebeMostrarElEstadoDeCuenta`. `AutorizarConciliacion` guarda
  `foto_total_cobrados_antes_de_su_fecha`. El índice `movimientos_cuenta_fecha_idx` cubre el rango futuro (pocas filas);
  se revisa con `explain analyze`.

### 6.5 Período propuesto (servidor)

`GET /bancos/cuentas-bancarias/:id/conciliaciones` gana `periodoSiguiente`: el mes siguiente a la última; si no hay
ninguna, el de la fecha de inicio (con `saldo_del_banco`) o el del primer movimiento vigente; nulo si no hay nada que
conciliar. El cliente deja de calcularlo (`periodoPropuesto`), solo en `ListaDeConciliaciones` (no toca `ConciliarCuenta.vue`).

## 7. Permisos, auditoría, errores, eventos y configuración

### 7.1 Permisos (`modulo.ts`, PLAN §3.5)

| Permiso | Para | Nuevo |
|---|---|---|
| `bancos.saldos-iniciales.ver` | Pantalla «Saldos iniciales» (lista, ficha, cuadre) | **Sí**: la `0034` lo da a quien tiene `bancos.cuentas-bancarias.ver` (hoy ve el saldo inicial con ese permiso) |
| `bancos.saldos-iniciales.crear` | Registrar la cabecera y agregar partidas (también el posfechado y el error del banco) | Ya existe |
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
| Anular una partida | `anular`, con motivo | `bancos.cheques` (cheque) o `bancos.movimientos` (nota), como hoy | Como hoy (en el depósito, el pagador va en el inverso) |
| Subir o quitar la evidencia (BS-9) | `quitar` al quitar o reemplazar, como el estado de cuenta de H2b | `bancos.saldos-iniciales` | El archivo anterior (id, nombre, tipo, tamaño) |

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
| `PosfechadoNoPosterior` | `DatoInvalido` (`fecha`) | `posfechado_no_posterior` |
| `DescripcionDelErrorObligatoria` | `DatoInvalido` (`observaciones`) | `descripcion_del_error_obligatoria` |
| `PagadorObligatorio` | `DatoInvalido` (`pagador`) | `pagador_obligatorio` |
| `MovimientoAntesDeLaApertura` | `ReglaDeNegocioInfringida` | `movimiento_antes_de_la_apertura` |
| `MovimientoAntesDeLaFechaDeInicio` (P-6) | `ReglaDeNegocioInfringida` | `movimiento_antes_de_la_fecha_de_inicio` |
| `InversoDentroDeLaApertura` | `DatoInvalido` (`fecha`) | `inverso_dentro_de_la_apertura` |
| `NoSeAnulaElSaldoDelBanco` | `ReglaDeNegocioInfringida` | `no_se_anula_el_saldo_del_banco` |
| `NoSeBlanqueaUnChequeDeApertura` | `ReglaDeNegocioInfringida` | `no_se_blanquea_un_cheque_de_apertura` |
| `PrimeraConciliacionDeOtroMes` | `ReglaDeNegocioInfringida` | `primera_conciliacion_de_otro_mes` |
| `FechaDeInicioConSaldosDeBancos` | `ReglaDeNegocioInfringida` | `fecha_de_inicio_con_saldos_de_bancos` |

Los `check` nuevos se nombran para que `traducirErrorDeBase` dé un mensaje claro si alguno salta (no deberían: los
revisa el dominio antes).

### 7.4 Eventos

`bancos.partida_de_apertura_anulada` (§2.5, con `pagador`). Oyente nuevo: `empresas.fecha_de_inicio_por_cambiar`.
Bancos atenderá además la revisión de cierre de Empresas (§5.6) con el contrato que fije su diseño corto (§16.1); hasta
entonces, sin órdenes nuevas del mediador.

### 7.5 Configuración

Ninguna variable nueva en la parte A. Usa `bancos.cheques.meses_de_vencimiento` (aviso de antigüedad) y
`bancos.cuentas.permitir_sobregiro` (aviso). Los 30 días del depósito viejo son una constante del dominio (el contador
dio el plazo; ver §17 si se quiere configurable).

## 8. API y Excel

### 8.1 Rutas (reemplazan las de `/bancos/saldos-iniciales`)

| Método y ruta | Permiso | Respuesta |
|---|---|---|
| `GET /bancos/saldos-iniciales` | `.ver` | `SaldosInicialesDto` |
| `GET /bancos/saldos-iniciales/:cuentaBancariaId` | `.ver` | `SaldoInicialDto` (404 si la cuenta no es de la empresa) |
| `PUT /bancos/saldos-iniciales/:cuentaBancariaId` | `.crear` si no existe, `.editar` si existe (la ruta exige uno de los dos y el caso de uso el que corresponde) | Cuerpo `{ saldoSegunEstadoDeCuenta, saldoSegunLibrosAnteriores?, observaciones? }`; devuelve `SaldoInicialDto` y `avisos` |
| `DELETE /bancos/saldos-iniciales/:cuentaBancariaId` | `.eliminar` | Cuerpo `{ motivo }`; 204 |
| `POST /bancos/saldos-iniciales/:cuentaBancariaId/partidas` | `.crear` | Cuerpo `{ parte, fecha, monto, sentido?, conceptoId?, serie?, numeroDeCheque?, beneficiario?, referencia?, observaciones? }`; `sentido` (`credito`/`debito`) solo en `error_del_banco`; `conceptoId` solo en `cheque_posfechado`; serie y número solo en cheques. Devuelve la partida y `avisos` |
| `PUT /bancos/saldos-iniciales/:cuentaBancariaId/partidas/:movimientoId` | `.editar` | Igual |
| `DELETE /bancos/saldos-iniciales/:cuentaBancariaId/partidas/:movimientoId` | `.eliminar` | `{ motivo }`; 204 |
| `POST /bancos/saldos-iniciales/:cuentaBancariaId/partidas/:movimientoId/anular` | `.anular` | `{ motivo, fecha, pagador? }` (`pagador` en el depósito en tránsito, §2.5 punto 6). El posfechado no se anula aquí (§5.3) |
| `GET /bancos/saldos-iniciales/revision-de-cierre` | `.ver` | Los hallazgos de §5.6 (lo que la pantalla muestra y lo que usará Empresas) |
| Evidencia (BS-9): `PUT`, `GET` y `DELETE /bancos/saldos-iniciales/:cuentaBancariaId/evidencia` | `.editar` (subir y quitar, con la carga abierta), `.ver` (abrir) | Como el estado de cuenta de H2b |

`saldoSegunEstadoDeCuenta` puede ser negativo (texto con dos decimales; el signo decide crédito o débito y el monto se
guarda positivo). Montos con `decimalObligatorio` (400 si no caben en `numeric(14,2)`).

### 8.2 Excel (Administración: importa y exporta)

| Recurso | Columnas | Notas |
|---|---|---|
| **Saldos iniciales** (`/bancos/saldos-iniciales/exportar`, `plantilla`, `importar`) | Cuenta (por nombre), Saldo según estado de cuenta, Saldo de la cuenta contable en los libros anteriores, Observaciones | Exportar trae también fecha de corte, totales por clase (errores del banco incluidos), saldo en libros, diferencia y si tiene evidencia (el cuadre), y al pie Bancos y Sobregiros por separado. Importar solo crea (cuentas sin saldo inicial). La evidencia no va en Excel |
| **Partidas de apertura** (`/bancos/saldos-iniciales/partidas/exportar`, `plantilla`, `importar`) | Cuenta, Clase (Cheque en circulación, Depósito en tránsito, Débito en tránsito, Error del banco que suma, Error del banco que resta, Cheque posfechado), Fecha, Serie, Número de cheque, Beneficiario u origen, Concepto (por nombre; solo el posfechado), Referencia, Monto, Observaciones | Exige la cabecera de la cuenta (la hoja de instrucciones dice el orden, que solo van cheques **entregados** y que el posfechado lleva fecha posterior al corte). Todo o nada, ensayo, 5,000 filas, como siempre; los avisos (antigüedad, depósito viejo) salen en el resultado del ensayo sin impedir la importación |

El Excel viejo (Tipo, Fecha, Monto…) desaparece: la plantilla nueva lo reemplaza.

## 9. Cliente

### 9.1 Pantalla «Saldos iniciales» (Administración de Bancos)

- Ruta `/bancos/saldos-iniciales` (menú Administración, ícono `Landmark` o el que use el generador; permiso `.ver`).
- Encabezado con la fecha de inicio, la fecha de corte y el estado de la carga («Abierta» o «Cerrada: solo lectura»).
- Lista de **todas** las cuentas (`TarjetaDeRegistro`) con su cuadre: saldo del estado de cuenta, + depósitos, −
  cheques, − débitos, = saldo en libros, saldo anterior transcrito, diferencia (verde o rojo) o «Sin saldo inicial» (con
  el texto «Si la cuenta se abrió después de la fecha de inicio, no lleva saldo inicial»), ± errores del banco cuando
  los hay. Al pie, **Bancos** y **Sobregiros bancarios** por separado (sin total neto). Un recuadro «Antes de cerrar la
  carga» con los hallazgos de §5.6 (los que pedirán motivo, en rojo; los avisos, en ámbar).
- Dos `AccionesDeIntercambio` con `nombre` («saldos iniciales» y «partidas de apertura»).
- **Ficha por cuenta** (`/bancos/saldos-iniciales/:cuentaBancariaId`): la fórmula del cuadre en grande, la ventana del
  saldo del banco (`CamposDeSaldoInicial` rehecho, con el rótulo «Saldo de la cuenta contable en los libros
  anteriores» para el dato transcrito), cuatro grupos de partidas (cheques en circulación, depósitos, débitos, errores
  del banco) con «Agregar», «Corregir», «Eliminar» y «Anular» según el servidor, y un quinto grupo aparte, fuera de la
  fórmula: «Cheques posfechados entregados antes del corte» (agregar, corregir y eliminar con la carga abierta);
  insignias «Conciliado mm/aaaa», «Anulado», «Antiguo» y «Revisar». Textos de ayuda: «solo cheques entregados» (§2.3) y
  notas del banco descubiertas después (§5.2). Desde BS-9, el adjunto de la evidencia («Último estado de cuenta o última
  conciliación del sistema anterior, opcional»).
- Avisos del servidor (cheque antiguo con la variable y el art. 508, depósito viejo, saldo negativo sin sobregiro, no
  cuadra) con `usarAvisos`.
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
  banco; el grupo «Cheques con fecha posterior (posfechados)» con su aviso y la partida «Cheques cobrados antes de su
  fecha» en el documento y su impresión (§2.6).

### 9.3 Lógica pura con pruebas

`cuadre-de-saldo-inicial.ts` (fórmula en centavos, solo para mostrar: el servidor manda los totales),
`edicion-de-partida.ts` (formulario ↔ API; la serie y el número solo en cheques, el sentido solo en el error del banco,
el concepto solo en el posfechado), `textos-de-apertura.ts`.

### 9.4 Encaje de CP4-B3 (cliente de Bancos para los pagos) y del trabajo en curso

CP4-B3 (`diseno-cp4-pagos.md` §11, paso 4) se parte en dos para no esperar a la conciliación:

| Paso | Contenido | Va después de |
|---|---|---|
| **CP4-B3a** (cliente, fuera de la conciliación) | Casilla «Para Cuentas por pagar» al registrar una nota de débito (con el módulo activo), «Marcar» y «Desmarcar» (con `VentanaDeMotivo`) según `puedeMarcar`/`puedeDesmarcar`, etiqueta de nota marcada, **desglose** en la tarjeta y en el reporte, «Origen: Cuentas por pagar, pago N» (enlace a `/cuentas-por-pagar/pagos/:id` cuando exista esa ruta, CP4-10; antes, texto), acciones ocultas según `puedeCorregir`/`puedeEliminar`/`puedeBlanquear`, avisos de la respuesta de emitir cheque (fondos del posfechado), mensajes de `ModuloDeOrigenInactivo` y `MovimientoDeOtroModulo` | Ya se puede (CP4-B2a en `main`); **no toca** `ConciliarCuenta.vue` ni `AccionesDeConciliacion.vue`. Antes de BS-6 (comparten tarjetas de cheques y notas) |
| **CP4-B3b** (cliente, en la conciliación) | Lista de notas marcadas sin aplicar del mes en la conciliación, con «Desmarcar» y el rechazo si están ligadas | H2 paso 5 y CP4-B2b en `main` |

## 10. Reportes (parte C)

| Reporte | Contenido | Ruta y permisos | Excel e impresión |
|---|---|---|---|
| **Saldos por cuenta** (a una fecha de corte) | Por cuenta: saldo en libros a la fecha; cheques posfechados emitidos con fecha posterior (comprometido); **disponible después de posfechados** = libros − posfechados (C-8), **sin** sumar ningún sobregiro autorizado; cheques en circulación, depósitos, débitos y errores del banco en tránsito a la fecha (incluye la apertura); saldo que debería mostrar el banco; última conciliación autorizada (mes) y si la cuenta está atrasada. Totales **sin compensar** (cambio 5): **Bancos** (cuentas con saldo en libros positivo) y **Sobregiros bancarios** (negativas, en valor absoluto), cada uno con su disponible; una cuenta con disponible negativo se marca «Fondos insuficientes para los posfechados». Nota al pie: «El disponible no incluye fondos retenidos por el banco (depósitos de cheques de otros bancos aún en reserva) ni el sobregiro autorizado.» Detalle desplegable de las partidas en tránsito | `GET /api/bancos/saldos-por-cuenta?fecha=&cuentaBancariaId=`; permisos **nuevos** `bancos.saldos-por-cuenta.ver` y `.exportar` (la migración de su paso los da a quien tiene `bancos.movimientos.ver`/`.exportar`) | Imprimir y exportar |
| **Estado de cuenta** por cuenta | El reporte de Movimientos con la cuenta **obligatoria**, en formato de documento: encabezado (empresa, banco, cuenta, rango), saldo anterior, movimientos con número, concepto, débito, crédito, saldo y **«Conciliado en mm/aaaa»**, totales por tipo y saldo final. Leyenda fija en el encabezado y en la impresión (P-11, contador): «Documento interno, no sustituye el estado de cuenta del banco» | Reutiliza `GET /bancos/movimientos/reporte` (gana `conciliadoEn` por fila) y `bancos.movimientos.ver`/`.exportar`; página nueva `/bancos/estado-de-cuenta` | Imprimir y exportar |
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
- **Sin aprobación** las notas de débito que **solo registran un cargo que el banco ya hizo** (comisiones, impuestos,
  cargos por cheque rechazado; C-9 y cambio 10): no son una decisión de pago. El diseño corto define cómo se reconocen
  (recomendado: por el concepto, con una marca `requiere_aprobacion` en los conceptos de egreso, o una lista de claves
  de sistema exentas).
- **Cuentas por pagar**: recomendado que sus órdenes **no** pasen por esta aprobación (ya separa registrar, autorizar y
  pagar, CP4-j); **decidido así** (P-13), siempre que allí quien autoriza no sea quien registra el pago (C-9).

### 11.2 Formato de impresión de cheques y voucher (y «cheque impreso»)

- **Capas**: formatos **de fábrica** en código (`dominio/formatos-de-cheque/`, uno por banco y modelo, medidos sobre
  cheques reales) → **formato de la cuenta suscriptora** (`bancos.formatos_de_cheque`, `cuenta_id` con
  `politicaPorCuenta()`, `base` = clave de fábrica y solo los campos que movió, en `jsonb` validado con Zod: posición
  `x_mm`, `y_mm`, ancho, tamaño de letra, alineación, más un desplazamiento general para calibrar la impresora) →
  **chequera** (`chequeras.formato_id` o la clave de fábrica). Gana la más específica.
- Campos: fecha (lugar y fecha), beneficiario, monto en números, **monto en letras** (función pura en el core; formato
  dado por el contador, C-11 y cambio 11: en mayúsculas, «… QUETZALES CON 25/100», con relleno de asteriscos o guiones
  hasta el final de la línea para que no se pueda agregar nada; vale lo escrito en letras, C. Com. art. 388, así que las
  pruebas son **exhaustivas**: 0.01, 1, 1.00, 15, 16, 21, 100, 101, 1000, 1001, 1,000,000, 2,000,000, el máximo de
  `numeric(14,2)`, centavos 00 y 99, y ninguna diferencia entre la cifra y las letras), «No negociable», y el **voucher** (comprobante de egreso): cuenta, cheque, beneficiario, monto,
  concepto, observaciones, documentos que paga (Cuentas por pagar lo aporta por una orden suya, opcional si el módulo no
  está activo) y firmas (elaboró, revisó, autorizó, recibió).
- Impresión en el **navegador** con CSS en milímetros (`@page`), como los demás documentos; sin dependencia nueva.
- **Cheque impreso**: `cheques.impreso_en` y `impresiones`; reimprimir con permiso `bancos.cheques.reimprimir` y
  auditoría; **no se blanquea un cheque impreso** (cierra el `TODO` de `Cheque.blanquear`). «Entregado» queda fuera
  (P-14); se anota para más adelante (el contador lo ve útil: el cheque en circulación es el entregado, §2.3).
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

## 12. Lo que validó `contador-guatemala` (C-1 a C-11)

Dictamen completo: `dictamen-bancos-segunda-parte-2026-11-16.md` («correcto con ajustes»). Resumen de cómo quedó cada
punto en el diseño:

| # | Pregunta | Respuesta y dónde quedó |
|---|---|---|
| C-1 | Composición del saldo inicial | Correcta; las notas no registradas se ajustan antes del corte. **Más `error_del_banco`** (§2, §3.2) |
| C-2 | Corte el día anterior; mitad de mes | Correcto; se acepta mitad de mes, se recomienda día 1 (mejor 1 de enero): aviso en Empresas sin bloquear (§16.1) |
| C-3 | Cheque de apertura anulado | Debe Bancos / Haber Proveedores o Acreedores varios; plazos de prescripción; `anulacion_de_apertura` sin flujo correcto; opción C (§2.5, §16.2) |
| C-4 | Depósito en tránsito rechazado | Debe Cuentas por cobrar / Haber Bancos; comisión aparte; pedir el pagador (§2.5 punto 6) |
| C-5 | Posfechado entregado antes del corte | No es partida de apertura. Cobrado antes de su fecha: candidato (§2.6). De chequera no registrada: desde Saldos iniciales (§2, §2.3) |
| C-6 | Cheques de más de seis meses | Trato de caducos, aviso con la variable y el art. 508 (§5.1) |
| C-7 | ¿Bloquear el cierre si no cuadra? | No: confirmación con motivo y auditoría (§5.6, §16.1) |
| C-8 | «Disponible» | Correcto; sobregiro autorizado aparte; no compensar; aclarar fondos retenidos (§10) |
| C-9 | Aprobaciones | Buena práctica; monto mínimo y aprobador distinto; no para cargos del banco; CP4 no pasa dos veces (§11.1) |
| C-10 | Tarjeta y diferencial | Tarjeta: pasivo, no efectivo (revisar Decreto 2-2024 y bancarización en su diseño). Diferencial al cierre a resultados, no realizado sin efecto en ISR, tipo de cambio de Banguat (§11.3, §11.8) |
| C-11 | Monto en letras | «… QUETZALES CON 25/100», mayúsculas, relleno; pruebas exhaustivas (§11.2) |

## 13. Preguntas para el usuario — **respondidas** (2026-11-16)

El usuario aceptó todas como se recomendaban, con los matices del contador:

| # | Pregunta | Respuesta |
|---|---|---|
| P-1 | Transcribir el saldo de los libros anteriores | **Sí, opcional**: el saldo **de la cuenta contable**; «sin dato» si falta (§2.1) |
| P-2 | Fecha de corte fija = día anterior a la fecha de inicio | **Sí**, con aviso en Empresas si la fecha de inicio no es día 1 (§16.1) |
| P-3 | Chequera de apertura automática y reutilizar el número disponible de una chequera registrada | **Sí**, más el posfechado de chequera no registrada en la chequera de apertura, con su fecha real y la carga abierta (§2.3) |
| P-4 | Cambiar la fecha de inicio con saldos de Bancos con partidas | **Rechazar** hasta eliminarlos (§5.4) |
| P-5 | Primera conciliación del mes de la fecha de inicio; en las demás, propuesta del servidor | **Sí y sí** (§2.4, §6.5) |
| P-6 | Rechazar movimientos nuevos anteriores a la fecha de inicio | **Sí**, con ayuda sobre notas descubiertas después (§5.2) |
| P-7 | Cheque de apertura anulado | **Opción C** (CP-AP) y la A mientras tanto (§2.5) |
| P-8 | Saldos existentes como «sin partidas (de antes)», separables | **Sí** (§4.4) |
| P-9 | Sobregiro en la apertura exento, con aviso | **Sí**; sobregiro como pasivo, sin compensar (§2.2, §10) |
| P-10 | Cuadre que no cuadra | **Aviso**, y al cerrar la carga, confirmación con motivo (§5.6) |
| P-11 | Estado de cuenta sobre el reporte de Movimientos | **Sí**, con la leyenda «Documento interno…» (§10) |
| P-12 | Orden | **Así** (§14) |
| P-13 | Aprobaciones en tabla aparte, monto mínimo, sin los pagos de Cuentas por pagar | **Sí**, sin las notas de cargos del banco (§11.1) |
| P-14 | Impresión en capas, en el navegador, sin Excel, «impreso» para blanquear | **Sí**; «entregado» más adelante (§11.2) |
| P-15 | Evidencia de la apertura | **Sí, opcional, con aviso** al cerrar la carga si falta (§3.1, §5.6, BS-9) |

## 14. Pasos (un commit cada uno; servidor y cliente por separado)

Cada commit corre `npm run revisar` y sus pruebas y actualiza la bitácora de `PLAN.md`. Servidor con
`programador-backend`, cliente con `programador-frontend`, QA con `pruebas-qa`. Estado de lo que corre a la vez,
revisado contra `main` `69e0918` (2026-11-16): **H2 paso 5** y **CP4-B2b** programando, sin commits fuera de `main` ni
migración; **CP4-B3a** sin empezar.

| Paso | Contenido | Va después de |
|---|---|---|
| **BS-1** (servidor, datos) | Migración `0034_saldos_iniciales_con_partidas` (§3, §4): tabla `saldos_iniciales` con `evidencia_archivo_id`; columnas de `movimientos` con las siete partes (`error_del_banco` y `cheque_posfechado` incluidas) y sus dos checks; `chequeras.de_apertura`; `conciliaciones.foto_total_cobrados_antes_de_su_fecha`; índices; concepto `anulacion_de_apertura`; relleno; permisos `.ver` y `.anular`; `*.tablas.ts`; `CONCEPTOS_DE_SISTEMA`. **Pruebas:** cada check (parte y tipo de las siete partes; apertura completa: posfechado con `saldo_inicial = true` falla, partida sin cabecera falla), único del saldo principal (dos `saldo_del_banco` fallan; varias partidas pasan), chequera de apertura activa (falla), evidencia repetida en dos cabeceras (falla), relleno sobre datos sembrados (global, conciliaciones y fotos intactas, saldos iguales antes y después), repetible, RLS, `politicas-de-los-modulos` | Nadie más generando migraciones de Bancos: H2 paso 5 y CP4-B2b no traen migración, así que **puede empezar ya**; si alguno uniera una, BS-1 toma la siguiente libre |
| **BS-2** (servidor, saldos iniciales) | Puertos y casos de uso de §6.1–§6.3, reglas de §5.1 (con error del banco, posfechado, textos y avisos de los cambios 2 a 4), chequera de apertura (§2.3), Bancos y Sobregiros (§2.2), revisión de cierre (§5.6, caso de uso y `GET …/revision-de-cierre`), rutas y Excel (§8), auditoría, oyente de §5.4, retiro de las rutas viejas. **Pruebas:** sin fecha de inicio, carga cerrada (también para el posfechado), partida después del corte, posfechado no posterior, error del banco sin descripción y con los dos sentidos (cuadre), cuenta con movimientos anteriores, partida sin cabecera, cheque en chequera registrada disponible (pasa) y emitido (rechazo), chequera nueva traslapada con la de apertura (rechazo), eliminar cabecera con partidas y posfechados (auditoría con todo), convertir un global (y rechazo con movimientos anteriores), cuadre y diferencia, posfechado fuera del cuadre y en el flujo en su fecha con su concepto, totales Bancos y Sobregiros con una cuenta negativa, aviso de antigüedad con la variable cambiada (p. ej. 6), depósito de 31 días (aviso) y de 30 (sin aviso), sobregiro exento con aviso, hallazgos de cierre (los cinco), cambio de fecha de inicio rechazado, Excel de los dos recursos (las seis clases, ensayo con avisos, errores por fila), permisos 403 | BS-1 |
| **BS-3** (servidor, reglas transversales) | §5.2 (movimiento antes de la apertura y antes de la fecha de inicio, P-6, también en las órdenes de otros módulos; ayuda en el mensaje), §5.3 (anular con inverso siempre y concepto `anulacion_de_apertura`, fecha después del corte, pagador del depósito, sin blanquear; posfechado anulado como cheque normal), `OrigenDeCheque = 'apertura'` en caducos y lote, `parteDeApertura` en los DTO, evento con `pagador`. **Pruebas:** anular cheque de apertura con mes abierto (inverso igual), en lote, inverso antes del corte (rechazo), flujo de efectivo con el inverso en «sin actividad» y el control cuadrado, depósito en tránsito anulado (sin pagador: rechazo; con pagador: en el inverso y el evento), error del banco anulado, posfechado anulado con la carga cerrada (a la antigua), blanquear (rechazo), nota normal antes del corte (rechazo) | BS-2 |
| **BS-4** (servidor, conciliación) | §2.4, §2.6, §6.4 y §6.5: primera conciliación con saldo del banco, candidatos sin `saldo_del_banco`, **cheques cobrados antes de su fecha** (candidatos, partida que resta, foto), `deApertura`, `saldoInicialDelBancoDeLaApertura`, `periodoSiguiente`. **Pruebas:** identidad banco = estado de cuenta con todo marcado (corte fin de mes y a mitad de mes), error del banco marcado al corregirse, primera de otro mes (rechazo), cheque de apertura cobrado en febrero sigue en circulación en enero, posfechado de febrero cobrado en enero (marcado: cuadra y no es candidato en febrero; sin marcar: no es partida), conciliación con saldo global sin cambios, documento y foto de un mes autorizado antes de la `0034` sin cambios | BS-3 y **CP4-B2b en `main`** (toca el mismo código de conciliación) |
| **CP4-B3a** (cliente) | §9.4 | Ya se puede (sin empezar al 2026-11-16); antes de BS-6 |
| **BS-5** (cliente, pantalla) | §9.1 y §9.3 (sin la evidencia); menú; ficha de la cuenta con resumen; limpieza | BS-2 (y BS-3 para anular) |
| **BS-6** (cliente, otras pantallas) | §9.2 salvo la conciliación | BS-3, CP4-B3a |
| **CP4-B3b** (cliente) | §9.4 | H2 paso 5 y CP4-B2b |
| **BS-7** (cliente, conciliación) | Partidas «De la carga inicial», rótulo del saldo inicial del banco, grupo de posfechados y partida «Cheques cobrados antes de su fecha» (pantalla e impresión), `periodoSiguiente` en `ListaDeConciliaciones` | BS-4, H2 paso 5 y CP4-B3b (toca `ConciliarCuenta.vue`) |
| **BS-8** (QA) | Empresa con fecha de inicio el 1 de enero: dos cuentas, una con 3 cheques en circulación (uno de 8 meses), un depósito en tránsito de 40 días, un error del banco, un posfechado de febrero de una chequera no registrada y Excel de partidas; otra abierta en febrero sin saldo inicial; una tercera sobregirada (Sobregiros aparte); cuadre con y sin dato; hallazgos antes de cerrar; cerrar la carga e intentar corregir; primera conciliación de enero (saldo del banco rotulado, cheques cobrados marcados, uno queda, el posfechado cobrado en enero); anular el viejo en febrero (nota de crédito, flujo sin actividad); intentar cambiar la fecha de inicio; permisos; celular | BS-7 |
  Hallazgos de la QA (`informe-qa-bancos-carga-inicial-2026-11-19.md`) corregidos: BS8-1 a BS8-7 y las observaciones menores de pantalla (excepto las dos anotadas en la bitácora).
| **BS-9** (servidor y cliente, evidencia) | Subir, abrir y quitar la evidencia de la apertura (§3.1, §8.1), reutilizando el adjunto de H2b; el hallazgo `sin_evidencia` deja de salir al subirla. Dos commits (servidor y cliente). **Pruebas:** como las del estado de cuenta de H2b (tipos, topes, qpdf, auditoría `quitar`), carga cerrada (rechazo), 403 | **QA de H2 (paso 7)** y BS-5 |
| **BS-R1** (servidor) | Saldos por cuenta (Bancos y Sobregiros, disponible sin sobregiro, nota de fondos retenidos) y `conciliadoEn` en el reporte de movimientos (§10), permisos y su migración (`0035`, o la siguiente libre). **Pruebas:** a una fecha con posfechados, partidas en tránsito a la fecha (también de apertura y errores del banco), cuenta atrasada, cuenta negativa fuera del total de Bancos, Excel, 403, rendimiento | BS-3 |
| **BS-R2** (cliente) | Páginas «Saldos por cuenta» y «Estado de cuenta» (imprimir y exportar; leyenda «Documento interno…») | BS-R1 |
| **EM-1** (Empresas, servidor y cliente) | Aviso si la fecha de inicio no es día 1 (§16.1) | Ya se puede; no toca Bancos |
| **EM-2** (Empresas, diseño corto y luego servidor y cliente) | Cierre de la carga con revisión de los módulos, motivo y auditoría (§16.1) | Diseño corto aprobado y BS-2 (Bancos aporta su revisión) |
| D y CP-AP | Diseños cortos (§11, §2.5, §16.2) con el usuario y el contador | CP-AP después de CP4-12 |

Orden recomendado (P-12): **BS-1 → BS-2 → BS-3**, con **CP4-B3a** y **EM-1** en paralelo; **BS-4** en cuanto CP4-B2b
esté en `main`; **BS-5 → BS-6**; **CP4-B3b → BS-7** cuando H2 paso 5 esté en `main`; **BS-8** (QA); **BS-R1 → BS-R2**
(pueden empezar después de BS-3, en paralelo con el cliente); **BS-9** después de la QA de H2; **EM-2** cuando su
diseño corto esté aprobado; después aprobaciones e impresión (diseños cortos), foto del comprobante y beneficiario
desde Terceros, alcance por cuenta, y la tarjeta después de Multimoneda.

`DONDE-QUEDAMOS.md` y `bancos.md` se actualizan al unir cada paso (lo hace el coordinador).

## 15. Convivencia y riesgos

1. **Trabajo en paralelo.** H2 paso 5 y CP4-B2b tocan la conciliación: BS-4, BS-7 y CP4-B3b van después. BS-1 a BS-3,
   BS-5, BS-6 y CP4-B3a no tocan `ConciliarCuenta.vue` ni `AccionesDeConciliacion.vue`. La `0034` se genera con nadie
   más generando migraciones de Bancos.
2. **Rutas que cambian.** `/bancos/saldos-iniciales` cambia de forma en BS-2; el cliente viejo deja de funcionar hasta
   BS-5. Si hace falta no romper `main` entre los dos, BS-2 conserva el `GET` viejo hasta BS-5 (el coordinador decide).
3. **Cuentas por pagar.** Sus órdenes a Bancos (cheque, nota) pasan por la regla de §5.2: un pago con fecha `<=` corte se
   rechaza en Bancos; Cuentas por pagar ya exige la fecha de inicio como mínima (CP4 §5.1), así que no debería pasar.
   El **posfechado de apertura** es un cheque de Bancos sin origen: la factura que paga sigue en el saldo inicial de
   Cuentas por pagar y hoy no hay forma de ligarlos (ver §17, N-2).
4. **Orden de bloqueo**: Empresas (carga) → cuenta bancaria → cabecera → chequera y movimientos. No invierte el de CP4.
5. **Flujo de efectivo.** Las partidas de apertura con fecha anterior al rango no entran; las del rango salen como
   «saldos iniciales del rango» en el control (como hoy el saldo global). El posfechado sale en su fecha con su concepto.
6. **Caducos.** Los cheques de apertura entran al reporte y al lote; el lote sigue todo o nada.
7. **Datos de desarrollo.** La cuenta con saldo del 2026-09-01 y movimientos de septiembre queda «global» y no se separa
   en partidas sin resolver esos movimientos: es el caso que la QA debe ver explicado.
8. **Textos legales** (cambio 12). Los artículos del Código de Comercio (Decreto 2-70) que salen en avisos y ayudas (501,
   508, 410, 513, 388) se citaron con fuentes secundarias (certeza media-alta; 410 y 388, media). Antes de unir el
   **cliente** que los muestra (BS-5, BS-6, BS-7 y CP-AP), el coordinador pide a `contador-guatemala` cotejarlos con el
   texto oficial. Mientras tanto quedan en un solo lugar por lado (`textos-de-apertura.ts` en el cliente y los mensajes
   de `errores-de-apertura.ts` en el servidor) para cambiarlos sin buscar.

## 16. Cambios que van fuera de Bancos

### 16.1 Empresas

- **EM-1. Aviso si la fecha de inicio no es día 1** (cambio 8, C-2). Al registrar o cambiar la fecha de inicio, si no es
  el día 1 de un mes, la respuesta trae un aviso y el formulario lo muestra antes de guardar (lógica pura con pruebas en
  el cliente): «La fecha de inicio no es el primer día de un mes. Se puede, pero conviene empezar el día 1 (mejor el 1 de
  enero, inicio del período fiscal): así los saldos iniciales cuadran con un estado de cuenta y un cierre de mes
  completos.» No bloquea. Sin migración.
- **EM-2. Cierre de la carga con revisión, motivo y auditoría** (cambio 7, C-7, P-15). Hoy `CerrarCargaInicial` cierra sin
  preguntar a nadie. Debe: (1) pedir a cada módulo activo con saldos iniciales sus hallazgos (Bancos: §5.6; Cuentas por
  pagar: su cuadre de saldos iniciales, que ya existe); (2) mostrarlos en una ventana de confirmación; (3) si alguno «pide
  motivo», exigir un motivo de 1–500 caracteres; (4) cerrar y **auditar** el cierre (`accion = 'cerrar'`, recurso
  `empresas.carga-inicial`, con el motivo y los hallazgos en el registro), como ya se audita reabrir. Lo que falta decidir
  en su diseño corto es **cómo junta Empresas las revisiones**, porque hoy el mediador solo tiene órdenes (responde un
  solo módulo) y avisos (sin respuesta): recomendado, un **aviso con respuesta** nuevo en `core/mediador` (cada oyente
  devuelve una lista y el mediador las junta), en vez de una orden por módulo que Empresas tendría que conocer. Sin
  migración en Empresas si el motivo va solo en la auditoría.

### 16.2 Diseños cortos

| Diseño | Lo que debe recibir del dictamen |
|---|---|
| **CP-AP** (Cuentas por pagar, bandeja de cheques de apertura anulados; después de CP4-12) | Beneficiarios que **no son proveedores**: reconocer la deuda como «Acreedores varios» (un tercero que no es proveedor o un acreedor genérico; el diseño decide cómo, sin obligar a crear un proveedor). Texto del **plazo de la deuda de fondo** (5 años, CC art. 1508; 2 si es precio de mercadería, art. 1514; no opera sola, art. 1501; se interrumpe con el reconocimiento, art. 1506) al reconocer o descartar por prescripción, con el ingreso gravable en el régimen sobre las utilidades. «**Descartar: ya pagada**» va **contra la cuenta con que se pagó** (no contra otros ingresos): pide el medio (cuenta bancaria o caja) y la fecha. Los depósitos en tránsito rechazados quedan en la opción A hasta Cuentas por cobrar (§2.5) |
| **Aprobaciones** (§11.1) | Sin aprobación para las notas de débito que solo registran cargos del banco; monto mínimo; aprobador distinto del solicitante; los pagos de Cuentas por pagar no pasan dos veces |
| **Impresión de cheques** (§11.2) | Monto en letras «… QUETZALES CON 25/100», mayúsculas, relleno, pruebas exhaustivas (vale lo escrito en letras, art. 388) |
| **Tarjeta de crédito** (§11.3) | Pasivo financiero, no efectivo; revisar el Decreto 2-2024 y la bancarización |
| **Multimoneda** (§11.8) | Diferencial al cierre a resultados; el no realizado sin efecto en ISR; tipo de cambio de referencia del Banco de Guatemala |

## 17. Decisiones nuevas que aparecieron al incorporar el dictamen (para el usuario)

Ninguna frena BS-1 a BS-4; se anotan para el coordinador.

- **N-1. Sobregiro autorizado por cuenta.** El contador pide mostrar el sobregiro autorizado «aparte» del disponible
  (C-8), pero Arrancar no guarda un **límite** de sobregiro por cuenta (solo `bancos.cuentas.permitir_sobregiro`, sí o
  no, por empresa). Opciones: (a) no mostrarlo por ahora: el reporte dice que el disponible no lo incluye
  (**recomendado**; BS-R1 queda así); (b) columna nueva `cuentas_bancarias.limite_de_sobregiro numeric(14,2) null` y una
  columna «Sobregiro autorizado» en Saldos por cuenta (va en la migración de BS-R1). ¿(a) o (b)?
- **N-2. Posfechado de apertura y la factura que paga en Cuentas por pagar.** El posfechado de una chequera no
  registrada queda en Bancos como un cheque sin origen; la factura sigue en el saldo inicial de Cuentas por pagar y hoy
  no hay forma de darla por pagada **en la fecha del cheque** sin emitir otro cheque (C-CP4-3 quitó «ligar al saldo
  inicial de Bancos»; «aplicar a la cuenta de apertura» la da por pagada en la fecha de inicio, antes de tiempo).
  Opciones: (a) en CP-AP, una forma de pago «cheque ya entregado» que liga el pago a ese cheque de Bancos con su fecha
  (comprometido hasta entonces), por una orden nueva de Bancos (**recomendado**); (b) mientras tanto, «aplicar a la
  cuenta de apertura» con una advertencia por la diferencia de fechas; (c) no cargar en Cuentas por pagar las facturas
  pagadas con posfechado (contradice C-5 y el saldo al corte). ¿(a), y (b) mientras tanto? Conviene que lo vea también
  `contador-guatemala`.
- **N-3. Días del depósito viejo.** Fijos en 30 (lo que dio el contador) o variable de empresa e instalación
  `bancos.saldos_iniciales.dias_de_deposito_en_transito`. **Recomendado: fijos** (es un aviso; se puede volver variable
  sin migración).
- **N-4. Cómo junta Empresas las revisiones al cerrar la carga** (EM-2): aviso con respuesta en el mediador
  (**recomendado**) u órdenes por módulo. Va en el diseño corto de EM-2, con el usuario.
