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
omisión (general, utilidades, agente de ISR, agente de IVA ninguno).

| Columna | Tipo | Nulo | Por omisión / regla |
|---|---|---|---|
| `empresa_id` | uuid | no | **PK**; FK `core.empresas(id)` cascade |
| `regimen_iva` | text | no | `'general'`; check `in ('general','pequeno_contribuyente')` |
| `regimen_isr` | text | no | `'utilidades'`; check `in ('utilidades','opcional_simplificado')` |
| `agente_de_retencion_iva` | text | no | `'ninguno'`; check `in ('ninguno','exportador','contribuyente_especial','sector_publico','otro')` |
| `es_agente_de_retencion_isr` | boolean | no | **`true`** (decisión del usuario 2026-10-04: por ley retiene quien lleva contabilidad completa; el cambio se audita como `corregir`) |

Checks: `datos_fiscales_de_empresa_pequeno_no_retiene`: `regimen_iva <> 'pequeno_contribuyente'
or agente_de_retencion_iva = 'ninguno'`. RLS: `politicaPorEmpresa()`.

`otro` = designado por la SAT o con contabilidad completa (validación del contador, 15 %); ver
pregunta 12. El NIT de la empresa **no** se copia aquí: sigue en `core.empresas` y L3 lo exige.

> **R1 (2026-10-05):** esta tabla pasa a ser un **historial con vigencia por período** (seis regímenes de IVA,
> `exento` en el ISR, tipo de persona). Manda la §3.1b; lo de arriba queda como estaba en L1.

### 3.1b Régimen de la empresa con vigencia (R1) — arquitecto de datos, 2026-10-05

Estado: **propuesta para aprobar**. Aterriza las decisiones 1 a 8 del usuario (2026-10-05) de «Libro de compras
según el régimen de la empresa» en `validacion-h7-h11-retenciones.md`. Las decisiones 5 (libro simplificado, L5),
6 (prorrata, después de L5) y 7 (compras a proveedores agropecuarios, primario y pecuario y pequeño contribuyente
electrónico, paso propio) **no** entran en R1; R1 solo deja el dato que necesitan (la foto del régimen).

**Respuestas del usuario (2026-10-05), las recomendadas:** R1-a la primera vigencia vale «desde el inicio»; R1-b se
exigen los datos fiscales de la empresa antes de su primer documento (sin suponer régimen general; el error lleva a la
sección fiscal de la empresa); R1-c/R1-d una vigencia se corrige o se quita libremente si no tiene documentos vigentes
(los anulados no bloquean), con auditoría; R1-f el tipo de persona es obligatorio y sin valor por omisión, guardado en
cada vigencia e igual en todas.

**R1-e resuelto (contador y usuario, 2026-10-05). Esta tabla reemplaza la de §3.1b.6:**

| Régimen de IVA | Persona | `regimen_isr` | Agente de IVA | Agente de ISR |
|---|---|---|---|---|
| `general` | jurídica | `utilidades` (o `opcional_simplificado`, o `exento` si es entidad del art. 11) | `ninguno` (el usuario escoge si la SAT lo calificó) | `true` |
| `general` | individual | `utilidades` (o `opcional_simplificado`; nunca `exento`) | `ninguno` (escoge) | con `utilidades` `true`; con `opcional_simplificado` **sin propuesta**: el usuario contesta «¿Lleva contabilidad completa?» |
| `pequeno_contribuyente` | jurídica | nulo, forzado | `ninguno`, forzado | `true` |
| `pequeno_contribuyente` | individual | nulo, forzado | `ninguno`, forzado | `false` (ayuda: comerciante con activo > Q25,000 → sí) |
| `pequeno_contribuyente_electronico` | jurídica | nulo, forzado | `ninguno`, forzado | `true`; **solo vigencias anteriores a su derogación** por el Decreto 31-2024 (`FECHA_DE_DEROGACION_REGIMENES_DECRETO_7_2019`, 2025-07-09, confirmar en el texto oficial): una vigencia nueva posterior se rechaza en el dominio |
| `pequeno_contribuyente_electronico` | individual | nulo, forzado | `ninguno`, forzado | `false` (ayuda: comerciante con activo > Q25,000 → sí); mismo límite de derogación que la fila anterior |
| `contribuyente_agropecuario` | individual (jurídica la rechaza el check) | nulo, forzado (relevado del ISR) | `ninguno`, forzado | `false`; **solo vigencias anteriores a su derogación** por el Decreto 31-2024 (2025-07-09, confirmar fecha): una vigencia nueva posterior se rechaza en el dominio |
| `primario_pecuario` | jurídica | nulo, forzado | `ninguno`, forzado | `true` (confirmar AG 54-2026) |
| `primario_pecuario` | individual | nulo, forzado | `ninguno`, forzado | `false` (ayuda: intermediario con contabilidad → sí) |
| `no_afiliado` | jurídica | `exento` (o `utilidades`/`opcional_simplificado` si tiene rentas lucrativas) | `ninguno`, forzado | `true` (art. 47) |
| `no_afiliado` | individual (permitido) | sin propuesta (`utilidades` u `opcional_simplificado`; nunca `exento`) | `ninguno`, forzado | `false` |

Cambios de datos: check nuevo `exento_solo_juridica` (`regimen_isr is distinct from 'exento' or tipo_de_persona =
'juridica'`); sin check de persona en `primario_pecuario` (admite individuales y jurídicas); `agropecuario_individual` se
queda. Firma `datosPropuestos(regimenIva, tipoDePersona, regimenIsr)`, que puede devolver «sin propuesta» en el agente
de ISR. El 5 % sobre utilidad del agropecuario es IVA en régimen especial, no ISR. Confirmar en el texto oficial: la
derogación de los arts. 54 «A» a «F» (artículo y fecha), el AG 54-2026 y los arts. 11 y 47 del Decreto 10-2012.

#### 3.1b.1 Lo encontrado

1. `datos_fiscales_de_empresa` tiene PK `empresa_id` (una fila por empresa), `regimen_isr` no nulo, dos regímenes de
   IVA y el check `pequeno_no_retiene`. En desarrollo hay **una** fila y **ningún** documento (consulta de solo
   lectura del 2026-10-05). `btree_gist` ya está instalada (migración `0004`).
2. La fila se guarda con un *upsert* desde el aviso `empresas.empresa_guardada` (`composicion/datos-fiscales.ts` →
   `GuardarDatosFiscalesDeEmpresa`), con la empresa editada como empresa del operador; un cambio se audita como
   `corregir` con `registroId = empresaId`. Sin fila valen `DatosFiscalesDeEmpresa.porOmision()`.
3. `CargadorDeContextoFiscal` lee los datos de la empresa **de hoy** (no del período del documento), antes de
   conocer el período; `resolverDatosFiscalesDelProveedor` y las estrategias de retención los usan. Ese es el hueco
   que encontró el contador, junto con `determinarMotivoSinCredito`, que no mira la empresa.
4. `AccionAuditada` no tiene «crear»: los cambios de datos fiscales se auditan como `corregir` (decisión 13) y una
   baja como `eliminar`.

#### 3.1b.2 Decisiones

| Tema | Decisión | Por qué |
|---|---|---|
| Tabla | **Se convierte** `datos_fiscales_de_empresa` en el historial (cada fila = una vigencia), sin cambiar su nombre | Es el mismo dato con una dimensión más. Conserva el recurso de auditoría `libro-de-compras.datos-fiscales-de-empresa`, la RLS, la escucha del mediador, el repositorio y la FK. Una tabla nueva dejaría la vieja muerta o pediría copiar y borrar, sin ganar nada (no hay producción). |
| Forma de la vigencia | Solo `vigente_desde` (**escalones**): cada fila rige desde su mes hasta el mes anterior a la siguiente. Sin `vigente_hasta` | Una empresa **siempre** tiene un régimen: no puede haber huecos. Con escalones, traslapes y huecos son imposibles por construcción; con `vigente_hasta` habría que impedir las dos cosas y cerrar la anterior en cada alta (como en combustibles, donde un hueco sí tiene sentido: no hay tasa). |
| Sin traslape | `unique nulls not distinct (empresa_id, vigente_desde)`, **no** exclusión con `btree_gist` | Con escalones basta que dos filas no empiecen el mismo mes. La exclusión solo sirve con rangos explícitos; aquí sería una restricción más cara que no protege nada adicional. |
| Primera fila | `vigente_desde` **nulo = «desde el inicio»** (la fila base). Las demás, el primer día de un mes | Un documento de un período anterior a cualquier fecha que se escoja (rectificaciones, carga atrasada) siempre encuentra régimen, sin fechas ficticias (`1900-01-01`) ni la regla implícita «la primera cubre hacia atrás». `nulls not distinct` (PG 15+) impide dos bases. Ver pregunta R1-a. |
| Fila actual | Se vuelve la **base** (`vigente_desde = null`) con `tipo_de_persona = 'juridica'` | Decisión 8: no hay nada instalado; la de desarrollo es de prueba. |
| Qué datos tienen historia | `regimen_iva`, `regimen_isr`, `agente_de_retencion_iva`, `es_agente_de_retencion_isr` y `tipo_de_persona` | Pedido del usuario. El tipo de persona no cambia con el tiempo (otro tipo es otro NIT): vive en cada fila (lo necesita el check del agropecuario) pero el dominio lo mantiene **igual en todas** las filas de la empresa; ver 3.1b.5. |
| Foto en el documento | `documentos.regimen_iva_de_la_empresa`, copiada al registrar | Decisión 4. No se pone FK del documento a la vigencia: al partir un escalón en dos con los mismos datos, la FK apuntaría a una fila que ya no cubre su período; la foto más la regla de «vigencia en uso» bastan. Solo se copia el régimen de IVA: las retenciones ya quedan fijas en `retenciones` y el ISR solo cambia avisos. |
| Sin datos guardados | El documento **exige** datos fiscales guardados de la empresa (error `empresa_sin_datos_fiscales`, con enlace al formulario de Empresas), como ya exige el NIT | Suponer «general» fue el hueco que encontró el contador: en una empresa sin crédito el IVA salía como crédito. Además, sin fila no hay qué bloquear contra un cambio simultáneo. Ver pregunta R1-b. `porOmision()` queda solo para mostrar el formulario vacío. |

#### 3.1b.3 Tabla `libro_de_compras.datos_fiscales_de_empresa` (nueva forma)

| Columna | Tipo | Nulo | Por omisión / regla |
|---|---|---|---|
| `id` | uuid | no | **PK** nueva (`idPrimario()`, `gen_random_uuid()`) |
| `empresa_id` | uuid | no | FK `core.empresas(id)` on delete cascade (deja de ser la PK) |
| `vigente_desde` | date | **sí** | `null` = desde el inicio (una sola por empresa); si no, primer día de un mes |
| `tipo_de_persona` | text | no | **sin** valor por omisión en la base: lo manda siempre el dominio |
| `regimen_iva` | text | no | `'general'` |
| `regimen_isr` | text | **sí** | `'utilidades'` (se queda: con el régimen por omisión, `general`, es coherente; con otro régimen el check obliga a mandarlo nulo) |
| `agente_de_retencion_iva` | text | no | `'ninguno'` |
| `es_agente_de_retencion_isr` | boolean | no | `true` (B2) |
| `creado_en`, `actualizado_en`, `creado_por`, `actualizado_por` | | | `...marcasDeTiempo`, `...autoria` |

Restricciones (nombres `datos_fiscales_de_empresa_<regla>`):

| Nombre | Expresión | Estado |
|---|---|---|
| `regimen_iva` | `regimen_iva in ('general', 'pequeno_contribuyente', 'pequeno_contribuyente_electronico', 'contribuyente_agropecuario', 'primario_pecuario', 'no_afiliado')` | se reemplaza |
| `regimen_isr` | `regimen_isr is null or regimen_isr in ('utilidades', 'opcional_simplificado', 'exento')` | se reemplaza |
| `regimen_isr_segun_iva` | `(regimen_iva in ('general', 'no_afiliado')) = (regimen_isr is not null)` | nueva: «no aplica» (nulo) fuera de general y no afiliado, y obligatorio en esos dos |
| `agente_de_iva` | igual que hoy (cinco valores) | se queda |
| `agente_de_iva_solo_general` | `regimen_iva = 'general' or agente_de_retencion_iva = 'ninguno'` | **reemplaza** `pequeno_no_retiene` (cooperativa, contribuyente especial y exportador son régimen general) |
| `tipo_de_persona` | `tipo_de_persona in ('individual', 'juridica')` | nueva |
| `agropecuario_individual` | `regimen_iva <> 'contribuyente_agropecuario' or tipo_de_persona = 'individual'` | nueva (Decreto 7-2019) |
| `vigente_desde_primer_dia` | `vigente_desde is null or extract(day from vigente_desde) = 1` | nueva |
| `vigencia_unica` | `unique nulls not distinct (empresa_id, vigente_desde)` | nueva; también es el índice de la FK de `empresa_id` (empieza por ella) |

El agente de ISR no lleva check: lo decide el usuario (la propuesta está en 3.1b.6). Que la base exista cuando hay
más filas lo garantiza el dominio (la base nunca se elimina); no hay forma de escribirlo como check. El `23505` de
`vigencia_unica` se agrega a `MENSAJES_POR_RESTRICCION`: «Ya hay un régimen registrado desde ese mes.»

RLS: `politicaPorEmpresa()` (sin cambio). Toda escritura llega por la escucha de `empresas.empresa_guardada` (operador
con la empresa editada) o por la ruta de quitar una vigencia (ejecutor en la empresa pedida, como la lectura).

#### 3.1b.4 Leer «el régimen vigente en el período X»

```sql
select * from libro_de_compras.datos_fiscales_de_empresa
where empresa_id = $empresa and (vigente_desde is null or vigente_desde <= $periodo)
order by vigente_desde desc nulls last
limit 1;
```

Con RLS y dentro de la unidad de trabajo. Hay pocas filas por empresa (una por cambio de régimen), así que el
único `(empresa_id, vigente_desde)` alcanza; no hace falta otro índice. Lo «vigente hoy» es el período del mes de
hoy según el reloj de la empresa (`Reloj.hoy(operador)`). Para mostrar el historial, el repositorio deriva el fin de
cada escalón con `lead(vigente_desde) over (partition by empresa_id order by vigente_desde nulls first)`. No se crea
vista: una vista corre con los permisos de su dueño salvo `security_invoker`, y no la necesita nadie fuera del
repositorio.

En el dominio: `HistorialFiscalDeEmpresa` (función pura, sin Vue ni base) con `vigenteEn(periodo)`,
`aplicar(cambio)` y `rangosAfectados(antes, despues)`; con pruebas.

#### 3.1b.5 Cómo edita el usuario (formulario de Empresas)

La sección `secciones['libro-de-compras']` agrega dos campos: `tipoDePersona` y **`vigenteDesde`** (`'aaaa-mm-01'`
o `null` = desde el inicio). Su significado es uno solo: **«estos datos rigen desde `vigenteDesde` hasta la
siguiente vigencia que ya exista»**. El servidor decide el caso comparando con el historial:

| # | Caso | Qué hace el servidor | Auditoría |
|---|---|---|---|
| 1 | Primera vez (sin filas) | Inserta la base (`vigente_desde = null`), sea cual sea `vigenteDesde` | Ninguna: es un alta y ningún documento pudo usar otra cosa (se exige la fila, 3.1b.2) |
| 2 | Mismos datos que la vigencia que ya rige en `vigenteDesde` | Nada (guardar la empresa por otra razón no toca la historia) | Ninguna |
| 3 | `vigenteDesde` coincide con una fila (`null` = la base) y los datos cambian: **corregir** | `update` de esa fila | `corregir`, `anterior` = historial antes del cambio |
| 4 | `vigenteDesde` cae dentro de un escalón y los datos cambian: **cambió a partir de ese mes** | `insert` de una fila nueva desde ese mes | `corregir`, `anterior` = historial antes del cambio |
| 5 | Fila nueva igual a la que la precede | Nada (no se crean escalones repetidos) | Ninguna |
| 6 | Cambia solo `tipoDePersona` | `update` de **todas** las filas de la empresa (no cambia ningún documento: la foto es el régimen de IVA) | `corregir`, `anterior` = historial |
| 7 | **Quitar** una vigencia (no la base) desde la ficha: `DELETE /api/libro-de-compras/empresas/:empresaId/datos-fiscales/vigencias/:id` (permiso `empresas.editar`) | `delete`; su escalón pasa a la vigencia anterior | `eliminar`, `anterior` = la fila quitada y el historial (pregunta R1-c) |

- **Auditoría:** `recurso = 'libro-de-compras.datos-fiscales-de-empresa'`, `registroId = empresaId` (como hoy), una
  entrada por guardado. Guardar el historial completo en `anterior` es barato (pocas filas) y deja reconstruir
  cualquier estado; lo nuevo es lo que queda en la tabla.
- **Una vigencia usada no cambia.** Toda escritura (casos 3, 4, 6 y 7) calcula con `rangosAfectados` los períodos
  donde cambia **alguno de los cuatro datos fiscales** (`regimen_iva`, `regimen_isr`, `agente_de_retencion_iva`,
  `es_agente_de_retencion_isr`; el tipo de persona no cuenta) y, si hay un documento **vigente** con `periodo` en
  esos rangos, rechaza con `VigenciaFiscalEnUso` (subclase de `RecursoEnUso`, código `vigencia_fiscal_en_uso`, 409,
  `detalles: { campo: 'secciones.libro-de-compras.vigenteDesde', periodo }` con el primer período con documentos y el
  mensaje «Hay documentos registrados en <mes> con el régimen anterior: escoja un mes posterior o anúlelos»). Así:
  - partir un escalón en dos con los mismos datos se permite aunque tenga documentos (no cambia nada para ellos);
  - un cambio «a partir de noviembre» se permite con documentos de octubre;
  - corregir la base con documentos registrados no se permite: hay que registrar el cambio a partir del mes que
    corresponde.
  Los documentos **anulados** no cuentan (como en las vigencias de combustible, y por la decisión 8: lo registrado en
  pruebas se anula); su foto queda como estaba (pregunta R1-d). La consulta es `exists` sobre
  `documentos (empresa_id, periodo)` con `estado = 'vigente'` y la cubre `documentos_libro_idx`.
- **Concurrencia:** guardar empieza con `select … from datos_fiscales_de_empresa where empresa_id = $1 for update`
  (todas las filas de la empresa), luego revisa documentos y escribe. Registrar un documento empieza con el mismo
  `select … for share` y **después**, en otra sentencia, lee la vigencia del período: si un guardado estaba en curso,
  el `for share` espera, y la lectura siguiente (otra foto en `read committed`) ya ve la historia nueva; si el
  documento llegó primero, el guardado espera y luego ve el documento y rechaza. `for share` exige permiso de `update`,
  que `arrancar_app` tiene sobre las tablas del módulo.
- **`vigenteDesde`:** primer día de un mes, no antes de `2000-01-01` y como máximo doce meses después del mes actual
  (atrapa errores de tecleo y deja programar un cambio anunciado). Si no llega, vale el `vigente_desde` de la
  vigencia de hoy (caso 3 o 2): así un cliente que no lo mande nunca crea escalones por accidente.
- **Validación** con el mismo `problemasFiscalesDeEmpresa` del dominio (errores por campo bajo
  `secciones.libro-de-compras.<campo>`), que ahora también revisa las reglas de 3.1b.3.
- **Lectura** (`GET /api/libro-de-compras/empresas/:empresaId/datos-fiscales`, `empresas.ver`): el DTO trae los datos
  de la vigencia de hoy y su `vigenteDesde`, `guardado` y `historial: [{ id, vigenteDesde, vigenteHasta (último mes
  incluido o null), tipoDePersona, regimenIva, regimenIsr, agenteDeRetencionIva, esAgenteDeRetencionIsr,
  conDocumentos }]` ordenado del más antiguo al más nuevo. `conDocumentos` sirve para mostrar u ocultar «Quitar» y
  para que el formulario proponga el mes.

#### 3.1b.6 Valores que se proponen según el régimen y el tipo de persona

Función pura del dominio `datosPropuestos(regimenIva, tipoDePersona)` (servidor) y su copia en
`composables/datos-fiscales-de-empresa.ts` (cliente), las dos con pruebas, como `retencionesPropuestas` del
proveedor. **Proponen y no imponen:** el cliente los aplica al cambiar el régimen o el tipo de persona; el esquema
Zod los usa para completar lo que no llegue; la base solo revisa la coherencia (no puede tener un valor por omisión
que dependa de otra columna). Lo que exige la ley lo rechazan los checks y `problemasFiscalesDeEmpresa`; lo que el
usuario puede decidir, no.

| Régimen de IVA | `regimen_isr` | `agente_de_retencion_iva` | `es_agente_de_retencion_isr` (jurídica / individual) |
|---|---|---|---|
| `general` | `utilidades` (también `opcional_simplificado` o `exento`) | `ninguno` (el usuario escoge si la SAT lo calificó) | `true` / `true` (pregunta R1-e) |
| `pequeno_contribuyente` | nulo, forzado | `ninguno`, forzado | `true` / `false` |
| `pequeno_contribuyente_electronico` | nulo, forzado | `ninguno`, forzado | `true` / `false` |
| `contribuyente_agropecuario` | nulo, forzado | `ninguno`, forzado | no aplica (la jurídica la rechaza el check) / `false` |
| `primario_pecuario` | nulo, forzado | `ninguno`, forzado | `true` / `false` (pregunta R1-e) |
| `no_afiliado` | `exento` (también `utilidades` u `opcional_simplificado`) | `ninguno`, forzado | `true` / `true` (art. 47 las nombra) |

Al cambiar el régimen fuera de general, el cliente quita el agente de IVA y el régimen de ISR (como hoy hace
`conRegimenDeIva`); desmarcar el agente de ISR sigue mostrando el aviso de B2.

#### 3.1b.7 Cambios en `libro_de_compras.documentos`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `regimen_iva_de_la_empresa` | text | no | **sin** valor por omisión: la copia el caso de uso, de la vigencia del `periodo` del documento (también en recibos, fuera del libro y notas); check `documentos_regimen_de_la_empresa_valido` con los seis valores |

Checks (todos con `coalesce`: un check con `null` pasa, y `motivo_sin_credito` es nulo casi siempre):

| Nombre | Expresión | Estado |
|---|---|---|
| `motivo_sin_credito_valido` | lista con **`'empresa_sin_credito'`** agregado | se reemplaza |
| `iva_no_acreditable_por_motivo` | `(motivo in ('fuera_de_plazo','no_vinculado','empresa_sin_credito') and iva_no_acreditable = iva) or (coalesce(motivo,'') not in ('fuera_de_plazo','no_vinculado','empresa_sin_credito') and iva_no_acreditable = 0)` | se reemplaza |
| `empresa_sin_credito` | `not muestra_en_reportes_sat or iva = 0 or regimen_iva_de_la_empresa = 'general' or coalesce(motivo_sin_credito,'') = 'empresa_sin_credito'` | **nueva**: con IVA, en un período sin crédito, el motivo es obligatorio |
| `empresa_sin_credito_real` | `tipo = 'nota_de_credito' or coalesce(motivo_sin_credito,'') <> 'empresa_sin_credito' or regimen_iva_de_la_empresa <> 'general'` | **nueva**: el motivo solo en períodos sin crédito, salvo la nota, que lo hereda de una factura de un período sin crédito aunque ella caiga en uno general |
| `sin_credito_sin_art_20` | `tipo = 'nota_de_credito' or regimen_iva_de_la_empresa = 'general' or coalesce(motivo_sin_credito,'') not in ('fuera_de_plazo','no_vinculado')` | **nueva** (decisión 1: en empresas sin crédito no se evalúan `no_vinculado` ni el art. 20) |

Por qué el check obligatorio es seguro en todos los casos:
- **Fuera del libro y recibos:** `not muestra_en_reportes_sat` los deja pasar, y `sin_sat_sin_credito` ya les exige
  `iva = 0` y motivo nulo.
- **Factura de pequeño contribuyente:** `iva = 0` la deja pasar y conserva `pequeno_contribuyente`, que exige
  `documentos_pequeno_contribuyente` (sin cambio).
- **Nota de crédito** (su `periodo` es el mes de recepción): si su período no da crédito y lleva IVA, debe llevar
  `empresa_sin_credito` aunque su factura haya dado crédito (decisión 4, con aviso); si su período da crédito, hereda
  el motivo de la factura, y `empresa_sin_credito_real` la excluye para que pueda heredarlo.
- **Factura con IVA cero en una empresa sin crédito** (todo exento, o solo IDP y exento): el check la deja pasar, pero
  el dominio igual le pone `empresa_sin_credito` (3.1b.8), así `plazo_del_credito` tampoco la exige fuera de plazo.

**Checks del art. 20 revisados:** `plazo_del_credito` pasa con cualquier motivo no nulo, así que
`empresa_sin_credito` lo cumple sin evaluar el plazo (correcto: no hay crédito que perder); `fuera_de_plazo_real` y
`nota_en_su_mes` no cambian; `sin_credito_sin_art_20` impide que el dominio produzca por error `fuera_de_plazo` o
`no_vinculado` en un período sin crédito. `exento_sin_iva`, `sin_sat_sin_credito` y `pequeno_contribuyente` siguen
iguales.

Líneas: no cambian; con `empresa_sin_credito`, cada línea lleva `iva_no_acreditable = iva` (el IVA al costo de cada
línea, §3.6). Si en el futuro se edita un documento (respuesta 5 del 2026-09-29) y cambia su período, la foto se
vuelve a copiar con el mismo bloqueo.

#### 3.1b.8 Dominio y caso de uso de documentos

- `determinarMotivoSinCredito` recibe `regimenDeLaEmpresa` (del período). Orden nuevo: desmarcado → nulo;
  `factura_pequeno_contribuyente` → `pequeno_contribuyente`; nota → `empresa_sin_credito` si su período no da crédito
  y tiene IVA (aviso «La factura dio crédito y esta nota cae en un período sin crédito: …» si la factura no tenía
  motivo), si no, el de su factura tal cual; régimen sin crédito → `empresa_sin_credito` (aunque el IVA sea cero);
  luego `exento`, `no_vinculado` y `fuera_de_plazo` como hoy. «Da crédito» = `regimen_iva === 'general'` en una sola
  función (`daCreditoFiscal`).
- Avisos (decisión 1): sin aviso de fuera de plazo ni de «tendrá que rectificar» en empresas sin crédito; en empresas
  sin ISR sobre utilidades los de deducibilidad dicen solo la parte contable; el de factura especial queda siempre.
- `CargadorDeContextoFiscal`: calcula primero el período y después lee la vigencia de ese período (no la de hoy);
  al registrar, antes, el `for share` de 3.1b.5. Sin fila → `EmpresaSinDatosFiscales` (422,
  `empresa_sin_datos_fiscales`, con enlace como `EmpresaSinNit`). `calcular` (vista previa) lee igual, sin bloquear.
- `RegistrarDocumento` copia `regimen_iva_de_la_empresa`; el DTO de la ficha y de la lista lo devuelve (L5 lo usará
  para el libro simplificado).

#### 3.1b.9 Migraciones

Dos, generadas con `npm run bd:generar -w servidor -- libro-de-compras <nombre>` (sin `--custom`: drizzle-kit
escribe checks, `unique … nulls not distinct` y columnas) y **revisadas a mano antes de aplicarlas por primera vez**
(precedente: la `0009` lleva `update` agregados), porque drizzle-kit agrega columnas `not null` sin llenarlas y puede
escribir mal el cambio de PK. Cada una, en su paso:

1. **`0011_r1_regimen_de_empresa_con_vigencia`** (paso R1-1), en este orden:
   `drop constraint "datos_fiscales_de_empresa_pkey"`; `add column "id" uuid default gen_random_uuid() not null` y
   `add primary key ("id")`; `add column "vigente_desde" date` (la fila actual queda nula: es la base);
   `add column "tipo_de_persona" text`, `update … set "tipo_de_persona" = 'juridica'`, `set not null`;
   `alter column "regimen_isr" drop not null`; `drop constraint` de `pequeno_no_retiene`, `regimen_iva` y
   `regimen_isr`; `add constraint` de las de 3.1b.3 (incluido `vigencia_unica`). La FK a `core.empresas` se queda.
2. **`0012_r1_foto_del_regimen_en_documentos`** (paso R1-4): `add column "regimen_iva_de_la_empresa" text`;
   `update documentos d set … = (vigencia del período de d, con la consulta de 3.1b.4 y 'general' si la empresa no
   tiene filas)` (en desarrollo no hay documentos; la sentencia queda para cualquier otra base de desarrollo con
   documentos de prueba); `set not null`; `drop`/`add` de `motivo_sin_credito_valido` e
   `iva_no_acreditable_por_motivo`; `add` de los cuatro checks nuevos de 3.1b.7.

El `when` de cada entrada del `_journal.json` debe ser mayor que el de `0010` (`1791225580111`); drizzle-kit usa
`Date.now()` y ya lo es, pero se revisa al generar. Los `meta/*_snapshot.json` deben quedar iguales a las tablas
(volver a correr `bd:generar` no debe proponer nada). Ninguna migración de permisos: no hay permisos nuevos
(`empresas.ver` y `empresas.editar` ya existen).

#### 3.1b.10 Pruebas de integración (PostgreSQL real)

- **Checks de `datos_fiscales_de_empresa`**, un caso que viola cada uno: agente de IVA en `pequeno_contribuyente` y en
  `no_afiliado`; `regimen_isr` nulo en `general` y no nulo en `primario_pecuario`; `exento` válido en `no_afiliado`;
  agropecuario jurídica; `vigente_desde` el día 2; dos bases de la misma empresa y dos filas del mismo mes (`23505`
  con su mensaje); la base de **otra** empresa no choca.
- **Lectura por período:** solo base (cualquier período); base y noviembre (octubre → base, noviembre y diciembre →
  noviembre); cambio programado a futuro.
- **RLS:** otra empresa no ve ni inserta (`with check`), también por la escucha del mediador con el operador de la
  empresa editada (riesgo 5 de §13).
- **Checks de `documentos`:** sin `regimen_iva_de_la_empresa` (`23502`) y con un valor inválido; factura con IVA en
  período sin crédito sin motivo; `empresa_sin_credito` en una factura de período general; nota con
  `empresa_sin_credito` en período general (pasa); `iva_no_acreditable` distinto del IVA con `empresa_sin_credito`;
  factura de pequeño contribuyente en empresa sin crédito (pasa con `pequeno_contribuyente`); desmarcado en empresa
  sin crédito (pasa con motivo nulo); `fuera_de_plazo` y `no_vinculado` en período sin crédito (fallan); factura sin
  crédito fuera de plazo con `empresa_sin_credito` (pasa `plazo_del_credito`).
- **Casos de uso con base real (API con `app.inject`):** los siete casos de 3.1b.5 con su auditoría; vigencia en uso
  (corregir la base con un documento vigente → 409; con el documento anulado → pasa; partir un escalón igual → pasa;
  quitar una vigencia con documentos en su escalón y datos distintos de la anterior → 409); la base no se quita;
  registrar sin datos fiscales → `empresa_sin_datos_fiscales`; el documento copia el régimen de **su período**, no el
  de hoy; la nota en período sin crédito de una factura con crédito lleva `empresa_sin_credito` y su aviso.
- **Concurrencia** (opcional, con dos conexiones): un guardado que espera al `for share` de un registro en curso y
  luego rechaza.
- `politicas-de-los-modulos` y `llaves-entre-esquemas` siguen pasando; las semillas de prueba de documentos
  (`documentos.soporte.ts`) agregan la columna nueva y una vigencia.

#### 3.1b.11 Pasos (un commit cada uno; servidor y cliente por separado)

Cada commit corre `npm run revisar` y sus pruebas y actualiza la bitácora de `PLAN.md`.

1. **R1-1 (servidor, datos) — HECHO (2026-10-18):** tabla de 3.1b.3 en `datos-fiscales.tablas.ts`, migración `0011`; dominio:
   `DatosFiscalesDeEmpresa` con `tipoDePersona` y los seis regímenes, `problemasFiscalesDeEmpresa` con las reglas
   nuevas, `datosPropuestos` (3.1b.6) y `HistorialFiscalDeEmpresa` (`vigenteEn`, `aplicar`, `rangosAfectados`) con
   pruebas puras; repositorio (`historial`, `vigenteEn`, `bloquear(modo)`, `insertar`, `actualizar`,
   `actualizarTipoDePersona`, `eliminar`); mensaje del `23505`; pruebas de checks, lectura y RLS. El caso de uso
   de guardar se adapta lo mínimo para seguir funcionando (corrige la vigencia de hoy).
   Hecho: migración `0012_r1_regimen_de_empresa_con_vigencia` (a mano, para cambiar la llave primaria; la `0011` es la
   de R1-3); `HistorialFiscalDeEmpresa` guarda también el id de cada vigencia y el repositorio escribe las
   diferencias (`diferenciasCon`: eliminar, actualizar, insertar), por eso no hay `actualizarTipoDePersona`: el tipo
   de persona va en cada vigencia. Dos escalones seguidos con los mismos datos se juntan siempre (también al corregir
   o quitar). `DatosFiscalesDeEmpresa.porOmision()` queda solo como punto de partida de las pruebas; la empresa sin
   filas no tiene datos. La derogación del régimen agropecuario (`FECHA_DE_DEROGACION_REGIMENES_DECRETO_7_2019`, 2025-07-09,
   por confirmar en el Decreto 31-2024) se revisa con la fecha pedida, también en el alta.
2. **R1-2 (servidor, guardar y leer) — HECHO (2026-10-18):** `GuardarDatosFiscalesDeEmpresa` con los siete casos, `vigenteDesde` y
   `tipoDePersona` en `esquemaSeccionFiscalDeEmpresa` (completando con `datosPropuestos`), `VigenciaFiscalEnUso`
   (consulta de documentos vigentes por rango), bloqueo `for update`, auditoría; DTO con historial y `conDocumentos`;
   ruta `DELETE …/datos-fiscales/vigencias/:id` (si se aprueba R1-c); pruebas de API.
   Hecho: la ruta es `DELETE /api/libro-de-compras/empresas/:empresaId/datos-fiscales/vigencias/:vigenciaId`
   (`empresas.editar`, 204). Sin datos guardados, registrar y calcular responden 422 `empresa_sin_datos_fiscales`
   (`detalles.seccion`); el cargador lee la vigencia del período del documento (sin `for share` ni foto: R1-4).
   Las bajas leen el crédito del período del documento. El tipo de persona es obligatorio en la sección.
3. **R1-3 (servidor, dominio de documentos) — HECHO (2026-10-05):** `daCreditoFiscal` y `tieneIsrSobreUtilidades`, motivo
   `empresa_sin_credito` y su orden, regla de la nota, avisos de la decisión 1; pruebas puras. Se adelantó la parte de
   la migración que solo amplía los checks de `motivo_sin_credito` e `iva_no_acreditable_por_motivo` (migración
   `r1_motivo_empresa_sin_credito`, que tomó el número `0011` en esa rama: quien integre debe renumerar la de R1-1
   y la de R1-4 y quitar de esta última esos dos checks, que ya existen). Se conectó el calendario de feriados del
   core (`CalendarioDeFeriados`, que precarga los años de las fechas y el siguiente) y se quitó del aviso de entero el
   texto «o vence en los próximos días si hubo feriados». El caso de uso toma `daCreditoFiscal()` de los datos de hoy
   de la empresa (también las bajas); R1-4 lo cambia por la vigencia del período del documento.
4. **R1-4 (servidor, documentos) — HECHO (2026-10-18):** columna y checks de 3.1b.7, migración `0013`; el cargador lee la vigencia del
   período con `for share`, `EmpresaSinDatosFiscales`, copia de la foto, DTO; pruebas de checks y de API de 3.1b.10.
   Una nota de un período sin crédito con IVA lleva siempre `empresa_sin_credito` (también si su factura traía otro motivo).
5. **R1-5 (cliente, sección de Empresa) — HECHO (2026-10-18):** tipo de persona (obligatorio la primera vez, pregunta R1-f), los seis
   regímenes, ISR con «No aplica» y «Exento», agente de IVA deshabilitado fuera de general, propuestas al cambiar
   régimen o tipo de persona (lógica pura con pruebas), y «¿Desde cuándo?» al cambiar un dato fiscal: «Corregir lo
   registrado (desde <mes>)» o «Cambió a partir de [mes]» (propone el mes siguiente al último con documentos);
   errores por campo, incluido `vigenteDesde`.
6. **R1-6 (cliente, ficha de Empresa) — HECHO (2026-10-18; los textos de `empresa_sin_credito` quedan para L3-8):** historial de vigencias (desde, hasta, régimen) y «Quitar» con confirmación en
   las que se pueden quitar; textos del motivo `empresa_sin_credito` para la lista y la ficha de documentos (L3-7 y
   L3-8 los usarán).
7. **R1-7 (QA):** de punta a punta: cambiar el régimen a partir de un mes, registrar una factura en cada lado del
   cambio y ver el IVA al costo en el período sin crédito.

#### 3.1b.12 Preguntas para el usuario (con recomendación)

- **R1-a. Primera vigencia:** ¿«desde el inicio» (nula; cubre cualquier período anterior) o un mes que el usuario
  escoge, y antes de él no se puede registrar? Recomendación: desde el inicio.
- **R1-b. Sin datos fiscales guardados:** ¿se exige guardarlos (en el formulario de Empresas) antes del primer
  documento, o se sigue suponiendo régimen general? Recomendación: exigirlos (el supuesto fue el hueco encontrado).
- **R1-c. Quitar una vigencia** (un cambio programado o registrado por error), sin documentos afectados, desde la
  ficha de la empresa. Recomendación: sí; sin esto, un error solo se tapa con otra vigencia.
- **R1-d. Documentos anulados** no impiden cambiar una vigencia (como en combustibles). Recomendación: sí.
- **R1-e. Para el contador:** (1) ¿persona individual en régimen general lleva contabilidad completa (agente de ISR)
  por omisión? (2) ¿el primario y pecuario individual, no? (3) el agropecuario, ¿de verdad no tiene régimen de ISR?
  La tabla del contador dice que «la compra de ganado sirve para su impuesto sobre utilidad», y la decisión 2 lo deja
  en «no aplica»; (4) ¿el primario y pecuario es solo para personas individuales, como el agropecuario?; (5) ¿el no
  afiliado propone `exento`? Recomendación: llevarlas a `contador-guatemala` antes de R1-1 (solo cambian propuestas
  y, en (3) y (4), un check).
- **R1-f. Tipo de persona:** ¿se pide sin valor por omisión (el formulario de Empresas no guarda hasta escogerlo) o se
  propone «jurídica»? Recomendación: pedirlo; muchos ganaderos son personas individuales y el tipo cambia lo que se
  propone. ¿Y vive en cada vigencia, sincronizado (como aquí), o en `empresas.datos_fiscales` (su lugar natural, pero
  entonces el check del agropecuario solo lo haría el dominio)? Recomendación: en cada vigencia por ahora; se muda a
  Empresas cuando otro módulo lo necesite.

### 3.2 `libro_de_compras.datos_fiscales_de_proveedor` (L1)

> **R2:** `es_pequeno_contribuyente` pasa a `regimen_iva` y `regimen_isr` suma `exento`; ver §3.2b.5.

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

### 3.2b Proveedores de regímenes especiales y factura especial (R2) — arquitecto de datos, 2026-10-18

Estado: **propuesta para aprobar**. Lleva a tablas las decisiones del usuario del 2026-10-18 sobre el veredicto del
contador («Proveedores de regímenes especiales» en `validacion-h7-h11-retenciones.md`). Va **después de R1-4**: las
migraciones de R1 llegan hasta la `0013` (`regimen_iva_de_la_empresa`), y las de este paso empiezan en la `0014`.

#### 3.2b.1 Lo encontrado

1. En desarrollo no hay ninguna fila en `datos_fiscales_de_proveedor`, `documentos` ni `retenciones` (consulta de solo
   lectura del 2026-10-18). Las migraciones convierten sin copiar datos; el `update` de cada una queda solo para otra
   base de desarrollo que sí tenga filas de prueba.
2. `documentos.tipo` admite hoy `factura`, `factura_pequeno_contribuyente`, `nota_de_credito` y `recibo`. Las
   estrategias de IVA miran `tipo = 'factura'`, la del 5 % mira `factura_pequeno_contribuyente` y la del ISR,
   `factura`. Por eso **una familia nueva no recibe ninguna retención** si nadie la agrega: es lo que se quiere para las
   familias sin crédito y lo que hay que agregar a propósito para la factura especial.
3. El proveedor se describe con `es_pequeno_contribuyente` (booleano) y `regimen_isr` (`utilidades`,
   `opcional_simplificado`, `no_domiciliado`). Lo usan seis checks, `retencionesPropuestas`, `problemasFiscalesDeProveedor`,
   `resolverDatosFiscalesDelProveedor` (opción C), `exigirTipoDelProveedor` y la sección del cliente
   (`SeccionFiscalDeProveedor.vue`, `datos-fiscales-de-proveedor.ts`).
4. `resolverEmisor` compara `nit_emisor` con el NIT del proveedor y, si este no tiene, le manda `terceros.completar_nit`.
   En la factura especial el emisor es **la empresa**: esa regla no sirve tal cual.
5. `terceros.terceros` tiene `nit` y `dpi` (CUI de 13 dígitos, único por cuenta). Ojo: un CUI de 13 dígitos también
   cumple la expresión del NIT (`^[0-9]{1,12}[0-9K]$`); la base no puede distinguirlos solo por su forma.
6. La fecha de derogación ya existe como constante del dominio: `FECHA_DE_DEROGACION_REGIMENES_DECRETO_7_2019 =
   '2025-07-09'` (`vigencia-fiscal-de-empresa.ts`, commit `9e5b7ec`), y la usa la vigencia de la empresa.

#### 3.2b.2 Decisiones de diseño

| Tema | Decisión | Por qué |
|---|---|---|
| Familia y código | `tipo` = **familia fiscal** (lo que decide crédito, motivo y retenciones) y `tipo_dte` = **código SAT** (lo que dice el DTE). Un check dice qué códigos admite cada familia | Lo decidió el usuario. Las reglas fiscales se escriben una vez por familia (FACT y FCAM se tratan igual); el código sirve para cruzar con los DTE (L4) y para mostrar el documento como lo ve el usuario |
| Reservadas | `factura_especifica` (FEPE) y `duca` **no** entran en el check ni en `TIPOS_DE_DOCUMENTO`; quedan nombradas en un comentario de `tipos-de-documento.ts` y aquí | Un valor en el check sin reglas permite filas que el dominio no sabe calcular (la DUCA no tiene serie ni FEL y chocaría con `datos_sat`; la FEPE lleva ICT). Agregarlas después es un `drop`/`add` del check, sin datos que convertir |
| `ict` | No entra en `retenciones_impuesto_valido`; se reserva el nombre (`impuesto = 'ict'`, regla `ict_factura_especifica`, que cumple `impuesto = split_part(regla, '_', 1)`) | Mismo motivo: llega con la factura específica |
| Fecha de derogación | El dominio la valida con una **variable de configuración de instalación**; la base **no** la revisa (ver pregunta R2-a) | El dato es legal y está «por confirmar»; si la SAT dio una transición para emitir esos DTE después del 9-07-2025, soporte la corrige sin migración. Un check con la fecha escrita rechazaría lo que el dominio ya acepta |
| Inicio del primario y pecuario | Check en la base: `fecha_emision >= '2025-04-09'` | Es la vigencia del Decreto 31-2024: antes no existía el DTE. No hay transición posible hacia atrás |
| Régimen del proveedor | `regimen_iva` en lugar de `es_pequeno_contribuyente`; sin historial | Decisión del usuario: el documento es la foto (familia y código) |
| `no_domiciliado` | Se queda en `regimen_isr` **y** es un `regimen_iva`; un check los ata (uno si y solo si el otro) | El aviso de no residentes y la opción C ya leen `regimen_isr`; quitarlo cambiaría más código que atarlo. Ver pregunta R2-c |
| Factura especial | `nit_emisor` = NIT de la empresa y `nit_receptor` = NIT o CUI del vendedor: **las dos columnas copian el DTE tal cual**; `proveedor_id` sigue siendo el vendedor y `nombre_emisor` guarda su nombre | En la FESP la empresa emite y el vendedor recibe. Copiar el DTE sin reinterpretar evita una columna nueva y deja que L4 la cruce igual que las demás. `nombre_emisor` es «el nombre del proveedor como estaba» (§3.5): en la FESP se documenta que es el del vendedor (pregunta R2-d) |

#### 3.2b.3 `documentos`: familias, `tipo_dte` y sus checks

**Familias y códigos** (siglas de las Reglas FEL; el contador pide confirmarlas en la versión vigente):

| `tipo` (familia) | `tipo_dte` admitidos | IVA | Motivo sin crédito en el libro | Fecha de emisión |
|---|---|---|---|---|
| `factura` | `FACT`, `FCAM` | sí | los de hoy (o nulo) | — |
| `factura_pequeno_contribuyente` | `FPEQ`, `FCAP` | 0 | `pequeno_contribuyente` | — |
| `factura_pequeno_contribuyente_electronico` (nueva, derogada) | `FAPE`, `FCPE` | 0 | `pequeno_contribuyente` | anterior a la derogación (dominio) |
| `factura_contribuyente_agropecuario` (nueva, derogada) | `FACA`, `FCCA`, `FAAE`, `FCAE` | 0 | `contribuyente_agropecuario` | anterior a la derogación (dominio) |
| `factura_primario_pecuario` (nueva) | `FARP`, `FCRP`, `FPEC`, `FCPC` | 0 | `primario_pecuario` | desde el 2025-04-09 (check) |
| `factura_especial` (nueva) | `FESP` | sí | los de hoy (o nulo): da crédito | — |
| `nota_de_credito` | `NCRE` | sí | el de su factura | — |
| `recibo` | `RECI`, `RDON`, o nulo sin FEL | 0 (fuera del libro) | nulo | — |

**Columna nueva:**

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `tipo_dte` | text | sí | código SAT de cuatro letras; obligatorio si el documento tiene FEL (`autorizacion_fel is not null`), nulo si no (`sin_fel`). Lo escribe el caso de uso con lo que escogió el usuario; el dominio comprueba la familia |

Restricciones (nombres `documentos_<regla>`; todas con `coalesce`, porque una comparación con nulo deja pasar el check):

| Nombre | Expresión | Estado |
|---|---|---|
| `tipo_valido` | `tipo in ('factura', 'factura_pequeno_contribuyente', 'factura_pequeno_contribuyente_electronico', 'factura_contribuyente_agropecuario', 'factura_primario_pecuario', 'factura_especial', 'nota_de_credito', 'recibo')` | se reemplaza |
| `tipo_dte_valido` | `tipo_dte is null or tipo_dte in ('FACT','FCAM','FPEQ','FCAP','FAPE','FCPE','FACA','FCCA','FAAE','FCAE','FARP','FCRP','FPEC','FCPC','FESP','NCRE','RECI','RDON')` | nueva |
| `tipo_dte_con_fel` | `(tipo_dte is null) = (autorizacion_fel is null)` | nueva |
| `tipo_dte_de_la_familia` | `tipo_dte is null or case tipo when 'factura' then tipo_dte in ('FACT','FCAM') when 'factura_pequeno_contribuyente' then tipo_dte in ('FPEQ','FCAP') when 'factura_pequeno_contribuyente_electronico' then tipo_dte in ('FAPE','FCPE') when 'factura_contribuyente_agropecuario' then tipo_dte in ('FACA','FCCA','FAAE','FCAE') when 'factura_primario_pecuario' then tipo_dte in ('FARP','FCRP','FPEC','FCPC') when 'factura_especial' then tipo_dte = 'FESP' when 'nota_de_credito' then tipo_dte = 'NCRE' when 'recibo' then tipo_dte in ('RECI','RDON') else false end` | nueva |
| `motivo_sin_credito_valido` | la lista de hoy más `'contribuyente_agropecuario'` y `'primario_pecuario'` | se reemplaza |
| `familia_sin_iva` | `tipo not in ('factura_pequeno_contribuyente', 'factura_pequeno_contribuyente_electronico', 'factura_contribuyente_agropecuario', 'factura_primario_pecuario') or iva = 0` | **reemplaza** `pequeno_contribuyente_sin_iva` |
| `motivo_de_la_familia` | `tipo = 'nota_de_credito' or not muestra_en_reportes_sat or (case tipo when 'factura_pequeno_contribuyente' then coalesce(motivo_sin_credito,'') = 'pequeno_contribuyente' when 'factura_pequeno_contribuyente_electronico' then coalesce(motivo_sin_credito,'') = 'pequeno_contribuyente' when 'factura_contribuyente_agropecuario' then coalesce(motivo_sin_credito,'') = 'contribuyente_agropecuario' when 'factura_primario_pecuario' then coalesce(motivo_sin_credito,'') = 'primario_pecuario' else coalesce(motivo_sin_credito,'') not in ('pequeno_contribuyente','contribuyente_agropecuario','primario_pecuario') end)` | **reemplaza** `pequeno_contribuyente`: cada familia sin crédito lleva su motivo, y esos motivos no aparecen en otra familia (salvo la nota, que hereda) |
| `primario_pecuario_desde` | `tipo <> 'factura_primario_pecuario' or fecha_emision >= date '2025-04-09'` | nueva |
| `factura_especial_en_el_libro` | `tipo <> 'factura_especial' or muestra_en_reportes_sat` | nueva: la emite la empresa a su NIT, siempre va en el libro |
| `factura_especial_vendedor` | `tipo <> 'factura_especial' or (nit_receptor is not null and nit_receptor <> coalesce(nit_emisor,'') and (nit_receptor ~ '^[0-9]{1,12}[0-9K]$' or nit_receptor ~ '^[0-9]{13}$'))` | nueva: el vendedor se identifica por NIT o CUI, nunca `CF`, y no es la empresa |

Lo que la base **no** puede ver y revisa el dominio: que `nit_emisor` de la FESP sea el NIT de la empresa (la empresa
está en otra tabla); que la familia corresponda al régimen del proveedor (3.2b.5); la fecha de derogación (pregunta
R2-a); que una nota de crédito no rebaje una FESP (pregunta R2-e).

**Checks que no cambian y por qué siguen bien:**
- `iva_no_acreditable_por_motivo`: los dos motivos nuevos no están en la lista de «al costo», así que exigen
  `iva_no_acreditable = 0`, que se cumple porque `familia_sin_iva` pone `iva = 0`.
- `plazo_del_credito` (art. 20): pasa con cualquier motivo no nulo; las familias sin crédito siempre lo llevan.
  La FESP sí da crédito, así que el plazo se le revisa como a una factura (correcto: es su crédito).
- `empresa_sin_credito` y `empresa_sin_credito_real` (R1-4): con `iva = 0` las familias sin crédito pasan, y conservan
  su propio motivo aunque la empresa no dé crédito (igual que hoy la de pequeño contribuyente). La FESP con IVA en una
  empresa sin crédito lleva `empresa_sin_credito`.
- `sin_credito_sin_art_20`, `exento_sin_iva`, `sin_sat_sin_credito`, `nota_en_su_mes`, `datos_sat`: sin cambio. La FESP
  cumple `datos_sat` con el NIT de la empresa, su serie y su autorización.
- Únicos: `documentos_sat_unico (nit_emisor, tipo, serie, numero)` sirve también para la FESP (el emisor es la
  empresa, y serie y número son los suyos); `documentos_autorizacion_fel_unica` y `documentos_del_proveedor_unico`
  tampoco cambian. `tipo_dte` **no** entra en los únicos: dentro de una familia, serie y número ya son únicos por
  emisor.

Índices: ninguno nuevo. Nadie consulta por `tipo_dte` (la lista filtra por familia, `documentos_libro_idx` la cubre),
y L4 cruzará por `autorizacion_fel`, que ya tiene su único.

#### 3.2b.4 Motivos nuevos

| Motivo | Lo pone el dominio cuando | IVA no acreditable | Art. 20 |
|---|---|---|---|
| `contribuyente_agropecuario` | familia `factura_contribuyente_agropecuario` en el libro | 0 (no hay IVA) | no se evalúa (motivo no nulo) |
| `primario_pecuario` | familia `factura_primario_pecuario` en el libro | 0 (no hay IVA) | no se evalúa |

`pequeno_contribuyente` cubre también la familia electrónica (decisión del contador). Orden nuevo de
`determinarMotivoSinCredito`: desmarcado → nulo; **familia con motivo propio** (las cuatro sin IVA) → su motivo; nota →
como hoy; después todo igual (la FESP sigue el camino de `factura`). En `MOTIVOS_SIN_CREDITO` se agregan los dos; un
mapa `MOTIVO_DE_LA_FAMILIA` en `tipos-de-documento.ts` es la única fuente del dominio, y su prueba recorre las familias
contra el check (como `politicas-de-los-modulos`). Los textos de los motivos en pantalla los revisa el contador.

#### 3.2b.5 `datos_fiscales_de_proveedor`: `regimen_iva`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `regimen_iva` | text | no | **reemplaza** `es_pequeno_contribuyente` (se borra la columna); `default 'general'` |
| `regimen_isr` | text | sí | suma `exento`: `utilidades`, `opcional_simplificado`, `no_domiciliado`, `exento` |
| `es_agente_de_retencion_iva`, `se_le_retiene_iva`, `se_le_retiene_isr`, `se_le_retiene_iva_pequeno_contribuyente` | boolean | no | sin cambio de columna; cambian sus checks |

Valores de `regimen_iva`: `general`, `pequeno_contribuyente`, `primario`, `pecuario`, `sin_inscripcion`,
`no_domiciliado` y los derogados `pequeno_contribuyente_electronico` y `contribuyente_agropecuario`.

Restricciones (nombres `datos_fiscales_de_proveedor_<regla>`):

| Nombre | Expresión | Estado |
|---|---|---|
| `regimen_iva_valido` | `regimen_iva in (los ocho)` | nueva |
| `regimen_isr_valido` | `regimen_isr is null or regimen_isr in ('utilidades','opcional_simplificado','no_domiciliado','exento')` | se reemplaza |
| `regimen_isr` | `(regimen_iva in ('general','no_domiciliado')) = (regimen_isr is not null)` | se reemplaza (antes con el booleano): «no aplica» fuera de general y no domiciliado |
| `no_domiciliado` | `(regimen_iva = 'no_domiciliado') = (regimen_isr is not distinct from 'no_domiciliado')` | nueva |
| `agente_solo_general` | `regimen_iva = 'general' or not es_agente_de_retencion_iva` | **reemplaza** `pequeno_no_es_agente` |
| `retencion_iva_general` | `regimen_iva = 'general' or not se_le_retiene_iva` | se reemplaza |
| `retencion_isr` | `regimen_isr is not null or not se_le_retiene_isr` | se reemplaza |
| `retencion_iva_pequeno` | `regimen_iva = 'pequeno_contribuyente' or not se_le_retiene_iva_pequeno_contribuyente` | se reemplaza: el electrónico **no** (sin retención, decisión del contador) |

**Propuestas por régimen** (`retencionesPropuestas` y `porOmision`, servidor y copia del cliente con pruebas). Sale
de la tabla del contador del 2026-10-18; confirmar con él la columna del ISR del no domiciliado:

| `regimen_iva` | `regimen_isr` | Agente de IVA | Se le retiene IVA | Se le retiene ISR | Se le retiene IVA PC |
|---|---|---|---|---|---|
| `general` | `utilidades` (escoge `opcional_simplificado` o `exento`) | `false` (escoge) | `not agente` | `regimen_isr = 'opcional_simplificado'` | `false`, forzado |
| `pequeno_contribuyente` | nulo, forzado | `false`, forzado | `false`, forzado | `false`, forzado | `true` |
| `pequeno_contribuyente_electronico` (derogado) | nulo, forzado | `false`, forzado | `false`, forzado | `false`, forzado | `false`, forzado |
| `contribuyente_agropecuario` (derogado) | nulo, forzado | `false`, forzado | `false`, forzado | `false`, forzado | `false`, forzado |
| `primario`, `pecuario` | nulo, forzado | `false`, forzado | `false`, forzado | `false`, forzado | `false`, forzado |
| `sin_inscripcion` | nulo, forzado | `false`, forzado | `false`, forzado | `false`, forzado | `false`, forzado |
| `no_domiciliado` | `no_domiciliado`, forzado | `false`, forzado | `false`, forzado | `false` (el ISR de no residentes no se calcula; aviso) | `false`, forzado |

Las retenciones de la factura especial **no** dependen de estas casillas (las manda la ley a quien emite la FESP).
`exento` en `regimen_isr` solo cambia la propuesta: `se_le_retiene_isr = false`.

**Familia ↔ régimen del proveedor** (reemplaza `exigirTipoDelProveedor`; mismo error `TipoNoCorrespondeAlProveedor` y
misma salida `confirmarCambioDeRegimen` con auditoría):

| Familia | Régimen del proveedor que no pide confirmar |
|---|---|
| `factura` | `general` |
| `factura_pequeno_contribuyente` | `pequeno_contribuyente` |
| `factura_pequeno_contribuyente_electronico` | `pequeno_contribuyente_electronico` o `pequeno_contribuyente` (adonde volvieron tras la derogación) |
| `factura_contribuyente_agropecuario` | `contribuyente_agropecuario`, `primario`, `pecuario` o `general` (adonde pudieron pasar) |
| `factura_primario_pecuario` | `primario` o `pecuario` (con `FARP`/`FCRP` se espera `primario`; con `FPEC`/`FCPC`, `pecuario`) |
| `factura_especial` | cualquiera; si no es `sin_inscripcion`, aviso del art. 52 (no bloquea) |
| `nota_de_credito`, `recibo` | sin revisión (como hoy) |

**Opción C (proveedor sin datos guardados):** el régimen se **deduce del código** y solo se pregunta en `FACT`/`FCAM`
(régimen de ISR, que ahora ofrece «Exento», y si es agente de IVA). Se guarda lo deducido en `FPEQ`/`FCAP`
(`pequeno_contribuyente`), `FARP`/`FCRP` (`primario`), `FPEC`/`FCPC` (`pecuario`) y `FESP` (`sin_inscripcion`). En las
familias derogadas se calcula con el régimen derogado **sin guardarlo** (sería el régimen de hoy de un proveedor que ya
no puede tenerlo).

#### 3.2b.6 Factura especial

- **Encabezado:** `nit_emisor` = NIT de la empresa (de `empresas.obtener_datos_de_empresa`; el usuario no lo escribe);
  serie, número y autorización son los de la FESP que la empresa emitió en su certificador. `nit_receptor` = NIT o CUI
  del vendedor como dice la FESP (`receptorDelDocumento`, que ya acepta los dos).
- **El vendedor es el proveedor:** lo escrito debe coincidir con `terceros.nit` **o** `terceros.dpi` del proveedor. Si
  no tiene ninguno, se le completa en la misma transacción: `terceros.completar_nit` si lo escrito pasa como NIT y la
  orden nueva `terceros.completar_dpi` si es un CUI (13 dígitos que no pasan como NIT). Si tiene otro, error
  `VendedorNoCoincide` (422). Así se cierra la ambigüedad del punto 5 de 3.2b.1: manda el dato del tercero.
- **Fechas:** se propone `fecha_recepcion = fecha_emision` (la empresa la emite al comprar); el usuario puede cambiarla.
- **Crédito:** como una factura (el IVA de la FESP lo paga la empresa por cuenta del vendedor y lo acredita).
- **Avisos** (no bloquean): FESP en una empresa que no lleva contabilidad completa (`es_agente_de_retencion_isr =
  false`); FESP a un proveedor con régimen distinto de `sin_inscripcion` (art. 52: el inscrito debe facturar).

#### 3.2b.7 `retenciones`: las reglas de la factura especial

| Regla | Impuesto | Condición | Base | Porcentaje | Fecha |
|---|---|---|---|---|---|
| `iva_factura_especial` | `iva` | `tipo = 'factura_especial'`, IVA > 0 | IVA del documento | 100 (fijo, de la ley) | emisión |
| `isr_factura_especial` | `isr` | `tipo = 'factura_especial'`, `total − iva > 0` | `total − iva` (sin la variable `incluye_idp`: el contador fija la base) | 5 (`libro-de-compras.retenciones_isr.factura_especial`) | emisión |

- Sin mínimo, sin mirar si la empresa es agente ni las casillas del proveedor (las manda la ley a quien emite la FESP).
  Se ajustan y quitan como las demás (con `retenciones.ajustar`, motivo y aviso de responsabilidad solidaria), y les
  aplica la protección contra la retención doble.
- Dos estrategias nuevas (`EstrategiaDeIvaDeFacturaEspecial`, `EstrategiaDeIsrDeFacturaEspecial`) en el calculador; las
  de hoy no cambian (miran `factura` o `factura_pequeno_contribuyente`).

Restricciones (nombres `retenciones_<regla>`):

| Nombre | Cambio |
|---|---|
| `regla_valida` | se reemplaza: suma `iva_factura_especial` e `isr_factura_especial` |
| `impuesto_valido` | sin cambio (`iva`, `isr`); `ict` reservado, no se agrega |
| `impuesto_de_la_regla` | sin cambio: las dos reglas nuevas lo cumplen |
| `porcentaje_rango`, `porcentaje_nulo_solo_isr` | sin cambio: las dos llevan porcentaje |
| `iva_factura_especial_completa` | **nueva**: `regla <> 'iva_factura_especial' or porcentaje = 100` (el monto puede quedar en 0 por ajuste o retención doble, por eso no se ata el monto) |
| `monto_rango` | sin cambio: con 100 % el monto es la base |

Que la regla corresponda a la familia del documento no lo puede revisar un check (otra tabla); lo garantiza el
calculador. Índices: sin cambio.

**Configuración nueva** (`niveles: ['instalacion']`, `publica: false`):

| Clave | Por omisión |
|---|---|
| `libro-de-compras.retenciones_isr.factura_especial` | 5 |
| `libro-de-compras.plazos.dias_habiles_entero_factura_especial` | 10 (por confirmar con el contador: plazo del SAT-2085; pregunta R2-f) |
| `libro-de-compras.regimenes.fecha_de_derogacion` | `'2025-07-09'` (texto `aaaa-mm-dd`; pregunta R2-a). Primer día en que ya no se aceptan documentos de familias derogadas **ni** vigencias nuevas de la empresa con esos regímenes: reemplaza a la constante `FECHA_DE_DEROGACION_REGIMENES_DECRETO_7_2019` |

#### 3.2b.8 Migraciones

Generadas con `npm run bd:generar -w servidor -- libro-de-compras <nombre>` y **revisadas a mano antes de aplicarlas**
(drizzle-kit agrega `not null` sin llenar y ordena los `drop` como quiere). Números tentativos: si al integrar ya
existen, se renumeran (el `when` del `_journal.json` mayor que el de la `0013`). Sin producción: la base de
desarrollo se convierte sin más.

1. **`0014_r2_regimen_iva_del_proveedor`** (R2-1): `add column "regimen_iva" text`; `update … set regimen_iva = case
   when es_pequeno_contribuyente then 'pequeno_contribuyente' when regimen_isr = 'no_domiciliado' then 'no_domiciliado'
   else 'general' end`; `set not null`, `set default 'general'`; `drop constraint` de los seis checks de hoy; `drop
   column "es_pequeno_contribuyente"`; `add constraint` de los ocho de 3.2b.5.
2. **`0015_r2_familias_y_tipo_dte`** (R2-3): `add column "tipo_dte" text`; `update … set tipo_dte = case tipo when
   'factura' then 'FACT' when 'factura_pequeno_contribuyente' then 'FPEQ' when 'nota_de_credito' then 'NCRE' else
   'RECI' end where autorizacion_fel is not null`; `drop`/`add` de `tipo_valido` y `motivo_sin_credito_valido`; `drop`
   de `pequeno_contribuyente` y `pequeno_contribuyente_sin_iva`; `add` de los demás de 3.2b.3.
3. **`0016_r2_retenciones_de_factura_especial`** (R2-6): `drop`/`add` de `retenciones_regla_valida`; `add` de
   `retenciones_iva_factura_especial_completa`.

Ninguna migración de permisos (no hay permisos nuevos), ni de otros esquemas. Los `meta/*_snapshot.json` deben quedar
iguales a las tablas (volver a correr `bd:generar` no propone nada).

#### 3.2b.9 Pruebas de integración (PostgreSQL real)

- **`datos_fiscales_de_proveedor`:** un caso que viola cada check (agente de IVA en `primario`; `regimen_isr` nulo en
  `general` y no nulo en `sin_inscripcion`; `no_domiciliado` en un lado y no en el otro; `se_le_retiene_iva` en
  `pequeno_contribuyente`; `se_le_retiene_iva_pequeno_contribuyente` en `pequeno_contribuyente_electronico`;
  `se_le_retiene_isr` sin régimen de ISR); `exento` aceptado en `general`; los ocho regímenes válidos; RLS por cuenta
  sin cambio (otra empresa de la misma cuenta ve la fila; otra cuenta no).
- **`documentos`:** cada familia con un código suyo (pasa) y con uno ajeno (`FPEQ` en `factura` falla); FEL sin
  `tipo_dte` y `sin_fel` con `tipo_dte` (fallan); IVA distinto de 0 en cada familia sin IVA; cada familia sin crédito con
  un motivo ajeno o nulo (falla) y una `factura` con `contribuyente_agropecuario` (falla); nota de una factura
  agropecuaria con su motivo heredado (pasa); FARP del 2025-04-08 (falla) y del 2025-04-09 (pasa); FAPE del 2025-08-01
  **pasa** en la base (la fecha la revisa el dominio, R2-a); FESP desmarcada, sin receptor, con `CF`, con receptor igual
  al emisor (fallan), con NIT y con CUI (pasan); FESP con `fuera_de_plazo` real (pasa); dos FESP de empresas distintas al mismo vendedor con
  la misma serie y número (pasan: el emisor es distinto).
- **`retenciones`:** las dos reglas nuevas con su impuesto (pasa) y con el impuesto cruzado (falla);
  `iva_factura_especial` con 15 % (falla) y con 100 % y monto 0 por ajuste (pasa).
- **API (`app.inject`):** sección del proveedor con `regimenIva` y sus errores por campo; un cuerpo con
  `esPequenoContribuyente` se rechaza (esquema estricto: un cliente viejo no guarda «general» sin querer); opción C que
  deduce y guarda `primario`/`pecuario`/`sin_inscripcion` y no guarda los derogados; FAPE con emisión después de la
  derogación → 422 con campo `fechaEmision`, y antes → registra con motivo y sin retenciones; FARP con motivo
  `primario_pecuario` y sin retenciones aunque la empresa sea agente; FESP completa: `nit_emisor` de la empresa, vendedor
  por NIT y por CUI (con `completar_nit`/`completar_dpi` cuando el tercero no tiene), vendedor distinto → 422, IVA 100 %
  e ISR 5 % con fecha de emisión, avisos de empresa sin contabilidad completa y de proveedor inscrito; nota sobre FESP
  (según R2-e); retención doble de una FESP anulada.
- `politicas-de-los-modulos` y `llaves-entre-esquemas` siguen pasando; `documentos.soporte.ts` agrega `tipo_dte`.

#### 3.2b.10 API, contratos, Excel, permisos y auditoría

- **Solicitud de documento:** suma `tipoDte` (obligatorio con FEL). El servidor deduce la familia del código; si llega
  también `tipo`, deben concordar (`TipoDteNoCorrespondeAlTipo`, 422). Los documentos sin FEL siguen mandando `tipo`.
  El DTO de la ficha y de la lista devuelve `tipo` y `tipoDte`; el filtro `tipo` de la lista acepta las familias nuevas.
- **Contratos:** `DocumentoParaDestino.tipo` (`core/contratos/libro-de-compras.contratos.ts`) suma las familias nuevas;
  orden nueva `terceros.completar_dpi` en `terceros.contratos.ts`, atendida por `terceros` (pone el CUI si está vacío,
  valida con `Dpi` y la unicidad por cuenta, error si tiene otro).
- **Excel:** nada. Ingreso de facturas es operación (no exporta) y los datos fiscales del proveedor no están en el Excel
  de Proveedores (§10). L4 (importar DTE) leerá el código del DTE y deducirá la familia con el mismo mapa.
- **Permisos:** ninguno nuevo; la FESP se registra con `documentos.crear`.
- **Auditoría:** sin bajas nuevas. Lo que ya se audita sigue igual: el cambio del régimen del proveedor (`corregir`, con
  el DTO anterior, que ahora lleva `regimenIva`), el `confirmarCambioDeRegimen` con la familia nueva, y los ajustes de
  retenciones de la FESP. `TEXTOS_FISCALES` y el DTO de auditoría reemplazan `esPequenoContribuyente` por `regimenIva`.

#### 3.2b.11 Pasos (un commit cada uno; servidor y cliente por separado)

Cada commit corre `npm run revisar` y sus pruebas y actualiza la bitácora de `PLAN.md`.

1. **R2-1 (servidor, régimen del proveedor):** migración `0014`; `DatosFiscalesDeProveedor` con `regimenIva`
   (`REGIMENES_DE_IVA_DE_PROVEEDOR`, `REGIMENES_DE_ISR_DE_PROVEEDOR` con `exento`), `retencionesPropuestas` y
   `problemasFiscalesDeProveedor` según 3.2b.5; esquema estricto de la sección; DTO, mapeador, repositorio y auditoría;
   `resolverDatosFiscalesDelProveedor` y `exigirTipoDelProveedor` con `regimenIva` (aún con las familias de hoy);
   pruebas puras, de checks y de API. Rompe la sección del cliente hasta R2-2: van seguidos.
2. **R2-2 (cliente, sección del proveedor):** selector de régimen de IVA (los derogados solo se muestran si ya estaban
   guardados, con «(derogado)»), régimen de ISR con «No aplica» y «Exento», propuestas al cambiar (lógica pura con
   pruebas), ficha. **No depende de L3-8.**
3. **R2-3 (servidor, datos de documentos):** migración `0015`; `tipos-de-documento.ts` con las familias,
   `TIPOS_DTE`, `FAMILIA_DEL_TIPO_DTE`, `MOTIVO_DE_LA_FAMILIA` y las reservadas en comentario; tipo de la tabla y del
   contrato; pruebas de checks.
4. **R2-4 (servidor, dominio y registro de las familias sin crédito):** motivo por familia, IVA 0 en el cálculo (como la
   de pequeño contribuyente), fecha de derogación por configuración (también en la vigencia de la empresa) e inicio del
   primario y pecuario, familia ↔ régimen del proveedor, opción C por código, `tipoDte` en solicitud, DTO y lista;
   pruebas puras y de API.
5. **R2-5 (servidor, terceros):** orden `terceros.completar_dpi` con pruebas.
6. **R2-6 (servidor, factura especial):** migración `0016`; encabezado de la FESP (emisor = empresa, vendedor por NIT o
   CUI), las dos estrategias y la configuración nueva, plazo de entero por regla, avisos, regla de la nota (R2-e);
   pruebas puras y de API.
7. **R2-7 (cliente, lista y ficha):** textos de las familias, del código DTE («Factura cambiaria», «Factura especial»…)
   y de los motivos nuevos (revisados por el contador) en Ingreso de facturas (L3-7). **No depende de L3-8.**
8. **R2-8 (cliente, formulario):** selector «Tipo de documento como dice el encabezado de la factura» (lista de
   códigos con su nombre; oculta los derogados si la emisión es posterior a la fecha y propone según el régimen del
   proveedor), y la factura especial: NIT de la empresa fijo como emisor, «NIT o CUI del vendedor», recepción igual a la
   emisión, retenciones propuestas y avisos. **Depende de L3-8** (el formulario aún no existe): se hace dentro de L3-8 o
   justo después.
9. **R2-9 (QA):** de punta a punta: un proveedor primario con su FARP, una FAPE anterior y otra posterior a la
   derogación, y una FESP a un particular sin NIT (con CUI) con sus dos retenciones.

#### 3.2b.12 Preguntas para el usuario (con recomendación)

- **R2-a. Fecha de derogación:** (1) variable de instalación que el dominio revisa, sin check en la base; (2) check en
  la base con la fecha escrita y constante en el dominio (cambiarla pide migración); (3) las dos. **Recomendación: (1).**
  La fecha está por confirmar y una transición de la SAT la movería; con (2) o (3) un cambio de fecha pide migración y
  la base y la configuración pueden contradecirse. El inicio del primario y pecuario sí va como check (no cambia).
- **R2-b. Familias reservadas** (`factura_especifica`, `duca`) e `ict`: fuera del check hasta su paso. Recomendación:
  sí, fuera; agregarlas es un cambio de check sin datos.
- **R2-c. No domiciliado** en los dos regímenes, atados por un check, o solo en `regimen_iva` (y quitarlo de
  `regimen_isr`). Recomendación: en los dos por ahora (menos cambio; el aviso de no residentes lee el ISR).
- **R2-d. Nombre del vendedor en la FESP:** se guarda en `nombre_emisor` aunque el emisor del DTE sea la empresa.
  Recomendación: sí, con la columna documentada como «nombre del proveedor»; renombrarla tocaría todo L3 sin ganar nada.
- **R2-e. Nota de crédito sobre una FESP** (la emitiría la propia empresa): ¿se permite en R2? Recomendación: no por
  ahora (error claro); pasarla al contador, porque rebajar una FESP también cambia lo retenido.
- **R2-f. Para el contador:** plazo de entero de lo retenido en la FESP (SAT-2085) y si es el mismo para IVA e ISR;
  si la FESP lleva mínimo para el ISR; si una empresa sin crédito (pequeño contribuyente) que emite FESP retiene igual;
  confirmar las siglas FEL nuevas (`FARP`, `FCRP`, `FPEC`, `FCPC`) y los nombres que lleva el encabezado de cada una.
  Recomendación: llevarlas a `contador-guatemala` antes de R2-6 (no frenan R2-1 a R2-5).

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

> **R1:** se agregan `regimen_iva_de_la_empresa` (foto del régimen del período), el motivo `empresa_sin_credito` y
> cuatro checks; ver §3.1b.7.
>
> **R2:** familias nuevas, `tipo_dte`, motivos `contribuyente_agropecuario` y `primario_pecuario`, factura especial y
> sus dos reglas de retención; ver §3.2b.

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `empresa_id` | uuid | no | FK cascade |
| `cuenta_id` | uuid | no | `default` cuenta de la transacción; solo para la FK del proveedor |
| `tipo` | text | no | check `in ('factura','factura_pequeno_contribuyente','nota_de_credito')` (+ `'recibo'` si se aprueba la pregunta 2) |
| `proveedor_id` | uuid | no | FK `(proveedor_id, cuenta_id) → terceros.proveedores (id, cuenta_id)` no action |
| `nit_emisor` | text | sí | normalizado (`Nit`); check `nit_emisor is null or nit_emisor ~ '^[0-9]{1,12}[0-9K]$'` (nunca `CF`) |
| `nombre_emisor` | text | no | nombre del proveedor como estaba al registrar, 1–200 |
| `nit_receptor` | text | sí | NIT de la empresa si va en el libro (para L4: el DTE debe ser a ese NIT); en una FEL fuera del libro, el NIT **o CUI** al que se emitió (`CF` si es a consumidor final); `null` en `sin_fel` |
| `serie` | text | sí | mayúsculas y sin espacios; 1–40 |
| `numero` | text | no | mayúsculas y sin espacios; 1–40 |
| `autorizacion_fel` | uuid | sí | UUID de la FEL |
| `fecha_emision` | date | no | |
| `fecha_recepcion` | date | no | check `>= fecha_emision` (fecha de la retención de IVA por agente) |
| `periodo` | date | no | primer día del mes del libro |
| `muestra_en_reportes_sat` | boolean | no | `true`; solo es `false` con `motivo_fuera_del_libro` (derivado de él) |
| `motivo_fuera_del_libro` | text | sí | check `in ('sin_fel','fel_a_consumidor_final','fel_a_otro_nit')`; solo se desmarcan documentos sin FEL a nombre de la empresa |
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
| `causa_de_anulacion` | text | sí | `error_de_captura`, `fel_anulada_por_el_emisor` o `no_corresponde_a_la_empresa` (check `causa_de_anulacion_valida`); migración `0010` |

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
- `muestra_segun_motivo`: `muestra_en_reportes_sat = (motivo_fuera_del_libro is null)`.
- `sin_fel_sin_autorizacion`: `motivo_fuera_del_libro is distinct from 'sin_fel' or autorizacion_fel is null`.
- `fel_con_autorizacion`: `motivo_fuera_del_libro not in ('fel_a_consumidor_final','fel_a_otro_nit') or
  autorizacion_fel is not null`. Que `nit_receptor` sea nulo o distinto del NIT de la empresa lo valida el
  dominio (`fuera-del-libro.ts`): el check no ve la empresa.
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
  null and motivo_de_anulacion is not null and causa_de_anulacion is not null)`.

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
| `fecha` | date | no | siempre se conoce al registrar (recepción o emisión, §4.3) |
| `constancia_numero`, `constancia_fecha` | text, date | sí | L5; check los dos o ninguno |

Únicos e índices: unique `(documento_id, regla)` (también cubre la FK);
`retenciones_mes_idx (empresa_id, fecha)` para el reporte (L5). RLS: `politicaPorEmpresa()`.

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
`pequeno_contribuyente`. Casilla SAT desmarcada (solo sin FEL a nombre de la empresa, con `motivo_fuera_del_libro`; avisos de no deducible del ISR y de factura especial): `iva = 0`, `base = total − idp − exento`,
motivo nulo, sin retenciones (todo al costo). Nota de crédito: mismas fórmulas sobre sus
líneas; montos positivos (el tipo da el signo en los reportes) y hereda el motivo de su
factura (si la factura quedó sin crédito, la nota rebaja el costo y no el crédito).

### 4.2 Motivo sin crédito fiscal (lo decide el dominio; el usuario solo elige `no_vinculado`)

> **R1:** con el régimen de la empresa del período entra `empresa_sin_credito` antes de `exento`; orden nuevo en §3.1b.8.

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
| `iva_pequeno_contribuyente` | empresa con `agente_de_retencion_iva <> 'ninguno'`; proveedor `se_le_retiene_iva_pequeno_contribuyente`; `factura_pequeno_contribuyente`; **`total > umbral`** (estrictamente mayor, Q2,500.00) | total | 5 % | recepción (acreditar en cuenta, Ley del IVA art. 48; `recibir_documento` corre en la misma transacción) |
| `isr_opcional_simplificado` | empresa `es_agente_de_retencion_isr`; proveedor `opcional_simplificado` y `se_le_retiene_isr`; `factura`; `base_isr >= isr.minimo` | `base_isr = total − iva` (= base + exento, más el IDP si `isr.incluye_idp`; pregunta 12)  | 5 % hasta Q30,000 + 7 % del excedente | emisión |

- El usuario puede **quitar** (monto 0) o **ajustar** cada propuesta con motivo (pregunta 6):
  se guarda `monto_propuesto`, `monto` y `motivo_del_ajuste`, y se audita `corregir` con
  `recurso = 'libro-de-compras.retenciones'`, `anterior` = la propuesta.
- **Fijada al registrar**: nada la recalcula después (ni el destino ni una nota de crédito;
  decisión del usuario con el riesgo anotado en `validacion-h7-h11-retenciones.md`).
- Aviso de entero vencido: si hoy pasa del plazo de entero del mes de `retencion.fecha` (la recepción en el
  IVA; la fecha de la factura en el ISR, Decreto 10-2012 art. 48; sin caso especial)
  (`libro-de-compras.plazos.dias_habiles_entero_iva` = 15, `…_isr` = 10). Los días hábiles se cuentan detrás
  del puerto `CalendarioLaboral.esHabil(fecha)` (`dominio/calendario-laboral.ts`), hoy de lunes a viernes sin
  feriados (cuando exista la tabla de feriados de `core`, solo cambia la implementación), y por eso el aviso
  dice «venció el dd/mm/aaaa, o vence en los próximos días si hubo feriados; confírmelo»; no bloquea.
- Aviso de responsabilidad solidaria (H7; Código Tributario art. 29 y, en el ISR, Decreto 10-2012 art. 22): si
  el usuario **quita o rebaja** una retención propuesta (monto final menor que el propuesto).
- **Retención doble:** al calcular y registrar se busca en la empresa un documento **anulado** con la misma
  `autorizacion_fel` (o el mismo NIT del emisor, tipo, serie y número) que retuvo algo (monto > 0): la propuesta
  de esas mismas reglas queda en 0 (`monto_propuesto = monto = 0`) con `motivo_del_ajuste` «Practicada en el
  documento anulado <serie>-<número>» y un aviso con lo ya retenido. Lo hace el sistema, así que no exige
  `retenciones.ajustar` (se audita como `corregir`, con lo que habría propuesto); si el usuario la cambia, sí lo
  exige y necesita su propio motivo. Una FEL exenta del banco no genera propuestas
  (`iva = 0` y el banco es agente), así que no avisa.

## 5. Reglas del caso de uso `RegistrarDocumento` (L3)

1. Empresa: NIT en `core.empresas` obligatorio (orden `empresas.obtener_datos_de_empresa`;
   `EmpresaSinNit` con enlace al formulario). Se copia a `nit_receptor` si el documento va en el libro.
2. Proveedor activo de la cuenta (lectura de `terceros.*.tablas.js` desde `infraestructura`,
   con RLS por cuenta) y sus datos fiscales. **Sin fila guardada (opción C):** en una factura del libro, si la
   empresa es agente (de IVA o de ISR), el cuerpo debe traer `datosFiscalesDelProveedor { regimenIsr,
   esAgenteDeRetencionIva }`; si falta, error `faltan_datos_fiscales_del_proveedor` (422) con `detalles`
   `{ campo, preguntas: [{ campo, pregunta, opciones }] }` (también al calcular, que usa lo que llegue sin guardarlo).
   Se guardan al registrar, en la misma transacción, con `DatosFiscalesDeProveedor.crear` y la auditoría de los datos
   fiscales. En `factura_pequeno_contribuyente` el régimen se deduce del tipo; en recibos, documentos fuera del libro
   y notas valen los valores por omisión sin aviso. Lo guardado manda: si ya hay fila, lo que llegue se ignora.
3. H10 (marcado): `nit_emisor` válido y distinto de `CF`. Si el proveedor no tiene NIT → orden
   `terceros.completar_nit` en la misma transacción; si tiene otro → `NitDelEmisorNoCoincide`.
   Desmarcado: `nit_emisor` = NIT del proveedor (puede ser nulo) y UUID opcional.
4. Tipo coherente con el proveedor: `factura_pequeno_contribuyente` exige proveedor pequeño
   contribuyente y al revés (`TipoNoCorrespondeAlProveedor`, cuyo mensaje agrega «si el proveedor cambió de
   régimen, actualice sus datos fiscales o confirme»). Con `confirmarCambioDeRegimen: true` pasa, avisa «El
   proveedor cambió de régimen: confirme que la factura es anterior al cambio» y se audita (`corregir` en
   `libro-de-compras.documentos`, con el motivo).
5. Destino en `DESTINOS` **y activo en la cuenta** (puerto `ModulosActivosDeLaCuenta` del core).
6. Período: se propone el mes de recepción (no el «mes actual»); `>=` mes de emisión; aviso «Ese período
   puede estar declarado: si ya lo presentó, tendrá que rectificar.» si es anterior al mes actual (dato de
   entrada, sin reloj en el dominio); aviso de año anterior si la emisión es de un año anterior al del período; `ControlDePeriodos.exigirAbierto`.
7. Líneas: al menos una; concepto activo; combustible activo con vigencia; cálculo de 4.1.
8. Nota de crédito: su factura vigente, del mismo proveedor y destino (la FK lo repite), de
   tipo factura; se bloquea la factura `for update` y `Σ notas vigentes + esta <= total de la
   factura` (`NotaSuperaLaFactura`); aviso si la nota se emitió más de dos meses (de fecha a fecha) después de la factura («aun así, rebájela en el período en que la recibe»).
   La nota hereda tal cual el motivo sin crédito de su factura (su antigüedad nunca le da motivo); con IVA
   contra una factura `exento` es error (`NotaConIvaDeFacturaExenta`); Σ IVA de notas vigentes + la nueva
   `<=` IVA de la factura (`IvaDeNotasExcedeElDeLaFactura`).
9. Unicidad (3.5), inserción de encabezado, líneas y retenciones.
10. Orden `<destino>.recibir_documento` (sección 7) en la misma transacción.
11. Después de confirmar, evento `libro-de-compras.documento_registrado`. La respuesta trae el
    DTO y la lista de **avisos** (fuera de plazo, año distinto, entero vencido, nota tardía,
    retención quitada o rebajada, retención ya practicada, no domiciliado, FEL a consumidor final de Q2,500.00 o más).
    `nitReceptor` acepta NIT o CUI (`Dpi`) en `fel_a_otro_nit`; en `sin_fel` queda `null`.

**Anular** (`documentos.anular`, `{ causa, motivo }` obligatorios; anula el registro, no la FEL): vigente; sin notas vigentes que la
rebajen; aviso `libro-de-compras.documento_por_anular` al destino **antes** de cambiar (el
destino revierte lo suyo o lanza su error y no se anula nada); período abierto (L5); estado
`anulado`; auditoría `anular` con el DTO completo (líneas y retenciones) y `motivo = "<causa>: <motivo>"`. Libera el número.
Responde `{ documento, avisos }`; si el período es anterior al mes actual, aviso «Ese período puede estar declarado:
si ya lo presentó, tendrá que rectificar.» (igual al eliminar, que responde 200 `{ avisos }` en vez de 204).
La lista (`GET …/documentos`) oculta los anulados por omisión: `estado` es `vigente` si no se pide, y también
`anulado` o `todos`.

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
- Sin `fechar_retencion`: la retención del 5 % se fecha al registrar con la fecha de recepción.
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
| R1-1 | `0012_r1_regimen_de_empresa_con_vigencia.sql` (hecha; la `0011` es la de R1-3) | historial de datos fiscales de la empresa (§3.1b.9) |
| R1-3 | `0011_r1_motivo_empresa_sin_credito.sql` | solo amplía el check del motivo y el de `iva_no_acreditable_por_motivo` (ya integrada: tiene el número `0011`) |
| R1-4 | `0013_r1_foto_del_regimen_en_documentos.sql` | `regimen_iva_de_la_empresa`, motivo `empresa_sin_credito` y checks (§3.1b.9) |
| R2-1 | `0014_r2_regimen_iva_del_proveedor.sql` | `regimen_iva` del proveedor (§3.2b.8) |
| R2-3 | `0015_r2_familias_y_tipo_dte.sql` | familias, `tipo_dte` y sus checks (§3.2b.8) |
| R2-6 | `0016_r2_retenciones_de_factura_especial.sql` | reglas de la factura especial (§3.2b.8) |
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
  deshace todo); la retención del 5 % lleva la fecha de recepción; fuera del libro (`evaluarFueraDelLibro`).
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
   nota posterior no la corrige (decisión del usuario; riesgo anotado por el contador). Para el 5 %
   a pequeño contribuyente el riesgo desaparece: se fecha con la recepción, que es acreditar en
   cuenta (2026-10-04); queda para las demás reglas.
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
14. **L3-4 (servidor, contratos y terceros, hecho 2026-10-04):** `libro-de-compras.contratos.ts`,
    `cuentas-por-pagar.contratos.ts` (solo `recibir_documento`), orden `terceros.completar_nit`
    atendida en `terceros` con pruebas.
15. **L3-5 (servidor, hecho 2026-10-04):** `RegistrarDocumento`, `POST …/documentos/calcular`,
    `GET …/proveedores/:id/destino-sugerido`, `GET …/destinos` (activos), rutas y permisos,
    auditoría de retenciones ajustadas, evento; pruebas de API con un manejador falso de
    `cuentas-por-pagar.recibir_documento`.
    Notas de L3-5: las cuatro rutas exigen `documentos.crear` (calcular, destinos y destino sugerido son parte del
    formulario) y cambiar o quitar una retención propuesta exige además `retenciones.ajustar`, que comprueba el caso de uso;
    `documentos.ver` queda declarado para la lista de L3-6. El destino sugerido es `null` si el último destino ya no está
    activo. Una FEL que queda fuera del libro por `fel_a_otro_nit` o `fel_a_consumidor_final` exige `nitReceptor`
    (`CF` solo en la segunda), y así la regla de «FEL al NIT de la empresa» no se evade omitiéndolo. El tipo `recibo` se
    suma a `DocumentoParaDestino`. (Los ajustes del 2026-10-05 sobre este paso y el siguiente están en la nota
    «Ajustes de L3-5 y L3-6» más abajo.)
16. **L3-6 (servidor, hecho 2026-10-04):** listar y ficha, `AnularDocumento`, `EliminarDocumento`, órdenes
    atendidas (`marcar_procesado`, `anular_documento`,
    `eliminar_documento`), avisos al destino, vigencia usada (L2-3) conectada.
    Notas de L3-6: `GET …/documentos` (filtros `periodo`, `proveedorId`, `estado`, `destino`, `tipo`; `pagina` y `limite`,
    50 por omisión y 200 como máximo; responde `{ elementos, total, pagina, limite }`) y `GET …/documentos/:id` exigen
    `documentos.ver`; `POST …/documentos/:id/anular` (`{ motivo }`), `documentos.anular`; `DELETE …/documentos/:id`,
    `documentos.eliminar`. Se elimina solo lo **vigente**, pendiente en el destino y **sin ninguna nota** (también las
    anuladas cuentan, porque la llave foránea las ve); lo anulado se queda como rastro. Anular y eliminar piden
    `ControlDePeriodos.exigirAbierto` (hoy sin bloqueo). Las órdenes `anular_documento` y `eliminar_documento` traen un
    `origen` opcional: el destino que pide ya hizo lo suyo y no recibe el aviso (así no hay ciclo). `marcar_procesado`
    no se audita y rechaza marcar uno anulado. Una vigencia de combustible usada solo por documentos anulados deja de
    contar como en uso (se puede cambiar su tasa), pero no se elimina: la línea anulada la sigue apuntando (llave foránea).
    **Ajustes de L3-5 y L3-6 (servidor, hechos 2026-10-05, decisiones del usuario sobre el veredicto del contador):**
    entero del ISR contado desde `retencion.fecha` (sin caso especial) con el puerto `CalendarioLaboral`; aviso de
    retención quitada **o rebajada** (Código Tributario art. 29); proveedor sin datos fiscales por la opción C
    (`datosFiscalesDelProveedor`, error `faltan_datos_fiscales_del_proveedor`); aviso de no domiciliado con el ISR de
    no residentes; nota tardía de fecha a fecha; `nitReceptor` acepta CUI, aviso de FEL a consumidor final de Q2,500.00
    o más y `sin_fel` sin receptor; `confirmarCambioDeRegimen`; `causa_de_anulacion` (migración `0010`); aviso de
    período anterior al mes actual al anular y eliminar (eliminar responde 200 `{ avisos }`); protección contra la
    retención doble; la lista oculta los anulados por omisión. Ver las secciones 4 y 5.
17. **L3-7 (cliente, hecho 2026-10-18):** Ingreso de facturas: lista con filtros (período, proveedor, estado,
    destino) y ficha con anular y eliminar (menú Operación).
18. **L3-8 (cliente):** formulario en página: encabezado (proveedor con destino sugerido, NIT
    del DTE, casilla SAT, período), editor de líneas (concepto, bien/servicio, activo fijo,
    combustible con galones), totales y avisos que devuelve `calcular`, panel de retenciones
    (quitar o ajustar con motivo, con `v-permiso`); lógica en `edicion-de-documento.ts` con
    pruebas; ningún archivo pasa de 200 líneas ni la página de 120.

### R1 Régimen de la empresa con vigencia

Pasos R1-1 a R1-7 en §3.1b.11 (antes de L3-7 y L3-8, que ya deben mostrar el motivo `empresa_sin_credito`).

### R2 Proveedores de regímenes especiales y factura especial

Pasos R2-1 a R2-9 en §3.2b.11 (después de R1-4; R2-8 depende de L3-8).

## 15. Fuera de L1 a L3

Importar DTE (L4), reportes, constancias y períodos declarados (L5), factura especial (ya planificada en R2, §3.2b), DUCA,
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
    capturarlos antes de registrar o se usan los valores por omisión con aviso? **Resuelta (2026-10-05, opción C):**
    se piden en el mismo documento y se guardan (ver la sección 5, regla 2).
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

