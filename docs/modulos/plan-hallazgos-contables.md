# Plan de base de datos para los hallazgos contables H1 a H11

Estado: **propuesta para revisar con el usuario** (2026-09-28). No se programa nada
hasta contestar las preguntas del final. Origen: tabla «Revisión a fondo de lo
programado» de `docs/HOJA-DE-RUTA.md`.

Se revisaron las tablas reales (`*.tablas.ts`, migraciones de `core` y `bancos`) y la
base de desarrollo (solo lectura). Convenciones que respeta todo el plan: un esquema
por módulo, `snake_case` en la base, dinero `numeric(14,2)`, `...marcasDeTiempo` y
`...autoria` en toda tabla de negocio, `politicaPorEmpresa()` o `politicaPorCuenta()`,
todo borrado o anulación deja rastro en `core.auditoria`, y los módulos no se importan
entre sí (eventos o mediador, `docs/ARQUITECTURA.md` §4.8). Tampoco hay **llaves
foráneas entre esquemas de módulos de negocio**: importarían la tabla del otro módulo;
sí se permiten hacia `core.*`.

## Resumen

| # | Recomendación | Tablas | Depende de |
|---|---|---|---|
| H1 | Auditoría 60 meses por omisión y mínimo legal; sin particionar; auditar también las **correcciones**; respaldo mensual conservado 5 años | `core.auditoria`, función `core.depurar_auditoria`, `infra/respaldo.sh` | — |
| H2 | Transcribir el saldo del estado de cuenta (obligatorio) y adjuntar el PDF o la foto (configurable); autorizar solo si coincide | `bancos.conciliaciones`, `core.archivos` (admitir PDF) | Archivos PDF |
| H3 | **Catálogo de conceptos bancarios por empresa** (no alcanza con descripción + cuenta contable); Contabilidad liga concepto → cuenta después | `bancos.conceptos`, `bancos.movimientos.concepto_id` | — |
| H4 | Único por empresa + banco + número **normalizado** | `bancos.cuentas_bancarias` | — |
| H5 | `core.localidades` con código SAT opcional; acceso con el alcance por registro que ya existe; «departamentos» se llaman **áreas** | `core.localidades`, `core.areas`, `core.empresas` | — |
| H6 | Reporte de cheques con más de 6 meses y anulación en lote (siempre con nota inversa a una fecha común) | índice parcial en `bancos.movimientos` | H9 (número de las notas inversas) |
| H7 | Destino «Bancos» en Ingreso de facturas; Bancos guarda el vínculo nota ↔ documento con una copia de sus datos | `bancos.documentos_de_notas` | Libro de compras L3, H3 |
| H8 | Interés bruto e ISR retenido en la nota de crédito, con `check` de cuadre | `bancos.movimientos` | H3 (el concepto lo pide) |
| H9 | Correlativo sin huecos con tabla de correlativos y bloqueo de fila, en el core | `core.correlativos`, `bancos.movimientos.numero`, `bancos.transferencias.numero` | — |
| H10 | NIT válido y distinto de CF lo exige Libro de compras al registrar, y manda el NIT del DTE | ninguna nueva | Libro de compras L1/L3 |
| H11 | `periodo` del libro además de la fecha de emisión; fuera de plazo se **registra sin crédito fiscal** (IVA a costo), con aviso | `libro_de_compras.documentos`, `libro_de_compras.periodos` | Libro de compras L3 |

---

## H1 Conservación de la auditoría

### Lo que hay

- `core.auditoria` (solo agregar y leer por RLS): `id`, `cuenta_id`, `empresa_id`,
  `usuario_id`, `recurso`, `registro_id`, `accion`, `motivo`, `anterior jsonb`,
  `creado_en`. Índices `(recurso, registro_id)` y `(cuenta_id, creado_en)`.
- `core.depurar_auditoria(meses)` (`SECURITY DEFINER`, migración core `0009`) borra
  lo anterior a `greatest(meses, 1)` meses; la llama `principal.ts` una vez al día con
  `core.auditoria.meses_de_conservacion` (instalación, 12 por omisión, de 1 a 120).
- `infra/respaldo.sh`: `pg_dump` diario y `DIAS_RETENCION=14`. **Un respaldo de 14
  días no es un archivo histórico**: a los 12 meses y 15 días la evidencia de una
  anulación ya no existe en ninguna parte.

### Base legal

- Código de Comercio, art. 382: conservar la documentación **no menos de cinco
  años**. ([leydeguatemala.com](http://leydeguatemala.com/codigo-de-comercio/articulo-382-documentacion-y-correspondencia/2893/))
- Código Tributario, art. 47: la SAT puede verificar y ajustar durante **cuatro
  años**. ([Decreto 4-2012](http://leydeguatemala.com/decreto-4-2012/se-reforma-el-articulo-47-el-cual-queda-asi/2196/))
  El plazo se interrumpe con una fiscalización, así que 5 años es el mínimo prudente,
  no un techo.

### Tamaño estimado

Medido en desarrollo: `anterior` pesa entre 500 y 1,200 bytes (conciliación
eliminada ≈ 1.2 KB). Con encabezado de fila e índices, **≈ 1.6 KB por entrada**.

| Escenario por empresa (finca mediana) | Entradas/año | Tamaño/año | 5 años |
|---|---|---|---|
| Solo bajas (hoy): ~150 movimientos/mes, 5 % anulados o eliminados, más CxP, Libro, inactivaciones | ~1,500 | ~2.5 MB | ~12 MB |
| Bajas + correcciones (propuesta de abajo): ~20 % de los registros se corrige una vez | ~6,000 | ~10 MB | ~50 MB |
| Uso intenso (varias fincas, planilla, inventario) | ~30,000 | ~50 MB | ~250 MB |

Una instalación SaaS con 100 empresas de uso normal: **~5 GB en 5 años** en el peor
caso razonable. El VPS objetivo (1–2 GB de RAM, 25–50 GB de disco) lo aguanta; el
índice `(cuenta_id, creado_en)` sigue sirviendo las consultas por cuenta y fecha.

### Opciones

| Opción | Pros | Contras |
|---|---|---|
| A. Subir la conservación a 60 meses, sin particionar | Un cambio de configuración y una migración pequeña. | El `DELETE` diario, cuando por fin borre, borra filas sueltas (autovacuum lo absorbe a este volumen). |
| B. Particionar `core.auditoria` por año (`PARTITION BY RANGE (creado_en)`) | Depurar = `DROP` de una partición; archivar un año entero es fácil. | Drizzle no declara particiones (migración `--custom`), la llave primaria debe incluir `creado_en`, y crear la partición del año siguiente es un trabajo más. Se justifica pasados ~10 millones de filas. |
| C. Archivar a archivo (JSONL comprimido por año) y borrar de la base | Base pequeña. | La evidencia sale de la app: hay que poder consultarla, y el archivo también hay que conservarlo 5 años. |

### Recomendación

1. **Opción A ahora**, dejando escrito cuándo pasar a B (más de 10 millones de filas
   o más de 5 GB en la tabla).
2. `core.auditoria.meses_de_conservacion`: predeterminado **60**, esquema Zod
   `min(60).max(240)`. La función también impone el piso:
   `greatest(meses, 60)` (migración que reemplaza `core.depurar_auditoria`). Así
   ni soporte por error baja de 5 años. No hace falta distinguir módulos
   financieros: todos quedan protegidos igual y la diferencia de tamaño no lo
   justifica.
3. **Auditar las correcciones** (hallazgo nuevo, crítico): hoy solo se auditan
   bajas. Corregir una nota no conciliada cambia monto, fecha o beneficiario sin
   rastro, y un auditor pide justamente eso. Agregar la acción `corregir` a
   `AccionAuditada` (con `anterior`) en los casos de uso de actualizar que tocan
   dinero o fechas (notas, saldo inicial; después facturas, contraseñas). Sin motivo
   obligatorio.
4. **Riesgo de borrado en cascada**: `core.auditoria.cuenta_id` tiene
   `on delete cascade`; dar de baja una cuenta suscriptora borraría su evidencia.
   Recomendación: cambiarlo a `on delete restrict` y que la baja de una cuenta sea
   **inactivarla** (la plataforma ya no la deja entrar), nunca borrarla antes de 5
   años. Lo mismo aplica a `core.empresas` (hoy todo cuelga con `cascade`).
5. **Respaldos** (`infra/respaldo.sh`): además de los diarios de 14 días, conservar
   el **respaldo del día 1 de cada mes durante 60 meses** (variable
   `MESES_RETENCION_MENSUAL=60`), fuera del servidor. Cubre también las fotos y los
   estados de cuenta de H2. No es archivo de auditoría (para eso está la tabla), sino
   recuperación ante desastre.
6. Nada de configuración por empresa: la ley es igual para todas y la variable sigue
   siendo solo de instalación (`soloSuperacceso`).

### Migración y datos

- Core: migración `--custom` que reemplaza la función con el piso de 60 y cambia la
  llave foránea de `cuenta_id` a `restrict`. Sin cambios de datos.
- Si alguna instalación tenía el valor 12 guardado en `core.configuraciones`, el
  nuevo Zod lo rechazaría al arrancar: la misma migración lo sube a 60.

Permisos: ninguno nuevo. Excel: ninguno. Una pantalla de consulta de la auditoría
(reporte, imprimir y exportar) sigue pendiente y conviene planificarla aparte.

---

## H2 Evidencia de la conciliación

### Lo que hay (y la confusión)

La «foto» de `bancos.conciliaciones` son **cinco columnas de totales calculados**
(`foto_saldo_segun_libros`, `foto_saldo_calculado_estado_de_cuenta` y tres totales),
no un archivo. No se guarda ni una imagen ni lo que dijo el banco. `core.archivos`
solo acepta imágenes (JPG, PNG, WebP, AVIF, GIF), las convierte a WebP y exige
`ancho`/`alto`/`ruta_miniatura`: **no admite PDF**, que es como llega casi todo
estado de cuenta de banca en línea.

### Tensión con el B5.1

El B5.1 decidió que «el usuario no escribe ningún monto». Transcribir el saldo del
estado de cuenta **no contradice** esa regla si el número **nunca entra al cálculo**:
solo se compara. El documento lo sigue armando el sistema; el saldo escrito es la
evidencia externa de que el banco dijo lo mismo.

### Diseño

`bancos.conciliaciones` gana:

| Columna | Tipo | Nulo | Nota |
|---|---|---|---|
| `saldo_estado_de_cuenta` | `numeric(14,2)` | sí | lo transcribe quien elabora |
| `estado_de_cuenta_archivo_id` | `uuid` → `core.archivos.id` (`on delete restrict`) | sí | PDF o foto del estado de cuenta |

Restricciones:

- `check (estado <> 'autorizada' or saldo_estado_de_cuenta = foto_saldo_calculado_estado_de_cuenta)`
  como **`NOT VALID`** (migración `--custom`): las conciliaciones autorizadas antes del
  cambio no tienen el dato, y **no se debe rellenar con el calculado** (sería
  inventar la evidencia). `NOT VALID` solo revisa filas nuevas o cambiadas.
- La regla también vive en el dominio: `Conciliacion.terminar` exige el saldo (y el
  archivo si la configuración lo pide); `autorizar` lanza
  `SaldoDelEstadoDeCuentaNoCoincide` si difiere del calculado. Quien autoriza ve el
  archivo al lado del documento.

Flujo: el saldo y el archivo se capturan **en proceso** (quien elabora); al
«Terminar» son obligatorios; «Devolver» los deja editables. Eliminar la conciliación
no borra el archivo (queda referido en `anterior` de la auditoría).

`core.archivos` para PDF (paso propio en el core):

| Cambio | Detalle |
|---|---|
| `clase text not null default 'imagen'`, `check in ('imagen','documento')` | |
| `ruta_miniatura`, `ancho`, `alto` pasan a **nulables** | un PDF no tiene miniatura |
| Caso de uso `SubirDocumento` | solo `application/pdf`, máximo 10 MB (variable de instalación), se valida la firma `%PDF`, no se transforma |
| Autoría | agregar `...autoria` y `actualizado_en` (hoy solo tiene `subido_por`) |

Tamaño: 12 estados de cuenta por cuenta al año, 0.2–2 MB cada uno: despreciable.

### ¿Obligatorio?

| | Recomendación |
|---|---|
| Saldo transcrito | **Siempre obligatorio** para terminar. No cuesta nada y es la evidencia mínima. |
| Archivo | Variable `bancos.conciliaciones.exigir_estado_de_cuenta` (empresa e instalación), **`true` por omisión**. Un rancho pequeño puede no tener el PDF a mano. |

Permisos: los mismos (`conciliar` sube y transcribe; `autorizar` compara). Excel:
ninguno (operación). Auditoría: `devolver` y `eliminar` ya guardan `anterior`, que
ahora incluye el saldo y el id del archivo.

---

## H3 Clasificación de notas

### El problema

Una nota hoy es tipo + monto + beneficiario + referencia + observaciones. Sin una
clasificación **estructurada** no hay flujo de efectivo, ni gasto por comisiones, ni
partida automática.

### ¿Alcanza con la descripción y la cuenta contable? (idea del usuario)

No, por tres razones:

1. **Contabilidad no existe y es opcional.** Sin ella no hay cuenta contable que
   elegir. Una empresa que solo usa Bancos (el caso típico de un rancho al empezar)
   se quedaría sin flujo de efectivo para siempre.
2. **Una descripción libre no se agrupa.** «Comisión», «comision chequera», «cargo
   del banco» son tres filas en un reporte. Clasificar texto a mano o con reglas es
   frágil y no auditable.
3. **La cuenta contable no sirve para el flujo aunque exista.** El flujo de efectivo
   por el método directo (NIC 7 / NIIF para PYMES, sección 7) agrupa por **actividad**
   (operación, inversión, financiamiento) y por clase de cobro o pago; una misma
   cuenta (p. ej. «Bancos») no dice qué fue, y varias cuentas de gasto caen en la
   misma línea del flujo. Los ERP resuelven lo mismo con una capa intermedia: SAP
   Business One asigna **posiciones del flujo de efectivo** a cada transacción, y Odoo
   usa **modelos de conciliación** que proponen la cuenta a partir de una etiqueta.

### Opciones

| Opción | Sin Contabilidad | Flujo de efectivo | Con Contabilidad | Costo |
|---|---|---|---|---|
| A. Texto libre | Sí | No | No genera partidas | Ninguno |
| B. Catálogo de **conceptos bancarios** por empresa; Contabilidad liga concepto → cuenta contable en su propia tabla | Sí | Sí (el concepto tiene su actividad) | Sí: la partida sale del enlace | Un catálogo y un campo |
| C. Cuenta contable directa en la nota | No | No (sin mapeo aparte) | Sí | Hace a Bancos depender de Contabilidad |

### Recomendación: B

- Tabla `bancos.conceptos` (administración, con Excel):

| Columna | Tipo | Nulo | Nota |
|---|---|---|---|
| `id`, `empresa_id` | uuid | no | `politicaPorEmpresa()` |
| `nombre` | text | no | único por empresa |
| `aplica_a` | text | no | `credito`, `debito` o `ambos` (`check`) |
| `actividad_de_flujo` | text | no | `operacion`, `inversion`, `financiamiento`, `ninguna` (`check`) |
| `grupo_de_flujo` | text | sí | línea del flujo directo: «Cobros a clientes», «Pagos a proveedores», «Comisiones bancarias»… |
| `es_cargo_bancario` | boolean | no | la nota la origina el banco (comisión, interés, cheque rechazado): la conciliación la muestra en su sección de **ajustes** (pendiente anotado en la hoja de ruta) |
| `pide_datos_de_intereses` | boolean | no | activa los campos de H8 |
| `admite_factura` | boolean | no | activa el vínculo de H7 (comisiones con IVA) |
| `clave_de_sistema` | text | sí | conceptos que el sistema usa solo (`transferencia`, `pago_a_proveedor`, `saldo_inicial`, `sin_clasificar`); único por empresa; no se editan ni inactivan |
| `activo` | boolean | no | se inactiva, no se borra (auditoría `inactivar`) |

  `unique (empresa_id, nombre)`, `unique (empresa_id, clave_de_sistema)` parcial
  (`where clave_de_sistema is not null`).
- `bancos.movimientos.concepto_id uuid not null` → `bancos.conceptos.id`, con índice
  `(empresa_id, concepto_id, fecha)` para el flujo.
- **Quién lo llena:** en notas y cheques sueltos, el usuario (obligatorio). En
  transferencias, saldo inicial e inversos, el sistema (el inverso hereda el concepto
  del original). En pagos de Cuentas por pagar, el módulo de origen lo manda en la
  orden (`pago_a_proveedor`).
- **Contabilidad** (futuro) tendrá `contabilidad.enlaces_de_conceptos_bancarios
  (empresa_id, concepto_id, cuenta_contable_id)`: así la cuenta contable llega sin que
  Bancos sepa que existe Contabilidad. La descripción de la partida sale del concepto
  + beneficiario + referencia, como pedía el usuario.
- **Semilla:** al activar Bancos en una empresa (y en la migración para las
  existentes) se crean los conceptos de sistema y una lista sugerida editable:
  depósito de ventas, comisiones bancarias, intereses ganados, cheque rechazado,
  planilla, préstamo recibido, pago de préstamo, compra de activo, aporte de socios,
  retiro de socios, impuestos.
- **Relación con los conceptos de gasto de Libro de compras:** son catálogos
  distintos (uno clasifica dinero, el otro gasto con IVA) y viven en módulos
  distintos; no se unen. Contabilidad liga cada uno a su cuenta.

### Migración y datos

1. Crear `bancos.conceptos` y sembrar por empresa (migración de datos).
2. `concepto_id` nulable; rellenar: transferencias → `transferencia`, saldo inicial →
   `saldo_inicial`, inversos → el del original, el resto → `sin_clasificar`.
3. `set not null`. La pantalla de Notas permite reclasificar (corregir solo el
   concepto) incluso en meses conciliados, porque no cambia el saldo; queda en la
   auditoría como `corregir`.

Permisos: `bancos.conceptos.ver`, `.gestionar`, `.importar`, `.exportar`. Reportes
nuevos: **Flujo de efectivo** (por actividad y grupo) y **Movimientos por concepto**
(imprimir y exportar, permisos `bancos.flujo-de-efectivo.ver` / `.exportar`).

---

## H4 Número de cuenta por banco

- Hoy: `unique cuentas_bancarias_numero_unico (empresa_id, numero)`. Datos de
  desarrollo: 2 cuentas, **ningún duplicado** ni por empresa ni por empresa + banco.
  Relajar una restricción no puede fallar con datos existentes.
- Cambio: `unique (empresa_id, banco_id, numero_normalizado)`.
- **Crítico:** sin normalizar, «3-033-01234-5» y «3033012345» pasan como distintos y
  la restricción no protege nada. Agregar `numero_normalizado text generated always
  as (regexp_replace(numero, '[^0-9A-Za-z]', '', 'g')) stored` y poner el único sobre
  ella; `numero` conserva cómo lo escribió el usuario (se imprime en cheques).
- Índices: el nuevo único reemplaza al viejo; `cuentas_bancarias_banco_idx` sigue.
- Excel: las importaciones de saldos iniciales y chequeras buscan la cuenta por
  **nombre** (único por empresa, no cambia): sin impacto. El Excel de cuentas sigue
  igual; el mensaje de duplicado dirá «ya existe en ese banco».
- Errores: `interpretarErrorDePostgres` traduce el nombre de la restricción nueva.
- Sin permisos nuevos.

---

## H5 Localidades, datos fiscales de la empresa y áreas

### Qué es cada cosa

- **Establecimiento SAT**: lugar físico inscrito en el RTU, con **código de
  establecimiento** que asigna la SAT; la FEL lo exige al **emitir** (cada DTE sale de
  un establecimiento). ([Portal SAT](https://portal.sat.gob.gt/portal/requisitos-tramites-agencias/actualizacion-datos-del-establecimiento/),
  [Odoo, localización Guatemala](https://www.odoo.com/documentation/18.0/es_419/applications/finance/fiscal_localizations/guatemala.html))
- **Localidad** (usuario): cualquier lugar de la empresa — finca, planta, oficina,
  bodega. Toda localidad donde se vende con FEL es un establecimiento, pero no todo
  potrero o bodega está inscrito. Por eso el código SAT es **opcional** y no son lo
  mismo (se corrige la frase «localidades = establecimientos» de la hoja de ruta).

### `core.localidades`

En el core (no en un módulo), porque la referenciarán Bancos, Libro de compras,
Inventario, Ganado, Ventas… y un módulo sí puede apuntar a `core.*`.

| Columna | Tipo | Nulo | Nota |
|---|---|---|---|
| `id`, `empresa_id` | uuid | no | `politicaPorEmpresa()` |
| `codigo` | text | no | corto, interno (`FIN1`), único por empresa |
| `nombre` | text | no | único por empresa |
| `tipo` | text | no | `finca`, `planta`, `oficina`, `bodega`, `otro` (`check`) |
| `codigo_establecimiento_sat` | integer | sí | único por empresa cuando no es nulo; `check > 0` |
| `nombre_comercial_sat` | text | sí | como está en el RTU (sale en la FEL) |
| `departamento_codigo`, `municipio_codigo` | char(2) | sí | FK compuesta a `core.municipios` |
| `direccion` | text | sí | |
| `activa` | boolean | no | se inactiva (auditoría) |

Política adicional: `politicaPorAlcance('empresas.localidades')` sobre la propia
tabla, para que cada quien vea solo sus localidades.

### Accesos de usuario a localidades

**Reusar `core.accesos_datos`** (recurso `empresas.localidades`) en vez de una tabla
nueva: ya existe, ya tiene RLS por empresa, y `politicaPorAlcance` ya lee de ella. El
módulo `empresas` declara `recursosConAlcance: [{ recurso: 'empresas.localidades',
permisoVerTodos: 'empresas.localidades.ver-todas' }]`. Convive así:

1. **Acceso a la empresa** (`core.empresa_usuarios`) es la primera puerta; sin él no
   hay nada.
2. **Acceso a localidades** filtra dentro de la empresa. Quien tiene rol de acceso
   total o `ver-todas` ve todas (como las cuentas bancarias).
3. Una tabla que lleve `localidad_id` y deba filtrarse agrega
   `politicaPorAlcance('empresas.localidades', 'localidad_id')`.

**Hueco a resolver en el core:** si `localidad_id` es nulo, `null in (...)` es falso
y la fila desaparece para quien no tiene alcance total. Hace falta una variante
`politicaPorAlcanceOpcional(recurso, columna)` que deje ver las filas sin localidad
(«de toda la empresa»).

### ¿Qué registros llevan localidad?

| Registro | Localidad | Filtra por RLS | Por qué |
|---|---|---|---|
| Cuentas bancarias | No | No | Son de la empresa; su acceso ya es el alcance por cuenta (`bancos.cuentas`). |
| Notas y cheques | Opcional (para costo) | No | Informativa; se deduce mejor del destino del gasto. |
| Documentos de Libro de compras | Opcional | No | Para costos; la factura de compra va al NIT, no al establecimiento. |
| Ventas / FEL (futuro) | **Obligatoria**, con código SAT | Sí | Establecimiento emisor. |
| Inventario (futuro) | Bodega = localidad | Sí | El bodeguero ve su bodega. |
| Ganado, parcelas (futuro) | Finca = localidad raíz del árbol finca → potrero → parcela (Composite de `PLAN.md`) | Sí | El encargado ve su finca. |
| Caja chica (futuro) | Fondo por localidad | Sí | |
| Planilla (futuro) | Opcional | Sí | |

Recomendación: **no filtrar Bancos por localidad**. En la práctica de una finca el
dinero se maneja centralizado en la oficina; lo que se reparte por finca es el
trabajo de campo.

### «Departamentos»: nombre y modelo

- **Choque de nombres:** `core.departamentos` ya son los 22 departamentos de
  Guatemala. Llamar igual a las áreas internas confundiría el código y los reportes.
  Propuesta: **Áreas** (`core.areas`) en pantalla y en la base.
- **Cómo lo modelan los ERP:** SAP Business One usa **dimensiones / centros de costo**
  (hasta cinco dimensiones independientes: p. ej. sucursal y departamento); Odoo usa
  **planes analíticos** independientes entre sí; los departamentos de RR. HH. cuelgan
  de la compañía, no de una sucursal. En una finca, «ordeño», «siembra»,
  «mantenimiento» existen en varias localidades.
- **Opciones:** (a) área hija de una localidad — obliga a repetir «Ordeño» en cada
  finca y no suma entre fincas; (b) **área independiente**, y cada registro lleva
  localidad y área por separado — suma por cualquiera de las dos; (c) área con
  localidad **opcional** (una área propia de una sola finca).
- **Recomendación: (c)**, que incluye a (b): `core.areas (id, empresa_id, codigo,
  nombre, localidad_id null → core.localidades, activa)`, único `(empresa_id,
  nombre)`. Sin acceso por área (no hace falta hoy).

### Datos fiscales de la empresa (el resto de H5)

| Dato | Dónde | Nota |
|---|---|---|
| `razon_social`, `nombre_comercial` | `core.empresas`, nulables | los usan todos los reportes |
| `nit` | `core.empresas` (ya existe, nulable) | obligatorio y válido **solo si** hay un módulo fiscal activo: regla del caso de uso, no `not null` |
| `fecha_de_inicio` | `core.empresas`, `date` nulable | hoja de ruta «Fecha de inicio» |
| `carga_inicial_cerrada_en` | `core.empresas`, `timestamptz` nulable | abierta = nulo; reabrir con permiso, motivo y auditoría |
| Régimen de IVA e ISR, agente de retención | **`libro_de_compras.datos_fiscales_de_empresa`** (1 a 1, `empresa_id` único) | son de ese módulo; el formulario de Empresas los muestra si está activo (plan de Libro de compras) |

Permisos: `empresas.localidades.ver`, `.gestionar`, `.importar`, `.exportar`,
`.ver-todas`; `empresas.areas.ver`, `.gestionar`, `.importar`, `.exportar`. Ambas en
**Administración** (importan y exportan). Asignar localidades a un usuario, en la
pantalla de Usuarios (como el acceso a empresas).

---

## H6 Cheques en circulación con más de seis meses

### Base legal

Código de Comercio: el cheque se presenta dentro de 15 días (art. 502); el banco
todavía lo paga si hay fondos y se presenta **dentro de los seis meses** siguientes a
su fecha y no fue revocado (art. 508, pago extemporáneo). Después, no está obligado.
([Código de Comercio, OJ](http://ww2.oj.gob.gt/archivodeprotocolos/index.php?option=com_rubberdoc&view=doc&id=97&format=raw))
Anular el cheque **no extingue la deuda** con el beneficiario: si el cheque pagaba
una factura, esa factura vuelve a quedar pendiente (Cuentas por pagar lo hace con el
aviso `bancos.movimiento_de_origen_anulado`).

### Consulta del reporte

Cheques en circulación = `cheques.estado = 'emitido'` y su movimiento sin
`conciliacion_id`, sin `revertido_en` y sin `anulado_en`, con
`fecha < current_date - make_interval(months => :meses)` (6 por omisión, variable
`bancos.cheques.meses_de_vencimiento`, empresa e instalación). Columnas: cuenta,
número, fecha, días de antigüedad, beneficiario, monto, mes conciliado o no, origen
(Cuentas por pagar o suelto). Filtros: cuenta, antigüedad mínima, beneficiario.

Índice nuevo (parcial y pequeño):

```sql
create index movimientos_cheques_en_circulacion_idx
  on bancos.movimientos (cuenta_bancaria_id, fecha)
  where tipo = 'cheque' and conciliacion_id is null
    and revertido_en is null and anulado_en is null;
```

Incluye los cheques en circulación de la **carga inicial** cuando exista (hoja de
ruta): deben ser cheques con fecha real, no una nota global, o este reporte no los ve.

### Anulación en lote

- `POST /bancos/cheques/anular-en-lote` con `{ chequeIds[] (1 a 200), motivo, fecha }`,
  **una transacción, todo o nada**, que llama a `AnularCheque` por cada uno y
  devuelve los problemas por cheque si alguno falla (como el importar de Excel).
- **Crítico — cheque viejo de un mes no conciliado:** la regla del B7 lo anula «a la
  antigua», sin inverso y fuera del saldo. Para un cheque de hace 7 meses eso
  **cambia el saldo de meses pasados** que ya se usaron en reportes y, si la empresa
  no concilia, nadie lo nota. La práctica contable es **revertir a la fecha actual**
  (se acredita el banco y se reconoce la obligación con el beneficiario o un ingreso
  si prescribe). Recomendación: desde este reporte **siempre** nota de crédito
  inversa, con la fecha común escrita (por omisión, fin del mes abierto más antiguo o
  hoy), con cualquier estado del mes. `AnularCheque` gana el modo
  `conInversoSiempre`.
- El concepto del inverso es el de sistema `cheque_caduco` (H3), así el flujo de
  efectivo no lo cuenta como cobro.

### Interfaz

Reporte en **Reportes** (imprimir y exportar) con: casilla por fila y «seleccionar
todo lo filtrado», barra fija abajo con «N cheques · Q total · Anular seleccionados»,
ventana única con motivo (obligatorio, con sugerencia «Cheque caduco: más de 6 meses
sin cobrar»), fecha común, y resumen antes de confirmar («Se crearán N notas de
crédito por Q X en la fecha D; K pagaban facturas de proveedores, que volverán a
quedar pendientes»). En el tablero, un aviso con el conteo (cuando exista el panel).

Permisos: `bancos.cheques-caducos.ver`, `.exportar`; anular usa el existente
`bancos.cheques.anular`. Auditoría: una entrada `anular` por cheque, con el mismo
motivo.

---

## H7 Comisiones bancarias con IVA

Las comisiones y la venta de chequeras son servicios gravados: el banco emite una FEL
a nombre de la empresa y su IVA es **crédito fiscal** (Ley del IVA, arts. 3 y 16). Si
el IVA se deja dentro de la nota de débito, se pierde.

### Dirección de la comunicación

| Opción | Cómo | Evaluación |
|---|---|---|
| A. **Destino «Bancos»** en Ingreso de facturas | Libro de compras registra la factura (con sus líneas e IVA) y envía la orden `bancos.recibir_documento_fiscal`; Bancos la deja en una bandeja y el usuario la **liga** a una nota de débito existente (o registra la nota desde ahí). | Respeta «ingreso único» y el mediador; Bancos no conoce Libro de compras. **Recomendada.** |
| B. Desde la nota, botón «Registrar factura» | Bancos envía `libro-de-compras.registrar_documento`. | Duplica la pantalla de ingreso; Bancos pasaría a depender de un módulo opcional. |

### Tabla `bancos.documentos_de_notas`

| Columna | Tipo | Nulo | Nota |
|---|---|---|---|
| `id`, `empresa_id` | uuid | no | `politicaPorEmpresa()` |
| `documento_id` | uuid | no | id en Libro de compras, **sin FK** (otro módulo) |
| `movimiento_id` | uuid → `bancos.movimientos.id` | sí | nulo = en bandeja, sin ligar |
| `nit_emisor`, `serie`, `numero`, `fecha_emision` | text/date | no | copia para mostrar sin preguntar al otro módulo |
| `total`, `iva` | `numeric(14,2)` | no | |
| `estado` | text | no | `pendiente`, `ligado`, `anulado` (`check`) |

`unique (documento_id)`; índice `(movimiento_id)`. Una nota puede tener varias
facturas (el banco a veces factura cada comisión por separado). Regla: la suma de
`total` de las facturas ligadas ≤ monto de la nota; si es menor, aviso (el resto no
llevaba factura). Solo en notas de débito cuyo concepto tiene `admite_factura`.

Anulaciones: si Libro de compras anula el documento, avisa
(`libro-de-compras.documento_anulado`, dentro de la transacción) y Bancos lo marca
`anulado`. Si Bancos anula la nota, la liga se conserva (la factura sigue siendo
válida: el banco la cobró); el usuario decide en Libro de compras.

Contrapartida contable del destino «Bancos»: la **cuenta bancaria** (ya se pagó), no
Proveedores; no se provisiona. Permisos: el del ingreso autoriza la orden; ligar
desde Bancos usa `bancos.notas.gestionar`. Excel: ninguno.

---

## H8 Intereses con ISR retenido

El banco retiene el **10 %** de ISR sobre intereses (rentas de capital, Decreto
10-2012, arts. 92 y 93) y acredita el neto.
([Decreto 10-2012](https://www.congreso.gob.gt/assets/uploads/info_legislativo/decretos/2012/010-2012.pdf))

`bancos.movimientos` gana:

| Columna | Tipo | Nulo |
|---|---|---|
| `interes_bruto` | `numeric(14,2)` | sí |
| `isr_retenido` | `numeric(14,2)` | sí |

```sql
check (
  (interes_bruto is null and isr_retenido is null)
  or (tipo = 'credito' and isr_retenido >= 0
      and interes_bruto = monto + isr_retenido)
)
```

La pantalla pide solo el bruto (o el neto) y **propone** el ISR al 10 % (tasa en
configuración de instalación `bancos.intereses.tasa_isr`, 0.10), editable porque el
banco redondea. Se muestran solo si el concepto tiene `pide_datos_de_intereses`. El
inverso copia los dos campos. Reporte **Intereses y retenciones** (Reportes, imprimir
y exportar) para la declaración anual. Datos existentes: quedan nulos.

---

## H9 Correlativo interno de comprobantes

### Secuencias contra tabla de correlativos

| | Secuencia de PostgreSQL | Tabla con bloqueo de fila |
|---|---|---|
| Huecos | **Sí**: `nextval` no se deshace con un `rollback` (cada error de validación, cada importar en ensayo, deja un hueco) | **No**: el `update` se deshace con la transacción |
| Concurrencia | Sin espera | Dos notas de la misma empresa y tipo esperan una a la otra hasta el `commit` (milisegundos a este volumen) |
| Por empresa y tipo | Una secuencia por combinación: se crean en tiempo de ejecución | Una fila por combinación |

**Recomendación: tabla en el core**, porque Cuentas por pagar (contraseñas) y otros
la necesitarán igual:

```text
core.correlativos
  empresa_id  uuid not null → core.empresas
  clave       text not null   -- 'bancos.notas_de_credito', 'bancos.notas_de_debito', 'bancos.transferencias'
  anio        integer not null default 0   -- 0 = no se reinicia por año
  siguiente   integer not null default 1  check (siguiente > 0)
  primary key (empresa_id, clave, anio)
  politicaPorEmpresa()
```

Puerto `Correlativos.siguiente(clave)`: `insert … on conflict do update set siguiente
= siguiente + 1 returning siguiente - 1`, dentro de la unidad de trabajo del caso de
uso (el bloqueo dura lo que la transacción; el importar de 5,000 filas bloquea a los
demás de esa empresa y tipo mientras dura, aceptable).

`bancos.movimientos.numero integer null` y `bancos.transferencias.numero integer
null`, con `unique (empresa_id, tipo, numero) where numero is not null` en
movimientos (los cheques usan su propio número de chequera y quedan con `numero`
nulo; las dos notas de una transferencia llevan el número de la transferencia en
`bancos.transferencias`, no uno propio). Los **inversos** son comprobantes: llevan
número de su tipo.

**Eliminar un registro limpio deja un hueco.** Es aceptable y es la práctica: el
número queda en `core.auditoria` (`anterior.numero`) con quién, cuándo y por qué. El
reporte **Correlativos** lista huecos y los explica con la auditoría; un hueco sin
auditoría es una alerta. Prohibir eliminar numerados contradiría el B7.

Datos existentes: migración que numera por empresa y tipo en orden
`(fecha, creado_en)`, y deja `siguiente` en el último + 1. Permisos: ninguno nuevo
(ver el reporte de correlativos: `bancos.movimientos.ver`).

---

## H10 NIT del proveedor en Libro de compras

- No se toca `terceros`: allí el NIT sigue opcional (el dato mínimo es el nombre, y
  un proveedor de caja chica puede no tenerlo). La regla la aplica **Libro de compras
  al registrar**: `Nit` válido (dígito verificador, ya existe en el core) y
  `!esConsumidorFinal()`. Error `ProveedorSinNit` con enlace para completarlo.
- **Crítico — qué NIT manda:** el del **DTE** (serie, número, UUID y NIT del emisor
  vienen en la FEL y en el Excel de la SAT). Si el proveedor elegido tiene otro NIT, se
  rechaza; si no tiene, se propone completarlo con el del DTE (orden
  `terceros.completar_nit`, dentro de la transacción y con el permiso del ingreso).
- El documento guarda `nit_emisor` como estaba (el plan ya lo dice), así un cambio
  posterior en el proveedor no altera el libro.
- Datos de desarrollo: 2 proveedores, 1 sin NIT, ninguno con CF. No hay migración:
  se piden al usarlos. Un reporte de «Proveedores sin NIT» en Clientes ayuda a
  completarlos antes.
- Compras a quien no tiene NIT: factura especial (fuera de esta versión).

---

## H11 Plazo del crédito fiscal

### Base legal

Ley del IVA, art. 20: las facturas que no se reporten en el período que les
corresponde pueden reportarse **a más tardar en los dos meses inmediatos
siguientes**; después no hay derecho a compensar ni a devolución. Ejemplo: factura
de enero, hasta la declaración de marzo.
([Vesco Consultores](https://vescco.tax/blog/credito-fiscal-iva-en-guatemala-despues-de-dos-meses/),
[Ley del IVA](https://tse.org.gt/images/UECFFPP/leyes/decreto_27-92-iva.pdf)).
Para ISR la factura vencida para IVA **sigue respaldando el costo**
([Lexology](https://www.lexology.com/library/detail.aspx?g=9d31ba5e-866d-4db5-84de-71b15fe39048)).

### Diseño (para el plan de Libro de compras)

`libro_de_compras.documentos` gana:

| Columna | Tipo | Nulo | Nota |
|---|---|---|---|
| `periodo` | `date` | no | primer día del mes del libro; `check (extract(day from periodo) = 1)` |
| `iva_acreditable` | boolean | no | falso si está fuera de plazo |

```sql
check (periodo >= date_trunc('month', fecha_emision)::date)
check (not iva_acreditable
       or periodo <= (date_trunc('month', fecha_emision) + interval '2 months')::date)
```

- Al registrar se **propone** `periodo` = mes actual abierto; el usuario puede
  elegir el de la emisión o uno de los dos siguientes.
- **Fuera de plazo: avisar, no impedir.** La factura se registra (es costo válido y
  una deuda real que Cuentas por pagar debe pagar), con `iva_acreditable = false`: el
  IVA pasa al costo y **no** entra en la columna de crédito fiscal del libro. Impedir
  obligaría a dejar fuera del sistema facturas que sí hay que pagar.
- **Períodos declarados:** `libro_de_compras.periodos (empresa_id, periodo, estado
  'abierto'|'declarado', declarado_en, declarado_por)`, único `(empresa_id,
  periodo)`. No se registra ni se anula en un período declarado (como el mes
  conciliado de Bancos); declarar y reabrir con permiso propio
  (`libro-de-compras.periodos.declarar`, `.reabrir`) y auditoría.
- Notas de crédito del proveedor: rebajan el crédito del **período en que se
  reciben** (confirmar con el contador del usuario; queda en el punto 5 de la hoja de
  ruta).
- Índices: `(empresa_id, periodo)` para el libro mensual.

---

## Dependencias y orden de implementación

```text
H1 ─────────────────────────────── (independiente, primero: protege la evidencia)
H4 ─────────────────────────────── (independiente, pequeño)
H9 core.correlativos ──▶ numeración en Bancos ──▶ H6 (inversos numerados)
H3 conceptos ──▶ H8 (el concepto pide intereses) ──▶ H7 (el concepto admite factura)
core.archivos PDF ──▶ H2
H5 localidades/áreas/datos fiscales ──▶ Libro de compras L1
Libro de compras L1/L3 ──▶ H10, H11, H7
```

Pasos (un commit cada uno, con sus pruebas):

1. **H1a** Función de depuración con piso de 60 meses, variable en 60, FK `restrict`.
2. **H1b** Acción `corregir` en la auditoría y su uso en notas y saldo inicial.
3. **H1c** Respaldo mensual conservado 60 meses (`infra/respaldo.sh`).
4. **H4** Único por empresa + banco + número normalizado.
5. **H9a** `core.correlativos` y puerto `Correlativos`. **Hecho (2026-09-29).**
6. **H9b** Número en notas, inversos y transferencias; migración de datos; reporte de correlativos. **Servidor hecho (2026-09-29); falta el cliente.** Ver `bancos.md`, sección H9.
7. **H3a** `bancos.conceptos` (servidor, cliente, Excel) y semilla. **Servidor hecho (2026-09-29); falta el cliente.** Ver `bancos.md`, sección H3a.
8. **H3b** `concepto_id` obligatorio en notas y cheques; migración de datos.
9. **H3c** Reportes Flujo de efectivo y Movimientos por concepto.
10. **H8** Interés bruto e ISR retenido.
11. **Archivos PDF** en `core/archivos`.
12. **H2** Saldo del estado de cuenta y archivo en la conciliación.
13. **H6a** Reporte de cheques caducos (índice, filtros, imprimir, exportar).
14. **H6b** Anulación en lote.
15. **H5a** Datos fiscales de la empresa, fecha de inicio y carga inicial.
16. **H5b** `core.localidades` con acceso por `core.accesos_datos` y `politicaPorAlcanceOpcional`.
17. **H5c** `core.areas`.
18. **H10, H11, H7**: dentro de los pasos L1 y L3 de Libro de compras (corregir su plan
    antes) y un paso **H7** en Bancos después de L3.

---

## Preguntas para el usuario

1. **H1** ¿Aceptas 5 años como **mínimo fijo** (ni soporte lo baja) y que las
   cuentas y empresas ya no se borren, solo se inactiven?
2. **H1** ¿Auditamos también las **correcciones** (no solo bajas)? Multiplica el
   tamaño por ~4 y sigue siendo pequeño.
3. **H1** ¿Dónde se guardan fuera del servidor los respaldos mensuales (otro VPS,
   almacenamiento S3/R2, un disco en la oficina)?
4. **H2** El saldo del estado de cuenta, ¿siempre obligatorio? ¿Y el PDF o la foto,
   obligatorio por omisión pero configurable por empresa?
5. **H3** ¿Aceptas el catálogo de conceptos bancarios (la descripción y la cuenta
   contable no alcanzan sin Contabilidad)? ¿Te sirve la lista sugerida de conceptos?
6. **H3** ¿Los cheques también llevan concepto obligatorio, o solo las notas?
7. **H4** ¿Normalizamos el número de cuenta (sin guiones ni espacios) para compararlo?
8. **H5** ¿Te parece llamar **Áreas** a los «departamentos» internos (para no
   confundirlos con los departamentos de Guatemala) y que un área pueda o no ser de
   una sola localidad?
9. **H5** ¿Confirmas que Bancos **no** se filtra por localidad (se sigue usando el
   alcance por cuenta bancaria)?
10. **H5** ¿Qué tipos de localidad necesitas además de finca, planta, oficina y
    bodega?
11. **H6** Desde el reporte de cheques caducos, ¿anulamos **siempre** con nota
    inversa a una fecha común (aunque el mes del cheque no esté conciliado), para no
    cambiar saldos de meses pasados?
12. **H6** ¿Seis meses fijos o configurable por empresa?
13. **H7** ¿Aceptas el destino «Bancos» en Ingreso de facturas para las facturas del
    banco, ligadas después a su nota de débito?
14. **H8** ¿Pedimos el interés bruto y proponemos el ISR al 10 %, o pedimos los dos
    montos como vienen en el estado de cuenta?
15. **H9** ¿El correlativo es por empresa o por cuenta bancaria? ¿Se reinicia cada
    año? ¿Notas de crédito y de débito llevan series separadas?
16. **H9** ¿Aceptas que eliminar una nota limpia deje un hueco explicado por la
    auditoría?
17. **H10** Si el NIT del DTE no coincide con el del proveedor elegido, ¿rechazamos, o
    proponemos actualizar el proveedor?
18. **H11** Fuera del plazo de dos meses: ¿registrar con aviso y el IVA al costo
    (recomendado) o impedir el registro?
19. **H11** ¿Manejamos el estado **declarado** de cada mes del libro para bloquear
    cambios después de presentar la declaración?

---

## Decisiones del usuario (2026-09-28)

| # | Decisión |
|---|---|
| Auditoría | **Nunca se borra**: se quita el `on delete cascade` de `core.auditoria` (llave `restrict` o sin llave). Conservación mínima de 5 años. El crecimiento escala con el uso (1,000 usuarios ≫ 1); como casi no se consulta, se acepta; si crece, se particiona por año. También se **auditan las correcciones**. |
| Cuentas (suscriptores) | Las **cuentas de la instalación nunca se eliminan**, solo se inactivan. |
| Empresas | Se **eliminan solo si no tienen datos**; con datos, solo se inactivan. |
| Respaldos | Copia mensual fuera del servidor: disco o servidor distinto en la misma red, o un drive desde donde el usuario la descarga y la graba en disco. Conservar 5 años. |
| Archivos | **Lista blanca** de tipos permitidos y verificación real del contenido (no confiar en la extensión). Investigar malware y **esteganografía** antes de planificar (ver «Pendiente de investigar»). |
| H2 | De acuerdo: saldo del estado de cuenta transcrito, siempre obligatorio, y archivo configurable. El **saldo calculado** sale de los documentos que el usuario marca (así funciona hoy); el transcrito solo se compara. |
| H3 | De acuerdo con el catálogo `bancos.conceptos`, **editable por el usuario** (la lista sugerida de la semilla es solo un punto de partida). |
| H3 cheques | El concepto del cheque lo manda el **módulo de origen** (p. ej. Cuentas por pagar); en un cheque emitido desde la ventana de Cheques lo elige el usuario. Investigar más. |
| H4 | Se **guarda el número tal como se escribe** (`varchar`, con guiones, porque así lo reconocen los usuarios en los selectores) y se agrega una **columna normalizada** (sin guiones ni espacios) solo para la unicidad por empresa y banco y para reportes. |
| H5 / esquema | Crear un **esquema `empresas`** (en la misma base de datos) para localidades, **departamentos**, accesos y datos fiscales de la empresa, separado del core: así «departamentos» no choca con `core.departamentos` (los de Guatemala). `core.empresas` se queda en el core (lo necesitan la sesión y la RLS). Se conserva el nombre **departamentos**. |
| H5 bancos | Las cuentas bancarias **no** se filtran por localidad, solo por empresa. En los selectores se **agrupan por banco** (p. ej. «BI» y debajo sus cuentas) y **siempre se ordena por nombre**. El `CampoSelector` necesitará grupos. |
| H5 tipos | Soportar **todos** los tipos de localidad (catálogo editable: finca, planta, oficina, bodega…). **No confundir** con terrenos o parcelas (módulo propio más adelante). |
| H6 | De acuerdo con el reporte y la anulación en lote. Antigüedad **configurable, 7 meses por omisión**. El reporte solo muestra cheques **emitidos y no cobrados**; esos se anulan con **nota inversa**. Los cheques **disponibles** que nunca se emitieron no tienen movimiento: no entran al reporte (se resuelven inactivando la chequera). |
| H7 | **Validar al 100 %** con el experto contable antes de programar. |
| H8 | Se sigue platicando (ver explicación en la conversación: intereses que el banco paga en la cuenta, con 10 % de ISR ya retenido; no es retención de facturas). |
| H9 | Correlativo **por empresa**; por omisión **no se reinicia cada año**, pero se soporta que un cliente lo pida (configurable). Hueco al eliminar: permitido y explicado por la auditoría (que ahora nunca se borra). |
| H10 | De acuerdo: el NIT lo exige Libro de compras; en Clientes sigue opcional (un cliente puede pedir CF). |
| H10 NIT distinto | Si el NIT del DTE no coincide con el del proveedor elegido: **se rechaza**. |
| H11 | Fuera de plazo: **se registra con aviso** (IVA al costo). **Validar al 100 %** la solución con el experto contable. |
| H11 declarado | Pendiente: recomendación en la conversación (opcional por empresa). |

### Pendiente de investigar

1. **Seguridad de archivos**: lista blanca (imágenes JPG/PNG/WebP, PDF, Excel para importar), verificación por firma real del contenido, límites de tamaño, re-codificar imágenes (ya se convierten a WebP: eso elimina la mayoría de datos ocultos por esteganografía), sanear o rechazar PDF con JavaScript, formularios o archivos incrustados, antivirus (p. ej. ClamAV), servir siempre como descarga con su tipo y sin ejecutar, bibliotecas al día.
   **Investigado (2026-09-28):** `docs/modulos/seguridad-de-archivos.md` (A1 bomba zip
   de prioridad alta; PDF con qpdf; ClamAV descartado por memoria; 10 preguntas).
2. **H7 y H11**: confirmación del experto contable (ley del IVA, práctica en Guatemala).
   **Validado (2026-09-29):** `docs/modulos/validacion-h7-h11-retenciones.md`. H7 como
   está es **incorrecto** (servicios bancarios exentos, art. 7.4 Ley del IVA; lo que sí
   trae IVA son seguros y débitos automáticos de terceros). H11 correcto con ajustes
   (motivo de IVA no acreditable, notas de crédito del proveedor). Las retenciones se
   fijan **al registrar la factura**, no al autorizar. Seis preguntas para el usuario.
3. **Concepto de los cheques** según su origen.
4. **Esquema `empresas`**: qué se mueve del core y cómo afecta RLS, sesión y el módulo `empresas` que ya existe.

### Baja de un cliente (decisión del 2026-09-28, posterior)

Si un cliente (cuenta) deja el servicio, **sus datos se eliminan**; no se guardan para
siempre. La obligación legal de conservar libros y documentos (4 a 5 años) es **del
cliente**, no de Arrancar: se le entrega su información antes de borrar.

1. **Solicitud de baja**: la cuenta pasa a `en_baja` (nadie entra, salvo el
   superacceso). Se le entrega una **exportación completa** de sus datos (respaldo
   solo de su cuenta y/o Excel de cada módulo).
2. **Plazo de gracia** configurable (p. ej. 60 días) por si se arrepiente.
3. **Eliminación definitiva** por el superacceso, con confirmación: se borran todas
   las filas de la cuenta en todos los esquemas, **incluida su auditoría** (esta es la
   única vía que la borra; por eso la llave de la auditoría hacia la cuenta se
   mantiene con borrado controlado por este proceso y no por un `cascade` accidental).
4. Queda un registro mínimo en la **bitácora de plataforma** (qué cuenta, quién, cuándo,
   sin datos del cliente).
5. Los **respaldos** ya hechos conservan esos datos hasta que venzan (diarios 14 días,
   mensuales según su retención); se informa al cliente en el contrato. Si después
   pide algo, se le puede entregar desde un respaldo vigente.

Fuera de esta baja, las cuentas y la auditoría **no se eliminan**; las empresas solo
si no tienen datos. Pendiente para el `arquitecto-de-datos`: el orden de borrado entre
esquemas y la exportación de una sola cuenta.
