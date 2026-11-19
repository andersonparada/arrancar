# Informe de QA: aviso de pago por correo (paso 14)

_2026-11-18. Rama `worktree-wf_8950d9e1-c04-4`, sobre `main` (79fd19ac). Chromium (Playwright) contra la app real, API en el
puerto 3190 y PWA en el 5190 (los 3100 y 5180 estaban ocupados por otros worktrees), base propia
`arrancar_pruebas_qacorreo_1` y Mailpit en 1025/8025 con `CORREO_DESARROLLO_SERVIDOR=localhost`._

## Resultados por flujo

| Flujo | Resultado |
|---|---|
| Soporte: guardar servidor (contraseña de solo escritura, «guardada»), remitente inválido rechazado con mensaje claro | Bien |
| Soporte: prueba de envío (dirección inválida rechazada; válida llega a Mailpit, de «Arrancar») | Bien |
| Soporte: texto «Enviar correos» cuando está activo | Error (baja, E2) |
| Terceros: marcar «recibe avisos de pago» (interruptor deshabilitado sin correo, con explicación; etiqueta en la ficha) | Bien |
| Registrar pago con envío manual: no sale nada; botón «Enviar aviso» con destinatarios, copia y vista previa | Bien |
| Enviar manual a 2 destinatarios + copia, con doble clic: 1 solo correo; PDF de 2 hojas; `Reply-To`, `Auto-Submitted`, usted | Bien |
| Envío automático (Soporte lo activa en la empresa): marcado > principal; proveedor sin correo no encola y la ficha lo explica | Bien |
| Cambiar el envío automático / textos como usuario de la empresa | Error (media, E1) |
| Montos del comprobante: 2,500.00 con IVA retenido 40.18 (15 % de 267.86) paga 2,459.82; en letras correcto | Bien |
| Reenviar tras emitir la constancia: el PDF nuevo trae «constancia CONS-2026-0001» | Bien |
| Anular el pago: cancela los pendientes (motivo «Pago anulado»); si ya se envió, la ficha dice que avise al proveedor; doble clic sin duplicar | Bien |
| Historial: `correos.ver` ve la lista y la ficha; sin permiso no ve el menú y la API da 403 | Bien |
| Historial: cancelar (motivo obligatorio) y reintentar (con confirmación); sin permiso la API da 403 y los botones se ocultan | Bien |
| Ventana del correo sin permisos de acción | Error (baja, E4) |
| Cupos: 20 por destinatario por día (429, mensaje en usted); límite de 20 avisos por minuto | Bien |
| Aviso con otro pendiente ya encolado | Error (baja, E3) |
| Mensaje con «adjuntar comprobante» apagado | Error (media-baja, E5) |
| Celular (390 px): ficha, ventana de aviso y mensaje de cupo | Bien |
| Modo oscuro, cupo por cuenta (100/h) y de la instalación, caída real del SMTP | No probado |

## Errores

**E1 (media). Nadie de la empresa puede cambiar el envío automático ni los textos del aviso.**
Pasos: entrar como propietario de la cuenta y abrir `/configuracion`. Esperado: poder pasar el envío a «automático» (P1 dice
«configurable por empresa»). Pasó: «No tiene acceso» porque `configuracion.ver/gestionar` son `soloSuperacceso`; solo Soporte,
dentro de la empresa, lo logra. Además el campo es un texto libre (`automatico`/`manual`), sin selector.

**E5 (media-baja). El mensaje dice «Adjuntamos el comprobante» aunque no se adjunte.**
Pasos: poner `adjuntar_comprobante = false` en la empresa y abrir el aviso de un pago. Esperado: texto sin la frase. Pasó:
`adjuntoNombre` es nulo pero el mensaje por omisión la conserva. Prueba: `cuentas-por-pagar-avisos-qa.api.prueba.ts` (`it.fails`).

**E3 (baja). Se puede enviar un segundo aviso con otro todavía pendiente, y la ficha ofrece «Reenviar aviso».**
Al activarse el servidor, el proveedor recibe dos correos iguales. Es el diseño («cada envío es una fila nueva») pero sin
advertencia. Prueba que documenta el comportamiento en el mismo archivo. La ficha crece sin límite (18 avisos = pantalla muy larga).

**E2 (baja). «Enviar correos» siempre dice «Apagado, todo queda pendiente…» aunque el interruptor esté encendido.**

**E4 (baja). La ventana de un correo para quien solo tiene `correos.ver` deja una franja vacía abajo** (el pie sin botones).

**E6 (baja, textos). «Se anulará el pago 5 de Q 450.00 a Eco S.A..»** (doble punto cuando el nombre termina en punto).

**Observación (no es error del aviso):** el toast de error de Soporte no se retira solo al aparecer el de éxito.

## Pruebas automáticas agregadas

`servidor/src/pruebas-api/cuentas-por-pagar-avisos-qa.api.prueba.ts` (E5 con `it.fails` y E3). Corrida con
`BD_PRUEBAS=arrancar_pruebas_qacorreo`: pasa (1 + 1 fallo esperado).

## Corregido

Nada del código de la app.
