# SAT-2237 (casillas, L5-2c) y SAT-2046 — informe del contador, 2026-11-01

El portal de la SAT respondió 403; fuentes: Ley del IVA (TSE), prensa citando a la SAT, Deloitte y guías.
Marcas: [Ley], [SAT/prensa], [Guía], [Inferencia].

## Hallazgos que cambian el plan

- **A.** El SAT-2237 ya no se llena en Declaraguate: desde el 1-sep-2026 el régimen general lo presenta en la
  **Agencia Virtual** («Servicios tributarios → Generar formulario → IVA → SAT-2237»), con datos sugeridos. La
  captura para L5-2c debe salir de ahí (se puede generar sin presentar). [SAT/prensa]
- **B.** El pequeño contribuyente **electrónico** (Decreto 7-2019) usa el **SAT-2241**, no el SAT-2046; hoy
  `formularioDelRegimen` le asigna el SAT-2046 y el check de `declaraciones_de_periodos` no admite el 2241.
  [Guía + SAT/prensa]. El usuario declara SAT-2046 (boleta de sep-2026), así que es pequeño contribuyente normal.

## SAT-2237 (secciones según guías; números de casilla sin confirmar)

1 NIT, 2 período, 3 débito local, 4 exportaciones, **5 crédito por operaciones locales**, **6 principales
proveedores**, 7 determinación, 8 indicadores, **9.1 cantidad y 9.2 monto de operaciones** (incluye notas de
crédito y débito, Deloitte 2019), y al final rectificación, multas, contador y código del anexo de facturas
especiales.

Sección 5 frente a los rubros de L5-2a: combustibles; otras compras (sin medicamentos ni vehículos, que tienen
casillas propias y hoy solo avisan); servicios; activos fijos *directamente vinculados*; importaciones en
**cuatro** casillas (Centro América, FYDUCA, resto del mundo, activos fijos importados); pequeños contribuyentes
(solo base); «compras que no generan derecho a compensación» = exento y no afecto + regímenes sin IVA
[Inferencia]; remanente (lo prellena la SAT); combustible exento del Decreto 22-2026 (casilla desconocida, L5-C5
abierta).

Falta en el diseño: separar importaciones en cuatro; **hueco**: documentos con IVA sin derecho a crédito (fuera
de plazo, no vinculado, nota tardía) no aparecen en ningún rubro → rubro `compras_sin_credito`; mapa de rubros a
casillas de varios a uno y de uno a varios (`arquitecto-de-datos`).

Sección 6: máximo 10 proveedores de régimen general, NIT único, facturas > 0, base sin IVA; la FESP va en su
anexo, no en la sección 6 (responde parte de L5-C3). Notas de crédito restan en su rubro y se informan en 9.1 y
9.2 (L5-C2, provisional). Sección 7 (retenciones recibidas) es de ventas.

Recomendación: no escribir números de casilla aún; corregir el texto («captura del SAT-2237 de la Agencia
Virtual»), agregar `compras_sin_credito` y preparar el mapa N a N.

## SAT-2046 (pequeño contribuyente)

[Ley] Arts. 45–50: ventas hasta Q150,000 al año; 5 % sobre ingresos brutos del mes; retención del 5 % es pago
definitivo; declarar dentro del mes siguiente **aunque sea en cero**; libro habilitado de compras y ventas donde
anota las **ventas** (las compras solo se exigen y conservan); sin crédito fiscal; sin ISR.

Casillas [Guía]: ingresos del mes → 5 % → menos remanente de retenciones anterior → menos constancias del
período → impuesto a pagar o remanente; rectificación; fecha de pago.

Cómo obtenerlo: **App FEL → declaración sugerida preelaborada** (la SAT llena los ingresos con la FEL emitida;
si no hay impuesto se presenta ahí; si hay, boleta SAT-2000) o **Declaraguate → IVA → «IVA Pequeño
Contribuyente SAT-2046»** → llenar NIT, período, total facturado y constancias → Validar → Congelar → boleta
SAT-2000 si hay impuesto. Si no aparece, Agencia Virtual → Declaraciones o 1550.

Para Arrancar: ingresos, retenciones recibidas, impuesto y límite anual de Q150,000 dependen de **Ventas /
Cuentas por cobrar** (no existe). Ahora: página explicativa con los pasos y recomendar la preelaborada; con
Ventas, el cálculo y la comparación. Las compras del pequeño contribuyente son respaldo, no van al formulario
(corregir el texto del diseño).

## Decisiones del usuario (2026-11-01)

- L5-2c: llenar ya el mapa con los **nombres de las guías marcados «sin confirmar (versión Declaraguate, hasta
  2026-08)»**; se ajusta cuando haya una captura del SAT-2237 de la Agencia Virtual.
- Agregar el rubro **«Compras sin derecho a crédito»** (en «Compras que no generan derecho a compensación»).
- Pequeño contribuyente: página **«Datos para el SAT-2046»** con la guía paso a paso (App FEL preelaborada o
  Declaraguate, declarar aunque sea en cero); el cálculo llega con Ventas.
- Con Ventas: aviso de ventas del año frente al límite de Q150,000.
