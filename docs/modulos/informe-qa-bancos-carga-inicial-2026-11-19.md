# Informe de QA, Bancos BS-8: carga inicial de punta a punta (2026-11-19)

Base: `base-tanda5`. Diseño: `docs/modulos/diseno-bancos-segunda-parte.md` (BS-1 a BS-9). Entorno: API en el puerto
3231, PWA en el 5231, base propia `arrancar_qa_bs8` creada desde las migraciones y sembrada con `--demo`. Navegador
Chromium con Playwright (escritorio 1366 px en modo claro; celular 390 px en modo oscuro; impresión a PDF). Los datos
se cargaron por la API y las pantallas se recorrieron en el navegador. Los cálculos de dinero se verificaron a mano.

## Escenario

Empresa con fecha de inicio 01/01/2026 (corte 31/12/2025).

- **Cuenta A**: banco 10,000.00; cheques en circulación 101 (30/04/2025, 1,500.00, 8 meses), 102 (2,000.00) y 103
  (750.50); depósito en tránsito de 40 días (21/11/2025, 3,000.00); error del banco que resta (125.00); posfechado 104
  del 15/02/2026 (900.00) en la chequera de apertura. Libros al corte: 10,000 + 3,000 - 4,250.50 - 125 = **8,624.50**
  (cuadra con los libros anteriores).
- **Cuenta B**: sin saldo inicial (abierta en febrero).
- **Cuenta C**: sobregirada, banco -2,500.00; cheque 201 de 8 meses (600.00); luego Excel con un cheque (100) y un
  depósito (700).
- Usuarios de prueba: lector, sin permiso de saldos iniciales, editor (sin anular/eliminar) y quien autoriza.

## Resultados por flujo

| Flujo | Resultado |
|---|---|
| Cabecera y partidas (crear, corregir, borrar), cuadre contra libros anteriores | Bien. Totales Bancos 9,136.50 y Sobregiros 2,500.00 separados |
| Avisos: cheque de 8 meses (art. 508), depósito de 40 días (31 sí, 30 no), sobregiro exento con aviso | Bien |
| Bordes: monto 0/negativo, fecha después del corte, sin cabecera, repetido, posfechado no posterior, error sin sentido o sin descripción | Bien (400/422 con mensaje claro) |
| Número de cheque negativo o mayor que el entero | **Error BS8-1** (500) |
| Doble clic al guardar un cheque (pantalla y dos solicitudes en paralelo) | Bien: se crea uno solo |
| Hallazgos antes de cerrar y cierre con y sin motivo | Bien (pide motivo; sin evidencia solo avisa) |
| Cerrar la carga e intentar corregir (cabecera, partidas, evidencia, borrar, fecha de inicio) | Bien: `carga_inicial_cerrada` en todos |
| Cambiar la fecha de inicio con saldos de Bancos | Bien: rechazado con mensaje |
| Evidencia de la apertura (subir PNG, rechazar un falso PDF, abrir, quitar) | Bien |
| Excel de saldos y de partidas (exportar, ensayo con 7 filas malas, ensayo bueno que no guarda, importación real, archivo no xlsx) | Bien: errores por fila y columna; el ensayo no guarda |
| Primera conciliación de enero con la carga | Bien: saldo del banco rotulado, 4 cheques/partidas marcados, 103 queda, posfechado 104 cobrado en enero. Banco 8,475.00 = 10,000 + 3,000 - 4,525; libros 8,624.50 = banco 8,475 - cheque 103 en circulación 750.50 + posfechado cobrado antes de su fecha 900; cuadra |
| Primera conciliación de otro mes (C en marzo), salto de mes (A en marzo) | Bien: rechazadas |
| Febrero: el posfechado cobrado en enero no es candidato | Bien |
| Elaborar y autorizar (mismo usuario rechazado; otro usuario autoriza) | Bien |
| Anular el cheque 103 en febrero (nota de crédito, concepto «Partidas de apertura anuladas»), antes del corte, doble anulación, posfechado, partida ya conciliada | Bien (la ya conciliada se rechaza) |
| Flujo de efectivo: el inverso cae en «sin actividad» y el control cuadra (5,975.00) | Bien en cifras; presentación **BS8-7** |
| Cheques, chequeras (chequera de apertura, inactiva), notas, correlativos | Bien |
| Reporte de movimientos (pantalla y Excel), cheques caducos (cheque 201) | Bien en datos |
| Saldos por cuenta (pantalla y Excel) a hoy | Bien: A 8,475.00, C -3,100.00, totales Bancos 8,475.00 y Sobregiros 3,100.00 |
| Estado de cuenta (pantalla, impresión, Excel): saldo final 8,475.00, «Documento interno…» | Bien en cifras; **BS8-4**, **BS8-5** |
| Permisos (lector, sin permiso, editor): 403 en escritura, exportar y anular; la pantalla oculta botones o muestra «sin acceso» | Bien |
| Conciliación impresa (partidas de la carga, cobrados antes de su fecha) | Bien |
| Conciliación en celular | **Error BS8-2** (desborde y textos cortados) |
| Modo oscuro en ficha, conciliación, movimientos, saldos por cuenta | Bien salvo lo del celular |

## Errores

### BS8-1 (media, no corregido): número de cheque negativo o enorme da 500
- Pasos: `POST /api/bancos/saldos-iniciales/:cuenta/partidas` con `parte: cheque_en_circulacion` y `numeroDeCheque` -3
  (o 2147483648, o 99999999999).
- Esperado: 400 con mensaje («El número de cheque debe ser mayor que cero y caber en…»).
- Pasó: 500 `error_interno`. En el Excel de partidas puede pasar igual.
- Prueba: `servidor/src/pruebas-api/bancos-qa-bs8-bordes.api.prueba.ts` (`it.fails.each`, quitar `.fails` al corregir).

### BS8-2 (media, no corregido): conciliación con la carga inicial se rompe en celular (390 px)
- Pasos: abrir `/bancos/conciliaciones/<id>` de una cuenta con partidas de la carga, en celular.
- Esperado: filas legibles y sin desborde horizontal.
- Pasó: la página se desborda 24 px a la derecha; en la lista de candidatos el nombre («Cheque 101 · Proveedor») no se
  ve, solo la insignia «De la carga inicial» y montos como «- Q 1,500.00» cortados; en «Cheques en circulación» el
  texto queda en una «C»; el texto «Cheque con fecha …: márquelo solo si el banco ya lo pagó» se parte letra por letra
  en una columna angosta.
- Captura: `/tmp/claude-1000/capturas-bs8/conc-mov-osc.png`.

### BS8-3 (baja, no corregido): botón «Anular» en cheques ya conciliados
- En Cheques, el 101 y el 102, ya marcados en una conciliación, muestran «Anular»; al usarlo el servidor responde
  `movimiento_marcado_en_conciliacion` con el texto «ya está marcado en una conciliación: no se puede eliminar», que
  habla de eliminar cuando se pidió anular. Conviene ocultar el botón y corregir el mensaje.

### BS8-4 (baja, no corregido): impresión del Estado de cuenta con columna de concepto muy angosta
- En el PDF, la columna Concepto se parte en 4 a 6 líneas y repite «Saldo inicial — Saldo inicial» cuando documento y
  concepto coinciden. Es legible pero malgasta hojas.

### BS8-5 (baja, no corregido): saldo corrido del Estado de cuenta con la carga
- Una consulta que empieza antes del corte (p. ej. desde 01/04/2025) muestra saldos intermedios negativos (-1,500.00,
  -500.00…) porque las partidas de la carga tienen su fecha original y el saldo del banco está al 31/12. El saldo
  final es correcto. Se sugiere una leyenda o mostrar la carga en un renglón.

### BS8-6 (baja, no corregido): detalles del Excel y de la revisión de cierre
- Excel de Saldos por cuenta: la fila «Nota» trae ceros en las columnas numéricas y «Atrasada: No» en los totales.
- Excel de Movimientos: el cheque 103 revertido sale con «Anulado: No» (la pantalla sí dice «Revertido»).
- La revisión de cierre de Bancos manda a `/bancos/cuentas-bancarias` y no a Saldos iniciales.

### BS8-7 (baja, no corregido): línea «sin actividad» del flujo de efectivo
- Con el inverso de una partida de la carga (750.50) la línea sale con entradas 0.00, salidas -750.50 (negativo) y
  cantidad 0, aunque hay un movimiento. Las cifras cuadran (control 5,975.00).

### Observaciones
- La conciliación ya autorizada (solo lectura) conserva el texto «márquelo solo si el banco ya lo pagó».
- Saldos por cuenta a una fecha anterior al corte cuenta los cheques de la carga como posfechados y muestra «Fondos
  insuficientes»: es consistente con las reglas, pero asusta.
- En celular el reporte de Movimientos pide desplazamiento horizontal para ver los montos (patrón común de tablas).
- El formulario de saldo inicial vacío no muestra un mensaje propio (solo la validación nativa del navegador).

## No se pudo probar
- Reapertura de la carga con la conciliación ya hecha se probó (permitida); no se probó el aviso de Empresas cuando la
  fecha de inicio no es día 1 (EM-1, fuera de alcance de BS-8) porque la carga ya tenía saldos.
- Importación de más de 5,000 filas o de 5 MB.

## Pruebas agregadas
- `servidor/src/pruebas-api/bancos-qa-bs8-bordes.api.prueba.ts`: 3 `it.fails` de BS8-1 y 1 control que pasa.
