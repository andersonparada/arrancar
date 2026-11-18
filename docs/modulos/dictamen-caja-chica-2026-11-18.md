# Dictamen: Caja chica y Cuentas por liquidar — contador-guatemala, 2026-11-18

Investigación de `contador-guatemala` (Opus) del **2026-11-18**, guardada tal cual por el arquitecto de datos. No había
un diseño que validar: es la investigación de base. La usa `diseno-caja-chica-y-cuentas-por-liquidar.md`, que marca lo
que quedó dudoso y lo que se debe validar.

---

# Caja chica (fondo fijo) y Cuentas por liquidar en Guatemala: investigación del contador

Solo investigué. No escribí archivos.

## 0. Contexto revisado en el repositorio

| Documento | Lo que importa aquí |
|---|---|
| `/home/aparada/proyectos/arrancar/docs/modulos/libro-de-compras.md` | Caja chica y Cuentas por liquidar ya son **destinos** de Libro de compras. Las retenciones se fijan al registrar. La factura especial **no** entra en esta versión. |
| `/home/aparada/proyectos/arrancar/docs/modulos/diseno-cp4-pagos-en-efectivo.md` (§9) | El retiro de efectivo de CP4 «es una cuenta por liquidar acotada a proveedores». Deja abierto si Caja chica lo **absorbe** o convive con él. Decisiones ya tomadas: no negociable, nunca al portador, faltante con motivo, aviso a fin de mes, bancarización según el régimen. |
| `/home/aparada/proyectos/arrancar/docs/modulos/dictamen-cp2-cp3-2026-11-08.md` y `dictamen-pendientes-libro-de-compras-2026-11-08.md` | Ya verificaron, y aquí se reutilizan: bancarización (Decreto 20-2006 arts. 20 y 21), mínimo de Q2,500 de las retenciones (AG 5-2013 art. 49; AG 213-2013 art. 35) y el 5 % al pequeño contribuyente (Ley del IVA art. 48). |

**Límite de esta investigación:** los PDF oficiales (CENADOJ/ICNL) no se pudieron leer con mis herramientas. Donde no hay texto literal lo digo y bajo la certeza. Antes de poner algo en la ayuda del sistema hay que cotejarlo con el texto vigente.

## 1. Lo que dice la ley

| # | Tema | Regla | Fuente | Certeza |
|---|---|---|---|---|
| L1 | Bancarización | Los pagos que respaldan costos y gastos deducibles, crédito fiscal y demás egresos con efectos tributarios, **a partir de Q30,000**, deben hacerse «por cualquier medio distinto al dinero en efectivo, en el que se individualice a quien venda los bienes o preste los servicios». El umbral bajó de Q50,000 a Q30,000 con el Decreto 4-2012 art. 27. Si no se cumple, la SAT no reconoce el costo ni el crédito (art. 21). | Decreto 20-2006 art. 20 (transcrito en [Termómetro Fiscal](https://www.termometrofiscal.com/post/la-papeleta-de-dep%C3%B3sito-es-bancarizaci%C3%B3n-en-materia-tributaria)); reforma: [IURISTEC](https://iuristec.com.gt/index.php?title=Articulo:0010) | Alta (art. 20); media (art. 21) |
| L2 | Pagos partidos | Según Deloitte, varios pagos al **mismo proveedor** que en un **mes calendario** suman Q30,000 cuentan como una sola operación. | [Deloitte Tax Alert 21-21](https://www.deloitte.com/content/dam/Deloitte/gt/Documents/tax/notas-fiscales/Tax%20Alert%2021-21.pdf), Criterio SAT 5-2021 | Media |
| L3 | Crédito fiscal | La factura debe estar **a nombre del contribuyente, con su NIT**, registrada en el Libro de compras y dentro del plazo. Las siglas CF solo caben en ventas de menos de Q2,500 (Q500 en servicios básicos). Una factura a CF **no da crédito** a la empresa. | Ley del IVA art. 18; Reglamento del IVA art. 30 num. 9 (reformado por AG 245-2022, vigente desde el 15-01-2023): [Prensa Libre](https://www.prensalibre.com/opinion/columnasdiarias/limites-de-facturas-a-cf-y-la-excepcion/), [Prensa Libre, «Las facturas del gasto»](https://www.prensalibre.com/economia/las-facturas-del-gasto/) | Media-alta |
| L4 | Pequeño contribuyente | Su factura no da crédito fiscal al comprador; sí respalda el gasto. Un agente de retención del IVA le retiene el 5 % si la factura pasa de Q2,500. | Ley del IVA art. 48; AG 5-2013 art. 49 (ya verificado en el repositorio) | Media-alta |
| L5 | Retención del ISR al régimen opcional simplificado | 5 % (7 % sobre lo que pasa de Q30,000). No se retiene si la base es menor de Q2,500 **sin IVA**. | Decreto 10-2012 arts. 47 y 48; AG 213-2013 art. 35 (ya verificado) | Media-alta |
| L6 | Viáticos deducibles | Se deducen los viáticos **comprobables** de gastos dentro o fuera del país. En Guatemala se comprueban con la factura del proveedor o, si no se puede, con **factura especial** que el patrono emite al empleado. En el exterior además se pide: hoja del pasaporte o constancia migratoria, documento del motivo del viaje, boletos y documento de pago del viático. Hay un **tope del 3 % de la renta bruta**: lo confirmé en fuentes secundarias, pero falta cotejar en el texto si cubre todos los viáticos o solo los del exterior. | Decreto 10-2012 art. 21 num. 24; AG 213-2013 art. 21: [La Hora (2018)](https://lahora.gt/opinion/wpcomvip/2018/05/21/los-viaticos-como-documentarlos-para-efectos-tributarios/), [Prensa Libre (2017)](https://www.prensalibre.com/?p=391062) | Media (art. 21 num. 24 y reglamento); baja-media (alcance del 3 %) |
| L7 | Viáticos no comprobados | Son **renta del trabajo gravada** del empleado: «viáticos no sujetos a liquidación» y lo que no sea reintegro de gastos. El patrono los suma a la proyección y retiene ISR. | Decreto 10-2012, rentas del trabajo (art. 68 y siguientes; el número exacto está por confirmar): [Prensa Libre (2015)](https://www.prensalibre.com/?p=290657), [Deloitte, seminario](https://www2.deloitte.com/content/dam/Deloitte/gt/Documents/tax/event/Presentaci%C3%B3n%20Seminario%20Temas%20Migratorios.pdf) | Media |
| L8 | Plazo para liquidar viáticos | **La ley no fija un plazo** a las empresas privadas. Los plazos de los reglamentos públicos (AG 397-98, AG 106-2016) son solo del Estado. | [MAGA, AG 397-98](https://apps.maga.gob.gt/Normativas/Normativas/Download/450); [MCD, manual 2022](https://mcd.gob.gt/wp-content/uploads/2023/03/5.-Manual-NYP-VIATICOS-INTERIOR-Y-EXTERIOR-2022.pdf) | Media-alta (que no hay plazo para privados) |
| L9 | Cobrar al empleado un anticipo o un faltante | Los anticipos **no devengan intereses**. Las deudas por anticipos, pagos en exceso o responsabilidades civiles del trabajo se descuentan en **mínimo 5 períodos de pago**, salvo que el trabajador pague antes por su voluntad. Al terminar el contrato se cobra en la liquidación definitiva. No se puede descontar sin base legal. | Código de Trabajo art. 99: [Living in Guatemala](https://livinginguatemala.com/es/tramites/embargo-de-salario-guatemala/), [Guía del trabajador](https://investguatemala.com/wp-content/uploads/2024/01/guia-para-el-trabajador-final-mayo23-2.pdf) | Media-alta |
| L10 | Gasto sin factura (parqueo informal, propina, bus) | No es deducible ni da crédito. Va fuera del Libro de compras. | Decreto 10-2012 arts. 22–23 (requisito de documentar); sin cita literal | Media |
| L11 | Faltante como pérdida deducible | Solo si está comprobado (en la práctica, con denuncia si fue robo). Si no, es cuenta por cobrar o gasto no deducible. | Decreto 10-2012 art. 21 (numeral de pérdidas por delitos contra el patrimonio; número exacto por confirmar) | Media-baja |

## 2. Buena práctica (no es ley)

| Tema | Práctica | Fuente |
|---|---|---|
| Fondo fijo y fondo fluctuante | **Fijo:** monto fijo a cargo de un custodio. El gasto se reconoce al **reponer** y se repone exactamente lo gastado. Siempre se cumple: efectivo + comprobantes = monto del fondo. **Fluctuante:** cada entrega y cada gasto se registran al momento; el saldo varía y no hay monto que cuadrar. En la práctica se usa el **fijo** (control interno) y se recomienda. | Práctica de auditoría; reglamento interno de la [UVG](https://res.cloudinary.com/webuvg/image/upload/v1558043900/procesos/Politicas%20generales/descargas/5._Reglamento_Caja_Chica_v2.pdf) e [INTECAP](https://intecap.edu.gt/legislacion/files/normativos/Normativo%20Fondos%20Rotativos%20y%20Cajas%20Chicas%20VF.pdf) |
| Tope por comprobante | Política interna de cada empresa (p. ej., el INAP usa Q2,000 en 2026). Muy por debajo de Q30,000. | [INAP, Circular DF 01-2026](https://intranet.inap.gob.gt/wp-content/uploads/2026/02/CIRCULAR-DF-01-2026.pdf) |
| Gastos pendientes al cierre | Al cierre de mes o de año, los gastos sin reponer se registran igual (base de acumulación, NIIF para las Pymes 2.36). La caja chica es efectivo (Sección 7). | [IFRS, NIIF para las Pymes](https://www.ifrs.org/issued-standards/ifrs-for-smes/) |
| Arqueo | Por sorpresa, lo hace alguien que **no** es el custodio. Se anota el conteo por denominación, los comprobantes, los vales y la diferencia. El acta la firman los dos. | Práctica de auditoría |
| Vale provisional | Efectivo que se da desde la caja para una compra. Se liquida en pocos días y en el arqueo cuenta como comprobante pendiente. Un vale viejo es señal de alerta. | Práctica de auditoría |
| Separar funciones | Quien custodia no aprueba su propia reposición ni hace su propio arqueo. | Práctica de auditoría (igual que E-8 del diseño de pagos en efectivo de CP4) |
| ERP | Odoo trata los gastos del empleado con informe, aprobación y reembolso (con o sin nómina). SAP usa un diario de caja aparte. Ninguno registra el gasto de un anticipo sin liquidación. | [Odoo, Gastos](https://www.odoo.com/documentation/18.0/es/applications/finance/expenses.html) |

## 3. Correcciones a ideas comunes (y riesgos para el diseño)

| # | Idea | Qué está mal y por qué | Forma correcta |
|---|---|---|---|
| C1 | «Si la reposición es un cheque, la caja chica ya está bancarizada.» | **Incorrecto.** El art. 20 exige un medio que **individualice al vendedor**. Un cheque al custodio no individualiza a nadie. Lo que se mide es cada pago en efectivo al proveedor. | Medir la bancarización por proveedor y por mes. Sumar caja chica, retiros de CP4 y efectivo. Aplicar la misma regla de CP4-E-d (bloqueo condicionado al régimen y permiso con motivo). |
| C2 | «El IVA de la caja chica se toma cuando se repone.» | **Incorrecto.** El crédito sigue el período de la factura en el Libro de compras (fecha de emisión y plazo). Reponer no cambia nada fiscal. | La factura se registra en Libro de compras **al recibirla** (o a más tardar al cierre del mes), con destino Caja chica. La reposición solo junta documentos ya registrados. |
| C3 | «El gasto de caja chica nace al reponer.» | Para el control interno, el fondo fijo funciona así. Para los estados financieros, no: al cierre hay que reconocer los gastos pendientes. | Un reporte o una «liquidación de corte» a fin de mes. Lo pendiente sale como gasto del período aunque la reposición sea después. |
| C4 | «La caja chica puede pagar cualquier factura.» | Si la empresa es agente y la factura lleva retención (IVA o ISR), el custodio tendría que pagar el neto y la empresa emitir la constancia y enterar. Eso casi nunca pasa bien en caja. Además, una factura que ya está en Cuentas por pagar no se puede pagar también por caja (doble pago). | Destino único por documento (Libro de compras ya lo exige). Propongo opciones en P3. |
| C5 | «El anticipo al empleado es un gasto.» | **Incorrecto.** Es una **cuenta por cobrar** (activo) hasta que se liquida con documentos. | Gasto solo por lo liquidado con documentos. El resto se cobra o se vuelve renta gravada del empleado. |
| C6 | «El empleado pide la factura a su NIT o a CF y la empresa la deduce.» | **Incorrecto.** Sin el NIT de la empresa no hay crédito (Ley del IVA art. 18), y la deducción del ISR se debilita. | Aviso al liquidar: el NIT del receptor debe ser el de la empresa (Libro de compras ya rechaza un NIT de emisor que no coincide; faltaría el del receptor). |
| C7 | «Lo que no liquida el empleado se le descuenta de una vez del sueldo.» | Va contra el Código de Trabajo art. 99: mínimo 5 períodos, salvo que el trabajador acepte pagar antes. | Tres salidas: devolución (depósito), descuento en cuotas con su autorización, o renta gravada del trabajo (ISR en planilla). Cuál se usa lo decide el usuario. |
| C8 | «Anticipo a un tercero: el tercero compra a su nombre y nos pasa las facturas.» | Las facturas a nombre del tercero **no** dan crédito ni deducción a la empresa. | Que el tercero compre a nombre de la empresa, o que facture él a la empresa (reembolso por mandato, con su IVA). |
| C9 | «Usemos factura especial para los viáticos sin factura.» | Es legal (AG 213-2013 art. 21), pero ese documento **no existe aún** en Arrancar: llega con Factura electrónica. | Por ahora, el gasto sin documento queda como no deducible o como renta del empleado. Cuando llegue Factura electrónica, se agrega. |
| C10 | «Un faltante es un gasto deducible.» | Solo si está comprobado (L11). | Al registrarlo se elige si se cobra al custodio (cuenta por cobrar, con L9) o es una pérdida. La cuenta contable la decide Contabilidad, igual que en CP4-E-g. |

## 4. Cómo encaja con Bancos, CP4 y Libro de compras

| Hecho | Bancos | Libro de compras | Flujo de efectivo |
|---|---|---|---|
| Crear el fondo | Cheque (no negociable, al custodio) o nota de débito con origen = el fondo | — | Sin flujo («Fondo de caja chica», ya previsto en `bancos.md`) |
| Gasto con factura | — | Documento con destino Caja chica (crédito y retenciones según sus reglas) | Ninguno hasta reponer |
| Gasto sin factura (vale de gasto) | — | **No** va al libro: no deducible | Ninguno hasta reponer |
| Vale provisional | — | — | Ninguno (efectivo en otra bolsa) |
| Reposición | Cheque o nota al custodio por lo gastado, con desglose por concepto de cada gasto | Marca los documentos como repuestos (no los cambia) | Operación o Inversión según el concepto de cada línea |
| Arqueo con faltante o sobrante | Ajuste en la caja; si se cobra al custodio, cuenta por cobrar | — | Faltante: flujo de Operación (igual que CP4-E-g). Sobrante: otro ingreso |
| Cerrar o rebajar el fondo | Depósito (nota de crédito con origen) | — | Sin flujo |
| Anticipo (cuenta por liquidar) | Cheque, nota o transferencia a la persona | — | Sin flujo al entregarlo; flujo al liquidar con documentos |
| Liquidar el anticipo | Depósito de lo que sobra, o un pago al empleado si gastó de más | Documentos con destino Cuentas por liquidar | Según el concepto de cada documento |

**Sobre el retiro de CP4 (§9 de su diseño):** recomiendo **mantenerlo en Cuentas por pagar**. Ese retiro paga pasivos ya provisionados, con contraseña y recibo. Caja chica paga gastos menores sin provisión. Cuentas por liquidar le da a una **persona** dinero que debe justificar. Son tres cosas contables distintas.

Que Caja chica absorba el retiro mezclaría el pasivo provisionado con el gasto directo. Lo único que conviene compartir es la **regla de bancarización por proveedor y mes**, que sume los tres orígenes.

## 5. Datos que describiría al agente arquitecto-de-datos (sin migraciones)

- **Fondo:** empresa, nombre o localidad, custodio (texto y usuario opcional), tipo (`fijo` o `fluctuante`), monto autorizado, tope por comprobante y estado. Solo un custodio vigente por fondo, con historial de cambios.
- **Comprobantes del fondo:** documento de Libro de compras **o** vale de gasto (sin documento fiscal, con motivo) **o** vale provisional, más su estado (pendiente o repuesto).
- **Reposición:** agrupa comprobantes y ordena a Bancos el cheque o la nota, con el desglose de conceptos.
- **Arqueo:** fecha, quién lo hace (debe ser distinto del custodio), conteo, comprobantes y diferencia. Si hay diferencia, se ajusta con motivo, con auditoría y con su destino (cobrar o pérdida).
- **Anticipo por liquidar:** tercero (empleado u otro), motivo (viático u otro), monto, forma de entrega, fecha límite (política interna, configurable) y estado.
- **Liquidación del anticipo:** líneas de documentos del libro, gastos sin factura, devolución, descuento en planilla o renta gravada. Lista de anticipos abiertos con **fecha de corte** y antigüedad.
- **Configuración por empresa:** tope por comprobante (sugiero un predeterminado por debajo de Q2,500, para que casi nunca nazca una retención), plazo de liquidación y si se permiten gastos sin factura.
- **Configuración de instalación:** el umbral de bancarización ya existe (`cuentas-por-pagar.bancarizacion.umbral`). Conviene subirlo a Libro de compras o al core para que lo usen los tres módulos.

## 6. Preguntas para el usuario

| # | Pregunta | Opciones | Mi recomendación |
|---|---|---|---|
| P1 | Tipo de fondo | A. Solo fijo. B. Fijo y fluctuante. | **A** para empezar (es lo que hace casi todo el mundo y se arquea). B se puede agregar después. |
| P2 | ¿Un fondo por localidad o finca, varios por empresa? | Sí / No | **Sí** (ya está en `plan-hallazgos-contables.md`). |
| P3 | Factura con retención que va a caja chica | A. Bloquear y mandarla a Cuentas por pagar. B. Permitirla: se paga el neto y la retención queda por enterar. C. Solo aviso. | **A**, con permiso de excepción. Con el tope por comprobante casi nunca se da. |
| P4 | Gastos sin factura (vale de gasto) | Permitir / No permitir | **Permitir**, marcados como no deducibles, con motivo y un tope configurable. |
| P5 | Anticipo no liquidado al vencer el plazo | Aviso solo / aviso más bloqueo de nuevos anticipos a esa persona | **Aviso**, más bloqueo **configurable** de nuevos anticipos a quien tiene vencidos. |
| P6 | Salida de lo no liquidado | Devolución / descuento en cuotas / renta gravada | Ofrecer las tres. Las dos últimas se registran aquí y Planilla las ejecuta cuando exista. |
| P7 | ¿Cuentas por liquidar sirve también a terceros que no son empleados? | Sí / No | **Sí**, con aviso de que las facturas deben estar a nombre de la empresa (C8). |
| P8 | ¿El retiro de CP4 se queda en Cuentas por pagar? | Se queda / Caja chica lo absorbe | **Se queda** (sección 4). Solo se comparte la regla de bancarización. |
| P9 | Arqueo | Obligatorio con frecuencia configurable / opcional | Opcional, con aviso si no hay arqueo en N días (configurable). |

## 7. Pendiente de verificar en texto oficial (antes de ponerlo en las ayudas)

1. El alcance del tope del 3 % en el Decreto 10-2012 art. 21 num. 24.
2. El número exacto del artículo de rentas del trabajo sobre «viáticos no sujetos a liquidación».
3. El numeral de pérdidas por delitos contra el patrimonio del art. 21.
4. El texto literal del Decreto 20-2006 art. 21 y del Criterio SAT 5-2021 sobre pagos partidos.
5. El texto literal del AG 213-2013 art. 21.

## Veredicto

No había un diseño que validar: esto es investigación. El planteamiento de la hoja de ruta es **correcto con ajustes**:

- Separar Caja chica (fondo fijo), Cuentas por liquidar (anticipo a una persona) y el retiro de CP4.
- Tomar el crédito fiscal por el período de la factura, no por la fecha de reposición.
- Medir la bancarización por proveedor y por mes, sumando todos los orígenes de efectivo.
- Bloquear las retenciones en caja chica.
- Tratar lo no liquidado según el Código de Trabajo art. 99 o como renta gravada del trabajo.

## Fuentes

- [Termómetro Fiscal, Decreto 20-2006 art. 20](https://www.termometrofiscal.com/post/la-papeleta-de-dep%C3%B3sito-es-bancarizaci%C3%B3n-en-materia-tributaria)
- [IURISTEC, reforma del Decreto 4-2012 art. 27](https://iuristec.com.gt/index.php?title=Articulo:0010)
- [Deloitte Tax Alert 21-21](https://www.deloitte.com/content/dam/Deloitte/gt/Documents/tax/notas-fiscales/Tax%20Alert%2021-21.pdf)
- [La Hora, viáticos (2018)](https://lahora.gt/opinion/wpcomvip/2018/05/21/los-viaticos-como-documentarlos-para-efectos-tributarios/)
- [Prensa Libre, tratamiento fiscal de viáticos (2017)](https://www.prensalibre.com/?p=391062)
- [Prensa Libre, rentas exentas de empleados (2015)](https://www.prensalibre.com/?p=290657)
- [Prensa Libre, límites de facturas a CF (2022)](https://www.prensalibre.com/opinion/columnasdiarias/limites-de-facturas-a-cf-y-la-excepcion/)
- [Prensa Libre, las facturas del gasto](https://www.prensalibre.com/economia/las-facturas-del-gasto/)
- [Deloitte, seminario de temas migratorios](https://www2.deloitte.com/content/dam/Deloitte/gt/Documents/tax/event/Presentaci%C3%B3n%20Seminario%20Temas%20Migratorios.pdf)
- [Living in Guatemala, Código de Trabajo art. 99](https://livinginguatemala.com/es/tramites/embargo-de-salario-guatemala/)
- [Guía del trabajador](https://investguatemala.com/wp-content/uploads/2024/01/guia-para-el-trabajador-final-mayo23-2.pdf)
- [MAGA, AG 397-98](https://apps.maga.gob.gt/Normativas/Normativas/Download/450)
- [Ministerio de Cultura y Deportes, manual de viáticos 2022](https://mcd.gob.gt/wp-content/uploads/2023/03/5.-Manual-NYP-VIATICOS-INTERIOR-Y-EXTERIOR-2022.pdf)
- [UVG, reglamento de caja chica](https://res.cloudinary.com/webuvg/image/upload/v1558043900/procesos/Politicas%20generales/descargas/5._Reglamento_Caja_Chica_v2.pdf)
- [INTECAP, normativo de fondos rotativos y cajas chicas](https://intecap.edu.gt/legislacion/files/normativos/Normativo%20Fondos%20Rotativos%20y%20Cajas%20Chicas%20VF.pdf)
- [INAP, Circular DF 01-2026](https://intranet.inap.gob.gt/wp-content/uploads/2026/02/CIRCULAR-DF-01-2026.pdf)
- [IFRS, NIIF para las Pymes](https://www.ifrs.org/issued-standards/ifrs-for-smes/)
- [Odoo, Gastos](https://www.odoo.com/documentation/18.0/es/applications/finance/expenses.html)
- [Decreto 10-2012 (ICNL)](https://www.icnl.org/wp-content/uploads/leydeacttrib.pdf)
