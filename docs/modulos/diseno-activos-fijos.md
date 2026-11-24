# Diseño de Activos fijos — arquitecto de datos, 2026-11-18

_Agente `arquitecto-de-datos`. Base contable y fiscal: `dictamen-activos-fijos-2026-11-18.md` (contador-guatemala, mismo
día, «correcto con ajustes» sobre lo que ya existe). Aterriza el punto 8 de `docs/HOJA-DE-RUTA.md` («Activos fijos e
Inventarios», solo la primera parte). **Aprobado por el usuario el 2026-11-18** (respuestas al final) y **validado por
el contador** (V-1 a V-13 y los ajustes A1 a A3, incorporados en el cuerpo: §18). AF-0 ya está programado (en
integración); el resto se programa desde AF-1 (§16). Lo que el arquitecto no compartió del primer dictamen va marcado
**[corrige el dictamen]**._

_**Integración con Inventarios (AFI-0, 2026-11-18).** Este diseño ya incluye lo aprobado en
`diseno-integracion-activos-fijos-e-inventarios.md` (I-1 a I-13, todas según la recomendación): el «stock» de bienes de
uso (tractores, sillas, computadoras guardadas) vive **aquí** y no en Inventarios; una línea se capitaliza en **N
unidades**; «Poner en uso» es **«Disponible para uso»** (se deprecia desde que está listo, aunque esté guardado); la
**bodega de activos** es una marca de la ubicación (`en_bodega`); entregar y devolver son **traslados** con su responsiva;
y un grupo **se divide solo** al trasladar, dar de baja o contar una parte (**cambia AF-P10**: ya no es «baja solo
total»). También **AF-P22 = b**: Empresas da los nombres de localidades y departamentos sin el filtro de su alcance
(§6.13, para revisión de `seguridad`). Lo que entra por la integración va marcado **(AFI)**._

Sirve a empresas de **cualquier rubro y régimen**: nada aquí supone ganado, fincas, régimen de IVA o ISR, ni que la empresa
sea agente de retención. Las dos depreciaciones (contable y fiscal) se calculan siempre; lo que cambia según el régimen
de ISR (que se lee de `libro_de_compras.datos_fiscales_de_empresa`, como Caja chica y CP4) es **cómo se presenta** el
libro fiscal: con su efecto en el ISR en el régimen sobre las utilidades, y solo informativo en los demás (dictamen §1.4).

**Ya decidido y que no se vuelve a preguntar:**

| Tema | Decisión | Fuente |
|---|---|---|
| La marca en la línea | La línea del Libro de compras dice si es activo fijo, propuesta por su concepto de gasto | `libro-de-compras.md` P2; dictamen §5.1 |
| IVA al costo | El IVA no acreditable (fuera de plazo, no vinculado, empresa sin crédito) va al costo de su línea: `costoDeLinea = total − iva + iva_no_acreditable` | `calculo-de-linea.ts`; dictamen §2 |
| Flujo de efectivo de la compra | El pago de un cargo con activo fijo va a «Pago a proveedores de activo fijo» (Inversión), con desglose en notas ligadas, reintegros y caja chica | CP4; dictamen §5.1 |
| Concepto de la venta | «Venta de activo» (crédito, Inversión, grupo «Venta de activos») ya está en la semilla de Bancos, **sin clave de sistema** | `bancos/dominio/conceptos-iniciales.ts` |
| Moneda | Los activos fijos son partidas **no monetarias**: quedan al tipo histórico y nunca entran al diferencial cambiario. Todo en quetzales | `diseno-multimoneda.md` §2.5 |
| Carga inicial | Una sola fecha de corte por empresa; saldos iniciales solo con la carga **abierta**; cada módulo responde la «pregunta a todos» del cierre | `HOJA-DE-RUTA.md`; `diseno-em2-cierre-de-la-carga.md` §2 y §3 |
| Ubicación | Localidades y departamentos de Empresas (los departamentos pueden ser de toda la empresa o de una localidad) | `empresas.localidades`, `empresas.departamentos` |
| Módulos de rubro | Ganadería y Cultivos son módulos de rubro; los generales no dependen de ellos | `HOJA-DE-RUTA.md` punto 9 |

## 0. La propuesta en una página

- **Un módulo nuevo**, `activos-fijos` (esquema `activos_fijos`), con `dependeDe: ['libro-de-compras']` (trae `terceros`
  de forma transitiva). No depende de Bancos ni de Cuentas por pagar; no se importa con ningún módulo (§15).
- **Quién ve qué (AF-P2 a)**: todos los activos de la empresa los ve quien entra a la empresa y tiene el permiso. Solo
  `politicaPorEmpresa()` y permisos por acción: **sin alcance por localidad**, sin tabla de accesos y sin ventana de
  asignación. La localidad y el departamento son datos de ubicación y centro de costo, no un filtro de seguridad. Sus
  **nombres** salen de una función de Empresas que no aplica el alcance de localidades (AF-P22 b, §6.13).
- **Bienes de uso en bodega (AFI)**: comprar 3 tractores o 50 sillas y guardarlos es tener **activos fijos en la bodega
  de activos**, no inventario (NIIF para las Pymes 17.2, 17.5 y 17.20; ISR art. 42 num. 3). La bandeja capitaliza una
  línea en N activos de una unidad (con su serie y placa) o en un **grupo** con cantidad; «Disponible para uso» los deja en
  la bodega y empieza a depreciarlos; **entregar** es un traslado con boleta (responsiva) y **devolver** otro; entregar o
  dar de baja una parte de un grupo lo **divide** (costo, acumulada y tramos proporcionales en los dos libros). El
  «stock» es el reporte **Existencias de bienes de uso** (§3.11, §7.6, §13).
- **El activo es la unidad que se deprecia.** Tiene una **clase** (catálogo por empresa con su inciso del art. 28, su
  porcentaje fiscal y su vida útil contable por omisión), puede tener **componentes** (activos hijos, NIIF 17.6) y se
  forma con **costos** de varias procedencias: líneas del Libro de compras (varios a varios, con monto parcial), costos
  manuales con su documento de soporte (DUCA, planilla de construcción, aporte, donación) y el saldo inicial.
- **Bandeja «Por capitalizar»** (D4): las líneas del libro marcadas como activo fijo con costo todavía sin repartir. Ahí
  se crea el activo o se suma a uno existente, se reparte una línea entre varios activos, se juntan varias líneas en uno, o
  se **descarta** con motivo (era gasto).
- **Dos libros de depreciación** (D1 c): contable (vida útil en meses, valor residual) y fiscal (porcentaje anual ≤ el
  máximo de ley, base sin residual); el contable nace igual al fiscal salvo que la clase o el activo digan otra cosa.
  Cada libro avanza por **tramos** (inicio de uso, saldo inicial, mejora, costo posterior, revisión de la estimación): el
  cálculo es prospectivo y nunca reescribe meses cerrados.
- **Cierre mensual de depreciación** por empresa: congela las cuotas del mes (contable y fiscal, con la localidad y el
  departamento del mes como centro de costo), es único por mes, va en orden y se **reabre** con permiso, motivo y
  auditoría (solo el último). Cerrado un mes, nada con fecha de ese mes se mueve.
- **Movimientos del activo**: poner en uso, mejoras, revisión de la estimación, traslados (localidad, departamento y
  responsable, con boleta), baja (destrucción, robo, donación, obsolescencia, faltante) y **venta** (con la FEL emitida
  afuera, D8), con su resultado contable y fiscal por separado.
- **Inventario físico** por localidad, con lectura del QR de la etiqueta desde el teléfono (D10): encontrados, faltantes,
  en otra ubicación y sobrantes; los faltantes y los cambios de lugar **proponen** la baja y el traslado, no los hacen.
- **Saldos iniciales** (Administración, con Excel): un activo por fila con su costo, su depreciación acumulada contable y
  fiscal al corte y lo que le falta. Responde la «pregunta a todos» de EM-2 y el aviso de cambio de fecha de inicio.
- **Fuera del módulo**: Libro de compras deja que un **servicio** sea activo fijo (E1, sin cambiar su casilla del SAT-2237),
  gana una llave única para que las líneas se puedan referenciar, y Activos fijos **bloquea** anular o eliminar un
  documento con costos capitalizados escuchando los avisos que el libro ya publica (E4).
- **Fuera de v1**: revaluación y deterioro (D6), arrendamiento financiero (D9), valor razonable de activos biológicos
  (Ganadería y Cultivos), pólizas de seguro (paso posterior, §16), partidas contables (Contabilidad).

## 1. Lo encontrado en el código y la base (verificado contra `main` el 2026-11-18)

1. **Líneas del libro** (`libro_de_compras.lineas_de_documento`): `tipo in ('bien','servicio')`, `es_activo_fijo boolean`,
   montos fijos (`total`, `base`, `iva`, `iva_no_acreditable`, `idp`, `exento`, `otros_impuestos`). El check
   `lineas_de_documento_activo_fijo_es_bien` (`not es_activo_fijo or tipo = 'bien'`) y su par
   `conceptos_de_gasto_activo_fijo_es_bien` impiden que un servicio sea activo fijo (E1); la regla se repite en
   `dominio/concepto-de-gasto.ts` (línea 35) y en el esquema Zod de la línea. **La línea no tiene un único `(id,
   empresa_id)`** ni `(id, documento_id, empresa_id)`: hoy nadie la referencia desde fuera. No hay cantidad por línea.
2. **El documento no se edita** (`documentos.tablas.ts`: «sin edición: se anula o se elimina»), así que el costo de una
   línea no cambia después de registrarse. `costoDeLinea` (no guardado) = `total − iva + iva_no_acreditable`.
3. **Categoría del libro** (`consultas-del-libro.drizzle.ts`, `categoriaSql`): combustible → `activo_fijo` si
   `es_activo_fijo` → el tipo. Con E1 sin más, un servicio capitalizado pasaría a la columna de **bienes** y al rubro
   `activos_fijos` del SAT-2237. Hay que poner `es_activo_fijo and tipo = 'bien'` (§4.1).
4. **Destino y flujo**: `DocumentoParaDestino.tieneActivoFijo` = alguna línea es activo fijo. CP4 manda a Inversión
   **todo** lo pagado a un documento con `tieneActivoFijo` (`repartoPorActivo`), aunque el documento mezcle gasto y activo.
   Caja chica y Cuentas por liquidar copian `con_activo_fijo`. Nada de esto cambia con este diseño (§15).
5. **Avisos del libro**: `libro-de-compras.documento_por_anular` y `…_por_eliminar` se mandan a **todos** los módulos que
   escuchan (cada uno filtra por `destino`); un error del que escucha deshace la anulación. El mediador **salta** a los
   módulos inactivos de la cuenta.
6. **Empresas**: `localidades` con alcance propio (`ALCANCE_DE_LOCALIDADES`, `empresas.accesos_a_localidades`, permiso
   `empresas.localidades.ver-todas`) y único `localidades_id_empresa_unico`; `departamentos` con localidad opcional,
   `politicaPorAlcanceOpcional(ALCANCE_DE_LOCALIDADES, 'localidad_id')` y único `departamentos_id_empresa_unico`.
   Activos fijos **no usa** ese alcance (AF-P2 a), pero sus pantallas leen nombres de localidades y departamentos, que sí
   lo llevan: ver R-5 y AF-P22 (respondida **b**: función de Empresas que da solo id, código y nombre, §6.13).
   `cargas_iniciales` (fecha de inicio, cerrada); `empresas.obtener_carga_inicial` bloquea la fila `for share`.
7. **EM-2** (en `main`): `mediador.preguntarATodos` y la pregunta `empresas.revisar_cierre_de_carga` (`RevisionDeCierreDeModulo`
   con hallazgos `pide_motivo`/`aviso` y hasta 200 cifras); el aviso `empresas.fecha_de_inicio_por_cambiar`. Responden
   Bancos, Cuentas por pagar y Libro de compras.
8. **Auditoría**: `AccionAuditada` ya tiene `eliminar`, `inactivar`, `reactivar`, `anular`, `devolver`, `corregir`,
   `reabrir`, `cerrar`, `descartar`, `asignar`, `quitar`, `adjuntar`, `ajustar`. `core.recursos_de_auditoria_permanente`
   (migración del core 0024) es el catálogo de recursos cuya auditoría no se depura; lo escriben las migraciones de cada
   módulo con su cita legal.
9. **Configuración**: tasas de ley como variables de **instalación** (`libro-de-compras/configuracion.ts`, filas
   `deInstalacion`); las de política de la empresa, con nivel `empresa`.
10. **Semillas por empresa**: `SembrarConceptosDeGasto` siembra la lista sugerida la primera vez que se lista (si la
    empresa no tiene ninguno). Hay cuatro conceptos de gasto sugeridos de activo fijo (Maquinaria y equipo, Vehículos,
    Mobiliario y equipo de oficina, Equipo de cómputo).
11. **Archivos**: `core.archivos` (imagen o PDF revisado con qpdf) con `recurso_dueno` para que solo los sirva el módulo.
12. **Impresión**: los reportes se imprimen desde el navegador (páginas de reporte con estilos de impresión). No hay en el
    cliente una librería de QR ni de lectura de códigos; el servidor tiene `pdfkit`.
13. **Base de desarrollo (solo leída)**: 0 líneas en el libro, 1 localidad, 0 departamentos, 6 conceptos de gasto de activo
    fijo. Las migraciones del libro no tienen datos que convertir.

## 2. Alcance

| Entra en v1 | No entra (y dónde va) |
|---|---|
| Propiedad, planta y equipo (edificios, instalaciones, mobiliario, maquinaria, vehículos, cómputo, herramientas, otros muebles) | Revaluación y deterioro (D6; diseño reservado en §3.10) |
| Terrenos (sin depreciación) | Arrendamiento financiero (D9): el arrendatario no lo registra como activo en v1 |
| Intangibles con amortización: programas y licencias, marcas, patentes, gastos de organización, derecho de llave (D11) | Propiedades de inversión a valor razonable (NIIF 16): se registran al costo como cualquier inmueble |
| Activos biológicos **al costo con su depreciación fiscal**: semovientes de trabajo, reproductores (con el valor como ganado común), plantaciones productivas (D7 b) | Hato, nacimientos, pesos, valor razonable, ganado común por animal: **Ganadería** y **Cultivos** (módulos de rubro, que publicarán eventos; Activos fijos no depende de ellos) |
| Obras y bienes en construcción o en tránsito (acumulan costo sin depreciar) | Inventario de consumibles, mercadería, materia prima y repuestos menores: módulo **Inventarios** (`diseno-inventarios.md`) |
| **Bienes de uso guardados** (AFI): tractores, sillas, computadoras, equipo de reserva y repuestos importantes (I-6 a, NIIF 17.5), en la bodega de activos, con su «stock» por reporte | Préstamo de herramientas y equipo (INV-P3 a): es de **este** módulo, pero se diseña aparte (§19) |
| Componentes con vida propia (NIIF 17.6) | Mantenimientos, horómetro y combustible: módulo **Maquinaria** (futuro, dependerá de este) |
| Bienes de control (bajo el umbral, D5) y bienes de terceros (arrendados o en comodato, D9 a): solo control físico | Emitir la FEL de la venta: **Ventas** (futuro); en v1 se transcribe la emitida afuera (D8) |
| Mejoras, revisión de la estimación, traslados, bajas, ventas, inventario físico con QR, etiquetas | Partidas contables: **Contabilidad** (futuro) escuchará los eventos de §9 |
| Saldos iniciales con depreciación acumulada a la fecha de corte | Pólizas de seguro: paso posterior de este mismo módulo (AF-14, §16) |
| Reportes: registro, depreciación del período, cuadro fiscal y contable, por localidad y responsable, bajas y ventas | ISO y ganancia de capital: el módulo **da las cifras** (activo neto, resultado fiscal de la venta); no hace la declaración |

## 3. Modelo

### 3.1 Qué es cada cosa

| Concepto | Qué es | Dónde vive |
|---|---|---|
| **Clase** | Grupo de activos con el mismo trato: inciso del art. 28 (o terreno, intangible, llave), porcentaje fiscal, vida útil y valor residual contables por omisión | `clases` |
| **Activo** | La unidad que se controla y se deprecia. Tres tipos de registro: **activo** (de la empresa, en el balance, con libros), **bien de control** (de la empresa, se fue a gasto: solo control físico, sin libros) y **de terceros** (no es de la empresa) | `activos` |
| **Componente** | Un activo con `activo_padre_id`: se deprecia con su propia vida (motor, techo). Un solo nivel | `activos` |
| **Costo** | Un monto que forma el valor del activo: de una línea del libro (todo o parte), manual con soporte, o el saldo inicial. Firmado: la nota de crédito resta | `costos` |
| **Libro** | Contable o fiscal. Cada uno lleva su vida o porcentaje, su base y su acumulada | `tramos`, `cuotas`, `saldos_iniciales` |
| **Tramo** | Desde un mes, con qué base, residual, vida o porcentaje y cuota se deprecia un libro. Cambia con el inicio de uso, una mejora, un costo posterior o la revisión de la estimación | `tramos` |
| **Cierre** | El mes de una empresa con sus cuotas congeladas | `cierres`, `cuotas` |
| **Movimiento** | Traslado, mejora, baja o venta, con fecha y su documento imprimible (boleta, acta) | `traslados`, `mejoras`, `bajas` |
| **Inventario físico** | Un conteo por localidad con lo esperado, lo encontrado y lo que sobró (en los grupos, también la cantidad) | `inventarios`, `inventario_lineas`, `inventario_sobrantes` |
| **Alta conjunta** (AFI) | Los N activos creados juntos desde una misma asignación de la bandeja (3 tractores): comparten un id sin tabla propia | `activos.alta_conjunta_id` |
| **Bodega de activos** (AFI) | Una marca de la ubicación vigente, no un lugar aparte: el bien está guardado, sin entregar, en su localidad y departamento | `activos.en_bodega`, `traslados.a_bodega` |
| **División** (AFI) | Separar `k` unidades de un grupo de `n` en un activo nuevo, con su parte del costo, de la acumulada y del residual | `divisiones` |

### 3.2 Ciclo de vida

```
            poner en uso                    baja o venta
en_construccion ───────────► en_uso ─────────────────────► dado_de_baja
     ▲ (alta sin fecha de uso)   │  ▲ ocioso (bandera, sigue depreciando)
     └─ costos se acumulan        └──┘
```

- **Estado** (`en_construccion`, `en_uso`, `dado_de_baja`) es lo único guardado. **Ocioso** es una bandera de `en_uso`
  (NIIF 17.20: sigue depreciándose en el libro contable; en el fiscal también avanza, V-4). Marcar ocioso pide fecha y
  **motivo**. **Totalmente depreciado** no es un estado: se deduce por libro («Depreciado contable» cuando el contable
  llegó al residual, «Depreciado fiscal» cuando el fiscal llegó a cero). **[corrige el dictamen §5.4]**, que los pone
  como estados: guardarlos obligaría a mantenerlos al día en cada cierre y podrían contradecir los números.
- Un bien de control o de terceros nace `en_uso` y no tiene libros ni cuotas; solo traslados, inventario y baja (sin
  resultado: para uno de terceros, «devuelto al dueño»).
- **«Poner en uso» se presenta como «Disponible para uso»** (AFI, I-2 a): la fecha es la del día en que el bien quedó
  **recibido y listo para operar**, aunque nadie lo use todavía y esté guardado (NIIF 17.20), y es la **misma** en los
  dos libros. La columna sigue siendo `fecha_de_inicio_de_uso`: cambia el texto, no el dato. `en_construccion` es solo
  para lo que falta armar, instalar o completar (17.10); la pantalla lo dice: «En construcción no es "guardado": un bien
  listo y guardado ya se deprecia».
- **Estar en la bodega no es estar ocioso** (AFI, V-3 de la integración): un tractor nuevo esperando asignación no se
  marca `ocioso` solo. Se marca solo si se elige al devolverlo a la bodega (§3.7); el reporte «En bodega o sin asignar»
  mide los meses en bodega (§13).

### 3.3 Cómo entra el costo (E2, E3)

1. **Desde el libro (D4 b)**: en la bandeja, una línea muestra su costo, lo ya capitalizado y lo que falta. Se elige el
   activo (nuevo o existente, también uno en construcción) y el monto; la suma por línea **no pasa** de su costo. Varias
   líneas de documentos distintos (factura, flete, instalación) pueden ir al mismo activo.
2. **Manual (E3)**: monto, fecha, clase de costo (importación, construcción, aporte, donación, honorarios, otro), documento
   de soporte (texto obligatorio: «DUCA 26-0000123», «Planilla de obra, quincena 1-15 mar») y su archivo opcional. Para
   lo que no pasa por el libro: DUCA (que Arrancar no tiene), planilla de construcción propia, aporte de socios,
   donación. No se permite un costo manual por algo que sí está en el libro (aviso, no bloqueo: el sistema no puede
   saberlo con certeza). Un costo manual puede quedar **fuera del libro fiscal** (`aplica_al_libro_fiscal = false`) con
   motivo obligatorio: desmantelamiento, un costo sin documento que lo respalde ante la SAT, etc. (V-8).
3. **Nota de crédito**: una nota del libro sobre una factura con costos capitalizados aparece en la bandeja **aunque su
   línea no esté marcada**, con el activo propuesto; su costo entra en negativo. Una nota de débito marcada entra positiva.
4. **Saldo inicial** (§8): un costo único `saldo_inicial` con el costo histórico.
5. **Desde Inventarios** (paso INV-AF): materiales de una obra o mercadería que la empresa toma para su uso (I-10 a),
   por la orden `activos-fijos.recibir_costo_de_inventario`, con `origen = 'inventario'` y el costo del método de
   Inventarios (promedio o PEPS). Solo a un activo `en_construccion` (§6.12).
6. **División** (AFI, §7.6): el costo que un grupo cede al activo que se separa (`division_cedida`, negativo) y el que
   este recibe (`division_recibida`, positivo). No tienen línea del libro y no cuentan en la regla de la línea.

**Costo de cada unidad (AFI).** Una línea de N unidades es **identificación específica**: cada activo recibe su parte
del costo de la línea (`floor(monto / N)` centavos y el **sobrante en el último**), nunca un promedio ni PEPS. Los costos
posteriores comunes (flete, instalación de los 3 tractores) se reparten igual entre los activos vigentes de la **alta
conjunta**, con el sobrante en el último (§6.2).

**Software (V-2).** El programa que viene con el equipo (el sistema operativo de la computadora, el programa de una
máquina) es **costo del equipo** y se deprecia con él (cómputo, 33.33 %). Solo la **licencia comprada aparte** va a la
clase «Programas y licencias» (intangible, 20 %). Las **suscripciones** y los servicios en la nube (SaaS) son gasto: en la
bandeja se descartan, y la clase «Programas y licencias» lo recuerda en su ayuda y en el aviso al capitalizar.

**Antes de poner en uso** los costos solo se acumulan. **Después**, cada costo nuevo es una **mejora** (capitaliza y
puede alargar la vida, ISR art. 26) o un **costo posterior** (una factura atrasada del flete, una nota de crédito): los dos
crean un tramo nuevo desde el primer mes abierto (§7.4). Las **reparaciones y el mantenimiento** son gasto (art. 21.18) y
no pasan por aquí: en el libro van sin la marca de activo fijo.

### 3.4 Umbral de capitalización y bienes de control (D5)

Variable de empresa `activos-fijos.capitalizacion.umbral` (monto, `0` = sin umbral). En la bandeja, una línea cuyo costo
total no llega al umbral aparece con la etiqueta «Bajo el umbral» y dos salidas: **descartar** (era gasto) o registrarla
como **bien de control** (se controla físicamente, con etiqueta e inventario, pero no se deprecia ni va al balance). El
umbral es una ayuda, no una regla: se puede capitalizar igual con un clic más (sin permiso extra). No es legal: lo fija la
empresa con su contador (dictamen §3, 17.4).

**Un terreno nunca es bien de control** (QA 2026-11-19): no se va a gasto ni se controla como herramienta; el dominio
rechaza un bien de control en una clase del inciso `terrenos`. El **valor como ganado común** solo se acepta en clases
de reproductores (§5.3), también por API.

**El umbral se mide por línea** (AFI, I-12 a; NIC 16.9): 50 sillas de Q300 (Q15,000) con umbral de Q5,000 son un
**grupo** con libros; 4 sillas (Q1,200) son un **bien de control** de cantidad 4. La bandeja muestra además el **costo por
unidad** (costo de la línea ÷ unidades ÷ cantidad por activo) como ayuda. Las N unidades de una asignación heredan el
mismo tipo de registro.

**Bienes de control en lo fiscal** (AFI, I-5 a): en el régimen sobre las utilidades van al gasto también en lo fiscal.
Al registrar uno, aviso: «La ley no fija un monto mínimo; si la SAT reclasifica, solo aceptaría el 20 % anual». Un bien
de control lleva etiqueta, ubicación, responsable, `en_bodega`, traslados, división (solo la cantidad y, si los tiene,
sus costos de referencia) y baja sin resultado.

### 3.5 Los dos libros (D1 c)

| | Contable (NIIF para las Pymes 17) | Fiscal (ISR arts. 25 a 33) |
|---|---|---|
| Base | Σ costos vigentes (con el saldo inicial) | Σ costos vigentes con `aplica_al_libro_fiscal`; en edificios, la parte de edificación como máximo el **tope fiscal del inmueble** (§3.5.1; arts. 26 y 23) |
| Cómo se deprecia | Línea recta en **meses** de vida útil, hasta el valor residual | Línea recta al **porcentaje anual** del activo sobre su base, hasta cero (sin residual, dictamen §1.1) |
| Por omisión | Vida útil = la de la clase; si la clase no la da, la que equivale al porcentaje fiscal (`round(1200 / %)` meses); residual = el de la clase (0 %) | Porcentaje = el de la clase, que no pasa del máximo de su inciso (configuración de instalación) |
| Se cambia | Con **revisión de la estimación** (NIIF 17.19), hacia adelante, con permiso y auditoría | **No** después del primer cierre que lo use (art. 27 y 28: «una vez adoptado») |
| Reproductores | Residual por omisión = valor como ganado común (V-9) | Base = costo − valor como ganado común (art. 28 inciso 7) |
| Terrenos | No se deprecian | No se deprecian |

Así, para la pyme que usa las tasas fiscales en libros, los dos libros dan lo mismo y no se toca nada; quien audita con
NIIF cambia la vida o el residual en la clase o en el activo, y el cuadro de §13 muestra la diferencia temporaria (NIIF 29).

**Costo fiscal y base fiscal (A1).** Son dos cifras distintas. La **base fiscal** es lo que se deprecia (con el tope del
inmueble y sin el ganado común del reproductor). El **costo fiscal** es Σ costos vigentes con `aplica_al_libro_fiscal`,
**sin** tope de matrícula y **sin** restar el ganado común: es el costo que se recupera al vender (§3.8).

#### 3.5.1 Tope fiscal del inmueble (A3, V-7)

- El activo de clase `edificios` guarda `valor_de_matricula` (matrícula fiscal) y `valor_catastral` (catastro municipal),
  los dos opcionales. El tope es el **mayor** de los dos.
- Si esos valores son del **inmueble completo** (no separan terreno y edificio, `valores_del_inmueble_completo = true`), el
  tope es el **70 % del valor total del inmueble** (el mayor de los dos), salvo prueba en contrario (art. 26).
- Los costos y mejoras marcados **«No es edificación ni requiere licencia»** (`no_es_edificacion`: instalaciones,
  equipos fijos, cercas…) **no entran al tope**: suman a la base fiscal aparte. Base fiscal del edificio =
  `min(Σ costos fiscales de edificación, tope) + Σ costos fiscales con no_es_edificacion`.
- Sin matrícula ni catastro no hay tope: lo dice un hallazgo `aviso` del cierre («N edificios sin valor de matrícula ni
  de catastro»).
- Cambiar la matrícula o el catastro (nuevo avalúo, rectificación) es una acción propia, **hacia adelante**: crea un tramo
  fiscal `cambio_de_matricula` desde el primer mes abierto y audita `corregir` con los valores anteriores (§6.5).

### 3.6 Depreciación mensual (D2)

Variable de empresa `activos-fijos.depreciacion.primer_mes`: `mes_de_inicio` (por omisión: el mes en que se pone en uso
se deprecia completo, NIIF 17.20 y sin aplazar la deducción del art. 25) o `mes_siguiente`. La regla es **simétrica**: con
`mes_de_inicio`, el mes de la baja **no** se deprecia; con `mes_siguiente`, **sí** (así un bien que entra y sale el mismo
año da doce cuotas por año completo). Por días queda fuera (D2 c). Fórmulas en §7.

### 3.7 Traslados y responsables

El activo guarda su **ubicación vigente** (localidad, departamento, responsable) y el historial vive en `traslados`. La
primera fila es la del alta (sin boleta). Cada traslado lleva fecha, destino, quien recibe, motivo y su **boleta**
numerada (imprimible, con firmas). La **responsiva** (acta de entrega al responsable) es la misma boleta cuando solo
cambia el responsable. La cuota de cada mes se asigna a la localidad y el departamento **vigentes al último día del mes**
(un cambio a medio mes no parte la cuota; V-5).

**Bodega, entrega y devolución (AFI, I-7 a).**

- Cada traslado dice si deja el bien **en la bodega de activos** (`a_bodega`, casilla «En bodega de activos»); el activo
  guarda la copia vigente en `en_bodega`. En el alta y en «Disponible para uso» la casilla viene marcada si no se escribe
  responsable. Puede tener al bodeguero como responsable.
- **Entregar** = traslado con `a_bodega = false`, destino (localidad, departamento) y responsable. De a uno o por lote
  (varios renglones en la misma boleta).
- **Parte de un grupo** («20 de las 50 sillas»): el renglón lleva `cantidad`; el caso de uso **divide** el grupo (§6.11)
  en la misma transacción y traslada el activo nuevo de 20; las 30 siguen en la bodega. La boleta dice «20 sillas
  (separadas de AF-0200)».
- **Devolver** = traslado con `a_bodega = true`, con la opción «Marcar como ocioso» en la misma ventana. El bien **nunca
  vuelve a Inventarios** y **sigue depreciándose** (17.20). Si se piensa vender, sigue siendo activo fijo (la NIIF para
  las Pymes no tiene «mantenido para la venta»); el reporte «En bodega o sin asignar» lo señala para revisar deterioro
  (sección 27).
- La boleta es la **responsiva**: «Entrega», «Recibe», firmas y el título que fija la empresa
  (`activos-fijos.documentos.nombre_de_responsiva`). Se imprime y, firmada, **se sube su escaneo** (I-8 b; §5.16).
- Entregar no tiene efecto en el IVA ni en el ISR (no hay transferencia de dominio, Ley del IVA art. 2) y no cambia la
  depreciación; solo el centro de costo desde el mes del traslado.
- El destino puede ser **cualquier localidad activa de la empresa**, la vea o no el usuario en Empresas (AF-P22 b, §6.13).

### 3.8 Baja y venta (E5, D8)

- **Baja** con causa (`destruccion`, `robo`, `extravio`, `donacion`, `obsolescencia`, `faltante_de_inventario`,
  `devuelto_al_dueno` —solo de terceros—, `otra`), descripción, quién la autorizó, destino del bien, **acta** (PDF o
  foto) y, en robo o extravío, número de la **denuncia** (MP o PNC) y su archivo. El sistema **avisa, no bloquea**, si
  falta el acta o la denuncia (el efecto fiscal de no tenerla lo explica el aviso: IVA art. 3 num. 7 e ISR art. 21.17).
- **Venta**: además, fecha, comprador (nombre y NIT), precio sin IVA, IVA, y la FEL emitida afuera (serie, número y
  autorización). El cobro **no** se registra aquí: se registra en Bancos como depósito con el concepto «Venta de
  activo» (Inversión), y la pantalla lo recuerda (AF-P11).
- Al dar de baja se **congelan** en la fila: costo, depreciación acumulada contable, valor en libros, **costo fiscal**
  (A1), base fiscal, depreciación acumulada fiscal y valor fiscal por depreciar al día de la baja, y el **resultado**:
  contable = precio − valor en libros; **fiscal = precio − (costo fiscal − depreciación fiscal acumulada)** (A1: así el
  exceso sobre la matrícula y el valor como ganado común del reproductor, que no se depreciaron, se recuperan en la
  venta). En la venta se muestra el aviso de la ganancia de capital (10 %, declaración propia del mes siguiente, ISR
  arts. 84, 89, 92 y 95; la pérdida no es deducible, arts. 91 y 96) y del IVA de la venta; desde el 1-ene-2027, el aviso
  de inmuebles de personas individuales (Decreto 18-2026), solo si la empresa es persona individual.
- **Venta de un reproductor** (V-10), aviso: «Venta de ganado reproductor: el resultado fiscal se calcula con su costo
  completo, incluido su valor como ganado común. Si el animal se vende por descarte como parte del giro de la finca,
  confirme con su contador si es ganancia de capital o ingreso de la actividad.» Sin cálculo distinto en v1.
- **Acta** (V-12): se dice si es **administrativa** (de la empresa, firmada por quien autoriza) o **notarial**. En una
  **donación**, aviso: «La donación de un bien puede generar débito de IVA (Ley del IVA, art. 3): consulte con su
  contador si debe emitir la factura.» En un faltante sin acta, el aviso del IVA de los faltantes (dictamen §7.4).
- Un **padre** se da de baja con todos sus componentes vigentes; un **componente** se puede dar de baja solo (cambio del
  motor: baja del viejo, alta del nuevo como componente).
- **Baja de una parte de un grupo** (AFI, I-3 a; **reemplaza «baja solo total» de AF-P10 b**): «3 sillas rotas de 30» es
  `DarDeBaja` con `cantidad`: divide el grupo (causa `baja`, §6.11) y da de baja el activo nuevo, en la misma transacción.
  Una venta parcial de un grupo sigue la misma regla.

### 3.9 Inventario físico (D10)

Por localidad (o de toda la empresa). Al abrirlo se **copia la lista esperada** (activos, bienes de control y de terceros
no dados de baja de esa localidad). Se cuenta escaneando el QR de la etiqueta o buscando por código; cada fila queda
`encontrado`, `no_encontrado` o `en_otra_ubicacion` (con dónde), con su estado físico opcional. Lo que aparece sin estar
en la lista va a **sobrantes** (descripción, código leído, foto). Al **cerrar**: se imprime el acta y se **proponen** las
bajas por faltante y los traslados, que cada uno se confirma con su permiso y su acta (dictamen §4: «con su ajuste
aprobado»). Un sobrante se regulariza con un alta manual o de saldo inicial.

En los **grupos** (AFI), la línea lleva la **cantidad esperada** (la del activo al abrir) y la **encontrada**. Si se
encuentran 48 de 50 sillas, al cerrar se **propone** dividir 2 y darlas de baja por `faltante_de_inventario`, con el aviso
de IVA de siempre (Ley del IVA art. 3 num. 7). La propuesta se confirma con `bajas.crear`, como las demás.

### 3.10 Revaluación y deterioro (fuera de v1, D6)

Reservado: serían una tabla `revaluaciones` (avalúo, valuador, superávit, ISR de ganancia de capital pagado o no, porque
solo así se deprecia el aumento, art. 29) y otra `deterioros` (solo libro contable, no deducible). Las dos crean un tramo
contable nuevo; el modelo de tramos ya lo admite sin cambiar tablas existentes.

### 3.11 Varias unidades de un bien de uso: el flujo completo (AFI)

| Paso | Qué pasa | Dónde |
|---|---|---|
| Compra | La línea «3 tractores» o «50 sillas» se marca **Activo fijo** en el libro (nunca Inventario: la casilla es excluyente). Casilla «activos fijos» del SAT-2237; el pago va a Inversión | Libro de compras (sin cambio) |
| Capitalizar | En la ventana «Capitalizar»: **Unidades** (1–200) y **Cantidad por activo**. Tractores: 3 unidades de 1 (3 activos con su serie y placa, códigos correlativos propuestos y editables, I-13 a). Sillas: 1 unidad de 50 (un grupo). Todos comparten `alta_conjunta_id` | §6.2 |
| Costos que llegan después | El flete de los 3 tractores se asigna a la **alta conjunta**: se reparte igual entre sus activos vigentes; en los que ya están disponibles crea su costo posterior | §6.2, §6.6 |
| Disponible para uso | Por lote (`PonerEnUsoVarios`), con la fecha en que quedaron listos, **en la bodega de activos** y sin responsable. Desde ese mes se deprecian | §6.4 |
| Entregar | Traslado con boleta (responsiva): un tractor, un lote o «20 de las 50 sillas» (división automática) | §3.7, §6.7 |
| Devolver | Traslado a la bodega, con «Marcar como ocioso» opcional; sigue depreciándose | §3.7 |
| Baja parcial | «3 sillas rotas de 30»: división y baja en una transacción | §3.8, §6.8 |
| Contar | El inventario físico cuenta la cantidad de los grupos y propone dividir y dar de baja el faltante | §3.9, §6.10 |
| Ver el «stock» | Reporte **Existencias de bienes de uso**: unidades totales, en bodega, entregadas y en construcción, por clase, descripción, marca y modelo (o por alta conjunta) | §13 |

Si un **distribuidor** toma para sí un tractor de su mercadería (I-10 a): alta del activo `en_construccion` sin costo →
salida de Inventarios a «Obra o uso propio» con el costo del método (orden `activos-fijos.recibir_costo_de_inventario`) →
«Disponible para uso». Si fueron 3 de una vez: un activo de cantidad 3 que recibe el costo y luego **«Separar en
unidades»** (§6.11), o tres salidas si se quiere el costo PEPS exacto de cada uno.

## 4. Cambios fuera del módulo

### 4.1 Libro de compras (paso AF-0, migración `0037_af_servicio_capitalizable`)

| Cambio | Detalle |
|---|---|
| E1 en la base | `drop constraint lineas_de_documento_activo_fijo_es_bien` y `conceptos_de_gasto_activo_fijo_es_bien`. Sin datos que convertir (el check nuevo es más débil) |
| E1 en el dominio y la API | Quitar la regla de `dominio/concepto-de-gasto.ts` (línea 35) y de la validación de la línea; el cliente deja de forzar «Bien» al marcar activo fijo (lo propone, no lo impone). Textos: «Activo fijo (se capitaliza)» |
| Casilla del SAT-2237 | `categoriaSql`: `when es_activo_fijo and tipo = 'bien' then 'activo_fijo'`. Un servicio capitalizado sigue en **servicios** (libro completo y simplificado, rubro del SAT-2237), como pide el dictamen E1 mientras la SAT no diga otra cosa (V-1). El análisis «Activos fijos comprados» los sigue mostrando todos (`es_activo_fijo`), con la columna Tipo |
| Llave para referenciar líneas | `unique lineas_de_documento_llave_unica (id, documento_id, empresa_id)`. Es el destino de la llave compuesta de `activos_fijos.costos` (misma empresa y mismo documento) |
| Pruebas | Servicio con activo fijo (pasa); servicio capitalizado en la columna de servicios y fuera del rubro `activos_fijos`; bien capitalizado sin cambio |

No cambia: `DocumentoParaDestino`, `tieneActivoFijo`, CP4, Caja chica, Cuentas por liquidar (un servicio capitalizado
ahora se paga por Inversión, que es lo correcto según NIIF 7.5).

### 4.2 Core

| Cambio | Detalle |
|---|---|
| `core/contratos/activos-fijos.contratos.ts` | Eventos del bus (§9) y las órdenes que **atiende** Activos fijos: `activos-fijos.obtener_umbral_de_capitalizacion` (AFI, la pide Inventarios para su aviso) y, con INV-AF, `activos-fijos.obtener_activo` y `activos-fijos.recibir_costo_de_inventario` (`diseno-inventarios.md` §4.3) |
| Auditoría permanente | La migración `0001` de Activos fijos inserta en `core.recursos_de_auditoria_permanente` los recursos `activos-fijos.activos`, `activos-fijos.costos`, `activos-fijos.mejoras`, `activos-fijos.saldos-iniciales`, `activos-fijos.bajas` y `activos-fijos.cierres`, con motivo «Documentos de costo mientras se deprecia el bien, más la prescripción (Código Tributario arts. 112 "A" y 47; ISR art. 26)». Un edificio se deprecia 20 años: los 60 meses de conservación no alcanzan. La migración de divisiones (AFI-5) agrega `activos-fijos.divisiones`: una división cambia la base de depreciación mientras el bien exista |

### 4.3 Empresas (AF-P22 b)

Una función nueva en el esquema `empresas` que da **solo id, código, nombre y si está activa** de las localidades y los
departamentos de la empresa activa, **sin** el alcance de localidades. Contrato, reglas de seguridad y pruebas en §6.13.
Migración de Empresas `00xx_nombres_de_ubicaciones` (siguiente número libre al programarla; `diseno-parcelas.md` reserva
la `0013` para inmuebles). Va **antes de AF-2c**, que es la primera pantalla que muestra la localidad.

### 4.4 Bancos, Cuentas por pagar, Caja chica, Cuentas por liquidar

**Sin cambios** en v1. El concepto «Venta de activo» ya existe (sugerido). Si se elige AF-P11 b (orden a Bancos para el
depósito), Bancos necesita reconocer el origen `activos-fijos` en `RevisorDeCambios`, que es justo la generalización que
pide `diseno-caja-chica-y-cuentas-por-liquidar.md` §3.2.

### 4.5 Inventarios (AFI)

Sin llave entre los dos esquemas y sin importarse: Inventarios **pide** `activos-fijos.obtener_umbral_de_capitalizacion`
para avisar que un repuesto o suministro caro puede ser un bien de uso (I-11 a), y manda a una obra los materiales o la
mercadería que la empresa toma para su uso (INV-AF). Ninguna tabla de Activos fijos cambia por Inventarios salvo el valor
`'inventario'` en `costos.origen` (§5.4).

## 5. Datos (esquema `activos_fijos`)

Toda tabla lleva `empresa_id` (FK `core.empresas` on delete cascade), `politicaPorEmpresa()` (y **ninguna otra
política**: sin alcance por localidad, AF-P2 a), `...marcasDeTiempo` y `...autoria`. Llaves a otras tablas `no action` salvo donde se dice; las compuestas con `empresa_id` para no cruzar de
empresa. Dinero `numeric(14,2)` (centavos enteros en el código). Fechas `date`; períodos `date` con check de primer día
del mes (`= date_trunc('month', …)::date`), como `libro_de_compras.periodos`. Anulación completa = `estado`, `anulado_en`,
`anulado_por`, `motivo_de_anulacion` (1–300) con el check `(estado = 'anulado') = (los tres no nulos)`, como CP2-2.
Toda tabla con `id` que reciba llaves lleva su único `<tabla>_id_empresa_unico (id, empresa_id)` como destino de las
llaves compuestas, y toda llave lleva su índice, como en los demás módulos.

### 5.1 `activos_fijos.clases`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `nombre` | text | no | 1–80 recortado; único `clases_nombre_unico (empresa_id, nombreNormalizado(nombre))` |
| `inciso_fiscal` | text | no | `in ('edificios','plantaciones','instalaciones_y_mobiliario','maquinaria_y_vehiculos','computo','herramientas','reproductores','otros_muebles','intangibles','llave','terrenos')` (art. 28 incisos 1 a 8, art. 33 y art. 26) |
| `porcentaje_fiscal` | numeric(5,2) | no | `between 0 and 100`; check `(inciso_fiscal = 'terrenos') = (porcentaje_fiscal = 0)`. El tope del inciso (configuración de instalación) lo revisa el dominio al crear y editar |
| `vida_util_contable_meses` | smallint | sí | `between 1 and 1200`; nulo = la equivalente al porcentaje fiscal; debe ser nulo en terrenos |
| `valor_residual_porcentaje` | numeric(5,2) | no | `default 0`, `between 0 and 99.99` |
| `activo` | boolean | no | `default true`; se inactiva con auditoría (no se elimina si tiene activos) |

Únicos: `clases_id_empresa_unico (id, empresa_id)`. Índice `(empresa_id, activo)`. Semilla perezosa (como
`SembrarConceptosDeGasto`): Edificios (5 %), Plantaciones productivas (15 %), Instalaciones y mobiliario (20 %),
Maquinaria y equipo (20 %), Vehículos (20 %), Semovientes de trabajo (20 %, inciso 4), Equipo de cómputo (33.33 %),
Herramientas (25 %), Reproductores (25 %), Otros bienes muebles (10 %), Programas y licencias (20 %, intangible, V-2),
Otros intangibles (20 %), Derecho de llave (10 %), Terrenos (0 %). La ayuda de «Programas y licencias» dice: «Solo
licencias compradas aparte. El programa incluido en el equipo es parte del equipo; las suscripciones son gasto» (V-2).

### 5.2 `activos_fijos.clases_por_concepto`

`(empresa_id, concepto_de_gasto_id)` PK; `clase_id`. FK compuestas `(concepto_de_gasto_id, empresa_id) →
libro_de_compras.conceptos_de_gasto (id, empresa_id)` **on delete cascade** y `(clase_id, empresa_id) → clases`. Índice
`(clase_id)`. Sirve para que la bandeja **proponga** la clase según el concepto de la línea (Vehículos → Vehículos). Se
edita en la ficha de la clase («Conceptos de gasto que la proponen»).

### 5.3 `activos_fijos.activos`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK; también va en el QR |
| `codigo` | text | no | 1–30, `^[A-Za-z0-9./-]+$`; único `activos_codigo_unico (empresa_id, upper(codigo))`. Si no se escribe, lo propone el correlativo `activos-fijos.activos` con el prefijo de la empresa (AF-P16) |
| `descripcion` | text | no | 1–200 recortado |
| `clase_id` | uuid | no | FK compuesta a `clases`; índice |
| `activo_padre_id` | uuid | sí | FK compuesta `(activo_padre_id, empresa_id) → activos (id, empresa_id)`; check `activo_padre_id <> id`; un solo nivel (dominio); índice parcial |
| `tipo_de_registro` | text | no | `in ('activo','bien_de_control','de_terceros')` |
| `origen` | text | sí | `in ('compra','construccion','importacion','aporte','donacion','saldo_inicial','otro')`; `(tipo_de_registro = 'de_terceros') = (origen is null)` |
| `propietario` | text | sí | Solo de terceros (1–150): a quién pertenece; `(tipo_de_registro = 'de_terceros') = (propietario is not null)` |
| `forma_de_tenencia` | text | sí | `in ('arrendamiento','comodato','otra')`; igual que `propietario` |
| `estado` | text | no | `in ('en_construccion','en_uso','dado_de_baja')`; `en_construccion` solo con `tipo_de_registro = 'activo'` |
| `ocioso` | boolean | no | `default false`; `not ocioso or estado = 'en_uso'` |
| `ocioso_desde`, `motivo_de_ocio` | date, text | sí | `ocioso = (ocioso_desde is not null and motivo_de_ocio is not null)`; motivo 1–300 (V-4) |
| `fecha_de_adquisicion` | date | no | La del primer costo, la del documento o la de recepción |
| `fecha_de_inicio_de_uso` | date | sí | `(estado = 'en_construccion') = (fecha_de_inicio_de_uso is null)`; `>= fecha_de_adquisicion` salvo en saldo inicial (dominio) |
| `fecha_de_baja` | date | sí | `(estado = 'dado_de_baja') = (fecha_de_baja is not null)`; copia de la baja vigente |
| `porcentaje_fiscal` | numeric(5,2) | sí | Copiado de la clase al poner en uso (o en el saldo inicial); fijo tras el primer cierre que lo use (dominio). `(tipo_de_registro = 'activo' and estado <> 'en_construccion') = (porcentaje_fiscal is not null)` |
| `vida_util_contable_meses` | smallint | sí | Igual que el porcentaje; cambia solo con la revisión de la estimación (nuevo tramo) |
| `valor_residual` | numeric(14,2) | sí | `>= 0`; en monto (lo propone el porcentaje de la clase sobre el costo) |
| `valor_como_ganado_comun` | numeric(14,2) | sí | `>= 0`; obligatorio si la clase es `reproductores` (dominio: está en otra tabla) |
| `valor_de_matricula`, `valor_catastral` | numeric(14,2) | sí | `> 0` cada uno; solo edificios (dominio): matrícula fiscal y catastro municipal; el tope es el **mayor** (§3.5.1, A3) |
| `valores_del_inmueble_completo` | boolean | no | `default false`; `true` = los valores no separan terreno y edificio: el tope es el 70 % del mayor (art. 26). Solo con alguno de los dos valores |
| `marca`, `modelo`, `numero_de_serie`, `placa` | text | sí | 1–80 recortado cada uno; índice `(empresa_id, upper(numero_de_serie)) where numero_de_serie is not null` (búsqueda, sin único: dos fabricantes pueden repetir) |
| `cantidad` | integer | no | `default 1`, `>= 1`. **Ya no es informativa** (AFI): se escribe al crear y después solo la cambia una división o su anulación. Editarla a mano solo `en_construccion` y sin divisiones (dominio) |
| `en_bodega` | boolean | no | **(AFI)** `default false`; copia vigente del último traslado (`a_bodega`). Índice parcial `activos_en_bodega_idx (empresa_id) where en_bodega and estado <> 'dado_de_baja'` |
| `alta_conjunta_id` | uuid | sí | **(AFI)** Id de la operación que creó varias unidades juntas en la bandeja; sin llave (no hay tabla de altas). Índice parcial `activos_alta_conjunta_idx (alta_conjunta_id) where alta_conjunta_id is not null` |
| `localidad_id` | uuid | sí | FK compuesta a `empresas.localidades (id, empresa_id)`; vigente (la escribe el caso de uso del traslado); índice parcial |
| `departamento_id` | uuid | sí | FK compuesta a `empresas.departamentos (id, empresa_id)`; vigente; índice parcial. Debe ser de toda la empresa o de la misma localidad (dominio) |
| `responsable` | text | sí | 1–150; vigente |
| `responsable_usuario_id` | uuid | sí | FK `core.usuarios` **on delete set null**; vigente; índice parcial |
| `foto_archivo_id` | uuid | sí | FK `core.archivos` (sin `on delete`), `recurso_dueno = 'activos-fijos.activos'`; único parcial |
| `observaciones` | text | sí | 1–500 |

Únicos e índices: `activos_id_empresa_unico (id, empresa_id)` (destino de las llaves compuestas), `activos_existencias_idx
(empresa_id, clase_id, estado) include (cantidad, en_bodega)` (AFI: sirve a la lista y al reporte de existencias;
reemplaza a `activos_lista_idx (empresa_id, estado, clase_id)`), `activos_padre_idx (activo_padre_id) where activo_padre_id is not null`,
`activos_localidad_idx (empresa_id, localidad_id) where localidad_id is not null` (filtro de la lista, reportes e
inventario). RLS: solo `politicaPorEmpresa()` (AF-P2 a). Cambiar la matrícula o el catastro de un edificio en uso no se
hace con `EditarActivo` sino con su acción propia (§6.5), porque mueve la base fiscal.

Ni el costo ni la acumulada se guardan aquí: salen de `costos`, `saldos_iniciales` y `cuotas` (como el saldo de Cuentas
por pagar, U4). Las listas los traen con una consulta agrupada.

### 5.4 `activos_fijos.costos`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `activo_id` | uuid | no | FK compuesta a `activos`; índice `(activo_id, estado)` |
| `origen` | text | no | `in ('linea_de_compra','manual','saldo_inicial','division','inventario')` (`division` llega con AFI-5; `inventario` con INV-AF); único parcial `costos_saldo_inicial_unico (activo_id) where origen = 'saldo_inicial' and estado = 'vigente'` |
| `clase_de_costo` | text | no | `in ('adquisicion','importacion','flete','instalacion','construccion','honorarios','desmantelamiento','nota_de_credito','nota_de_debito','division_cedida','division_recibida','otro')`; check `(origen = 'division') = (clase_de_costo in ('division_cedida','division_recibida'))` |
| `division_id` | uuid | sí | **(AFI)** FK compuesta `(division_id, empresa_id) → divisiones (id, empresa_id)`; `(origen = 'division') = (division_id is not null)`; índice parcial `(division_id) where division_id is not null` |
| `referencia_de_origen` | uuid | sí | Solo `origen = 'inventario'`: el documento de inventario, **sin llave** (no hay `dependeDe` entre los dos módulos); `(origen = 'inventario') = (referencia_de_origen is not null)`; índice parcial |
| `documento_de_compra_id`, `linea_de_documento_id` | uuid | sí | FK compuesta `(linea_de_documento_id, documento_de_compra_id, empresa_id) → libro_de_compras.lineas_de_documento (id, documento_id, empresa_id)` (único nuevo de §4.1); `(origen = 'linea_de_compra') = (linea_de_documento_id is not null and documento_de_compra_id is not null)`; índices parciales `(linea_de_documento_id)` y `(documento_de_compra_id)` (este, para el aviso de anulación) |
| `mejora_id` | uuid | sí | FK compuesta a `mejoras`; índice parcial |
| `fecha` | date | no | La emisión del documento, o la del soporte |
| `monto` | numeric(14,2) | no | `<> 0`; `(monto < 0) = (clase_de_costo in ('nota_de_credito','division_cedida'))` |
| `aplica_al_libro_fiscal` | boolean | no | `default true`; `false` solo con `origen in ('manual','division')` (cualquier clase de costo, V-8; en una división, la parte del costo que no aplicaba, AFI) |
| `motivo_fuera_del_libro_fiscal` | text | sí | 1–300; `aplica_al_libro_fiscal = (motivo_fuera_del_libro_fiscal is null)`. En una división lo escribe el sistema («Parte no fiscal separada de AF-0200») |
| `no_es_edificacion` | boolean | no | `default false`; «No es edificación ni requiere licencia»: no entra al tope del inmueble (§3.5.1). Solo tiene efecto en edificios (dominio) |
| `documento_de_soporte` | text | sí | 1–150; obligatorio si `origen = 'manual'` |
| `archivo_id` | uuid | sí | FK `core.archivos`, `recurso_dueno = 'activos-fijos.costos'`; único parcial |
| `descripcion` | text | sí | 1–300 |
| anulación completa | | | `vigente`/`anulado` |

RLS: solo `politicaPorEmpresa()`. **Costos de un activo nunca negativos** (V-6): Σ costos vigentes del activo ≥ 0, en el
dominio con el activo bloqueado (`for update`); una nota de crédito mayor que lo capitalizado se rechaza
(`costo_de_activo_negativo`). **Regla de la línea** (dominio, con
`pg_advisory_xact_lock('activos-fijos.linea:<linea_id>')`, como la bancarización de CP4): Σ montos vigentes de una línea ≤
`costoDeLinea` (en positivo; en una nota, ≥ su costo negativo). Un trigger no puede leer el costo de la línea sin
repetir la fórmula del libro; por eso va en el dominio y una prueba de concurrencia lo cubre. Los costos de una división
no tienen línea: el costo de cada activo sigue siendo Σ sus costos vigentes y la regla de la línea no cambia (AFI).

### 5.5 `activos_fijos.descartes_de_lineas`

`id`; `documento_de_compra_id`, `linea_de_documento_id` (FK compuesta como en `costos`); `motivo` text 1–300 (obligatorio);
`vigente boolean default true`; `devuelto_en timestamptz`, `devuelto_por uuid` (`not vigente = (devuelto_en is not null)`).
Único parcial `(linea_de_documento_id) where vigente`. Índice `(documento_de_compra_id)`. Descartar audita `descartar`;
devolver a la bandeja audita `devolver`. Una línea con costos vigentes no se descarta (dominio).

La **bandeja** no tiene tabla: es una consulta sobre el libro (§6.2), como los saldos derivados.

### 5.6 `activos_fijos.saldos_iniciales`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `activo_id` | uuid | no | PK; FK compuesta a `activos` **on delete cascade** (si se elimina el activo de saldo inicial con la carga abierta) |
| `fecha_de_corte` | date | no | El día anterior a la fecha de inicio de la empresa, copiado al guardar |
| `costo` | numeric(14,2) | no | `> 0`; igual al costo `saldo_inicial` (dominio, misma transacción) |
| `depreciacion_acumulada_contable` | numeric(14,2) | no | `>= 0`, `<= costo` |
| `costo_fiscal` | numeric(14,2) | no | `> 0`; por omisión el costo (puede diferir del contable si este traía revaluaciones o costos no deducibles). Es el costo que se recupera en la venta (A1) |
| `base_fiscal` | numeric(14,2) | no | `>= 0`, `<= costo_fiscal`; por omisión el costo fiscal menos el ganado común o con el tope del inmueble |
| `depreciacion_acumulada_fiscal` | numeric(14,2) | no | `>= 0`, `<= base_fiscal` |
| `vida_util_restante_meses` | smallint | sí | `>= 0`; contable; nulo en terrenos |

RLS: empresa. Solo se escribe con la carga abierta y sin ningún cierre (§8). El costo fiscal del activo es
`saldos_iniciales.costo_fiscal` + Σ costos fiscales posteriores (el costo `saldo_inicial` cuenta solo en el contable para no
contarlo dos veces).

### 5.7 `activos_fijos.mejoras`

`id`; `activo_id` (FK compuesta); `numero`, `anio_de_numero` (correlativo `activos-fijos.mejoras`; único por empresa);
`clase in ('mejora','costo_posterior')`; `fecha` (no futura; mes abierto); `descripcion` 1–300;
`vida_util_restante_contable_meses smallint` nula (solo en mejora: la nueva vida que queda, `>= 1`); `no_es_edificacion
boolean not null default false` (se copia a sus costos: no entra al tope del inmueble, §3.5.1); anulación completa.
Índice `(activo_id, fecha)`. Sus costos la referencian; la mejora sin costos vigentes no se guarda (dominio). La pantalla
de mejora **sugiere darla de alta como componente** si es separable y tiene vida propia (un motor, un techo; V-3).

### 5.8 `activos_fijos.tramos`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `activo_id` | uuid | no | FK compuesta a `activos` |
| `libro` | text | no | `in ('contable','fiscal')` |
| `desde_periodo` | date | no | Primer día del mes; primer mes que usa este tramo |
| `causa` | text | no | `in ('inicio_de_uso','saldo_inicial','mejora','costo_posterior','revision_de_estimacion','cambio_de_matricula','division')`; `cambio_de_matricula` solo en el libro fiscal; `division` (AFI-5) en los dos |
| `division_id` | uuid | sí | **(AFI)** FK compuesta a `divisiones`; `(causa = 'division') = (division_id is not null)`; índice parcial |
| `mejora_id` | uuid | sí | FK compuesta a `mejoras`; `(causa in ('mejora','costo_posterior')) = (mejora_id is not null)` |
| `por_depreciar` | numeric(14,2) | no | `>= 0`: lo que falta al empezar el tramo (contable: valor en libros − residual; fiscal: base − acumulada) |
| `valor_residual` | numeric(14,2) | no | `>= 0`; `0` en el fiscal (`libro = 'fiscal' → valor_residual = 0`) |
| `meses` | smallint | sí | Contable: meses que faltan; `(libro = 'contable') = (meses is not null)` |
| `porcentaje`, `base_del_porcentaje` | numeric(5,2), numeric(14,2) | sí | Fiscal: `(libro = 'fiscal') = (porcentaje is not null and base_del_porcentaje is not null)` |
| `cuota_mensual` | numeric(14,2) | no | `>= 0`; calculada por el dominio (§7) y guardada para auditar el cálculo |
| `exceso_de_nota_de_credito` | numeric(14,2) | no | `default 0`, `>= 0`: lo que una nota de crédito bajó por debajo del residual (contable) o de lo ya depreciado (fiscal). Uno por libro: dos montos (V-6, §7.4) |
| `vigente` | boolean | no | `default true`; un tramo se deja de usar si se anula la mejora que lo creó (con su mes abierto) |

Único parcial `tramos_vigente_unico (activo_id, libro, desde_periodo) where vigente`. Índice `(activo_id, libro,
desde_periodo desc) where vigente`. RLS: empresa. El tramo que rige un mes es el vigente de mayor `desde_periodo <= mes`.

### 5.9 `activos_fijos.cierres`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `empresa_id`, `periodo` | uuid, date | no | PK; primer día del mes |
| `estado` | text | no | `in ('cerrado','reabierto')` |
| `cerrado_en`, `cerrado_por` | timestamptz, uuid | no | El último cierre |
| `reabierto_en`, `reabierto_por`, `motivo_de_reapertura` | | sí | `(estado = 'reabierto') = (los tres no nulos)`; motivo 1–500 |
| `regimen_isr` | text | sí | Copiado de `libro_de_compras.datos_fiscales_de_empresa` vigente en el mes (nulo si no hay); dice cómo se presenta el libro fiscal |
| `total_contable`, `total_fiscal` | numeric(14,2) | no | `>= 0`; Σ de las cuotas vigentes del mes |
| `activos_depreciados` | integer | no | `>= 0` |

Nunca se borra (como `libro_de_compras.periodos`). RLS: empresa.

### 5.10 `activos_fijos.cuotas`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `periodo` | date | no | FK `(empresa_id, periodo) → cierres` |
| `activo_id`, `libro`, `tramo_id` | | no | FK compuestas a `activos` y `tramos` |
| `monto` | numeric(14,2) | no | `>= 0` |
| `acumulada` | numeric(14,2) | no | Acumulada del libro **después** de la cuota (con la del saldo inicial) |
| `localidad_id`, `departamento_id` | uuid | sí | Centro de costo del mes (vigente al último día); FK compuestas a Empresas; índice parcial de cada una |
| `ocioso` | boolean | no | El activo estaba ocioso al cierre |
| `vigente` | boolean | no | `default true`; `false` cuando se reabre el mes (no se borra) |

Único parcial `cuotas_vigente_unica (activo_id, libro, periodo) where vigente` (repetir el cierre **no duplica**, dictamen
§5.3). Índices `(empresa_id, periodo) where vigente` y `(activo_id, libro, periodo) where vigente`. RLS:
`politicaPorEmpresa()`. La cuota fiscal de un activo ocioso se calcula y **suma a la acumulada** igual que las demás
(V-4); `ocioso` solo la separa en los reportes.

**Por qué no se borran al reabrir** [decisión del arquitecto]: dejarlas con `vigente = false` conserva lo que se
informó (y lo que Contabilidad pudo haber contabilizado) sin meter miles de filas en el `jsonb` de la auditoría; la
auditoría del reabrir guarda el cierre con sus totales. Crecen solo con cada reapertura.

### 5.11 `activos_fijos.traslados`

`id`; `activo_id` (FK compuesta); `es_alta boolean not null default false`; `grupo_id` uuid nulo (la boleta: todos los
activos que se trasladan juntos comparten grupo y número); `numero`, `anio_de_numero` (correlativo
`activos-fijos.traslados`, uno por grupo; `(es_alta) = (numero is null and grupo_id is null)`); `fecha` (no futura; mes
abierto, salvo la del alta de saldo inicial); `localidad_id`, `departamento_id`, `responsable`, `responsable_usuario_id`
(como en `activos`, todos nulos permitidos); `recibido_por` text 1–150 (obligatorio salvo en el alta, dominio);
`motivo` 1–300 (obligatorio salvo en el alta); `inventario_id` nulo (si lo propuso un inventario); **`a_bodega boolean
not null default false`** (AFI: el traslado deja el bien en la bodega de activos; en el alta lo dice «Disponible para
uso»); anulación completa. El activo nuevo de una división nace con su fila de alta (`es_alta`) con la ubicación del
origen; anular la división la borra con el activo (§6.11).
Únicos: parcial `(activo_id) where es_alta` (un alta por activo) y `(grupo_id, activo_id)`. No se guarda `hasta`: el
vigente es el de mayor `(fecha, creado_en)` no anulado, y su copia está en `activos` (`localidad_id`, `departamento_id`,
responsable y `en_bodega`). Índices `(activo_id, fecha desc)`, `(grupo_id)` y parciales de localidad, departamento y
usuario. RLS: empresa (se lee unido al activo, como `costos`).

### 5.12 `activos_fijos.bajas`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `activo_id` | uuid | no | FK compuesta; único parcial `bajas_vigente_unica (activo_id) where estado = 'vigente'` |
| `numero`, `anio_de_numero` | integer | no | Correlativo `activos-fijos.bajas` (número del acta) |
| `fecha` | date | no | No futura; mes abierto; `>= fecha_de_inicio_de_uso` |
| `causa` | text | no | `in ('venta','destruccion','robo','extravio','donacion','obsolescencia','faltante_de_inventario','devuelto_al_dueno','otra')` |
| `descripcion` | text | no | 1–500 |
| `autorizada_por` | text | no | 1–150 |
| `destino_del_bien` | text | sí | 1–300 |
| `acta_archivo_id`, `denuncia_archivo_id` | uuid | sí | FK `core.archivos`, `recurso_dueno = 'activos-fijos.bajas'`; únicos parciales |
| `tipo_de_acta` | text | sí | `in ('administrativa','notarial')` (V-12); obligatorio si hay acta (`acta_archivo_id is null or tipo_de_acta is not null`) |
| `numero_de_denuncia` | text | sí | 1–60 |
| `inventario_id` | uuid | sí | FK compuesta a `inventarios`; `(causa = 'faltante_de_inventario') = (inventario_id is not null)` |
| `costo`, `depreciacion_acumulada_contable`, `valor_en_libros` | numeric(14,2) | no | Al día de la baja; check `valor_en_libros = costo − depreciacion_acumulada_contable` |
| `costo_fiscal` | numeric(14,2) | no | `>= 0`; Σ costos con `aplica_al_libro_fiscal` (con el del saldo inicial), sin tope del inmueble y sin restar el ganado común (A1) |
| `base_fiscal`, `depreciacion_acumulada_fiscal`, `valor_fiscal_por_depreciar` | numeric(14,2) | no | Check `valor_fiscal_por_depreciar = base_fiscal − depreciacion_acumulada_fiscal` (lo que faltaba deducir; informativo) |
| `cuota_del_mes_contable`, `cuota_del_mes_fiscal` | numeric(14,2) | no | `default 0`, `>= 0`: la cuota del mes de la baja cuando la convención la deprecia (`mes_siguiente`, §6.8); ya incluida en las acumuladas de arriba. El cierre del mes la toma tal cual |
| `comprador`, `nit_del_comprador` | text | sí | Venta: 1–150; NIT válido o `CF` (dominio con `Nit`) |
| `precio`, `iva` | numeric(14,2) | sí | Venta: `precio > 0`, `iva >= 0` |
| `serie_fel`, `numero_fel`, `autorizacion_fel` | text, text, uuid | sí | Venta: número y autorización obligatorios |
| `resultado_contable`, `resultado_fiscal` | numeric(14,2) | sí | Venta: check `= precio − valor_en_libros` y `= precio − (costo_fiscal − depreciacion_acumulada_fiscal)` (A1). En las demás causas son nulos (la pérdida es el valor en libros) |
| anulación completa | | | `vigente`/`anulada`; anular devuelve el activo a `en_uso` (mes abierto) |

Check `bajas_venta_completa`: `(causa = 'venta') = (precio is not null and comprador is not null and numero_fel is not
null and autorizacion_fel is not null and resultado_contable is not null and resultado_fiscal is not null)`. Índices
`(empresa_id, fecha)`, `(activo_id)`. RLS: empresa. Un bien de control o de terceros lleva los montos en cero.

### 5.13 Inventario físico

**`activos_fijos.inventarios`**: `id`; `numero`, `anio_de_numero` (correlativo `activos-fijos.inventarios`); `localidad_id`
nulo (= toda la empresa; FK compuesta); `fecha_de_inicio` date; `estado in ('en_curso','cerrado','anulado')`;
`cerrado_en`, `cerrado_por` (`(estado = 'cerrado') = (los dos no nulos)`); `participantes` text 1–500 (para el acta);
`observaciones`; anulación completa (solo en curso). Único parcial `(empresa_id, coalesce(localidad_id, '00000000-0000-0000-0000-000000000000'))
where estado = 'en_curso'` (uno abierto por localidad). RLS: empresa.

**`activos_fijos.inventario_lineas`**: `(inventario_id, activo_id)` PK, FK compuestas; `resultado in
('pendiente','encontrado','no_encontrado','en_otra_ubicacion')` `default 'pendiente'`; `localidad_encontrada_id` nula
(`(resultado = 'en_otra_ubicacion') = (localidad_encontrada_id is not null)`); `estado_fisico in ('bueno','regular','malo')`
nulo; `observacion` 1–300; `contado_en`, `contado_por` (`(resultado <> 'pendiente') = (contado_en is not null)`);
`leido_por_qr boolean default false`; **(AFI)** `cantidad_esperada integer not null default 1` (`>= 1`, copia de
`activos.cantidad` al abrir) y `cantidad_encontrada integer` nula (`>= 0`; check `cantidad_encontrada is null or
resultado = 'encontrado'`; en un activo de cantidad 1 no se pide). Índice `(inventario_id, resultado)`. RLS: empresa.

**`activos_fijos.inventario_sobrantes`**: `id`; `inventario_id`; `descripcion` 1–300; `codigo_leido` 1–60 nulo;
`foto_archivo_id` nulo; `regularizado_con_activo_id` nulo (FK compuesta). RLS: empresa.

### 5.14 Migraciones y datos existentes

- `npm run generar -- modulo activos-fijos --nombre "Activos fijos" --descripcion "…" --icono Landmark` crea el esqueleto
  y `0000_esquema`. Cada paso del servidor genera su migración con `bd:generar -w servidor -- activos-fijos <nombre>`:
  `0001_af1_clases` (con la auditoría permanente de §4.2), `0002_af2_activos_y_traslados`, `0003_af3_costos_y_descartes`,
  `0004_af4_tramos`, `0005_af5_cierres_y_cuotas`, `0006_af6_saldos_iniciales`, `0007_af7_mejoras` (la FK de
  `costos.mejora_id` y `tramos.mejora_id` se agrega aquí), `0008_af8_boletas_firmadas`, `0009_af9_bajas`, `0010_af12_inventarios`. Si un paso se
  adelanta, cada migración toma el siguiente número libre: los nombres dicen el paso, no el número.
- **Sin datos que convertir** (módulo nuevo) ni migración de permisos (todos nuevos: el rol con acceso total los recibe
  solo). Los correlativos no necesitan fila previa.
- Libro de compras: `0037_af_servicio_capitalizable` (§4.1), **antes** de `0003_af3` porque esta apunta al único nuevo.
  Si Multimoneda toma la `0037` antes, se usa el siguiente número libre al programar.
- **Integración (AFI)**, fundida en las migraciones previstas porque el módulo aún no tiene datos: `en_bodega`,
  `alta_conjunta_id`, `activos_existencias_idx` y `traslados.a_bodega` entran en `0002_af2_activos_y_traslados`;
  `cantidad_esperada` y `cantidad_encontrada`, en `0009_af12_inventarios`. Migraciones propias, con el siguiente número
  libre al programarlas: `00xx_af8_boletas_firmadas` (§5.16, con AF-8) y `00xx_afi_divisiones` (§5.15, cambios de
  `costos` y `tramos`, y `activos-fijos.divisiones` en `core.recursos_de_auditoria_permanente`; después de
  `0005_af5_cierres_y_cuotas` y `0007_af7_mejoras`). El valor `'inventario'` de `costos.origen` y
  `costos.referencia_de_origen` llegan con INV-AF.
- **Empresas (AF-P22 b)**: `00xx_nombres_de_ubicaciones` con las dos funciones de §6.13 (siguiente número libre del
  esquema `empresas`), antes de AF-2c.
- Orden: el migrador aplica `libro-de-compras` antes que `activos-fijos` (dependencia); la prueba `llaves-entre-esquemas`
  acepta las llaves a `empresas` (esencial), `core`, `libro_de_compras` (directo) y `terceros` (transitivo). Ninguna a
  `inventarios` (AFI).

### 5.15 `activos_fijos.divisiones` (AFI)

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK; único `divisiones_id_empresa_unico (id, empresa_id)` |
| `activo_origen_id` | uuid | no | FK compuesta `(activo_origen_id, empresa_id) → activos`; índice |
| `activo_nuevo_id` | uuid | sí | FK compuesta `(activo_nuevo_id, empresa_id) → activos (id, empresa_id)` **`on delete set null (activo_nuevo_id)`** (PostgreSQL 16; el activo nuevo solo se borra al anular, §6.11); único parcial `(activo_nuevo_id) where activo_nuevo_id is not null`; check `estado = 'anulada' or activo_nuevo_id is not null`; check `activo_nuevo_id <> activo_origen_id` |
| `codigo_del_activo_nuevo` | text | no | Copia para la historia (1–30) |
| `fecha` | date | no | No futura; mes abierto |
| `periodo` | date | no | Primer día del mes desde el que rigen los tramos de la división (check de primer día) |
| `cantidad_original`, `cantidad_separada` | integer | no | Check `cantidad_separada >= 1 and cantidad_separada < cantidad_original` |
| `causa` | text | no | `in ('manual','traslado','baja','inventario','separar_en_unidades')` |
| `motivo` | text | no | 1–300; en las automáticas lo escribe el sistema («Entrega parcial, boleta 2027-0012») |
| `costo_separado`, `costo_fiscal_separado` | numeric(14,2) | no | `>= 0`; `costo_fiscal_separado <= costo_separado` |
| `acumulada_contable_separada`, `acumulada_fiscal_separada`, `residual_separado` | numeric(14,2) | no | `>= 0`; acumulada contable `<=` costo separado, fiscal `<=` costo fiscal separado |
| anulación completa | | | `estado in ('vigente','anulada')`, `anulado_en`, `anulado_por`, `motivo_de_anulacion` con el check de siempre |

Índices `(empresa_id, periodo) where estado = 'vigente'` (para `acumuladaAl` y el cierre) y `(activo_origen_id)`. RLS:
`politicaPorEmpresa()`. Auditoría permanente (§4.2).

### 5.16 `activos_fijos.boletas_firmadas` (AFI, I-8 b)

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `grupo_id` | uuid | no | PK `(empresa_id, grupo_id)`: la boleta. Sin llave a `traslados` (`grupo_id` no es único allí): el caso de uso revisa que el grupo exista y no esté anulado |
| `archivo_id` | uuid | no | FK `core.archivos` (sin `on delete`), `recurso_dueno = 'activos-fijos.traslados'`; único |
| `subido_en`, `subido_por` | timestamptz, uuid | no | Quién subió el escaneo vigente (las marcas de tiempo y la autoría también) |

RLS: `politicaPorEmpresa()`. Un PDF o imagen revisado como los demás archivos (qpdf, tamaño, `recurso_dueno`). Reemplazar
el archivo audita `adjuntar` con el anterior; la fila no se borra (anular el traslado no borra la boleta firmada).

## 6. Reglas (un caso de uso por acción)

Todas corren en `UnidadDeTrabajo.ejecutar` y toman, si escriben algo con fecha, el **candado compartido del cierre**
`pg_advisory_xact_lock_shared(hash('activos-fijos.cierre:<empresa>'))`; cerrar y reabrir toman el exclusivo. Así un
traslado no entra a un mes mientras se cierra. «Mes abierto» = no hay fila en `cierres` con `estado = 'cerrado'` para ese
mes.

### 6.1 Clases (`CrearClase`, `EditarClase`, `InactivarClase`, `ReactivarClase`, `EliminarClase`)

El porcentaje no pasa del máximo de su inciso (`activos-fijos.isr.maximo.<inciso>`); terrenos en 0 sin vida útil.
Editar el porcentaje o la vida **no cambia** activos existentes (se avisa: «Los N activos de la clase conservan el suyo»).
Eliminar solo sin activos ni conceptos ligados; si no, inactivar.

### 6.2 Bandeja por capitalizar (`ListarBandeja`, `CapitalizarLineas`, `DescartarLinea`, `DevolverLineaALaBandeja`)

Entra una línea si su documento está **vigente** y: la línea tiene `es_activo_fijo`, **o** es de una nota cuya factura
tiene costos vigentes; y además lo capitalizado ≠ su costo y no tiene descarte vigente. Muestra documento, proveedor,
fecha, concepto, tipo, costo, ya capitalizado, pendiente, clase propuesta (`clases_por_concepto`), «Bajo el umbral» y el
activo propuesto en las notas. Filtros: período, proveedor, concepto, con o sin propuesta. Una línea de un documento con
emisión anterior a la fecha de inicio lleva el aviso «Anterior a la fecha de inicio: si el bien ya estaba en el balance
de apertura, cárguelo como saldo inicial y descarte la línea».

`CapitalizarLineas` (`costos.crear`) recibe `{ asignaciones: [{ lineaId, activoId | activoNuevo, montoCentavos }] }`: en
una transacción crea los activos nuevos (`en_construccion` o directo `en_uso` si trae fecha de uso, §6.4), los costos y,
si el activo ya está en uso, la mejora o el costo posterior (§6.6). Revisa la regla de la línea con su candado. Un
activo nuevo hereda la fecha de adquisición de la primera línea, la clase propuesta y la localidad que se elija.

**Unidades y alta conjunta (AFI, I-4 a e I-13 a).** Cada asignación con `activoNuevo` acepta además:

- `unidades` (1–200, por omisión 1): cuántos activos iguales se crean. El monto se reparte: cada uno recibe
  `floor(monto / unidades)` centavos y el **último** el sobrante (Q750,000.01 en 3 → 250,000.00, 250,000.00 y
  250,000.01).
- `cantidadPorActivo` (por omisión 1): las piezas de cada activo (grupo).
- `detalleDeUnidades` (opcional, hasta `unidades` renglones): código (los correlativos consecutivos se proponen y se
  editan), número de serie, placa, marca y modelo (copiados del primero). Lo que falte se completa en la ficha; el
  reporte de existencias marca «sin serie».
- Todos los activos creados en la asignación comparten `alta_conjunta_id` (un uuid nuevo).

Una asignación también puede apuntar a una **alta conjunta** (`altaConjuntaId`) en vez de a un activo: el monto se
reparte igual entre sus activos **vigentes** (no dados de baja), con el sobrante al último, y en los que ya están
disponibles crea su costo posterior (§6.6). Sin activos vigentes: `alta_conjunta_sin_activos_vigentes`. Más de 200
unidades en una operación: `demasiadas_unidades`. Los códigos se validan juntos **antes** de insertar (repetidos en la
cuadrícula o ya usados: error por renglón) y el correlativo se pide de una vez para el bloque; la inserción va en tandas
(R-15). La regla de la línea no cambia: Σ costos vigentes de la línea ≤ su costo.

### 6.3 Activos (`CrearActivo`, `EditarActivo`, `EliminarActivo`, `MarcarOcioso`)

- Alta manual (`activos.crear`): con o sin costos manuales; `fecha_de_adquisicion >= fecha de inicio` de la empresa (si
  es anterior, el error dice «cárguelo como saldo inicial»). La primera fila de `traslados` (alta) se crea aquí.
- Editar (`activos.editar`) cambia solo datos descriptivos (descripción, marca, modelo, serie, placa, observaciones,
  foto). La **cantidad** solo `en_construccion` y sin divisiones (AFI; después se cambia con una división). Clase, tipo de
  registro y padre se cambian solo `en_construccion`; la matrícula y el catastro, libres mientras
  no haya tramos fiscales, y después solo con §6.5.
- `MarcarOcioso` (`activos.editar`): marcar pide fecha y **motivo** (V-4) y avisa «La cuota fiscal sigue sumando a la
  acumulada; se deduce por omisión, pero se informa aparte por el riesgo de que la SAT no la acepte (art. 25)». Quitar la
  marca pide fecha. Los dos auditan `corregir`.
- Eliminar (`activos.eliminar`) solo si no tiene cuotas, ni bajas, ni costos vigentes de líneas (anularlos primero),
  ni componentes; audita `eliminar` con el DTO.

### 6.4 Poner en uso (`PonerEnUso`, `activos.poner-en-uso`)

Fecha de inicio de uso (mes abierto; no anterior al último costo vigente), porcentaje fiscal (≤ máximo; propuesto por la
clase), vida útil y residual contables (propuestos). Exige costo vigente > 0 (salvo terrenos). Crea los dos tramos
`inicio_de_uso` (§7) desde el mes que manda `primer_mes`. Deshacerlo (`QuitarDeUso`, mismo permiso, auditoría `devolver`)
solo si ningún cierre usó sus tramos.

En la pantalla se llama **«Disponible para uso»** (AFI, §3.2): la fecha es la de recibido y listo, en los dos libros. Al
ponerlo disponible se elige la ubicación: localidad, departamento, responsable y la casilla **«En bodega de activos»**
(marcada por omisión si no se escribe responsable). Si el activo solo tiene su fila de alta, esa fila toma la ubicación
y el `a_bodega` elegidos (aún no hubo boleta ni nada impreso); si ya tuvo traslados, el cambio de ubicación es un
traslado con boleta en la misma transacción (motivo «Disponible para uso»).

**Por lote** (`PonerEnUsoVarios`, mismo permiso; AFI): hasta 200 activos (por ejemplo, los 3 de una alta conjunta), todos
`en_construccion` con costo vigente > 0, con **una** fecha (mes abierto), los mismos parámetros propuestos por su clase
(porcentaje fiscal, vida útil y residual; se pueden cambiar por activo) y la misma ubicación y `a_bodega`. Todo o nada, en
una transacción, con el candado compartido del cierre.

### 6.5 Revisión de la estimación (`RevisarEstimacion`, `activos.revisar-estimacion`)

Nueva vida útil restante y nuevo residual (solo libro contable), con motivo, desde el primer mes abierto. Crea un tramo
`revision_de_estimacion`. Audita `corregir` con el activo y el tramo anteriores. El porcentaje fiscal **no** se revisa:
si ya hubo un cierre, el error `porcentaje_fiscal_adoptado` cita los arts. 27 y 28.

**Cambio de matrícula o catastro** (`CambiarValorFiscalDelInmueble`, mismo permiso `activos.revisar-estimacion`; A3):
nuevos `valor_de_matricula`, `valor_catastral` y `valores_del_inmueble_completo`, con motivo y documento de soporte
(texto). Hacia adelante: crea un tramo fiscal `cambio_de_matricula` desde el primer mes abierto con la base recalculada
(§3.5.1) y el mismo porcentaje; nunca toca meses cerrados. Audita `corregir` con los valores y el tramo anteriores.

### 6.6 Mejoras y costos posteriores (`RegistrarMejora`, `AnularMejora`; `mejoras.crear`, `mejoras.anular`)

Agrupa costos (de la bandeja o manuales) con su fecha (mes abierto), la marca «No es edificación ni requiere licencia»
(edificios) y, en una mejora, la nueva vida restante. Crea en cada libro un tramo desde el mes que toca (`primer_mes`
sobre la fecha de la mejora), con la base de §7.3 y §7.4 (V-3). Si lo agregado es separable y tiene vida propia, la
pantalla sugiere darlo de alta como **componente** en vez de mejora. Anular: solo si ningún cierre usó sus tramos; anula
los costos y deja los tramos `vigente = false`; audita `anular`.

### 6.7 Traslados (`TrasladarActivos`, `AnularTraslado`; `traslados.crear`, `traslados.anular`)

Uno o varios activos (una boleta por traslado, con todos sus activos: `traslados` lleva un `grupo_id` uuid común para
imprimir la boleta conjunta). Fecha no anterior al último traslado del activo, en mes abierto. Actualiza la ubicación
vigente del activo y de sus componentes. Anular: solo el último del activo y en mes abierto; restaura la ubicación
anterior; audita `anular`.

**Ampliado (AFI):** recibe `{ fecha, destino, aBodega, marcarOcioso?, renglones: [{ activoId, cantidad? }] }`.

- `aBodega` se copia a cada fila y a `activos.en_bodega`. Con `marcarOcioso` (solo con `aBodega`), llama a `MarcarOcioso`
  en la misma transacción (con fecha del traslado y motivo obligatorio).
- Un renglón con `cantidad < activo.cantidad` llama a `DividirActivo` (causa `traslado`, motivo con el número de la
  boleta) y traslada el activo **nuevo**; con `cantidad = activo.cantidad` o sin ella, traslada el activo entero.
- El destino puede ser cualquier localidad o departamento **activo** de la empresa (AF-P22 b): el selector se llena con
  §6.13 y la llave compuesta valida la empresa.
- Anular un traslado que provocó una división no la anula: la división se anula aparte (§6.11), después del traslado.
- **Boleta firmada** (I-8 b): `SubirBoletaFirmada` (`traslados.crear`) guarda o reemplaza el escaneo de un grupo
  (§5.16); bajarla pide `activos.ver`.

### 6.8 Bajas y ventas (`DarDeBaja`, `RegistrarVenta`, `AnularBaja`; `bajas.crear`, `bajas.anular`)

Fecha en mes abierto y no anterior al inicio de uso. Calcula los congelados con las cuotas cerradas más la del propio mes
si `primer_mes = mes_siguiente` (§3.6): como el mes de la baja todavía no está cerrado, la cuota de ese mes se calcula con
el mismo dominio del cierre y se guarda aparte en la baja (`cuota_del_mes_contable`, `cuota_del_mes_fiscal`,
numeric(14,2) no nulas `default 0`), para que el cierre del mes la tome sin recalcular. Congela el costo fiscal y el
resultado fiscal de A1. Avisos: sin acta, robo o extravío sin denuncia, donación (IVA, V-12), faltante sin acta,
componentes que también se dan de baja, ganancia de capital e IVA en la venta, venta de reproductor (V-10). Anular: mes abierto; audita
`anular` con el DTO; el activo vuelve a `en_uso`.

**Baja o venta de una parte (AFI):** `cantidad?` menor que la del activo → `DividirActivo` (causa `baja`) y la baja del
activo nuevo, en una transacción, con `bajas.crear` (no pide `divisiones.crear`). Anular esa baja deja el activo nuevo
en uso; para devolver la cantidad al origen se anula después la división (§6.11).

### 6.9 Cierre mensual (`RevisarCierre`, `CerrarMes`, `ReabrirMes`; `depreciacion.ver`, `.cerrar`, `.reabrir`)

- **Orden**: se cierra el mes siguiente al último cerrado; el primero es el mes de la fecha de inicio de la empresa (o
  el del primer inicio de uso, si no hay fecha de inicio). Sin huecos.
- **Completo**: como solo hay RLS por empresa (AF-P2 a), quien cierra ve todos los activos; no hace falta revisar alcance.
- **Revisar** (antes de confirmar, como EM-2): hallazgos `aviso` —líneas en la bandeja con fecha del mes o anterior;
  activos en construcción con más de 12 meses; inventario en curso; activos en uso sin localidad; edificios sin
  matrícula ni catastro (§3.5.1); tramos del mes con `exceso_de_nota_de_credito` (los dos montos, V-6); activos ociosos
  con su cuota fiscal del mes (V-4); **«N bienes llevan más de X meses en bodega»** (AFI, X =
  `activos-fijos.bodega.meses_de_aviso`; revisar deterioro, sección 27)— y `bloquea`
  —costos vigentes de documentos **anulados** (§15, R-1); el mes anterior sin cerrar; carga inicial abierta con activos
  de saldo inicial (AF-P21)—. Muestra los totales que saldrán.
- **Cerrar**: candado exclusivo; para cada activo `en_uso` con libros (y los dados de baja en el mes si la convención lo
  pide) toma el tramo del mes, calcula la cuota (§7) con la acumulada de `acumuladaAl` (que suma las divisiones
  recibidas y resta las cedidas, §7.6), la guarda con el centro de costo del último día del mes, y guarda
  el cierre con sus totales y el régimen de ISR. Idempotente por el único parcial. Publica
  `activos-fijos.depreciacion_cerrada` (§9).
- **Reabrir**: solo el último cerrado, con motivo (1–500); marca sus cuotas `vigente = false`, pone el cierre
  `reabierto` y audita `reabrir` con el cierre anterior (DTO con totales por clase). Publica
  `activos-fijos.depreciacion_reabierta`. Reabrir varios meses = de uno en uno, del último hacia atrás.

### 6.10 Inventario físico (`AbrirInventario`, `ContarActivo`, `RegistrarSobrante`, `CerrarInventario`, `AnularInventario`)

Abrir copia la lista (§3.9). `ContarActivo` acepta el id leído del QR o el código: si el activo no es de la lista
responde «es de otra localidad (X)» y lo marca `en_otra_ubicacion` en la línea si está en la lista, o lo registra como
sobrante con su código si no lo está. Cerrar deja los pendientes como `no_encontrado` (con confirmación) y devuelve las
propuestas; las bajas y traslados propuestos se hacen después con `DarDeBaja` (causa `faltante_de_inventario`, ligada) y
`TrasladarActivos` (ligado). Anular un inventario en curso audita `anular`.

**Grupos (AFI):** `ContarActivo` acepta `cantidadEncontrada` en un activo de cantidad mayor que 1. Si al cerrar es menor
que la esperada, la propuesta es `DarDeBaja` con `cantidad` = la diferencia (división causa `inventario` y baja
`faltante_de_inventario`, ligadas al inventario); si es mayor, la diferencia es un sobrante.

### 6.11 Divisiones (`DividirActivo`, `SepararEnUnidades`, `AnularDivision`; AFI)

- **Cuándo**: a mano con la acción «Dividir» de la ficha (`divisiones.crear`: cantidad, fecha y motivo); sola al
  trasladar, dar de baja o cerrar un inventario físico con una cantidad menor que la del activo (con el permiso de esa
  acción; es proporcional, no hay nada que decidir); y **«Separar en unidades»** (`divisiones.crear`): un activo de
  cantidad N en N activos de 1 (`n − 1` divisiones de 1 en una transacción; tope 200).
- **No se divide** (`division_no_permitida`, con la causa): un activo dado de baja; un padre con componentes o un
  componente; las clases `edificios`, `terrenos`, `reproductores`, `intangibles` y `llave` (su base fiscal tiene topes
  propios y no son grupos); un activo con un traslado, mejora o baja con fecha **posterior** a la de la división
  (`division_con_movimientos_posteriores`); con la fecha en un mes cerrado. Cantidad fuera de `1 <= k < n`:
  `cantidad_a_separar_invalida`.
- **Candados**: el compartido del cierre y el del activo de origen (`select … for update`).
- **Efecto** (cálculo en §7.6): costos `division_cedida` y `division_recibida`; un tramo `division` por libro en los dos
  activos; el activo nuevo copia descripción, clase, tipo de registro, marca, modelo, fechas de adquisición y de uso,
  porcentaje, vida útil, ubicación, `en_bodega`, ocioso y `alta_conjunta_id`; recibe un **código nuevo** (correlativo o
  escrito) y su fila de alta en `traslados` con la ubicación del origen. El origen queda con `cantidad = n − k`.
  En construcción solo se reparten los costos; en un bien de control, solo la cantidad (y los costos de referencia, si
  tiene).
- **Anular** (`AnularDivision`, `divisiones.anular`; I-9 a): solo con la fecha en un mes abierto y si **ninguno** de los
  dos activos tiene, después de la división, cuotas, traslados (salvo el alta), mejoras, bajas ni otra división. Anula
  sus costos, deja `vigente = false` sus tramos, **borra** el activo nuevo (con su fila de alta; la llave de
  `divisiones` queda en nulo) y devuelve la cantidad al origen. La fila de la división queda `anulada` con el código del
  activo nuevo. Audita `anular` con el DTO de la división y de los dos activos.
- Publica `activos-fijos.activo_dividido` o `activos-fijos.division_anulada` (§9).

### 6.12 Órdenes que atiende (AFI e INV-AF)

| Orden | Quién la pide | Regla |
|---|---|---|
| `activos-fijos.obtener_umbral_de_capitalizacion` (`ObtenerUmbralDeCapitalizacion`) | Inventarios (aviso de I-11) | `{ empresaId }` → `{ umbralCentavos }` con `activos-fijos.capitalizacion.umbral` de la empresa, o `null` si es 0. Sin permiso propio (la ruta de quien pregunta ya lo exige) |
| `activos-fijos.obtener_activo` | Inventarios (INV-AF) | `{ activoId }` → código, descripción y estado, o `null` |
| `activos-fijos.recibir_costo_de_inventario` | Inventarios (INV-AF) | Solo a un activo `en_construccion`; crea un costo `origen = 'inventario'` en la misma transacción. Con el aviso `inventarios.salida_por_anular` lo anula o lanza su error |

Con Activos fijos inactivo el mediador no las llama: Inventarios no muestra el aviso ni ofrece los destinos de obra.

### 6.13 Nombres de localidades y departamentos (AF-P22 b) — **para revisión de `seguridad`**

**Problema.** Activos fijos no tiene alcance (AF-P2 a), pero `empresas.localidades` y `empresas.departamentos` sí: quien no
tiene la localidad asignada ni `empresas.localidades.ver-todas` ve el activo y **no** el nombre de su localidad, y el
selector de destino del traslado solo le ofrece las suyas. El usuario eligió **b**: mostrar el nombre igual.

**Contrato: dos funciones de Empresas** (migración de Empresas, §4.3; las escribe y prueba Empresas, no Activos fijos):

```sql
-- Solo id, código, nombre y si está activa; de la empresa activa de la transacción; sin el alcance de localidades.
CREATE FUNCTION empresas.nombres_de_localidades(ids uuid[] DEFAULT NULL)
  RETURNS TABLE (id uuid, codigo text, nombre text, activo boolean)
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = pg_catalog, empresas
AS $$
  SELECT l.id, l.codigo, l.nombre, l.activo
  FROM empresas.localidades l
  WHERE l.empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid
    AND (ids IS NULL OR l.id = ANY (ids))
$$;
-- empresas.nombres_de_departamentos(ids uuid[] DEFAULT NULL): igual, con (id, codigo, nombre, localidad_id, activo).
REVOKE ALL ON FUNCTION … FROM PUBLIC;
GRANT EXECUTE ON FUNCTION … TO arrancar_app;
```

| Regla | Por qué |
|---|---|
| `SECURITY DEFINER` con `search_path` fijo (`pg_catalog, empresas`) y nombres con esquema | Corre como el dueño de la tabla (que no está sujeto a la RLS: el proyecto no usa `force row level security`); el `search_path` fijo evita que alguien la desvíe con un objeto propio. Mismo patrón que `libro_de_compras.autorizacion_registrada_fuera` (L4) |
| Filtra por `app.empresa_id` de la transacción, **nunca** por un parámetro | Sin contexto de empresa no devuelve nada; no se puede pedir otra empresa ni otra cuenta |
| Columnas fijas: id, código, nombre, activo (y `localidad_id` en departamentos) | Ni dirección, ni municipio, ni datos del SAT, ni accesos: solo lo que el activo ya muestra |
| `STABLE`, solo lectura, sin `RETURNS SETOF` de la tabla | No expone filas completas ni cambia nada |
| `REVOKE … FROM PUBLIC` y `GRANT EXECUTE` solo a `arrancar_app` | Nadie más la llama |
| No hay permiso dentro de la función (la base no conoce los permisos de la app) | Lo que la protege son las **rutas**: Activos fijos solo la usa en consultas de rutas con `activos-fijos.*.ver` o `traslados.crear`/`inventarios.crear` |

**Uso desde Activos fijos** (solo en `infraestructura`, como la lectura de tablas de Empresas que permite PLAN §3.2):

- Listas, ficha, reportes y boletas: `left join empresas.nombres_de_localidades() u on u.id = a.localidad_id` (y la de
  departamentos), en vez de unirse a la tabla. Una localidad inactiva sigue mostrando su nombre.
- Selectores de destino (traslado, «Disponible para uso», abrir inventario): ruta `GET /activos-fijos/ubicaciones`
  (`traslados.crear` o `inventarios.crear`) que da las **activas** con el departamento y su localidad.
- No hace falta una orden del mediador: la función ya es el contrato entre módulos y una orden solo la envolvería. Si
  otro módulo la necesita (por ejemplo, Inventarios para la localidad de una bodega que el bodeguero ve), la usa igual.

**Lo que se acepta al elegir b** (para `seguridad`): cualquier usuario con un permiso de lectura de Activos fijos ve los
**nombres y códigos de todas** las localidades y departamentos de la empresa, aunque Empresas se los oculte; y puede
trasladar un activo a una localidad que no ve en Empresas. No ve ni cambia nada más de la localidad. Es coherente con
AF-P2 a («todos lo ven»).

**Pruebas** (integración, con PostgreSQL real): un usuario sin la localidad asignada recibe su nombre; sin
`app.empresa_id` no recibe nada; con la empresa A activa no recibe las de la empresa B de la misma cuenta ni las de otra
cuenta; `arrancar_app` no puede leer la tabla sin alcance por otra vía; la función no devuelve columnas de más (la prueba
compara el tipo de la fila).

## 7. Cálculo de la depreciación (dominio puro, `dominio/depreciacion/*.ts`, con pruebas)

Todo en centavos enteros; redondeo al centavo «mitad hacia arriba», como el resto del proyecto.

### 7.1 Primer mes de un tramo

`mes(fecha) = date_trunc('month', fecha)`. Con `primer_mes = mes_de_inicio`, el tramo de un inicio de uso empieza en
`mes(fecha_de_inicio_de_uso)`; con `mes_siguiente`, en el mes siguiente. Mejoras y costos posteriores siguen la misma
regla sobre su fecha, pero nunca antes del primer mes abierto.

### 7.2 Libro contable

Al abrir un tramo: `VL0` = costo vigente − acumulada contable al cierre anterior; `R` = residual; `N` = meses que faltan
(inicio: vida útil; mejora: la nueva vida restante o, si no se da, los meses que le quedaban al tramo anterior;
revisión: la nueva). `por_depreciar = VL0 − R`, `cuota_mensual = round(por_depreciar / N)`.

Cuota del mes `k` del tramo (`k = 1…N`): `min(cuota_mensual, pendiente)`, y en `k = N` la cuota es **todo el pendiente**
(absorbe el redondeo). Si `por_depreciar <= 0`, no hay cuota.

### 7.3 Libro fiscal

Al abrir un tramo: `B` = base fiscal (costos con `aplica_al_libro_fiscal`, menos el ganado común en reproductores, con el
tope del inmueble de §3.5.1 en edificios); `A` = acumulada fiscal; `p` = porcentaje del activo.
`por_depreciar = B − A`; `base_del_porcentaje = B` al inicio de uso y `por_depreciar` en una mejora (art. 26: «la nueva
base es el saldo no depreciado más la mejora», V-3); en un **costo posterior** y en un **cambio de matrícula**,
`base_del_porcentaje = B` (la base fiscal total ya corregida) **sin reiniciar la vida**: sigue el mismo porcentaje sobre la
base corregida hasta agotar el pendiente (V-3). `cuota_mensual = round(base_del_porcentaje × p / 1200)`. Cuota del mes:
`min(cuota_mensual, pendiente)`; termina cuando el pendiente llega a cero.

Base fiscal `B` en edificios: `min(Σ costos fiscales de edificación, tope) + Σ costos fiscales con no_es_edificacion`, con
el tope de §3.5.1. En reproductores: costo fiscal − valor como ganado común.

La acumulada fiscal **avanza siempre**, también en los meses en que el activo está ocioso (V-4): la cuota es deducible por
omisión (P-B) y los reportes la muestran en la línea aparte «Cuota fiscal de bienes ociosos (riesgo de no deducibilidad,
art. 25)».

### 7.4 Costos posteriores y notas de crédito

Un costo positivo después del inicio de uso suma al `VL0` y a `B` del tramo nuevo. Una nota de crédito resta; si dejara el
valor en libros por debajo del residual, el pendiente contable queda en cero y lo que sobra va a
`exceso_de_nota_de_credito` del tramo contable; si dejara la base fiscal por debajo de lo ya depreciado, igual en el
tramo fiscal. Son **dos montos** distintos (V-6): el contable lo trata Contabilidad como ingreso y el fiscal se informa para la conciliación del
ISR. Los dos salen como hallazgo del cierre y en el evento. Nunca hay cuotas
negativas, y la suma de los costos vigentes de un activo nunca es negativa (§5.4).

### 7.5 Ejemplo (para las pruebas)

Pick-up de Q250,000.00 puesto en uso el 10-mar-2027, `mes_de_inicio`, fiscal 20 %, contable 60 meses con residual
Q25,000.00. Contable: `(250,000.00 − 25,000.00) / 60 = 3,750.00` por mes, de mar-2027 a feb-2032. Fiscal:
`250,000.00 × 20 / 1200 = 4,166.666… → 4,166.67`; 59 cuotas de 4,166.67 = 245,833.53 y la 60.ª de 4,166.47. En
dic-2027 (10 cuotas) la diferencia temporaria es `41,666.70 − 37,500.00 = 4,166.70`.

### 7.6 División de un activo (AFI, dominio puro `dominio/depreciacion/division.ts`)

Con `n` = cantidad del activo y `k` = cantidad separada (`1 <= k < n`), para cada cifra `Q` del activo **al cierre del mes
anterior** a la división: `Q_nuevo = round(Q × k / n)` (mitad hacia arriba, centavos) y `Q_origen = Q − Q_nuevo` (el
sobrante queda en el origen).

| Cifra `Q` | De dónde sale |
|---|---|
| Costo que aplica al libro fiscal y costo que no aplica | Σ costos vigentes por `aplica_al_libro_fiscal` (cada uno da un par de costos de división si tiene monto) |
| Depreciación acumulada contable y fiscal | `acumuladaAl(activo, libro, mes anterior)` |
| Valor residual | `activos.valor_residual` |
| `base_del_porcentaje` del tramo fiscal vigente | Así la cuota fiscal de cada parte sigue al mismo porcentaje |

- **Tramos**: en los dos activos y en los dos libros, un tramo `causa = 'division'` desde `max(mes de la división, desde
  del tramo vigente)`, con §7.2 y §7.3: el contable con los **meses que le faltaban** al tramo del origen; el fiscal con
  su `base_del_porcentaje` proporcional. El mes de la división se reparte entre los dos (ninguno tiene cuota de ese mes:
  está abierto).
- **Acumulada**: `acumuladaAl(activo, libro, mes)` = saldo inicial + Σ cuotas vigentes hasta el mes + Σ acumuladas
  recibidas en divisiones vigentes − Σ cedidas. La usan el cierre, las bajas, la ficha, los reportes y el registro
  auxiliar. Las cuotas de meses anteriores **se quedan en el origen**: lo informado no se reescribe.
- Muchas divisiones pequeñas acumulan centavos: la última cuota de cada tramo absorbe el pendiente (§7.2), y una prueba
  hace 50 divisiones de 1 (R-13).

**Ejemplo para las pruebas.** 50 sillas, costo Q15,000.00, fiscal 20 %, contable 60 meses sin residual, disponibles en
ene-2027, `mes_de_inicio`. Cerrado jun-2027: 6 cuotas de 250.00, acumulada 1,500.00 en los dos libros. División de 20 en
jul-2027: nuevo, costo 6,000.00, acumulada 600.00, tramo contable `(6,000 − 600) / 54 = 100.00`, fiscal `6,000 × 20 / 1200
= 100.00`; origen, 9,000.00, acumulada 900.00, cuotas de 150.00. La suma por mes sigue en 250.00.

## 8. Saldos iniciales y la carga inicial (EM-2)

- **Pantalla de Administración «Saldos iniciales de activos fijos»** (con Excel, §14): solo con fecha de inicio, carga
  **abierta** (`empresas.obtener_carga_inicial`, que bloquea la fila `for share`) y **ningún cierre** de depreciación.
  Cada fila crea un activo `origen = 'saldo_inicial'` `en_uso` (o `en_construccion` si la obra no se terminó) con:
  código, descripción, clase, fechas reales de adquisición y de inicio de uso (anteriores a la fecha de inicio), costo,
  depreciación acumulada contable y fiscal al corte, costo fiscal (A1) y base fiscal, porcentaje fiscal, vida útil
  restante, residual, matrícula y catastro (edificios), localidad, departamento y responsable, y (AFI) **cantidad** y
  **en bodega**. Crea el costo `saldo_inicial`, la fila de `saldos_iniciales`, el traslado del
  alta (con `a_bodega`) y los dos tramos `saldo_inicial` desde el mes de la fecha de inicio.
- Componentes en el saldo inicial: columna «Código del padre» (el padre en otra fila del mismo archivo o ya cargado).
- Editar o eliminar un saldo inicial: carga abierta y sin cierres (`saldos-iniciales.editar` / `.eliminar`, auditoría).
- **Respuesta a `empresas.revisar_cierre_de_carga`** (`RevisarCierreDeCargaEnActivosFijos`):

| Código | Nivel | Mensaje |
|---|---|---|
| `sin_saldos_iniciales` | aviso | «No hay ningún activo fijo de saldo inicial. Si la empresa tenía activos al dd/mm/aaaa, cárguelos antes de cerrar.» |
| `vida_agotada_con_saldo` | aviso | «N activos de saldo inicial no tienen vida útil restante pero sí valor por depreciar por Q x: revise su vida o su depreciación acumulada.» |
| `sin_ubicacion` | aviso | «N activos de saldo inicial no tienen localidad: el inventario físico no los encontrará.» |
| `en_construccion` | aviso | «N obras en construcción por Q x entran en el balance sin depreciar.» |

  Cifras (`registro = null`): Activos (cantidad), Costo, Depreciación acumulada contable, Valor en libros, Costo fiscal,
  Base fiscal, Depreciación acumulada fiscal (montos); por clase (`registro` = la clase): Costo y Depreciación acumulada contable.
  Resumen: «N activos de saldo inicial al dd/mm/aaaa». Ruta: `/activos-fijos/saldos-iniciales`. Con el módulo activo y
  nada que decir, responde con el aviso `sin_saldos_iniciales` (como Bancos y Cuentas por pagar, P-3 de EM-2).
- **Aviso `empresas.fecha_de_inicio_por_cambiar`**: rechaza (`activos_con_fecha_fuera_de_la_carga`) si algún saldo
  inicial tiene adquisición o inicio de uso igual o posterior a la fecha nueva, si algún activo de otro origen quedaría
  con adquisición anterior a ella, o si ya hay un cierre de depreciación. Si no, actualiza `fecha_de_corte` y los
  `desde_periodo` de los tramos de saldo inicial.

## 9. Eventos para la futura Contabilidad (`core/contratos/activos-fijos.contratos.ts`)

Se publican en el bus **después de confirmar**. Todos llevan `empresaId`, `activoId`, `claseId`, `incisoFiscal`,
`localidadId`, `departamentoId`, `fecha` y `periodo`; el dinero en **centavos** enteros (quetzales), separando contable y
fiscal (dictamen §5.3).

| Evento | Cuándo | Datos propios |
|---|---|---|
| `activos-fijos.activo_capitalizado` | Se guardan costos (alta o suma a un activo, también en construcción) | `costos: [{ costoId, origen, claseDeCosto, documentoDeCompraId, lineaDeDocumentoId, montoCentavos, aplicaAlLibroFiscal, noEsEdificacion }]`, `altaConjuntaId` (AFI) |
| `activos-fijos.activo_dividido` (AFI) | Dividir (a mano o automática) | `divisionId`, `activoOrigenId`, `activoNuevoId`, `cantidadSeparada`, `costoCentavos`, `costoFiscalCentavos`, `acumuladaContableCentavos`, `acumuladaFiscalCentavos`, `causa`. Contabilidad: sin partida (misma clase y cuenta) |
| `activos-fijos.division_anulada` (AFI) | Anular una división | `divisionId` |
| `activos-fijos.costo_anulado` | Se anula un costo | `costoId`, `montoCentavos` |
| `activos-fijos.activo_puesto_en_uso` | Poner en uso | Costo total; reclasifica «construcciones en curso» al activo |
| `activos-fijos.depreciacion_cerrada` | Cerrar un mes | `cuotas: [{ activoId, libro, montoCentavos, localidadId, departamentoId, ocioso }]`, totales, `regimenIsr` |
| `activos-fijos.depreciacion_reabierta` | Reabrir | `periodo` (Contabilidad revierte lo del mes) |
| `activos-fijos.mejora_capitalizada` | Mejora o costo posterior | `mejoraId`, `clase`, `montoCentavos`, nueva vida, `excesoContableCentavos`, `excesoFiscalCentavos` (V-6) |
| `activos-fijos.base_fiscal_cambiada` | Cambio de matrícula o catastro | Valores anteriores y nuevos, base fiscal nueva |
| `activos-fijos.activo_trasladado` | Traslado | Origen y destino (localidad, departamento, responsable) y `aBodega` (AFI) |
| `activos-fijos.activo_dado_de_baja` | Baja (no venta) | Causa, costo, costo fiscal, acumuladas contable y fiscal, valor en libros, `bajaId` |
| `activos-fijos.activo_vendido` | Venta | Lo anterior más precio, IVA, FEL y resultados contable y fiscal (A1) |
| `activos-fijos.baja_anulada` | Anular baja o venta | `bajaId` |

Mediador: Activos fijos **escucha** `libro-de-compras.documento_por_anular` y `…_por_eliminar` (§15), **responde**
`empresas.revisar_cierre_de_carga`, **escucha** `empresas.fecha_de_inicio_por_cambiar` y **atiende** las órdenes de §6.12
(la del umbral con AFI-9; las de obra con INV-AF) y el aviso `inventarios.salida_por_anular`. Inventarios y Activos fijos
siguen sin importarse y sin llaves entre sus esquemas.

## 10. Permisos, auditoría, errores y configuración

### 10.1 Permisos (`permisos.ts`, PLAN §3.5)

| Recurso | Permisos |
|---|---|
| Clases | `activos-fijos.clases.ver`, `.crear`, `.editar` (inactivar y reactivar), `.eliminar`, `.importar`, `.exportar` |
| Activos | `activos-fijos.activos.ver`, `.crear`, `.editar` (también ocioso), `.eliminar`, `.poner-en-uso`, `.revisar-estimacion` (también el cambio de matrícula o catastro) |
| Bandeja y costos | `activos-fijos.costos.crear` (capitalizar desde la bandeja o manual), `.anular`; `activos-fijos.bandeja.ver`, `.descartar` (descartar y devolver) |
| Mejoras | `activos-fijos.mejoras.crear`, `.anular` |
| Traslados | `activos-fijos.traslados.crear` (también subir la boleta firmada, AFI), `.anular` |
| Divisiones (AFI) | `activos-fijos.divisiones.crear` (dividir y separar en unidades a mano), `.anular`. Las divisiones automáticas van con el permiso del traslado, la baja o el inventario |
| Bajas y ventas | `activos-fijos.bajas.crear`, `.anular` |
| Saldos iniciales | `activos-fijos.saldos-iniciales.ver`, `.crear`, `.editar`, `.eliminar`, `.importar`, `.exportar` |
| Depreciación | `activos-fijos.depreciacion.ver`, `.cerrar`, `.reabrir` |
| Inventario físico | `activos-fijos.inventarios.ver`, `.crear` (abrir), `.contar`, `.cerrar`, `.anular` |
| Reportes | `activos-fijos.reportes.ver`, `.exportar` |

Sin `recursosConAlcance` (AF-P2 a): ni propio ni el de `empresas.localidades`; sin tabla `accesos_a_*`, sin políticas de
alcance y sin ventana de asignación. Quien tiene el permiso ve y opera todos los activos de la empresa. Las fichas y los
reportes imprimen con `.ver` (imprimir no lleva permiso propio, como en los demás módulos). Los permisos nuevos de AFI
son nuevos: sin migración de permisos (el acceso total los recibe solo).

### 10.2 Auditoría (dentro de la unidad de trabajo; `core.auditoria` solo se agrega)

| Caso de uso | `recurso` | `accion` | `anterior` |
|---|---|---|---|
| Inactivar, reactivar, eliminar clase | `activos-fijos.clases` | `inactivar` / `reactivar` / `eliminar` | DTO de la clase |
| Eliminar activo | `activos-fijos.activos` | `eliminar` | DTO del activo con sus costos |
| Marcar o quitar ocioso; revisar estimación; cambiar matrícula o catastro; quitar de uso | `activos-fijos.activos` | `corregir` / `corregir` / `corregir` / `devolver` | DTO del activo y tramo anterior; motivo |
| Anular costo | `activos-fijos.costos` | `anular` | DTO del costo |
| Descartar y devolver línea | `activos-fijos.bandeja` | `descartar` / `devolver` | La línea (documento, número, costo) |
| Anular mejora, traslado, baja | `activos-fijos.mejoras` / `.traslados` / `.bajas` | `anular` | DTO |
| Editar o eliminar saldo inicial | `activos-fijos.saldos-iniciales` | `corregir` / `eliminar` | DTO |
| Cerrar mes | `activos-fijos.cierres` | `cerrar` | Totales del cierre (deja constancia de quién cerró, aunque no sea una baja) |
| Reabrir mes | `activos-fijos.cierres` | `reabrir` | Cierre anterior con totales por clase; motivo |
| Anular inventario | `activos-fijos.inventarios` | `anular` | DTO con el conteo |
| Dividir (a mano o automática; AFI) | `activos-fijos.divisiones` | `ajustar` | DTO del activo de origen antes (cantidad, costo, acumuladas) |
| Anular división (AFI) | `activos-fijos.divisiones` | `anular` | DTO de la división y de los dos activos (el nuevo se borra) |
| Subir o reemplazar la boleta firmada (AFI) | `activos-fijos.traslados` | `adjuntar` | Archivo anterior (nulo la primera vez) |
| Marcar ocioso al devolver a la bodega (AFI) | `activos-fijos.activos` | `corregir` | Como al marcarlo desde la ficha |

Permanentes (§4.2, cita Código Tributario arts. 112 «A» y 47): `activos-fijos.activos`, `.costos`, `.mejoras`,
`.saldos-iniciales`, `.bajas`, `.cierres` y `.divisiones` (AFI-5).

### 10.3 Errores nuevos (código propio, familias del core)

`clase_con_porcentaje_sobre_el_maximo` (`DatoInvalido`), `clase_en_uso` y `activo_con_movimientos`
(`ReglaDeNegocioInfringida`), `linea_sobrecapitalizada`, `linea_descartada`, `linea_no_capitalizable` (documento anulado,
otra empresa), `activo_no_en_uso`, `activo_dado_de_baja`, `mes_cerrado` (con el mes), `mes_anterior_sin_cerrar`,
`cierre_con_bloqueos` (con los hallazgos), `solo_se_reabre_el_ultimo`,
`porcentaje_fiscal_adoptado`, `fecha_anterior_al_inicio` («cárguelo como saldo inicial»), `carga_inicial_cerrada`,
`saldos_con_cierres`, `departamento_de_otra_localidad`, `costo_de_activo_negativo` (V-6), `motivo_de_ocio_requerido`,
`valor_fiscal_solo_en_edificios`, `componente_de_un_componente`,
`documento_con_costos_capitalizados` (el que recibe Libro de compras al anular o eliminar, con los códigos de los
activos), `activos_con_fecha_fuera_de_la_carga`, `inventario_en_curso_en_la_localidad`. De AFI:
`division_no_permitida` (con la causa: clase, componentes, baja), `cantidad_a_separar_invalida`,
`division_con_movimientos_posteriores`, `demasiadas_unidades`, `alta_conjunta_sin_activos_vigentes`,
`codigos_de_unidades_repetidos` (con los renglones), `boleta_inexistente` (subir la firmada de un grupo anulado o que no
existe).

### 10.4 Configuración (`configuracion.ts`; solo niveles `instalacion` y `empresa`)

| Clave | Nivel | Valor por omisión | Para qué |
|---|---|---|---|
| `activos-fijos.isr.maximo.edificios` … `.otros_muebles`, `.intangibles`, `.llave` | instalación | 5, 15, 20, 20, 33.33, 25, 25, 10, 20, 10 | Topes de ley (art. 28 y 33), como las tasas de retención. Solo soporte los cambia |
| `activos-fijos.depreciacion.primer_mes` | empresa, instalación | `mes_de_inicio` | D2 (§3.6) |
| `activos-fijos.capitalizacion.umbral` | empresa | `0` | D5 (§3.4) |
| `activos-fijos.codigos.prefijo` | empresa | `AF-` | Código propuesto (AF-P16); `publica: true` para el formulario |
| `activos-fijos.construccion.meses_de_aviso` | empresa, instalación | `12` | Obras viejas sin cerrar (hallazgo del cierre) |
| `activos-fijos.documentos.nombre_de_responsiva` (AFI) | empresa | «Responsiva de bienes» | Título de la boleta y de la responsiva por responsable; `publica: true` |
| `activos-fijos.bodega.meses_de_aviso` (AFI) | empresa, instalación | `6` | Resaltar en el reporte «En bodega o sin asignar» y avisar en el cierre los bienes con más meses en bodega (NIIF sección 27) |

## 11. API (todas con `proteger({ permiso })`; dinero como texto)

| Método y ruta | Permiso |
|---|---|
| `GET/POST /activos-fijos/clases`, `PUT …/:id`, `POST …/:id/inactivar` y `/reactivar`, `DELETE …/:id`; `GET …/exportar`, `…/plantilla`, `POST …/importar` | `clases.*` |
| `PUT /activos-fijos/clases/:id/conceptos` (`clases_por_concepto`) | `clases.editar` |
| `GET /activos-fijos/bandeja` (filtros) | `bandeja.ver` |
| `POST /activos-fijos/bandeja/capitalizar` (con `unidades`, `cantidadPorActivo`, `detalleDeUnidades` y `altaConjuntaId`, AFI) | `costos.crear` |
| `POST /activos-fijos/bandeja/:lineaId/descartar`, `POST …/devolver` | `bandeja.descartar` |
| `GET /activos-fijos/activos` (filtros: estado, clase, localidad, departamento, responsable, tipo de registro, texto, depreciado contable, depreciado fiscal, ocioso), `GET …/:id` (ficha con costos, libros, cuotas por año, traslados, mejoras, baja) | `activos.ver` |
| `POST /activos-fijos/activos`, `PUT …/:id`, `DELETE …/:id` | `activos.crear` / `.editar` / `.eliminar` |
| `POST …/:id/costos` (manual), `POST /activos-fijos/costos/:id/anular` | `costos.crear` / `.anular` |
| `POST …/:id/poner-en-uso`, `POST /activos-fijos/activos/poner-en-uso` (varios, AFI), `POST …/:id/quitar-de-uso` | `activos.poner-en-uso` |
| `POST …/:id/dividir`, `POST …/:id/separar-en-unidades`, `POST /activos-fijos/divisiones/:id/anular` (AFI) | `divisiones.crear` / `.anular` |
| `GET /activos-fijos/ubicaciones` (localidades y departamentos activos con §6.13, AF-P22 b) | `traslados.crear` o `inventarios.crear` |
| `POST …/:id/revisar-estimacion`, `POST …/:id/valor-fiscal-del-inmueble`, `POST …/:id/ocioso` (`{ ocioso, fecha, motivo }`) | `activos.revisar-estimacion` / `.revisar-estimacion` / `.editar` |
| `POST …/:id/foto` (multipart), `GET …/:id/foto` | `activos.editar` / `.ver` |
| `POST /activos-fijos/mejoras`, `POST …/:id/anular` | `mejoras.*` |
| `POST /activos-fijos/traslados` (varios activos; renglones con `cantidad`, `aBodega` y `marcarOcioso`, AFI), `POST …/:id/anular`, `GET …/:grupoId/boleta` | `traslados.*`; boleta con `activos.ver` |
| `POST /activos-fijos/traslados/:grupoId/firmada` (multipart, AFI), `GET …/:grupoId/firmada` | `traslados.crear` / `activos.ver` |
| `POST /activos-fijos/bajas` (con venta y `cantidad`, AFI), `POST …/:id/anular`, `POST …/:id/acta`, `POST …/:id/denuncia`, `GET …/:id/acta` | `bajas.*`; archivos con `bajas.crear` / `activos.ver` |
| `GET /activos-fijos/depreciacion` (meses y estado), `GET …/:periodo/revision`, `POST …/:periodo/cerrar` (con la huella de la revisión, como EM-2), `POST …/:periodo/reabrir` (`{ motivo }`) | `depreciacion.*` |
| `GET/POST /activos-fijos/saldos-iniciales`, `PUT …/:activoId`, `DELETE …/:activoId`; `GET …/exportar`, `…/plantilla`, `POST …/importar` | `saldos-iniciales.*` |
| `GET/POST /activos-fijos/inventarios`, `GET …/:id`, `POST …/:id/contar` (`{ activoId | codigo, resultado, cantidadEncontrada?, … }`), `POST …/:id/sobrantes`, `POST …/:id/cerrar`, `POST …/:id/anular` | `inventarios.*` |
| `GET /activos-fijos/reportes/<reporte>` y `…/<reporte>/exportar` (con los de AFI: `existencias-de-bienes-de-uso`, `en-bodega`, `responsiva`) | `reportes.ver` / `.exportar` |
| `GET /activos-fijos/etiquetas?ids=…` (datos para imprimir: código, descripción, localidad, URL del QR) | `activos.ver` |

Límites: `contar` es la ruta más usada en el inventario: sin límite por minuto propio pero con el general de la API;
fotos y actas con el `limitarSubidas` de archivos.

## 12. Cliente (`cliente/src/modulos/activos-fijos/`)

| Sección del menú | Pantalla | Forma |
|---|---|---|
| Operación | **Activos fijos** (lista con tarjetas: código, descripción, clase, ubicación, responsable, costo, valor en libros, estado y etiquetas «En construcción o en tránsito», «Ocioso», «Depreciado contable», «Depreciado fiscal», «De terceros», «Control») | Lista con filtros → **ficha** (`DatosDelRegistro`) con pestañas: Datos, Costos, Depreciación (por libro, por año y mes), Historial (traslados, mejoras, estimaciones) y Baja. Acciones de la ficha según permiso: poner en uso, trasladar, mejora (con la sugerencia de componente, V-3), revisar estimación, cambiar matrícula o catastro (edificios), marcar ocioso (con motivo), dar de baja, vender, imprimir etiqueta y responsiva. AFI: etiqueta «En bodega», filtro «En bodega», selección múltiple para «Disponible para uso» y «Entregar»; en la ficha, «Dividir», «Separar en unidades», «Devolver a bodega», y en Historial las divisiones y «Comprado junto con: AF-0101, AF-0102». La localidad se muestra siempre por su nombre (AF-P22 b) |
| Operación | **Por capitalizar** (bandeja) | Lista agrupada por documento; seleccionar líneas → ventana «Capitalizar» (activo nuevo o existente, reparto por monto con el pendiente a la vista; AFI: campos **Unidades** y **Cantidad por activo**, costo por unidad como ayuda, cuadrícula de códigos, series y placas, destino «Alta conjunta»); descartar con motivo |
| Operación | **Nuevo activo** (alta manual) | Formulario en página con `CamposDeActivo` y costos manuales |
| Operación | **Traslados** | Elegir activos (búsqueda o QR) → destino (todas las localidades activas, AF-P22 b) → boleta imprimible. AFI: campo **Cantidad** en los renglones de grupos, casilla «A la bodega de activos», «Marcar como ocioso», subir la boleta firmada |
| Operación | **Cierre de depreciación** | Meses con estado; «Revisar» muestra hallazgos y totales (como EM-2) y «Cerrar» con confirmación; «Reabrir» con motivo |
| Operación | **Inventario físico** | Abrir por localidad; pantalla de conteo para el teléfono: botón grande «Escanear», último leído, contadores (esperados, encontrados, pendientes), búsqueda por código como respaldo; cerrar con resumen y propuestas; acta imprimible |
| Administración | **Clases de activos** (con Excel) | Catálogo (lista y ventana), con «Conceptos de gasto que la proponen» |
| Administración | **Saldos iniciales de activos fijos** (con Excel) | Lista con totales del cuadre y ventana de alta; avisos de la carga cerrada |
| Reportes | §13 | Imprimir y exportar |

Notas: la página solo arma; composables `usarActivos`, `usarBandeja`, `usarCierreDeDepreciacion`, `usarInventario`; la
lógica pura (reparto de la bandeja, validación del monto pendiente, armado de etiquetas; AFI: reparto en unidades con su
sobrante y la vista previa de una división, que solo muestra: el servidor calcula) en `edicion-de-*.ts` con pruebas.
El conteo de un grupo en el inventario físico pide la cantidad encontrada.
El escáner usa la cámara del navegador (`BarcodeDetector` donde exista y una librería de lectura de QR donde no, como
Safari en iPhone): **dependencia nueva**, la revisa `seguridad` (§18). Las etiquetas se arman en el cliente y se imprimen
con el navegador (hoja carta con N etiquetas por página o rollo de etiquetas, a elegir), con el QR generado por otra
**dependencia nueva** (generador de QR sin red). El QR lleva la URL de la ficha (`/activos-fijos/activos/<id>`): una
cámara común abre la ficha (pide iniciar sesión) y el inventario lee el id.

## 13. Reportes (sección Reportes: imprimir y exportar)

| Reporte | Contenido | Filtros |
|---|---|---|
| **Registro de activos fijos** (auxiliar) | Por activo: código, descripción, clase, fechas, documento de origen, proveedor, costo, acumulada contable, valor en libros, base fiscal, acumulada fiscal, ubicación y responsable; totales por clase. Es el que cuadra con el mayor | Fecha de corte (último mes cerrado o anterior), clase, localidad, estado |
| **Depreciación del período** | Cuotas por activo y mes (contable y fiscal), totales por clase, localidad y departamento (centro de costo); la cuota fiscal de los ociosos en línea aparte (V-4) | Desde y hasta (meses cerrados), libro |
| **Cuadro fiscal y contable** | Por activo: valor en libros, valor fiscal por depreciar, diferencia temporaria; totales. Para la empresa en el régimen sobre las utilidades, también la depreciación fiscal del año (deducible), con la línea aparte «Cuota fiscal de bienes ociosos (riesgo de no deducibilidad, art. 25)» (V-4, deducible por omisión), y el **activo fijo neto contable** (costo − depreciación acumulada contable) **al cierre del año anterior**, que es el que usa el ISO (A2; solo como cifra) | Año, corte |
| **Activos por localidad y responsable** | Lista para firmar responsivas y para el inventario | Localidad, departamento, responsable |
| **Movimientos del período** | Altas, costos, mejoras, cambios de matrícula, traslados, bajas y ventas con su costo fiscal y su resultado contable y fiscal (A1; insumo de la declaración de ganancias de capital) | Período, tipo |
| **Activos totalmente depreciados en uso** y **Obras en construcción** | Para revisar vidas útiles y obras viejas (lo pide el auditor) | Corte |
| **Existencias de bienes de uso** (AFI: el «stock») | Por clase → descripción, marca y modelo (o por alta conjunta): unidades totales (Σ `cantidad` de los no dados de baja), **en bodega**, **entregadas** y en construcción; costo y valor en libros; tipo de registro (activo, control) en columna aparte; marca «sin serie» | Clase, localidad, tipo de registro, solo en bodega |
| **En bodega o sin asignar** (AFI; NIIF sección 27) | Activos y bienes de control `en_uso` con `en_bodega` o sin responsable: desde cuándo están en bodega (último traslado a bodega o la disponibilidad), **meses en bodega**, ocioso, valor en libros; resalta los que pasan de `activos-fijos.bodega.meses_de_aviso` | Localidad, clase, meses mínimos |
| **Responsiva por responsable** (AFI) | Todos los bienes a cargo de una persona (usuario o texto): código, descripción, serie, placa, cantidad, ubicación, fecha de entrega; espacio para firmas; título = `nombre_de_responsiva`. Es la versión para firmar de «Activos por localidad y responsable» | Responsable, localidad |
| **Etiquetas** | Imprimir (no se exporta) | Activos elegidos, localidad |
| Documentos | Boleta de traslado y responsiva, acta de baja, acta de venta, acta de inventario físico | Desde su pantalla |

Los reportes muestran todos los activos de la empresa (AF-P2 a); la localidad y el departamento son solo filtros, y sus
nombres salen de §6.13 (AF-P22 b). Las acumuladas de todos los reportes salen de `acumuladaAl` (con divisiones, §7.6).

## 14. Excel (según la sección del menú)

| Pantalla | Sección | Importar | Exportar |
|---|---|---|---|
| Clases de activos | Administración | Sí: nombre, inciso, porcentaje, vida útil, residual, activo | Sí |
| Saldos iniciales de activos fijos | Administración | Sí: una fila por activo con lo de §8 (con «Cantidad» y «En bodega», AFI); referencias por nombre (clase, localidad, departamento) y por código (padre); todo o nada, ensayo, 5,000 filas; `sinAsignarAlCrear` no aplica (no hay alcance). La localidad por nombre se busca con §6.13, así quien importa no necesita verlas todas en Empresas | Sí |
| Activos fijos, bandeja, traslados, divisiones, cierre, inventario | Operación | No | No (se consulta en los reportes) |
| Reportes (con Existencias de bienes de uso, En bodega o sin asignar y Responsiva, AFI) | Reportes | No | Sí (la responsiva también se imprime) |

Columnas en `http/<plural>.columnas.ts` con `validadorDeZod` del mismo esquema del formulario; los montos como texto con
dos decimales.

## 15. Convivencia y riesgos

| # | Tema | Qué pasa | Qué se hace |
|---|---|---|---|
| R-1 | Anular o eliminar en el libro un documento capitalizado (E4, D12) | Activos fijos escucha `documento_por_anular` y `…_por_eliminar` (llegan a todos, no solo al destino) y lanza `documento_con_costos_capitalizados` si el documento tiene costos vigentes: se deshace la anulación. **Con Activos fijos inactivo el mediador no lo llama** y la anulación pasa | Eliminar sigue bloqueado por la llave (el error de llave se traduce en el libro a un mensaje claro, paso AF-3). Anular con el módulo inactivo deja costos de un documento anulado: el **cierre de depreciación lo bloquea** y la ficha lo marca, hasta anular esos costos (con su auditoría). **[corrige el dictamen E4]**: «lo resuelve el módulo con el evento de anulación» solo vale con el módulo activo. Después de v1, «Sustituir documento» (P-A) pasará los costos de un documento a otro que lo reemplaza (paso AF-15) |
| R-2 | Documento mixto (gasto y activo) en CP4 | Todo lo pagado va a Inversión (ya era así) | Sin cambio en v1; anotado como pendiente de Cuentas por pagar (prorratear por líneas) |
| R-3 | Línea marcada pero descartada en la bandeja (o bajo el umbral) | Su pago ya fue a Inversión y la casilla del SAT-2237 dijo «activos fijos» | El descarte avisa: «El pago de esta factura se clasificó como Inversión y su IVA en la casilla de activos fijos; si era gasto, la marca del libro estaba mal». El libro no se edita; se corrige anulando y volviendo a registrar si importa (V-11) |
| R-4 | Servicio capitalizado (E1) | Va a servicios en el SAT-2237 y a Inversión en el flujo | Es lo que pide el dictamen; V-1 |
| R-5 | Sin alcance propio (AF-P2 a), pero `empresas.localidades` y `empresas.departamentos` sí lo tienen | Un usuario de Activos fijos sin `empresas.localidades.ver-todas` ni la localidad asignada ve el activo pero **no el nombre** de su localidad (la unión con `empresas.localidades` sale vacía por la RLS de Empresas) y el selector de destino del traslado o del inventario solo le ofrece las suyas. La llave compuesta sí valida (las revisiones de llaves no pasan por RLS) | **AF-P22 = b**: los nombres salen de las funciones de Empresas de §6.13 (solo id, código, nombre y activo; revisadas por `seguridad`); ya no hace falta «Localidad sin acceso». Prueba de aislamiento entre **empresas** (dos empresas de la misma cuenta) en todas las tablas y en las dos funciones |
| R-6 | Departamento de otra localidad | La llave no lo puede impedir (el departamento puede ser de toda la empresa) | Dominio (`departamento_de_otra_localidad`) |
| R-7 | Multimoneda | Una factura en USD llega al libro con sus líneas ya en GTQ | Los costos se toman en GTQ; nunca se revalúan (no monetarios). Sin columnas de moneda |
| R-8 | Ganadería y Cultivos (futuros) | Querrán dar de baja reproductores por descarte o muerte | Mandarán una orden `activos-fijos.dar_de_baja` (a definir con ellos); Activos fijos no depende de ellos |
| R-9 | Maquinaria (futuro) e Inventarios | Maquinaria colgará mantenimientos y horómetro de un activo. **Inventarios no depende** de Activos fijos (INV-A1) y el préstamo de herramientas es de **este** módulo (INV-P3 a) | Maquinaria dependerá de `activos-fijos` (llave a `activos (id, empresa_id)`). Inventarios habla con Activos fijos solo por el mediador (§6.12), sin llaves. El préstamo se diseña aparte (§19) |
| R-10 | Contabilidad (futura) | Necesitará cuentas por clase y la cuenta puente de compras | Las guarda Contabilidad (sus propios enlaces clase → cuenta), como con Bancos |
| R-11 | Volumen | Una finca con 2,000 activos = 4,000 cuotas por mes, 48,000 por año | Inserción en tandas de 500 en el cierre; índices parciales por `vigente`; el reporte del período lee por `(empresa_id, periodo)` |
| R-12 | El «stock» por descripción se parte si se escribe distinto («Silla apilable» / «Silla apilable negra») (AFI) | Dos renglones en el reporte de existencias | Agrupar también por alta conjunta; la división copia la descripción; filtro por clase |
| R-13 | Muchas divisiones pequeñas acumulan diferencias de un centavo en las cuotas (AFI) | Una cuota de más o de menos al final | La última cuota de cada tramo absorbe el pendiente (§7.2); prueba con 50 divisiones de 1 |
| R-14 | Alguien marca la línea como inventario porque «lo va a guardar» (AFI) | El bien de uso entra al kardex de Inventarios | Texto de ayuda de las casillas del libro (INV-0c); aviso del umbral en Inventarios (I-11); en la bandeja de Inventarios se descarta **quitando la marca** en el libro (P-2 a de Inventarios) y se marca como activo fijo. Como el libro no se edita, si importa la casilla del SAT-2237 se anula y se registra de nuevo (V-11, P-C) |
| R-15 | Capitalizar 200 unidades en una transacción (AFI) | Transacción larga | Tope de 200; inserción en tandas; el correlativo se pide de una vez para el bloque |
| R-16 | Anular una división borra un activo (AFI) | Se pierde un registro | Solo sin movimientos posteriores; auditoría con los dos DTO; la fila de la división queda con el código del activo nuevo |
| R-17 | Las funciones de nombres de Empresas (AF-P22 b) abren una lectura sin alcance | Exposición de nombres de localidades a quien no las ve en Empresas | Aceptado por el usuario; solo id, código, nombre y activo; revisión de `seguridad` antes de programar (§6.13) |

## 16. Pasos (un commit cada uno; servidor y cliente por separado, con pruebas)

| Paso | Qué | Quién | Estado |
|---|---|---|---|
| **AF-0** | Libro de compras: E1 (checks, dominio, Zod, cliente), `categoriaSql`, único de líneas; pruebas del libro, del SAT-2237 y del análisis | backend (+ ajuste chico de frontend) | **Programado, en integración** |
| **AF-1** | Esqueleto del módulo, `0001_af1_clases`, auditoría permanente (seis recursos, cita CT arts. 112 «A» y 47), configuración, semilla perezosa (con la ayuda de «Programas y licencias», V-2), `clases_por_concepto`, Excel de clases; pruebas de tablas y de API | backend | **Programado, en integración** |
| AF-1c | Clases de activos (catálogo con Excel) | frontend | |
| **AF-2** | `activos` (con ocioso y motivo, matrícula y catastro; **AFI-1**: `en_bodega`, `alta_conjunta_id`, `activos_existencias_idx`) y `traslados` (fila del alta, con `a_bodega`), alta manual sin costos, editar, marcar ocioso, eliminar; RLS solo por empresa; prueba de aislamiento entre dos empresas de la misma cuenta | backend | |
| **AF-P22** | Empresas: `00xx_nombres_de_ubicaciones` (custom) con `empresas.nombres_de_localidades` y `empresas.nombres_de_departamentos` (§6.13), sus pruebas de aislamiento y la ruta `GET /activos-fijos/ubicaciones`. **Antes, la revisión de `seguridad`** | backend | |
| AF-2c | Lista (etiquetas «En construcción o en tránsito», «Ocioso», «Depreciado contable», «Depreciado fiscal» y «En bodega»), ficha (datos, con el nombre de la localidad de §6.13) y alta manual | frontend | |
| **AF-3** | `costos` (V-8 con motivo, `no_es_edificacion`, nunca negativos por activo) y `descartes`, bandeja, capitalizar, costos manuales, avisos del libro (R-1), mensaje del error de llave en el libro; prueba de concurrencia de la línea y del total del activo | backend | **Programado, en revisión** (2026-11-19; no se cierra un mes posterior al en curso, `mes_por_llegar`; notas abajo; revisión: capitalizar toma FOR SHARE del documento y la prueba «capitalizar y anular a la vez» lo cubre) |
| **AFI-2** (con AF-3) | Capitalizar en N unidades, cuadrícula de unidades (códigos, series, placas), destino alta conjunta; pruebas del reparto y del sobrante, de códigos repetidos, del tope de 200 y de la regla de la línea | backend | **Programado, en revisión** (2026-11-19) |
| AF-3c | Bandeja «Por capitalizar» (aviso de software y suscripciones, V-2) y pestaña Costos | frontend | **Programado** (2026-11-19; notas abajo) |
| AFI-2c (con AF-3c) | Ventana «Capitalizar» con unidades, costo por unidad y cuadrícula | frontend | **Programado** (2026-11-19) |
| **AF-4** | Dominio de depreciación (§7, pruebas puras con los ejemplos: tope del inmueble con el mayor y el 70 %, reproductores, ocioso, exceso de nota de crédito por libro), `tramos`, poner en uso y quitar de uso | backend | **Programado, en revisión** (2026-11-19; migración `0004_af4_tramos`) |
| **AFI-3** (con AF-4) | `PonerEnUsoVarios`, ubicación y «En bodega de activos» al ponerlo disponible, textos de «Disponible para uso» | backend | **Programado** (2026-11-23; sin migración; `POST …/activos/poner-en-uso`; la ficha única también acepta `ubicacion`) |
| **AF-5** | `cierres` y `cuotas`: revisar (hallazgos de §6.9), cerrar, reabrir; eventos del bus; pruebas de orden e idempotencia | backend | **Programado, en revisión** (2026-11-19; migración `0005_af5_cierres_y_cuotas`; faltan los hallazgos de inventario en curso (AF-10) y de bodega (AFI-7)) |
| AF-5c | Cierre de depreciación y pestaña Depreciación | frontend | **Programado** (2026-11-19; la pestaña muestra los tramos: faltan las cuotas por año y mes, que piden una ruta nueva del servidor) |
| **AF-6** | Saldos iniciales (con costo fiscal, A1; con «Cantidad» y «En bodega», AFI), pregunta de EM-2, aviso de fecha de inicio, Excel | backend | **Programado, en revisión** (2026-11-19; migración `0006_af6_saldos_iniciales`; notas abajo) |
| AF-6c | Saldos iniciales (Administración) | frontend | **Programado** (2026-11-19; incluye el saldo inicial en la ficha del activo) |
| **AF-7** | Mejoras (con `no_es_edificacion`), costos posteriores (base corregida sin reiniciar la vida, V-3), revisión de la estimación y cambio de matrícula o catastro (tramo `cambio_de_matricula`, A3) | backend **Programado, en revisión** (2026-11-19; migración `0007_af7_mejoras`; notas abajo) |
| AF-7c | Acciones en la ficha (con la sugerencia de componente, V-3) | frontend | |
| **AF-8** | Traslados con boleta (grupo), anular | backend | **Programado, en revisión** (2026-11-19; sin migración; notas abajo) |
| **AFI-4** (con AF-8) | Traslados a la bodega y devolución con «Marcar como ocioso»; responsiva configurable en la boleta; `00xx_af8_boletas_firmadas` y subir el escaneo firmado (I-8 b) | backend | **Programado** (2026-11-23; migración `0008_af8_boletas_firmadas`; `aBodega`, `marcarOcioso` y el título desde 2026-11-19; ver notas de AF-8) |
| AF-8c | Traslados y boleta imprimible | frontend | |
| AFI-4c (con AF-8c) | Entregar y devolver; casilla «A la bodega»; selección múltiple; subir la boleta firmada | frontend | |
| **AFI-5** (después de AF-7 y AF-8) | `00xx_afi_divisiones`: tabla, costos y tramos de división, `acumuladaAl` (y su uso en cierre, ficha y bajas), dividir, separar en unidades y anular; eventos; auditoría permanente; pruebas puras con el ejemplo de §7.6 y 50 divisiones de 1, y de integración (cierre después de dividir, baja después de dividir, anular) | backend **Programado** (2026-11-23; migración `0010_afi5_divisiones`; sin la división automática de traslado, baja e inventario, que es AFI-6 y AFI-8; notas abajo) |
| **AF-9** | Bajas y ventas con archivos, tipo de acta, costo fiscal y resultados (A1), avisos de donación y reproductor (V-10, V-12) | backend | **Programado** (2026-11-23; migración `0009_af9_bajas`; sin la baja parcial, que es AFI-6; notas abajo) |
| **AFI-6** (después de AFI-5 y AF-9) | Traslado y baja con cantidad parcial (división automática) | backend | |
| AF-9c | Baja y venta (ventanas, actas imprimibles) | frontend | |
| AFI-6c | Dividir y separar en la ficha; cantidad en traslados y bajas | frontend | |
| **AF-10** | Reportes de §13 (consultas y exportar; ISO con el activo neto contable del cierre del año anterior, A2; línea de ociosos, V-4) | backend | |
| **AFI-7** (con AF-10) | Reportes Existencias de bienes de uso, En bodega o sin asignar y Responsiva; configuración `nombre_de_responsiva` y `bodega.meses_de_aviso`; hallazgo de meses en bodega en el cierre | backend | |
| AF-10c | Pantallas de reportes | frontend | |
| AFI-7c (con AF-10c) | Pantallas de los tres reportes e impresión de la responsiva | frontend | |
| AF-11c | Etiquetas con QR (dependencia nueva, revisada por `seguridad`) | frontend | |
| **AF-12** | Inventario físico | backend | |
| **AFI-8** (con AF-12) | Cantidad esperada y encontrada; propuesta de división y baja por faltante | backend | |
| AF-12c | Conteo desde el teléfono con escáner (dependencia nueva; cantidad encontrada en los grupos) | frontend | |
| **AFI-9** (con INV-AF e INV-0c) | Orden `activos-fijos.obtener_umbral_de_capitalizacion` (§6.12); el resto del paso es de Inventarios (`diseno-inventarios.md` §16) | backend | |
| AF-QA | Punta a punta en el navegador (compra → bandeja → uso → cierres → traslado → venta; saldos iniciales → cierre de la carga) | pruebas-qa | |
| AF-QA-b | Hallazgos bajos de la QA del 2026-11-19: valor como ganado común solo en reproductores, terreno no es bien de control, ficha del ocioso con fecha y motivo, ficha inexistente con estado vacío y «Volver»; eliminar un activo con costo manual vigente se queda como está (§6.3: solo bloquean los costos de líneas del libro; lo confirma el contador con un cliente real) | backend y frontend | **Hecho** (2026-11-19) |
| AFI-QA (con AF-QA) | Factura de 3 tractores y 50 sillas → bandeja en unidades y grupo → disponibles en bodega → entregar 1 tractor y 20 sillas → cierre → devolver a bodega → baja de 3 sillas → reportes de existencias y responsiva | pruebas-qa | |
| AF-14 | (Después de v1, AF-P18) Pólizas de seguro: `polizas` y `activos_de_polizas`, vencimientos | backend y frontend | |
| AF-15 | (Después de v1, P-A) «Sustituir documento»: pasar los costos de un documento del libro a otro que lo reemplaza, con auditoría | backend y frontend | |

**Notas de lo programado en AF-3 y AFI-2 (servidor, migración `0003_af3_costos_y_descartes`):**

- `costos` trae solo lo que ya existe: orígenes `linea_de_compra`, `manual` y `saldo_inicial`, y las clases de costo sin las de
  división. `mejora_id` (con su llave) llega con AF-7; `division_id`, el origen y las clases de división, con AFI-5;
  `referencia_de_origen` y el origen `inventario`, con INV-AF.
- `descartes_de_lineas` borra el descarte **en cascada** con su línea (cambia §5.5): con la llave sin acción, un documento con
  una línea descartada no se podría eliminar nunca (devolverla a la bandeja deja la fila). El rastro queda en la auditoría
  (`descartar` y `devolver`).
- Un activo del balance solo recibe costos mientras está `en_construccion`; uno en uso con libros (llega con AF-4) los recibe
  como mejora o costo posterior (AF-7, error `costo_posterior_no_disponible` mientras tanto). Un bien de control recibe costos de
  referencia; uno de terceros no.
- `unidades` se valida antes de abrir la transacción (`demasiadas_unidades`) y el tope cuenta las de **toda** la operación. Los
  códigos de la cuadrícula se revisan juntos antes de insertar (error por renglón) y los propuestos salen de un solo bloque del
  correlativo. Las unidades de una asignación comparten `alta_conjunta_id` solo si son más de una.
- El archivo del costo manual (`archivo_id`) tiene su columna, pero la ruta de subida queda pendiente (revisión de `seguridad`).
- La lista de costos de un activo y su ficha usan `activos.ver`; la ficha trae `costo` (Σ de los vigentes).

**Notas de lo programado en AF-9 (servidor, migración `0009_af9_bajas`):**

- `POST /activos-fijos/bajas` (`bajas.crear`) elige `DarDeBaja` o `RegistrarVenta` según la causa y devuelve la baja con sus **avisos**
  (`sin_acta`, `sin_denuncia`, `donacion_con_iva`, `faltante_con_iva`, `con_componentes`, `venta_con_iva`, `ganancia_de_capital` o
  `perdida_de_capital`, `venta_de_reproductor` y `inmueble_de_persona_individual` desde el 1-ene-2027 si el régimen vigente es de
  persona individual). Los avisos se calculan al leer (el acta o la denuncia subidas después los quitan). `GET …/bajas/:id` (`activos.ver`)
  da los datos del acta imprimible; la ficha del activo trae `baja`.
- **Cifras congeladas**: la acumulada de cada libro es `acumuladaAntesDe` (lo cerrado más lo que darían, mes a mes, los meses
  abiertos que van antes: el mismo cálculo de las mejoras) y, con `primer_mes = mes_siguiente`, la cuota del propio mes, que queda
  en `cuota_del_mes_*`. Para que el cierre de esos meses abiertos siga depreciando al activo dado de baja, `activosParaCerrar` ahora
  incluye a los dados de baja **después** del mes y, en el propio mes de la baja, **solo si la baja vigente congeló una cuota de ese
  mes** (`cuota_del_mes_* > 0`): el cierre toma lo congelado y no la regla `primer_mes` de hoy, así que cambiarla después no
  descuadra los libros ni el resultado de una venta (prueba de API con el cambio de regla en los dos sentidos). Una baja con fecha
  anterior a una mejora o costo posterior vigente del activo o de sus componentes se rechaza (`baja_anterior_a_una_mejora`): las
  cifras «al día de la baja» no pueden incluir un costo que todavía no existía.
- **Costo fiscal** (A1) = Σ costos fiscales (con el del saldo inicial cargado) sin tope del inmueble ni ganado común; la base
  fiscal usa la misma función de poner en uso. Bienes de control y de terceros llevan los montos en cero; un terreno, costo sin
  depreciación. Venta: resultado contable `precio − valor en libros`; fiscal `precio − (costo fiscal − acumulada fiscal)`.
- **Con componentes**: el principal y sus componentes vigentes se dan de baja a la vez, con **una sola acta** (mismo número
  `activos-fijos.bajas`, una fila por activo). En una venta el precio y el IVA se reparten en proporción al costo de cada activo
  (sobrante al último; `precio_no_repartible` si a alguno le tocaría menos de un centavo). **Solo entran al reparto los activos con
  libros**: un bien de control que va con el principal queda como baja con causa `otra` y sin precio propio, y un componente de
  terceros impide vender, donar, dar por obsoleto o por faltante al principal (`bien_de_terceros_sin_destino`): no se inventa que
  se devolvió, se pide resolver antes su destino (devolverlo o darlo de baja por separado); con destrucción, robo, extravío u
  «otra» se va con el principal con esa causa. Un principal de terceros o de control no se vende aunque tenga componentes propios
  (`causa_de_baja_no_permitida`). **Cómo se registra la venta de un bien de control y el destino de los bienes de terceros queda
  pendiente del dictamen de `contador-guatemala`**; mientras tanto se rechaza. Un componente se da de baja solo, pero si se dio de baja con su principal solo se anula con el principal
  (`baja_de_componente_con_su_principal`); y uno dado de baja aparte no se anula mientras su principal esté dado de baja
  (`baja_de_componente_con_principal_dado_de_baja`). **Acta y denuncia son del acto**: se guardan en la baja del principal (subir
  desde el componente las manda ahí, con su auditoría `adjuntar`) y el componente las lee de ella para los avisos, `tieneActa` y la
  descarga.
- **Anular** (`bajas.anular`): mes abierto (`mes_cerrado`), el activo vuelve a `en_uso` y se audita `anular` con la baja como estaba
  (una entrada por activo). `AnularMejora` rechaza un activo dado de baja (`activo_dado_de_baja`): sus cifras están congeladas.
- **Acta y denuncia**: `POST …/bajas/:id/acta?tipoDeActa=administrativa|notarial` y `…/denuncia` (multipart, `bajas.crear`,
  `limitarSubidas`), `GET …/acta` y `…/denuncia` (`activos.ver`); mismo esquema de tres tiempos que la boleta firmada, `FOR UPDATE`
  sobre la baja, borra el archivo anterior y audita `adjuntar`. El tipo de acta viaja en la dirección porque el lector de
  documentos solo admite el archivo. Una baja anulada no admite documentos (`baja_anulada`) y sigue mostrando los que tenía.
- Decisiones: la causa `faltante_de_inventario` se acepta **sin** `inventario_id` hasta AF-12 (la columna existe sin llave ni el check
  de §5.12); `devuelto_al_dueno` solo vale para bienes de terceros, y un bien de terceros no se vende ni se dona (un bien de control tampoco se vende: baja sin resultado, §3.2 y §3.4); la baja de solo
  una parte de un grupo (`cantidad` menor) responde `baja_parcial_no_disponible` hasta AFI-6; `numero` del acta no es único (lo
  comparten el principal y sus componentes); no se dan de baja activos en construcción (se eliminan o se ponen en uso).
- Falta para AF-9c: ventanas de baja y venta, acta imprimible, subir acta y denuncia, y mostrar los avisos.

**Notas de lo programado en AFI-5 (servidor, migración `0010_afi5_divisiones`):**

- `activos_fijos.divisiones` (§5.15) con sus checks y RLS por empresa; `costos` gana `division_id`, el origen `division` y las clases
  `division_cedida` (negativa) y `division_recibida`; `tramos` gana `division_id`. La llave del activo nuevo se creó a mano con
  `on delete set null (activo_nuevo_id)` (drizzle no escribe la lista de columnas): como un `check` exige el activo nuevo mientras la
  división está vigente, el activo solo se borra al anular. `activos-fijos.divisiones` entra a la auditoría permanente.
- Cálculo en `dominio/depreciacion/division.ts` (`repartirCifras`, `tramosDeUnaParte`): `round(Q × k / n)` mitad hacia arriba y el
  sobrante en el origen; prueba con el ejemplo de §7.6 y con 50 divisiones de 1 (no se pierde un centavo y cada pieza agota su
  pendiente). El `periodo` de la división es el primer mes de sus tramos, `max(mes de la fecha, desde del último tramo)`, y a él
  se refiere `acumuladaAl`: `acumuladasAntesDe(periodo)` (cierre) y el historial de cada activo (bajas, mejoras, ficha) suman las
  acumuladas recibidas y restan las cedidas de las divisiones vigentes con `periodo <= mes`.
- `POST …/activos/:id/dividir` y `…/:id/separar-en-unidades` (`divisiones.crear`, 201) y `POST …/divisiones/:id/anular`
  (`divisiones.anular`). `DivisorDeActivos` es el servicio que AFI-6 y AFI-8 reutilizarán con las causas `traslado`, `baja` e
  `inventario`. Separar en unidades acepta códigos escritos (sin repetirse ni usarse) y propone el resto en un bloque.
- Anular: mes de la **fecha** de la división abierto (no el de su `periodo`, que con `mes_siguiente` puede ser el siguiente) y sin,
  después de la división, traslados (salvo el alta), mejoras, costos, otros cambios de tramos, bajas, cuotas del activo nuevo ni
  otra división. Se compara `creado_en`, que en divisiones, tramos, costos, mejoras y traslados es la hora real
  (`clock_timestamp()`, `horaReal()`): así lo guardado por una transacción que esperó el candado del activo es posterior a la
  división, y las de «separar en unidades» (y sus tramos) se deshacen de la última a la primera. Anula los costos cedidos (rastro), apaga los tramos y repone los que sustituyeron,
  borra el activo nuevo con sus costos, tramos y alta, y devuelve la cantidad y el residual. Audita `anular` con la división y las
  fichas de los dos activos; la ficha del activo trae `divisiones`.
- Cambiar la fecha de inicio de la carga se rechaza si algún saldo inicial tiene una división vigente (`reubicar` no mueve sus
  tramos de división): hay que anularla antes.
- Decisiones: no se divide un saldo inicial con costo fiscal distinto del contable o de su base (`saldo_inicial_con_diferencias`: la
  diferencia no tiene dónde caer) ni un activo con costos negativos por grupo; un activo con divisiones no se elimina, no cambia su
  cantidad a mano ni vuelve a construcción (`activo_con_divisiones`); la baja con fecha anterior a una división se rechaza
  (`baja_anterior_a_una_division`); el activo nuevo no copia serie, placa, foto ni observaciones. La fecha de la división
  no puede ser anterior al inicio de uso (o a la adquisición) ni a un traslado, mejora o división del activo.
- Pendiente: la vida útil que guarda el activo nuevo (`vida_util_contable_meses`) copia la del origen, pero `aplicarEstimacion` de
  una mejora posterior la recalcula desde su primer tramo (el de la división) y daría los meses que le faltaban; solo es el dato
  mostrado (la depreciación usa los tramos). Falta AFI-6c para las pantallas de dividir y separar.

**Notas de lo programado en AF-8 (servidor, sin migración):**

- Anular es por **boleta** (`POST …/traslados/:grupoId/anular`): anula todos los renglones, devuelve cada activo a la fila vigente
  anterior de su historial y solo se puede si es el último traslado de cada uno y el mes está abierto. La auditoría `anular` lleva la
  boleta como estaba (`registro_id` = el `grupoId`). Un componente se traslada con su principal, no solo.
- El renglón acepta `cantidad` solo si es la del activo entero (`traslado_parcial_no_disponible`): la división llega con AFI-5 y AFI-6.
- `activos-fijos.documentos.nombre_de_responsiva` (empresa, pública) es el título de la boleta; `GET …/boleta` devuelve los datos que
  la pantalla imprime (AF-8c). Eventos `activo_trasladado` y `traslado_anulado` (este no estaba en §9).
- El historial de la ficha (`TrasladoDto`) trae `grupoId`, `numero`, `anioDeNumero` y `motivoDeAnulacion`: con el `grupoId` la pantalla
  reimprime (`GET …/boleta`) o anula la boleta después de crearla.
- AFI-4 (2026-11-23): `POST …/traslados/:grupoId/firmada` (multipart, `traslados.crear`) sube o reemplaza el escaneo y `GET …/firmada` (`activos.ver`)
  lo abre; `BoletaDto.firmada` trae sus datos. Reemplazar borra el archivo anterior y audita `adjuntar`; anular la boleta no lo borra.
  Errores `boleta_inexistente` (grupo ausente o anulado) y `boleta_sin_firmada`. Falta para AF-8c: pantalla de traslados y boleta
  imprimible. `GET /activos-fijos/ubicaciones` sigue con `activos.ver` (el diseño dice `traslados.crear` o `inventarios.crear`).

**Notas de lo programado en AF-7 (servidor, migración `0007_af7_mejoras`):**

- `mejoras` agrega las columnas de anulación (`estado`, `anulada_en`, `anulada_por`, `motivo_de_anulacion`, como `costos`) y los
  costos y tramos llevan `mejora_id`. Una mejora agrupa costos de **líneas del libro** (con el candado y la regla de la línea) y
  **manuales**; su fecha y su marca «no es edificación» pasan a sus costos. Una mejora suma (neto mayor que cero); un costo posterior
  puede restar (nota de crédito) pero no quedar en cero, y el total del activo nunca queda negativo.
- El tramo nuevo parte de la acumulada de cada libro al cierre del mes anterior **proyectando** los meses abiertos que van antes
  (con los tramos de hoy); si cae en el mismo mes y libro que un tramo vigente lo sustituye (el anterior queda no vigente) y anular
  la mejora lo repone. Solo se anula la mejora que es el último cambio de depreciación del activo y si ningún cierre usó sus tramos.
- La revisión de la estimación y el cambio de matrícula empiezan en el primer mes abierto; el activo guarda la vida útil total y el
  residual de la estimación vigente. Un terreno no recibe mejoras.
- Falta para AF-7c: lista y formulario de mejora (con la sugerencia de componente), «Revisar estimación» y «Cambiar matrícula o
  catastro» en la ficha, y mostrar `mejoraId` en la pestaña Costos.

**Notas de lo programado en AF-6 (servidor, migración `0006_af6_saldos_iniciales`):**

- El costo `saldo_inicial` queda con `aplica_al_libro_fiscal = true` (los checks de `costos` exigen que lo demás vaya al libro
  fiscal) y **no cuenta** en el costo fiscal del activo: este es `saldos_iniciales.costo_fiscal` + Σ costos fiscales posteriores. AF-4
  (`PonerEnUso` de una obra de saldo inicial: base = costo fiscal del saldo menos lo que la carga dejó fuera de la base), AF-7
  (mejoras y costos posteriores) y AF-9 (venta) deben leer de ahí.
- El inicio de uso debe ser igual o posterior a la adquisición y ambos anteriores a la fecha de inicio de la empresa. Una obra sin
  terminar (`enConstruccion`) y un terreno entran sin depreciación acumulada; la obra queda sin tramos y se pone en uso después.
- Vida útil restante en 0: sin tramo contable (solo fiscal) y el aviso `vida_agotada_con_saldo` al cerrar la carga. Un activo de
  saldo inicial no se elimina por las rutas generales ni se quita de uso mientras sus tramos sean los del saldo
  (`activo_de_saldo_inicial`); si ya se puso en uso (tramos `inicio_de_uso`) sí se devuelve. **Corregir** un saldo se rechaza
  (`saldo_con_movimientos_posteriores`) si el activo recibió costos de otro origen o tiene tramos de otra causa.
- Excel: las filas se crean en orden; el padre se escribe por su código y debe ir antes que su componente o ya estar cargado.
- Falta para AF-6c: mostrar el saldo inicial (costo fiscal y acumuladas) en la ficha del activo.

**Notas de lo programado en AF-3c y AFI-2c (cliente):**

- «Devolver a la bandeja» solo se ofrece sobre las líneas descartadas en la sesión: el servidor no tiene un listado de
  descartadas. Si hace falta verlas todas (por ejemplo, otro usuario las descartó), habría que agregar un filtro
  `descartadas` a `GET /activos-fijos/bandeja` (pendiente de decisión).
- La cuadrícula de unidades muestra código, serie y placa; la marca y el modelo son los de la asignación para todas
  (el servidor los copia a cada unidad).
- Un costo manual se ofrece con `costos.crear` en cualquier activo; si el activo no lo admite (de terceros, en uso antes
  de AF-7), el servidor lo dice y el mensaje se muestra tal cual.
- La pestaña Costos se trae junto con la ficha, no al abrir la pestaña.
- Correcciones de la revisión (2026-11-19): el valor como ganado común acepta el número que entrega el campo; los
  activos se vuelven a traer cada vez que se abre «Capitalizar» (si no, los recién nacidos no aparecían para costos
  posteriores); un costo a un edificio que ya existe puede marcarse «No es edificación»; los errores Zod del servidor
  (`asignaciones.<i>.…`) se ponen en el campo de su parte y matrícula, catastro y ganado común se validan con dos
  decimales; el costo manual exige monto mayor que cero; el aviso de descarte dice que devolver solo vale sin recargar.

AF-6 puede adelantarse a AF-5 si se quiere cargar saldos antes de cerrar meses. El paso **AF-P22** va antes de AF-2c y
necesita la revisión de `seguridad` de §6.13. **AFI-1** no es un paso aparte: son columnas de la migración de AF-2. AFI-0
(llevar la integración a este diseño y al de Inventarios) quedó hecho el 2026-11-18.

## 17. Preguntas para el usuario

_Todas respondidas el 2026-11-18 (al final): AF-P1 a AF-P21 según la recomendación **salvo AF-P2, que fue la a**;
**AF-P10 cambió** con la integración (I-3 a: el grupo se divide solo) y **AF-P22 = b**. Ojo: `diseno-parcelas.md` §4.2
anuncia otra «AF-P22» (el inmueble en vez de la matrícula en el activo); cuando se lleve a este diseño tomará el número
**AF-P23** para no confundirlas._

| # | Pregunta | Opciones | Recomendación |
|---|---|---|---|
| AF-P1 | ¿De qué depende el módulo? | a) Solo de Libro de compras; b) de Libro de compras y Bancos; c) de nada (sin ligar con el libro) | **a**. Las compras llegan por el libro (llaves a sus líneas); Bancos no hace falta en v1 (el depósito de la venta se registra allá) |
| AF-P2 | ¿Quién ve qué activos? | a) Todos los de la empresa (solo permisos); b) por **localidad**, con el alcance que ya tiene Empresas; c) alcance propio por activo | Se recomendó b; **el usuario eligió a** |
| AF-P3 | ¿Dos libros? (D1) | a) Solo fiscal; b) contable y fiscal; c) los dos, el contable igual al fiscal por omisión | **c** (dictamen) |
| AF-P4 | ¿Desde qué mes se deprecia? (D2) | a) El mes de inicio de uso (y no el de la baja); b) el mes siguiente (y sí el de la baja); c) por días | **a**, configurable por empresa |
| AF-P5 | ¿Un servicio puede ser activo fijo? (D3, E1) | a) No; b) sí, y sigue en la casilla de servicios del SAT-2237 | **b** (paso AF-0) |
| AF-P6 | ¿Cómo entran las compras? (D4) | a) Un activo automático por línea; b) bandeja «Por capitalizar» | **b** |
| AF-P7 | ¿Umbral de capitalización? (D5) | a) Ninguno; b) monto por empresa (0 por omisión) con «bien de control» | **b** |
| AF-P8 | ¿Revaluación y deterioro en v1? (D6) | a) No; b) solo deterioro; c) los dos | **a** (el modelo de tramos los admite después) |
| AF-P9 | ¿Activos biológicos? (D7) | a) Completos aquí; b) aquí al costo, el resto en Ganadería y Cultivos | **b** |
| AF-P10 | ¿Un activo puede ser un **grupo** (50 sillas, un lote de herramientas)? | a) No: uno por unidad; b) sí, con cantidad informativa y baja solo total; c) sí, con baja parcial | Se respondió b; **cambia con la integración (I-3 a)**: la cantidad deja de ser informativa y el grupo se divide solo al trasladar, dar de baja o contar una parte (§6.11) |
| AF-P11 | ¿Cómo se registra el cobro de una venta? (D8) | a) Aparte, en Bancos, con «Venta de activo»; b) desde la venta, con una orden a Bancos (si está activo) | **a** en v1. b necesita generalizar el revisor de cambios de Bancos (ya pedido por Caja chica) |
| AF-P12 | ¿Bienes de terceros? (D9) | a) Solo control físico; b) arrendamiento financiero completo | **a** |
| AF-P13 | ¿Inventario físico con QR en v1? (D10) | a) Sí, al final de v1 (AF-11c y AF-12); b) después | **a** |
| AF-P14 | ¿Intangibles aquí? (D11) | a) Sí, como clases; b) no | **a** |
| AF-P15 | ¿Bloquear la anulación en el libro de un documento capitalizado? (D12) | a) Bloquear; b) avisar | **a**, sabiendo que con el módulo inactivo no se puede bloquear (R-1: lo atrapa el cierre) |
| AF-P16 | ¿Código del activo? | a) Correlativo de la empresa, fijo; b) correlativo por clase; c) libre, con el correlativo de la empresa como propuesta | **c**: quien migra trae sus códigos y sus placas ya pegadas |
| AF-P17 | ¿Reabrir meses? | a) Solo el último cerrado, de uno en uno; b) cualquiera, reabriendo los posteriores | **a**, con motivo y auditoría |
| AF-P18 | ¿Pólizas de seguro en v1? | a) Sí; b) después (AF-14) | **b** |
| AF-P19 | ¿El responsable? | a) Texto con usuario opcional (como el custodio de caja chica); b) un tercero de Clientes | **a** |
| AF-P20 | ¿Fotos y actas? | a) Una foto por activo y el acta y la denuncia en las bajas; b) varias fotos y adjuntos por activo | **a** en v1 |
| AF-P21 | ¿Cerrar el primer mes exige la carga inicial cerrada? | a) Sí, si hay activos de saldo inicial; b) no, solo avisa | **a**: con la carga abierta los saldos todavía pueden cambiar y el mes saldría mal |
| **AF-P22** (respondida: **b**) | Quien usa Activos fijos sin ver todas las localidades en Empresas no ve el nombre de la localidad de algunos activos (R-5). ¿Qué se hace? | a) Mostrar «Localidad sin acceso» y ofrecer en traslados e inventario solo sus localidades; b) que Activos fijos lea los nombres de localidades y departamentos sin el filtro de Empresas (una vista o función `security definer` de Empresas que dé solo id y nombre); c) pedir `empresas.localidades.ver-todas` a quien use Activos fijos | **b**: es coherente con «todos lo ven» (AF-P2 a) y solo expone nombres, no datos de la localidad; el traslado a cualquier localidad también queda posible. a es lo más simple pero deja fichas incompletas; c mezcla dos permisos y da de más en Empresas. b toca Empresas (una función, su prueba) y la revisa `seguridad`. **Diseño del contrato en §6.13** |

## 18. Validación del contador (2026-11-18)

`contador-guatemala` validó los puntos; todo quedó incorporado en el cuerpo del diseño.

| # | Punto | Resultado | Dónde |
|---|---|---|---|
| A1 | Resultado fiscal de la venta | Se congela un **costo fiscal** aparte (costos con `aplica_al_libro_fiscal`, sin tope de matrícula ni resta del ganado común); resultado fiscal = precio − (costo fiscal − depreciación fiscal acumulada) | §3.5, §3.8, §5.6, §5.12 |
| A2 | Base del ISO | El reporte usa el activo fijo neto **contable** al cierre del año anterior | §13 |
| A3 / V-7 | Tope fiscal del inmueble | El **mayor** entre matrícula y catastro; el 70 % se aplica al valor total del inmueble; marca «No es edificación ni requiere licencia» en costos y mejoras (fuera del tope); cambio de matrícula hacia adelante con tramo `cambio_de_matricula` y auditoría | §3.5.1, §5.3, §5.4, §5.7, §5.8, §6.5 |
| V-1 | Servicio capitalizado en el SAT-2237 | Sigue en servicios (AF-0, programado) | §4.1 |
| V-2 | Software | El incluido en el equipo es costo del equipo (33.33 %); solo la licencia aparte va a «Programas y licencias» (20 %); suscripciones y SaaS son gasto (se descartan) | §3.3, §5.1 |
| V-3 | Mejora y costo posterior en el libro fiscal | Mejora: saldo no depreciado + mejora. Costo posterior: base fiscal total corregida, sin reiniciar la vida. La pantalla sugiere componente si es separable | §6.6, §7.3, §5.7 |
| V-4 | Bien ocioso | La acumulada fiscal avanza siempre; línea aparte «Cuota fiscal de bienes ociosos (riesgo de no deducibilidad, art. 25)»; motivo al marcar; deducible por omisión (P-B) | §3.2, §5.3, §5.10, §6.3, §7.3, §13 |
| V-5 | Mes de la baja y centro de costo al último día | Conforme | §3.6, §3.7 |
| V-6 | Nota de crédito mayor que el valor por depreciar | Dos montos (exceso contable y fiscal); los costos vigentes de un activo nunca negativos | §5.4, §5.8, §7.4 |
| V-8 | Costo fuera del libro fiscal | Permitido en cualquier costo manual, con motivo | §3.3, §5.4 |
| V-9 | Reproductores: residual contable = ganado común | Conforme | §3.5 |
| V-10 | Venta de reproductor | Aviso con el texto de §3.8; sin cálculo distinto en v1 | §3.8 |
| V-11 | Línea marcada y descartada | Solo aviso (P-C a: la marca no se corrige en el libro) | R-3 |
| V-12 | Bajas | Tipo de acta (administrativa o notarial); aviso de IVA en la donación y en el faltante sin acta | §3.8, §5.12 |
| V-13 | Tercera edición de la NIIF para las Pymes | Sin cambio en v1 | — |
| Auditoría | Recursos permanentes | `activos`, `costos`, `mejoras`, `saldos-iniciales`, `bajas`, `cierres`, con la cita Código Tributario arts. 112 «A» y 47 | §4.2, §10.2 |
| P-A | «Sustituir documento» | Después de v1 (AF-15) | §16, R-1 |

Pendiente con `contador-guatemala` (puntos de la integración, `diseno-integracion-activos-fijos-e-inventarios.md` §13;
validar antes de AFI-5):

| # | Punto | Propuesta |
|---|---|---|
| VI-1 | Aviso de «¿es un bien de uso?» en la recepción de Inventarios y no al crear el artículo | `diseno-inventarios.md` §6.3 **[corrige el dictamen D5]** |
| VI-2 | División proporcional con el sobrante en el origen; las cuotas cerradas se quedan en el origen; el mes de la división se reparte | §7.6 |
| VI-3 | Un bien nuevo en bodega no se marca ocioso solo | §3.2 |
| VI-4 | Faltante de unidades de un grupo: división + baja por faltante, con el aviso de IVA de siempre | §3.9 |

Pendiente con `seguridad` (antes de programar cada parte):

- **Antes del paso AF-P22**: las funciones `empresas.nombres_de_localidades` y `empresas.nombres_de_departamentos`
  (§6.13): `security definer`, `search_path` fijo, filtro por `app.empresa_id`, columnas mínimas, `GRANT` solo a
  `arrancar_app`, y lo que el usuario aceptó exponer.
- ~~Antes de AFI-4~~ (hecho con la revisión del diseño y las reglas de archivos de los demás módulos): el escaneo firmado de la boleta (`core.archivos`, `recurso_dueno = 'activos-fijos.traslados'`, PDF con
  qpdf, `limitarSubidas`).
- Antes de AFI-2: el tope de 200 unidades por operación (tamaño del cuerpo y tiempo de la transacción).
- Lo de siempre: las dos dependencias nuevas del cliente (QR y lectura de QR), el permiso de cámara, las fotos y actas
  (`core.archivos`, PDF con qpdf, `recurso_dueno`) y que el QR solo lleve el id (sin datos del activo).

## 19. Pendientes que este diseño deja anotados

- Cuentas por pagar: prorratear por líneas el reparto Inversión/Operación de un documento mixto (R-2).
- ~~Dividir un activo agrupado (AF-P10) y la baja parcial~~: se hace con la integración (§6.11, AFI-5 y AFI-6).
- ~~AF-P22: nombres de localidades para quien no las ve todas en Empresas~~: respondida b (§6.13).
- **Préstamo de herramientas y equipo** (INV-P3 a): préstamo y devolución de un activo o bien de control a un
  responsable, con boleta. Es de este módulo; falta su diseño corto (¿basta con un traslado con fecha de devolución
  esperada, o hace falta un estado «prestado»?).
- Orden `activos-fijos.dar_de_baja` para Ganadería y Cultivos (R-8).
- Revaluación y deterioro (§3.10), pólizas (AF-14), arrendamiento financiero.
- «Sustituir documento» (P-A, AF-15).
- La pregunta del inmueble de `diseno-parcelas.md` §4.2 (será AF-P23).
- Con Contabilidad: cuentas por clase, cuenta puente de compras de activos, partidas de los eventos de §9.

## Respuestas del usuario (2026-11-18)

- **AF-P2:** **todos los activos de la empresa** los ve quien tenga acceso a la empresa y el permiso (opción a; sin alcance por
  localidad), dicho por el usuario: «que todos puedan verlo toda vez tenga el acceso».
- **AF-P3 y AF-P4:** dos libros (contable y fiscal, el contable igual al fiscal por omisión); se deprecia desde el mes en que
  empieza a usarse y el mes de la baja no se deprecia (configurable por empresa).
- **AF-P6 y AF-P7:** bandeja «Por capitalizar» y monto mínimo por empresa (0 por omisión) con «bien de control» debajo.
- **AF-P5, AF-P8, AF-P9, AF-P13, AF-P14 y AF-P18:** servicios capitalizables (AF-0, ya programado); sin revaluación ni
  deterioro en v1; biológicos al costo con depreciación fiscal (el resto en Ganadería y Cultivos); intangibles con amortización;
  inventario físico con QR al final de v1; pólizas después.
- **AF-P10:** grupos con cantidad informativa y baja total (**cambiada después por I-3 a** de la integración: el grupo se divide solo). **AF-P16:** código libre con el correlativo de la empresa como
  propuesta.
- **Del dictamen de validación (V-1 a V-13):** **P-A** «Sustituir documento» (puede ir después de v1); **P-B** la cuota fiscal
  del ocioso es deducible por omisión, en línea aparte con aviso de riesgo. Los ajustes del contador (A1 `costo_fiscal` en
  bajas, A2 ISO con el activo neto contable del cierre anual, A3/V-7 matrícula o catastro el mayor, V-2, V-3, V-4, V-6, V-8,
  V-10, V-12, y la auditoría permanente con saldos iniciales y mejoras) se incorporan al diseño antes de AF-1.
- **Segunda tanda (2026-11-18), todas las recomendaciones:** AF-P1 (a) depende solo de Libro de compras; AF-P11 (a) el cobro
  de la venta se registra aparte en Bancos con «Venta de activo»; AF-P12 (a) bienes de terceros solo control físico;
  AF-P15 (a) bloquear anular en el libro un documento capitalizado, con el mensaje que guía; AF-P17 (a) solo se reabre el
  último mes cerrado, con motivo y auditoría; AF-P19 (a) responsable como texto con usuario opcional; AF-P20 (a) una foto
  por activo y acta y denuncia en las bajas; AF-P21 (a) cerrar el primer mes exige la carga inicial cerrada si hay saldos
  iniciales; P-C (a) la marca de activo fijo no se corrige en el libro. **Diseño aprobado.**
- **Incorporado al cuerpo (2026-11-18):** AF-P2 a (sin alcance por localidad: solo RLS por empresa y permisos; se quitaron
  las políticas de alcance, el uso de la tabla de accesos de localidades, la ventana de asignación y los errores y pruebas
  de alcance) y el dictamen de validación del contador (§18). Nace la pregunta **AF-P22** (§17).
- **Integración con Inventarios (2026-11-18), todas las recomendaciones** (`diseno-integracion-activos-fijos-e-inventarios.md`):
  I-1 (a) el stock de bienes de uso vive aquí, con la bodega como ubicación; I-2 (a) se deprecia desde que está recibido y
  listo, en los dos libros; I-3 (a) el grupo se divide solo al trasladar, dar de baja o contar (**cambia AF-P10**); I-4 (a)
  una línea de N unidades en N activos con el sobrante en el último; I-5 (a) bienes de control como gasto también en lo
  fiscal, con aviso; I-6 (a) equipo de reserva y repuestos importantes como activo fijo; I-7 (a) casilla «En bodega de
  activos» en el traslado; I-8 (b) se imprime la boleta y se sube el escaneo firmado; I-9 (a) una división se anula en mes
  abierto sin movimientos posteriores; I-10 (a) el uso propio de mercadería por la salida a «Obra o uso propio»; I-11 (a)
  aviso en Inventarios; I-12 (a) el mínimo se mide por línea; I-13 (a) códigos correlativos propuestos y editables.
  **AF-P22 = b**: la lista y la ficha muestran el nombre de la localidad aunque el usuario no la vea en Empresas
  (funciones de Empresas solo con id, código y nombre, §6.13, revisadas por `seguridad`). Llevado al cuerpo en AFI-0.
