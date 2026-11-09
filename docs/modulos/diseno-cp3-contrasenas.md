# Diseño CP3: contraseñas de pago de Cuentas por pagar — arquitecto de datos, 2026-11-08

Estado: **propuesta para aprobar**. Aterriza el paso **CP3** de `cuentas-por-pagar.md` («Contraseñas: crear (con
documentos registrados o autorizados), imprimir y anular»), sus «Reglas de contraseñas, pagos y anulaciones», las
«Respuestas del usuario (2026-09-29, tarde)», la fila CP3 de `diseno-datos-cuentas-por-pagar.md` §2 («documentos
pendientes, registrados o autorizados») y la C4 del contador (U14 c: «Vence» y «Pago prometido» son datos distintos).
Convive con CP1 (programado), U8 (`diseno-u8-saldos-iniciales-cuentas-por-pagar.md`, aprobado y en programación) y CP2
(`diseno-cp2-notas-de-credito.md`, que va antes). Deja preparado CP4 (pagos). Lo nuevo que aparezca al programar va a
§13.

**Ya decidido y que no se vuelve a preguntar:**

| Tema | Decisión | Fuente |
|---|---|---|
| Qué es | Agrupa documentos de **un proveedor** con una **fecha prometida de pago**; se entrega al proveedor cuando trae la factura, antes de aprobarla; se **imprime** | `cuentas-por-pagar.md`, Flujo 5 |
| Qué documentos | Cargos y notas de crédito **pendientes (de la bandeja), registrados o autorizados**, del mismo proveedor, que **no estén en otra contraseña vigente** | Respuestas del 2026-09-29; CP1 §2; hoja de ruta («Contraseña de pago: confirmado») |
| Todo pago va por contraseña | Y solo se **paga** lo autorizado (CP4) | `cuentas-por-pagar.md` |
| Número | Correlativo **por empresa**, lo asigna el sistema | Reglas de contraseñas |
| No se eliminan | Para no perder el correlativo | Reglas de contraseñas |
| Anular | Sin reversión; queda anulada con motivo y en la auditoría; **suelta sus documentos**; solo si no tiene pagos vigentes (CP4) | Reglas de contraseñas |
| Documento en una contraseña | **No se elimina**: primero se saca de la contraseña. Tampoco se anula mientras esté en una vigente | Respuestas del 2026-09-29; CP1 §4.4 (`DocumentoEnContrasena`) |
| Vencimiento | La contraseña **no** lo mueve; «Pago prometido» es otro dato; la antigüedad usa «Vence» | C4, U14 c |
| Saldos iniciales | Hacen todo su proceso, incluida la contraseña | U8 |
| Pantalla | Operación, sin Excel | `cuentas-por-pagar.md`, Pantallas; regla de secciones |
| Formas de pago extra de saldos iniciales y de notas de débito existentes | Van con CP4 | U8; respuestas del 2026-09-29 |

## 1. Lo encontrado en el código y la base

1. **No hay nada de contraseñas** en el esquema `cuentas_por_pagar` ni en el código. Las reglas de baja ya dejaron el
   lugar: `REGLAS_PARA_ANULAR`, `REGLAS_PARA_ELIMINAR` y `REGLAS_PARA_DESAUTORIZAR` (`dominio/reglas-de-baja.ts`) se arman
   en la composición; U8 suma `REGLAS_PARA_CORREGIR_SALDO_INICIAL` y CP2 `REGLAS_PARA_QUITAR_APLICACION`, todas
   esperando «no está en una contraseña vigente».
2. **`documentos_id_proveedor_unico (id, empresa_id, proveedor_id)`** existe «para las llaves de `aplicaciones_de_notas`
   (y de la contraseña en CP3)» (CP1 §3.1): la contraseña puede garantizar en la base que sus documentos son de su
   proveedor y de su empresa.
3. **Correlativos:** `core.correlativos` (por empresa, clave y año; `CorrelativosPostgres` en `dependenciasCompartidas()`)
   con reinicio anual opcional por empresa (`core.correlativos.reinicio_anual`). Bancos lo usa con `numero integer` +
   `anio_de_numero integer not null default 0` y único `(empresa_id, anio_de_numero, numero)`; el cliente lo muestra como
   `15` o `2026-15` (`detalles-de-nota.ts`). El número no deja huecos por errores (se deshace con la transacción).
4. **Datos de la empresa para imprimir:** la orden `empresas.obtener_datos_de_empresa` (`core/contratos/
   empresas.contratos.ts`) responde `nombre`, `nit`, `razonSocial` y `nombreComercial`.
5. **Imprimir:** hay dos caminos en el repositorio: el PDF del Libro de compras (`pdfkit` en el servidor, con folios y
   copia guardada en `core.archivos`) y los reportes de Bancos y del análisis de compras (página del cliente e
   `window.print()`).
6. **Proveedor:** `terceros.proveedores` es de la cuenta; U8 agrega `documentos_proveedor_por_pagar_fk (proveedor_id) →
   terceros.proveedores (id)`. El NIT y el nombre están en `terceros.terceros` (lectura permitida desde
   `infraestructura`: Terceros llega por el `dependeDe` transitivo).
7. **Base de desarrollo** (solo lectura, 2026-11-08): `cuentas_por_pagar.documentos` sin filas; `core.correlativos` con 3
   filas (de Bancos). Tablas nuevas: no hay datos que convertir.
8. **Migraciones:** `0003` es de U8 y `0004` de CP2; esta es la **`0005_cp3_contrasenas`** si se respeta ese orden (si
   cambia, se renumera al generarla; su `when` debe quedar mayor que el de la anterior).

## 2. Modelo

```
crear ──▶ vigente ──anular──▶ anulada
            │  ▲
            └──┘ agregar o quitar documentos, cambiar la fecha prometida (mientras no tenga pagos, CP4)
```

«Pagada en parte» y «pagada» **no son estados**: saldrán de los pagos (CP4), igual que en los documentos.

**Montos vivos.** La contraseña no guarda montos: muestra los saldos de sus documentos en el momento en que se consulta
o se imprime (pregunta CP3-c). El total y las retenciones de cada documento no cambian nunca (vienen del libro o del
saldo inicial); lo que puede cambiar es lo rebajado (una nota que llega después, una aplicación manual) y, en CP4, lo
pagado. La impresión dice cuándo se imprimió.

| Concepto (por cargo) | Fórmula |
|---|---|
| Total | `total` |
| Retenciones | `retenciones` (en un saldo inicial, todas las del documento; U8) |
| Rebajado | `neto − saldo` sin pagos: notas aplicadas de todas las formas y, en un saldo inicial, «pagos y notas anteriores a la fecha de inicio» |
| A pagar | el **saldo** del cargo (CP1 §4.2, con U8 y CP2) |

Totales de la contraseña: Σ por columna de sus cargos. Las notas que la contraseña incluye aparecen en su propia
sección con lo que aplicaron dentro de ella.

**Notas de crédito dentro de la contraseña (pregunta CP3-a, opción recomendada A).** Una nota con saldo libre que entra
en la contraseña **se reparte entre los cargos de esa contraseña** al guardarla, con aplicaciones `forma = 'contrasena'`
y `contrasena_id`. El reparto se **rehace entero** cada vez que cambian los documentos de la contraseña (crear, agregar,
quitar): se borran las aplicaciones de la contraseña y se vuelve a repartir. Al anularla se borran. Es determinista y no
deja aplicaciones huérfanas:

- Notas en orden de fecha de emisión (y de alta); cargos en orden de vencimiento, fecha de emisión y alta.
- Cada nota reparte su saldo libre (sin contar lo que ya aplicaba en esta contraseña) con `repartirNotaDeCredito` sobre
  los saldos que van quedando; lo que sobra sigue libre en la nota.
- Fecha de esas aplicaciones: la de la contraseña.

Alternativas: **(B)** la nota solo resta en pantalla y se aplica al pagar (CP4): la contraseña no toca saldos, pero el
saldo de los cargos y el de la nota no dicen lo mismo que la contraseña hasta que se paga, y CP4 carga con el reparto.
**(C)** la contraseña solo admite cargos y las notas se aplican antes con CP2: es lo más simple, pero contradice «agrupa
facturas y notas de crédito» del plan y obliga a dos pasos.

## 3. Datos

### 3.1 Tabla nueva `cuentas_por_pagar.contrasenas`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK (`idPrimario`) |
| `empresa_id` | uuid | no | FK `core.empresas` on delete cascade |
| `proveedor_id` | uuid | no | FK `contrasenas_proveedor_fk (proveedor_id) → terceros.proveedores (id)`, **no action** (un proveedor con contraseñas no se borra; se inactiva) |
| `numero` | integer | no | del correlativo `cuentas-por-pagar.contrasenas`; check `contrasenas_numero_positivo`: `numero > 0` |
| `anio_de_numero` | integer | no | `default 0`; el año si la empresa reinicia sus correlativos cada año |
| `fecha` | date | no | día en que se recibe y se entrega (§5.1) |
| `fecha_de_pago` | date | no | la prometida al proveedor; check `contrasenas_pago_desde_la_fecha`: `fecha_de_pago >= fecha` |
| `observaciones` | text | sí | check `contrasenas_observaciones_validas`: `observaciones is null or (char_length(observaciones) between 1 and 500 and observaciones = btrim(observaciones))` |
| `estado` | text | no | `default 'vigente'`; check `contrasenas_estado_valido`: `in ('vigente', 'anulada')` |
| `anulada_en` | timestamptz | sí | |
| `anulada_por` | uuid | sí | |
| `motivo_de_anulacion` | text | sí | check `contrasenas_motivo_rango`: `is null or char_length between 1 and 300` |
| `...marcasDeTiempo`, `...autoria` | | | `creado_por` = quien la creó |

Check de estado `contrasenas_anulacion_completa`: `(estado = 'anulada') = (anulada_en is not null and anulada_por is
not null and motivo_de_anulacion is not null)`.

Únicos e índices:

| Nombre | Definición | Para |
|---|---|---|
| `contrasenas_numero_unico` | unique `(empresa_id, anio_de_numero, numero)` | El correlativo no se repite (error de programación si salta) |
| `contrasenas_id_proveedor_unico` | unique `(id, empresa_id, proveedor_id)` | Destino de las llaves compuestas de §3.2 |
| `contrasenas_proveedor_idx` | `(proveedor_id)` | Índice de la llave hacia Terceros |
| `contrasenas_lista_idx` | `(empresa_id, estado, fecha)` | Lista con filtros |
| `contrasenas_pago_idx` | `(empresa_id, fecha_de_pago) where estado = 'vigente'` | «Por pagar esta semana» (y CP4/CP5) |

RLS: `politicaPorEmpresa()`. Sin alcance por registro (el plan no lo pide).

### 3.2 Tabla nueva `cuentas_por_pagar.contrasena_documentos`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `empresa_id` | uuid | no | FK `core.empresas` on delete cascade |
| `proveedor_id` | uuid | no | solo para las llaves |
| `contrasena_id` | uuid | no | FK `contrasena_documentos_contrasena_fk (contrasena_id, empresa_id, proveedor_id) → contrasenas (id, empresa_id, proveedor_id)`, no action |
| `documento_id` | uuid | no | FK `contrasena_documentos_documento_fk (documento_id, empresa_id, proveedor_id) → documentos (id, empresa_id, proveedor_id)`, **on delete cascade** (decisión de abajo) |
| `vigente` | boolean | no | `default true`; pasa a `false` al anular la contraseña |
| `...marcasDeTiempo`, `...autoria` | | | `creado_por` = quien lo agregó |

| Nombre | Definición | Para |
|---|---|---|
| `contrasena_documentos_par_unico` | unique `(contrasena_id, documento_id)` | Un documento una vez por contraseña; cubre la llave de la contraseña |
| `contrasena_documentos_vigente_unico` | unique `(documento_id) where vigente` | **Un documento en una sola contraseña vigente** (la base lo garantiza, también ante dos usuarios a la vez) |
| `contrasena_documentos_documento_idx` | `(documento_id)` | Cascada y «¿en qué contraseñas estuvo?» |

RLS: `politicaPorEmpresa()`.

Las llaves compuestas garantizan en la base que todos los documentos son **del proveedor de la contraseña** y de la
misma empresa. Lo que revisa el dominio (otras filas): que `vigente` coincida con el estado de su contraseña (prueba de
consistencia), que el documento no esté anulado y que haya al menos un cargo.

**Quitar** un documento de una contraseña vigente **borra** su fila (con auditoría `quitar`, §6.2). **Anular** la
contraseña deja sus filas con `vigente = false`: la ficha de una contraseña anulada sigue mostrando lo que tenía.

**Decisión: `on delete cascade` hacia el documento (pregunta CP3-g).** Un documento en una contraseña **vigente** no se
da de baja (regla `noEstarEnContrasena`, §5.4), así que la cascada solo borra filas de contraseñas **anuladas**; el
`anterior` de la auditoría del documento eliminado las lleva. Con `no action`, un documento que estuvo en una contraseña
anulada no se podría eliminar nunca, y un **saldo inicial** (que no se anula, U8) cargado por error quedaría atascado.

### 3.3 Cambios en `cuentas_por_pagar.aplicaciones_de_notas` (sobre lo de CP2)

| Columna o restricción | Regla |
|---|---|
| `contrasena_id` uuid, nulo | FK `aplicaciones_contrasena_fk (contrasena_id) → contrasenas (id)`, no action |
| `aplicaciones_forma_valida` | pasa a `forma in ('automatica', 'manual', 'contrasena')` |
| `aplicaciones_contrasena_de_su_forma` (nuevo) | `(forma = 'contrasena') = (contrasena_id is not null)` |
| `aplicaciones_contrasena_idx` (nuevo) | `(contrasena_id) where contrasena_id is not null` |

Que la nota y el cargo de una aplicación `contrasena` estén en esa contraseña lo cuida el caso de uso (se rehace el
reparto completo) y la prueba de consistencia.

### 3.4 Migración

`0005_cp3_contrasenas` (§1.8), con `npm run bd:generar -w servidor -- cuentas-por-pagar cp3_contrasenas`, revisada a
mano: crea `contrasenas` y `contrasena_documentos` con checks, únicos (el parcial va a mano si drizzle-kit no lo
escribe), índices, llaves (la de Terceros y las compuestas) y RLS; agrega `contrasena_id` a `aplicaciones_de_notas`,
cambia `aplicaciones_forma_valida` (`drop` y `add`) y agrega el check y el índice nuevos. Sin relleno (tablas nuevas; no
hay aplicaciones `contrasena`). Sin migración de permisos. Ninguna migración en otro esquema. El correlativo no necesita
fila previa: `CorrelativosPostgres` la crea al pedir el primer número.

### 3.5 Mensajes de restricciones (`MENSAJES_POR_RESTRICCION`)

| Restricción | Mensaje |
|---|---|
| `contrasena_documentos_vigente_unico` | «Ese documento ya está en otra contraseña vigente.» (dos usuarios a la vez; el dominio lo revisa antes con `DocumentoYaEnContrasena`) |
| `contrasenas_numero_unico` | Sin mensaje: error de programación |
| `contrasenas_proveedor_fk` | Sin mensaje propio: `RecursoEnUso` genérico (igual que en U8) |

## 4. Integración con CP1, U8 y CP2

| Pieza | Cambio |
|---|---|
| Reglas de baja (`reglas-de-baja.ts`) | Regla nueva `noEstarEnContrasena` (lee si el documento está en una contraseña vigente) en `REGLAS_PARA_ANULAR` y `REGLAS_PARA_ELIMINAR` → `DocumentoEnContrasena`. **No** en `REGLAS_PARA_DESAUTORIZAR`: un documento desautorizado puede seguir en la contraseña (admite registrados) |
| `DocumentoConAplicaciones` / `buscarPorId` | Trae `contrasenaVigente: { id, numero, anioDeNumero } \| null` para que las reglas no consulten aparte |
| `HechosDelDocumento` / `accionesDelDocumento` | `enContrasena`; `puedeAnular` y `puedeEliminar` falsos si está en una vigente; CP2: `puedeAplicar` y `puedeAjustar` falsos en una nota dentro de una contraseña vigente |
| DTO `DocumentoPorPagarDto` | `contrasena: { id, numero } \| null` (la vigente; `numero` ya formateado, `2026-15` o `15`). Filtro nuevo `sinContrasena?: boolean` (lo usa la pantalla de crear y el reporte «Facturas autorizadas sin contraseña» de CP5) |
| `FichaDelDocumentoDto` (auditoría) | Las contraseñas en que estuvo el documento (vigente y anuladas), para el `anterior` de una eliminación |
| CP1, bajas por aviso de Libro de compras | Sin cambio de código: corren las listas de reglas, que ahora rechazan un documento en una contraseña vigente. Libro de compras muestra el mensaje |
| U8 `REGLAS_PARA_CORREGIR_SALDO_INICIAL` | Suma `noEstarEnContrasena` (corregir y eliminar un saldo inicial) |
| CP2 `REGLAS_PARA_QUITAR_APLICACION`, aplicar y ajustar | Suma «la nota no está en una contraseña vigente» (`NotaEnContrasena`) |
| CP2, ficha | Las aplicaciones `contrasena` se muestran «En contraseña N» sin «Quitar» (`AplicacionNoSeQuita`) |
| Recibir una nota de un cargo que está en una contraseña | Sin cambio: la aplicación automática corre igual y rebaja el saldo; la contraseña lo muestra al consultarla (montos vivos) |
| Eventos de documentos | Sin cambio |

## 5. Reglas

### 5.1 Crear

En una transacción, con `contrasenas.crear`:

1. Proveedor de la cuenta (consulta con RLS a `terceros.proveedores`). **Puede estar inactivo** (pregunta CP3-h): se le
   sigue debiendo.
2. Documentos: 1 a 100 ids sin repetir (`DemasiadosDocumentosEnContrasena`). Se bloquean (`for update`, en orden de id).
   Cada uno: de la empresa y **del proveedor** (`DocumentoDeOtroProveedor`), no `anulado`
   (`DocumentoNoDisponibleParaContrasena`), sin otra contraseña vigente (`DocumentoYaEnContrasena`, dice cuál). Un
   **cargo** debe tener saldo > 0; una **nota de crédito**, saldo libre > 0 (si no, `DocumentoNoDisponibleParaContrasena`
   con «no debe nada» o «no tiene saldo a favor»).
3. Al menos un cargo (`ContrasenaSinCargos`).
4. Fecha: la escrita, por omisión hoy; ni futura ni anterior a la emisión de alguno de sus documentos (no se entrega
   contraseña de un documento que aún no existía) → `FechaDeContrasenaInvalida`.
5. Fecha prometida de pago: obligatoria, `>= fecha` (`FechaDePagoInvalida`). La pantalla propone la **mayor fecha de
   vencimiento** de los cargos (si es anterior a la fecha, la fecha) (pregunta CP3-d).
6. Observaciones: se recortan; vacías = nulas; hasta 500.
7. Número: `correlativos.siguiente('cuentas-por-pagar.contrasenas', fecha)` (después de validar, para no gastar números).
8. Inserta la contraseña y sus documentos; **rehace el reparto** de sus notas (§2). Si después del reparto ningún cargo
   queda con saldo (las notas lo cubren todo) → `ContrasenaSinSaldo` («no hay nada que pagar; aplique las notas en
   Notas de crédito»).
9. Sin auditoría (alta; `creado_por`). Sin evento (pregunta CP3-k).

Los documentos de la **bandeja** (sin completar) entran (decisión del 2026-09-29); el vencimiento se completa después y
no cambia la contraseña.

### 5.2 Editar (mientras esté vigente y, con CP4, sin pagos)

| Acción | Regla |
|---|---|
| Cambiar la fecha prometida y las observaciones | `>= fecha`; sin auditoría (no es baja; queda `actualizado_por`). La impresión nueva sale con la fecha nueva |
| Agregar documentos | Mismas validaciones que al crear (§5.1, 2); rehace el reparto |
| Quitar un documento | Motivo obligatorio (1–300); no puede quedar sin cargos (`ContrasenaSinCargos`: «anúlela en su lugar») ni sin nada que pagar (`ContrasenaSinSaldo`); auditoría `quitar` (§6.2); borra la fila y rehace el reparto. CP4 sumará «el documento tiene pagos de esta contraseña» a `REGLAS_PARA_QUITAR_DE_CONTRASENA` |

Una contraseña anulada no se edita (`ContrasenaAnulada`). La fecha de la contraseña y el proveedor no se cambian (si
están mal, se anula y se hace otra).

### 5.3 Anular

1. Bloquea la contraseña; vigente → si no, `ContrasenaAnulada`.
2. `REGLAS_PARA_ANULAR_CONTRASENA` (vacía en CP3; CP4 suma «tiene pagos vigentes» → `ContrasenaConPagos`).
3. Motivo obligatorio (1–300).
4. Auditoría `anular`, recurso `cuentas-por-pagar.contrasenas`, `anterior` = `ContrasenaDto` como estaba (documentos,
   montos de ese momento y aplicaciones de la contraseña), con el motivo.
5. Borra las aplicaciones `forma = 'contrasena'` de esta contraseña (lo aplicado vuelve al saldo libre de sus notas);
   pone `vigente = false` en sus documentos; `estado = 'anulada'`, `anulada_en/por`, `motivo_de_anulacion`.
6. Sin reversión ni evento (decidido: no genera reversión). Los documentos quedan libres para otra contraseña.

### 5.4 Bajas de los documentos

`noEstarEnContrasena` rechaza anular o eliminar (desde Cuentas por pagar o por aviso de Libro de compras) un documento
que está en una contraseña **vigente**: `DocumentoEnContrasena` («Está en la contraseña N: quítelo de ella o anúlela
primero»). Desautorizar y cambiar el vencimiento sí se permiten. Un documento que solo estuvo en contraseñas anuladas se
da de baja normalmente (la cascada se lleva esas filas, §3.2).

### 5.5 Imprimir

`GET …/contrasenas/:id/impresion` arma todo lo que va en el papel (la página del cliente solo dibuja):

- Empresa: razón social (o nombre), nombre comercial y NIT (`empresas.obtener_datos_de_empresa` por el mediador).
- Contraseña: número (`2026-15` o `15`), fecha, fecha prometida de pago, observaciones; si está anulada, «ANULADA» con su
  motivo, bien visible.
- Proveedor: nombre y NIT.
- Cargos: tipo, serie y número, fecha de emisión, vencimiento, total, retenciones, rebajado, a pagar; totales.
- Notas de crédito incluidas: serie, número, fecha y lo que aplicaron en esta contraseña.
- Si un cargo es saldo inicial con retenciones por practicar (U8), la línea lo indica (texto de U8 §2, consecuencia 2, sin
  descontarlas).
- Leyenda de la empresa (variable `cuentas-por-pagar.contrasenas.leyenda`, §6.5) y espacios de firma «Entregado por» y
  «Recibido por (proveedor)».
- «Impreso el dd/mm/aaaa hh:mm por …», porque los montos son vivos.

Imprimir no cambia nada ni se audita (es ver). Ver pregunta CP3-b (página con `window.print()` o PDF).

## 6. Permisos, auditoría, errores y configuración

### 6.1 Permisos (`modulo.ts`, PLAN §3.5)

| Permiso | Para |
|---|---|
| `cuentas-por-pagar.contrasenas.ver` | Lista, ficha, documentos disponibles e impresión |
| `cuentas-por-pagar.contrasenas.crear` | Crear |
| `cuentas-por-pagar.contrasenas.editar` | Cambiar la fecha prometida y las observaciones, agregar y quitar documentos |
| `cuentas-por-pagar.contrasenas.anular` | Anular |

Sin `eliminar` (no se eliminan), sin `importar`/`exportar` (Operación). Ninguno es `soloSuperacceso`. No hay separación
de funciones propia: la contraseña no aprueba ni paga nada (aprobar es `documentos.autorizar`; pagar será
`pagos.emitir`). Sin migración de permisos. (El plan viejo decía `contrasenas.gestionar`: PLAN §3.5 lo reemplaza por
`crear` y `editar`.)

### 6.2 Auditoría

| Hecho | Acción | Recurso | `anterior` |
|---|---|---|---|
| Crear, agregar documentos, cambiar la fecha prometida | ninguna | — | `creado_por` / `actualizado_por` |
| Quitar un documento | `quitar` | `cuentas-por-pagar.contrasenas` (registro: la contraseña) | `ContrasenaDto` antes de quitarlo; con motivo que nombra el documento |
| Anular | `anular` | `cuentas-por-pagar.contrasenas` | `ContrasenaDto` como estaba; con motivo |
| Eliminar un documento que estuvo en contraseñas anuladas | `eliminar` (CP1) | `cuentas-por-pagar.documentos` | La ficha, con sus contraseñas |

### 6.3 Errores nuevos (código propio)

| Clase | Familia | Código | Mensaje |
|---|---|---|---|
| `ContrasenaSinCargos` | `DatoInvalido` (campo `documentos`) | `contrasena_sin_cargos` | «Una contraseña lleva al menos una factura u otro cargo.» |
| `ContrasenaSinSaldo` | `ReglaDeNegocioInfringida` | `contrasena_sin_saldo` | «Las notas de crédito cubren todo: no queda nada que pagar. Aplíquelas en Notas de crédito.» |
| `DemasiadosDocumentosEnContrasena` | `DatoInvalido` (campo `documentos`) | `demasiados_documentos_en_contrasena` | «Una contraseña lleva hasta 100 documentos.» |
| `DocumentoDeOtroProveedor` | `DatoInvalido` (campo `documentos`) | `documento_de_otro_proveedor` | «El documento … es de otro proveedor.» |
| `DocumentoNoDisponibleParaContrasena` | `ReglaDeNegocioInfringida` | `documento_no_disponible_para_contrasena` | «El documento … está anulado, ya no debe nada o no tiene saldo a favor.» |
| `DocumentoYaEnContrasena` | `ReglaDeNegocioInfringida` | `documento_ya_en_contrasena` | «El documento … ya está en la contraseña N.» |
| `FechaDeContrasenaInvalida` | `DatoInvalido` (campo `fecha`) | `fecha_de_contrasena_invalida` | «La fecha no puede ser futura ni anterior a la emisión de los documentos.» |
| `FechaDePagoInvalida` | `DatoInvalido` (campo `fechaDePago`) | `fecha_de_pago_invalida` | «La fecha prometida de pago no puede ser anterior a la fecha de la contraseña.» |
| `ContrasenaAnulada` | `ReglaDeNegocioInfringida` | `contrasena_anulada` | «La contraseña N está anulada: no se cambia.» |
| `DocumentoEnContrasena` | `ReglaDeNegocioInfringida` | `documento_en_contrasena` | «El documento … está en la contraseña N: quítelo de ella o anúlela primero.» (ya nombrado en CP1 §4.4) |
| `ContrasenaConPagos` (CP4) | `ReglaDeNegocioInfringida` | `contrasena_con_pagos` | Lo define CP4 |

Una contraseña que no existe, o un documento que no está en ella (al quitarlo), responde `RecursoNoEncontrado`.
`MotivoInvalido` ya existe. `NotaEnContrasena` es de CP2.

### 6.4 Eventos

Ninguno en CP3 (pregunta CP3-k): la contraseña no tiene efecto contable. El aviso de pago por correo (CP7) saldrá del
pago, no de la contraseña. Si se quiere avisar al proveedor al crearla, se agrega `contrasena_creada` sin tocar datos.

### 6.5 Configuración (`configuracion.ts`, niveles `instalacion` y `empresa`)

| Clave | Esquema | Por omisión | Pública | Para |
|---|---|---|---|---|
| `cuentas-por-pagar.contrasenas.leyenda` | `z.string().max(500)` | `''` | no | Texto al pie de la contraseña impresa («Presente esta contraseña para cobrar; pagos los viernes de 8 a 12»). La lee el servidor al armar la impresión (pregunta CP3-e) |

## 7. Contrato de la API

Prefijo `/api/cuentas-por-pagar/contrasenas`. Dinero como texto con dos decimales; fechas `AAAA-MM-DD`.

**Solicitud de crear** (`esquemaContrasena`, Zod):

```ts
{
  proveedorId: uuid;
  fecha?: string;              // por omisión hoy
  fechaDePago: string;
  observaciones: string | null; // hasta 500
  documentos: uuid[];          // 1–100, sin repetir
}
```

**Respuesta** `ContrasenaDto`: `id`, `numero` (formateado), `numeroCorrelativo`, `anioDeNumero`, `fecha`, `fechaDePago`,
`proveedorId`, `proveedorNombre`, `proveedorNit`, `observaciones`, `estado`, `cargos` (cada uno: `documentoId`, `tipo`,
`serie`, `numero`, `origen`, `fechaEmision`, `vencimiento`, `estado`, `total`, `retenciones`, `rebajado`, `aPagar`,
`retencionesPorPracticar`), `notas` (cada una: `documentoId`, `serie`, `numero`, `fechaEmision`, `aplicadoEnLaContrasena`,
`saldoLibre`), `totales` (`total`, `retenciones`, `rebajado`, `aPagar`), `anulacion` (`{ motivo, anuladaPorNombre,
anuladaEn } | null`), `creadoPorNombre`, `creadoEn`, y calculados en el servidor `puedeEditar` y `puedeAnular`.
`ContrasenaResumenDto` (lista): `id`, `numero`, `fecha`, `fechaDePago`, `proveedorNombre`, `documentos` (cuántos),
`aPagar`, `estado`, `pagoVencido` (vigente, con saldo y `fechaDePago < hoy`).

| Método y ruta | Permiso | Cuerpo / consulta | Respuesta |
|---|---|---|---|
| `GET /contrasenas` | `contrasenas.ver` | `proveedorId?`, `estado?` (`vigente` por omisión, `anulada`, `todas`), `desde?`, `hasta?` (fecha), `pagoDesde?`, `pagoHasta?`, `pagina`, `limite` | página de `ContrasenaResumenDto` |
| `GET /contrasenas/disponibles?proveedorId=` | `contrasenas.ver` | — | `{ cargos, notas, fechaDePagoPropuesta }`: lo que puede entrar (vigente, con saldo, sin contraseña vigente) |
| `GET /contrasenas/:id` | `contrasenas.ver` | — | `ContrasenaDto` |
| `GET /contrasenas/:id/impresion` | `contrasenas.ver` | — | `ImpresionDeContrasenaDto` (§5.5) |
| `POST /contrasenas` | `contrasenas.crear` | solicitud | 201, `ContrasenaDto` |
| `PATCH /contrasenas/:id` | `contrasenas.editar` | `{ fechaDePago?, observaciones? }` | `ContrasenaDto` |
| `POST /contrasenas/:id/documentos` | `contrasenas.editar` | `{ documentos: uuid[] }` | `ContrasenaDto` |
| `DELETE /contrasenas/:id/documentos/:documentoId` | `contrasenas.editar` | `{ motivo }` | `ContrasenaDto` |
| `POST /contrasenas/:id/anular` | `contrasenas.anular` | `{ motivo }` | `ContrasenaDto` |

La ruta fija `disponibles` gana a `/:id` y `:id` se valida como uuid. Cambios en rutas de CP1: la lista y la ficha de
documentos traen `contrasena`; filtro `sinContrasena`.

**Excel:** ninguno (Operación). «Facturas autorizadas sin contraseña» es un reporte de CP5.

## 8. Cliente

- `servicios/`: `ApiContrasenas` (`contrasenas.api.ts`) y tipos.
- `paginas/Contrasenas.vue` (Operación, ≤ 120 líneas): filtros (proveedor, estado, fechas, fecha de pago), tarjetas
  `TarjetaDeRegistro` con número, proveedor, fecha, «Pago prometido», documentos, a pagar, etiqueta «Anulada» o «Pago
  vencido»; botón «Nueva contraseña» (`v-permiso` `contrasenas.crear`).
- `paginas/NuevaContrasena.vue` (formulario en página): elegir el proveedor (los que tienen documentos), marcar sus
  documentos disponibles (cargos con saldo y notas con saldo a favor, con totales que se recalculan con el reparto de
  las notas en vivo), fecha, fecha prometida (propuesta editable), observaciones. Al guardar, va a la ficha con la
  opción «Imprimir». Lógica pura en `composables/edicion-de-contrasena.ts` (selección, totales, reparto propuesto con la
  misma regla que el servidor, fecha propuesta) con su `*.prueba.ts`.
- `paginas/FichaDeContrasena.vue`: datos, cargos y notas con sus montos, totales, «Imprimir», «Cambiar fecha de pago»,
  «Agregar documentos», «Quitar» por documento (con motivo), «Anular» (con motivo, `usarAvisos().confirmar`); vista de
  solo lectura si está anulada.
- `paginas/ImpresionDeContrasena.vue` (o componente de impresión, según CP3-b): una hoja tamaño carta con la
  información de §5.5, estilos `@media print`, sin menú; botón «Imprimir» que llama `window.print()`. Original y copia
  en la misma hoja si se aprueba (CP3-b).
- **Documentos por pagar y su ficha:** etiqueta «Contraseña N» con enlace; la ficha explica por qué no se puede anular
  ni eliminar si está en una; filtro «Sin contraseña».
- `modulo.ts` y `textos.ts`: rutas `/cuentas-por-pagar/contrasenas`, `/nueva`, `/:id`, `/:id/imprimir`, menú
  «Contraseñas» en `seccion: 'operacion'`.

## 9. Convivencia y riesgos

1. **CP1:** las bajas desde Libro de compras de un documento en una contraseña vigente se rechazan con un mensaje que
   nombra la contraseña. Es el comportamiento acordado («primero se saca de la contraseña»).
2. **U8:** un saldo inicial entra a la contraseña como cualquier cargo (o nota a favor) y su «a pagar» es su saldo, ya
   neto de todas las retenciones; si tiene retenciones por practicar, la impresión lo dice sin descontarlas. Mientras
   esté en una contraseña vigente no se corrige ni elimina en Saldos iniciales.
3. **CP2:** las aplicaciones `contrasena` no se quitan desde Notas de crédito; una nota en una contraseña vigente no se
   aplica ni se ajusta fuera de ella. Un cargo de la contraseña sí recibe aplicaciones manuales: rebaja lo que se paga.
4. **Nota que llega después:** si una nota nueva rebaja un cargo de una contraseña, su aplicación automática corre
   primero sobre ese cargo y la contraseña muestra el saldo nuevo. Si el reparto de la contraseña ya cubría ese cargo,
   la nota nueva queda con saldo libre (aviso de U13 al recibirla); se ordena quitando y agregando la nota en la
   contraseña, o aplicándola en Notas de crédito. Caso raro; queda en la QA.
5. **CP4:** los pagos colgarán de `contrasenas` y de sus cargos; sumará `ContrasenaConPagos` a las reglas de anular,
   «documento con pagos» a las de quitar, y cerrará `puedeEditar` al primer pago. Las formas de pago extra (saldo
   inicial de Bancos, cuenta de apertura, nota de débito existente) se ligan a la contraseña allí.
6. **Concurrencia:** crear, agregar y quitar bloquean la contraseña y los documentos en orden de id, sin tocar Libro de
   compras (no invierte el orden «libro, luego Cuentas por pagar»). El único parcial resuelve dos contraseñas creadas a
   la vez con el mismo documento: una gana y la otra recibe el mensaje de §3.5.
7. **Correlativo:** un número por contraseña creada; anularla no libera el número (por eso no se eliminan). Si la empresa
   reinicia por año, el año es el de `fecha`. El reporte de correlativos de Bancos podrá sumar esta clave más adelante.
8. **Proveedor:** la llave `contrasenas_proveedor_fk` impide borrar un proveedor con contraseñas (ya lo impedían sus
   documentos).

## 10. Pasos (un commit cada uno; servidor y cliente por separado)

Cada commit corre `npm run revisar` y sus pruebas y actualiza la bitácora de `PLAN.md`. Va **después de CP2**.

1. **CP3-1 (servidor, datos):** `contrasenas.tablas.ts`, `contrasena-documentos.tablas.ts`, cambios en
   `aplicaciones-de-notas.tablas.ts`; migración `0005` (§3.4); mensaje de §3.5. **Pruebas de tablas:** cada check
   (pago antes de la fecha, observaciones con espacios, anulación incompleta, forma `contrasena` sin `contrasena_id`),
   documento de otro proveedor (falla por la llave), mismo documento en dos contraseñas vigentes (falla) y en una vigente
   y una anulada (pasa), cascada al eliminar el documento, número repetido, RLS por empresa;
   `politicas-de-los-modulos` y `llaves-entre-esquemas`.
2. **CP3-2 (servidor, crear y consultar):** dominio (validaciones de §5.1, reparto de la contraseña con
   `repartirNotaDeCredito`, número formateado), `CrearContrasena`, `ListarContrasenas`, `ObtenerContrasena`,
   `DocumentosDisponibles`, permisos `ver` y `crear`, rutas. **Pruebas** puras (reparto: una nota sobre dos cargos, dos
   notas, nota que sobra, cubre todo) y de API (crear con documentos de la bandeja, con un saldo inicial, sin cargos,
   documento ya en otra, de otro proveedor, fecha de pago anterior, correlativo y reinicio anual, sin permiso).
3. **CP3-3 (servidor, editar):** cambiar fecha de pago y observaciones, agregar y quitar documentos (rehace el reparto,
   auditoría `quitar`), permiso `editar`. **Pruebas:** quitar el último cargo (rechazo), quitar una nota (vuelve su saldo
   libre), agregar una nota, auditoría con `anterior`.
4. **CP3-4 (servidor, anular y reglas de baja):** `AnularContrasena`, permiso `anular`, `noEstarEnContrasena` en las
   listas de CP1, U8 y CP2, `accionesDelDocumento` y DTO de documentos con `contrasena`, filtro `sinContrasena`.
   **Pruebas:** anular (suelta documentos, borra aplicaciones de la contraseña, auditoría), anular dos veces, anular y
   eliminar desde Libro de compras un documento en una vigente (rechazo, nada cambia) y en una anulada (pasa),
   corregir un saldo inicial en una contraseña (rechazo), aplicar una nota que está en una contraseña (rechazo).
5. **CP3-5 (servidor, impresión):** `GET …/:id/impresion` con datos de la empresa por el mediador y la variable
   `cuentas-por-pagar.contrasenas.leyenda` en `configuracion.ts`. **Pruebas:** contenido, anulada, saldo inicial con
   retenciones por practicar, leyenda por empresa.
6. **CP3-6 (cliente, lista y nueva):** páginas `Contrasenas` y `NuevaContrasena`, lógica pura con pruebas, menú y textos.
7. **CP3-7 (cliente, ficha e impresión):** ficha con editar, quitar, anular; página de impresión; etiqueta y filtro en
   Documentos por pagar.
8. **CP3-8 (QA):** proveedor con tres facturas (una en la bandeja, una registrada, una autorizada), una nota con saldo a
   favor y un saldo inicial; crear la contraseña e imprimirla; llega una nota nueva de una de las facturas (el saldo
   baja); quitar un documento con motivo; intentar anular desde Libro de compras una factura de la contraseña
   (rechazo); anular la contraseña y crear otra con los mismos documentos; reinicio anual del número; permisos por
   separado.

## 11. Preguntas para el usuario (con recomendación)

- **CP3-a. Notas de crédito dentro de la contraseña.** (A) se reparten entre los cargos al guardarla y se rehace el
  reparto con cada cambio (**recomendado**: lo que dice la contraseña y los saldos coinciden siempre); (B) solo restan en
  pantalla y se aplican al pagar (CP4); (C) la contraseña solo lleva cargos y las notas se aplican antes en Notas de
  crédito.
- **CP3-b. Cómo se imprime.** ¿Página del cliente con `window.print()` (**recomendado**: como los reportes de Bancos, sin
  servidor de PDF ni archivos guardados; la contraseña no es un documento fiscal ni lleva folios) o PDF del servidor
  como el libro (se puede mandar por correo y guardar copia)? ¿Una hoja con **original y copia** (proveedor y empresa)?
  *Recomendado: una sola hoja con original; la copia se imprime otra vez si se quiere.*
- **CP3-c. Montos vivos o guardados.** ¿La contraseña muestra siempre los saldos del momento (**recomendado**; la
  impresión dice cuándo se imprimió) o guarda una foto de los montos al crearla (dos verdades que pueden no coincidir)?
- **CP3-d. Fecha prometida propuesta.** ¿La mayor fecha de vencimiento de los cargos (**recomendado**, sin variable nueva)
  o la fecha de la contraseña más N días (variable por empresa)? ¿Hace falta un «día de pago a proveedores» (p. ej.
  viernes) que mueva la propuesta al siguiente? *Recomendado: no por ahora.*
- **CP3-e. Leyenda al pie.** ¿Texto configurable por empresa (y por instalación) al pie de la contraseña impresa?
  *Recomendado: sí.*
- **CP3-f. Editar una contraseña vigente.** ¿Agregar y quitar documentos (quitar con motivo y auditoría) y cambiar la
  fecha prometida, mientras no tenga pagos? *Recomendado: sí; es lo que pide «primero se saca de la contraseña».*
- **CP3-g. Documento que estuvo en una contraseña anulada.** ¿Se puede eliminar (la fila de la contraseña anulada se va
  con él y queda en la auditoría; **recomendado**, si no un saldo inicial cargado por error se atasca) o queda para
  siempre como rastro?
- **CP3-h. Proveedor inactivo.** ¿Se le pueden hacer contraseñas por lo que se le debe? *Recomendado: sí.*
- **CP3-i. Fecha de la contraseña.** ¿Editable (por omisión hoy, no futura ni anterior a los documentos) o siempre hoy?
  *Recomendado: editable*, para registrar el día en que de verdad se recibió.
- **CP3-j. Tope.** ¿Hasta 100 documentos por contraseña (como los lotes de CP1)? *Recomendado: sí.*
- **CP3-k. Aviso al proveedor.** ¿Hace falta un evento o correo al crear la contraseña? *Recomendado: no; el aviso por
  correo es del pago (CP7).*

## 12. Lo que debe validar `contador-guatemala`

- **C-CP3-1. Contenido de la contraseña impresa.** ¿Qué datos mínimos lleva en la práctica guatemalteca (número, fecha,
  proveedor con NIT, documentos con serie y número, montos, fecha de pago, firmas)? ¿Se muestran el total, las
  retenciones y el neto a pagar, o solo el total de las facturas? ¿Lleva alguna leyenda sobre las constancias de
  retención? ¿Tiene algún valor legal (reconocimiento de deuda, título) que obligue a algo más (p. ej., no cambiar la
  fecha prometida sin dejar rastro)?
- **C-CP3-2. Notas de crédito en la contraseña.** ¿Es correcto aplicar el saldo a favor de una nota contra las facturas
  de la contraseña al crearla (opción A), antes de que esas facturas se autoricen o se paguen?
- **C-CP3-3. Montos vivos.** ¿Hay inconveniente de control en que la contraseña reimpresa muestre montos distintos a la
  primera (por una nota que llegó después), si dice cuándo se imprimió?
- **C-CP3-4. Saldo inicial con retenciones por practicar en la contraseña.** ¿El texto de U8 §2, consecuencia 2 basta en la contraseña
  impresa, o el proveedor debe ver además que se le retendrá (aunque el saldo ya va neto)?
- **C-CP3-5. Fecha prometida y vencimiento.** Confirmar (C4) que la fecha prometida no cambia el vencimiento ni la
  antigüedad, y si un reporte debe mostrar las contraseñas con pago prometido vencido.

## 13. Pendiente nuevo

(Vacío: lo que aparezca al programar.)
