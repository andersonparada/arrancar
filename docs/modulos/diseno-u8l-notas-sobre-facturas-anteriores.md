# Diseño U8-l y P-U8-1: notas sobre facturas del sistema anterior y DTE anteriores a la fecha de inicio — arquitecto de datos, 2026-11-12

Estado: **aprobado, listo para programar.** El usuario aprobó el 2026-11-12 (bitácora de `PLAN.md`) todas las
recomendaciones (U8l-a a e, P1-a, P1-b, §11) y todos los cambios del dictamen del contador
(`dictamen-u8l-2026-11-12.md`, «correcto con ajustes», §12), con las precisiones de la tabla de abajo. Junta en un solo
paso de **Libro de compras** (con su parte de Cuentas por pagar) dos pendientes ya acordados:

- **U8-l:** registrar en el libro una nota de crédito o de débito recibida **desde la fecha de inicio** sobre una
  factura del **sistema anterior** (que no está en el libro de Arrancar), y que Cuentas por pagar la aplique al saldo
  inicial de esa factura si lo tiene. Propuesta del contador: `dictamen-u8-saldos-iniciales-2026-11-08.md` (C-U8-5 y su
  opinión sobre U8-l); hueco descrito en `diseno-u8-saldos-iniciales-cuentas-por-pagar.md` §1.2 y §9.3.
- **P-U8-1:** los DTE de la bandeja de la SAT con emisión anterior a la fecha de inicio se **marcan** como tales y quedan
  **fuera de la conciliación**.

Lo nuevo que aparezca al programar va a §13.

**Ya decidido y que no se vuelve a preguntar:**

| Tema | Decisión | Fuente |
|---|---|---|
| Dónde va la nota | En el **Libro de compras del mes en que se recibe**; la de crédito rebaja el crédito fiscal de ese mes (o el costo si la factura no tuvo crédito); la de débito es un cargo con crédito dentro del art. 20 desde su emisión. Que el período de la factura ya se declarara en el sistema anterior no cambia nada | C-U8-5; C-U8l-1 (Ley del IVA arts. 17 y 20) |
| La factura no tiene que estar en Arrancar | La nota cita número y fecha de la factura; exigir factura propia es regla de diseño, no de ley | C-U8-5 |
| Qué acepta el libro | Una nota con «factura del sistema anterior» y sus datos escritos, **solo si la factura es anterior a la fecha de inicio** y **la nota se recibió desde la fecha de inicio** | Opinión del contador sobre U8-l; dictamen U8-l error 3; usuario, 2026-11-12 |
| Cuentas por pagar | Busca la factura entre sus saldos iniciales y aplica la nota; `documento_afectado_id` apunta a una fila propia | Opinión sobre U8-l; U8 §1.2 |
| Nada de corregir el saldo inicial | Una nota posterior al corte **nunca** corrige `saldo_al_inicio` | C-U8-5, «error del diseño §9.3» |
| Cuándo | Después de U8 y **antes de producción con una empresa con historia** | Usuario, 2026-11-08 |
| DTE anteriores | Se **marcan** y quedan **fuera de la conciliación**, con textos que piden verificar que estén en el sistema anterior (salvedad de C-U8-1) y los de los dos meses anteriores al corte destacados | P-U8-1; C-U8l-9; usuario, 2026-11-12 |
| Aviso de crédito doble | Ya existe (U8-8, `avisos-de-fecha-de-inicio.ts`): todo documento con emisión anterior a la fecha de inicio avisa sin bloquear | U8 §9.1 |
| Datos de la factura anterior (U8l-a, U8l-b) | Tabla propia, una fila por factura; se piden familia, serie, número, fecha, total, IVA, «¿Dio crédito fiscal?» y, si no, «¿Por qué?» (con `otra_causa_sin_credito`), autorización FEL opcional y **notas de débito del sistema anterior** (total e IVA, opcionales, 0 por omisión) que suman al tope | Usuario, 2026-11-12; C-U8l-2, C-U8l-4 opción B |
| Clave de la factura anterior | Proveedor + **familia factura** + serie + número (el tipo exacto no entra); primero la autorización FEL si las dos la tienen | Dictamen U8-l error 1 |
| Antigüedad | Tope de 10 años (control de captura, el mensaje no cita ley) y **aviso sin bloquear desde 4 años** | C-U8l-7; usuario, 2026-11-12 |
| U8l-c | Nada automático al cargar después el saldo inicial, **más un aviso** «hay N notas posteriores sobre esta factura; aplíquelas en Notas de crédito» | Usuario, 2026-11-12 |
| Documento que modifica | Se muestra en la ficha de la nota y en el **Excel del libro** (el libro impreso no cambia) | C-U8l-5; usuario, 2026-11-12 |
| Cualquier rubro y régimen | Nada de esto supone rubro, régimen de IVA o ISR, ni que la empresa sea agente de retención | CLAUDE.md |

## 1. Lo encontrado en el código y la base (verificado en `main` 0b65a18)

### 1.1 Libro de compras

1. **Toda nota exige una factura suya.** `documentos_nota_con_factura`: `(tipo in ('nota_de_credito',
   'nota_de_debito')) = (documento_afectado_id is not null)`; llave autorreferente `documentos_nota_factura_fk
   (documento_afectado_id, empresa_id, proveedor_id, destino) → documentos (id, empresa_id, proveedor_id, destino)`
   (a mano en la `0007`); índice `documentos_afectado_idx`.
2. **Lo que la nota toma de su factura** pasa por un solo tipo, `FacturaParaNota` (`aplicacion/puertos/
   puertos-de-documentos.ts`): `id`, `tipo`, `estado`, `proveedorId`, `destino`, `motivoSinCredito`,
   `regimenIvaDeLaEmpresa`, `fechaEmision`, `muestraEnReportesSat`, `total`, `iva`, `totalDeNotasDeCredito`,
   `ivaDeNotasDeCredito`, `totalDeNotasDeDebito` e `ivaDeNotasDeDebito`. Lo arma
   `ConsultasDeDocumentosDrizzle.buscarFacturaParaNota(id, bloquear)` y lo usan:
   - `ResolutorDeFactura.resolver` (exige factura en una nota y la revisa con `exigirFacturaQueAdmiteLaNota`: familia
     que admite notas, vigente, mismo proveedor y destino, misma casilla SAT; la factura especial no);
   - `calcularElDocumento` → `datosDeLaFactura`: **la nota de crédito hereda el motivo** de su factura
     (`motivoDeUnaNota`), la de débito hereda solo el motivo de familia sin IVA y `no_vinculado`, y se mide el art. 17
     con la fecha de la factura (`esNotaDeDebitoTardia`, aviso `AVISO_DE_NOTA_DE_DEBITO_TARDIA`); el régimen de la
     factura solo cambia un aviso;
   - `exigirQueLaNotaNoSupereLaFactura` (tope del total) y `exigirNotaCoherenteConLaFactura` (tope del IVA y nota con IVA
     sobre factura exenta);
   - `exigirLaFechaDeLaFamilia` (familia derogada, medida con la factura);
   - `tope-de-la-baja.ts`: al anular o eliminar una nota de débito, las de crédito deben seguir cabiendo;
   - la bandeja (`completar-dte-recibidos.ts`) para validar el borrador de una NCRE/NDEB.
   **Consecuencia:** si una factura anterior se presenta como `FacturaParaNota`, casi todo el cálculo fiscal de la nota
   se reutiliza sin tocarlo.
3. **La nota viaja al destino** con `DocumentoParaDestino` (`core/contratos/libro-de-compras.contratos.ts`):
   `documentoAfectadoId` es el id del libro. El evento `libro-de-compras.documento_registrado` lleva lo mismo.
4. **Fecha de inicio:** el libro ya la lee por el mediador (`DatosDeLaEmpresaEnMediador.fechaDeInicio`, orden
   `empresas.obtener_carga_inicial`, con bloqueo compartido) y la pone en el `ContextoFiscal`. Libro de compras **no**
   escucha todavía el aviso `empresas.fecha_de_inicio_por_cambiar` (solo Cuentas por pagar, en
   `composicion/fecha-de-inicio.ts`).
5. **Bandeja de DTE:** `dte_recibidos` no guarda nada de la fecha de inicio. `ListarDteRecibidos` filtra por `estado`,
   `desde`, `hasta`, `busqueda`, `tipoDte`, `loteId`, `conProveedor`. La confirmación en lote de una NCRE/NDEB sin
   factura falla con `DteNotaSinFactura`; desde una fila se puede abrir el formulario con la solicitud ya armada
   (`GET …/dte-recibidos/:dteId/solicitud`).
6. **Conciliación** (`dominio/conciliacion/conciliador.ts`): consulta pura por período; nueve grupos
   (`cuadra`, `conDiferencias`, `enLaSatYNoEnArrancar`, `registradoEnOtroPeriodo`, `noVaEnElLibro`,
   `enArrancarYNoEnLaSat`, `sinDatosDeLaSat`, `anuladoEnLaSatYVigenteAqui`, `descartado`). `ResumenDeConciliacion` es
   `Record<keyof ResultadoDeConciliacion, number>`: un grupo nuevo entra solo en el resumen. Los lotes guardan
   `resumen_de_conciliacion` como `jsonb Record<string, number>`: acepta una clave nueva sin migración.
7. **Excel del libro:** el libro del período se exporta (`GET /api/libro-de-compras/libro/exportar`, permiso
   `libro-de-compras.libro.exportar`, `aplicacion/casos-uso/libro/hojas-del-libro.ts`) con las mismas columnas que el
   impreso (`dominio/libro/columnas-del-libro.ts`); no muestra la factura de una nota. Libro de compras no tiene Excel
   de documentos (es Operación).
8. **Motivos sin crédito** (`dominio/tipos-de-documento.ts`, `MOTIVOS_SIN_CREDITO`): `fuera_de_plazo`, `no_vinculado`,
   `pequeno_contribuyente`, `contribuyente_agropecuario`, `primario_pecuario`, `exento`, `empresa_sin_credito`,
   `nota_de_debito_tardia`. Los que mandan el IVA al costo están repetidos en cuatro lugares: `MOTIVOS_AL_COSTO`
   (SQL de `documentos_iva_no_acreditable_por_motivo`), `IVA_AL_COSTO` (`calculo-de-documento.ts`),
   `MOTIVOS_CON_IVA_AL_COSTO` (`libro/rubros-del-sat-2237.ts`, rubro «Compras sin derecho a crédito») y
   `NOMBRE_DEL_MOTIVO` (`analisis/iva-al-costo-por-motivo.ts`). Siglas y leyenda en `libro/motivos-del-libro.ts`
   (`Record<MotivoSinCredito, string>`: un motivo nuevo no compila sin su sigla).
9. **Migraciones:** la última es `0034_u17_documentos_unicos_por_cuenta` (`when` 1794151754950). La de este diseño es la
   **`0035`** (§3.3).

### 1.2 Cuentas por pagar

1. **`documento_afectado_id` guarda el id de Libro de compras.** `documentos_factura_fk (documento_afectado_id,
   empresa_id, proveedor_id) → documentos (documento_id, empresa_id, proveedor_id)` (a mano en la `0001`). Un saldo
   inicial (`documento_id` nulo) no puede recibir la llave.
2. **Checks de U8 (`0003`):** `documentos_nota_con_factura` = `origen = 'saldo_inicial' or (tipo in notas) =
   (documento_afectado_id is not null)`; `documentos_saldo_inicial_sin_nota_afectada`. Ya existe el único
   `documentos_id_proveedor_unico (id, empresa_id, proveedor_id)`, que sirve de destino a la llave nueva, y
   `documentos_numero_por_proveedor_unico`, que trata las familias de factura como una sola.
3. **Quién usa `documento_afectado_id`** (todo con el id del libro): `RecibirDocumento.aplicarALaFactura` (aplica la
   nota con `ConsultasDeCargos.paraAplicarUnaNota(facturaDeCompraId)`, que busca por `documentos.documento_id`),
   `ConsultaBaseDeDocumentos` (subconsulta `notas_del_documento` agrupada por `documento_afectado_id`),
   `ConsultasDeDocumentosDrizzle.notasDe` (une por `documento.documentoId`: en un saldo inicial no encuentra nada),
   el mapeador, el DTO y la ficha. El cliente de Cuentas por pagar **no** usa `documentoAfectadoId` para enlazar.
4. **El saldo del cargo ya considera el saldo inicial:** `paraAplicarUnaNota` calcula con `netoDelCargo`
   (`saldo_al_inicio` si lo hay; si no, `total − retenciones`) menos lo aplicado. El error que este diseño anotaba en su
   primera versión ya no existe en `main`; solo cambia la búsqueda (por id propio).
5. **Reglas para corregir o eliminar un saldo inicial** (`dominio/reglas-de-saldo-inicial.ts`):
   `REGLAS_PARA_CORREGIR_SALDO_INICIAL = [noEstarAutorizadoElSaldo, noTenerMovimientos]`; `noTenerMovimientos` mira
   aplicaciones hechas y recibidas y ajustes vigentes (CP2-2). CP3 sumará «no está en una contraseña vigente». Una
   **nota de débito** ligada al saldo inicial no es una aplicación: hoy no lo frenaría y la llave daría un `23503`
   genérico al eliminar.
6. **CP2 y CP3:** CP2-1 (`0004_cp2_notas_de_credito`) y CP2-2 (`0005_cp2_anulacion_del_ajuste`) ya en `main`; CP2-3
   (aplicar y quitar) se está programando; CP2-4 a CP2-7 sin migración. **CP3-1 usa la `0006_cp3_contrasenas`**
   (bitácora de CP2-2). La migración de Cuentas por pagar de este diseño es la **`0007`** (§3.5 y §10).
7. **Avisos al recibir:** la orden `cuentas-por-pagar.recibir_documento` devuelve `{ avisos: string[] }` y Libro de
   compras los suma a los suyos (hoy solo `avisoDeSaldoALaFavor`).
8. **Excel de Saldos iniciales:** el motor de `core/intercambio` no lleva avisos por fila (solo errores); la ventana de
   Saldos iniciales muestra el **cuadre** después de importar.
9. Texto vigente en el cliente (`cuentas-por-pagar/textos.ts`, ventana Saldos iniciales): «Las notas de crédito o de
   débito recibidas desde la fecha de inicio sobre estos documentos todavía no se pueden registrar…». Se cambia aquí.

### 1.3 Base de desarrollo (solo lectura, 2026-11-12)

`cuentas_por_pagar.documentos`: 0 filas (0 notas, 0 saldos iniciales). `libro_de_compras.documentos`: 0 notas.
`dte_recibidos`: 17 filas (16 descartadas, 1 pendiente), ninguna anterior a la fecha de inicio. Una empresa con fecha de
inicio 2026-10-04 y carga abierta. Las migraciones igual se escriben para bases con datos.

## 2. Modelo

### 2.1 La «factura anterior»

Una **factura anterior** es la factura del sistema anterior que corrige una nota registrada en Arrancar. Vive en
Libro de compras, en una tabla propia (`facturas_anteriores`), **una fila por factura** (no por nota), con los datos
que la nota necesita para su cálculo fiscal y sus topes:

| Dato | Para qué |
|---|---|
| Proveedor, serie, número (familia factura) | Identificarla (clave, §2.2); buscarla en Cuentas por pagar; agrupar sus notas |
| Familia (`tipo`) | Herencia del motivo de familia sin IVA; familia derogada |
| Fecha de emisión | Regla «anterior a la fecha de inicio»; art. 17 de la nota de débito; familia derogada; avisos de 4 años |
| Total e IVA | Topes de las notas de crédito (total e IVA), igual que con una factura del libro |
| Notas de débito del sistema anterior (total e IVA, 0 por omisión) | Suben el tope como las notas de débito del libro (C-U8l-4 opción B) |
| Motivo sin crédito (nulo = sí dio crédito) | Lo que hereda la nota de crédito (y en parte la de débito) |
| Autorización FEL (opcional) | Clave preferente si las dos la tienen; viene sola si se toma de la bandeja |

Una nota apunta **o** a una factura del libro (`documento_afectado_id`) **o** a una factura anterior
(`factura_anterior_id`), nunca a las dos.

**Por qué una tabla y no columnas en la nota** (U8l-a): varias notas de la misma factura suman contra el mismo tope; con
columnas sueltas en cada nota no hay fila que bloquear ni sumar, los datos se repetirían (y podrían contradecirse) y la
tabla de documentos, ya con más de 40 restricciones, ganaría nueve columnas que solo usan unas pocas notas.

**El resolutor presenta la factura anterior como `FacturaParaNota`**, así el cálculo no cambia:

| Campo de `FacturaParaNota` | Valor para una factura anterior |
|---|---|
| `id` | id de la factura anterior (solo para bloquear y sumar) |
| `tipo`, `fechaEmision`, `total`, `iva`, `motivoSinCredito` | los suyos |
| `estado` | `vigente` (no se anula) |
| `proveedorId` | el suyo |
| `destino` | el de la nota (la factura anterior no tiene destino) |
| `muestraEnReportesSat` | el de la nota (C-U8l-6, validado) |
| `regimenIvaDeLaEmpresa` | `general` si dio crédito (`motivo` nulo); si no, el régimen actual de la empresa (solo cambia un aviso) |
| `totalDeNotasDeCredito`, `ivaDeNotasDeCredito` | las de sus notas de crédito vigentes (`factura_anterior_id`) |
| `totalDeNotasDeDebito`, `ivaDeNotasDeDebito` | las de sus notas de débito vigentes **más** `notas_de_debito_anteriores_total` / `_iva` |

Así el tope de la nota de crédito y el de la baja de una nota de débito (`tope-de-la-baja.ts`) cuentan las notas de
débito del sistema anterior sin tocar el cálculo.

### 2.2 Identidad y vida de la fila

- **Clave** (dictamen U8-l error 1): proveedor + serie + número dentro de la **familia factura** (todas las filas son de
  familias de factura, así que el `tipo` no entra en la clave: una «factura» y una «factura de pequeño contribuyente»
  con la misma serie y número del mismo proveedor son la misma). Si la solicitud trae autorización FEL, se busca
  **primero** por ella; si aparece una fila con esa autorización y otra serie, número o proveedor, es «otros datos».
- **Se crea al registrar la primera nota** que la cita (buscar o crear). El formulario siempre manda los datos
  completos; si ya existe una fila con esa clave:
  - con los **mismos datos** (todos los de §2.1, incluidas las notas de débito anteriores): se reutiliza;
  - con **otros datos** y alguna nota **vigente**: error `FacturaAnteriorConOtrosDatos` (muestra los guardados);
  - con otros datos y **solo notas anuladas**: se corrige con los nuevos datos y se audita (`corregir`,
    `libro-de-compras.facturas-anteriores`, con la fila anterior). La ficha de sus notas dice «datos de la factura
    corregidos el dd/mm/aaaa» (dictamen U8-l error 9).
- **No se edita ni se anula sola**: no es un registro fiscal de Arrancar (ya está en el libro anterior).
- **Se borra** junto con su última nota cuando esa nota se **elimina** (no si se anula: la anulada la sigue citando).
  El rastro queda en la auditoría de la nota, cuyo DTO lleva los datos de la factura anterior.

### 2.3 En Cuentas por pagar

`documento_afectado_id` pasa a guardar **el id propio** (`cuentas_por_pagar.documentos.id`) de la factura, venga del
libro o sea un saldo inicial; la llave `documentos_factura_fk` apunta a `(id, empresa_id, proveedor_id)`. Una columna
nueva, `factura_del_sistema_anterior`, marca las notas del libro que corrigen una factura anterior:

| Nota del libro | `documento_afectado_id` | `factura_del_sistema_anterior` |
|---|---|---|
| Sobre una factura del libro | id propio de esa factura | `false` |
| Sobre una factura anterior **que está** como saldo inicial | id propio del saldo inicial | `true` |
| Sobre una factura anterior **que no está** (pagada antes del corte, o no cargada) | nulo | `true` |

Por qué cambiar el significado de la columna y no agregar otra (`saldo_inicial_afectado_id`): una sola columna con un
solo sentido («la factura propia que corrige») deja una sola llave, un solo índice y consultas sin `coalesce` entre dos
columnas; hoy hay 0 filas en desarrollo, y la traducción de las existentes es un `update` con la llave ya garantizada.

## 3. Datos

### 3.1 Tabla nueva `libro_de_compras.facturas_anteriores` (`facturas-anteriores.tablas.ts`)

| Columna | Tipo | Nulo | Nota |
|---|---|---|---|
| `id` | `uuid` | no | `idPrimario()` |
| `empresa_id` | `uuid` | no | → `core.empresas(id)` `on delete cascade` |
| `cuenta_id` | `uuid` | no | `default deLaTransaccion.cuenta()`, → `core.cuentas(id)` `on delete cascade` (solo para la llave del proveedor, como `documentos`) |
| `proveedor_id` | `uuid` | no | |
| `tipo` | `text` | no | familia de factura que admite notas |
| `serie` | `text` | sí | |
| `numero` | `text` | no | |
| `autorizacion_fel` | `uuid` | sí | |
| `fecha_emision` | `date` | no | |
| `total` | `numeric(14,2)` | no | |
| `iva` | `numeric(14,2)` | no | |
| `notas_de_debito_anteriores_total` | `numeric(14,2)` | no | `default 0`: notas de débito del sistema anterior sobre esta factura |
| `notas_de_debito_anteriores_iva` | `numeric(14,2)` | no | `default 0` |
| `motivo_sin_credito` | `text` | sí | nulo = dio crédito fiscal |
| `creado_en`, `actualizado_en` | `timestamptz` | no | `...marcasDeTiempo` |
| `creado_por`, `actualizado_por` | `uuid` | sí | `...autoria` |

Restricciones (en `facturas-anteriores.restricciones.ts`, nombres que no existen en el repositorio):

| Nombre | Regla |
|---|---|
| `facturas_anteriores_tipo_valido` | `tipo in (FAMILIAS_QUE_ADMITEN_NOTA_DE_DEBITO)`: factura, pequeño contribuyente (y electrónico), agropecuario, primario/pecuario. Sin factura especial ni recibo |
| `facturas_anteriores_serie_valida` | nula o 1–40, mayúsculas, sin espacios (igual que `documentos_serie_valida`) |
| `facturas_anteriores_numero_valido` | 1–40, mayúsculas, sin espacios |
| `facturas_anteriores_total_positivo` | `total > 0` |
| `facturas_anteriores_iva_rango` | `iva >= 0 and iva <= total` |
| `facturas_anteriores_notas_de_debito_rango` | `notas_de_debito_anteriores_iva >= 0 and notas_de_debito_anteriores_iva <= notas_de_debito_anteriores_total` (el total ya es `>= 0` por esta misma desigualdad; se escribe explícito: `notas_de_debito_anteriores_total >= 0`) |
| `facturas_anteriores_motivo_valido` | nulo o en `fuera_de_plazo`, `no_vinculado`, `exento`, `empresa_sin_credito`, `otra_causa_sin_credito`, `pequeno_contribuyente`, `contribuyente_agropecuario`, `primario_pecuario` (no `nota_de_debito_tardia`) |
| `facturas_anteriores_motivo_de_la_familia` | familia sin IVA ⇒ su motivo (`MOTIVO_DE_LA_FAMILIA`); otra familia ⇒ motivo no es de familia (mismo `case` que `documentos_motivo_de_la_familia`) |
| `facturas_anteriores_sin_iva` | motivo de familia sin IVA o `exento` ⇒ `iva = 0 and notas_de_debito_anteriores_iva = 0` |
| `facturas_anteriores_primario_pecuario_desde` | igual que `documentos_primario_pecuario_desde` |
| `facturas_anteriores_id_proveedor_unico` | único `(id, empresa_id, proveedor_id)` (destino de la llave de la nota) |
| `facturas_anteriores_del_proveedor_unica` | índice único `(empresa_id, proveedor_id, coalesce(serie, ''), numero)` (**sin `tipo`**: familia factura, dictamen error 1) |
| `facturas_anteriores_autorizacion_fel_unica` | índice único parcial `(empresa_id, autorizacion_fel) where autorizacion_fel is not null` |
| `facturas_anteriores_proveedor_fk` | `(proveedor_id, cuenta_id) → terceros.proveedores (id, cuenta_id)`, `no action` |
| `facturas_anteriores_proveedor_idx` | índice `(proveedor_id)` (llave entre esquemas) |

«Anterior a la fecha de inicio» **no** puede ser un `check` (la fecha vive en `empresas.cargas_iniciales` y puede
cambiar mientras la carga esté abierta): lo revisa el dominio al registrar y el aviso `fecha_de_inicio_por_cambiar`
(§4.4). Tampoco el tope de 10 años ni el aviso de 4.

**RLS:** `politicaPorEmpresa()`. Sin alcance por registro (Libro de compras no lo tiene en documentos).

### 3.2 Cambios en `libro_de_compras.documentos`

| Cambio | Detalle |
|---|---|
| Columna `factura_anterior_id uuid null` | La factura anterior que corrige una nota |
| Llave `documentos_factura_anterior_fk` | `(factura_anterior_id, empresa_id, proveedor_id) → facturas_anteriores (id, empresa_id, proveedor_id)`, `no action` (no es autorreferente: la escribe drizzle-kit) |
| Índice `documentos_factura_anterior_idx` | `(factura_anterior_id) where factura_anterior_id is not null` |
| `documentos_nota_con_factura` (se reemplaza) | `(tipo in ('nota_de_credito','nota_de_debito')) = (num_nonnulls(documento_afectado_id, factura_anterior_id) = 1) and num_nonnulls(documento_afectado_id, factura_anterior_id) <= 1` |
| `MOTIVOS_SIN_CREDITO` gana `otra_causa_sin_credito` | Se rehace `documentos_motivo_sin_credito_valido` (lista generada desde el arreglo) |
| `MOTIVOS_AL_COSTO` gana `otra_causa_sin_credito` | Se rehace `documentos_iva_no_acreditable_por_motivo` (el IVA va al costo, como `fuera_de_plazo`) |
| `documentos_otra_causa_solo_en_nota_con_factura_anterior` (nuevo) | `coalesce(motivo_sin_credito, '') <> 'otra_causa_sin_credito' or (tipo = 'nota_de_credito' and factura_anterior_id is not null)` |

**Por qué `otra_causa_sin_credito` también entra en `documentos.motivo_sin_credito`** (lo dejó el contador al
arquitecto): la nota de crédito **hereda tal cual** el motivo de su factura (`motivoDeUnaNota`); si la factura anterior
no dio crédito «por otra causa», la nota debe guardarlo para que su IVA vaya al costo y no rebaje un crédito que nunca
se tomó. Las alternativas son peores: guardarla como `fuera_de_plazo` falsea la sigla «FP» del libro y el aviso de
«documentos fuera de plazo» (`avisos-del-libro.ts`), y como `no_vinculado` falsea la razón y la herencia de la nota de
débito. El check nuevo la limita a las notas de crédito sobre factura anterior: ni las facturas del libro ni las notas
de débito la usan (la de débito no hereda ese motivo: es un documento propio). Si el usuario quiere después ofrecerla
también para las facturas del libro, se quita esa restricción (§13, P-U8l-2).

Efectos en el dominio del libro (mismo paso que la migración): sigla **«OC»** y leyenda «No dio crédito fiscal por
otra causa (requisitos del art. 18, otro NIT, rechazo de la SAT, bancarización)» en `motivos-del-libro.ts`;
`IVA_AL_COSTO` y `MOTIVOS_CON_IVA_AL_COSTO` (rubro «Compras sin derecho a crédito» del SAT-2237) y `NOMBRE_DEL_MOTIVO`
del análisis la incluyen. Ninguno de los checks que excluyen la nota de crédito (`documentos_plazo_del_credito`,
`documentos_fuera_de_plazo_real`, `documentos_empresa_sin_credito_real`, `documentos_sin_credito_sin_art_20`) cambia.

`documentos_nota_factura_fk`, `documentos_nota_en_su_mes` y las demás quedan igual. Las filas existentes cumplen los
checks nuevos (toda nota tiene `documento_afectado_id`, `factura_anterior_id` nace nulo y ninguna tiene el motivo
nuevo).

### 3.3 Migración de Libro de compras `0035_u8l_facturas_anteriores`

Generada con `npm run bd:generar -w servidor -- libro-de-compras u8l_facturas_anteriores` (sin `--custom`: no hay
llave autorreferente ni relleno; drizzle-kit escribe el `drop`/`add` de los checks cambiados), `when` mayor que
1794151754950. Orden: crear la tabla con sus checks, únicos, llaves e índices; política RLS; columna en `documentos`;
llave e índice; `drop`/`add` de `documentos_nota_con_factura`, `documentos_motivo_sin_credito_valido` y
`documentos_iva_no_acreditable_por_motivo`; check nuevo. Sin relleno. Los permisos de la tabla nueva los da el migrador
por esquema. Si otra migración del libro entra antes, toma la siguiente libre (hoy no hay otra planificada).

### 3.4 Cambios en `cuentas_por_pagar.documentos`

| Cambio | Detalle |
|---|---|
| Columna `factura_del_sistema_anterior boolean not null default false` | La nota del libro corrige una factura del sistema anterior |
| `documentos_factura_fk` (se reemplaza) | `(documento_afectado_id, empresa_id, proveedor_id) → documentos (id, empresa_id, proveedor_id)` (`documentos_id_proveedor_unico`), `no action`, a mano (autorreferente) |
| `documentos_nota_con_factura` (se reemplaza) | `origen = 'saldo_inicial' or (tipo not in notas and documento_afectado_id is null) or (tipo in notas and (documento_afectado_id is not null or factura_del_sistema_anterior))` |
| `documentos_factura_anterior_solo_en_notas` (nuevo) | `not factura_del_sistema_anterior or (origen = 'libro_de_compras' and tipo in ('nota_de_credito','nota_de_debito'))` |
| `documentos_notas_del_sistema_anterior_libres_idx` (nuevo) | índice parcial `(proveedor_id) where factura_del_sistema_anterior and documento_afectado_id is null` (aviso de U8l-c, §4.4) |

Que el `documento_afectado_id` de una nota con `factura_del_sistema_anterior` sea un **saldo inicial** de **familia
factura** lo cuida el dominio (un `check` no puede mirar otra fila). `documentos_afectado_idx` sigue sirviendo.

### 3.5 Migración de Cuentas por pagar `0007_u8l_notas_sobre_saldos_iniciales`

Número: **`0007`** (la `0005` es de CP2-2 y la `0006` de CP3-1), con `when` mayor que el de la `0006`. Requiere que
CP3-1 ya esté en `main` (§10); si por orden de trabajo U8l-2 entrara antes que CP3-1, U8l toma la `0006` y CP3 pasa a la
`0007`, y se corrigen los dos documentos en ese commit. Nunca se generan migraciones de Cuentas por pagar en dos ramas a
la vez (el `snapshot` de drizzle-kit es una cadena).

`--custom` por la llave autorreferente y el `update`:

```sql
ALTER TABLE cuentas_por_pagar.documentos ADD COLUMN factura_del_sistema_anterior boolean DEFAULT false NOT NULL;
ALTER TABLE cuentas_por_pagar.documentos DROP CONSTRAINT documentos_factura_fk;
-- De id del libro a id propio (la llave vieja garantiza que la factura existe, con el mismo proveedor y empresa).
UPDATE cuentas_por_pagar.documentos n SET documento_afectado_id = f.id
  FROM cuentas_por_pagar.documentos f
 WHERE n.documento_afectado_id = f.documento_id AND n.empresa_id = f.empresa_id;
ALTER TABLE cuentas_por_pagar.documentos ADD CONSTRAINT documentos_factura_fk
  FOREIGN KEY (documento_afectado_id, empresa_id, proveedor_id)
  REFERENCES cuentas_por_pagar.documentos (id, empresa_id, proveedor_id);
-- y los dos checks y el índice parcial de §3.4 (drop y add del primer check).
```

Corre como propietario (sin RLS forzada), así el `update` alcanza todas las empresas. Prueba de la migración (como la del
relleno de CP2-1): sembrar una factura y su nota con el sentido viejo, correr las sentencias y revisar que la nota apunte
al id propio.

### 3.6 Mensajes de restricciones (`MENSAJES_POR_RESTRICCION`)

- `facturas_anteriores_del_proveedor_unica` y `facturas_anteriores_autorizacion_fel_unica` (`23505`, carrera entre dos
  notas que crean la misma factura): «Otra persona acaba de registrar esa factura anterior; vuelva a intentar.» (en la
  práctica el caso de uso hace `insert … on conflict do nothing` sin destino, que cubre los dos únicos, y luego
  `select … for update`, así que casi nunca llega).

### 3.7 P-U8-1: sin migración

La marca **se calcula al consultar** (`fecha_emision < fecha de inicio`), no se guarda: la fecha de inicio puede
cambiar mientras la carga está abierta y una columna guardada quedaría vieja. No hace falta índice nuevo:
`dte_recibidos_bandeja_idx (empresa_id, estado, fecha_emision)` ya cubre el filtro por fecha.

## 4. Reglas

### 4.1 Registrar o calcular una nota con factura anterior (Libro de compras)

La solicitud trae `facturaAnterior` en lugar de `documentoAfectadoId`. `ResolutorDeFactura` decide, en este orden:

1. Ni factura ni factura anterior en una nota, o las dos: `FacturaAfectadaIncoherente` (ya existe; texto nuevo para
   «las dos»). Factura anterior en algo que no es nota: el mismo error.
2. **Sin fecha de inicio** en la empresa: `FacturaAnteriorSinFechaDeInicio`.
3. **La nota se recibió antes de la fecha de inicio** (`fechaRecepcion < fecha de inicio`):
   `NotaRecibidaAntesDeLaFechaDeInicio` (campo `fechaRecepcion`): «Una nota recibida antes de la fecha de inicio
   (dd/mm/aaaa) es del sistema anterior: si su factura sigue pendiente, cárguela en Saldos iniciales con el saldo ya
   rebajado.» (dictamen U8-l error 3; usuario, 2026-11-12). Una nota **emitida** antes y **recibida** desde la fecha de
   inicio pasa, con el aviso de U8-8.
4. `fechaEmision` de la factura **igual o posterior** a la fecha de inicio: `FacturaAnteriorPosteriorALaFechaDeInicio`
   (campo `facturaAnterior.fechaEmision`). Más de **10 años** antes de la fecha de inicio: `FacturaAnteriorMuyAntigua`,
   con el mensaje sin citar ley: «La fecha de la factura no puede ser de más de 10 años antes de la fecha de inicio:
   debe ser el dd/mm/aaaa o posterior. Revise que no haya un error de digitación.» Más de **4 años** (y hasta 10):
   **aviso** sin bloquear «La factura del sistema anterior es del dd/mm/aaaa, de hace más de 4 años. Revise la fecha; si
   es correcta, la nota se registra igual.» (C-U8l-7).
5. La factura **está en el libro de Arrancar** (vigente, mismo proveedor, **familia factura**, serie y número; o la
   misma autorización FEL): `FacturaAnteriorEstaEnElLibro` («elíjala en “Factura que corrige”»). Es el caso C-U8-1 de
   una factura de antes del corte recibida después.
6. Buscar o crear la fila (§2.2, primero por autorización FEL), **bloqueada** `for update` al registrar (dos notas a la
   vez no se pasan del tope).
7. Desde aquí, todo igual que con una factura del libro: `exigirFacturaQueAdmiteLaNota` (con destino y casilla de la
   nota, así que solo puede fallar por familia), familia derogada, cálculo con `datosDeLaFactura` (herencia del motivo,
   incluido `otra_causa_sin_credito` en la de crédito; art. 17 en la de débito), topes del total y del IVA con las
   notas vigentes de la factura anterior **y sus notas de débito anteriores** (§2.1).
8. **Avisos que deben salir** (ya existen, se prueban con factura anterior): nota de débito tardía por art. 17 medida
   con la fecha de la factura anterior, con la fecha al frente: «La factura es del dd/mm/aaaa; esta nota de débito se
   emitió más de dos meses después: su IVA no da crédito fiscal (Ley del IVA art. 17) y va al costo» (dictamen U8-l
   error 7; C-U8l-3); y, si la factura dio crédito y el período de la nota no lo da (cambio de régimen), el aviso de
   `motivoDeUnaNota` debe decir que el IVA de la nota va al costo (C-U8l-1).
9. El período de la nota de crédito sigue siendo el mes de su recepción (`documentos_nota_en_su_mes`); el aviso de
   U8-8 sale si **la propia nota** se emitió antes de la fecha de inicio.
10. La nota viaja al destino con `facturaAnterior` (§5.1).

**Registrar una factura que ya es «del sistema anterior»** (misma clave —familia factura, serie, número y proveedor, o
autorización FEL— que una factura anterior con alguna nota vigente): se rechaza con `FacturaYaEsDelSistemaAnterior`,
con el camino completo (U8l-e, opinión del contador): «La nota N la cita como factura del sistema anterior. Si esta
factura no estaba en el libro del sistema anterior: anule la nota N, registre la factura (sin crédito fiscal si ya pasó
el plazo del art. 20) y vuelva a registrar la nota eligiendo esta factura.» Vale también para la confirmación desde la
bandeja.

### 4.2 Bajas de la nota (Libro de compras)

- **Anular** una nota con factura anterior: como hoy (aviso al destino, que deshace lo suyo). La fila de la factura
  anterior queda.
- **Eliminar**: como hoy; después, si la factura anterior ya no tiene notas (vigentes ni anuladas), se borra en la
  misma transacción. La auditoría `eliminar` de la nota lleva `facturaAnterior` dentro de su DTO.
- **Nota de débito**: `tope-de-la-baja.ts` revisa con la factura anterior igual que con una del libro (las de crédito
  deben seguir cabiendo, contando las notas de débito anteriores).

### 4.3 Cuentas por pagar al recibir (`RecibirDocumento`)

1. Nota sobre factura del libro: traduce `documentoAfectadoId` (id del libro) al id propio
   (`documentos.porDocumentoDeCompra`); siempre existe porque nota y factura tienen el mismo destino.
2. Nota con `facturaAnterior`: busca, bloqueado `for update`, el **saldo inicial** del mismo proveedor, **familia
   factura** (los tipos de factura cuentan como uno, como `documentos_numero_por_proveedor_unico`), serie y número,
   no anulado. Hay como mucho uno (por ese único).
   - **Lo encuentra:** guarda la nota con `documento_afectado_id` = el saldo inicial y `factura_del_sistema_anterior =
     true`. Si la fecha de emisión no coincide, **avisa** sin bloquear («El saldo inicial S-N tiene fecha … y la nota
     cita …; revise»).
     - Nota de crédito: se aplica sola (`forma = 'automatica'`, fecha = recepción de la nota, que la regla 3 de §4.1
       garantiza ≥ fecha de inicio) al saldo inicial y luego a las notas de débito ligadas a él, con `netoDelCargo`
       menos lo aplicado (ya en `main`, §1.2.4). Lo que sobra es saldo libre, con el aviso de siempre **más** «Si la
       factura tuvo retención, parte de este saldo puede corresponder a ella.» (C-U8l-8). Si el saldo inicial tiene
       `retenciones_por_practicar > 0`, aviso «El saldo inicial S-N tiene Q… de retenciones por practicar: revise si la
       nota cambia la retención que falta emitir.»
     - Nota de débito: cargo con su vencimiento propuesto, ligado al saldo inicial.
   - **No lo encuentra** (la factura se pagó antes del corte, o el saldo inicial aún no se carga, o se cargó con otro
     número): `documento_afectado_id` nulo y `factura_del_sistema_anterior = true`.
     - Nota de crédito: todo su total queda como **saldo libre** (derecho de cobro frente al proveedor; se reclasifica
       al cierre si el neto del proveedor es deudor, C-U8l-8), con el aviso «No hay un saldo inicial S-N de este
       proveedor: la nota queda como saldo a favor de Q…; si la factura todavía se debe, cárguela en Saldos iniciales y
       aplique la nota en Notas de crédito» y el de retención de arriba.
     - Nota de débito: cargo suelto, con el aviso «…la nota de débito queda como un cargo sin factura».
3. **Empresa sin Cuentas por pagar:** hoy Cuentas por pagar es el único destino, así que el libro no registra nada sin
   él. Los destinos futuros (Caja chica, Cuentas por liquidar) reciben el mismo `facturaAnterior` y deciden; Libro de
   compras no depende de que alguien lo encuentre.

### 4.4 Saldos iniciales y fecha de inicio

- **Saldo inicial con notas del libro** (vigentes o anuladas, ligadas por `documento_afectado_id`): ya tiene
  movimientos. `noTenerMovimientos` suma «o alguna nota lo corrige» (mismo error `SaldoInicialConMovimientos`), y
  `puedeCorregir`/`puedeEliminar` del DTO usan `notasEnTotal` de la consulta base (que ahora se une por `documentos.id`,
  así cuenta también en un saldo inicial). Corregir la apertura por una nota posterior sigue prohibido (C-U8-5).
- **Aviso al cargar un saldo inicial con notas posteriores libres** (U8l-c, aprobado): al crear o corregir un saldo
  inicial de familia factura, Cuentas por pagar busca las notas del libro con `factura_del_sistema_anterior`,
  `documento_afectado_id` nulo, no anuladas, del mismo proveedor, cuya factura anterior (unión `documentos` del libro →
  `facturas_anteriores`, leída desde `infraestructura`) tiene la misma serie y número. No las enlaza (opción A). El
  `SaldoInicialDto` gana `notasPosteriores: { notasDeCredito: number; saldoLibre: string; notasDeDebito: number }`
  (todo en cero si no hay); la ventana muestra «Hay N notas de crédito posteriores sobre esta factura con Q… de saldo
  a favor: aplíquelas en Notas de crédito» y, si hay de débito, «…y M notas de débito que quedaron como cargo sin
  factura». Como el Excel no lleva avisos por fila (§1.2.8), el **cuadre** de saldos iniciales gana
  `saldosConNotasPosteriores` (cuántos saldos iniciales vigentes tienen alguna) y la lista marca cada fila; la ventana
  lo muestra después de importar.
- **Cambiar la fecha de inicio** (carga abierta): Libro de compras escucha `empresas.fecha_de_inicio_por_cambiar` y
  rechaza si con la fecha nueva quedaría fuera alguna nota vigente con factura anterior (dictamen U8-l error 2):
  - **fecha más temprana**: alguna factura anterior con nota vigente tendría emisión igual o posterior a la fecha nueva
    → `FacturasAnterioresPosterioresALaFecha`;
  - **fecha más tardía**: alguna nota vigente con factura anterior tendría recepción anterior a la fecha nueva →
    `NotasRecibidasAntesDeLaFecha`.
  Los dos errores listan hasta cinco notas en `detalles`. Moverla nunca es libre: se revisan las dos cosas siempre.
- Cerrar o reabrir la carga no cambia nada aquí: registrar notas es proceso, no carga.

### 4.5 P-U8-1: DTE anteriores a la fecha de inicio

- **Marca:** una fila de la bandeja es «anterior a la fecha de inicio» si la empresa tiene fecha de inicio y
  `fecha_emision < fecha de inicio`. Sin fecha de inicio, ninguna lo es.
- **En plazo de crédito** (destacar, aprobado): una fila anterior con `fecha_emision >= date_trunc('month', fecha de
  inicio) − 2 meses` (emitida en el mes de la fecha de inicio o en los dos anteriores: su crédito todavía cabe en el
  art. 20 en el mes de la fecha de inicio). Se calcula al consultar, como la marca.
- **Bandeja:** cada fila trae `anteriorALaFechaDeInicio` y `enPlazoDeCredito`. El filtro nuevo `anteriores` (`incluir`
  | `ocultar` | `solo`; en el servidor, `incluir` por omisión para no cambiar a quien no lo mande) se traduce a
  `fecha_emision >= fecha de inicio` o `<`. El cliente, por omisión, **oculta** las anteriores en Pendientes (P1-a) y
  muestra «N DTE de antes de la fecha de inicio — Mostrar», con la ayuda de C-U8l-9: «De antes de la fecha de inicio:
  deben estar en el libro del sistema anterior. Si alguno no lo está, regístrelo aquí (con el aviso de fecha
  anterior).» Las filas en plazo de crédito llevan la marca destacada «Emitido en los dos meses anteriores al de la
  fecha de inicio: revise que esté en el sistema anterior». Se pueden confirmar igual (con el aviso de U8-8) o
  descartar; seguir pendientes no estorba.
- **Conciliación:** una fila emitida en el mes, **anterior a la fecha de inicio** y **sin documento** en Arrancar va al
  grupo nuevo `anterioresALaFechaDeInicio` (informativo, plegado; P1-b) en lugar de `enLaSatYNoEnArrancar` o
  `descartado`, con la misma ayuda de C-U8l-9 y las filas en plazo de crédito destacadas. Si tiene documento (se
  registró en Arrancar porque llegó después del corte, C-U8-1), se concilia como siempre. El lado de Arrancar no
  cambia. `EntradaDeConciliacion` gana `fechaDeInicio: string | null`, que `ConciliarPeriodo` pide por el mediador. Un
  período entero anterior a la fecha de inicio queda con todo en ese grupo.
- **Importar:** la respuesta de la importación (no el lote guardado) suma `anterioresALaFechaDeInicio: number` para
  avisar «N DTE son de antes de la fecha de inicio: quedaron marcados y fuera de la conciliación. Deben estar en el
  libro del sistema anterior; si alguno no lo está, regístrelo aquí.»

### 4.6 Documento que modifica

- **Ficha de la nota (libro)**: `documentoQueModifica` en el DTO de la ficha de **toda** nota: `{ origen: 'libro' |
  'sistema_anterior', documentoId: string | null, tipo, serie, numero, fechaEmision }` (de la factura del libro o de la
  factura anterior). Cliente: «Documento que modifica: FACTURA A-123 del 05/01/2026» (con enlace si es del libro; «del
  sistema anterior» si no).
- **Excel del libro** (`libro/exportar`, Reportes: exporta): columna nueva **«Documento que modifica»** al final, solo
  en el Excel (el libro impreso y el SAT-2237 no cambian), con «SERIE-NÚMERO del dd/mm/aaaa» en las notas y vacía en lo
  demás. `FilaDelLibro` gana `documentoQueModifica: string | null`; la consulta del libro une `documentos` consigo
  misma y con `facturas_anteriores` (por las llaves con índice ya existentes).

## 5. Comunicación entre módulos (sin importarse)

### 5.1 Contrato (`core/contratos/libro-de-compras.contratos.ts`)

```ts
/**
 * La factura del sistema anterior que corrige una nota (no está en el libro de Arrancar). Contabilidad usa
 * `fechaEmision` para saber si el costo que la nota corrige es de un año anterior (ISR: menor costo u otro ingreso del
 * año en que se recibe la nota; C-U8l-1).
 */
export interface FacturaAnteriorDeLaNota {
  tipo: TipoDeDocumentoDeCompra;   // familia de factura
  serie: string | null;
  numero: string;
  fechaEmision: string;            // AAAA-MM-DD
}

export interface DocumentoParaDestino {
  // … lo de hoy …
  /** La factura que corrige, en las notas sobre una factura del libro. */
  documentoAfectadoId: string | null;
  /** La factura del sistema anterior que corrige, en las notas sobre una de ellas; nulo en lo demás. */
  facturaAnterior: FacturaAnteriorDeLaNota | null;
}
```

El evento `libro-de-compras.documento_registrado` hereda el campo, con el mismo TSDoc (dictamen U8-l punto 11).

### 5.2 Órdenes y avisos

| Quién | Qué | Nuevo |
|---|---|---|
| Libro → Cuentas por pagar | `cuentas-por-pagar.recibir_documento` con `facturaAnterior` | solo el campo |
| Libro → Empresas | `empresas.obtener_carga_inicial` (fecha de inicio) en el resolutor, la bandeja y la conciliación | uso nuevo de una orden existente |
| Empresas → Libro | aviso `empresas.fecha_de_inicio_por_cambiar` | Libro de compras empieza a escucharlo |

Cuentas por pagar lee las tablas de Libro de compras (su `dependeDe`) desde `infraestructura` para mostrar en su ficha
los datos de la factura anterior de una nota sin saldo inicial y para el aviso de §4.4 (unión `documentos` del libro →
`facturas_anteriores`), como ya lee recepción y anulación. Libro de compras **no** pide nada a Cuentas por pagar (no
depende de él).

**Orden de bloqueo** (sin cambios): Empresas (compartido) → Libro de compras (factura anterior `for update`, nota) →
Cuentas por pagar (saldo inicial `for update`). Corregir un saldo inicial va Empresas → Cuentas por pagar: no se cruza.

## 6. Permisos, auditoría y errores

### 6.1 Permisos

**Ninguno nuevo.** Registrar o calcular la nota: `libro-de-compras.documentos.crear`; sugerencias de facturas
anteriores: el mismo; bandeja: `libro-de-compras.documentos.importar` (como hoy); conciliación: su permiso actual;
Excel del libro: `libro-de-compras.libro.exportar`. Cuentas por pagar: sin cambios (la aplicación manual de una nota
que quedó libre usa el permiso de CP2-3, `cuentas-por-pagar.documentos.aplicar-notas`).

### 6.2 Auditoría

| Hecho | Acción y recurso | `anterior` |
|---|---|---|
| Eliminar una nota con factura anterior | `eliminar`, `libro-de-compras.documentos` (como hoy) | DTO de la nota **con** `facturaAnterior` |
| Anular esa nota | `anular` (como hoy) | DTO con `facturaAnterior` |
| Corregir los datos de una factura anterior que solo tiene notas anuladas | `corregir`, `libro-de-compras.facturas-anteriores` | la fila como estaba |
| Borrar la fila con su última nota eliminada | sin registro propio: va dentro del de la nota | — |
| P-U8-1, avisos, Documento que modifica | no escriben nada | — |

### 6.3 Errores nuevos (código propio)

| Clase (módulo) | Familia | Código | Campo |
|---|---|---|---|
| `FacturaAnteriorSinFechaDeInicio` (libro) | `ReglaDeNegocioInfringida` | `factura_anterior_sin_fecha_de_inicio` | — |
| `NotaRecibidaAntesDeLaFechaDeInicio` (libro) | `DatoInvalido` | `nota_recibida_antes_de_la_fecha_de_inicio` | `fechaRecepcion` |
| `FacturaAnteriorPosteriorALaFechaDeInicio` (libro) | `DatoInvalido` | `factura_anterior_posterior_a_la_fecha_de_inicio` | `facturaAnterior.fechaEmision` |
| `FacturaAnteriorMuyAntigua` (libro) | `DatoInvalido` | `factura_anterior_muy_antigua` | `facturaAnterior.fechaEmision` |
| `FacturaAnteriorEstaEnElLibro` (libro) | `ReglaDeNegocioInfringida` | `factura_anterior_esta_en_el_libro` (detalles: `documentoId`) | `facturaAnterior.numero` |
| `FacturaAnteriorConOtrosDatos` (libro) | `ReglaDeNegocioInfringida` | `factura_anterior_con_otros_datos` (detalles: los guardados) | — |
| `FacturaYaEsDelSistemaAnterior` (libro) | `ReglaDeNegocioInfringida` | `factura_ya_es_del_sistema_anterior` (detalles: la nota) | `numero` |
| `FacturasAnterioresPosterioresALaFecha` (libro, aviso de Empresas) | `ReglaDeNegocioInfringida` | `facturas_anteriores_posteriores_a_la_fecha` (detalles: notas) | `fechaDeInicio` |
| `NotasRecibidasAntesDeLaFecha` (libro, aviso de Empresas) | `ReglaDeNegocioInfringida` | `notas_recibidas_antes_de_la_fecha` (detalles: notas) | `fechaDeInicio` |

Se reutilizan `FacturaAfectadaIncoherente`, `NotaSuperaLaFactura`, `IvaDeNotasExcedeElDeLaFactura`,
`NotaConIvaDeFacturaExenta`, `FacturaNoSirveParaLaNota` y, en Cuentas por pagar, `SaldoInicialConMovimientos`.

## 7. API

| Ruta | Cambio |
|---|---|
| `POST /api/libro-de-compras/documentos` y `…/calcular` | Cuerpo gana `facturaAnterior?: { tipo, serie?, numero, fechaEmision, autorizacionFel?, total, iva, notasDeDebitoAnterioresTotal?, notasDeDebitoAnterioresIva?, motivoSinCredito }` (las de débito, texto con dos decimales, `"0.00"` por omisión; `motivoSinCredito`: `null` = dio crédito, o uno de `fuera_de_plazo`, `no_vinculado`, `exento`, `empresa_sin_credito`, `otra_causa_sin_credito`; el de familia lo pone el servidor). Excluyente con `documentoAfectadoId`. La respuesta trae los avisos nuevos (4 años, NDEB tardía con fecha, retención de Cuentas por pagar) |
| `GET /api/libro-de-compras/proveedores/:proveedorId/facturas-anteriores` (nueva) | `{ fechaDeInicio, usadas: FacturaAnteriorDto[], deLaBandeja: FacturaAnteriorDto[] }`: las ya citadas por notas del proveedor y los DTE de factura de la bandeja de su NIT emitidos antes de la fecha de inicio, para llenar el formulario con un clic (U8l-d). Permiso `documentos.crear` |
| `GET /api/libro-de-compras/documentos/:id` | La ficha de una nota gana `facturaAnterior: FacturaAnteriorDto \| null` y `documentoQueModifica` (§4.6) |
| `GET /api/libro-de-compras/libro/exportar` | Columna «Documento que modifica» (§4.6) |
| `GET /api/libro-de-compras/dte-recibidos` | Query `anteriores=incluir\|ocultar\|solo`; cada elemento gana `anteriorALaFechaDeInicio` y `enPlazoDeCredito`; la página gana `fechaDeInicio` y `anterioresOcultos` (cuántas quedaron fuera por el filtro) |
| `POST /api/libro-de-compras/dte-recibidos/importar` | Respuesta gana `anterioresALaFechaDeInicio` |
| `GET /api/libro-de-compras/dte-recibidos/conciliacion` | `resultados.anterioresALaFechaDeInicio` (cada fila con `enPlazoDeCredito`), `resumen.anterioresALaFechaDeInicio` y `fechaDeInicio` |
| `GET /api/cuentas-por-pagar/documentos/:id` | La ficha de una nota gana `facturaDelSistemaAnterior` y, si no tiene saldo inicial, `facturaAnterior` (serie, número, fecha) leída del libro; la de un saldo inicial lista sus notas del libro |
| `GET /api/cuentas-por-pagar/saldos-iniciales` (lista, ficha, crear, corregir) | `SaldoInicialDto.notasPosteriores` (§4.4) |
| `GET /api/cuentas-por-pagar/saldos-iniciales/cuadre` | Gana `saldosConNotasPosteriores` |

`FacturaAnteriorDto`: `{ tipo, serie, numero, fechaEmision, autorizacionFel, total, iva, notasDeDebitoAnterioresTotal,
notasDeDebitoAnterioresIva, motivoSinCredito, corregidaEn }` (dinero como texto; `corregidaEn` nulo si nunca se corrigió).

## 8. Cliente

- **Formulario de registro (Libro de compras, nota):** en «Factura que corrige», además de las facturas del proveedor,
  la opción «Una factura del sistema anterior (antes del dd/mm/aaaa)» si la empresa tiene fecha de inicio. Abre los
  campos en un componente `CamposDeFacturaAnterior` (tipo, serie, número, fecha, total, IVA, «¿Dio crédito fiscal?» y,
  si no, «¿Por qué?» con «Fuera de plazo», «No vinculado», «Exenta», «La empresa no tenía crédito fiscal» y «Otra
  causa»; plegado, «Notas de débito del sistema anterior sobre esta factura» con total e IVA) con la lista de
  sugerencias (usadas y de la bandeja) que los llena. Ayudas: «Use esta opción solo si la factura estaba en el libro de
  compras del sistema anterior. Si la registró en Arrancar, elíjala de la lista.» y «Los datos de la factura vienen
  impresos en la propia nota (documento de origen).» (U8l-d). Los errores por campo llegan con `facturaAnterior.*`.
  Lógica pura (`edicion-de-factura-anterior.ts`) con pruebas.
- **Ficha de la nota (libro):** «Documento que modifica: …» (§4.6); si es del sistema anterior, «total Q…, IVA Q…,
  dio / no dio crédito (por qué)», las notas de débito anteriores si las hay y «datos de la factura corregidos el …» si
  `corregidaEn`.
- **Libro (motivos):** sigla «OC» y su nombre en `textos-del-libro.ts` y `textos-de-documentos.ts`.
- **Bandeja:** marca «Antes de la fecha de inicio» en `TarjetaDeDteRecibido` (destacada si `enPlazoDeCredito`), filtro
  en `FiltrosDeLaBandeja` (oculto por omisión en Pendientes), aviso con «Mostrar» y la ayuda de §4.5, y el error de una
  NCRE/NDEB sin factura en la confirmación en lote suma: «Si su factura es de antes de la fecha de inicio, regístrela
  desde el formulario».
- **Conciliación:** tarjeta y lista «Antes de la fecha de inicio» en `TarjetasDeConciliacion`/`PanelDeConciliacion`,
  plegada y gris, con la ayuda de §4.5 y las filas en plazo de crédito destacadas.
- **Cuentas por pagar:** ficha de la nota («Corrige el saldo inicial S-N» con enlace, o «Factura del sistema anterior
  S-N, sin saldo inicial»); ficha del saldo inicial con sus notas posteriores; aviso de notas posteriores libres en la
  ventana Saldos iniciales al guardar, en cada fila de la lista y en el cuadre después de importar (§4.4); el texto de
  la ventana (`textos.ts`) cambia a «Las notas recibidas desde la fecha de inicio sobre estos documentos se registran en
  Libro de compras con “Factura del sistema anterior”; aquí se aplican solas. No corrija el saldo pendiente por ellas.»
- **Excel:** solo la columna «Documento que modifica» del Excel del libro (§4.6, Reportes). La bandeja y la
  conciliación son Operación (sin Excel); el Excel de Saldos iniciales (Administración) no cambia de columnas.

## 9. Convivencia y riesgos

1. **CP2 (en curso):** CP2-3 y CP2-4 tocan `RecibirDocumento`, la consulta base, las reglas de baja y de saldo
   inicial; este diseño cambia la unión `notas_del_documento`, `notasDe`, `paraAplicarUnaNota` y `noTenerMovimientos`.
   Los pasos de servidor de Cuentas por pagar (U8l-2 y U8l-3) van **después de CP2-4**. La aplicación automática a un
   saldo inicial guarda `forma = 'automatica'` y `fecha` = recepción, igual que CP2-1. Una nota que quedó libre se
   aplica con `AplicarNota` de CP2-3 (su fecha mínima ya es la recepción y la fecha de inicio).
   `noTenerAplicacionesManualesRecibidas` de CP2-2 también protege al saldo inicial que recibió una. El paso de cliente
   de Cuentas por pagar (U8l-7) va **después de CP2-6** (las dos tocan la ficha del documento) y la QA (U8l-8) después
   de CP2-7, porque recorre la pantalla Notas de crédito.
2. **CP3:** CP3-1 toma la `0006`; U8l-2 la `0007` y va después de CP3-1. CP3-4 suma `noEstarEnContrasena` a
   `REGLAS_PARA_CORREGIR_SALDO_INICIAL` y U8l-3 cambia `noTenerMovimientos` en el mismo archivo: no se programan en
   paralelo (en ramas a la vez); el que entra segundo rebasa sobre el primero. Una nota de crédito con factura anterior
   que quedó libre puede entrar en una contraseña (CP3-a) como cualquier otra.
3. **U8:** la apertura (`saldo_al_inicio`) nunca cambia por una nota; el cuadre de saldos iniciales solo gana un
   conteo. Un saldo inicial con notas ya no se corrige ni elimina (§4.4). El aviso de U8-8 sigue igual.
4. **Libro de compras:** las notas sobre facturas del libro no cambian (salvo «Documento que modifica»). El único
   compartido entre libro y Cuentas por pagar (`documentos_numero_por_proveedor_unico`) no se toca: la nota tiene su
   propio número. El motivo nuevo solo lo puede tener una nota de crédito con factura anterior (check de §3.2).
5. **Crédito fiscal doble:** se cierra por los dos lados, con la clave por familia factura o autorización FEL: una
   factura anterior no puede estar en el libro (§4.1.5) y una factura que ya es anterior no se registra en el libro
   (§4.1, U8l-e).
6. **Datos escritos mal:** si quien registra pone otro número que el del saldo inicial, la nota queda libre (aviso) y se
   aplica a mano (CP2-3); el aviso de §4.4 no la encuentra (otro número). Si se equivoca en la familia de la factura,
   la clave por familia factura la reconoce igual.
7. **Concurrencia:** dos notas a la vez sobre la misma factura anterior: `insert … on conflict do nothing` + `select …
   for update`, la segunda espera y ve la suma de la primera. Recibir en Cuentas por pagar bloquea el saldo inicial; una
   corrección del saldo inicial en curso hace esperar. Mover la fecha de inicio toma el bloqueo exclusivo de Empresas
   frente al compartido del registro.
8. **Rendimiento:** la marca P-U8-1 cuesta una orden al mediador por consulta (ya la hace el registro); el filtro usa el
   índice existente. El aviso de §4.4 usa el índice parcial nuevo y los únicos de `facturas_anteriores`.
9. **Proveedores:** la llave nueva hacia `terceros.proveedores` impide borrar un proveedor con facturas anteriores
   (Terceros ofrece inactivar, como con documentos).
10. **Borrar la empresa:** `on delete cascade` desde `empresa_id`; la llave de la nota es `no action` y se revisa al
    final del comando.

## 10. Pasos (un commit cada uno; servidor y cliente por separado)

Cada commit corre `npm run revisar` y sus pruebas y actualiza la bitácora de `PLAN.md`.

**Orden respecto de CP2 y CP3:**

| Paso | Puede ir | Requiere en `main` |
|---|---|---|
| 1–3 (P1-1, P1-2, U8l-1) | Ya, en paralelo con CP2-3 a CP2-7 y con CP3 (solo tocan Libro de compras) | — |
| 4–5 (U8l-2, U8l-3) | Después de CP2-4 y de CP3-1; no en paralelo con CP3-2 a CP3-4 | U8l-1, CP2-4, CP3-1 |
| 6–7 (U8l-4, U8l-5) | Después de U8l-3 (el destino ya entiende `facturaAnterior`) | U8l-3 |
| 8 (U8l-6) | Después de U8l-5 | U8l-5 |
| 9 (U8l-7) | Después de CP2-6 y U8l-5 | CP2-6, U8l-5 |
| 10 (U8l-8, QA) | Al final | CP2-7, U8l-6, U8l-7 |

1. **P1-1 (servidor, Libro, DTE anteriores):** `fechaDeInicio` en `EntradaDeConciliacion` y grupo
   `anterioresALaFechaDeInicio` en el conciliador; filtro `anteriores`, marcas `anteriorALaFechaDeInicio` y
   `enPlazoDeCredito` y `anterioresOcultos` en la bandeja; conteo y texto en la respuesta de importar. **Pruebas** puras
   del conciliador (fila anterior sin documento, anterior con documento, anterior descartada, sin fecha de inicio, mes
   partido por la fecha, en plazo de crédito en el borde de los dos meses) y de API (filtro y marcas).
2. **P1-2 (cliente, bandeja y conciliación):** marca (destacada en plazo de crédito), filtro oculto por omisión con
   «Mostrar», ayuda de C-U8l-9, tarjeta y lista nuevas, texto del error de NCRE sin factura. Pruebas de la lógica pura.
3. **U8l-1 (servidor, Libro, datos):** tabla `facturas_anteriores` (con las notas de débito anteriores y los dos
   únicos), columna y llave en `documentos`, checks reemplazados y nuevo, `otra_causa_sin_credito` en
   `MOTIVOS_SIN_CREDITO`, `MOTIVOS_AL_COSTO`, `IVA_AL_COSTO`, `MOTIVOS_CON_IVA_AL_COSTO`, `NOMBRE_DEL_MOTIVO`, sigla
   «OC» y leyenda; migración `0035`. **Pruebas de tablas:** familia especial o recibo (falla), motivo de familia que no
   corresponde, IVA en familia sin IVA (también el de las notas de débito anteriores), IVA mayor que el total, IVA de
   notas de débito anteriores mayor que su total o negativo, misma serie y número con otra familia del mismo proveedor
   (falla), misma autorización FEL (falla), nota con factura y factura anterior a la vez (falla), nota sin ninguna
   (falla), factura con factura anterior (falla), `otra_causa_sin_credito` en una factura, en una nota de débito y en
   una nota de crédito sin factura anterior (falla) y con ella (pasa, IVA no acreditable = IVA), RLS por empresa,
   `politicas-de-los-modulos` y `llaves-entre-esquemas`; rubro del SAT-2237 y sigla del libro con el motivo nuevo.
4. **U8l-2 (servidor, Cuentas por pagar, datos y sentido de la llave):** migración `0007` (§3.5) con su prueba;
   `RecibirDocumento` traduce el id del libro al propio; `paraAplicarUnaNota` busca por id propio; consulta base y
   `notasDe` por `documentos.id`; DTO y TSDoc. **Pruebas:** las de CP1, CP2 y U8 siguen pasando; nota sobre factura del
   libro (apunta al id propio); relleno de la migración; checks nuevos.
5. **U8l-3 (servidor, contrato y Cuentas por pagar al recibir):** `facturaAnterior` en `DocumentoParaDestino`
   (opcional al leerlo, con su TSDoc para Contabilidad); búsqueda del saldo inicial, aplicación, avisos (encontrada,
   fecha distinta, no encontrada de crédito y de débito, retención en el saldo libre, retenciones por practicar);
   `noTenerMovimientos` con notas y `puedeCorregir`; `notasPosteriores` del `SaldoInicialDto` y
   `saldosConNotasPosteriores` del cuadre; ficha. **Pruebas:** saldo inicial pagado en parte y nota mayor que su saldo
   (sobra libre, con aviso de retención), con notas de débito ligadas, con retenciones por practicar (aviso), sin saldo
   inicial (libre / cargo suelto), saldo inicial anulado no cuenta, familia distinta de factura que sí coincide,
   corregir y eliminar un saldo inicial con nota (rechazo), anular la nota desde el libro (vuelve el saldo), cargar
   después el saldo inicial (no se enlaza; `notasPosteriores` y cuadre con la cuenta), importarlo por Excel (cuadre).
6. **U8l-4 (servidor, Libro, registrar):** dominio de la factura anterior (§2.1, §4.1), resolutor que la presenta como
   `FacturaParaNota` (con las notas de débito anteriores en las sumas), buscar o crear con bloqueo (primero por FEL),
   reglas, avisos y errores de §6.3, `paraElDestino` con `facturaAnterior`, esquema http. **Pruebas:** nota de crédito
   sobre factura que dio crédito (rebaja el crédito del mes de recepción), sobre factura fuera de plazo / no vinculada /
   sin crédito / otra causa (IVA al costo), sobre pequeño contribuyente (sin IVA), exenta con IVA (rechazo); nota de
   débito tardía por art. 17 con la fecha de la factura anterior (aviso con la fecha); cambio de régimen (aviso de IVA
   al costo); dos notas que suman más que la factura (rechazo de total y de IVA) y lo mismo con notas de débito
   anteriores que lo permiten (pasa); nota recibida antes de la fecha de inicio (rechazo) y emitida antes pero recibida
   después (pasa con aviso de U8-8); fecha de la factura igual a la de inicio (rechazo); sin fecha de inicio (rechazo);
   más de 10 años (rechazo sin citar ley); entre 4 y 10 años (aviso); la factura está en el libro con otra familia
   (rechazo); misma clave con otros datos (rechazo con vigente, corrección auditada con solo anuladas); misma FEL con
   otro número (rechazo); registrar una factura que ya es anterior (rechazo con el camino completo); destino Cuentas por
   pagar de punta a punta.
7. **U8l-5 (servidor, Libro, bajas, ficha, sugerencias, Excel del libro y fecha de inicio):** eliminar borra la fila
   huérfana; tope de la baja de una nota de débito con factura anterior (con notas de débito anteriores); ficha con
   `facturaAnterior` y `documentoQueModifica`; columna del Excel del libro; ruta de sugerencias; escucha de
   `empresas.fecha_de_inicio_por_cambiar`. **Pruebas:** eliminar la única nota (se borra, auditoría con los datos),
   eliminar una de dos (queda), anular (queda), mover la fecha de inicio antes de una factura anterior (rechazo), después
   de la recepción de una nota (rechazo) y entre las dos (pasa), Excel del libro con una nota sobre factura del libro y
   otra sobre factura anterior, sugerencias con DTE anteriores de la bandeja y usadas, sin permiso (403).
8. **U8l-6 (cliente, Libro):** `CamposDeFacturaAnterior` (con «¿Por qué?», notas de débito anteriores plegadas y las dos
   ayudas), opción en «Factura que corrige», sugerencias, errores por campo, ficha de la nota con «Documento que
   modifica», sigla y nombre del motivo nuevo. Lógica pura con pruebas.
9. **U8l-7 (cliente, Cuentas por pagar):** fichas de la nota y del saldo inicial, aviso de notas posteriores en la
   ventana Saldos iniciales (al guardar, en la lista y en el cuadre), texto nuevo de la ventana.
10. **U8l-8 (QA de punta a punta):** empresa con fecha de inicio a mitad de mes; bandeja con DTE de antes y de después
    (marca, destacados en plazo de crédito, filtro, conciliación del mes partido); saldo inicial de una factura pagada
    en parte con retención; nota de crédito desde la bandeja (abrir el formulario) sobre esa factura con «factura del
    sistema anterior» tomada de las sugerencias (se aplica sola, sobra libre con aviso de retención); nota de débito
    sobre otra factura anterior sin saldo inicial (cargo suelto); nota de crédito sobre una factura anterior aún no
    cargada y después cargar su saldo inicial (aviso) y aplicarla en Notas de crédito; nota recibida antes de la fecha
    de inicio (rechazo); intentar corregir el saldo inicial (rechazo); intentar registrar en el libro la factura
    anterior (rechazo con el camino); cambiar la fecha de inicio en los dos sentidos (rechazo); Excel del libro con
    «Documento que modifica»; permisos; celular y modo oscuro.

## 11. Preguntas para el usuario (respondidas el 2026-11-12)

| # | Pregunta | Respuesta |
|---|---|---|
| U8l-a | ¿Cómo se guardan los datos de la factura anterior? | **A**: tabla propia, una fila por factura, que sus notas comparten; clave por familia factura (dictamen) |
| U8l-b | ¿Qué datos de la factura anterior se piden? | **A** (familia, serie, número, fecha, total, IVA, ¿dio crédito? y por qué no, FEL opcional), con `otra_causa_sin_credito` y las **notas de débito del sistema anterior** (total e IVA, opcionales, 0 por omisión) que suman al tope |
| U8l-c | Si la nota llega antes de cargar el saldo inicial de su factura, ¿qué pasa al cargarlo? | **A** (nada automático; se aplica a mano en Notas de crédito) **más el aviso** al crear o importar el saldo inicial |
| U8l-d | ¿De dónde se sugieren los datos de la factura anterior? | **A** (las ya citadas y los DTE de la bandeja de antes de la fecha de inicio), con la ayuda «los datos vienen impresos en la nota» |
| U8l-e | ¿Se puede registrar en el libro una factura que una nota vigente ya cita como del sistema anterior? | **A** (no), con el mensaje del camino completo |
| P1-a | En la bandeja, ¿cómo se ven los DTE de antes de la fecha de inicio? | **A** (ocultos con «Mostrar N»), con el texto de C-U8l-9 y los de los dos meses anteriores al corte destacados |
| P1-b | En la conciliación, ¿se muestran? | **A** (grupo informativo plegado), con la misma salvedad y el mismo destacado |
| Dictamen 1 | Notas de débito del sistema anterior | **B**: campos opcionales que suman al tope |
| Dictamen 2 | ¿«No dio crédito por otra causa»? | Sí |
| Dictamen 3 | Nota recibida antes de la fecha de inicio | Se rechaza y manda a Saldos iniciales; también al mover la fecha de inicio |
| Dictamen 5 | Factura de más de 4 años | Aviso sin bloquear, además del tope de 10 años |
| Dictamen 6 | Textos de DTE anteriores y destacar los dos meses | Las dos cosas |
| C-U8l-5 | «Documento que modifica» | En la ficha y en el Excel del libro |

## 12. Validación de `contador-guatemala` (2026-11-12)

Dictamen `dictamen-u8l-2026-11-12.md`, **correcto con ajustes**. Todos los ajustes están en este documento:

| # | Conclusión | Dónde quedó |
|---|---|---|
| C-U8l-1 | Correcto; aviso de IVA al costo con cambio de régimen; TSDoc de `fechaEmision` para ISR | §4.1 regla 8, §5.1 |
| C-U8l-2 | Falta `otra_causa_sin_credito` | §3.1, §3.2, §7, §8 |
| C-U8l-3 | Correcto; aviso de NDEB tardía con la fecha de la factura anterior | §4.1 regla 8 |
| C-U8l-4 | Notas de débito del sistema anterior en el tope (opción B) | §2.1, §3.1 |
| C-U8l-5 | La referencia va en la nota, no en el libro; «Documento que modifica» en ficha y Excel | §4.6 |
| C-U8l-6 | Correcto | §2.1 |
| C-U8l-7 | Sin tope legal; 10 años sin citar ley y aviso desde 4 | §4.1 regla 4 |
| C-U8l-8 | Correcto; avisos de retención y de notas posteriores al cargar el saldo inicial | §4.3, §4.4 |
| C-U8l-9 | Correcto con la salvedad de C-U8-1 en los textos | §4.5 |
| C-U8l-10 | Sin caso legítimo; clave por familia factura o FEL | §2.2, §3.1, §4.1 |

## 13. Pendiente nuevo

- **P-U8l-1 (Libro de compras, general; del dictamen, certeza baja-media):** verificar en la documentación oficial de
  FEL («Reglas y Validaciones» v2.2 de la SAT) el texto y el efecto de la **frase tipo 9, escenario 22**, que desde el
  10-11-2026 marcaría las NCRE emitidas desde el tercer mes calendario siguiente al de la factura, y si el receptor debe
  seguir rebajando el crédito en el mes de recepción. Mientras tanto, regla conservadora (la de este diseño: rebaja en
  el mes de recepción) y, cuando se confirme, un aviso. **Para `contador-guatemala`**; no frena U8-l.
- **P-U8l-2 (para el usuario y el contador, no frena U8-l):** `otra_causa_sin_credito` queda limitado a las notas de
  crédito sobre factura del sistema anterior (check de §3.2). ¿Se ofrece también como motivo que el usuario marca a
  mano en las **facturas del libro** (p. ej. factura a otro NIT o sin requisitos del art. 18)? Hoy el libro no tiene
  esa opción y el contador la propuso solo para la factura anterior. Si se aprueba, basta quitar ese check y ajustar
  `determinarMotivoSinCredito`.
