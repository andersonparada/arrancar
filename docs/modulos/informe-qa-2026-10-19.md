# Informe de QA en el navegador — 2026-10-19

Alcance: pasos **R1-7** y **R2-9** de `diseno-datos-libro-de-compras.md` (régimen de la empresa con vigencia;
proveedores de regímenes especiales y factura especial), con la pantalla de documentos (L3-7, L3-8, R2-4/6/8).
Código en `main` (`8c86199`). Base de desarrollo `arrancar`, cuenta demo (empresa «Rancho El Arrancar»).

Herramientas: Chromium con Playwright (escritorio 1280 px; celular 375 px; claro y oscuro) y la API con sesión
real. Playwright no estaba instalado: se instaló fuera del repositorio. Datos de prueba que quedaron en la base de
desarrollo: 9 proveedores «QA Prov …», el NIT de la empresa demo y su historial fiscal (agropecuario hasta 2025-06,
general desde 2025-07).

**Limitación importante:** no hay ningún destino instalado (Cuentas por pagar no existe y no hay otro módulo
activable), así que **no se pudo registrar ni ver la vista previa de ningún documento** en la app real (errores 2 y
3). La lógica de documentos (familias, retenciones, IVA al costo, vigencias con facturas, 409) solo se verificó con
las pruebas automáticas existentes, que usan un destino falso y cubren los casos pedidos
(`libro-de-compras-documentos-*.api.prueba.ts`, `libro-de-compras-datos-fiscales-vigencias.api.prueba.ts`).

## Resultado por flujo

| Flujo | Resultado |
|---|---|
| Empresa: tipo de persona obligatorio, error en su campo (UI y API) | Bien |
| Empresa: propuestas de ISR y de «¿contabilidad completa?» (individual + opcional simplificado y no afiliado piden contestar; jurídica propone «Sí») | Bien (ver nota 4) |
| Empresa: reglas por campo (exento solo jurídica, agente de IVA solo en general, vigenteDesde día 1, no antes de 2000, máx. 12 meses adelante) | Bien |
| Empresa: derogados (agropecuario y pequeño contribuyente electrónico) no inician desde 2025-07; sí en la base o hasta 2025-06 | Bien |
| Empresa: cambio de régimen a partir de un mes (UI: «Cambió a partir de un mes» propone el mes actual, ofrece 12 meses adelante y 36 atrás) y escalones iguales no se repiten | Bien |
| Empresa: historial en la ficha y «Quitar» desde la ficha | **Error alto** (error 1). Por API, quitar la base da 422, quitar otra da 204 y su escalón pasa a la anterior, y una inexistente da 404: bien |
| Empresa: vigencia con facturas da 409 | No probable en la app real (no se pueden registrar facturas); cubierto por pruebas automáticas existentes |
| Proveedor: los 8 regímenes con sus propuestas (general: ISR utilidades y retiene IVA; pequeño: retiene el 5 %; primario, pecuario, sin inscripción, electrónico y agropecuario: sin ISR y sin retenciones; no domiciliado: ISR no domiciliado) | Bien |
| Proveedor: bloqueos (primario con ISR, retención de IVA o de pequeño contribuyente indebidas, agente fuera de general, no domiciliado cruzado) en su campo y en la UI (interruptores bloqueados) | Bien |
| Proveedor: regímenes derogados solo se ofrecen a quien ya los tiene, con aviso | Bien |
| Proveedor: ficha y formulario (celular y oscuro) | Bien |
| Documentos: selector de tipo por código SAT, agrupado, derogados rotulados, FESP habilitada, nombres corregidos | Bien |
| Documentos: elegir proveedor en el formulario | **Error alto** (error 2) |
| Documentos: sin destino, aviso y bloqueo de «Registrar» | Bien (aviso claro, botón sin efecto y mensaje de lo que falta; API 422 `destino_no_disponible`) |
| Documentos: vista previa sin destino | **Error medio** (error 3) |
| Documentos: FACT, FPEQ, FARP/FPEC, FESP (NIT/CUI), NCRE, recibo, empresa pequeño contribuyente, preguntas de proveedor nuevo, confirmación de cambio de régimen | No probado en la app (bloqueado por los errores 2 y 3); pruebas automáticas existentes pasan |
| Lista y ficha de documentos: filtros, anulados ocultos, anular con causa, eliminar | Lista vacía y filtros se ven bien; el resto no probable sin documentos |
| Celular 375 px y modo oscuro (lista, formulario de documento, proveedor, empresa): sin desborde horizontal, contraste correcto | Bien |

## Errores

### Alta
1. **La ficha de la empresa no existe: el historial de vigencias y «Quitar» no se ven en ninguna parte.** Pasos:
   Empresas > Editar (o abrir cualquier empresa). Esperado (R1-6): ficha con el historial (desde, hasta, régimen) y
   «Quitar» con confirmación. Pasó: Empresas solo tiene lista y ventana de edición; `SeccionesEnLaFicha en="empresa"`
   no se usa en ninguna página (solo en la ficha de proveedor), así que `FichaFiscalDeEmpresa` y
   `HistorialFiscalDeEmpresa` nunca se montan. El usuario que programó un cambio de régimen por error no puede verlo
   ni quitarlo desde la app (solo por la API).
2. **No se puede elegir proveedor en «Registrar factura».** Pasos: Libro de compras > Registrar factura > Proveedor >
   cualquier opción. Esperado: queda elegido. Pasó: el selector siempre muestra el primero («ANDERSON PARADA») y la
   barra dice «Falta elegir el proveedor». Causa: `GET /api/terceros?papel=proveedor` devuelve `proveedor` sin `id`
   (`{ categoriaId, categoriaNombre, activo }`), y `apiRegistroDeDocumentos.proveedores()` toma `proveedor.id`; todas
   las opciones quedan con valor `undefined`. La ficha del tercero sí trae `proveedor.id`. Bloquea todo el registro,
   aun con destino. Para seguir probando se parchó la respuesta en el navegador (Playwright `route`). Prueba:
   `libro-de-compras-qa-hallazgos.api.prueba.ts` (`it.fails`).

### Media
3. **La vista previa no funciona sin destino instalado**, contra lo que dice el aviso de la pantalla («puede llenar
   el formulario y ver el cálculo»). Pasos: con proveedor elegido (parche del error 2), llenar número, fecha, NIT,
   autorización, concepto y total. Esperado: IVA, costo y retenciones a la derecha. Pasó: `POST /documentos/calcular`
   responde 422 `destino_no_disponible` (el preparador comprueba el destino también al calcular), la vista previa
   queda en su texto inicial y sale un segundo aviso. Esperado según el diseño: solo registrar se bloquea. Prueba:
   `it.fails` en el mismo archivo.

### Baja
4. Escoger «No afiliado al IVA» o «Sobre las utilidades» arrastra la elección previa de ISR: una empresa jurídica que
   pasa de general (utilidades) a no afiliado conserva «Sobre las utilidades» en vez de proponer «Exento» (la tabla
   R1-e propone exento). Funciona como «el escogido si cabe», pero no coincide con la tabla.
5. Mensajes poco claros de empresa: «Contribuyente agropecuario» + persona jurídica sin contestar la contabilidad
   pide «Diga si lleva contabilidad completa» en vez de decir que ese régimen es solo de persona individual (al
   contestar sí sale el mensaje correcto). Y con un agropecuario en el historial no se puede pasar a persona jurídica:
   el error sale en «tipo de persona» con el texto del agropecuario, sin explicar que el tipo es igual en todas las
   vigencias.
6. Proveedor general con ISR «Exento» y «Se le retiene el ISR = Sí» se acepta (la ficha muestra ambos). Contradictorio
   a ojos del usuario; el dominio no lo revisa.
7. El inicio de sesión limita a 10 intentos por minuto: los scripts de QA lo alcanzaron (comportamiento esperado, solo
   se anota).

## Cuadres a mano

No hubo documentos que cuadrar en la app real. Referencia de las pruebas existentes: factura de Q1,120.00 con IVA =
base 1,000.00 + IVA 120.00; empresa pequeño contribuyente: IVA 120.00 va a `ivaNoAcreditable` (costo 1,120.00, motivo
`empresa_sin_credito`); FESP de Q5,600.00: IVA 600.00 retenido al 100 %, ISR 5 % de 5,000.00 = 250.00, neto a pagar
4,750.00.

## Pruebas agregadas

- `servidor/src/pruebas-api/libro-de-compras-qa-hallazgos.api.prueba.ts`: el listado de proveedores debe traer
  `proveedor.id` y la vista previa debe funcionar sin destino (ambos `it.fails` hasta que se corrijan, al corregirlos
  fallarán para recordar quitar la marca) y registrar sin destino avisa con 422.

## Pendiente de pedir

- Algún destino instalable (o un modo de desarrollo) para poder probar el registro, la lista con datos, la ficha, anular
  y eliminar de punta a punta en el navegador.
