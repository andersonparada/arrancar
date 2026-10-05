# Diseño de datos de Libro de compras (L1 a L3) — arquitecto de datos, 2026-09-29

Estado: **propuesta para aprobar** (L1, pasos L1-1 a L1-6, **hecho** el 2026-09-29). Aterriza en tablas, reglas y pasos lo decidido en
`libro-de-compras.md` (incluidas las «Respuestas del usuario (2026-09-29, tarde)»),
`validacion-h7-h11-retenciones.md` (con las decisiones del usuario al final), lo que
`cuentas-por-pagar.md` espera recibir, H5a (`diseno-esquema-empresas.md`), `PLAN.md` §3.2 y
§3.5 y `ARQUITECTURA.md` §4.8. Si algo de aquí choca con esos documentos, mandan ellos; los
huecos que quedan están en «Preguntas para el usuario».

## 1. Lo encontrado en el código y la base

1. No existe nada del módulo: ni esquema `libro_de_compras` ni carpeta. Hay `core/mediador`
   (L0) y dos contratos: `mediador.contratos.ts` y `empresas.contratos.ts`
   (`empresas.obtener_datos_de_empresa` devuelve `nit`, que sigue nulable en `core.empresas`).
2. `terceros.proveedores` es **de la cuenta** (`politicaPorCuenta`), una fila por tercero
   (`unique (tercero_id)`), y **nunca se borra**: quitar el papel lo inactiva (`QuitarPapel`,
   `onConflictDoUpdate`). No tiene `unique (id, cuenta_id)`. El NIT está en
   `terceros.terceros.nit` (nulable, único por cuenta salvo `CF`), normalizado por `Nit`
   (`^\d{1,12}[\dK]$`, sin guion). Los permisos del papel no llevan prefijo de módulo:
   `proveedores.crear`, `proveedores.editar`.
3. No existe ningún mecanismo para que un módulo aporte una sección al formulario de otro
   (ni en el servidor ni en el cliente): lo crea L1.
4. El panel de configuración solo edita valores `boolean`, `number` y `string`
   (`CampoDeNivel.vue`): la configuración de retenciones debe ser **plana** (un número por
   variable), no un objeto.
5. El migrador nombra el esquema con `nombreEsquemaDe('libro-de-compras')` =
   `libro_de_compras` y da los `grant` solo. Hay precedente de extensión en una migración de
   módulo (`CREATE EXTENSION IF NOT EXISTS pg_trgm` en `terceros`); `btree_gist` está
   disponible en la base (no instalada).
6. `interpretarErrorDePostgres` traduce el `23505` por **nombre de restricción** con un
   mensaje propio (sin revelar los valores de la llave): sirve para la unicidad en toda la
   instalación sin decir en qué empresa está el documento.
7. `core.correlativos` no hace falta: el documento se identifica por su número fiscal; no hay
   número interno de ingreso.

## 2. Decisiones de diseño (resumen)

| Tema | Decisión |
|---|---|
| Esquema | `libro_de_compras`, clave de módulo `libro-de-compras`. |
| `dependeDe` | `['terceros']` (proveedores y su NIT). `empresas` es módulo base (esencial) y `core` siempre: no se declaran. **No** depende de `bancos` ni de sus destinos: los destinos dependen de él. |
| Datos fiscales de la empresa | `datos_fiscales_de_empresa`, 1 a 1, **por empresa** (`politicaPorEmpresa`). |
| Datos fiscales del proveedor | `datos_fiscales_de_proveedor`, 1 a 1 con `terceros.proveedores`, **por cuenta** (`politicaPorCuenta`), decisión del usuario. |
| Catálogos | `conceptos_de_gasto`, `combustibles` y `vigencias_de_combustible`, **por empresa**. |
| Documentos | `documentos` (encabezado y totales), `lineas_de_documento` y `retenciones`, por empresa. |
| Qué se guarda | Todo monto fiscal **se guarda** calculado y fijo (IVA, base, IDP, exento, `iva_no_acreditable`, retenciones): el documento es inmutable después de registrarlo, así que guardar los totales no arriesga incoherencias, y un cambio de tasa o de configuración nunca cambia lo ya registrado. Se **deriva**: el costo de cada línea, el neto a pagar y el crédito fiscal. |
| Unicidad | Tres índices únicos parciales **sin `empresa_id`** (toda la instalación para los de SAT; toda la cuenta para los del proveedor), solo sobre documentos vigentes. |
| Destino sugerido | Se **deriva** (último documento del proveedor en la empresa); sin tabla. |
| Sección en formularios ajenos | Aviso del mediador **dentro de la transacción** del formulario de Empresas o Proveedores (pregunta 1). |
| Períodos declarados | Tabla `periodos` diseñada aquí, **se programa en L5** (el plan la pone ahí); L3 deja el puerto listo. |
| Moneda | Sin columna hasta *Moneda extranjera* (se agrega con `default 'GTQ'` sin romper nada). |

## 3. Tablas

Convenciones comunes a todas: `...marcasDeTiempo` y `...autoria`; dinero en
`numeric(14,2)` (centavos enteros en el código, texto en la API); llaves entre tablas de la
misma empresa **compuestas con `empresa_id`** y en `no action` (como H5b), para que la cascada
al borrar una empresa se verifique al final del comando; `empresa_id → core.empresas(id) on
delete cascade`; `cuenta_id → core.cuentas(id) on delete cascade`. Textos cortos con `check`
de largo sobre `trim`. Toda llave foránea lleva índice (el de la llave o uno que empiece por
ella).

### 3.1 `libro_de_compras.datos_fiscales_de_empresa` (L1)

Una fila por empresa, creada al guardar la sección por primera vez. Sin fila = valores por
omisión (general, utilidades, no agente).

| Columna | Tipo | Nulo | Por omisión / regla |
|---|---|---|---|
| `empresa_id` | uuid | no | **PK**; FK `core.empresas(id)` cascade |
| `regimen_iva` | text | no | `'general'`; check `in ('general','pequeno_contribuyente')` |
| `regimen_isr` | text | no | `'utilidades'`; check `in ('utilidades','opcional_simplificado')` |
| `agente_de_retencion_iva` | text | no | `'ninguno'`; check `in ('ninguno','exportador','contribuyente_especial','sector_publico','otro')` |
| `es_agente_de_retencion_isr` | boolean | no | `false` |

Checks: `datos_fiscales_de_empresa_pequeno_no_retiene`: `regimen_iva <> 'pequeno_contribuyente'
or agente_de_retencion_iva = 'ninguno'`. RLS: `politicaPorEmpresa()`.

`otro` = designado por la SAT o con contabilidad completa (validación del contador, 15 %); ver
pregunta 12. El NIT de la empresa **no** se copia aquí: sigue en `core.empresas` y L3 lo exige.

### 3.2 `libro_de_compras.datos_fiscales_de_proveedor` (L1)

Una fila por proveedor, **compartida por todas las empresas de la cuenta**.

| Columna | Tipo | Nulo | Por omisión / regla |
|---|---|---|---|
| `proveedor_id` | uuid | no | **PK** |
| `cuenta_id` | uuid | no | `default` cuenta de la transacción (`deLaTransaccion.cuenta()`); FK `core.cuentas` cascade; nunca la escribe el código |
| `es_pequeno_contribuyente` | boolean | no | `false` |
| `regimen_isr` | text | sí | check `in ('utilidades','opcional_simplificado','no_domiciliado')` |
| `es_agente_de_retencion_iva` | boolean | no | `false` |
| `se_le_retiene_iva` | boolean | no | la calcula el dominio al crear (ver abajo) |
| `se_le_retiene_isr` | boolean | no | ídem |
| `se_le_retiene_iva_pequeno_contribuyente` | boolean | no | ídem |

Llaves: FK compuesta `datos_fiscales_de_proveedor_proveedor_fk (proveedor_id, cuenta_id) →
terceros.proveedores (id, cuenta_id)` on delete cascade. Exige un paso previo en `terceros`
(L1-1): `unique proveedores_id_cuenta_unico (id, cuenta_id)`. Con ella, la base garantiza que
el proveedor es de la misma cuenta aunque la llave foránea no pase por RLS.

Checks (coherencia mínima; el usuario sigue mandando dentro de ellos):
- `..._regimen_isr`: `(es_pequeno_contribuyente and regimen_isr is null) or (not es_pequeno_contribuyente and regimen_isr is not null)` (el pequeño contribuyente no tiene régimen de ISR aparte).
- `..._pequeno_no_es_agente`: `not (es_pequeno_contribuyente and es_agente_de_retencion_iva)`.
- `..._retencion_iva_pequeno`: `not se_le_retiene_iva_pequeno_contribuyente or es_pequeno_contribuyente`.
- `..._retencion_iva_general`: `not (se_le_retiene_iva and es_pequeno_contribuyente)`.
- `..._retencion_isr`: `not (se_le_retiene_isr and es_pequeno_contribuyente)`.

Valores por omisión que propone el dominio (`DatosFiscalesDeProveedor.porOmision(regimen)`) y
la sección del cliente al cambiar el régimen: `se_le_retiene_iva = not pequeño and not agente`;
`se_le_retiene_isr = regimen_isr = 'opcional_simplificado'`;
`se_le_retiene_iva_pequeno_contribuyente = pequeño`. Sin fila: régimen `utilidades`, no
pequeño, no agente, y los tres «se le retiene» según esa regla.

RLS: `politicaPorCuenta()`. Índice: la PK cubre la FK.

### 3.3 `libro_de_compras.conceptos_de_gasto` (L2)

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `empresa_id` | uuid | no | FK cascade |
| `nombre` | text | no | 1–120 |
| `tipo_por_omision` | text | no | check `in ('bien','servicio')` |
| `es_producto_agropecuario` | boolean | no | `false` (retención del 65 % a exportadores) |
| `es_activo_fijo` | boolean | no | `false` (lo propone en la línea; P2) |
| `activo` | boolean | no | `true` |

Únicos: `conceptos_de_gasto_nombre_unico (empresa_id, nombre)`,
`conceptos_de_gasto_id_empresa_unico (id, empresa_id)` (destino de la FK de las líneas).
Checks: `not es_activo_fijo or tipo_por_omision = 'bien'`. RLS: `politicaPorEmpresa()`.
Baja: **inactivar** (con auditoría); no se elimina (lo usan documentos; ver pregunta 11 sobre
semilla).

### 3.4 `libro_de_compras.combustibles` y `vigencias_de_combustible` (L2)

`combustibles`: `id`, `empresa_id`, `nombre` (1–80), `activo`. Únicos
`(empresa_id, nombre)` y `(id, empresa_id)`. Baja: inactivar.

`vigencias_de_combustible`:

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `empresa_id` | uuid | no | FK cascade |
| `combustible_id` | uuid | no | FK `(combustible_id, empresa_id) → combustibles (id, empresa_id)` |
| `idp_por_galon` | numeric(8,2) | no | `>= 0` (0 = exención temporal) |
| `porcentaje_de_etanol` | numeric(5,2) | no | `between 0 and 100`, `default 0` |
| `vigente_desde` | date | no | |
| `vigente_hasta` | date | sí | `null` = tasa actual; check `vigente_hasta is null or vigente_hasta >= vigente_desde` |

- **Sin traslapes, en la base:** `exclude using gist (combustible_id with =,
  daterange(vigente_desde, vigente_hasta, '[]') with &&)` con nombre
  `vigencias_de_combustible_sin_traslape`. Requiere `CREATE EXTENSION IF NOT EXISTS
  btree_gist;` en la migración (confiable desde PG 13; el dueño de la base la puede crear). El
  error `23P01` hay que agregarlo a `interpretarErrorDePostgres` (hoy solo mapea `23505`,
  `23503` y `42501`) con el mensaje «Esa vigencia se traslapa con otra del mismo combustible».
- Únicos `(id, empresa_id)`. Índice de la FK: el de exclusión empieza por `combustible_id`.
- Registrar una tasa nueva cierra la abierta el día anterior, en la misma transacción,
  bloqueando antes la fila del combustible (`select … for update`) para que dos altas
  simultáneas no choquen.
- **Una vigencia usada** por alguna línea no cambia su tasa, su etanol ni su `vigente_desde`;
  `vigente_hasta` solo puede ponerse en o después de la última fecha de emisión que la usa. No
  se elimina (FK `no action` → `RecursoEnUso`). Cambiar la tasa de una vigencia sin uso se
  audita como `corregir`.
- RLS de las dos: `politicaPorEmpresa()`.

### 3.5 `libro_de_compras.documentos` (L3)

Encabezado del documento con sus totales (suma de sus líneas, calculada en la misma
transacción).

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `empresa_id` | uuid | no | FK cascade |
| `cuenta_id` | uuid | no | `default` cuenta de la transacción; solo para la FK del proveedor |
| `tipo` | text | no | check `in ('factura','factura_pequeno_contribuyente','nota_de_credito')` (+ `'recibo'` si se aprueba la pregunta 2) |
| `proveedor_id` | uuid | no | FK `(proveedor_id, cuenta_id) → terceros.proveedores (id, cuenta_id)` no action |
| `nit_emisor` | text | sí | normalizado (`Nit`); check `nit_emisor is null or nit_emisor ~ '^[0-9]{1,12}[0-9K]$'` (nunca `CF`) |
| `nombre_emisor` | text | no | nombre del proveedor como estaba al registrar, 1–200 |
| `nit_receptor` | text | sí | NIT de la empresa al registrar (para L4: el DTE debe ser a ese NIT) |
| `serie` | text | sí | mayúsculas y sin espacios; 1–40 |
| `numero` | text | no | mayúsculas y sin espacios; 1–40 |
| `autorizacion_fel` | uuid | sí | UUID de la FEL |
| `fecha_emision` | date | no | |
| `fecha_recepcion` | date | no | check `>= fecha_emision` (fecha de la retención de IVA por agente) |
| `periodo` | date | no | primer día del mes del libro |
| `muestra_en_reportes_sat` | boolean | no | `true` |
| `motivo_sin_credito` | text | sí | check `in ('fuera_de_plazo','no_vinculado','pequeno_contribuyente','exento')` |
| `documento_afectado_id` | uuid | sí | la factura que rebaja una nota de crédito |
| `destino` | text | no | clave del módulo: check `in ('cuentas-por-pagar','caja-chica','cuentas-por-liquidar')` |
| `procesado_en_destino_en` | timestamptz | sí | lo fija el destino (orden `marcar_procesado`); `null` = pendiente |
| `total` | numeric(14,2) | no | `> 0`; lo que dice el documento |
| `base` | numeric(14,2) | no | `>= 0`; gravado sin IVA |
| `iva` | numeric(14,2) | no | `>= 0` |
| `iva_no_acreditable` | numeric(14,2) | no | `between 0 and iva` |
| `idp` | numeric(14,2) | no | `>= 0` |
| `exento` | numeric(14,2) | no | `>= 0`; exento o no afecto |
| `observaciones` | text | sí | 1–500 |
| `estado` | text | no | `'vigente'`; check `in ('vigente','anulado')` |
| `anulado_en`, `anulado_por` | timestamptz, uuid | sí | |
| `motivo_de_anulacion` | text | sí | 1–300 |

Checks (nombres `documentos_<regla>`):
- `totales_cuadran`: `total = base + iva + idp + exento`.
- `periodo_primer_dia`: `extract(day from periodo) = 1`.
- `periodo_desde_emision`: `periodo >= date_trunc('month', fecha_emision)::date`.
- `plazo_del_credito` (art. 20): `tipo = 'nota_de_credito' or not muestra_en_reportes_sat or
  motivo_sin_credito is not null or periodo <= (date_trunc('month', fecha_emision) + interval
  '2 months')::date`.
- `fuera_de_plazo_real`: `coalesce(motivo_sin_credito, '') <> 'fuera_de_plazo' or periodo >
  (date_trunc('month', fecha_emision) + interval '2 months')::date`.
- `nota_en_su_mes`: `tipo <> 'nota_de_credito' or periodo = date_trunc('month',
  fecha_recepcion)::date` (rebaja el crédito del período en que se recibe, sin gracia).
- `nota_con_factura`: `(tipo = 'nota_de_credito') = (documento_afectado_id is not null)`.
- `datos_sat`: `not muestra_en_reportes_sat or (nit_emisor is not null and serie is not null
  and autorizacion_fel is not null)`.
- `sin_sat_sin_credito`: `muestra_en_reportes_sat or (iva = 0 and motivo_sin_credito is null)`
  (desmarcado: todo al costo, fuera del libro).
- `pequeno_contribuyente`: `tipo = 'nota_de_credito' or not muestra_en_reportes_sat or
  ((tipo = 'factura_pequeno_contribuyente') = (coalesce(motivo_sin_credito,'') =
  'pequeno_contribuyente'))`, y `tipo <> 'factura_pequeno_contribuyente' or iva = 0`.
- `iva_no_acreditable_por_motivo`: `(motivo_sin_credito in ('fuera_de_plazo','no_vinculado')
  and iva_no_acreditable = iva) or (coalesce(motivo_sin_credito,'') not in
  ('fuera_de_plazo','no_vinculado') and iva_no_acreditable = 0)`.
- `exento_sin_iva`: `coalesce(motivo_sin_credito,'') <> 'exento' or iva = 0`.
- `anulacion_completa`: `(estado = 'anulado') = (anulado_en is not null and anulado_por is not
  null and motivo_de_anulacion is not null)`.

Únicos e índices:

| Nombre | Definición | Para |
|---|---|---|
| `documentos_id_empresa_unico` | unique `(id, empresa_id)` | FK de líneas y retenciones |
| `documentos_para_notas_unico` | unique `(id, empresa_id, proveedor_id, destino)` | FK de la nota a su factura |
| `documentos_nota_factura_fk` | FK `(documento_afectado_id, empresa_id, proveedor_id, destino) → documentos (id, empresa_id, proveedor_id, destino)` MATCH SIMPLE, no action | la nota es del mismo proveedor y va al mismo destino, garantizado en la base |
| `documentos_sat_unico` | unique `(nit_emisor, tipo, serie, numero) where estado = 'vigente' and muestra_en_reportes_sat` | **toda la instalación** |
| `documentos_autorizacion_fel_unica` | unique `(autorizacion_fel) where estado = 'vigente' and autorizacion_fel is not null` | **toda la instalación** |
| `documentos_del_proveedor_unico` | unique `(empresa_id, proveedor_id, tipo, coalesce(serie, ''), numero) where estado = 'vigente'` | marcados y desmarcados, **solo dentro de la empresa** (respuesta 3; los marcados ya son únicos en toda la instalación) |
| `documentos_libro_idx` | `(empresa_id, periodo)` | Libro de compras (L5) y listas |
| `documentos_proveedor_reciente_idx` | `(empresa_id, proveedor_id, creado_en desc)` | destino sugerido y filtro por proveedor |
| `documentos_emision_idx` | `(empresa_id, fecha_emision)` | listas por fecha |
| `documentos_proveedor_idx` | `(proveedor_id)` | FK a `terceros.proveedores` |
| `documentos_afectado_idx` | `(documento_afectado_id) where documento_afectado_id is not null` | FK de notas y «notas de esta factura» |

Los tres únicos se mapean en `MENSAJES_POR_RESTRICCION` a **un solo mensaje**: «Ese documento
ya está registrado.» (no dice dónde). Antes de insertar, el caso de uso busca el repetido **en
la empresa activa** (RLS lo deja ver) para dar un mensaje con enlace; si no lo ve y la base
rechaza, el repetido está en otra empresa y el mensaje es el genérico. El `anulado` sale de los
índices parciales: **libera el número**; eliminar lo borra.

RLS: `politicaPorEmpresa()`. Sin alcance por registro.

### 3.6 `libro_de_compras.lineas_de_documento` (L3)

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `empresa_id` | uuid | no | FK cascade |
| `documento_id` | uuid | no | FK `(documento_id, empresa_id) → documentos (id, empresa_id)` **on delete cascade** |
| `numero` | smallint | no | `>= 1`; unique `(documento_id, numero)` |
| `concepto_id` | uuid | no | FK `(concepto_id, empresa_id) → conceptos_de_gasto` no action |
| `descripcion` | text | sí | 1–300 |
| `tipo` | text | no | check `in ('bien','servicio')` |
| `es_activo_fijo` | boolean | no | propuesto por el concepto |
| `vigencia_de_combustible_id` | uuid | sí | FK `(vigencia_de_combustible_id, empresa_id) → vigencias_de_combustible` no action |
| `galones` | numeric(12,3) | sí | `> 0` |
| `idp_por_galon` | numeric(8,2) | sí | copia de la vigencia al registrar |
| `porcentaje_de_etanol` | numeric(5,2) | sí | copia de la vigencia al registrar |
| `total` | numeric(14,2) | no | `> 0`; lo que el usuario escribe |
| `exento` | numeric(14,2) | no | `>= 0`, `default 0` |
| `idp` | numeric(14,2) | no | `>= 0` |
| `base` | numeric(14,2) | no | `>= 0` |
| `iva` | numeric(14,2) | no | `>= 0` |
| `iva_no_acreditable` | numeric(14,2) | no | `between 0 and iva` |

Checks:
- `lineas_totales_cuadran`: `total = base + iva + idp + exento`.
- `lineas_combustible_completo`: los cuatro campos de combustible (`vigencia…`, `galones`,
  `idp_por_galon`, `porcentaje_de_etanol`) todos nulos o todos llenos.
- `lineas_combustible_es_bien` y `lineas_activo_fijo_es_bien`: `tipo = 'bien'` si hay
  combustible o `es_activo_fijo`.
- `lineas_idp_calculado`: `(vigencia_de_combustible_id is null and idp = 0) or idp =
  round(galones * idp_por_galon * (100 - porcentaje_de_etanol) / 100, 2)` (la base comprueba la
  fórmula exacta; `numeric` no tiene error de coma flotante).

Índices: `(concepto_id)`, `(vigencia_de_combustible_id) where … is not null`; la FK del
documento la cubre el único `(documento_id, numero)`. RLS: `politicaPorEmpresa()`.

**Costo de la línea (derivado, no se guarda):** `total − iva + iva_no_acreditable` (incluye
IDP y exento). Es lo que Contabilidad llevará al gasto, activo o inventario de la línea.

### 3.7 `libro_de_compras.retenciones` (L3)

Una fila por regla aplicada; se crean al registrar y quedan **fijas**.

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `empresa_id` | uuid | no | FK cascade |
| `documento_id` | uuid | no | FK `(documento_id, empresa_id) → documentos` on delete cascade |
| `impuesto` | text | no | check `in ('iva','isr')` |
| `regla` | text | no | check `in ('iva_exportador_agropecuario','iva_exportador','iva_contribuyente_especial','iva_otro_agente','iva_sector_publico','iva_pequeno_contribuyente','isr_opcional_simplificado')`; check de coherencia `impuesto = split_part(regla, '_', 1)` |
| `base` | numeric(14,2) | no | `> 0` |
| `porcentaje` | numeric(5,2) | sí | `between 0 and 100`; nulo solo en `isr_opcional_simplificado` (escalones) |
| `monto_propuesto` | numeric(14,2) | no | `>= 0`; lo que calculó el sistema |
| `monto` | numeric(14,2) | no | `between 0 and base`; lo que queda (0 = quitada) |
| `motivo_del_ajuste` | text | sí | check `monto = monto_propuesto or motivo_del_ajuste is not null` |
| `fecha` | date | sí | check `regla = 'iva_pequeno_contribuyente' or fecha is not null` |
| `constancia_numero`, `constancia_fecha` | text, date | sí | L5; check los dos o ninguno |

Únicos e índices: unique `(documento_id, regla)` (también cubre la FK);
`retenciones_mes_idx (empresa_id, fecha)` para el reporte (L5);
`retenciones_por_fechar_idx (empresa_id) where fecha is null`. RLS: `politicaPorEmpresa()`.

Se guarda la fila aunque el usuario la quite (monto 0 y motivo): así queda el rastro de la
propuesta. Neto a pagar (derivado) = `documentos.total − sum(retenciones.monto)`.

### 3.8 `libro_de_compras.periodos` (diseñada aquí, se programa en L5)

`(empresa_id, periodo)` PK; `estado` check `in ('abierto','declarado')`; `declarado_en`,
`declarado_por` (check: los dos si está declarado); RLS por empresa. Registrar o anular en un
período toma `for share` sobre su fila (la crea `abierto` con `on conflict do nothing` si no
existe); declarar la toma `for update`. Reabrir: `estado = 'abierto'` con auditoría `reabrir`
y motivo. Solo se consulta si `libro-de-compras.periodos.control_de_declarados` está encendido.
L3 deja el puerto `ControlDePeriodos.exigirAbierto(periodo)` con una implementación que no
bloquea; L5 pone la real.

## 4. Cálculos: qué se guarda y qué se deriva

Todo en **centavos enteros** en el dominio (objeto `Dinero`/funciones puras con pruebas); los
porcentajes de la configuración se pasan a centésimas enteras (15.00 → 1500) y
`monto = redondear(base × centésimas / 10000)`, mitad hacia arriba. El servidor es la única
fuente del cálculo: el formulario pide `POST …/documentos/calcular` (sin guardar) y muestra lo
que responde.

### 4.1 Por línea (factura marcada, régimen general)

1. `idp` (combustible) = `redondear(galones × idp_por_galon × (100 − etanol) / 100)`, con la
   vigencia del combustible en la **fecha de emisión**. Sin vigencia → error
   `CombustibleSinTasaVigente`.
2. `gravado = total − idp − exento` (debe ser `>= 0`).
3. **IVA del documento** = `G − redondear(G / 1.12)`, con `G = Σ gravado` y la tasa de
   `libro-de-compras.iva.tasa`; se **reparte** entre las líneas en proporción a su gravado
   (resto mayor; los centavos sobrantes a la línea de mayor gravado). Así el IVA total coincide
   con el de la FEL con más frecuencia que redondeando línea por línea (pregunta 7).
4. `base = gravado − iva`.
5. `iva_no_acreditable = iva` si el documento tiene motivo `fuera_de_plazo` o `no_vinculado`;
   si no, 0 (decisión del usuario: el IVA fuera de plazo va **al costo de cada línea** y hereda
   su concepto, activo fijo y deducibilidad; sin cuenta aparte).

Factura de pequeño contribuyente: `iva = 0`, `base = total − idp − exento`, motivo
`pequeno_contribuyente`. Casilla SAT desmarcada: `iva = 0`, `base = total − idp − exento`,
motivo nulo, sin retenciones (todo al costo). Nota de crédito: mismas fórmulas sobre sus
líneas; montos positivos (el tipo da el signo en los reportes) y hereda el motivo de su
factura (si la factura quedó sin crédito, la nota rebaja el costo y no el crédito).

### 4.2 Motivo sin crédito fiscal (lo decide el dominio; el usuario solo elige `no_vinculado`)

Orden: desmarcado → nulo; `factura_pequeno_contribuyente` → `pequeno_contribuyente`; `iva = 0`
con todo exento → `exento`; el usuario marcó no vinculado → `no_vinculado`; `periodo >
mes de emisión + 2` → `fuera_de_plazo` (con aviso, y aviso extra si el año de emisión es
anterior al del período: «el gasto cae en un año que puede estar cerrado; consulte a su
contador»). Nota de crédito → el de su factura. Los `check` de 3.5 repiten estas reglas.

### 4.3 Retenciones (patrón Strategy, una estrategia por regla)

Solo si `muestra_en_reportes_sat`, `tipo <> 'nota_de_credito'` (pregunta 4) y el documento
está vigente. Cada estrategia recibe el documento calculado, los datos fiscales de la empresa
y del proveedor y la configuración; devuelve cero o más propuestas `{ regla, base,
porcentaje, monto, fecha }`.

| Regla | Condiciones | Base | Monto | Fecha |
|---|---|---|---|---|
| `iva_exportador_agropecuario` / `iva_exportador` | empresa `exportador`; proveedor `se_le_retiene_iva` y no agente; `factura`; `total >= iva.minimo` | IVA de las líneas cuyo concepto es agropecuario / de las demás | 65 % / 15 % | recepción |
| `iva_contribuyente_especial`, `iva_otro_agente` | empresa de ese tipo; mismas condiciones | IVA del documento | 15 % | recepción |
| `iva_sector_publico` | empresa `sector_publico`; `total >= iva.minimo_sector_publico` | IVA | 25 % | recepción |
| `iva_pequeno_contribuyente` | empresa con `agente_de_retencion_iva <> 'ninguno'`; proveedor `se_le_retiene_iva_pequeno_contribuyente`; `factura_pequeno_contribuyente`; **`total > umbral`** (estrictamente mayor, Q2,500.00) | total | 5 % | **nula**: la pone el destino (`fechar_retencion`) |
| `isr_opcional_simplificado` | empresa `es_agente_de_retencion_isr`; proveedor `opcional_simplificado` y `se_le_retiene_isr`; `factura`; `base_isr >= isr.minimo` | `base_isr = total − iva` (= base + exento, más el IDP si `isr.incluye_idp`; pregunta 12)  | 5 % hasta Q30,000 + 7 % del excedente | emisión |

- El usuario puede **quitar** (monto 0) o **ajustar** cada propuesta con motivo (pregunta 6):
  se guarda `monto_propuesto`, `monto` y `motivo_del_ajuste`, y se audita `corregir` con
  `recurso = 'libro-de-compras.retenciones'`, `anterior` = la propuesta.
- **Fijada al registrar**: nada la recalcula después (ni el destino ni una nota de crédito;
  decisión del usuario con el riesgo anotado en `validacion-h7-h11-retenciones.md`).
- Aviso de entero vencido: si hoy pasa del plazo de entero del mes de la fecha de la retención
  (`libro-de-compras.plazos.dias_habiles_entero_iva` = 15, `…_isr` = 10; días hábiles lunes a
  viernes, sin feriados), aviso de multa e intereses; no bloquea.
- Aviso de responsabilidad solidaria (H7; Decreto 20-2006 art. 7): si la empresa es agente y
  el usuario quita una retención propuesta. Una FEL exenta del banco no genera propuestas
  (`iva = 0` y el banco es agente), así que no avisa.

## 5. Reglas del caso de uso `RegistrarDocumento` (L3)

1. Empresa: NIT en `core.empresas` obligatorio (orden `empresas.obtener_datos_de_empresa`;
   `EmpresaSinNit` con enlace al formulario). Se copia a `nit_receptor`.
2. Proveedor activo de la cuenta (lectura de `terceros.*.tablas.js` desde `infraestructura`,
   con RLS por cuenta) y sus datos fiscales (sin fila → por omisión; pregunta 10).
3. H10 (marcado): `nit_emisor` válido y distinto de `CF`. Si el proveedor no tiene NIT → orden
   `terceros.completar_nit` en la misma transacción; si tiene otro → `NitDelEmisorNoCoincide`.
   Desmarcado: `nit_emisor` = NIT del proveedor (puede ser nulo) y UUID opcional.
4. Tipo coherente con el proveedor: `factura_pequeno_contribuyente` exige proveedor pequeño
   contribuyente y al revés (`TipoNoCorrespondeAlProveedor`).
5. Destino en `DESTINOS` **y activo en la cuenta** (puerto `ModulosActivosDeLaCuenta` del core).
6. Período: se propone el mes de recepción (no el «mes actual»); `>=` mes de emisión; aviso «Ese período
   puede estar declarado: si ya lo presentó, tendrá que rectificar.» si es anterior al mes actual (dato de
   entrada, sin reloj en el dominio); aviso de año anterior si la emisión es de un año anterior al del período; `ControlDePeriodos.exigirAbierto`.
7. Líneas: al menos una; concepto activo; combustible activo con vigencia; cálculo de 4.1.
8. Nota de crédito: su factura vigente, del mismo proveedor y destino (la FK lo repite), de
   tipo factura; se bloquea la factura `for update` y `Σ notas vigentes + esta <= total de la
   factura` (`NotaSuperaLaFactura`); aviso si la nota es más de dos meses posterior.
   La nota hereda tal cual el motivo sin crédito de su factura (su antigüedad nunca le da motivo); con IVA
   contra una factura `exento` es error (`NotaConIvaDeFacturaExenta`); Σ IVA de notas vigentes + la nueva
   `<=` IVA de la factura (`IvaDeNotasExcedeElDeLaFactura`).
9. Unicidad (3.5), inserción de encabezado, líneas y retenciones.
10. Orden `<destino>.recibir_documento` (sección 7) en la misma transacción.
11. Después de confirmar, evento `libro-de-compras.documento_registrado`. La respuesta trae el
    DTO y la lista de **avisos** (fuera de plazo, año distinto, entero vencido, nota tardía,
    retención quitada).

**Anular** (`documentos.anular`, motivo obligatorio): vigente; sin notas vigentes que la
rebajen; aviso `libro-de-compras.documento_por_anular` al destino **antes** de cambiar (el
destino revierte lo suyo o lanza su error y no se anula nada); período abierto (L5); estado
`anulado`; auditoría `anular` con el DTO completo (líneas y retenciones). Libera el número.

**Eliminar** (`documentos.eliminar`): solo si `procesado_en_destino_en is null` y sin notas;
aviso `libro-de-compras.documento_por_eliminar` (el destino borra su fila, que apunta con FK
al documento, o rechaza); `delete` (líneas y retenciones en cascada); auditoría `eliminar` con
el DTO completo.

**No hay «editar»** en L3 (pregunta 5): los montos fiscales y las retenciones quedan fijos; un
error se corrige eliminando (si sigue pendiente en el destino) o anulando y registrando de
nuevo.

## 6. Sección fiscal en los formularios de Empresas y Proveedores (L1)

Propuesta (pregunta 1): el formulario de **Empresas** y el de **Proveedores** mandan, en su
mismo cuerpo, `secciones: { 'libro-de-compras': { … } }` (Zod
`z.record(z.string(), z.unknown()).optional()`). Su caso de uso, después de guardar lo suyo y
dentro de la **misma transacción**, envía un aviso del mediador:

- `empresas.empresa_guardada` `{ empresaId, secciones }` (en `EjecutorEnEmpresa`: el operador
  que se pasa a `avisar` debe llevar `empresaId` = la empresa editada, para que la unidad de
  trabajo del que escucha se una a la misma transacción y RLS vea esa empresa).
- `terceros.proveedor_guardado` `{ proveedorId, terceroId, secciones }` (al registrar un
  tercero con papel de proveedor, al asignar el papel y al actualizar).

Libro de compras escucha los dos: si trae su clave, valida con su Zod y guarda (upsert) su
fila; un error de datos se lanza como `DatoInvalido` con `detalles` bajo
`secciones.libro-de-compras.<campo>`, así `usarFormulario` lo pone junto al campo, y se deshace
todo. Si el módulo no está activo el aviso no le llega (y el cliente no muestra la sección).
El permiso es el del formulario que origina (`empresas.editar` / `proveedores.crear` o
`proveedores.editar`), como manda §4.8. Para **leer**, cada sección llama a su propio módulo:
`GET /api/libro-de-compras/empresas/:empresaId/datos-fiscales` (permiso `empresas.ver`, con un
ejecutor en la empresa pedida equivalente a `EjecutorEnEmpresa`, validando cuenta y acceso) y
`GET /api/libro-de-compras/proveedores/:proveedorId/datos-fiscales` (permiso `terceros.ver`).

Cliente: `DefinicionModuloCliente.secciones?: { en: 'empresa' | 'proveedor'; titulo;
formulario: () => import(...); ficha?: () => import(...); orden }`; un componente del core
`SeccionesAportadas` (formulario y ficha) que el formulario de Empresas y el de Proveedores y
la ficha del proveedor renderizan, solo para módulos activos. Cada sección trae su composable
para leer; el valor de la sección viaja en el `v-model` del formulario principal.

Auditoría: cambiar datos fiscales ya guardados cambia retenciones futuras; se propone auditar
el cambio como `corregir` con los valores anteriores (pregunta 13).

## 7. Contratos del mediador

`core/contratos/libro-de-compras.contratos.ts` (lo crea L3-4):

```ts
declare module './mediador.contratos.js' {
  interface OrdenesEntreModulos {
    /** El destino fecha la retención del 5 % a pequeño contribuyente (al autorizar o pagar). */
    'libro-de-compras.fechar_retencion': { datos: { documentoId: string; fecha: string }; respuesta: void };
    /** El destino marca el documento como procesado (true) o lo devuelve a pendiente (false). */
    'libro-de-compras.marcar_procesado': { datos: { documentoId: string; procesado: boolean }; respuesta: void };
    /** El destino anula o elimina desde su pantalla; Libro de compras aplica sus reglas. */
    'libro-de-compras.anular_documento': { datos: { documentoId: string; motivo: string }; respuesta: void };
    'libro-de-compras.eliminar_documento': { datos: { documentoId: string }; respuesta: void };
  }
  interface AvisosEntreModulos {
    /** Antes de anular o eliminar: el destino revierte lo suyo o lanza su error (se deshace todo). */
    'libro-de-compras.documento_por_anular': { documentoId: string; destino: DestinoDeDocumento; motivo: string };
    'libro-de-compras.documento_por_eliminar': { documentoId: string; destino: DestinoDeDocumento };
  }
}
export type DestinoDeDocumento = 'cuentas-por-pagar' | 'caja-chica' | 'cuentas-por-liquidar';
/** Lo que recibe cada destino en su orden `<destino>.recibir_documento`. */
export interface DocumentoParaDestino {
  documentoId: string; tipo: 'factura' | 'factura_pequeno_contribuyente' | 'nota_de_credito';
  proveedorId: string; documentoAfectadoId: string | null; fechaEmision: string;
  totalCentavos: number; retencionesCentavos: number; tieneActivoFijo: boolean;
}
```

- **Corrección al plan:** `libro-de-compras.recibir_documento` no puede tener un solo nombre
  porque una orden la atiende **un solo** módulo y la clave lleva el prefijo del que la
  atiende. Cada destino declara `'<destino>.recibir_documento': { datos: DocumentoParaDestino;
  respuesta: void }`; L3 crea `core/contratos/cuentas-por-pagar.contratos.ts` con esa sola
  orden (CP1 la atiende). El adaptador de Libro de compras arma el nombre con el destino.
- `fechar_retencion`: solo para `iva_pequeno_contribuyente`; si ya tiene fecha, la misma es
  idempotente y otra da `RetencionYaFechada`; `fecha >= fecha_emision`.
- `anular_documento` / `eliminar_documento`: corren las mismas reglas de la sección 5 y también
  envían el aviso; el destino que originó lo ignora porque ya hizo lo suyo (manejador
  idempotente).
- Orden nueva de `terceros` (en `core/contratos/terceros.contratos.ts`, la atiende `terceros`):
  `'terceros.completar_nit': { datos: { proveedorId: string; nit: string }; respuesta: void }`
  (pone el NIT si está vacío; si tiene otro, error; valida `Nit` y unicidad por cuenta).
- Avisos de L1: `terceros.proveedor_guardado` en `terceros.contratos.ts` y
  `empresas.empresa_guardada` en `empresas.contratos.ts` (sección 6).
- Eventos después de confirmar (catálogo del módulo): `libro-de-compras.documento_registrado`,
  `…documento_anulado`, `…documento_eliminado` (para Contabilidad).
- Libro de compras lee proveedores y su NIT de `terceros` por SQL (está en su `dependeDe`) y no
  lee nada de los destinos (ellos dependen de él, no al revés): sabe si un documento fue
  procesado solo por `marcar_procesado`.

## 8. Configuración (`definirConfiguracion` en `libro-de-compras/modulo.ts`)

Todas `niveles: ['instalacion']` (la ley es igual para todas; solo soporte las cambia),
`publica: false`, números planos (el panel no edita objetos). Porcentajes con
`z.number().min(0).max(100).multipleOf(0.01)`, montos en quetzales con
`z.number().nonnegative().multipleOf(0.01)`.

| Clave | Por omisión |
|---|---|
| `libro-de-compras.iva.tasa` | 12 |
| `libro-de-compras.retenciones_iva.exportador_agropecuario` | 65 |
| `libro-de-compras.retenciones_iva.exportador` | 15 |
| `libro-de-compras.retenciones_iva.contribuyente_especial` | 15 |
| `libro-de-compras.retenciones_iva.otro_agente` | 15 |
| `libro-de-compras.retenciones_iva.sector_publico` | 25 |
| `libro-de-compras.retenciones_iva.minimo` | 2500 |
| `libro-de-compras.retenciones_iva.minimo_sector_publico` | 30000 |
| `libro-de-compras.retenciones_iva.pequeno_contribuyente` | 5 |
| `libro-de-compras.retenciones_iva.umbral_pequeno_contribuyente` | 2500 (se retiene si el total es **mayor**) |
| `libro-de-compras.retenciones_isr.tasa_primer_tramo` | 5 |
| `libro-de-compras.retenciones_isr.limite_primer_tramo` | 30000 |
| `libro-de-compras.retenciones_isr.tasa_excedente` | 7 |
| `libro-de-compras.retenciones_isr.minimo` | 2500 (se retiene si la base es **mayor o igual**) |
| `libro-de-compras.retenciones_isr.incluye_idp` | `true`; boolean, `niveles: ['instalacion','empresa']`: el IDP entra en la base del ISR |
| `libro-de-compras.plazos.dias_habiles_entero_iva` | 15 |
| `libro-de-compras.plazos.dias_habiles_entero_isr` | 10 |

De empresa (L5): `libro-de-compras.periodos.control_de_declarados` (boolean, `false`,
`niveles: ['instalacion','empresa']`, `publica: true`). La variable
`credito_fiscal.cuenta_fuera_de_plazo` del plan **ya no va**: el usuario decidió el IVA al
costo de cada línea, sin cuenta aparte (corregir `libro-de-compras.md`). El plazo del art. 20
(dos meses) va en los `check`, no en configuración.

## 9. Permisos (PLAN §3.5)

| Permiso | Paso |
|---|---|
| `libro-de-compras.conceptos-de-gasto.{ver,crear,editar,importar,exportar}` | L2 (baja por inactivar: sin `eliminar`) |
| `libro-de-compras.combustibles.{ver,crear,editar,importar,exportar}` | L2 |
| `libro-de-compras.vigencias-de-combustible.{ver,crear,editar,eliminar,importar,exportar}` | L2 (eliminar solo sin uso) |
| `libro-de-compras.documentos.{ver,crear,anular,eliminar}` | L3 |
| `libro-de-compras.retenciones.ajustar` | L3 (pregunta 6) |
| `libro-de-compras.documentos.importar` | L4 |
| `libro-de-compras.libro.{ver,exportar}`, `…retenciones.{ver,exportar,constancias}`, `…periodos.{declarar,reabrir}` | L5 |

Donde el plan dice `.registrar` / `.gestionar` léase `.crear` / `.crear`+`.editar`. Datos
fiscales: con `empresas.ver`/`empresas.editar` y `terceros.ver`/`proveedores.crear`/
`proveedores.editar`. Módulo nuevo: no hay roles que migrar (el acceso total los recibe
solo). `core.rol_permisos` y `core.usuario_permisos` no se tocan.

## 10. Excel

- L2, Administración: conceptos de gasto, combustibles y vigencias **importan y exportan** con
  el generador. Vigencias: el combustible se escribe por su nombre; una fila que se traslapa
  falla por fila (el ensayo lo detecta porque crea y deshace).
- L3, Operación: Ingreso de facturas **no** exporta; su importación (excepción acordada) es L4.
- L1: los datos fiscales no tienen Excel propio (pregunta abierta si se quieren en el Excel de
  Proveedores; recomendación: después de L3).

## 11. Migraciones y semillas

| Paso | Migración | Contenido |
|---|---|---|
| L1-1 | `terceros/00xx_proveedores_id_cuenta_unico.sql` | `unique (id, cuenta_id)` en `terceros.proveedores` |
| L1-2 | `libro-de-compras/0000_esquema.sql` | `create schema libro_de_compras` (lo genera el generador de módulo) |
| L1-4 | `0001_l1_datos_fiscales.sql` | las dos tablas de datos fiscales |
| L2-1 | `0002_l2_conceptos_de_gasto.sql` | tabla |
| L2-3 | `0003_l2_combustibles.sql` | `create extension if not exists btree_gist;` + las dos tablas + exclusión |
| L3-1 | `0004_l3_documentos.sql` | documentos, líneas y retenciones con sus checks e índices (los índices con `coalesce` o `where` que drizzle-kit no escriba bien, en una `--custom` aparte) |
| L5 | `…_periodos.sql` | `periodos` |

Datos existentes: ninguno (módulo nuevo, ninguna cuenta lo tiene activo). Semillas: ninguna
obligatoria; combustibles no se siembran (son del usuario); conceptos, según la pregunta 11
(si se aprueba, como Bancos H3: al abrir el catálogo vacío). `bd:sembrar -- --demo` puede
agregar datos fiscales y algunos conceptos a la cuenta demo (commit del paso que corresponda).

## 12. Pruebas necesarias

- **Dominio (Vitest puro):** cálculo de IDP (E10, IDP 0, galones con 3 decimales), reparto del
  IVA (centavos sobrantes, línea toda exenta, combustible con exento), motivo (cada orden de 4.2,
  fuera de plazo justo en emisión + 2 y + 3, nota hereda), cada estrategia de retención
  (Q2,500.00 no y Q2,500.01 sí en pequeño contribuyente; mínimo de agentes en el límite; ISR
  30,000.00 y 30,000.01; exportador con líneas mixtas; proveedor agente; desmarcado; nota sin
  retención), valores por omisión de los datos fiscales del proveedor.
- **Casos de uso (dobles):** H10 (sin NIT → orden; NIT distinto → error; desmarcado sin NIT),
  destino inactivo, nota que supera la factura, retención ajustada sin motivo, ajuste sin
  permiso, anular con notas vigentes, eliminar procesado, aviso vetado por el destino (se
  deshace todo), `fechar_retencion` idempotente y con otra fecha.
- **Infraestructura (PostgreSQL real):** RLS por empresa y por cuenta de cada tabla (otra
  empresa no ve; otra empresa de la **misma cuenta sí** ve los datos fiscales del proveedor);
  **unicidad entre empresas y entre cuentas** (mismo NIT+serie+número en otra cuenta → mensaje
  genérico; anulado libera; desmarcado repetido por proveedor en otra empresa de la cuenta);
  cada `check` de 3.5 y 3.6 con un caso que lo viola; la FK de la nota con otro proveedor o
  destino; la FK compuesta del proveedor con un proveedor de otra cuenta; exclusión de
  vigencias (`23P01` mapeado); vigencia usada no se elimina; `politicas-de-los-modulos` y
  `llaves-entre-esquemas` pasan con el módulo nuevo.
- **API (`app.inject`):** permisos de cada ruta; la sección fiscal guardada con el formulario
  de Proveedores y de Empresas, su error por campo y la reversión completa; lectura de la sección
  de otra empresa sin acceso → 404.
- **Cliente:** lógica pura de `edicion-de-documento.ts` (armar líneas, mostrar totales y avisos
  que vienen del servidor), de los valores por omisión de la sección del proveedor, y QA de punta
  a punta (L3 necesita un destino: ver pregunta 9).

## 13. Riesgos

1. **Unicidad global revela existencia:** quien registra puede saber que ese documento existe
   en otra empresa o cuenta (aceptado en el plan; el mensaje no dice dónde). Un registro
   equivocado en otra cuenta bloquea al dueño legítimo sin que pueda verlo: soporte necesitará
   una consulta con superacceso por NIT+serie+número (futuro).
2. **IVA calculado ≠ IVA de la FEL** por redondeo (la FEL redondea por ítem): diferencias de
   centavos en el libro frente a los DTE de la SAT (pregunta 7; L4 lo resolverá trayendo el IVA
   del DTE).
3. **Retención fijada al registrar** mientras la ley la hace nacer al pagar o acreditar: una
   nota posterior no la corrige (decisión del usuario; riesgo anotado por el contador).
4. **Sin destino instalado** (CxP aún no existe): L3 no puede registrar en uso real hasta CP1.
5. **Operador de otra empresa** en el aviso de `empresas.empresa_guardada`: si se pasa el de
   la empresa activa en vez de la editada, la unidad de trabajo de Libro de compras no se une a
   la transacción (error de programación del §4.8); prueba específica.
6. **`btree_gist`** en producción: la migración la crea con el rol dueño; si el proveedor de
   PostgreSQL no la permite, alternativa: bloqueo del combustible + revisión en la aplicación.
7. **Totales guardados en el encabezado** deben coincidir con la suma de líneas: los calcula el
   mismo caso de uso en la misma transacción y no hay edición; una prueba de integración suma y
   compara.
8. **Contradicción documental** sobre notas y retenciones (plan y CxP dicen «ajustar», el
   usuario dijo «no cambia»): pregunta 4 antes de L3-3.

## 14. Pasos (un commit cada uno; servidor y cliente por separado)

Cada commit corre `npm run revisar` y las pruebas de su parte, y actualiza la bitácora de
`PLAN.md` y, si cambia algo acordado, `libro-de-compras.md`.

### L1 Datos fiscales (hecho, 2026-09-29)

1. **L1-1 (servidor, terceros):** migración `unique (id, cuenta_id)` en `terceros.proveedores`
   y su declaración en `proveedores.tablas.ts`.
2. **L1-2 (servidor):** `npm run generar -- modulo libro-de-compras --nombre "Libro de
   compras" --icono ReceiptText`; `dependeDe: ['terceros']`; esquema y migración 0000; sin
   permisos todavía; registro en `modulos/indice.ts`.
3. **L1-3 (servidor, core + terceros + empresas):** avisos `terceros.proveedor_guardado` y
   `empresas.empresa_guardada` (contratos), `secciones` opcional en los esquemas Zod del
   formulario de Proveedores y de Empresas, envío del aviso en sus casos de uso (registrar,
   asignar papel, actualizar; crear y editar empresa) y pruebas con un escucha falso (guardado,
   error por campo con prefijo, reversión).
4. **L1-4 (servidor, libro-de-compras):** tablas 3.1 y 3.2, migración 0001, dominio
   (`DatosFiscalesDeEmpresa`, `DatosFiscalesDeProveedor` con `porOmision`), escuchas de los dos
   avisos, rutas `GET` de lectura, pruebas de RLS y de API.
5. **L1-5 (cliente, core):** `secciones` en `DefinicionModuloCliente`, `SeccionesAportadas` en
   el formulario y la ficha de Proveedores y en el formulario de Empresas; el valor viaja en el
   cuerpo del formulario; errores por campo con prefijo.
6. **L1-6 (cliente, libro-de-compras):** módulo del cliente (sin menú aún), secciones de empresa
   y de proveedor (formulario y ficha), composables de lectura y lógica pura de los valores por
   omisión con pruebas.

### L2 Catálogos (hecho, 2026-09-29)

7. **L2-1 (servidor, hecho):** `generar -- definicion libro-de-compras/concepto-de-gasto` (catálogo,
   empresa, administración, baja `inactivar`, campos 3.3), `generar -- recurso`; ajustar el
   `check` de activo fijo; permisos; Excel; auditoría de inactivar/reactivar.
8. **L2-2 (cliente, hecho):** pantalla de Conceptos de gasto (lo generado) y menú Administración.
9. **L2-3 (servidor, hecho):** combustibles (catálogo, baja `inactivar`) y vigencias (catálogo con
   referencia a combustible, baja `eliminar`); migración con `btree_gist` y exclusión;
   `23P01` en `interpretarErrorDePostgres`; cierre de la vigencia anterior con bloqueo; reglas
   de vigencia usada (se completan en L3 cuando existan líneas: dejar la consulta `enUso` lista);
   auditoría `corregir` al cambiar la tasa.
10. **L2-4 (cliente, hecho):** Combustibles y sus vigencias (ventana del combustible con su historia de
    tasas; la nueva cierra la anterior), Excel. Las vigencias no llevan menú propio: viven dentro de Combustibles.

Notas de L2 (servidor): la exclusión de vigencias va en una migración `--custom` aparte
(`0004_l2_vigencias_sin_traslape`, con `btree_gist`), porque drizzle-kit no escribe restricciones de
exclusión; `0003_l2_combustibles` trae las dos tablas. La vigencia nueva sin fecha de cierre cierra la
abierta solo si empieza después que ella; una con cierre propio se inserta tal cual y la base rechaza el
traslape (`422 traslape`). `RepositorioVigenciasDeCombustible.enUso` devuelve hoy siempre `null`: **L3 debe
consultar `lineas_de_documento`** (fecha de emisión más reciente que usa la vigencia) y poner la FK `no action`.
La lista sugerida de conceptos de gasto (respuesta 11) **no se sembró**: queda para un paso propio.

### L3 Documentos

11. **L3-1 (servidor, hecho 2026-10-04):** tablas 3.5 a 3.7, migraciones 0006 y 0007 (esta `--custom`: la FK de la nota; la 0004 y la 0005 fueron de L2) (y `--custom` para índices
    parciales o con expresión), mensajes de los únicos, pruebas de checks, FK y unicidad entre
    empresas y cuentas.
12. **L3-2 (servidor, dominio, hecho):** cálculo de líneas, IVA repartido, IDP, motivo y período
    (funciones puras con pruebas) y la configuración de la sección 8.
13. **L3-3 (servidor, dominio, hecho 2026-10-04):** estrategias de retención con su tabla de casos límite
    (depende de las preguntas 4 y 12); `calcularRetenciones` y la variable de empresa
    `libro-de-compras.retenciones_isr.incluye_idp` (§8).
14. **L3-4 (servidor, contratos y terceros):** `libro-de-compras.contratos.ts`,
    `cuentas-por-pagar.contratos.ts` (solo `recibir_documento`), orden `terceros.completar_nit`
    atendida en `terceros` con pruebas.
15. **L3-5 (servidor):** `RegistrarDocumento`, `POST …/documentos/calcular`,
    `GET …/proveedores/:id/destino-sugerido`, `GET …/destinos` (activos), rutas y permisos,
    auditoría de retenciones ajustadas, evento; pruebas de API con un manejador falso de
    `cuentas-por-pagar.recibir_documento`.
16. **L3-6 (servidor):** listar y ficha, `AnularDocumento`, `EliminarDocumento`, órdenes
    atendidas (`fechar_retencion`, `marcar_procesado`, `anular_documento`,
    `eliminar_documento`), avisos al destino, vigencia usada (L2-3) conectada.
17. **L3-7 (cliente):** Ingreso de facturas: lista con filtros (período, proveedor, estado,
    destino) y ficha con anular y eliminar (menú Operación).
18. **L3-8 (cliente):** formulario en página: encabezado (proveedor con destino sugerido, NIT
    del DTE, casilla SAT, período), editor de líneas (concepto, bien/servicio, activo fijo,
    combustible con galones), totales y avisos que devuelve `calcular`, panel de retenciones
    (quitar o ajustar con motivo, con `v-permiso`); lógica en `edicion-de-documento.ts` con
    pruebas; ningún archivo pasa de 200 líneas ni la página de 120.

## 15. Fuera de L1 a L3

Importar DTE (L4), reportes, constancias y períodos declarados (L5), factura especial, DUCA,
no domiciliados en pantalla, moneda extranjera, localidad (establecimiento) por documento y
cuenta contable por proveedor o concepto (con Contabilidad).

## 16. Preguntas para el usuario

1. **Sección fiscal en Empresas y Proveedores:** ¿se guarda **junto con** el formulario (un
   solo botón; aviso del mediador en la misma transacción, todo o nada) o con **su propio
   botón** (más simple, pero dos guardados)? Recomendación: junto, con el aviso (sección 6).
2. **Casilla SAT desmarcada:** ¿qué tipo lleva un recibo? Recomendación: agregar el tipo
   `recibo`, permitido solo con la casilla desmarcada; las facturas desmarcadas siguen siendo
   facturas.
3. **Unicidad de desmarcados:** entiendo «mismo proveedor + tipo + serie + número», en **todas
   las empresas de la cuenta** (el proveedor es de la cuenta). ¿Correcto, o solo dentro de la
   empresa? Recomendación: en la cuenta, como está.
4. **Notas de crédito y retenciones:** el plan y *Cuentas por pagar* dicen que la nota «ajusta
   la retención en proporción»; su decisión del 2026-09-29 dice que una nota posterior **no la
   cambia**. Recomendación: las notas no llevan retenciones ni cambian las de su factura
   (bloquea L3-3).
5. **Editar un documento:** recomendación: no se edita; se elimina si sigue pendiente en el
   destino, o se anula y se registra de nuevo.
6. **Ajustar o quitar retenciones:** ¿con permiso propio `libro-de-compras.retenciones.ajustar`
   y motivo obligatorio? Recomendación: sí (separación de funciones y rastro).
7. **IVA y redondeo:** ¿se permite corregir el IVA total a mano para que cuadre con la FEL,
   hasta ±Q0.05 (repartido a la línea mayor)? Recomendación: sí, con esa tolerancia.
8. **Nombre de la orden al destino:** se corrige a `<destino>.recibir_documento` (sección 7).
   Solo confirmar.
9. **Destino antes de CP1:** Libro de compras no sirve sin un destino activo. ¿Se programa CP1
   (bandeja) inmediatamente después de L3 y la prueba de punta a punta de L3 espera a CP1?
   Recomendación: sí; y ¿Libro de compras se puede activar solo en el panel de módulos o solo
   al activar un destino? Recomendación: por ahora solo, como cualquier módulo.
10. **Proveedor sin datos fiscales** cuando la empresa es agente de retención: ¿se exige
    capturarlos antes de registrar o se usan los valores por omisión con aviso? Recomendación:
    exigirlos solo si la empresa es agente (IVA o ISR).
11. **Conceptos de gasto:** ¿se siembra una lista sugerida (p. ej. Combustibles, Insumos
    agrícolas, Alimento para ganado, Medicinas veterinarias, Reparaciones, Servicios
    profesionales, Energía eléctrica, Maquinaria y equipo como activo fijo) o empieza vacío?
    Recomendación: sembrarla al abrir el catálogo vacío.
12. **Para el contador (no bloquea L1–L2; sí L3-3):** (a) el mínimo de Q2,500 de los agentes de
    IVA ¿es «desde» o «mayor a», y sobre el total del documento? (b) la base del ISR del régimen
    opcional ¿incluye lo exento y excluye el IDP? (c) ¿se retiene IVA aunque la factura no dé
    crédito (fuera de plazo o no vinculada)? Recomendación: sí. (d) ¿el tipo de agente «otro»
    (designado por la SAT) retiene 15 %?
13. **Auditar cambios de datos fiscales** de empresa y proveedor como `corregir` (cambian
    retenciones futuras). Recomendación: sí.

## Respuestas del usuario (2026-09-29)

Mandan sobre las preguntas de la §16.

1. **Sección fiscal** en los formularios de Empresas y Proveedores: se guarda **junto con
   el formulario, todo o nada**.
2. **Tipo «Recibo»:** sí, solo con la casilla «Se muestra en reportes SAT» desmarcada.
3. **Documentos con la casilla desmarcada:** únicos **solo dentro de la empresa** (no en
   toda la cuenta).
4. **Notas de crédito y retenciones:** manda la decisión del usuario del 2026-09-29: la
   retención se **fija al registrar** y una nota posterior **no la cambia** (corregir
   «ajusta en proporción» en el plan y en Cuentas por pagar).
5. **Editar documentos:** **sí, mientras no estén en una contraseña** de Cuentas por
   pagar; al editar se recalcula todo (con auditoría).
6. **Permiso `libro-de-compras.retenciones.ajustar`** con motivo obligatorio y auditoría:
   sí.
7. **Corregir el IVA hasta ±Q0.05** para cuadrar con la FEL: sí.
8. Nombre de la orden `<destino>.recibir_documento`: se acepta (decisión técnica).
9. **Orden:** Libro de compras se puede activar solo (registro fiscal) y **Cuentas por
   pagar CP1 va justo después de L3**.
10. **Agente de retención:** se **exigen** los datos fiscales del proveedor antes de
    registrarle una factura.
11. **Conceptos de gasto sugeridos:** sí, una lista sugerida editable al activar el
    módulo (como los conceptos de Bancos).
12. Preguntas para el contador: pendientes.
13. **Auditar cambios de datos fiscales** (régimen, agente de retención) de empresas y
    proveedores: sí.

