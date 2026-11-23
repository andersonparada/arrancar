# Diseño de Bancos: aprobaciones, tarjeta de crédito y CP-AP — arquitecto de datos, 2026-11-18

_Agente `arquitecto-de-datos`. Base contable y fiscal: `dictamen-bancos-aprobaciones-tarjeta-2026-11-18.md`
(contador-guatemala, mismo día: «correcto con ajustes» en las tres partes). Aterriza lo que quedó como «diseño corto» en
`diseno-bancos-segunda-parte.md` §11.1 (aprobaciones), §11.3 (tarjeta de crédito), §2.5 y §16.2 (CP-AP, la bandeja de
cheques de apertura anulados) y §17 N-2 (el posfechado de apertura y la factura que paga). Lo que el arquitecto agrega o
no comparte del dictamen va marcado **[arquitecto]**._

**Estado (2026-11-19).** El usuario respondió §16: aceptó todas las recomendaciones (§17). El contador validó el diseño
(`dictamen-bancos-aprobaciones-tarjeta-validacion-2026-11-19.md`, «correcto con ajustes»; §18). Lo que cambió por esa
validación va marcado **[contador 19/11]**. Quedan abiertas las preguntas P-1 a P-5 del contador (§19): el diseño ya trae
la opción que él recomienda, marcada «(P-n)», y la tabla de pasos (§15) dice qué paso espera cada respuesta. **Primer paso
programable: AP-0** (no espera ninguna respuesta ni ningún otro paso).

Sirve a empresas de **cualquier rubro y régimen**: nada aquí supone ganado, fincas, régimen de IVA o ISR, ni que la empresa
sea agente de retención. Los avisos de retención de la tarjeta salen solo si los datos fiscales de la empresa
(`libro_de_compras.datos_fiscales_de_empresa`, que Cuentas por pagar ya lee por su `dependeDe`) dicen que debe retener.

**Ya decidido y que no se vuelve a preguntar:**

| Tema | Decisión | Fuente |
|---|---|---|
| Aprobaciones en tabla aparte | `bancos.solicitudes`; nada «por aprobar» en `movimientos`; número de cheque, correlativo y sobregiro al aprobar; aprobador distinto del solicitante; sin aprobación las notas de crédito y las notas que solo registran un cargo del banco | `diseno-bancos-segunda-parte.md` §11.1, P-13; dictamen §1.1 |
| Órdenes de módulos | Los pagos de Cuentas por pagar y la reposición de Caja chica **no** pasan por la solicitud de Bancos | P-13, CC-j |
| Tarjeta después de Multimoneda | La tarjeta se programa después de que Multimoneda tenga la moneda de la cuenta (`cuentas_bancarias.moneda`) | §11.3; dictamen Q-T1 |
| Cheque de apertura anulado | Bancos lo anula siempre con inverso, concepto `anulacion_de_apertura` y evento `bancos.partida_de_apertura_anulada`; Cuentas por pagar tiene la **bandeja** (opción C) | §2.5, P-7, BS-3 |
| Cheque entregado antes del corte | Ya pagó la factura: no va en el saldo inicial de Cuentas por pagar | C-CP4-3 |
| Posfechado entregado antes del corte | Es un cheque de Bancos sin origen en su fecha real (parte `cheque_posfechado`, no es saldo inicial); la factura **sí** va en el saldo inicial de Cuentas por pagar | §2, C-5 |
| Cierre de la carga | Cada módulo responde `empresas.revisar_cierre_de_carga` (`mediador.preguntarATodos`, ya en `main`) | `diseno-em2-cierre-de-la-carga.md` |
| Firmas del comprobante de egreso | Elaboró, Revisó, Autorizó y Recibí conforme | `diseno-impresion-de-cheques.md` P-9 |

## 0. La propuesta en una página

Tres partes independientes, que se programan en este orden (§15):

| Parte | Qué | Módulos | Depende de |
|---|---|---|---|
| **AP** (CP-AP y N-2) | (1) Forma de pago `cheque_de_apertura` en Cuentas por pagar: liga el pago de facturas del saldo inicial al **posfechado de apertura** que ya está en Bancos, con la fecha del cheque, y cambia su concepto para no duplicar el gasto; desligar con motivo. (2) **Bandeja** de cheques en circulación de apertura anulados: reconocer la deuda (cargo nuevo fuera del Libro) o descartarla con causa. (3) Referencia informativa del pago «cuenta de apertura» al cheque de apertura | Cuentas por pagar (tablas), Bancos (cuatro órdenes, sin migración) | BS-3 y CP4-12 en `main` |
| **AB** (aprobaciones) | Solicitar → aprobar para cheques, notas de débito y transferencias, con **niveles** (1 o 2 aprobadores distintos), **acumulado** por beneficiario y día, referencia del banco después de aprobar; y la regla «quien autorizó no paga» en Cuentas por pagar y Caja chica cuando la aprobación está encendida | Bancos (tablas), Cuentas por pagar y Caja chica (reglas, sin migración) | IC-1 (impresión) para la firma «Autorizó» |
| **TC** (tarjeta de crédito) | Tipo de cuenta `tarjeta_de_credito` (pasivo), cortes del estado de cuenta, **conciliación por corte**, compras en cuotas, conceptos del pago de la tarjeta, fuera del flujo de efectivo, forma de pago `tarjeta` en Cuentas por pagar | Bancos (tablas), Cuentas por pagar (forma) | Multimoneda en Bancos (MM-B) |

Ninguna parte crea un módulo. Ningún módulo importa a otro: Cuentas por pagar y Caja chica ya leen `bancos.*` desde su
`infraestructura` (su `dependeDe` incluye `bancos`) y piden a Bancos por el mediador; Bancos (`dependeDe: []`) no lee a
nadie y responde órdenes.

## 1. Lo encontrado en el código y la base (verificado contra `main` `73d277da`, 2026-11-18)

1. **Bancos.** Migración más alta en `main`: `0034_saldos_iniciales_con_partidas`. En curso o en cola: BS-R1 (`0035`),
   impresión de cheques IC-1 (siguiente libre), Caja chica CCL-B1 (planeada como `0035`, tomará la siguiente libre) y
   Multimoneda (después de BS-9). Todas las de este diseño toman **la siguiente libre al programar**; nunca dos ramas
   generando migraciones de Bancos a la vez.
2. **`bancos.cuentas_bancarias.tipo`** es `text` sin check en la base (`'monetaria' | 'ahorro'` solo en TypeScript y Zod).
   En desarrollo: una monetaria y una de ahorro.
3. **`bancos.transferencias`** son **solo entre cuentas propias** de la empresa (`transferencias_cuentas_distintas`; las dos
   notas llevan el concepto de sistema `transferencia`, sin flujo). Una transferencia a un tercero (banca electrónica) se
   registra hoy como **nota de débito** (a mano o por la orden `registrar_nota_de_origen` de Cuentas por pagar). Esto
   importa para las aprobaciones: «aprobar transferencias» en Arrancar es aprobar movimientos **entre cuentas propias**
   (§3.1, Q-A5) **[arquitecto]**.
4. **`bancos.conceptos`** ya tiene `es_cargo_bancario` (comisiones, intereses, cheque rechazado), `clave_de_sistema` y la
   llave `(id, empresa_id)`. Conceptos de sistema: `transferencia`, `pago_a_proveedor`, `pago_a_proveedor_de_activo`,
   `reintegro_de_proveedor*`, `efectivo_para_pagos`, `devolucion_de_efectivo_para_pagos`, `faltante_de_efectivo`,
   `saldo_inicial`, `anulacion_de_apertura`, `sin_clasificar`.
5. **`bancos.movimientos`**: `modulo_de_origen` y `documento_de_origen_id` (juntos o ninguno, sin llave), `parte_de_apertura`
   con siete partes (entre ellas `cheque_posfechado`, que cuelga de la cabecera pero no es saldo inicial),
   `beneficiario_para_comparar` (generada) con índice `(empresa_id, beneficiario_para_comparar, fecha)`. El índice sirve
   tal cual para el acumulado por beneficiario (§3.4).
6. **`bancos.conciliaciones`** es por `(cuenta_bancaria_id, anio, mes)` único, con la foto al autorizar,
   `saldo_estado_de_cuenta` transcrito y `estado_de_cuenta_archivo_id`. La regla «mes conciliado» de los movimientos
   compara con el fin del último mes autorizado.
7. **`cuentas_por_pagar.pagos`**: `forma in ('cheque', 'nota_de_debito', 'nota_ligada', 'cuenta_de_apertura', 'efectivo')`;
   `movimiento_id` con FK a `bancos.movimientos`; único `pagos_movimiento_creado_unico (movimiento_id) where forma in
   ('cheque', 'nota_de_debito')` **sin filtrar por estado** (un cheque no se reusa). Cero pagos en desarrollo.
8. **`cuentas_por_pagar.documentos`**: `origen in ('libro_de_compras', 'saldo_inicial')`; `autorizado_por` y
   `autorizacion_propia` (la excepción con `documentos.autorizar-propios`, auditada como `autorizar`). Es decir, CP ya separa
   **registrar** de **autorizar**; lo que falta (A-1) es separar **autorizar** de **pagar**.
9. **Caja chica** no tiene paso de «aprobar la liquidación»: la reposición es un paso (CC-j) y la única separación es CC-k
   (`caja-chica.control.separacion_de_funciones`, `avisar` por omisión: el custodio no debería reponer su propio fondo).
   **Cuentas por liquidar** entrega anticipos por la misma orden de Bancos sin ningún paso de aprobación **[arquitecto: el
   dictamen no lo menciona; §3.8, Q-A6]**.
10. **Mediador**: órdenes, avisos y `preguntarATodos` (`PreguntasEntreModulos`) en `main`; Bancos ya responde
    `empresas.revisar_cierre_de_carga` (`dominio/hallazgos-de-cierre.ts`).
11. **Auditoría**: acciones `anular`, `corregir`, `ajustar`, `descartar`, `autorizar`… (`AccionAuditada`); no hace falta una
    acción nueva.

## 2. Parte AP: el posfechado de apertura y la bandeja de cheques anulados

### 2.1 Modelo

| Caso | Qué hay al corte | Qué hace Arrancar |
|---|---|---|
| Cheque **en circulación** de apertura (fecha ≤ corte, entregado) | La factura ya está pagada (no va en el saldo inicial de CP); el cheque es partida de apertura | Nada que ligar. Si se anula: inverso + evento → **bandeja** (§2.5) |
| Cheque **posfechado** entregado antes del corte (fecha > corte) | La factura **sí** se debe al corte (saldo inicial de CP); el cheque es un movimiento normal de Bancos sin origen, en su fecha | Forma `cheque_de_apertura` (§2.3): liga el pago a ese cheque; **comprometido** hasta la fecha del cheque, **pagado** en ella |
| La factura se cargó por error en el saldo inicial y se aplicó a la cuenta de apertura | — | Referencia **informativa** opcional al cheque de apertura (§2.4) para que la bandeja la proponga |

La opción (b) de N-2 («aplicar a la cuenta de apertura» mientras tanto) **no se usa** (dictamen §3.2). Mientras AP-3 no
esté en `main`, la factura queda pendiente con el aviso de AP-0.

### 2.2 Datos (esquema `cuentas_por_pagar`, dos migraciones: AP-1 y AP-4a)

**[contador 19/11]** Los datos se parten en dos migraciones para que la primera no espere las preguntas P-3 a P-5: **AP-1**
(siguiente libre, hoy previsiblemente `0014_cp_ap_cheques_de_apertura`) trae solo el cambio de `pagos` y los permisos de
ligar y desligar; **AP-4a** (la siguiente libre después, `00xx_cp_ap_bandeja_de_anulados`) trae el `origen` nuevo de
`documentos`, la tabla de decisiones y los permisos de la bandeja.

**`cuentas_por_pagar.pagos` (cambia, AP-1).**

| Cambio | Detalle |
|---|---|
| `forma` | `pagos_forma_valida` suma `'cheque_de_apertura'` (se reemplaza el check). `pagos_movimiento_de_su_forma` no cambia: la forma nueva lleva `movimiento_id` |
| Único nuevo | `pagos_cheque_de_apertura_vigente_unico (movimiento_id) where forma = 'cheque_de_apertura' and estado = 'vigente'`: un posfechado se liga a **un** pago vigente; al desligarlo (pago anulado) se puede ligar a otro. `pagos_movimiento_creado_unico` **no** incluye la forma nueva (el filtro por estado es justamente lo que permite religar) |
| `cheque_de_apertura_referido_id` | `uuid null`, FK `pagos_cheque_de_apertura_referido_fk → bancos.movimientos (id)` no action; check `pagos_referido_solo_en_apertura`: `cheque_de_apertura_referido_id is null or forma = 'cuenta_de_apertura'`; índice parcial `pagos_cheque_referido_idx (cheque_de_apertura_referido_id) where … is not null`. Solo informativa (§2.4) |

`pagos_referencia_de_su_forma` no cambia (la forma nueva no lleva `referencia`: el cheque ya tiene la suya). El índice
`pagos_movimiento_idx` ya cubre la FK de `movimiento_id`.

**`cuentas_por_pagar.documentos` (cambia, AP-4a).** `origen` suma `'cheque_de_apertura_anulado'` (cargo de la bandeja, §2.5): sin
documento del libro (`documento_id` nulo, como el saldo inicial), `retenciones = 0`, `saldo_al_inicio` nulo,
`retenciones_por_practicar` nulo. Los checks de saldo inicial (`restriccionesDeSaldoInicial`) se revisan para que la tercera
clase quede explícita: `documento_id is null` ⇔ `origen in ('saldo_inicial', 'cheque_de_apertura_anulado')`.

**Tabla nueva `cuentas_por_pagar.cheques_de_apertura_anulados`** (AP-4a; la decisión de la bandeja; una por cheque anulado).

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `empresa_id` | uuid | no | FK `core.empresas` on delete cascade |
| `movimiento_id` | uuid | no | El cheque de apertura anulado: FK `→ bancos.movimientos (id)` no action. Único **parcial** `cheques_de_apertura_anulados_vigente_unico (movimiento_id) where estado = 'vigente'` (una decisión vigente por cheque; deshacer deja historia) |
| `inverso_id` | uuid | no | El inverso de Bancos: FK `→ bancos.movimientos (id)`; índice |
| `decision` | text | no | check `in ('reconocida', 'descartada')` |
| `causa_de_descarte` | text | sí | check: `(decision = 'descartada') = (causa_de_descarte is not null)` y `in ('ya_pagada', 'pagada_antes_del_corte', 'no_se_debe', 'prescrita')` **[contador 19/11, P-3]** |
| `proveedor_id` | uuid | sí | FK `terceros.proveedores`; obligatorio si `reconocida` o `pagada_antes_del_corte` (check) |
| `naturaleza` | text | sí | **[contador 19/11, P-5]** `in ('proveedor', 'acreedor_vario', 'remuneracion', 'socio')`; obligatoria si `reconocida` o `pagada_antes_del_corte`, nula en las demás (check). Sin valor por omisión: el usuario la elige |
| `documento_id` | uuid | sí | El cargo creado: FK compuesta `(documento_id, empresa_id) → documentos (id, empresa_id)`; obligatorio si `reconocida` (check); único |
| `fecha` | date | no | Reconocida, `no_se_debe` y `pagada_antes_del_corte`: la del **inverso** (dictamen §3.4). `ya_pagada`: la del movimiento o documento del pago sustituto. `prescrita`: **la elige el usuario** (cuando se cumplió el plazo), `>=` la del inverso y `<=` hoy (dominio) **[contador 19/11, P-4]** |
| `medio_de_pago` | text | sí | Solo `ya_pagada`: `in ('cuenta_bancaria', 'efectivo')` |
| `movimiento_de_pago_id` | uuid | sí | **[contador 19/11, P-3; reemplaza `cuenta_bancaria_id`]** Solo `ya_pagada` con `cuenta_bancaria`: el cheque o la nota de débito de Bancos con que se pagó después del corte. FK `cheques_de_apertura_anulados_pago_fk → bancos.movimientos (id)` no action; único parcial `(movimiento_de_pago_id) where estado = 'vigente'` (un pago sustituto no sirve para dos decisiones), que sirve de índice de la FK |
| `modulo_del_pago`, `documento_del_pago_id` | text, uuid | sí | **[contador 19/11, P-3]** Solo `ya_pagada` con `efectivo`: el documento del módulo que pagó (p. ej. el gasto de Caja chica). Un pago registrado en Cuentas por pagar no sirve: ver §2.5. Juntos o ninguno, sin llave (como `bancos.movimientos.modulo_de_origen`): Cuentas por pagar no depende de todos esos módulos. Check de presencia por medio: `cuenta_bancaria` ⇔ `movimiento_de_pago_id` no nulo; `efectivo` ⇔ los dos no nulos |
| `motivo` | text | no | 1–500, sin espacios a los lados |
| `estado` | text | no | `'vigente' \| 'deshecha'`, default `vigente`; con `deshecha_en/por`, `motivo_de_deshacer` (checks de completitud como `restriccionesDeEstadoYAnulacion`) |
| `...marcasDeTiempo`, `...autoria` | | | |

Índices: `(empresa_id, estado, fecha)` para la lista de decididos; `movimiento_de_pago_id` usa su único parcial y
`proveedor_id` uno parcial `where proveedor_id is not null`. **RLS** `politicaPorEmpresa()`. Sin alcance por registro
(Cuentas por pagar no lo tiene). La lista de **pendientes** no es tabla: es la consulta «cheques de apertura revertidos sin
decisión vigente» (§2.5).

**Bancos: sin migración en la parte AP.** Ligar usa `modulo_de_origen`, `documento_de_origen_id` y `concepto_id` que ya
existen; el desglose por activo fijo usa `bancos.desglose_de_movimientos`.

### 2.3 Forma `cheque_de_apertura` (Cuentas por pagar, `RegistrarPagoConChequeDeApertura`)

Con `cuentas-por-pagar.pagos.ligar-cheques-de-apertura`. Reglas (dictamen §3.3, con lo que agrega el arquitecto):

1. **El usuario elige el cheque** entre los posfechados de apertura **sin ligar** de la empresa (lista de §2.6, lectura de
   `bancos.movimientos` desde `infraestructura`: `parte_de_apertura = 'cheque_posfechado'`, sin `modulo_de_origen`, vigente:
   ni anulado, ni revertido, ni inverso).
2. **Líneas**: solo cargos con `origen = 'saldo_inicial'` (`SoloSaldosIniciales`, el error que ya existe), del **mismo
   proveedor**, autorizados y en contraseña (regla general de CP4).
3. **Monto = monto del cheque**, exacto (`MontoDistintoDelCheque`): es un solo pago. Si el cheque pagaba facturas de dos
   proveedores (raro), no se puede ligar: la ventana lo explica y la factura queda pendiente con el aviso de AP-0.
4. **Fecha = fecha del cheque**, no se elige. Si es posterior a hoy, el pago queda **comprometido** y se da por pagado en
   esa fecha (CP4 §2.4 y adenda: «comprometido» y «disponible» ya lo calculan así porque `pagos.fecha > hoy`). Cuenta para
   la bancarización en el mes del cheque.
5. **Sin retención descontada** (retenciones del sistema anterior, U8): `retencion_descontada = 0` en todas las líneas. Si
   un cargo tiene `retenciones_por_practicar > 0`, el aviso de CP4 §5.5 de siempre.
6. **Carga abierta o cerrada**: se permite en las dos (no cambia ningún saldo al corte). También después de la fecha del
   cheque y aunque ya esté conciliado o cobrado (monto y fecha no cambian). Si quedó marcado en la primera conciliación de
   la cuenta, el aviso «posfechado cobrado pronto» de §2.7 **[contador 19/11]**.
7. **Orden de bloqueo**: primero el movimiento en Bancos (la orden lo bloquea `for update`), después contraseña y cargos;
   el mismo orden de la nota ligada (CP4 §5.2), así no se invierte.
8. **Orden a Bancos** `bancos.ligar_cheque_de_apertura` (§2.7) con el desglose por activo fijo de las líneas (como CP4: una
   línea `pago_a_proveedor`, o dos si hay cargos con `tiene_activo_fijo`). Si Bancos lanza, nada cambia.
9. **Beneficiario distinto** del nombre del NIT del proveedor: **aviso** (Bancos lo devuelve en `avisos`), no bloqueo.
10. Inserta el pago (`forma = 'cheque_de_apertura'`, `movimiento_id`) y sus líneas. Sin auditoría (alta). Evento
    `cuentas-por-pagar.pago_registrado` con `forma = 'cheque_de_apertura'`, `efecto = 'banco'`, `posfechado` según la fecha.

**Anular el pago** (`AnularPago`, `pagos.anular`, como cualquier cheque con origen; dictamen §3.3.5): orden
`bancos.anular_movimiento_de_origen` (el cheque ya tiene origen CP). Bancos lo anula como cheque normal (a la antigua si
el mes está abierto; con inverso si está conciliado) y **no** emite `partida_de_apertura_anulada` (el posfechado no es
partida de apertura): la factura vuelve a estar pendiente y **no** pasa por la bandeja. El aviso
`bancos.movimiento_por_cambiar` (anulación desde Bancos, lote de caducos) se maneja igual que para `forma = 'cheque'`.
`fecha_de_anulacion` como CP5-a.

**Desligar sin anular** (`DesligarChequeDeApertura`, permiso `cuentas-por-pagar.pagos.desligar-cheques-de-apertura`;
dictamen Q-N3): motivo 1–300. Bloquea el pago; vigente y de esta forma (`PagoNoEsChequeDeApertura`). Orden
`bancos.desligar_cheque_de_apertura`. El pago queda `anulado` con `fecha_de_anulacion = pagos.fecha` («nunca existió», como
el `sin_inverso` de CP5-a), sus líneas `vigente = false` y su desglose se quita. **Auditoría `anular`** en
`cuentas-por-pagar.pagos` con el `PagoDto` anterior y el motivo. Evento `pago_anulado` con `anulacionEnBancos = null`.
Después se puede ligar el mismo cheque a las facturas correctas.

### 2.4 Referencia informativa en «cuenta de apertura» (dictamen §3.1)

En la ventana de «Aplicar a la cuenta de apertura», campo opcional **«Cheque de apertura con que se pagó»** (lista de los
cheques **en circulación** de apertura de la empresa, vigentes, del mismo nombre de beneficiario primero). Se guarda en
`pagos.cheque_de_apertura_referido_id`. No cambia ningún saldo ni regla del pago; solo sirve para que la bandeja (§2.5)
proponga «esta factura ya estaba cargada» si ese cheque se anula. Se puede poner al registrar el pago; **no** se corrige
después (para no abrir la edición de pagos): si se olvidó, la bandeja igual permite reconocer o descartar.

### 2.5 Bandeja «Cheques de apertura anulados» (Cuentas por pagar)

**Pendientes** = cheques con `parte_de_apertura = 'cheque_en_circulacion'`, revertidos (su inverso con concepto
`anulacion_de_apertura`), **sin** decisión vigente. Lectura en vivo de `bancos.movimientos` desde `infraestructura`
(índice `movimientos_apertura_idx` de la `0034`: son pocas filas). El evento `bancos.partida_de_apertura_anulada` no hace
falta para listar; Cuentas por pagar no lo escucha en esta fase (Contabilidad sí lo hará). Por cada pendiente se muestran
número, fecha y monto del cheque, beneficiario escrito, fecha del inverso, y si algún pago «cuenta de apertura» lo refiere
(§2.4), con enlace.

**Reconocer la deuda** (`ReconocerDeudaDeChequeAnulado`, `cuentas-por-pagar.cheques-de-apertura-anulados.decidir`):

1. Bloquea el movimiento (`for update` desde `infraestructura`) y revisa que siga pendiente.
2. Pide **proveedor** (obligatorio; si el beneficiario no es proveedor, se crea en Terceros como proveedor, que admite NIT
   nulo: Q-AP1), **tipo** del documento original (por omisión `factura`), **número** (por omisión `«Cheque <n> de
   apertura»`, 1–50) y observaciones. **[contador 19/11, P-5]** Pide también la **naturaleza** de la deuda
   (`proveedor`, `acreedor_vario`, `remuneracion`, `socio`; sin valor propuesto): el cheque pudo ser para un empleado, un
   socio o una entidad pública, y Contabilidad no debe presentarlo como «Proveedores». **Aviso** (no bloquea) si el
   proveedor tiene NIT nulo y el monto es de Q30,000 o más: «La bancarización exige individualizar al beneficiario de pagos
   de Q30,000 o más (Decreto 20-2006, art. 20, pendiente de cotejo literal): registre su NIT antes de pagar.»
3. Crea el cargo: `origen = 'cheque_de_apertura_anulado'`, `total = monto del cheque` (el neto: dictamen §3.4),
   `retenciones = 0`, `fecha_emision = vencimiento = fecha del inverso`, `estado = 'registrado'` (debe autorizarse y ir a
   contraseña para pagarse, como cualquier cargo), `tiene_activo_fijo = false`. **No entra al Libro de compras** (no hay
   orden a Libro; el IVA de la factura original ya se acreditó en el sistema anterior).
4. Inserta la decisión `reconocida` con `fecha = fecha del inverso`.
5. Si un pago «cuenta de apertura» refiere el cheque, **no** lo anula (cambiaría el saldo al corte): solo lo muestra.
6. Evento `cuentas-por-pagar.cheque_de_apertura_anulado_decidido` (§5).

**Descartar** (mismo permiso), con causa y motivo:

| Causa | Qué pide | Para Contabilidad |
|---|---|---|
| `ya_pagada` (después del corte) **[contador 19/11, P-3]** | Medio. Con `cuenta_bancaria`: **el movimiento** del pago sustituto (reglas abajo); la fecha es la suya. Con `efectivo`: el módulo y el documento que pagó, y su fecha | Contra **la misma cuenta que usó el pago sustituto** (el concepto `pago_a_proveedor` del movimiento ligado: Proveedores), nunca otra vez Bancos: así las dos patas se compensan |
| `pagada_antes_del_corte` **[contador 19/11, P-3]** | Proveedor, naturaleza y motivo; fecha del inverso | El sistema anterior pagó dos veces: Haber Proveedores y Acreedores varios (el saldo deudor del proveedor) |
| `no_se_debe` | Solo el motivo. La ventana dice **[contador 19/11]**: «Si la factura original se anuló o se devolvió, registre la nota de crédito del proveedor en Libro de compras (el crédito fiscal del IVA que se tomó debe revertirse).» | Ingreso del período **o corrección de un error de un período anterior** (NIIF para las Pymes 10.19 a 10.23), según el contador |
| `prescrita` **[contador 19/11, P-4]** | El motivo y **la fecha en que se cumplió el plazo** (`>=` la del inverso, `<=` hoy). La ventana muestra, **sin plazos fijos** hasta cotejar el Código Civil: «La prescripción no opera sola y la interrumpe el reconocimiento de la deuda (la entrega de este cheque, el dd/mm/aaaa). Confirme con su abogado o contador que el plazo se cumplió.» Se quita «2 años mercadería» (art. 1514): falta confirmar si rige entre comerciantes | Otros ingresos gravables en el régimen sobre las utilidades (pendiente de cotejo) |

**Pago sustituto en Bancos (`ya_pagada` con `cuenta_bancaria`; [contador 19/11, P-3], forma del arquitecto).** El usuario
elige el movimiento entre los **débitos vigentes** de la empresa (cheque o nota de débito; ni anulado, ni revertido, ni
inverso, ni partida de apertura), con fecha posterior al corte y **sin origen** (`PagoSustitutoConOrigen` si lo tiene: un
pago que registró Cuentas por pagar, Caja chica u otro módulo ya lo contabiliza ese módulo; el mensaje pide revisar con el
contador si la factura se registró dos veces). Los primeros de la lista son los del mismo beneficiario normalizado. Monto
distinto del cheque anulado: **aviso**, no bloqueo (pudo pagarse con otro monto; la diferencia la ve Contabilidad). Orden a
Bancos `bancos.ligar_pago_sustituto_de_apertura` (§2.7): pone el origen (Cuentas por pagar, la decisión) y el concepto
`pago_a_proveedor`, con auditoría `corregir`; desde entonces el `RevisorDeCambios` lo protege como a todo movimiento con
origen. **Se reusa `pago_a_proveedor`** **[arquitecto]** en vez de un concepto nuevo «Pago de deuda de apertura»: es la pata
que se busca (Debe Proveedores), no pide migración de Bancos y el reporte por concepto lo junta con los demás pagos a
proveedores; la alternativa queda en P-3. Deshacer la decisión manda `bancos.desligar_pago_sustituto_de_apertura` (quita el
origen y deja `sin_clasificar`, como §2.7). Si Bancos quiere anular o cambiar el movimiento ligado, el aviso
`bancos.movimiento_por_cambiar` llega a Cuentas por pagar, que lo **rechaza** («Deshaga primero la decisión en Cheques de
apertura anulados»).

**Deshacer una decisión** (mismo permiso, motivo): `reconocida` solo si su cargo **no tiene movimientos** (ni pagos,
ni notas, ni ajustes vigentes; `DeudaReconocidaConMovimientos`); anula el cargo (como un saldo inicial sin movimientos) y
deja la decisión `deshecha`. `descartada` se deshace siempre (con pago sustituto en Bancos, lo desliga en la misma
transacción). **Auditoría `anular`**, recurso
`cuentas-por-pagar.cheques-de-apertura-anulados`, con la decisión como estaba y el motivo. El cheque vuelve a pendientes.

Los depósitos en tránsito rechazados siguen en la opción A (reporte de Bancos) hasta Cuentas por cobrar (§2.5 de la
segunda parte).

### 2.6 Lo que ve el usuario mientras tanto y en el cierre (AP-0)

- **Ficha del proveedor y ventana de pago** (Cuentas por pagar): si hay posfechados de apertura sin ligar cuyo
  `beneficiario_para_comparar` coincide con el nombre del proveedor **o** si el proveedor tiene cargos de saldo inicial y
  hay cualquier posfechado sin ligar, aviso: «Hay N cheques posfechados de apertura sin ligar (Q…): no pague estas
  facturas otra vez; líguelas al cheque con “Cheque de apertura”.» (antes de AP-3: «…se podrán ligar pronto»).
- **Cierre de la carga** (EM-2): Bancos agrega a su respuesta de `empresas.revisar_cierre_de_carga` el hallazgo
  `posfechados_sin_ligar` (nivel `aviso`) con la cantidad y el total, **solo si Cuentas por pagar está activo** (Bancos lo
  sabe con `ModulosDeOrigen.estaActivo`, §3.2 c de Caja chica, o con `CuentasPorPagarActivo` mientras tanto). No pide
  motivo: no cambia ningún saldo al corte.

### 2.7 Órdenes nuevas de Bancos (`core/contratos/bancos.contratos.ts`)

```ts
'bancos.ligar_cheque_de_apertura': {
  datos: { origen: OrigenDeMovimientoContrato; movimientoId: string; montoCentavos: number;
           beneficiarioEsperado: string; conceptos: LineaDeConcepto[] };
  respuesta: { numeroDeCheque: number; fecha: string; cuentaBancariaId: string; avisos: AvisoDeBancos[] };
};
'bancos.desligar_cheque_de_apertura': {
  datos: { origen: OrigenDeMovimientoContrato; movimientoId: string; motivo: string };
  respuesta: { conceptoId: string };
};
// [contador 19/11, P-3] Pago sustituto de un cheque de apertura anulado (bandeja, §2.5)
'bancos.ligar_pago_sustituto_de_apertura': {
  datos: { origen: OrigenDeMovimientoContrato; movimientoId: string; montoEsperadoCentavos: number };
  respuesta: { fecha: string; montoCentavos: number; cuentaBancariaId: string; avisos: AvisoDeBancos[] };
};
'bancos.desligar_pago_sustituto_de_apertura': {
  datos: { origen: OrigenDeMovimientoContrato; movimientoId: string; motivo: string };
  respuesta: { conceptoId: string };
};
```

**Ligar** (caso de uso `LigarChequeDeApertura`): bloquea el movimiento; exige `parte_de_apertura = 'cheque_posfechado'`,
vigente, sin origen (`ChequeDeAperturaNoLigable`) y `monto = montoCentavos` (`MontoDistintoDelCheque`); con el módulo de
origen activo. Pone `modulo_de_origen` y `documento_de_origen_id`, el concepto por clave (`pago_a_proveedor` o el de mayor
monto) y el desglose si hay dos líneas (reglas de `fijar_desglose_de_conceptos`). **Auditoría `corregir`** recurso
`bancos.cheques`, con el movimiento como estaba (concepto anterior incluido) y el motivo «Ligado al pago N de Cuentas por
pagar». Aviso si `nombre_para_comparar(beneficiario) <> nombre_para_comparar(beneficiarioEsperado)`. No cambia monto, fecha,
número, conciliación ni impresión.

**Posfechado cobrado pronto** **[contador 19/11, §2 punto 7; forma del arquitecto]**. El contador pide avisar cuando el banco
pagó el posfechado **en o antes del corte**: entonces la factura ya estaba pagada y no debía ir en el saldo inicial de
Cuentas por pagar. Arrancar no guarda la fecha en que el banco pagó cada cheque, y la conciliación no baja del corte («nada
del corte para atrás», `reglas-de-la-cuenta.ts`), así que no hay un período «que termine en o antes del corte». Lo que sí
se sabe: el posfechado quedó marcado en la **primera conciliación** de la cuenta. En ese caso Ligar devuelve el aviso
(no bloquea), y la conciliación lo da al marcarlo: «El banco cobró este cheque posfechado en el primer período conciliado.
Si lo cobró en o antes del corte (dd/mm/aaaa), la factura ya estaba pagada y no debía ir en el saldo inicial de Cuentas por
pagar: corríjalo con la carga abierta. Si lo cobró después, está bien.» Cobrarlo después del corte y antes de su fecha no
cambia nada (la diferencia es de días; el pago conserva la fecha del cheque).

**Ligar y desligar el pago sustituto** (`LigarPagoSustitutoDeApertura`): como el cheque de apertura, pero el movimiento es un
cheque o nota de débito vigente, de fecha posterior al corte, sin origen y que no es partida de apertura
(`PagoSustitutoNoLigable`); el monto no tiene que ser igual (aviso `monto_distinto` si no lo es); pone el concepto
`pago_a_proveedor` sin desglose. Auditoría `corregir` en `bancos.cheques` o `bancos.notas` con el movimiento como estaba y el
motivo «Pago de la deuda del cheque de apertura N anulado». Desligar quita el origen y deja `sin_clasificar` (como arriba).

**Desligar**: exige que el origen sea el que pide. Quita el origen y el desglose y pone el concepto `sin_clasificar`
**[arquitecto]**: el concepto anterior queda en la auditoría del ligado, pero leer la auditoría para decidir es frágil; el
aviso de la respuesta dice «Clasifique el cheque otra vez en Bancos» (el permiso `bancos.cheques.reclasificar` de
siempre). Lo normal es religarlo enseguida, que vuelve a poner el concepto. **Auditoría `corregir`** con el motivo.

Las dos corren el mismo `RevisorDeCambios` que ya protege los movimientos con origen: después de ligar, Bancos ya no
deja corregir, eliminar ni blanquear el cheque (CP4 §6.3.1).

## 3. Parte AB: aprobaciones de cheques, notas de débito y transferencias

### 3.1 Qué pasa por aprobación

| Movimiento | Pasa | Por qué |
|---|---|---|
| Cheque manual (pantalla de Bancos) | Sí, si `bancos.aprobaciones.cheques` | Decisión de pago |
| Nota de débito manual con un concepto que **pide aprobación** | Sí, si `bancos.aprobaciones.notas_de_debito` | Transferencia a terceros desde la banca electrónica, débito ordenado |
| Nota de débito con concepto que **no** pide aprobación (cargos del banco y débitos automáticos ya hechos) | No | El dinero ya salió (dictamen §1.1) |
| Transferencia entre cuentas propias | Sí, si `bancos.aprobaciones.transferencias` | El dinero no sale de la empresa, salvo hacia una **tarjeta** (TC) o una cuenta de **otra moneda**, que sí es decisión de pago **[arquitecto]** (Q-A5) |
| Nota de crédito | Nunca | Entra dinero (dictamen §1.1) |
| Saldo inicial y sus partidas, inversos, anulaciones | Nunca | No son decisiones de pago |
| Cargo manual en una **tarjeta** (TC) | Nunca **[arquitecto]** | El consumo ya ocurrió; la decisión es el **pago** de la tarjeta, que es transferencia |
| Órdenes de Cuentas por pagar, Caja chica y Cuentas por liquidar | No (P-13, CC-j) | Con la regla de §3.8 |

**Concepto que pide aprobación** **[arquitecto, cambia lo que proponía §11.1]**: columna nueva
`bancos.conceptos.pide_aprobacion boolean not null default true`, que solo se mira en notas de débito. La migración la pone
en `false` donde `es_cargo_bancario` (comisiones, cheque rechazado) y en los de sistema que nunca van a mano. La empresa la
apaga en sus débitos automáticos («Pago de préstamo», seguros). Cambiarla **exige además `bancos.solicitudes.aprobar`**
(quien controla las excepciones es quien aprueba, no quien solicita) y queda en la auditoría (`corregir`, recurso
`bancos.conceptos`) (Q-A9). Se descartó usar solo `es_cargo_bancario`: un débito automático del préstamo no es cargo del
banco, pero tampoco una decisión de pago.

### 3.2 Niveles (Q-A1, recomendado b)

Variable `bancos.aprobaciones.niveles` (empresa e instalación): lista de **uno o dos** niveles
`{ desde: '0.00', aprobadores: 1 | 2 }`, ordenados por `desde`, el primero define el umbral (por omisión
`[{ desde: '0.00', aprobadores: 1 }]`: todo pasa con un aprobador). Ejemplo: `[{desde:'5000.00',aprobadores:1},
{desde:'50000.00',aprobadores:2}]`: hasta Q4,999.99 no pide aprobación, de Q5,000 a Q49,999.99 una persona, desde Q50,000
dos personas distintas. Reemplaza el `monto_minimo` de §11.1. Montos en la moneda de la cuenta; con Multimoneda, los
niveles se comparan contra el **equivalente en quetzales** al tipo de cambio **de referencia del Banguat** de la fecha
pedida (el servicio `tiposDeCambio` de Multimoneda; una sola tabla de niveles por empresa) **[contador 19/11, V-3]**.
Mientras Bancos no tenga la moneda de la cuenta (MM-B), todo está en quetzales y se compara directo.

### 3.3 Solicitudes (`bancos.solicitudes`) y aprobaciones (`bancos.aprobaciones_de_solicitudes`)

Migración de Bancos siguiente libre (`00xx_aprobaciones`).

**`bancos.solicitudes`**

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `empresa_id` | uuid | no | FK `core.empresas` on delete cascade |
| `numero`, `anio_de_numero` | integer | no | Correlativo `bancos.solicitudes` (fuente de números de Bancos, como `transferencias`); único `(empresa_id, anio_de_numero, numero)` |
| `tipo` | text | no | `in ('cheque', 'nota_de_debito', 'transferencia')` |
| `estado` | text | no | `in ('solicitada', 'aprobada', 'rechazada', 'cancelada')`, default `solicitada` |
| `cuenta_bancaria_id` | uuid | no | FK `cuentas_bancarias`; índice |
| `cuenta_destino_id` | uuid | sí | Solo transferencia (check de presencia por tipo; distinta de la de origen); FK; índice parcial |
| `chequera_id` | uuid | sí | Solo cheque (obligatoria); FK `chequeras`; índice parcial |
| `fecha` | date | no | La pedida; al aprobar se usa la de §3.5 |
| `monto` | numeric(14,2) | no | `> 0` |
| `beneficiario` | text | sí | Cheque y nota: obligatorio (1–150, sin espacios a los lados); transferencia: nulo |
| `beneficiario_para_comparar` | text | sí | Generada `bancos.nombre_para_comparar(beneficiario)` como en `movimientos` |
| `concepto_id` | uuid | sí | Cheque y nota: obligatorio; transferencia: solo hacia tarjeta u otra moneda (TC). FK compuesta `(concepto_id, empresa_id) → conceptos (id, empresa_id)` |
| `referencia`, `observaciones` | text | sí | Mismas reglas que en `movimientos` |
| `no_negociable` | boolean | no | default `false`; check `solicitudes_no_negociable_solo_cheque`: `not no_negociable or tipo = 'cheque'` |
| `para_abono_en_cuenta` | boolean | no | default `false`; solo cheque (columna de IC-2; si IC-1 no está en `main`, entra con IC-1) |
| `aprobaciones_requeridas` | smallint | no | `between 1 and 2`; se **congela** al solicitar |
| `acumulado_al_solicitar` | numeric(14,2) | no | La suma que decidió el nivel (§3.4), para que el aprobador vea por qué |
| `resuelta_por`, `resuelta_en` | uuid, timestamptz | sí | Juntas; obligatorias si `estado <> 'solicitada'` |
| `motivo` | text | sí | Obligatorio (1–300) si `rechazada` o `cancelada`; nulo en las demás |
| `movimiento_id` | uuid | sí | Cheque y nota aprobados: FK `movimientos`; único parcial |
| `transferencia_id` | uuid | sí | Transferencia aprobada: FK `transferencias`; único parcial |
| `ejecutada_en`, `ejecutada_por` | timestamptz, uuid | sí | Nota y transferencia: cuando se registró la referencia del banco (§3.6) |
| `...marcasDeTiempo`, `...autoria` | | | `creado_por` = quien solicitó |

Checks: `solicitudes_resultado_de_su_estado`: `(estado = 'aprobada') = (movimiento_id is not null or transferencia_id is not
null)` y `movimiento_id` solo en cheque o nota, `transferencia_id` solo en transferencia; `solicitudes_ejecutada_solo_aprobada`.

Índices: `solicitudes_pendientes_idx (empresa_id, creado_en) where estado = 'solicitada'` (la bandeja);
`solicitudes_lista_idx (empresa_id, estado, fecha)`; `solicitudes_beneficiario_idx (empresa_id, beneficiario_para_comparar,
fecha) where estado = 'solicitada'` (acumulado); `solicitudes_sin_referencia_idx (empresa_id, resuelta_en) where estado =
'aprobada' and tipo <> 'cheque' and ejecutada_en is null` (aviso de A-4).

**`bancos.aprobaciones_de_solicitudes`**

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `solicitud_id` | uuid | no | FK compuesta `(solicitud_id, empresa_id) → solicitudes (id, empresa_id)` (único `solicitudes_id_empresa_unico`) |
| `empresa_id` | uuid | no | FK `core.empresas` on delete cascade |
| `usuario_id` | uuid | no | Quien aprobó (sin llave, como `autorizado_por` en todo el sistema) |
| `aprobada_en` | timestamptz | no | default `now()` |

PK `(solicitud_id, usuario_id)`: la misma persona no aprueba dos veces. Sin `actualizado_*`: solo se agrega (políticas de
`select` e `insert`, sin `update` ni `delete` para `arrancar_app`, como `core.auditoria`). La regla «aprobador ≠
solicitante» la cuida el dominio con la fila de la solicitud bloqueada; un disparador la repetiría, pero el caso de uso es
el único que inserta (no se agrega).

**RLS** de las dos: `politicaPorEmpresa()`. Sin alcance por registro (Bancos aún no lo tiene; cuando llegue el alcance por
cuenta, §11.4, `solicitudes` cuelga de su cuenta como `movimientos`).

### 3.4 Acumulado por beneficiario (A-2, Q-A2: por día)

Al solicitar o registrar un egreso que **podría** pedir aprobación, el dominio calcula:

```
acumulado = monto nuevo
          + Σ monto de movimientos vigentes de la empresa, tipo cheque o débito que pide aprobación,
              mismo beneficiario_para_comparar, fecha en el período (día o semana ISO de la fecha pedida)
          + Σ monto de solicitudes 'solicitada' con el mismo beneficiario_para_comparar y fecha en el período
```

El nivel sale del **acumulado** (no solo del monto): así partir un pago de Q60,000 en tres de Q20,000 pide dos
aprobadores. En transferencias el «beneficiario» es la **cuenta destino**. Variable `bancos.aprobaciones.acumular_por`:
`'dia' | 'semana' | 'no'` (por omisión `dia`). Se comparan los nombres normalizados (`nombre_para_comparar`): «Juan
Pérez» y «JUAN PEREZ» son el mismo. Índices: los de §1.5 y §3.3. Límite conocido: dos nombres distintos para la misma
persona no se suman; con «Beneficiario desde Terceros» (§11.6) se sumará por tercero.

### 3.5 Flujo y reglas

**Registrar desde la pantalla de siempre.** `EmitirCheque`, `CrearMovimiento` (débito) y `RegistrarTransferencia` llaman
primero al evaluador (`EvaluadorDeAprobacion`, dominio puro con pruebas: variables, concepto, acumulado). Si pide
aprobación, el caso de uso **rechaza** con `RequiereAprobacion` (409; `detalles: { aprobadores, acumulado, nivel }`) y no
crea nada. El cliente, con ese error, ofrece en la misma ventana «Enviar como solicitud», que manda los mismos datos a
`POST /bancos/solicitudes` **[arquitecto]**: las rutas de hoy no cambian de respuesta y la validación es una sola.

**Solicitar** (`SolicitarMovimiento`, con el permiso de la acción: `cheques.emitir`, `notas.crear` o
`transferencias.crear`): valida los mismos datos que el caso de uso de registrar (cuenta activa, chequera activa de la
cuenta, concepto, fechas) salvo fondos y número; congela `aprobaciones_requeridas` y `acumulado_al_solicitar`. **Aviso**
(no bloquea) si hay menos usuarios con `bancos.solicitudes.aprobar` en la empresa, distintos del solicitante y sin
contar superacceso, que los aprobadores requeridos (A-9): «Esta solicitud necesita 2 aprobadores distintos de usted y en
la empresa solo hay 1».

**Aprobar** (`AprobarSolicitud`, `bancos.solicitudes.aprobar`):

1. Bloquea la solicitud; `solicitada` (`SolicitudYaResuelta`).
2. El operador **no** es el solicitante (`AprobadorEsElSolicitante`), **no** es superacceso (`SuperaccesoNoAprueba`,
   A-7) y no aprobó ya esta solicitud (`YaAprobada`). Ningún permiso salta esta regla (A-9).
3. Inserta la aprobación. Si con ella se llega a `aprobaciones_requeridas`, **ejecuta** en la misma transacción el caso
   de uso de siempre (`EmitirCheque`, `CrearMovimiento`, `RegistrarTransferencia`) con `desdeSolicitud` (no vuelve a
   evaluar la aprobación), con la **fecha** de A-5: hoy (Guatemala), salvo que la pedida sea **futura** (posfechado), que
   se conserva. Ese caso de uso revisa como siempre el mes conciliado, la fecha de inicio, el sobregiro y el número de
   cheque (siguiente disponible de la chequera). Si lanza, la aprobación también se deshace y el aprobador ve el error.
4. `estado = 'aprobada'`, `resuelta_por/en` = el último aprobador, `movimiento_id` o `transferencia_id`.

**Rechazar** (`bancos.solicitudes.aprobar`, motivo; cualquier aprobador, aunque otro ya haya aprobado) y **cancelar**
(el solicitante, con el permiso de la acción, motivo; solo `solicitada`). **Auditoría `anular`**, recurso
`bancos.solicitudes`, con el DTO anterior y el motivo. Una solicitud **no se edita**: se cancela y se pide otra.

**Corregir lo aprobado** **[arquitecto, hueco no visto por el dictamen]**: con la aprobación del tipo encendida, corregir
en Bancos el **monto hacia arriba, el beneficiario o la cuenta** de un cheque o nota de débito que pide aprobación se
rechaza si el resultado pediría aprobación (`CorreccionRequiereAprobacion`: «Anúlelo y solicite otro»). La fecha,
referencia, observaciones y concepto se corrigen como hoy. Blanquear y volver a emitir pasa por el evaluador (Q-A8).

**Anular** un movimiento aprobado no pide aprobación (reduce el riesgo); la solicitud queda `aprobada` como historia y su
ficha muestra «Movimiento anulado».

### 3.6 Referencia del banco después de aprobar (A-4, Q-A4)

Notas de débito y transferencias aprobadas: **«Registrar la referencia del banco»** (`RegistrarReferenciaDeEjecucion`,
permiso `bancos.solicitudes.registrar-referencia`): escribe `movimientos.referencia` (o `transferencias.referencia` y la de
sus dos notas) y `ejecutada_en/por`. Si la referencia estaba vacía no es corrección (sin auditoría); si cambia una
existente, auditoría `corregir` del movimiento. Aviso en la bandeja y en Inicio: «N transferencias o notas aprobadas hace
más de `bancos.aprobaciones.dias_sin_referencia` días (por omisión 3) sin referencia del banco: confirme que se hicieron».

### 3.7 Comprobante de egreso (A-6; cambia IC-5 de impresión)

Con el cheque nacido de una solicitud: «Elaboró» = nombre del solicitante, «Autorizó» = nombres de los aprobadores (uno o
dos). Sin solicitud: en blanco para firmar a mano. Lectura interna de Bancos (`solicitudes` por `movimiento_id`). La ayuda
dice: «La aprobación en Arrancar no sustituye las firmas registradas en el banco» (dictamen §1.3).

### 3.8 Órdenes de los módulos: quien autorizó no paga (A-1, Q-A3) y lo que queda fuera (Q-A6)

Orden nueva de Bancos (sin migración):

```ts
'bancos.evaluar_aprobacion': {
  datos: { tipo: 'cheque' | 'nota_de_debito'; cuentaBancariaId: string; beneficiario: string;
           montoCentavos: number; fecha: string };
  respuesta: { aplica: boolean; aprobadores: 0 | 1 | 2 };
};
```

Responde con el mismo evaluador (variables, acumulado por beneficiario; el concepto de una orden siempre pide aprobación).
No crea nada.

| Módulo | Regla cuando `aplica` | Error |
|---|---|---|
| **Cuentas por pagar** (cheque, nota de débito y, con TC, tarjeta) | Quien registra el pago **no** puede ser `autorizado_por` de ninguno de los cargos del pago. Aplica también a la nota ligada si la nota la registró quien paga **[arquitecto]**. Con `aprobadores = 2` la regla es la misma (segregación de dos personas: una autoriza, otra paga) | `AutorizadorNoPaga` (403): «Usted autorizó la factura S-N: el pago lo registra otra persona (la aprobación de Bancos está encendida).» |
| **Caja chica** (reposición) | CC-k se vuelve **bloqueo** sin importar `caja-chica.control.separacion_de_funciones`: el custodio vigente no repone su propio fondo. Caja chica no tiene «aprobar la liquidación» (§1.9); el equivalente de «quien autoriza» es el custodio, que es el beneficiario **[arquitecto: corrige la redacción del dictamen]** | `SeparacionDeFunciones` (el de CC-k) |
| **Cuentas por liquidar** (entregar anticipo) | **Hueco aceptado por ahora** (Q-A6 c, §17): un usuario entrega un anticipo (cheque o nota) sin que nadie lo autorice; la ayuda lo dice textualmente (§3.9, V-7). El mecanismo general «solicitud de origen» queda para una fase posterior si un cliente lo pide | — |

No se agrega variable propia por módulo: la regla se enciende sola con la aprobación de Bancos (la alternativa del
dictamen, `…exigir_autorizador_distinto` por módulo, queda en Q-A3).

### 3.9 Configuración (declarada en `bancos/modulo.ts`; niveles empresa e instalación)

| Clave | Tipo | Omisión | Pública |
|---|---|---|---|
| `bancos.aprobaciones.cheques` | boolean | `false` | Sí |
| `bancos.aprobaciones.notas_de_debito` | boolean | `false` | Sí |
| `bancos.aprobaciones.transferencias` | boolean | `false` | Sí |
| `bancos.aprobaciones.niveles` | lista de 1–2 `{ desde: monto, aprobadores: 1\|2 }`, `desde` crecientes, aprobadores no decrecientes | `[{ desde: '0.00', aprobadores: 1 }]` | Sí |
| `bancos.aprobaciones.acumular_por` | `'dia' \| 'semana' \| 'no'` | `'dia'` | No |
| `bancos.aprobaciones.dias_sin_referencia` | entero 1–30 | `3` | No |

**Ayuda de las variables** (en `textos-de-aprobaciones.ts` y en la descripción de cada variable) **[contador 19/11, V-6 y
V-7]**: además de «La aprobación en Arrancar no sustituye las firmas registradas en el banco» (§3.7), dos frases fijas:

- En `niveles`: «Dos aprobadores aplican a los cheques, notas y transferencias que se registran en Bancos. Los pagos de
  Cuentas por pagar llevan dos personas: una autoriza la factura y otra registra el pago.»
- En las tres de tipo (`cheques`, `notas_de_debito`, `transferencias`): «Los anticipos de Cuentas por liquidar no pasan por
  aprobación.»

Si la pantalla de configuración del core no tiene un gancho «al guardar», el aviso de A-9 sale en la bandeja de
Solicitudes y en la respuesta de solicitar (§3.5), no al encender la variable.

## 4. Parte TC: tarjeta de crédito

### 4.1 Modelo

- Una tarjeta es una **cuenta** de tipo `tarjeta_de_credito` del emisor (`banco_id`). Es un **pasivo**: el saldo se calcula
  como hoy (créditos − débitos) y sale **negativo** cuando se debe; la pantalla lo muestra como **«Saldo por pagar»**
  (positivo) y un saldo positivo como «Saldo a favor» (dictamen §2.1).
- **Cargo** = nota de débito en la tarjeta (consumo, intereses, comisión, membresía, seguro). **Abono** = nota de crédito
  (devolución del comercio) o la pata de crédito de la transferencia que paga la tarjeta.
- **No hay cheques ni chequeras** en una tarjeta. **No hay sobregiro**: el `límite de crédito` solo **avisa** («El cargo
  pasa el límite de crédito de Q…; el emisor puede rechazarlo»).
- **No es efectivo**: el flujo de efectivo **excluye** las cuentas de tipo tarjeta: la compra con tarjeta no es salida de
  efectivo (pasivo financiero, NIIF para las Pymes sección 11, sin compensar, 2.52). La salida de efectivo es la pata de
  débito de la cuenta monetaria que paga la tarjeta, con su concepto (§4.5). **[contador 19/11, §2 punto 1]** El diseño
  citaba 7.18, que trata de transacciones de **inversión y financiación** sin efectivo: si la compra se excluye porque la
  financió el emisor, lo coherente es que su pago sea Financiamiento. Por eso la actividad del pago es una **política
  contable** que la empresa elige y mantiene (sección 10): Operación por omisión, editable (Q-T4), con la ayuda de §4.5.
- **Bimonetaria** = dos cuentas (GTQ y USD) unidas por `tarjeta_principal_id`.
- **Tarjeta personal** de un empleado o socio: no se registra como cuenta de la empresa (Q-T5, recomendado «No»); esos
  gastos van por Cuentas por liquidar. Es texto de ayuda, sin columna.

### 4.2 Datos de Bancos (migración siguiente libre **después** de la de Multimoneda en Bancos, `00xx_tarjetas_de_credito`)

**`bancos.cuentas_bancarias` (cambia).**

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `tipo` | text | no | Check nuevo `cuentas_bancarias_tipo_valido`: `in ('monetaria', 'ahorro', 'tarjeta_de_credito')` (los datos actuales lo cumplen) |
| `limite_de_credito` | numeric(14,2) | sí | `> 0`; solo tarjeta |
| `dia_de_corte` | smallint | sí | `between 1 and 31`; solo tarjeta; referencia para proponer el corte |
| `dias_para_pagar` | smallint | sí | `between 1 and 60`; solo tarjeta; referencia para proponer la fecha límite |
| `ultimos_4` | char(4) | sí | `~ '^[0-9]{4}$'`; **obligatorio** en tarjeta, nulo en las demás |
| `tarjeta_principal_id` | uuid | sí | Solo tarjeta; FK `→ cuentas_bancarias (id)`; distinta de sí misma; índice parcial. El dominio exige que la principal sea tarjeta, del mismo emisor, de otra moneda y que no sea a su vez secundaria |

Check `cuentas_bancarias_datos_de_tarjeta`: `tipo = 'tarjeta_de_credito' or (limite_de_credito is null and dia_de_corte is
null and dias_para_pagar is null and ultimos_4 is null and tarjeta_principal_id is null)` y `tipo <> 'tarjeta_de_credito'
or ultimos_4 is not null`.

**Seguridad del número** **[arquitecto]**: en una tarjeta, `numero` es el **número de cuenta del contrato** que trae el
estado de cuenta, nunca el número de la tarjeta (PAN). El dominio rechaza un `numero` de 13 a 19 dígitos que pase la
prueba de Luhn (`NumeroDeTarjetaCompleto`: «No escriba el número completo de la tarjeta: use el número de cuenta del
estado de cuenta y los últimos 4 dígitos»). También al importar desde Excel.

Cambiar el `tipo` de una cuenta **con movimientos** desde o hacia tarjeta se rechaza (`TipoDeCuentaConMovimientos`): cambia
el sentido del saldo de toda su historia.

**Tabla nueva `bancos.cortes_de_tarjeta`** (el estado de cuenta del emisor; Q-T6, recomendado tabla propia).

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `empresa_id` | uuid | no | FK `core.empresas` on delete cascade |
| `cuenta_bancaria_id` | uuid | no | FK compuesta con la empresa; la cuenta debe ser tarjeta (dominio) |
| `fecha_de_corte` | date | no | Único `(cuenta_bancaria_id, fecha_de_corte)` (sirve de índice) |
| `fecha_limite_de_pago` | date | no | `>= fecha_de_corte` |
| `saldo_al_corte` | numeric(14,2) | no | Transcrito **como lo dice el emisor** (positivo = a cargo de la empresa) |
| `pago_minimo` | numeric(14,2) | sí | `>= 0` |
| `pago_de_contado` | numeric(14,2) | sí | `>= 0` (el que evita intereses) |
| `archivo_id` | uuid | sí | FK `core.archivos`; único (un archivo, un registro); lo pone solo el servidor (como H2b) |
| `observaciones` | text | sí | 1–500 |
| `...marcasDeTiempo`, `...autoria` | | | |

RLS por empresa. Registrar un corte no exige conciliar: sirve para el aviso de pago (§4.7) aunque la conciliación vaya
atrasada.

**`bancos.conciliaciones` (cambia): conciliación por corte (Q-T2).**

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `corte_id` | uuid | sí | FK `→ cortes_de_tarjeta (id)`; único. Obligatorio en tarjetas, nulo en las demás (dominio: la base no ve el tipo de la cuenta) |
| `hasta` | date | no | Fin del período: el último día del mes en las cuentas comunes, `fecha_de_corte` en tarjetas. **Relleno** = último día de `(anio, mes)` en todas las existentes, luego `not null`. Índice `(cuenta_bancaria_id, hasta)` |

En la tarjeta, `(anio, mes)` es el mes de la fecha de corte; el único `(cuenta, anio, mes)` se mantiene (un corte por mes;
si un emisor cortara dos veces en un mes, se rechaza con `CorteRepetidoEnElMes` y se pregunta al usuario). La regla
**«período conciliado»** pasa a comparar con el `hasta` de la última conciliación autorizada (para las cuentas comunes es
lo mismo que hoy). El período de una tarjeta va del día siguiente al `hasta` anterior hasta su corte. Candidatos, foto y
documento de la conciliación no cambian de forma; el «saldo según el estado de cuenta» se transcribe con el signo del
emisor y se guarda con el signo de los libros (`saldo_estado_de_cuenta = −saldo_al_corte`), así el check
`conciliaciones_saldo_coincide_al_autorizar` sigue igual. El documento rotula «Saldo por pagar según el emisor».

**Compras en cuotas (Q-T3): tabla nueva `bancos.cuotas_de_tarjeta`.**

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `empresa_id` | uuid | no | FK on delete cascade |
| `movimiento_id` | uuid | no | El cargo (nota de débito de la tarjeta) por el **total**: FK `→ movimientos (id)` **on delete cascade** (eliminar el cargo elimina sus cuotas) |
| `numero` | smallint | no | `between 1 and 60`; único `(movimiento_id, numero)` |
| `monto` | numeric(14,2) | no | `> 0`; Σ = monto del cargo (dominio; la última absorbe el redondeo) |
| `conciliacion_id` | uuid | sí | La conciliación del corte en que el emisor la facturó; índice |

**Interés de las cuotas y parte no corriente** **[contador 19/11, V-10]**: el cargo en cuotas es por el **precio de la
compra**; si el emisor cobra interés por las cuotas, el interés se registra como **cargo aparte** (concepto con
`es_cargo_bancario`) cuando lo factura, nunca dentro del total ni repartido en las cuotas (la ayuda de la casilla «En
cuotas» lo dice). Las cuotas que vencen a más de 12 meses son **pasivo no corriente** (NIIF para las Pymes 4.7): Contabilidad
las separa con la fecha del cargo, el número de cada cuota y el día de corte de la tarjeta, que ya están; **sin columna
nueva** **[arquitecto]**: el contador dice que fecha y número alcanzan. El evento de movimientos de Bancos (cuando exista,
§5) llevará las cuotas no facturadas con su número.

RLS por empresa. El cargo en cuotas **no** es candidato en la conciliación: lo son sus cuotas pendientes. Se crean al
registrar el cargo (casilla «En cuotas», número de cuotas; el sistema reparte) y se corrigen mientras ninguna esté
marcada. El cargo queda conciliado (`movimientos.conciliacion_id`) cuando se marca su última cuota. La conciliación de la
tarjeta suma la partida **«Cuotas por facturar del emisor»** = Σ cuotas no marcadas de cargos con fecha ≤ corte, que
**resta** del saldo por pagar en libros para llegar al del emisor; la foto la guarda en
`foto_total_cuotas_por_facturar numeric(14,2) null` (columna nueva de `conciliaciones`, nula en las demás).

**`bancos.movimientos` (cambia, solo checks).** `parte_de_apertura` suma `'compra_en_cuotas'` (débito, saldo inicial de una
tarjeta con cuotas pendientes al corte; sus cuotas se cargan como arriba). Las reglas de qué partes admite una tarjeta van
en el dominio (§4.4).

**Conceptos de sistema nuevos** (`CONCEPTOS_DE_SISTEMA` e `insert` en las empresas con catálogo, repetible, como la
`0032`):

| Clave | Nombre | Aplica a | Flujo | Para |
|---|---|---|---|---|
| `pago_de_tarjeta_de_credito` | Pago de tarjetas de crédito | ambos | Operación, «Pagos de tarjetas de crédito» (Q-T4) | Pata de la cuenta monetaria al pagar la tarjeta (propuesto; se puede cambiar, §4.5) y la pata de la tarjeta |
| `adelanto_de_tarjeta_de_credito` | Adelantos de efectivo de tarjetas | ambos | Financiamiento, «Adelantos de tarjetas de crédito» | Pata de la cuenta monetaria cuando el dinero viene de la tarjeta |
| `consumo_por_documentar` | Consumos de tarjeta por documentar | débito | Sin flujo (las tarjetas no entran al flujo) | Cargo del estado de cuenta que nadie documentó (§4.6) |

### 4.3 Reglas de los movimientos de una tarjeta

1. **Cheques y chequeras**: rechazados (`TarjetaSinCheques`). `bancos.medios_de_pago` no ofrece chequeras de tarjetas.
2. **Sobregiro**: no se revisa en tarjetas; en su lugar el aviso de límite (§4.1) con el **saldo por pagar** a la fecha.
3. **Notas manuales**: cargo con concepto de débito (casilla «En cuotas»); abono con concepto de crédito. Los cargos de
   tarjeta **no** pasan por aprobación (§3.1).
4. **Intereses y comisiones del emisor**: cargo con su concepto (`es_cargo_bancario`). Arrancar **no calcula IVA**
   (dictamen §2.2): si el emisor emite FEL a nombre del NIT, se registra en Libro de compras como cualquier compra y, con
   Cuentas por pagar, se paga **ligando** el cargo de la tarjeta (marcarlo para Cuentas por pagar y forma `nota_ligada`,
   como un seguro, H7). La nota ligada ya acepta cualquier nota de débito marcada; aquí se permite también en una tarjeta.
   **[contador 19/11, V-11]** Correcto; sigue **pendiente de cotejo** el alcance vigente de la exención de la Ley del IVA,
   art. 7, numeral 4, para los emisores (el Decreto 2-2024 los pone bajo la SIB): solo afecta el texto de ayuda, no la regla.
5. **Interés con ISR retenido** (H8) y **posfechado**: no aplican a tarjetas (rechazo).
6. **Fecha de inicio y período conciliado**: las mismas reglas, con el `hasta` del corte.
7. **Diferencial cambiario** (Multimoneda): la tarjeta en USD entra como partida monetaria de naturaleza
   `cuenta_bancaria` con `sentido = 'pasivo'` en la respuesta de `multimoneda.partidas_en_moneda_extranjera`.

### 4.4 Saldo inicial de una tarjeta

Mismo mecanismo de `bancos.saldos_iniciales` (cabecera y partidas, carga abierta), con el signo del pasivo (dictamen
§2.3):

```
saldo por pagar en libros al corte = saldo al corte del estado de cuenta (lo que dice el emisor)
                                   + consumos registrados que el emisor aún no cobró   (debito_en_transito)
                                   + cuotas por facturar                               (compra_en_cuotas)
                                   − pagos en tránsito                                 (deposito_en_transito)
                                   ± errores del emisor                                (error_del_banco)
```

Partes que admite una tarjeta: `saldo_del_banco` (débito si se debe, crédito si hay saldo a favor), `debito_en_transito`,
`deposito_en_transito` (rotulado «Pago en tránsito»), `error_del_banco`, `compra_en_cuotas`; **no** `cheque_en_circulacion`,
`cheque_posfechado` ni `saldo_global` (`ParteNoAdmitidaEnTarjeta`). El cuadre muestra «Saldo por pagar». En la revisión del
cierre de la carga, Bancos da la cifra `total_tarjetas` aparte de `total_bancos` y `total_sobregiros`.

### 4.5 Pagar la tarjeta: transferencia con concepto (Q-T4)

Una transferencia **hacia** una tarjeta (o desde ella) lleva en la pata de la cuenta monetaria un concepto con flujo:

| Transferencia | Pata de la cuenta monetaria | Pata de la tarjeta |
|---|---|---|
| Monetaria → tarjeta (pago) | Débito con el concepto elegido; propuesto `pago_de_tarjeta_de_credito` (Operación); se puede elegir otro débito no reservado (p. ej. «Pago de préstamo», Financiamiento) | Crédito, `pago_de_tarjeta_de_credito` |
| Tarjeta → monetaria (adelanto de efectivo) | Crédito con `adelanto_de_tarjeta_de_credito` (Financiamiento) u otro crédito no reservado | Débito, mismo concepto |
| Monetaria ↔ monetaria | `transferencia` (sin flujo), como hoy | — |

Columna nueva `transferencias.concepto_id uuid null` con FK compuesta `(concepto_id, empresa_id) → conceptos`; check:
nula salvo que una de las dos cuentas sea tarjeta (lo cuida el dominio; la base no ve el tipo). Las dos notas de la
transferencia guardan su concepto como hoy. Con monedas distintas es la transferencia cruzada de Multimoneda. Pasa por
la aprobación de transferencias (§3.1). El aviso «Pago de contado del último corte: Q…; fecha límite dd/mm» se muestra al
elegir la tarjeta como destino.

**Ayuda del concepto** **[contador 19/11, P-1 b]**, junto al selector y en la descripción del concepto de sistema: «Operación
si la tarjeta se paga de contado cada mes; Financiamiento si se usa como crédito (pago mínimo, saldo con intereses). Elija
una política y úsela siempre.» No cambia datos: el concepto ya es editable.

### 4.6 Consumos sin documento y Cuentas por pagar

- **Forma `tarjeta` en Cuentas por pagar** (Q-T7 a): un pago con `forma = 'tarjeta'` crea, por
  `registrar_nota_de_origen`, un **cargo** en la tarjeta (nota de débito con origen CP, concepto `pago_a_proveedor` o con
  desglose de activo). Reglas: cuenta de tipo tarjeta (`CuentaNoEsTarjeta`); la nota de débito de siempre **rechaza**
  tarjetas (`UseLaFormaTarjeta`); **fecha = fecha del consumo** (no futura; no anterior a las mínimas de CP4 §5.1.5); **sin
  retención descontada**: si algún cargo del pago tiene retenciones y la empresa es agente de retención de IVA, o el
  proveedor es del régimen opcional simplificado y la empresa debe retenerle ISR (datos fiscales del libro), **aviso**
  (dictamen §2.2). **[contador 19/11, P-2 b; texto pendiente de cotejar el reglamento del Decreto 20-2006]** Se separa por
  impuesto, porque con tarjeta la retención de IVA al comercio la practica el **emisor** y el aviso de antes inducía a
  retener dos veces:
  - **IVA** (empresa agente de retención de IVA y el cargo tiene retención de IVA): «Pagada con tarjeta, la retención de IVA
    la practica el emisor de la tarjeta: no registre retención de IVA en esta factura. Revise con su contador y, si la
    registró, corríjala en Libro de compras antes de pagar.»
  - **ISR** (proveedor del régimen opcional simplificado, Decreto 10-2012, art. 48): el aviso de antes, porque el emisor no
    retiene ISR por la empresa: «La forma tarjeta no descuenta retenciones: el emisor cobrará el total de la factura. Revise
    con su contador si debe retener; si no, corrija la retención en Libro de compras antes de pagar.»

  No bloquea. Cuenta para la
  bancarización (medio bancario). Regla «quien autorizó no paga» de §3.8 si `bancos.aprobaciones.notas_de_debito` aplica.
  Evento `pago_registrado` con `efecto = 'tarjeta'` (nuevo: Debe Proveedores / Haber la cuenta de pasivo de la tarjeta).
  Anular: como la nota de débito (`anular_movimiento_de_origen`).
- **Migración de Cuentas por pagar** (`00xx_pago_con_tarjeta`): `pagos_forma_valida` suma `'tarjeta'`;
  `pagos_movimiento_creado_unico` suma `'tarjeta'` a su filtro. Permiso nuevo `cuentas-por-pagar.pagos.pagar-con-tarjeta`.
- **`bancos.medios_de_pago`** suma `tipo` en `CuentaParaPagar` (y `limiteDeCreditoCentavos`, `saldoPorPagarCentavos`).
- **Consumos sin documento** (dictamen §2.3): en la conciliación, un consumo del estado de cuenta que nadie registró se
  registra (como toda nota del banco antes de conciliar) con `consumo_por_documentar`. Reporte **«Consumos de tarjeta por
  documentar»** (Bancos → Reportes) hasta que se **reclasifiquen** (al registrar la factura: marcar para Cuentas por pagar y
  ligar; o reclasificar a un gasto si no habrá factura). Cargarlo al empleado por Cuentas por liquidar queda para después
  (orden de Cuentas por liquidar que aún no existe; Q-T7).

### 4.7 Reportes de la tarjeta

- **Saldos por cuenta** (BS-R1): tercer grupo **«Tarjetas de crédito»** (saldo por pagar, límite, disponible de crédito =
  límite − saldo por pagar, último corte con su fecha límite y pago de contado), nunca sumado ni compensado con Bancos ni
  Sobregiros.
- **Estado de cuenta** por cuenta: en tarjetas rotula «Cargos» y «Abonos» y el saldo como «Saldo por pagar».
- **Flujo de efectivo**: excluye las tarjetas; leyenda si hay tarjetas activas: «Las compras con tarjeta de crédito no son
  salidas de efectivo: se muestran cuando se paga la tarjeta.»
- **Tarjetas por pagar** (dentro de Saldos por cuenta, filtro): cortes con fecha límite en los próximos N días y lo pagado
  desde el corte.

## 5. Eventos para Contabilidad

Contabilidad no existe todavía; los eventos se publican al confirmar (bus) y quedan en los contratos para cuando llegue.

| Evento | Quién | Datos | Partida que sacará Contabilidad |
|---|---|---|---|
| `cuentas-por-pagar.pago_registrado` / `pago_anulado` (cambian) | CP | `forma` suma `'cheque_de_apertura'` y `'tarjeta'`; `efecto` suma `'tarjeta'` | Cheque de apertura: Debe Proveedores / Haber Bancos en la **fecha del cheque** (Contabilidad debe ignorar el concepto que tenía el cheque antes de ligar: Bancos lo reclasifica al ligar y su evento de reclasificación, cuando exista, lleva el concepto anterior). Tarjeta: Debe Proveedores / Haber Tarjeta |
| `cuentas-por-pagar.cheque_de_apertura_anulado_decidido` (nuevo) | CP | `movimientoId`, `inversoId`, `decision`, `causa`, `proveedorId`, `naturaleza`, `documentoId`, `fecha`, `montoCentavos`, `medio`, `movimientoDePagoId`, `moduloDelPago`, `documentoDelPagoId` **[contador 19/11, P-3 y P-5]** | Completa la contrapartida del inverso `anulacion_de_apertura` (Debe Bancos): reconocida, Haber la cuenta de su `naturaleza` (Proveedores, Acreedores varios, remuneraciones por pagar o cuentas con socios); `ya_pagada`, Haber **la cuenta que usó el pago sustituto** (el movimiento ligado lleva `pago_a_proveedor`: Proveedores; con efectivo, la del documento de ese módulo), nunca otra vez Bancos; `pagada_antes_del_corte`, Haber Proveedores y Acreedores varios; `no_se_debe`, otros ingresos o corrección de error de un período anterior (lo decide el contador); `prescrita`, otros ingresos gravables, en la fecha elegida |
| `cuentas-por-pagar.cheque_de_apertura_anulado_deshecho` (nuevo) | CP | El de arriba y el motivo | Reversa |
| Movimientos de Bancos (cuando Bancos publique, con Contabilidad) | Bancos | Cada movimiento lleva `tipoDeCuenta` | La cuenta contable de una tarjeta es de pasivo |

Las solicitudes y aprobaciones **no** publican eventos contables (no son hechos económicos, dictamen §1.1).

## 6. Integración sin importarse entre módulos

| Necesidad | Cómo |
|---|---|
| CP liga y desliga el posfechado | Órdenes `bancos.ligar_cheque_de_apertura` y `bancos.desligar_cheque_de_apertura` (§2.7) |
| CP lista posfechados sin ligar y cheques de apertura anulados | Lectura de `bancos.movimientos` desde su `infraestructura` (permitido por `dependeDe: ['bancos']`) |
| CP y Caja chica saben si aplica la aprobación | Orden `bancos.evaluar_aprobacion` (§3.8) |
| Bancos sabe si CP está activo para el hallazgo de cierre | `ModulosDeOrigen.estaActivo` / `CuentasPorPagarActivo` (ya existe) |
| Cierre de la carga | Bancos responde `empresas.revisar_cierre_de_carga` con `posfechados_sin_ligar` y `total_tarjetas` |
| CP paga con tarjeta | `bancos.medios_de_pago` (suma `tipo`) y `registrar_nota_de_origen` |
| Multimoneda | La tarjeta responde a `multimoneda.partidas_en_moneda_extranjera` como cuenta de pasivo |
| CP liga el pago sustituto de un cheque de apertura anulado | Órdenes `bancos.ligar_pago_sustituto_de_apertura` y `bancos.desligar_pago_sustituto_de_apertura` (§2.7) |
| Llaves entre esquemas (con índice) | `cuentas_por_pagar.cheques_de_apertura_anulados.movimiento_id`, `.inverso_id`, `.movimiento_de_pago_id` → `bancos.movimientos`; `.proveedor_id` → `terceros.proveedores`; `pagos.cheque_de_apertura_referido_id` → `bancos.movimientos`. Todas hacia su `dependeDe` (la prueba de importaciones entre módulos las revisa) |

## 7. Permisos (PLAN §3.5; ninguno `soloSuperacceso`)

| Permiso | Para | Migración de reparto |
|---|---|---|
| `bancos.solicitudes.ver` | Bandeja, ficha y reporte de solicitudes | Quien tenía `bancos.movimientos.ver` (en `rol_permisos` **y** `usuario_permisos`) |
| `bancos.solicitudes.aprobar` | Aprobar y rechazar; cambiar `pide_aprobacion` de un concepto | **Nadie** (se asigna a mano: es una decisión de control) |
| `bancos.solicitudes.registrar-referencia` | Referencia del banco después de aprobar | Quien tenía `bancos.notas.crear` o `bancos.transferencias.crear` |
| `bancos.solicitudes.exportar` | Excel del reporte de solicitudes | Quien tenía `bancos.movimientos.exportar` |
| (solicitar y cancelar) | Usan `bancos.cheques.emitir`, `bancos.notas.crear`, `bancos.transferencias.crear` | — |
| (cortes de tarjeta) | Registrar, corregir y eliminar cortes: `bancos.conciliaciones.conciliar`; ver: `bancos.conciliaciones.ver` | — |
| `bancos.consumos-por-documentar.ver` / `.exportar` | Reporte de consumos por documentar | Quien tenía `bancos.movimientos.ver` / `.exportar` |
| `cuentas-por-pagar.pagos.ligar-cheques-de-apertura` | Forma `cheque_de_apertura` | Quien tenía `cuentas-por-pagar.pagos.aplicar-a-apertura` |
| `cuentas-por-pagar.pagos.desligar-cheques-de-apertura` | Desligar | Ídem |
| `cuentas-por-pagar.cheques-de-apertura-anulados.ver` | Bandeja (migración de AP-4a) | Quien tenía `cuentas-por-pagar.documentos.ver` |
| `cuentas-por-pagar.cheques-de-apertura-anulados.decidir` | Reconocer, descartar (con el pago sustituto) y deshacer (migración de AP-4a) | Quien tenía `cuentas-por-pagar.pagos.aplicar-a-apertura` |
| `cuentas-por-pagar.pagos.pagar-con-tarjeta` | Forma `tarjeta` | Quien tenía `cuentas-por-pagar.pagos.emitir` |

## 8. Auditoría (todo dentro de la unidad de trabajo; `core.auditoria` solo se agrega)

| Acción | Recurso | `anterior` |
|---|---|---|
| Rechazar o cancelar una solicitud | `bancos.solicitudes`, `anular` | El DTO de la solicitud, con el motivo |
| Cambiar `pide_aprobacion` | `bancos.conceptos`, `corregir` | El concepto como estaba |
| Cambiar una referencia ya escrita | `bancos.notas` o `bancos.transferencias`, `corregir` | El movimiento como estaba |
| Ligar y desligar el cheque | `bancos.cheques`, `corregir` | El movimiento con su concepto, origen y desglose |
| Ligar y desligar el pago sustituto **[contador 19/11]** | `bancos.cheques` o `bancos.notas`, `corregir` | El movimiento con su concepto y origen |
| Desligar (lado CP) | `cuentas-por-pagar.pagos`, `anular` | El `PagoDto` |
| Deshacer una decisión de la bandeja | `cuentas-por-pagar.cheques-de-apertura-anulados`, `anular` | La decisión y, si fue reconocida, el cargo |
| Eliminar o corregir un corte | `bancos.cortes-de-tarjeta`, `eliminar` / `corregir` | El corte |
| Cambiar límite o datos de la tarjeta | `bancos.cuentas-bancarias`, `corregir` (como hoy) | La cuenta |

Aprobar, solicitar, reconocer y descartar son altas: sin auditoría (quedan en sus propias tablas con quién y cuándo).

## 9. Errores nuevos (código propio, familias del core)

Bancos: `RequiereAprobacion` (409), `SolicitudYaResuelta` (409), `AprobadorEsElSolicitante` (403), `SuperaccesoNoAprueba`
(403), `YaAprobada` (409), `CorreccionRequiereAprobacion` (409), `ChequeDeAperturaNoLigable` (422),
`MontoDistintoDelCheque` (422), `PagoSustitutoNoLigable` (422) **[contador 19/11]**, `TarjetaSinCheques` (422), `NumeroDeTarjetaCompleto` (422), `TipoDeCuentaConMovimientos`
(409), `ParteNoAdmitidaEnTarjeta` (422), `CorteRepetidoEnElMes` (409), `CuotasYaFacturadas` (409).
Cuentas por pagar: `AutorizadorNoPaga` (403), `PagoNoEsChequeDeApertura` (422), `DeudaReconocidaConMovimientos` (409),
`ChequeDeAperturaYaDecidido` (409), `PagoSustitutoConOrigen` (422) y `FechaDePrescripcionInvalida` (422)
**[contador 19/11]**, `CuentaNoEsTarjeta` (422), `UseLaFormaTarjeta` (422).

## 10. API

| Ruta | Permiso |
|---|---|
| `GET /api/bancos/solicitudes?estado=&tipo=&cuentaBancariaId=&desde=&hasta=&pagina=` | `solicitudes.ver` |
| `GET /api/bancos/solicitudes/:id` (con aprobaciones, movimiento y `puedeAprobar`, `puedeCancelar`, `puedeRegistrarReferencia`) | `solicitudes.ver` |
| `POST /api/bancos/solicitudes` (cuerpo por `tipo`, como el formulario de cada acción) | El de la acción |
| `POST /api/bancos/solicitudes/:id/aprobar` · `/rechazar {motivo}` · `/cancelar {motivo}` · `/referencia {referencia}` | `aprobar` · `aprobar` · el de la acción · `registrar-referencia` |
| `GET /api/bancos/solicitudes/reporte` (Excel con `?formato=xlsx`) | `solicitudes.ver` / `.exportar` |
| `GET|POST|PUT|DELETE /api/bancos/cuentas-bancarias/:id/cortes[/:corteId]` y su archivo (`POST|GET|DELETE …/archivo`) | `conciliaciones.ver` / `.conciliar` |
| `PUT /api/bancos/notas/:id/cuotas {cuotas}` | `notas.editar` |
| `GET /api/bancos/consumos-por-documentar` | `consumos-por-documentar.ver` / `.exportar` |
| `GET /api/cuentas-por-pagar/cheques-de-apertura?proveedorId=` (posfechados sin ligar) | `pagos.ligar-cheques-de-apertura` |
| `POST /api/cuentas-por-pagar/pagos` con `forma: 'cheque_de_apertura' \| 'tarjeta'` | El de la forma |
| `POST /api/cuentas-por-pagar/pagos/:id/desligar {motivo}` | `pagos.desligar-cheques-de-apertura` |
| `GET /api/cuentas-por-pagar/cheques-de-apertura-anulados?estado=pendientes\|decididos` | `cheques-de-apertura-anulados.ver` |
| `POST …/cheques-de-apertura-anulados/:movimientoId/reconocer` (con `naturaleza`) · `/descartar` (cuerpo por causa: `movimientoDePagoId`, o `moduloDelPago` y `documentoDelPagoId` con su fecha, o `proveedorId` y `naturaleza`, o `fecha` en `prescrita`) · `/deshacer` | `…decidir` |
| `GET …/cheques-de-apertura-anulados/:movimientoId/pagos-sustitutos` (débitos ligables, del mismo beneficiario primero) | `…decidir` |

Rutas que cambian de forma: `POST /bancos/cheques`, `/bancos/notas`, `/bancos/transferencias` pueden responder 409
`RequiereAprobacion`; la de transferencias acepta `conceptoId`; las de cuentas bancarias aceptan los datos de tarjeta.
Dinero como texto con dos decimales en la API.

## 11. Cliente

- **Bancos → Operación → «Solicitudes»** (`/bancos/solicitudes`): bandeja con pestañas Pendientes (las que el usuario
  puede aprobar primero), Mías, Aprobadas sin referencia y Todas; tarjeta con tipo, cuenta, beneficiario, monto, acumulado
  del día, aprobaciones «1 de 2» y acciones según el DTO. Ficha con la historia. Ventanas de rechazar, cancelar y
  referencia (motivo o referencia, `usarFormulario`). Aviso de A-9 y de la ayuda «no sustituye las firmas registradas».
- **Emitir cheque, nota y transferencia**: con el 409 `RequiereAprobacion`, la ventana muestra «Este pago necesita
  aprobación (acumulado del día Q…, 2 aprobadores)» y el botón «Enviar como solicitud». Lógica pura
  (`edicion-de-solicitud.ts`) con pruebas.
- **Cuentas bancarias**: tipo «Tarjeta de crédito» con sus campos (límite, día de corte, días para pagar, últimos 4,
  tarjeta principal), ayuda del número. Ficha de la tarjeta con «Saldo por pagar», disponible de crédito y cortes.
- **Conciliación**: en tarjetas, el período se elige por **corte** (lista de cortes sin conciliar; «Registrar corte»
  con el estado de cuenta adjunto), grupo de **cuotas** como candidatos y partida «Cuotas por facturar del emisor» en
  pantalla e impresión. Toca `ConciliarCuenta.vue`: va después de BS-7.
- **Nota de cargo en tarjeta**: casilla «En cuotas», número de cuotas y vista del reparto.
- **Transferencia**: con una tarjeta en cualquiera de las dos cuentas, selector de concepto con el propuesto.
- **Cuentas por pagar**: en la ventana de pago, formas «Cheque de apertura» (elige el cheque; monto y fecha fijos y a la
  vista; avisos) y «Tarjeta» (elige la tarjeta; aviso de retención); botón «Desligar» en la ficha del pago; aviso de
  posfechados sin ligar en la ficha del proveedor; campo «Cheque de apertura con que se pagó» en la cuenta de apertura;
  **Operación → «Cheques de apertura anulados»** (bandeja con ventanas reconocer, descartar y deshacer, texto de
  prescripción). Mensaje de `AutorizadorNoPaga` tal como viene.
- Textos legales en un solo lugar por lado (`textos-de-aprobaciones.ts`, `textos-de-tarjeta.ts` y, para la bandeja,
  `textos-de-cheques-de-apertura.ts` en Cuentas por pagar), para cotejarlos. **[contador 19/11, V-14]** Cada texto que cita
  una ley lleva la marca `pendienteDeCotejo: true` y la cita del cuadro de §18.3; una prueba lista los marcados, y la QA de
  cada parte (AP-7, AB-7, TC-9) no se da por terminada mientras quede alguno sin cotejar o sin cambiar por una versión sin
  cita. Los textos de §2.5 (prescripción, `no_se_debe`) y de §4.6 (retenciones) ya traen la redacción del contador.

## 12. Reportes y Excel (según la sección del menú)

| Pantalla | Sección | Excel |
|---|---|---|
| Solicitudes (bandeja) | Operación | No |
| Reporte «Solicitudes de pago» (por estado, solicitante, aprobadores, tiempos) | Reportes | Imprimir y exportar |
| Cuentas bancarias | Administración | **Sí**: la importación y exportación de hoy suman Tipo «Tarjeta de crédito», Límite de crédito, Día de corte, Días para pagar, Últimos 4 y Tarjeta principal (por nombre); el número se valida contra Luhn |
| Saldos iniciales | Administración | Sí (como hoy), con las partes admitidas en tarjetas y la clase `compra_en_cuotas` con sus cuotas |
| Cortes de tarjeta, conciliación | Operación | No |
| Consumos de tarjeta por documentar | Reportes | Imprimir y exportar |
| Saldos por cuenta (grupo Tarjetas) | Reportes | Imprimir y exportar (BS-R2) |
| Cheques de apertura anulados (bandeja) | Operación | No |

## 13. Migraciones y datos existentes

| Migración | Módulo | Contenido | Datos existentes |
|---|---|---|---|
| `00xx_cp_ap_cheques_de_apertura` (AP-1) | Cuentas por pagar | Forma, único parcial, referido, permisos de ligar y desligar y su reparto | Cero pagos en desarrollo; los checks se reemplazan con los valores viejos dentro |
| `00xx_cp_ap_bandeja_de_anulados` (AP-4a) **[contador 19/11]** | Cuentas por pagar | Origen nuevo de `documentos`, tabla de decisiones con `naturaleza`, `movimiento_de_pago_id`, `modulo_del_pago`/`documento_del_pago_id` y la causa `pagada_antes_del_corte`, permisos de la bandeja y su reparto | Tabla nueva; ningún documento tiene el origen nuevo |
| `00xx_aprobaciones` (AB-1) | Bancos | `solicitudes`, `aprobaciones_de_solicitudes`, `conceptos.pide_aprobacion` (relleno `false` donde `es_cargo_bancario` o clave de sistema), correlativo, permisos y su reparto | Nada cambia hasta encender las variables |
| `00xx_tarjetas_de_credito` (TC-1) | Bancos | Check de `tipo`, columnas de tarjeta, `cortes_de_tarjeta`, `cuotas_de_tarjeta`, `conciliaciones.corte_id`, `.hasta` (relleno y `not null`), `.foto_total_cuotas_por_facturar`, `transferencias.concepto_id`, parte `compra_en_cuotas`, tres conceptos de sistema, permisos | `hasta` = fin de mes de cada conciliación; ninguna cuenta es tarjeta |
| `00xx_pago_con_tarjeta` (TC-5) | Cuentas por pagar | Forma `tarjeta`, único, permiso | — |

Todas repetibles donde insertan conceptos o permisos; `when` del journal mayor que el último; se generan con
`bd:generar` y nadie más generando migraciones del mismo módulo. Pruebas de cada check, de la RLS y de
`politicas-de-los-modulos`.

## 14. Convivencia y riesgos

1. **Impresión de cheques**: A-6 cambia IC-5 (firmas). Si IC-5 ya está en `main` cuando llegue AB, AB-6 lo ajusta; si no,
   IC-5 lo incluye leyendo `solicitudes` (que entonces debe existir: AB-1 antes de IC-5, o IC-5 lo deja en blanco).
2. **Conciliación** (`ConciliarCuenta.vue`, `conciliacion-candidatos.drizzle.ts`): TC-3 y TC-7 la tocan; van después de BS-4,
   BS-7 y CP4-B3b, y de cualquier paso de H2 abierto.
3. **Regla de período conciliado**: pasar de `(anio, mes)` a `hasta` toca la revisión de fechas de todos los movimientos.
   Prueba de regresión: las conciliaciones existentes dan el mismo resultado.
4. **Multimoneda**: TC espera la moneda en la cuenta; los niveles de aprobación se comparan en quetzales.
5. **Caja chica** (CCL-B1 toma la siguiente migración libre de Bancos) y **Cuentas por liquidar**: §3.8 cambia CC-k sin
   migración; Cuentas por liquidar sigue sin control hasta Q-A6.
6. **Rendimiento del acumulado**: un `select sum` por solicitud sobre índices parciales; se prueba con 100,000 movimientos.
7. **Concurrencia**: dos aprobadores a la vez sobre una solicitud de dos niveles: la fila bloqueada `for update` y la PK de
   aprobaciones lo resuelven (uno ejecuta, el otro ve `SolicitudYaResuelta`).
8. **Textos legales** a cotejar antes de mostrarlos (dictamen, al final): Decreto 20-2006 arts. 4 y 20; Ley del IVA arts.
   7.4, 16, 18 y 37; Decreto 10-2012 arts. 21.22, 23 y 48; Decreto 2-2024; Código Civil arts. 1501, 1506, 1508 y 1514.
   **[contador 19/11]** Siguen pendientes de cotejo literal (§18.3); no bloquean programar, sí dar la QA por terminada
   (§11). Se suman el reglamento del Decreto 20-2006 (retención del emisor de la tarjeta) y el Código de Comercio, arts.
   410, 501 y 513.

## 15. Pasos (un commit cada uno; servidor y cliente por separado; pruebas en cada uno)

Orden acordado (Q-O1): **AP** primero (desbloquea a usuarios con apertura en curso), **AB** después, **TC** cuando
Multimoneda esté en Bancos. Estado de lo que se esperaba (verificado en `main` `b9c0a036`, 2026-11-19): BS-3, BS-4, BS-7,
BS-R1, CP4-B3b, CP4-12 (QA), IC-1 a IC-7 y EM-2 **ya están en `main`**; Multimoneda en Bancos (MM-B1, MM-B2) **no**.
Regla de siempre: nunca dos ramas generando migraciones del mismo módulo a la vez (AP-1 y AP-4a en Cuentas por pagar;
AB-1 y TC-1 en Bancos).

La columna «Espera» dice qué respuesta del usuario (§19) necesita el paso; «—» = ninguna.

| Paso | Contenido | Pruebas | Va después de | Espera |
|---|---|---|---|---|
| **AP-0** (servidor y cliente, dos commits) **[HECHO 2026-11-19]** | Hallazgo `posfechados_sin_ligar` en la revisión de cierre de Bancos (§2.6); aviso en la ficha del proveedor y en la ventana de pago de CP (texto «…se podrán ligar pronto») | Con y sin CP activo; con posfechados ligados (no cuentan); sin posfechados (sin hallazgo) | — (BS-3 y EM-2 en `main`) | — |
| **AP-1** (servidor, datos CP) **[HECHO 2026-11-23]** | Migración de `pagos` (§2.2, la parte AP-1), `*.tablas.ts`, permisos `ligar-` y `desligar-cheques-de-apertura` y su reparto | Forma nueva, referido solo en apertura, único vigente (dos pagos vigentes al mismo cheque fallan; anulado + vigente pasa), RLS, reparto en roles y directos | — (CP4-12 en `main`) | — |
| **AP-2** (servidor, Bancos) **[HECHO 2026-11-23]** | Órdenes `ligar_cheque_de_apertura` y `desligar_cheque_de_apertura` (§2.7), auditoría, aviso «posfechado cobrado pronto» en Ligar y al marcarlo en la conciliación | Ligar no posfechado, con origen, anulado, monto distinto (rechazos); beneficiario distinto (aviso); marcado en la primera conciliación (aviso) y en una posterior (sin aviso); concepto y desglose; corregir/eliminar/blanquear después (rechazo); desligar ajeno (rechazo); auditoría | — (sin migración; puede ir en paralelo con AP-1) | — |
| **AP-3** (servidor, CP) | Forma `cheque_de_apertura`, desligar, anular y aviso `movimiento_por_cambiar`, referido en cuenta de apertura, evento | Solo saldos iniciales, otro proveedor, sin autorizar; fecha = cheque, comprometido y pagado en su fecha; carga cerrada (pasa); desligar y religar; anular (factura pendiente, sin bandeja); lote de caducos; CP5 al corte; bancarización en el mes del cheque; 403 | AP-1, AP-2 | — |
| **AP-4a** (servidor, datos CP) **[contador 19/11]** | Migración de la bandeja (§2.2, la parte AP-4a): origen nuevo de `documentos`, tabla de decisiones con `naturaleza`, pago sustituto y `pagada_antes_del_corte`, permisos de la bandeja y su reparto | Checks de decisión y causa (reconocida sin cargo, sin naturaleza o sin proveedor fallan; `ya_pagada` con cuenta sin movimiento falla; efectivo sin documento falla), único vigente por cheque y por pago sustituto, RLS | AP-1 (orden de migraciones de CP) | P-3, P-5 |
| **AP-4b** (servidor, Bancos) **[contador 19/11]** | Órdenes `ligar_pago_sustituto_de_apertura` y `desligar_pago_sustituto_de_apertura` (§2.7), auditoría | Débito con origen, partida de apertura, anterior al corte, anulado (rechazos); monto distinto (aviso); concepto `pago_a_proveedor`; corregir o anular después (rechazo por el revisor); desligar | AP-2 | P-3 |
| **AP-4** (servidor, CP) | Bandeja: listar, reconocer (con naturaleza y aviso de NIT nulo desde Q30,000), descartar con las cuatro causas, deshacer, aviso `movimiento_por_cambiar` del pago sustituto, eventos | Fecha del inverso; fuera del libro; monto del cheque; con referido (no anula el pago de apertura); `ya_pagada` con movimiento (ligado y concepto cambiado) y con efectivo; pago sustituto con origen (rechazo); `pagada_antes_del_corte`; `prescrita` con fecha anterior al inverso o futura (rechazo); deshacer con movimientos (rechazo) y deshacer `ya_pagada` (desliga); doble decisión (rechazo); Bancos anula el pago sustituto (rechazo); 403 | AP-3, AP-4a, AP-4b | P-3, P-4, P-5 |
| **AP-5** (cliente, CP y conciliación de Bancos) | Formas y desligar en la ventana y la ficha del pago, campo referido, aviso en el proveedor, aviso «posfechado cobrado pronto» en la conciliación | Lógica pura de la ventana | AP-3 | — |
| **AP-6** (cliente, CP) | Pantalla de la bandeja: ventanas reconocer (naturaleza), descartar (selector del pago sustituto, fecha de prescripción) y deshacer, textos de §2.5 con `pendienteDeCotejo` | Lógica pura de las ventanas | AP-4 | P-4 (texto) |
| **AP-7** (QA) | Apertura con un posfechado de chequera no registrada y su factura de saldo inicial; ligar, pagado en su fecha, anular, religar; cheque en circulación anulado → reconocer y pagar; descartar «ya pagada» con un cheque posterior y «pagada antes del corte»; cierre de la carga con el hallazgo; textos cotejados | — | AP-5, AP-6 | — |
| **AB-1** (servidor, datos Bancos) | Migración de §3.3 y `pide_aprobacion`, permisos | Checks por tipo y estado, PK de aprobaciones, solo agregar en aprobaciones, relleno de `pide_aprobacion`, RLS | — (IC-1 en `main`); no a la vez que TC-1 ni otra migración de Bancos | — |
| **AB-2** (servidor) | Evaluador (niveles, concepto, acumulado día/semana/no; en quetzales directo hasta MM-B), `RequiereAprobacion` en las tres acciones, solicitar, corrección de lo aprobado, variables con la ayuda de §3.9 | Umbral exacto, dos niveles, fraccionamiento en tres cheques, nombres con acentos, semana ISO, nota de cargo bancario (no pide), nota de crédito (no pide), transferencia, corregir monto arriba (rechazo) y fecha (pasa), rendimiento | AB-1 | — |
| **AB-3** (servidor) | Aprobar (con ejecución), rechazar, cancelar, referencia, superacceso, A-9, reporte y Excel, auditoría | Autoaprobación (rechazo aun con todos los permisos), superacceso, dos aprobadores (el mismo dos veces falla), ejecución que falla por sobregiro (se deshace todo), fecha de hoy y posfechado conservado, mes conciliado al aprobar, número de cheque sin huecos, concurrencia, referencia sin y con auditoría, 403 | AB-2 | — |
| **AB-4** (servidor, CP y Caja chica) | Orden `evaluar_aprobacion` y la regla de §3.8 | CP: autorizó y paga (rechazo con la variable; pasa sin ella o bajo el umbral); nota ligada; Caja chica: custodio repone con `avisar` (rechazo si aplica) | AB-2 | — |
| **AB-5** (cliente, Bancos) | Bandeja de solicitudes, flujo del 409 en las tres ventanas, referencia, avisos y ayuda de §3.9 | Lógica pura | AB-3 | — |
| **AB-6** (servidor y cliente) | Firmas del comprobante (A-6): ajusta el comprobante de IC-5, que ya está en `main` | Con uno y dos aprobadores, sin solicitud | AB-3 | — |
| **AB-7** (QA) | Dos niveles, fraccionamiento, rechazo, referencia vencida, CP con autorizador, Caja chica, celular; textos cotejados | — | AB-4, AB-5, AB-6 | — |
| **TC-1** (servidor, datos Bancos) | Migración de §4.2 | Checks, relleno de `hasta` (conciliaciones iguales), cuotas en cascada, Luhn no va en la base (dominio), RLS | MM-B1 y MM-B2 (Multimoneda en Bancos; **no** están en `main`); no a la vez que AB-1 | — |
| **TC-2** (servidor) | Cuenta tarjeta (Luhn, tipo con movimientos, principal), reglas de movimientos (§4.3), transferencias con concepto y su ayuda (§4.5), flujo sin tarjetas, Saldos por cuenta y estado de cuenta, medios de pago | Cheque en tarjeta (rechazo), límite (aviso), sin sobregiro, pago de tarjeta en el flujo como Operación y adelanto como Financiamiento, compra con tarjeta fuera del flujo, grupos de saldos sin compensar, Excel de cuentas | TC-1 | P-1 (solo el texto) |
| **TC-3** (servidor) | Cortes, conciliación por corte, cuotas (interés aparte, §4.2), consumos por documentar | Período del corte, corte que cae en fin de semana, dos cortes en un mes (rechazo), cuotas marcadas en tres cortes y cargo conciliado al final, foto, período conciliado con `hasta`, regresión de cuentas comunes | TC-2 (BS-4 en `main`) | — |
| **TC-4** (servidor) | Saldo inicial de tarjeta | Partes admitidas y rechazadas, cuadre con cuotas, cifra `total_tarjetas` en el cierre | TC-3 | — |
| **TC-5** (servidor, CP) | Migración y forma `tarjeta`, nota de débito rechaza tarjeta, avisos de retención separados por impuesto (§4.6), evento | Empresa agente de IVA y no agente (aviso de IVA solo en la primera), régimen simplificado (aviso de ISR), los dos a la vez, bancarización, anular, quien autorizó no paga | TC-2, AB-4 | P-2 (solo el texto) |
| **TC-6** (cliente, Bancos) | Cuentas, notas con cuotas (ayuda del interés), transferencia con concepto y su ayuda, ficha de la tarjeta, reportes | Lógica pura (reparto de cuotas, signos) | TC-2 | P-1 (solo el texto) |
| **TC-7** (cliente, conciliación) | Cortes y conciliación por corte | Lógica pura | TC-3 (BS-7 en `main`) | — |
| **TC-8** (cliente, CP) | Forma tarjeta | Lógica pura | TC-5 | P-2 (solo el texto) |
| **TC-9** (QA) | Tarjeta bimonetaria, compras en cuotas, consumo sin documento, pago desde monetaria, conciliación de dos cortes, saldo inicial, CP con tarjeta; textos cotejados | — | TC-6 a TC-8 | — |

**Primer paso programable: AP-0** (servidor, después su cliente): no espera ningún paso ni respuesta. Sin bloqueos también:
AP-1, AP-2 (en paralelo con AP-1) y AP-3 (cuando estén AP-1 y AP-2); AB-1 a AB-6 no dependen de AP (el orden AP → AB
es de prioridad, Q-O1). Lo único que espera respuestas es la
bandeja (AP-4a, AP-4b, AP-4 y AP-6). Los pasos marcados «solo el texto» se programan con la redacción recomendada y se
ajustan si la respuesta es otra.

## 16. Preguntas para el usuario

_Respondidas el 2026-11-19: el usuario aceptó todas las recomendaciones (§17)._

Del dictamen (con la posición del arquitecto) y nuevas del arquitecto (marcadas ★).

| # | Pregunta | Opciones | Recomendación |
|---|---|---|---|
| Q-A1 | ¿Cómo se aprueban los montos grandes? | (a) Un umbral y un aprobador; (b) niveles por monto con 1 o 2 aprobadores distintos (máximo dos); (c) límite por usuario | **(b)**, con (c) más adelante si alguien lo pide |
| Q-A2 | ¿Se suman los pagos al mismo beneficiario para el umbral? | Por día / por semana / no (variable) | **Por día**, configurable |
| Q-A3 | Con la aprobación encendida, ¿CP y Caja chica exigen separación? | (a) Sí, automático con la aprobación de Bancos (CP: quien autorizó no paga; Caja chica: el custodio no repone); (b) variable propia de cada módulo; (c) no | **(a)**: sin ella, la aprobación se salta pagando desde CP |
| Q-A4 | ¿Aprobar una transferencia o nota crea el movimiento, o se espera la referencia del banco? | Crea y se captura la referencia después, con aviso / dos pasos | **Crea y referencia después** |
| ★Q-A5 | Las transferencias de Arrancar son solo **entre cuentas propias** (a terceros se registra nota de débito). ¿Cuáles pasan por aprobación con `transferencias` encendida? | (a) Todas; (b) solo hacia tarjetas y cuentas de otra moneda; (c) ninguna (quitar la variable) | **(a)** con la variable apagada por omisión: es simple y quien la enciende sabe por qué |
| ★Q-A6 | **Cuentas por liquidar** entrega anticipos (cheque o nota) sin ningún paso de autorización. ¿Qué hacemos? | (a) Más adelante, un mecanismo general «solicitud de origen»: el anticipo queda por aprobar en Bancos y se entrega al aprobarse; (b) quien entrega no puede ser quien registró el anticipo (exige otro paso en CL); (c) aceptar el hueco y decirlo en la ayuda | **(c) ahora y (a) en una fase posterior** si un cliente lo pide; (b) obliga a cambiar el flujo de CL ya aprobado |
| ★Q-A7 | En nivel 2, ¿los pagos de CP deben llevar dos personas además del que autorizó? | (a) No: una autoriza y otra paga (dos personas); (b) Sí: el pago queda por aprobar en Bancos | **(a)**: (b) obliga a un estado «por aprobar» en los pagos de CP |
| ★Q-A8 | ¿Se puede corregir el monto (hacia arriba), beneficiario o cuenta de un egreso que pide aprobación? | (a) No: anular y solicitar otro; (b) la corrección crea una solicitud | **(a)** |
| ★Q-A9 | ¿Quién marca un concepto como «no pide aprobación» (débitos automáticos)? | (a) Quien tiene `conceptos.editar`, con auditoría; (b) además `solicitudes.aprobar` | **(b)** |
| Q-T2 | ¿La tarjeta se concilia por corte o por mes? | Corte / mes | **Corte** |
| Q-T3 | ¿Compras en cuotas? | Sí, con «cuotas por facturar» / no por ahora | **Sí** (común en Guatemala) |
| Q-T4 | ¿Actividad del flujo del pago de la tarjeta? | Operación por omisión, editable / Financiamiento | **Operación por omisión**, editable al registrar la transferencia |
| Q-T5 | ¿Tarjetas personales de empleados o socios como cuenta de la empresa? | No (van por Cuentas por liquidar) / sí, con aviso | **No** |
| ★Q-T6 | ¿El estado de cuenta del emisor (corte) es un registro propio o parte de la conciliación? | (a) Tabla propia de cortes (se registra aunque la conciliación vaya atrasada, sirve para el aviso de pago); (b) columnas en la conciliación | **(a)** |
| ★Q-T7 | Consumos sin documento | (a) Concepto «Consumos por documentar» y reporte hasta reclasificarlos; cargarlos al empleado por Cuentas por liquidar más adelante; (b) esperar a tener lo de Cuentas por liquidar | **(a)** |
| Q-N2 | N-2 | (a) + aviso mientras tanto / (a) + (b) | **(a) + aviso** (la (b) es incorrecta) |
| Q-N3 | ¿Desligar un cheque de apertura sin anularlo? | Sí, con permiso y motivo / no | **Sí** |
| ★Q-AP1 | Cheque de apertura anulado cuyo beneficiario **no es proveedor** | (a) Para reconocer la deuda se elige o crea un proveedor en Terceros (admite NIT nulo); (b) reconocer sin proveedor, solo como decisión para Contabilidad (sin poder pagarlo desde CP) | **(a)**: así se paga por el flujo normal |
| ★Q-AP2 | ¿Se puede deshacer una decisión de la bandeja? | Sí, si el cargo reconocido no tiene movimientos / no | **Sí** |
| ★Q-O1 | Orden de las partes | AP → AB → TC / otro | **AP → AB → TC** |

## 17. Respuestas del usuario (2026-11-19)

El usuario **aceptó todas las recomendaciones** de §16 (Q-A, Q-T, Q-N, Q-AP y Q-O). Quedan así:

| # | Decisión |
|---|---|
| Q-A1 | (b) Niveles por monto con 1 o 2 aprobadores distintos (máximo dos); el límite por usuario (c), más adelante si alguien lo pide |
| Q-A2 | Acumulado por beneficiario **por día**, configurable (`bancos.aprobaciones.acumular_por`) |
| Q-A3 | (a) Separación automática con la aprobación de Bancos: en CP quien autorizó no paga; en Caja chica el custodio no repone |
| Q-A4 | Aprobar crea el movimiento; la referencia del banco se captura después, con aviso |
| Q-A5 | (a) Con `transferencias` encendida pasan todas las transferencias entre cuentas propias; la variable, apagada por omisión |
| Q-A6 | (c) ahora: se acepta el hueco de Cuentas por liquidar y la ayuda lo dice (§3.9); (a) «solicitud de origen» en una fase posterior si un cliente lo pide |
| Q-A7 | (a) En nivel 2, los pagos de CP llevan dos personas: una autoriza y otra paga |
| Q-A8 | (a) No se corrige hacia arriba el monto, el beneficiario ni la cuenta de un egreso que pide aprobación: se anula y se solicita otro |
| Q-A9 | (b) Marcar un concepto como «no pide aprobación» exige `conceptos.editar` **y** `solicitudes.aprobar`, con auditoría |
| Q-T2 | La tarjeta se concilia **por corte** |
| Q-T3 | **Sí** a compras en cuotas, con «cuotas por facturar» |
| Q-T4 | Pago de la tarjeta en **Operación por omisión**, editable al registrar la transferencia |
| Q-T5 | **No** a tarjetas personales como cuenta de la empresa (van por Cuentas por liquidar) |
| Q-T6 | (a) Tabla propia de cortes |
| Q-T7 | (a) Concepto «Consumos por documentar» y reporte hasta reclasificarlos; cargarlos al empleado por Cuentas por liquidar, más adelante |
| Q-N2 | (a) + aviso mientras tanto; la (b) no se usa |
| Q-N3 | **Sí** se puede desligar un cheque de apertura sin anularlo, con permiso y motivo |
| Q-AP1 | (a) Para reconocer la deuda se elige o crea un proveedor en Terceros (admite NIT nulo). El contador agrega la naturaleza de la deuda (P-5), que no cambia esta respuesta |
| Q-AP2 | **Sí** se puede deshacer una decisión de la bandeja, si el cargo reconocido no tiene movimientos |
| Q-O1 | Orden **AP → AB → TC** |

## 18. Validación del contador (2026-11-19)

Dictamen completo: `dictamen-bancos-aprobaciones-tarjeta-validacion-2026-11-19.md`. Veredicto: **correcto con ajustes**. El
diseño no tenía puntos «V-» propios: el contador armó la lista V-1 a V-14 con §14.8 y las decisiones **[arquitecto]**, y esa
es la numeración que sigue.

### 18.1 Dictamen por punto y dónde quedó

| V | Punto | Dictamen | Dónde quedó en el diseño |
|---|---|---|---|
| V-1 | Tabla aparte, aprobador distinto, superacceso no aprueba, sin aprobación notas de crédito y cargos del banco | Correcto | Sin cambios (§3.1, §3.5) |
| V-2 | `pide_aprobacion` y quién lo cambia | Correcto | Sin cambios (§3.1) |
| V-3 | Acumulado por día; niveles en quetzales | Correcto | §3.2: tipo de referencia del Banguat (`tiposDeCambio`); en quetzales directo hasta MM-B |
| V-4 | Fecha al aprobar | Correcto | Sin cambios (§3.5) |
| V-5 | Corregir lo aprobado | Correcto | Sin cambios (§3.5) |
| V-6 | Quien autorizó no paga; el custodio no repone | Correcto, con nota de riesgo aceptada | §3.9: ayuda de `niveles` («los pagos de CP llevan dos personas») |
| V-7 | Cuentas por liquidar sin autorización | Correcto como transitorio | §3.8 y §3.9: la ayuda lo dice textualmente |
| V-8 | Tarjeta como pasivo sin compensar | Correcto | §4.1: cita corregida (sección 11 y 2.52) |
| V-9 | Pago de la tarjeta en Operación | Correcto con ajuste de ayuda | §4.1 (la cita de 7.18) y §4.5 (ayuda, P-1) |
| V-10 | Cuotas y fórmula del saldo inicial | Correcto con ajuste | §4.2: interés de las cuotas como cargo aparte; parte no corriente para Contabilidad sin columna nueva |
| V-11 | IVA de cargos del emisor solo desde la FEL | Correcto | §4.3.4: pendiente de cotejo el art. 7.4 (solo la ayuda) |
| V-12 | Aviso de retención de la forma `tarjeta` | **Corregir** el texto | §4.6: avisos separados por impuesto (P-2) |
| V-13 | Bandeja CP-AP | Correcto con ajustes | §2.2, §2.5, §2.7, §5: `ya_pagada` con el pago sustituto, causa `pagada_antes_del_corte`, `naturaleza`, prescripción, `no_se_debe` (P-3 a P-5) |
| V-14 | Textos legales | **Pendiente** de cotejo literal | §11 (marca `pendienteDeCotejo`), §14.8 y §18.3 |

Validados sin ajuste en CP-AP: la forma `cheque_de_apertura`, el cambio de concepto al ligar, la fecha del cheque, sin
retención descontada, desligar con motivo y anular un ligado sin pasar por la bandeja.

### 18.2 Errores o riesgos en lo ya aceptado y qué se hizo

| # | Punto | Qué se hizo | ¿Contradice una respuesta? |
|---|---|---|---|
| 1 | La cita de 7.18 en el flujo de la tarjeta | Cita corregida (§4.1) y ayuda del concepto (§4.5) | No: Q-T4 (Operación por omisión, editable) queda igual; solo se agrega la ayuda (P-1) |
| 2 | El aviso de retención de la forma `tarjeta` induce a retener IVA dos veces | Avisos separados: IVA «la retiene el emisor, no la registre»; ISR como estaba (§4.6) | No: Q-T7 no trata el aviso (P-2) |
| 3 | `ya_pagada` duplica el registro en Contabilidad | Pago sustituto ligado (`movimiento_de_pago_id`, órdenes nuevas de Bancos, concepto `pago_a_proveedor`), efectivo con su documento y causa `pagada_antes_del_corte` (§2.2, §2.5, §2.7, §5); pasos AP-4a y AP-4b | No: la forma de `ya_pagada` no era una pregunta de §16 (P-3) |
| 4 | Texto de prescripción con plazos fijos | Texto sin plazos, interrupción por la entrega del cheque, fecha elegida por el usuario (§2.5) | No: Q-AP2 no cambia (P-4) |
| 5 | `no_se_debe` y el IVA de la factura original | Texto de la ventana y «ingreso o corrección de error» para Contabilidad (§2.5, §5) | No (no pide respuesta: es texto) |
| 6 | Reconocer siempre contra un proveedor | Columna `naturaleza` en la decisión y en el evento; aviso de NIT nulo desde Q30,000 (§2.2, §2.5, §5) | No: Q-AP1 (a) sigue (se elige o crea un proveedor); la naturaleza se agrega (P-5) |
| 7 | Posfechado cobrado antes del corte | Aviso en Ligar y en la conciliación (§2.3, §2.7), adaptado a lo que Arrancar sabe (ver nota) | No (no pide respuesta: es aviso) |

**Notas del arquitecto sobre cómo se aplicó** (para que el contador las revise en la QA, sin bloquear):

- **Punto 7.** Arrancar no guarda la fecha en que el banco pagó cada cheque y la conciliación no baja del corte, así que no
  existe «un período que termine en o antes del corte». El aviso sale cuando el posfechado queda marcado en la **primera
  conciliación** de la cuenta y pregunta al usuario si se cobró antes del corte (§2.7).
- **Punto 3, concepto.** Se reusa `pago_a_proveedor` para el pago sustituto en vez de un concepto nuevo «Pago de deuda de
  apertura» (el contador admite los dos): da la pata Debe Proveedores y no pide migración de Bancos. Si el usuario prefiere
  el concepto nuevo, va en P-3.
- **Punto 3, pago sustituto con origen.** Un pago sustituto registrado por Cuentas por pagar (u otro módulo) se rechaza
  (`PagoSustitutoConOrigen`): ese módulo ya lo contabiliza y lo más probable es que la factura se haya registrado dos veces.
  **Pendiente para el contador (VC-AP1):** qué debe hacer el usuario en ese caso (anular el cargo duplicado y reconocer la
  deuda, o descartar con otra causa). No bloquea: el rechazo es lo seguro mientras tanto.

### 18.3 Textos pendientes de cotejo literal (no bloquean programar; sí terminar la QA)

| Texto | Para qué | Estado |
|---|---|---|
| Decreto 20-2006, art. 2 y reglamento (retención del emisor de la tarjeta) | Aviso de IVA de §4.6 | Pendiente; decide la redacción final |
| Decreto 20-2006, art. 20 (bancarización, Q30,000) | Ayuda de §3.4 y aviso de NIT nulo de §2.5 | Resumen validado en CP4-E; falta la cita literal |
| Ley del IVA, arts. 7.4, 16, 18 y 37 | Ayuda de tarjeta y de `no_se_debe` | Pendiente |
| Decreto 10-2012, arts. 21 (numeral de intereses), 23 y 48 | Ayuda de intereses y aviso de ISR | Pendiente el numeral del art. 21 |
| Decreto 2-2024 y JM-56-2024 | Ayuda de tarjeta | Pendiente |
| Código Civil, arts. 1501, 1506, 1508 y 1514 | Texto de prescripción | Pendiente; no publicar «2 años» |
| Código de Comercio, arts. 410, 501 y 513 | Ayuda de CP-AP | Pendiente con CENADOJ (ya pedido) |

## 19. Preguntas nuevas (de la validación del contador, 2026-11-19)

Ninguna corrección del contador contradice una respuesta del usuario (§18.2, última columna): ninguna respuesta de §17 se
cambió. Quedan abiertas las cinco preguntas que el contador hace al usuario. El diseño ya trae la opción recomendada,
marcada «(P-n)»; si la respuesta es otra, se ajusta antes del paso que la espera.

| # | Pregunta | Opciones | Recomendación (contador y arquitecto) | Paso que la espera |
|---|---|---|---|---|
| P-1 | Ayuda del concepto del pago de la tarjeta | (a) Operación sin explicación; (b) Operación por omisión, con la ayuda «Financiamiento si usa la tarjeta como crédito» | **(b)**: es la política contable que la empresa debe elegir y mantener; no cambia datos | TC-2 y TC-6 (solo el texto) |
| P-2 | Aviso de retención en la forma `tarjeta` | (a) Como estaba («revise si debe retener»); (b) IVA: «la retiene el emisor, no la registre»; ISR: como estaba | **(b)**, sujeto al cotejo del reglamento del Decreto 20-2006: la (a) induce a retener dos veces | TC-5 y TC-8 (solo el texto) |
| P-3 | «Ya pagada» en la bandeja | (a) Como estaba (medio, cuenta y fecha); (b) ligar el movimiento del pago sustituto (concepto `pago_a_proveedor`; o un concepto nuevo «Pago de deuda de apertura», con migración de Bancos) y causa propia «pagada antes del corte» contra Proveedores | **(b) con `pago_a_proveedor`**: la (a) produce un doble registro en Contabilidad; el concepto nuevo solo separaría estos pagos en el reporte por concepto, a cambio de una migración de Bancos | AP-4a, AP-4b, AP-4 |
| P-4 | Texto y fecha de la prescripción | (a) Como estaba (5 y 2 años, fecha del inverso); (b) sin plazos fijos hasta cotejar, advertir la interrupción por la entrega del cheque y que el usuario elija la fecha (no antes del inverso) | **(b)**: un «2 años» sin condiciones puede llevar a dar de baja deudas exigibles | AP-4 (la fecha) y AP-6 (el texto) |
| P-5 | Naturaleza de la deuda reconocida | (a) Siempre proveedor; (b) columna `naturaleza` (`proveedor`, `acreedor_vario`, `remuneracion`, `socio`) en la decisión y el evento; (c) usar el tipo del tercero | **(b)**: el mismo tercero puede ser proveedor en una deuda y socio en otra, y el tipo del tercero no existe hoy con esos valores; Q-AP1 (a) se mantiene | AP-4a, AP-4 |
