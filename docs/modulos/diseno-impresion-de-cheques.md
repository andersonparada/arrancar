# Diseño corto: impresión de cheques y comprobante de egreso (Bancos)

_Agente `arquitecto-de-datos`, 2026-11-18. Concreta `diseno-bancos-segunda-parte.md` §11.2 (parte D). **Aprobado** por
el usuario (respuestas al final) y validado por el contador (`dictamen-em2-cheques-y-posfechado-2026-11-18.md`, Tema 2);
esta versión ya incorpora los ajustes del dictamen y las decisiones del usuario sobre él (bitácora de `docs/PLAN.md`,
2026-11-18). No toca la conciliación ni los saldos iniciales en curso; sus pasos van **después** de BS-3, BS-4 y BS-R1 (§12)._

## 0. Lo ya decidido (no se vuelve a preguntar)

| Tema | Decisión | Fuente |
|---|---|---|
| Capas del formato | Fábrica (código) → formato de la **cuenta suscriptora** → chequera; gana la más específica | `diseno-bancos-segunda-parte.md` §11.2, P-14 |
| Dónde se imprime | En el **navegador**, CSS en milímetros (`@page`), sin dependencia nueva, como la contraseña de CP3 | §11.2, P-14 |
| Excel de formatos | **No lleva** (excepción a la regla de Administración: las posiciones no se capturan en una hoja) | P-14 |
| «Cheque impreso» | Se guarda; reimprimir con permiso propio y auditoría; **un cheque impreso no se blanquea** | §11.2, P-14 |
| «Entregado» | Fuera de este diseño (más adelante) | P-14 |
| Monto en letras | `montoEnLetras` del core **tal como está** (validado), en mayúsculas con tilde («VEINTIÚN», «MILLÓN»), «… QUETZALES CON 25/100», con relleno; vale lo escrito en letras (C. Com. art. 388) | C-11, dictamen Tema 2.2 |
| «No negociable» | Buena práctica (arts. 498 y 499); casilla por cheque (`cheques.no_negociable`, verdadero por omisión); en el anverso, cerca del beneficiario o arriba | C-CP4-2, dictamen 2.3 |
| «Para abono en cuenta» | Casilla por cheque, **apagada por omisión** (art. 521: lo puede poner el librador; el banco no lo paga en efectivo) | Usuario con el dictamen 2.3 |
| Cruzado (dos líneas, arts. 517–518) | **Después** (es un trazo, no un texto) | Usuario con el dictamen |
| Beneficiario de un pago de Cuentas por pagar | El nombre del NIT del proveedor, nunca el comercial; nunca un cheque sin beneficiario (art. 497) | C-CP4-2 |
| Anotaciones en el cheque | **Ninguna** fuera de los campos de §3.2 (nada de «posfechado» ni «páguese a partir de»: art. 501, «se tendrá por no puesta») | Dictamen 2.1 |
| Fecha del posfechado | Se imprime su **fecha real** (la registrada) | Dictamen 2.6 |
| Plantillas de fábrica | **Medidas aproximadas** (no habrá fotos de cheques reales); se ajustan con la prueba de alineación | Usuario, P-4 |

## 1. Lo que hay hoy (revisado en el código, 2026-11-18)

- `bancos.cheques`: `numero`, `estado` (`disponible | emitido | anulado`), `no_negociable`, `movimiento_id`, anulación con
  `causa_de_anulacion` (`manual | caducidad`, check `cheques_causa_de_anulacion_valida`). **No hay nada de impresión.**
  Beneficiario, fecha, monto, concepto y observaciones viven en `bancos.movimientos` (`tipo = 'cheque'`); el origen en
  `modulo_de_origen` y `documento_de_origen_id`.
- `bancos.chequeras`: rango `desde`–`hasta` por cuenta y serie, `de_apertura` (siempre inactiva, nunca se imprime); el DTO
  ya cuenta `disponibles`, `emitidos` y `anulados`.
- `EmitirCheque` (ruta `bancos.cheques.emitir`) y la orden `bancos.emitir_cheque_de_origen` (la usan los pagos y los
  retiros de Cuentas por pagar, con `noNegociable` opcional, `true` por omisión) crean el movimiento y marcan el cheque.
  `Cheque.blanquear` devuelve `no_negociable` a `true`; `BlanquearCheque` tiene el `TODO` «bloquear el blanqueo si ya se
  imprimió». `AnularCheque` ya recibe `causa` (`manual` o `caducidad`).
- `montoEnLetras(centavos)` (`core/compartido/dominio/monto-en-letras.ts`) devuelve «Mil ciento veinte quetzales con
  00/100» (solo la primera en mayúscula); el cheque lo pasa a mayúsculas con `toLocaleUpperCase('es-GT')`, que conserva
  las tildes.
- Ya existe `GET /bancos/correlativos` (huecos de notas y transferencias, permiso `bancos.movimientos.ver`); **no** cubre
  cheques: no se reutiliza (los cheques se cuentan por chequera, no por correlativo del core).
- Cuentas por pagar imprime el **comprobante de pago** (para el proveedor). El comprobante de egreso de Bancos es para el
  archivo de la empresa (§4).
- Patrón de impresión: CP3 (`GET …/impresion` es vista previa sin cambios; `POST …/impresiones` marca antes de
  `window.print()`; desde la segunda, «REIMPRESIÓN»).
- Migraciones de Bancos: la última en `main` es la `0034`; **BS-R1 genera la `0035`** (hoy en curso). BS-3 y BS-4 no traen
  migración, pero tocan `AnularCheque`, `BlanquearCheque` y la conciliación. La de cheques toma **la siguiente libre**
  cuando IC-1 empiece (previsiblemente `0036`).
- Desarrollo: 1 chequera (25 cheques, 1 emitido) de Banrural; nada que convertir.

## 2. El problema de fondo: el papel del cheque ya trae su número

El número viene impreso por el banco. Reimprimir sobre el mismo formulario solo sirve si la impresora no lo tomó; si el
papel se arruinó, el cheque N no puede salir en el papel N+1. Por eso hay tres acciones (P-1, aprobada y validada):

| Acción | Cuándo | Qué hace | Permiso |
|---|---|---|---|
| **Imprimir** | Primera vez | Marca `impreso_en` y guarda la impresión `original` | `bancos.cheques.imprimir` |
| **Reimprimir** | El formulario sigue en blanco, o solo se quiere otra copia del comprobante | Motivo obligatorio; impresión `reimpresion`; el comprobante dice «REIMPRESIÓN»; auditoría | `bancos.cheques.reimprimir` |
| **Pasar a otro formulario** (inutilizado) | El papel N quedó inservible **y sigue en la empresa** | En una transacción: el movimiento pasa al cheque destino y el N queda `anulado` **sin movimiento**, causa `inutilizado`; auditoría con los dos números. El pago de origen no cambia | `bancos.cheques.anular` |

### 2.1 Inutilizado o extraviado (dictamen 2.4, controles 1, 2 y 5)

Antes de pasar a otro formulario la ventana exige **dos confirmaciones** (casillas obligatorias, el servidor las revisa):

1. «El formulario N está en poder de la empresa: no se firmó ni se entregó.» (`enCustodia: true`)
2. «Lo crucé con ANULADO, recorté la zona de firma y lo archivo con el comprobante de egreso.» (`papelConservado: true`)

Las dos van al `detalle` de la auditoría (`inutilizar`), con el número viejo, el nuevo y el motivo. No llevan columna: son
una declaración de quien inutiliza en ese momento, y la auditoría es el lugar del rastro.

Si la primera **no** se puede afirmar (el papel salió de la custodia, se perdió o se entregó), **no es inutilizado: es
extraviado**. La ventana ofrece entonces «Anular como extraviado», que es la anulación de hoy (`AnularCheque`, con su
inverso si el mes está conciliado y lo que diga el módulo de origen) con la causa nueva **`extraviado`** y un aviso fijo en
la respuesta y en la ficha: «Avise al banco por escrito para que no pague el cheque N (la cancelación y reposición de
títulos tiene su propio procedimiento).» Un extraviado **sí** anula el pago: el título pudo circular.

Control 4 del dictamen: si el movimiento viene de otro módulo (`modulo_de_origen` no nulo), la respuesta de «pasar a otro
formulario» trae el aviso «Si ya entregó el comprobante de pago con el cheque N, reimprímalo: ahora es el cheque M».

Control 3 (reporte de correlativos y conteo del papel): §6.4.

## 3. Formato del cheque

### 3.1 Plantillas de fábrica (código, sin marcas, medidas aproximadas)

`servidor/src/modulos/bancos/dominio/formatos-de-cheque/`: una por **forma de papel**, con nombre genérico, nunca por banco
ni con logotipos. Como no habrá fotos de cheques, las medidas son **aproximadas** (las de un cheque guatemalteco común,
aprox. 175 × 76 mm, y la hoja carta 215.9 × 279.4 mm) y cada una lleva en su descripción «Medidas aproximadas: haga la
prueba de alineación antes de imprimir un cheque real».

| Clave | Papel | Fecha | Para |
|---|---|---|---|
| `voucher_carta_arriba` | Carta; cheque en el tercio de arriba, comprobante abajo | Texto | «Cheque voucher» en hoja suelta o continua |
| `voucher_carta_en_medio` | Carta; talón arriba, cheque en medio, comprobante abajo | Texto | Variante de tres cuerpos |
| `cheque_suelto` | Solo el cheque (aprox. 175 × 76 mm), alimentación manual | Texto | Talonario; el comprobante sale en hoja carta aparte |
| `cheque_suelto_casillas` | Igual que el anterior | Casillas dd/mm/aaaa | Formularios con casillas para día, mes y año |

### 3.2 Campos (`EsquemaDeFormatoDeCheque`, Zod `.strict()`, en el dominio)

La lista de campos es **cerrada**: no existe un campo de texto libre en la cara del cheque (así no hay forma de imprimir una
anotación, dictamen 2.1). El talón y el comprobante sí pueden decir más (son de la empresa, no del título).

```
papel:          { ancho_mm, alto_mm }                         (50–300 × 50–400)
desplazamiento: { x_mm, y_mm }                                (−20 a 20; calibra la impresora)
letra:          { familia: 'monoespaciada', tamano_pt }       (6–16; solo monoespaciada, ver abajo)
fecha:          { modo: 'texto',    lugar_y_fecha: Campo }
              | { modo: 'casillas', lugar: Campo | null, dia: Campo, mes: Campo, anio: Campo }
beneficiario:   Campo                                         (alineado a la izquierda, fijo)
monto_en_numeros: Campo                                       (alineado a la derecha, fijo)
monto_en_letras:  Campo & { segunda_linea: { x_mm, y_mm, ancho_mm } | null }   (a la izquierda, fijo)
no_negociable:    Campo & { preimpreso: boolean }             (preimpreso = el formulario ya lo trae)
para_abono_en_cuenta: Campo & { preimpreso: boolean }
talon_fecha, talon_beneficiario, talon_monto, talon_concepto:  Campo | null
comprobante:    { y_mm, alto_mm } | null                      (null = hoja carta aparte)

Campo = { x_mm, y_mm, ancho_mm, tamano_pt?, visible }        (alineacion solo en fecha y talón)
```

Por qué solo monoespaciada: el relleno con asteriscos y el corte entre palabras se calculan en el servidor por número de
caracteres; con letra proporcional el cálculo no sería exacto y el relleno podría salirse o dejar hueco. (Antes el esquema
admitía `sans`; se quita.)

### 3.3 Reglas de lo impreso (lógica pura con pruebas, `dominio/impresion-de-cheque.ts`)

- **Fecha en texto**: «{lugar}, 18 de noviembre de 2026», con la fecha del cheque (un posfechado lleva la suya). El lugar
  sale de `bancos.cheques.lugar_de_emision` (empresa e instalación; «Guatemala» por omisión).
- **Fecha en casillas**: `18` · `11` · `2026` (día y mes con dos dígitos, año con cuatro), cada uno en su casilla; el lugar
  en su campo si el formato lo tiene.
- **Beneficiario**: tal cual está en el movimiento, **pegado al margen izquierdo** del campo y seguido de asteriscos hasta
  el final del renglón (`JUAN PÉREZ LÓPEZ*****************`), para que no se pueda agregar «o al portador» ni «y/o». Si no
  cabe, baja el tamaño hasta 7 pt (el relleno se calcula con el tamaño final); si aun así no cabe, `BeneficiarioNoCabe`
  (no se corta un nombre en un título de crédito). Siempre queda al menos un asterisco: si el nombre llena el renglón
  exacto, también baja el tamaño.
- **Monto en números**: `Q**1,120.00`, pegado al borde derecho, con asteriscos a la izquierda hasta llenar el ancho.
- **Monto en letras**: `MIL CIENTO VEINTE QUETZALES CON 00/100`, pegado al margen izquierdo. Si no cabe en un renglón se
  parte **entre palabras**; el hueco que queda al final del primer renglón **se llena con asteriscos**, y el segundo
  renglón termina también con asteriscos. Si el texto cabe en el primero y el formato tiene segundo renglón, el segundo
  **se llena entero de asteriscos** (mismo motivo: que no se pueda escribir nada). Si no cabe en los renglones del formato,
  `MontoEnLetrasNoCabe` (no se imprime cortado). El cliente no calcula nada: dibuja lo que manda el servidor.
- **«NO NEGOCIABLE»**: se dibuja solo si `cheques.no_negociable` y el campo **no** es `preimpreso`. Si es `preimpreso` y
  el cheque se emitió negociable, la vista previa avisa (sin bloquear): «Este formulario ya trae NO NEGOCIABLE impreso: el
  cheque no podrá negociarse aunque se haya emitido negociable.»
- **«PARA ABONO EN CUENTA»**: se dibuja solo si `movimientos.para_abono_en_cuenta`; con `preimpreso` y el cheque sin la
  casilla, el mismo aviso con su texto. Si el formato no tiene ese campo visible y el cheque la lleva, **no se imprime**:
  `CampoDelFormatoFaltante` («El formato no tiene dónde poner PARA ABONO EN CUENTA: agréguelo en el formato»), porque la
  restricción que eligió quien emitió no puede desaparecer en silencio.
- Nada más se imprime en la cara del cheque (§3.2).

### 3.4 Dónde se guarda el formato

**`bancos.formatos_de_cheque`** (nueva; Administración, sin Excel):

| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | uuid | no | `idPrimario()` |
| `cuenta_id` | uuid | no | → `core.cuentas`, `on delete cascade`; índice `formatos_de_cheque_cuenta_idx` |
| `nombre` | text | no | 1–80; único por `(cuenta_id, nombreNormalizado(nombre))` |
| `base` | text | no | Clave de fábrica; check en la lista de §3.1 |
| `ajustes` | jsonb | no | Solo lo que difiere de la base; validado con Zod al guardar **y al leer** (un JSON viejo inválido da `FormatoDeChequeDañado`, no un cheque mal impreso); `'{}'` por omisión |
| `probado_en` | timestamptz | sí | Al confirmar «La prueba quedó alineada»; **vuelve a nulo** al cambiar `base` o `ajustes` |
| `activo` | boolean | no | `true` |
| `...marcasDeTiempo`, `...autoria` | | | |

RLS `politicaPorCuenta()` (como Terceros): la impresora de la oficina sirve a todas las empresas de la cuenta. Inactivar,
reactivar y eliminar dejan auditoría (`bancos.formatos-de-cheque`); eliminar solo si ninguna chequera lo usa (si no,
inactivar).

**`bancos.chequeras`** gana dos columnas (nulas; una de las dos llena para poder imprimir):

| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `formato_de_cheque_id` | uuid | sí | → `bancos.formatos_de_cheque` (`on delete restrict`); índice `chequeras_formato_idx` |
| `plantilla_de_cheque` | text | sí | Clave de fábrica sin ajustes; check en la lista de §3.1 |

Check `chequeras_un_formato`: `not (formato_de_cheque_id is not null and plantilla_de_cheque is not null)`. Una chequera de
apertura no lleva ninguno (check `chequeras_apertura_sin_formato`). Al crear una chequera se propone el formato de la
última de la misma cuenta. Como la llave foránea no pasa por RLS, el caso de uso busca el formato **con RLS** antes de
asignarlo (si es de otra cuenta, `FormatoDeChequeNoEncontrado`).

### 3.5 Prueba de alineación

Imprime en **hoja en blanco** los campos con datos de muestra («PRUEBA — SIN VALOR» en el lugar del beneficiario, con su
relleno), una regla en milímetros en los bordes y una cruz en el origen. El usuario la pone sobre un cheque contra la luz y
corrige el desplazamiento o la posición. No marca nada ni gasta cheques (`GET /bancos/formatos-de-cheque/:id/prueba`,
permiso `.ver`; también `GET …/plantillas/:clave/prueba` para una plantilla sin ajustes). Si el formato nunca pasó la
prueba (`probado_en` nulo, o plantilla de fábrica sin formato propio) el cliente **advierte sin bloquear** (P-5).

## 4. Comprobante de egreso (voucher)

Va en la zona `comprobante` del formato o en hoja carta aparte. Contenido:

- Empresa (nombre y NIT), cuenta bancaria, banco, número de cheque, fecha del cheque, beneficiario, monto en números y en
  letras, concepto, observaciones; «NO NEGOCIABLE» y «PARA ABONO EN CUENTA» si aplican.
- **Detalle del origen** (opción A, aprobada): Bancos envía la orden `<modulo_de_origen>.detalle_para_comprobante_de_egreso`
  `{ movimientoId }`; Cuentas por pagar responde el número del pago y, por documento, tipo, serie, número, monto pagado y
  **sus retenciones** (tipo —IVA o ISR—, monto y número de constancia si ya la tiene), más el total retenido. Si el módulo
  está inactivo, `ModuloNoDisponible` se atrapa y sale «Pago de Cuentas por pagar» sin detalle.
- **Aplicación contable**: tabla con columnas Cuenta, Debe y Haber y **cinco renglones vacíos** para llenar a mano. Se
  llenará cuando exista Contabilidad (sin dato ni columna ahora).
- Firmas **Elaboró** (nombre de quien emitió), **Revisó**, **Autorizó** y **Recibí conforme** (nombre, DPI, fecha).
- Desde la segunda impresión: «REIMPRESIÓN». Leyenda: «Documento interno de control; no es un documento tributario».

## 5. Datos (migración de IC-1)

**`bancos.impresiones_de_cheques`** (nueva; solo crece):

| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | uuid | no | |
| `empresa_id` | uuid | no | → `core.empresas`, `on delete cascade` |
| `cheque_id` | uuid | no | → `bancos.cheques`; índice `(cheque_id, impreso_en)` |
| `movimiento_id` | uuid | no | → `bancos.movimientos`; el movimiento impreso (tras pasar a otro formulario el cheque viejo conserva su historia); índice |
| `tipo` | text | no | check `in ('original', 'reimpresion')` |
| `con_cheque` | boolean | no | `false` = solo el comprobante |
| `motivo` | text | sí | check: `tipo = 'original' or char_length(btrim(motivo)) between 1 and 300` |
| `lote_id` | uuid | sí | Mismo valor para las del mismo lote |
| `formato` | jsonb | no | El formato **resuelto** que se usó |
| `impreso_en` | timestamptz | no | `now()` |
| `impreso_por` | uuid | no | `deLaTransaccion.usuario()` |

Índice único parcial `impresiones_de_cheques_un_original` en `(cheque_id) where tipo = 'original'`: un solo original por
cheque aunque dos personas impriman a la vez. RLS `politicasDeSoloAgregarPorEmpresa()` (agregar y leer).

**`bancos.cheques`**:

- Gana `impreso_en timestamptz null` (la primera impresión; no vuelve a cambiar).
- `causa_de_anulacion` pasa a `('manual', 'caducidad', 'inutilizado', 'extraviado')` (se reemplaza el check
  `cheques_causa_de_anulacion_valida`; `CausaDeAnulacion` del dominio crece igual).
- Check nuevo `cheques_inutilizado_sin_movimiento`: `causa_de_anulacion is distinct from 'inutilizado' or movimiento_id is null`.

**`bancos.movimientos`** gana **`para_abono_en_cuenta boolean not null default false`**, con check
`movimientos_abono_en_cuenta_solo_cheque`: `not para_abono_en_cuenta or tipo = 'cheque'`.

Por qué en el movimiento y no en el cheque (a diferencia de `no_negociable`): es una condición **del pago** que eligió quien
emitió; al pasar a otro formulario el movimiento cambia de cheque y la condición debe ir con él sin copiarla. `no_negociable`
se queda donde está (moverlo es una migración de datos sin beneficio ahora); por eso «pasar a otro formulario» **copia**
`no_negociable` del cheque viejo al nuevo (§6). El DTO del cheque expone `paraAbonoEnCuenta` leído del movimiento.

**Estrategia de la migración** (una, la siguiente libre cuando IC-1 empiece; hoy `0034` en `main` y `0035` de BS-R1 en
curso, así que previsiblemente `0036_impresion_de_cheques`): crea las dos tablas, agrega las columnas y los checks, y los
permisos de §7 en `core.rol_permisos` **y** `core.usuario_permisos`. Datos existentes: los movimientos quedan con
`para_abono_en_cuenta = false` (el `default` llena las filas viejas; ninguno se imprimió con esa leyenda); los cheques
emitidos quedan con `impreso_en` nulo (se escribieron a mano o fuera del sistema) y se pueden imprimir como cualquiera;
las chequeras quedan sin formato (imprimir pide elegirlo); ningún cheque cambia de causa.

## 6. Reglas y casos de uso

- **Emitir** (Bancos y la orden `bancos.emitir_cheque_de_origen`): gana `paraAbonoEnCuenta` opcional (`false` por omisión),
  que se guarda en el movimiento. Los pagos y los retiros de Cuentas por pagar lo pasan con su casilla. **Blanquear** lo
  devuelve a `false` (como hoy `no_negociable` a `true`). Cambiar la casilla de un cheque ya emitido y **no impreso** es
  corregir el movimiento (permiso `bancos.cheques.emitir`, auditoría `corregir`); impreso, ya no (el papel lo dice).
- **Imprimir** solo un cheque `emitido`, de chequera no de apertura, con formato y **no** impreso (`ChequeYaImpreso`: use
  «Reimprimir»). Anulado o de apertura: `ChequeNoImprimible`. Sin lugar en el formato para «PARA ABONO EN CUENTA»:
  `CampoDelFormatoFaltante` (§3.3).
- **Reimprimir** solo uno ya impreso y emitido; motivo obligatorio; `con_cheque` lo elige el usuario («Solo el
  comprobante» por omisión). Auditoría `reimprimir`, recurso `bancos.cheques`, `anterior` = el cheque con sus impresiones.
- **Blanquear** un cheque con `impreso_en` → `ChequeImpresoNoSeBlanquea` (cierra el `TODO`).
- **Pasar a otro formulario**: el cheque N emitido e impreso, sin conciliar ni anulado su movimiento; las dos
  confirmaciones de §2.1 (si falta una, `ConfirmacionDeCustodiaFaltante`); destino disponible de la misma chequera (o de
  otra activa de la misma cuenta bancaria). El destino recibe el movimiento y el `no_negociable` del N; el N queda anulado,
  causa `inutilizado`, sin movimiento. El movimiento no cambia: **no** se envía `bancos.movimiento_por_cambiar`. Auditoría
  `inutilizar` con el cheque como estaba, el número nuevo y las dos confirmaciones. El destino nace sin imprimir.
- **Anular como extraviado**: `AnularCheque` con `causa: 'extraviado'` (cheque emitido; impreso o no) y el aviso al banco
  de §2.1. La ruta de anular gana `causa` opcional (`manual` por omisión; `extraviado` es la única que puede pedir el
  usuario; `caducidad` sigue siendo solo del proceso de caducos e `inutilizado` solo de pasar a otro formulario).
- **Lote**: hasta 50 cheques emitidos y sin imprimir de **una misma chequera**, en orden de número; si hay huecos avisa
  antes (el papel va en orden). Todo o nada.
- La vista previa (`GET`) no cambia nada; el `POST` registra y responde lo mismo ya con la marca; el cliente llama
  `window.print()` después.

### 6.4 Reporte de correlativos por chequera (Reportes: imprime y exporta)

`GET /bancos/chequeras/:id/correlativos` (y su Excel `…/exportar`). Por chequera, todos los números de `desde` a `hasta`:

- **Resumen**: emitidos, anulados (con su desglose `manual`, `caducidad` y `extraviado`), **inutilizados**, disponibles y
  total del rango (debe dar `hasta − desde + 1`; si no, alerta: un número sin fila).
- **Detalle** por número: estado, causa, fecha y beneficiario del movimiento (si tiene), monto, impreso (sí/no y fecha),
  motivo de anulación y, si se inutilizó, a qué número pasó (de la auditoría `inutilizar`).
- Filtro por estado; orden por número.
- **Impreso**: al final, un cuadro «Conteo físico del papel en blanco» con «Disponibles según el sistema: N», «Contados: ___»,
  «Contó: ___ (nombre y firma)», «Fecha: ___», y la nota «Lo cuenta alguien distinto de quien emite los cheques»
  (segregación de funciones, dictamen 2.4, control 3). El sistema no guarda el conteo (es papel firmado).

Una chequera de apertura también sale (sus números son reales), con la etiqueta «De la carga inicial».

## 7. Permisos

| Permiso | Para | La migración lo da a |
|---|---|---|
| `bancos.formatos-de-cheque.ver` | Ver formatos e imprimir la prueba | quien tiene `bancos.chequeras.ver` |
| `bancos.formatos-de-cheque.crear` / `.editar` / `.eliminar` | Administrarlos (editar incluye inactivar y marcar «probado») | quien tiene `bancos.chequeras.crear` / `.editar` / `.editar` |
| `bancos.cheques.imprimir` | Primera impresión, también en lote | quien tiene `bancos.cheques.emitir` |
| `bancos.cheques.reimprimir` | Reimprimir con motivo | quien tiene `bancos.cheques.anular` (P-3) |
| `bancos.correlativos-de-cheques.ver` | Ver e imprimir el reporte de §6.4 | quien tiene `bancos.chequeras.ver` |
| `bancos.correlativos-de-cheques.exportar` | Exportarlo a Excel | quien tiene `bancos.chequeras.exportar` |

Pasar a otro formulario y anular como extraviado usan `bancos.cheques.anular`. Asignar formato a una chequera,
`bancos.chequeras.editar`. La casilla «Para abono en cuenta» no lleva permiso propio (va con emitir).

## 8. API

| Ruta | Permiso | Qué |
|---|---|---|
| `GET/POST /bancos/formatos-de-cheque`, `GET/PATCH/DELETE …/:id`, `POST …/:id/inactivar`, `/reactivar` y `/probado` | `formatos-de-cheque.*` | Catálogo |
| `GET /bancos/formatos-de-cheque/plantillas` y `…/plantillas/:clave/prueba` | `formatos-de-cheque.ver` | Las de fábrica con sus medidas (aproximadas) |
| `GET /bancos/formatos-de-cheque/:id/prueba` | `formatos-de-cheque.ver` | Hoja de prueba |
| `PATCH /bancos/chequeras/:id/formato` | `chequeras.editar` | Asigna formato o plantilla |
| `POST /bancos/cheques` y la orden de emitir | `cheques.emitir` | Ganan `paraAbonoEnCuenta` |
| `GET /bancos/cheques/impresion?ids=…` | `cheques.ver` | Vista previa (uno o lote): formato resuelto, texto ya armado de cada campo (con relleno), avisos y comprobante |
| `POST /bancos/cheques/impresiones` `{ ids }` | `cheques.imprimir` | Primera impresión (lote) |
| `POST /bancos/cheques/:id/reimpresiones` `{ motivo, conCheque }` | `cheques.reimprimir` | Reimpresión |
| `POST /bancos/cheques/:id/cambiar-formulario` `{ chequeDestinoId, motivo, enCustodia, papelConservado }` | `cheques.anular` | Inutilizado |
| `POST /bancos/cheques/:id/anular` `{ motivo, causa? }` | `cheques.anular` | Gana `causa: 'extraviado'` |
| `GET /bancos/cheques/:id/impresiones` | `cheques.ver` | Historia de impresiones |
| `GET /bancos/chequeras/:id/correlativos` y `…/exportar` | `correlativos-de-cheques.ver` / `.exportar` | Reporte de §6.4 |

## 9. Cliente

- **Administración → Formatos de cheque** (lista y ventana, sin Excel): base, nombre, editor por campos en mm (arrastrar,
  después: P-6), modo de fecha (texto o casillas), «Ya viene impreso en el formulario» en «No negociable» y «Para abono en
  cuenta», vista a escala, «Imprimir prueba» y «La prueba quedó alineada».
- **Emitir cheque** (Bancos) y **pago o retiro con cheque** (CP4): casillas «No negociable» (marcada) y «Para abono en
  cuenta» (sin marcar), con una ayuda corta de cada una (artículos 498 y 521).
- **Página de impresión** `/bancos/cheques/imprimir?ids=…` (como `ImpresionDeContrasena.vue`): `@page { size: <ancho>mm
  <alto>mm; margin: 0 }`, campos `position: absolute` en mm, letra monoespaciada, negro sobre blanco (el `@media print`
  global ya lo fuerza), un cheque por página. Aviso fijo (oculto al imprimir): «Tamaño real (100 %), sin márgenes y sin
  encabezados ni pies de página», más los avisos del servidor (formato sin probar, preimpreso).
- **Lista de cheques**: casillas para elegir varios sin imprimir de la misma chequera, «Imprimir seleccionados», etiquetas
  «Impreso», «Inutilizado» y «Extraviado». **Ficha del cheque**: «Imprimir», «Reimprimir» (motivo e «Incluir el cheque»),
  «Pasar a otro formulario» (con las dos confirmaciones; si se desmarca la de custodia, el botón cambia a «Anular como
  extraviado»), historia de impresiones. «Blanquear» se oculta si está impreso.
- **Reportes → Correlativos de cheques**: elegir cuenta y chequera; resumen, detalle, imprimir (con el cuadro de conteo) y
  exportar.
- **Después de emitir**: el aviso de éxito ofrece «Imprimir el cheque» (en CP4, enlace a la ruta de Bancos).
- Lógica pura con pruebas: `edicion-de-formato-de-cheque.ts`, `estilos-de-impresion-de-cheque.ts`, `seleccion-para-lote.ts`.

## 10. Preguntas del primer borrador (todas respondidas)

| # | Pregunta | Respuesta |
|---|---|---|
| P-1 | Tres acciones (imprimir, reimprimir, pasar a otro formulario) | Sí (validado por el contador) |
| P-2 | Detalle de Cuentas por pagar por orden (opción A) | Sí, ahora también con retenciones |
| P-3 | Quién reimprime | Permiso propio, a quien anula cheques |
| P-4 | Fotos de cheques | No habrá: medidas aproximadas y prueba de alineación |
| P-5 | Formato sin probar | Solo advertir |
| P-6 | Editor en mm | Sí; arrastrar, después |
| P-7 | Lote | Hasta 50, una chequera |
| P-8 | Lugar de emisión | `bancos.cheques.lugar_de_emision`, empresa e instalación, «Guatemala» |
| P-9 | Firmas | Elaboró, Revisó, Autorizó y Recibí conforme con DPI |

## 11. Lo que dictaminó el contador (Tema 2) y dónde quedó

| Ajuste | Dónde |
|---|---|
| Relleno tras el beneficiario y en el primer renglón de las letras; texto pegado a la izquierda | §3.3 |
| «PARA ABONO EN CUENTA» (art. 521) por cheque, apagado por omisión; cruzado después | §0, §3.3, §5, §6 |
| «NO NEGOCIABLE» ocultable si el formulario ya lo trae | §3.2 (`preimpreso`), §3.3 |
| Nada de anotaciones («posfechado») en la cara del cheque | §0, §3.2 (lista cerrada) |
| Fecha también en casillas dd/mm/aaaa | §3.1, §3.2, §3.3 |
| Custodia antes de inutilizar; si no, extraviado (anulación con aviso al banco) | §2.1, §6 |
| Conservar el papel cruzado y sin firma | §2.1 (confirmación y auditoría) |
| Reporte de correlativos por chequera y conteo por otra persona | §6.4 |
| Reimprimir el comprobante de CP4 si cambió el número | §2.1 |
| Comprobante con retenciones y «Aplicación contable» vacía | §4 |
| `montoEnLetras` sin cambios; más pruebas | §12, IC-3 |
| **Pendiente antes de citar artículos en la app:** cotejar en el texto oficial (CENADOJ o Diario de Centro América) la remisión del art. 495 («Además de lo dispuesto por el artículo 388», que por lógica sería el 386) y la vigencia del Código de Comercio | Las ayudas de §9 citan solo 498, 499 y 521; **no** citan el 495 hasta el cotejo |

## 12. Pasos (un commit cada uno; servidor con `programador-backend`, cliente con `programador-frontend`)

Todos empiezan **después de que BS-3, BS-4 y BS-R1 estén en `main`**: BS-R1 trae la `0035` (la de cheques es la siguiente) y
BS-3 y BS-4 tocan `AnularCheque`, `BlanquearCheque`, el revisor de cambios y la conciliación, que IC-2, IC-5 e IC-6 también
tocan. BS-5 a BS-7 (cliente) pueden seguir en paralelo con IC-1 a IC-7; IC-9 toca la ficha y la lista de cheques del cliente,
así que va después de BS-6 si este cambia esas pantallas.

| Paso | Qué toca | Pruebas | Depende de |
|---|---|---|---|
| **IC-1** (servidor, datos) | Migración siguiente libre (§5): `formatos_de_cheque`, `impresiones_de_cheques`, columnas de `chequeras`, `cheques.impreso_en`, causas `inutilizado` y `extraviado`, `movimientos.para_abono_en_cuenta` y checks; `*.tablas.ts`; permisos de §7 en `modulo.ts` y su reparto en `rol_permisos` y `usuario_permisos` | Migración sobre datos ya creados (movimientos viejos en `false`, cheques sin cambio); cada check rechaza lo prohibido (abono en una nota, inutilizado con movimiento, dos formatos en una chequera, formato en chequera de apertura, dos originales); RLS por cuenta del formato y de solo agregar de impresiones; reparto de permisos por rol y directo | BS-3, BS-4 y BS-R1 en `main` |
| **IC-2** (servidor, emitir) | `paraAbonoEnCuenta` en `EmitirCheque`, la orden `bancos.emitir_cheque_de_origen` (contrato del mediador), los esquemas de pagos y retiros de CP, DTO de cheque y de movimiento; blanquear lo apaga; corregirlo sin imprimir | Emitir con y sin la casilla; nota con la casilla (rechazo); pago de CP con la casilla llega al movimiento; blanquear lo apaga; API | IC-1 |
| **IC-3** (servidor, dominio) | Plantillas de fábrica (cuatro, medidas aproximadas), esquema Zod estricto, resolución por capas, `impresion-de-cheque.ts` (§3.3) | **Letras** (0.01, 1, 15, 16, 21, 100, 101, 1,000, 1,001, **21,000**, 1,000,000, **1,000,001**, **1,500,000**, 2,000,000, máximo de `numeric(14,2)`, centavos 00 y 99; esperados: «VEINTIÚN QUETZALES CON 00/100», «VEINTIÚN MIL…», «UN MILLÓN UN QUETZALES…», «UN MILLÓN QUINIENTOS MIL…»; tildes en mayúscula); si alguna no da lo esperado se informa, **no** se cambia `montoEnLetras` sin el contador. Corte entre palabras, relleno del primer renglón, segundo renglón vacío lleno de asteriscos, `MontoEnLetrasNoCabe`; beneficiario con relleno, baja de tamaño y `BeneficiarioNoCabe`; cifra; fecha en texto y en casillas (día 1, mes 9, 31/12); no negociable y abono con y sin `preimpreso` (avisos); `CampoDelFormatoFaltante`; ajustes inválidos (`FormatoDeChequeDañado`); que no exista campo libre | IC-1 |
| **IC-4** (servidor, formatos) | Catálogo de formatos (CRUD, inactivar, reactivar, eliminar con chequeras en uso, auditoría, prueba de alineación, `probado` y su reinicio al editar), asignar a la chequera con revisión por RLS | Casos de uso y API: único por nombre en la cuenta, otra cuenta (no encontrado), auditoría de cada baja, 403 por permiso | IC-3 |
| **IC-5** (servidor, imprimir) | Vista previa, imprimir (uno y lote), reimprimir, historia; bloqueo del blanqueo; orden `cuentas-por-pagar.detalle_para_comprobante_de_egreso` con retenciones y su manejador en CP; comprobante con «Aplicación contable» | Ya impreso, de apertura, anulado, lote con hueco (aviso), lote de dos chequeras (rechazo), dos originales a la vez (uno gana), reimprimir sin motivo, blanqueo de impreso (rechazo), CP inactivo (sin detalle), detalle con retención de IVA e ISR, 403 | IC-4 e IC-2 |
| **IC-6** (servidor, inutilizar y extraviado) | Pasar a otro formulario (dos confirmaciones, copia `no_negociable`, auditoría con los dos números, aviso de reimprimir el comprobante de CP), anular con causa `extraviado` y su aviso | Sin confirmación (rechazo), conciliado (rechazo), destino de otra cuenta bancaria (rechazo), el pago de CP sigue igual y muestra el número nuevo, el abono en cuenta sigue en el movimiento, extraviado anula el pago, `inutilizado` y `caducidad` no se pueden pedir por la ruta | IC-5 |
| **IC-7** (servidor, reporte) | Correlativos por chequera (§6.4) y su Excel | Rango completo, cada estado y causa, a qué número pasó el inutilizado, chequera de apertura, alerta de número sin fila, Excel, 403 | IC-6 |
| **IC-8** ✅ (cliente, formatos) | Formatos de cheque (lista, ventana, modo de fecha, `preimpreso`, vista a escala, prueba, «quedó alineada») y formato en la chequera | Lógica pura (`edicion-de-formato-de-cheque.prueba.ts`, `estilos-de-impresion-de-cheque.prueba.ts`) | IC-4 |
| **IC-9** ✅ (cliente, imprimir; corregido: destino de otras chequeras de la cuenta y bandera `puedeDeclararExtraviado` para extraviar con el mes conciliado) | Casillas al emitir (Bancos y CP4), página de impresión, botones en la lista y la ficha, lote, reimprimir, pasar a otro formulario y extraviado, enlace después de emitir | `seleccion-para-lote.prueba.ts`; componentes de las ventanas | IC-5, IC-6, IC-8 (y BS-6 si toca la ficha de cheques) |
| **IC-10** ✅ (cliente, reporte) | Reportes → Correlativos de cheques (imprimir con el cuadro de conteo, exportar) | Lógica pura del resumen si la hay | IC-7 |
| **IC-11** (QA) | Chrome, Edge y Firefox: prueba de alineación con plantilla aproximada, cheque suelto (texto y casillas) y voucher, posfechado con su fecha, letras en dos renglones con relleno, beneficiario largo, no negociable preimpreso, para abono en cuenta, lote con hueco, reimprimir solo el comprobante, pasar a otro formulario un cheque de CP4 (el pago sigue igual), extraviado, blanqueo bloqueado, reporte de correlativos impreso y en Excel, 403, modo oscuro | IC-9 e IC-10 |

## Respuestas del usuario (2026-11-18)

- **P-1 y P-3:** tres acciones separadas (imprimir, reimprimir con motivo y pasar el pago a otro formulario cuando el papel
  se arruina); reimprimir pide `bancos.cheques.reimprimir`, que recibe quien ya puede anular cheques.
- **P-2 y P-9:** el comprobante de egreso trae el detalle de Cuentas por pagar (opción A; sin el módulo, sin detalle), con
  las firmas Elaboró, Revisó, Autorizó y Recibí conforme con DPI.
- **P-4:** no habrá fotos de cheques reales: las plantillas se hacen con **medidas aproximadas** y se ajustan con la prueba
  de alineación.
- **P-5 a P-8:** solo advertir si el formato no pasó la prueba de alineación; editor en mm (arrastrar, después); lote de
  hasta 50 cheques de una misma chequera; `bancos.cheques.lugar_de_emision` por empresa («Guatemala» por omisión).
- Lo marcado para el contador se consultó el 2026-11-18 (dictamen aparte).

## Decisiones del usuario con el dictamen (2026-11-18)

- Casilla «PARA ABONO EN CUENTA» (art. 521) por cheque, **apagada por omisión**; el cruzado, después.
- Relleno de asteriscos después del beneficiario y en el primer renglón del monto en letras.
- Confirmar que el formulario está en la empresa antes de inutilizarlo (si no, extraviado) y reporte de correlativos por
  chequera.
- Sección «Aplicación contable» vacía en el comprobante de egreso.
- Con eso este diseño queda listo para programar (§12) cuando BS-3, BS-4 y BS-R1 estén en `main`.
