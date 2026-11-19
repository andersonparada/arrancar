# Diseño de Contabilidad — arquitecto de datos, 2026-11-18

_Agente `arquitecto-de-datos`. Base contable y fiscal: `dictamen-contabilidad-2026-11-18.md` (contador-guatemala, mismo
día, «lo ya diseñado es correcto con ajustes»; cinco ajustes previos en su §12). Aterriza «Contabilidad» de
`docs/HOJA-DE-RUTA.md` («Módulos grandes que faltan planificar») y lo que dejaron anotado `bancos.md` (pregunta «¿esta
fecha está abierta?»), `diseno-cp5-reportes.md` (U12/O-1), `diseno-em2-cierre-de-la-carga.md` (puente en cero),
`diseno-activos-fijos.md` §9 y `diseno-caja-chica-y-cuentas-por-liquidar.md` §8. Lo que el arquitecto no comparte del
dictamen, o resuelve de otra forma, va marcado **[corrige el dictamen]** o **[matiza el dictamen]** y pasó a §17 para que lo
validara el contador._

_**Actualización 2026-11-19.** El usuario aceptó todas las recomendaciones de §16 (ver «Respuestas del usuario
(2026-11-19)» al final) y el contador validó §17 en `dictamen-contabilidad-validacion-2026-11-19.md` («correcto con
ajustes»). Sus correcciones ya están en el texto, marcadas **[validación 2026-11-19]**; lo que sigue abierto queda
marcado **[pendiente P-n]** (preguntas al final) o **[pendiente del contador]**. La tabla de §15 dice qué paso espera qué._

Sirve a empresas de **cualquier rubro y régimen**: nada aquí supone ganado, fincas, régimen de IVA o ISR, ni que la empresa
sea agente de retención. La obligación de llevar contabilidad depende del activo (C. Com. art. 368), no del régimen; lo que
cambia con el régimen (retenciones, diferido, conciliación de la renta) se lee de `libro_de_compras.datos_fiscales_de_empresa`
vigente en cada período, como ya hacen Activos fijos y Caja chica. Las cuentas de rubro las aportan los módulos de rubro.

**Ya decidido y que no se vuelve a preguntar:**

| Tema | Decisión | Fuente |
|---|---|---|
| Momento de la provisión | La factura se provisiona **al registrarla** en el Libro de compras, con las retenciones en la misma partida y la **fecha de efecto** del auxiliar; autorizar no provisiona | U12, O-1 (`dictamen-cp5-2026-11-15.md`; `diseno-cp5-reportes.md` §2.2) |
| Auxiliar de proveedores | Al **neto** (`total − retenciones`); cuadra con R1 y la transitoria con R11 | CP5 |
| Quién conoce las cuentas | **Solo Contabilidad**: guarda sus propios enlaces (cuenta bancaria, concepto, clase de activo…) a sus cuentas | PLAN §6; `bancos.md`; Activos fijos R-10 |
| «¿Esta fecha está abierta?» | Pregunta común que responde Contabilidad; sin Contabilidad todo está abierto | `bancos.md` (Diseño del B2) |
| Puente de apertura | Con Contabilidad, el cierre de la carga inicial **no** debe pasar con la puente distinta de cero (salida con motivo) | `diseno-em2-cierre-de-la-carga.md` §0; U8 §9.8 |
| Depreciación | Al mayor solo la **contable**; la fiscal queda en el libro fiscal de Activos fijos | `diseno-activos-fijos.md` §3.5 y §9 |
| Fechas de anulación | Pagos, reintegros, retiros y ajustes ya traen `fecha` contable y `fechaOriginal` | `cuentas-por-pagar.contratos.ts` |
| Diferencial cambiario | Lo **calcula** Multimoneda (cierre cambiario con evento, PU-8 a); las partidas son de Contabilidad | `diseno-multimoneda.md` §8.5 |
| Dinero | `numeric(14,2)` en la base, centavos enteros en el código y en los eventos, texto en la API; todo en quetzales (art. 369) | CLAUDE.md |
| Saldos iniciales | Una sola fecha de corte por empresa; cada módulo responde la «pregunta a todos» del cierre de la carga | `HOJA-DE-RUTA.md`; EM-2 |

## 0. La propuesta en una página

- **Un módulo nuevo**, `contabilidad` (esquema `contabilidad`), con `dependeDe: ['terceros']` (CT-P1). No depende de Bancos,
  Libro de compras ni de ningún otro: **escucha** lo que pasa en ellos. Ninguno depende de él.
- **Nomenclatura por empresa** (`cuentas`): árbol con máscara de código, cuentas de mayor y de detalle, y los atributos que
  piden los estados financieros (rubro, clase de flujo, monetaria, tratamiento fiscal, de control). Nace de una **plantilla
  de la instalación** elegida según el régimen (CT-P3), o de Excel; después es de la empresa.
- **Enlaces** (`enlaces`): cada **rol de sistema** (Proveedores, IVA crédito, retención por regla, cuenta bancaria X,
  concepto bancario Y, clase de activo Z…) apunta a una cuenta de detalle. Los módulos nunca ven una cuenta contable.
- **Hechos → partidas.** El core guarda **cada evento de dominio dentro de la transacción que lo produce** en un registro
  propio (`core.registro_de_eventos`, solo se agrega) y lo **avisa** por el mediador en esa misma transacción. Contabilidad,
  si está activa, lo contabiliza ahí mismo (en un punto de guardado) y deja constancia en su bandeja (`hechos`). Si la
  partida no se puede armar (falta un enlace), el hecho queda **con error** y la operación sigue; si el hecho intenta
  cancelar algo de un **período cerrado**, Contabilidad lo **veta** y la operación del otro módulo se deshace. Lo que no se
  procesó (Contabilidad apagada, error) se **reprocesa** desde el registro del core. Así no se pierde ningún hecho y el
  veto sale gratis para todos los módulos (dictamen §12, ajustes 3 y 4).
- **Partidas** (`partidas` y `lineas_de_partida`): automáticas (una por hecho) y manuales (borrador → contabilizada, con
  aprobación opcional). Numeración correlativa por empresa y año sin huecos. **Corregir, no borrar** (C. Com. art. 373):
  lo contabilizado se anula (período abierto) o se reversa; solo el borrador se elimina.
- **Fecha contable**: la del hecho; si su mes está cerrado, el **primer día abierto** (opción A del dictamen §4.2), y la
  partida guarda las dos fechas.
- **Períodos** (`periodos`): doce meses más el **período 13** de cierre; abierto, cerrado (se reabre con permiso, motivo y
  auditoría permanente) y **definitivo** (impreso en hojas habilitadas: ya no se reabre).
- **Apertura**: la partida del contador lleva las cuentas con auxiliar contra la **puente**; los saldos de los auxiliares
  los da cada módulo con la pregunta `contabilidad.saldos_de_auxiliares`, la misma que sirve para las **cuadraturas** del
  cierre mensual. La puente debe quedar en cero.
- **Cierre mensual** con lista de control (hechos sin partida, cuadraturas, puentes, depreciación y cierre cambiario): avisa
  y pide motivo, no bloquea (dictamen pregunta 15). **Cierre anual** en el período 13 con la partida de cierre.
- **Libros y estados**: Libro Diario, Libro Mayor, Balance de comprobación, **Libro de Inventarios** (nombre legal, art.
  368; no «Inventarios y balances»), Libro de Estados Financieros (Balance general, Resultados, Cambios en el patrimonio y
  Flujo de efectivo indirecto), con comparativos; impresión con **folio** en hojas habilitadas, con los datos de la
  habilitación y espacios de firma (art. 374) **[validación 2026-11-19]**.
- **Fuera del módulo, antes de programarlo** (CT-0): el registro de eventos del core y el cambio de los publicadores;
  `documento_registrado`/`_anulado` del libro con todos los datos; eventos de Bancos; destino del faltante en los retiros;
  la leyenda de `diseno-cp5-reportes.md` §2.3.
- **Fuera de v1**: impuesto diferido (fase 2, CT-14), flujo directo, conciliación de la renta (ISR anual), costo de
  producción (con los módulos de rubro), presupuestos, consolidación de empresas, período fiscal especial.

## 1. Lo encontrado en el código y la base (verificado contra `main` el 2026-11-18)

1. **El bus es en memoria y corre después de confirmar** (`core/eventos/bus-eventos.ts`). Los casos de uso publican
   **fuera** de `unidadDeTrabajo.ejecutar(...)` (`registrar-pago.ts`, `registrar-documento.ts` y unos 30 más), con
   `PublicadorEventosEnBus`; el bus **espera** a cada suscriptor, así que un suscriptor que lanza haría fallar la respuesta
   HTTP de algo ya confirmado. **Hoy nadie se suscribe** en producción (`busEventos.suscribir` solo aparece en pruebas). El
   dictamen tiene razón (§0.3): si Contabilidad escuchara el bus, un error perdería la partida en silencio.
   _Al 2026-11-19_: el aviso de pago por correo de Cuentas por pagar ya escucha el bus con `suscribirSinRomper`
   (`cuentas-por-pagar/composicion/avisos-de-pago.ts`); sigue después de confirmar y no cambia con CT-0a.
   Publican eventos, **todos fuera** de `unidadDeTrabajo.ejecutar(...)` (algunos con `PublicadorEventosTrasConfirmar`):
   Terceros, Empresas, Libro de compras, Cuentas por pagar, Bancos (cheques y apertura), Caja chica (fondos, comprobantes y
   reposiciones), Cuentas por liquidar y Activos fijos (costos). El paso CT-0a2 los cubre a todos.
2. **`EventoDominio` no tiene id** (solo `nombre`, `ocurridoEn` y `datos`). Sin id no hay idempotencia.
3. **Ya existe la pieza para publicar dentro de una transacción**: `PublicadorEventosTrasConfirmar` (difiere el bus con
   `despuesDeConfirmar`; si la transacción se deshace, no publica). La unidad de trabajo tiene `aislar` (punto de guardado)
   y `contextoEnCurso()`.
4. **Mediador**: órdenes, avisos (dentro de la transacción; un error del que escucha deshace todo; se salta a los módulos
   inactivos de la cuenta) y `preguntarATodos` (EM-2). Contabilidad puede usar las tres sin que nadie la importe.
5. **Libro de compras**: el evento `documento_registrado` es `DocumentoParaDestino` + `empresaId` + `destino` (solo
   totales). Pero la base **sí guarda** todo lo que hace falta: por documento y por línea `base`, `iva`,
   `iva_no_acreditable`, `idp`, `exento`, `otros_impuestos`, `total`; por línea `concepto_id`, `tipo`, `es_activo_fijo`;
   `retenciones` con `impuesto`, `regla` (9 reglas: `iva_exportador_agropecuario`, `iva_exportador`,
   `iva_contribuyente_especial`, `iva_otro_agente`, `iva_sector_publico`, `iva_pequeno_contribuyente`,
   `isr_opcional_simplificado`, `iva_factura_especial`, `isr_factura_especial`), `monto`, `fecha` y constancia;
   `periodo` del libro, `causa_de_anulacion`. **No hay localidad ni departamento** en documentos ni líneas.
   `datos_fiscales_de_empresa` tiene `vigente_desde` (régimen por fecha). `folios_del_libro` es el patrón para los folios.
6. **Cuentas por pagar** publica 14 eventos «para Contabilidad» (contrato completo). `retiro_liquidado` deja el destino
   del faltante «según Contabilidad» (dictamen §3). `pago_registrado.aplicaciones[].retencionDescontadaCentavos` es
   informativa.
7. **Bancos no publica eventos.** `bancos.movimientos` ya tiene lo necesario: `concepto_id` (y `desglose_de_movimientos`),
   `interes_bruto` e `isr_retenido` (H8, con check de cuadre), `modulo_de_origen`/`documento_de_origen_id`, `saldo_inicial`
   y `parte_de_apertura`, `transferencia_id`, `revierte_a_id`, `anulado_en`. `bancos.conceptos` tiene `actividad_de_flujo`,
   `clave_de_sistema`, `es_cargo_bancario`, `pide_datos_de_intereses` y `admite_factura`. Las cuentas bancarias **no tienen
   moneda** todavía (Multimoneda MM-1 pendiente).
8. **Caja chica y Cuentas por liquidar**: solo datos (CC-1, CL-1, CC-1c) en `main`; sus eventos están diseñados (§9.4) y no
   existen. **Activos fijos**: solo diseño (eventos en su §9). _Al 2026-11-19 ya hay código_: Caja chica CC-3 y CC-4
   (`caja-chica.comprobante_asignado`, `_quitado`, `reposicion_registrada`, `_anulada`…), Cuentas por liquidar CL-3 y CL-4
   y Activos fijos AF-3 y AF-4 (costos). CT-11 revisa si sus eventos traen lo que piden las reglas.
9. **Empresas**: `cargas_iniciales` (fecha de inicio, cerrada, balance de apertura firmado), `localidades` y `departamentos`
   (destino de llaves compuestas `(id, empresa_id)`), y la pregunta `empresas.revisar_cierre_de_carga` con hallazgos
   `pide_motivo`/`aviso` y hasta 200 cifras.
10. **Core**: `core.correlativos` (`empresa_id`, `clave`, `anio`, `siguiente`; sin huecos porque incrementa dentro de la
    transacción), `core.recursos_de_auditoria_permanente`, `core.archivos`, `core.monedas`. `AccionAuditada` ya tiene
    `eliminar`, `anular`, `corregir`, `cerrar`, `reabrir`, `inactivar`, `reactivar`, `adjuntar`.
11. **Base de desarrollo (solo leída)**: no existe el esquema `contabilidad`; 4 empresas, 0 documentos del libro, 10
    movimientos de Bancos, 0 pagos. **No hay datos que convertir.**

## 2. Alcance

| Entra en v1 | No entra (y dónde va) |
|---|---|
| Nomenclatura por empresa con plantillas, máscara, Excel | Período fiscal especial (LAT art. 37): solo año calendario en v1 |
| Enlaces de roles de sistema por empresa | Impuesto diferido (Sección 29): **fase 2** (CT-14, §3.10) |
| Bandeja de hechos, partidas automáticas, reproceso, «Hechos sin partida» | Conciliación de la renta y declaración anual del ISR |
| Partidas manuales (diario, ajuste, reclasificación, apertura, cierre, corrección de ejercicios anteriores) con respaldo y aprobación opcional | Flujo de efectivo **directo** (sale de los conceptos de Bancos; espera lo de Caja chica §8) |
| Períodos 1–13, cierre y reapertura mensual, cierre anual | Estado de costo de producción (lo arman los módulos de rubro con sus cuentas) |
| Apertura con puente y saldos de los auxiliares | Presupuestos, centros de costo jerárquicos, consolidación entre empresas |
| Cuadraturas del cierre (pregunta a los módulos) | Moneda extranjera en las líneas: columnas listas, se llenan con Multimoneda (MM-E) |
| Diario, Mayor, Balance de comprobación, Libro de Inventarios, EEFF NIIF Pymes con comparativos, auxiliar por tercero | Notas a los estados financieros (texto libre: después) |
| Impresión con folio en hojas habilitadas y bloqueo de lo impreso | Partidas de Cuentas por cobrar / Ventas, Planilla, Inventarios (cuando existan, con sus eventos) |

## 3. Modelo

### 3.1 Qué es cada cosa

| Concepto | Qué es | Dónde vive |
|---|---|---|
| **Cuenta** | Nodo del catálogo. De **mayor** (suma) o de **detalle** (recibe movimientos) | `cuentas` |
| **Rol de sistema** | Para qué usa un módulo una cuenta (Proveedores, IVA crédito…), con una **llave** opcional (cuál cuenta bancaria, qué concepto, qué regla de retención) | Catálogo en código (`core/contratos/contabilidad.contratos.ts`) |
| **Enlace** | Rol (+ llave) → cuenta de detalle, por empresa | `enlaces` |
| **Evento registrado** | Un hecho de otro módulo tal como se publicó, con id único, guardado en la misma transacción | `core.registro_de_eventos` |
| **Hecho** | El resultado de procesar un evento en Contabilidad: contabilizado, sin partida, con error o anterior al inicio | `hechos` |
| **Partida** | Asiento de partida doble con su número, fechas, tipo, estado y origen | `partidas`, `lineas_de_partida` |
| **Período** | Mes 1–12 o período 13 de un ejercicio, con su estado | `periodos` |
| **Inicio** | Desde qué fecha lleva contabilidad la empresa y con qué máscara | `inicios` |
| **Impresión** | Un libro impreso en hojas habilitadas, con sus folios | `impresiones`, `folios` |

### 3.2 Cómo llega un hecho (CT-P2)

| Opción | Cómo | A favor | En contra |
|---|---|---|---|
| A. Suscriptor del bus | Contabilidad escucha el bus después de confirmar | Sin cambios fuera | **Pierde** hechos si falla; un error rompe la respuesta de lo ya confirmado; sin veto |
| B. Aviso dentro de la transacción | Cada evento se avisa por el mediador; Contabilidad guarda y contabiliza ahí mismo | Atómico; veto para todos | Si Contabilidad está apagada (o se activa tarde) no queda nada que recuperar |
| **C. Registro de eventos en el core + aviso** | El publicador guarda cada evento en `core.registro_de_eventos` **y** lo avisa, todo dentro de la transacción; después de confirmar sigue el bus de hoy | Atómico; veto; **nada se pierde**: lo no procesado se reprocesa desde el registro; activar Contabilidad tarde o reactivarla no deja huecos | Toca a todos los publicadores (mover una línea dentro de la transacción) y guarda los eventos de todas las empresas |

**Recomendado: C.** El dictamen pedía una bandeja de salida o una orden de «releer» por módulo (§3, «Confiabilidad»); C es
la bandeja de salida, pero **una sola en el core** en vez de una por módulo, y no obliga a cada módulo a saber reconstruir
sus hechos **[matiza el dictamen]**. Flujo:

1. El caso de uso publica **dentro** de su unidad de trabajo con `PublicadorDeEventos` (nuevo, en el core): inserta cada
   evento en `core.registro_de_eventos`, llama `mediador.avisar('core.eventos_registrados', { eventos })` y deja el bus para
   `despuesDeConfirmar`.
2. Contabilidad (si está activa en la cuenta) recibe el aviso. Para cada evento de un **nombre que sabe contabilizar**:
   - si la empresa no tiene contabilidad iniciada, o la fecha es anterior al inicio, anota el hecho `anterior_al_inicio` (o
     nada, si no hay inicio);
   - si es una **cancelación** (anular sin inverso, eliminar, reabrir depreciación) de algo contabilizado en un período
     **cerrado o definitivo**, lanza `PeriodoContableCerrado` (**veto**: se deshace la operación del otro módulo);
   - si no, arma la partida en `unidadDeTrabajo.aislar(...)`: si sale, el hecho queda `contabilizado`; si lanza un error
     esperado de Contabilidad (falta un enlace, cuenta inactiva), se deshace el punto de guardado y el hecho queda
     `con_error` con su código; la operación del otro módulo sigue.
3. **Reproceso** («Reprocesar» en la bandeja y al cerrar el mes): toma los eventos del registro con nombre contable, de la
   empresa, desde el inicio, sin hecho o con hecho `con_error`, en orden de `numero`, y los procesa igual (sin veto: una
   cancelación de un período cerrado se convierte en **reversa** con fecha del primer día abierto, dictamen §6).
4. **Idempotencia**: `hechos` tiene PK `(empresa_id, evento_id)`; procesar dos veces el mismo evento no hace nada.

Versiones: cada evento guarda `version` (entero, 1 por omisión). Al enriquecer un contrato (CT-0b), la versión sube y la
regla de Contabilidad sabe leer las dos (o marca `con_error: version_no_soportada` las viejas: en desarrollo no hay).

### 3.3 Fecha contable (CT-P4)

`fecha_contable = max(fecha_del_hecho, primer_dia_abierto)` (opción A del dictamen §4.2); la partida guarda las dos. El
«primer día abierto» es el primer día del primer período abierto **del ejercicio de la fecha o posterior** (los períodos 13
no cuentan para esto). Si la fecha es **futura** (cheque posfechado), la partida va en su mes, que se crea abierto. Las
partidas manuales no pueden tener fecha futura. El IVA no cambia: el crédito sigue al período del libro.

Las cuadraturas comparan por fecha contable; los documentos con `fecha_contable <> fecha_del_hecho` salen como **partidas
conciliatorias** («registros tardíos»), como ya avisa R1.

### 3.4 Estados de una partida

| Estado | Afecta saldos | Número | Se llega por | Se sale por |
|---|---|---|---|---|
| `borrador` | No | Sin número | Crear partida manual | Eliminar (se borra de verdad, con auditoría), enviar a aprobar o contabilizar |
| `por_aprobar` | No | Sin número | Enviar (si la empresa pide aprobación, CT-P12) | Aprobar (→ contabilizada) o devolver (→ borrador) |
| `contabilizada` | Sí | Correlativo del año | Contabilizar o aprobar; las automáticas nacen aquí | Anular (período abierto) o reversar (crea otra partida) |
| `anulada` | No | Lo conserva («ANULADA» en el Diario) | Anular una manual, o **cancelar** una automática porque su hecho «nunca existió» | — |

Una partida reversada sigue `contabilizada` y tiene `reversada_por_id`; su reversa es otra partida contabilizada con
`reversa_de_id`, fecha en un período abierto y glosa «Reversa de la partida N: motivo». Se reversa **una sola vez**.

Cuándo se cancela y cuándo se reversa una automática (dictamen §6):

| Hecho que llega | Período de la partida original abierto | Cerrado o definitivo |
|---|---|---|
| Anulación sin inverso (cheque «a la antigua»), documento o movimiento eliminado, depreciación reabierta, saldo inicial quitado al reabrir la carga | **Cancelar** (anular la original) | **Veto** en línea; en reproceso, reversa al primer día abierto |
| Anulación con inverso, FEL anulada por el emisor, nota de crédito, reintegro, anulación de un pago sin movimiento | **Reversa** con la `fecha` del evento (primer día abierto si cae en cerrado) | Igual |
| Anulación por `error_de_captura` o `no_corresponde_a_la_empresa` del libro | Cancelar | Reversa al primer día abierto (no hay veto: el libro ya decidió anular), con los dos destinos de abajo |

**Reversa de un documento anulado en un período cerrado** [validación 2026-11-19, V-5]:

- Si el evento trae `periodoDeclarado = true` (el crédito ya se usó en una declaración presentada), la línea de IVA de la
  reversa **no** acredita `iva_credito_fiscal`: va a `iva_por_rectificar` (pasivo, rubro `impuestos_por_pagar`). El
  contador la salda con una partida manual al pagar la SAT-2237 rectificativa. Así el mayor del IVA crédito sigue
  cuadrando con la declaración de cada mes.
- Si la partida original es de un **ejercicio cerrado** (su período 13 está `cerrado` o `definitivo`), las líneas de
  resultados de la reversa van a `ajustes_de_ejercicios_anteriores` (aquí sí se conocen la causa y el ejercicio). El
  hecho sale en la lista del cierre del mes (`reversa_de_ejercicio_cerrado`, `pide_motivo`) para que el contador confirme
  la materialidad (NIIF Pymes 10.21) o reclasifique.
- Las dos reglas pueden darse juntas. Si ninguna aplica, la reversa es la inversa exacta de la original.

### 3.5 Períodos

- Se crean **solos** al necesitarlos (primera partida del mes o al iniciar la contabilidad): `(ejercicio, mes)` con `mes`
  1–13; el 13 va del 31/12 al 31/12 y solo acepta partidas de tipo `ajuste`, `cierre` y `correccion` (CT-P10).
- **Abierto** → **cerrado** (cierre mensual, §3.7) → **reabierto** (permiso, motivo, auditoría permanente; vuelve a
  `abierto`) → **definitivo** (al imprimir en hojas habilitadas o al cerrar el ejercicio: ya no se reabre, CT-P11). El
  período guarda **por qué** quedó definitivo (`definitivo_por`: `impresion` o `cierre_de_ejercicio`, §5.4); el 13 no es
  definitivo por ser el 13 [validación 2026-11-19, E-1].
- Se cierra **en orden**: no se cierra un mes con uno anterior abierto del mismo ejercicio. Se reabre el **último
  cerrado** de uno en uno (como Activos fijos).
- Cierre y escritura no chocan: contabilizar bloquea el período `for share`; cerrar y reabrir, `for update` (como
  `empresas.obtener_carga_inicial`).
- El dictamen proponía un estado **«futuro»**; aquí un mes futuro simplemente existe abierto, y la regla «sin fecha futura en
  manuales» cubre el riesgo **[matiza el dictamen]**. El contador lo aceptó y retiró el estado «futuro» (V-3).
- **Cambio de año** [validación 2026-11-19, CT-P4]: una factura de diciembre que llega con diciembre ya cerrado cae en
  enero (regla A), aunque por devengo era del año anterior. Por eso la lista del cierre de diciembre y la del período 13
  recuerdan (aviso) dejarlos **abiertos hasta el corte de proveedores** (enero o febrero), y la del cierre mensual avisa
  de los **registros tardíos del ejercicio anterior** (`registros_tardios_del_ejercicio_anterior`: partidas automáticas
  con `fecha_del_hecho` en un ejercicio anterior al de su `fecha`), para que el contador decida si reclasifica.

### 3.6 Inicio y apertura (CT-P5)

Contabilidad empieza en una **fecha de inicio contable** (`inicios.fecha`), igual o posterior a la fecha de inicio de la
empresa. Dos casos, con el mismo mecanismo:

| Caso | Cuándo | Saldos de los auxiliares | Partida de apertura del contador |
|---|---|---|---|
| **a. Desde la fecha de inicio de la empresa** | Empresa nueva en Arrancar, o se activa Contabilidad y se quiere desde el principio (el registro del core tiene los hechos desde CT-0) | Los saldos iniciales que cada módulo cargó (pregunta `contabilidad.saldos_de_auxiliares` con `proposito = 'apertura'` y la fecha de inicio) | El balance de apertura completo; las cuentas con auxiliar (Bancos, Proveedores, Activos, Caja chica…) contra la **puente** |
| **b. Desde una fecha posterior** | Empresa que ya operaba en Arrancar sin Contabilidad (o con hechos anteriores a CT-0) | Los saldos de cada auxiliar **al día anterior** a la fecha de inicio contable (misma pregunta) | Igual |

- **Partidas de los auxiliares**: Contabilidad pregunta a todos y arma **una partida de apertura por módulo** (Debe o
  Haber de cada rol con su llave y su tercero, contra la puente). En el caso a, se arman **al cerrar la carga inicial**
  (aviso nuevo `empresas.carga_por_cerrar`, §4.5) y se **cancelan** al reabrirla (`empresas.carga_por_reabrir`; veto si el
  período ya está cerrado). Mientras la carga está abierta los saldos iniciales cambian libremente sin generar hechos.
  En el caso b, se arman al **iniciar** la contabilidad (la carga ya está cerrada). **[corrige el dictamen]**: el dictamen
  contabiliza el saldo inicial de Bancos como un hecho más (§4.1, «Bancos: saldo inicial»); con la pregunta no hace falta
  ningún evento de saldo inicial en ningún módulo y lo corregido antes de cerrar no deja partidas de ida y vuelta.
- **Revisión del cierre de la carga**: Contabilidad responde `empresas.revisar_cierre_de_carga` con la puente calculada
  (partida del contador + partidas que armaría por módulo). Si no da cero: hallazgo `puente_de_apertura_no_cuadra`,
  `pide_motivo`, con la diferencia y el desglose por módulo como cifras (CT-P6). Sin la partida del contador: aviso
  `sin_partida_de_apertura`. El contador validó el mecanismo (V-1).
- **Orden en el Diario** [validación 2026-11-19, V-1]: las aperturas por módulo del caso a se arman al cerrar la carga y
  pueden recibir un número mayor que automáticas de la misma fecha. En el Diario y en el Libro de Inventarios se ordena por
  `fecha`, luego **tipo `apertura` primero**, luego número. Con el número de Diario de P-3 b la apertura recibiría además
  los primeros números del ejercicio **[pendiente P-3]**.
- **Puente distinta de cero e impresión** [validación 2026-11-19, matiz de CT-P6]: la carga se sigue cerrando con motivo,
  como decidió el usuario; pero mientras la puente de apertura tenga saldo **no se imprimen en definitivo** el Libro de
  Inventarios ni el de Estados Financieros (error `puente_de_apertura_sin_cuadrar`; la copia sí, con la leyenda de la
  diferencia), porque un balance firmado así no es «veraz» (arts. 374 y 379) **[pendiente P-4]**.
- **Saldos iniciales corregidos después de cerrar la carga** [validación 2026-11-19, V-4; corrige §7 y el dictamen
  anterior]: el pago `correccion_de_error` de Cuentas por pagar (saldo inicial cancelado «contra la apertura») va a la
  transitoria **`apertura_por_regularizar`** (de balance), no a patrimonio: la contrapartida depende de la causa (error del
  mismo año, de años anteriores o condonación, que es ingreso gravado) y solo el contador la conoce. El cierre mensual la
  muestra con saldo (`pide_motivo`) y el período 13 no se cierra con saldo salvo con motivo; el contador la reclasifica con
  una partida `correccion` o `ajuste`. Es un rol propio, no `saldos_por_regularizar` (otra causa y otra cuadratura); la
  empresa puede enlazar los dos a la misma cuenta si quiere **[pendiente P-2, confirmación]**.
- **Eventos anteriores al inicio** que lleguen después (una factura de antes registrada tarde): con su fecha < inicio se
  contabilizan con fecha contable = inicio (regla A); el auxiliar de la apertura no los tenía, así que mayor y auxiliar
  siguen iguales.
- **Primera adopción de NIIF** (secc. 35): los ajustes de la empresa que venía con base fiscal van en una partida manual de
  tipo `apertura` contra resultados acumulados; no hay cálculo automático.

### 3.7 Cierre mensual y cuadraturas (CT-P13)

«Revisar» arma la lista de control (como EM-2, con huella):

| Revisión | Cómo | Nivel |
|---|---|---|
| Hechos sin partida | `hechos` `con_error` del mes + eventos del registro sin hecho | `pide_motivo` |
| Partidas en borrador o por aprobar con fecha del mes | `partidas` | aviso |
| Cuadraturas | Pregunta `contabilidad.saldos_de_auxiliares` (`proposito = 'cuadratura'`, último día del mes): cada módulo da sus saldos por rol y llave; se comparan con el mayor de las cuentas enlazadas | `pide_motivo` por diferencia, con «registros tardíos» y partidas manuales en cuentas de control como explicación |
| Puentes | Puente de apertura = 0; puente de compras de activos = lo pendiente de capitalizar (si Activos fijos responde) | `pide_motivo` |
| Depreciación y cierre cambiario | Los módulos que existan responden si el mes está cerrado (misma pregunta, con `pendientes`) | aviso |
| Documentos por asignar [V-2] | Saldo de `documentos_por_asignar` contra lo que Caja chica y Cuentas por liquidar dicen tener sin asignar (sus respuestas a `saldos_de_auxiliares` con ese rol) | `pide_motivo` por diferencia |
| Documentos sin asignar con más de 30 días [V-2] | Los módulos lo informan en `pendientes` de su respuesta (con cuántos y desde cuándo) | aviso |
| Apertura por regularizar [V-4] | Saldo de `apertura_por_regularizar` distinto de cero | `pide_motivo` |
| Reversas en un ejercicio cerrado [V-5] | Reversas del mes con líneas a `ajustes_de_ejercicios_anteriores` o a `iva_por_rectificar` | `pide_motivo` |
| Registros tardíos del ejercicio anterior [CT-P4] | §3.5 | aviso |
| Meses abiertos atrasados [art. 94 num. 4] | Hay meses abiertos que terminaron hace más de 2 meses calendario | aviso **[pendiente P-5]** |

**Antes de revisar se reprocesa** [validación 2026-11-19, matiz de CT-P16]: «Revisar» corre primero `ReprocesarHechos` de
la empresa (todo evento contable del registro sin hecho, de cualquier fecha hasta el fin del mes, más los `con_error`), así
que después de reactivar Contabilidad ningún período se cierra sin haber procesado lo que llegó mientras estuvo apagada.
Lo que siga `con_error` después del reproceso es el hallazgo «Hechos sin partida» (`pide_motivo`), como decidió el usuario
en CT-P13: no se contradice con él, porque el bloqueo que pide el contador (no cerrar sin reprocesar) lo cumple el propio
cierre.

Cerrar guarda la revisión (hallazgos, cifras y motivo) en el período, calcula los **saldos del período** por cuenta
(`saldos_de_periodo`) y deja el período `cerrado`. No bloquea por diferencias: pide motivo (dictamen pregunta 15).

### 3.8 Cierre anual (período 13)

1. Ajustes del año en el período 13 (manuales; el diferido en fase 2).
2. **Partida de cierre** (`CerrarEjercicio`): salda cada cuenta de resultados contra «Resultado del ejercicio» (rol), con
   el 13 abierto y los 12 meses cerrados.
3. Cierra el 13 y marca el ejercicio **definitivo** si la empresa lo pide (CT-P11): los 13 períodos quedan `definitivo`
   con `definitivo_por = 'cierre_de_ejercicio'` (los ya impresos conservan `impresion`).
   Antes, la lista de control del 13 suma [validación 2026-11-19]: `apertura_por_regularizar` con saldo (`pide_motivo`,
   V-4); recordatorio del corte de proveedores (aviso, CT-P4); y **diferencias entre la base contable y la fiscal** (aviso,
   CT-P18) si algún módulo las informa por `contabilidad.bases_fiscales_y_contables` (Activos fijos, CT-11), porque bajo
   NIIF Pymes con régimen sobre las utilidades la sección 29 exige el diferido, que llega en fase 2.
4. El año siguiente arranca con los saldos de balance (no hace falta partida: el Mayor arrastra el saldo anterior de las
   cuentas de balance); se puede **imprimir** una partida de apertura del año en el Diario (solo en la impresión).
5. La reserva legal (C. Com. art. 36: al menos el 5 % de la utilidad neta; art. 37: indistribuible hasta la liquidación)
   va al aprobarse la distribución, en el año siguiente, como partida manual (validado, V-6).

### 3.9 Roles de sistema (catálogo en código; CT-P7 para la de proveedores)

| Rol | Llave | Módulo que lo usa |
|---|---|---|
| `proveedores` | Categoría de proveedor (opcional; sin llave = por omisión) | Libro de compras, Cuentas por pagar |
| `iva_credito_fiscal` | — | Libro de compras |
| `iva_no_acreditable` | — (opcional: sin enlace va al costo de la línea, H11) | Libro de compras |
| `retencion_por_pagar` | Regla de retención (las 9 de `REGLAS_DE_RETENCION`) | Libro de compras, Caja chica |
| `gasto_por_concepto` | Concepto de gasto del libro | Libro de compras |
| `documentos_por_asignar` | — | Libro de compras (destino Caja chica o Cuentas por liquidar) |
| `puente_compras_de_activos` | — | Libro de compras, Activos fijos |
| `pagos_por_aplicar`, `saldos_por_regularizar`, `efectivo_para_pagos` | — | Bancos, Cuentas por pagar |
| `cuenta_bancaria` | Cuenta bancaria | Bancos y todos los que pagan o cobran |
| `concepto_bancario` | Concepto de Bancos | Bancos |
| `isr_sobre_intereses` (**gasto** de ISR de rentas de capital; antes `isr_retenido_en_intereses`, E-3), `fondos_en_transito` | — | Bancos |
| `apertura_por_regularizar` (transitoria de balance, V-4) | — | Cuentas por pagar (pago `correccion_de_error`) |
| `iva_por_rectificar` (pasivo, V-5) | — | Libro de compras (reversa de un documento de un período declarado) |
| `caja_chica` | Fondo (opcional) | Caja chica |
| `anticipos_por_liquidar`, `cuentas_por_cobrar_a_empleados` | — | Cuentas por liquidar, Cuentas por pagar, Caja chica |
| `perdidas_no_deducibles`, `otros_ingresos` | — | Varios (faltantes, sobrantes, ajustes) |
| `puente_de_apertura` | — | Apertura |
| `activo_fijo`, `depreciacion_acumulada`, `gasto_de_depreciacion` | Clase de activo | Activos fijos |
| `construcciones_en_curso`, `resultado_en_venta_de_activos`, `perdida_en_baja_de_activos`, `iva_debito_fiscal`, `cuentas_por_cobrar_otras` | — | Activos fijos |
| `diferencial_realizado_ganancia`, `_perdida`, `diferencial_no_realizado_ganancia`, `_perdida` | — | Multimoneda |
| `isr_gasto_corriente`, `isr_por_pagar`, `isr_diferido_resultado`, `isr_diferido_activo`, `isr_diferido_pasivo` | — | Cierre anual, diferido |
| `resultado_del_ejercicio`, `resultados_acumulados`, `ajustes_de_ejercicios_anteriores`, `reserva_legal` | — | Cierre anual, correcciones |

Búsqueda: primero el enlace con la llave; si no hay, el del rol sin llave; si no hay, error `falta_enlace` (el hecho queda
con error y la pantalla de Enlaces lo muestra). La pantalla de Enlaces solo enseña los roles de los módulos **activos** y,
para los que llevan llave, lista los registros del otro módulo con un nombre (pregunta `contabilidad.llaves_de_enlace`,
§8: cada módulo da sus cuentas bancarias, conceptos, clases… sin que Contabilidad lea sus tablas).

### 3.10 Marco contable e impuesto diferido (fase 2)

- Marco contable `niif_pymes` / `base_fiscal` (CT-P9), **uno solo por empresa y ejercicio** [validación 2026-11-19, matiz
  de CT-P9; art. 375]: ya no es una variable de configuración sin vigencia, sino la tabla `contabilidad.marcos` (§5.11b),
  con el ejercicio desde el que rige. Solo se cambia para un ejercicio **sin partidas contabilizadas** (en la práctica, el
  siguiente); nunca dos contabilidades en paralelo **[pendiente P-6]**. Sin fila, rige la variable de instalación
  `contabilidad.marco_por_omision` (`niif_pymes`). Los estados dicen el marco: «Preparados sobre base fiscal» o «NIIF para
  las Pymes (IASB), <edición>»; la edición se guarda en la fila (la tercera, de 2025, rige desde los ejercicios de 2027).
- Diferido (fase 2, CT-14): pantalla del período 13 (o trimestral) con las diferencias temporarias: las de activos fijos
  las da Activos fijos por la pregunta `contabilidad.bases_fiscales_y_contables` (base contable y fiscal por activo al
  corte); las demás se capturan a mano. Solo se ofrece con marco NIIF y régimen sobre las utilidades vigente en el
  ejercicio. Tabla reservada `diferencias_temporarias` (§5.11). La tasa (25 %, LAT art. 36) es variable de instalación.

## 4. Cambios fuera del módulo (paso CT-0, antes de Contabilidad)

### 4.1 Core (CT-0a)

- `EventoDominio` gana `id` (uuid generado al crearlo) y `version` (1 por omisión).
- Tabla **`core.registro_de_eventos`**:

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK; el id del evento |
| `numero` | bigint | no | `generated always as identity`; orden global de llegada (reproceso en orden) |
| `cuenta_id` | uuid | no | FK `core.cuentas` on delete cascade; de la transacción |
| `empresa_id` | uuid | no | FK `core.empresas` on delete cascade; de la transacción |
| `nombre` | text | no | `^[a-z0-9-]+\.[a-z_]+$` |
| `version` | smallint | no | `>= 1` |
| `datos` | jsonb | no | Los datos del evento (dinero en centavos, como el contrato) |
| `ocurrido_en` | timestamptz | no | |
| `usuario_id` | uuid | sí | De la transacción |

  Índices: `(empresa_id, nombre, numero)` y `(empresa_id, numero)`. RLS: `politicasDeSoloAgregarPorEmpresa()` (agregar y
  leer en la empresa; sin cambio ni borrado). **No se depura** mientras exista la empresa (es la fuente de la
  contabilidad; crece poco: un evento por operación). Sin `...autoria` propia (ya lleva `usuario_id`).
- `PublicadorDeEventos` (reemplaza a `PublicadorEventosEnBus` en `dependencias-compartidas.ts`): **dentro** de una unidad
  de trabajo inserta los eventos, avisa `core.eventos_registrados` y difiere el bus; **fuera** de una transacción lanza
  `PublicacionFueraDeLaTransaccion` (error de programación: así ninguna publicación queda fuera del registro).
  **Transición**: CT-0a crea `PublicadorDeEventos` y lo deja disponible en `dependencias-compartidas.ts` **junto** al de hoy;
  cada módulo cambia al nuevo en CT-0a2 o CT-0a3 al mover su publicación, y el último de esos pasos quita
  `PublicadorEventosEnBus` de las compartidas (y `PublicadorEventosTrasConfirmar` de las composiciones). Así ningún paso
  deja a un módulo publicando fuera de una transacción con un publicador que lanza.
- Contrato nuevo `core/contratos/core.contratos.ts`: aviso `core.eventos_registrados: { eventos: Array<{ id, nombre,
  version, datos, ocurridoEn }> }`.
- Los ~30 casos de uso que publican mueven `publicadorEventos.publicar(eventos)` **dentro** del callback de
  `unidadDeTrabajo.ejecutar` (cambio mecánico, con una prueba por módulo de que el evento queda en el registro y de que,
  si la transacción se deshace, no queda).
- Contrato `core/contratos/contabilidad.contratos.ts` (§8): roles (la lista de §3.9 ya con `isr_sobre_intereses`,
  `apertura_por_regularizar` e `iva_por_rectificar`), preguntas `contabilidad.estado_de_la_fecha`,
  `contabilidad.saldos_de_auxiliares`, `contabilidad.llaves_de_enlace` y `contabilidad.bases_fiscales_y_contables` (solo
  el contrato; la responde Activos fijos en CT-11).

### 4.2 Libro de compras (CT-0b)

`documento_registrado` (versión 2) agrega: `fechaDeEfecto` (emisión, o fecha de inicio para los del libro emitidos antes,
como R1), `periodoDelLibro`, `regimenIva` y `regimenIsr` de la empresa, `serie` y `numero`, `nitEmisor`, y:

- `lineas: [{ numero, conceptoId, tipo ('bien'|'servicio'), esActivoFijo, esCombustible, baseCentavos, ivaCentavos,
  ivaNoAcreditableCentavos, idpCentavos, exentoCentavos, otrosImpuestosCentavos, totalCentavos }]`;
- `retenciones: [{ retencionId, impuesto, regla, montoCentavos, fecha, constanciaNumero }]`;
- en las notas de crédito y débito, `documentoAfectado: { documentoId | facturaAnteriorId, fechaDeEfecto }` (de
  `documento_afectado_id` o `factura_anterior_id`, que ya existen), para la regla E-2 del §7 aunque la factura sea anterior
  al inicio contable y no tenga partida [validación 2026-11-19].

`documento_anulado` (versión 2) agrega `fecha` (fecha contable de la anulación: la de `anulado_en` en la zona de la
empresa), `causa` y `periodoDeclarado` (boolean). `documento_eliminado` agrega `fecha`. Libro de compras consulta
`contabilidad.estado_de_la_fecha` antes de **eliminar** (si el período contable de la partida está cerrado, error
`documento_contabilizado_en_periodo_cerrado` con «anúlelo»; el veto lo atrapa igual).

### 4.3 Bancos (CT-0c; dictamen: crítico)

Eventos (solo de movimientos **sin origen**; los que tienen `modulo_de_origen` los contabiliza su módulo):

| Evento | Cuándo | Datos |
|---|---|---|
| `bancos.movimiento_registrado` | Nota de crédito o débito, cheque sin origen | `movimientoId`, `cuentaBancariaId`, `tipo`, `fecha`, `montoCentavos`, `conceptos: [{ conceptoId, claveDeSistema, actividadDeFlujo, montoCentavos }]`, `marcadoParaCuentasPorPagar`, `interesBrutoCentavos`, `isrRetenidoCentavos`, `beneficiario`, `numero` |
| `bancos.transferencia_registrada` | Transferencia entre cuentas propias | `transferenciaId`, origen, destino, `fecha`, `montoCentavos` |
| `bancos.movimiento_anulado` | Anular | `movimientoId`, `forma` (`sin_inverso`/`con_inverso`), `fecha` (la del inverso o la de la anulación), `fechaOriginal` |
| `bancos.transferencia_anulada` | Anular transferencia | Igual |
| `bancos.movimiento_eliminado` | Eliminar lo «limpio» o blanquear un cheque | `movimientoId`, `fechaOriginal` |
| `bancos.movimiento_corregido` | Cambio de monto o fecha (notas y cheques sin origen) | Antes y después |
| `bancos.movimiento_reclasificado` | Cambio de concepto o desglose | `conceptos` antes y después, `fecha` = hoy |

El **saldo inicial** no publica evento (lo da la pregunta de saldos, §3.6). Bancos responde
`contabilidad.saldos_de_auxiliares` (saldo en libros por cuenta, rol `cuenta_bancaria`; las notas marcadas para Cuentas por
pagar sin aplicar, rol `pagos_por_aplicar`) y `contabilidad.llaves_de_enlace` (cuentas y conceptos). Al anular o eliminar
consulta `contabilidad.estado_de_la_fecha`: si el período contable está cerrado, `sin_inverso` y eliminar no se ofrecen
(como hoy con los meses conciliados).

### 4.4 Cuentas por pagar (CT-0d)

- `retiro_liquidado` y `retiro_reabierto` llevan `destinoDelFaltante` (`cuenta_por_cobrar_al_custodio` / `perdida`),
  decidido por quien liquida (dictamen pregunta 9, CT-P8): columna nueva `cuentas_por_pagar.retiros_de_efectivo.
  destino_del_faltante text null` con check `(faltante > 0) = (destino_del_faltante is not null)` (migración de CxP; sin
  datos que convertir: los liquidados con faltante, si los hay, toman `perdida` y se auditan). La pantalla de liquidar
  lleva una nota junto al selector [validación 2026-11-19, CT-P8]: «Cargarlo al custodio crea una cuenta por cobrar;
  descontarlo del salario tiene los límites del Código de Trabajo. Como pérdida, no es deducible salvo que se compruebe
  un delito con denuncia».
- Documentar en el contrato que `retencionDescontadaCentavos` es **informativa** (Contabilidad no la usa).
- Responde `contabilidad.saldos_de_auxiliares` (Proveedores neto por tercero y categoría, R1; transitoria R11; efectivo
  para pagos por retiro abierto; retenciones pendientes de saldo inicial) y `contabilidad.llaves_de_enlace` (categorías).

### 4.5 Empresas (CT-0e)

Avisos nuevos dentro de la transacción de cerrar y reabrir la carga: `empresas.carga_por_cerrar` y
`empresas.carga_por_reabrir` (`{ empresaId, fechaDeInicio }`). Sin migración.

### 4.6 Caja chica, Cuentas por liquidar, Activos fijos y Multimoneda

Publican sus eventos ya diseñados cuando se programen (ya con el registro del core) y responden las dos preguntas. Ajustes:
`arqueo_registrado` y `anticipo_liquidado` con el destino de la diferencia decidido; `activos-fijos.depreciacion_reabierta`
ya no necesita un aviso previo propio: el veto del §3.2 lo cubre **[matiza el dictamen §3]**; `multimoneda.cierre_cambiario_
registrado` con el detalle por partida monetaria y su rol, separando realizado y no realizado. Caja chica y Cuentas por
liquidar responden además, con el rol `documentos_por_asignar`, el total de los documentos del libro que tienen sin asignar
a la fecha, y en `pendientes` cuántos llevan más de 30 días [validación 2026-11-19, V-2].

### 4.7 Documentos

Corregir `diseno-cp5-reportes.md` §2.3 (dictamen §0.4): un documento eliminado **sí** estaba provisionado; eliminarlo cancela
la partida y solo se puede con el período contable abierto. Paso de documentación aparte (no entra en este commit).

## 5. Datos (esquema `contabilidad`)

Toda tabla lleva `empresa_id` (FK `core.empresas` on delete cascade), `politicaPorEmpresa()` (salvo lo dicho),
`...marcasDeTiempo` y `...autoria`. Llaves compuestas con `empresa_id` hacia tablas propias y de Empresas; destino
`<tabla>_id_empresa_unico (id, empresa_id)`; toda llave con su índice. Dinero `numeric(14,2)`. Sin alcance por registro:
quien entra a Contabilidad ve toda la contabilidad de la empresa (CT-P1 b).

### 5.1 `contabilidad.inicios` (una fila por empresa)

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `empresa_id` | uuid | no | PK |
| `fecha` | date | no | Fecha de inicio contable; `>=` la fecha de inicio de la empresa (dominio, por el mediador) |
| `caso` | text | no | `in ('desde_la_carga','posterior')` (§3.6) |
| `mascara` | text | no | `^9+(\.9+){3,5}$` (de 4 a 6 niveles; plantilla `9.9.99.99.999`); fija desde la primera cuenta (dominio) |
| `plantilla` | text | sí | Clave de la plantilla usada (informativa) |
| `iniciada_en`, `iniciada_por` | timestamptz, uuid | sí | Al armar la apertura del caso b, o al cerrar la carga en el caso a |
| `firma_representante` | text | sí | 1–150; nombre del propietario o representante legal que firma los estados y el Libro de Inventarios (art. 374) [validación 2026-11-19] |
| `firma_contador`, `registro_del_contador` | text, text | sí | 1–150 y 1–30; nombre y número de registro del contador; los dos o ninguno. Sin datos, la impresión deja las líneas de firma en blanco |

Los firmantes se capturan en «Inicio de la contabilidad» (`inicio.editar`) y se pueden cambiar en cualquier momento (cada
impresión copia los nombres que tenía: §5.9); no se audita como borrado porque nada se pierde.

### 5.2 `contabilidad.cuentas`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `codigo` | text | no | Cumple la máscara (dominio); único `cuentas_codigo_unico (empresa_id, codigo)` |
| `nombre` | text | no | 1–150 recortado; único `(empresa_id, padre_id, nombreNormalizado(nombre))` |
| `padre_id` | uuid | sí | FK compuesta `(padre_id, empresa_id) → cuentas`; nulo solo en el nivel 1; check `padre_id <> id` |
| `nivel` | smallint | no | `between 1 and 6`; = segmentos del código |
| `es_de_detalle` | boolean | no | Solo las de detalle reciben líneas; una cuenta con hijas no es de detalle (disparador `cuentas_hoja_de_detalle`) |
| `naturaleza` | text | no | `in ('deudora','acreedora')` |
| `tipo` | text | no | `in ('balance','resultados')`; igual al del padre (dominio) |
| `rubro` | text | sí | Rubro de estado financiero: lista cerrada en un check (`cuentas_rubro_valido`), la de abajo; obligatorio en las de detalle; el rubro debe ser del `tipo` de la cuenta (dominio); `corriente boolean` aparte para activo y pasivo |
| `corriente` | boolean | sí | Solo en rubros de activo o pasivo |
| `clase_de_flujo` | text | sí | `in ('efectivo','operacion','inversion','financiamiento','ninguna')`; para el flujo indirecto; obligatorio en las de detalle de balance |
| `es_monetaria` | boolean | no | `default false`; para Multimoneda |
| `moneda_id` | uuid | sí | FK `core.monedas`; nulo = quetzales |
| `pide_tercero`, `pide_centro_de_costo` | boolean | no | `default false`; la línea exige tercero o localidad/departamento |
| `es_de_control` | boolean | no | `default false`; la marcan los enlaces de roles de auxiliar (dominio) y el contador |
| `tratamiento_fiscal` | text | no | `in ('deducible','no_deducible','exento','costo_de_renta_exenta','renta_de_capital','no_aplica')`, `default 'no_aplica'`; solo en resultados. `costo_de_renta_exenta`: costos y gastos de rentas exentas o no afectas, en cuentas separadas (LAT art. 23); `renta_de_capital`: intereses, dividendos y su ISR, que tributan aparte de las actividades lucrativas (LAT título IV) [validación 2026-11-19, V-7] |
| `activa` | boolean | no | `default true`; inactivar exige saldo cero y sin enlaces (dominio) |

Índices: `cuentas_id_empresa_unico`, `(empresa_id, padre_id)`, `(empresa_id, codigo text_pattern_ops)` (búsqueda por
prefijo). Eliminar: solo sin líneas, hijas ni enlaces (las llaves `no action` lo hacen cumplir; el error se traduce).

**Rubros** (lista completa tras la validación 2026-11-19, V-7; los nuevos en cursiva):

| Tipo | Grupo | Rubros |
|---|---|---|
| balance | Activo | `efectivo`, `cuentas_por_cobrar`, _`cuentas_por_cobrar_partes_relacionadas`_, _`anticipos_a_proveedores`_, `inventarios`, `impuestos_por_recuperar`, `gastos_anticipados`, _`inversiones`_, `propiedad_planta_y_equipo`, _`propiedades_de_inversion`_, `intangibles`, `activos_biologicos`, `impuesto_diferido_activo`, `otros_activos` |
| balance | Pasivo | `proveedores`, _`cuentas_por_pagar_partes_relacionadas`_, `prestamos_corto_plazo`, `impuestos_por_pagar`, `retenciones_por_pagar`, _`beneficios_a_empleados`_ (indemnización, aguinaldo, bono 14, vacaciones), _`ingresos_diferidos`_ (anticipos de clientes y cobros por adelantado), `otras_cuentas_por_pagar`, `provisiones`, `prestamos_largo_plazo`, `impuesto_diferido_pasivo`, `otros_pasivos` |
| balance | Patrimonio | `capital`, _`aportes_para_futuras_capitalizaciones`_, `reservas`, _`superavit_por_revaluacion`_ (su movimiento del año sale como otro resultado integral, secc. 5 y 17.15B), `resultados_acumulados`, `resultado_del_ejercicio` |
| resultados | — | `ingresos_ordinarios`, `costo_de_ventas`, _`costo_de_produccion`_ (para los módulos de rubro), `gastos_de_venta`, `gastos_de_administracion`, `otros_ingresos`, `otros_gastos`, _`cambio_en_valor_razonable_de_activos_biologicos`_, `ingresos_financieros`, `gastos_financieros`, `diferencial_cambiario`, `impuesto_sobre_la_renta` |

El grupo (activo, pasivo o patrimonio) se deduce del rubro; el dominio valida que `corriente` solo vaya en activo y pasivo.
La transitoria `documentos_por_asignar` se enlaza a una cuenta de rubro `efectivo` (o `cuentas_por_cobrar` si la mayoría
son anticipos) y clase de flujo `efectivo`: su saldo acreedor se **resta** de Caja chica en el balance, no sale como pasivo
[validación 2026-11-19, V-2]; la plantilla la sugiere así. El inventario en proceso es `inventarios`.

### 5.3 `contabilidad.enlaces`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `rol` | text | no | Check con la lista de §3.9 |
| `llave` | text | sí | El id del registro del otro módulo (uuid como texto) o la regla de retención. **Sin llave foránea**: vive en módulos que no están en `dependeDe` (PLAN §3.2) |
| `llave_nombre` | text | sí | El nombre con que se mostró al enlazar (para la pantalla si el registro se borró) |
| `cuenta_id` | uuid | no | FK compuesta a `cuentas`; de detalle y activa (dominio) |

Único `enlaces_rol_llave_unico (empresa_id, rol, coalesce(llave, ''))`. Índice `(cuenta_id)`. Cambiar un enlace solo
afecta lo que se contabilice después (se audita, §9.2).

### 5.4 `contabilidad.periodos`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `empresa_id`, `ejercicio`, `mes` | uuid, smallint, smallint | no | PK; `mes between 1 and 13` |
| `desde`, `hasta` | date | no | Del mes; el 13: 31/12 a 31/12 |
| `estado` | text | no | `in ('abierto','cerrado','definitivo')` |
| `cerrado_en`, `cerrado_por` | timestamptz, uuid | sí | `(estado <> 'abierto') = (cerrado_en is not null)` |
| `revision` | jsonb | sí | Hallazgos y cifras del último cierre (como EM-2) |
| `motivo_de_cierre` | text | sí | 1–500 |
| `veces_reabierto` | smallint | no | `default 0`; el motivo de cada reapertura va en la auditoría |
| `definitivo_por` | text | sí | `in ('impresion','cierre_de_ejercicio')`; check `(estado = 'definitivo') = (definitivo_por is not null)` [validación 2026-11-19, E-1] |
| `impresion_id` | uuid | sí | FK compuesta a `impresiones` (la que lo hizo definitivo); checks `definitivo_por is distinct from 'impresion' or impresion_id is not null` y `impresion_id is null or estado = 'definitivo'` |

Reemplaza el check anterior `(estado = 'definitivo') = (impresion_id is not null or mes = 13)`, que dejaba el 13 siempre
definitivo y no dejaba marcar definitivos los meses al cerrar el ejercicio sin imprimir (E-1). Nunca se borra.

### 5.5 `contabilidad.partidas`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `numero`, `anio_de_numero` | integer | sí | Correlativo `contabilidad.partidas` por ejercicio (`core.correlativos`); `(numero is null) = (estado in ('borrador','por_aprobar'))`; único parcial `(empresa_id, anio_de_numero, numero) where numero is not null` |
| `tipo` | text | no | `in ('diario','ajuste','reclasificacion','apertura','cierre','correccion','automatica')` |
| `estado` | text | no | `in ('borrador','por_aprobar','contabilizada','anulada')` |
| `fecha` | date | no | Fecha contable |
| `fecha_del_hecho` | date | sí | Solo automáticas; `fecha >= fecha_del_hecho` salvo apertura |
| `ejercicio`, `mes` | smallint | no | FK `(empresa_id, ejercicio, mes) → periodos`; coherentes con `fecha` (check: `ejercicio = extract(year from fecha)`; el 13 solo con `fecha` 31/12) |
| `glosa` | text | no | 1–500 |
| `total` | numeric(14,2) | no | Σ debe (= Σ haber); `>= 0`; para listar sin sumar líneas |
| `es_conciliatoria` | boolean | no | `default false`; manual con líneas en cuentas de control (CT-P12) |
| `hecho_evento_id` | uuid | sí | FK `(empresa_id, hecho_evento_id) → hechos`; `(tipo = 'automatica') = (hecho_evento_id is not null)` salvo las aperturas de módulo, que llevan `origen_modulo` |
| `origen_modulo`, `origen_documento_id` | text, uuid | sí | Para buscar «la partida del documento X»; juntos o ninguno; sin llave |
| `reversa_de_id` | uuid | sí | FK compuesta a `partidas`; único parcial (una reversa por partida) |
| `respaldo_archivo_id` | uuid | sí | FK `core.archivos` (`recurso_dueno = 'contabilidad.partidas'`); único parcial |
| `referencia_de_respaldo` | text | sí | 1–150 (p. ej. «Contrato de arrendamiento del 3/1/2026»); el documento fehaciente cuando no se adjunta (C. Com. art. 381). **[pendiente P-1]**: con P-1 b, al contabilizar una manual de tipo `diario` se exige `respaldo_archivo_id` o `referencia_de_respaldo` (error `partida_sin_respaldo`, en el dominio y en `partida_al_contabilizar`); en `ajuste`, `reclasificacion`, `cierre`, `correccion` y `apertura` sigue opcional. La columna va en CT-3 con cualquier respuesta |
| `numero_de_diario` | integer | sí | **[pendiente P-3]** (solo con P-3 b; migración de CT-7): correlativo del Diario por ejercicio que se da **al cerrar el mes**, en orden de `fecha`, aperturas primero y `numero`; único parcial `(empresa_id, ejercicio, numero_de_diario)`. Las del período 13 lo reciben al cerrar el 13. El número interno `numero` no cambia |
| `enviada_por`, `aprobada_por`, `aprobada_en` | uuid, uuid, timestamptz | sí | `aprobada_por <> enviada_por` salvo permiso `aprobar-propias` (dominio) |
| `anulada_en`, `anulada_por`, `motivo_de_anulacion` | | sí | `(estado = 'anulada') = (los tres no nulos)`; motivo 1–500 |

Índices: `(empresa_id, fecha, numero)` (Diario), `(empresa_id, estado) where estado in ('borrador','por_aprobar')`,
`(empresa_id, origen_modulo, origen_documento_id) where origen_documento_id is not null`, `(hecho_evento_id)`,
`(reversa_de_id)`.

### 5.6 `contabilidad.lineas_de_partida`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `partida_id` | uuid | no | FK compuesta **on delete cascade** (solo se borra un borrador) |
| `numero` | smallint | no | Único `(partida_id, numero)` |
| `cuenta_id` | uuid | no | FK compuesta a `cuentas` (no action) |
| `debe`, `haber` | numeric(14,2) | no | `default 0`; `>= 0`; check `(debe = 0) <> (haber = 0)` (uno de los dos, no ambos) |
| `descripcion` | text | sí | 1–300 |
| `tercero_id` | uuid | sí | FK `terceros.terceros` (por cuenta; la base no cruza de cuenta porque RLS de Contabilidad es por empresa y la del tercero por cuenta: el dominio lo verifica al leer) |
| `cuenta_bancaria_id`, `activo_id`, `documento_id` | uuid | sí | Auxiliares de otros módulos, **sin llave** (no están en `dependeDe`) |
| `localidad_id`, `departamento_id` | uuid | sí | FK compuestas a `empresas.localidades` y `empresas.departamentos` |
| `moneda_id`, `monto_original`, `tipo_de_cambio` | uuid, numeric(14,2), numeric(14,6) | sí | Los tres o ninguno; para Multimoneda |

Índices: `(cuenta_id, partida_id)` (Mayor), `(empresa_id, tercero_id) where tercero_id is not null`, parciales de
localidad y departamento.

### 5.7 `contabilidad.hechos` (bandeja)

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `empresa_id`, `evento_id` | uuid | no | PK; FK `evento_id → core.registro_de_eventos` |
| `nombre` | text | no | Copia del nombre (para filtrar sin unir) |
| `fecha_del_hecho` | date | no | La que la regla sacó del evento |
| `estado` | text | no | `in ('pendiente','contabilizado','sin_partida','con_error','anterior_al_inicio')`; `pendiente` solo si la contabilización se difiere al reproceso (importaciones grandes, R-3) |
| `error_codigo`, `error_detalle` | text | sí | `(estado = 'con_error') = (error_codigo is not null)` |
| `intentos` | smallint | no | `default 1` |
| `procesado_en` | timestamptz | no | |

Índices: `(empresa_id, estado, fecha_del_hecho) where estado in ('pendiente','con_error')`, `(empresa_id, nombre, fecha_del_hecho)`.
Nunca se borra (políticas de agregar, leer y cambiar; sin borrar).

### 5.8 `contabilidad.saldos_de_periodo`

`(empresa_id, ejercicio, mes, cuenta_id)` PK, `debe`, `haber` (movimiento del período, solo cuentas de detalle). Se escribe
al **cerrar** y se borra al **reabrir** (la auditoría de la reapertura guarda los totales por cuenta que había). Sirve para
los reportes de meses cerrados sin sumar todas las líneas y como constancia de lo que se cerró. Índice `(cuenta_id)`.

### 5.9 `contabilidad.impresiones` y `contabilidad.folios`

**`folios`**: `(empresa_id, libro)` PK, `libro in ('diario','mayor','inventarios','estados_financieros')` (nombres legales:
Libro Diario, Libro Mayor, **Libro de Inventarios** y Libro de Estados Financieros; ya no `inventarios_y_balances`, V-6),
`ultimo_folio integer default 0` (el siguiente folio habilitado; se fija al empezar: «primer folio de la hoja habilitada»).
Datos de la habilitación vigente [validación 2026-11-19, V-6]: `resolucion_de_habilitacion text null` (1–60),
`folio_habilitado_desde integer null`, `folio_habilitado_hasta integer null`; los tres o ninguno; `desde <= hasta` y
`ultimo_folio <= folio_habilitado_hasta`. Una habilitación nueva reemplaza los tres (`PUT /contabilidad/folios/:libro`); la
anterior queda en las impresiones que la usaron y en la auditoría (`corregir`, permanente).

**`impresiones`**: `id`; `libro`; `ejercicio`; `desde_mes`, `hasta_mes` (`1..13`, `desde <= hasta`); `modo in
('detallado','resumido')` (CT-P14; `resumido` solo en `diario`); `folio_desde`, `folio_hasta`, `paginas` (`folio_hasta =
folio_desde + paginas − 1`); `archivo_id` (FK `core.archivos`, el PDF impreso, `recurso_dueno = 'contabilidad.impresiones'`);
`version_de_plantilla`; `resolucion_de_habilitacion text null` (copia de `folios` al imprimir: rotula cada hoja);
`firmantes jsonb null` (copia de los firmantes de `inicios` en los libros que llevan firma: Inventarios y Estados
Financieros, art. 374); `anexo_archivo_id uuid null` (FK `core.archivos`): el **auxiliar de detalle** que se genera en el
mismo acto de un Diario resumido, check `(modo = 'resumido') = (anexo_archivo_id is not null)` [validación 2026-11-19,
CT-P14]; `anulada_en`, `anulada_por`, `motivo` (una hoja dañada: el folio no se reusa; se reimprime en folios nuevos) y
`constancia_archivo_id uuid null` (FK `core.archivos`): la **constancia de anulación** de esos folios, que se imprime al
anular para guardarla con las hojas marcadas «ANULADA», check `(anulada_en is null) = (constancia_archivo_id is null)`
[validación 2026-11-19, V-6]. Único parcial `(empresa_id, libro, folio_desde) where anulada_en is null`. Imprimir en
definitivo marca los períodos `definitivo` (`definitivo_por = 'impresion'`). Una **copia** (sin folio) no deja fila.

Reglas al imprimir en definitivo:

- Si la habilitación tiene rango y la impresión pasa de `folio_habilitado_hasta`, **[pendiente P-7]** (recomendado:
  error `folios_habilitados_insuficientes`, «registre la nueva habilitación»); aviso cuando queden menos de 20 folios.
- Inventarios y Estados Financieros con la puente de apertura distinta de cero: error `puente_de_apertura_sin_cuadrar`
  (§3.6) **[pendiente P-4]**.
- Aviso de **libros atrasados** (C. Trib. art. 94 num. 4: Q5,000 si las operaciones no se asientan en libros habilitados
  dentro de los 2 meses calendario siguientes): en «Impresión de libros» y en el inicio del módulo, cuando el último mes
  impreso en definitivo del Diario tenga más de 2 meses de atraso. Solo aviso **[pendiente P-5]**.
- Los PDF de impresiones, anexos y constancias, y los respaldos de las partidas, no se borran (arts. 376 y 382; el texto
  oficial del 382 está **[pendiente del contador]**).

### 5.10 Disparadores (migración `--custom` del paso CT-3)

| Disparador | Tabla | Qué impide |
|---|---|---|
| `lineas_solo_en_borrador` | `lineas_de_partida` (insert, update, delete) | Tocar líneas si la partida no está en `borrador` |
| `partida_al_contabilizar` | `partidas` (update de estado a `contabilizada`) | Σ debe ≠ Σ haber, menos de 2 líneas, `total` distinto, cuenta que no es de detalle o inactiva, período no `abierto`; con P-1 b, una manual `diario` sin respaldo ni referencia **[pendiente P-1]** |
| `partida_inmutable` | `partidas` (update) | Cambiar fecha, glosa, tipo, origen o número de una contabilizada; solo se permite `contabilizada → anulada` (período abierto) y poner `reversada_por` |
| `partida_solo_se_borra_en_borrador` | `partidas` (delete) | Borrar lo que no sea `borrador` o `por_aprobar` |
| `periodo_al_cambiar` | `periodos` (update) | `definitivo → *`; cerrar con un mes anterior abierto |
| `cuentas_hoja_de_detalle` | `cuentas` (insert, update de `padre_id`) | Que una cuenta de detalle tenga hijas |

Las funciones son `security invoker` (corren con RLS); la regla «debe = haber» queda en la base aunque el código falle,
como pide el dictamen §10 **[matiza el dictamen]**: se revisa al pasar a `contabilizada` (las líneas ya no cambian
después), sin disparador diferido.

### 5.11 Reservado para la fase 2

`contabilidad.diferencias_temporarias`: `id`, `ejercicio`, `mes` (3, 6, 9, 12 o 13), `origen in ('activos_fijos','manual')`,
`descripcion`, `base_contable`, `base_fiscal`, `tasa numeric(5,2)`, `tipo in ('activo','pasivo')`, `reconocida boolean`,
`partida_id`. Se diseña en detalle con CT-14.

### 5.11b `contabilidad.marcos` (CT-9; validación 2026-11-19, matiz de CT-P9) **[pendiente P-6]**

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `empresa_id`, `desde_ejercicio` | uuid, smallint | no | PK; el marco rige desde ese ejercicio hasta la fila siguiente |
| `marco` | text | no | `in ('niif_pymes','base_fiscal')` |
| `edicion` | text | sí | `in ('2015','2025')`; obligatoria con `niif_pymes` y nula con `base_fiscal` (check); por omisión `2025` desde el ejercicio 2027 y `2015` antes (dominio) |

Más `...marcasDeTiempo`, `...autoria`, `politicaPorEmpresa()`. Crear o cambiar una fila exige que el ejercicio
`desde_ejercicio` y los siguientes no tengan partidas contabilizadas (error `marco_con_partidas_en_el_ejercicio`); no se
borra (se audita `corregir`, recurso permanente `contabilidad.marcos`). Permiso `contabilidad.inicio.editar`. Lo leen los
estados financieros (rótulo) y, en fase 2, el diferido (solo con `niif_pymes`).

### 5.12 Migraciones y datos existentes

- Core `00NN_registro_de_eventos` (CT-0a), después de las migraciones del core en curso (EM-2, correo, MM-1): se toma el
  siguiente número libre al programar.
- Cuentas por pagar `00NN_destino_del_faltante` (CT-0d).
- `npm run generar -- modulo contabilidad --nombre "Contabilidad" --descripcion "…" --icono BookOpenCheck` crea el esqueleto y
  `0000_esquema`; luego `0001_ct1_cuentas_e_inicios` (con los rubros completos y los firmantes), `0002_ct2_enlaces`,
  `0003_ct3_periodos_y_partidas` (con `definitivo_por` y `referencia_de_respaldo`; + `--custom` con los disparadores y la
  auditoría permanente), `0004_ct4_hechos`, `0005_ct7_saldos_de_periodo` (y `numero_de_diario` si P-3 = b),
  `0006_ct9_marcos`, `0007_ct10_impresiones` (folios con la habilitación, anexo y constancia). Los números exactos se toman
  al programar.
- **Sin datos que convertir** (módulo nuevo; base de desarrollo sin documentos ni pagos). Sin migración de permisos (todos
  nuevos: el rol con acceso total los recibe solo).
- Auditoría permanente (en `0003`): `contabilidad.partidas`, `contabilidad.periodos`, `contabilidad.cuentas`,
  `contabilidad.enlaces`, `contabilidad.impresiones`, `contabilidad.inicio` y `contabilidad.folios`; `contabilidad.marcos`
  en `0006` (motivo: C. Com. arts. 368, 373 y 376; C. Trib. arts. 47 y 112 «A»).
- La prueba `llaves-entre-esquemas` acepta las llaves a `core`, `empresas` y `terceros`.

## 6. Reglas (un caso de uso por acción)

- **Iniciar** (`IniciarContabilidad`, `inicio.editar`): elige fecha, caso y plantilla; siembra la nomenclatura y los
  enlaces sugeridos de la plantilla (si la empresa no tiene cuentas); en el caso b, exige la carga cerrada y arma las
  aperturas por módulo. Cambiar la fecha solo sin partidas contabilizadas.
- **Cuentas** (`CrearCuenta`, `EditarCuenta`, `InactivarCuenta`, `ReactivarCuenta`, `EliminarCuenta`): código bajo la
  máscara y bajo su padre; cambiar naturaleza o tipo solo sin líneas; una de detalle con líneas no se vuelve de mayor.
- **Enlaces** (`GuardarEnlace`, `QuitarEnlace`): la cuenta debe ser de detalle y activa; los roles de auxiliar marcan la
  cuenta `es_de_control` (se puede desmarcar con aviso).
- **Partidas manuales** (`CrearPartida`, `EditarBorrador`, `EliminarBorrador`, `EnviarAAprobar`, `AprobarPartida`,
  `DevolverPartida`, `ContabilizarPartida`, `AnularPartida`, `ReversarPartida`): glosa obligatoria; fecha no futura y
  en período abierto; respaldo según P-1 (§5.5); líneas en cuentas de detalle activas con los auxiliares que pida la cuenta; en cuenta de control
  solo con `partidas.en-cuentas-de-control` (la marca `es_conciliatoria`); el período 13 solo `ajuste`, `cierre` y
  `correccion`; la de tipo `apertura` solo con fecha = inicio contable. Contabilizar asigna el número.
- **Hechos** (`ProcesarEventos`, desde el aviso; `ReprocesarHechos`, desde la pantalla y el cierre;
  `RegenerarPeriodo`): reglas de §7 como estrategias (una clase por nombre de evento, patrón Strategy); regenerar anula
  las automáticas del período abierto y vuelve a procesar sus eventos (útil tras corregir enlaces).
- **Períodos** (`RevisarCierre`, `CerrarPeriodo`, `ReabrirPeriodo`, `CerrarEjercicio`): §3.5, §3.7 y §3.8.
- **Impresión** (`ImprimirLibro`): genera el PDF (pdfkit, como el libro de compras), con la resolución de habilitación en
  cada hoja y, en Inventarios y Estados Financieros, los espacios de firma; en el Diario resumido genera también el anexo
  de detalle; guarda la impresión, avanza el folio y marca los períodos `definitivo`; `AnularImpresion` por hoja dañada
  (motivo, auditoría, constancia de anulación en PDF). `GuardarHabilitacion` (`PUT /contabilidad/folios/:libro`).
- **Marco** (`CambiarMarco`, CT-9): §5.11b.
- **Respuestas al mediador**: `contabilidad.estado_de_la_fecha`, `empresas.revisar_cierre_de_carga` (§3.6),
  `empresas.carga_por_cerrar` y `empresas.carga_por_reabrir`, `core.eventos_registrados`.

## 7. Reglas de contabilización (por validar con el usuario; dictamen §4.1)

Cada fila es una estrategia. «R(x)» = la cuenta del rol x con su llave.

| Evento | Debe | Haber | Fecha del hecho |
|---|---|---|---|
| `libro-de-compras.documento_registrado`, factura o recibo, destino Cuentas por pagar | Por línea: R(gasto_por_concepto) o R(puente_compras_de_activos) si `esActivoFijo`, por `base + idp + exento + otros + ivaNoAcreditable` (o R(iva_no_acreditable) si está enlazado); R(iva_credito_fiscal) por el IVA acreditable | R(proveedores, categoría) por el **neto** (con tercero); R(retencion_por_pagar, regla) por cada retención | `fechaDeEfecto` |
| Igual, destino Caja chica o Cuentas por liquidar | Igual | R(documentos_por_asignar) por el neto; retenciones igual | `fechaDeEfecto` |
| Nota de crédito del proveedor | Proveedores (o documentos por asignar) | Lo inverso de la factura por línea; IVA siempre a R(iva_credito_fiscal) en el período de la nota. **Si el ejercicio de la factura afectada está cerrado** (`documentoAfectado.fechaDeEfecto` en un ejercicio con el 13 `cerrado` o `definitivo`, o anterior al inicio contable), **sin importar el régimen**: las líneas de gasto a R(otros_ingresos) y las de activo fijo a R(puente_compras_de_activos) (rebaja el costo del activo, secc. 17.10, no es ingreso) [validación 2026-11-19, E-2: corrige la regla anterior, que dependía del régimen sobre las utilidades] | `fechaDeEfecto` |
| `documento_anulado` / `documento_eliminado` | Cancelar o reversar (§3.4, con los destinos de V-5 si el período está cerrado) | | `fecha` |
| `cuentas-por-pagar.documento_autorizado`, `_desautorizado`, `_anulado` | Sin partida (`sin_partida`) | | |
| `pago_registrado` | R(proveedores) por `montoCentavos` (con tercero); **no** usa `retencionDescontadaCentavos` | Según `efecto`: R(cuenta_bancaria), R(pagos_por_aplicar), R(efectivo_para_pagos), R(puente_de_apertura) o, en `correccion_de_error`, R(apertura_por_regularizar), la transitoria que el contador regulariza (§3.6) [validación 2026-11-19, V-4: ya no R(ajustes_de_ejercicios_anteriores)] **[pendiente P-2, confirmación]** | `fecha` (del cheque, aunque esté posfechado) |
| `pago_reaplicado` | Sin partida si `antes` y `despues` caen en la misma cuenta de Proveedores; si no, reclasificación | | `fecha` |
| `pago_anulado` | `sin_inverso`: cancelar; lo demás: reversa | | `fecha` |
| `ajuste_registrado` / `_anulado` | `perdida`: R(perdidas_no_deducibles) / R(proveedores); `transitoria`: R(saldos_por_regularizar) / R(proveedores); `ingreso`: R(proveedores) / R(otros_ingresos) (según el signo del saldo); anulado: reversa | | `fecha` |
| `retiro_registrado` | R(efectivo_para_pagos) | R(cuenta_bancaria) | `fecha` |
| `retiro_liquidado` | R(cuenta_bancaria) por lo devuelto; R(cuentas_por_cobrar_a_empleados) o R(perdidas_no_deducibles) por el faltante según `destinoDelFaltante` | R(efectivo_para_pagos) | `fecha` |
| `retiro_reabierto`, `retiro_anulado` | Cancelar o reversa según `anulacionEnBancos` | | `fecha` |
| `reintegro_registrado` / `_anulado` | R(cuenta_bancaria) o R(caja_chica) | R(proveedores) | `fecha` |
| `bancos.movimiento_registrado`, crédito con intereses | R(cuenta_bancaria) neto; R(isr_sobre_intereses) por el ISR retenido: es **gasto** de ISR de rentas de capital (la retención del banco es pago definitivo y no se acredita contra el ISR de actividades lucrativas) | R(concepto_bancario) por el bruto (la plantilla lo sugiere en `ingresos_financieros` con tratamiento `renta_de_capital`) [validación 2026-11-19, E-3] | `fecha` |
| Igual, otros sin origen | Crédito: R(cuenta_bancaria) / R(concepto_bancario) por cada concepto; débito y cheque: al revés. Marcado para Cuentas por pagar: R(pagos_por_aplicar) / R(cuenta_bancaria) | | `fecha` |
| `bancos.transferencia_registrada` | R(cuenta_bancaria destino) | R(cuenta_bancaria origen) | `fecha` |
| `bancos.movimiento_anulado`, `_eliminado`, `transferencia_anulada` | Cancelar o reversa (§3.4) | | `fecha` |
| `bancos.movimiento_corregido` | Cancelar y rehacer (período abierto) o reversa y nueva | | Nueva fecha |
| `bancos.movimiento_reclasificado` | Partida de reclasificación entre las cuentas de los conceptos (solo si cambian de cuenta) | | `fecha` |
| Caja chica, Cuentas por liquidar, Activos fijos, Multimoneda | Las de `diseno-caja-chica-y-cuentas-por-liquidar.md` §8, `diseno-activos-fijos.md` §9 y el dictamen §4.1. Documento **asignado**: Debe R(documentos_por_asignar) / Haber R(caja_chica, fondo), o Haber R(anticipos_por_liquidar) si va a Cuentas por liquidar; quitado: lo inverso. La reposición: Debe R(caja_chica, fondo) / Haber R(cuenta_bancaria) [validación 2026-11-19, V-2] | | La del evento |

Las líneas llevan tercero (proveedor), cuenta bancaria, documento de origen y, cuando el evento los trae, localidad y
departamento. La glosa se arma con el documento («Factura A-123 de Ferretería X», «Cheque 1045 a …»).

**Por qué la transitoria `documentos_por_asignar`** [corrige el dictamen §4.1, filas de Caja chica y Cuentas por
liquidar]: el libro no sabe a qué fondo o anticipo irá la factura (se asigna después, CCL-y). Con la transitoria, el gasto
y el IVA quedan en su mes con la fecha de efecto (devengo, como pide V-1 «al asignar» y sin partida de corte), cada hecho
arma su partida sin esperar a otro, y la cuenta cuadra con la bandeja de Caja chica y Cuentas por liquidar. Al asignar,
Caja chica (o Cuentas por liquidar) mueve de la transitoria al fondo. **Validado** (V-2, 2026-11-19), con tres precisiones
ya incorporadas: la dirección de la partida al asignar (fila de arriba: así el mayor de Caja chica es igual al efectivo del
arqueo; no es el fondo fijo clásico, que reconoce el gasto al reponer), la presentación neta de la transitoria en el
balance (§5.2) y su cuadratura y antigüedad en el cierre (§3.7).

**Comisiones del banco con FEL** (dictamen pregunta 8, CT-P15): con **a** la nota de débito de Bancos lleva origen
`libro-de-compras` cuando se liga a la factura (no hace partida) y la factura hace la suya; la regla de Bancos rechaza
(`con_error: comision_con_factura`) una nota de un concepto `admite_factura` sin ligar mientras la empresa elija **a**.

## 8. Contratos de Contabilidad (`core/contratos/contabilidad.contratos.ts`)

| Mensaje | Tipo | Datos → respuesta |
|---|---|---|
| `contabilidad.estado_de_la_fecha` | Pregunta a todos (sin Contabilidad, ninguna respuesta = abierta) | `{ fecha }` → `{ abierta, primerDiaAbierto, definitiva }` |
| `contabilidad.saldos_de_auxiliares` | Pregunta a todos (la hace Contabilidad; responden los módulos) | `{ fecha, proposito: 'apertura' | 'cuadratura' }` → `{ nombreDelModulo, lineas: [{ rol, llave, terceroId, montoCentavos (positivo = deudor), etiqueta }], pendientes: string[] }` |
| `contabilidad.llaves_de_enlace` | Pregunta a todos | `{ rol }` → `[{ llave, nombre, activo }]` |
| `contabilidad.bases_fiscales_y_contables` | Pregunta a todos (fase 2) | `{ fecha }` → por activo |
| `contabilidad.partida_contabilizada`, `contabilidad.periodo_cerrado`, `contabilidad.periodo_reabierto` | Eventos (al registro, como todos) | Para quien quiera escuchar (avisos al usuario, reportes) |

Escucha `core.eventos_registrados`, `empresas.carga_por_cerrar`, `empresas.carga_por_reabrir`; responde
`empresas.revisar_cierre_de_carga`.

## 9. Permisos, auditoría, errores y configuración

### 9.1 Permisos (PLAN §3.5)

| Recurso | Permisos |
|---|---|
| Inicio | `contabilidad.inicio.ver`, `.editar` |
| Cuentas | `contabilidad.cuentas.ver`, `.crear`, `.editar` (inactivar y reactivar), `.eliminar`, `.importar`, `.exportar` |
| Enlaces | `contabilidad.enlaces.ver`, `.editar`, `.importar`, `.exportar` |
| Partidas | `contabilidad.partidas.ver`, `.crear` (y editar o eliminar su borrador), `.contabilizar`, `.aprobar`, `.aprobar-propias`, `.anular`, `.reversar`, `.en-cuentas-de-control` |
| Hechos | `contabilidad.hechos.ver`, `.reprocesar` (también regenerar un período) |
| Períodos | `contabilidad.periodos.ver`, `.cerrar` (también el ejercicio), `.reabrir` |
| Impresión | `contabilidad.impresiones.ver`, `.imprimir` (definitiva con folio), `.anular` |
| Reportes | `contabilidad.reportes.ver`, `.exportar` |

Sin `recursosConAlcance`. Ver una partida no da derecho a llevarse el Diario entero (exportar aparte).

### 9.2 Auditoría (en la unidad de trabajo; `core.auditoria` solo se agrega)

| Caso de uso | `recurso` | `accion` | `anterior` |
|---|---|---|---|
| Inactivar, reactivar, eliminar cuenta | `contabilidad.cuentas` | `inactivar` / `reactivar` / `eliminar` | DTO de la cuenta |
| Cambiar naturaleza, tipo, rubro o flujo de una cuenta con líneas | `contabilidad.cuentas` | `corregir` | DTO anterior |
| Cambiar o quitar un enlace | `contabilidad.enlaces` | `corregir` / `quitar` | Enlace anterior |
| Eliminar borrador | `contabilidad.partidas` | `eliminar` | Partida con líneas |
| Anular, cancelar por hecho, reversar | `contabilidad.partidas` | `anular` | Partida con líneas; motivo (o el evento que la canceló) |
| Aprobar la propia (`aprobar-propias`) | `contabilidad.partidas` | `autorizar` | Partida |
| Cerrar y reabrir período; cerrar ejercicio | `contabilidad.periodos` | `cerrar` / `reabrir` | Revisión y saldos por cuenta; motivo |
| Regenerar período | `contabilidad.partidas` | `anular` | Lista de partidas anuladas |
| Anular impresión | `contabilidad.impresiones` | `anular` | Impresión |
| Cambiar fecha de inicio contable | `contabilidad.inicio` | `corregir` | Inicio anterior |
| Registrar una habilitación nueva de folios | `contabilidad.folios` | `corregir` | Habilitación anterior (resolución, rango, último folio) |
| Cambiar el marco de un ejercicio (CT-9) | `contabilidad.marcos` | `corregir` | Fila anterior |

Permanentes: `contabilidad.partidas`, `.periodos`, `.cuentas`, `.enlaces`, `.impresiones`, `.inicio`, `.folios`, `.marcos`.

### 9.3 Errores nuevos

`DatoInvalido`: `codigo_fuera_de_la_mascara`, `partida_descuadrada`, `linea_sin_auxiliar`, `fecha_futura`.
`ReglaDeNegocioInfringida`: `periodo_contable_cerrado` (el veto, con el período y «reabra el período o anule con
inverso»), `periodo_definitivo`, `cuenta_no_es_de_detalle`, `cuenta_inactiva`, `cuenta_con_movimientos`,
`cuenta_de_control_sin_permiso`, `mes_anterior_abierto`, `solo_se_reabre_el_ultimo`, `aprobar_la_propia`,
`partida_ya_reversada`, `tipo_no_permitido_en_el_periodo_13`, `contabilidad_sin_iniciar`, `carga_inicial_abierta`
(caso b), `revision_cambio` (huella); tras la validación 2026-11-19: `partida_sin_respaldo` (P-1),
`puente_de_apertura_sin_cuadrar` (P-4), `folios_habilitados_insuficientes` (P-7), `marco_con_partidas_en_el_ejercicio`
(P-6). Del procesamiento (quedan en el hecho, no llegan al usuario del otro módulo):
`falta_enlace`, `version_no_soportada`, `comision_con_factura`.

### 9.4 Configuración (solo `empresa` e `instalacion`)

| Clave | Nivel | Por omisión | Para qué |
|---|---|---|---|
| `contabilidad.marco_por_omision` | instalación | `niif_pymes` | CT-P9: el marco de la empresa ya no es variable sino la tabla `marcos` con vigencia por ejercicio (§5.11b); esta variable solo rige sin fila |
| `contabilidad.partidas.requieren_aprobacion` | empresa | `false` | CT-P12 |
| `contabilidad.diario.modo_de_impresion` | empresa | `detallado` | CT-P14 (se elige al imprimir) |
| `contabilidad.bancos.comisiones_con_factura` | empresa | `por_libro_de_compras` | CT-P15 |
| `contabilidad.isr.tasa_utilidades` | instalación | `25` | Diferido (fase 2) |
| `contabilidad.plantillas.disponibles` | instalación | todas | Qué plantillas ofrece la instalación |

## 10. API (todas con `proteger({ permiso })`; dinero como texto)

| Método y ruta | Permiso |
|---|---|
| `GET/PUT /contabilidad/inicio`, `GET /contabilidad/plantillas` | `inicio.*` |
| `GET/POST /contabilidad/cuentas` (árbol o lista con filtros), `PUT …/:id`, `POST …/:id/inactivar`, `/reactivar`, `DELETE …/:id`; `GET …/exportar`, `…/plantilla`, `POST …/importar` | `cuentas.*` |
| `GET /contabilidad/enlaces` (roles de los módulos activos con su enlace), `GET …/llaves/:rol`, `PUT …/:rol` (`{ llave, cuentaId }`), `DELETE …/:id`; exportar e importar | `enlaces.*` |
| `GET /contabilidad/partidas` (filtros: fechas, tipo, estado, cuenta, tercero, origen, texto), `GET …/:id` | `partidas.ver` |
| `POST /contabilidad/partidas`, `PUT …/:id`, `DELETE …/:id` (borrador) | `partidas.crear` |
| `POST …/:id/enviar`, `/aprobar`, `/devolver`, `/contabilizar`, `/anular`, `/reversar`; `POST …/:id/respaldo` | Su permiso |
| `GET /contabilidad/partidas/por-documento?modulo=&documentoId=` (la partida de un documento, para enlazar desde otras fichas) | `partidas.ver` |
| `GET /contabilidad/hechos` (estado, nombre, fechas), `POST …/reprocesar`, `POST /contabilidad/periodos/:ejercicio/:mes/regenerar` | `hechos.*` |
| `GET /contabilidad/periodos`, `GET …/:ejercicio/:mes/revision`, `POST …/cerrar` (con huella y motivo), `POST …/reabrir` (`{ motivo }`), `POST /contabilidad/ejercicios/:ejercicio/cerrar` | `periodos.*` |
| `GET /contabilidad/impresiones`, `POST …` (libro, rango, modo), `GET …/:id/pdf`, `GET …/:id/anexo`, `GET …/:id/constancia`, `POST …/:id/anular`, `GET/PUT /contabilidad/folios/:libro` (último folio y habilitación) | `impresiones.*` |
| `GET /contabilidad/marcos`, `PUT /contabilidad/marcos/:ejercicio` (CT-9) | `inicio.ver` / `inicio.editar` |
| `GET /contabilidad/reportes/<reporte>`, `…/exportar` | `reportes.*` |

## 11. Cliente (`cliente/src/modulos/contabilidad/`)

| Sección | Pantalla | Forma |
|---|---|---|
| Operación | **Partidas** | Lista con tarjetas (número, fecha, tipo, glosa, total, estado, origen) → ficha con líneas y acciones; **Nueva partida** en página con una tabla de líneas editable (cuenta con buscador por código o nombre, debe, haber, auxiliares que pida la cuenta), totales y diferencia siempre a la vista, y «Contabilizar» deshabilitado si no cuadra |
| Operación | **Hechos por contabilizar** | Los `con_error` agrupados por código («Falta enlazar la cuenta bancaria X»: botón que abre el enlace) y «Reprocesar» |
| Operación | **Cierre de mes** | Ejercicio con sus 13 períodos y estado; «Revisar» muestra la lista de control (como EM-2) y «Cerrar» con motivo si hace falta; «Reabrir» con motivo; «Cerrar ejercicio» en el 13 |
| Operación | **Impresión de libros** | Libro (con su nombre legal), rango, modo, folio siguiente, habilitación (resolución y folios que quedan), vista previa (copia) e «Imprimir en definitivo» con confirmación fuerte («los meses quedan definitivos»); aviso de libros atrasados más de 2 meses (P-5); al anular, descarga de la constancia |
| Administración | **Nomenclatura** (con Excel) | Árbol plegable con código, nombre, naturaleza y marcas (detalle, control); ventana de edición con `CamposDeCuenta` |
| Administración | **Enlaces contables** (con Excel) | Por módulo, cada rol con su cuenta; los de llave listan los registros (cuentas bancarias, conceptos, reglas, clases…) con un selector de cuenta; los que faltan, resaltados |
| Administración | **Inicio de la contabilidad** | Fecha, caso, máscara, plantilla, firmantes (representante legal, contador y su registro); en el caso b, vista previa de las aperturas por módulo antes de confirmar; enlace a la partida de apertura; marco por ejercicio (CT-9c); aviso de libros atrasados (P-5) |
| Reportes | §12 | Imprimir (copia) y exportar |

La página solo arma: composables `usarPartidas`, `usarEdicionDePartida`, `usarCierreDePeriodo`, `usarEnlaces`,
`usarNomenclatura`. Lógica pura con pruebas: cuadre y totales de la partida (`edicion-de-partida.ts`), máscara y código
propuesto de la siguiente cuenta hija (`edicion-de-cuenta.ts`), armado del árbol. En otras fichas (pago, documento del
libro, movimiento) un enlace «Ver partida» solo si el usuario tiene `contabilidad.partidas.ver` y el módulo está activo.

## 12. Reportes (sección Reportes: imprimir y exportar)

| Reporte | Contenido | Filtros |
|---|---|---|
| **Libro diario** | Por fecha, aperturas primero y número (V-1): glosa, cuenta, debe, haber; totales; anuladas marcadas | Rango, tipo, modo (detallado o resumido por cuenta y mes; el resumido en definitivo genera el auxiliar de detalle como anexo, CT-P14) |
| **Libro mayor** | Por cuenta: saldo anterior, movimientos, saldo | Cuenta o rango de códigos, nivel, rango de fechas |
| **Balance de comprobación** (sumas y saldos) | Por cuenta y nivel: saldo inicial, debe, haber, saldo final; cuadre | Fecha de corte, nivel |
| **Libro de Inventarios** (nombre legal, V-6) | Inventario inicial y, por año, balance detallado por cuenta; firmas del representante y del contador | Ejercicio |
| **Balance general** (situación financiera) | Por rubro y corriente/no corriente, con comparativo del año anterior | Corte |
| **Estado de resultados** | Por rubro, con comparativo; utilidad antes y después del ISR | Rango |
| **Estado de cambios en el patrimonio** | Capital, reservas, resultados acumulados, resultado del ejercicio, ajustes | Ejercicio |
| **Flujo de efectivo (indirecto)** | Resultado + partidas sin efectivo + variaciones por `clase_de_flujo` | Rango |
| **Auxiliar por tercero** | Movimientos y saldo por tercero en cuentas que lo piden (Proveedores…) | Cuenta, tercero, corte |
| **Cuadraturas** | La lista del último cierre o al vuelo, con diferencias | Corte |
| **Hechos sin partida** | Los `con_error` y los eventos sin procesar | Rango |
| **Partidas por origen** | Qué partida hizo cada documento de cada módulo | Módulo, rango |

Todos en quetzales, con NIT, nombre y razón social de la empresa en el encabezado (`empresas.obtener_datos_de_empresa`).
Los libros impresos en definitivo pasan por §5.9; la copia dice «COPIA — sin validez de folio». Los estados financieros
forman el **Libro de Estados Financieros** (art. 377: balance de apertura, balances y estados de resultados), llevan los
espacios de firma (art. 374) y el rótulo del marco del ejercicio: «Preparados sobre base fiscal» o «NIIF para las Pymes
(IASB), edición <año>» (§5.11b) [validación 2026-11-19].

## 13. Excel (según la sección del menú)

| Pantalla | Sección | Importar | Exportar |
|---|---|---|---|
| Nomenclatura | Administración | Sí: código, nombre, código del padre, detalle, naturaleza, tipo, rubro, corriente, clase de flujo, monetaria, auxiliares, control, tratamiento fiscal, activa; todo o nada, ensayo, 5,000 filas. Copiar la nomenclatura de otra empresa = exportar de una e importar en la otra | Sí |
| Enlaces contables | Administración | Sí: rol, llave por nombre, código de la cuenta | Sí |
| Inicio (partida de apertura) | Administración | Sí: código de cuenta, debe, haber, tercero (NIT), descripción → una partida de apertura en borrador | Sí |
| Partidas, hechos, cierre, impresión | Operación | No | No |
| Reportes | Reportes | No | Sí |

## 14. Convivencia y riesgos

| # | Tema | Qué pasa | Qué se hace |
|---|---|---|---|
| R-1 | Contabilidad inactiva en la cuenta | No hay veto ni partidas; los eventos quedan en el registro del core | Al activarla (o reactivarla), «Hechos sin partida» muestra los eventos sin procesar desde el inicio; «Reprocesar» los contabiliza (cancelaciones de períodos cerrados → reversa), y «Revisar» el cierre reprocesa antes (§3.7). CT-P16 (b): se puede desactivar con partidas, con un aviso al confirmar en Plataforma (CT-12): «Mientras esté apagada no habrá partidas ni veto, y los libros dejarán de estar al día: el Código Tributario (art. 94 num. 4) multa si las operaciones no se asientan en libros habilitados dentro de los 2 meses siguientes. Al reactivarla se contabiliza lo pendiente» [validación 2026-11-19] |
| R-2 | Error en una regla | El hecho queda `con_error`; el otro módulo no se entera | Punto de guardado (`aislar`); solo los errores esperados de Contabilidad se atrapan; un error inesperado (programación) **sí** deshace la operación, para no esconder fallas (prueba de cada regla con su evento real) |
| R-3 | Tiempo de respuesta | Cada operación suma la inserción del evento y la partida | Una partida son 2–20 líneas; inserción en lote; importar 5,000 filas = 5,000 partidas dentro de la transacción del Excel (se mide en CT-4; si pasa de lo aceptable, la importación difiere la contabilización al reproceso con el hecho `pendiente`) |
| R-4 | Veto que sorprende | Un usuario de Bancos no puede anular sin inverso un cheque de un mes cerrado en Contabilidad | Bancos pregunta antes (`estado_de_la_fecha`) y no ofrece esa forma; el veto es la red de seguridad. Mensaje con el período y qué hacer |
| R-5 | Registro de eventos de todas las empresas | Crece aunque no usen Contabilidad | Un evento por operación (jsonb pequeño); sin índices pesados; se puede depurar lo de empresas sin Contabilidad en el futuro si pesa |
| R-6 | Llaves de enlaces sin llave foránea | Una cuenta bancaria eliminada deja un enlace huérfano | Los módulos inactivan en vez de eliminar; la pantalla muestra «(ya no existe)» con `llave_nombre`; el reproceso de un hecho con llave huérfana usa el enlace sin llave |
| R-7 | Tercero de otra cuenta | La llave a `terceros.terceros` no mira la cuenta | El dominio valida el tercero con RLS de terceros (por cuenta) al crear la línea manual; las automáticas lo traen del evento de la misma cuenta |
| R-8 | Contrato que cambia | Eventos viejos en el registro con otra forma | `version` en cada evento; cada regla declara las versiones que lee; prueba que procesa la v1 y la v2 |
| R-9 | Orden cronológico (art. 373) | El número es por llegada, no por fecha (lo tardío entra con fecha del primer día abierto) | El Diario se ordena por fecha, aperturas primero y número; la fecha contable nunca cae en un período cerrado, así que lo impreso no cambia. No es ilegal, pero las firmas de auditoría lo observan (E-4): el número de Diario en orden de fecha al cerrar el mes lo resuelve **[pendiente P-3]** |
| R-10 | Multimoneda | Hoy todo en GTQ | Columnas de moneda en las líneas desde ya; se llenan con MM-E |
| R-11 | Localidad y departamento | El libro no los tiene por línea | Solo las partidas de Activos fijos (depreciación) y las manuales los llevan en v1; pedirlos en el libro es otra decisión (anotada, §18) |

## 15. Pasos (un commit cada uno; servidor y cliente por separado, con pruebas)

_Actualizada el 2026-11-19 con las respuestas del usuario y la validación del contador. «Espera» son los pasos que deben
estar en `main` antes; «Pendiente» es lo que falta decidir. Un paso sin nada en «Pendiente» se puede programar ya. Lo
pendiente de un paso solo toca la parte que se dice: lo demás del paso se programa con lo ya decidido._

| Paso | Qué | Quién | Espera | Pendiente |
|---|---|---|---|---|
| **CT-0a** | Core: `EventoDominio.id/version`, `core.registro_de_eventos` (migración y RLS de solo agregar), `PublicadorDeEventos` (junto al de hoy, §4.1 «Transición»), aviso `core.eventos_registrados`, contrato de Contabilidad (roles de §3.9 con `isr_sobre_intereses`, `apertura_por_regularizar` e `iva_por_rectificar`; preguntas `estado_de_la_fecha`, `saldos_de_auxiliares`, `llaves_de_enlace`, `bases_fiscales_y_contables`); pruebas de atomicidad (se deshace → no queda), de aislamiento entre empresas y de que fuera de una transacción lanza | backend | — | — (**primer paso**) |
| **CT-0a2** | Mover la publicación dentro de la transacción y al publicador nuevo: Terceros, Empresas, Libro de compras y Cuentas por pagar (mecánico, módulo por módulo; prueba por módulo de que el evento queda en el registro y de que, si se deshace, no queda) | backend | CT-0a | — |
| **CT-0a3** | Igual en Bancos, Caja chica, Cuentas por liquidar y Activos fijos; quitar `PublicadorEventosEnBus` de las compartidas y `PublicadorEventosTrasConfirmar` de las composiciones | backend | CT-0a | — |
| **CT-0b** | Libro de compras: `documento_registrado` v2 (con `documentoAfectado` de las notas, §4.2) y `_anulado` v2 (`fecha`, `causa`, `periodoDeclarado`), `documento_eliminado` con fecha; prueba con los montos reales de un documento con combustible, activo y retenciones, y de una nota de crédito sobre una factura del sistema anterior | backend | CT-0a2 | — |
| **CT-0c** | Bancos: los 7 eventos de §4.3; pruebas por tipo (con y sin origen, intereses, transferencia, anulación con y sin inverso) | backend | CT-0a3 | — |
| **CT-0d** | Cuentas por pagar: destino del faltante (migración, Zod, dominio, evento); cliente: selector al liquidar con la nota de CT-P8 (§4.4) | backend + frontend chico | CT-0a2 | — |
| **CT-0e** | Empresas: avisos `carga_por_cerrar` y `carga_por_reabrir` | backend | — | — |
| CT-0f | Corregir `diseno-cp5-reportes.md` §2.3 (documentación) | arquitecto | — | — |
| **CT-1** | Esqueleto del módulo (`dependeDe: ['terceros']`), `inicios` (con firmantes), `cuentas` (rubros completos de §5.2, `tratamiento_fiscal` nuevo), máscara, disparador de hoja, Excel de cuentas; pruebas de tablas, del disparador y de la API. **Sin plantillas** (van en CT-1p) | backend | — | — |
| CT-1c | Inicio (sin la vista previa del caso b) y Nomenclatura (árbol, ventana, Excel) | frontend | CT-1 | — |
| **CT-2** | `enlaces`, catálogo de roles, pregunta `llaves_de_enlace` (respuestas de Bancos, Libro de compras y Cuentas por pagar), Excel | backend | CT-1, CT-0a | — |
| CT-2c | Enlaces contables | frontend | CT-2 | — |
| **CT-1p** | Plantillas de la instalación (base, IVA general, régimen sobre las utilidades, agente de retención) con las cuentas y los **enlaces sugeridos** por rol; variable `contabilidad.plantillas.disponibles`; sembrado al iniciar | backend | CT-2 | **Plantilla de cuentas del contador** (con la cuenta de cada rol de §3.9) y los artículos de la LAT sobre los intereses |
| **CT-3** | `periodos` (con `definitivo_por`, E-1), `partidas` (con `referencia_de_respaldo`), `lineas_de_partida`, disparadores, correlativo, partidas manuales con aprobación y respaldo, anular y reversar, auditoría permanente; pruebas de los disparadores con SQL directo | backend | CT-1 | **P-1**, solo la regla «respaldo obligatorio en `diario`» (dominio y `partida_al_contabilizar`); sin respuesta se programa el resto y la regla se agrega después |
| CT-3c | Partidas (lista, nueva, ficha) | frontend | CT-3 | P-1 (si el respaldo se marca obligatorio en tipo `diario`) |
| **CT-4** | `hechos`, procesamiento por el aviso con `aislar` y veto, reproceso, reglas del Libro de compras (con E-2 y V-5) y de Cuentas por pagar (con V-4); pruebas de cada regla, de idempotencia, de veto y de reproceso; medición con una importación de 5,000 | backend | CT-0b, CT-0d, CT-2, CT-3 | **P-2**, solo la regla del pago `correccion_de_error` (se programa con la transitoria, que es lo que corrige el contador; si el usuario elige b, cambia una línea de la estrategia) |
| **CT-5** | Reglas de Bancos (con E-3) y pregunta `estado_de_la_fecha` (Bancos y Libro de compras la usan al anular y eliminar) | backend | CT-0c, CT-4 | — |
| CT-5c | Hechos por contabilizar; «Ver partida» en las fichas de otros módulos | frontend | CT-5 | — |
| **CT-6** | Apertura: pregunta `saldos_de_auxiliares` (respuestas de Bancos y Cuentas por pagar), respuesta a `revisar_cierre_de_carga`, avisos de la carga, caso b, Excel de la partida de apertura | backend | CT-0e, CT-4 | — |
| CT-6c | Inicio con vista previa de aperturas | frontend | CT-6, CT-1c | — |
| **CT-7** | Cierre mensual: reproceso al revisar, revisión con cuadraturas y las revisiones nuevas de §3.7, cerrar, reabrir, `saldos_de_periodo`, regenerar período; cierre anual (§3.8, con `definitivo_por = 'cierre_de_ejercicio'`) | backend | CT-5, CT-6 | **P-3** (`numero_de_diario` al cerrar el mes: si es b, va en este paso); **P-5** (aviso de meses abiertos atrasados) |
| CT-7c | Cierre de mes | frontend | CT-7 | P-5 |
| **CT-8** | Reportes: Diario (orden de V-1), Mayor, Balance de comprobación, Auxiliar por tercero, Hechos sin partida, Partidas por origen, Cuadraturas | backend | CT-7 | P-3 (qué número muestra el Diario) |
| CT-8c | Pantallas de esos reportes | frontend | CT-8 | — |
| **CT-9** | Estados financieros con comparativos y rótulo del marco, Libro de Inventarios, flujo indirecto, firmas; tabla `marcos` (§5.11b) | backend | CT-8 | **P-6** (marco por ejercicio) |
| CT-9c | Pantallas de los estados; marco por ejercicio en Inicio | frontend | CT-9 | P-6 |
| **CT-10** | Impresión con folios (PDF, `impresiones`, `folios` con la habilitación, anexo del resumido, constancia de anulación, definitivo, bloqueo por la puente, aviso de libros atrasados) | backend | CT-9 | **P-4**, **P-5**, **P-7**; del contador (no bloquea, según él): texto oficial del art. 382 y canal vigente de la habilitación |
| CT-10c | Impresión de libros | frontend | CT-10 | P-5 |
| CT-11 | Reglas de Caja chica (con V-2), Cuentas por liquidar, Activos fijos y Multimoneda; sus respuestas a `saldos_de_auxiliares` (con `documentos_por_asignar` y los de más de 30 días) y `llaves_de_enlace`; Activos fijos responde `bases_fiscales_y_contables` (aviso de CT-P18) | backend | CT-0a3, CT-4 (las reglas) y CT-7 (cuadraturas y avisos del cierre); los eventos que falten en esos módulos (revisar al empezar) | — |
| CT-12 | Aviso al desactivar Contabilidad en Plataforma (CT-P16, texto de R-1): el módulo declara su aviso y la ventana de confirmación lo muestra | backend + frontend chico | CT-1 | — |
| CT-QA | Punta a punta en el navegador: iniciar → enlazar → factura → pago → anulación → cierre con cuadraturas → reabrir → imprimir; saldos iniciales → cierre de la carga con la puente en cero | pruebas-qa | CT-10c, CT-11 | — |
| CT-14 | Fase 2: impuesto diferido | backend y frontend | CT-9 | Diseño propio |

**Orden sugerido**: CT-0a primero (destraba todo lo que publica). En paralelo y sin bloqueos: CT-0e, CT-0f y la cadena
CT-1 → CT-2 → CT-3 (no dependen de CT-0). Después de CT-0a: CT-0a2 y CT-0a3 en paralelo; luego CT-0b, CT-0c y CT-0d.
CT-4 junta las dos ramas. CT-1p entra en cuanto el contador entregue la plantilla (antes de CT-QA y de ofrecer el módulo:
sin plantilla, la nomenclatura se crea a mano o por Excel).

## 16. Preguntas para el usuario

_Respondidas el 2026-11-19: el usuario aceptó todas las recomendaciones (ver «Respuestas del usuario (2026-11-19)»)._

| # | Pregunta | Opciones | Recomendación |
|---|---|---|---|
| CT-P1 | ¿De qué depende el módulo y quién ve qué? | a) De nada; b) de **Clientes y proveedores** (`terceros`), sin alcance por registro; c) de Bancos, Libro de compras y Cuentas por pagar | **b**: el auxiliar por tercero lleva llave a terceros; depender de los demás obligaría a activarlos todos. Quien entra a Contabilidad ve toda la de la empresa |
| CT-P2 | ¿Cómo llegan los hechos? (dictamen 3) | a) Suscriptor del bus; b) aviso dentro de la transacción; c) registro de eventos en el core + aviso + reproceso | **c** (§3.2): no se pierde nada y el veto sale para todos |
| CT-P3 | ¿Cómo nace la nomenclatura? (dictamen 1) | a) Una plantilla; b) plantillas por régimen (base + IVA general + sobre las utilidades + agente de retención), las de rubro con su módulo; c) desde cero o Excel | **b**, con Excel y «copiar de otra empresa» por Excel; máscara de 4 a 6 niveles, 5 por omisión |
| CT-P4 | Factura con fecha en un mes cerrado (dictamen 2) | A primer día abierto; B bloquear; C mes cerrado | **A** |
| CT-P5 | ¿Desde cuándo lleva contabilidad una empresa que ya usaba Arrancar? | a) Siempre desde su fecha de inicio (reprocesando todo); b) desde una fecha posterior con apertura por saldos de los auxiliares; c) las dos, a elegir | **c** (§3.6); a solo si el registro de eventos ya existía en esa fecha |
| CT-P6 | Puente de apertura distinta de cero al cerrar la carga | a) Bloquear; b) pedir motivo (como las demás diferencias de EM-2) | **b**, con la diferencia por módulo a la vista |
| CT-P7 | ¿Proveedores en una cuenta o por categoría? | a) Una; b) por categoría de proveedor (local, exterior, activos…) | **b** opcional: sin enlace por categoría, la de omisión |
| CT-P8 | Faltante de retiros y de caja chica (dictamen 9) | Lo decide quien liquida / el contador después | **Quien liquida**, y viaja en el evento (CT-0d) |
| CT-P9 | Marco contable (dictamen 10) | NIIF para las Pymes / base fiscal | Interruptor por empresa, **NIIF Pymes** por omisión (con Activos fijos en «contable = fiscal» no cambia nada hasta que difieran) |
| CT-P10 | Períodos (dictamen 12) | 12 / 12 + período 13 | **Con el 13** |
| CT-P11 | Reabrir (dictamen 13) | Cualquiera con permiso / con permiso y motivo / nunca después de imprimir | **Permiso y motivo**, solo el último cerrado, **nunca** definitivo (impreso o ejercicio cerrado) |
| CT-P12 | Aprobación y cuentas de control (dictamen 14 y 7) | Aprobación: sin / opcional por empresa. Control: prohibidas / con permiso y marcadas / libres | Aprobación **opcional, apagada**; control **con permiso y marcadas** |
| CT-P13 | ¿El cierre de mes bloquea con diferencias? (dictamen 15) | Bloquea / avisa y pide motivo | **Avisa y pide motivo** |
| CT-P14 | Diario impreso (dictamen 5) | Por documento / resumen por módulo y día / resumen mensual con auxiliares | Guardar siempre el detalle y elegir **al imprimir** entre detallado y resumido mensual (que lo confirme el contador de la empresa) |
| CT-P15 | Comisiones del banco con FEL (dictamen 8) | a) Por Libro de compras; b) por Bancos sin crédito; c) la empresa elige | **c** con **a** por omisión (variable de empresa) |
| CT-P16 | ¿Se puede desactivar Contabilidad con partidas? | a) No; b) sí, con aviso, y al reactivarla se reprocesa | **b**: el registro del core evita los huecos; el aviso explica que lo de mientras no tendrá veto |
| CT-P17 | Momento del gasto de caja chica (dictamen 6, V-1 de Caja chica) | Al asignar / al reponer | **Al asignar**, con la transitoria «Documentos por asignar» (§7) |
| CT-P18 | ¿Impuesto diferido en v1? (dictamen 11) | En v1 / fase 2 | **Fase 2** (CT-14), anual con trimestral opcional |

## 17. Para validar con el contador antes de programar

_Validado el 2026-11-19: `dictamen-contabilidad-validacion-2026-11-19.md`, «correcto con ajustes»._

| # | Punto | Propuesta del diseño | Resultado | Dónde quedó |
|---|---|---|---|---|
| V-1 | Saldos iniciales de los módulos por la pregunta al cerrar la carga, no como hechos (§3.6) | Mismas partidas, sin evento de saldo inicial | **Correcto**; ajuste menor: aperturas primero en el Diario | §3.6, §12, R-9 |
| V-2 | Transitoria «Documentos por asignar» para lo que va a Caja chica y Cuentas por liquidar (§7) | Gasto en la fecha de efecto; al asignar pasa al fondo | **Correcto con ajustes**: dirección al asignar, presentación neta, cuadratura y antigüedad | §7, §5.2, §3.7, §4.6 |
| V-3 | Período «futuro» reemplazado por meses abiertos y manuales sin fecha futura (§3.5) | Igual efecto | **Correcto** (el contador retira el estado «futuro») | §3.5 |
| V-4 | `correccion_de_error` del pago contra «Ajustes de ejercicios anteriores» por omisión | Evita hechos con error por falta de cuenta | **Corregido**: transitoria `apertura_por_regularizar` que el contador regulariza | §3.6, §3.7, §3.8, §3.9, §7; confirmación en P-2 |
| V-5 | Anulación del libro por `error_de_captura` en período cerrado: reversa al primer día abierto (sin veto) | El libro ya decidió anular | **Correcto con ajustes**: `iva_por_rectificar` con el período declarado y `ajustes_de_ejercicios_anteriores` con el ejercicio cerrado | §3.4, §3.7, §3.9 |
| V-6 | C. Com. arts. 36 y 374 a 382, C. Trib. art. 112 y la habilitación | Antes de CT-10 | **Verificado casi todo**: nombres legales de los libros, firmas, datos de la habilitación, constancia de la hoja anulada, aviso de los 2 meses (art. 94 num. 4). **Pendiente del contador**: texto oficial del art. 382 y canal vigente de la habilitación (no bloquea CT-10) | §0, §3.8, §5.1, §5.9, §12 |
| V-7 | Rubros de §5.2 y la plantilla base de 5 niveles | Lista del contador antes de CT-1 | **Lista corregida** (rubros y tratamientos nuevos). **Pendiente del contador**: la plantilla con sus cuentas | §5.2; plantilla en CT-1p |

Además, el contador encontró E-1 (check de `periodos`, §5.4), E-2 (nota de crédito sin depender del régimen, §7), E-3 (ISR
sobre intereses es gasto, §3.9 y §7) y E-4 (número de Diario, P-3), y matizó CT-P4, CT-P6, CT-P8, CT-P9, CT-P14, CT-P16 y
CT-P18 (incorporados donde se dice en cada sección). **[matiza el dictamen]**: el contador pidió la plantilla «antes de
CT-1»; el arquitecto la separa en CT-1p porque las tablas de CT-1 solo necesitan la lista de rubros, que ya está completa,
y así CT-1 no espera. Sin plantilla, la nomenclatura se crea a mano o por Excel.

## 18. Pendientes que este diseño deja anotados

- Localidad y departamento por línea del Libro de compras (centro de costo de los gastos): decisión del usuario aparte.
- Flujo directo con los conceptos de Bancos, cuando se resuelva la limitación de Caja chica §8.
- Período fiscal especial (LAT art. 37), notas a los estados financieros, conciliación de la renta, costo de producción.
- Cuentas por cobrar y Ventas, Planilla e Inventarios: sus eventos y roles cuando se diseñen.
- Depurar el registro de eventos de empresas sin Contabilidad, si llega a pesar (R-5).
- **Del contador** (2026-11-19): la plantilla de cuentas con la cuenta sugerida de cada rol (antes de CT-1p); los artículos
  exactos de la LAT sobre la tasa y la retención definitiva de los intereses (antes de la plantilla); el texto oficial del
  C. Com. art. 382 y el canal vigente de la habilitación SAT frente a la autorización del Registro Mercantil (antes de
  CT-10, sin bloquearlo); la vigencia de la reforma del cálculo de la reserva legal (informativo: es partida manual).
- Las preguntas P-1 a P-7 de abajo.

## Respuestas del usuario (2026-11-19)

- **CT-P1 a CT-P18 (§16):** aceptó **todas las recomendaciones**: depende de Terceros sin alcance por registro (P1 b);
  registro de eventos en el core + aviso + reproceso (P2 c); plantillas por régimen (P3 b); primer día abierto (P4 A); las
  dos formas de inicio (P5 c); puente distinta de cero pide motivo (P6 b); proveedores por categoría, opcional (P7 b); el
  faltante lo decide quien liquida (P8); marco por empresa con NIIF Pymes por omisión (P9); con período 13 (P10); reabrir
  con permiso y motivo, nunca lo definitivo (P11); aprobación opcional apagada y cuentas de control con permiso y marcadas
  (P12); el cierre avisa y pide motivo (P13); Diario detallado o resumido a elegir al imprimir (P14); comisiones con FEL a
  elección de la empresa, por Libro de compras por omisión (P15); se puede desactivar con aviso y se reprocesa al
  reactivar (P16); gasto de caja chica al asignar, con la transitoria (P17); diferido en fase 2 (P18).
- El dictamen del contador sobre §17 (`dictamen-contabilidad-validacion-2026-11-19.md`) no contradice ninguna de estas
  respuestas: sus matices de CT-P6 (impresión), CT-P9 (vigencia por ejercicio) y CT-P16 (no cerrar sin reprocesar) son
  restricciones adicionales. La de CT-P16 la cumple el propio cierre (§3.7: «Revisar» reprocesa antes, y lo que siga con
  error pide motivo, como en CT-P13). Las de CT-P6 y CT-P9 se confirman con P-4 y P-6.

## Preguntas nuevas para el usuario (2026-11-19)

Ninguna bloquea el primer paso (CT-0a) ni CT-1 a CT-2; §15 dice qué parte de qué paso espera cada una.

| # | Pregunta | Opciones | Recomendación | Espera |
|---|---|---|---|---|
| P-1 | ¿Respaldo obligatorio en las partidas manuales? (C. Com. art. 381: toda operación se respalda con documentos, salvo ajustes, traslados y rectificaciones) | a) Opcional siempre; b) obligatorio (archivo o referencia escrita) en tipo `diario`, opcional en ajuste, reclasificación, cierre, corrección y apertura | **b** (contador y arquitecto): la referencia escrita basta, así que no frena a quien no tiene el PDF a mano | CT-3 (una regla) |
| P-2 | Saldo inicial de proveedor corregido después de cerrar la carga (V-4) | a) Transitoria `apertura_por_regularizar` que el contador regulariza; b) patrimonio directo | **a**: la contrapartida depende de la causa (error del año, de años anteriores o condonación, que es ingreso gravado) y una cuenta de patrimonio no tiene cuadratura que la revise | CT-4 (una línea de una regla) |
| P-3 | Numeración del Diario | a) Solo el número al contabilizar (hoy); b) además un número de Diario en orden de fecha que se da al cerrar el mes | **b** si las firmas de auditoría de sus clientes lo piden; si no, **a** (el contador). El arquitecto se inclina por **b**: cuesta una columna y un paso del cierre, y el Diario impreso sale en secuencia | CT-7 y CT-8 |
| P-4 | Con la puente de apertura distinta de cero, ¿se impide imprimir en definitivo el Libro de Inventarios y el de Estados Financieros? (la carga se sigue cerrando con motivo) | Sí / No | **Sí**: firmar un balance de apertura que no cuadra no es «veraz» (arts. 374 y 379); la copia sí se imprime | CT-10 |
| P-5 | ¿Aviso cuando el último mes impreso en definitivo tenga más de 2 meses de atraso, y en el cierre si hay meses abiertos tan atrasados? (C. Trib. art. 94 num. 4: Q5,000) | Sí, solo aviso / Sí, bloqueando / No | **Sí, solo aviso**: es responsabilidad de la empresa | CT-7, CT-10 |
| P-6 | ¿El marco contable (NIIF Pymes o base fiscal) solo cambia para un ejercicio sin partidas, con vigencia por ejercicio? (art. 375: una sola contabilidad) | Sí / No | **Sí** | CT-9 |
| P-7 | (del arquitecto) Si una impresión en definitivo necesita más folios de los que quedan en la habilitación registrada | a) Se rechaza hasta registrar la nueva habilitación; b) solo aviso | **a**: imprimir fuera del rango es imprimir en hojas no habilitadas (C. Trib. art. 85 num. 4 y art. 94 num. 5); si la empresa no registró el rango, no se revisa | CT-10 |
