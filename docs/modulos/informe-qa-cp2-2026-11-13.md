# Informe de QA de CP2: notas de crédito de Cuentas por pagar (CP2-7)

Fecha: 2026-11-13 y 2026-11-14. Alcance: `docs/modulos/diseno-cp2-notas-de-credito.md` §5, §8 y §10 punto 7, con
CP2-1 a CP2-6 en `main`. Navegador real (Chromium sin cabeza, Playwright), base y app propias (`arrancar_qa6`, API
:3710, PWA :5681), datos inventados (dos cuentas: «Finca QA6» con fecha de inicio 01/11/2026 y «Finca QA6 B» con fecha
de inicio 01/12/2025 para los saldos iniciales de un año anterior). Escritorio (1280 px) y celular (380 px), claro y
oscuro. Las capturas quedaron fuera del repositorio.

## Resultado en una línea

El flujo funciona de punta a punta y los saldos cuadran a mano, pero **la ventana de aplicar y la de ajustar se
rompían al escribir un monto** (error grave, corregido), la ficha **se salía de la pantalla del celular** con una
referencia larga (corregido) y faltaba la explicación «complétela antes de ajustar» (corregido). Dos detalles quedan
abiertos (el umbral no se dice en el aviso de bancarización; el mensaje con el tope de diferencia menor en 0).

## Datos de la prueba y cuadre a mano

Proveedor A: factura F-1001 de Q1,120.00 con Q100.00 de retención (neto Q1,020.00) y nota de devolución total
NC-2001 de Q1,120.00. Al recibirla, la nota rebajó Q1,020.00 de F-1001 y quedó Q100.00 de saldo libre (= la
retención). Otras facturas: F-1002 (Q1,120.00, autorizada), F-1003 (Q35,000.00, autorizada, sobre el umbral de
bancarización), F-1004 (Q1,120.00, sin autorizar), F-1005 (Q500.00, pendiente) y el saldo inicial SI-1 (total
Q1,120.00, pendiente Q700.00, sin autorizar). Proveedor B: tres notas iguales (una pendiente).

| Paso | Saldo libre esperado | Visto |
|---|---|---|
| Al recibir NC-2001 | 1,120 - 1,020 = 100.00 | 100.00 |
| Aplicar 40.00 a F-1002 (manual) | 60.00 | 60.00; F-1002 debe 1,080.00 |
| Quitar esa aplicación (con motivo) | 100.00 | 100.00; F-1002 vuelve a 1,120.00 |
| Aplicar 40.00 a F-1003 (11/10) y 20.00 a F-1004 (12/11) | 40.00 | 40.00 |
| Ajuste «No se recuperará» de 40.00 | 0.00 | 0.00; «Aplicado» 1,080.00 |
| Anular el ajuste | 40.00 | 40.00 |
| Ajuste «Diferencia menor» de exactamente 25.00 (tope) | 15.00 | 15.00 |
| Aplicar 10.00 a F-1005 (pendiente) | 5.00 | 5.00 |
| Prueba de permisos: 1.00 aplicado, 1.00 ajustado y el ajuste de 25.00 anulado | 28.00 | 28.00 (1,120 - 1,091 aplicado - 1.00 ajustado) |

Saldo inicial (cuenta B): nota SN-NC-I1 con saldo libre Q600.00 (total 800.00, 200.00 anteriores a la fecha de
inicio); aplicó 400.00 a su saldo inicial SI-F1 (pendiente 400.00) y 100.00 a una factura del libro de compras; quedó
100.00 que se ajustó. En la pantalla «Notas de crédito» el saldo a favor por proveedor sumó lo esperado (A: 15.00 y B:
300.00 con tres notas, antes de seguir aplicando) y cada tarjeta mostró total, aplicado, ajustado y saldo a favor
coherentes (1,120 - 1,080 - 25 = 15.00).

## Tabla de resultados por flujo

| Flujo | Resultado |
|---|---|
| Factura con retención y nota de devolución total: saldo libre = retención | Bien |
| Aplicar a otra factura con reparto propuesto (autorizados primero, «Sin autorizar», «Saldo inicial») | Bien |
| Escribir montos a mano y aplicar a varias facturas, en dos partes con fechas y referencias distintas | **Error (corregido):** E1 |
| Total mayor que el saldo libre: el botón se bloquea / mensaje | Bien |
| Fecha anterior a la recepción de la nota o del cargo, y fecha futura | Bien (mensaje con la fecha mínima) |
| Fecha mínima por fecha de inicio con saldos iniciales | Bien (ver O3) |
| Saldo inicial pagado en parte: no más que su saldo | Bien (la propuesta ofreció 400.00 de 400.00) |
| Aviso de bancarización con cargo de Q30,000 o más | Bien con una falta (O1: no dice la cifra) |
| Doble clic en «Aplicar saldo a favor» | Bien: una sola aplicación |
| Quitar una aplicación manual con motivo; la automática no tiene «Quitar» | Bien |
| Anular desde Libro de compras la factura que recibió una aplicación manual | Bien: rechazo «quite primero la aplicación de la nota N-NC-2001»; pasa después de quitarla |
| Eliminar desde Libro de compras una factura pendiente con aplicación manual | Bien: mismo rechazo |
| La ficha del cargo explica por qué no se anula ni se elimina, con enlace a la nota | Bien |
| Ajuste: «No se recuperará» (ayuda «no deducible», efecto «Pérdida») | Bien |
| Ajuste: «Compensado con otra cuenta» sin referencia | Bien (rechazo; la referencia se marca obligatoria) |
| Ajuste: «Diferencia menor» sobre el tope Q25 (rechazo) y de exactamente Q25 (pasa) | Bien |
| Ajuste con el tope en 0 (causa apagada) | Bien, con un mensaje mejorable (O2) |
| Ajuste: monto 0, negativo, mayor que el saldo, fecha anterior/futura, motivo vacío | Bien |
| Ajuste con fecha de un año anterior: aviso sin bloquear | Bien |
| Nota pendiente no se ajusta | Bien, pero **faltaba la explicación** (E3, corregido) |
| Anular un ajuste con motivo; el saldo vuelve a la nota | Bien |
| Anular la nota con un ajuste vigente (desde Libro de compras) | Bien: rechazo «anule primero el ajuste»; desde Cuentas por pagar el botón no se ofrece |
| Pantalla «Notas de crédito»: resumen por proveedor, filtros, etiqueta de estado | Bien |
| Permisos: solo ver, `aplicar-notas`, `ajustes.crear`, `ajustes.anular` | Bien: cada rol ve solo su botón y el servidor responde 403 a lo demás (ver abajo) |
| Celular 380 px, claro y oscuro (lista, ficha, ventana de aplicar, ventana de ajustar) | **Error (corregido):** E2 en la ficha; el resto bien |

## Errores encontrados

### E1. Al escribir un monto, las ventanas de aplicar y de ajustar se rompen (grave, corregido)

- **Pasos:** abrir una nota con saldo a favor, «Aplicar a otro documento», escribir cualquier monto en una fila (por
  ejemplo 40) o abrir «Ajustar saldo» y cambiar el monto.
- **Esperado:** el total y los errores se actualizan, el botón envía.
- **Pasó:** error de JavaScript («monto.trim is not a function» / «texto.trim is not a function»); la ventana no
  recalcula y el envío falla. Con los montos propuestos por el servidor funcionaba, así que las pruebas automáticas y
  una revisión rápida no lo vieron.
- **Causa:** el campo es `type="number"` y Vue entrega un número, no un texto; la lógica pura llamaba `.trim()` sobre
  él.
- **Arreglo:** `centavosDe` acepta número o texto (`String(monto).trim()`), y se ajustaron `errorDelMonto` y
  `datosDeAjuste`. Pruebas nuevas en `dinero.prueba.ts`, `aplicacion-de-nota.prueba.ts` y `ajuste-de-saldo.prueba.ts`
  con montos numéricos (los tests anteriores usaban solo texto).

### E2. La ficha de una nota se sale de la pantalla del celular con una referencia larga (media, corregido)

- **Pasos:** ajustar o aplicar con una referencia de 100 caracteres sin espacios; abrir la ficha a 380 px.
- **Esperado:** el texto se parte dentro de la tarjeta.
- **Pasó:** desborde horizontal de 481 px (la página se desliza de lado, también las ventanas).
- **Arreglo:** `[overflow-wrap:anywhere]` en las líneas de motivo, referencia y anulación de
  `SeccionDeAjustes.vue` y en la fecha y referencia de `SeccionDeAplicaciones.vue`. Verificado: 0 px de desborde en
  claro y oscuro.

### E3. Faltaba «complétela antes de ajustar» en una nota pendiente (baja, corregido)

- **Pasos:** abrir la ficha de una nota de crédito pendiente con saldo a favor, con permiso `ajustes.crear`.
- **Esperado (diseño §8):** la ficha explica que se complete antes de ajustar.
- **Pasó:** el botón «Ajustar saldo» simplemente no aparecía, sin explicación.
- **Arreglo:** `avisoDeNotaPendiente` (en `aplicaciones-de-la-ficha.ts`, con prueba) y un párrafo en la ficha, visible
  solo con `ajustes.crear`: «Complete la nota en la bandeja antes de ajustar su saldo a favor.».

## Observaciones que quedan (no se tocaron)

- **O1. El aviso de bancarización no dice la cifra** (ya anotado en la bitácora tras CP2-6): la respuesta de
  `cargos-para-aplicar` no trae el umbral. Basta agregar `umbralDeBancarizacion` a esa respuesta (servidor, mínimo) y
  mostrarlo; el aviso actual y la etiqueta «Pide acuerdo escrito» funcionan. Gravedad baja.
- **O2. Con el tope de diferencia menor en 0** (causa apagada) el mensaje dice «solo se puede ajustar hasta Q 0.00» y
  la ayuda «Hasta Q 0.00»; sería más claro «esta causa está apagada en esta empresa» o no ofrecerla. Gravedad baja.
- **O3. El mensaje de fecha mínima** al aplicar dice siempre «cuando se recibió el documento más reciente», incluso
  cuando el mínimo viene de la fecha de inicio de la empresa (saldos iniciales); en el ajuste de una nota de saldo
  inicial dice «cuando se recibió la nota». Texto impreciso, el bloqueo es correcto. Gravedad baja.
- **O4. La sección «Montos» de la ficha no muestra «Ajustado»** (el DTO lo trae): con un ajuste vigente quedan
  «Aplicado» y «Saldo a favor» que no suman al total y la explicación está solo en la sección de ajustes (la lista de
  «Notas de crédito» sí lo muestra). Gravedad baja.
- Los errores de campo de las ventanas aparecen al intentar enviar, no al escribir; es coherente con el resto de la
  app.
- Una referencia de más de 100 caracteres no da error: el campo corta lo que se escribe a 100 (queda guardada
  cortada).

## Permisos (API y botones)

Con roles inventados `documentos.ver` + una sola acción, sobre la misma nota (acciones reales, 403 sin permiso):

| Usuario | Botones visibles | Aplicar | Ajustar | Anular ajuste | Pantalla «Notas» |
|---|---|---|---|---|---|
| Solo ver | ninguno de acción | 403 | 403 | 403 | se ve |
| `aplicar-notas` | «Aplicar a otro documento», «Quitar» | 200 | 403 | 403 | se ve |
| `ajustes.crear` | «Ajustar saldo» | 403 | 201 | 403 | se ve |
| `ajustes.anular` | «Anular el ajuste» | 403 | 403 | 200 | se ve |

## No probado o con cobertura solo automática

- Eliminar una factura o una NDEB con aplicación manual desde Cuentas por pagar (la ficha no ofrece «Eliminar» en
  documentos que vienen del libro; se probó desde Libro de compras) y eliminar una nota con ajustes anulados.
  Cubierto por `cuentas-por-pagar-bajas*.api.prueba.ts`.
- Recargar a mitad de un proceso: no se vio ningún estado intermedio (la ventana vuelve a pedir los cargos).
- Nota con una contraseña (CP3) y pagos (CP4): aún no existen.

## Pruebas

Nuevas (cliente): montos numéricos en `centavosDe`, `erroresDeAplicacion`, `datosDeAplicacion`, `erroresDeAjuste`,
`datosDeAjuste`; `avisoDeNotaPendiente`. El servidor no se tocó.

## Corregido en este commit

E1, E2 y E3, con sus pruebas. Quedan O1 a O4.
