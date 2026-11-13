# Informe QA U8-12: saldos iniciales de Cuentas por pagar (2026-11-12)

Probado de punta a punta en el navegador (Chromium sin interfaz, Playwright) y por la API, contra una base y una app propias (`arrancar_qa5`, API :3550, PWA :5550), con la cuenta demo y proveedores inventados (NIT de prueba con dígito verificador válido). Sin capturas en el repositorio (quedaron fuera, en `/tmp/qa5`). Escritorio (1280 px) y celular (380 px), modo claro y oscuro; ningún desborde horizontal en la ventana de saldos, la lista y la ficha de Documentos.

## Resultados por flujo

| Flujo | Resultado |
|---|---|
| Sin fecha de inicio: la ventana avisa y enlaza a la empresa; no ofrece cargar | Bien |
| Empresas: fecha de inicio 15/11 muestra el aviso de «día 1»; 01/11 no lo muestra; el aviso no bloquea el guardado | Bien |
| Cargar a mano: factura pagada en parte (total 5,000, pendiente 3,000), pequeño contribuyente con retenciones 50 y por practicar 20, nota de crédito a favor 500 (sin vencimiento ni retenciones en el formulario) | Bien |
| Saldo pendiente propuesto (total, luego total menos retenciones) y editable | Bien |
| Validaciones del formulario y la API: emisión igual a la fecha de inicio, saldo mayor que el neto, saldo 0, por practicar mayor que retenciones, retenciones mayores que el total, nota de crédito con retenciones o vencimiento, vencimiento anterior a la emisión, referencia de 61, número de 41, total 0 o negativo, tres decimales, proveedor inexistente, repetido (con espacios, minúsculas, otra variante de factura) | Bien (ver H4 y H5) |
| Doble clic en Guardar | Bien (un solo registro) |
| Corregir (retenciones por practicar) y eliminar con motivo obligatorio; la auditoría guarda `corregir` y `eliminar` con motivo | Bien |
| Excel: plantilla con hoja de instrucciones; ensayo con 20 filas y errores por fila; luego 20 filas bien; confirmar; proveedor por nombre y por NIT | Bien (ver H6 a H8) |
| Excel: archivo repetido contra lo cargado; archivo que no es Excel; carga cerrada | Bien |
| Cuadre a mano: cargos 43,050, notas 500, neto 42,550, por practicar 20, 24 documentos; por proveedor (Agroinsumos 16,000; Distribuidora 3,000 / 500 / 2,500; Ferretería 8,300; Don Beto 950 / por practicar 20; Transportes 14,800) | Bien, coincide con la hoja exportada |
| Exportar la lista y el cuadre (`.xlsx`, con fila de total) | Bien |
| Documentos por pagar: etiqueta «Saldo inicial», «Vencido», filtro «Origen» | Bien |
| Ficha: sin enlace al libro, «Saldo al inicio 3,000», «Pagos y notas anteriores 2,000» (5,000 − 0 − 3,000), referencia, «Corregir en Saldos iniciales» solo con `saldos-iniciales.editar` | Bien |
| Autorizar con otro usuario (con confirmación) y desautorizar con motivo | Bien (ver H3) |
| Corregir o eliminar un saldo autorizado | Rechazado (`saldo_inicial_autorizado`) |
| Anular y eliminar desde Documentos | Rechazado (`es_un_saldo_inicial`); la ficha no ofrece los botones |
| Libro de compras: registrar el mismo documento | Rechazado, 409, mensaje en español, nada se guarda |
| Libro de compras: factura de octubre | Aviso de «antes de la fecha de inicio» al calcular y al registrar; 14/11 avisa, 15/11 no |
| Cambiar la fecha de inicio a 01/10 dejando 3 saldos fuera | Rechazado con el conteo, en el campo y en aviso; no cambia. A 01/11 pasa |
| Cerrar la carga: confirmación con el recordatorio del cuadre; luego la ventana no ofrece cargar, importar, corregir ni eliminar; la API responde 422 a crear, corregir, eliminar e importar | Bien (ver H1) |
| Reabrir la carga con motivo y volver a cargar | Bien |
| Permisos: sin `saldos-iniciales.*` (Carlos) la ruta lleva a «No tiene acceso» y no hay menú; todas las rutas dan 403. Solo ver (Ana): sin botones, 403 al crear, editar, eliminar, importar y exportar. Ver y crear (Sofía): sin importar ni exportar | Bien |
| Celular y modo oscuro: formulario, cuadre, tarjetas, ficha | Bien |

## Errores y observaciones

Gravedad: baja salvo que se diga otra cosa. No se encontró ningún error de dinero ni de seguridad.

- **H1 (baja, corregido).** El aviso de cerrar la carga decía «Solo un rol con acceso total podrá reabrirla», pero se reabre con el permiso `empresas.carga-inicial.reabrir` (nada depende del tipo de rol). Ahora dice «Solo quien tenga el permiso de reabrir la carga inicial podrá reabrirla». Pasos: Empresas, Editar, Cerrar carga inicial.
- **H2 (baja, corregido).** Al autorizar un solo documento, la confirmación decía «Se autorizarán el documento marcados». Ahora «el documento marcado» / «los N documentos marcados» (prueba nueva en `documentos-por-pagar.prueba.ts`).
- **H3 (baja, queda).** La ventana de desautorizar dice «Factura A-1001 … por Q 5,000.00» (el total) cuando lo aprobado y el saldo son Q 3,000.00; para un saldo inicial parcialmente pagado confunde. Conviene mostrar el neto a pagar o la palabra «total». Pasos: autorizar un saldo con «saldo pendiente» menor que el total, y desautorizar.
- **H4 (baja, corregido).** El error de largo decía «Escriba numero de 1 a 40 caracteres» (sin tilde ni artículo). Ahora «Escriba el número…» / «Escriba la serie…» (prueba nueva en `saldo-inicial.prueba.ts`).
- **H5 (baja, queda).** Los mensajes del servidor traen el dinero sin formato (`Q2200.00`) mientras la pantalla usa `Q 2,200.00`. El error «vencimiento anterior a la emisión» y el de repetido (409) no traen campo, así que salen solo como aviso y no bajo el campo.
- **H6 (baja, queda).** Una emisión de 1900-01-01 se acepta como saldo inicial. No hay tope inferior razonable (por ejemplo, años atrás).
- **H7 (baja, queda).** El ensayo del Excel revisa por etapas: con un proveedor inexistente y un saldo mayor al neto en la misma carga, primero muestra solo el del proveedor y, corregido ese, el otro. Con filas repetidas contra lo cargado muestra solo la primera. El usuario puede tener que subir el archivo varias veces. Lo diseñado en §5.7 («el ensayo muestra el vencimiento propuesto») no está: el ensayo solo dice «20 filas listas».
- **H8 (baja, queda).** La hoja «Instrucciones» del Excel dice que el proveedor va por «nombre o código», sin decir que el código es el NIT; y escribe «dd/mm/aaaa» literal en lugar de la fecha de inicio real de la empresa.
- **H9 (baja, queda).** En Empresas, si solo se cambia la fecha de inicio pero faltan los datos fiscales del libro (tipo de persona), el guardado falla con el error al principio del formulario, lejos del campo de fecha; quien edita al final del formulario no ve por qué no guardó. La ficha de la empresa tampoco muestra la fecha de inicio ni el estado de la carga (solo la ventana de edición).
- **H10 (informativa).** El vencimiento propuesto cuando se deja vacío es un mes calendario desde la emisión (proveedores sin días de crédito), no 30 días.
- **No probable todavía.** «Saldo del proveedor»: no existe una pantalla propia (estado de cuenta es CP5); el saldo se comprobó en la lista de Documentos y en el cuadre. Notas sobre facturas de antes del corte (hueco U8-l) siguen sin poder registrarse, como se avisa en pantalla.

## Corregido en este paso

H1, H2 y H4 (textos), con sus pruebas. No se tocó nada más del código de la aplicación.

## Cómo se probó (para repetirlo)

Datos: cinco proveedores inventados, usuarios `carlosc` (documentos, sin saldos iniciales), `anaautoriza` (autorizar y ver saldos) y `sofiacarga` (ver y crear saldos), con permisos directos. Llevar el navegador a `arrancar_qa5` exige una configuración de Vite con otros puertos (no se confirma). Playwright se instaló fuera del repositorio.
