# Diseño de Activos fijos — arquitecto de datos, 2026-11-18

_Agente `arquitecto-de-datos`. Base contable y fiscal: `dictamen-activos-fijos-2026-11-18.md` (contador-guatemala, mismo
día, «correcto con ajustes» sobre lo que ya existe). Aterriza el punto 8 de `docs/HOJA-DE-RUTA.md` («Activos fijos e
Inventarios», solo la primera parte). **Nada de esto se programa hasta que el usuario responda §17.** Lo que el
arquitecto no comparte del dictamen, o que el código ya resolvió de otra forma, va marcado **[corrige el dictamen]** y
pasa a §18 para que lo valide el contador._

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
   `empresas.localidades.ver-todos`) y único `localidades_id_empresa_unico`; `departamentos` con localidad opcional,
   `politicaPorAlcanceOpcional(ALCANCE_DE_LOCALIDADES, 'localidad_id')` y único `departamentos_id_empresa_unico`.
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
| Obras y bienes en construcción o en tránsito (acumulan costo sin depreciar) | Inventario de consumibles y préstamo de herramientas: módulo **Inventario** (punto 8 de la hoja de ruta, aparte) |
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
| **Inventario físico** | Un conteo por localidad con lo esperado, lo encontrado y lo que sobró | `inventarios`, `inventario_lineas`, `inventario_sobrantes` |

### 3.2 Ciclo de vida

```
            poner en uso                    baja o venta
en_construccion ───────────► en_uso ─────────────────────► dado_de_baja
     ▲ (alta sin fecha de uso)   │  ▲ ocioso (bandera, sigue depreciando)
     └─ costos se acumulan        └──┘
```

- **Estado** (`en_construccion`, `en_uso`, `dado_de_baja`) es lo único guardado. **Ocioso** es una bandera de `en_uso`
  (NIIF 17.20: sigue depreciándose en el libro contable; en el fiscal ver V-4). **Totalmente depreciado** no es un estado:
  se deduce de que el valor por depreciar llegó a cero en los dos libros. **[corrige el dictamen §5.4]**, que los pone
  como estados: guardarlos obligaría a mantenerlos al día en cada cierre y podrían contradecir los números.
- Un bien de control o de terceros nace `en_uso` y no tiene libros ni cuotas; solo traslados, inventario y baja (sin
  resultado: para uno de terceros, «devuelto al dueño»).

### 3.3 Cómo entra el costo (E2, E3)

1. **Desde el libro (D4 b)**: en la bandeja, una línea muestra su costo, lo ya capitalizado y lo que falta. Se elige el
   activo (nuevo o existente, también uno en construcción) y el monto; la suma por línea **no pasa** de su costo. Varias
   líneas de documentos distintos (factura, flete, instalación) pueden ir al mismo activo.
2. **Manual (E3)**: monto, fecha, clase de costo (importación, construcción, aporte, donación, honorarios, otro), documento
   de soporte (texto obligatorio: «DUCA 26-0000123», «Planilla de obra, quincena 1-15 mar») y su archivo opcional. Para
   lo que no pasa por el libro: DUCA (que Arrancar no tiene), planilla de construcción propia, aporte de socios,
   donación. No se permite un costo manual por algo que sí está en el libro (aviso, no bloqueo: el sistema no puede
   saberlo con certeza).
3. **Nota de crédito**: una nota del libro sobre una factura con costos capitalizados aparece en la bandeja **aunque su
   línea no esté marcada**, con el activo propuesto; su costo entra en negativo. Una nota de débito marcada entra positiva.
4. **Saldo inicial** (§8): un costo único `saldo_inicial` con el costo histórico.

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

### 3.5 Los dos libros (D1 c)

| | Contable (NIIF para las Pymes 17) | Fiscal (ISR arts. 25 a 33) |
|---|---|---|
| Base | Σ costos vigentes (con el saldo inicial) | Σ costos vigentes con `aplica_al_libro_fiscal`; en inmuebles, como máximo el valor de matrícula del edificio (art. 26 y 23) |
| Cómo se deprecia | Línea recta en **meses** de vida útil, hasta el valor residual | Línea recta al **porcentaje anual** del activo sobre su base, hasta cero (sin residual, dictamen §1.1) |
| Por omisión | Vida útil = la de la clase; si la clase no la da, la que equivale al porcentaje fiscal (`round(1200 / %)` meses); residual = el de la clase (0 %) | Porcentaje = el de la clase, que no pasa del máximo de su inciso (configuración de instalación) |
| Se cambia | Con **revisión de la estimación** (NIIF 17.19), hacia adelante, con permiso y auditoría | **No** después del primer cierre que lo use (art. 27 y 28: «una vez adoptado») |
| Reproductores | Residual por omisión = valor como ganado común (V-9) | Base = costo − valor como ganado común (art. 28 inciso 7) |
| Terrenos | No se deprecian | No se deprecian |

Así, para la pyme que usa las tasas fiscales en libros, los dos libros dan lo mismo y no se toca nada; quien audita con
NIIF cambia la vida o el residual en la clase o en el activo, y el cuadro de §13 muestra la diferencia temporaria (NIIF 29).

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

### 3.8 Baja y venta (E5, D8)

- **Baja** con causa (`destruccion`, `robo`, `extravio`, `donacion`, `obsolescencia`, `faltante_de_inventario`,
  `devuelto_al_dueno` —solo de terceros—, `otra`), descripción, quién la autorizó, destino del bien, **acta** (PDF o
  foto) y, en robo o extravío, número de la **denuncia** (MP o PNC) y su archivo. El sistema **avisa, no bloquea**, si
  falta el acta o la denuncia (el efecto fiscal de no tenerla lo explica el aviso: IVA art. 3 num. 7 e ISR art. 21.17).
- **Venta**: además, fecha, comprador (nombre y NIT), precio sin IVA, IVA, y la FEL emitida afuera (serie, número y
  autorización). El cobro **no** se registra aquí: se registra en Bancos como depósito con el concepto «Venta de
  activo» (Inversión), y la pantalla lo recuerda (AF-P11).
- Al dar de baja se **congelan** en la fila: costo, depreciación acumulada contable y fiscal, valor en libros y valor
  fiscal por depreciar al día de la baja, y el **resultado**: contable = precio − valor en libros; fiscal = precio −
  (base fiscal − acumulada fiscal). En la venta se muestra el aviso de la ganancia de capital (10 %, declaración propia
  del mes siguiente, ISR arts. 84, 89, 92 y 95; la pérdida no es deducible, arts. 91 y 96) y del IVA de la venta; desde
  el 1-ene-2027, el aviso de inmuebles de personas individuales (Decreto 18-2026), solo si la empresa es persona individual.
- Un **padre** se da de baja con todos sus componentes vigentes; un **componente** se puede dar de baja solo (cambio del
  motor: baja del viejo, alta del nuevo como componente).

### 3.9 Inventario físico (D10)

Por localidad (o de toda la empresa). Al abrirlo se **copia la lista esperada** (activos, bienes de control y de terceros
no dados de baja de esa localidad). Se cuenta escaneando el QR de la etiqueta o buscando por código; cada fila queda
`encontrado`, `no_encontrado` o `en_otra_ubicacion` (con dónde), con su estado físico opcional. Lo que aparece sin estar
en la lista va a **sobrantes** (descripción, código leído, foto). Al **cerrar**: se imprime el acta y se **proponen** las
bajas por faltante y los traslados, que cada uno se confirma con su permiso y su acta (dictamen §4: «con su ajuste
aprobado»). Un sobrante se regulariza con un alta manual o de saldo inicial.

### 3.10 Revaluación y deterioro (fuera de v1, D6)

Reservado: serían una tabla `revaluaciones` (avalúo, valuador, superávit, ISR de ganancia de capital pagado o no, porque
solo así se deprecia el aumento, art. 29) y otra `deterioros` (solo libro contable, no deducible). Las dos crean un tramo
contable nuevo; el modelo de tramos ya lo admite sin cambiar tablas existentes.

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
| `core/contratos/activos-fijos.contratos.ts` | Eventos del bus (§9). Sin órdenes nuevas para otros módulos en v1 |
| Auditoría permanente | La migración `0001` de Activos fijos inserta en `core.recursos_de_auditoria_permanente` los recursos `activos-fijos.activos`, `activos-fijos.bajas`, `activos-fijos.cierres` y `activos-fijos.costos`, con motivo «Documentos de costo mientras se deprecia el bien, más la prescripción (Código Tributario arts. 47 y 112; ISR art. 26)». Un edificio se deprecia 20 años: los 60 meses de conservación no alcanzan |

### 4.3 Bancos, Cuentas por pagar, Caja chica, Cuentas por liquidar, Empresas

**Sin cambios** en v1. El concepto «Venta de activo» ya existe (sugerido). Si se elige AF-P11 b (orden a Bancos para el
depósito), Bancos necesita reconocer el origen `activos-fijos` en `RevisorDeCambios`, que es justo la generalización que
pide `diseno-caja-chica-y-cuentas-por-liquidar.md` §3.2.

## 5. Datos (esquema `activos_fijos`)

Toda tabla lleva `empresa_id` (FK `core.empresas` on delete cascade), `politicaPorEmpresa()`, `...marcasDeTiempo` y
`...autoria`. Llaves a otras tablas `no action` salvo donde se dice; las compuestas con `empresa_id` para no cruzar de
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
Otros intangibles (20 %), Derecho de llave (10 %), Terrenos (0 %).

### 5.2 `activos_fijos.clases_por_concepto`

`(empresa_id, concepto_de_gasto_id)` PK; `clase_id`. FK compuestas `(concepto_de_gasto_id, empresa_id) →
libro_de_compras.conceptos_de_gasto (id, empresa_id)` **on delete cascade** y `(clase_id, empresa_id) → clases`. Índice
`(clase_id)`. Sirve para que la bandeja **proponga** la clase según el concepto de la línea (Vehículos → Vehículos). Se
edita en la ficha de la clase («Conceptos de gasto que la proponen»).

### 5.3 `activos_fijos.activos` (protegida por el alcance de localidades si se aprueba AF-P2)

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
| `fecha_de_adquisicion` | date | no | La del primer costo, la del documento o la de recepción |
| `fecha_de_inicio_de_uso` | date | sí | `(estado = 'en_construccion') = (fecha_de_inicio_de_uso is null)`; `>= fecha_de_adquisicion` salvo en saldo inicial (dominio) |
| `fecha_de_baja` | date | sí | `(estado = 'dado_de_baja') = (fecha_de_baja is not null)`; copia de la baja vigente |
| `porcentaje_fiscal` | numeric(5,2) | sí | Copiado de la clase al poner en uso (o en el saldo inicial); fijo tras el primer cierre que lo use (dominio). `(tipo_de_registro = 'activo' and estado <> 'en_construccion') = (porcentaje_fiscal is not null)` |
| `vida_util_contable_meses` | smallint | sí | Igual que el porcentaje; cambia solo con la revisión de la estimación (nuevo tramo) |
| `valor_residual` | numeric(14,2) | sí | `>= 0`; en monto (lo propone el porcentaje de la clase sobre el costo) |
| `valor_como_ganado_comun` | numeric(14,2) | sí | `>= 0`; obligatorio si la clase es `reproductores` (dominio: está en otra tabla) |
| `valor_de_matricula` | numeric(14,2) | sí | `> 0`; solo edificios: el valor del edificio en la matrícula fiscal o el catastro (tope de la base fiscal); con `matricula_presunta boolean default false` si salió del 70 % (art. 26) |
| `marca`, `modelo`, `numero_de_serie`, `placa` | text | sí | 1–80 recortado cada uno; índice `(empresa_id, upper(numero_de_serie)) where numero_de_serie is not null` (búsqueda, sin único: dos fabricantes pueden repetir) |
| `cantidad` | integer | no | `default 1`, `>= 1`; informativa (AF-P10) |
| `localidad_id` | uuid | sí | FK compuesta a `empresas.localidades (id, empresa_id)`; vigente (la escribe el caso de uso del traslado); índice parcial |
| `departamento_id` | uuid | sí | FK compuesta a `empresas.departamentos (id, empresa_id)`; vigente; índice parcial. Debe ser de toda la empresa o de la misma localidad (dominio) |
| `responsable` | text | sí | 1–150; vigente |
| `responsable_usuario_id` | uuid | sí | FK `core.usuarios` **on delete set null**; vigente; índice parcial |
| `foto_archivo_id` | uuid | sí | FK `core.archivos` (sin `on delete`), `recurso_dueno = 'activos-fijos.activos'`; único parcial |
| `observaciones` | text | sí | 1–500 |

Únicos e índices: `activos_id_empresa_unico (id, empresa_id)` (destino de las llaves compuestas), `activos_lista_idx
(empresa_id, estado, clase_id)`, `activos_padre_idx (activo_padre_id) where activo_padre_id is not null`. RLS:
`politicaPorEmpresa()` + `politicaPorAlcanceOpcional(ALCANCE_DE_LOCALIDADES, 'localidad_id')` (AF-P2 b; un activo sin
localidad lo ven todos). La política es `for all` con `with check`: quien no ve la localidad de destino **no puede**
trasladar allá (§6.7).

Ni el costo ni la acumulada se guardan aquí: salen de `costos`, `saldos_iniciales` y `cuotas` (como el saldo de Cuentas
por pagar, U4). Las listas los traen con una consulta agrupada.

### 5.4 `activos_fijos.costos`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `activo_id` | uuid | no | FK compuesta a `activos`; índice `(activo_id, estado)` |
| `origen` | text | no | `in ('linea_de_compra','manual','saldo_inicial')`; único parcial `costos_saldo_inicial_unico (activo_id) where origen = 'saldo_inicial' and estado = 'vigente'` |
| `clase_de_costo` | text | no | `in ('adquisicion','importacion','flete','instalacion','construccion','honorarios','desmantelamiento','nota_de_credito','nota_de_debito','otro')` |
| `documento_de_compra_id`, `linea_de_documento_id` | uuid | sí | FK compuesta `(linea_de_documento_id, documento_de_compra_id, empresa_id) → libro_de_compras.lineas_de_documento (id, documento_id, empresa_id)` (único nuevo de §4.1); `(origen = 'linea_de_compra') = (linea_de_documento_id is not null and documento_de_compra_id is not null)`; índices parciales `(linea_de_documento_id)` y `(documento_de_compra_id)` (este, para el aviso de anulación) |
| `mejora_id` | uuid | sí | FK compuesta a `mejoras`; índice parcial |
| `fecha` | date | no | La emisión del documento, o la del soporte |
| `monto` | numeric(14,2) | no | `<> 0`; `(monto < 0) = (clase_de_costo = 'nota_de_credito')` |
| `aplica_al_libro_fiscal` | boolean | no | `default true`; `false` solo en `desmantelamiento` (V-8) |
| `documento_de_soporte` | text | sí | 1–150; obligatorio si `origen = 'manual'` |
| `archivo_id` | uuid | sí | FK `core.archivos`, `recurso_dueno = 'activos-fijos.costos'`; único parcial |
| `descripcion` | text | sí | 1–300 |
| anulación completa | | | `vigente`/`anulado` |

RLS: solo `politicaPorEmpresa()`; se lee **siempre unido** a `activos` (que sí filtra por alcance) y el caso de uso carga
el activo antes de escribir (si RLS lo oculta, responde «no encontrado»). **Regla de la línea** (dominio, con
`pg_advisory_xact_lock('activos-fijos.linea:<linea_id>')`, como la bancarización de CP4): Σ montos vigentes de una línea ≤
`costoDeLinea` (en positivo; en una nota, ≥ su costo negativo). Un trigger no puede leer el costo de la línea sin
repetir la fórmula del libro; por eso va en el dominio y una prueba de concurrencia lo cubre.

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
| `base_fiscal` | numeric(14,2) | no | `>= 0`; por omisión el costo (menos el ganado común o con el tope de la matrícula) |
| `depreciacion_acumulada_fiscal` | numeric(14,2) | no | `>= 0`, `<= base_fiscal` |
| `vida_util_restante_meses` | smallint | sí | `>= 0`; contable; nulo en terrenos |

RLS: empresa. Solo se escribe con la carga abierta y sin ningún cierre (§8).

### 5.7 `activos_fijos.mejoras`

`id`; `activo_id` (FK compuesta); `numero`, `anio_de_numero` (correlativo `activos-fijos.mejoras`; único por empresa);
`clase in ('mejora','costo_posterior')`; `fecha` (no futura; mes abierto); `descripcion` 1–300;
`vida_util_restante_contable_meses smallint` nula (solo en mejora: la nueva vida que queda, `>= 1`); anulación completa.
Índice `(activo_id, fecha)`. Sus costos la referencian; la mejora sin costos vigentes no se guarda (dominio).

### 5.8 `activos_fijos.tramos`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `activo_id` | uuid | no | FK compuesta a `activos` |
| `libro` | text | no | `in ('contable','fiscal')` |
| `desde_periodo` | date | no | Primer día del mes; primer mes que usa este tramo |
| `causa` | text | no | `in ('inicio_de_uso','saldo_inicial','mejora','costo_posterior','revision_de_estimacion')` |
| `mejora_id` | uuid | sí | FK compuesta a `mejoras`; `(causa in ('mejora','costo_posterior')) = (mejora_id is not null)` |
| `por_depreciar` | numeric(14,2) | no | `>= 0`: lo que falta al empezar el tramo (contable: valor en libros − residual; fiscal: base − acumulada) |
| `valor_residual` | numeric(14,2) | no | `>= 0`; `0` en el fiscal (`libro = 'fiscal' → valor_residual = 0`) |
| `meses` | smallint | sí | Contable: meses que faltan; `(libro = 'contable') = (meses is not null)` |
| `porcentaje`, `base_del_porcentaje` | numeric(5,2), numeric(14,2) | sí | Fiscal: `(libro = 'fiscal') = (porcentaje is not null and base_del_porcentaje is not null)` |
| `cuota_mensual` | numeric(14,2) | no | `>= 0`; calculada por el dominio (§7) y guardada para auditar el cálculo |
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
`politicaPorEmpresa()` + `politicaPorAlcanceOpcional(ALCANCE_DE_LOCALIDADES, 'localidad_id')`: los reportes por
localidad muestran solo lo que el usuario ve.

**Por qué no se borran al reabrir** [decisión del arquitecto]: dejarlas con `vigente = false` conserva lo que se
informó (y lo que Contabilidad pudo haber contabilizado) sin meter miles de filas en el `jsonb` de la auditoría; la
auditoría del reabrir guarda el cierre con sus totales. Crecen solo con cada reapertura.

### 5.11 `activos_fijos.traslados`

`id`; `activo_id` (FK compuesta); `es_alta boolean not null default false`; `grupo_id` uuid nulo (la boleta: todos los
activos que se trasladan juntos comparten grupo y número); `numero`, `anio_de_numero` (correlativo
`activos-fijos.traslados`, uno por grupo; `(es_alta) = (numero is null and grupo_id is null)`); `fecha` (no futura; mes
abierto, salvo la del alta de saldo inicial); `localidad_id`, `departamento_id`, `responsable`, `responsable_usuario_id`
(como en `activos`, todos nulos permitidos); `recibido_por` text 1–150 (obligatorio salvo en el alta, dominio);
`motivo` 1–300 (obligatorio salvo en el alta); `inventario_id` nulo (si lo propuso un inventario); anulación completa.
Únicos: parcial `(activo_id) where es_alta` (un alta por activo) y `(grupo_id, activo_id)`. No se guarda `hasta`: el
vigente es el de mayor `(fecha, creado_en)` no anulado, y su copia está en `activos`. Índices `(activo_id, fecha desc)`,
`(grupo_id)` y parciales de localidad, departamento y usuario. RLS: empresa (se lee unido al activo, como `costos`).

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
| `numero_de_denuncia` | text | sí | 1–60 |
| `inventario_id` | uuid | sí | FK compuesta a `inventarios`; `(causa = 'faltante_de_inventario') = (inventario_id is not null)` |
| `costo`, `depreciacion_acumulada_contable`, `valor_en_libros` | numeric(14,2) | no | Al día de la baja; check `valor_en_libros = costo − depreciacion_acumulada_contable` |
| `base_fiscal`, `depreciacion_acumulada_fiscal`, `valor_fiscal_por_depreciar` | numeric(14,2) | no | Check `valor_fiscal_por_depreciar = base_fiscal − depreciacion_acumulada_fiscal` |
| `cuota_del_mes_contable`, `cuota_del_mes_fiscal` | numeric(14,2) | no | `default 0`, `>= 0`: la cuota del mes de la baja cuando la convención la deprecia (`mes_siguiente`, §6.8); ya incluida en las acumuladas de arriba. El cierre del mes la toma tal cual |
| `comprador`, `nit_del_comprador` | text | sí | Venta: 1–150; NIT válido o `CF` (dominio con `Nit`) |
| `precio`, `iva` | numeric(14,2) | sí | Venta: `precio > 0`, `iva >= 0` |
| `serie_fel`, `numero_fel`, `autorizacion_fel` | text, text, uuid | sí | Venta: número y autorización obligatorios |
| `resultado_contable`, `resultado_fiscal` | numeric(14,2) | sí | Venta: check `= precio − valor_en_libros` y `= precio − valor_fiscal_por_depreciar`. En las demás causas son nulos (la pérdida es el valor en libros) |
| anulación completa | | | `vigente`/`anulada`; anular devuelve el activo a `en_uso` (mes abierto) |

Check `bajas_venta_completa`: `(causa = 'venta') = (precio is not null and comprador is not null and numero_fel is not
null and autorizacion_fel is not null and resultado_contable is not null and resultado_fiscal is not null)`. Índices
`(empresa_id, fecha)`, `(activo_id)`. RLS: empresa. Un bien de control o de terceros lleva los montos en cero.

### 5.13 Inventario físico

**`activos_fijos.inventarios`**: `id`; `numero`, `anio_de_numero` (correlativo `activos-fijos.inventarios`); `localidad_id`
nulo (= toda la empresa; FK compuesta); `fecha_de_inicio` date; `estado in ('en_curso','cerrado','anulado')`;
`cerrado_en`, `cerrado_por` (`(estado = 'cerrado') = (los dos no nulos)`); `participantes` text 1–500 (para el acta);
`observaciones`; anulación completa (solo en curso). Único parcial `(empresa_id, coalesce(localidad_id, '00000000-0000-0000-0000-000000000000'))
where estado = 'en_curso'` (uno abierto por localidad). RLS: empresa + `politicaPorAlcanceOpcional(…, 'localidad_id')`.

**`activos_fijos.inventario_lineas`**: `(inventario_id, activo_id)` PK, FK compuestas; `resultado in
('pendiente','encontrado','no_encontrado','en_otra_ubicacion')` `default 'pendiente'`; `localidad_encontrada_id` nula
(`(resultado = 'en_otra_ubicacion') = (localidad_encontrada_id is not null)`); `estado_fisico in ('bueno','regular','malo')`
nulo; `observacion` 1–300; `contado_en`, `contado_por` (`(resultado <> 'pendiente') = (contado_en is not null)`);
`leido_por_qr boolean default false`. Índice `(inventario_id, resultado)`. RLS: empresa.

**`activos_fijos.inventario_sobrantes`**: `id`; `inventario_id`; `descripcion` 1–300; `codigo_leido` 1–60 nulo;
`foto_archivo_id` nulo; `regularizado_con_activo_id` nulo (FK compuesta). RLS: empresa.

### 5.14 Migraciones y datos existentes

- `npm run generar -- modulo activos-fijos --nombre "Activos fijos" --descripcion "…" --icono Landmark` crea el esqueleto
  y `0000_esquema`. Cada paso del servidor genera su migración con `bd:generar -w servidor -- activos-fijos <nombre>`:
  `0001_af1_clases` (con la auditoría permanente de §4.2), `0002_af2_activos_y_traslados`, `0003_af3_costos_y_descartes`,
  `0004_af4_tramos`, `0005_af5_cierres_y_cuotas`, `0006_af6_saldos_iniciales`, `0007_af7_mejoras` (la FK de
  `costos.mejora_id` y `tramos.mejora_id` se agrega aquí), `0008_af9_bajas`, `0009_af12_inventarios`.
- **Sin datos que convertir** (módulo nuevo) ni migración de permisos (todos nuevos: el rol con acceso total los recibe
  solo). Los correlativos no necesitan fila previa.
- Libro de compras: `0037_af_servicio_capitalizable` (§4.1), **antes** de `0003_af3` porque esta apunta al único nuevo.
  Si Multimoneda toma la `0037` antes, se usa el siguiente número libre al programar.
- Orden: el migrador aplica `libro-de-compras` antes que `activos-fijos` (dependencia); la prueba `llaves-entre-esquemas`
  acepta las llaves a `empresas` (esencial), `core`, `libro_de_compras` (directo) y `terceros` (transitivo).

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

### 6.3 Activos (`CrearActivo`, `EditarActivo`, `EliminarActivo`, `MarcarOcioso`)

- Alta manual (`activos.crear`): con o sin costos manuales; `fecha_de_adquisicion >= fecha de inicio` de la empresa (si
  es anterior, el error dice «cárguelo como saldo inicial»). La primera fila de `traslados` (alta) se crea aquí.
- Editar (`activos.editar`) cambia solo datos descriptivos (descripción, marca, modelo, serie, placa, observaciones, foto,
  cantidad) y el ocioso (con fecha y auditoría `corregir`). Clase, tipo de registro y padre se cambian solo `en_construccion`.
- Eliminar (`activos.eliminar`) solo si no tiene cuotas, ni bajas, ni costos vigentes de líneas (anularlos primero),
  ni componentes; audita `eliminar` con el DTO.

### 6.4 Poner en uso (`PonerEnUso`, `activos.poner-en-uso`)

Fecha de inicio de uso (mes abierto; no anterior al último costo vigente), porcentaje fiscal (≤ máximo; propuesto por la
clase), vida útil y residual contables (propuestos). Exige costo vigente > 0 (salvo terrenos). Crea los dos tramos
`inicio_de_uso` (§7) desde el mes que manda `primer_mes`. Deshacerlo (`QuitarDeUso`, mismo permiso, auditoría `devolver`)
solo si ningún cierre usó sus tramos.

### 6.5 Revisión de la estimación (`RevisarEstimacion`, `activos.revisar-estimacion`)

Nueva vida útil restante y nuevo residual (solo libro contable), con motivo, desde el primer mes abierto. Crea un tramo
`revision_de_estimacion`. Audita `corregir` con el activo y el tramo anteriores. El porcentaje fiscal **no** se revisa:
si ya hubo un cierre, el error `porcentaje_fiscal_adoptado` cita los arts. 27 y 28.

### 6.6 Mejoras y costos posteriores (`RegistrarMejora`, `AnularMejora`; `mejoras.crear`, `mejoras.anular`)

Agrupa costos (de la bandeja o manuales) con su fecha (mes abierto) y, en una mejora, la nueva vida restante. Crea en
cada libro un tramo desde el mes que toca (`primer_mes` sobre la fecha de la mejora), con la base de §7.4. Anular: solo
si ningún cierre usó sus tramos; anula los costos y deja los tramos `vigente = false`; audita `anular`.

### 6.7 Traslados (`TrasladarActivos`, `AnularTraslado`; `traslados.crear`, `traslados.anular`)

Uno o varios activos (una boleta por traslado, con todos sus activos: `traslados` lleva un `grupo_id` uuid común para
imprimir la boleta conjunta). Fecha no anterior al último traslado del activo, en mes abierto. Actualiza la ubicación
vigente del activo y de sus componentes. Con el alcance por localidad (AF-P2 b), quien no ve la localidad de destino no
puede trasladar allá: la RLS lo impide y el caso de uso lo dice antes con `localidad_fuera_de_alcance`. Anular: solo el
último del activo y en mes abierto; restaura la ubicación anterior; audita `anular`.

### 6.8 Bajas y ventas (`DarDeBaja`, `RegistrarVenta`, `AnularBaja`; `bajas.crear`, `bajas.anular`)

Fecha en mes abierto y no anterior al inicio de uso. Calcula los congelados con las cuotas cerradas más la del propio mes
si `primer_mes = mes_siguiente` (§3.6): como el mes de la baja todavía no está cerrado, la cuota de ese mes se calcula con
el mismo dominio del cierre y se guarda aparte en la baja (`cuota_del_mes_contable`, `cuota_del_mes_fiscal`,
numeric(14,2) no nulas `default 0`), para que el cierre del mes la tome sin recalcular. Avisos: sin acta, robo o extravío
sin denuncia, componentes que también se dan de baja, ganancia de capital e IVA en la venta. Anular: mes abierto; audita
`anular` con el DTO; el activo vuelve a `en_uso`.

### 6.9 Cierre mensual (`RevisarCierre`, `CerrarMes`, `ReabrirMes`; `depreciacion.ver`, `.cerrar`, `.reabrir`)

- **Orden**: se cierra el mes siguiente al último cerrado; el primero es el mes de la fecha de inicio de la empresa (o
  el del primer inicio de uso, si no hay fecha de inicio). Sin huecos.
- **Alcance**: cerrar exige alcance total de localidades (`empresas.localidades.ver-todos` o acceso total) si la empresa
  tiene activos con localidad; si no, la RLS escondería activos y el cierre saldría incompleto (`cierre_sin_alcance_total`).
- **Revisar** (antes de confirmar, como EM-2): hallazgos `aviso` —líneas en la bandeja con fecha del mes o anterior;
  activos en construcción con más de 12 meses; inventario en curso; activos en uso sin localidad— y `bloquea`
  —costos vigentes de documentos **anulados** (§15, R-1); el mes anterior sin cerrar; carga inicial abierta con activos
  de saldo inicial (AF-P21)—. Muestra los totales que saldrán.
- **Cerrar**: candado exclusivo; para cada activo `en_uso` con libros (y los dados de baja en el mes si la convención lo
  pide) toma el tramo del mes, calcula la cuota (§7), la guarda con el centro de costo del último día del mes, y guarda
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
tope de `valor_de_matricula` en edificios); `A` = acumulada fiscal; `p` = porcentaje del activo.
`por_depreciar = B − A`; `base_del_porcentaje = B` al inicio de uso y `por_depreciar` en una mejora (art. 26: «la nueva
base es el saldo no depreciado más la mejora», V-3); `cuota_mensual = round(base_del_porcentaje × p / 1200)`. Cuota del
mes: `min(cuota_mensual, pendiente)`; termina cuando el pendiente llega a cero.

### 7.4 Costos posteriores y notas de crédito

Un costo positivo después del inicio de uso suma al `VL0` y a `B` del tramo nuevo. Una nota de crédito resta; si dejara el
valor en libros por debajo del residual (o la base fiscal por debajo de lo ya depreciado), el pendiente queda en cero y
el exceso se muestra como hallazgo «nota de crédito mayor que el valor por depreciar» para que Contabilidad lo trate
como ingreso (V-6). Nunca hay cuotas negativas.

### 7.5 Ejemplo (para las pruebas)

Pick-up de Q250,000.00 puesto en uso el 10-mar-2027, `mes_de_inicio`, fiscal 20 %, contable 60 meses con residual
Q25,000.00. Contable: `(250,000.00 − 25,000.00) / 60 = 3,750.00` por mes, de mar-2027 a feb-2032. Fiscal:
`250,000.00 × 20 / 1200 = 4,166.666… → 4,166.67`; 59 cuotas de 4,166.67 = 245,833.53 y la 60.ª de 4,166.47. En
dic-2027 (10 cuotas) la diferencia temporaria es `41,666.70 − 37,500.00 = 4,166.70`.

## 8. Saldos iniciales y la carga inicial (EM-2)

- **Pantalla de Administración «Saldos iniciales de activos fijos»** (con Excel, §14): solo con fecha de inicio, carga
  **abierta** (`empresas.obtener_carga_inicial`, que bloquea la fila `for share`) y **ningún cierre** de depreciación.
  Cada fila crea un activo `origen = 'saldo_inicial'` `en_uso` (o `en_construccion` si la obra no se terminó) con:
  código, descripción, clase, fechas reales de adquisición y de inicio de uso (anteriores a la fecha de inicio), costo,
  depreciación acumulada contable y fiscal al corte, base fiscal, porcentaje fiscal, vida útil restante, residual,
  localidad, departamento y responsable. Crea el costo `saldo_inicial`, la fila de `saldos_iniciales`, el traslado del
  alta y los dos tramos `saldo_inicial` desde el mes de la fecha de inicio.
- Componentes en el saldo inicial: columna «Código del padre» (el padre en otra fila del mismo archivo o ya cargado).
- Editar o eliminar un saldo inicial: carga abierta y sin cierres (`saldos-iniciales.editar` / `.eliminar`, auditoría).
- **Respuesta a `empresas.revisar_cierre_de_carga`** (`RevisarCierreDeCargaEnActivosFijos`):

| Código | Nivel | Mensaje |
|---|---|---|
| `sin_saldos_iniciales` | aviso | «No hay ningún activo fijo de saldo inicial. Si la empresa tenía activos al dd/mm/aaaa, cárguelos antes de cerrar.» |
| `vida_agotada_con_saldo` | aviso | «N activos de saldo inicial no tienen vida útil restante pero sí valor por depreciar por Q x: revise su vida o su depreciación acumulada.» |
| `sin_ubicacion` | aviso | «N activos de saldo inicial no tienen localidad: el inventario físico no los encontrará.» |
| `en_construccion` | aviso | «N obras en construcción por Q x entran en el balance sin depreciar.» |

  Cifras (`registro = null`): Activos (cantidad), Costo, Depreciación acumulada contable, Valor en libros, Base fiscal,
  Depreciación acumulada fiscal (montos); por clase (`registro` = la clase): Costo y Depreciación acumulada contable.
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
| `activos-fijos.activo_capitalizado` | Se guardan costos (alta o suma a un activo, también en construcción) | `costos: [{ costoId, origen, claseDeCosto, documentoDeCompraId, lineaDeDocumentoId, montoCentavos, aplicaAlLibroFiscal }]` |
| `activos-fijos.costo_anulado` | Se anula un costo | `costoId`, `montoCentavos` |
| `activos-fijos.activo_puesto_en_uso` | Poner en uso | Costo total; reclasifica «construcciones en curso» al activo |
| `activos-fijos.depreciacion_cerrada` | Cerrar un mes | `cuotas: [{ activoId, libro, montoCentavos, localidadId, departamentoId, ocioso }]`, totales, `regimenIsr` |
| `activos-fijos.depreciacion_reabierta` | Reabrir | `periodo` (Contabilidad revierte lo del mes) |
| `activos-fijos.mejora_capitalizada` | Mejora o costo posterior | `mejoraId`, `clase`, `montoCentavos`, nueva vida |
| `activos-fijos.activo_trasladado` | Traslado | Origen y destino (localidad, departamento, responsable) |
| `activos-fijos.activo_dado_de_baja` | Baja (no venta) | Causa, costo, acumuladas contable y fiscal, valor en libros, `bajaId` |
| `activos-fijos.activo_vendido` | Venta | Lo anterior más precio, IVA, FEL y resultados contable y fiscal |
| `activos-fijos.baja_anulada` | Anular baja o venta | `bajaId` |

Mediador: Activos fijos **escucha** `libro-de-compras.documento_por_anular` y `…_por_eliminar` (§15), **responde**
`empresas.revisar_cierre_de_carga` y **escucha** `empresas.fecha_de_inicio_por_cambiar`. No atiende órdenes en v1.

## 10. Permisos, auditoría, errores y configuración

### 10.1 Permisos (`permisos.ts`, PLAN §3.5)

| Recurso | Permisos |
|---|---|
| Clases | `activos-fijos.clases.ver`, `.crear`, `.editar` (inactivar y reactivar), `.eliminar`, `.importar`, `.exportar` |
| Activos | `activos-fijos.activos.ver`, `.crear`, `.editar`, `.eliminar`, `.poner-en-uso`, `.revisar-estimacion` |
| Bandeja y costos | `activos-fijos.costos.crear` (capitalizar desde la bandeja o manual), `.anular`; `activos-fijos.bandeja.ver`, `.descartar` (descartar y devolver) |
| Mejoras | `activos-fijos.mejoras.crear`, `.anular` |
| Traslados | `activos-fijos.traslados.crear`, `.anular` |
| Bajas y ventas | `activos-fijos.bajas.crear`, `.anular` |
| Saldos iniciales | `activos-fijos.saldos-iniciales.ver`, `.crear`, `.editar`, `.eliminar`, `.importar`, `.exportar` |
| Depreciación | `activos-fijos.depreciacion.ver`, `.cerrar`, `.reabrir` |
| Inventario físico | `activos-fijos.inventarios.ver`, `.crear` (abrir), `.contar`, `.cerrar`, `.anular` |
| Reportes | `activos-fijos.reportes.ver`, `.exportar` |

Sin `recursosConAlcance` propio: usa el de `empresas.localidades` (AF-P2 b), con su `ver-todos` y su ventana de
asignación. Las fichas y los reportes imprimen con `.ver` (imprimir no lleva permiso propio, como en los demás módulos).

### 10.2 Auditoría (dentro de la unidad de trabajo; `core.auditoria` solo se agrega)

| Caso de uso | `recurso` | `accion` | `anterior` |
|---|---|---|---|
| Inactivar, reactivar, eliminar clase | `activos-fijos.clases` | `inactivar` / `reactivar` / `eliminar` | DTO de la clase |
| Eliminar activo | `activos-fijos.activos` | `eliminar` | DTO del activo con sus costos |
| Marcar o quitar ocioso; revisar estimación; quitar de uso | `activos-fijos.activos` | `corregir` / `corregir` / `devolver` | DTO del activo y tramo anterior; motivo |
| Anular costo | `activos-fijos.costos` | `anular` | DTO del costo |
| Descartar y devolver línea | `activos-fijos.bandeja` | `descartar` / `devolver` | La línea (documento, número, costo) |
| Anular mejora, traslado, baja | `activos-fijos.mejoras` / `.traslados` / `.bajas` | `anular` | DTO |
| Editar o eliminar saldo inicial | `activos-fijos.saldos-iniciales` | `corregir` / `eliminar` | DTO |
| Cerrar mes | `activos-fijos.cierres` | `cerrar` | Totales del cierre (deja constancia de quién cerró, aunque no sea una baja) |
| Reabrir mes | `activos-fijos.cierres` | `reabrir` | Cierre anterior con totales por clase; motivo |
| Anular inventario | `activos-fijos.inventarios` | `anular` | DTO con el conteo |

Permanentes (§4.2): `activos-fijos.activos`, `.costos`, `.bajas`, `.cierres`.

### 10.3 Errores nuevos (código propio, familias del core)

`clase_con_porcentaje_sobre_el_maximo` (`DatoInvalido`), `clase_en_uso` y `activo_con_movimientos`
(`ReglaDeNegocioInfringida`), `linea_sobrecapitalizada`, `linea_descartada`, `linea_no_capitalizable` (documento anulado,
otra empresa), `activo_no_en_uso`, `activo_dado_de_baja`, `mes_cerrado` (con el mes), `mes_anterior_sin_cerrar`,
`cierre_sin_alcance_total`, `cierre_con_bloqueos` (con los hallazgos), `solo_se_reabre_el_ultimo`,
`porcentaje_fiscal_adoptado`, `fecha_anterior_al_inicio` («cárguelo como saldo inicial»), `carga_inicial_cerrada`,
`saldos_con_cierres`, `localidad_fuera_de_alcance`, `departamento_de_otra_localidad`, `componente_de_un_componente`,
`documento_con_costos_capitalizados` (el que recibe Libro de compras al anular o eliminar, con los códigos de los
activos), `activos_con_fecha_fuera_de_la_carga`, `inventario_en_curso_en_la_localidad`.

### 10.4 Configuración (`configuracion.ts`; solo niveles `instalacion` y `empresa`)

| Clave | Nivel | Valor por omisión | Para qué |
|---|---|---|---|
| `activos-fijos.isr.maximo.edificios` … `.otros_muebles`, `.intangibles`, `.llave` | instalación | 5, 15, 20, 20, 33.33, 25, 25, 10, 20, 10 | Topes de ley (art. 28 y 33), como las tasas de retención. Solo soporte los cambia |
| `activos-fijos.depreciacion.primer_mes` | empresa, instalación | `mes_de_inicio` | D2 (§3.6) |
| `activos-fijos.capitalizacion.umbral` | empresa | `0` | D5 (§3.4) |
| `activos-fijos.codigos.prefijo` | empresa | `AF-` | Código propuesto (AF-P16); `publica: true` para el formulario |
| `activos-fijos.construccion.meses_de_aviso` | empresa, instalación | `12` | Obras viejas sin cerrar (hallazgo del cierre) |

## 11. API (todas con `proteger({ permiso })`; dinero como texto)

| Método y ruta | Permiso |
|---|---|
| `GET/POST /activos-fijos/clases`, `PUT …/:id`, `POST …/:id/inactivar` y `/reactivar`, `DELETE …/:id`; `GET …/exportar`, `…/plantilla`, `POST …/importar` | `clases.*` |
| `PUT /activos-fijos/clases/:id/conceptos` (`clases_por_concepto`) | `clases.editar` |
| `GET /activos-fijos/bandeja` (filtros) | `bandeja.ver` |
| `POST /activos-fijos/bandeja/capitalizar` | `costos.crear` |
| `POST /activos-fijos/bandeja/:lineaId/descartar`, `POST …/devolver` | `bandeja.descartar` |
| `GET /activos-fijos/activos` (filtros: estado, clase, localidad, departamento, responsable, tipo de registro, texto, totalmente depreciado), `GET …/:id` (ficha con costos, libros, cuotas por año, traslados, mejoras, baja) | `activos.ver` |
| `POST /activos-fijos/activos`, `PUT …/:id`, `DELETE …/:id` | `activos.crear` / `.editar` / `.eliminar` |
| `POST …/:id/costos` (manual), `POST /activos-fijos/costos/:id/anular` | `costos.crear` / `.anular` |
| `POST …/:id/poner-en-uso`, `POST …/:id/quitar-de-uso` | `activos.poner-en-uso` |
| `POST …/:id/revisar-estimacion`, `POST …/:id/ocioso` | `activos.revisar-estimacion` / `.editar` |
| `POST …/:id/foto` (multipart), `GET …/:id/foto` | `activos.editar` / `.ver` |
| `POST /activos-fijos/mejoras`, `POST …/:id/anular` | `mejoras.*` |
| `POST /activos-fijos/traslados` (varios activos), `POST …/:id/anular`, `GET …/:grupoId/boleta` | `traslados.*`; boleta con `activos.ver` |
| `POST /activos-fijos/bajas` (con venta), `POST …/:id/anular`, `POST …/:id/acta`, `POST …/:id/denuncia`, `GET …/:id/acta` | `bajas.*`; archivos con `bajas.crear` / `activos.ver` |
| `GET /activos-fijos/depreciacion` (meses y estado), `GET …/:periodo/revision`, `POST …/:periodo/cerrar` (con la huella de la revisión, como EM-2), `POST …/:periodo/reabrir` (`{ motivo }`) | `depreciacion.*` |
| `GET/POST /activos-fijos/saldos-iniciales`, `PUT …/:activoId`, `DELETE …/:activoId`; `GET …/exportar`, `…/plantilla`, `POST …/importar` | `saldos-iniciales.*` |
| `GET/POST /activos-fijos/inventarios`, `GET …/:id`, `POST …/:id/contar` (`{ activoId | codigo, resultado, … }`), `POST …/:id/sobrantes`, `POST …/:id/cerrar`, `POST …/:id/anular` | `inventarios.*` |
| `GET /activos-fijos/reportes/<reporte>` y `…/<reporte>/exportar` | `reportes.ver` / `.exportar` |
| `GET /activos-fijos/etiquetas?ids=…` (datos para imprimir: código, descripción, localidad, URL del QR) | `activos.ver` |

Límites: `contar` es la ruta más usada en el inventario: sin límite por minuto propio pero con el general de la API;
fotos y actas con el `limitarSubidas` de archivos.

## 12. Cliente (`cliente/src/modulos/activos-fijos/`)

| Sección del menú | Pantalla | Forma |
|---|---|---|
| Operación | **Activos fijos** (lista con tarjetas: código, descripción, clase, ubicación, responsable, costo, valor en libros, estado y etiquetas «En construcción», «Ocioso», «Depreciado», «De terceros», «Control») | Lista con filtros → **ficha** (`DatosDelRegistro`) con pestañas: Datos, Costos, Depreciación (por libro, por año y mes), Historial (traslados, mejoras, estimaciones) y Baja. Acciones de la ficha según permiso: poner en uso, trasladar, mejora, revisar estimación, dar de baja, vender, imprimir etiqueta y responsiva |
| Operación | **Por capitalizar** (bandeja) | Lista agrupada por documento; seleccionar líneas → ventana «Capitalizar» (activo nuevo o existente, reparto por monto con el pendiente a la vista); descartar con motivo |
| Operación | **Nuevo activo** (alta manual) | Formulario en página con `CamposDeActivo` y costos manuales |
| Operación | **Traslados** | Elegir activos (búsqueda o QR) → destino → boleta imprimible |
| Operación | **Cierre de depreciación** | Meses con estado; «Revisar» muestra hallazgos y totales (como EM-2) y «Cerrar» con confirmación; «Reabrir» con motivo |
| Operación | **Inventario físico** | Abrir por localidad; pantalla de conteo para el teléfono: botón grande «Escanear», último leído, contadores (esperados, encontrados, pendientes), búsqueda por código como respaldo; cerrar con resumen y propuestas; acta imprimible |
| Administración | **Clases de activos** (con Excel) | Catálogo (lista y ventana), con «Conceptos de gasto que la proponen» |
| Administración | **Saldos iniciales de activos fijos** (con Excel) | Lista con totales del cuadre y ventana de alta; avisos de la carga cerrada |
| Reportes | §13 | Imprimir y exportar |

Notas: la página solo arma; composables `usarActivos`, `usarBandeja`, `usarCierreDeDepreciacion`, `usarInventario`; la
lógica pura (reparto de la bandeja, validación del monto pendiente, armado de etiquetas) en `edicion-de-*.ts` con pruebas.
El escáner usa la cámara del navegador (`BarcodeDetector` donde exista y una librería de lectura de QR donde no, como
Safari en iPhone): **dependencia nueva**, la revisa `seguridad` (§18). Las etiquetas se arman en el cliente y se imprimen
con el navegador (hoja carta con N etiquetas por página o rollo de etiquetas, a elegir), con el QR generado por otra
**dependencia nueva** (generador de QR sin red). El QR lleva la URL de la ficha (`/activos-fijos/activos/<id>`): una
cámara común abre la ficha (pide iniciar sesión) y el inventario lee el id.

## 13. Reportes (sección Reportes: imprimir y exportar)

| Reporte | Contenido | Filtros |
|---|---|---|
| **Registro de activos fijos** (auxiliar) | Por activo: código, descripción, clase, fechas, documento de origen, proveedor, costo, acumulada contable, valor en libros, base fiscal, acumulada fiscal, ubicación y responsable; totales por clase. Es el que cuadra con el mayor | Fecha de corte (último mes cerrado o anterior), clase, localidad, estado |
| **Depreciación del período** | Cuotas por activo y mes (contable y fiscal), totales por clase, localidad y departamento (centro de costo) | Desde y hasta (meses cerrados), libro |
| **Cuadro fiscal y contable** | Por activo: valor en libros, valor fiscal por depreciar, diferencia temporaria; totales. Para la empresa en el régimen sobre las utilidades, también la depreciación fiscal del año (deducible) y el **activo neto** al cierre de cada trimestre (base del ISO, solo como cifra) | Año, corte |
| **Activos por localidad y responsable** | Lista para firmar responsivas y para el inventario | Localidad, departamento, responsable |
| **Movimientos del período** | Altas, costos, mejoras, traslados, bajas y ventas con su resultado contable y fiscal (insumo de la declaración de ganancias de capital) | Período, tipo |
| **Activos totalmente depreciados en uso** y **Obras en construcción** | Para revisar vidas útiles y obras viejas (lo pide el auditor) | Corte |
| **Etiquetas** | Imprimir (no se exporta) | Activos elegidos, localidad |
| Documentos | Boleta de traslado y responsiva, acta de baja, acta de venta, acta de inventario físico | Desde su pantalla |

Los reportes respetan el alcance por localidad: quien no ve todas lo dice el encabezado («Solo las localidades
asignadas»).

## 14. Excel (según la sección del menú)

| Pantalla | Sección | Importar | Exportar |
|---|---|---|---|
| Clases de activos | Administración | Sí: nombre, inciso, porcentaje, vida útil, residual, activo | Sí |
| Saldos iniciales de activos fijos | Administración | Sí: una fila por activo con lo de §8; referencias por nombre (clase, localidad, departamento) y por código (padre); todo o nada, ensayo, 5,000 filas; `sinAsignarAlCrear` no aplica (no hay alcance propio) | Sí |
| Activos fijos, bandeja, traslados, cierre, inventario | Operación | No | No (se consulta en los reportes) |
| Reportes | Reportes | No | Sí |

Columnas en `http/<plural>.columnas.ts` con `validadorDeZod` del mismo esquema del formulario; los montos como texto con
dos decimales.

## 15. Convivencia y riesgos

| # | Tema | Qué pasa | Qué se hace |
|---|---|---|---|
| R-1 | Anular o eliminar en el libro un documento capitalizado (E4, D12) | Activos fijos escucha `documento_por_anular` y `…_por_eliminar` (llegan a todos, no solo al destino) y lanza `documento_con_costos_capitalizados` si el documento tiene costos vigentes: se deshace la anulación. **Con Activos fijos inactivo el mediador no lo llama** y la anulación pasa | Eliminar sigue bloqueado por la llave (el error de llave se traduce en el libro a un mensaje claro, paso AF-3). Anular con el módulo inactivo deja costos de un documento anulado: el **cierre de depreciación lo bloquea** y la ficha lo marca, hasta anular esos costos (con su auditoría). **[corrige el dictamen E4]**: «lo resuelve el módulo con el evento de anulación» solo vale con el módulo activo |
| R-2 | Documento mixto (gasto y activo) en CP4 | Todo lo pagado va a Inversión (ya era así) | Sin cambio en v1; anotado como pendiente de Cuentas por pagar (prorratear por líneas) |
| R-3 | Línea marcada pero descartada en la bandeja (o bajo el umbral) | Su pago ya fue a Inversión y la casilla del SAT-2237 dijo «activos fijos» | El descarte avisa: «El pago de esta factura se clasificó como Inversión y su IVA en la casilla de activos fijos; si era gasto, la marca del libro estaba mal». El libro no se edita; se corrige anulando y volviendo a registrar si importa (V-11) |
| R-4 | Servicio capitalizado (E1) | Va a servicios en el SAT-2237 y a Inversión en el flujo | Es lo que pide el dictamen; V-1 |
| R-5 | Alcance por localidad (AF-P2 b) | Tablas hijas (costos, traslados, bajas…) sin la política de alcance | Se leen unidas a `activos`; cada caso de uso carga primero el activo. Las cuotas sí la llevan. Prueba de aislamiento con dos usuarios de localidades distintas |
| R-6 | Departamento de otra localidad | La llave no lo puede impedir (el departamento puede ser de toda la empresa) | Dominio (`departamento_de_otra_localidad`) |
| R-7 | Multimoneda | Una factura en USD llega al libro con sus líneas ya en GTQ | Los costos se toman en GTQ; nunca se revalúan (no monetarios). Sin columnas de moneda |
| R-8 | Ganadería y Cultivos (futuros) | Querrán dar de baja reproductores por descarte o muerte | Mandarán una orden `activos-fijos.dar_de_baja` (a definir con ellos); Activos fijos no depende de ellos |
| R-9 | Maquinaria e Inventario (futuros) | Maquinaria colgará mantenimientos y horómetro de un activo; Inventario prestará herramientas | Dependerán de `activos-fijos` (llave a `activos (id, empresa_id)`) |
| R-10 | Contabilidad (futura) | Necesitará cuentas por clase y la cuenta puente de compras | Las guarda Contabilidad (sus propios enlaces clase → cuenta), como con Bancos |
| R-11 | Volumen | Una finca con 2,000 activos = 4,000 cuotas por mes, 48,000 por año | Inserción en tandas de 500 en el cierre; índices parciales por `vigente`; el reporte del período lee por `(empresa_id, periodo)` |

## 16. Pasos (un commit cada uno; servidor y cliente por separado, con pruebas)

| Paso | Qué | Quién |
|---|---|---|
| **AF-0** | Libro de compras: E1 (checks, dominio, Zod, cliente), `categoriaSql`, único de líneas; pruebas del libro, del SAT-2237 y del análisis | backend (+ ajuste chico de frontend) |
| **AF-1** | Esqueleto del módulo, `0001_af1_clases`, auditoría permanente, configuración, semilla perezosa, `clases_por_concepto`, Excel de clases; pruebas de tablas y de API | backend |
| AF-1c | Clases de activos (catálogo con Excel) | frontend |
| **AF-2** | `activos` y `traslados` (fila del alta), alta manual sin costos, editar, eliminar, alcance por localidad; pruebas de aislamiento | backend |
| AF-2c | Lista, ficha (datos) y alta manual | frontend |
| **AF-3** | `costos` y `descartes`, bandeja, capitalizar, costos manuales, avisos del libro (R-1), mensaje del error de llave en el libro; prueba de concurrencia de la línea | backend |
| AF-3c | Bandeja «Por capitalizar» y pestaña Costos | frontend |
| **AF-4** | Dominio de depreciación (§7, pruebas puras con los ejemplos), `tramos`, poner en uso y quitar de uso | backend |
| **AF-5** | `cierres` y `cuotas`: revisar, cerrar, reabrir; eventos del bus; pruebas de orden, idempotencia y alcance | backend |
| AF-5c | Cierre de depreciación y pestaña Depreciación | frontend |
| **AF-6** | Saldos iniciales, pregunta de EM-2, aviso de fecha de inicio, Excel | backend |
| AF-6c | Saldos iniciales (Administración) | frontend |
| **AF-7** | Mejoras, costos posteriores y revisión de la estimación | backend |
| AF-7c | Acciones en la ficha | frontend |
| **AF-8** | Traslados con boleta (grupo), anular | backend |
| AF-8c | Traslados y boleta imprimible | frontend |
| **AF-9** | Bajas y ventas con archivos, congelados y resultados | backend |
| AF-9c | Baja y venta (ventanas, actas imprimibles) | frontend |
| **AF-10** | Reportes de §13 (consultas y exportar) | backend |
| AF-10c | Pantallas de reportes | frontend |
| AF-11c | Etiquetas con QR (dependencia nueva, revisada por `seguridad`) | frontend |
| **AF-12** | Inventario físico | backend |
| AF-12c | Conteo desde el teléfono con escáner (dependencia nueva) | frontend |
| AF-QA | Punta a punta en el navegador (compra → bandeja → uso → cierres → traslado → venta; saldos iniciales → cierre de la carga) | pruebas-qa |
| AF-14 | (Después, si se aprueba AF-P18) Pólizas de seguro: `polizas` y `activos_de_polizas`, vencimientos | backend y frontend |

AF-0 se puede programar ya (no depende del resto) si el usuario aprueba AF-P5. El orden de AF-6 puede adelantarse a
AF-5 si se quiere cargar saldos antes de cerrar meses.

## 17. Preguntas para el usuario

| # | Pregunta | Opciones | Recomendación |
|---|---|---|---|
| AF-P1 | ¿De qué depende el módulo? | a) Solo de Libro de compras; b) de Libro de compras y Bancos; c) de nada (sin ligar con el libro) | **a**. Las compras llegan por el libro (llaves a sus líneas); Bancos no hace falta en v1 (el depósito de la venta se registra allá) |
| AF-P2 | ¿Quién ve qué activos? | a) Todos los de la empresa (solo permisos); b) por **localidad**, con el alcance que ya tiene Empresas; c) alcance propio por activo | **b**. El encargado de una finca o sede ve lo suyo, sin otra ventana de asignación. Cerrar el mes exige ver todas |
| AF-P3 | ¿Dos libros? (D1) | a) Solo fiscal; b) contable y fiscal; c) los dos, el contable igual al fiscal por omisión | **c** (dictamen) |
| AF-P4 | ¿Desde qué mes se deprecia? (D2) | a) El mes de inicio de uso (y no el de la baja); b) el mes siguiente (y sí el de la baja); c) por días | **a**, configurable por empresa |
| AF-P5 | ¿Un servicio puede ser activo fijo? (D3, E1) | a) No; b) sí, y sigue en la casilla de servicios del SAT-2237 | **b** (paso AF-0) |
| AF-P6 | ¿Cómo entran las compras? (D4) | a) Un activo automático por línea; b) bandeja «Por capitalizar» | **b** |
| AF-P7 | ¿Umbral de capitalización? (D5) | a) Ninguno; b) monto por empresa (0 por omisión) con «bien de control» | **b** |
| AF-P8 | ¿Revaluación y deterioro en v1? (D6) | a) No; b) solo deterioro; c) los dos | **a** (el modelo de tramos los admite después) |
| AF-P9 | ¿Activos biológicos? (D7) | a) Completos aquí; b) aquí al costo, el resto en Ganadería y Cultivos | **b** |
| AF-P10 | ¿Un activo puede ser un **grupo** (50 sillas, un lote de herramientas)? | a) No: uno por unidad; b) sí, con cantidad informativa y baja solo total; c) sí, con baja parcial | **b**. Lo de poco valor y muchas unidades se lleva junto; para dar de baja una parte se divide (paso posterior) |
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

## 18. Para validar antes de programar

Con `contador-guatemala`:

| # | Punto | Propuesta del diseño |
|---|---|---|
| V-1 | Rubro del SAT-2237 de un servicio capitalizado (dictamen §7.1) | Sigue en servicios |
| V-2 | Software: cómputo (33.33 %) o intangible (20 %) (§7.2) | Clase «Programas y licencias» al 20 % |
| V-3 | Mejora en el libro fiscal: ¿el porcentaje se aplica a la nueva base (saldo + mejora)? | Sí (§7.3) |
| V-4 | Bien ocioso: ¿su cuota fiscal es deducible (art. 25: «usados» en lo gravado)? | Se calcula y se marca `ocioso`; el reporte fiscal lo separa |
| V-5 | El mes de la baja y el centro de costo al último día del mes | §3.6 y §3.7 |
| V-6 | Nota de crédito mayor que el valor por depreciar | Pendiente a cero y hallazgo (§7.4) |
| V-7 | Edificio: base fiscal con tope de la matrícula y presunción del 70 % | §3.5 |
| V-8 | Costo de desmantelamiento fuera del libro fiscal | `aplica_al_libro_fiscal = false` |
| V-9 | Reproductores: residual contable = valor como ganado común | §3.5 |
| V-10 | Venta de ganado reproductor de descarte (dictamen §7.6) | Avisar «consulte»; sin cálculo distinto en v1 |
| V-11 | Línea marcada como activo y descartada (R-3) | Solo aviso |
| V-12 | Faltante de inventario: ¿débito de IVA? (dictamen §7.4) | Aviso en la baja sin acta |
| V-13 | Tercera edición de la NIIF para las Pymes (dictamen §7.5) | Sin cambio hasta que el contador confirme |

Con `seguridad`: las dos dependencias nuevas del cliente (QR y lectura de QR), el permiso de cámara, las fotos y actas
(`core.archivos`, PDF con qpdf, `recurso_dueno`), y que el QR solo lleve el id (sin datos del activo).

## 19. Pendientes que este diseño deja anotados

- Cuentas por pagar: prorratear por líneas el reparto Inversión/Operación de un documento mixto (R-2).
- Dividir un activo agrupado (AF-P10) y la baja parcial.
- Orden `activos-fijos.dar_de_baja` para Ganadería y Cultivos (R-8).
- Revaluación y deterioro (§3.10), pólizas (AF-14), arrendamiento financiero.
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
- **AF-P10:** grupos con cantidad informativa y baja total. **AF-P16:** código libre con el correlativo de la empresa como
  propuesta.
- **Del dictamen de validación (V-1 a V-13):** **P-A** «Sustituir documento» (puede ir después de v1); **P-B** la cuota fiscal
  del ocioso es deducible por omisión, en línea aparte con aviso de riesgo. Los ajustes del contador (A1 `costo_fiscal` en
  bajas, A2 ISO con el activo neto contable del cierre anual, A3/V-7 matrícula o catastro el mayor, V-2, V-3, V-4, V-6, V-8,
  V-10, V-12, y la auditoría permanente con saldos iniciales y mejoras) se incorporan al diseño antes de AF-1.
- Quedan por responder: AF-P1, AF-P11, AF-P12, AF-P15, AF-P17, AF-P19, AF-P20, AF-P21 y P-C.
