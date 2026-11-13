# Diseño U8-l y P-U8-1: notas sobre facturas del sistema anterior y DTE anteriores a la fecha de inicio — arquitecto de datos, 2026-11-12

Estado: **propuesta, falta la aprobación del usuario** (§11) y la validación de `contador-guatemala` (§12). Junta en
un solo paso de **Libro de compras** (con su parte de Cuentas por pagar) dos pendientes ya acordados:

- **U8-l:** registrar en el libro una nota de crédito o de débito recibida **desde la fecha de inicio** sobre una
  factura del **sistema anterior** (que no está en el libro de Arrancar), y que Cuentas por pagar la aplique al saldo
  inicial de esa factura si lo tiene. Propuesta del contador: `dictamen-u8-saldos-iniciales-2026-11-08.md` (C-U8-5 y su
  opinión sobre U8-l); hueco descrito en `diseno-u8-saldos-iniciales-cuentas-por-pagar.md` §1.2 y §9.3.
- **P-U8-1 (decidido por el usuario el 2026-11-12):** los DTE de la bandeja de la SAT con emisión anterior a la fecha
  de inicio se **marcan** como tales y quedan **fuera de la conciliación**.

Lo nuevo que aparezca al programar va a §13.

**Ya decidido y que no se vuelve a preguntar:**

| Tema | Decisión | Fuente |
|---|---|---|
| Dónde va la nota | En el **Libro de compras del mes en que se recibe**; la de crédito rebaja el crédito fiscal de ese mes (o el costo si la factura no tuvo crédito); la de débito es un cargo con crédito dentro del art. 20 desde su emisión | C-U8-5 (Ley del IVA arts. 17 y 20) |
| La factura no tiene que estar en Arrancar | La nota cita número y fecha de la factura; exigir factura propia es regla de diseño, no de ley | C-U8-5 |
| Qué acepta el libro | Una nota con «factura anterior a la fecha de inicio» y sus datos escritos (serie, número, fecha, si tuvo crédito), **solo si esa fecha es anterior a la fecha de inicio** | Opinión del contador sobre U8-l |
| Cuentas por pagar | Busca la factura entre sus saldos iniciales y aplica la nota; `documento_afectado_id` debe poder apuntar a una fila propia | Opinión sobre U8-l; U8 §1.2 |
| Nada de corregir el saldo inicial | Una nota posterior al corte **nunca** corrige `saldo_al_inicio` (falsearía la apertura y la nota no entraría al libro) | C-U8-5, «error del diseño §9.3» |
| Cuándo | Después de U8 y **antes de producción con una empresa con historia** | Usuario, 2026-11-08 |
| DTE anteriores | Se **marcan** y quedan **fuera de la conciliación** | P-U8-1, usuario, 2026-11-12 |
| Aviso de crédito doble | Ya existe (U8-8, `avisos-de-fecha-de-inicio.ts`): todo documento con emisión anterior a la fecha de inicio avisa sin bloquear | U8 §9.1 |
| Cualquier rubro y régimen | Nada de esto supone rubro, régimen de IVA o ISR, ni que la empresa sea agente de retención | CLAUDE.md |

## 1. Lo encontrado en el código y la base (verificado en `main` f292bc7)

### 1.1 Libro de compras

1. **Toda nota exige una factura suya.** `documentos_nota_con_factura`: `(tipo in ('nota_de_credito',
   'nota_de_debito')) = (documento_afectado_id is not null)`; llave autorreferente `documentos_nota_factura_fk
   (documento_afectado_id, empresa_id, proveedor_id, destino) → documentos (id, empresa_id, proveedor_id, destino)`
   (a mano en la `0007`); índice `documentos_afectado_idx`.
2. **Lo que la nota toma de su factura** pasa por un solo tipo, `FacturaParaNota` (`aplicacion/puertos/
   puertos-de-documentos.ts`): `tipo`, `estado`, `proveedorId`, `destino`, `motivoSinCredito`, `regimenIvaDeLaEmpresa`,
   `fechaEmision`, `muestraEnReportesSat`, `total`, `iva` y las sumas de notas vigentes. Lo arma
   `ConsultasDeDocumentosDrizzle.buscarFacturaParaNota(id, bloquear)` y lo usan:
   - `ResolutorDeFactura.resolver` (exige factura en una nota y la revisa con `exigirFacturaQueAdmiteLaNota`: familia
     que admite notas, vigente, mismo proveedor y destino, misma casilla SAT; la factura especial no);
   - `calcularElDocumento` → `datosDeLaFactura`: **la nota de crédito hereda el motivo** de su factura
     (`motivoDeUnaNota`), la de débito hereda solo el motivo de familia sin IVA y `no_vinculado`, y se mide el art. 17
     con la fecha de la factura (`esNotaDeDebitoTardia`); el régimen de la factura solo cambia un aviso;
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
   escucha todavía el aviso `empresas.fecha_de_inicio_por_cambiar` (solo Cuentas por pagar).
5. **Bandeja de DTE:** `dte_recibidos` no guarda nada de la fecha de inicio. `ListarDteRecibidos` filtra por `estado`,
   `desde`, `hasta`, `busqueda`, `tipoDte`, `loteId`, `conProveedor`. La confirmación en lote de una NCRE/NDEB sin
   factura falla con `DteNotaSinFactura`; desde una fila se puede abrir el formulario con la solicitud ya armada
   (`GET …/dte-recibidos/:dteId/solicitud`).
6. **Conciliación** (`dominio/conciliacion/conciliador.ts`): consulta pura por período; nueve grupos
   (`cuadra`, `conDiferencias`, `enLaSatYNoEnArrancar`, `registradoEnOtroPeriodo`, `noVaEnElLibro`,
   `enArrancarYNoEnLaSat`, `sinDatosDeLaSat`, `anuladoEnLaSatYVigenteAqui`, `descartado`). Una fila emitida en el mes
   sin documento va a `enLaSatYNoEnArrancar` (o `descartado`). `ResumenDeConciliacion` es `Record<keyof
   ResultadoDeConciliacion, number>`: un grupo nuevo entra solo en el resumen. Los lotes de conciliación liviana guardan
   `resumen_de_conciliacion` como `jsonb Record<string, number>`: acepta una clave nueva sin migración.
7. **Libro de compras no tiene Excel de documentos** (es Operación); el libro del período se exporta y no muestra la
   factura de una nota.
8. **Migraciones:** la última es `0034_u17_documentos_unicos_por_cuenta` (`when` 1794151754950). La de este diseño es la
   **`0035`**.

### 1.2 Cuentas por pagar

1. **`documento_afectado_id` guarda el id de Libro de compras.** `documentos_factura_fk (documento_afectado_id,
   empresa_id, proveedor_id) → documentos (documento_id, empresa_id, proveedor_id)` (a mano en la `0001`). Un saldo
   inicial (`documento_id` nulo) no puede recibir la llave.
2. **Checks de U8 (`0003`):** `documentos_nota_con_factura` = `origen = 'saldo_inicial' or (tipo in notas) =
   (documento_afectado_id is not null)`; `documentos_saldo_inicial_sin_nota_afectada`. Ya existe el único
   `documentos_id_proveedor_unico (id, empresa_id, proveedor_id)`, que sirve de destino a la llave nueva.
3. **Quién usa `documento_afectado_id`** (todo con el id del libro): `RecibirDocumento` (lo copia y aplica la nota con
   `ConsultasDeCargos.paraAplicarUnaNota(facturaDeCompraId)`, que busca por `documentos.documento_id`),
   `ConsultaBaseDeDocumentos` (subconsulta `notas_del_documento` unida por `documentos.documento_id`),
   `ConsultasDeDocumentosDrizzle.notasDe` (devuelve `[]` si `documentoId` es nulo, es decir, en un saldo inicial),
   el DTO y la ficha. El cliente de Cuentas por pagar **no** usa `documentoAfectadoId` para enlazar.
4. **Error vigente en `paraAplicarUnaNota`:** calcula el saldo de cada cargo como `total − retenciones − aplicado`, sin
   `coalesce(saldo_al_inicio, …)`. Hoy no se nota (ninguna nota llega a un saldo inicial), pero con U8-l repartiría mal:
   una factura de saldo inicial pagada en parte aceptaría más nota que lo que se debe. Se corrige en este paso.
5. **Reglas para corregir o eliminar un saldo inicial:** `REGLAS_PARA_CORREGIR_SALDO_INICIAL = [noEstarAutorizadoElSaldo,
   noTenerMovimientos]`; `noTenerMovimientos` mira solo aplicaciones hechas y recibidas. El DTO calcula `puedeCorregir`
   con lo mismo (`dto-de-saldo-inicial.ts`). Una **nota de débito** ligada al saldo inicial no es una aplicación: hoy no
   lo frenaría y la llave daría un `23503` genérico al eliminar.
6. **CP2 se está programando:** CP2-1 ya en `main` (`0004_cp2_notas_de_credito`: `aplicaciones_de_notas.forma`,
   `fecha`, `referencia`; tabla `ajustes_de_saldo`); CP2-2 a CP2-4 tocan saldos, reglas de baja y aplicación manual,
   sin migración nueva según su diseño. La siguiente migración libre de Cuentas por pagar hoy es la **`0005`**.
7. Texto vigente en el cliente (`cuentas-por-pagar/textos.ts`, ventana Saldos iniciales): «Las notas de crédito o de
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
| Proveedor, familia (`tipo`), serie, número | Identificarla; buscarla en Cuentas por pagar; agrupar sus notas |
| Fecha de emisión | Regla «anterior a la fecha de inicio»; art. 17 de la nota de débito; familia derogada |
| Total e IVA | Topes de las notas de crédito (total e IVA), igual que con una factura del libro |
| Motivo sin crédito (nulo = sí dio crédito) | Lo que hereda la nota de crédito (y en parte la de débito) |
| Autorización FEL (opcional) | Rastro; viene sola si se toma de la bandeja |

Una nota apunta **o** a una factura del libro (`documento_afectado_id`) **o** a una factura anterior
(`factura_anterior_id`), nunca a las dos.

**Por qué una tabla y no columnas en la nota** (pregunta U8l-a): varias notas de la misma factura deben sumar contra
el mismo tope (dos notas de crédito parciales sobre la misma factura son comunes); con columnas sueltas en cada nota no
hay fila que bloquear ni sumar, los datos de la factura se repetirían (y podrían contradecirse) y la tabla de
documentos, ya con más de 40 restricciones, ganaría siete columnas que solo usan unas pocas notas.

**El resolutor presenta la factura anterior como `FacturaParaNota`**, así el cálculo no cambia:

| Campo de `FacturaParaNota` | Valor para una factura anterior |
|---|---|
| `id` | id de la factura anterior (solo para bloquear y sumar) |
| `tipo`, `fechaEmision`, `total`, `iva`, `motivoSinCredito` | los suyos |
| `estado` | `vigente` (no se anula) |
| `proveedorId` | el suyo |
| `destino` | el de la nota (la factura anterior no tiene destino) |
| `muestraEnReportesSat` | el de la nota (pregunta C-U8l-6 al contador) |
| `regimenIvaDeLaEmpresa` | `general` si dio crédito (`motivo` nulo); si no, el régimen actual de la empresa (solo cambia un aviso) |
| sumas de notas | las de sus notas vigentes (`factura_anterior_id`) |

### 2.2 Identidad y vida de la fila

- **Se crea al registrar la primera nota** que la cita (buscar o crear por proveedor, familia, serie y número). El
  formulario siempre manda los datos completos; si ya existe una fila con esa clave:
  - con los **mismos datos**: se reutiliza;
  - con **otros datos** y alguna nota **vigente**: error `FacturaAnteriorConOtrosDatos` (muestra los guardados);
  - con otros datos y **solo notas anuladas**: se corrige con los nuevos datos y se audita (`corregir`,
    `libro-de-compras.facturas-anteriores`, con la fila anterior).
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
| `facturas_anteriores_motivo_valido` | nulo o en `fuera_de_plazo`, `no_vinculado`, `exento`, `empresa_sin_credito`, `pequeno_contribuyente`, `contribuyente_agropecuario`, `primario_pecuario` (no `nota_de_debito_tardia`) |
| `facturas_anteriores_motivo_de_la_familia` | familia sin IVA ⇒ su motivo (`MOTIVO_DE_LA_FAMILIA`); otra familia ⇒ motivo no es de familia (mismo `case` que `documentos_motivo_de_la_familia`) |
| `facturas_anteriores_sin_iva` | motivo de familia sin IVA o `exento` ⇒ `iva = 0` |
| `facturas_anteriores_primario_pecuario_desde` | igual que `documentos_primario_pecuario_desde` |
| `facturas_anteriores_id_proveedor_unico` | único `(id, empresa_id, proveedor_id)` (destino de la llave de la nota) |
| `facturas_anteriores_del_proveedor_unica` | único `(empresa_id, proveedor_id, tipo, coalesce(serie,''), numero)` |
| `facturas_anteriores_proveedor_fk` | `(proveedor_id, cuenta_id) → terceros.proveedores (id, cuenta_id)`, `no action` |
| `facturas_anteriores_proveedor_idx` | índice `(proveedor_id)` (llave entre esquemas) |

«Anterior a la fecha de inicio» **no** puede ser un `check` (la fecha vive en `empresas.cargas_iniciales` y puede
cambiar mientras la carga esté abierta): lo revisa el dominio al registrar y el aviso `fecha_de_inicio_por_cambiar`
(§4.4). Tampoco la regla de los 10 años (decisión (1) del 2026-11-12, aplicada por analogía).

**RLS:** `politicaPorEmpresa()`. Sin alcance por registro (Libro de compras no lo tiene en documentos).

### 3.2 Cambios en `libro_de_compras.documentos`

| Cambio | Detalle |
|---|---|
| Columna `factura_anterior_id uuid null` | La factura anterior que corrige una nota |
| Llave `documentos_factura_anterior_fk` | `(factura_anterior_id, empresa_id, proveedor_id) → facturas_anteriores (id, empresa_id, proveedor_id)`, `no action` (no es autorreferente: la escribe drizzle-kit) |
| Índice `documentos_factura_anterior_idx` | `(factura_anterior_id) where factura_anterior_id is not null` |
| `documentos_nota_con_factura` (se reemplaza) | `(tipo in ('nota_de_credito','nota_de_debito')) = (num_nonnulls(documento_afectado_id, factura_anterior_id) = 1) and num_nonnulls(documento_afectado_id, factura_anterior_id) <= 1` |

`documentos_nota_factura_fk`, `documentos_nota_en_su_mes` y las demás quedan igual. Las filas existentes cumplen el
check nuevo (toda nota tiene `documento_afectado_id` y `factura_anterior_id` nace nulo).

### 3.3 Migración de Libro de compras `0035_u8l_facturas_anteriores`

Generada con `npm run bd:generar -w servidor -- libro-de-compras u8l_facturas_anteriores`, `when` mayor que
1794151754950. Orden: crear la tabla con sus checks, únicos, llaves e índice; política RLS; columna en `documentos`;
llave e índice; `drop constraint documentos_nota_con_factura` y crearla de nuevo. Sin relleno. Los permisos de la tabla
nueva los da el migrador por esquema.

### 3.4 Cambios en `cuentas_por_pagar.documentos`

| Cambio | Detalle |
|---|---|
| Columna `factura_del_sistema_anterior boolean not null default false` | La nota del libro corrige una factura del sistema anterior |
| `documentos_factura_fk` (se reemplaza) | `(documento_afectado_id, empresa_id, proveedor_id) → documentos (id, empresa_id, proveedor_id)` (`documentos_id_proveedor_unico`), `no action`, a mano (autorreferente) |
| `documentos_nota_con_factura` (se reemplaza) | `origen = 'saldo_inicial' or (tipo not in notas and documento_afectado_id is null) or (tipo in notas and (documento_afectado_id is not null or factura_del_sistema_anterior))` |
| `documentos_factura_anterior_solo_en_notas` (nuevo) | `not factura_del_sistema_anterior or (origen = 'libro_de_compras' and tipo in ('nota_de_credito','nota_de_debito'))` |

Que el `documento_afectado_id` de una nota con `factura_del_sistema_anterior` sea un **saldo inicial** de **familia
factura** lo cuida el dominio (un `check` no puede mirar otra fila). `documentos_afectado_idx` sigue sirviendo.

### 3.5 Migración de Cuentas por pagar `0005_u8l_notas_sobre_saldos_iniciales`

Número: la **`0005`** si nadie la tomó antes (CP2 no trae más migraciones; si CP3 entra primero, la siguiente libre).
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
-- y los dos checks de §3.4 (drop y add del primero).
```

Corre como propietario (sin RLS forzada), así el `update` alcanza todas las empresas. Prueba de la migración (como la del
relleno de CP2-1): sembrar una factura y su nota con el sentido viejo, correr las sentencias y revisar que la nota apunte
al id propio.

### 3.6 Mensajes de restricciones (`MENSAJES_POR_RESTRICCION`)

- `facturas_anteriores_del_proveedor_unica` (`23505`, carrera entre dos notas que crean la misma factura): «Otra
  persona acaba de registrar esa factura anterior; vuelva a intentar.» (en la práctica el caso de uso hace
  `insert … on conflict do nothing` y luego `select … for update`, así que casi nunca llega).

### 3.7 P-U8-1: sin migración

La marca **se calcula al consultar** (`fecha_emision < fecha de inicio`), no se guarda: la fecha de inicio puede
cambiar mientras la carga está abierta y una columna guardada quedaría vieja. No hace falta índice nuevo:
`dte_recibidos_bandeja_idx (empresa_id, estado, fecha_emision)` ya cubre el filtro por fecha.

## 4. Reglas

### 4.1 Registrar o calcular una nota con factura anterior (Libro de compras)

La solicitud trae `facturaAnterior` en lugar de `documentoAfectadoId`. `ResolutorDeFactura` decide:

1. Ni factura ni factura anterior en una nota, o las dos: `FacturaAfectadaIncoherente` (ya existe; texto nuevo para
   «las dos»). Factura anterior en algo que no es nota: el mismo error.
2. **Sin fecha de inicio** en la empresa: `FacturaAnteriorSinFechaDeInicio`.
3. `fechaEmision` de la factura **igual o posterior** a la fecha de inicio: `FacturaAnteriorPosteriorALaFechaDeInicio`
   (campo `facturaAnterior.fechaEmision`). Más de **10 años** antes de la fecha de inicio: `FacturaAnteriorMuyAntigua`
   (mismo tope que los saldos iniciales).
4. La factura **está en el libro de Arrancar** (vigente, mismo proveedor, familia, serie y número): `FacturaAnteriorEstaEnElLibro`
   («elíjala en “Factura que corrige”»). Es el caso C-U8-1 de una factura de antes del corte recibida después.
5. Buscar o crear la fila (§2.2), **bloqueada** `for update` al registrar (dos notas a la vez no se pasan del tope).
6. Desde aquí, todo igual que con una factura del libro: `exigirFacturaQueAdmiteLaNota` (con destino y casilla de la
   nota, así que solo puede fallar por familia), familia derogada, cálculo con `datosDeLaFactura` (herencia del motivo,
   art. 17 en la de débito), topes del total y del IVA con las notas vigentes de la factura anterior.
7. El período de la nota de crédito sigue siendo el mes de su recepción (`documentos_nota_en_su_mes`); el aviso de
   U8-8 sale si **la propia nota** se emitió antes de la fecha de inicio.
8. La nota viaja al destino con `facturaAnterior` (§5.1).

**Registrar una factura que ya es «del sistema anterior»** (misma clave que una factura anterior con alguna nota
vigente): se rechaza con `FacturaYaEsDelSistemaAnterior` («la nota N la cita como factura del sistema anterior; si
en realidad no estaba en el libro anterior, anule primero esa nota») — pregunta U8l-e. Vale también para la
confirmación desde la bandeja.

### 4.2 Bajas de la nota (Libro de compras)

- **Anular** una nota con factura anterior: como hoy (aviso al destino, que deshace lo suyo). La fila de la factura
  anterior queda.
- **Eliminar**: como hoy; después, si la factura anterior ya no tiene notas (vigentes ni anuladas), se borra en la
  misma transacción. La auditoría `eliminar` de la nota lleva `facturaAnterior` dentro de su DTO.
- **Nota de débito**: `tope-de-la-baja.ts` revisa con la factura anterior igual que con una del libro (las de crédito
  deben seguir cabiendo).

### 4.3 Cuentas por pagar al recibir (`RecibirDocumento`)

1. Nota sobre factura del libro: traduce `documentoAfectadoId` (id del libro) al id propio
   (`documentos.porDocumentoDeCompra`); siempre existe porque nota y factura tienen el mismo destino.
2. Nota con `facturaAnterior`: busca, bloqueado `for update`, el **saldo inicial** del mismo proveedor, **familia
   factura** (los seis tipos de factura cuentan como uno, como `documentos_numero_por_proveedor_unico`), serie y número,
   no anulado. Hay como mucho uno (por ese único).
   - **Lo encuentra:** guarda la nota con `documento_afectado_id` = el saldo inicial y `factura_del_sistema_anterior =
     true`. Si la fecha de emisión no coincide, **avisa** sin bloquear («El saldo inicial S-N tiene fecha … y la nota
     cita …; revise»).
     - Nota de crédito: se aplica sola (`forma = 'automatica'`, fecha = recepción de la nota) al saldo inicial y luego
       a las notas de débito ligadas a él, con el saldo **`coalesce(saldo_al_inicio, total − retenciones) − aplicado`**
       (corrección de §1.2.4). Lo que sobra es saldo libre, con el aviso de siempre.
     - Nota de débito: cargo con su vencimiento propuesto, ligado al saldo inicial.
   - **No lo encuentra** (la factura se pagó antes del corte, o el saldo inicial aún no se carga, o se cargó con otro
     número): `documento_afectado_id` nulo y `factura_del_sistema_anterior = true`.
     - Nota de crédito: todo su total queda como **saldo libre** (derecho de cobro frente al proveedor, U13), con el aviso
       «No hay un saldo inicial S-N de este proveedor: la nota queda como saldo a favor de Q…; si la factura todavía
       se debe, cárguela en Saldos iniciales y aplique la nota en Notas de crédito» (aplicación manual de CP2).
     - Nota de débito: cargo suelto, con el aviso «…la nota de débito queda como un cargo sin factura».
   - Pregunta U8l-c: si además se enlaza solo cuando el saldo inicial se carga después.
3. **Empresa sin Cuentas por pagar:** hoy Cuentas por pagar es el único destino, así que el libro no registra nada sin
   él. Los destinos futuros (Caja chica, Cuentas por liquidar) reciben el mismo `facturaAnterior` y deciden; Libro de
   compras no depende de que alguien lo encuentre.

### 4.4 Saldos iniciales y fecha de inicio

- **Saldo inicial con notas del libro** (vigentes o anuladas que lo citan): ya tiene movimientos. `noTenerMovimientos`
  suma «o alguna nota lo corrige» (mismo error `SaldoInicialConMovimientos`), y `puedeCorregir`/`puedeEliminar` del DTO
  usan `notasEnTotal` de la consulta base (que ahora se une por `documentos.id`, así cuenta también en un saldo
  inicial). Corregir la apertura por una nota posterior sigue prohibido (C-U8-5).
- **Cambiar la fecha de inicio** (carga abierta): Libro de compras escucha `empresas.fecha_de_inicio_por_cambiar` y
  lanza `FacturasAnterioresPosterioresALaFecha` si alguna factura anterior con nota vigente quedaría con emisión igual o
  posterior a la fecha nueva. Mover la fecha más adelante nunca choca.
- Cerrar o reabrir la carga no cambia nada aquí: registrar notas es proceso, no carga.

### 4.5 P-U8-1: DTE anteriores a la fecha de inicio

- **Marca:** una fila de la bandeja es «anterior a la fecha de inicio» si la empresa tiene fecha de inicio y
  `fecha_emision < fecha de inicio`. Sin fecha de inicio, ninguna lo es.
- **Bandeja:** cada fila trae `anteriorALaFechaDeInicio`. El filtro nuevo `anteriores` (`incluir` | `ocultar` |
  `solo`; en el servidor, `incluir` por omisión para no cambiar a quien no lo mande) se traduce a `fecha_emision >=
  fecha de inicio` o `<`. El cliente, por omisión, **oculta** las anteriores en Pendientes y muestra «N DTE de antes de
  la fecha de inicio (ya registrados en el sistema anterior) — Mostrar» (pregunta P1-a). Se pueden confirmar igual (con
  el aviso de U8-8) o descartar; seguir pendientes no estorba.
- **Conciliación:** una fila emitida en el mes, **anterior a la fecha de inicio** y **sin documento** en Arrancar va al
  grupo nuevo `anterioresALaFechaDeInicio` (informativo, no es faltante) en lugar de `enLaSatYNoEnArrancar` o
  `descartado`. Si tiene documento (se registró en Arrancar porque llegó después del corte, C-U8-1), se concilia
  como siempre. El lado de Arrancar no cambia. `EntradaDeConciliacion` gana `fechaDeInicio: string | null`, que
  `ConciliarPeriodo` pide por el mediador. Un período entero anterior a la fecha de inicio queda con todo en ese grupo.
- **Importar:** la respuesta de la importación (no el lote guardado) suma `anterioresALaFechaDeInicio: number` para
  avisar «N DTE son de antes de la fecha de inicio: quedaron marcados y fuera de la conciliación».

## 5. Comunicación entre módulos (sin importarse)

### 5.1 Contrato (`core/contratos/libro-de-compras.contratos.ts`)

```ts
/** La factura del sistema anterior que corrige una nota (no está en el libro de Arrancar). */
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

El evento `libro-de-compras.documento_registrado` hereda el campo (Contabilidad lo leerá: la partida de la nota sale
de la nota; el pasivo de la factura ya está en la apertura).

### 5.2 Órdenes y avisos

| Quién | Qué | Nuevo |
|---|---|---|
| Libro → Cuentas por pagar | `cuentas-por-pagar.recibir_documento` con `facturaAnterior` | solo el campo |
| Libro → Empresas | `empresas.obtener_carga_inicial` (fecha de inicio) en el resolutor, la bandeja y la conciliación | uso nuevo de una orden existente |
| Empresas → Libro | aviso `empresas.fecha_de_inicio_por_cambiar` | Libro de compras empieza a escucharlo |

Cuentas por pagar lee las tablas de Libro de compras (su `dependeDe`) desde `infraestructura` para mostrar en su ficha
los datos de la factura anterior de una nota sin saldo inicial (unión `documentos` del libro → `facturas_anteriores`),
como ya lee recepción y anulación. Libro de compras **no** pide nada a Cuentas por pagar (no depende de él).

**Orden de bloqueo** (sin cambios): Empresas (compartido) → Libro de compras (factura anterior `for update`, nota) →
Cuentas por pagar (saldo inicial `for update`). Corregir un saldo inicial va Empresas → Cuentas por pagar: no se cruza.

## 6. Permisos, auditoría y errores

### 6.1 Permisos

**Ninguno nuevo.** Registrar o calcular la nota: `libro-de-compras.documentos.crear`; sugerencias de facturas
anteriores: el mismo; bandeja: `libro-de-compras.documentos.importar` (como hoy); conciliación: su permiso actual.
Cuentas por pagar: sin cambios (la aplicación manual de una nota que quedó libre usa el permiso de CP2).

### 6.2 Auditoría

| Hecho | Acción y recurso | `anterior` |
|---|---|---|
| Eliminar una nota con factura anterior | `eliminar`, `libro-de-compras.documentos` (como hoy) | DTO de la nota **con** `facturaAnterior` |
| Anular esa nota | `anular` (como hoy) | DTO con `facturaAnterior` |
| Corregir los datos de una factura anterior que solo tiene notas anuladas | `corregir`, `libro-de-compras.facturas-anteriores` | la fila como estaba |
| Borrar la fila con su última nota eliminada | sin registro propio: va dentro del de la nota | — |
| P-U8-1 | no escribe nada | — |

### 6.3 Errores nuevos (código propio)

| Clase (módulo) | Familia | Código | Campo |
|---|---|---|---|
| `FacturaAnteriorSinFechaDeInicio` (libro) | `ReglaDeNegocioInfringida` | `factura_anterior_sin_fecha_de_inicio` | — |
| `FacturaAnteriorPosteriorALaFechaDeInicio` (libro) | `DatoInvalido` | `factura_anterior_posterior_a_la_fecha_de_inicio` | `facturaAnterior.fechaEmision` |
| `FacturaAnteriorMuyAntigua` (libro) | `DatoInvalido` | `factura_anterior_muy_antigua` | `facturaAnterior.fechaEmision` |
| `FacturaAnteriorEstaEnElLibro` (libro) | `ReglaDeNegocioInfringida` | `factura_anterior_esta_en_el_libro` (detalles: `documentoId`) | `facturaAnterior.numero` |
| `FacturaAnteriorConOtrosDatos` (libro) | `ReglaDeNegocioInfringida` | `factura_anterior_con_otros_datos` (detalles: los guardados) | — |
| `FacturaYaEsDelSistemaAnterior` (libro) | `ReglaDeNegocioInfringida` | `factura_ya_es_del_sistema_anterior` (detalles: la nota) | `numero` |
| `FacturasAnterioresPosterioresALaFecha` (libro, aviso de Empresas) | `ReglaDeNegocioInfringida` | `facturas_anteriores_posteriores_a_la_fecha` | `fechaDeInicio` |

Se reutilizan `FacturaAfectadaIncoherente`, `NotaSuperaLaFactura`, `IvaDeNotasExcedeElDeLaFactura`,
`NotaConIvaDeFacturaExenta`, `FacturaNoSirveParaLaNota` y, en Cuentas por pagar, `SaldoInicialConMovimientos`.

## 7. API

| Ruta | Cambio |
|---|---|
| `POST /api/libro-de-compras/documentos` y `…/calcular` | Cuerpo gana `facturaAnterior?: { tipo, serie?, numero, fechaEmision, autorizacionFel?, total, iva, motivoSinCredito }` (`motivoSinCredito`: `null` = dio crédito, o uno de `fuera_de_plazo`, `no_vinculado`, `exento`, `empresa_sin_credito`; el de familia lo pone el servidor). Excluyente con `documentoAfectadoId` |
| `GET /api/libro-de-compras/proveedores/:proveedorId/facturas-anteriores` (nueva) | `{ fechaDeInicio, usadas: FacturaAnteriorDto[], deLaBandeja: FacturaAnteriorDto[] }`: las ya citadas por notas del proveedor y los DTE de factura de la bandeja de su NIT emitidos antes de la fecha de inicio, para llenar el formulario con un clic (pregunta U8l-d). Permiso `documentos.crear` |
| `GET /api/libro-de-compras/documentos/:id` | La ficha de una nota gana `facturaAnterior: FacturaAnteriorDto \| null` |
| `GET /api/libro-de-compras/dte-recibidos` | Query `anteriores=incluir\|ocultar\|solo`; cada elemento gana `anteriorALaFechaDeInicio`; la página gana `fechaDeInicio` y `anterioresOcultos` (cuántas quedaron fuera por el filtro) |
| `POST /api/libro-de-compras/dte-recibidos/importar` | Respuesta gana `anterioresALaFechaDeInicio` |
| `GET /api/libro-de-compras/dte-recibidos/conciliacion` | `resultados.anterioresALaFechaDeInicio`, `resumen.anterioresALaFechaDeInicio` y `fechaDeInicio` |
| `GET /api/cuentas-por-pagar/documentos/:id` | La ficha de una nota gana `facturaDelSistemaAnterior` y, si no tiene saldo inicial, `facturaAnterior` (serie, número, fecha) leída del libro; la de un saldo inicial lista sus notas del libro |

`FacturaAnteriorDto`: `{ tipo, serie, numero, fechaEmision, autorizacionFel, total, iva, motivoSinCredito }` (dinero
como texto).

## 8. Cliente

- **Formulario de registro (Libro de compras, nota):** en «Factura que corrige», además de las facturas del proveedor,
  la opción «Una factura del sistema anterior (antes del dd/mm/aaaa)» si la empresa tiene fecha de inicio. Abre los
  campos en un componente `CamposDeFacturaAnterior` (tipo, serie, número, fecha, total, IVA, «¿Dio crédito fiscal?» y,
  si no, por qué) con la lista de sugerencias (usadas y de la bandeja) que los llena. Ayuda: «Use esta opción solo si
  la factura estaba en el libro de compras del sistema anterior. Si la registró en Arrancar, elíjala de la lista.»
  Los errores por campo llegan con `facturaAnterior.*`. Lógica pura (`edicion-de-factura-anterior.ts`) con pruebas.
- **Ficha de la nota:** «Corrige la factura del sistema anterior SERIE-NÚMERO del dd/mm/aaaa (total Q…, IVA Q…,
  dio / no dio crédito)».
- **Bandeja:** marca «Antes de la fecha de inicio» en `TarjetaDeDteRecibido`, filtro en `FiltrosDeLaBandeja` (oculto por
  omisión en Pendientes), aviso con «Mostrar», y el error de una NCRE/NDEB sin factura en la confirmación en lote
  suma: «Si su factura es de antes de la fecha de inicio, regístrela desde el formulario».
- **Conciliación:** tarjeta y lista «Antes de la fecha de inicio» en `TarjetasDeConciliacion`/`PanelDeConciliacion`,
  plegada y gris, con la ayuda «Ya registrados en el sistema anterior; no se concilian aquí».
- **Cuentas por pagar:** ficha de la nota («Corrige el saldo inicial S-N» con enlace, o «Factura del sistema anterior
  S-N, sin saldo inicial»); ficha del saldo inicial con sus notas posteriores; el texto de la ventana Saldos iniciales
  (`textos.ts`) cambia a «Las notas recibidas desde la fecha de inicio sobre estos documentos se registran en Libro de
  compras con “Factura del sistema anterior”; aquí se aplican solas. No corrija el saldo pendiente por ellas.»
- **Excel:** ningún cambio (Libro de compras no tiene Excel de documentos; la bandeja y la conciliación son Operación;
  el Excel de Saldos iniciales no cambia de columnas).

## 9. Convivencia y riesgos

1. **CP2 (en curso):** CP2-2 toca la consulta base y los saldos; este diseño cambia la unión `notas_del_documento`,
   `notasDe` y `paraAplicarUnaNota`. Para no pisarse, los pasos de Cuentas por pagar (§10, pasos 5 y 6) van **después
   de CP2-4**. La aplicación automática a un saldo inicial guarda `forma = 'automatica'` y `fecha` = recepción, igual
   que CP2-1. Una nota que quedó libre se aplica con la aplicación manual de CP2 (su fecha mínima ya es la recepción y la
   fecha de inicio). `noTenerAplicacionesManualesRecibidas` de CP2 también protege al saldo inicial que recibió una.
2. **U8:** la apertura (`saldo_al_inicio`) nunca cambia por una nota; el cuadre de saldos iniciales no cambia. Un saldo
   inicial con notas ya no se corrige ni elimina (§4.4). El aviso de U8-8 sigue igual.
3. **Libro de compras:** las notas sobre facturas del libro no cambian. El único compartido entre libro y Cuentas por
   pagar (`documentos_numero_por_proveedor_unico`) no se toca: la nota tiene su propio número.
4. **Crédito fiscal doble:** se cierra por los dos lados: una factura anterior no puede estar en el libro (§4.1.4) y una
   factura que ya es anterior no se registra en el libro (§4.1, U8l-e).
5. **Datos escritos mal:** si quien registra pone otro número que el del saldo inicial, la nota queda libre (aviso) y se
   aplica a mano (CP2). Si se equivoca en la familia de la factura, la fila nueva queda aparte; no rompe nada.
6. **Concurrencia:** dos notas a la vez sobre la misma factura anterior: `insert … on conflict do nothing` + `select …
   for update`, la segunda espera y ve la suma de la primera. Recibir en Cuentas por pagar bloquea el saldo inicial; una
   corrección del saldo inicial en curso hace esperar.
7. **Rendimiento:** la marca P-U8-1 cuesta una orden al mediador por consulta (ya la hace el registro); el filtro usa el
   índice existente.
8. **Proveedores:** la llave nueva hacia `terceros.proveedores` impide borrar un proveedor con facturas anteriores
   (Terceros ofrece inactivar, como con documentos).
9. **Borrar la empresa:** `on delete cascade` desde `empresa_id`; la llave de la nota es `no action` y se revisa al final
   del comando.

## 10. Pasos (un commit cada uno; servidor y cliente por separado)

Cada commit corre `npm run revisar` y sus pruebas y actualiza la bitácora de `PLAN.md`.

1. **P1-1 (servidor, Libro, DTE anteriores):** `fechaDeInicio` en `EntradaDeConciliacion` y grupo
   `anterioresALaFechaDeInicio` en el conciliador; filtro `anteriores`, marca y `anterioresOcultos` en la bandeja;
   conteo en la respuesta de importar. **Pruebas** puras del conciliador (fila anterior sin documento, anterior con
   documento, anterior descartada, sin fecha de inicio, mes partido por la fecha) y de API (filtro y marca).
2. **P1-2 (cliente, bandeja y conciliación):** marca, filtro oculto por omisión con «Mostrar», tarjeta y lista nuevas,
   texto del error de NCRE sin factura. Pruebas de la lógica pura.
3. **U8l-1 (servidor, Libro, datos):** tabla `facturas_anteriores`, columna y llave en `documentos`, check nuevo,
   migración `0035`. **Pruebas de tablas:** familia especial o recibo (falla), motivo de familia que no corresponde,
   IVA en familia sin IVA, IVA mayor que el total, nota con factura y factura anterior a la vez (falla), nota sin
   ninguna (falla), factura con factura anterior (falla), único por proveedor, RLS por empresa,
   `politicas-de-los-modulos` y `llaves-entre-esquemas`.
4. **U8l-2 (servidor, Cuentas por pagar, datos y sentido de la llave):** migración `0005` (§3.5) con su prueba;
   `RecibirDocumento` traduce el id del libro al propio; `paraAplicarUnaNota` busca por id propio y usa
   `coalesce(saldo_al_inicio, …)`; consulta base y `notasDe` por `documentos.id`; DTO y TSDoc. **Pruebas:** las de CP1
   y CP2 siguen pasando; nota sobre factura del libro (apunta al id propio); relleno de la migración.
5. **U8l-3 (servidor, contrato y Cuentas por pagar al recibir):** `facturaAnterior` en `DocumentoParaDestino`
   (opcional al leerlo); búsqueda del saldo inicial, aplicación, avisos (encontrada, fecha distinta, no encontrada de
   crédito y de débito); `noTenerMovimientos` con notas y `puedeCorregir`; ficha. **Pruebas:** saldo inicial pagado en
   parte y nota mayor que su saldo (sobra libre), con notas de débito ligadas, sin saldo inicial (libre / cargo
   suelto), saldo inicial anulado no cuenta, familia distinta de factura que sí coincide, corregir y eliminar un saldo
   inicial con nota (rechazo), anular la nota desde el libro (vuelve el saldo).
6. **U8l-4 (servidor, Libro, registrar):** dominio de la factura anterior (§2.1, §4.1), resolutor que la presenta como
   `FacturaParaNota`, buscar o crear con bloqueo, reglas y errores de §6.3, `paraElDestino` con `facturaAnterior`,
   esquema http. **Pruebas:** nota de crédito sobre factura que dio crédito (rebaja el crédito del mes de recepción),
   sobre factura fuera de plazo / no vinculada / sin crédito (IVA al costo), sobre pequeño contribuyente (sin IVA),
   exenta con IVA (rechazo); nota de débito tardía por art. 17 con la fecha de la factura anterior; dos notas que
   suman más que la factura (rechazo de total y de IVA); fecha igual a la de inicio (rechazo); sin fecha de inicio
   (rechazo); más de 10 años; la factura está en el libro (rechazo); misma clave con otros datos (rechazo con vigente,
   corrección auditada con solo anuladas); registrar una factura que ya es anterior (rechazo); destino Cuentas por
   pagar de punta a punta.
7. **U8l-5 (servidor, Libro, bajas, ficha, sugerencias y fecha de inicio):** eliminar borra la fila huérfana; tope de
   la baja de una nota de débito con factura anterior; ficha con `facturaAnterior`; ruta de sugerencias; escucha de
   `empresas.fecha_de_inicio_por_cambiar`. **Pruebas:** eliminar la única nota (se borra, auditoría con los datos),
   eliminar una de dos (queda), anular (queda), mover la fecha de inicio antes de una factura anterior (rechazo) y
   después (pasa), sugerencias con DTE anteriores de la bandeja y usadas, sin permiso (403).
8. **U8l-6 (cliente, Libro):** `CamposDeFacturaAnterior`, opción en «Factura que corrige», sugerencias, errores por
   campo, ficha de la nota. Lógica pura con pruebas.
9. **U8l-7 (cliente, Cuentas por pagar):** fichas de la nota y del saldo inicial, texto nuevo de Saldos iniciales.
10. **U8l-8 (QA de punta a punta):** empresa con fecha de inicio a mitad de mes; bandeja con DTE de antes y de después
    (marca, filtro, conciliación del mes partido); saldo inicial de una factura pagada en parte; nota de crédito desde
    la bandeja (abrir el formulario) sobre esa factura con «factura del sistema anterior» tomada de las sugerencias
    (se aplica sola, sobra libre); nota de débito sobre otra factura anterior sin saldo inicial (cargo suelto); intentar
    corregir el saldo inicial (rechazo); intentar registrar en el libro la factura anterior (rechazo); cambiar la fecha
    de inicio (rechazo); permisos; celular y modo oscuro.

## 11. Preguntas para el usuario

| # | Pregunta | Opciones | Recomendación |
|---|---|---|---|
| U8l-a | ¿Cómo se guardan los datos de la factura anterior? | **A** tabla propia, una fila por factura, que sus notas comparten; **B** columnas en cada nota | **A**: las notas de una misma factura suman contra el mismo tope y los datos no se repiten ni se contradicen |
| U8l-b | ¿Qué datos de la factura anterior se piden? | **A** familia, serie, número, fecha, total, IVA, ¿dio crédito? (y por qué no), autorización FEL opcional; **B** solo serie, número, fecha y si dio crédito, sin topes | **A**: con total e IVA el sistema frena una nota de crédito mayor que su factura (en total y en IVA), como con las facturas del libro; casi siempre se llenan con un clic desde la bandeja |
| U8l-c | Si la nota llega **antes** de cargar el saldo inicial de su factura, ¿qué pasa cuando después se carga? | **A** nada automático: la nota quedó como saldo a favor (o cargo suelto) y se aplica a mano en Notas de crédito; **B** al crear el saldo inicial se enlazan y aplican solas las notas que lo citan; **C** botón «Enlazar notas» en Saldos iniciales | **A**: reutiliza la aplicación manual de CP2 sin lógica nueva, y no deja al saldo inicial «con movimientos» (sin poder corregirse) apenas se carga; el aviso al recibir la nota explica qué hacer |
| U8l-d | ¿De dónde se sugieren los datos de la factura anterior en el formulario? | **A** de las ya citadas y de los DTE de la bandeja de antes de la fecha de inicio; **B** además de los saldos iniciales de Cuentas por pagar (por el mediador); **C** solo escritos | **A**: la bandeja trae todos los datos (incluido el IVA, que Cuentas por pagar no guarda) y Libro de compras no tiene que pedirle nada a Cuentas por pagar |
| U8l-e | ¿Se puede registrar en el libro una factura que una nota vigente ya cita como «del sistema anterior»? | **A** no (anular primero la nota); **B** sí, con aviso | **A**: o estaba en el libro anterior (y registrarla duplica el crédito) o no estaba (y entonces la nota debió citarla del libro) |
| P1-a | En la bandeja, ¿cómo se ven los DTE de antes de la fecha de inicio? | **A** ocultos por omisión con «Mostrar N»; **B** siempre visibles, solo con la marca | **A**: al empezar pueden ser cientos y no son trabajo pendiente |
| P1-b | En la conciliación, ¿se muestran? | **A** en un grupo informativo aparte, plegado; **B** no se muestran | **A**: queda a la vista que la SAT los trajo y por qué no cuentan, sin ensuciar los faltantes |

## 12. Para `contador-guatemala` (lo fiscal)

| # | Tema | Lo que propone el diseño | Qué validar |
|---|---|---|---|
| C-U8l-1 | Crédito fiscal de la nota de crédito | Hereda el motivo de la factura anterior: si la factura dio crédito, rebaja el crédito fiscal **del mes de recepción** de la nota; si no (fuera de plazo, no vinculada, empresa sin crédito), su IVA va al costo; exenta o de familia sin IVA, sin IVA | ¿Correcto para una factura cuyo crédito se tomó en el sistema anterior? ¿Cambia algo si ese período ya se declaró allá? |
| C-U8l-2 | Lista de «por qué no dio crédito» | `fuera_de_plazo`, `no_vinculado`, `exento`, `empresa_sin_credito` (y los de familia, automáticos) | ¿Falta o sobra alguno? ¿Basta «dio / no dio» sin el motivo? |
| C-U8l-3 | Nota de débito sobre factura anterior | Documento propio (art. 20 desde su emisión); `nota_de_debito_tardia` si se emitió más de dos meses después de la fecha de la factura (art. 17); hereda familia sin IVA y `no_vinculado` | Confirmar |
| C-U8l-4 | Topes | Las notas de crédito no pasan del total ni del IVA de la factura más sus notas de débito **registradas en Arrancar** (las del sistema anterior no se conocen) | ¿Suficiente, o pedir también «notas anteriores al corte» de esa factura? |
| C-U8l-5 | Libro de compras | La nota aparece en el libro de su período con sus propios datos; la factura que corrige no se imprime | ¿El libro (o el SAT-2237) exige la referencia de la factura en la línea de la nota? |
| C-U8l-6 | Casilla «Se muestra en reportes SAT» | La factura anterior toma la de la nota (no se pregunta) | ¿Correcto? (hoy nota y factura deben coincidir) |
| C-U8l-7 | Antigüedad | Factura anterior de hasta 10 años antes de la fecha de inicio (como los saldos iniciales) | ¿Otro tope por prescripción (Código Tributario)? |
| C-U8l-8 | Cuentas por pagar | Nota de crédito sin saldo inicial = saldo a favor (derecho de cobro); nota de débito sin saldo inicial = cargo suelto | Confirmar el tratamiento contable de ambos |
| C-U8l-9 | DTE anteriores | Fuera de la conciliación los que no están en Arrancar; los registrados en Arrancar (recibidos después del corte) se concilian | Confirmar |
| C-U8l-10 | Factura del libro y factura anterior | No puede haber las dos (§4.1.4 y U8l-e) | Confirmar que no hay caso legítimo de ambas |

## 13. Pendiente nuevo

(vacío)
