# Diseño corto: impresión de cheques y comprobante de egreso (Bancos)

_Agente `arquitecto-de-datos`, 2026-11-18. Concreta `diseno-bancos-segunda-parte.md` §11.2 (parte D). **Para aprobar**:
las preguntas están en §10 y lo que valida el contador en §11. No toca la conciliación ni los saldos iniciales en curso._

## 0. Lo ya decidido (no se vuelve a preguntar)

| Tema | Decisión | Fuente |
|---|---|---|
| Capas del formato | Fábrica (código) → formato de la **cuenta suscriptora** → chequera; gana la más específica | `diseno-bancos-segunda-parte.md` §11.2, P-14 |
| Dónde se imprime | En el **navegador**, CSS en milímetros (`@page`), sin dependencia nueva, como la contraseña de CP3 | §11.2, P-14 |
| Excel de formatos | **No lleva** (excepción a la regla de Administración: las posiciones no se capturan en una hoja) | P-14 |
| «Cheque impreso» | Se guarda; reimprimir con permiso propio y auditoría; **un cheque impreso no se blanquea** | §11.2, P-14 |
| «Entregado» | Fuera de este diseño (más adelante) | P-14 |
| Monto en letras | `montoEnLetras` del core (centavos enteros), «… QUETZALES CON 25/100», mayúsculas, con relleno; vale lo escrito en letras (C. Com. art. 388) | C-11 (dictamen 2026-11-16) |
| «No negociable» | Buena práctica, **no** exigida por la bancarización; casilla por cheque (`cheques.no_negociable`, verdadero por omisión) | C-CP4-2 |
| Beneficiario de un pago de Cuentas por pagar | El nombre del NIT del proveedor, nunca el comercial | C-CP4-2 |

## 1. Lo que hay hoy (revisado en el código y en la base de desarrollo)

- `bancos.cheques`: `numero`, `estado` (`disponible | emitido | anulado`), `no_negociable`, `movimiento_id`,
  anulación con `causa_de_anulacion` (`manual | caducidad`). **No hay nada de impresión.** Beneficiario, fecha, monto,
  concepto y observaciones viven en `bancos.movimientos` (`tipo = 'cheque'`); el origen en `modulo_de_origen` y
  `documento_de_origen_id`.
- `bancos.chequeras`: rango `desde`–`hasta` por cuenta y serie, `de_apertura` (siempre inactiva, nunca se imprime).
- `EmitirCheque` (ruta `bancos.cheques.emitir`) y la orden `bancos.emitir_cheque_de_origen` (la usa CP4 al registrar un
  pago con cheque) crean el movimiento y marcan el cheque. `Cheque.blanquear` y `BlanquearCheque` tienen el `TODO`
  «bloquear el blanqueo si ya se imprimió».
- `montoEnLetras(centavos)` (`core/compartido/dominio/monto-en-letras.ts`) devuelve «Mil ciento veinte quetzales con
  00/100» (solo la primera en mayúscula): el cheque lo pasa a mayúsculas.
- Cuentas por pagar ya imprime el **comprobante de pago** (`GET /cuentas-por-pagar/pagos/:id/comprobante`, original y
  copia, documentos pagados, retenciones, constancias, total en letras, firmas). Es para el proveedor; el comprobante de
  egreso de Bancos es para el archivo de la empresa (§4).
- Patrón de impresión a copiar: CP3 (`GET …/impresion` es la vista previa y no cambia nada; `POST …/impresiones` marca
  `impresa_en` justo antes de `window.print()`; desde la segunda, «REIMPRESIÓN»).
- Desarrollo: 1 chequera (25 cheques, 1 emitido) de Banrural; nada que convertir.

## 2. El problema de fondo: el papel del cheque ya trae su número

El número viene impreso por el banco en el formulario. Por eso **reimprimir el cheque no es como reimprimir una
contraseña**:

- Si la primera impresión salió mal (atasco, corrida, impresora sin papel), ese formulario **se arruinó**: no se puede
  volver a imprimir el cheque N en otro papel, porque el siguiente papel es el N+1.
- Reimprimir sobre el mismo formulario solo sirve si la impresora no lo tomó (el papel sigue en blanco).

Se proponen tres acciones distintas (P-1):

| Acción | Cuándo | Qué hace | Permiso |
|---|---|---|---|
| **Imprimir** | Primera vez | Marca `impreso_en` y guarda la impresión `original` | `bancos.cheques.imprimir` |
| **Reimprimir** | El formulario sigue en blanco, o solo se quiere otra copia del comprobante de egreso | Pide motivo; guarda la impresión `reimpresion`; el comprobante sale con «REIMPRESIÓN»; auditoría | `bancos.cheques.reimprimir` |
| **Cambiar a otro formulario** (cheque arruinado) | El papel N quedó inservible | En una transacción: el movimiento pasa al siguiente cheque disponible de la misma chequera (o al que elija) y el N queda `anulado` **sin movimiento**, causa `inutilizado`, con motivo; auditoría. El pago de Cuentas por pagar no cambia (apunta al movimiento, no al cheque) | `bancos.cheques.anular` |

Así el número arruinado queda a la vista (reporte de correlativos, lista de cheques) y el pago no se anula ni se repite.

## 3. Formato del cheque

### 3.1 Plantillas de fábrica (código, sin marcas)

`servidor/src/modulos/bancos/dominio/formatos-de-cheque/`: una por **forma de papel**, con nombre genérico, nunca por
banco ni con logotipos:

| Clave | Papel | Para |
|---|---|---|
| `voucher_carta_arriba` | Carta; cheque en el tercio de arriba, comprobante abajo | Chequeras de «cheque voucher» en hoja continua o suelta |
| `voucher_carta_en_medio` | Carta; talón arriba, cheque en medio, comprobante abajo | Variante de tres cuerpos |
| `cheque_suelto` | Solo el cheque (aprox. 175 × 76 mm, se mide), alimentación manual | Chequeras de talonario; el comprobante sale aparte en una hoja carta |

Las medidas exactas se toman de **cheques de muestra que dé el usuario** (P-4); hasta entonces las plantillas llevan
medidas aproximadas y la prueba de alineación (§3.4) es obligatoria antes de la primera impresión real.

### 3.2 Campos (`EsquemaDeFormatoDeCheque`, Zod, en el dominio)

```
papel:        { ancho_mm, alto_mm }                       (50–300 × 50–400)
desplazamiento: { x_mm, y_mm }                            (−20 a 20; calibra la impresora)
letra:        { familia: 'monoespaciada' | 'sans', tamano_pt } (6–16)
campos: lugar_y_fecha, beneficiario, monto_en_numeros, monto_en_letras, no_negociable,
        talon_fecha, talon_beneficiario, talon_monto, talon_concepto   (los de talón son opcionales)
  cada uno: { x_mm, y_mm, ancho_mm, alineacion: 'izquierda'|'centro'|'derecha', tamano_pt?, visible }
  monto_en_letras además: { segunda_linea: { x_mm, y_mm, ancho_mm } | null }
comprobante:  { y_mm, alto_mm } | null                    (zona donde va el comprobante de egreso; null = hoja aparte)
```

Reglas de lo impreso (lógica pura con pruebas, `dominio/impresion-de-cheque.ts`):

- **Fecha**: «{lugar}, 18 de noviembre de 2026» con la fecha del cheque (un posfechado lleva su fecha real). El lugar
  sale de la configuración `bancos.cheques.lugar_de_emision` (niveles empresa e instalación, predeterminado
  «Guatemala»).
- **Monto en números**: `Q**1,120.00` con relleno de asteriscos a la izquierda hasta llenar el ancho.
- **Monto en letras**: `MIL CIENTO VEINTE QUETZALES CON 00/100` seguido de asteriscos hasta el final del renglón. Con
  letra monoespaciada el servidor calcula los caracteres que caben (`ancho_mm`, `tamano_pt`) y parte en la segunda línea
  **entre palabras**; si no cabe en las líneas del formato, `MontoEnLetrasNoCabe` (no se imprime cortado). El cliente no
  calcula las letras: dibuja lo que manda el servidor.
- **Beneficiario**: tal cual está en el movimiento; si no cabe, baja el tamaño hasta 7 pt y si aun así no cabe,
  `BeneficiarioNoCabe` (no se corta un nombre en un título de crédito).
- **No negociable**: «NO NEGOCIABLE» solo si `cheques.no_negociable`.

### 3.3 Dónde se guarda

**`bancos.formatos_de_cheque`** (nueva; Administración):

| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | uuid | no | `idPrimario()` |
| `cuenta_id` | uuid | no | → `core.cuentas`, `on delete cascade`; índice |
| `nombre` | text | no | 1–80; único por `(cuenta_id, nombreNormalizado(nombre))` |
| `base` | text | no | Clave de fábrica; check en la lista de §3.1 |
| `ajustes` | jsonb | no | Solo lo que difiere de la base, validado con Zod al guardar y al leer; `'{}'` por omisión |
| `activo` | boolean | no | `true` |
| `...marcasDeTiempo`, `...autoria` | | | |

RLS `politicaPorCuenta()` (como Terceros): la impresora de la oficina sirve a todas las empresas de la cuenta.
Inactivar y eliminar dejan auditoría (`bancos.formatos-de-cheque`); eliminar solo si ninguna chequera lo usa (si no,
inactivar).

**`bancos.chequeras`** gana dos columnas (nulas; una de las dos llena para poder imprimir):

| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `formato_de_cheque_id` | uuid | sí | → `bancos.formatos_de_cheque`; índice `chequeras_formato_idx` |
| `plantilla_de_cheque` | text | sí | Clave de fábrica sin ajustes |

Check `chequeras_un_formato`: `not (formato_de_cheque_id is not null and plantilla_de_cheque is not null)`. Una
chequera de apertura no lleva ninguno. Al crear una chequera se propone el formato de la última de la misma cuenta.
Como la llave foránea no pasa por RLS, el caso de uso busca el formato **con RLS** antes de asignarlo (si es de otra
cuenta, `FormatoDeChequeNoEncontrado`).

### 3.4 Prueba de alineación

Botón en el formato: imprime en **hoja en blanco** los campos con datos de muestra («PRUEBA — SIN VALOR»), una regla en
milímetros en los bordes y una cruz en el origen. El usuario la pone sobre un cheque contra la luz y corrige el
desplazamiento o la posición. No marca nada ni gasta cheques (`GET /bancos/formatos-de-cheque/:id/prueba`, permiso
`.ver`). Mientras un formato nunca haya pasado la prueba el cliente lo advierte (sin bloquear): se guarda
`probado_en timestamptz null` en el formato al confirmar «La prueba quedó alineada» (P-5).

## 4. Comprobante de egreso (voucher)

Va en la zona `comprobante` del formato o en hoja carta aparte. Contenido: empresa (nombre y NIT), cuenta bancaria,
banco, número de cheque, fecha, beneficiario, monto en números y en letras, concepto, observaciones, «NO NEGOCIABLE» si
aplica, el detalle del origen y las firmas **Elaboró** (nombre de quien lo emitió), **Revisó**, **Autorizó** y
**Recibí conforme** (nombre, DPI, fecha). Desde la segunda impresión: «REIMPRESIÓN». Leyenda: «Documento interno de
control; no es un documento tributario».

**Detalle de un cheque de Cuentas por pagar.** Bancos no conoce a Cuentas por pagar (CP depende de Bancos, no al
revés). Opciones:

| | Opción | A favor | En contra |
|---|---|---|---|
| A | **Orden del módulo de origen**: Bancos envía `<modulo_de_origen>.detalle_para_comprobante_de_egreso` `{ movimientoId }` y Cuentas por pagar la atiende (documentos pagados: tipo, serie, número, pagado, retención; número del pago) | El comprobante y la impresión en lote salen completos desde Bancos; sirve para módulos futuros (planillas) | Una orden en sentido contrario; si el módulo está inactivo, `ModuloNoDisponible` se atrapa y sale «Pago de Cuentas por pagar» sin detalle |
| B | Sin detalle en Bancos; el comprobante de pago de CP4 ya lo tiene | Cero acoplamiento | La impresión en lote no sale completa; el contador pierde el detalle en el archivo de egresos |

**Recomendación: A.** El mediador ya revisa que el módulo esté activo; no es una llave foránea ni una importación.

## 5. Datos de la impresión

**`bancos.impresiones_de_cheques`** (nueva; solo crece):

| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | uuid | no | |
| `empresa_id` | uuid | no | → `core.empresas`, `on delete cascade` |
| `cheque_id` | uuid | no | → `bancos.cheques`; índice `(cheque_id, impreso_en)` |
| `movimiento_id` | uuid | no | → `bancos.movimientos`; el movimiento impreso (tras «cambiar a otro formulario» el cheque viejo conserva su historia); índice |
| `tipo` | text | no | check `in ('original', 'reimpresion')` |
| `con_cheque` | boolean | no | `false` = solo el comprobante |
| `motivo` | text | sí | check: `tipo = 'original' or char_length(btrim(motivo)) between 1 and 300` |
| `lote_id` | uuid | sí | Mismo valor para las del mismo lote |
| `formato` | jsonb | no | El formato **resuelto** que se usó (para saber cómo salió) |
| `impreso_en` | timestamptz | no | `now()` |
| `impreso_por` | uuid | no | `deLaTransaccion.usuario()` |

RLS `politicasDeSoloAgregarPorEmpresa()` (agregar y leer; sin cambiar ni borrar), como los folios del libro.

**`bancos.cheques`** gana `impreso_en timestamptz null` (la primera impresión; no se vuelve a cambiar) y la causa de
anulación `inutilizado` (el check `cheques_causa_de_anulacion_valida` pasa a `('manual', 'caducidad', 'inutilizado')`).
Check nuevo: `causa_de_anulacion <> 'inutilizado' or movimiento_id is null`.

**Migración** (una, la siguiente libre al programar; hoy la última es `0034`): crea las dos tablas, agrega las columnas
y los checks, y los permisos de §7 (en `core.rol_permisos` **y** `core.usuario_permisos`). Datos existentes: los
cheques ya emitidos quedan con `impreso_en` nulo (se escribieron a mano o fuera del sistema); se pueden imprimir como
cualquier otro. Las chequeras quedan sin formato: imprimir pide elegirlo.

## 6. Reglas y casos de uso

- **Imprimir** solo un cheque `emitido`, de chequera no de apertura, con formato, y que **no** haya sido impreso
  (`ChequeYaImpreso`: use «Reimprimir»). Un cheque anulado o de apertura no se imprime (`ChequeNoImprimible`).
- **Reimprimir** solo uno ya impreso y emitido; motivo obligatorio; `con_cheque` lo elige el usuario («Solo el
  comprobante» por omisión). Auditoría `reimprimir`, recurso `bancos.cheques`, `anterior` = el cheque con sus impresiones.
- **Blanquear** un cheque con `impreso_en` → `ChequeImpresoNoSeBlanquea` (cierra el `TODO`): se anula o se cambia de
  formulario.
- **Cambiar a otro formulario**: el cheque N debe estar emitido e impreso, sin conciliar ni anulado su movimiento; el
  destino disponible y de la misma chequera (o de otra activa de la misma cuenta). Auditoría `inutilizar` con el cheque
  como estaba y el número nuevo. El movimiento no cambia (ni monto, ni fecha, ni concepto): **no** se envía
  `bancos.movimiento_por_cambiar` (ese aviso hace que el origen revierta lo suyo); Cuentas por pagar lee el número del
  cheque por el movimiento, así que su ficha y su comprobante muestran el nuevo sin hacer nada.
- **Lote**: hasta 50 cheques emitidos y sin imprimir de **una misma chequera**, ordenados por número; si hay huecos
  (números sin emitir entre medio) avisa antes, porque el papel va en orden. Todo o nada en una transacción.
- La vista previa (`GET`) no cambia nada; el `POST` registra y responde lo mismo ya con la marca, y el cliente llama
  `window.print()` después (patrón de CP3).

## 7. Permisos

| Permiso | Para | La migración lo da a |
|---|---|---|
| `bancos.formatos-de-cheque.ver` | Ver formatos e imprimir la prueba | quien tiene `bancos.chequeras.ver` |
| `bancos.formatos-de-cheque.crear` / `.editar` / `.eliminar` | Administrarlos (editar incluye inactivar y marcar «probado») | quien tiene `bancos.chequeras.crear` / `.editar` / `.editar` |
| `bancos.cheques.imprimir` | Primera impresión, también en lote | quien tiene `bancos.cheques.emitir` |
| `bancos.cheques.reimprimir` | Reimprimir con motivo | quien tiene `bancos.cheques.anular` (P-3) |

Cambiar a otro formulario usa `bancos.cheques.anular`. Asignar formato a una chequera, `bancos.chequeras.editar`.

## 8. API

| Ruta | Permiso | Qué |
|---|---|---|
| `GET/POST /bancos/formatos-de-cheque`, `GET/PATCH/DELETE …/:id`, `POST …/:id/inactivar` y `/reactivar` | `formatos-de-cheque.*` | Catálogo |
| `GET /bancos/formatos-de-cheque/plantillas` | `formatos-de-cheque.ver` | Las de fábrica con sus medidas |
| `GET /bancos/formatos-de-cheque/:id/prueba` | `formatos-de-cheque.ver` | Hoja de prueba |
| `PATCH /bancos/chequeras/:id/formato` | `chequeras.editar` | Asigna formato o plantilla |
| `GET /bancos/cheques/impresion?ids=…` | `cheques.ver` | Vista previa (uno o lote): por cheque, el formato resuelto y el texto ya armado de cada campo, más el comprobante |
| `POST /bancos/cheques/impresiones` `{ ids }` | `cheques.imprimir` | Registra la primera impresión (lote) |
| `POST /bancos/cheques/:id/reimpresiones` `{ motivo, conCheque }` | `cheques.reimprimir` | Registra la reimpresión |
| `POST /bancos/cheques/:id/cambiar-formulario` `{ chequeDestinoId, motivo }` | `cheques.anular` | Cheque arruinado |
| `GET /bancos/cheques/:id/impresiones` | `cheques.ver` | Historia de impresiones de la ficha |

## 9. Cliente

- **Administración → Formatos de cheque** (lista y ventana, sin Excel): base, nombre y un editor por campos con números
  en mm (sin arrastrar en la primera versión, P-6), vista a escala y botón «Imprimir prueba».
- **Página de impresión** `/bancos/cheques/imprimir?ids=…` (como `ImpresionDeContrasena.vue`): la vista previa en
  pantalla y en papel. `@page { size: <ancho>mm <alto>mm; margin: 0 }` por formato, campos con `position: absolute` en
  `mm`, letra monoespaciada, colores fijos en negro sobre blanco (no hereda el modo oscuro), un cheque por página
  (`break-after: page`). Aviso fijo arriba (oculto al imprimir): «En el cuadro de impresión elija tamaño real (100 %),
  sin márgenes y sin encabezados ni pies de página». Firefox y Safari respetan peor `@page size`: se prueba en Chrome,
  Edge y Firefox (QA).
- **Lista de cheques**: casilla para elegir varios sin imprimir de la misma chequera y «Imprimir seleccionados»; etiqueta
  «Impreso» en la tarjeta. **Ficha o ventana del cheque**: «Imprimir», «Reimprimir» (ventana con motivo y «Incluir el
  cheque»), «Cambiar a otro formulario» y la historia de impresiones. «Blanquear» se oculta si está impreso.
- **Después de emitir** (Bancos y el pago con cheque de CP4): el aviso de éxito ofrece «Imprimir el cheque». En CP4 el
  enlace lleva a la página de Bancos (ruta, no importación).
- Lógica pura con pruebas: `edicion-de-formato-de-cheque.ts` (formulario ↔ API, solo lo que difiere de la base),
  `estilos-de-impresion-de-cheque.ts` (formato → estilos en mm), `seleccion-para-lote.ts` (misma chequera, huecos).

## 10. Preguntas para el usuario (con recomendación)

| # | Pregunta | Recomendación |
|---|---|---|
| P-1 | ¿Las tres acciones de §2 (imprimir, reimprimir con motivo, cambiar a otro formulario cuando se arruina el papel)? | **Sí**: reimprimir no resuelve un papel arruinado y anular el pago para rehacerlo es peor |
| P-2 | ¿El comprobante de egreso trae el detalle de Cuentas por pagar por una orden a ese módulo (§4, opción A)? | **Sí (A)** |
| P-3 | ¿Quién reimprime? | Permiso aparte, dado a quien ya puede **anular** cheques (reimprimir es casi tan delicado) |
| P-4 | ¿Puede darnos fotos o escaneos con regla de los cheques que usan (talonario y voucher) para medir las plantillas? Sin marcas en el sistema | **Sí**; sin ellos las plantillas son aproximadas y la prueba de alineación es indispensable |
| P-5 | ¿Basta advertir si el formato nunca pasó la prueba de alineación, o se bloquea imprimir? | **Advertir** (bloquear frena a quien ya calibró en papel) |
| P-6 | ¿Editor por números en mm en la primera versión, y arrastrar los campos después? | **Sí**: es más preciso y mucho menos código |
| P-7 | ¿Lote de hasta 50 cheques de una sola chequera? | **Sí** (el papel de una chequera va en orden) |
| P-8 | ¿El lugar de la fecha es configurable por empresa («Guatemala», «Mixco»…)? | **Sí**, `bancos.cheques.lugar_de_emision`, predeterminado «Guatemala» |
| P-9 | ¿Las firmas del comprobante (Elaboró, Revisó, Autorizó, Recibí conforme con DPI) le sirven así? | **Sí**; «Autorizó» quedará ligado al diseño de aprobaciones cuando exista |

## 11. Para que valide el contador (`contador-guatemala`)

1. **Requisitos del cheque** en el Código de Comercio (títulos de crédito y cheque, art. 386 y los del capítulo del
   cheque): que lo que imprime el sistema (lugar y fecha, beneficiario, monto en números y en letras, «no negociable»)
   no deje fuera ni contradiga ningún requisito; la firma es manuscrita y no la pone el sistema.
2. **Monto en letras**: el formato (mayúsculas, «CON 00/100», acentos en mayúscula como «DIECISÉIS», relleno de
   asteriscos) y **partir en dos renglones entre palabras**; cifra con asteriscos a la izquierda (`Q**1,120.00`).
3. **«NO NEGOCIABLE»** impreso por el librador: si basta la leyenda impresa, dónde debe ir (cara del cheque) y su
   artículo exacto; si conviene el cruzado o «para abono en cuenta» como alternativa.
4. **Cheque inutilizado** (§2): que pasarlo a otro número sin anular el pago sea correcto; qué control interno pide
   sobre el formulario arruinado (conservarlo físicamente con «ANULADO», reporte de correlativos).
5. **Comprobante de egreso**: contenido mínimo y firmas para el archivo contable; la leyenda «no es documento
   tributario».
6. **Fecha y lugar de emisión** del posfechado: que se imprima la fecha real del cheque.

## 12. Pasos (un commit cada uno; servidor con `programador-backend`, cliente con `programador-frontend`)

| Paso | Qué | Depende de |
|---|---|---|
| **IC-1** (servidor, datos) | Migración (§5), tablas, checks, permisos y su reparto (§7); `causa_de_anulacion` `inutilizado` | Aprobación y dictamen |
| **IC-2** (servidor, dominio) | Plantillas de fábrica, esquema Zod, resolución por capas, `impresion-de-cheque.ts` (fecha, cifra, letras partidas, relleno, `MontoEnLetrasNoCabe`, `BeneficiarioNoCabe`). **Pruebas exhaustivas** de letras (0.01, 1, 15, 16, 21, 100, 101, 1,000, 1,001, 1,000,000, 2,000,000, máximo de `numeric(14,2)`, centavos 00 y 99) y del corte entre palabras | IC-1 |
| **IC-3** (servidor) | Catálogo de formatos (CRUD, inactivar, auditoría, prueba de alineación, asignar a la chequera con revisión por RLS) | IC-2 |
| **IC-4** (servidor) | Vista previa, imprimir (uno y lote), reimprimir (auditoría), historia; bloqueo de blanqueo; orden `cuentas-por-pagar.detalle_para_comprobante_de_egreso` y su manejador en CP | IC-3 |
| **IC-5** (servidor) | Cambiar a otro formulario (auditoría, conciliación, correlativos) | IC-4 |
| **IC-6** (cliente) | Formatos de cheque (lista, ventana, vista a escala, prueba) y formato en la chequera | IC-3 |
| **IC-7** (cliente) | Página de impresión (`@page`, mm, modo claro forzado), botones en la lista y la ficha, lote, reimprimir, cambiar formulario, enlace después de emitir (Bancos y CP4) | IC-4, IC-5, IC-6 |
| **IC-8** (QA) | Chrome, Edge y Firefox: prueba de alineación, cheque suelto y voucher, posfechado, monto con dos renglones, lote con hueco, reimprimir solo el comprobante, cambiar formulario de un cheque de CP4 (el pago sigue igual), blanqueo bloqueado, 403 por permiso, modo oscuro | IC-7 |

Ninguno toca `ConciliarCuenta.vue` ni los saldos iniciales: puede ir en paralelo con BS-* una vez aprobado.
