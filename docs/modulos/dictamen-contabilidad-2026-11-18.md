# Dictamen del contador, 2026-11-18: Contabilidad

_Investigación del agente `contador-guatemala` del 2026-11-18, guardada tal cual (sin cambiar el texto) por el agente
`arquitecto-de-datos`. La usa `diseno-contabilidad.md`, que marca lo que aquí queda dudoso o lo que el diseño resuelve de
otra forma._

---

# Dictamen del contador: módulo de Contabilidad (nomenclatura, partidas por evento, períodos, libros, estados financieros, impuesto diferido y cuadraturas)

No escribí archivos. Para esto leí:
- los contratos de eventos que ya existen: `/home/aparada/proyectos/arrancar/servidor/src/modulos/core/contratos/{libro-de-compras,cuentas-por-pagar,bancos,empresas}.contratos.ts`;
- los diseños: `/home/aparada/proyectos/arrancar/docs/modulos/diseno-activos-fijos.md` §9, `diseno-caja-chica-y-cuentas-por-liquidar.md` §8, `diseno-multimoneda.md`, `diseno-cp5-reportes.md` §2.2, §2.3 y §10.7, `diseno-cp4-pagos.md`, `dictamen-u8-saldos-iniciales-2026-11-08.md` y `bancos.md`.

Uso estas etiquetas: **[Ley]** es lo que dice la norma, **[Práctica]** es lo usual en firmas, ERP y NIIF, y **[Opinión]** es mi recomendación.

---

## 0. Resumen en 10 puntos

1. **Bancos no publica ningún evento de dominio.** Solo tiene órdenes y el aviso `movimiento_por_cambiar`. Sin eventos nuevos, Contabilidad no puede contabilizar intereses, comisiones, transferencias, depósitos, cheques que no vienen de Cuentas por pagar ni la nota del saldo inicial. Es el hueco más grande.
2. **`libro-de-compras.documento_registrado` no alcanza para armar la partida.** Solo trae `totalCentavos`, `retencionesCentavos` y `tieneActivoFijo`. Faltan el desglose de la base, el IVA (acreditable y al costo), el IDP, lo exento, las retenciones **por tipo**, el período del IVA, la moneda y el centro de costo. A `documento_anulado` le faltan la fecha contable y la causa.
3. **Un evento que se publica después de confirmar se puede perder.** Si el manejador de Contabilidad falla, la partida no se hace, y en contabilidad la integridad es lo primero. Se necesita una bandeja de eventos con número único e idempotencia, más un reporte de «hechos sin partida».
4. **Hay una contradicción en `diseno-cp5-reportes.md` §2.3.** Dice que un documento eliminado «no estaba provisionado». Con U12 todo documento se provisiona al registrarlo, así que eliminarlo borra una partida. Solo se puede si el período contable está abierto.
5. **Fecha de efecto contra período cerrado.** R1 usa la emisión. Una factura de octubre registrada después de cerrar octubre no puede entrar en octubre. Hay que definir la fecha contable (§4.2).
6. **El pago no debe volver a cargar la retención.** El auxiliar está al neto (`total − retenciones`) y la retención se provisionó al registrar. Por eso `retencionDescontadaCentavos` del pago es solo informativa: si Contabilidad la suma, duplica la retención.
7. **No hay catálogo de cuentas obligatorio** para las empresas comunes de Guatemala (sí para bancos y el Estado). El catálogo es una plantilla sugerida y editable, con «roles de sistema» enlazados.
8. **Corregir, no borrar.** El Código de Comercio art. 373 pide llevar la contabilidad sin raspaduras ni alteraciones y corregir los errores con un asiento que explique el error. En un período cerrado o impreso solo cabe la reversa.
9. **La depreciación fiscal no va al mayor.** Al mayor va solo la contable. El impuesto diferido (Sección 29) sale de la diferencia entre las bases, y solo tiene sentido en el régimen sobre las utilidades y con marco NIIF.
10. **Libros.** Son cuatro: Inventarios, Diario, Mayor y Estados financieros (C. Com. art. 368). Los autoriza el Registro Mercantil (art. 372) y los habilita la SAT. En la práctica se imprimen en hojas movibles habilitadas. El sistema debe imprimir con folio y bloquear lo ya impreso.

---

## 1. Marco legal y profesional

| Tema | Qué dice | Tipo | Fuente |
|---|---|---|---|
| Obligación de llevar contabilidad | Partida doble y principios de contabilidad generalmente aceptados. Libros de Inventarios, Diario, Mayor y Estados financieros. Quien tiene activo de Q25,000 o menos puede omitirlos, salvo ley especial | [Ley] C. Com. art. 368 | [ICNL, Código de Comercio](https://www.icnl.org/resources/library/codigo-de-comercio) |
| Idioma y moneda | En español y en **moneda nacional**. Una sucursal extranjera puede llevar un duplicado en otra moneda | [Ley] art. 369 | Ídem |
| Contador | Todas las sociedades, y el comerciante individual con activo mayor de Q20,000, llevan la contabilidad por contador | [Ley] art. 371 | Ídem |
| Autorización de libros | Inventarios, Diario, Mayor y Estados financieros los autoriza el **Registro Mercantil** | [Ley] art. 372 | Ídem |
| Cómo se corrige | Al día, en orden cronológico, sin espacios en blanco, raspaduras ni alteraciones. El error se corrige al descubrirlo, con un asiento que lo explique | [Ley] art. 373 | Ídem |
| Habilitación ante la SAT | Los libros contables se habilitan además en la SAT (timbre de Q0.50 por hoja, en línea). Se habilitan hojas movibles para llevar los libros en computadora, y la SAT los pide impresos | [Práctica, fuentes secundarias] | [Living in Guatemala, habilitación](https://livinginguatemala.com/es/tramites/habilitacion-libros/), columnas de Prensa Libre ([1](https://www.prensalibre.com/opinion/columnasdiarias/fel-y-registros-contables-electronicos/), [2](https://www.prensalibre.com/opinion/columnasdiarias/error-al-autorizar-libros-contables/)) |
| Sanción por libros no autorizados o no habilitados | Infracción que puede llevar al cierre temporal (C. Trib. art. 85 num. 4 y art. 86) | [Ley, texto leído incompleto] | [Wikisource, Código Tributario](https://es.wikisource.org/wiki/C%C3%B3digo_Tributario_de_la_Rep%C3%BAblica_de_Guatemala_(Decreto_Ley_6-91)) |
| Prescripción | 4 años (C. Trib. art. 47). En la práctica se conserva como mínimo ese plazo y el del Código de Comercio (5 años, según fuentes secundarias) | [Ley] y [Práctica] | Ídem |
| Sistema de lo devengado | Obligatorio para quien lleva contabilidad completa | [Ley] LAT art. 52 | [ICNL, Decreto 10-2012](https://www.icnl.org/resources/library/ley-de-actualizacion-tributaria) |
| Estados financieros anuales | Quien está obligado por el Código de Comercio prepara al cierre el balance general, el estado de resultados, el de flujo de efectivo y, si corresponde, el de **costo de producción**. Los audita cuando corresponda | [Ley] LAT arts. 53 y 40 num. 1 | Ídem |
| Auditoría obligatoria | Los agentes de retención del IVA y los contribuyentes especiales presentan estados financieros auditados con la declaración anual del ISR, en cualquier régimen | [Ley] LAT art. 40 num. 2. Criterio SAT 04-2025 | [Deloitte, criterio 04-2025](https://www.deloitte.com/latam/es/services/tax/perspectives/gt-13ene26-auditoria-obligatoria-agentes-iva-guatemala.html) |
| Ejercicio | Del 1 de enero al 31 de diciembre. **Debe coincidir con el ejercicio contable** salvo período especial autorizado por la SAT | [Ley] LAT art. 37 | [ICNL, LAT](https://www.icnl.org/resources/library/ley-de-actualizacion-tributaria) |
| Gasto contabilizado | En contabilidad completa, el gasto deducible debe estar «debidamente contabilizado». Lo que genera rentas exentas va en cuentas separadas | [Ley] LAT arts. 22 y 23 lit. a | Ídem |
| Diferencial cambiario | Es deducible la pérdida por compraventa de divisas con entidades supervisadas por la SIB. No lo es la que sale de revaluaciones o remediciones registradas por simple partida | [Ley] LAT art. 21 num. 28 y art. 23 lit. o | Ídem |
| Depreciación fiscal | Porcentajes máximos (art. 28). La cuota que no se deduce en su año se pierde (art. 25) | [Ley] | Ídem |
| Tasa del régimen sobre las utilidades | 25 % | [Ley] LAT art. 36 | Ídem |
| Reserva legal | 5 % de la utilidad neta de cada ejercicio, en sociedades | [Ley] C. Com. art. 36 (texto no leído directamente) | [Prensa Libre](https://www.prensalibre.com/?p=16067681) |
| NIIF para las Pymes | Conjunto completo: situación financiera, resultados, cambios en el patrimonio, flujos de efectivo y notas (secc. 3 a 8). Errores de períodos anteriores: secc. 10.19 a 10.23. Impuesto diferido: secc. 29. Primera adopción: secc. 35. La **tercera edición** (IASB, febrero de 2025) rige desde el 1 de enero de 2027 | [Práctica y norma profesional] | [IFRS, tercera edición](https://www.ifrs.org/content/dam/ifrs/shop/main/2025/spanish/es-ifrs-for-smes-a4-one-pager.pdf), [KPMG](https://kpmg.com/cl/es/home/insights/2025/09/informativo-de-auditoria/actualizacion-niif-para-pymes.html), [Forvis Mazars, secc. 29](https://www.forvismazars.com/uy/en/insights/our-publications/tax/seccion-29-de-la-niif-para-pymes) |

**Ojo con el régimen [Opinión, certeza media].**
- La obligación mercantil (art. 368) depende del **activo**, no del régimen fiscal. Una sociedad en el régimen opcional simplificado o pequeño contribuyente sigue obligada a llevar contabilidad por el Código de Comercio.
- Lo que cambia con el régimen es el **uso fiscal**: retenciones, diferido, conciliación de la renta.
- El módulo es general: sirve a todos y muestra lo fiscal según el régimen vigente de cada período, como ya lo hace Activos fijos.
- No verifiqué el texto de los artículos 374 a 382 del Código de Comercio. Las fuentes secundarias no coinciden en su numeración (publicación del balance y conservación). Hay que confirmarlos antes de rotular los libros.

---

## 2. Nomenclatura contable

### 2.1 Lo que recomiendo

| Punto | Recomendación | Tipo |
|---|---|---|
| Catálogo obligatorio | **No existe** para las empresas comunes. La SIB fija uno para bancos y el Minfin para el Estado. El nuestro es una **plantilla sugerida** que se copia a la empresa y luego es suya | [Ley, por ausencia] y [Práctica] |
| Clases | 1 Activo, 2 Pasivo, 3 Patrimonio, 4 Ingresos, 5 Costos, 6 Gastos de operación, 7 Otros ingresos y gastos (financieros, diferencial cambiario, ISR). Es la más común en Guatemala | [Práctica] |
| Niveles | Configurables por empresa, de 4 a 6 (clase, grupo, cuenta, subcuenta, detalle), con una máscara de código (`1.1.01.01.001`). La plantilla usa 5 | [Opinión] |
| Cuentas de mayor y de detalle | Solo las de **detalle** reciben movimientos. Las de mayor suman | [Práctica] |
| Atributos de cada cuenta | Naturaleza (deudora o acreedora). Tipo (balance o resultados). **Rubro de estado financiero**. **Clasificación del flujo de efectivo** (operación, inversión o financiamiento, o «efectivo»). **Monetaria** (para Multimoneda). Moneda. Auxiliar que exige (tercero, cuenta bancaria, activo, centro de costo). **Deducible, no deducible o exento** (para la conciliación de la renta, LAT art. 23 lit. a). Activa o inactiva | [Práctica y opinión] |
| Cuentas de control | Las que cuadran con un auxiliar (Proveedores, Bancos, IVA crédito, Retenciones, puentes, Depreciación acumulada, Caja chica, Anticipos) se marcan **«de control»**: no aceptan partida manual, o solo con un permiso y quedando como partida de conciliación | [Práctica de ERP] |
| Roles de sistema | Contabilidad guarda sus **enlaces** del rol a la cuenta por empresa, como ya prevé `bancos.md` y Activos fijos (R-10): cuenta bancaria, concepto de Bancos, clase de activo, tipo de retención, fondo de caja chica y destino de un anticipo. Los demás módulos no conocen las cuentas | [Opinión, ya acordado en PLAN §3] |
| Plantillas | Una base. Con IVA general salen las cuentas de IVA crédito. Con el régimen sobre las utilidades salen el ISR diferido y el corriente. Si la empresa es agente de retención, salen las retenciones por tipo. Las de rubro (agrícola, ganadero) las aporta su módulo | [Opinión] |

### 2.2 Roles de sistema mínimos

| Rol | Lo usa |
|---|---|
| Proveedores (por tipo, si se separan locales, del exterior o de activos) | Libro de compras y Cuentas por pagar |
| IVA crédito fiscal | Libro de compras |
| Retención de IVA por pagar (agente), IVA de factura especial por pagar, retención del 5 % de IVA a pequeño contribuyente, retención de ISR en el régimen opcional, retención de ISR a no domiciliados | Libro de compras y Caja chica. **Una cuenta por cada formulario de la SAT**, para cuadrar con las constancias |
| Pagos a proveedores por aplicar (transitoria de R11) | Bancos y Cuentas por pagar |
| Saldos de proveedores por regularizar | Cuentas por pagar (`ajuste` con efecto `transitoria`) |
| Efectivo para pagos (por custodio) | Retiros de Cuentas por pagar |
| Caja chica (por fondo), anticipos por liquidar, cuentas por cobrar a empleados | Caja chica y Cuentas por liquidar |
| **Cuenta puente de apertura** | Carga inicial |
| **Cuenta puente de compras de activos** | Libro de compras y Activos fijos |
| Activo, depreciación acumulada y gasto de depreciación (por clase), construcciones en curso, resultado en venta o baja | Activos fijos |
| Diferencial cambiario **realizado** (ganancia y pérdida) y **no realizado** (ganancia y pérdida), por separado | Multimoneda (LAT art. 21 num. 28 y art. 23 lit. o) |
| ISR corriente (gasto y por pagar), ISR diferido (gasto o ingreso, activo y pasivo) | Cierre anual |
| Resultado del ejercicio, resultados acumulados, ajustes de ejercicios anteriores, reserva legal | Cierre anual y correcciones (secc. 10.21) |

---

## 3. Eventos que ya existen: qué falta para contabilizar

| Evento | Estado | Qué falta o qué está mal | Prioridad |
|---|---|---|---|
| `libro-de-compras.documento_registrado` | **Insuficiente** | Desglose por línea: tipo de gasto o bien (bien, servicio, combustible, importación, activo fijo), base, IVA acreditable, IVA al costo, IDP, exento y otros impuestos. Retenciones **por tipo** (IVA de agente, IVA de factura especial, 5 % a pequeño contribuyente, ISR del régimen opcional, ISR a no domiciliados) con su constancia. Período del libro (IVA). Fecha de efecto. Moneda y quetzales. Localidad y departamento. Para Caja chica y Cuentas por liquidar: fondo o anticipo | Alta |
| `libro-de-compras.documento_anulado` | **Insuficiente** | Falta la **fecha contable de la anulación**, la `causa` (`error_de_captura`, `fel_anulada_por_el_emisor`, `no_corresponde_a_la_empresa`) y si el período ya estaba declarado | Alta |
| `libro-de-compras.documento_eliminado` | Ojo | Con U12 sí había partida. Eliminar solo es válido si el período contable está **abierto**, y entonces la partida se cancela (§6). Hay que corregir la leyenda de `diseno-cp5-reportes.md` §2.3 | Alta |
| `cuentas-por-pagar.documento_autorizado` y `documento_desautorizado` | Correcto | Sin partida (U12) | — |
| `cuentas-por-pagar.pago_registrado` | Correcto con ajustes | (a) Contabilidad **no** debe sumar `retencionDescontadaCentavos` (ya se provisionó). (b) Con `efecto = correccion_de_error` no viene la cuenta: queda «por completar» y el contador la elige. (c) Con Multimoneda hacen falta el diferencial realizado y la base en quetzales por aplicación. (d) `tieneActivoFijo` sirve para el flujo (Inversión) | Media |
| `pago_reaplicado` | Correcto | Sin partida si los cargos están en la misma cuenta de control. Partida de reclasificación solo si cambia la cuenta (por ejemplo, Proveedores locales contra Proveedores de activos) | Baja |
| `pago_anulado`, `reintegro_*`, `retiro_*`, `ajuste_*` | Correctos | Ya traen `fecha` contable, `fechaOriginal` y `anulacionEnBancos`. En `retiro_liquidado`, el destino del faltante (cuenta por cobrar al custodio o pérdida) debe venir **decidido** en el evento, no «según Contabilidad» | Media |
| **Bancos** | **No existen** | Se necesitan `bancos.movimiento_registrado`, `_anulado` (con forma e inverso), `_eliminado`, `_corregido` (monto o fecha) y `_reclasificado` (desglose de conceptos). Cada uno lleva cuenta bancaria, tipo, fecha, conceptos con montos, `origen` (módulo y documento), marca de «para Cuentas por pagar», `saldoInicial` y, en intereses, **interés bruto e ISR retenido** (H8) | **Crítica** |
| Activos fijos (§9) | Correcto con ajustes | `depreciacion_reabierta` necesita un **aviso previo** (síncrono) para que Contabilidad pueda impedirlo si el período está cerrado. Lo mismo vale para anular costos y bajas | Media |
| Caja chica y Cuentas por liquidar | Diseñado | Las partidas del §8 están bien (ver §4). Falta definir el momento del gasto (V-1) | Media |
| `multimoneda.cierre_cambiario_registrado` | Correcto | Necesita el detalle por partida monetaria y su naturaleza (cuenta bancaria o por pagar), separando lo realizado de lo no realizado | Media |

**Regla para que no haya partidas dobles [Opinión, firme].** Cada hecho económico lo contabiliza **su módulo dueño**.
- Si un movimiento de Bancos tiene `origen` (por ejemplo, Cuentas por pagar), Bancos no lo contabiliza. Lo hace el evento del origen, que ya lleva la cuenta bancaria.
- Una nota de débito **marcada** «pago a proveedor» sin aplicar sí la contabiliza Bancos: Debe Pagos por aplicar / Haber Bancos. Luego `pago_registrado` con `nota_ligada` contabiliza Debe Proveedores / Haber Pagos por aplicar.
- Las comisiones bancarias con FEL tienen un riesgo: si la factura del banco entra al Libro de compras **y** la nota de débito se contabiliza como gasto, el gasto se cuenta dos veces. Hay que decidirlo (pregunta 8).

**Confiabilidad [Práctica de auditoría: aserción de integridad].**
- La bandeja de entrada en Contabilidad lleva un id único por evento y un estado (pendiente, contabilizado, con error). El manejador es idempotente.
- Una acción **«Regenerar partidas del período»** sirve mientras el período esté abierto.
- Un reporte **«Hechos sin partida»** se revisa como paso del cierre.
- Un evento que se pierde después de confirmar es un error contable silencioso. Por eso recomiendo una bandeja de salida transaccional (outbox) en el módulo que publica, o que Contabilidad pueda **releer** el hecho por una orden del mediador (`<modulo>.hechos_para_contabilizar` de un período).

---

## 4. Partidas por evento (propuesta para validar con el usuario)

### 4.1 Tabla

| Hecho | Debe | Haber | Fecha |
|---|---|---|---|
| Compra registrada con destino Cuentas por pagar | Gasto, costo o inventario por línea. **Puente de compras de activos** en las líneas de activo. IVA crédito fiscal (solo el acreditable; el no acreditable va al costo de su línea) | Proveedores (**neto**). Cada retención en su cuenta | Fecha de efecto (§4.2) |
| Factura especial | Gasto e IVA crédito | Proveedores (neto). IVA retenido de factura especial por pagar. ISR retenido por pagar | Emisión |
| Compra con destino Caja chica | Gasto, IVA y puente de activos si aplica | Caja chica (fondo). Retenciones | Asignación al fondo (V-1) |
| Compra con destino Cuentas por liquidar | Gasto e IVA | Anticipos por liquidar. Retenciones | Liquidación |
| Nota de crédito del proveedor | Proveedores | Gasto, costo o puente. IVA crédito. Si la factura es de **un año anterior** y la empresa está en el régimen sobre las utilidades: otros ingresos | Fecha de efecto |
| Pago (`banco`) | Proveedores (monto) | Bancos (monto) | Fecha del cheque, aunque esté posfechado |
| Pago (`transitoria_por_aplicar`) | Proveedores | Pagos por aplicar | Fecha del pago |
| Pago (`efectivo`) | Proveedores | Efectivo para pagos (custodio) | Fecha del pago |
| Pago (`apertura`) | Proveedores | Puente de apertura | Fecha de inicio |
| Pago (`correccion_de_error`) | Proveedores | Cuenta que elige el contador (ajustes de ejercicios anteriores, secc. 10.21) | Fecha del pago |
| Pago anulado `sin_inverso` | Se **cancela** la partida original (solo con el período abierto) | — | — |
| Pago anulado `con_inverso` o anulación sin movimiento | Partida inversa | — | `fecha` del evento |
| Ajuste `perdida`, `transitoria` o `ingreso` | Otros gastos no deducibles, regularización o Proveedores | Proveedores u otros ingresos (sin IVA) | Fecha del ajuste |
| Retiro de efectivo | Efectivo para pagos | Bancos | Fecha del retiro |
| Retiro liquidado | Bancos (devuelto). Cuenta por cobrar al custodio o pérdida no deducible (faltante) | Efectivo para pagos | Fecha de liquidación |
| Reintegro del proveedor | Bancos o Caja | Proveedores (saldo a favor) | Fecha del reintegro |
| Bancos: intereses | Bancos (neto). ISR retenido sobre rentas de capital (gasto de ISR) | Ingresos por intereses (**bruto**) | Fecha de la nota |
| Bancos: comisión sin FEL o cargo | Gasto bancario | Bancos | Fecha |
| Bancos: transferencia entre cuentas propias | Bancos B (o fondos en tránsito) | Bancos A | Fecha de cada lado |
| Bancos: otros por concepto | Cuenta del concepto (enlace) | Bancos | Fecha |
| Bancos: saldo inicial | Bancos | Puente de apertura | Fecha de inicio |
| Activo capitalizado | Activo de la clase o construcciones en curso | Puente de compras de activos | Fecha del costo |
| Puesta en uso | Activo de la clase | Construcciones en curso | Fecha |
| Depreciación cerrada | Gasto de depreciación **contable** (por departamento) | Depreciación acumulada | Último día del mes |
| Depreciación fiscal | **Sin partida** en el mayor. Queda en el libro fiscal de Activos fijos y alimenta el diferido | — | — |
| Baja o venta | Depreciación acumulada, pérdida en baja y, en venta, Cuentas por cobrar o Bancos | Activo, IVA débito y ganancia en venta | Fecha |
| Caja chica: apertura, reposición, cierre, arqueo | Como en el §8 del diseño. Apertura: Debe Caja chica / Haber Bancos. Reposición: Debe Caja chica / Haber Bancos. Faltante: Debe cuenta por cobrar o pérdida / Haber Caja chica. Sobrante: Debe Caja chica / Haber Otros ingresos | | |
| Cierre cambiario mensual | Diferencial **no realizado** (pérdida) o partida monetaria | Partida monetaria o diferencial no realizado (ganancia) | Último día del mes |
| Pago en moneda extranjera | Proveedores (valor en libros) y, si hay pérdida, diferencial realizado | Bancos (quetzales del pago) y, si hay ganancia, diferencial realizado | Fecha del pago |

**Retención: cuándo nace la obligación.** Coincide con lo que ya dictaminamos. La retención nace al pagar **o acreditar** (LAT art. 48; Ley del IVA art. 48; Decreto 20-2006), y registrar la deuda es acreditar. Por eso va en la misma partida de la provisión, y el auxiliar en R1 está al neto. **Correcto.**

### 4.2 Fecha contable de lo que llega tarde (decisión)

R1 fecha cada cargo con su emisión (devengo). Si el mes de la emisión ya está cerrado en Contabilidad, hay tres opciones:

| Opción | Cómo | A favor | En contra |
|---|---|---|---|
| A. Primer día abierto | Fecha contable = el mayor entre la fecha de efecto y el primer día del primer período abierto. La partida guarda las dos fechas | No toca lo cerrado (art. 373) y es lo que hacen los ERP | R1 a fin del mes cerrado no cuadra con el mayor por esos documentos. La cuadratura los muestra como **partida conciliatoria**; R1 ya los avisa como «registros tardíos» |
| B. Bloquear | El libro no deja registrar con fecha en un período cerrado hasta que se reabra | Cuadre perfecto | Frena la operación. Reabrir es excepcional |
| C. Mes cerrado | Se contabiliza en el mes cerrado | — | **Incorrecto**: rompe el cierre y lo ya impreso |

**Recomiendo A**, y que la cuadratura de Contabilidad compare por **fecha contable**. El IVA no cambia: el crédito sigue al período del libro.

---

## 5. Partidas manuales, apertura, períodos y cierres

| Tema | Recomendación | Tipo |
|---|---|---|
| Numeración | Correlativa por empresa y año, sin huecos ni reuso. Un número anulado se queda como anulado | [Práctica] (art. 373: orden cronológico) |
| Estados de una partida manual | Borrador (no afecta saldos, se puede borrar), contabilizada, anulada o reversada. Glosa obligatoria. Respaldo adjunto opcional | [Práctica] |
| Aprobación | Opcional por empresa: quien la hace no la aprueba (segregación) | [Opinión] |
| Cuentas de control | No aceptan partida manual, o solo con un permiso propio y marcadas como conciliatorias | [Práctica] |
| Tipos | Diario, ajuste, reclasificación, apertura, cierre y corrección de ejercicios anteriores | [Práctica] |
| Partida de apertura | El contador captura el balance de apertura **completo**, pero las cuentas que tienen auxiliar (Bancos, Proveedores, activos, caja chica) van contra la **puente**. Cada módulo contabiliza su saldo inicial contra la puente. Si los auxiliares coinciden con el balance, la puente queda en **0**, y Empresas bloquea el cierre de la carga si no está en 0 (U8 §9.8) | [Opinión] (ver el ejemplo abajo) |
| Primera adopción de NIIF | Si la empresa venía con base fiscal, la secc. 35 pide un estado de situación de apertura con los ajustes contra resultados acumulados | [Norma] |
| Períodos | Doce meses más un **período 13 de cierre** (ajustes y cierre anual) por ejercicio. El ejercicio es del 1 de enero al 31 de diciembre (LAT art. 37), salvo período especial autorizado | [Práctica de ERP] y [Ley] |
| Estados de un período | Futuro (acepta los cheques posfechados), abierto, cerrado (se reabre con permiso, motivo y **auditoría permanente**, el mecanismo de `core.recursos_de_auditoria_permanente`) e **impreso o definitivo** (no se reabre) | [Opinión] |
| Pregunta común | El core ofrece «¿esta fecha está abierta?». Contabilidad la contesta y, sin Contabilidad, todo está abierto. La usan todos los módulos al registrar o anular, como ya prevé `bancos.md` | [Opinión, ya previsto] |
| Cierre mensual | Lista de control: hechos sin partida = 0, cuadraturas (§8), depreciación cerrada, cierre cambiario y puentes en 0 | [Práctica] |
| Cierre anual (período 13) | 1) Ajustes (diferido, ISR corriente, provisiones). 2) **Partida de cierre**: las cuentas de resultados contra «Resultado del ejercicio». 3) La reserva legal del 5 % (C. Com. art. 36) va cuando se aprueba la distribución, en el año siguiente. 4) El saldo pasa al año nuevo; se puede imprimir una «partida de apertura» del año en el Diario | [Práctica] y [Ley] |

**Ejemplo de la puente.** Balance de apertura: Bancos 100, Proveedores 40, Capital 60.
- Partida del contador: Debe Puente 100 / Haber Puente 40 / Haber Capital 60.
- Bancos: Debe Bancos 100 / Haber Puente 100.
- Cuentas por pagar: Debe Puente 40 / Haber Proveedores 40.
- La puente suma 100 − 40 − 100 + 40 = **0**.

---

## 6. Qué se puede eliminar o reversar

| Situación | Partida automática | Partida manual |
|---|---|---|
| Borrador | — | Se puede eliminar |
| Período **abierto**, error de captura u operación que «nunca existió» (cheque anulado sin inverso, documento eliminado) | Se **cancela** con el hecho, sin reusar el número y con rastro en la auditoría | Anular (el número queda anulado) |
| Período abierto, hecho real que se revierte (FEL anulada por el emisor, devolución, anulación con inverso) | **Partida inversa** con la fecha de la anulación | Reversa |
| Período **cerrado** | Prohibido cancelar. El módulo de origen recibe un **veto** por aviso síncrono, o el hecho se revierte en el período abierto con fecha contable = primer día abierto | Solo reversa en un período abierto, o reabrir con permiso |
| Período impreso o ejercicio declarado | Nada se reabre | Corrección de error: secc. 10.19 a 10.23. Si es material, va contra **resultados acumulados (ajustes de ejercicios anteriores)** en el año en curso, y se reexpresan los comparativos en los estados financieros. Si cambia el ISR, se rectifica la declaración |

Fundamento: C. Com. art. 373 [Ley] y secc. 10 [Norma]. El resto es [Práctica].

---

## 7. Libros y estados financieros

| Libro o estado | Contenido mínimo | Tipo |
|---|---|---|
| Diario | Por fecha: número, fecha, glosa, cuenta (código y nombre), debe, haber y totales iguales | [Ley] art. 368 y [Práctica] |
| Mayor (o centralizador) | Por cuenta de detalle o de mayor: saldo anterior, movimientos y saldo | [Ley] |
| Inventarios y Balances | Inventario inicial detallado y, al cierre de cada año, inventario y balance con detalle por cuenta | [Ley] art. 368 y [Práctica] |
| Estados financieros | Balance, resultados y, según LAT art. 53, flujo de efectivo y costo de producción | [Ley] |
| Impresión en hojas habilitadas | Folio inicial y correlativo por libro. Encabezado con NIT, nombre y número de folio. El sistema guarda qué períodos se imprimieron en qué folios y entonces **bloquea** esos períodos. Las hojas cuestan: el Diario debe poder imprimirse **por documento** o **resumido** (pregunta 5) | [Práctica] y [Opinión] |
| Conjunto NIIF para las Pymes | Situación financiera, resultados (o resultado integral), cambios en el patrimonio (o resultados y ganancias acumuladas, si aplica), flujos de efectivo y notas. **Comparativos** con el año anterior | [Norma] secc. 3 a 8 |
| Flujo de efectivo | **Indirecto** por omisión, desde el mayor y la clasificación de las cuentas. El **directo** sale de los conceptos de Bancos (que ya clasifican operación, inversión y financiamiento), y antes hay que resolver la limitación del §8 de Caja chica (fechas de reposición y entrega) | [Norma] secc. 7 y [Opinión] |
| Costo de producción | Fincas y agroindustria: estado de costo de producción cuando corresponda (LAT art. 53). Los módulos de rubro aportan las cuentas | [Ley] |
| Moneda | En quetzales (art. 369). La moneda extranjera va en columnas de referencia | [Ley] |

---

## 8. Cuadraturas de los auxiliares (paso del cierre mensual)

| Mayor | Auxiliar | Igualdad | Diferencias esperadas |
|---|---|---|---|
| Proveedores | R1, saldo neto por NIT al corte | Mayor = R1 (acreedores − deudores) | Registros tardíos (§4.2). Partidas manuales en la cuenta de control |
| Pagos por aplicar (transitoria) | R11 | Mayor = R11 | — |
| Proveedores, neto | Conciliación al pie de R1 | Auxiliar − R11 = Proveedores + transitoria | — |
| Bancos (por cuenta) | Saldo según libros de Bancos y conciliación bancaria | Mayor = saldo en libros. La conciliación explica la diferencia con el estado del banco | Posfechados según la política |
| Retenciones por pagar (por tipo) | Constancias emitidas y no enteradas | Mayor = constancias pendientes | — |
| IVA crédito | Libro de compras del período | Mayor = IVA acreditable del libro | Período del libro contra fecha contable |
| Puente de compras de activos | Activos fijos contra Libro de compras | **0** (o la lista de lo pendiente de capitalizar) | Facturas de activo sin capitalizar |
| Activos y depreciación acumulada | Activos fijos, libro contable | Mayor = valor en libros por clase | — |
| Caja chica, efectivo para pagos, anticipos | Fondos, retiros y anticipos abiertos | Mayor = saldo por fondo o custodio | — |
| Puente de apertura | — | **0** al cerrar la carga | — |

---

## 9. Impuesto diferido (Sección 29) por la depreciación

- **Solo aplica en el régimen sobre las utilidades** [Opinión, certeza alta]. En el régimen opcional simplificado (sobre ingresos) y en pequeño contribuyente, la depreciación no afecta la renta gravable futura, así que no hay diferencia temporaria.
- **Solo con marco NIIF.** Si la empresa usa base fiscal (las tasas del art. 28 en libros, la opción D1 c de Activos fijos por omisión), la diferencia es 0 y no hay diferido. Muchas pymes trabajan así [Práctica].
- **Cálculo** (método del balance, secc. 29):
  - por activo: base contable (costo − acumulada contable) contra base fiscal (costo fiscal − acumulada fiscal);
  - diferencia × 25 % (LAT art. 36);
  - si la base contable es mayor que la fiscal, sale un pasivo diferido; si es menor, un activo diferido;
  - el activo diferido solo se reconoce si es probable que haya ganancias fiscales futuras.
- **Partida.** La variación del saldo contra el gasto (o ingreso) de ISR diferido, en el período 13. Puede ser trimestral si la empresa lo quiere (pagos trimestrales del ISR).
- **Otras fuentes** del diferido (provisiones de planilla, diferencial no realizado que se deducirá al realizarse, deterioros) se capturan como diferencias manuales en la misma pantalla.
- **Terrenos**: sin depreciación (LAT art. 26). La secc. 29 los mide por su recuperación mediante la venta.
- Recomiendo un interruptor por empresa: **«Marco contable: NIIF para las Pymes / Base fiscal»**. El diferido solo se calcula con NIIF y en el régimen sobre las utilidades.

---

## 10. Para el `arquitecto-de-datos` (descripción, sin código)

- `contabilidad.cuentas`: código, nombre, padre, nivel, detalle sí o no, naturaleza, tipo, rubro de estado financiero, clase de flujo, monetaria, moneda, auxiliar exigido, de control, fiscal (deducible, no deducible o exento), activa.
- `contabilidad.enlaces`: rol de sistema y llave (concepto, cuenta bancaria, clase de activo, tipo de retención, fondo) hacia la cuenta.
- `contabilidad.periodos`: ejercicio, mes del 1 al 13 y estado.
- `contabilidad.partidas`: número por año, fecha contable, fecha del hecho, período, tipo, estado, glosa, origen (módulo, tipo de hecho, id del documento, **id del evento único**), `reversa_de` y `cancelada_por`.
- `contabilidad.lineas_de_partida`: cuenta de detalle, debe o haber (`numeric(14,2)`, uno de los dos), tercero, cuenta bancaria, activo, localidad y departamento, moneda, monto original y tipo de cambio.
- Restricciones:
  - debe = haber por partida (disparador diferido al confirmar);
  - nada se escribe en un período cerrado (disparador);
  - las líneas de una partida contabilizada no se modifican;
  - solo cuentas de detalle y activas.
- `contabilidad.eventos_recibidos` (bandeja con estado y error) y `contabilidad.impresiones` (libro, período, folios).
- Los cierres y reaperturas van al catálogo de auditoría permanente.

---

## 11. Preguntas para el usuario

| # | Pregunta | Opciones | Mi recomendación |
|---|---|---|---|
| 1 | ¿Cómo se arma la nomenclatura? | a) Plantilla única editable. b) Plantillas por régimen y rubro. c) Cada empresa desde cero o importada de Excel | **b** con importación de Excel; los niveles se configuran (5 por omisión) |
| 2 | Fecha contable de un documento registrado con fecha en un mes cerrado | A primer día abierto, B bloquear, C mes cerrado | **A** (§4.2) |
| 3 | ¿Cómo llegan los datos a Contabilidad? | a) Eventos con todos los datos. b) Evento corto y Contabilidad lee el hecho por una orden. c) Las dos, más una bandeja de salida | **c**: evento con todos los datos para contabilizar, y una orden para regenerar o releer un período |
| 4 | ¿Bancos publica sus eventos ya, antes de Contabilidad? | Sí, en un paso de Bancos / No, después | **Sí**: es requisito, junto con H8 (interés bruto e ISR) |
| 5 | Detalle del Diario impreso | a) Una partida por documento. b) Resumen por módulo y día. c) Resumen mensual con los auxiliares de respaldo | Guardar siempre el detalle y elegir al **imprimir** entre a y c. Que el contador lo confirme con su práctica (hojas habilitadas) |
| 6 | Momento del gasto de caja chica (V-1) | Al asignar el documento / al reponer | **Al asignar** (devengo, sin partida de corte) |
| 7 | ¿Partidas manuales en las cuentas de control? | Prohibidas / con permiso y marcadas / libres | **Con permiso y marcadas** como conciliatorias |
| 8 | Comisiones del banco con FEL | a) Entran por el Libro de compras (la nota del banco queda «con origen»). b) Por Bancos, sin crédito fiscal. c) La empresa elige | **a** si la empresa toma el IVA. Si no, **b** |
| 9 | Faltante de retiros y de caja chica | Lo decide quien liquida (cuenta por cobrar o pérdida) / lo decide el contador después | **Quien liquida**, y viaja en el evento |
| 10 | Marco contable por empresa | NIIF para las Pymes / Base fiscal | Interruptor por empresa. El diferido solo con NIIF y en el régimen sobre las utilidades |
| 11 | Diferido | Anual (período 13) / trimestral / mensual | **Anual**, trimestral opcional |
| 12 | Períodos | Doce meses / doce más el período 13 de cierre | **Con el período 13** |
| 13 | Reabrir un período | Cualquiera con permiso / solo con permiso y motivo / nunca después de imprimir | Con **permiso y motivo**, auditoría permanente y **nunca** después de imprimir |
| 14 | Aprobación de partidas manuales | Sin aprobación / con aprobación de otra persona | Opcional por empresa, apagada por omisión |
| 15 | Diario y cierre mensual | ¿Contabilidad obliga a la lista de cuadraturas para cerrar el mes? | **Sí, pero no bloquea**: avisa y el contador cierra con un motivo si hay diferencias |

---

## 12. Veredicto

**Lo que ya está diseñado es correcto con ajustes.** Sirve como base para Contabilidad:
- provisión al registrar con retenciones en la misma partida;
- auxiliar al neto;
- fechas contables de anulación;
- puentes de apertura y de compras de activos;
- depreciación contable y fiscal por separado;
- diferencial calculado por Multimoneda.

Antes de programar Contabilidad hacen falta cinco ajustes:
1. Eventos de dominio en **Bancos**.
2. `documento_registrado` y `documento_anulado` del Libro de compras **con todos los datos** (desglose, retenciones por tipo, fecha contable y causa).
3. Una **bandeja de eventos** idempotente con regeneración, y el reporte «hechos sin partida».
4. La pregunta común **«¿esta fecha está abierta?»** y un aviso de **veto** antes de cancelar o reabrir (Bancos, Libro de compras, Activos fijos).
5. Corregir la leyenda de `/home/aparada/proyectos/arrancar/docs/modulos/diseno-cp5-reportes.md` §2.3 sobre los documentos eliminados, y que `pago_registrado` no se use para volver a cargar la retención.

**Lo que falta verificar en el texto oficial:** los artículos 374 a 382 del Código de Comercio, el art. 36 del Código de Comercio, el art. 112 del Código Tributario y el fundamento exacto de la habilitación ante la SAT (canal vigente después de la migración de Declaraguate a la Agencia Virtual en 2026).

## Fuentes
- [ICNL, Código de Comercio (Decreto 2-70), arts. 368 a 373](https://www.icnl.org/resources/library/codigo-de-comercio)
- [ICNL, Ley de Actualización Tributaria (Decreto 10-2012), arts. 21, 23, 25, 26, 28, 36, 37, 40, 47, 48, 52 y 53](https://www.icnl.org/resources/library/ley-de-actualizacion-tributaria)
- [Wikisource, Código Tributario (Decreto 6-91), arts. 47 y 85](https://es.wikisource.org/wiki/C%C3%B3digo_Tributario_de_la_Rep%C3%BAblica_de_Guatemala_(Decreto_Ley_6-91))
- [Deloitte, criterio SAT 04-2025 sobre auditoría obligatoria](https://www.deloitte.com/latam/es/services/tax/perspectives/gt-13ene26-auditoria-obligatoria-agentes-iva-guatemala.html)
- [Living in Guatemala, habilitación de libros (secundaria)](https://livinginguatemala.com/es/tramites/habilitacion-libros/)
- [Prensa Libre, FEL y registros contables electrónicos](https://www.prensalibre.com/opinion/columnasdiarias/fel-y-registros-contables-electronicos/)
- [Prensa Libre, error al autorizar libros contables](https://www.prensalibre.com/opinion/columnasdiarias/error-al-autorizar-libros-contables/)
- [Prensa Libre, reserva legal](https://www.prensalibre.com/?p=16067681)
- [IFRS, NIIF para las Pymes, tercera edición](https://www.ifrs.org/content/dam/ifrs/shop/main/2025/spanish/es-ifrs-for-smes-a4-one-pager.pdf)
- [KPMG, actualización de la NIIF para las Pymes](https://kpmg.com/cl/es/home/insights/2025/09/informativo-de-auditoria/actualizacion-niif-para-pymes.html)
- [Forvis Mazars, Sección 29](https://www.forvismazars.com/uy/en/insights/our-publications/tax/seccion-29-de-la-niif-para-pymes)
