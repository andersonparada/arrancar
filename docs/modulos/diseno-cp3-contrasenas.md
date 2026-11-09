# Diseño CP3: contraseñas de pago de Cuentas por pagar — arquitecto de datos, 2026-11-08

Estado: **aprobado, listo para programar** (2026-11-08). El usuario aceptó todas las recomendaciones (CP3-a a k, §11)
y las preguntas depuradas del dictamen del contador (`dictamen-cp2-cp3-2026-11-08.md`, «correcto con ajustes») con su
recomendación; este documento ya trae aplicados los «Cambios que los diseños deben recibir» y lo «Para el arquitecto de
datos» del dictamen. Aterriza el paso **CP3** de `cuentas-por-pagar.md` («Contraseñas: crear (con
documentos registrados o autorizados), imprimir y anular»), sus «Reglas de contraseñas, pagos y anulaciones», las
«Respuestas del usuario (2026-09-29, tarde)», la fila CP3 de `diseno-datos-cuentas-por-pagar.md` §2 («documentos
pendientes, registrados o autorizados») y la C4 del contador (U14 c: «Vence» y «Pago prometido» son datos distintos).
Convive con CP1 (programado), U8 (`diseno-u8-saldos-iniciales-cuentas-por-pagar.md`; U8-1 y U8-2 ya en `main`) y CP2
(`diseno-cp2-notas-de-credito.md`, aprobado, que va antes). Deja preparado CP4 (pagos). Lo nuevo que aparezca al programar va a
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
| Qué es en lo legal | **No es documento fiscal**: es la **constancia de recepción** de las facturas (Código de Comercio art. 598) y puede valer como **reconocimiento de la deuda** (Código Civil art. 1506). Su fecha tiene valor de prueba: no se cambia | Dictamen C-CP3-1 |
| Notas dentro de la contraseña | Opción **A** (se reparten entre sus cargos), con la fecha de cada aplicación = **la mayor** entre la fecha de la contraseña, la recepción de la nota y la del cargo; «compensación» visible en la impresión | CP3-a; dictamen C-CP3-2 |
| Montos | **Vivos**, con lo fijo separado de lo vivo y «REIMPRESIÓN» desde la segunda impresión (`impresa_en`) | CP3-c; dictamen C-CP3-3 |
| Impresión | Página del cliente con `window.print()`, **original y copia** (la copia la firma el proveedor y se queda en la empresa), leyenda por omisión «recibido para revisión…», columnas total, retenciones, rebajado y saldo, línea de retención por emitir | CP3-b, CP3-e; dictamen C-CP3-1, C-CP3-4 |
| Fecha prometida | Se puede cambiar mientras esté vigente; el cambio **se audita** (`corregir`, con motivo) | CP3-f; dictamen C-CP3-1 |
| Anular una contraseña ya impresa | Aviso «recupere el original que tiene el proveedor» | Dictamen C-CP3-3 |
| Pago prometido vencido | Reporte en CP5; la fecha prometida no cambia «Vence» ni la antigüedad | Dictamen C-CP3-5 |

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
8. **Migraciones** (verificado en `migraciones/meta/_journal.json`): la última en `main` es `0003_u8_saldos_iniciales`;
   la `0004_cp2_notas_de_credito` es de CP2, que va antes. Esta es la **`0005_cp3_contrasenas`** (su `when` debe quedar
   mayor que el de la `0004`).
9. **Lo que CP2 deja para usar aquí:** `aplicaciones_de_notas` con `forma`, `fecha` y `referencia` (solo manual); el
   puerto `FechasDeEntrada` (fecha de recepción en el libro de cada documento, nula en un saldo inicial) y `CargaInicial`
   (fecha de inicio, por el mediador, pedida antes de bloquear documentos); la variable de instalación
   `cuentas-por-pagar.bancarizacion.umbral`; `AplicacionDeNota` con serie y número del otro documento.
10. **`AccionAuditada`** ya tiene `corregir` («se cambió dinero o fechas de un registro; `anterior` guarda cómo estaba»),
    que sirve para la fecha prometida.

## 2. Modelo

```
crear ──▶ vigente ──anular──▶ anulada
            │  ▲
            └──┘ agregar o quitar documentos, cambiar la fecha prometida (mientras no tenga pagos, CP4)
```

«Pagada en parte» y «pagada» **no son estados**: saldrán de los pagos (CP4), igual que en los documentos.

**Montos vivos.** La contraseña no guarda montos: muestra los saldos de sus documentos en el momento en que se consulta
o se imprime (CP3-c). El total y las retenciones de cada documento no cambian nunca (vienen del libro o del
saldo inicial); lo que puede cambiar es lo rebajado (una nota que llega después, una aplicación manual) y, en CP4, lo
pagado. La impresión dice cuándo se imprimió.

| Concepto (por cargo) | Fórmula |
|---|---|
| Total | `total` |
| Retenciones | `retenciones` (en un saldo inicial, todas las del documento; U8) |
| Rebajado | `neto − saldo` sin pagos: notas aplicadas de todas las formas y, en un saldo inicial, «pagos y notas anteriores a la fecha de inicio» |
| Saldo (por pagar) | el **saldo** del cargo (CP1 §4.2, con U8 y CP2) |

Total y retenciones son **fijos**; rebajado y saldo son **vivos** y la impresión los rotula «al dd/mm/aaaa» (dictamen
C-CP3-3). La columna se llama «Saldo» o «Por pagar», no «A pagar», porque incluye documentos que todavía no se
autorizan. Totales de la contraseña: Σ por columna de sus cargos. Las notas que la contraseña incluye aparecen en su propia
sección con lo que aplicaron dentro de ella.

**Notas de crédito dentro de la contraseña (CP3-a, opción A, aprobada).** Una nota con saldo libre que entra
en la contraseña **se reparte entre los cargos de esa contraseña** al guardarla, con aplicaciones `forma = 'contrasena'`
y `contrasena_id`. El reparto se **rehace entero** cada vez que cambian los documentos de la contraseña (crear, agregar,
quitar): se borran las aplicaciones de la contraseña y se vuelve a repartir. Al anularla se borran. Es determinista y no
deja aplicaciones huérfanas:

- Notas en orden de fecha de emisión (y de alta); cargos en orden de vencimiento, fecha de emisión y alta.
- Cada nota reparte su saldo libre (sin contar lo que ya aplicaba en esta contraseña) con `repartirNotaDeCredito` sobre
  los saldos que van quedando; lo que sobra sigue libre en la nota.
- **Fecha de cada aplicación** (dictamen C-CP3-2): **la mayor** entre la fecha de la contraseña, la fecha de recepción de
  la nota y la del cargo en el Libro de compras; si la nota o el cargo es saldo inicial, su fecha de recepción se
  reemplaza por la **fecha de inicio** de la empresa. Así una nota recibida después de la contraseña y agregada más
  tarde no queda aplicada antes de existir, y al rehacer el reparto una nota que no cambió conserva su fecha sin
  guardar nada más. Las fechas salen de `FechasDeEntrada` y `CargaInicial` (CP2).
- Las aplicaciones `contrasena` no llevan `referencia`: la contraseña impresa y firmada por el proveedor es la evidencia
  del acuerdo de compensación (también ante la bancarización).

Alternativas descartadas (CP3-a): **(B)** la nota solo resta en pantalla y se aplica al pagar (CP4); **(C)** la
contraseña solo admite cargos y las notas se aplican antes con CP2.

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
| `impresa_en` | timestamptz | sí | **Primera impresión**: nula hasta que se imprime; desde la segunda, la hoja dice «REIMPRESIÓN» (dictamen C-CP3-3). La pone `RegistrarImpresion` (§5.5) solo si es nula; no se vuelve a cambiar |
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

**Decisión: `on delete cascade` hacia el documento (CP3-g).** Un documento en una contraseña **vigente** no se
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
mano: crea `contrasenas` (con `impresa_en`) y `contrasena_documentos` con checks, únicos (el parcial va a mano si drizzle-kit no lo
escribe), índices, llaves (la de Terceros y las compuestas) y RLS; agrega `contrasena_id` a `aplicaciones_de_notas`,
cambia `aplicaciones_forma_valida` (`drop` y `add`) y agrega el check y el índice nuevos. Sin relleno (tablas nuevas; no
hay aplicaciones `contrasena`). Sin migración de permisos. Ninguna migración en otro esquema. El correlativo no necesita
fila previa: `CorrelativosPostgres` la crea al pedir el primer número. El check `aplicaciones_referencia_valida` de CP2 no
cambia (la referencia sigue siendo solo de `forma = 'manual'`).

### 3.5 Mensajes de restricciones (`MENSAJES_POR_RESTRICCION`)

| Restricción | Mensaje |
|---|---|
| `contrasena_documentos_vigente_unico` | «Ese documento ya está en otra contraseña vigente.» (dos usuarios a la vez; el dominio lo revisa antes con `DocumentoYaEnContrasena`) |
| `contrasenas_numero_unico` | Sin mensaje: error de programación |
| `contrasenas_proveedor_fk` | Sin mensaje propio: `RecursoEnUso` genérico (igual que en U8) |

## 4. Integración con CP1, U8 y CP2

| Pieza | Cambio |
|---|---|
| Reglas de baja (`reglas-de-baja.ts`) | Regla nueva `noEstarEnContrasena` (lee si el documento está en una contraseña vigente) **al principio** de `REGLAS_PARA_ANULAR` y `REGLAS_PARA_ELIMINAR` (antes de las de CP2) → `DocumentoEnContrasena`. **No** en `REGLAS_PARA_DESAUTORIZAR`: un documento desautorizado puede seguir en la contraseña (admite registrados) |
| `DocumentoConAplicaciones` / `buscarPorId` | Trae `contrasenaVigente: { id, numero, anioDeNumero } \| null` para que las reglas no consulten aparte |
| `HechosDelDocumento` / `accionesDelDocumento` | `enContrasena`; `puedeAnular` y `puedeEliminar` falsos si está en una vigente; CP2: `puedeAplicar` y `puedeAjustar` falsos en una nota dentro de una contraseña vigente |
| DTO `DocumentoPorPagarDto` | `contrasena: { id, numero } \| null` (la vigente; `numero` ya formateado, `2026-15` o `15`). Filtro nuevo `sinContrasena?: boolean` (lo usa la pantalla de crear y el reporte «Facturas autorizadas sin contraseña» de CP5) |
| `FichaDelDocumentoDto` (auditoría) | Las contraseñas en que estuvo el documento (vigente y anuladas), para el `anterior` de una eliminación |
| CP1, bajas por aviso de Libro de compras | Sin cambio de código: corren las listas de reglas, que ahora rechazan un documento en una contraseña vigente. Libro de compras muestra el mensaje |
| U8 `REGLAS_PARA_CORREGIR_SALDO_INICIAL` | Suma `noEstarEnContrasena` (corregir y eliminar un saldo inicial) |
| CP2 `REGLAS_PARA_QUITAR_APLICACION`, aplicar y ajustar | Suma «la nota no está en una contraseña vigente» (`NotaEnContrasena`) |
| CP2, ficha | Las aplicaciones `contrasena` se muestran «En contraseña N» sin «Quitar» (`AplicacionNoSeQuita`) |
| CP2, `noTenerAplicacionesManualesRecibidas` | Sin cambio: solo mira `forma = 'manual'`. Las aplicaciones `contrasena` que recibe un cargo solo existen mientras la contraseña está vigente, y entonces ya rechaza `noEstarEnContrasena` |
| CP2, `RepositorioDeAplicaciones` | `agregar` acepta `forma = 'contrasena'` con `contrasena_id` y la fecha de §2; `borrarDeLaContrasena(contrasenaId)` nuevo, para rehacer el reparto y al anular |
| Recibir una nota de un cargo que está en una contraseña | Sin cambio: la aplicación automática corre igual y rebaja el saldo; la contraseña lo muestra al consultarla (montos vivos) |
| Eventos de documentos | Sin cambio |

## 5. Reglas

### 5.1 Crear

En una transacción, con `contrasenas.crear`:

0. Pide la carga inicial (`CargaInicial` de CP2, bloqueo compartido) antes de bloquear documentos, por la fecha de las
   aplicaciones de las notas (§2) y el orden de bloqueo de U8. Agregar y quitar documentos hacen lo mismo.
1. Proveedor de la cuenta (consulta con RLS a `terceros.proveedores`). **Puede estar inactivo** (CP3-h): se le
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
   vencimiento** de los cargos (si es anterior a la fecha, la fecha) (CP3-d). No cambia «Vence» ni la antigüedad (C4).
6. Observaciones: se recortan; vacías = nulas; hasta 500.
7. Número: `correlativos.siguiente('cuentas-por-pagar.contrasenas', fecha)` (después de validar, para no gastar números).
8. Inserta la contraseña y sus documentos; **rehace el reparto** de sus notas (§2, con la fecha de cada aplicación).
   Si después del reparto ningún cargo queda con saldo (las notas lo cubren todo) → `ContrasenaSinSaldo` («no hay nada que pagar; aplique las notas en
   Notas de crédito»).
9. Sin auditoría (alta; `creado_por`). Sin evento (CP3-k).

Los documentos de la **bandeja** (sin completar) entran (decisión del 2026-09-29); el vencimiento se completa después y
no cambia la contraseña.

**Aviso de bancarización** (sin bloquear; dictamen C-CP2-1 y «otros errores» 5): `disponibles` trae
`sobreUmbralDeBancarizacion` por cargo (`total >= cuentas-por-pagar.bancarizacion.umbral`, variable de CP2). Si en el
reparto una nota compensa un cargo marcado, la pantalla avisa: «La nota N se compensa con una factura de Q30,000 o más
(bancarización, Decreto 20-2006): conserve la copia de la contraseña firmada por el proveedor; es el respaldo del
acuerdo.» (con el umbral real).

### 5.2 Editar (mientras esté vigente y, con CP4, sin pagos)

| Acción | Regla |
|---|---|
| Cambiar la fecha prometida | `>= fecha` (`FechaDePagoInvalida`); **motivo obligatorio** (1–300, `MotivoInvalido`); auditoría `corregir`, recurso `cuentas-por-pagar.contrasenas`, `anterior` = `{ fechaDePago, observaciones }` como estaban, con el motivo (dictamen C-CP3-1: el proveedor tiene un papel con la fecha anterior). Si la fecha no cambia, no se audita ni se pide motivo. La impresión nueva sale con la fecha nueva (y «REIMPRESIÓN» si ya se imprimió) |
| Cambiar solo las observaciones | Sin auditoría ni motivo (no cambia lo prometido; queda `actualizado_por`) |
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

**Aviso al anular** (dictamen C-CP3-3): si la contraseña ya se imprimió (`impresa`), la confirmación dice «Esta
contraseña ya se imprimió: recupere el original que tiene el proveedor.»

### 5.4 Bajas de los documentos

`noEstarEnContrasena` rechaza anular o eliminar (desde Cuentas por pagar o por aviso de Libro de compras) un documento
que está en una contraseña **vigente**: `DocumentoEnContrasena` («Está en la contraseña N: quítelo de ella o anúlela
primero»). Desautorizar y cambiar el vencimiento sí se permiten. Un documento que solo estuvo en contraseñas anuladas se
da de baja normalmente (la cascada se lleva esas filas, §3.2).

### 5.5 Imprimir

`GET …/contrasenas/:id/impresion` arma todo lo que va en el papel (la página del cliente solo dibuja) y **no cambia
nada**: es la vista previa. `POST …/contrasenas/:id/impresiones` (`RegistrarImpresion`) es lo que llama el botón
«Imprimir» justo antes de `window.print()` (CP3-b): pone `impresa_en = now()` si era nula y responde la misma impresión,
ya con la marca que corresponde. Así abrir la vista previa no gasta la «primera impresión». No se audita (es ver);
`impresa_en` no se vuelve a cambiar.

Contenido (dictamen C-CP3-1, C-CP3-3 y C-CP3-4):

- **Dos hojas** carta en una sola impresión (salto de página), iguales salvo el rótulo y las firmas: «ORIGINAL —
  PROVEEDOR» y «COPIA — EMPRESA». La copia la firma el proveedor y se queda en la empresa.
- Empresa: razón social (o nombre), nombre comercial y NIT (`empresas.obtener_datos_de_empresa` por el mediador).
- Contraseña: número (`2026-15` o `15`), **fecha de recepción** (la de la contraseña), fecha prometida de pago,
  observaciones; si está anulada, «ANULADA» con su motivo, bien visible.
- Proveedor: nombre y NIT.
- **Lo fijo**, por cargo: tipo, serie y número del DTE, fecha de emisión, **total** y **retenciones**. El vencimiento
  interno no se imprime (queda en la ficha).
- **Lo vivo**, rotulado «al dd/mm/aaaa» (el día de la impresión), por cargo: **rebajado** y **saldo**; totales por
  columna.
- Notas de crédito incluidas: «Compensación con nota N (saldo a favor): Q…», con serie, número y fecha, bien visible
  (respalda la compensación, C-CP2-1).
- Saldo inicial con retenciones por practicar (U8): en su línea, **«Retención por emitir: Q…; se entregará su
  constancia»**, sin restarla otra vez (el saldo ya va neto).
- Si algún cargo tiene retenciones o retenciones por practicar: leyenda fija «Las retenciones se documentan con su
  constancia.»
- Leyenda de la empresa (variable `cuentas-por-pagar.contrasenas.leyenda`, §6.5; por omisión, «Documentos recibidos
  para revisión. Esta contraseña no implica aceptación de las facturas; el pago está sujeto a su autorización. Presente
  esta contraseña para cobrar.»).
- Firmas: «Entregado por (empresa)» con nombre, firma y fecha en las dos hojas; «Recibido por (proveedor)» con nombre,
  firma y fecha en la **copia**.
- Pie: «Impreso el dd/mm/aaaa hh:mm por …» y, si `impresa_en` ya tenía valor antes de esta impresión,
  **«REIMPRESIÓN»** en las dos hojas.

## 6. Permisos, auditoría, errores y configuración

### 6.1 Permisos (`modulo.ts`, PLAN §3.5)

| Permiso | Para |
|---|---|
| `cuentas-por-pagar.contrasenas.ver` | Lista, ficha, documentos disponibles, vista previa e impresión (también marcar la primera impresión, que no cambia nada del negocio) |
| `cuentas-por-pagar.contrasenas.crear` | Crear |
| `cuentas-por-pagar.contrasenas.editar` | Cambiar la fecha prometida (con motivo) y las observaciones, agregar y quitar documentos |
| `cuentas-por-pagar.contrasenas.anular` | Anular |

Sin `eliminar` (no se eliminan), sin `importar`/`exportar` (Operación). Ninguno es `soloSuperacceso`. No hay separación
de funciones propia: la contraseña no aprueba ni paga nada (aprobar es `documentos.autorizar`; pagar será
`pagos.emitir`). Sin migración de permisos. (El plan viejo decía `contrasenas.gestionar`: PLAN §3.5 lo reemplaza por
`crear` y `editar`.)

### 6.2 Auditoría

| Hecho | Acción | Recurso | `anterior` |
|---|---|---|---|
| Crear, agregar documentos, cambiar solo las observaciones, imprimir | ninguna | — | `creado_por` / `actualizado_por`; `impresa_en` |
| Cambiar la fecha prometida | `corregir` | `cuentas-por-pagar.contrasenas` | `{ fechaDePago, observaciones }` como estaban; con motivo |
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

Ninguno en CP3 (CP3-k): la contraseña no tiene efecto contable. El aviso de pago por correo (CP7) saldrá del
pago, no de la contraseña. Si se quiere avisar al proveedor al crearla, se agrega `contrasena_creada` sin tocar datos.

### 6.5 Configuración (`configuracion.ts`, niveles `instalacion` y `empresa`)

| Clave | Esquema | Por omisión | Pública | Para |
|---|---|---|---|---|
| `cuentas-por-pagar.contrasenas.leyenda` | `z.string().max(500)` | «Documentos recibidos para revisión. Esta contraseña no implica aceptación de las facturas; el pago está sujeto a su autorización. Presente esta contraseña para cobrar.» | no | Texto al pie de la contraseña impresa. La empresa puede reemplazarlo (p. ej. sumar «pagos los viernes de 8 a 12»); vacío, no se imprime. La lee el servidor al armar la impresión (CP3-e; dictamen C-CP3-1) |

`cuentas-por-pagar.bancarizacion.umbral` (instalación) la declara CP2; CP3 la usa en `disponibles`.

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
`serie`, `numero`, `origen`, `fechaEmision`, `vencimiento`, `estado`, `total`, `retenciones`, `rebajado`, `saldo`,
`retencionesPorPracticar`, `sobreUmbralDeBancarizacion`), `notas` (cada una: `documentoId`, `serie`, `numero`,
`fechaEmision`, `aplicadoEnLaContrasena`, `saldoLibre`), `totales` (`total`, `retenciones`, `rebajado`, `saldo`),
`impresa` (boolean), `impresaEn`, `anulacion` (`{ motivo, anuladaPorNombre, anuladaEn } | null`), `creadoPorNombre`,
`creadoEn`, y calculados en el servidor `puedeEditar` y `puedeAnular`.
`ContrasenaResumenDto` (lista): `id`, `numero`, `fecha`, `fechaDePago`, `proveedorNombre`, `documentos` (cuántos),
`saldo`, `estado`, `pagoVencido` (vigente, con saldo y `fechaDePago < hoy`).
`ImpresionDeContrasenaDto`: lo de §5.5 ya armado (empresa, contraseña, proveedor, cargos con lo fijo y lo vivo, notas
como compensaciones, líneas de retención por emitir, `hayRetenciones`, `leyenda`, `alDia` (fecha de los montos vivos),
`reimpresion` (boolean), `impresoPorNombre`, `impresoEn`, `anulacion`).

| Método y ruta | Permiso | Cuerpo / consulta | Respuesta |
|---|---|---|---|
| `GET /contrasenas` | `contrasenas.ver` | `proveedorId?`, `estado?` (`vigente` por omisión, `anulada`, `todas`), `desde?`, `hasta?` (fecha), `pagoDesde?`, `pagoHasta?`, `pagina`, `limite` | página de `ContrasenaResumenDto` |
| `GET /contrasenas/disponibles?proveedorId=` | `contrasenas.ver` | — | `{ cargos, notas, fechaDePagoPropuesta }`: lo que puede entrar (vigente, con saldo, sin contraseña vigente); cargos con `sobreUmbralDeBancarizacion` |
| `GET /contrasenas/:id` | `contrasenas.ver` | — | `ContrasenaDto` |
| `GET /contrasenas/:id/impresion` | `contrasenas.ver` | — | `ImpresionDeContrasenaDto` (§5.5), vista previa: no cambia nada |
| `POST /contrasenas/:id/impresiones` | `contrasenas.ver` | — | `ImpresionDeContrasenaDto` tras marcar `impresa_en` si era nula |
| `POST /contrasenas` | `contrasenas.crear` | solicitud | 201, `ContrasenaDto` |
| `PATCH /contrasenas/:id` | `contrasenas.editar` | `{ fechaDePago?, observaciones?, motivo? }` (`motivo` obligatorio si cambia `fechaDePago`) | `ContrasenaDto` |
| `POST /contrasenas/:id/documentos` | `contrasenas.editar` | `{ documentos: uuid[] }` | `ContrasenaDto` |
| `DELETE /contrasenas/:id/documentos/:documentoId` | `contrasenas.editar` | `{ motivo }` | `ContrasenaDto` |
| `POST /contrasenas/:id/anular` | `contrasenas.anular` | `{ motivo }` | `ContrasenaDto` |

La ruta fija `disponibles` gana a `/:id` y `:id` se valida como uuid. Cambios en rutas de CP1: la lista y la ficha de
documentos traen `contrasena`; filtro `sinContrasena`.

**Excel:** ninguno (Operación). «Facturas autorizadas sin contraseña» es un reporte de CP5.

## 8. Cliente

- `servicios/`: `ApiContrasenas` (`contrasenas.api.ts`) y tipos.
- `paginas/Contrasenas.vue` (Operación, ≤ 120 líneas): filtros (proveedor, estado, fechas, fecha de pago), tarjetas
  `TarjetaDeRegistro` con número, proveedor, fecha, «Pago prometido», documentos, saldo, etiqueta «Anulada» o «Pago
  vencido»; botón «Nueva contraseña» (`v-permiso` `contrasenas.crear`).
- `paginas/NuevaContrasena.vue` (formulario en página): elegir el proveedor (los que tienen documentos), marcar sus
  documentos disponibles (cargos con saldo y notas con saldo a favor, con totales que se recalculan con el reparto de
  las notas en vivo), fecha, fecha prometida (propuesta editable), observaciones; aviso de bancarización si una nota
  compensa un cargo marcado (§5.1). Al guardar, va a la ficha con la opción «Imprimir». Lógica pura en
  `composables/edicion-de-contrasena.ts` (selección, totales, reparto propuesto con la misma regla que el servidor,
  fecha propuesta, aviso de bancarización) con su `*.prueba.ts`.
- `paginas/FichaDeContrasena.vue`: datos, cargos y notas con sus montos (total, retenciones, rebajado, saldo), totales,
  «Imprimir», «Cambiar fecha de pago» (ventana con fecha y **motivo**), «Agregar documentos», «Quitar» por documento
  (con motivo), «Anular» (con motivo y `usarAvisos().confirmar`; si ya se imprimió, el aviso «recupere el original que
  tiene el proveedor»); etiqueta «Impresa el …» o «Sin imprimir»; vista de solo lectura si está anulada.
- `paginas/ImpresionDeContrasena.vue` (CP3-b): dos hojas carta (original y copia) con la información de §5.5, estilos
  `@media print` (salto de página entre hojas), sin menú. Al abrir carga la vista previa (`GET …/impresion`); el botón
  «Imprimir» llama `POST …/impresiones`, vuelve a dibujar con la marca que corresponda («REIMPRESIÓN») y llama
  `window.print()`. Lógica pura de armado de líneas en `composables/impresion-de-contrasena.ts` con su prueba.
- **Documentos por pagar y su ficha:** etiqueta «Contraseña N» con enlace; la ficha explica por qué no se puede anular
  ni eliminar si está en una; filtro «Sin contraseña».
- `modulo.ts` y `textos.ts`: rutas `/cuentas-por-pagar/contrasenas`, `/nueva`, `/:id`, `/:id/imprimir`, menú
  «Contraseñas» en `seccion: 'operacion'`.

## 9. Convivencia y riesgos

1. **CP1:** las bajas desde Libro de compras de un documento en una contraseña vigente se rechazan con un mensaje que
   nombra la contraseña. Es el comportamiento acordado («primero se saca de la contraseña»).
2. **U8:** un saldo inicial entra a la contraseña como cualquier cargo (o nota a favor) y su saldo ya va neto de todas
   las retenciones; si tiene retenciones por practicar, la impresión dice «Retención por emitir…» sin descontarlas. Las
   aplicaciones de la contraseña sobre un saldo inicial no quedan antes de la fecha de inicio (§2). Mientras esté en una
   contraseña vigente no se corrige ni elimina en Saldos iniciales.
3. **CP2:** las aplicaciones `contrasena` no se quitan desde Notas de crédito; una nota en una contraseña vigente no se
   aplica ni se ajusta fuera de ella. Un cargo de la contraseña sí recibe aplicaciones manuales: rebaja lo que se paga
   (y, si después se quiere anular ese cargo, primero se quita de la contraseña y luego la aplicación manual, CP2 §5.4).
4. **Nota que llega después:** si una nota nueva rebaja un cargo de una contraseña, su aplicación automática corre
   primero sobre ese cargo y la contraseña muestra el saldo nuevo. Si el reparto de la contraseña ya cubría ese cargo,
   la nota nueva queda con saldo libre (aviso de U13 al recibirla); se ordena quitando y agregando la nota en la
   contraseña, o aplicándola en Notas de crédito. Caso raro; queda en la QA. Si la contraseña ya se entregó, la
   reimpresión sale con «REIMPRESIÓN» y los montos del día.
5. **CP4:** los pagos colgarán de `contrasenas` y de sus cargos; sumará `ContrasenaConPagos` a las reglas de anular,
   «documento con pagos» a las de quitar, y cerrará `puedeEditar` al primer pago. Las formas de pago extra (saldo
   inicial de Bancos, cuenta de apertura, nota de débito existente) se ligan a la contraseña allí.
6. **CP5 (anotado):** reporte «contraseñas con pago prometido vencido» (vigentes, con saldo y fecha prometida antes de
   hoy, con «Vence» y «Pago prometido» lado a lado; la antigüedad sigue usando «Vence», dictamen C-CP3-5) y «Facturas
   autorizadas sin contraseña» (filtro `sinContrasena`).
7. **Concurrencia:** crear, agregar y quitar piden primero la carga inicial (Empresas) y después bloquean la contraseña
   y los documentos en orden de id, sin bloquear filas de Libro de compras (las fechas de recepción se leen sin
   bloqueo): no invierte el orden «libro, luego Cuentas por pagar» ni el «Empresas, luego Cuentas por pagar» de U8. El
   único parcial resuelve dos contraseñas creadas a la vez con el mismo documento: una gana y la otra recibe el mensaje
   de §3.5. Dos impresiones a la vez de una contraseña sin imprimir: `update … set impresa_en = now() where id = … and
   impresa_en is null`; la que no actualiza ninguna fila sale como reimpresión.
8. **Correlativo:** un número por contraseña creada; anularla no libera el número (por eso no se eliminan). Si la empresa
   reinicia por año, el año es el de `fecha`. El reporte de correlativos de Bancos podrá sumar esta clave más adelante.
9. **Proveedor:** la llave `contrasenas_proveedor_fk` impide borrar un proveedor con contraseñas (ya lo impedían sus
   documentos).

## 10. Pasos (un commit cada uno; servidor y cliente por separado)

Cada commit corre `npm run revisar` y sus pruebas y actualiza la bitácora de `PLAN.md`. Va **después de CP2** (usa sus
columnas, `FechasDeEntrada`, `CargaInicial` y la variable de bancarización).

1. **CP3-1 (servidor, datos):** `contrasenas.tablas.ts` (con `impresa_en`), `contrasena-documentos.tablas.ts`, cambios en
   `aplicaciones-de-notas.tablas.ts`; migración `0005` (§3.4); mensaje de §3.5. **Pruebas de tablas:** cada check
   (pago antes de la fecha, observaciones con espacios, anulación incompleta, forma `contrasena` sin `contrasena_id`,
   referencia en una aplicación `contrasena`), documento de otro proveedor (falla por la llave), mismo documento en dos
   contraseñas vigentes (falla) y en una vigente y una anulada (pasa), cascada al eliminar el documento, número
   repetido, RLS por empresa; `politicas-de-los-modulos` y `llaves-entre-esquemas`.
2. **CP3-2 (servidor, crear y consultar):** dominio (validaciones de §5.1, reparto de la contraseña con
   `repartirNotaDeCredito` y la fecha «la mayor de…», número formateado), `CrearContrasena`, `ListarContrasenas`,
   `ObtenerContrasena`, `DocumentosDisponibles` (con `sobreUmbralDeBancarizacion`), permisos `ver` y `crear`, rutas.
   **Pruebas** puras (reparto: una nota sobre dos cargos, dos notas, nota que sobra, cubre todo; fecha de la aplicación
   con nota recibida después de la contraseña, con un saldo inicial y con todo anterior a la contraseña) y de API
   (crear con documentos de la bandeja, con un saldo inicial, sin cargos, documento ya en otra, de otro proveedor, fecha
   de pago anterior, correlativo y reinicio anual, sin permiso).
3. **CP3-3 (servidor, editar):** cambiar fecha de pago (motivo y auditoría `corregir`) y observaciones (sin auditoría),
   agregar y quitar documentos (rehace el reparto conservando la fecha de las notas que no cambian, auditoría `quitar`),
   permiso `editar`. **Pruebas:** cambiar la fecha prometida sin motivo (rechazo) y con motivo (auditoría con
   `anterior`), cambiar solo observaciones (sin auditoría), quitar el último cargo (rechazo), quitar una nota (vuelve su
   saldo libre), agregar una nota recibida después (su aplicación con su fecha de recepción), auditoría de quitar con
   `anterior`.
4. **CP3-4 (servidor, anular y reglas de baja):** `AnularContrasena`, permiso `anular`, `noEstarEnContrasena` al principio
   de las listas de CP1 y CP2 y en la de U8, `accionesDelDocumento` y DTO de documentos con `contrasena`, filtro
   `sinContrasena`. **Pruebas:** anular (suelta documentos, borra aplicaciones de la contraseña, auditoría), anular dos
   veces, anular y eliminar desde Libro de compras un documento en una vigente (rechazo, nada cambia) y en una anulada
   (pasa), corregir un saldo inicial en una contraseña (rechazo), aplicar una nota que está en una contraseña (rechazo).
5. **CP3-5 (servidor, impresión):** `GET …/:id/impresion` (vista previa) y `POST …/:id/impresiones`
   (`RegistrarImpresion`, `impresa_en`), con datos de la empresa por el mediador y la variable
   `cuentas-por-pagar.contrasenas.leyenda` (leyenda por omisión) en `configuracion.ts`. **Pruebas:** contenido (lo fijo
   y lo vivo, «Compensación con nota N», leyenda de constancias solo si hay retenciones), anulada, saldo inicial con
   retención por emitir (sin restarla), leyenda por omisión y de la empresa, vista previa sin marca, primera impresión
   sin «REIMPRESIÓN» y segunda con ella, dos impresiones a la vez.
6. **CP3-6 (cliente, lista y nueva):** páginas `Contrasenas` y `NuevaContrasena`, aviso de bancarización, lógica pura con
   pruebas, menú y textos.
7. **CP3-7 (cliente, ficha e impresión):** ficha con editar (fecha prometida con motivo), quitar, anular (aviso de
   recuperar el original); página de impresión con original y copia y «REIMPRESIÓN»; etiqueta y filtro en Documentos
   por pagar.
8. **CP3-8 (QA):** proveedor con tres facturas (una en la bandeja, una registrada, una autorizada, una de más de
   Q30,000), una nota con saldo a favor y un saldo inicial con retención por practicar; crear la contraseña (aviso de
   bancarización) e imprimirla (original y copia, leyenda, retención por emitir, compensación); reimprimir
   («REIMPRESIÓN»); llega una nota nueva de una de las facturas (el saldo baja); cambiar la fecha prometida con motivo
   (auditoría); quitar un documento con motivo; intentar anular desde Libro de compras una factura de la contraseña
   (rechazo); anular la contraseña (aviso del original) y crear otra con los mismos documentos; reinicio anual del
   número; permisos por separado.

## 11. Preguntas para el usuario (respondidas el 2026-11-08)

El usuario aceptó todas las recomendaciones y las preguntas depuradas 6 y 7 del dictamen. Quedan como registro:

- **CP3-a. Notas de crédito dentro de la contraseña.** **Respondida: A**, con la fecha de las aplicaciones «la mayor de…»
  (§2) y «compensación» visible en la impresión.
- **CP3-b. Cómo se imprime.** **Respondida:** página del cliente con `window.print()`, sin PDF del servidor. Por la
  pregunta depurada 7 del dictamen (que reemplaza la recomendación inicial de una sola hoja): **original y copia** en
  una impresión, con la firma del proveedor en la copia.
- **CP3-c. Montos vivos o guardados.** **Respondida:** vivos, con lo fijo separado de lo vivo y «REIMPRESIÓN»
  (`impresa_en`).
- **CP3-d. Fecha prometida propuesta.** **Respondida:** la mayor fecha de vencimiento de los cargos; sin «día de pago a
  proveedores» por ahora.
- **CP3-e. Leyenda al pie.** **Respondida:** sí, por empresa y por instalación, con la leyenda por omisión «recibido para
  revisión…».
- **CP3-f. Editar una contraseña vigente.** **Respondida:** sí, mientras no tenga pagos; cambiar la fecha prometida se
  audita con motivo (pregunta depurada 6).
- **CP3-g. Documento que estuvo en una contraseña anulada.** **Respondida:** se puede eliminar (cascada; queda en la
  auditoría).
- **CP3-h. Proveedor inactivo.** **Respondida:** sí.
- **CP3-i. Fecha de la contraseña.** **Respondida:** editable al crearla (por omisión hoy) y luego fija: tiene valor de
  prueba (Código de Comercio art. 598).
- **CP3-j. Tope.** **Respondida:** hasta 100 documentos.
- **CP3-k. Aviso al proveedor.** **Respondida:** no.

## 12. Lo que debía validar `contador-guatemala` (validado el 2026-11-08)

Dictamen `dictamen-cp2-cp3-2026-11-08.md`: **correcto con ajustes**, ya aplicados.

- **C-CP3-1. Contenido y valor legal.** No es documento fiscal; es constancia de recepción y puede valer como
  reconocimiento de la deuda. Total, retenciones y saldo; leyenda por omisión; auditoría `corregir` de la fecha
  prometida (§5.2, §5.5).
- **C-CP3-2. Notas en la contraseña (A).** Correcto; fecha de las aplicaciones corregida (§2).
- **C-CP3-3. Montos vivos.** Aceptable con lo fijo separado, «REIMPRESIÓN» (`impresa_en`) y el aviso al anular.
- **C-CP3-4. Retenciones por practicar.** El proveedor las ve: «Retención por emitir: Q…; se entregará su constancia»,
  sin restarlas otra vez; leyenda de constancias para toda retención.
- **C-CP3-5. Pago prometido y vencimiento.** Confirmado C4; reporte de pago prometido vencido en CP5.

## 13. Pendiente nuevo

- **P-CP3-1 (anotado, no frena): fecha de la contraseña con saldos iniciales.** La regla aprobada (§5.1, 4) solo pide que
  la fecha no sea anterior a la **emisión** de los documentos; con un saldo inicial, una contraseña podría fecharse
  antes de la fecha de inicio (una contraseña entregada en el sistema anterior y recapturada). Se deja así: sus
  aplicaciones de notas nunca quedan antes de la fecha de inicio (§2) y no mueve saldos. Si el contador prefiere
  exigir la fecha de inicio como mínimo, es una regla más en el dominio, sin cambio de datos.
