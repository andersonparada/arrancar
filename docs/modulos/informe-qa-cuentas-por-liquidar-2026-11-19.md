# Informe de QA en el navegador: Cuentas por liquidar (CL-7), 2026-11-19

Alcance: Cuentas por liquidar de punta a punta sobre `base-tanda8` (CL-1 a CL-6): entregar anticipos, gastos con y sin
documento, bandeja, liquidar (devolución, reembolso, no liquidado), reabrir, anular, vencidos con bloqueo, reportes CL-R1 y
CL-R2, permisos, celular, modo oscuro, impresión y Excel.

Herramientas: Chromium con Playwright (escritorio 1366 px y celular 390 px, claro y oscuro) y la API con sesiones reales.
Base propia `arrancar_qa_cl7` (migrada y sembrada con `--demo`), API en :3171 y PWA en :5171 (los puertos 3100 y 5180
no se tocaron); las pruebas de Vitest usaron `BD_PRUEBAS=arrancar_qa_cl7`. Datos: empresa demo agente de retención del IVA
(contribuyente especial), una cuenta monetaria con Q 61,000.00 y su chequera, un proveedor, un empleado y una persona que no
lo es. Usuarios de prueba: propietario (todos los permisos), «lector» (ver y reportes.ver), «operador» (ver, crear anticipos y
crear gastos) y otro sin permisos del módulo. Los anticipos viejos se fabricaron cambiando fechas en la base (no hay otra
forma de tener un anticipo vencido el mismo día).

## Resultado por flujo

| Flujo | Resultado |
|---|---|
| Entregar anticipo con cheque desde la ventana (confirmación con monto, cheque y fecha límite), lista con total «por justificar» | Bien |
| «Agregar factura» desde la ficha: abre Ingreso de facturas con «Para: Anticipo N», pide los datos fiscales del proveedor, registra y vuelve a la ficha con el gasto | Bien |
| Viático de Q 3,000.00 con dos facturas de Q 1,120.00 y un gasto sin documento de Q 45.50: por justificar Q 714.50 | Bien (cuadra a mano: 3,000 − 2,285.50) |
| Gasto sin documento: campos obligatorios, monto 0 (mayor que cero), negativo, 45.555 (no envía); quitar pide motivo y deja la factura en la bandeja | Bien (ver error 9 para un monto gigante) |
| Liquidar con devolución (Q 714.50, boleta, doble clic): un solo depósito, desglose en Bancos 2,285.50 + 714.50, cheque con su concepto | Bien (el doble clic cae en la confirmación y no duplica) |
| Reabrir con motivo: anula el depósito (nota inversa), vuelve a «por liquidar», auditoría `reabrir`; sin motivo no deja | Bien |
| Gastar de más: gasto de Q 5,000 sobre Q 3,000, «Gastado de más» y reembolso con cheque de Q 4,285.50; saldo de Bancos 48,190.00 cuadra a mano | Bien |
| Reembolso con nota de débito por API y dos liquidaciones simultáneas: una sola pasa, la otra recibe `anticipo_liquidado` | Bien |
| No liquidado en cuotas (6 de Q 250.00): 3 cuotas y 121 se rechazan con mensaje, voluntario permite menos; renta del trabajo solo a un empleado (la opción sale deshabilitada si no lo es); pérdida | Bien |
| Liquidación mixta (devuelve Q 500.00, Q 200.00 en 5 cuotas): confirmación, desglose 100 + 500 + 200 = 800 y autorización de descuento en la impresión | Bien |
| Fecha de liquidación futura o anterior al último gasto; fecha de entrega futura o anterior al saldo inicial; límite anterior a la entrega; monto 0, negativo, 3 decimales, Q 999,999,999,999.99; descripción vacía, de espacios o de 301 caracteres | Bien (mensajes claros; la API da «Revise los datos enviados.» en los de formato) |
| Anular desde la ficha (sin gastos, con motivo) y desde Bancos con gastos (`anticipo_con_gastos`) o liquidado (`anticipo_liquidado`); anular desde Bancos el cheque del reembolso reabre el anticipo | Bien (ver error 3 por el rótulo repetido) |
| Vencidos: aviso en la ventana y en la ficha; con el bloqueo encendido el propietario necesita el motivo (se guarda en el anticipo) y el operador recibe `beneficiario_con_vencidos` | Bien (ver error 1 por el aviso repetido) |
| Bandeja: factura de Q 5,600.00 con retención (neto Q 5,510.00, retención Q 90.00) queda en la bandeja aunque traiga referencia; el operador sin excepción la ve con el casillero apagado; el propietario la asigna con motivo y queda `autorizar` en la auditoría | Bien |
| CL-R1 al corte (hoy y hacia atrás), vencidos, tramos de antigüedad, Excel e impresión | Bien en las cuentas (700 + 800 = 1,500; vencido 1,100); ver error 5 con un anticipo gastado de más |
| CL-R2 por destino (1,500 + 750 + 700 = 2,950), reabierto deja de contar, Excel e impresión | Bien |
| Permisos: lector (sin botones de acción ni Exportar, 403 en toda escritura y en exportar), operador (403 en liquidar, anular, reabrir, quitar y reportes), sin permisos (menú sin el módulo y `/sin-permiso`) | Bien |
| Celular (390 px) y modo oscuro en lista, ficha, liquidar, bandeja, R1, R2 e impresión: sin desborde horizontal; la hoja impresa sigue clara | Bien (ver error 6) |
| Impresión de la liquidación y de los dos reportes (medio `print`: sin menú, hoja clara aun en oscuro) | Bien |

No se probó en el navegador una entrega o una reapertura en un mes conciliado o cerrado en Bancos: lo cubren las pruebas de API
de CL-2 y CL-4, que ya pasan.

## Errores y observaciones

| # | Gravedad | Descripción | Estado |
|---|---|---|---|
| 1 | Media | En la ficha de un anticipo vencido el aviso «El anticipo N venció el… aún tiene Q… por justificar» salía **dos veces** | Corregido |
| 2 | Baja | La ayuda de «Fecha límite» decía «será el 2026-12-04» (formato ISO) en vez de 04/12/2026 | Corregido |
| 3 | Baja | El motivo del cheque anulado desde Cuentas por liquidar quedaba «Anulado desde Cuentas por liquidar: Anulado desde Cuentas por liquidar: …» en Bancos (el módulo y Bancos ponían el rótulo) | Corregido en Cuentas por liquidar; igual en Cuentas por pagar (pendiente) |
| 4 | Media | Un usuario con `anticipos.crear` pero sin `terceros.ver` abre «Entregar un anticipo» y el beneficiario solo dice «Sin resultados», sin explicar; tampoco puede usar el filtro de beneficiario | Corregido el 2026-11-23: catálogo propio `GET /cuentas-por-liquidar/beneficiarios` |
| 5 | Media | CL-R1 suma con signo un anticipo gastado de más: con uno de −Q 4,285.50 el total «por justificar» de Juan salió −Q 3,585.50 y «Dentro del plazo» −Q 4,185.50 | Corregido el 2026-11-23: lo gastado de más va aparte como «a reembolsar» (la prueba pasó a `it`) |
| 6 | Baja | En celular la cifra grande «Por justificar Q 400.00» se parte en dos líneas («Q 400.0 / 0») a 390 px | Corregido el 2026-11-23 |
| 7 | Baja | Al liquidar con devolución no se preselecciona la cuenta de depósito aunque haya una sola (la entrega sí preselecciona la chequera) | Corregido el 2026-11-23 |
| 8 | Baja | «Es empleado de la empresa» queda encendido en cada entrega: hay que apagarlo cada vez para quien no lo es (el tercero no lo recuerda) | Abierto |
| 9 | Baja | En «Gasto sin documento» un monto como 99999999999999 da «Escriba el monto con hasta dos decimales.» (el problema es el tamaño) | Corregido el 2026-11-23 |
| 10 | Baja | Al liquidar en cuotas, tras un rechazo del servidor el aviso rojo de arriba no se limpia si el siguiente intento falla por otro campo | Abierto |
| 11 | Cosmética | Impresión: «Beneficiario:Juan…» sin espacio tras los dos puntos; la confirmación dice «cobrarlo en cuotas en 6 cuotas»; el Excel de CL-R1 dice «1 anticipos, 1 beneficiarios, 1 vencidos»; un anticipo anulado muestra «Agregue las facturas…»; las tablas con y sin documento no alinean sus columnas | Abierto |
| 12 | Observación | El selector de beneficiarios ofrece también terceros de tipo empresa (un proveedor); una nota de débito se acepta sin referencia (el diseño la pedía «con referencia»); el corte de CL-R1 acepta fechas futuras (2999-01-01) | Abierto (decisión) |

### Pasos para reproducir

**1 (corregido).** Entregar a un beneficiario un anticipo y envejecerlo a un plazo vencido; abrir su ficha. Esperado: un aviso.
Pasó: el mismo texto dos veces. Causa: el servidor manda el aviso en `aviso` y también dentro de `avisos` (una prueba de API lo
exige) y la página los sumaba. Ahora `avisosDeLaFicha` los junta sin repetir, con prueba.

**2 (corregido).** Abrir «Entregar un anticipo», mirar la ayuda bajo «Fecha límite para liquidar». Ahora usa `formatearFecha`.

**3 (corregido en Cuentas por liquidar).** Anular un anticipo sin gastos con motivo «Se entregó por error» y mirar el cheque
anulado en Bancos (Cheques o auditoría). Esperado: «Anulado desde Cuentas por liquidar: Se entregó por error». Pasó el
rótulo dos veces. Ahora el caso de uso pasa el motivo tal cual (Bancos pone el rótulo, como ya hacía al reabrir) y una prueba
de API lo comprueba. En Cuentas por pagar `anular-pago`, `anular-reintegro` y `anular-retiro` aún anteponen el rótulo: queda
anotado para su módulo.

**4 (abierto).** Entrar con un rol que solo tenga `cuentas-por-liquidar.anticipos.ver`, `.crear` y `gastos.crear`; abrir
Anticipos → Entregar un anticipo → desplegar «Beneficiario». Esperado: poder escoger a alguien o un mensaje que diga qué
permiso falta. Pasó: «Sin resultados». Las rutas de opciones del módulo (`medios-para-entregar`, `conceptos-de-gasto`) sí se
sirven sin permisos de Bancos ni del libro, pero los beneficiarios salen de `/terceros`, que pide `terceros.ver`.
Decisión pendiente: una ruta de opciones de beneficiarios bajo `anticipos.crear`, o exigir `terceros.ver` junto a crear.

**5 (`it.fails`).** Con un anticipo de Q 100.00 con gastos de Q 400.00 (la empresa debe Q 300.00) y otro abierto de Q 200.00
del mismo beneficiario, abrir CL-R1. Esperado (a decidir): lo por justificar es Q 200.00; el reembolso pendiente se mostraría
aparte. Pasó: el total resta y sale −Q 100.00. Prueba: `cuentas-por-liquidar-reportes-gastado-de-mas.api.prueba.ts`.

**6 a 12.** Se ven al abrir las pantallas indicadas; las capturas de la corrida no se guardan en el repositorio.

## Correcciones hechas (solo lo trivial)

- `cliente/.../composables/anticipos/ficha-de-anticipo.ts` (`avisosDeLaFicha`), `paginas/FichaDeAnticipo.vue` y su prueba.
- `cliente/.../componentes/CamposDeAnticipo.vue` (fecha propuesta con el formato de la empresa).
- `servidor/.../casos-uso/anticipos/anular-anticipo.ts` y su prueba unitaria; prueba de API nueva en
  `cuentas-por-liquidar-anticipos-anulacion.api.prueba.ts`.
- Prueba nueva `it.fails`: `servidor/src/pruebas-api/cuentas-por-liquidar-reportes-gastado-de-mas.api.prueba.ts`.

## Cuentas a mano

- Anticipo 1: entregado 3,000.00; facturas 1,120.00 + 1,120.00 + sin documento 45.50 = 2,285.50; devuelto 714.50; reabierto con
  un gasto de 5,000.00: gastado 7,285.50, reembolso 4,285.50.
- CL-R2: 1,500.00 (6 cuotas de 250.00) + 750.00 + 700.00 = 2,950.00; al reabrir el de 700.00 queda 2,250.00.
- CL-R1: Ana 1,000.00 − 300.00 = 700.00; Juan 600.00 − 200.00 = 400.00 y 400.00; total 1,500.00, vencido 1,100.00.
- Saldo de Bancos: 61,000 − 3,000 (1) − 2,000 − 1,000 − 800 − 1,000 − 600 − 100 + 500 (devolución del 4) − 4,810 (reembolso del 5) =
  48,190.00, igual al que muestra la API (los cheques anulados y sus inversos suman cero).

## Notas para quien repita la prueba

- El inicio de sesión se limita a 10 por minuto; con la API hay que pedir `/api/sesion` después de entrar antes de usar roles.
- El Excel exportado trae las fechas como fecha (no texto) y las cifras como número.
- Las confirmaciones de entregar, liquidar y asignar son una segunda ventana: un doble clic en el botón de abajo cae en el
  fondo y cancela (por eso no se duplica nada), pero conviene saberlo al automatizar.
