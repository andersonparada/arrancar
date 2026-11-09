# Informe QA: formulario de registro del Libro de compras por contenedor (2026-11-08)

Alcance: factura, nota de crédito, nota de débito y recibo (sin FEL) en `/libro-de-compras/documentos/nuevo`,
a 380, 768, 1024, 1280, 1440 y 1920 px, en modo claro y oscuro. Base propia `arrancar_qa4` con datos de la demo
y proveedores inventados. El menú lateral es fijo desde 1024 px; por debajo es un cajón que se superpone y no
cambia el ancho del contenido. No se probó «Abrir en el formulario» desde la bandeja de la SAT, porque la demo no
tiene DTE y no se usaron datos reales; queda pendiente con un DTE inventado.

## Resultados

| Ancho | Factura | Nota crédito | Nota débito | Recibo |
|---|---|---|---|---|
| 380 / 768 | bien (768: período cortado, corregido) | igual | igual | igual |
| 1024 | error (corregido) | error (corregido) | error (corregido) | error (corregido) |
| 1280 | error leve (corregido) | error leve (corregido) | error leve (corregido) | error leve (corregido) |
| 1440 / 1920 | bien | bien | bien | bien |

Sin desbordes de página, sin campos fuera de la tarjeta ni encimados. El modo oscuro se ve igual de bien.

## Errores

1. **1024 a 1279 px: columna del formulario de unos 260 px.** La vista previa (26 rem) pasaba a una columna al lado
   desde `lg`, pero el menú lateral de 18 rem ya ocupa su lugar, así que el formulario quedaba angosto: tipo de
   documento «NCRE — Nota de cr…», factura afectada «Este proveedor no …», período «El propuesto por el …»,
   y todo en una sola columna de campos. Gravedad: media. Corregido: la vista previa va al lado desde `xl`
   (1280); de 1024 a 1279 va debajo y el formulario usa dos columnas de campos.
2. **768, 1024 y 1280 px: el selector «Período del libro» cortaba «El propuesto por el sistema».** Cabía a media
   columna. Gravedad: baja. Corregido: ocupa las dos columnas cuando el contenedor tiene dos, y una cuando tiene tres.

Observación sin cambio: a 380 px el selector de la factura afectada corta «Este proveedor no tiene facturas
vigentes…» con puntos suspensivos; es el comportamiento normal de un selector.

Archivos: `paginas/FormularioDeDocumento.vue` y `componentes/registro/CamposDelEncabezado.vue`.
