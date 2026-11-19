# Dictamen: puntos V-1 a V-7 de `diseno-contabilidad.md` y revisión de CT-P1 a CT-P18

_Contador-guatemala, 2026-11-19. Documento revisado: `/home/aparada/proyectos/arrancar/docs/modulos/diseno-contabilidad.md` (main). Base anterior: `/home/aparada/proyectos/arrancar/docs/modulos/dictamen-contabilidad-2026-11-18.md`. Marcas: **[Ley]** lo que dice la norma, **[Norma]** NIIF para las Pymes, **[Práctica]** práctica profesional o de ERP, **[Opinión]** criterio mío._

## 0. Resumen

| # | Punto | Dictamen |
|---|---|---|
| V-1 | Saldos iniciales por la pregunta y no como hechos | **Correcto**, con un ajuste menor (orden de la apertura en el Diario) |
| V-2 | Transitoria «Documentos por asignar» | **Correcto con ajustes**: falta decir hacia dónde va la partida al asignar, cómo se presenta al cierre y cómo se controla la antigüedad |
| V-3 | Sin estado «futuro»: meses abiertos y manuales sin fecha futura | **Correcto** |
| V-4 | `correccion_de_error` contra «Ajustes de ejercicios anteriores» por omisión | **Corregir**: debe ir a una transitoria que el contador regularice. Corrijo también mi dictamen anterior (§144) |
| V-5 | Anulación por `error_de_captura` en un período cerrado: reversa sin veto | **Correcto con ajustes**: falta tratar el IVA ya declarado y el gasto de un ejercicio ya cerrado |
| V-6 | C. Com. arts. 36 y 374 a 382, C. Trib. art. 112, habilitación | **Verificado casi todo**, con cuatro ajustes de diseño. **Pendiente**: el texto oficial del art. 382 y el canal vigente de la habilitación (no bloquea CT-10) |
| V-7 | Rubros de §5.2 y plantilla base de 5 niveles | **Corregir la lista** (faltan rubros). La plantilla de cuentas queda **pendiente**: debo entregarla antes de CT-1 |

En las recomendaciones aceptadas (CT-P1 a CT-P18) no hay ningún error que obligue a cambiar una decisión. Sí hay **matices en CT-P6, CT-P9, CT-P14 y CT-P16**. Encontré además **tres errores en el resto del diseño** (§3 de este dictamen): un check de `periodos` mal formulado, la regla de la nota de crédito, que depende del régimen, y el ISR retenido sobre intereses, que se trataría como un activo.

**Veredicto general: correcto con ajustes** (lista en §5).

---

## 1. Validación de cada V

### V-1. Saldos iniciales por la pregunta `saldos_de_auxiliares`: **correcto**

| Aspecto | Análisis |
|---|---|
| Qué pide la ley | Balance general y estado de pérdidas y ganancias **al iniciar operaciones** y al menos una vez al año, firmados por el comerciante y el contador [Ley, C. Com. art. 374]. El Libro de Estados Financieros contiene el **balance de apertura** [Ley, art. 377]. El Libro de Inventarios lleva el inventario inicial detallado [Ley, art. 368; Práctica] |
| ¿Lo cumple el diseño? | Sí. Una partida de apertura del contador más una por módulo contra la puente, con el detalle por tercero, cuenta bancaria, etc., da el inventario inicial detallado y deja el mayor igual a los auxiliares. Que no haya «evento de saldo inicial» no cambia nada en la contabilidad: el asiento final es el mismo y no quedan partidas de ida y vuelta mientras la carga está abierta (art. 373: sin alteraciones) |
| Riesgo | Si las aperturas por módulo se arman al cerrar la carga (caso a), pueden recibir un número mayor que el de partidas automáticas creadas antes con la misma fecha de inicio |
| Ajuste (menor) | En el Diario y en el Libro de Inventarios, las partidas de tipo `apertura` van **primero** en su fecha, aunque su número sea mayor (orden: fecha, luego tipo apertura, luego número). Es mejor todavía que la apertura reciba los primeros números del ejercicio (ver la pregunta P-3) |

### V-2. Transitoria «Documentos por asignar»: **correcto con ajustes**

| Aspecto | Análisis |
|---|---|
| Fundamento | Base de acumulación o devengo [Norma, NIIF Pymes 2.36]: el gasto y el IVA quedan en el mes de la fecha de efecto, aunque el documento todavía no tenga fondo. El crédito fiscal sigue al período del libro, que no cambia |
| Qué falta precisar | §7, fila «Caja chica…», dice «R(caja_chica, fondo) contra R(documentos_por_asignar)» sin decir cuál va al Debe y cuál al Haber. Lo correcto: **al asignar, Debe Documentos por asignar / Haber Caja chica (fondo)**, o Haber Anticipos por liquidar si va a Cuentas por liquidar. La reposición hace después Debe Caja chica / Haber Bancos. Con esto el mayor de Caja chica queda igual al efectivo del arqueo, que es lo que se busca: no es el sistema clásico de fondo fijo, donde el gasto se reconoce al reponer, sino el reconocimiento al asignar que el usuario aceptó en CT-P17 |
| Presentación | Al cierre, la transitoria tiene saldo acreedor por lo gastado del fondo que aún no se asignó. En el balance no debe salir como un pasivo frente a terceros, porque no lo es: se **resta** de Caja chica o de Anticipos. Con la lista de §5.2, dele a la cuenta el rubro `efectivo` (o `cuentas_por_cobrar` si la mayor parte son anticipos) y que el balance la presente neta |
| Control | En el cierre mensual, una cuadratura más: el saldo de la transitoria contra la bandeja de documentos sin asignar de Caja chica y Cuentas por liquidar (`pide_motivo`), y un aviso para los documentos con más de 30 días sin asignar [Práctica] |

### V-3. Sin período «futuro»: **correcto**

Un mes futuro que existe abierto y recibe solo partidas automáticas (cheque posfechado en su fecha) más la regla «manuales sin fecha futura» tiene el mismo efecto que el estado «futuro» que yo había propuesto. Los reportes con fecha de corte excluyen solos lo posterior. No le veo ningún riesgo legal: el art. 373 se cumple porque nada entra en un período cerrado. Retiro mi propuesta del estado «futuro».

### V-4. `correccion_de_error` del pago contra «Ajustes de ejercicios anteriores»: **corregir**

| Aspecto | Análisis |
|---|---|
| Qué es el caso | Un saldo inicial de proveedor que se cancela «contra la cuenta de apertura» **después** de cerrar la carga (`diseno-cp4-pagos.md` §2.3). Quiere decir que el balance de apertura estaba mal |
| Por qué está mal por omisión | NIIF Pymes 10.19–10.23 [Norma] reexpresa contra resultados acumulados solo los errores **materiales de ejercicios anteriores**. Si la fecha de inicio contable cae a mitad de año (caso b), el error puede venir del mismo ejercicio y va contra el resultado del año. Además, la contrapartida depende de la causa, que el sistema no conoce: (i) el pasivo nunca existió o ya estaba pagado antes del inicio: corrección de error (patrimonio, o resultado si es del año o no es material); (ii) el proveedor condonó la deuda: **ingreso gravado** del año. Mandarlo siempre a patrimonio sin revisión puede esconder un ingreso gravable, y nadie revisa ese saldo porque una cuenta de patrimonio no tiene cuadratura |
| Corrijo mi dictamen anterior | En el dictamen del 2026-11-18 (§4.1, fila «Pago (`correccion_de_error`)») sugerí «ajustes de ejercicios anteriores». Fue impreciso: esa cuenta es solo una de las posibles |
| Cómo se corrige | Por omisión, un rol transitorio nuevo, **`apertura_por_regularizar`** (o reusar `saldos_por_regularizar`), de balance. En el cierre mensual, un hallazgo `pide_motivo` mientras tenga saldo, y en el cierre anual un **bloqueo suave**: no se cierra el período 13 con saldo, salvo con motivo. El contador lo reclasifica con una partida `correccion` o `ajuste`. Así el hecho no queda con error y la decisión queda en manos de quien sabe la causa |

### V-5. Anulación por `error_de_captura` en un período cerrado: **correcto con ajustes**

| Aspecto | Análisis |
|---|---|
| La regla base | Correcta: el error se corrige al descubrirlo, con un asiento que lo explique, sin tocar lo cerrado [Ley, C. Com. art. 373]. Un error no material va al período corriente [Norma, 10.21]. No conviene vetar: frenaría la corrección del libro de compras |
| Hueco 1: IVA ya declarado | Si `periodoDeclarado = true`, el crédito del documento anulado ya se usó en una declaración presentada, y la corrección fiscal es **rectificar esa declaración** (SAT-2237 rectificativa, con el impuesto, los intereses y la multa del período original) [Práctica; régimen de rectificación del Código Tributario]. Si la reversa acredita «IVA crédito fiscal» en el mes corriente, el mayor de esa cuenta deja de cuadrar con el crédito de la declaración del mes. **Ajuste**: con `periodoDeclarado = true`, la línea de IVA de la reversa va a un rol nuevo, **`iva_por_rectificar`** (pasivo, rubro `impuestos_por_pagar`), que se salda al pagar la rectificativa |
| Hueco 2: gasto de un ejercicio cerrado | Si la partida original es de un ejercicio con el período 13 cerrado, reversar el gasto en el año corriente reduce el gasto de **este** año, pero el gasto mal deducido era del año anterior y se corrige rectificando el ISR anual de ese año. Quedaría un efecto doble. **Ajuste**: si el ejercicio original está cerrado, las líneas de resultados de la reversa van a `ajustes_de_ejercicios_anteriores`. Aquí el destino por omisión sí es correcto, a diferencia de V-4, porque la causa y el ejercicio se conocen. El hecho sale marcado en el cierre para que el contador lo confirme (materialidad, 10.21) |
| Igual para | `no_corresponde_a_la_empresa` |

### V-6. Artículos por verificar: **verificado casi todo; pendiente lo que no se pudo leer en el texto oficial**

| Norma | Qué dice (resumen) | Efecto en el diseño | Estado |
|---|---|---|---|
| C. Com. art. 36 [Ley] | Toda sociedad separa al menos el **5 %** de su utilidad neta anual para la reserva legal; el art. 37 la hace indistribuible hasta la liquidación | §3.8 punto 5 está bien: partida manual al aprobarse la distribución. Rol `reserva_legal` correcto | Verificado (fuente secundaria que cita el texto; hay una reforma del cálculo sobre el capital pagado cuya vigencia no confirmé) |
| Art. 374 [Ley] | Balance general y estado de pérdidas y ganancias al iniciar y al menos una vez al año, **firmados por el comerciante y el contador** | **Ajuste**: la impresión del Libro de Estados Financieros y del de Inventarios lleva espacios de firma del propietario o representante legal y del contador (nombre y número de registro) | Verificado |
| Art. 375 [Ley] | **Prohibido llevar más de una contabilidad** para la misma empresa; ninguna hace prueba | Confirma que la depreciación fiscal quede fuera del mayor (§3.5 de Activos fijos) y limita CT-P9 (ver §2) | Verificado |
| Art. 376 [Ley] | Los libros se conservan mientras dure la empresa y hasta su liquidación | Confirma que `core.registro_de_eventos` y la auditoría permanente no se depuren | Verificado |
| Art. 377 [Ley] | El Libro de Estados Financieros contiene el balance de apertura, los balances ordinarios y extraordinarios, los estados de pérdidas y ganancias y los demás que se quieran | Bien cubierto en §12 | Verificado |
| Art. 378 [Ley] | Libros auxiliares, los que el comerciante quiera | Es la base del Diario resumido de CT-P14 | Verificado |
| Art. 379 [Ley] | El balance expresa de forma veraz y razonable la situación financiera | — | Verificado |
| Art. 380 [Ley] | Las sociedades publican su balance al cierre, según otras leyes | Fuera del módulo | Verificado (fuente secundaria) |
| Art. 381 [Ley] | **Toda operación contable** se respalda con documentos fehacientes. Solo se exceptúan los ajustes, traslados de saldos, pases entre libros y rectificaciones | **Ajuste**: en las partidas manuales de tipo `diario`, el respaldo o al menos una referencia al documento debe ser **obligatorio**. En `ajuste`, `reclasificacion`, `cierre` y `correccion` puede ser opcional. Hoy es opcional para todas (pregunta P-1) | Verificado (fuente secundaria) |
| Art. 382 [Ley] | Según fuentes secundarias, conservación de la documentación de soporte por **5 años** | Lo cumple la retención de 60 meses de la auditoría; los archivos de respaldo de las partidas no deben borrarse antes | **Pendiente**: texto oficial no leído |
| C. Trib. art. 112 num. 1 a) [Ley] | Llevar los libros y registros de las operaciones con relevancia tributaria | — | Verificado |
| C. Trib. art. 112 «A» [Ley] | Conservar libros, documentos y **sistemas informáticos** mientras no prescriba (4 años, art. 47); permitir la revisión de los registros informáticos (num. 5); rehacer los registros perdidos en **3 meses** (num. 4) | Confirma el registro de eventos y la exportación de los libros en Excel. No piden nada nuevo | Verificado |
| C. Trib. art. 94 num. 4 [Ley] | Multa de **Q5,000** por fiscalización si los libros no están al día. Están al día si las operaciones se asientan en libros **autorizados y habilitados** dentro de los **2 meses calendario** siguientes | **Ajuste (nuevo, importante)**: en «Impresión de libros» y en el inicio del módulo, un aviso cuando el último mes impreso en definitivo tenga más de 2 meses de atraso, y en el cierre un aviso si hay meses abiertos con más de 2 meses de antigüedad. No conviene bloquear: es responsabilidad de la empresa | Verificado |
| C. Trib. art. 94 num. 5 [Ley] | Multa por llevar los libros en forma distinta a la exigida | Es el riesgo de CT-P14 (resumido) | Verificado |
| C. Trib. art. 85 num. 4 [Ley] | Cierre temporal del negocio por no autorizar ni habilitar los libros (reforma del Decreto 19-2013) | Refuerza la idea de guardar el número de habilitación (abajo) | Verificado (el texto publicado aparece cortado) |
| Nombres de los libros [Ley, art. 368; Práctica] | Los nombres legales son **Libro de Inventarios**, **Libro Diario**, **Libro Mayor (o Centralizador)** y **Libro de Estados Financieros**. Usar otros nombres expone a que la SAT considere que no se llevan los libros exigidos | **Corregir**: el rótulo «Inventarios y balances» (§5.9 y §12) es un nombre de otros países. El libro impreso se titula «**Libro de Inventarios**»; su contenido (inventario y balance detallado) está bien | Verificado (columna profesional) |
| Habilitación ante la SAT | Hoy se hace con el formulario **SAT-7121** en Declaraguate (exige usuario de Agencia Virtual), con pago por hoja. La SAT anunció que en 2026 lo pasaría a Agencia Virtual, sin fecha confirmada. Hay contradicción entre las fuentes sobre el reparto entre el Registro Mercantil (art. 372) y la SAT | No cambia el software: el sistema solo imprime sobre hojas ya habilitadas. **Ajuste**: `folios` debe guardar el **número de resolución de habilitación** y el **rango de folios habilitados** (desde y hasta), para avisar cuando se acaben y rotular las hojas | **Pendiente** (no bloquea CT-10): el canal vigente y el fundamento exacto de la habilitación SAT frente a la autorización del Registro Mercantil. Lo confirma el contador de cada empresa |
| Hoja dañada [Práctica; art. 373] | Una hoja habilitada que se daña no se destruye ni se reusa: se marca «ANULADA» y se conserva en su lugar | §5.9 ya lo hace. **Agregar**: al anular una impresión, imprimir la constancia de anulación de esos folios | — |

### V-7. Rubros de estado financiero y plantilla base: **corregir la lista; plantilla pendiente**

Faltan rubros que piden las secciones 4 y 5 de las NIIF para las Pymes o que son comunes en Guatemala:

| Rubro que falta | Por qué | Fuente |
|---|---|---|
| `propiedades_de_inversion` | Terrenos o edificios para rentar (frecuente en fincas) | [Norma] secc. 16; secc. 4.2 |
| `inversiones` (financieras, en asociadas) | Certificados a plazo, acciones | [Norma] secc. 11, 14 y 4.2 |
| `anticipos_a_proveedores` | Hoy caerían en «otros activos». Cuentas por pagar ya los maneja | [Práctica] |
| `beneficios_a_empleados` (pasivo) | Indemnización, aguinaldo, bono 14 y vacaciones por pagar: pasivo laboral propio de Guatemala, aunque Planilla no exista todavía | [Norma] secc. 28; [Ley] Código de Trabajo, Decreto 76-78 (aguinaldo) y Decreto 42-92 (bono 14) |
| `ingresos_diferidos` / `anticipos_de_clientes` | Cobros por adelantado | [Norma] secc. 23 |
| `cuentas_por_pagar_partes_relacionadas` y `cuentas_por_cobrar_partes_relacionadas` | Préstamos de los socios, muy comunes; la sección 33 pide revelarlos | [Norma] secc. 33 |
| `superavit_por_revaluacion` / `otro_resultado_integral` | Si la empresa usa el modelo de revaluación de la propiedad, planta y equipo | [Norma] secc. 17.15B y secc. 5 |
| `aportes_para_futuras_capitalizaciones` | Práctica común en sociedades | [Práctica] |
| `cambio_en_valor_razonable_de_activos_biologicos` (resultados) | Agro con el modelo de valor razonable | [Norma] secc. 34 |
| `costo_de_produccion` (resultados o inventario en proceso) | Para los módulos de rubro | [Práctica] |

Otros ajustes:

| Tema | Ajuste |
|---|---|
| `tratamiento_fiscal` | Agregar `costo_de_renta_exenta`. LAT art. 23 pide llevar en **cuentas separadas** los costos y gastos de las rentas exentas o no afectas, porque no son deducibles [Ley, LAT art. 23; fuente secundaria]. Agregar también `renta_de_capital` para separar los intereses y dividendos, que tributan aparte de las actividades lucrativas [Ley, LAT título IV] |
| Plantilla `9.9.99.99.999` | La máscara está bien y es la práctica guatemalteca (1.1.01.01.001). Queda **pendiente la plantilla con sus cuentas**, que debo entregar en un documento aparte antes de CT-1, con la cuenta sugerida para cada rol de §3.9 |
| NIIF Pymes, tercera edición | El IASB publicó la tercera edición en febrero de 2025, vigente desde el 1 de enero de 2027. Los números de sección que cito no cambian para estos temas (2, 4, 5, 10, 17, 23, 29, 34 y 35). Conviene que los rótulos de los estados digan qué edición se aplica [Norma] |

---

## 2. Revisión de las recomendaciones aceptadas (CT-P1 a CT-P18)

| # | Aceptado | ¿Error contable o fiscal? | Matiz o ajuste |
|---|---|---|---|
| CT-P1 | b) depende de Terceros | No | — |
| CT-P2 | c) registro de eventos + aviso | No | Es lo que pedía el dictamen (no perder hechos) |
| CT-P3 | b) plantillas por régimen | No | Las plantillas cambian **sugerencias de cuentas**, no el marco contable (art. 375) |
| CT-P4 | A) primer día abierto | No | Cuidado entre ejercicios: una factura de diciembre que llega con el ejercicio cerrado cae en enero, y por devengo el gasto era del año anterior [Norma 2.36]. Es de práctica dejar diciembre y el período 13 abiertos hasta el corte de proveedores (enero o febrero). Que la lista de control del cierre anual lo recuerde |
| CT-P5 | c) las dos formas de inicio | No | — |
| CT-P6 | b) puente distinta de cero: pide motivo | No es ilegal, pero **matizo**: firmar el balance de apertura (art. 374) con la puente sin cuadrar deja un balance que no expresa la situación «de forma veraz» (art. 379). **Ajuste**: la carga se cierra con motivo, como se decidió, pero **no se imprime en definitivo el Libro de Inventarios ni el de Estados Financieros** con la puente de apertura distinta de cero |
| CT-P7 | b) proveedores por categoría, opcional | No | — |
| CT-P8 | Decide quien liquida | No | El faltante cargado al custodio es una cuenta por cobrar. Si es pérdida, va a no deducible salvo que se compruebe un delito contra el patrimonio con denuncia (LAT, costos deducibles; artículo por citar en la plantilla). Descontarlo del salario tiene los límites del Código de Trabajo: no es asunto contable, pero vale una nota en la pantalla |
| CT-P9 | Interruptor por empresa, NIIF Pymes por omisión | Sin error, con matiz. La «base fiscal» no es un marco de propósito general; el C. Com. art. 368 pide principios de contabilidad generalmente aceptados, y en Guatemala el Colegio de Contadores adoptó las NIIF y las NIIF para las Pymes. Es aceptable como práctica de muchas pymes, pero: (i) los estados deben decir «preparados sobre base fiscal»; (ii) **un solo marco por empresa y ejercicio**, que cambia solo al inicio de un ejercicio (art. 375; secc. 10 y 35); nunca dos contabilidades en paralelo. Hoy la variable es por empresa sin vigencia: hace falta `vigente_desde` o validar que no cambie con partidas en el ejercicio |
| CT-P10 | Con período 13 | No | — |
| CT-P11 | Reabrir con permiso y motivo; nunca lo definitivo | No | Correcto con el art. 373 |
| CT-P12 | Aprobación opcional; cuentas de control con permiso | No | Ver art. 381 (respaldo obligatorio en `diario`, P-1) |
| CT-P13 | Avisa y pide motivo | No | — |
| CT-P14 | Detallado o resumido mensual, a elegir al imprimir | Sin error, **con riesgo** (C. Trib. art. 94 num. 5) | El resumido mensual por cuenta es práctica aceptada **si** los auxiliares de respaldo (art. 378) se conservan y se pueden imprimir para cada asiento resumido. Ajuste: la impresión resumida debe generar en el mismo acto el auxiliar de detalle como anexo (copia firmada o archivo PDF guardado). Que lo apruebe el contador de cada empresa, como ya dice la recomendación |
| CT-P15 | c) con a) por omisión | No | El crédito del IVA exige la factura (Ley del IVA, crédito fiscal con documento a nombre del contribuyente); la opción a) lo asegura |
| CT-P16 | b) se puede desactivar con aviso | Sin error, con matiz | Mientras está apagado, los libros dejan de estar al día (C. Trib. art. 94 num. 4, plazo de 2 meses). El aviso debe decirlo. Al reactivar, no se debe poder cerrar ningún período nuevo hasta reprocesar lo pendiente |
| CT-P17 | Al asignar, con la transitoria | No | Ver V-2 |
| CT-P18 | Diferido en fase 2 | Sin error | Bajo NIIF Pymes con régimen sobre las utilidades, la sección 29 **sí** exige el diferido. En v1, el riesgo es bajo mientras Activos fijos use «contable = fiscal». Que el cierre anual avise si hay diferencias entre la base contable y la fiscal |

---

## 3. Errores encontrados en el resto del diseño (fuera de las V)

| # | Dónde | Qué está mal | Cómo corregirlo |
|---|---|---|---|
| E-1 | §5.4, check de `periodos` | `(estado = 'definitivo') = (impresion_id is not null or mes = 13)` obliga a que el período 13 sea **siempre** definitivo (aun abierto) e impide marcar definitivos los meses 1 a 12 al cerrar el ejercicio sin imprimir (§3.5) | Para el `arquitecto-de-datos`: `estado <> 'definitivo' or impresion_id is not null or definitivo_por_cierre_de_ejercicio` (columna booleana nueva o un motivo de definitivo `impresion`/`cierre_de_ejercicio`), y `impresion_id is null or estado = 'definitivo'` |
| E-2 | §7, nota de crédito | Mandar la nota a `otros_ingresos` «si la factura es de un año anterior **y la empresa está en el régimen sobre las utilidades**» hace que la contabilidad dependa del régimen fiscal, y la contabilidad no debe cambiar con el régimen (art. 375; NIIF). Además, si la línea fue **activo fijo** (o inventario que todavía se tiene), la rebaja reduce el **costo del activo** y no es un ingreso [Norma, secc. 17.10] | La regla depende de que el **ejercicio de la factura esté cerrado**, sin importar el régimen: las líneas de gasto van a `otros_ingresos` y las de activo fijo a la puente de compras de activos (o al activo). El IVA se rebaja en el período de la nota |
| E-3 | §3.9 y §7, `isr_retenido_en_intereses` | El nombre y la regla («Debe ISR retenido») lo tratan como un activo, un crédito a favor. Los intereses bancarios son rentas de capital, que tributan aparte de las actividades lucrativas con la retención del banco como **pago definitivo**. Esa retención no se acredita contra el ISR de las actividades lucrativas. Es un **gasto de ISR** de rentas de capital, como ya decía mi dictamen anterior (§4.1, «Bancos: intereses») [Ley, LAT título IV; los artículos exactos de la tasa y de la retención definitiva están por citar en la plantilla] | Cambiar el nombre del rol a `isr_sobre_intereses`. En la plantilla, enlazarlo a una cuenta de gasto (rubro `impuesto_sobre_la_renta`, tratamiento `renta_de_capital`). El ingreso por intereses va a `ingresos_financieros` con el tratamiento `renta_de_capital`, para excluirlo de la renta imponible de las actividades lucrativas |
| E-4 | §5.5, numeración | Correcto que sea sin huecos, pero el número se da al contabilizar, así que el Diario ordenado por fecha muestra números fuera de secuencia (R-9). No es ilegal (art. 373 pide orden por fecha), pero las firmas de auditoría lo observan [Opinión/Práctica] | Opción: un **número de Diario** que se da al cerrar el mes, en orden de fecha, además del número interno (pregunta P-3) |

---

## 4. Cambios de datos para el `arquitecto-de-datos` (sin código)

1. Roles nuevos: `apertura_por_regularizar` (V-4) e `iva_por_rectificar` (V-5). Cambio de nombre: `isr_retenido_en_intereses` → `isr_sobre_intereses` (E-3).
2. `cuentas.rubro`: agregar los rubros de la tabla de V-7. `tratamiento_fiscal`: agregar `costo_de_renta_exenta` y `renta_de_capital`.
3. `folios`: `resolucion_de_habilitacion text`, `folio_habilitado_desde integer`, `folio_habilitado_hasta integer` (V-6).
4. Check de `periodos` (E-1).
5. `contabilidad.marco` con vigencia por ejercicio (CT-P9).
6. Si se acepta P-1: el respaldo es obligatorio en las partidas manuales de tipo `diario` (regla de dominio, y del disparador `partida_al_contabilizar` si se quiere en la base).
7. Si se acepta P-3: `partidas.numero_de_diario` asignado al cerrar el mes.
8. Reglas: V-5 (destino según `periodoDeclarado` y ejercicio cerrado) y E-2 (nota de crédito por ejercicio cerrado y por activo).
9. Lista de control del cierre: cuadratura de `documentos_por_asignar` y su antigüedad (V-2), saldo de `apertura_por_regularizar` (V-4), libros con más de 2 meses de atraso (art. 94), puente de apertura distinta de cero bloquea la impresión definitiva del Libro de Inventarios y del de Estados Financieros (CT-P6), y aviso de facturas tardías del ejercicio anterior (CT-P4).
10. Impresión: libro «Libro de Inventarios» (no «Inventarios y balances»), firmas en los estados (art. 374), constancia de la hoja anulada y anexo de auxiliares en el resumido (CT-P14).

## 5. Veredicto

**Correcto con ajustes.** Lo que hay que cambiar antes de programar:
- V-4: transitoria en vez de patrimonio.
- V-5: IVA ya declarado y ejercicio cerrado.
- V-2: dirección y presentación de la transitoria.
- E-1: el check de `periodos`.
- E-2: la nota de crédito no depende del régimen.
- E-3: el ISR sobre intereses es gasto.
- V-6: los nombres legales de los libros, las firmas, los datos de la habilitación y el aviso de los 2 meses.
- V-7: la lista de rubros.

**Pendientes míos**: la plantilla de cuentas (antes de CT-1), el texto oficial del art. 382 y el canal vigente de la habilitación (antes de CT-10), y los artículos exactos de la LAT sobre los intereses (antes de la plantilla).

## 6. Preguntas para el usuario

| # | Pregunta | Opciones | Mi recomendación |
|---|---|---|---|
| P-1 | ¿Respaldo obligatorio en las partidas manuales? | a) Opcional siempre; b) obligatorio en tipo `diario`, opcional en ajustes, reclasificaciones y cierre (art. 381) | **b** |
| P-2 | Corrección de saldos iniciales después de cerrar la carga (V-4) | a) Transitoria `apertura_por_regularizar` que el contador regulariza; b) patrimonio directo | **a** |
| P-3 | Numeración del Diario | a) Solo el número al contabilizar (hoy); b) además, un número de Diario en orden de fecha al cerrar el mes | **b** si las firmas de auditoría de sus clientes lo piden; si no, a |
| P-4 | Puente de apertura distinta de cero | ¿Se acepta que impida imprimir en definitivo el Libro de Inventarios y el de Estados Financieros (no cerrar la carga)? | Sí |
| P-5 | Libros atrasados | ¿Aviso en la pantalla cuando lo impreso tenga más de 2 meses de atraso (C. Trib. art. 94 num. 4)? | Sí, solo aviso |
| P-6 | Marco contable | ¿Se acepta que solo cambie al inicio de un ejercicio? | Sí |

## Fuentes

- [Código de Comercio, Decreto 2-70, arts. 368 a 382 (Derecho Guatemalteco)](http://derechoguatemalteco.org/titulo-iii-de-la-contabilidad-y-correspondencia-mercantiles/)
- [Código de Comercio (ICNL)](https://www.icnl.org/resources/library/codigo-de-comercio)
- [Vesco Consultores, arts. 368, 372, 374 y 377](https://vescco.tax/blog/codigo-de-comercio-tus-obligaciones-contables-arts-368-372-374-y-377/)
- [Consortium Legal, requerimientos contables de la SAT](https://consortiumlegal.com/2022/03/08/requerimientos-contables-y-de-auditoria-realizados-por-sat-en-guatemala/)
- [Prensa Libre, reserva legal, C. Com. arts. 36 y 37](https://www.prensalibre.com/?p=414944)
- [Código Tributario, Decreto 6-91, arts. 47, 85, 94, 112 y 112 «A» (Wikisource)](https://es.wikisource.org/wiki/C%C3%B3digo_Tributario_de_la_Rep%C3%BAblica_de_Guatemala_(Decreto_Ley_6-91))
- [Prensa Libre, nombres legales de los libros y C. Trib. art. 94 num. 4](https://www.prensalibre.com/opinion/columnasdiarias/error-al-autorizar-libros-contables/)
- [Portal SAT, habilitación de libros](https://portal.sat.gob.gt/portal/requisitos-tramites-agencias/habilitacion-de-libros/) (403 al consultarlo; contenido según los buscadores)
- [Prensa Libre, formularios que pasan a Agencia Virtual en 2026](https://www.prensalibre.com/economia/sat-eliminara-cinco-formularios-de-declaraguate-en-2026-estos-tramites-pasaran-solo-a-agencia-virtual/)
- [Living in Guatemala, habilitación de libros (secundaria)](https://livinginguatemala.com/es/tramites/habilitacion-libros/) y [libros mercantiles (secundaria, con contradicciones)](https://livinginguatemala.com/es/tramites/rm-libros-mercantiles-habilitacion/)
- [Ley de Actualización Tributaria, Decreto 10-2012 (ICNL)](https://www.icnl.org/resources/library/ley-de-actualizacion-tributaria)
- [Prensa Libre, LAT art. 23, cuentas separadas para rentas exentas](https://www.prensalibre.com/opinion/distribucion-obligatoria-de-gastos/)
- [La Hora, rentas de capital, régimen independiente de las actividades lucrativas](https://lahora.gt/opinion/wpcomvip/2015/07/13/regimen-de-isr-denominado-rentas-de-capital-ganancias-y-perdidas-de-capital-parte-i/)
- NIIF para las Pymes (IASB), secciones 2.36, 4, 5, 10.19–10.23, 11, 14, 16, 17, 23, 28, 29, 33, 34 y 35; tercera edición de 2025, vigente desde 2027.
