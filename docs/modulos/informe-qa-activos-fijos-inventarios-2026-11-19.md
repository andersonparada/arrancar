# Informe de QA: Activos fijos e Inventarios (2026-11-19)

Pruebas de punta a punta en el navegador (Chromium, 1280 px y 390 px, modo claro y oscuro) y contra la API, con la
rama `base-tanda5`. Se hicieron con una base propia `arrancar_qa_afinv` (migrada y sembrada con `--demo`), API en el
puerto 3257 y PWA en el 5257, dos empresas en una cuenta, una segunda cuenta y cinco usuarios: dos bodegueros, un lector,
un contador y uno sin permisos. Diseños: `diseno-activos-fijos.md`, `diseno-inventarios.md` y
`diseno-integracion-activos-fijos-e-inventarios.md`.

## Lo que tiene pantalla hoy y lo que no

- **Con pantalla:** clases de activos (con Excel), activos (lista con filtros y etiquetas, alta manual, ficha con historial
  de ubicación), unidades, categorías y artículos (con conversiones, lotes y Excel).
- **Solo API (sin pantalla):** costos manuales y anulación, poner en uso y quitar de uso, ocioso, eliminar activo, bandeja
  y capitalizar, ventana de conceptos de la clase, bodegas y su ventana de asignación.
- **No existe todavía:** traslados, etiquetas imprimibles, existencias y movimientos de inventario (planes AF-5 a AF-7 e
  INV-2c a INV-4c). No se pudo probar lo que no está programado.

## Resultados por flujo

| Flujo | Resultado |
|---|---|
| Clases: crear, editar, inactivar con confirmación, eliminar con activos (rechaza), exportar, ventana en celular oscuro | Bien |
| Clases: nombre repetido (mayúsculas y espacios), porcentaje sobre el máximo del inciso, negativo, terrenos con porcentaje, residual 100 %, nombre de 81 caracteres o en blanco | Bien (se rechazan) |
| Activos: alta manual completa (clase, localidad, responsable, serie), doble clic en Guardar (crea uno solo), vacío, sin clase, fecha futura, cantidad 0, negativa o decimal, código repetido o con espacio, texto con HTML (se ve como texto) | Bien |
| Activos: 6 altas simultáneas con código propuesto | Bien (códigos distintos, sin 500) |
| Activos: costos manuales (Q8,000.00 + Q250.50 = Q8,250.50; anulado el flete queda en Q8,000.00), monto 0, negativo o con 3 decimales | Bien |
| Activos: poner en uso (Equipo de cómputo 33.33 %, 36 meses; Vehículos 20 %, 60 meses), quitar de uso, ocioso (motivo obligatorio, fechas) | Bien (solo API) |
| Activos: bien de terceros, de control, reproductor | Bien. Un bien de control o de terceros nace en uso, como dice el diseño |
| Activos: valor como ganado común en una clase que no es de reproductores | Error 1 |
| Activos: la ficha no ofrece editar, marcar ocioso, poner en uso, costos ni eliminar; no muestra el costo ni el motivo del ocio | Pendiente declarado (AF-2c); ver Error 2 |
| Unidades: crear, editar, nombre o símbolo repetido, masa sin factor, cantidad con factor, factor 0 o negativo | Bien |
| Categorías: crear, repetida, tipo inválido, eliminar con artículos (rechaza) | Bien |
| Artículos: crear con código propuesto, código o nombre o código de barras repetidos, vencimiento sin lotes, mínimo negativo, peso 0, 4 altas simultáneas con el mismo código (1 crea, 3 con 409) | Bien |
| Artículos: conversiones (Saco = 100 lb, para compras única, factor 0, repetida, la unidad base), lotes con vencimiento, lote repetido, vencimiento antes de fabricación | Bien |
| Artículos: búsqueda en la lista (sin acentos, mayúsculas, `%` no es comodín) | Bien |
| Excel de artículos, unidades, clases: falso `.xlsx`, `.txt`, 6 MB, plantilla vacía, ensayo con 4 filas malas (informa fila y columna, no guarda), nombre `=HYPERLINK(...)` exportado como texto | Bien |
| Bodegas (API): crear, código o nombre repetido, responsable con usuario (queda asignado), inactivar | Bien |
| Bodegueros: cada uno ve solo sus bodegas, la ajena da 404, no edita, crea, elimina ni asigna (403), no se autoasigna, asignar y quitar desde la ventana surte efecto en el acto | Bien |
| Permisos en pantalla: el lector no ve botones de crear, editar, eliminar, importar ni exportar; entra a una ruta sin permiso y ve «No tiene acceso» | Bien |
| Permisos en API: lector y sin permisos reciben 403; contador crea pero no elimina; sin sesión 401 | Bien |
| Aislamiento: otra cuenta no ve, edita ni borra activos, clases, artículos, lotes, conversiones, bodegas ni unidades (404); otra empresa de la misma cuenta ve listas vacías y puede repetir códigos; no se activa una empresa de otra cuenta | Bien |
| Auditoría de eliminar, inactivar, anular y corregir (activos, clases, costos, bodegas, artículos, unidades, conversiones) | Bien (hay fila en `core.auditoria`) |
| Celular (390 px) y modo oscuro en las 7 pantallas: sin desborde horizontal, contraste legible, ventanas con Escape | Bien |
| Cambiar de empresa con la sesión abierta | Bien (vuelve a Inicio y las listas cambian) |

## Errores

### Error 1 (baja, sin corregir, con prueba `it.fails`): la API acepta valor como ganado común en una clase que no es de reproductores

- **Pasos:** `POST /api/activos-fijos/activos` con una clase «Vehículos» y `valorComoGanadoComun: "5000.00"`.
- **Se esperaba:** rechazo 4xx, porque el diseño (§3.5, §5.3) solo prevé ese valor en reproductores y la pantalla ya lo
  oculta para las demás clases.
- **Pasó:** 201; el dato queda guardado en un activo que no es reproductor. Cuando exista la depreciación (AF-5) podría
  restarse de la base fiscal de un bien que no lo permite.
- **Prueba:** `servidor/src/pruebas-api/activos-fijos-qa-hallazgos.api.prueba.ts`.

### Error 2 (baja, sin corregir): la ficha del activo ocioso no dice desde cuándo ni por qué

- **Pasos:** marcar ocioso un activo en uso por API (fecha y motivo) y abrir su ficha.
- **Se esperaba:** ver la fecha y el motivo (V-4 del diseño pide el motivo).
- **Pasó:** solo aparece la etiqueta «Ocioso».

### Error 3 (baja, sin corregir): ficha de un registro que no existe o es de otra empresa deja la pantalla vacía

- **Pasos:** con la sesión en «Empresa Segunda», abrir `/activos-fijos/activos/<id de la empresa A>` (igual con
  `/inventarios/articulos/<id inexistente>`).
- **Se esperaba:** un mensaje en la página con el enlace «Volver».
- **Pasó:** solo un aviso rojo emergente «El activo no existe o no tiene acceso.» y el área principal en blanco, sin título
  ni «Volver a Activos fijos».

### Error 4 (baja, sin corregir): cambiar la unidad base de un artículo con conversiones no avisa

- **Pasos:** artículo en libras con «Saco = 100» y cambiar la unidad base a kilogramos.
- **Pasó:** guarda y el saco pasa a valer 100 kg sin aviso. Hoy no hay movimientos, pero el diseño (§5.3) dice que la unidad
  base no cambia tras el primer movimiento; INV-4 debe bloquearlo y conviene que mientras tanto avise.

### Observaciones menores (sin gravedad)

- Una conversión con una unidad de la misma magnitud que la base (quintal para un artículo en libras) se acepta, aunque el
  diseño dice que esas se convierten solas; puede contradecir el factor automático.
- En la importación, «El registro ya existe.» no dice qué columna choca (nombre o código).
- Los avisos de éxito se acumulan en pantalla al hacer varias acciones seguidas.
- Se puede eliminar un activo en uso con costo manual vigente (204, con auditoría); el diseño solo exige anular los costos
  que vienen de líneas del libro. Conviene confirmarlo con el contador.
- Un terreno se acepta como «bien de control» (nace en uso, sin tramos).

## Notas de la corrida

- Un primer intento usó los puertos 3231 y 5231, que ya ocupaba otra QA (base `arrancar_qa_bs8`): mis servidores no
  arrancaron y la primera tanda de pruebas escribió en la base de esa QA (cuenta «Otra Cuenta», empresa «Empresa Segunda»,
  usuarios `bodegauno`, `bodegados`, `lectorafinv`, `contadoraf`, `sinpermiso`, `duenoajeno`, roles, localidades, activos y
  artículos de prueba, y los módulos de la cuenta demo activados). Todo se repitió completo con mis propios servidores en
  la base `arrancar_qa_afinv` y los resultados de este informe son de esa segunda corrida. La otra QA debe saber que su
  base tiene esos datos extra.
- No se probaron fechas en meses cerrados o conciliados: los cierres de Activos fijos (AF-5) e Inventarios no existen aún.
