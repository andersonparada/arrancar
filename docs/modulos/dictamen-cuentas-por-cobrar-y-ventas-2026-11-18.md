# Dictamen del contador, 2026-11-18: Cuentas por cobrar, Ventas y Libro de ventas y servicios

_Investigación del agente `contador-guatemala` del 2026-11-18, guardada tal cual (sin cambiar el texto) por el agente
`arquitecto-de-datos`. La usa `diseno-cuentas-por-cobrar-y-ventas.md`, que marca como «por validar» lo que aquí queda
dudoso y como **[corrige el dictamen]** lo que el código ya resolvió de otra forma._

---

# Informe del contador: Cuentas por cobrar, Ventas y Libro de ventas y servicios (2026-11-18)

**Cómo leer las marcas:** [Ley] y [Regl.] son norma. [SAT] es el portal o la práctica de la SAT. [Práctica] es lo que hacen las firmas y los ERP. [Opinión] es mía. **[Confirmar]** quiere decir que no pude leer el texto íntegro.

**Limitación:** los PDF de leyes que bajé (ICNL, Deloitte) llegaron como binario sin texto, y Justia solo muestra la ficha del Decreto 20-2006. Lo que ya está verificado en el repositorio lo reuso con su referencia: `/home/aparada/proyectos/arrancar/docs/modulos/libro-de-compras.md` (§Retenciones), `/home/aparada/proyectos/arrancar/docs/modulos/validacion-h7-h11-retenciones.md` e `/home/aparada/proyectos/arrancar/docs/modulos/investigacion-sat-2237-y-2046.md`. Las cifras y artículos marcados [Confirmar] no deben programarse fijos: van en configuración de instalación, como ya se hizo en Libro de compras.

## 1. Estructura recomendada (espejo de compras)

| Módulo | Qué hace | Equivale en compras |
|---|---|---|
| **Libro de ventas y servicios** | Documentos emitidos (FEL): fiscal, débito, régimen, retenciones recibidas | Libro de compras |
| **Cuentas por cobrar** | Saldos por cliente, cobros con Bancos, antigüedad, anticipos, incobrables | Cuentas por pagar |
| **Facturación FEL** (fase posterior) | Emitir DTE con un certificador (un adaptador por certificador) | No tiene equivalente |
| **Caja / ventas** (lo del PLAN §6, después) | Punto de venta y ventas de inventario, ganado y cosecha | No tiene equivalente |

[Opinión] Separar el libro (fiscal) de la cartera (financiera) es lo correcto, porque no toda venta es a crédito ni todo cobro tiene factura. Además el usuario ya entiende ese mismo modelo en compras.

## 2. Documentos emitidos FEL

| Tema | Qué dice | Marca | Diseño |
|---|---|---|---|
| Tipos de DTE | FACT, FCAM (cambiaria), FPEQ, FCAP, FESP (la emite el **comprador**), NCRE, NDEB, NABN (nota de abono), RECI, RDON | [SAT] Régimen FEL, Acuerdo de Directorio SAT 13-2018 y reformas (15-2020) [Confirmar el número] | Catálogo de tipos, con su efecto fiscal declarado |
| **NABN no es nota de crédito** | La nota de abono no rebaja el débito fiscal | [SAT/Práctica] | No restarla del débito; solo del saldo del cliente |
| Factura cambiaria | Para ventas al crédito. Es título de crédito y permite el cobro ejecutivo | [Ley] Código de Comercio, factura cambiaria (arts. 591 y siguientes) [Confirmar artículos] | En CxC, marcar la FCAM y su complemento de abonos |
| Notas de crédito emitidas | Rebajas, descuentos y devoluciones reducen el débito con nota de crédito que haga referencia a la factura | [Ley] Ley del IVA art. 17 | NCRE ligada al DTE de origen; rebaja el débito del **período en que se emite** y el saldo |
| Notas de débito | Aumentan el precio, y por tanto el débito y el saldo | [Ley] art. 17; [Práctica] | Igual, pero sumando |
| Anulación de DTE | La anula el emisor en el portal de la SAT, con plazo | [SAT] [Confirmar el plazo vigente] | Al importar se lee el estado «Anulado» y se revierte; nunca se borra |
| Momento del débito | Venta de bienes: emisión o entrega. Servicios: emisión o cobro | [Ley] Ley del IVA arts. 4 y 29 (reforma del Decreto 4-2012) [Confirmar redacción] | Período = mes de **emisión** del DTE |
| Cuentas incobrables e IVA | La ley no permite recuperar el IVA de una factura que no se cobra; tampoco cabe una NCRE «por incobrable» | [Ley] art. 17 (solo descuentos y devoluciones); [Opinión] | Advertir. El castigo no toca el libro de ventas |

**Facturas emitidas fuera de Arrancar (el caso de hoy):**
- **Opción A, importar desde la SAT (recomendada).** El Excel o XML de «DTE emitidos» de la Agencia Virtual tiene, según entiendo, el mismo formato que el de recibidos, que ya se evaluó en `/home/aparada/proyectos/arrancar/docs/modulos/evaluacion-lectura-xls.md`. Trae UUID, serie, número, NIT del receptor, montos, IVA, estado y la marca de anulado. Se deduplica por UUID y se crea el cliente desde el DTE, igual que el proveedor nuevo desde un DTE.
- **Opción B, captura manual.** Para casos sueltos y facturas de papel históricas, con aviso.

[Práctica] Los ERP locales (Odoo con módulos FEL, Softland) concilian «lo emitido según la SAT» contra el libro. [Opinión] Arrancar debería dar un **reporte de cuadre SAT contra libro** por mes, porque el SAT-2237 lo prellena la SAT a partir de la FEL.

**Emitir FEL desde Arrancar más adelante:**
- Para certificar uno mismo hay que ser **certificador autorizado**: inscrito en el RTU, auditor de seguridad registrado, firma avanzada y renovación anual. Lo regula el Acuerdo de Directorio 12-2018 y sus reformas [SAT, Confirmar]. Para un SaaS no conviene: es una carga regulatoria muy grande.
- La SAT también ofrece certificación gratuita, por portal o App FEL, pero sin API para sistemas [Confirmar].
- **Recomendación:** un adaptador por certificador comercial (patrón Adapter), con las credenciales de cada empresa. Que la empresa ya esté afiliada a su propio certificador.

## 3. El régimen del emisor cambia todo el libro

| Régimen de la empresa | Libro y columnas | Declaración | Frase en la FEL | Retenciones que puede sufrir |
|---|---|---|---|---|
| IVA general + ISR sobre utilidades | Gravadas (bienes y servicios), exentas, exportación, débito | SAT-2237 (Agencia Virtual desde sep-2026) | «Sujeto a pagos trimestrales» | IVA por agentes (15 %, 65 %, 25 %, tarjetas). **No** ISR (Decreto 10-2012 art. 38 y siguientes) |
| IVA general + ISR opcional simplificado | Igual | SAT-2237 + ISR mensual (SAT-1311 [Confirmar el número]) | «Sujeto a retención definitiva» | IVA + **ISR 5 % hasta Q30,000 y 7 % sobre el excedente** (Decreto 10-2012 arts. 44, 47, 48, 49) |
| Pequeño contribuyente | Libro habilitado: se anotan las **ventas** | SAT-2046 (el electrónico, SAT-2241) | «No genera derecho a crédito fiscal» | **IVA 5 % definitivo** si la factura pasa de Q2,500.00 y el comprador es agente (Ley del IVA arts. 47-48; AG 5-2013 art. 49) |
| Exportador | Columna de exportación; complemento de exportación (Incoterm, moneda) | SAT-2237 + solicitud de devolución del crédito | Según su régimen de ISR | Al vender localmente, como el régimen general. El exportador también **es agente** cuando compra |
| Exento (Ley del IVA arts. 7 y 8, o ley especial) | Columna de exentas; resolución de exención | Según el caso | La frase de exención de la FEL | Normalmente ninguna de IVA. ISR según su régimen |
| **Régimen especial de contribuyente agropecuario** (Decreto 7-2019; reglamento AG 125-2022) | Personas individuales con ventas hasta Q3,000,000 al año; 5 % mensual (en ganado de engorde, sobre el margen); sin ISR | [Confirmar el formulario] | [Confirmar] | [Confirmar] |

[Opinión] El régimen agropecuario es **muy relevante para fincas y ranchos de personas individuales**. Hoy no está en el catálogo de regímenes de Empresas y hay que investigarlo a fondo antes de programar. La configuración del régimen debe guardarse **con vigencia por fecha**, porque una empresa cambia de régimen y el libro de cada mes usa el de ese mes.

## 4. Retenciones que le hacen a la empresa

### 4.1 Reglas (las mismas tablas de compras, vistas al revés)

| Quién retiene (cliente) | A la empresa vendedora | Base y tasa | Norma | Constancia |
|---|---|---|---|---|
| Exportador que compra productos agropecuarios | Régimen general | **65 % del IVA** | Decreto 20-2006, art. 2 [Confirmar numeral] | Electrónica (RetenIVA o Retenciones web) |
| Exportador, otros bienes y servicios | Régimen general | 15 % del IVA | Ídem | Ídem |
| Contribuyente especial u otro agente calificado | Régimen general | 15 % del IVA | Decreto 20-2006 | Ídem |
| Sector público | Régimen general | 25 % del IVA (desde Q30,000) | Decreto 20-2006 | Ídem |
| Operadora de tarjeta de crédito o débito | Venta cobrada con POS | 15 % del IVA (combustibles 1.5 %; suspendido para combustibles por el Decreto 22-2026) | Decreto 20-2006 art. 4 ([Consortium](https://consortiumlegal.com/2026/10/01/decreto-22-2026-exencion-idp-iva-combustibles/)) | En la liquidación de la adquirente |
| Agente de IVA, si la empresa es pequeño contribuyente | — | 5 % del total, pago definitivo, si la factura pasa de Q2,500.00 | Ley del IVA art. 48; AG 5-2013 art. 49 | Constancia |
| Agente de ISR (quien lleva contabilidad completa), si la empresa está en el opcional simplificado | — | 5 % de la base sin IVA hasta Q30,000 y 7 % sobre el excedente; mínimo Q2,500 sin IVA | Decreto 10-2012 arts. 44, 47 y 48; AG 213-2013 art. 35 | Constancia con la fecha de la factura, entregada a más tardar el 5 del mes siguiente |
| Comprador que emite **factura especial** (la empresa no emite factura) | Productor no inscrito | IVA 100 % + ISR | Ley del IVA art. 52 y siguientes | La FESP es la constancia |

- Entre agentes de retención no se retiene (Decreto 20-2006, art. 9, ya citado en el proyecto).
- **Retención indebida.** Ejemplo: le retienen ISR a una empresa sobre utilidades. Pasa en la práctica; se registra con aviso y se recupera con el cliente o con la SAT [Práctica].

### 4.2 El caso del tabaco que mencionó el usuario

No encontré una norma especial «del tabaco» en el IVA ni en el ISR. [Opinión, con alta probabilidad] Lo que el usuario vive es una combinación de reglas generales:
- **(a)** El comprador de tabaco en rama suele ser **exportador**. Retiene el **65 % del IVA**, porque es compra de un producto agropecuario.
- **(b)** Si el vendedor está en el opcional simplificado, retiene además el **ISR del 5 % o 7 %**.
- **(c)** Si el productor no está inscrito o no emite FEL, el comprador le emite una **FESP**. Hay un trato especial para exportadores de productos agropecuarios registrados que emiten FESP ([La Hora, sentencia de la CC](https://lahora.gt/opinion/wpcomvip/2014/08/04/sentencia-de-la-cc-relacionada-con-facturas-especiales-para-productores-agropecuarios-y-artesanales/)).
- El impuesto específico al tabaco grava productos elaborados, no la venta de la hoja [Confirmar].

**Hay que pedirle al usuario una constancia y un estado de liquidación reales del comprador.** Así se sabe cuál de los casos es.

### 4.3 Diseño de la retención recibida

Recomiendo una entidad propia, «Retención recibida», con estos datos:
- impuesto (IVA, IVA de pequeño contribuyente, ISR);
- agente (el cliente, por su NIT);
- documentos que cubre (una o varias facturas, con base y monto por factura);
- tasa propuesta según la configuración (el usuario puede ajustarla y queda en la auditoría);
- número, fecha y archivo de la constancia;
- estado: **esperada → descontada en un cobro → constancia recibida → aplicada en la declaración del período X**.

Reglas:
- La retención **cancela saldo del cliente**, igual que un cobro: es un medio de pago. El activo pasa a «IVA retenido por aplicar» o «ISR retenido por aplicar» hasta que se aplica en la declaración.
- **Reporte clave para el trabajo diario:** «retenciones descontadas sin constancia» por cliente y antigüedad. Es el problema real más frecuente: el cliente descuenta y no entrega la constancia.
- Período en que se aplica:
  - IVA: en la práctica, en el SAT-2237 del período de la constancia, y lo que no se usa pasa como remanente [Práctica, Confirmar].
  - ISR del simplificado: la retención es el pago definitivo y se informa en el ISR mensual del mes de la factura.
  - Pequeño contribuyente: se resta en el SAT-2046.
- El libro de ventas muestra las retenciones como columnas informativas, no como resta del débito. El débito es completo y la retención se acredita en la declaración.

## 5. Libro de ventas y servicios

| Punto | Norma o práctica |
|---|---|
| Obligación | Libro de compras y libro de ventas y servicios habilitados, **al día** [Ley] Ley del IVA art. 37; reglamento AG 5-2013 (artículos de libros) [Confirmar numeración]. El atraso de más de dos meses es infracción formal (Código Tributario art. 94) [Confirmar numeral] |
| Columnas mínimas [Regl./Práctica] | Fecha, tipo de documento, serie, número (o UUID), NIT y nombre del comprador, ventas gravadas de bienes, servicios gravados, exentas, exportaciones, débito, total. Recomiendo además: régimen de la frase, retenciones recibidas (informativas) y estado (anulado) |
| Anulados | Aparecen en el libro con monto cero y la marca «anulado» [Práctica] |
| Notas de crédito y débito | En el período en que se emiten, con signo y con referencia a la factura |
| Moneda extranjera | En quetzales al tipo de cambio de la fecha del documento (depende de Multimoneda) [Confirmar la regla de exportación] |
| Formulario | Régimen general: **SAT-2237**, captura en la Agencia Virtual (débito local, exportaciones, retenciones recibidas en su sección, cantidad y monto de operaciones con las notas). Pequeño contribuyente: **SAT-2046** (electrónico: SAT-2241). Ver `investigacion-sat-2237-y-2046.md`. Plazo: el mes calendario siguiente |
| Pequeño contribuyente | Aviso de ventas del año frente al límite (Q500,285 en 2026, configurable por año), como ya está decidido |

## 6. Cuentas por cobrar

| Tema | Recomendación | Base |
|---|---|---|
| Plazo de crédito por cliente | Igual que el del proveedor; vencimiento = emisión + plazo | [Práctica] |
| Contraseña del cliente | Guardar el número y la fecha de la contraseña que **entrega el cliente** al recibir la factura, y la fecha probable de pago | [Práctica guatemalteca] |
| Recibo de cobro (de caja) | Documento interno numerado por empresa. **No sustituye la factura** ni es un DTE (el RECI de la FEL es otra cosa) | [Ley] Ley del IVA art. 29 (obligación de facturar) |
| Cobros | Con Bancos: depósito, transferencia, cheque recibido (también posfechado, que ya existe) y liquidación de tarjeta (neto de comisión exenta + retención 15 %). Un cobro se aplica a varias facturas y una factura recibe varios cobros (tabla de aplicación con monto) | [Práctica], H7 |
| Cheque rechazado | Revierte la aplicación (la factura vuelve a deber); el cargo bancario es exento y lo pone Bancos; recargo opcional al cliente con NDEB, que sí genera IVA [Opinión]; la reversa queda en la auditoría | — |
| Pago de más | Saldo a favor del cliente (anticipo), aplicable o devolvible | [Práctica] |
| Descuento por pronto pago | Por NCRE, no por «diferencia» en el cobro, porque si no el débito queda inflado | Ley del IVA art. 17 |
| Diferencial cambiario | Lo calcula el cobro en USD (Multimoneda) | NIIF Pymes secc. 30 |
| Antigüedad de saldos | Por vencimiento, con tramos configurables (corriente, 1-30, 31-60, 61-90, más de 90) y por cliente; también por fecha de emisión | [Práctica] |
| Saldos iniciales | Facturas pendientes a la fecha de inicio (carga inicial con cierre, como u8 de CxP) | — |
| Anticipos de clientes | Pasivo hasta la entrega. [Confirmar] si el IVA nace al recibir el anticipo: servicios al percibir; bienes según los arts. 4 y 29. Recomiendo **configurable**: «emitir FACT del anticipo» o «registrar el anticipo sin factura», con aviso. [Práctica] común: FACT por el anticipo y factura final por el saldo, o factura total con aplicación | Ley del IVA arts. 4 y 29 |

### Estimación de cuentas incobrables

- **[Ley] Decreto 10-2012 art. 21 (numeral 20, según [Prensa Libre](https://www.prensalibre.com/?p=13214994)).** Son deducibles en el **régimen sobre utilidades**, solo si vienen del giro habitual y hay documentación.
- Hay dos métodos que no se mezclan:
  - **directo:** castigo cuando se agotó la gestión de cobro;
  - **reserva:** hasta el **3 % de los saldos deudores** de cuentas y documentos del giro al cierre, según [Deloitte](https://www.deloitte.com/content/dam/Deloitte/gt/Documents/tax/GUATEMALA/Taxnewsletter/100320%20-Tax%20Newsletter%20marzo.pdf).
- **[Confirmar]** varias cosas: si el castigo exige cobro judicial iniciado o prescripción, si hay un tope acumulado de la reserva (recuerdo un 10 %, sin confirmar), el trato de las partes relacionadas y el cambio de método.
- La recuperación de una cuenta castigada es renta gravada [Práctica].
- En el opcional simplificado y en pequeño contribuyente la estimación **no tiene efecto fiscal**.
- **[NIIF Pymes] secc. 11.21-11.26:** deterioro cuando hay evidencia objetiva, por cliente o por grupos con antigüedad; se puede revertir. La tercera edición (vigente desde 2027) reescribe la sección 11. Por lo que sé conserva el modelo de pérdida incurrida [Confirmar] ([KPMG](https://kpmg.com/cl/es/home/insights/2025/09/informativo-de-auditoria/actualizacion-niif-para-pymes.html)).
- **Consecuencia:** puede haber diferencia entre lo contable y lo fiscal, y debe quedar a la vista.
- **Diseño:** estimación por cierre (contable) y una «parte deducible» calculada (3 %) aparte. Castigo por factura con motivo, documento de respaldo (demanda o gestión) y auditoría. Reverso si se recupera.

### Ingresos (NIIF Pymes secc. 23)

- Ediciones 2009/2015: bienes cuando se transfieren riesgos y beneficios; servicios por grado de avance.
- Tercera edición (vigente desde el 1-ene-2027): **modelo de cinco pasos** alineado con la NIIF 15 ([IFRS](https://www.ifrs.org/content/dam/ifrs/shop/main/2025/spanish/es-ifrs-for-smes-a4-one-pager.pdf)).
- Para Arrancar: el ingreso contable es la factura en el caso típico. Anticipos, ventas en consignación y entregas parciales necesitan su propia fecha de reconocimiento.
- Ganado y cosechas en pie siguen la **sección 34** (activos biológicos), no la 23. Lo tiene que tratar el módulo de rubro.

## 7. Eventos para Contabilidad (propuesta de asientos)

| Evento | Debe | Haber |
|---|---|---|
| Factura registrada | Clientes | Ventas + IVA débito |
| NCRE emitida | Devoluciones y rebajas + IVA débito | Clientes |
| Cobro | Bancos | Clientes |
| Retención recibida | IVA retenido por aplicar / ISR retenido (pago a cuenta o definitivo) | Clientes |
| Anticipo | Bancos | Anticipos de clientes (+ IVA débito si se facturó) |
| Estimación | Gasto por incobrables | Estimación (complementaria) |
| Castigo | Estimación o gasto | Clientes |
| Cheque rechazado | Clientes | Bancos |

## 8. Preguntas para el usuario

| # | Pregunta | Opciones | Recomendación |
|---|---|---|---|
| V-1 | ¿Cómo se registran las ventas al principio? | A) Importar DTE emitidos de la SAT; B) captura manual; C) emitir FEL desde Arrancar | **A + B** ahora; C en una fase posterior con un certificador |
| V-2 | ¿Qué certificador usan sus empresas hoy? | Infile, Digifact, Guatefacturas, otro, la herramienta gratuita de la SAT | Saberlo antes de diseñar el adaptador |
| V-3 | Venta de tabaco: ¿quién compra, qué documento le dan y qué le descuentan? | Constancia de IVA 65 %, ISR, factura especial | Mandar una liquidación real para confirmar el caso |
| V-4 | ¿Alguna empresa es persona individual con ganado o cultivos que pueda estar en el **régimen agropecuario**? | Sí / No | Si sí, investigarlo antes de programar |
| V-5 | ¿El libro y la cartera van en módulos separados? | Uno solo / dos (espejo de compras) | **Dos** |
| V-6 | Anticipos: ¿factura al recibir o al entregar? | Configurable / fijo | **Configurable**, con aviso; confirmarlo con su contador |
| V-7 | Incobrables: ¿método directo o reserva del 3 %? | Directo / reserva / solo contable | Configurable por empresa, sin cambiar de método sin autorización |
| V-8 | ¿Se registra el recargo por cheque rechazado al cliente? | No / con NDEB | NDEB opcional |
| V-9 | ¿Arrancar emite recibos de cobro propios? | Sí, numerados por empresa / no | Sí, como documento interno sin efecto fiscal |
| V-10 | ¿Se cobra con POS o tarjeta? | Sí / No | Si sí, «liquidación de tarjeta» en el cobro, con comisión y retención del 15 % |

## 9. Veredicto

No había un diseño previo que validar. La dirección que propongo (libro fiscal separado de la cartera, importación de la SAT primero y retenciones recibidas como medio de cobro con estado de constancia) es **correcta con ajustes**:
1. Que antes de programar se confirmen los puntos [Confirmar]: art. 21 num. 20 del Decreto 10-2012, numerales del Decreto 20-2006, anticipos y régimen agropecuario.
2. Que tasas y umbrales vivan en configuración con vigencia.
3. Que el régimen de la empresa quede fechado por período.

## Fuentes

- Repositorio: `/home/aparada/proyectos/arrancar/docs/modulos/libro-de-compras.md`, `/home/aparada/proyectos/arrancar/docs/modulos/validacion-h7-h11-retenciones.md`, `/home/aparada/proyectos/arrancar/docs/modulos/investigacion-sat-2237-y-2046.md`, `/home/aparada/proyectos/arrancar/docs/HOJA-DE-RUTA.md` (línea 200), `/home/aparada/proyectos/arrancar/docs/PLAN.md` §6.
- [Decreto 20-2006, ficha en Justia](https://guatemala.justia.com/nacionales/leyes/decreto-no-20-2006-jun-6-2006/gdoc)
- [Prensa Libre, retenciones del IVA (65 % o 15 %)](https://www.prensalibre.com/opinion/columnasdiarias/retenciones-del-iva-origen-y-revision-necesaria/)
- [Deloitte Tax Alert 21-08](https://www.deloitte.com/content/dam/Deloitte/gt/Documents/tax/notas-fiscales/Tax%20Alert%20-%2021-08.pdf)
- [La Hora, la CC y las facturas especiales de exportadores agropecuarios](https://lahora.gt/opinion/wpcomvip/2014/08/04/sentencia-de-la-cc-relacionada-con-facturas-especiales-para-productores-agropecuarios-y-artesanales/)
- [Consortium Legal, Decreto 22-2026](https://consortiumlegal.com/2026/10/01/decreto-22-2026-exencion-idp-iva-combustibles/)
- [Consortium Legal, regímenes especiales del IVA](https://consortiumlegal.com/en/2022/06/06/special-value-added-tax-regimes-in-guatemala/)
- [Decreto 7-2019 en vLex](https://gt.vlex.com/vid/decreto-no-7-2019-818253513)
- [Deloitte, Decreto 7-2019](https://www.deloitte.com/content/dam/Deloitte/gt/Documents/tax/GUATEMALA/Taxnewsletter/181019%20-Tax%20Newsletter-%20decreto%207-2019.pdf)
- [Prensa Libre, cuentas incobrables (art. 21)](https://www.prensalibre.com/?p=13214994)
- [Deloitte, newsletter de marzo (límite del 3 %)](https://www.deloitte.com/content/dam/Deloitte/gt/Documents/tax/GUATEMALA/Taxnewsletter/100320%20-Tax%20Newsletter%20marzo.pdf)
- [Ley de Actualización Tributaria, PDF en ICNL](https://www.icnl.org/wp-content/uploads/leydeacttrib.pdf)
- [SAT, presentación pública de FEL 2018 (requisitos del certificador)](https://auditoria.usac.edu.gt/wp-content/uploads/2019/07/FEL-presentacion-publica-2018.pdf)
- [Acuerdo de Directorio 15-2020 (reformas a FEL)](https://gt.vlex.com/vid/acuerdo-directorio-no-15-913390202)
- [IFRS, NIIF para las Pymes tercera edición](https://www.ifrs.org/content/dam/ifrs/shop/main/2025/spanish/es-ifrs-for-smes-a4-one-pager.pdf)
- [KPMG, actualización de la NIIF para las Pymes](https://kpmg.com/cl/es/home/insights/2025/09/informativo-de-auditoria/actualizacion-niif-para-pymes.html)

**Pendiente para alguien con acceso al texto íntegro:** Decreto 20-2006 (arts. 2-10), Decreto 10-2012 (art. 21 num. 20 y arts. 44-49), AG 5-2013 (libros y anticipos), Ley del IVA (arts. 4, 17, 29, 37 y 52), AG 125-2022 (régimen agropecuario) y el plazo de anulación de un DTE.
