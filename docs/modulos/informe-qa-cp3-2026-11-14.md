# Informe de QA de CP3 (contraseñas de pago) — 2026-11-14

Alcance: `diseno-cp3-contrasenas.md` (§5, §8 y §10 punto 8) y su dictamen (`dictamen-cp2-cp3-2026-11-08.md`). Probado en el navegador
(Chromium, escritorio 1280 px y celular 380 px, modo claro y oscuro, emulación de impresión), contra una base propia
(`arrancar_qa7`) con datos inventados de la cuenta demo: proveedor «Veterinaria El Quiroa», facturas en la bandeja, registrada
y autorizada (una de Q33,600), notas de crédito con saldo a favor, un saldo inicial con retención por practicar (fecha de
inicio 01/11/2026) y usuarios con un solo permiso de `contrasenas.*`.

## Lo que se programó antes de probar (pendiente de CP3-7)

En Documentos por pagar: etiqueta «Contraseña N» en la tarjeta, número y enlace «Ver la contraseña de pago» en la ficha, y el
interruptor «Sin contraseña» (manda `sinContrasena`). Con pruebas en `contrasena-en-documentos.prueba.ts`.

## Resultados por flujo

| Flujo | Resultado |
|---|---|
| Crear con factura de la bandeja, registrada, autorizada y saldo inicial (retenciones y rebajado) | Bien; montos cuadran a mano (E1 corregido) |
| Fecha prometida sugerida (mayor vencimiento de lo marcado) | Bien |
| Aviso de bancarización con la cifra (Q 30,000.00) cuando la nota compensa la factura grande | Bien (celular, oscuro) |
| Nota que se reparte (orden de vencimiento; saldo inicial primero) y su fecha de aplicación = la mayor (recepción de la nota 12/11 sobre contraseña 11/11) | Bien |
| Fechas inválidas: futura, anterior a la emisión, anterior a la fecha de inicio, pago antes de la fecha | Bien (mensajes por campo) |
| Doble clic en «Crear» y en «Anular la contraseña» | Bien: un solo registro y una sola auditoría |
| Cambiar fecha prometida (motivo obligatorio, auditoría `corregir` con la fecha anterior) | Bien (E3 menor, corregido) |
| Agregar documentos (también solo notas), quitar documentos con motivo (auditoría `quitar`), no dejar sin cargos | Bien tras corregir E2 |
| Contraseña ya impresa: agregar y quitar confirman «REIMPRESIÓN»; anular dice «recupere el original» | Bien |
| Anular y volver a crear con los mismos documentos | Bien; el número no se reutiliza |
| Documento en contraseña vigente: no se anula, elimina ni corrige (saldo inicial incluido), desde Cuentas por pagar y Libro de compras | Bien (API 422 `documento_en_contrasena`; sin botones) |
| Nota en contraseña no se aplica ni se ajusta (API 422 `nota_en_contrasena`) | Bien |
| Vista previa no marca; primera impresión sin «REIMPRESIÓN»; después con ella (2 hojas, 4 marcas) | Bien; `window.print` se llama una vez por clic |
| Original y copia, leyenda, fijo y vivo «al 14/11/2026», compensación, retención por emitir, leyenda de constancias | Bien |
| Impresión en blanco y negro (emulación de impresión y escala de grises; PDF de 2 páginas carta) | Bien (E4 cosmético corregido) |
| Montos vivos: nota nueva sobre una factura de la contraseña baja el saldo (4,010 a 3,898) | Bien |
| Contraseña anulada: ficha de solo lectura, impresión con «ANULADA — motivo» en las dos hojas | Bien |
| Permisos `ver`, `crear`, `editar`, `anular` y sin permiso (API 403, botones ocultos, `/nueva` a «sin permiso») | Bien |
| Recargar a mitad de la nueva contraseña | Bien: vuelve al formulario vacío, sin duplicados |

## Errores encontrados

**E1 (media, corregido). El resumen de «Nueva contraseña» no cuadraba con un saldo inicial.** Pasos: marcar el saldo inicial
(total 1,120, retenciones 120, saldo 700) y otras facturas. Esperado: Total − Retenciones − Rebajado − Notas = Saldo. Pasó: el
resumen mostraba Total Q38,080, notas −24, retenciones 120 y saldo Q37,636 (faltaban Q300 de «pagos y notas anteriores al inicio»).
Corrección: el resumen muestra «Rebajado antes (pagos y notas)» cuando hay; prueba en `edicion-de-contrasena.prueba.ts`.

**E2 (media, corregido). «Agregar documentos» no ofrecía una nota cuando no había facturas disponibles.** Pasos: quitar una nota de
una contraseña y abrir «Agregar documentos» (solo quedaba la nota). Esperado: ofrecer la nota. Pasó: «Este proveedor no tiene
facturas disponibles». Corrección: la lista se oculta solo si no hay facturas ni notas; con solo notas dice «No hay facturas
disponibles; solo notas a favor.».

**E3 (menor, corregido). El error del motivo sigue en rojo después de escribirlo** en las ventanas de cambiar fecha, quitar y
anular; se limpia al volver a enviar. No bloquea. Corregido: `quitarErrorAlCambiar(errores, campo, valor)` (`usar-formulario.ts`) y lo usan
las ventanas de motivo (contraseñas, notas de crédito y Libro de compras) y la de cambio de fecha; el error del campo sale al cambiarlo.

**E4 (cosmético, corregido). En la hoja impresa, «Proveedor:Veterinaria…» sin espacio** entre la etiqueta y el dato.

**E5 (menor, corregido). La ficha del documento no explicaba por qué no se puede anular ni eliminar** si está en una contraseña
(el diseño §8 lo pedía). Ahora dice «Está en la contraseña N: mientras siga en ella no se puede anular, eliminar ni, si es un saldo
inicial, corregir…» (en una nota: aplicar ni ajustar).

## Observaciones (sin cambio)

- Quitar el único cargo responde «Una contraseña lleva al menos una factura u otro cargo.»; el diseño §5.2 sugería agregar
  «anúlela en su lugar».
- La confirmación de agregar a una contraseña impresa repite el aviso de «REIMPRESIÓN» que la ventana ya mostraba.
- La etiqueta «Contraseña N» usa el mismo tono que «Por autorizar»; se distingue solo por el texto.
- El motivo de «Quitar» es el que escribe el usuario; el diseño decía que nombrara el documento (el `anterior` de la auditoría
  sí lo trae).
- Un usuario con solo `contrasenas.ver` puede marcar la primera impresión (`POST …/impresiones`), como dice el diseño §6.1.

## Pruebas escritas

`contrasena-en-documentos.prueba.ts` (filtro, etiqueta, dato de la ficha y aviso) y un caso nuevo (más el de totales ajustado) en
`edicion-de-contrasena.prueba.ts` (rebajado antes). No se encontraron errores de servidor, así que no hubo pruebas de API nuevas.
