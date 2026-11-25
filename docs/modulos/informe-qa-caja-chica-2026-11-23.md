# Informe de QA en el navegador: Caja chica (CC-11), 2026-11-23

Alcance: Caja chica de punta a punta (CC-1 a CC-10) con los casos de la fila CC-11 de
`diseno-caja-chica-y-cuentas-por-liquidar.md`: abrir con cheque no negociable, factura desde la ficha, factura con retención
(bandeja, asignada con permiso y motivo), vale sobre el tope, reponer con desglose en Bancos, arqueo con faltante, custodio que
repone (aviso), usuario sin el fondo asignado, bancarización con una factura de caja chica y un cheque de Cuentas por pagar al
mismo proveedor, cerrar y celular; además vales provisionales, anular reposición y arqueo, accesos, reportes CC-R1 a CC-R5,
impresiones, Excel, permisos, modo oscuro y bordes (montos, fechas, doble clic, concurrencia, mes conciliado).

Herramientas: Chromium con Playwright (escritorio 1366 px y celular 390 px, claro y oscuro, y medio `print` con PDF) y la API con
sesiones reales. Base propia `arrancar_qa_cc11` (migrada y sembrada con `--demo`), API en :3311 y PWA en :5311. Una cuenta propia
(«Finca QA CC11»: Terceros, Libro de compras, Bancos, Caja chica y, para el caso de bancarización, Cuentas por pagar), empresa agente
de retención de IVA (contribuyente especial), una cuenta monetaria con Q 61,000.00 y su chequera, un proveedor y el concepto
«Medicinas». Usuarios: propietario, «custodio» (ver, comprobantes, reposiciones, arqueos y vales; sin excepciones), «lectora» (ver y
reportes.ver), «nadie» (solo Bancos) y un autorizador de conciliaciones.

Entorno: el puerto 5433 del PostgreSQL de desarrollo no era alcanzable desde el equipo en el momento de la prueba (el puente de Docker
`arrancar-dev_default` comparte la red 172.19.0.0/16 con un puente viejo caído, `br-15d3405570a6`, y el enrutamiento del anfitrión
se va por el caído). Se levantó un PostgreSQL propio y desechable (contenedor `qa-cc11-pg`) y la API y la PWA corrieron en un
contenedor de la imagen `arrancar:prueba`; las pruebas de Vitest corrieron en otro contenedor que comparte la red de un segundo
PostgreSQL propio con el puerto 5433. No se tocó la base de desarrollo del usuario. Los puertos 3100 y 5180 no se usaron.

## Resultado por flujo

| Flujo | Resultado |
|---|---|
| Abrir fondo con cheque (Q 1,500.00, tope Q 300.00, custodio usuario): cheque no negociable a nombre del custodio, concepto «Fondo de caja chica», origen `caja-chica`; el saldo baja Q 1,500.00 | Bien |
| Abrir fondo: nombre y custodio vacíos, monto 0, negativo, 3 decimales, texto, 12 enteros, nombre de 81 caracteres, repetido, «al portador», fecha futura, anterior al saldo inicial, mes conciliado (enero), saldo insuficiente, chequera inexistente, tope 0 o negativo, nombre `<script>` y `=1+1` | Bien (mensajes claros; ver errores 5 y 8) |
| «Agregar factura» desde la ficha: abre Ingreso de facturas con «Para: Fondo …», pide los datos fiscales del proveedor la primera vez, registra y vuelve a la ficha con el comprobante pendiente (Q 250.00) | Bien |
| Factura de Q 5,600.00 con retención: queda en la bandeja aunque se registre desde la ficha (retención Q 90.00, neto Q 5,510.00), con aviso; la ficha la muestra con «Asignar con retención» | Bien |
| Asignar con retención: sin motivo no deja; el custodio sin permiso recibe 403; con el permiso y un motivo entra (neto Q 2,755.00 de una factura de Q 2,800.00 con retención Q 45.00), sale de la bandeja y deja `asignado_por`; si el neto pasa del efectivo se rechaza con el aviso «gastaría Q … más de lo que tiene» | Bien |
| Vale de gasto: el custodio ve el campo del motivo solo si tiene el permiso; Q 350.00 sobre el tope de Q 200.00 sin permiso da 403 con mensaje; el propietario necesita el motivo (se guarda `sobre_el_tope`); sin factura requiere motivo; sobre el efectivo se rechaza | Bien |
| Reponer: desglose y cuadre (Q 750.00 de gasto + Q 50.00 de faltante = cheque de Q 800.00; en Bancos dos líneas «Reintegro de caja chica» 750.00 y «Faltante de efectivo» 50.00); doble envío simultáneo: una sola reposición, la otra recibe `comprobante_repuesto` | Bien |
| Reponer con solo un sobrante: «No hay nada que reponer» (la suma debe ser mayor que cero) | Bien |
| Arqueo con faltante (3 × Q 200 + 1 × Q 100 contra Q 750.00 esperados): «Falta efectivo por Q 50.00», pide el motivo y el destino, crea el comprobante de faltante pendiente de reponer; sobrante; cantidades negativas, denominaciones inválidas y fecha futura se rechazan | Bien (ver error 2 por el acta) |
| Custodio que repone su propio fondo: la reposición se hace y avisa «Usted es el custodio de este fondo y también lo repuso…» | Bien |
| Usuario sin el fondo asignado: la lista no lo trae, la ficha, los comprobantes y las reposiciones dan 404 y escribir en él da 404; sin permisos del módulo, 403 y el menú sin Caja chica; la asignación desde «Accesos» hace que lo vea | Bien (ver error 4 por los avisos repetidos) |
| Bancarización: cheque de Cuentas por pagar de Q 19,678.57 (neto) más facturas de caja chica de Q 11,050.00 (valor antes de retención) = Q 30,728.57, sobre el umbral de Q 30,000.00: avisa, marca «Sin bancarizar» y lo suma a lo siguiente (Q 31,008.57, Q 31,128.57); la factura con retención de la bandeja no cuenta hasta asignarla | Bien (cuadra a mano; ver error 7 por el texto) |
| Cerrar fondo: pide el motivo, compensa lo pendiente (Q 2,755.00) sin cheque y deposita el efectivo (Q 245.00, concepto «Devolución de fondo de caja chica»); doble clic: un solo depósito; el saldo de Bancos cuadra a mano (Q 26,316.44) | Bien (ver error 3) |
| Vales provisionales: entregar Q 400.00 (doble clic: uno solo), liquidar con una factura de Q 280.00 y un gasto sin factura de Q 70.00, regresan Q 50.00; efectivo 1,150.00 + pendiente 350.00 = 1,500.00 | Bien |
| Anular reposición (Bancos hace el inverso y los comprobantes vuelven a pendientes), anular arqueo (anula su faltante), anular apertura (una sola vez), aumentar, disminuir (más que el efectivo se rechaza), editar con nombre repetido | Bien |
| Anular el gasto de un vale provisional ya liquidado, o su factura desde el libro | **Error 1** |
| Anular en el libro una factura pendiente (anula el comprobante) o repuesta (se rechaza), eliminarla; el efectivo y lo pendiente cuadran | Bien |
| Fechas: mes conciliado (enero) en abrir se rechaza con `mes_conciliado`; reposición y aumento antes de la apertura se rechazan | Bien (no se probó anular algo ya hecho en un mes conciliado: no hay reposiciones en un mes conciliado en esta base) |
| Reportes CC-R1 a CC-R5 en pantalla: el estado de los fondos cuadra (monto Q 11,800.00; efectivo esperado Q 4,028.57; pendiente Q 7,771.43); reposiciones deducible y no deducible; vales sin factura | Bien (ver errores 6 y 9) |
| Excel de los cinco reportes: propietario 200 con nombre de archivo con fecha; «lectora» y «nadie» 403; nombres que empiezan con `=` o `@` salen como texto, no como fórmula | Bien |
| Permisos en pantalla: lectora (sin botones de acción, solo ve lo asignado, reportes con Imprimir y sin Exportar), custodio (sin cerrar, editar, aumentar, disminuir, anular ni asignar con retención), propietario (todo) | Bien |
| Celular (390 px) y modo oscuro: lista, ficha, ficha cerrada, bandeja, reponer, arqueo, solicitud, impresiones y los cinco reportes en los cuatro modos: sin desborde horizontal ni errores de consola | Bien |
| Impresión (medio `print` y PDF) de la solicitud, la reposición, el acta de arqueo y los cinco reportes, en claro y en oscuro: sin menú ni botones, hoja clara con texto negro | Bien (ver error 2) |

## Errores

### Error 1 (media, corregido el 2026-11-23): se puede anular lo que justificó un vale provisional ya liquidado y el vale deja de cuadrar

Pasos: abrir un fondo; entregar un vale provisional de Q 400.00; liquidarlo con una factura de Q 280.00 y un gasto sin factura de Q 70.00
(regresan Q 50.00). Luego, de dos maneras: (a) en la ficha, «Anular vale» sobre el gasto de Q 70.00 (`POST
/api/caja-chica/comprobantes/:id/anular`); o (b) anular en el libro de compras la factura de Q 280.00 (`POST
/api/libro-de-compras/documentos/:id/anular`).

Esperado: lo mismo que ya hace «devolver a la bandeja» para esos comprobantes (`comprobante_de_un_vale`, 422): rechazarlo; el vale está
liquidado y su entregado, gastado y devuelto no se pueden tocar sin reabrirlo.

Pasó: responde 200. El vale queda en «liquidado» con entregado Q 400.00, devuelto Q 50.00 y gastado Q 280.00 (o Q 0.00 en el caso b), es
decir faltan Q 70.00 o Q 350.00 que nadie justifica, y el efectivo esperado del fondo sube por esa misma cantidad (1,150.00 a 1,220.00 y
a 750.00): el próximo arqueo mostrará un faltante falso. Con la reposición anulada y el arqueo, el fondo cuadra por la ecuación pero
no por el vale.

Corrección: `AnuladorDeComprobantes` (lo usan «Anular vale» y el aviso del libro) rechaza con `comprobante_de_un_vale_no_se_anula` (422) el comprobante de un vale provisional (también `EliminarPorAviso`, cuando el libro elimina el documento), la ficha oculta «Anular vale» en esos gastos y las dos pruebas ya no llevan `it.fails`. Gravedad: media (descuadra dinero y no se ve; no había camino de recuperación: un vale liquidado no se puede anular ni reabrir, y «Anular vale» solo acepta vales abiertos sin comprobantes). Prueba con `it.fails`:
`servidor/src/pruebas-api/caja-chica-qa-hallazgos.api.prueba.ts`, tres casos. Pendiente de decisión con `contador-guatemala`: una factura de un vale liquidado que su emisor anula en la SAT queda vigente en el libro (el rechazo es permanente) y falta un camino, p. ej. reabrir o revertir la liquidación con auditoría. Sugerencia: la misma guardia de
`devolver-a-la-bandeja.ts` (`valeProvisionalId !== null`) en `anular-comprobante.ts` y en `atender-avisos-del-libro.ts`, y esconder
«Anular vale» en esos gastos.

### Error 2 (baja): el acta de arqueo imprime el identificador del usuario en «Arqueó:»

Pasos: hacer un arqueo y abrir «Acta» (`/caja-chica/arqueos/:id/imprimir`).

Esperado: el nombre de quien arqueó. Pasó: `Arqueó: 41c38d3b-2030-4e5d-a45f-bbf7688e5a01`; el DTO trae `arqueadoPor` con el uuid.
Gravedad: baja (es un documento para firmar). Prueba con `it.fails` en el mismo archivo.

### Error 3 (baja, corregido): la ficha de un fondo cerrado ofrece «Asignar con retención»

Pasos: cerrar un fondo y abrir su ficha: aparece «Facturas con retención en la bandeja» con el botón «Asignar con retención». El servidor
lo rechaza (`fondo_no_disponible`, «El fondo está cerrado: no admite cambios»). Se corrigió: la sección solo sale con el fondo abierto
(`cliente/src/modulos/caja-chica/paginas/FichaDeFondo.vue`, verificado en el navegador).

### Error 4 (baja): abrir la ficha de un fondo sin acceso muestra cinco avisos rojos idénticos

Pasos: con un usuario que no tiene asignado el fondo, abrir `/caja-chica/fondos/<id>`. Esperado: el estado vacío «No se encontró este fondo»
(sale) y, a lo más, un aviso. Pasó: cinco avisos «El fondo no existe o no tiene acceso.» (uno por cada lectura de la ficha: fondo,
comprobantes, vales, reposiciones y arqueos). Gravedad: baja. Sugerencia: no pedir lo demás cuando el fondo no se encontró, o que el
almacén de avisos no repita el mismo texto (es del core: no se tocó).

### Error 5 (baja): el mensaje de un monto negativo dice «con hasta dos decimales»

Pasos: abrir un fondo, un vale de gasto o un aumento con monto `-50`. Pasó: «Escriba el monto con hasta dos decimales.» Esperado: que diga que
debe ser mayor que cero (con 0 ya lo dice). Gravedad: baja. No se corrigió: el texto es el del esquema común de dinero, usado en 36 lugares
del sistema.

### Error 6 (baja, corregido): «Cheque Cheque 3» en las reposiciones del período

Pasos: reponer con cheque y abrir «Reposiciones del período» (pantalla y Excel). Pasó: «Reposición 1 · Cheque Cheque 3» y, en el
Excel, «Cheque Cheque 3»: Bancos guarda la referencia del cheque como «Cheque 3» y el reporte le anteponía «Cheque». Corregido en
`reporte-de-reposiciones.ts` (no repite el nombre de la forma si la referencia ya lo trae), con prueba unitaria.

### Error 7 (baja): la etiqueta del aviso de bancarización dice «el IVA de Caja chica, A-78455»

El aviso se arma con la etiqueta `Caja chica, <documento>` y queda «…y el IVA de Caja chica, A-78455 no es crédito fiscal…». Se lee raro; mejor
«de la factura A-78455 (Caja chica)». Gravedad: baja; el monto del aviso sí es correcto (Q 30,728.57 = 19,678.57 + 250.00 + 2,800.00 + 8,000.00).

### Observaciones (sin gravedad, para decidir)

8. Un fondo se abre con tope por comprobante mayor que su monto (Q 5,000.00 de tope en un fondo de Q 100.00): el sistema lo acepta. Quizá debería
   rechazarlo o avisar.
9. En la hoja de la reposición y en el acta, el faltante de un arqueo se rotula «Faltante · —» (sin descripción): sería más útil mostrar el
   motivo de la diferencia.
10. Una vez que la factura con retención se registró con destino a un fondo que luego se cerró, queda en la bandeja para siempre con la referencia a ese
    fondo; se puede asignar a otro fondo desde la bandeja (comportamiento correcto), solo se anota.
11. Los vales provisionales y los vales de gasto comparten el talonario (documentado en el diseño): un vale provisional puede llevar el número 6 y
    su gasto sin factura el 7. Se anota por si confunde a un operador.

## Lo que no se pudo probar

- Anular o corregir algo ya hecho dentro de un mes conciliado o cerrado (solo se probó que abrir un fondo con fecha de un mes conciliado se
  rechaza): no hay forma de tener una reposición fechada en un mes conciliado sin tocar fechas en la base.
- Importar desde Excel: Caja chica no lo ofrece.

## Pruebas

- `servidor/src/pruebas-api/caja-chica-qa-hallazgos.api.prueba.ts`: tres `it.fails` (errores 1 y 2) y una prueba nueva de la bancarización
  entre un cheque de Cuentas por pagar y una factura de caja chica del mismo proveedor (Q 28,533.93 + Q 1,500.00 = Q 30,033.93: avisa,
  marca «sin bancarizar» y lo suma).
- `reportes-de-fondos-y-arqueos.prueba.ts`: caso nuevo del rótulo del cheque (error 6).
