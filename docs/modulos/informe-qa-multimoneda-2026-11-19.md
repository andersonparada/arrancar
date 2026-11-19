# Informe de QA: Multimoneda (MM-1 a MM-5 y MM-4), 2026-11-19

Alcance: Plataforma → Monedas (selector de código del Banguat, «Ver muestra», «Actualizar lista»), Plataforma → Tipos de
cambio (calendario, ingreso y corrección manual, «Cargar ahora», bitácora), el reporte de tipos de cambio con Excel
(solo API: el menú y la pantalla son de MM-6), el módulo activable y sus permisos. Diseño: `diseno-multimoneda.md`.

Entorno: base propia `arrancar_qa_mm_dev` (migraciones + `--demo`), API en el puerto 3230, PWA en el 5230 y un servidor
falso del Banguat en el 3299 (SOAP 1.1, con modos: ok, 500, vacío, lento, ambiguo, salto, DOCTYPE y euro como cruce
contra el dólar, código 24). Nunca se llamó al Banguat real. Navegador Chromium (escritorio 1280, celular 390, claro y
oscuro). Usuarios: soporte (`supergod`), propietario de la cuenta demo y tres usuarios con un solo permiso cada uno.

## Resultados por flujo

| Flujo | Resultado |
|---|---|
| Monedas: lista, filtros, tarjetas, estado activa/inactiva (escritorio, celular, oscuro) | Bien |
| Monedas: selector de código (orden por nombre, «ya es de USD» deshabilitado), unir EUR con código 24 y activar | Bien (relleno de 45 días pedido al guardar) |
| Monedas: «Ver muestra» | Bien en la mecánica; choca con la Adenda B (E-1) |
| Monedas: reglas del servidor (GTQ sin código ni desactivar, JPY de 0 decimales no se activa, código en uso 409, código inexistente 422, letras a medias 422, PATCH vacío) | Bien |
| «Actualizar lista del Banguat»: al día, respuesta vacía (la lista no se toca), Banguat caído, candado de una sola carga (409) | Bien; lento: E-5 |
| Tipos de cambio: calendario por moneda, origen por día, estado de cada serie, versión manual encima de la del Banguat, historial | Bien; detalles E-6, E-7 |
| Ingreso manual: validaciones de cero, negativo, letras, 9 decimales, coma, enorme, motivo vacío y de 301 | Bien en el servidor; en pantalla E-4 |
| Ingreso manual: confirmación con resumen y variación contra el vigente del día | Bien; no compara contra el día anterior (E-3) |
| «Cargar ahora»: éxito, sin datos, falló, DOCTYPE, compra distinta de venta, cambio de más de 25 % | Bien (mensajes claros por moneda); E-5 con el Banguat lento o caído |
| Bitácora de la carga y su filtro «Solo de USD» | Bien |
| Reporte de tipos de cambio (API): filtros, rango máximo de 366 días, rango invertido, sin fechas, sin moneda, leyenda «Fuente: Banco de Guatemala», origen sin motivo ni usuario | Bien |
| Excel del reporte: columnas, fechas `dd/mm/aaaa`, números reales, «Ingreso manual de soporte» sin motivo; sin plantilla ni importación (404) | Bien |
| Módulo inactivo: el reporte responde 403 «El módulo Multimoneda no está activo»; el núcleo (monedas, serie) sigue funcionando | Bien |
| Permisos: ver sin exportar, exportar sin ver, ninguno, propietario (no recibe los de soporte), sin sesión (401) | Bien; nota E-9 |
| Pantalla y menú del reporte para el usuario | No existe todavía (MM-6): no se pudo probar en el navegador |
| Celular y modo oscuro de las dos páginas de Plataforma | Bien, sin desborde horizontal |

## Errores y hallazgos

### E-1 (media, Adenda B) La muestra, el calendario y los textos dan por hecho «quetzales por unidad»
Con el servidor falso en modo cruce (EUR código 24 = 1.16 dólares por euro):
1. Plataforma → Monedas → Euro → elegir «Euro (24)» → «Ver muestra».
2. Esperado (Adenda B): convertir el cruce contra el dólar o avisar que no es quetzales.
3. Pasó: «Q 1.16100 por unidad» y el texto fijo «un euro ronda Q 8 a 9». Al guardar con la moneda activa, la carga dejó
   1.16 como tipo del euro (quetzales) durante 13 días. Textos que chocan: «Quetzales por una unidad de EUR»
   (ventana de ingreso manual), el nombre accesible de cada día del calendario («… quetzales …»), la ayuda de la ventana
   de moneda y `ResultadoDeMuestra`. Además `EditarMoneda` y las comprobaciones C-1 a C-4 siguen sin cubrir el cruce, y
   el diseño y la semilla hablan del código 28 para el euro (la lista falsa y la Adenda B usan 24). Lo único que lo
   detuvo fue la regla de más de 25 % al día siguiente. No se corrigió: es parte de la Adenda B.

### E-2 (media) El ingreso manual acepta fechas futuras y deja el «Último tipo» en el futuro
1. Como soporte, `POST /api/tipos-de-cambio` con `moneda USD`, `fecha 2027-01-01`, `referencia 7.7`.
2. Esperado: rechazo (la carga del Banguat no acepta más allá de mañana).
3. Pasó: 201. En Tipos de cambio, «Estado de la carga» muestra «Último tipo: 01/01/2027» y «Al día», ocultando un atraso
   real. Prueba `it.fails` en `servidor/src/pruebas-api/tipos-de-cambio-qa-multimoneda.api.prueba.ts`.

### E-3 (baja) Sin aviso de cordura en el ingreso manual de un día sin tipo
`POST` de USD 99 se acepta (la banda de 5 a 15 solo rige para la carga). En pantalla, la variación de más de 3 % se
compara con la versión del mismo día; un día sin tipo no se compara con el día anterior, así que escribir 88.8 en vez
de 8.88 solo dice «Ese día aún no tiene tipo». Sugerencia: avisar contra el último tipo anterior. Sin prueba.

### E-4 (baja) El mismo error de validación no vuelve a mostrarse
1. Ingresar tipo → referencia `0` y motivo → Guardar (sale el error). Cambiar a `-1` → Guardar.
2. Esperado: el error se ve de nuevo. Pasó: el campo queda sin error y el botón parece no hacer nada, porque
   `usarErrorDescartable` observa el texto y el mensaje es idéntico. Es del núcleo y afecta a todos los formularios.
   Prueba `it.fails` en `cliente/src/modulos/core/composables/usar-error-descartable-repetido.prueba.ts`.

### E-5 (media, ya anotado en el PLAN) «Cargar ahora» y «Actualizar lista» corren dentro de la solicitud
Con el Banguat lento (15 s por respuesta): «Actualizar lista» tardó 37 s y «Cargar ahora» 48 s, y con el Banguat en 500
unos 8 s, sin barra de avance. Tras un proxy puede cortarse. Pendiente conocido para «Cargar ahora»; la lista tiene el
mismo problema. Sin prueba.

### E-6 (baja) Gramática y mayúsculas
- «1 nuevos» (bitácora), «1 días hábiles sin tipo» (calendario): falta el singular.
- «Noviembre De 2026» en el título del calendario (mes en formato título): debe ir «Noviembre de 2026».

### E-7 (baja) Páginas de Plataforma sin empresa activa
Soporte sin empresa elegida ve «Seleccione una empresa para continuar» y la consola muestra tres 400 al cargar; el menú
sí ofrece Monedas y Tipos de cambio. Anotado en el PLAN como regla del servidor; conviene ocultarlas o explicar por qué.

### E-8 (baja) Compra mayor que venta
`POST` con `compra 9` y `venta 5` se acepta. Prueba `it.fails` en el mismo archivo de E-2.

### E-9 (baja, a confirmar) Exportar sin ver
Un usuario con solo `multimoneda.tipos-de-cambio.exportar` baja el Excel (200) aunque el reporte le da 403. Coincide con
«ver una lista no da derecho a llevársela entera» en un sentido, pero no al revés; confirmar si es lo querido.

### E-10 (informativa) Códigos excluidos aún vacíos
Bolívares (21) y DEG (99) se ofrecen en el selector porque `CODIGOS_DEL_BANGUAT_EXCLUIDOS` sigue vacío (C-1 pendiente).
La carga queda apagada por omisión; con `CARGAR_TIPOS_DE_CAMBIO=true` se ofrecería su carga.

## Lo que ya choca con la Adenda B (resumen)
Texto «quetzales por unidad» en cuatro pantallas, muestra sin conversión, aviso fijo «un euro ronda Q 8 a 9», semilla y
diseño con el euro en 28, el relleno que guarda el cruce tal cual, y el reporte y el Excel que rotulan la columna
«Tipo de cambio (Q por unidad)». Nada de esto se tocó.

## Pruebas agregadas (con `it.fails`, esperan la corrección)
- `servidor/src/pruebas-api/tipos-de-cambio-qa-multimoneda.api.prueba.ts` (E-2 y E-8).
- `cliente/src/modulos/core/composables/usar-error-descartable-repetido.prueba.ts` (E-4).

No se corrigió código de la aplicación.
