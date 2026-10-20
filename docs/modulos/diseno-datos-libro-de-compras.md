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
| ~~`libro-de-compras.plazos.dias_habiles_entero_factura_especial`~~ | **No se crea** (decisión del usuario, 2026-10-19): el plazo va por tipo de regla en el dominio. IVA de la FESP: último día hábil del mes siguiente a la emisión, corrido con el calendario de feriados; ISR de la FESP: `dias_habiles_entero_isr` (10 por omisión) |
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

1. **R2-1 (servidor, régimen del proveedor) — HECHO (2026-10-18):** migración `0014`; `DatosFiscalesDeProveedor` con `regimenIva`
   (`REGIMENES_DE_IVA_DE_PROVEEDOR`, `REGIMENES_DE_ISR_DE_PROVEEDOR` con `exento`), `retencionesPropuestas` y
   `problemasFiscalesDeProveedor` según 3.2b.5; esquema estricto de la sección; DTO, mapeador, repositorio y auditoría;
   `resolverDatosFiscalesDelProveedor` y `exigirTipoDelProveedor` con `regimenIva` (aún con las familias de hoy);
   pruebas puras, de checks y de API. Rompe la sección del cliente hasta R2-2: van seguidos.
2. **R2-2 (cliente, sección del proveedor) — HECHO (2026-10-19):** selector de régimen de IVA (los derogados solo se muestran si ya estaban
   guardados, con «(derogado)»), régimen de ISR con «No aplica» y «Exento», propuestas al cambiar (lógica pura con
   pruebas), ficha. **No depende de L3-8.**
3. **R2-3 (servidor, datos de documentos) — HECHO (2026-10-19):** migración `0015`; `tipos-de-documento.ts` con las familias,
   `TIPOS_DTE`, `FAMILIA_DEL_TIPO_DTE`, `MOTIVO_DE_LA_FAMILIA` y las reservadas en comentario; tipo de la tabla y del
   contrato; pruebas de checks.
4. **R2-4 (servidor, dominio y registro de las familias sin crédito) — HECHO (2026-10-19):** motivo por familia, IVA 0 en el cálculo (como la
   de pequeño contribuyente), fecha de derogación por configuración (también en la vigencia de la empresa) e inicio del
   primario y pecuario, familia ↔ régimen del proveedor, opción C por código, `tipoDte` en solicitud, DTO y lista;
   pruebas puras y de API.
5. **R2-5 (servidor, terceros) — HECHO (2026-10-19):** orden `terceros.completar_dpi` con pruebas.
6. **R2-6 (servidor, factura especial) — HECHO (2026-10-19):** migración `0016`; encabezado de la FESP (emisor = empresa, vendedor por NIT o
   CUI), las dos estrategias y la configuración nueva, plazo de entero por regla, avisos, regla de la nota (R2-e);
   pruebas puras y de API.
7. **R2-7 (cliente, lista y ficha) — HECHO (2026-10-19):** textos de las familias, del código DTE («Factura cambiaria», «Factura especial»…)
   y de los motivos nuevos (revisados por el contador) en Ingreso de facturas (L3-7). **No depende de L3-8.**
8. **R2-8 (cliente, formulario) — HECHO (2026-10-19):** selector «Tipo de documento como dice el encabezado de la factura» (lista de
   códigos con su nombre; oculta los derogados si la emisión es posterior a la fecha y propone según el régimen del
   proveedor), y la factura especial: NIT de la empresa fijo como emisor, «NIT o CUI del vendedor», recepción igual a la
   emisión, retenciones propuestas y avisos. **Depende de L3-8** (el formulario aún no existe): se hace dentro de L3-8 o
   justo después.
   **Estado (2026-10-19): hecho** (selector por código y factura especial; lo siguiente, que queda opcional, es ocultar derogados por fecha y proponer el código por régimen). Antes estaba a medias. Hecho el selector por código de la SAT (agrupado por familia, derogados rotulados,
   `FESP` deshabilitada) y el envío de `tipoDte`. Falta el formulario de la factura especial (NIT de la empresa como
   emisor, NIT o CUI del vendedor, recepción igual a la emisión, retenciones propuestas y avisos) y, si se quiere,
   ocultar derogados según la fecha y proponer el código según el régimen del proveedor.
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

### 3.2c Nota de débito del proveedor (R3) — arquitecto de datos, 2026-10-18

Estado: **propuesta para aprobar**. El usuario aprobó la NDEB como paso propio antes de producción (decisión del
2026-10-18 en «Dudas de R2 y de la nota en R1-4», `validacion-h7-h11-retenciones.md`). Va **después de R2-4**: usa la
columna `tipo_dte`, las familias y `motivo_de_la_familia` de R2 (§3.2b.3), y su migración sigue a la `0016`.

**Qué es:** el proveedor la emite para **aumentar** el valor de una factura ya emitida (intereses, cargos, diferencias de
precio) y la referencia. Aumenta lo que se le debe y, si da crédito, el crédito fiscal (Ley del IVA art. 29; la
lectura de crédito, período y plazo está **por confirmar con el contador**, preguntas C1 a C3). Es lo contrario de la
nota de crédito: el monto se guarda **positivo** y la familia da el signo en los reportes, como hoy con la nota de crédito.

#### 3.2c.1 Lo encontrado

1. La nota de crédito está repartida en el código por su nombre: `documentos_nota_con_factura`, cuatro checks que la
   excluyen (`plazo_del_credito`, `fuera_de_plazo_real`, `empresa_sin_credito_real`, `sin_credito_sin_art_20`), uno que
   solo la toca a ella (`nota_en_su_mes`) y, desde R2, `motivo_de_la_familia`. En el dominio: `ResolutorDeFactura`
   (`TIPOS_QUE_SE_REBAJAN`), `determinarMotivoSinCredito` (`motivoDeUnaNota`), `exigirNotaCoherenteConLaFactura`,
   `exigirQueLaNotaNoSupereLaFactura`, `periodoPropuesto`/`exigirPeriodoValido`, `calcularRetenciones` y
   `buscarAnulado` (las notas no retienen).
2. `ConsultasDeDocumentosDrizzle.sumaDeNotasVigentes` suma solo `tipo = 'nota_de_credito'`; en cambio
   `notasDeLasFacturas` (lista) y la ficha cuentan **todo** documento que apunte a la factura. Con la NDEB las dos
   cosas deben distinguir el tipo: la suma para el tope, por tipo; el conteo para anular y eliminar, de los dos.
3. La llave `documentos_nota_factura_fk` (`0007`, MATCH SIMPLE) ya sirve tal cual para la NDEB: mismo proveedor, mismo
   destino y misma empresa; las filas sin `documento_afectado_id` no se revisan. Que lo apuntado sea una factura (y no
   una nota o un recibo) lo revisa solo el dominio.
4. La casilla «Se muestra en reportes SAT» de una nota de crédito hoy **no** se ata a la de su factura (ni en un check
   ni en el dominio): una nota marcada puede rebajar una factura desmarcada y al revés. Es un hueco pequeño de L3 que
   la NDEB repetiría (pregunta R3-h).
5. «Nota de débito» ya es, en Bancos, un movimiento que saca dinero de la cuenta (`docs/modulos/bancos.md`), y Cuentas
   por pagar paga con ella. En pantalla el documento del proveedor necesita otro nombre (pregunta R3-i).
6. En desarrollo no hay documentos (consulta de solo lectura del 2026-10-18), y no hay producción: la migración solo
   cambia checks, sin datos que convertir.

#### 3.2c.2 Decisiones de diseño

| Tema | Decisión | Por qué |
|---|---|---|
| Familia y código | `tipo = 'nota_de_debito'`, `tipo_dte = 'NDEB'` | Como R2: la familia decide las reglas fiscales y el código cruza con el DTE (L4) |
| Referencia | `documento_afectado_id` obligatorio, a una **factura** vigente del mismo proveedor y destino; la misma llave compuesta | Ya garantizado en la base para la nota de crédito; no hace falta otra llave |
| Qué facturas admiten NDEB | `factura`, `factura_pequeno_contribuyente`, `factura_pequeno_contribuyente_electronico`, `factura_contribuyente_agropecuario`, `factura_primario_pecuario`. **No:** `factura_especial` (la emitió la empresa: mismo criterio que R2-e), `recibo`, ninguna nota | Una nota corrige la factura original (art. 29); una nota sobre otra nota rompe el rastro y el tope |
| Motivo sin crédito | La NDEB **se evalúa como un documento propio** (su período, su emisión, su IVA) y **hereda de su factura solo lo que es de la compra**: la familia sin crédito y `no_vinculado` (ver 3.2c.3) | El IVA de la NDEB es IVA nuevo que se documenta en su propia fecha; heredar `fuera_de_plazo` o `empresa_sin_credito` daría o quitaría crédito por la fecha de otro documento |
| Período y art. 20 | Como una factura: se propone el mes de recepción, nunca antes del mes de su emisión; el plazo del art. 20 se cuenta **desde su propia emisión** | Mismo razonamiento; los checks del art. 20 ya se escriben «salvo `nota_de_credito`», así que la NDEB entra sola |
| Casilla SAT | La NDEB va **siempre** en el libro, y solo sobre facturas que van en el libro | Es un DTE al NIT de la empresa (decisión A1 del 2026-10-04: toda **factura** FEL al NIT de la empresa va en el libro; el recibo FEL es la excepción) |
| Retenciones | **Ninguna en R3-1 a R3-4** (como la nota de crédito); el paso R3-5 las agrega si el contador lo confirma. La tabla `retenciones` no cambia: las filas colgarían de la NDEB con las reglas de hoy | No hay norma clara; los datos no dependen de la respuesta |
| Tope de las notas de crédito | Σ notas de crédito vigentes ≤ factura + Σ NDEB vigentes, en total **y** en IVA | La NDEB aumenta lo que se puede rebajar |
| Totales derivados | «Total ajustado» de la factura = total + Σ NDEB vigentes − Σ notas de crédito vigentes; no se guarda | Se calcula en la ficha y en el destino; guardarlo pide mantenerlo en cada alta y baja |

#### 3.2c.3 Motivo sin crédito de la NDEB

Nueva rama `motivoDeUnaNotaDeDebito` en `determinarMotivoSinCredito` (`motivo-sin-credito.ts`), en este orden:

1. Casilla desmarcada → nulo (no ocurre: el check `nota_de_debito_en_el_libro` lo impide; queda por coherencia).
2. **Factura de una familia con motivo propio** (las cuatro sin IVA de R2) → **ese motivo**, del mapa
   `MOTIVO_DE_LA_FAMILIA` aplicado a la familia **de la factura**; la NDEB debe traer IVA cero (si no, error
   `NotaDeDebitoConIvaDeFacturaSinIva`, 422, en el cálculo, y el check `motivo_sin_iva` lo repite).
3. Factura `exento` y NDEB con IVA → error `NotaConIvaDeFacturaExenta` (el mismo de la nota de crédito, con el
   mensaje generalizado a «la nota»; pregunta C4).
4. IVA cero y todo exento → `exento`.
5. **Período de la NDEB sin crédito** (`daCreditoFiscal()` de la vigencia de **su** período) → `empresa_sin_credito`
   (regla de R1-4, sin excepción). Si la factura sí dio crédito, no hace falta aviso: es la misma regla que una
   factura cualquiera de ese período.
6. Factura `no_vinculado` → `no_vinculado` (heredado; el usuario no lo cambia en la NDEB: la vinculación es de la
   compra, pregunta R3-c).
7. Período mayor que el mes de **su** emisión + 2 → `fuera_de_plazo` (aviso de siempre).
8. Si no, nulo (da crédito).

Casos que cambian respecto de heredar todo (opción A de R3-a):

| Factura | NDEB | Heredar todo (A) | Evaluar propia (B, recomendada) |
|---|---|---|---|
| Con crédito, en plazo | Registrada 4 meses después de su emisión | Da crédito (incorrecto por art. 20) | `fuera_de_plazo` |
| `fuera_de_plazo` | Registrada el mes de su emisión | Sin crédito | Da crédito (pregunta C2) |
| `empresa_sin_credito` (régimen anterior) | Cae en un período general | Sin crédito | Da crédito, con aviso «La factura se registró sin crédito fiscal (régimen anterior); consulte a su contador» (pregunta C2) |
| Con crédito | Cae en un período sin crédito | Da crédito (incorrecto: viola `empresa_sin_credito`) | `empresa_sin_credito` |

`iva_no_acreditable` sigue la regla de siempre (`= iva` con `fuera_de_plazo`, `no_vinculado` o `empresa_sin_credito`):
el IVA al costo va a cada línea de la NDEB, que lleva sus propios conceptos (el formulario propone los de la factura).

#### 3.2c.4 Período y art. 20

- `periodoPropuesto` y `exigirPeriodoValido`: la NDEB sigue la rama de la factura (mes de recepción, nunca antes del
  mes de emisión); `nota_en_su_mes` sigue siendo solo de la nota de crédito.
- Regla nueva del dominio (no puede ser check: es otra fila): `fecha_emision` de la NDEB `>=` la de su factura
  (`NotaDeDebitoAnteriorALaFactura`, 422, campo `fechaEmision`).
- Avisos: los de período de siempre (`avisosDelPeriodo`). **Sin** el aviso de nota tardía del art. 17: es de la nota de
  crédito (pregunta C5 por si hay un plazo equivalente para la NDEB).
- Familias derogadas: una NDEB sobre una FAPE o una factura agropecuaria se acepta **aunque se emita después de la
  derogación** (corrige una venta anterior), con motivo heredado e IVA cero; pregunta C6.

#### 3.2c.5 `documentos`: restricciones

Nombres `documentos_<regla>`; todas con `coalesce` donde hay nulos.

| Nombre | Expresión | Estado |
|---|---|---|
| `tipo_valido` | la lista de R2 más `'nota_de_debito'` | se reemplaza |
| `tipo_dte_valido` | la lista de R2 más `'NDEB'` | se reemplaza |
| `tipo_dte_de_la_familia` | el `case` de R2 más `when 'nota_de_debito' then tipo_dte = 'NDEB'` | se reemplaza |
| `nota_con_factura` | `(tipo in ('nota_de_credito', 'nota_de_debito')) = (documento_afectado_id is not null)` | se reemplaza |
| `motivo_de_la_familia` | el de R2 con la primera condición `tipo in ('nota_de_credito', 'nota_de_debito') or …` | se reemplaza: la NDEB hereda el motivo de la familia de su factura |
| `nota_de_debito_en_el_libro` | `tipo <> 'nota_de_debito' or muestra_en_reportes_sat` | **nueva** (R3-b) |
| `motivo_sin_iva` | `coalesce(motivo_sin_credito, '') not in ('pequeno_contribuyente', 'contribuyente_agropecuario', 'primario_pecuario') or iva = 0` | **nueva**: cubre a las dos notas, que `familia_sin_iva` no ve (hoy una nota de crédito de una FPEQ con IVA pasaría la base) |

**Checks que no cambian y por qué siguen bien con la NDEB:**
- `plazo_del_credito` y `fuera_de_plazo_real`: excluyen solo `nota_de_credito`, así que a la NDEB se le revisa el plazo
  desde su emisión (decisión de 3.2c.4).
- `empresa_sin_credito` y `empresa_sin_credito_real`: la NDEB lleva `empresa_sin_credito` solo en su período sin
  crédito, como una factura; la excepción de la nota de crédito no hace falta.
- `sin_credito_sin_art_20`: en un período sin crédito la NDEB no puede llevar `no_vinculado` ni `fuera_de_plazo`; el
  orden de 3.2c.3 pone `empresa_sin_credito` antes, así que el heredado `no_vinculado` no llega.
- `nota_en_su_mes`: solo nota de crédito.
- `datos_sat`, `tipo_dte_con_fel`: la NDEB va en el libro con NIT del emisor, serie, autorización y `NDEB`.
- `iva_no_acreditable_por_motivo`, `exento_sin_iva`, `familia_sin_iva`, `sin_sat_sin_credito`, `periodo_desde_emision`:
  sin cambio.
- Únicos: `documentos_sat_unico` y `documentos_del_proveedor_unico` llevan `tipo`, así que una NDEB no choca con una
  factura de igual serie y número (en FEL no pasa: la serie y el número los da el certificador); la autorización FEL
  sigue única.
- Llave `documentos_nota_factura_fk`: sin cambio (3.2c.1, punto 3). Índices: ninguno nuevo; `documentos_afectado_idx`
  cubre las sumas y los conteos por factura.

**Lo que revisa el dominio y no la base:** que lo apuntado sea una factura de las familias que admiten NDEB, vigente y en
el libro; la fecha de la NDEB contra la de la factura; el motivo heredado de la familia o de `no_vinculado`; los topes.
Para garantizar en la base que la nota apunta a una factura habría que agregar dos columnas generadas a la tabla y a la
llave, con la lista de familias repetida en ellas (pregunta R3-g; recomendación: no).

#### 3.2c.6 Topes y bloqueos

`FacturaParaNota` (puerto) suma `familia`, `muestraEnReportesSat`, `totalDeNotasDeDebito` e `ivaDeNotasDeDebito`
(centavos, de las NDEB vigentes); `totalDeNotas`/`ivaDeNotas` pasan a llamarse `totalDeNotasDeCredito`/
`ivaDeNotasDeCredito`. Una sola consulta agregada por factura (`sum(...) filter (where tipo = ...)`).

| Al… | Regla | Error |
|---|---|---|
| Registrar una nota de crédito | Σ total de notas de crédito vigentes + la nueva `<=` total de la factura + Σ total de NDEB vigentes; lo mismo con el IVA | `NotaSuperaLaFactura`, `IvaDeNotasExcedeElDeLaFactura` (mensajes: «…más sus notas de débito») |
| Registrar una NDEB | Sin tope propio (aumenta) | — |
| Anular o eliminar una NDEB | Las notas de crédito vigentes deben seguir cabiendo sin ella: Σ NC `<=` factura + Σ de las **otras** NDEB vigentes (total e IVA) | `NotaDeDebitoSostieneNotasDeCredito` (409, `ReglaDeNegocioInfringida`): «Las notas de crédito de esta factura pasan de su valor sin esta nota de débito: anule antes la nota de crédito» |

**Bloqueo:** registrar cualquier nota (de crédito o de débito) y anular o eliminar una NDEB toman la factura `for update`
(`buscarFacturaParaNota(id, true)`, como hoy la nota de crédito) antes de sumar. Así, una NDEB que se anula y una nota de
crédito que se registra a la vez sobre la misma factura se ordenan y el tope no se rompe; y anular la factura (que
también la bloquea) no se cruza con una NDEB nueva.

#### 3.2c.7 Bajas

- **La factura:** «notas vigentes» y «notas en total» cuentan **las dos** familias (`HechosDeUnDocumento` no cambia de
  forma; cambian la consulta de la ficha, que hoy ya cuenta todo, y la suma del tope, que no). Una factura con una NDEB
  vigente no se anula; con una NDEB anulada no se elimina (la llave la ve). `DocumentoConNotasVigentes` y
  `DocumentoConNotas` cambian el texto a «notas de crédito o de débito».
- **La NDEB:** se anula si está vigente y pasa el tope de 3.2c.6; se elimina si además sigue pendiente en el destino
  (`procesado_en_destino_en is null`). Ninguna nota apunta a una NDEB, así que la llave no la frena. Aviso de período
  anterior al mes actual, causa y motivo de anulación, aviso al destino y control de períodos: como cualquier documento.
- **Auditoría:** sin acciones nuevas. `anular` y `eliminar` de la NDEB con `recurso = 'libro-de-compras.documentos'` y
  su DTO completo (líneas y retenciones, si R3-5 las agrega).

#### 3.2c.8 Retenciones (bloqueado por el contador)

Hasta la respuesta de C3, `calcularRetenciones` devuelve `[]` para las dos notas, y `buscarAnulado` no busca retención
practicada en notas. Si el contador confirma que se retiene sobre la NDEB, R3-5 hace solo esto:

- `EntradaDeRetenciones` suma `familiaQueRige`: la familia **de la factura** en una NDEB, la propia en lo demás. Las
  estrategias miran `familiaQueRige` en lugar de `tipo` (la NDEB de una `factura` usa las de IVA de agente y la del ISR
  opcional; la de una FPEQ, la del 5 %; la de las familias sin crédito, ninguna, como su factura).
- El mínimo (Q2,500 del IVA de agentes, del 5 % y del ISR) se mide sobre **la NDEB sola** o sobre **la factura más sus
  NDEB**, según conteste el contador; la segunda pide sumar las NDEB anteriores dentro del bloqueo de la factura.
- La protección contra la retención doble se aplica igual (misma autorización FEL de una NDEB anulada).
- La tabla `retenciones` y sus checks no cambian; la fecha de cada regla es la de hoy (recepción en el IVA, emisión en
  el ISR) tomada de la NDEB.

#### 3.2c.9 Migración

**`0017_r3_nota_de_debito`** (paso R3-1), generada con `npm run bd:generar -w servidor -- libro-de-compras
r3_nota_de_debito` (sin `--custom`: solo checks) y revisada a mano antes de aplicarla: `drop`/`add` de `tipo_valido`,
`tipo_dte_valido`, `tipo_dte_de_la_familia`, `nota_con_factura` y `motivo_de_la_familia`; `add` de
`nota_de_debito_en_el_libro` y `motivo_sin_iva`. Sin `update`: no hay datos que convertir. El número es tentativo (el
`when` del `_journal.json` mayor que el de la `0016`; si R2 terminó con otra numeración, se renumera). La llave
`documentos_nota_factura_fk` (custom, `0007`) no se toca. Los `meta/*_snapshot.json` quedan iguales a las tablas. Ninguna
migración de permisos ni de otros esquemas.

#### 3.2c.10 Pruebas de integración (PostgreSQL real)

- **Checks:** NDEB con `NDEB` (pasa) y con `NCRE` o `FACT` (falla); NDEB sin `documento_afectado_id` (falla); NDEB
  desmarcada (falla); NDEB de una FPEQ con `pequeno_contribuyente` e IVA cero (pasa) y con IVA (falla
  `motivo_sin_iva`); nota de crédito de una FPEQ con IVA (falla, hueco cerrado); NDEB con `fuera_de_plazo` en plazo
  (falla `fuera_de_plazo_real`) y sin motivo fuera de plazo (falla `plazo_del_credito`); NDEB con `empresa_sin_credito`
  en período general (falla); NDEB de otro proveedor o de otro destino que su factura (falla la llave).
- **API (`app.inject`):** NDEB sobre factura con crédito (da crédito; DTO con `tipo`, `tipoDte` y la factura); sobre
  factura `no_vinculado` (hereda); sobre factura `fuera_de_plazo` registrada en su mes (da crédito); NDEB tardía
  (`fuera_de_plazo` con aviso); NDEB en período sin crédito; NDEB sobre FPEQ con IVA (422); NDEB sobre factura exenta con
  IVA (422); NDEB sobre FESP, recibo, nota de crédito, factura anulada o desmarcada (422); NDEB anterior a su factura
  (422); nota de crédito que solo cabe gracias a una NDEB (pasa) y que no cabe sin ella (422); anular esa NDEB (409) y,
  anulada la nota de crédito, anularla (pasa); factura con NDEB vigente no se anula; con NDEB anulada no se elimina;
  NDEB pendiente en el destino se elimina; orden `<destino>.recibir_documento` con `tipo = 'nota_de_debito'` y la factura.
- `politicas-de-los-modulos` y `llaves-entre-esquemas` siguen pasando; `documentos.soporte.ts` gana un ayudante para
  insertar una NDEB.

#### 3.2c.11 API, contratos, destino, Excel, permisos y auditoría

- **Solicitud:** `tipoDte: 'NDEB'` deduce la familia; `documentoAfectadoId` obligatorio (el mismo campo de la nota de
  crédito); `noVinculado` se ignora en la NDEB (se hereda). El DTO de la ficha de una factura lista sus notas con
  `tipo` (`NotaDeFacturaDto` suma `tipo`) y devuelve el «total ajustado» (derivado). El filtro `tipo` de la lista acepta
  `nota_de_debito`.
- **Contratos** (`core/contratos/libro-de-compras.contratos.ts`): `TipoDeDocumentoDeCompra` suma `'nota_de_debito'`;
  el comentario de `documentoAfectadoId` pasa a «la factura que corrige, en las notas de crédito y de débito». Sin
  órdenes nuevas.
- **Destino:** Cuentas por pagar recibe la NDEB como un **cargo** que aumenta lo que se debe al proveedor; su plan
  (`cuentas-por-pagar.md`, saldo = facturas − notas de crédito − retenciones − pagos) debe sumar «+ notas de débito»
  cuando se diseñe CP1/CP2. La NDEB de una factura ya pagada entra como pendiente nueva (otra contraseña). Esto **no** lo
  cambia R3; se anota para el diseño de Cuentas por pagar.
- **Libro de compras (L5):** la NDEB es una fila propia del libro con su tipo SAT; suma al crédito del período (si no
  tiene motivo) en vez de restar, como resta la nota de crédito.
- **Excel:** nada (Ingreso de facturas es operación; L4 deducirá la familia del código `NDEB` con el mismo mapa).
- **Permisos:** ninguno nuevo (`documentos.crear`, `.anular`, `.eliminar` de siempre).
- **Auditoría:** ninguna acción nueva (3.2c.7).

#### 3.2c.12 Pasos (un commit cada uno; servidor y cliente por separado)

Cada commit corre `npm run revisar` y sus pruebas y actualiza la bitácora de `PLAN.md`. Dependen de R2-3 (familias y
`tipo_dte`) y R2-4 (motivo por familia).

1. **R3-1 (servidor, datos) — HECHO (2026-10-19):** migración `0017`; `tipos-de-documento.ts` con la familia `nota_de_debito`, `NDEB` en
   `TIPOS_DTE` y `FAMILIA_DEL_TIPO_DTE`, `TIPOS_DE_NOTA` y `esNota(tipo)`, y `FAMILIAS_QUE_ADMITEN_NOTA_DE_DEBITO`; tipo
   de la tabla y del contrato; pruebas de checks de 3.2c.10.
2. **R3-2 (servidor, dominio) — HECHO (2026-10-19, con los ajustes aprobados por el usuario el mismo día: motivo `nota_de_debito_tardia` del art. 17, `no_vinculado` que el usuario puede agregar, aviso a agentes sin retenciones, clase de cargo solo como aviso, casilla atada también en la nota de crédito):** `motivoDeUnaNotaDeDebito` (3.2c.3), período como factura y fecha contra la factura
   (3.2c.4), `exigirNotaCoherenteConLaFactura` y `exigirQueLaNotaNoSupereLaFactura` con las NDEB (3.2c.6), regla de la
   familia y de la casilla de la factura; errores nuevos; pruebas puras con la tabla de casos de 3.2c.3.
3. **R3-3 (servidor, registrar) — HECHO (2026-10-19; `claseDeCargo` opcional en la solicitud, sin columna; el contrato del destino ya traía el tipo):** `ResolutorDeFactura` para las dos notas, consulta agregada por tipo con bloqueo,
   solicitud, DTO de ficha y lista (`tipo` de las notas, total ajustado), contrato del destino y evento; pruebas de API.
4. **R3-4 (servidor, bajas) — HECHO (2026-10-19; el error del tope es 422 como las demás bajas, no 409):** anular y eliminar la NDEB con el tope y el bloqueo; textos de «notas de crédito o de
   débito» en las bajas de la factura; pruebas de API.
5. **R3-5 (servidor, retenciones; solo si el contador las confirma):** 3.2c.8; pruebas puras y de API.
6. **R3-6 (cliente, lista y ficha) — HECHO (2026-10-19; el total ajustado y el `tipo` de las notas llegan con R3-3):** textos de la familia y del código (nombre de R3-i), notas de la factura con su
   tipo y el total ajustado en la ficha, motivos heredados. **No depende de L3-8.**
7. **R3-7 (cliente, formulario) — HECHO (2026-10-20; la factura se ofrece solo si está en el libro, la clase de cargo es opcional y los conceptos de las líneas no se copian de la factura: con «Intereses» se propone el gasto financiero):** «Nota de débito del proveedor» en el selector de código; elegir la factura (solo las
   que la admiten); conceptos de las líneas propuestos desde la factura; avisos. **Depende de R2-8** (L3-8 ya está
   hecho: se extiende su formulario).
8. **R3-8 (QA):** de punta a punta: factura con crédito, NDEB de intereses, nota de crédito que solo cabe con ella,
   intento de anular la NDEB (rechazado), anular la nota de crédito y luego la NDEB.

#### 3.2c.13 Preguntas para el usuario (con recomendación)

- **R3-a. Motivo de la NDEB:** (A) hereda tal cual el de su factura, como la nota de crédito; (B) se evalúa como
  documento propio y hereda solo la familia y `no_vinculado`. **Recomendación: (B)**; (A) da crédito a una NDEB
  registrada tarde y se lo da en un período sin crédito (tabla de 3.2c.3), y además choca con el check
  `empresa_sin_credito`.
- **R3-b. Solo en el libro:** la NDEB va siempre marcada y solo sobre facturas marcadas. Recomendación: sí; una NDEB es
  un DTE al NIT de la empresa (A1).
- **R3-c. `no_vinculado` heredado** sin que el usuario lo cambie en la NDEB. Recomendación: sí; si la compra era de la
  actividad no gravada, su cargo también.
- **R3-d. Facturas que admiten NDEB:** todas las familias de factura salvo la FESP. Recomendación: sí, con la FESP
  bloqueada como en R2-e (la NDEB la emitiría la propia empresa).
- **R3-e. Anular una NDEB que sostiene notas de crédito:** bloquear con mensaje (anular antes la nota de crédito) o
  dejarla pasar con aviso. Recomendación: bloquear; si no, el libro queda con más rebaja que factura.
- **R3-f. Retenciones:** ninguna hasta que conteste el contador (R3-5 aparte). Recomendación: sí; los datos no cambian.
- **R3-g. Garantía en la base de que la nota apunta a una factura** (dos columnas generadas en la llave). Recomendación:
  no; el dominio ya lo revisa para la nota de crédito, y la lista de familias quedaría repetida en una columna que
  habría que migrar con cada familia nueva.
- **R3-h. Hueco de la nota de crédito:** ¿se ata también su casilla a la de su factura (dominio, en R3-2)?
  Recomendación: sí; hoy una nota marcada puede rebajar una factura desmarcada.
- **R3-i. Nombre en pantalla:** «Nota de débito del proveedor» (y «Nota de crédito del proveedor») para no confundirla
  con la nota de débito de Bancos. Recomendación: sí, en Ingreso de facturas; en el selector de código, «Nota de débito
  (NDEB)».

#### 3.2c.14 Preguntas para el contador (llevar a `contador-guatemala` antes de R3-2; C3 bloquea solo R3-5)

- **C1.** Base legal: ¿la NDEB recibida da crédito fiscal al comprador (Ley del IVA arts. 16, 18 y 29; AG 5-2013) en el
  período de su propia emisión, con el plazo del art. 20 contado desde su fecha y no desde la de la factura?
- **C2.** NDEB de una factura `fuera_de_plazo` registrada en plazo: ¿da crédito? NDEB en período general de una factura
  registrada cuando la empresa no tenía crédito (cambio de régimen): ¿da crédito?
- **C3.** Retenciones sobre la NDEB: IVA de agentes (Decreto 20-2006; ¿RetenIVA admite NDEB?), 5 % al pequeño
  contribuyente (Ley del IVA art. 48) e ISR del régimen opcional (Decreto 10-2012 arts. 47 y 48). Si se retiene, ¿el
  mínimo de Q2,500 se mide sobre la NDEB sola o sobre la factura más sus NDEB? ¿Los intereses cobrados por NDEB tienen
  otra retención (rentas de capital) que deba avisarse?
- **C4.** NDEB con IVA sobre una factura exenta: ¿error como en la nota de crédito, o puede haber un cargo gravado?
- **C5.** ¿Hay un plazo para que el emisor registre la NDEB, como el de dos meses de la nota de crédito (art. 17), que
  merezca un aviso?
- **C6.** NDEB emitida después del 9-07-2025 sobre una FAPE o una factura agropecuaria anterior: ¿se acepta (sin crédito,
  sin retención)?
- **C7.** ¿Una nota de crédito puede referenciar una NDEB en la FEL, o siempre la factura original? (El diseño las
  ata a la factura.)

### 3.3b Bandeja de DTE recibidos y otros impuestos (L4) — arquitecto de datos, 2026-10-19

**Respuestas del usuario a L4-a…L4-l (2026-10-20):** se aceptan las recomendaciones del arquitecto, con un matiz en
**L4-c**: si el DTE ya está registrado en otra empresa **de la misma cuenta**, la fila queda `bloqueado` y visible («ya
está registrado en otra empresa de su cuenta»); si está en **otra cuenta**, **no se avisa nada** en la bandeja (no exponer
información): la fila sigue `pendiente` y al confirmar responde el mensaje genérico de siempre. No se guarda el archivo
(solo su huella); otros impuestos como **total**; exportar la conciliación va en L5. Descarga automática desde la Agencia
Virtual: después de L4, ver `evaluacion-conexion-agencia-virtual.md`.

Estado: **propuesta para aprobar**. Lleva a tablas el informe del contador y las decisiones del usuario del 2026-10-19
(«Importar DTE recibidos (L4)» al final de `validacion-h7-h11-retenciones.md`), con su aclaración del mismo día: **el
registro a mano (formulario de L3-8) es la vía principal** y debe quedar completo por sí solo; la bandeja y la
conciliación son **opcionales**. Va después de R3: la migración de R3 es la `0018` (`0018_r3_nota_de_debito`), así que
las de L4 empiezan en la `0019`.

**Las columnas exactas del Excel de la SAT todavía no se conocen** (el usuario conseguirá un archivo real de un mes de
«Recibidos» y 3–4 XML). Todo lo que depende de ellas está aislado en un **mapa de encabezados** (3.3b.6) que se ajusta
sin migrar, y los pasos que lo esperan van marcados.

#### 3.3b.1 Lo encontrado

1. **Excel del motor (`core/intercambio`):** `LibroDeExcelJs.leer` toma la **fila 1** como encabezados y lee la primera
   hoja; `ubicarColumnas` busca cada columna por **un solo** título normalizado (`normalizar`: sin tildes, minúsculas,
   sin `*`). Un archivo de la SAT puede traer filas de título antes de los encabezados y nombres que cambian: hace falta
   una lectura **cruda** (todas las filas) y un mapa con **variantes**. `ValidadorDeXlsx` (bomba zip, macros, vínculos,
   100 entradas, 25/50 MB inflados), `leerArchivoDeExcel` (5 MB, 413) y `limitarImportaciones` (10 solicitudes por minuto
   por usuario) sirven tal cual. No hay lector de CSV ni detección de formato por contenido.
2. **El motor es «todo o nada»** y pasa cada fila por el caso de uso del formulario dentro de **una** transacción. Para la
   bandeja eso no sirve al confirmar (una fila con un problema no debe frenar las demás), pero **sí** sirve para cargar el
   archivo en la bandeja (un lote entra entero o no entra).
3. **Cálculo de la línea** (`calculo-de-linea.ts`): `gravado = total − idp − exento`; el IDP **solo** se calcula de
   galones × tasa de la vigencia × (100 − etanol) y el check `lineas_idp_calculado` exige esa fórmula exacta. No hay forma
   de escribir el IDP que dice el DTE. El IVA ya se puede corregir al de la FEL (`ivaDeLaFel`, hasta `max(5, líneas)`
   centavos).
4. **Motivo `exento`** (`motivo-sin-credito.ts`): «IVA cero y `exento = total`». La base del ISR
   (`estrategia-de-retencion-de-isr.ts`) es `total − iva − (idp si no se incluye)`.
5. `documentos_autorizacion_fel_unica` es único **en toda la instalación** (solo vigentes): sirve para saber si un DTE ya
   está registrado en otra empresa sin revelar cuál (riesgo ya aceptado, §13.1).
6. **Recibos FEL a la empresa:** la familia `recibo` (`RECI`, `RDON`) solo se registra con la casilla SAT desmarcada y uno
   de cuatro motivos (`sin_fel`, `fel_a_consumidor_final`, `fel_a_otro_nit` y, desde la migración `0020`, `recibo_fel`).
   Un `RECI`/`RDON` emitido **al NIT de la empresa** lleva `recibo_fel` (L4-c3, resuelta el 2026-10-20): exige la
   autorización y el NIT receptor de la empresa (si se escribe otro, error), queda fuera del libro de IVA sin crédito ni
   retenciones, y el `RDON` avisa que la donación es deducible solo en el ISR sobre utilidades. El check
   `documentos_recibo_fel_de_la_familia` exige `tipo = 'recibo'` y `tipo_dte in ('RECI','RDON')`.
7. La auditoría (`AccionAuditada`) es un tipo de TypeScript sin `check` en la base: agregar una acción no pide migración.
8. En desarrollo no hay documentos ni líneas (consulta de solo lectura del 2026-10-19): las migraciones no convierten
   datos.
9. `terceros.terceros` exige `tipo` (`individual` o `juridica`) y `nombre_mostrar`; el NIT es único por cuenta. Crear un
   proveedor desde otro módulo no existe: hoy solo hay `completar_nit` y `completar_dpi`.

#### 3.3b.2 Decisiones de diseño (resumen)

| Tema | Decisión | Por qué |
|---|---|---|
| Vía principal | El formulario de L3-8 gana «Otros impuestos» e «IDP según la factura» y queda completo sin la bandeja | Aclaración del usuario: muchos clientes no bajarán nada de la SAT |
| Otros impuestos | **Una columna de total** `otros_impuestos` en documentos y líneas; el detalle por nombre corto solo se guarda en la bandeja (lo trae el Excel) | Ninguno de esos impuestos da crédito, cambia el motivo ni se retiene: el total basta para calcular y para el libro. El detalle por impuesto en el formulario sería un selector más para nada (3.3b.3) |
| IDP del DTE | Columna `idp_escrito` en la línea: si es `true` manda el IDP escrito y los galones son opcionales (aviso si no coinciden); si es `false`, como hoy | Decisión del usuario («manda el IDP del DTE») sin perder la garantía de la fórmula en la base cuando el IDP sí se calcula |
| Bandeja | Tabla `dte_recibidos`, por empresa, único `(empresa_id, autorizacion_fel)`, upsert al reimportar | Decisión del usuario |
| Lote | Tabla `lotes_de_dte` con su resumen; **el archivo no se guarda** (solo su sha256, nombre y tamaño) | Mismo criterio que hoy para el Excel importado (`seguridad-de-archivos.md`, A9): no hay por qué guardar un archivo con NIT y montos de terceros |
| Cargar | Un lote entra **entero o no entra** (una transacción) | Es una carga a una tabla de trabajo, no un registro fiscal |
| Confirmar | **Fila por fila**, cada una en su transacción, con `RegistrarDocumento` (el mismo caso de uso del formulario) | Decisión del usuario: una fila con error no frena las demás |
| Conciliación | **Consulta**, no tabla (3.3b.9) | Se calcula en el momento con lo que hay; guardarla pediría mantenerla con cada alta, baja y reimportación |
| Opcional | Nada exige la bandeja: ni avisos, ni el cierre del período (L5), ni la conciliación | Aclaración del usuario |

#### 3.3b.3 Otros impuestos

**Qué son:** los impuestos del DTE que no son IVA ni IDP (en la FEL: turismo hospedaje, turismo pasajes, timbre de prensa,
bomberos, tasa municipal, bebidas alcohólicas, bebidas no alcohólicas, tabaco, cemento, tarifa portuaria; la lista exacta
de las columnas del Excel se confirma con el archivo real). No dan crédito fiscal, no cambian el motivo sin crédito y van
al **costo** de la línea.

**Forma: total, no detalle.** Opciones:

| Opción | A favor | En contra |
|---|---|---|
| (A) Total `otros_impuestos` en documento y línea | Un campo más en el formulario; el check de cuadre sigue simple; el libro lo pone como no afecto | No dice qué impuesto era |
| (B) Tabla hija `impuestos_de_documento (documento_id, nombre_corto, monto)` | Detalle exacto | Un selector por impuesto en el formulario a mano (la vía principal) para un dato que nada usa; otra tabla que cuadrar con las líneas |
| (C) Total más `jsonb` con el detalle en el documento | Detalle sin tabla | Dos verdades que pueden no cuadrar |

**Recomendación: (A)**, y el detalle por nombre corto se queda en la fila de la bandeja (`otros_impuestos_detalle`), que ya
lo trae el Excel y queda enlazada al documento. Si Contabilidad pide algún día una cuenta por impuesto, se agrega (B) sin
cambiar el total.

**Columnas nuevas:**

| Tabla | Columna | Tipo | Nulo | Regla |
|---|---|---|---|---|
| `documentos` | `otros_impuestos` | numeric(14,2) | no | `default 0`; check `documentos_otros_impuestos_no_negativo` (`>= 0`); suma de sus líneas |
| `lineas_de_documento` | `otros_impuestos` | numeric(14,2) | no | `default 0`; check `lineas_de_documento_otros_impuestos_no_negativo` (`>= 0`) |

**`totales_cuadran`** (los dos se reemplazan): `total = base + iva + idp + exento + otros_impuestos`, en el documento
(`documentos_totales_cuadran`) y en la línea (`lineas_de_documento_totales_cuadran`). Con `default 0` lo registrado hasta
hoy sigue cuadrando.

**Cálculo** (`calculo-de-linea.ts`, `totales-del-documento.ts`):
- `gravado = total − idp − exento − otros_impuestos` (debe ser `>= 0`; el error de hoy cambia a «El IDP, lo exento y los
  otros impuestos de la línea suman más que su total»).
- El IVA se saca del gravado como hoy; `base = gravado − iva`. Familias sin IVA y casilla desmarcada: `base = total −
  idp − exento − otros_impuestos`.
- Costo de la línea: la fórmula de hoy (`total − iva + iva_no_acreditable`) ya incluye los otros impuestos.
- Motivo `exento`: pasa a `iva = 0 and exento > 0 and exento + otros_impuestos = total` (lo no afecto no convierte en
  exenta una compra; una línea solo de otros impuestos no lleva motivo, igual que hoy una solo de IDP).
- **Retenciones (pregunta L4-c1 al contador):** la propuesta es **sacar** los otros impuestos de la base del ISR (no son
  renta del proveedor: los cobra por cuenta del Estado), como ya se puede sacar el IDP. El mínimo de Q2,500 de las
  retenciones de IVA se sigue midiendo como hoy. Mientras el contador no conteste, L4-2 deja la base del ISR como está
  (incluidos) y la cambia en un commit aparte si confirma.

**En el libro (L5):** los otros impuestos van en la columna de **no afecto/exento** junto con `exento` (decisión del
usuario). La fila del libro sigue cuadrando: `total = base + iva + idp + (exento + otros_impuestos)`.

**Formulario a mano (L3-8):** cada línea gana «Otros impuestos (turismo, timbre, bomberos…)», junto a «Exento», plegado
bajo «Más montos de la factura» para no estorbar a quien no lo usa (se despliega solo si la línea ya tiene un valor). Los
totales del documento muestran la suma. Viaja como texto (`otrosImpuestos: "12.50"`), `null` = 0, en `SolicitudDeLinea`,
en el DTO de la línea y del documento y en `POST …/documentos/calcular`. Los avisos no cambian.

**Contratos y destino:** `DocumentoParaDestino` no cambia (manda el total). Contabilidad (futuro) llevará los otros
impuestos al costo de la línea, como el IDP.

#### 3.3b.4 IDP del DTE con galones opcionales

**Hoy:** la línea de combustible exige vigencia, galones, IDP por galón y etanol (los cuatro o ninguno) y el IDP es la
fórmula exacta (`lineas_idp_calculado`).

**Decisión del usuario:** manda el IDP que dice el DTE; los galones son opcionales y, si vienen, se avisa si no coinciden.

**Columna nueva en `lineas_de_documento`:**

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `idp_escrito` | boolean | no | `default false`. `true`: el IDP es el que escribió el usuario (o trajo el DTE) y manda; `false`: se calcula de los galones como hoy |

**Restricciones** (nombres `lineas_de_documento_<regla>`):

| Nombre | Expresión | Estado |
|---|---|---|
| `combustible_completo` | la de hoy: vigencia, galones, IDP por galón y etanol, los cuatro o ninguno | **sin cambio** (sin galones no se guarda la vigencia: no hay con qué comparar) |
| `idp_calculado` | `idp_escrito or (vigencia_de_combustible_id is null and idp = 0) or idp = round(galones * idp_por_galon * (100 - porcentaje_de_etanol) / 100, 2)` | se reemplaza: la fórmula solo ata al IDP calculado |
| `idp_escrito_positivo` | `not idp_escrito or (idp > 0 and tipo = 'bien')` | **nueva**: un IDP escrito es de un bien y no es cero (sin IDP, la casilla no se marca) |
| `combustible_es_bien` | sin cambio | |

**Reglas del dominio** (`calculo-de-linea.ts`; `LineaEscrita` suma `idp: number | null`, en centavos):

| Lo que escribe el usuario | Se guarda | Aviso |
|---|---|---|
| Combustible y galones, sin IDP | `idp_escrito = false`, IDP calculado (hoy) | — |
| IDP, sin combustible ni galones | `idp_escrito = true`, `tipo = 'bien'`, sin vigencia | — |
| IDP, combustible y galones | `idp_escrito = true`, la vigencia y su tasa copiadas, el IDP escrito | «El IDP de la factura (Q x) no coincide con el de N galones de <combustible> (Q y): revise los galones o el IDP.» si difieren en cualquier centavo |
| Combustible sin galones (con o sin IDP) | error `LineaInvalida` («Escriba los galones del combustible, o deje solo el IDP de la factura») | — |

- Con IDP escrito y combustible, el combustible **no** es obligatorio: el Excel de la SAT no dice ni galones ni tipo de
  combustible. Sin galones no se guarda la vigencia (pregunta L4-b).
- Sin vigencia en la fecha de emisión y con IDP escrito y galones: se registra sin la comparación (y sin vigencia) y con
  el aviso «No hay tasa de IDP para <combustible> en la fecha de emisión: no se comprobó el IDP» en vez del error
  `CombustibleSinTasaVigente` (que sigue cuando el IDP se calcula).
- Una vigencia «en uso» (L2-3) sigue siendo la que tienen las líneas: con IDP escrito y galones también cuenta.
- **Formulario:** la línea muestra «IDP según la factura» cuando se marca «Lleva IDP (combustible)»; debajo, opcionales,
  «Combustible» y «Galones» con el texto «para comprobar el IDP». Sin IDP escrito y con galones, se calcula como hoy (para
  los pocos documentos sin FEL). La solicitud de la línea suma `idp: string | null`.

#### 3.3b.5 Tablas de la bandeja

Las dos son **por empresa** (`empresa_id`, `politicaPorEmpresa()`), sin alcance por registro, con `...marcasDeTiempo` y
`...autoria` (quién y cuándo los pone la transacción). Nunca se borran (solo en cascada con la empresa).

##### `libro_de_compras.lotes_de_dte`

Una fila por archivo subido, con su resumen. Es el rastro de cada carga.

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `empresa_id` | uuid | no | FK cascade |
| `proposito` | text | no | check `in ('bandeja','conciliacion')`; `conciliacion` = conciliación liviana (3.3b.9), sin filas en la bandeja |
| `formato` | text | no | check `in ('xlsx','csv')` (detectado por el contenido, no por el nombre) |
| `nombre_del_archivo` | text | no | 1–200, como lo mandó el navegador (solo para mostrar) |
| `sha256` | char(64) | no | check `~ '^[0-9a-f]{64}$'`; volver a subir el mismo archivo da un aviso, no un error |
| `tamano_en_bytes` | integer | no | `> 0` |
| `version_del_mapa` | text | no | la versión del mapa de encabezados con que se leyó (3.3b.6) |
| `emision_desde`, `emision_hasta` | date | sí | la fecha de emisión menor y mayor del archivo; check `emision_hasta >= emision_desde`; los dos o ninguno |
| `filas_leidas` | integer | no | `>= 0` |
| `filas_nuevas`, `filas_actualizadas`, `filas_sin_cambio`, `filas_rechazadas` | integer | no | `>= 0`; check `filas_leidas = filas_nuevas + filas_actualizadas + filas_sin_cambio + filas_rechazadas` |
| `anuladas_en_la_sat` | integer | no | `>= 0`; filas que llegaron anuladas o pasaron a anuladas en este lote |
| `rechazos` | jsonb | no | `'[]'`; `[{ fila, autorizacion, motivo, detalle }]`, check `jsonb_typeof = 'array' and jsonb_array_length(rechazos) <= 1000` (si hay más, el resumen lo dice y se guardan los primeros 1000) |
| `encabezados_no_reconocidos` | jsonb | no | `'[]'`; los títulos del archivo que el mapa no conoce (para ajustar el mapa) |
| `resumen_de_conciliacion` | jsonb | sí | solo en `proposito = 'conciliacion'`: los conteos de cada resultado; check `(proposito = 'conciliacion') = (resumen_de_conciliacion is not null)` |

Únicos e índices: `lotes_de_dte_id_empresa_unico (id, empresa_id)` (FK de la bandeja); `lotes_de_dte_empresa_idx
(empresa_id, creado_en desc)` (lista de lotes).

##### `libro_de_compras.dte_recibidos` (la bandeja)

Una fila por DTE recibido, con sus datos **tal como los dice la SAT**, su estado en la SAT, su estado en la bandeja y lo
que el usuario completa para confirmarlo.

**Datos del DTE (los escribe solo la importación):**

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `empresa_id` | uuid | no | FK cascade |
| `cuenta_id` | uuid | no | `default` cuenta de la transacción; solo para la FK del proveedor (como `documentos`) |
| `autorizacion_fel` | uuid | no | único con la empresa |
| `tipo_dte` | text | no | check con la lista de `TIPOS_DTE` (los que tienen familia; los demás se rechazan al importar) |
| `serie` | text | no | mayúsculas, sin espacios, 1–40 (mismo check que `documentos`) |
| `numero` | text | no | mayúsculas, sin espacios, 1–40 |
| `fecha_emision` | date | no | |
| `nit_emisor` | text | no | normalizado (`Nit`), check `~ '^[0-9]{1,12}[0-9K]$'` |
| `nombre_emisor` | text | no | 1–200, tal cual |
| `nit_receptor` | text | no | normalizado; el de la empresa al importar (si no, se rechaza) |
| `total` | numeric(14,2) | no | `> 0`; siempre positivo (la familia da el signo, como en `documentos`) |
| `iva` | numeric(14,2) | no | `>= 0` |
| `idp` | numeric(14,2) | no | `>= 0`, `default 0` |
| `otros_impuestos` | numeric(14,2) | no | `>= 0`, `default 0`; suma del detalle |
| `otros_impuestos_detalle` | jsonb | no | `'{}'`; `{ "<nombre corto>": "12.50" }` como venga en el Excel |
| `fila_original` | jsonb | no | la fila del archivo, `{ "<encabezado>": "<texto>" }`; check `pg_column_size(fila_original) <= 16384`. Guarda lo que el mapa no usa (columnas que aún no conocemos) |
| `estado_sat` | text | no | check `in ('vigente','anulado')` |
| `anulado_en_la_sat_el` | date | sí | check `(estado_sat = 'anulado') = (anulado_en_la_sat_el is not null)` si el Excel trae la fecha; si solo trae la marca, `estado_sat = 'anulado'` con la fecha del lote (pregunta al tener el archivo) |
| `lote_id` | uuid | no | el **último** lote que trajo la fila; FK `(lote_id, empresa_id) → lotes_de_dte (id, empresa_id)` no action |
| `primer_lote_id` | uuid | no | el lote que la creó; misma FK |

**Estado en la bandeja:**

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `estado` | text | no | `'pendiente'`; check `in ('pendiente','registrado','descartado','bloqueado')` |
| `documento_id` | uuid | sí | el documento registrado; FK `(documento_id, empresa_id) → documentos (id, empresa_id)` no action |
| `motivo_de_descarte` | text | sí | 1–300 |
| `descartado_en`, `descartado_por` | timestamptz, uuid | sí | |
| `motivo_de_bloqueo` | text | sí | check `in ('registrado_en_otra_empresa')` (pregunta L4-c). `recibo_a_la_empresa` **ya no aplica** (L4-c3, 2026-10-20): un `RECI`/`RDON` entra `pendiente` y se registra con el motivo `recibo_fel` |

**Lo que el usuario completa (borrador; se puede llenar en varias sesiones):**

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `proveedor_id` | uuid | sí | lo resuelve la importación por NIT; nulo = proveedor nuevo. FK `(proveedor_id, cuenta_id) → terceros.proveedores (id, cuenta_id)` no action |
| `concepto_id` | uuid | sí | FK `(concepto_id, empresa_id) → conceptos_de_gasto` no action |
| `destino` | text | sí | check como `documentos_destino_valido` |
| `fecha_recepcion` | date | sí | check `>= fecha_emision`; nula = la propone el dominio (3.3b.8) |
| `periodo` | date | sí | check primer día del mes y `>= date_trunc('month', fecha_emision)`; nulo = el propuesto |
| `no_vinculado` | boolean | no | `false` |
| `documento_afectado_id` | uuid | sí | la factura de una nota (el Excel no la trae); FK `(documento_afectado_id, empresa_id) → documentos (id, empresa_id)` no action |

**Restricciones** (nombres `dte_recibidos_<regla>`, además de las de cada columna):
- `registrado_con_documento`: `(estado = 'registrado') = (documento_id is not null)`.
- `descarte_completo`: `(estado = 'descartado') = (motivo_de_descarte is not null and descartado_en is not null and
  descartado_por is not null)`.
- `bloqueo_con_motivo`: `(estado = 'bloqueado') = (motivo_de_bloqueo is not null)`.
- `otros_impuestos_cuadran`: `idp + iva + otros_impuestos <= total` (lo demás es base y exento, que el Excel no separa).
- `nota_con_factura`: `documento_afectado_id is null or tipo_dte in ('NCRE','NDEB')`.

**Únicos e índices:**

| Nombre | Definición | Para |
|---|---|---|
| `dte_recibidos_autorizacion_unica` | unique `(empresa_id, autorizacion_fel)` | upsert y enlace con lo registrado a mano |
| `dte_recibidos_documento_unico` | unique `(documento_id) where documento_id is not null` | un documento, una fila; cubre la FK |
| `dte_recibidos_bandeja_idx` | `(empresa_id, estado, fecha_emision)` | la lista por estado y mes |
| `dte_recibidos_numero_idx` | `(empresa_id, nit_emisor, serie, numero)` | cruce de respaldo de la conciliación |
| `dte_recibidos_proveedor_idx` | `(proveedor_id) where proveedor_id is not null` | FK a `terceros.proveedores` |
| `dte_recibidos_concepto_idx` | `(concepto_id) where concepto_id is not null` | FK |
| `dte_recibidos_afectado_idx` | `(documento_afectado_id) where documento_afectado_id is not null` | FK |
| `dte_recibidos_lote_idx`, `dte_recibidos_primer_lote_idx` | `(lote_id)`, `(primer_lote_id)` | FK |

RLS: `politicaPorEmpresa()` en las dos. Ninguna tiene política de alcance.

**Convivencia con `documentos`:**
- **Registrar a mano enlaza solo:** después de insertar, `RegistrarDocumento` hace `update dte_recibidos set estado =
  'registrado', documento_id = … where empresa_id = … and autorizacion_fel = … and estado <> 'registrado'` (también una
  fila descartada o bloqueada: el usuario decidió registrarla). Quien nunca importa no paga nada: el `update` no
  encuentra filas.
- **Anular o eliminar el documento** devuelve su fila a `pendiente` (`documento_id = null`) en la misma transacción; el
  rastro es la auditoría del documento. La FK es `no action` a propósito: si alguien olvida soltar la fila, la base
  rechaza el borrado.
- **Importar enlaza lo ya registrado:** una fila nueva cuya autorización ya está vigente en `documentos` de la empresa
  entra como `registrado` con su `documento_id`.

#### 3.3b.6 Lectura del archivo y mapa de encabezados

**Formato por contenido** (no por extensión ni `Content-Type`), en `core/intercambio` (lo puede usar otro módulo):

| Primeros bytes | Formato | Qué pasa |
|---|---|---|
| `PK\x03\x04` | `.xlsx` | `ValidadorDeXlsx` y exceljs, como hoy |
| `D0 CF 11 E0 A1 B1 1A E1` | `.xls` (Excel 97–2003) | error `ExcelAntiguoNoAdmitido` (422): «Abra el archivo en Excel y guárdelo como .xlsx» |
| `<html`, `<table` o `<?xml` al inicio (tras espacios o BOM) | HTML o XML con extensión `.xls` (lo hacen algunos portales) | error `ArchivoNoEsExcel` con el mismo consejo; **revisar con el archivo real** |
| Texto (UTF-8 válido o Windows-1252, sin bytes `NUL` en los primeros 8 KB) | CSV | `LectorDeCsv` (nuevo) |
| Otro | — | `ArchivoNoEsExcel` |

**Lectura cruda:** el puerto `LibroDeExcel` suma `leerFilas(contenido): FilaLeida[]` (todas las filas no vacías de la
primera hoja, incluida la 1, con el mismo `valorVisible`); `leer` pasa a apoyarse en él. El `LectorDeCsv` devuelve la misma
forma: separador detectado en la primera línea con datos (`,`, `;` o tabulador), comillas RFC 4180, BOM quitado, cada celda
como texto; límites de 10,000 filas, 200 columnas y 4,000 caracteres por celda. Se recomienda `csv-parse` (sin
dependencias, con `max_record_size`) antes que un lector propio; lo confirma el agente de seguridad.

**Mapa de encabezados** (`aplicacion/dte/mapa-de-encabezados-sat.ts`, datos puros con pruebas; constante versionada
`VERSION_DEL_MAPA`):

```ts
/** Campo del DTE → títulos con que puede venir en el archivo de la SAT (se comparan normalizados). */
export const ENCABEZADOS_DEL_DTE: Record<CampoDelDte, readonly string[]> = {
  autorizacionFel: ['Número de autorización', 'Numero de Autorizacion', 'UUID', 'Autorización'],
  tipoDte: ['Tipo de DTE', 'Tipo DTE', 'Tipo de documento'],
  // … serie, numero, fechaEmision, nitEmisor, nombreEmisor, nitReceptor, moneda, total, iva, idp,
  // estado (o «Anulado»), fechaDeAnulacion
};
/** Columnas de otros impuestos: título → nombre corto que se guarda en el detalle. */
export const OTROS_IMPUESTOS_DEL_DTE: Record<string, readonly string[]> = {
  'TURISMO HOSPEDAJE': ['Turismo Hospedaje', 'Impuesto de turismo hospedaje'],
  // … timbre de prensa, bomberos, tasa municipal, bebidas, tabaco, cemento, tarifa portuaria
};
```

- **Comparación:** `normalizar` de `core/intercambio` más quitar signos de puntuación (`.`, `:`, `#`, `(`, `)`) y la palabra
  «Q» de los montos.
- **Fila de encabezados:** la primera, entre las 20 primeras, que contenga los campos obligatorios (`autorizacionFel`,
  `tipoDte`, `serie`, `numero`, `fechaEmision`, `nitEmisor`, `nombreEmisor`, `total`, `iva`). Si ninguna los tiene, error
  `ArchivoDeLaSatNoReconocido` (422) con `detalles: { faltan: [...], encontrados: [...] }`, para que soporte ajuste el mapa.
- **Valores con variantes** en el mismo archivo: el tipo puede venir como código (`FACT`) o como nombre («Factura»); el
  estado como «Vigente/Anulado», «Sí/No» en una columna «Anulado», o una fecha de anulación. Se interpretan con mapas del
  mismo estilo.
- **Ajuste sin migrar ni desplegar:** variable de instalación `libro-de-compras.dte.encabezados_adicionales` (`niveles:
  ['instalacion']`, `publica: false`, **texto** con JSON, porque el panel solo edita `string`/`number`/`boolean`),
  validada con Zod al leerla: `{ "<campo o impuesto>": ["<título>", …] }`. Solo **agrega** variantes; nunca quita las del
  código. Un JSON inválido se ignora con un registro en el log (no tumba la importación). Pregunta L4-j.
- **Columnas desconocidas:** se guardan en `fila_original` y sus títulos en `lotes_de_dte.encabezados_no_reconocidos`. Si
  una de ellas tiene montos y el DTE no cuadra (3.3b.7), se avisa: puede ser un impuesto que el mapa no conoce.

#### 3.3b.7 Importar a la bandeja (lote)

Caso de uso `ImportarDteRecibidos` (permiso `libro-de-compras.documentos.importar`, límite de frecuencia de siempre). Lee
el archivo **fuera** de la transacción; después, en **una** unidad de trabajo:

1. Exige el NIT de la empresa (`EmpresaSinNit`, como en `RegistrarDocumento`).
2. Convierte cada fila (puras, con pruebas): NIT sin guion y en mayúsculas, fechas `dd/mm/aaaa [hh:mm:ss]` o de Excel
   (en UTC, como `celdas.ts`), montos con comas de miles, montos negativos de las notas a positivo.
3. **Rechaza** la fila (no entra; queda en `lotes_de_dte.rechazos`) si: el NIT receptor no es el de la empresa; la moneda
   no es `GTQ` (si el archivo no trae columna de moneda, se supone `GTQ` y el resumen lo dice); el tipo no tiene familia
   (`FEPE`, `NABN` y cualquier código fuera de `TIPOS_DTE`); faltan datos obligatorios o no se pueden leer; el total es
   cero; `iva + idp + otros > total`; la autorización se repite **dentro del mismo archivo** con datos distintos.
4. **Ya registrado en otra empresa** (la autorización está vigente en `documentos` y la empresa activa no la ve): una
   función `libro_de_compras.autorizacion_registrada_fuera(uuid) returns boolean`, `security definer`, `stable`, dueña la
   del esquema, que solo responde sí o no. Según la pregunta L4-c: se **rechaza** (como pidió el usuario) o entra
   **bloqueada** con `registrado_en_otra_empresa` (recomendado).
5. Resuelve los proveedores con **una** consulta por todos los NIT del archivo (`terceros.terceros` con papel de
   proveedor activo en la cuenta).
6. **Upsert** por `(empresa_id, autorizacion_fel)` en tandas de 500:
   - **Nueva:** `pendiente` (o `registrado` si la autorización ya está vigente en `documentos` de la empresa). Un recibo
     `RECI`/`RDON` a la empresa entra `pendiente`, no bloqueado (L4-c3).
   - **Existente sin cambios:** solo `lote_id`.
   - **Existente con cambios** en los datos del DTE (lo normal: pasó a anulada en la SAT): actualiza los datos del DTE y
     `lote_id`, **no** toca el estado de la bandeja ni lo completado, y audita `corregir` (recurso
     `libro-de-compras.dte-recibidos`, `anterior` = el DTO de la fila, `motivo` = «Lote del <fecha>: <campos>»).
7. Guarda el lote con su resumen y responde `{ lote, avisos }` (archivo repetido por su sha256, moneda supuesta, columnas
   desconocidas, anuladas en la SAT que ya están registradas aquí).

No hay ensayo: cargar la bandeja no registra nada fiscal y se puede volver a subir el archivo cuantas veces haga falta.

#### 3.3b.8 Completar y confirmar

**Completar** (`PATCH /libro-de-compras/dte-recibidos`, `{ ids, cambios }` para varias filas a la vez, y por fila;
permiso `documentos.importar`; no se audita: es borrador). Solo filas `pendiente`. Propuestas que ve el usuario y que se
calculan al mostrar (no se guardan hasta que las acepta o las cambia):

| Campo | Propuesta |
|---|---|
| Proveedor | por NIT (lo resuelve la importación); si no existe, «Proveedor nuevo» con el botón de crearlo (abajo) |
| Concepto | el de la última línea registrada del mismo proveedor en la empresa; si no hay, vacío (obligatorio para confirmar) |
| Destino | el destino sugerido de hoy (`GET …/proveedores/:id/destino-sugerido`) |
| Fecha de recepción | la de emisión (decisión del usuario). En una empresa **agente de retención del IVA** no se toma sola: el usuario la escribe o aplica «Usar la fecha de emisión» a las filas elegidas, porque de ella sale la fecha de la retención |
| Período | el que propone el dominio (mes de recepción, nunca antes del de emisión) |
| No vinculado | no |
| Factura de la nota | solo en `NCRE`/`NDEB`: obligatoria; se elige entre las facturas vigentes del proveedor |

**Montos que se proponen al documento** (función pura `documentoDesdeElDte`, con pruebas; el Excel no separa base y
exento ni trae líneas):
- **Una línea** con el total, el concepto, `idp` del DTE con `idp_escrito = true` si es mayor que cero (y `tipo = 'bien'`)
  y `otros_impuestos` del DTE. Quien quiera varias líneas o galones usa «Abrir en el formulario».
- `ivaDeLaFel` = IVA del DTE.
- Exento: en una familia sin IVA, 0. En las demás, con `R = total − idp − otros_impuestos` y `G = round(iva × (100 + tasa)
  / tasa)`: si `iva = 0`, exento `= R` (motivo `exento`); si `|R − G|` cabe en la tolerancia del IVA, exento 0; si no,
  exento `= R − G` con el aviso «Se dedujo un exento de Q x: revise la factura».

**Vista previa** (`POST …/dte-recibidos/vista-previa`, `{ ids }` hasta 100, permiso `documentos.crear`): corre el cálculo
del formulario (`calcular`) por fila y devuelve, por fila, totales, motivo, retenciones propuestas, avisos o el error.

**Confirmar** (`POST …/dte-recibidos/confirmar`, `{ ids, datosFiscalesPorProveedor? }` hasta 100, permiso
`documentos.crear`). Caso de uso `ConfirmarDteRecibidos`: **por cada fila**, en su propia unidad de trabajo:
1. Bloquea la fila (`for update`); debe estar `pendiente` y con `estado_sat = 'vigente'`; si no, resultado de error.
2. Arma la `SolicitudSinResolver` con los datos del DTE, lo completado y las propuestas (`tipoDte`, `nitEmisor`, serie,
   número, autorización, `nitReceptor`, fechas, período, la línea, `ivaDeLaFel`, `ajustesDeRetenciones: []`,
   `datosFiscalesDelProveedor` del proveedor si vino en `datosFiscalesPorProveedor`).
3. Exige la recepción si la empresa es agente de retención del IVA (`FaltaLaFechaDeRecepcion`, 422, campo
   `fechaRecepcion`).
4. Llama a `RegistrarDocumento.ejecutar` (se une a la transacción): todas las reglas del formulario, incluidos los
   únicos, el destino, la opción C (`faltan_datos_fiscales_del_proveedor`) y las retenciones **propuestas** (quien quiera
   ajustarlas usa el formulario).
5. Marca la fila `registrado` con su `documento_id` (lo hace el mismo enlace de `RegistrarDocumento`).

Responde `{ resultados: [{ id, documentoId, avisos } | { id, error: { codigo, mensaje, detalles } }] }`. Una fila que
falla deja su transacción deshecha y **no** frena las demás. Las filas se procesan en orden de fecha de emisión (las
facturas antes que sus notas).

**«Abrir en el formulario»:** `GET …/dte-recibidos/:id/solicitud` devuelve la solicitud propuesta; el cliente abre el
formulario de L3-8 lleno con ella. Al registrar, el enlace por autorización marca la fila; no hace falta otro campo.

**Proveedor nuevo:** `POST …/dte-recibidos/proveedores`, `{ proveedores: [{ nit, tipo, nombre }] }` (la pantalla los
propone desde las filas sin proveedor, agrupadas por NIT, y el usuario confirma el tipo de persona y el nombre; pregunta
L4-k). Exige `documentos.importar` en la ruta y `proveedores.crear` en el caso de uso (como `retenciones.ajustar`). Por
cada uno, en su transacción:
1. Orden nueva **`terceros.crear_proveedor_desde_dte`** (`core/contratos/terceros.contratos.ts`, la atiende `terceros`):
   `datos: { nit, nombre, tipoDePersona, puedeCrearProveedores }` (el último, porque el mediador no lleva permisos),
   `respuesta: { proveedorId, terceroId, creado: boolean }`. Si el NIT ya es
   de un tercero de la cuenta con papel de proveedor activo, devuelve ese; si lo tiene sin el papel, se lo asigna; si el
   papel está inactivo, error `ProveedorInactivo` (se reactiva en Proveedores); si no existe, crea el tercero (jurídica:
   `razon_social = nombre`; individual: el nombre tal cual en `nombres`, pregunta L4-k) con el papel. Valida con los
   objetos de valor y la unicidad del NIT de `terceros`.
2. Libro de compras guarda los **datos fiscales deducidos del código** con la regla de la opción C de R2 (§3.2b.5): `FPEQ`/
   `FCAP` → `pequeno_contribuyente`; `FARP`/`FCRP` → `primario`; `FPEC`/`FCPC` → `pecuario`; `FACT`/`FCAM` → no se guarda
   nada (se pregunta régimen de ISR y agente de IVA al confirmar, opción C); familias derogadas → no se guarda. Si las
   filas del NIT traen códigos de régimen distinto, manda el de la emisión más reciente.
3. Pone `proveedor_id` en las filas pendientes de ese NIT.

**Descartar y restaurar** (`POST …/dte-recibidos/descartar`, `{ ids, motivo }`, y `POST …/dte-recibidos/:id/restaurar`;
permiso `libro-de-compras.dte-recibidos.descartar`): solo `pendiente` o `bloqueado` → `descartado`; restaurar vuelve a
`pendiente` (o a `bloqueado` si su motivo sigue). Auditoría: `descartar` (acción nueva en `AccionAuditada`) y `reactivar`,
con el DTO de la fila y el motivo.

**Avisos en L5 (sin exigir nada):** al declarar o al ver el libro de un período P, «Quedan N DTE pendientes en la bandeja
que pueden ir en este período» **solo si** la empresa tiene algún lote `bandeja` cuyas fechas de emisión tocan P o los
dos meses anteriores (plazo del art. 20), y hay filas `pendiente` vigentes en la SAT emitidas en ese rango. Quien nunca
importó no ve nada. No bloquea.

#### 3.3b.9 Conciliación por período

**Consulta, no tabla.** Se calcula al pedirla con lo que hay en `dte_recibidos` y `documentos`; nada que mantener cuando
se registra, anula o reimporta.

**Cruce:** primero por **autorización FEL**; lo que no cruza, por **(NIT del emisor, serie, número)** — así se encuentra
un documento a mano con la autorización mal escrita.

**Los dos lados del período P** (el libro se ordena por período y la SAT por fecha de emisión):
- **Lado Arrancar:** documentos **vigentes** de la empresa con `periodo = P` y `muestra_en_reportes_sat`.
- **Lado SAT:** filas de la bandeja **emitidas en el mes P** (cualquier estado), y para buscar los documentos de P emitidos
  antes, **todas** las filas de la empresa.

**Resultados** (`GET /libro-de-compras/dte-recibidos/conciliacion?periodo=AAAA-MM-01`, permiso `documentos.importar`):

| Resultado | Cuándo | Qué ofrece la pantalla |
|---|---|---|
| Cuadra | cruza por autorización y coinciden tipo, NIT, serie, número, fecha, total, IVA, IDP y otros | — |
| Con diferencias | cruza pero difiere algún dato (se listan campo, Arrancar y SAT); IVA con diferencia de centavos incluida: manda el DTE | abrir el documento (anular y registrar de nuevo, o editar mientras se pueda) |
| En la SAT y no en Arrancar | fila emitida en P, vigente en la SAT, sin documento | «Registrar» (bandeja) o descartar |
| Registrado en otro período | fila emitida en P cuyo documento va en otro período | informativo |
| En Arrancar y no en la SAT | documento de P sin fila; si **no hay ningún lote** que cubra su mes de emisión, se muestra como «Sin datos de la SAT para <mes>» en vez de faltante | revisar la factura (posible error de captura o FEL de otro NIT) |
| Anulado en la SAT y vigente aquí | fila `anulado` cuyo documento sigue vigente | «Anular» con causa `fel_anulada_por_el_emisor` (permiso `documentos.anular`) |
| Descartado | fila emitida en P descartada | informativo, con su motivo |

**Conciliación liviana (opcional, para quien no usa la bandeja):** `POST …/dte-recibidos/conciliar?periodo=…` con el
archivo (permiso `documentos.importar`, mismo límite de frecuencia). Usa el mismo lector y el mismo mapa, cruza **en
memoria** las filas del archivo con los documentos y responde los mismos resultados **sin crear filas** en la bandeja.
Guarda solo un `lotes_de_dte` con `proposito = 'conciliacion'` y `resumen_de_conciliacion` (los conteos), para dejar
rastro de quién concilió y cuándo. Como no crea filas, no activa el aviso de L5. Desde su resultado, «Pasar los faltantes
a la bandeja» vuelve a subir el mismo archivo como lote `bandeja` (el cliente aún lo tiene). Recomendación: hacerla, como
paso propio después de la bandeja (pregunta L4-f).

**Cómo se muestra:** pestaña «Conciliación» de la pantalla «DTE de la SAT», con selector de período, una tarjeta por
resultado con su conteo y la lista de cada uno. Operación no exporta (§10): imprimir o exportar la conciliación iría en
Reportes (L5), pregunta L4-g.

#### 3.3b.10 Permisos (PLAN §3.5)

| Permiso | Para | Estado |
|---|---|---|
| `libro-de-compras.documentos.importar` | subir el archivo a la bandeja, ver la bandeja y sus lotes, completar filas, crear proveedores desde la bandeja (más `proveedores.crear`), ver la conciliación y la conciliación liviana | ya previsto en §9; se declara en L4-7 |
| `libro-de-compras.dte-recibidos.descartar` | descartar y restaurar filas | **nuevo** (acción especial con permiso propio) |
| `libro-de-compras.documentos.crear` | vista previa y confirmar (es registrar) | existente |
| `libro-de-compras.documentos.anular` | anular desde la conciliación | existente |
| `proveedores.crear` (de `terceros`) | crear el proveedor nuevo; lo comprueba el caso de uso | existente |

Ninguna migración de permisos: son permisos nuevos de un módulo (el acceso total los recibe solo; `core.rol_permisos` y
`core.usuario_permisos` no se tocan). En el cliente, `v-permiso` oculta el botón «Importar de la SAT» a quien no tiene
`documentos.importar`.

#### 3.3b.11 Seguridad

- **Tamaño:** 5 MB por archivo, `.xlsx` y CSV (`leerArchivoDeExcel` con el mismo tope; 413). Inflado: los topes de
  `ValidadorDeXlsx`.
- **Filas:** hasta **10,000** por archivo (el tope de una consulta de la SAT); 10,001 → `DemasiadasFilas` (pregunta L4-d).
  El motor de Excel sigue en 5,000 para los demás recursos.
- **Formato:** solo `.xlsx` y CSV, detectados por contenido (3.3b.6). **No** se lee `.xls` (BIFF): las librerías que lo
  leen (SheetJS) arrastran avisos de seguridad y la versión de npm no se mantiene; se pide guardarlo como `.xlsx`.
- **CSV:** sin evaluación de fórmulas (se lee como texto y nunca se vuelve a escribir en un Excel sin escapar, A8); topes de
  filas, columnas y largo de celda; codificación detectada sin adivinar más allá de UTF-8 y Windows-1252.
- **Frecuencia:** `limitarImportaciones` (10 por minuto por usuario) en importar y en conciliar; confirmar y vista previa,
  20 solicitudes por minuto por usuario (cada una hasta 100 filas, cada fila un registro completo).
- **El archivo no se guarda** (solo sha256, nombre y tamaño). `fila_original` va con tope de 16 KB.
- **Datos de otra empresa:** la función `autorizacion_registrada_fuera` responde solo sí o no (la unicidad global ya lo
  revela; §13.1). El agente de seguridad la revisa (`security definer` con `search_path` fijo).
- **XML (L4b) y conexión automática con la SAT:** fuera de L4; el XML con XXE y la conexión con credenciales los evalúa
  el agente de seguridad antes de planificarlos.

#### 3.3b.12 Migraciones

Generadas con `npm run bd:generar -w servidor -- libro-de-compras <nombre>` y revisadas a mano. No hay producción ni
documentos en desarrollo: sin datos que convertir. Números tentativos (si al integrar ya existen, se renumeran con el
`when` del `_journal.json` mayor que el de la `0018`).

1. **`0019_l4_otros_impuestos_e_idp_del_dte`** (L4-1): `add column "otros_impuestos" numeric(14,2) default 0 not null`
   en `documentos` y `lineas_de_documento`; `add column "idp_escrito" boolean default false not null` en
   `lineas_de_documento`; `drop`/`add` de `documentos_totales_cuadran`, `lineas_de_documento_totales_cuadran` y
   `lineas_de_documento_idp_calculado`; `add` de los dos `otros_impuestos_no_negativo` y de
   `lineas_de_documento_idp_escrito_positivo`.
2. **`0020_l4_bandeja_de_dte`** (L4-5): `lotes_de_dte` y `dte_recibidos` con sus checks, llaves compuestas (incluida la
   del proveedor hacia `terceros.proveedores (id, cuenta_id)`), índices y políticas.
3. **`0021_l4_autorizacion_registrada_fuera`** (`--custom`, L4-7): la función `security definer` con `set search_path =
   pg_catalog, libro_de_compras`, `revoke all … from public` y `grant execute` a `arrancar_app`.

Ninguna migración en otros esquemas ni de permisos. Los `meta/*_snapshot.json` deben quedar iguales a las tablas.

#### 3.3b.13 Pruebas de integración (PostgreSQL real)

- **Otros impuestos e IDP (checks):** documento y línea que cuadran solo con `otros_impuestos` (pasa) y sin él (falla);
  `otros_impuestos` negativo (falla); línea con `idp_escrito` sin combustible (pasa), con IDP 0 (falla), de servicio
  (falla), con galones y un IDP distinto de la fórmula (pasa), sin `idp_escrito` y con IDP distinto (falla); combustible
  incompleto (sigue fallando).
- **API de documentos:** factura con turismo hospedaje (base sin él; costo con él; motivo nulo); factura toda exenta más
  otros impuestos (motivo `exento`); línea solo de otros impuestos (sin motivo); IDP escrito sin galones; IDP escrito con
  galones que no coinciden (aviso); combustible sin galones ni IDP (422); IDP escrito sin vigencia en la fecha (aviso, no
  error).
- **Bandeja (checks y RLS):** cada `check` de 3.3b.5 con un caso que lo viola; otra empresa de la misma cuenta no ve las
  filas ni los lotes; la FK del proveedor con uno de otra cuenta (falla); eliminar un documento enlazado sin soltar la
  fila (falla la FK).
- **Importar:** archivo de prueba (generado en la prueba, con el mapa) con filas de cada rechazo; reimportar el mismo
  (sin cambios, aviso de sha256); reimportar con una anulada (actualiza, audita `corregir`, no toca lo completado); una
  autorización registrada a mano antes de importar (entra `registrado`); una registrada en otra empresa de **otra cuenta**
  (rechazo o bloqueo según L4-c, sin decir dónde); `.xls`, HTML disfrazado, zip bomba y CSV con `;` y Windows-1252.
- **Confirmar:** lote de tres filas donde la segunda falla (proveedor sin datos fiscales en empresa agente): la primera y
  la tercera quedan registradas y la segunda pendiente; agente de IVA sin recepción (422 por fila); nota sin factura
  (422); fila anulada en la SAT (error de la fila); dos confirmaciones a la vez de la misma fila (una registra, la otra
  ve `registrado`); anular el documento devuelve la fila a `pendiente`.
- **Proveedor nuevo:** crea tercero y papel; asigna el papel a un cliente existente; papel inactivo (error); sin
  `proveedores.crear` (403); datos fiscales deducidos de `FPEQ` guardados y de `FACT` no.
- **Conciliación:** un caso por resultado de 3.3b.9, incluidos el cruce por serie y número con autorización mal escrita y
  «sin datos de la SAT» para un mes sin lote; la liviana no crea filas.
- `politicas-de-los-modulos` y `llaves-entre-esquemas` siguen pasando con las tablas nuevas.

#### 3.3b.14 Pasos (un commit cada uno; servidor y cliente por separado)

Cada commit corre `npm run revisar` y sus pruebas y actualiza la bitácora de `PLAN.md`. **(archivo)** = espera el Excel
real del usuario. Los pasos 1 a 3 son de la **vía a mano** y no dependen de la bandeja: se pueden hacer ya.

1. **L4-1 (servidor, datos) — hecho (2026-10-20):** migración `0019`; tipos de las tablas; pruebas de checks de 3.3b.3 y 3.3b.4.
2. **L4-2 (servidor, dominio y registro a mano) — hecho (2026-10-20):** `otrosImpuestos` e `idp` escrito en `LineaEscrita`, `calcularLineas`,
   `totalesDelDocumento`, motivo `exento`, aviso de IDP que no coincide y de tasa sin vigencia; solicitud, esquemas http,
   DTO de línea y documento, mapeadores; pruebas puras y de API. La base del ISR **no** cambia aquí.
3. **L4-3 (cliente, formulario, ficha y lista) - HECHO 2026-10-20:** «Otros impuestos» plegado en la línea, «Lleva IDP» con «IDP según la
   factura» y combustible y galones opcionales, totales y avisos; ficha con los dos datos; lógica en
   `edicion-de-documento.ts` con pruebas. Ningún archivo pasa de 200 líneas ni la página de 120.
4. **L4-2b (servidor, base del ISR):** solo si el contador confirma L4-c1: sacar los otros impuestos de la base; pruebas.
5. **L4-4 (servidor, core/intercambio) - HECHO 2026-10-20:** `leerFilas` en el puerto y en exceljs, detección de formato, `LectorDeCsv`,
   `ExcelAntiguoNoAdmitido`; pruebas (incluidas bomba zip, `.xls`, HTML y CSV con `;`). Sin lógica de la SAT.
6. **L4-5 (servidor, datos de la bandeja) - HECHO 2026-10-20:** migración `0021` (tablas) y `0022` custom (función `autorizacion_registrada_fuera`, que solo ve las otras empresas de la misma cuenta); dominio de estados, repositorios y pruebas de checks, llaves, RLS y la función. El enlace con `documentos` queda en L4-9.
7. **L4-6 (servidor, lectura del DTE) (archivo):** mapa de encabezados y de valores, fila de encabezados, conversión,
   reglas de rechazo, `documentoDesdeElDte` y la variable `libro-de-compras.dte.encabezados_adicionales`; pruebas puras con
   el archivo real anonimizado como dato de prueba.
8. **L4-7 (servidor, importar) (archivo):** migración `0021`, `ImportarDteRecibidos` (upsert, enlace con lo registrado,
   auditoría `corregir`), rutas de importar, lista y lotes, permiso `documentos.importar`; pruebas de API.
9. **L4-8 (servidor, terceros) - HECHO 2026-10-20:** orden `terceros.crear_proveedor_desde_dte` atendida en `terceros` y caso de uso de
   proveedores desde la bandeja con los datos fiscales deducidos; pruebas.
10. **L4-9 (servidor, completar, confirmar y descartar):** `PATCH`, vista previa, `ConfirmarDteRecibidos` fila por fila,
    solicitud para el formulario, descartar y restaurar (acción `descartar`, permiso `dte-recibidos.descartar`), enlace en
    `RegistrarDocumento` y regreso a `pendiente` al anular o eliminar; pruebas de API.
11. **L4-10 (servidor, conciliación):** consulta por período con sus resultados; pruebas.
12. **L4-11 (cliente, bandeja) (archivo, para el QA):** botón «Importar de la SAT» en Ingreso de facturas (con
    `v-permiso`; nunca como paso obligatorio), página «DTE de la SAT» (pendientes, registrados, descartados, bloqueados;
    resumen del último lote), completar varias filas a la vez, proveedores nuevos, vista previa, confirmar con resultados
    por fila, descartar y «Abrir en el formulario». La lista de facturas solo muestra «N pendientes de la SAT» si hay.
13. **L4-12 (cliente, conciliación):** pestaña por período con sus tarjetas y acciones.
14. **L4-13 (servidor y cliente, conciliación liviana; opcional, si se aprueba L4-f):** `POST …/conciliar` y su pantalla,
    con «Pasar los faltantes a la bandeja».
15. **L4-14 (QA) (archivo):** de punta a punta con el archivo real: importar, crear proveedores, completar, confirmar en
    lote, reimportar con una anulada, conciliar; y la vía a mano con otros impuestos e IDP sin galones, sin pasar nunca por
    la bandeja.

El aviso de L5 (3.3b.8) se programa con L5.

#### 3.3b.15 Preguntas para el usuario (con recomendación)

- **L4-a. Otros impuestos: total o detalle.** (A) un total por línea y documento; (B) detalle por impuesto en una tabla.
  **Recomendación: (A)**, con el detalle guardado en la bandeja para lo importado; ningún otro impuesto cambia el crédito,
  el motivo ni el libro.
- **L4-b. IDP escrito sin combustible.** ¿Se permite registrar el IDP de la factura sin elegir el combustible (el Excel no
  lo trae), o se exige el combustible siempre? **Recomendación: permitirlo**; el combustible y los galones quedan para
  comprobar el IDP de quien los tenga.
- **L4-c. DTE ya registrado en otra empresa:** rechazar la fila (lo que se pidió) o dejarla **bloqueada** en la bandeja.
  **Recomendación: bloqueada**: el usuario la ve en la bandeja y en la conciliación, y se libera sola si la otra empresa
  la anula; rechazada, desaparece hasta la siguiente importación.
- **L4-d. Tope de filas:** 10,000 por archivo (el de la SAT) y 5 MB. **Recomendación: sí**; cargar la bandeja es liviano
  (no pasa cada fila por el registro).
- **L4-e. `.xls` y HTML:** no leerlos y pedir guardarlos como `.xlsx`. **Recomendación: sí**; se revisa con el archivo
  real (si la SAT entrega `.xls`, se valora convertirlo en el navegador).
- **L4-f. Conciliación liviana** (subir el Excel solo para cruzar, sin bandeja). **Recomendación: sí, como paso opcional
  L4-13** después de la bandeja; sirve a quien registra a mano y no le crea pendientes.
- **L4-g. Imprimir o exportar la conciliación:** Operación no exporta. **Recomendación: no en L4**; si se quiere, como
  reporte en L5.
- **L4-h. Recepción en empresas agentes de IVA:** queda vacía hasta que el usuario la escribe o aplica «Usar la fecha de
  emisión» a las filas elegidas. **Recomendación: sí** (un acto explícito por lote, no una fecha supuesta).
- **L4-i. Guardar el archivo subido:** **Recomendación: no**, solo su sha256, nombre y tamaño; la fila original queda en
  `fila_original`.
- **L4-j. Ajustar el mapa en la instalación** (`libro-de-compras.dte.encabezados_adicionales`, solo agrega variantes).
  **Recomendación: sí**; si la SAT cambia un título, soporte lo arregla sin esperar un despliegue.
- **L4-k. Proveedor nuevo:** el tipo de persona y el nombre se proponen (jurídica si el nombre trae «S.A.», «SOCIEDAD»,
  «LIMITADA»…; individual si no) y el usuario los confirma en una ventana antes de crear. **Recomendación: sí**; cómo
  partir nombres y apellidos de una persona individual se decide con el archivo real.
- **L4-l. Confirmar hasta 100 filas por solicitud** (la pantalla manda varias tandas). **Recomendación: sí.**

#### 3.3b.16 Preguntas para el contador (llevar a `contador-guatemala`; ninguna frena L4-1 a L4-3 salvo L4-2b)

- **L4-c1.** ¿Los otros impuestos (turismo, timbre de prensa, bomberos, tasa municipal, bebidas, tabaco, cemento, tarifa
  portuaria) entran en la base de la retención del ISR (régimen opcional y factura especial)? ¿Y en el total con que se
  mide el mínimo de Q2,500 de las retenciones de IVA y en el umbral del 5 % al pequeño contribuyente?
- **L4-c2.** ¿Van en la columna de no afecto/exento del libro de compras, o la SAT espera otra columna? (El usuario decidió
  no afecto; confirmar con el formato vigente.)
- **L4-c3.** Un recibo FEL (`RECI`, `RDON`) emitido al NIT de la empresa: ¿va en el libro, fuera del libro o no se registra?
  **Resuelta (2026-10-20):** fuera del libro de IVA con el motivo `recibo_fel`, sin crédito ni retenciones; en la bandeja
  entra `pendiente` (el bloqueo `recibo_a_la_empresa` ya no aplica).
- **L4-c4.** ¿Es aceptable deducir el exento de una factura como `total − IDP − otros − IVA × 112/12` cuando el Excel no lo
  separa, con aviso al usuario?

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
>
> **R3:** familia `nota_de_debito` (`tipo_dte` NDEB) sobre la misma referencia a la factura, con su motivo, su
> período, sus checks y el tope nuevo de las notas de crédito; ver §3.2c.

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

> **L5 (2026-10-20):** revisada en la §3.9.7: la fila ya no se crea en cada registro con el control apagado, se
> puede declarar siempre (el control solo decide si bloquea) y el historial va en `declaraciones_de_periodos`.

### 3.9 Reportes y cierre (L5) — arquitecto de datos, 2026-10-20

**Respuestas del usuario a L5-a…L5-o (2026-10-20):** se aceptan las recomendaciones del arquitecto. Declarar y el historial
funcionan siempre; el bloqueo de períodos declarados lo enciende la propia empresa desde la página de períodos
(`periodos.declarar`) y apagarlo pide `periodos.reabrir` y motivo. PDF del libro en el servidor con el folio impreso, Van y
Vienen, un solo contador por empresa y el PDF foliado guardado (copia y borrador sin gastar folios). Se bloquea eliminar
un documento con constancia anotada. Menú: Libro, Retenciones y Análisis de compras en Reportes; Períodos en Operación.
**Numeración:** la `0023` la tomó L5-0 (`0023_l5_vigencia_iva_exento`); las migraciones de L5 empiezan en la `0024`.

Estado: **propuesta para aprobar**. Lleva a datos, consultas y pasos lo que pidió el contador en «Qué debe tener L5» y lo
que decidió el usuario el 2026-10-20 (final de `validacion-h7-h11-retenciones.md`). Manda sobre la §3.8, que queda como
antecedente. Sirve a **cualquier régimen**: el libro sale completo o simplificado según la foto
`regimen_iva_de_la_empresa`, nada supone que la empresa sea agente de retención, y la bandeja y la conciliación de L4
siguen siendo opcionales (solo producen avisos si se usaron). Las migraciones siguen a la última de `main`
(`0022_l4_autorizacion_registrada_fuera`).

#### 3.9.1 Lo encontrado

1. **`ControlDePeriodos`** (`aplicacion/puertos/puertos-de-documentos.ts`) tiene un solo método,
   `exigirAbierto(periodo)`, y una sola implementación que no bloquea (`ControlDePeriodosSinBloqueo`). Lo llaman
   `PreparadorDeDocumento.preparar` (que sirve **a la vez** a registrar y a `calcular`, la vista previa),
   `AnularDocumento` y `EliminarDocumento`. Ni la escucha de datos fiscales de la empresa ni `CambiosAlHistorialFiscal`
   lo consultan.
2. **No existe** la variable `libro-de-compras.periodos.control_de_declarados` (la §8 la anunció para L5): hay que
   declararla. Hoy **solo el superacceso** edita la configuración (`configuracion.gestionar` es `soloSuperacceso`), en
   cualquier nivel; el contexto `core/configuracion` expone `establecer` para que otro caso de uso escriba un valor (lo
   usa Apariencia).
3. **`retenciones`** ya tiene `constancia_numero` y `constancia_fecha` (check «los dos o ninguno») y el índice
   `retenciones_mes_idx (empresa_id, fecha)`. El plazo de entero por regla ya existe en el dominio
   (`plazo-de-entero.ts`: día hábil N del mes siguiente o el último día hábil; `avisos-de-retenciones.ts` elige
   `ULTIMO_DIA_HABIL` para `iva_factura_especial`), con el calendario de feriados del core
   (`infraestructura/calendario-de-feriados.ts`).
4. **`documentos_libro_idx (empresa_id, periodo)`** ya cubre el libro; `lineas_de_documento_numero_unico
   (documento_id, numero)` cubre las líneas por documento.
5. **Imprimir** en el proyecto es `window.print()` con un encabezado `print:block` (los siete reportes de Bancos). No
   hay ninguna librería de PDF en el servidor ni en el cliente. Sí hay `core/archivos` con `DocumentosProtegidos.guardar`
   (PDF revisado con qpdf, `recurso_dueno` para servirlo solo desde el módulo dueño; lo usa `bancos.conciliaciones`).
6. **Excel:** `LibroDeExcel.escribir` arma **una** hoja de datos más la de instrucciones; `rutasDeIntercambio` registra
   `GET …/exportar` con un `filtro` Zod. No hay libro de varias hojas.
7. **`vigencias_de_combustible`** todavía **no** tiene la casilla «IVA exento» que el usuario decidió hacer ya (L5-0).
8. `AccionAuditada` ya tiene `reabrir`, `corregir`, `anular` y `quitar` (es un tipo de TypeScript sin check en la base).
9. Hay `politicasDeSoloAgregar()` (insertar y leer, **por cuenta**), pero no su par **por empresa**.
10. En desarrollo no hay documentos, retenciones ni filas en la bandeja (consulta de solo lectura del 2026-10-20; hay
    dos vigencias de combustible): las migraciones no convierten datos.

#### 3.9.2 Decisiones de diseño (resumen)

| Tema | Decisión | Por qué |
|---|---|---|
| Libro | **Consulta**, no tabla: una sola consulta por período da las filas, el resumen, los datos del SAT-2237 y la foto | Los montos ya están fijos en `documentos` y `lineas_de_documento`; una tabla del libro habría que mantenerla con cada alta y baja |
| Reparto de columnas | En el **dominio** (función pura con pruebas), sobre montos por documento y categoría de línea que agrega el SQL | El signo, la columna y el motivo son reglas fiscales: deben poder probarse sin base |
| Completo o simplificado | Según la vigencia del período (`HistorialFiscalDeEmpresa.vigenteEn(P)`); todos los documentos vigentes de P tienen esa misma foto (lo garantiza `VigenciaFiscalEnUso`) | Un período no puede mezclar regímenes |
| PDF | **En el servidor**, con paginación propia (filas fijas por página) | Los folios exigen saber cuántas páginas salen antes de numerarlas y consumirlos en la misma transacción (3.9.5) |
| Último folio | Tabla propia por empresa (`foliacion_del_libro`) más el historial de emisiones (`emisiones_del_libro`), **no** en `periodos` | Los folios corren aunque el control de períodos esté apagado, y son de la empresa, no del período |
| Retenciones por resolver | Columnas en `retenciones`, puestas en `pendiente` al anular el documento | Es un dato 1 a 1 con la retención; la auditoría guarda su historia |
| Enteros | Tabla nueva `enteros_de_retenciones` por mes y grupo, con pagos complementarios | El entero es un hecho propio (fecha, formulario, monto) que no pertenece a ninguna retención |
| Períodos | `periodos` (estado) más `declaraciones_de_periodos` (historial de solo agregar, con la foto en `jsonb`) | La foto permite comparar y rectificar; el historial no se corrige |
| Declarar sin control | **Se puede declarar siempre**; el control (apagado por omisión) solo decide si un período declarado **bloquea** | Quien no quiere bloqueos igual gana el historial, el número del SAT-2237 y el aviso de «cambió después de declarar» (pregunta L5-a) |
| Bandeja y conciliación | Solo avisos, y solo si la empresa tiene lotes que tocan el período | Aclaración del usuario del 2026-10-19 |

#### 3.9.3 Libro del período

**Qué entra:** documentos de la empresa activa con `periodo = P`, `estado = 'vigente'` y `muestra_en_reportes_sat`.
Esto incluye las familias sin IVA (pequeño contribuyente, primario y pecuario, y las derogadas con emisión anterior a la
derogación), la factura especial, las notas de crédito y de débito y todo documento sin crédito con su motivo.

**Qué no entra:** los anulados (van al anexo, 3.9.3.4); los eliminados (solo la auditoría los recuerda); todo lo que
está fuera del libro (`motivo_fuera_del_libro`: `sin_fel`, `fel_a_consumidor_final`, `fel_a_otro_nit`, `recibo_fel`,
incluidos los RECI y RDON); las filas de la bandeja que no se registraron.

##### 3.9.3.1 Consulta (una por período)

En `infraestructura/persistencia/consultas-del-libro.drizzle.ts`, con `transaccionEnCurso()` (RLS de la empresa) y además
el filtro explícito por empresa:

```sql
select d.id, d.tipo, d.tipo_dte, d.fecha_emision, d.serie, d.numero,
       case when d.tipo = 'factura_especial' then d.nit_receptor else d.nit_emisor end as nit_del_proveedor,
       d.nombre_emisor, d.proveedor_id, d.motivo_sin_credito, d.regimen_iva_de_la_empresa,
       d.total, d.base, d.iva, d.iva_no_acreditable, d.idp, d.exento, d.otros_impuestos,
       c.categoria, c.base as base_de_la_categoria, c.iva as iva_de_la_categoria,
       c.iva_no_acreditable as iva_al_costo_de_la_categoria, c.exento_y_no_afecto, c.combustible_exento
from libro_de_compras.documentos d
cross join lateral (
  select case when l.vigencia_de_combustible_id is not null or l.idp > 0 then 'combustible'
              when l.es_activo_fijo then 'activo_fijo'
              else l.tipo end as categoria,                       -- 'bien' | 'servicio'
         sum(l.base) as base, sum(l.iva) as iva, sum(l.iva_no_acreditable) as iva_no_acreditable,
         sum(l.exento + l.otros_impuestos) as exento_y_no_afecto,
         coalesce(bool_or(v.iva_exento), false) as combustible_exento
  from libro_de_compras.lineas_de_documento l
  left join libro_de_compras.vigencias_de_combustible v
         on v.id = l.vigencia_de_combustible_id and v.empresa_id = l.empresa_id
  where l.documento_id = d.id and l.empresa_id = d.empresa_id
  group by 1
) c
where d.empresa_id = $empresa and d.periodo = $periodo and d.estado = 'vigente' and d.muestra_en_reportes_sat
order by d.fecha_emision, d.tipo_dte, d.serie, d.numero, d.id;
```

Devuelve una fila por documento y categoría (casi siempre una o dos). El repositorio las agrupa por documento y las pasa
en **centavos** al dominio: `FilaDelLibro.desde(documento, categorias)` (función pura, `dominio/libro/fila-del-libro.ts`).

- **NIT del vendedor en la FESP:** `nit_receptor` (NIT o CUI del vendedor, R2) y `nombre_emisor` (su nombre, R2-d).
- **Signo:** `nota_de_credito` → todos los montos **negativos**; `nota_de_debito` → **positivos** (se guarda positivo y
  suma al crédito, §3.2c.11). Todas las demás, positivas. Las notas van en el mes en que se reciben (check
  `nota_en_su_mes`), así que ya caen en su período.
- **Orden cronológico** (AG 5-2013 art. 38): por fecha de emisión, código DTE, serie y número. El número de fila (`Nº`)
  se da al armar. (Confirmar con el contador que el orden es por emisión y no por recepción, pregunta L5-C6.)

##### 3.9.3.2 Columnas

**Libro completo** (empresa con crédito, `regimen_iva_de_la_empresa = 'general'`), en este orden; dinero con signo:

| # | Columna | De dónde sale |
|---|---|---|
| 1 | Nº | correlativo de la fila en el período |
| 2 | Fecha | `fecha_emision` |
| 3 | Tipo | `tipo_dte` (FACT, FCAM, FPEQ, FESP, NCRE, NDEB…); la leyenda de códigos va al final |
| 4–5 | Serie, Número | |
| 6 | NIT del proveedor | `nit_emisor`; en la FESP, `nit_receptor` (NIT o CUI del vendedor) |
| 7 | Nombre del proveedor | `nombre_emisor` (en la FESP, el vendedor) |
| 8 | Bienes | `base` de las categorías `bien` y `activo_fijo` (activos fijos dentro de bienes: el SAT-2237 los separa en 3.9.4; pregunta L5-n) |
| 9 | Servicios | `base` de la categoría `servicio` |
| 10 | Combustibles | `base` de la categoría `combustible` |
| 11 | Pequeño contribuyente | `base` del documento con motivo `pequeno_contribuyente` (también la familia electrónica derogada); en estos documentos las columnas 8–10 quedan en cero |
| 12 | Primario, pecuario y agropecuario | `base` con motivo `primario_pecuario` o `contribuyente_agropecuario` (regímenes sin IVA); columnas 8–10 en cero |
| 13 | Exento y no afecto | `exento + otros_impuestos` (decisión del usuario, L4-c2) |
| 14 | IDP | `idp`, columna propia (decisión del usuario) |
| 15 | IVA crédito fiscal | `iva − iva_no_acreditable` |
| 16 | IVA sin crédito | `iva_no_acreditable` (al costo) |
| 17 | Motivo | código corto del motivo cuando lo hay (FP fuera de plazo, NV no vinculado, ESC empresa sin crédito, NDT nota de débito tardía, PC, RE, EX); leyenda al final |
| 18 | Total | `total` |

Cuadre por fila (prueba pura y de integración): `8 + 9 + 10 + 11 + 12 + 13 + 14 + 15 + 16 = 18`. Se cumple porque
`total = base + iva + idp + exento + otros_impuestos` en el documento y la suma de las bases de sus categorías es su
`base`.

**Libro simplificado** (cualquier otro régimen: pequeño contribuyente, primario y pecuario, no afiliado y los derogados):
sin columnas de crédito ni motivo, el IVA es **informativo** (va al costo).

| Nº | Fecha | Tipo | Serie | Número | NIT | Nombre | Bienes | Servicios | Exento y no afecto | IDP | IVA (informativo) | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|

Bienes = `base` de `bien`, `activo_fijo` y `combustible`; servicios = `base` de `servicio`; en las familias sin IVA la base
se reparte igual por categoría de línea. El pequeño contribuyente lleva un solo libro de compras y ventas (Ley del IVA
art. 49): Arrancar da **la mitad de compras**, y la pantalla lo dice.

**Exportadores:** todo se reporta como compras locales vinculadas a operaciones gravadas, con el aviso «Si exporta o
tiene ventas exentas, separe la vinculación con su contador (prorrata, pendiente)» (decisión del usuario).

##### 3.9.3.3 Resumen mensual

Lo arma el dominio con las filas (`ResumenDelLibro`, puro):
- Totales de cada columna del libro (con signo).
- Por código DTE: cantidad y total (FACT, FCAM, FPEQ…, NCRE en negativo, NDEB, FESP).
- **Crédito fiscal del período** = Σ columna 15 (facturas, FESP y NDEB menos notas de crédito).
- **IVA sin crédito por motivo:** una fila por motivo con su suma (lo que fue al costo).
- Combustibles: base, IDP, IVA y, aparte, lo **exento por el Decreto 22-2026** (líneas con vigencia `iva_exento`).
- Sin débito, remanente ni impuesto a pagar: son de la declaración, que también lleva las ventas (fuera de este módulo).

##### 3.9.3.4 Anexo de anulados (solo pantalla y Excel)

```sql
select d.id, d.tipo_dte, d.fecha_emision, d.serie, d.numero, <nit del proveedor como arriba>, d.nombre_emisor,
       d.total, d.iva, d.causa_de_anulacion, d.motivo_de_anulacion, d.anulado_en, u.nombres, u.apellidos
from libro_de_compras.documentos d
left join core.usuarios u on u.id = d.anulado_por
where d.empresa_id = $empresa and d.periodo = $periodo and d.estado = 'anulado' and d.muestra_en_reportes_sat
order by d.fecha_emision, d.serie, d.numero;
```

No entra en el PDF foliado (decisión del usuario). Los montos van positivos (no suman al libro).

##### 3.9.3.5 Índices

Ninguno nuevo. `documentos_libro_idx (empresa_id, periodo)` filtra el período (un período tiene de decenas a pocos miles
de filas; el filtro de `estado` y la casilla se aplican sobre ese rango); las líneas entran por
`lineas_de_documento_numero_unico (documento_id, numero)`; la vigencia por su PK. Un índice parcial `(empresa_id,
periodo) where estado = 'vigente' and muestra_en_reportes_sat` no se justifica con estos volúmenes; se revisa con
`explain` en la prueba de carga de L5-10.

##### 3.9.3.6 API, Excel y permisos

| Ruta | Permiso | Responde |
|---|---|---|
| `GET /libro-de-compras/libro?periodo=AAAA-MM-01` | `libro-de-compras.libro.ver` | `{ tipoDeLibro, empresa: { nombre, nit }, filas, resumen, avisos }` (montos como texto) |
| `GET /libro-de-compras/libro/anulados?periodo=…` | `libro.ver` | filas del anexo |
| `GET /libro-de-compras/libro/exportar?periodo=…` | `libro-de-compras.libro.exportar` | `.xlsx` con tres hojas: **Libro**, **Resumen** y **Anulados** |

Excel: Reportes exporta y no importa. Para un solo archivo con tres hojas, el puerto `LibroDeExcel` suma
`escribirVarias(hojas: HojaParaEscribir[])` (cambio pequeño del core, con su prueba) y la ruta se registra a mano (no por
`rutasDeIntercambio`, que da una hoja). Las celdas de texto pasan por el mismo escape de fórmulas que el motor. Pregunta
L5-f.

Avisos del libro (no bloquean): bandeja con pendientes que pueden ir en P (§3.3b.8, solo si hay lotes); período sin
declarar anterior a P; documentos con `fuera_de_plazo` en P; exportador «todo local»; combustibles del Decreto 22-2026.

#### 3.9.4 Datos para el SAT-2237

Solo para períodos con libro completo (régimen general). El pequeño contribuyente declara en el SAT-2046, que no lleva
compras: la pantalla lo dice y no muestra rubros. **Los números y nombres de casilla esperan la captura del SAT-2237
vigente que conseguirá el usuario**: el servidor entrega rubros con nombre propio, y un mapa del dominio
(`dominio/libro/casillas-del-sat-2237.ts`, datos puros con su versión) los lleva a casillas cuando llegue la captura,
sin migrar.

##### 3.9.4.1 Rubros (de la misma consulta del libro)

Cada rubro trae, en centavos con signo: `base`, `ivaCredito`, `ivaSinCredito`, `exentoYNoAfecto` y, **por separado**,
lo de facturas (y FESP), lo de notas de débito y lo de notas de crédito, más el neto. Así el mapa puede poner las notas
donde las pida el formulario (restando del crédito o en una casilla propia; pregunta L5-C2) sin cambiar la consulta.

| Rubro | Qué entra |
|---|---|
| `combustibles` | categoría `combustible` de documentos con IVA |
| `activos_fijos` | categoría `activo_fijo` |
| `servicios` | categoría `servicio` |
| `otras_compras` | categoría `bien` |
| `importaciones` | **reservado** (DUCA, después de CP1): siempre cero, con la nota «sin DUCA en Arrancar» |
| `pequeno_contribuyente` | documentos con motivo `pequeno_contribuyente` |
| `regimenes_sin_iva` | `primario_pecuario` y `contribuyente_agropecuario` |
| `exento_y_no_afecto` | `exento + otros_impuestos` de todas las categorías |
| `combustibles_exentos` | líneas de combustible con vigencia `iva_exento` (Decreto 22-2026): su exento, aparte, con la marca |

Avisos fijos de la pantalla: «Medicamentos y vehículos tienen casillas propias en el SAT-2237: Arrancar no los separa;
revise sus compras» (decisión del usuario), «Importaciones: sin DUCA en Arrancar».

##### 3.9.4.2 Segmento 9 (cantidad de operaciones)

Conteos de documentos del libro de P por código DTE: facturas recibidas (FACT, FCAM), de pequeño contribuyente (FPEQ,
FCAP, FAPE, FCPE), de regímenes sin IVA (FARP, FCRP, FPEC, FCPC, FACA, FCCA, FAAE, FCAE), facturas especiales emitidas
(FESP), notas de crédito recibidas (NCRE) y notas de débito recibidas (NDEB). El mapa de casillas decide cuáles suma
cada casilla.

##### 3.9.4.3 Detalle de proveedores

El SAT-2237 exige el detalle de los proveedores locales del crédito: NIT, nombre, cantidad de facturas, base y crédito.
Del mismo conjunto de filas, agrupado por **NIT del proveedor** (el que sale en el libro, no `proveedor_id`):

- Entran los documentos **con crédito** (`motivo_sin_credito is null`): facturas, NDEB y notas de crédito.
- **Notas (recomendación, pregunta L5-g):** se **netean** en su proveedor: `base = Σ signo × base`, `crédito = Σ signo
  × (iva − iva_no_acreditable)`; «cantidad de facturas» cuenta solo facturas (`factura`, y FESP si el contador la deja
  entrar); la pantalla muestra además cuántas NCRE y NDEB tiene cada proveedor. Un proveedor que queda en cero o
  negativo (nota de crédito de una factura de otro período) se muestra **con aviso** y no se omite: el contador decide
  cómo declararlo.
- **FESP:** hasta que conteste el contador (pregunta L5-C3) va en una fila aparte «Facturas especiales (vendedores sin
  inscripción)» y no en el detalle por NIT.
- Nombre: el `nombre_emisor` del documento más reciente de ese NIT.
- Orden: por crédito de mayor a menor. Si el formulario limita filas (en 2019 eran diez), la pantalla marca las que
  entran y suma el resto en «Otros» según lo que diga la captura.

##### 3.9.4.4 API y Excel

| Ruta | Permiso |
|---|---|
| `GET /libro-de-compras/libro/sat-2237?periodo=…` → `{ rubros, segmento9, proveedores, facturasEspeciales, casillas (con la versión del mapa o null), avisos }` | `libro.ver` |
| `GET /libro-de-compras/libro/sat-2237/exportar?periodo=…` → `.xlsx` con hojas **Rubros**, **Operaciones** y **Proveedores** | `libro.exportar` |

#### 3.9.5 PDF del libro con folios

##### 3.9.5.1 Servidor o cliente

| Opción | A favor | En contra |
|---|---|---|
| (A) `window.print()` del cliente, como Bancos | Ya existe; sin dependencias | El navegador decide los saltos de página: el servidor no sabe cuántas páginas salieron, no puede numerar folios con certeza ni consumirlos; cambia con el navegador, el papel y los márgenes |
| (B) PDF en el cliente (jsPDF o similar) | Sin carga en el servidor | El cliente diría cuántos folios usó: dato no confiable, y dos usuarios a la vez podrían repetir folios |
| (C) **PDF en el servidor** con paginación propia | Páginas conocidas **antes** de dibujar; folios consumidos en la misma transacción; mismo PDF en cualquier equipo; se guarda como evidencia | Una dependencia nueva y algo de CPU |

**Recomendación: (C).** El resto de los reportes de L5 (retenciones, análisis) siguen con `window.print()` como Bancos:
no llevan folios.

- **Paginación en el dominio** (`paginarLibro(filas, filasPorPagina)`, pura con pruebas): un número fijo de filas por
  página (p. ej. 32 en oficio horizontal, constante del código), nombres recortados con «…» para que cada fila ocupe una
  línea, subtotales **«Van»** al pie y **«Vienen»** al inicio de cada página, y el resumen mensual en la última. Así se
  sabe cuántas páginas habrá antes de dibujar.
- **Dibujo** con `pdfmake` (sobre `pdfkit`, JavaScript puro, sin Chromium): tablas, encabezado por página (razón social,
  NIT, «Libro de compras y servicios» o «Libro de compras (simplificado)», período, folio) y pie. La dependencia la
  revisa el agente de seguridad antes de instalarla (alternativa: `pdfkit` solo). Fuente incrustada en el repositorio.
- **Borrador:** el mismo PDF con «BORRADOR — sin folio» en lugar del número, sin consumir nada (`libro.ver`).

##### 3.9.5.2 Dónde se guarda el último folio

Opciones: (1) columnas de folio en `periodos`; (2) tabla por empresa con el contador más el historial de emisiones; (3)
solo el historial, con el último folio como `max(folio_hasta)`. **Recomendación: (2).** Con (1) los folios dependerían
del control de períodos, que es opcional, y el folio es de la empresa, no del período; con (3) no hay fila que bloquear
ni dónde anotar el folio con que empieza una empresa que ya tenía hojas usadas.

**`libro_de_compras.foliacion_del_libro`** (una fila por empresa; se crea al primer uso):

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `empresa_id` | uuid | no | **PK**; FK `core.empresas(id)` on delete cascade |
| `ultimo_folio` | integer | no | `default 0`; check `ultimo_folio >= 0` |
| marcas y autoría | | | |

RLS `politicaPorEmpresa()`. Corregir el último folio (empresa que viene de hojas usadas o de otro sistema):
`PUT /libro-de-compras/libro/foliacion { ultimoFolio, motivo }` (`libro.emitir`), nunca por debajo del mayor
`folio_hasta` emitido en Arrancar (`FolioMenorQueLoEmitido`, 422); auditoría `corregir`, recurso
`libro-de-compras.foliacion-del-libro`, `registroId = empresaId`, `anterior = { ultimoFolio }`.

**`libro_de_compras.emisiones_del_libro`** (historial de solo agregar):

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `empresa_id` | uuid | no | FK cascade |
| `periodo` | date | no | check primer día del mes |
| `tipo_de_libro` | text | no | check `in ('completo','simplificado')` |
| `folio_desde`, `folio_hasta` | integer | no | check `folio_desde >= 1 and folio_hasta >= folio_desde` |
| `paginas` | smallint | no | check `paginas = folio_hasta - folio_desde + 1` |
| `archivo_id` | uuid | sí | FK `core.archivos(id)` no action (índice propio); el PDF guardado (pregunta L5-c) |
| `huella_de_datos` | char(64) | no | sha256 de las filas del libro (ids y montos, en orden): dice si los datos cambiaron desde esta emisión |
| `version_de_plantilla` | smallint | no | la del dibujo; una copia con otra versión podría paginar distinto |
| `totales` | jsonb | no | el resumen mensual en texto; check `pg_column_size(totales) <= 65536` |
| `motivo` | text | sí | 1–300; **obligatorio** si ya hay otra emisión del mismo período (se valida en el caso de uso) |
| `creado_en`, `creado_por` (autoría) | | | |

Restricciones e índices: `emisiones_del_libro_folio_unico (empresa_id, folio_desde)`; exclusión
`emisiones_del_libro_sin_traslape` `exclude using gist (empresa_id with =, int4range(folio_desde, folio_hasta, '[]')
with &&)` (`btree_gist` ya está; va en una migración `--custom` porque drizzle-kit no escribe exclusiones, como la
`0004`); `emisiones_del_libro_periodo_idx (empresa_id, periodo, creado_en desc)`; `emisiones_del_libro_archivo_idx
(archivo_id) where archivo_id is not null`. RLS: insertar y leer por empresa (3.9.10). Una emisión nunca se corrige: la
«sustituida» se deriva (hay otra posterior del mismo período).

##### 3.9.5.3 Emitir (caso de uso `EmitirLibroFoliado`, `POST /libro-de-compras/libro/emisiones { periodo, motivo? }`, permiso `libro-de-compras.libro.emitir`)

En una unidad de trabajo:
1. `insert … on conflict do nothing` y `select … for update` de `foliacion_del_libro` (dos emisiones de la misma
   empresa se ordenan; las de otras empresas no se esperan).
2. Lee las filas del libro (después del bloqueo) y calcula la huella. Si ya hay una emisión del período con la misma
   huella y la misma versión de plantilla, responde 409 `EmisionSinCambios` y ofrece la **copia** (no gasta folios).
3. Pagina, dibuja con `folio_desde = ultimo_folio + 1`, guarda el PDF con `DocumentosProtegidos.guardar` (recurso dueño
   `libro-de-compras.emisiones-del-libro`), inserta la emisión y sube `ultimo_folio`.
4. Responde la emisión; el cliente baja el PDF por `GET /libro-de-compras/libro/emisiones/:id/pdf` (`libro.ver`, que
   también sirve para la **copia** de una emisión anterior: el mismo archivo, los mismos folios).

Límite: 5 emisiones por minuto por usuario; `statement_timeout` del caso de uso holgado (un período de 5,000 filas son
unas 160 páginas). Con el control de períodos encendido, el libro de un período abierto se puede emitir con el aviso
«El período no está declarado: si cambia, tendrá que emitirlo de nuevo con folios nuevos».

`GET /libro-de-compras/libro/pdf?periodo=…` (`libro.ver`): el borrador, sin guardar nada.

#### 3.9.6 Retenciones

##### 3.9.6.1 Reporte por mes, impuesto y regla

```sql
select r.id, r.impuesto, r.regla, r.base, r.porcentaje, r.monto, r.fecha, r.constancia_numero, r.constancia_fecha,
       r.resolucion, d.id as documento_id, d.estado as estado_del_documento, d.tipo_dte, d.serie, d.numero,
       d.fecha_emision, <nit del proveedor como en el libro>, d.nombre_emisor
from libro_de_compras.retenciones r
join libro_de_compras.documentos d on d.id = r.documento_id and d.empresa_id = r.empresa_id
where r.empresa_id = $empresa and r.fecha >= $mes and r.fecha < ($mes::date + interval '1 month') and r.monto > 0
order by r.impuesto, r.regla, r.fecha, d.serie, d.numero;
```

Cubre `retenciones_mes_idx (empresa_id, fecha)`. El mes es el de `retencion.fecha` (recepción en el IVA, emisión en el
ISR, Decreto 10-2012 art. 48). Las retenciones de documentos **anulados** salen en una sección aparte y no suman al
«retenido del mes». Las quitadas (monto 0) no salen (son rastro de la propuesta; se ven en la ficha del documento).

**Grupos de entero** (constante del dominio `GRUPO_DE_ENTERO`, con su prueba que recorre las reglas del check):

| Grupo | Reglas | Plazo |
|---|---|---|
| `iva_agentes` | `iva_exportador_agropecuario`, `iva_exportador`, `iva_contribuyente_especial`, `iva_otro_agente`, `iva_sector_publico`, `iva_pequeno_contribuyente` | día hábil `dias_habiles_entero_iva` (15) del mes siguiente |
| `isr_opcional` | `isr_opcional_simplificado` | día hábil `dias_habiles_entero_isr` (10) |
| `iva_factura_especial` | `iva_factura_especial` | último día hábil del mes siguiente (SAT-2085) |
| `isr_factura_especial` | `isr_factura_especial` | día hábil `dias_habiles_entero_isr` (10) |

El plazo se calcula **por mes y grupo** con `fechaLimiteDeEntero` y el calendario de feriados del core (los años del
reporte y el siguiente). El reporte da, por grupo: retenido del mes (documentos vigentes), plazo, estado del entero
(3.9.6.4) y la lista de retenciones con su constancia.

`GET /libro-de-compras/retenciones?mes=AAAA-MM-01&grupo=&constancia=con|sin|todas` (`libro-de-compras.retenciones.ver`);
`GET …/retenciones/exportar` (`libro-de-compras.retenciones.exportar`, una hoja con los mismos filtros, por el motor de
intercambio). Imprimir: `window.print()`.

##### 3.9.6.2 Anotar constancia (`libro-de-compras.retenciones.constancias`)

Las constancias las emite la SAT en Retenciones Web; Arrancar solo **anota** su número y fecha en las columnas que ya
existen.

- **Una a una:** `PUT /libro-de-compras/retenciones/:id/constancia { numero, fecha }`.
- **En lote:** `POST /libro-de-compras/retenciones/constancias { constancias: [{ retencionId, numero, fecha }] }`, hasta
  200, **todo o nada** con errores por fila (`detalles.filas[i].campo`), como la importación (pregunta L5-i). La pantalla
  arma la lista desde las filas marcadas del reporte.
- **Quitar:** `DELETE /libro-de-compras/retenciones/:id/constancia { motivo }`.
- Reglas: solo retenciones con `monto > 0`; también de documentos anulados (la constancia pudo emitirse antes de anular);
  `numero` 1–40, sin espacios, en mayúsculas (se afina con el PDF de una constancia real); `fecha >= retencion.fecha` (si
  no, error `ConstanciaAnteriorALaRetencion`, campo `fecha`). Mismo número en **otro proveedor**: aviso, no error (no
  sabemos aún si una constancia de ISR cubre varias facturas; pregunta L5-C4).
- Auditoría: anotar por primera vez no se audita (es un alta); **cambiarla** se audita `corregir` y **quitarla**
  `quitar`, recurso `libro-de-compras.retenciones`, `anterior` = la retención con su constancia.
- **Eliminar un documento** cuya retención tiene constancia queda prohibido (`DocumentoConConstancia`, 422: «Anúlelo»),
  igual que si su mes y grupo ya está enterado: el rastro debe quedar.

##### 3.9.6.3 «Por resolver»

Una retención practicada (`monto > 0`) cuyo documento se **anula** queda por resolver: hay que anular la constancia en
Retenciones Web o rectificar el entero, o confirmar que no hacía falta.

**Columnas nuevas en `retenciones`:**

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `resolucion` | text | sí | nulo = nada que resolver; check `in ('pendiente','constancia_anulada','rectificada','no_requiere')` |
| `nota_de_resolucion` | text | sí | 1–300 |
| `resuelta_en` | timestamptz | sí | |
| `resuelta_por` | uuid | sí | |

Checks (`retenciones_<regla>`): `resolucion_solo_practicada`: `resolucion is null or monto > 0`;
`resolucion_completa`: `(resolucion in ('constancia_anulada','rectificada','no_requiere')) = (resuelta_en is not null
and resuelta_por is not null and nota_de_resolucion is not null)`. Índice parcial `retenciones_por_resolver_idx
(empresa_id) where resolucion = 'pendiente'` (el contador del menú). Que el documento esté anulado no lo puede revisar un
check (otra tabla): lo hace el dominio.

- `AnularDocumento` pone `resolucion = 'pendiente'` en sus retenciones con `monto > 0`, en la misma transacción, y avisa
  «Quedan N retenciones por resolver».
- `PUT /libro-de-compras/retenciones/:id/resolucion { resolucion, nota }` (`retenciones.constancias`): solo de un
  documento anulado; se puede volver a `pendiente` (corrección). Auditoría `corregir`, `anterior` = la retención.
- `GET /libro-de-compras/retenciones/por-resolver?estado=pendiente|resueltas` (`retenciones.ver`), con documento,
  constancia y si su mes y grupo estaba enterado (para sugerir `rectificada`).
- Las retenciones anuladas que quedan en `pendiente` aparecen como aviso al declarar (3.9.7.6) y en el inicio de
  Retenciones.

##### 3.9.6.4 Marcar enterado (`libro_de_compras.enteros_de_retenciones`)

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `empresa_id` | uuid | no | FK cascade |
| `mes` | date | no | check primer día del mes |
| `grupo` | text | no | check `in ('iva_agentes','isr_opcional','iva_factura_especial','isr_factura_especial')` |
| `fecha_de_pago` | date | no | check `fecha_de_pago >= mes` |
| `documento_de_pago` | text | no | número de formulario o boleta; 1–40, sin espacios |
| `monto` | numeric(14,2) | no | `> 0` |
| `retenido_al_marcar` | numeric(14,2) | no | `>= 0`; foto de lo retenido del mes y grupo (documentos vigentes) cuando se marcó |
| `observaciones` | text | sí | 1–300 |
| `estado` | text | no | `'vigente'`; check `in ('vigente','anulado')` |
| `anulado_en`, `anulado_por`, `motivo_de_anulacion` | | sí | check «los tres o ninguno» con `estado = 'anulado'` |
| marcas y autoría | | | |

Índice `enteros_de_retenciones_mes_idx (empresa_id, mes, grupo)`. RLS `politicaPorEmpresa()`. **Varios pagos por mes y
grupo** (original y complementarios; pregunta L5-h): sin único. Estado derivado por mes y grupo: `sin_retenciones`,
`pendiente` (en plazo), `vencido`, `enterado` (Σ montos vigentes = retenido actual) o `con_diferencia` (distinto; por
ejemplo, un documento anulado o registrado después de pagar).

Rutas (`libro-de-compras.retenciones.enterar`, permiso **nuevo**): `POST /libro-de-compras/retenciones/enteros`,
`PUT …/enteros/:id` (corregir: auditoría `corregir`), `POST …/enteros/:id/anular { motivo }` (auditoría `anular`, recurso
`libro-de-compras.enteros-de-retenciones`). `GET …/retenciones/enteros?anio=` (`retenciones.ver`): la matriz mes × grupo
con retenido, plazo, pagado y estado.

Efectos (avisos, no bloqueos): registrar un documento con una retención en un mes y grupo ya enterado → «Ese mes ya se
enteró: pague la diferencia (pago complementario)»; anular uno → además de «por resolver», «Ese mes ya se enteró:
rectifique». Marcar enterado sin retenciones en el mes y grupo → error `SinRetencionesQueEnterar`.

#### 3.9.7 Períodos declarados

##### 3.9.7.1 `libro_de_compras.periodos` (revisa la §3.8)

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `empresa_id` | uuid | no | PK compuesta; FK `core.empresas(id)` cascade |
| `periodo` | date | no | PK compuesta; check primer día del mes |
| `estado` | text | no | `'abierto'`; check `in ('abierto','declarado')` |
| `declarado_en` | timestamptz | sí | |
| `declarado_por` | uuid | sí | check `(estado = 'declarado') = (declarado_en is not null and declarado_por is not null)` |
| marcas y autoría | | | |

RLS `politicaPorEmpresa()`. Una fila existe solo si el período se declaró alguna vez **o** el control está encendido y
alguien registró en él (3.9.7.3). Sin fila = abierto. Nunca se borra.

**Cambio respecto de la §3.8:** la fila ya no se crea en cada registro con el control apagado (no hace falta bloquear);
el número del formulario y la fecha viven en el historial, no aquí.

##### 3.9.7.2 Historial: `libro_de_compras.declaraciones_de_periodos` (solo agregar)

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `empresa_id` | uuid | no | FK cascade |
| `periodo` | date | no | FK `(empresa_id, periodo) → periodos` no action |
| `secuencia` | smallint | no | 1, 2, 3… por período; único `(empresa_id, periodo, secuencia)` (cubre la FK) |
| `evento` | text | no | check `in ('declaracion','reapertura','rectificacion')` |
| `formulario` | text | sí | check `in ('SAT-2237','SAT-2046','sin_formulario')`; se propone por el régimen del período (general → SAT-2237, pequeño contribuyente → SAT-2046, los demás → `sin_formulario`; pregunta L5-k) |
| `numero_de_formulario` | text | sí | 1–40, solo dígitos y letras; obligatorio salvo `sin_formulario` |
| `fecha_de_presentacion` | date | sí | |
| `tipo_de_libro` | text | sí | `completo` o `simplificado` |
| `foto` | jsonb | sí | los totales al declarar (abajo); check `pg_column_size(foto) <= 1048576` |
| `diferencia` | jsonb | sí | solo en `rectificacion`: contra la declaración o rectificación anterior |
| `motivo` | text | sí | 1–500 |
| `creado_en`, `creado_por` | | | autoría |

Checks: `declaracion_completa`: `evento = 'reapertura' or (formulario is not null and fecha_de_presentacion is not null
and tipo_de_libro is not null and foto is not null and (formulario = 'sin_formulario' or numero_de_formulario is not
null))`; `reapertura_con_motivo`: `evento <> 'reapertura' or (motivo is not null and foto is null and formulario is
null)`; `diferencia_solo_en_rectificacion`: `(evento = 'rectificacion') = (diferencia is not null)`. RLS: **insertar y
leer** por empresa (3.9.10): el historial no se cambia ni se borra (solo en cascada con la empresa, que no pasa por RLS).

**Foto** (`version: 1`, todo en texto con dos decimales): `tipoDeLibro`; conteo y total por código DTE; totales de cada
columna del libro; crédito del período; IVA sin crédito por motivo; los rubros y el segmento 9 de 3.9.4; el **detalle de
proveedores** completo (lo pide la rectificativa) y la fila de facturas especiales; `huella` (la misma de 3.9.5.2). Se
arma con el mismo código del libro: no hay un segundo cálculo.

**Diferencia:** por cada clave numérica, `anterior`, `actual` y `cambio` (solo las que cambian), más los documentos de P
**registrados o anulados** después de la declaración anterior (`creado_en`/`anulado_en` mayores que su `creado_en`), con
serie, número y total. Los eliminados no se listan (no quedan en la tabla): si la huella cambió y no hay altas ni
anulaciones que lo expliquen, la diferencia lo dice y remite a la auditoría.

##### 3.9.7.3 `ControlDePeriodos` real (`ControlDePeriodosEnBaseDeDatos`)

Puerto nuevo (reemplaza al de hoy):

```ts
export interface EstadoDelPeriodo { periodo: string; declarado: boolean; bloquea: boolean;
  ultimaDeclaracion: { formulario: string; numero: string | null; fechaDePresentacion: string } | null }
export interface ControlDePeriodos {
  /** Con el control encendido y el período declarado lanza PeriodoDeclarado; si no, devuelve el estado (para avisos). */
  exigirAbierto(periodo: string, modo: 'consultar' | 'bloquear'): Promise<EstadoDelPeriodo>;
  /** Los períodos declarados entre dos meses (para proponer el primero abierto y para las vigencias fiscales). */
  declaradosEntre(desde: string, hasta: string): Promise<string[]>;
}
```

- Lee `libro-de-compras.periodos.control_de_declarados` de la empresa con el `LectorDeConfiguracion`.
- **Control apagado:** no bloquea ni escribe; si P tiene una declaración, devuelve su estado y el documento cambia el
  aviso genérico de período pasado por uno preciso: «El período <mes> se declaró el <fecha> (<formulario> nº <número>):
  tendrá que rectificar».
- **Control encendido, `bloquear`** (registrar, anular, eliminar): `insert … (empresa_id, periodo, 'abierto') on conflict
  do nothing`, luego `select estado … for share`. Si está declarado → `PeriodoDeclarado` (`ReglaDeNegocioInfringida`,
  409, código `periodo_declarado`, `detalles: { campo: 'periodo', periodo, periodoPropuesto }`).
- **Control encendido, `consultar`** (`calcular`, la vista previa, y la confirmación en lote de la bandeja antes de
  bloquear): solo `select`, sin escribir ni bloquear; el mismo error, para que el formulario lo muestre antes de guardar.
- **Declarar** toma la fila `for update` (después del mismo `insert … on conflict do nothing`): un registro en curso en P
  termina antes o espera, y después de declarar ve `declarado`.

**Qué bloquea con el control encendido y P declarado:**

| Operación | Bloquea | Cómo |
|---|---|---|
| Registrar un documento de P (factura, FESP, NDEB, nota de crédito, recibo; a mano o confirmando la bandeja) | sí | `PreparadorDeDocumento` con `bloquear` |
| Anular o eliminar un documento de P (también por las órdenes del destino y desde la conciliación) | sí | `AnularDocumento`, `EliminarDocumento` |
| Editar un documento de P (cuando exista, respuesta 5 del 2026-09-29) | sí | el mismo preparador |
| Guardar, corregir o quitar una **vigencia fiscal de la empresa** cuyo rango afectado cubra un P declarado | sí | `CambiosAlHistorialFiscal.exigirSinDocumentosAfectados` suma `declaradosEntre`; error `VigenciaFiscalEnPeriodoDeclarado` (409, campo `secciones.libro-de-compras.vigenteDesde`) aunque P no tenga documentos (el tipo de libro cambiaría) |
| Anotar o quitar constancias, resolver «por resolver», marcar enterado | no | son de las retenciones, que tienen su propio formulario y plazo |
| Marcar procesado en el destino (`marcar_procesado`) | no | no cambia nada fiscal |
| Datos fiscales del proveedor, conceptos, combustibles y vigencias de combustible | no | los documentos guardan su foto; una vigencia de combustible usada ya no cambia (L2-3) |
| Cargar, completar o descartar filas de la bandeja | no | solo confirmarlas registra |
| Emitir el PDF foliado | no | es una lectura que gasta folios |

##### 3.9.7.4 Proponer el primer período abierto (la factura olvidada)

Función pura `periodoAbiertoPropuesto(fechas, declarados, conCredito)` en `dominio/periodo-del-libro.ts`, con pruebas:

1. **Nota de crédito:** no hay alternativa (va en su mes de recepción, check `nota_en_su_mes`): `periodoPropuesto = null`
   y el mensaje dice «Reabra el período <mes> para registrarla (luego rectifique)».
2. **Empresa sin crédito en ese período:** el primer mes abierto desde `periodoPropuesto(fechas)`.
3. **Con crédito:** el primer mes abierto entre `periodoPropuesto(fechas)` y `ultimoPeriodoConCredito(fecha_emision)` (art.
   20; en la NDEB, desde su propia emisión). Si todos están declarados, el primer mes abierto después, con `enPlazo:
   false` y el aviso «Ahí pierde el crédito (art. 20): el IVA irá al costo; también puede reabrir <mes> y rectificar».

El formulario (L3-8) y la bandeja (L4-9) muestran el error con el botón «Registrar en <mes>». Con el control apagado no
hay error: el aviso preciso de 3.9.7.3 incluye la misma propuesta.

##### 3.9.7.5 Declarar, reabrir y rectificar

| Acción | Ruta | Permiso | Reglas |
|---|---|---|---|
| Ver | `GET /libro-de-compras/periodos?anio=` y `GET …/periodos/:periodo` | `libro-de-compras.periodos.ver` | estado, historial, la revisión de 3.9.7.6 y «cambió desde la declaración» (foto actual contra la última) |
| Declarar | `POST …/periodos/:periodo/declarar { formulario, numeroDeFormulario, fechaDePresentacion }` | `libro-de-compras.periodos.declarar` | P anterior al mes actual (`PeriodoSinTerminar`); `fechaDePresentacion >=` el primer día del mes siguiente a P; abierto, **o** declarado con el control apagado (registrar la rectificación sin reabrir). Evento `declaracion` si es la primera, `rectificacion` si ya hubo una (con `diferencia`). Toma `for update`, arma la foto, inserta el historial y pone `declarado` |
| Reabrir | `POST …/periodos/:periodo/reabrir { motivo }` | `libro-de-compras.periodos.reabrir` | declarado; motivo 1–500; estado `abierto`; historial `reapertura`; auditoría `reabrir`, recurso `libro-de-compras.periodos`, `registroId` = `<empresaId>:<periodo>`, `anterior` = la fila y su última declaración |
| Encender o apagar el control | `PUT /libro-de-compras/periodos/control { encendido, motivo? }` | encender: `periodos.declarar`; apagar: `periodos.reabrir` con motivo | escribe la variable en el nivel **empresa** con `configuracion.establecer` (pregunta L5-b); auditoría `corregir`, recurso `libro-de-compras.periodos`, `registroId = empresaId` |

No hay «eliminar declaración»: un error se corrige reabriendo y declarando de nuevo (queda todo en el historial).
Eventos después de confirmar (para Contabilidad, futuro): `libro-de-compras.periodo_declarado` y
`libro-de-compras.periodo_reabierto`.

##### 3.9.7.6 Revisión antes de declarar (avisos, nunca bloquean)

`GET …/periodos/:periodo` devuelve `revision: [{ codigo, mensaje, cantidad?, enlace? }]`:
- **Bandeja** (solo si la empresa tiene un lote `bandeja` cuyas fechas de emisión tocan P o los dos meses anteriores):
  «Quedan N DTE pendientes en la bandeja que pueden ir en este período» (§3.3b.8). Depende de L4-9.
- **Conciliación** (solo si algún lote cubre el mes P): conteos de «En la SAT y no en Arrancar», «Anulado en la SAT y
  vigente aquí» y «Con diferencias» (§3.3b.9). Depende de L4-10. Quien nunca importó no ve nada.
- Retenciones por resolver de documentos de P; mes anterior sin declarar; documentos `fuera_de_plazo` en P; exportador
  «todo local»; combustibles del Decreto 22-2026; medicamentos y vehículos (SAT-2237).

#### 3.9.8 Otros reportes («Análisis de compras», Reportes: imprimir y exportar)

Todos por **rango de períodos** (`desde`, `hasta`, primer día de mes; máximo 24 meses), solo documentos vigentes del libro
salvo que se diga otra cosa, con signo como el libro. Consultas sobre `documentos_libro_idx` y las líneas por documento;
ningún índice nuevo. Cada uno con su `GET …/analisis/<reporte>` y `…/exportar` (una hoja). Permisos: un par
`libro-de-compras.analisis-de-compras.ver` / `.exportar` para los cinco (pregunta L5-l).

| Reporte | Filas | Columnas |
|---|---|---|
| **Compras por proveedor** | una por proveedor (`proveedor_id`, con su NIT y nombre actual) | documentos, total, base, IVA crédito, IVA sin crédito, exento y no afecto, IDP, retenciones practicadas; filtro opcional «incluir fuera del libro» |
| **Compras por concepto** | una por concepto de gasto (líneas) | líneas, base, IVA crédito, IVA al costo, **costo** (`total − iva + iva_no_acreditable`) |
| **IVA al costo por motivo** | documentos con `iva_no_acreditable <> 0` | período, documento, proveedor, motivo, IVA al costo; subtotal por motivo (`fuera_de_plazo`, `no_vinculado`, `empresa_sin_credito`, `nota_de_debito_tardia`) |
| **Activos fijos** | líneas con `es_activo_fijo` | fecha, documento, proveedor, concepto, descripción, costo, IVA crédito |
| **Combustibles e IDP** | líneas de combustible (vigencia o IDP) | fecha, documento, proveedor, combustible (si lo hay), galones, IDP por galón, IDP, base, IVA, exento y la marca **«Exento Decreto 22-2026»** (vigencia `iva_exento`); subtotales por combustible; aviso «IDP según la factura, sin galones» en las líneas con `idp_escrito` y sin galones |

#### 3.9.9 L5-0: IVA exento en la vigencia de combustible (decisión del usuario, «ya»)

| Tabla | Columna | Tipo | Nulo | Regla |
|---|---|---|---|---|
| `vigencias_de_combustible` | `iva_exento` | boolean | no | `default false`. Marcada: las compras de ese combustible con emisión en la vigencia no llevan IVA (Decreto 22-2026: 1-10 al 31-12-2026, también sin IDP; el usuario carga la vigencia con IDP 0) |

- **Cálculo** (`calculo-de-linea.ts`): una línea con combustible cuya vigencia tiene `iva_exento` lleva `exento = total −
  idp − otros_impuestos` e IVA 0; el motivo del documento sale `exento` si todo lo es (regla de siempre). Sin check nuevo
  en las líneas (la vigencia es otra tabla; una vigencia usada ya no cambia, L2-3).
- **Formulario:** con emisión dentro de una vigencia exenta, «Lleva combustible» exige elegir el combustible y los galones
  (están en la FEL), para que el reporte lo marque; aviso «Combustible exento de IVA e IDP (Decreto 22-2026)».
- **Excel de vigencias:** columna «IVA exento» (sí/no). Auditoría: cambiarla en una vigencia sin uso es `corregir`, como
  la tasa.

#### 3.9.10 RLS, permisos, configuración y auditoría

**RLS de las tablas nuevas:**

| Tabla | Política |
|---|---|
| `foliacion_del_libro`, `periodos`, `enteros_de_retenciones` | `politicaPorEmpresa()` |
| `emisiones_del_libro`, `declaraciones_de_periodos` | **insertar y leer** por empresa: helper nuevo `politicasDeSoloAgregarPorEmpresa()` en `core/base-datos/columnas.ts` (par de `politicasDeSoloAgregar`, con `empresa_id`); sin política de `update` ni `delete`, RLS los rechaza. La prueba `politicas-de-los-modulos` sigue pasando (exige RLS activa) y se le suma un caso: estas dos rechazan `update` y `delete` a `arrancar_app` |

Ninguna tabla nueva tiene alcance por registro. Las llaves foráneas: a `core.empresas` (cascade) y a `core.archivos` (no
action, con índice); ninguna hacia otro módulo.

**Permisos nuevos** (por acción, PLAN §3.5; ninguna migración de permisos: el acceso total los recibe solo y nadie más
los tenía; pregunta L5-m):

| Permiso | Para |
|---|---|
| `libro-de-compras.libro.ver` | libro, resumen, anexo, datos del SAT-2237, borrador en PDF, copias de emisiones |
| `libro-de-compras.libro.exportar` | Excel del libro y del SAT-2237 |
| `libro-de-compras.libro.emitir` | PDF foliado (gasta folios) y corregir el último folio |
| `libro-de-compras.retenciones.ver` / `.exportar` | reporte, por resolver y matriz de enteros |
| `libro-de-compras.retenciones.constancias` | anotar, cambiar y quitar constancias; resolver «por resolver» |
| `libro-de-compras.retenciones.enterar` | marcar, corregir y anular enteros |
| `libro-de-compras.periodos.ver` / `.declarar` / `.reabrir` | períodos, historial y control |
| `libro-de-compras.analisis-de-compras.ver` / `.exportar` | los cinco reportes de 3.9.8 |

**Configuración nueva:** `libro-de-compras.periodos.control_de_declarados` (boolean, `false`, `niveles: ['instalacion',
'empresa']`, `publica: true` para que el cliente muestre u oculte los bloqueos). Ninguna otra: las filas por página y la
versión de la plantilla son constantes del código.

**Auditoría** (nunca se borra; recurso `<modulo>.<plural>`):

| Qué | Acción | Recurso | `anterior` |
|---|---|---|---|
| Cambiar / quitar constancia | `corregir` / `quitar` | `libro-de-compras.retenciones` | la retención |
| Resolver «por resolver» | `corregir` | `libro-de-compras.retenciones` | la retención |
| Corregir / anular entero | `corregir` / `anular` | `libro-de-compras.enteros-de-retenciones` | el entero |
| Reabrir período | `reabrir` | `libro-de-compras.periodos` | la fila y su última declaración |
| Encender o apagar el control | `corregir` | `libro-de-compras.periodos` | `{ encendido }` |
| Corregir el último folio | `corregir` | `libro-de-compras.foliacion-del-libro` | `{ ultimoFolio }` |
| Declarar, rectificar, emitir | — | — | el historial de solo agregar es el rastro |

#### 3.9.11 Migraciones

Generadas con `npm run bd:generar -w servidor -- libro-de-compras <nombre>` y revisadas a mano; números tentativos (si L4
toma alguno antes, se renumeran con el `when` del `_journal.json` mayor que el de la `0022`). Sin datos que convertir
(3.9.1, punto 10); los `update` quedan para otra base de desarrollo con filas de prueba.

| Paso | Migración | Contenido |
|---|---|---|
| L5-0a | `0023_l5_iva_exento_de_combustible` | `add column iva_exento boolean default false not null` en `vigencias_de_combustible` |
| L5-3a | `0024_l5_folios_del_libro` | `foliacion_del_libro` y `emisiones_del_libro` con checks, índices, FK a `core.archivos` y políticas |
| L5-3a | `0025_l5_folios_sin_traslape` (`--custom`) | la exclusión `emisiones_del_libro_sin_traslape` |
| L5-5a | `0026_l5_retenciones_por_resolver` | cuatro columnas, dos checks e índice parcial en `retenciones`; `update … set resolucion = 'pendiente'` de las retenciones con monto de documentos anulados |
| L5-6a | `0027_l5_enteros_de_retenciones` | la tabla con sus checks, índice y política |
| L5-7a | `0028_l5_periodos_y_declaraciones` (hecha) | `periodos` y `declaraciones_de_periodos` con checks, llaves y políticas |

Ninguna migración en otros esquemas ni de permisos. Los `meta/*_snapshot.json` quedan iguales a las tablas.

#### 3.9.12 Pruebas

- **Dominio (puras):** `FilaDelLibro` (signo de NCRE y NDEB, NIT de la FESP, columna por motivo y categoría, cuadre de la
  fila para cada familia, simplificado); `ResumenDelLibro`; rubros y segmento 9; detalle de proveedores (neteo, proveedor
  negativo con aviso, FESP aparte); `paginarLibro` (van y vienen, última página con el resumen, 0 filas, exactamente N
  filas); `GRUPO_DE_ENTERO` contra el check de reglas; plazos por grupo con feriados; estado del entero;
  `periodoAbiertoPropuesto` (nota de crédito, sin crédito, en plazo, todo declarado, NDEB desde su emisión); la foto y
  su diferencia.
- **Integración (PostgreSQL real):** cada check nuevo con un caso que lo viola; RLS (otra empresa no ve ni inserta en
  ninguna tabla nueva; `update` y `delete` rechazados en `emisiones_del_libro` y `declaraciones_de_periodos`); la
  exclusión de folios (`23P01` con su mensaje); la consulta del libro con un período de todas las familias (cuadre contra
  `documentos.total`); anulados solo en el anexo; fuera del libro ausente.
- **API (`app.inject`):** permisos de cada ruta; emitir dos veces sin cambios (409 y copia), con cambios (folios nuevos y
  motivo exigido), dos emisiones a la vez (folios seguidos, sin repetir); corregir el último folio por debajo de lo
  emitido (422); constancias una, en lote con un error (nada se guarda) y quitar con auditoría; anular un documento con
  retención (queda `pendiente`) y eliminar uno con constancia (422); enteros (estado con diferencia tras anular);
  declarar con el control apagado (no bloquea, aviso preciso) y encendido (registrar, anular, eliminar y la vigencia
  fiscal → 409 con `periodoPropuesto`); `calcular` en período declarado; reabrir con auditoría; rectificación con
  diferencia; concurrencia de declarar contra registrar (con dos conexiones); avisos de bandeja y conciliación solo con
  lotes.
- **Carga:** un período de 5,000 documentos: libro, PDF y foto por debajo de unos segundos (`explain` del libro).

#### 3.9.13 Pasos (un commit cada uno; servidor y cliente por separado)

Cada commit corre `npm run revisar` y sus pruebas y actualiza la bitácora de `PLAN.md`. **(captura)** = espera la
captura del SAT-2237 vigente del usuario; **(constancia)** = se afina con el PDF de una constancia de Retenciones Web.

1. **L5-0a (servidor):** 3.9.9: migración `0023`, cálculo de la línea exenta, Excel de vigencias, avisos; pruebas.
2. **L5-0b (cliente):** casilla en la ventana de la vigencia; formulario de documentos con el combustible exento.
3. **L5-1a (servidor, libro) — hecho el 2026-10-20 (consulta, `FilaDelLibro`, resumen, anexo, rutas y permisos) y L5-1 exportar (`escribirVarias` y el Excel de tres hojas) — hecho el 2026-10-20:** consulta, `FilaDelLibro`, `ResumenDelLibro`, anexo de anulados, `escribirVarias` en el
   core, rutas y permisos `libro.ver`/`.exportar`, Excel de tres hojas, avisos; pruebas.
4. **L5-1b (cliente, libro) — hecho el 2026-10-20 (Excel y PDF deshabilitados hasta su servidor):** página «Libro de compras y servicios» (Reportes): período, tabla completa o simplificada,
   resumen, pestaña de anulados, Excel. Página de hasta 120 líneas; lógica en archivos sin Vue con pruebas.
5. **L5-2a (servidor, SAT-2237) — hecho el 2026-10-20:** rubros, segmento 9, detalle de proveedores y facturas especiales, rutas y Excel; el
   mapa de casillas vacío (`casillas: null`). **No espera la captura.**
6. **L5-2b (cliente, SAT-2237):** pestaña «Datos para el SAT-2237» con rubros, operaciones, proveedores y avisos.
7. **L5-2c (servidor y cliente) (captura):** el mapa de rubros a casillas con sus nombres y la vista «como en el
   formulario»; cerrar las preguntas L5-C1 a L5-C3.
8. **L5-3a (servidor, PDF) — hecho el 2026-10-20 (con `pdfkit` 0.20.2 en lugar de `pdfmake`; la hoja final es siempre el resumen):** dependencia aprobada por el agente de seguridad, `paginarLibro`, plantilla,
   migraciones `0024` y `0025`, emitir, copia, borrador, corregir el último folio, permiso `libro.emitir`; pruebas.
9. **L5-3b (cliente, PDF) — hecho el 2026-10-20:** botones «Borrador», «Emitir con folios» (confirmación con los folios que gastará), lista de
   emisiones con «Copia», y el último folio.
10. **L5-4a (servidor, retenciones) — hecho el 2026-10-20:** reporte por mes y grupo, plazos con feriados, `GRUPO_DE_ENTERO`, Excel, permisos
    `retenciones.ver`/`.exportar`; pruebas.
11. **L5-5a (servidor, constancias y por resolver) (constancia) — hecho el 2026-10-20 (migración `0026`):** migración `0026`, anotar una y en lote, quitar,
    resolución, `AnularDocumento` pone `pendiente`, `EliminarDocumento` bloquea con constancia; permiso
    `retenciones.constancias`; pruebas.
12. **L5-6a (servidor, enteros) — hecho el 2026-10-20 (migración `0027`):** migración `0027`, marcar, corregir, anular, estado derivado, avisos al registrar y
    anular; permiso `retenciones.enterar`; pruebas.
13. **L5-4b (cliente, retenciones) — hecho el 2026-10-20 (tres rutas con pestañas en lugar de una sola página):** página «Retenciones de IVA e ISR» con pestañas Mes (anotar una y en lote), Por
    resolver y Enteros (matriz del año, marcar y anular); imprimir con `window.print()` y Excel.
14. **L5-7a (servidor, períodos y control) — hecho el 2026-10-20 (migración `0028`):** configuración `control_de_declarados`, migración `0028`,
    `ControlDePeriodosEnBaseDeDatos` (con `modo`), `PeriodoDeclarado` con `periodoAbiertoPropuesto`, bloqueo de vigencias
    fiscales, aviso preciso con el control apagado; pruebas de bloqueo y concurrencia.
15. **L5-8a (servidor, declarar) — hecho el 2026-10-20 (número y fecha opcionales; el bloqueo se enciende y apaga con `POST …/periodos/control/encender|apagar`):** foto, diferencia, declarar, reabrir, rectificar, encender y apagar el control,
    revisión con avisos de bandeja y conciliación (los de L4 entran cuando existan L4-9 y L4-10), eventos; permisos
    `periodos.*`; pruebas.
16. **L5-8b (cliente, períodos):** página de períodos (año, estado, historial, «cambió desde la declaración», revisión,
    declarar, reabrir, control) y, en el formulario y la bandeja, el error `periodo_declarado` con «Registrar en <mes>».
17. **L5-9a (servidor, análisis):** los cinco reportes de 3.9.8 con su Excel y el permiso `analisis-de-compras`.
18. **L5-9b (cliente, análisis):** sus páginas en Reportes.
19. **L5-10 (QA):** de punta a punta en una empresa general agente de IVA y en una de pequeño contribuyente: registrar
    un mes con todas las familias, ver y exportar el libro, emitir con folios y una copia, anotar constancias en lote,
    marcar enterado, declarar, intentar registrar en el período (propuesta del mes siguiente), reabrir, anular, ver
    «por resolver» y rectificar.

#### 3.9.14 Preguntas para el usuario (con recomendación)

- **L5-a. Declarar con el control apagado.** (A) Declarar, historial y bloqueo solo con el control encendido; (B)
  declarar e historial siempre, y el control solo decide si bloquea. **Recomendación: (B)**: el número del SAT-2237, la
  foto y el aviso «cambió después de declarar» sirven a todos; el bloqueo es lo opcional.
- **L5-b. Quién enciende el control.** (A) solo soporte, desde el panel de configuración; (B) la empresa, desde la página
  de períodos (encender con `periodos.declarar`, apagar con `periodos.reabrir` y motivo, con auditoría).
  **Recomendación: (B)**: es una decisión de la empresa y hoy el panel es solo del superacceso.
- **L5-c. Guardar el PDF foliado** en `core.archivos` (la copia es idéntica y queda la evidencia de cada folio) o solo
  su huella y totales (regenerarlo podría paginar distinto si cambian los datos o la plantilla). **Recomendación:
  guardarlo.**
- **L5-d. Número de folio impreso** en cada página, o PDF sin número para hojas ya numeradas y habilitadas (Arrancar solo
  lleva la cuenta). **Recomendación: imprimirlo**; si alguien usa hojas preimpresas, se agrega la opción al emitir.
- **L5-e. Un solo contador de folios por empresa** para el libro completo y el simplificado (también si cambia de
  régimen a mitad de año). **Recomendación: sí**, como decidió «último folio por empresa».
- **L5-f. Excel del libro** en un archivo de tres hojas (Libro, Resumen, Anulados; cambio pequeño del core) o tres
  descargas. **Recomendación: un archivo.**
- **L5-g. Notas en el detalle de proveedores:** netear en su proveedor (con la cantidad de notas a la vista) o listarlas
  aparte. **Recomendación: netear**, hasta que la captura diga otra cosa.
- **L5-h. Enteros:** varios pagos por mes y grupo (original y complementarios) o uno solo. **Recomendación: varios.**
- **L5-i. Constancias en lote:** todo o nada con errores por fila, o fila por fila. **Recomendación: todo o nada.**
- **L5-j. «Por resolver»** como columnas de `retenciones`, puestas en `pendiente` al anular, con nota obligatoria al
  resolver; y prohibir eliminar un documento con constancia o con su mes enterado. **Recomendación: sí a todo.**
- **L5-k. Formulario de la declaración** según el régimen del período (SAT-2237, SAT-2046 o «sin formulario» para
  regímenes que no declaran compras). **Recomendación: sí**, así el cierre sirve a cualquier régimen.
- **L5-l. Permisos de análisis:** un par `analisis-de-compras.ver`/`.exportar` para los cinco reportes, o un par por
  reporte. **Recomendación: un par.**
- **L5-m. Permisos nuevos sin migración** (solo el acceso total los recibe; los roles se ajustan a mano).
  **Recomendación: sí**; ninguno reemplaza a uno que ya existía.
- **L5-n. Activos fijos dentro de «Bienes» en el libro** (separados solo en el SAT-2237 y en su reporte), para que el
  libro no pase de 18 columnas. **Recomendación: sí.**
- **L5-o. Menú:** «Libro de compras y servicios», «Retenciones de IVA e ISR» y «Análisis de compras» en Reportes; «Períodos
  y declaraciones» en Operación (declarar y reabrir son acciones, sin Excel). **Recomendación: así.**

#### 3.9.15 Preguntas para el contador (llevar a `contador-guatemala`)

- **L5-C1.** Con la captura del SAT-2237: número y nombre de cada casilla de compras, crédito y segmento 9, y si los
  rubros de 3.9.4.1 alcanzan (¿hay casillas de compras exentas, de pequeño contribuyente, de regímenes sin IVA?).
- **L5-C2.** Notas de crédito recibidas: ¿restan en el rubro del crédito o van en una casilla propia (o en el débito)? Y
  las notas de débito recibidas, ¿en su rubro o aparte?
- **L5-C3.** ¿La FESP entra en el detalle de proveedores (con el CUI o NIT del vendedor) o se declara aparte? ¿El detalle
  tiene tope de filas?
- **L5-C4.** Con el PDF de una constancia de Retenciones Web IVA e ISR: formato del número, si es único por agente, y si
  una constancia de ISR puede cubrir varias facturas.
- **L5-C5.** ¿El combustible exento por el Decreto 22-2026 va en la casilla de combustibles, en compras exentas o en las
  dos?
- **L5-C6.** El orden cronológico del libro (AG 5-2013 art. 38): ¿por fecha de emisión o de recepción? Y el pequeño
  contribuyente con su libro único de compras y ventas: ¿los folios del libro de compras de Arrancar le sirven, o el
  libro debe ser uno solo con las ventas?
- **L5-C7.** Las columnas de 3.9.3.2 contra las recomendadas en su informe de L5 (el documento de validación solo las
  resume).

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
| `libro-de-compras.documentos.importar` | L4 (subir, ver y completar la bandeja, conciliar; §3.3b.10) |
| `libro-de-compras.dte-recibidos.descartar` | L4 (§3.3b.10) |
| `libro-de-compras.libro.{ver,exportar,emitir}`, `…retenciones.{ver,exportar,constancias,enterar}`, `…periodos.{ver,declarar,reabrir}`, `…analisis-de-compras.{ver,exportar}` | L5 (§3.9.10) |

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
| R2-3 | `0015_r2_familias_y_tipo_dte.sql` (hecha) | familias, `tipo_dte` y sus checks (§3.2b.8) |
| R2-6 | `0016_r2_retenciones_de_factura_especial.sql` | reglas de la factura especial (§3.2b.8) |
| L4-1 | `0019_l4_otros_impuestos_e_idp_del_dte.sql` | `otros_impuestos` e `idp_escrito` con sus checks (§3.3b.12) |
| L4-5 | `0020_l4_bandeja_de_dte.sql` | `lotes_de_dte` y `dte_recibidos` (§3.3b.12) |
| L4-7 | `0021_l4_autorizacion_registrada_fuera.sql` (`--custom`) | función `security definer` (§3.3b.12) |
| L5 | `0023` a `0028` (§3.9.11) | IVA exento del combustible, folios, retenciones por resolver, enteros, períodos y declaraciones |

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
18. **L3-8 (cliente, hecho 2026-10-18):** formulario en página: encabezado (proveedor con destino sugerido, NIT
    del DTE, casilla SAT, período), editor de líneas (concepto, bien/servicio, activo fijo,
    combustible con galones), totales y avisos que devuelve `calcular`, panel de retenciones
    (quitar o ajustar con motivo, con `v-permiso`); lógica en `edicion-de-documento.ts` con
    pruebas; ningún archivo pasa de 200 líneas ni la página de 120.

### R1 Régimen de la empresa con vigencia

Pasos R1-1 a R1-7 en §3.1b.11 (antes de L3-7 y L3-8, que ya deben mostrar el motivo `empresa_sin_credito`).

### R2 Proveedores de regímenes especiales y factura especial

Pasos R2-1 a R2-9 en §3.2b.11 (después de R1-4; R2-8 depende de L3-8).

### R3 Nota de débito del proveedor

Pasos R3-1 a R3-8 en §3.2c.12 (después de R2-4; R3-5 espera al contador; R3-7 depende de R2-8).

### L4 Bandeja de DTE recibidos y otros impuestos

Pasos L4-1 a L4-14 en §3.3b.14 (después de R3; L4-1 a L4-3 son de la vía a mano y no esperan nada; L4-6, L4-7, L4-11 y
L4-14 esperan el Excel real del usuario; L4-2b espera al contador).

### L5 Reportes y cierre

Pasos L5-0a a L5-10 en §3.9.13 (L5-2c espera la captura del SAT-2237; L5-5a se afina con una constancia real; los avisos
de bandeja y conciliación de L5-8a esperan L4-9 y L4-10).

## 15. Fuera de L1 a L3

Importar DTE (L4, ya planificado en §3.3b), reportes, constancias y períodos declarados (L5), factura especial (ya planificada en R2, §3.2b), DUCA,
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

