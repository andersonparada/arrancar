# Diseño de Parcelas — arquitecto de datos, 2026-11-18

_Agente `arquitecto-de-datos`. Base contable, legal y fiscal: `dictamen-parcelas-2026-11-18.md` (contador-guatemala,
mismo día, «correcto con ajustes» sobre el encargo). Aterriza el punto 9 de `docs/HOJA-DE-RUTA.md` («Parcelas primero
(en cada parcela se decide si tendrá ganado o siembra) y después Ganadería y Cultivos»). Lo que el arquitecto no comparte
del dictamen, o que el código ya resolvió de otra forma, va marcado **[corrige el dictamen]** y pasó a §18._

_**2026-11-19:** el usuario aceptó todas las recomendaciones de PA-1 a PA-19 (§«Respuestas del usuario», al final) y el
contador validó V-1 a V-7 en `dictamen-parcelas-validacion-2026-11-19.md` («correcto con ajustes»). Sus correcciones ya
están en el texto, marcadas **[V-n]** o **[C-n]**; lo que el contador dejó por confirmar va marcado **(pendiente)** y
está en §18.1. Sus cuatro preguntas son PA-20 a PA-23 (§17.1). La tabla de pasos (§16) dice de qué depende cada uno._

Parcelas es un **módulo de rubro** (agrícola y ganadero), pero **no supone régimen** de IVA o ISR ni que la empresa sea
agente de retención: no calcula impuestos (dictamen §5). Lo único que saca de Parcelas para que sirva a **cualquier
rubro** es el **inmueble registral** (finca, folio, libro, matrícula fiscal), que una oficina o una bodega también tiene:
va al módulo esencial `empresas` (PA-1 c, §4.1).

**Ya decidido y que no se vuelve a preguntar:**

| Tema | Decisión | Fuente |
|---|---|---|
| Orden | Parcelas antes de Ganadería y Cultivos; son módulos de rubro y los generales no dependen de ellos | `HOJA-DE-RUTA.md` punto 9 |
| Raíz del árbol | La finca (o sede) es una **localidad** de Empresas; el árbol es localidad → parcela → subparcela (Composite de `PLAN.md` §3.8) | `plan-hallazgos-contables.md` (tabla de localidades, «Finca = localidad raíz del árbol finca → potrero → parcela») |
| Localidad ≠ terreno | Las localidades **no** son los terrenos ni las parcelas: «módulo propio más adelante» | `plan-hallazgos-contables.md` (H5 tipos) |
| Alcance por localidad | `ALCANCE_DE_LOCALIDADES` (`empresas.accesos_a_localidades`, permiso `empresas.localidades.ver-todas`) ya filtra lo que ve un encargado | `empresas/infraestructura/persistencia/alcance-de-localidades.ts` |
| Terreno con costo | El costo del terreno vive en Activos fijos (clase Terrenos, sin depreciar) | `diseno-activos-fijos.md` §5.1; dictamen AF art. 26 |
| Llaves entre esquemas | Solo hacia `core`, módulos esenciales (`empresas`) y el `dependeDe` directo o transitivo | `PLAN.md` §3.2; `llaves-entre-esquemas.prueba.ts` |
| Configuración | Solo niveles empresa e instalación, declarada en el `modulo.ts` | Encargo |

## 0. La propuesta en una página

- **Un módulo nuevo**, `parcelas` (esquema `parcelas`), con `dependeDe: ['terceros']` (la contraparte de un contrato es
  un tercero de Clientes, PA-9). No depende de Libro de compras, Activos fijos, Bancos ni Cuentas por pagar, y no se
  importa con ningún módulo.
- **Fuera del módulo, en Empresas** (pasos PA-0a y PA-0b): el catálogo de **inmuebles registrales**
  (`empresas.inmuebles`) con su historial de **valores**, en dos series: matrícula fiscal y catastro municipal
  (`empresas.valores_de_inmueble`, **[V-2]**). Es el dato único que piden el IUSI, Parcelas y el tope de la base fiscal
  de Activos fijos (art. 26). Activos fijos apuntará al inmueble en lugar de guardar su propio `valor_de_matricula`
  (§4.2, **AF-P23**; AF-2 ya está programado con esas columnas, así que hace falta una migración de Activos fijos).
- **La parcela** (potrero, lote, tablón…) cuelga de una localidad y opcionalmente de otra parcela (hasta 3 niveles,
  PA-7). **No lleva dinero** (dictamen §1.2). Guarda su superficie en **m²** con un **historial de mediciones** que
  conserva la cifra y la unidad originales (manzanas, cuerdas de N varas, hectáreas…), separa la superficie **total** de
  la **útil**, un punto en el mapa (PA-6 b) y las colindancias por rumbo.
- **Parcela ↔ inmueble registral es N:M** (PA-2 b), con la porción opcional de cada finca registral.
- **Períodos de uso** sin traslape (restricción de exclusión, como las vigencias de combustible): pastoreo, cultivo
  anual, cultivo permanente, plantación forestal, bosque, conservación, infraestructura, cedida a terceros, sin uso,
  otro. Cambiar de bosque, plantación forestal o conservación a otro uso **avisa** de la licencia del INAB **[V-5]**.
- **Contratos de tenencia** (PA-3 b): arrendamiento, usufructo, comodato, aparcería o medianía, con la empresa del lado
  que recibe o que otorga, la renta en **dinero o en especie** (cantidad o porcentaje de la cosecha, PA-4 b), quién paga
  el IUSI y el aviso de **inscripción** (CC arts. 1125 y 1576). Generan un **calendario de rentas** informativo. Parcelas
  **no calcula impuestos ni registra pagos**: la factura y el pago van por Libro de compras y Cuentas por pagar (o
  Ventas, cuando exista).
- **Para Ganadería y Cultivos**: órdenes del mediador «parcela en una fecha» (superficie útil y uso vigentes) y avisos
  antes de inactivar una parcela, cerrar un uso o reducir la superficie, que esos módulos usarán para impedir lo que
  rompa sus ciclos u ocupaciones. Sus atributos propios (pasto, agua, cerca) los aportan como **sección** del
  formulario de la parcela, con el mismo mecanismo de `secciones.contratos.ts` que ya usan Empresas y Proveedores.
- **Fuera de v1**: polígonos GeoJSON e importación desde GTM y KML (v2, PA-6 c), cálculo del IUSI (PA-8 a), costos por
  parcela (los llevarán Cultivos y Ganadería, PA-10), colindancia con la parcela vecina como llave.

## 1. Lo encontrado en el código y la base (verificado contra `main` el 2026-11-18)

1. **Módulos instalados**: `core`, `empresas` (esencial), `terceros` (`dependeDe: []`), `bancos`, `libro-de-compras`
   (`['terceros']`), `cuentas-por-pagar`, `caja-chica`, `cuentas-por-liquidar`. ~~Activos fijos no está programado~~
   **Revisado el 2026-11-19:** también están `activos-fijos` (AF-1, AF-2 y AF-2c ya en `main`), `inventarios` y
   `multimoneda`. La migración `activos_fijos/0002_af2_activos_y_traslados` **ya creó** `valor_de_matricula`,
   `valor_catastral` y `valores_del_inmueble_completo` en `activos_fijos.activos` (con los checks
   `activos_valores_del_inmueble` y `activos_inmueble_completo`), y `CamposDeActivo` los pide en edificios: el riesgo R-6
   ya ocurrió. Por eso AF-P23 (§4.2) necesita una migración nueva de Activos fijos y un cambio de su pantalla. La base de
   desarrollo tiene 0 activos y no hay nada en producción (`DONDE-QUEDAMOS.md`): no hay datos que convertir.
   La migración `empresas/0013` ya la tomó `0013_nombres_de_ubicaciones` (AF-P22): los inmuebles van en la `0014`.
2. **No existe `core.localidades` ni `core.areas`** **[corrige el dictamen §1.3 y §1.5]**: las localidades son
   `empresas.localidades` y las «áreas» son `empresas.departamentos` (unidades internas, de toda la empresa o de una
   localidad). Los dos tienen su único `(id, empresa_id)` como destino de llaves compuestas.
3. **«Localidad de tipo finca» no se puede reconocer en la base** **[corrige el dictamen §1.3]**: `empresas.tipos_de_localidad`
   es un catálogo **editable por empresa** sin clave de sistema (semilla: Finca, Planta, Beneficio, Tienda, Taller,
   Bodega, Oficina). Parcelas acepta **cualquier localidad** y el formulario muestra primero las del tipo «Finca» solo
   como comodidad; amarrarlo al nombre del tipo se rompe en cuanto la empresa lo renombre.
4. **Alcance por localidad**: `politicaPorAlcance(ALCANCE_DE_LOCALIDADES, 'localidad_id')` (columna obligatoria) y
   `politicaPorAlcanceOpcional` (nula = la ven todos) ya existen en `core/base-datos/alcance.ts`; `departamentos` usa la
   opcional. El permiso «ver todas» se llama `empresas.localidades.ver-todas`.
5. **Restricción de exclusión**: la base ya tiene `btree_gist` y Libro de compras la usa
   (`0004_l2_vigencias_sin_traslape.sql`, `0025_l5_folios_sin_traslape.sql`, migraciones `--custom` porque drizzle-kit
   no sabe escribirlas).
6. **Terceros** es de la **cuenta** (`terceros.terceros`, `politicaPorCuenta()`); Cuentas por liquidar ya apunta a
   `terceros.id` desde una tabla por empresa y el dominio exige que el tercero sea de la cuenta de la empresa.
7. **Monedas**: `core.monedas (codigo char(3))`. **Geografía**: `core.departamentos` y `core.municipios`
   (`(departamento_codigo, codigo)`), que ya usan las localidades.
8. **Mediador**: `ordenar`, `avisar` y `preguntarATodos` (EM-2); salta a los módulos inactivos de la cuenta. La pregunta
   `empresas.revisar_cierre_de_carga` admite respuesta `null` («nada que decir»). El aviso
   `empresas.empresa_guardada` lleva `secciones` (`SeccionesAportadas`) para que otros módulos guarden la suya.
9. **Auditoría**: `AccionAuditada` tiene `eliminar`, `inactivar`, `reactivar`, `anular`, `cerrar`, `corregir`,
   `reabrir`, `adjuntar`, `quitar`, `asignar`, `cambiar_vencimiento`… (no hay `terminar`: se usa `cerrar`).
   `core.recursos_de_auditoria_permanente` es el catálogo de recursos que no se depuran.
10. **Archivos**: `core.archivos` (imagen o PDF revisado con qpdf) con `recurso_dueno`.
11. **PostGIS no está disponible**: la imagen es `postgres:16-alpine` (desarrollo y producción) y
    `pg_available_extensions` no lo lista. Extensiones instaladas: `plpgsql`, `pg_trgm`, `btree_gist`.
12. **Base de desarrollo (solo leída)**: 7 tipos de localidad, 1 localidad (tipo Oficina), 0 departamentos. No hay datos
    que convertir.

## 2. Alcance

| Entra en v1 | No entra (y dónde va) |
|---|---|
| Inmuebles registrales (en Empresas): inscritos y posesorios, matrícula fiscal, historial de valores de matrícula y de catastro, categoría del IUSI (Decreto 18-2026), titularidad | Cálculo del IUSI (PA-8 a): solo datos y el reporte «Inmuebles y valores» |
| Parcelas en árbol bajo una localidad, con tipo, superficie total y útil, mediciones con la cifra original, punto en el mapa, colindancias | Polígonos, GTM, KML (v2, PA-6 c, §16) |
| Parcela ↔ inmueble N:M con la porción | Valor del terreno: Activos fijos (la parcela no lleva dinero) |
| Períodos de uso sin traslape, con licencia del INAB opcional | Ciclos, siembras, cosechas, rendimientos: **Cultivos** |
| Contratos de tenencia (recibidos u otorgados) con renta en dinero o especie, IUSI a cargo, inscripción, archivo | Ocupación de potreros, carga animal, rotación, pasto: **Ganadería** |
| Calendario de rentas informativo (por vencer, vencidas, marcadas como documentadas) | Factura, retención y pago de la renta: Libro de compras y Cuentas por pagar; cobro: Ventas / Cuentas por cobrar (futuros) |
| Reportes de superficie, usos, contratos, rentas, inmuebles; Excel de lo administrativo | Costos por parcela (PA-10): Cultivos y Ganadería; partidas: Contabilidad |

## 3. Modelo

### 3.1 Qué es cada cosa

| Concepto | Qué es | Dónde vive |
|---|---|---|
| **Inmueble** | Unidad jurídica: una finca registral inscrita (registro, número, folio, libro, departamento) o un inmueble poseído sin inscribir (documento de derechos posesorios). Tiene titularidad, matrícula fiscal y código catastral | `empresas.inmuebles` |
| **Valor del inmueble** | El valor vigente desde una fecha según su **fuente** (matrícula fiscal o catastro municipal, una serie por fuente, **[V-2]**), con su origen (avalúo o declaración), separado en terreno, construcciones y cultivos permanentes; el de matrícula lleva la categoría del IUSI (PA-21) | `empresas.valores_de_inmueble` |
| **Tipo de parcela** | Catálogo por empresa: Potrero, Lote, Tablón, Cuadro, Parcela… (PA-11) | `parcelas.tipos_de_parcela` |
| **Parcela** | Unidad de manejo bajo una localidad, con madre opcional | `parcelas.parcelas` |
| **Medición** | La superficie total y útil desde una fecha, con su fuente y la cifra original | `parcelas.mediciones` |
| **Porción registral** | Qué inmueble (o inmuebles) abarca la parcela y cuántos m² de cada uno | `parcelas.parcelas_de_inmuebles` |
| **Período de uso** | Uso de la parcela entre dos fechas | `parcelas.usos` |
| **Contrato de tenencia** | Arrendamiento, usufructo, comodato, aparcería… sobre una o varias parcelas de una localidad | `parcelas.contratos`, `parcelas.parcelas_de_contratos` |
| **Cuota de renta** | Lo que se espera pagar o cobrar en una fecha según el contrato | `parcelas.cuotas_de_renta` |

### 3.2 La jerarquía (Composite)

```
localidad (empresas.localidades: «Finca El Carmen»)
 ├─ parcela nivel 1 («Potrero 1», «Lote Norte»)
 │   ├─ parcela nivel 2 («Lote Norte – Tablón A»)
 │   │   └─ parcela nivel 3
 │   └─ …
 └─ …
```

- La localidad es el nivel 0 y **no** se copia en Parcelas. Una parcela de nivel 1 no tiene madre; las demás, sí, y
  siempre de la **misma localidad** (la llave compuesta lo garantiza, §5.3).
- **Tope de niveles** en configuración de instalación (`parcelas.jerarquia.niveles_maximos`, 3 por omisión, entre 1 y
  5; PA-7). Con 3 y la localidad, son los 4 del dictamen.
- **No se cambia la madre** de una parcela en v1 (ni la localidad): mover una rama recalcula niveles, puede romper el
  tope y cambiaría el alcance de lo que ya registraron Ganadería y Cultivos. Para reorganizar se inactiva y se crea
  otra (PA-12). Así no hay ciclos posibles: la madre siempre existe antes que la hija.
- **Superficie de la madre**: la suma de la superficie total de las hijas activas que pase la de la madre es un
  **aviso, no un bloqueo** (dictamen §2). Una madre sin medición propia muestra la suma de sus hijas.
- **Uso en varios niveles**: se permite, pero los reportes de superficie por uso cuentan solo las **hojas** (parcelas
  sin hijas activas) para no contar dos veces; si una madre con hijas tiene uso vigente, la ficha lo avisa.

### 3.3 Superficie y unidades (dictamen §2)

- **Se guarda en m²** (`numeric(14,2)`); en el código, en **centésimas de m²** enteras (como los centavos). Hectáreas,
  manzanas, cuerdas y varas cuadradas solo se muestran.
- **Cada medición guarda la cifra y la unidad originales** (`cantidad_original numeric(16,4)`, `unidad_original`) y,
  si la unidad es la cuerda, **las varas por lado que se usaron**. Cambiar después la configuración de la cuerda no
  altera las mediciones ya guardadas.
- **Conversión** (dominio puro `dominio/superficie.ts`, con pruebas): `m² = cantidad × factor`, con factores de
  configuración de instalación (§10.4): metros por vara (0.835905), varas cuadradas por manzana (10,000) y **varas
  cuadradas por caballería (645,816 = 64.5816 mz ≈ 45.1256 ha; no 64.58, [V-1], PA-23)**. Las tres unidades grandes se
  convierten con la misma base, la vara². Cuerda = `(varas por lado)² × m² por vara²`. Redondeo al centésimo de m², mitad
  hacia arriba.
- **Varas por lado de la cuerda**: configuración de **empresa** (`parcelas.unidades.varas_por_lado_de_cuerda`, 25 por
  omisión) y, si se aprueba PA-5 c, una excepción **por localidad** en una tabla propia del módulo (la configuración
  por niveles no tiene el nivel «localidad», y Empresas no debe cargar una columna de un módulo de rubro).
- **Total y útil**: `superficie_util_m2 <= superficie_total_m2` (check). La útil es la que se puede pastorear o sembrar
  (descuenta caminos, quebradas, construcciones).

### 3.4 Tenencia

Dos datos distintos que el encargo mezclaba:

1. **Cómo tiene la empresa la parcela** (`parcelas.forma_de_tenencia`): `propia`, `posesion` (propia sin inscribir),
   `copropiedad`, `arrendada`, `usufructo`, `comodato`, `aparceria`, `otra`. Es un dato de la parcela, editable.
2. **Los contratos** (§3.5): pueden ser **recibidos** (la empresa es arrendataria, usufructuaria, comodataria o aparcera)
   u **otorgados** (la empresa cede su parcela a un tercero). Una parcela `arrendada` sin contrato recibido vigente
   lleva un aviso en la ficha y en el reporte; no se bloquea (puede ser un contrato verbal que se registra después).

La **propiedad registral** no está en la parcela: está en el inmueble (`titularidad`: `propia`, `copropiedad`,
`de_tercero`). Una parcela arrendada se puede ligar al inmueble del arrendador (titularidad `de_tercero`) si la
empresa quiere guardar la finca registral sobre la que está inscrito el arrendamiento.

### 3.5 Contratos de tenencia y calendario de rentas (PA-3 b, PA-4 b)

- **Clase**: `arrendamiento`, `usufructo`, `comodato`, `aparceria` (incluye medianía), `otro`. **Lado**: `recibido` u
  `otorgado`. **Contraparte**: un tercero de Clientes (arrendador o arrendatario). **Localidad**: una sola; sus parcelas
  deben ser de esa localidad (así el alcance por localidad también protege los montos del contrato, §5.8).
- **Vigencia**: inicio, fin (nulo = indefinido), prórroga automática (sí/no), fecha de terminación anticipada.
- **Renta** (solo en arrendamiento y aparcería; comodato y usufructo gratuitos no la llevan):
  - `dinero`: monto por período, moneda (`core.monedas`, GTQ por omisión) y si el monto **incluye IVA** (informativo,
    para que quien registre la factura sepa qué esperar; Parcelas no lo descompone).
  - `especie_cantidad`: cantidad, unidad (texto: quintales, cargas, arrobas) y producto (texto: maíz, café pergamino).
  - `especie_porcentaje`: porcentaje de la cosecha (la medianía es 50 %) y producto. No genera montos: la cosecha la
    conocerá Cultivos.
  - **Periodicidad**: mensual, bimestral, trimestral, semestral, anual, por cosecha, única.
  - **Renta anticipada**: meses pagados por anticipado al firmar (para el aviso de inscripción).
- **IUSI a cargo de**: `arrendador` (por omisión, CC art. 1901.6, confirmado en V-3) o `arrendatario` (por pacto). Texto
  de ayuda **[C-10]**: «Si lo paga el arrendatario por pacto, en el fondo es parte de la renta (mayor renta del
  arrendador), no un impuesto propio del arrendatario».
- **Documento**: **tipo** (`escritura_publica`, `documento_privado`, `documento_privado_legalizado`, `verbal`; **[V-3]**,
  para el aviso del art. 1576), número, fecha, notario, texto, su archivo (PDF, `core.archivos`) y los datos de
  **inscripción** (inscrito sí/no, fecha, número de inscripción en el registro).
- **Aviso de inscripción** (dictamen §4; CC art. 1125, validado en V-3 con los ajustes **[V-3]**, **[C-5]**). Nunca
  bloquea: no inscribir hace que el contrato no se pueda oponer a terceros, no lo anula. Lo dicen la ficha, la lista y
  el reporte cuando el contrato no está marcado inscrito y:
  - **Usufructo**: siempre (es un derecho real; art. 1125, inc. 1), sin importar el plazo.
  - **Arrendamiento y aparcería** (la aparcería con los umbrales del arrendamiento **(pendiente** de confirmar con un
    abogado; el Código Civil no la regula con nombre propio**)**): `fecha_de_fin >= fecha_de_inicio + 36 meses` (se compara
    **por fecha**; la fecha de fin es el último día del contrato, así que del 1-ene-2026 al 1-ene-2029 son tres años y un
    día y avisa, y al 31-dic-2028 son tres años justos y no; ver §18.1 sobre el `>` del dictamen) o
    `meses_de_renta_anticipada > 12`.
  - **Aviso suave** (PA-22): «Revise si debe inscribirse» cuando el contrato es indefinido, o tiene prórroga automática y
    a la fecha de la consulta ya pasó de `fecha_de_inicio + 36 meses`.
  - **Escritura pública** (art. 1576): si debe inscribirse y `tipo_de_documento` no es `escritura_publica`, el aviso
    añade «Un contrato que debe inscribirse tiene que constar en escritura pública».
  - Comodato y `otro`: sin aviso.
  Los dos umbrales (36 y 12) son configuración de instalación para que soporte los ajuste si el contador cambia el
  criterio.
- **Nota fiscal fija en la ficha** (dictamen §5 y **[V-7]**, **[C-10]**): «Parcelas no calcula impuestos. La renta en
  especie sí tiene efecto fiscal: el arrendamiento es hecho generador del IVA por el valor de lo recibido (Ley del IVA,
  art. 3) y, si la empresa entrega producto como renta, esa entrega es una permuta (art. 3, inc. 1); en ISR la renta se
  grava en dinero o en especie. La renta en porcentaje de la cosecha es renta contingente: se reconoce cuando se conoce
  la cosecha.» En contratos recibidos añade el texto del arrendador sin FEL (R-5).
- **Calendario**: al guardar un contrato con renta periódica se **generan las cuotas** desde el inicio hasta el fin
  (o hasta 24 meses adelante si es indefinido; un proceso al listar extiende el horizonte, como las semillas perezosas).
  Cada cuota: vencimiento, monto o cantidad, estado `pendiente`, `documentada` (alguien marcó que ya llegó la factura o
  se cobró, con una **referencia de texto** opcional: «FEL A-123 del Libro de compras») u `omitida` (con motivo: renta
  condonada, contrato terminado). Editar las condiciones de renta **regenera solo las cuotas pendientes futuras**.
- **Lo que no hace** (dictamen §5): no calcula IVA, ISR ni retenciones; no crea documentos en Libro de compras ni deudas
  en Cuentas por pagar; no registra pagos. El calendario es un **recordatorio** y la base de los eventos (§9). Ligar la
  cuota con el documento del libro **con llave** exigiría `dependeDe: ['libro-de-compras']` (PA-13).

### 3.6 Usos (dictamen §7)

- Lista cerrada (check): `pastoreo`, `cultivo_anual`, `cultivo_permanente`, `plantacion_forestal`, `bosque`,
  `conservacion`, `infraestructura`, `cedida_a_terceros`, `sin_uso`, `otro`. **[amplía el dictamen]**: `plantacion_forestal`
  se separa de `cultivo_permanente` (los incentivos PROBOSQUE y PINPEP y la licencia del INAB la tratan aparte del café o
  el aguacate) y `cedida_a_terceros` marca la parcela otorgada en un contrato (la usan Ganadería y Cultivos para no
  programar nada allí; contablemente puede ser propiedad de inversión, NIIF para las Pymes, Sección 16 **[C-1]**).
  **V-4: correcto.** El uso no decide la clasificación contable: en una aparcería otorgada la empresa puede estar
  participando en la actividad agrícola (Sección 34); eso lo decide Contabilidad.
- `detalle` (texto opcional: «Café», «Pasto estrella», «Pino», «Café con sombra») y `otro` exige detalle. Los sistemas
  agroforestales caben con `detalle` (V-4).
- Períodos **sin traslape** por parcela (exclusión con `daterange(desde, hasta, '[]')`); `hasta` nulo = vigente.
  Abrir un uso nuevo **cierra** el vigente el día anterior, en la misma transacción.
- **Bosque, plantación forestal o conservación → otro uso** **[V-5]**: aviso «Cambiar el uso de una tierra con bosque
  requiere licencia del INAB (Ley Forestal, Decreto 101-96)» (sin citar el artículo al pie de la letra: el texto oficial
  del art. 46 está **(pendiente)**); desde `plantacion_forestal` añade «Si la plantación está registrada o recibió
  incentivos (PROBOSQUE, PINPEP), revise sus compromisos con el INAB: puede tener que devolver el incentivo». Campo
  opcional `licencia_inab`. Nunca bloquea.
- **Contrato otorgado**: al registrarlo, el formulario **propone** abrir el uso `cedida_a_terceros` en sus parcelas
  desde su inicio (casilla marcada por omisión); al terminarlo, propone cerrarlo.
- Se pueden cargar usos **históricos** (fechas anteriores a la fecha de inicio de la empresa): no son saldos, no hay
  carga inicial que proteger.

### 3.7 Mapa (PA-6 b)

Un punto por parcela: `latitud numeric(9,6)` y `longitud numeric(9,6)`, los dos o ninguno, WGS84. Check de rango global
(±90, ±180); **aviso** (no bloqueo) si queda fuera del rectángulo de Guatemala (lat. 13.5–18.0, long. −92.3 a −88.2),
porque el error más común es invertir el signo o el orden. La ficha abre el punto en el mapa del sistema (enlace
`geo:` y a un mapa en línea) sin dependencia nueva. El diseño de polígonos queda en §16.

## 4. Cambios fuera del módulo

### 4.1 Empresas: inmuebles registrales (pasos PA-0a y PA-0b, migraciones `0014_inmuebles` y `0015_valores_de_inmueble`)

Van en `empresas` porque es esencial (cualquier módulo puede poner llave sin cambiar su `dependeDe`), ya tiene las
localidades y la geografía, y un inmueble sirve a todo rubro (dictamen §9). Tablas en §5.1 y §5.2; permisos
`empresas.inmuebles.*` (§10.1); pantalla de Administración «Inmuebles» con Excel. Guardar el inmueble no avisa a nadie;
eliminar un inmueble con parcelas o activos ligados lo impide la llave (`no action`), y Empresas traduce el error a «El
inmueble está en uso en Parcelas o Activos fijos» (409), como ya hace con las localidades.

**Valores del inmueble y Activos fijos [V-2]** (contratos en `core/contratos/empresas.contratos.ts`; Empresas no conoce
a Activos fijos, solo publica):

| Nombre | Tipo | Datos | Quién responde y para qué |
|---|---|---|---|
| `empresas.valor_de_inmueble_por_eliminar` | aviso del mediador (dentro de la transacción) | `{ inmuebleId, valorId, fuente, vigenteDesde }` | Activos fijos (AF-P23) lanza `ValorDeInmuebleUsadoEnCierre` si algún activo ligado al inmueble usó ese valor en un mes cerrado; la eliminación se deshace. Sin respuesta (módulo inactivo o sin cierres): se elimina |
| `empresas.valor_de_inmueble_registrado` | aviso del mediador | `{ inmuebleId, valorId, fuente, vigenteDesde }` | Activos fijos decide (AF-P23) si crea el tramo fiscal `cambio_de_matricula` desde el primer mes abierto o solo lo propone en la ficha; nunca toca meses cerrados |

Un valor ya usado **no se borra**: se registra otro con otra fecha y el cambio va hacia adelante (PA-20).

### 4.2 Activos fijos (AF-1 y AF-2 ya programados): un solo dato de matrícula (AF-P23)

`diseno-activos-fijos.md` §3.5.1 y §5.3 ponen `valor_de_matricula`, `valor_catastral` y `valores_del_inmueble_completo`
en `activos_fijos.activos`, y AF-2 ya los creó (§1.1). Con PA-1 c, que el usuario aceptó, **[corrige el diseño de
Activos fijos]**; se lleva a ese diseño como **AF-P23** (AF-P22 ya existe: nombres de localidades, respondida b):

- `activos_fijos.activos` gana `inmueble_id uuid null` con llave compuesta `(inmueble_id, empresa_id) →
  empresas.inmuebles (id, empresa_id)` e índice parcial `where inmueble_id is not null`; se usa en las clases
  `edificios` y `terrenos` (en terrenos es informativo: no hay tope ni depreciación).
- Una migración nueva de Activos fijos (`00xx_af_p23_inmueble`, nunca editar la `0002`) **quita** las tres columnas y
  los checks `activos_valores_del_inmueble` y `activos_inmueble_completo`. Sin datos que convertir (0 activos en
  desarrollo, nada en producción); por precaución la migración aborta (`raise exception`) si alguna fila tiene valores,
  para que nadie los pierda en silencio. `CamposDeActivo` cambia matrícula y catastro por un selector de inmueble.
- **El tope** lo sigue aplicando Activos fijos con la regla de AF §3.5.1 (este diseño no la reescribe, **[V-2 b]**):
  el **mayor** de los dos vigentes en el mes (la serie `matricula_fiscal` y la `catastro_municipal`); si la serie no
  separa `valor_construcciones`, el 70 % del `valor_total` **menos** `valor_cultivos_permanentes` cuando venga separado
  (el cafetal no infla el edificio); los costos con `no_es_edificacion` quedan fuera del tope. El booleano
  `valores_del_inmueble_completo` sobra: «no separa el edificio» es `valor_construcciones is null`.
- **Meses cerrados [V-2 c]**: Activos fijos copia en su tramo fiscal el tope que usó (y los `valorId` de donde salió) y
  no lo vuelve a leer para meses cerrados; responde los avisos de §4.1. Su acción `CambiarValorFiscalDelInmueble` (AF
  §6.5) pasa a reaccionar al valor nuevo del inmueble en vez de pedir las cifras.
- Afecta a los pasos AF-5 (cierre: lee el tope del inmueble) y AF-7 (cambio de matrícula), y al paso **AF-P23** de §16.

Así la parcela llega al costo de su terreno **sin llave entre Parcelas y Activos fijos**: parcela → inmueble ← activo.
El dictamen (§1.2) proponía que la parcela apuntara al activo; eso obligaría a `dependeDe: ['activos-fijos']` (y, por
transitividad, a Libro de compras) en un módulo que no maneja dinero **[corrige el dictamen §1.2]**.

### 4.3 Core

| Cambio | Detalle |
|---|---|
| `core/contratos/parcelas.contratos.ts` | Órdenes, avisos y eventos de §9 |
| `core/contratos/empresas.contratos.ts` | Los dos avisos de los valores del inmueble (§4.1) |
| Auditoría permanente | La migración `0001` de Parcelas inserta `parcelas.contratos` en `core.recursos_de_auditoria_permanente`; la `0014` de Empresas, `empresas.inmuebles`, con motivo «Contratos y títulos de inmuebles: plazos de hasta décadas más la prescripción (Código Tributario arts. 47 y 112) y la conservación de libros y documentos (Código de Comercio art. 382)» **[C-9]**. Un arrendamiento de 10 años no cabe en 60 meses de auditoría (PA-15) |

### 4.4 Sin cambios

Libro de compras, Cuentas por pagar, Bancos, Caja chica, Cuentas por liquidar y Terceros no cambian en v1.

## 5. Datos

Toda tabla de negocio lleva `empresa_id` (FK `core.empresas` on delete cascade), `politicaPorEmpresa()`,
`...marcasDeTiempo` y `...autoria`. Llaves a otras tablas `no action` salvo donde se dice; compuestas con `empresa_id`
para no cruzar de empresa; toda llave con su índice; toda tabla con `id` que reciba llaves lleva su único
`<tabla>_id_empresa_unico (id, empresa_id)`. Textos recortados con check de largo. Anulación completa = `estado`,
`anulado_en`, `anulado_por`, `motivo_de_anulacion` (1–300) con el check `(estado = 'anulado') = (los tres no nulos)`.

### 5.1 `empresas.inmuebles` (paso PA-0a, `0014_inmuebles`)

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `nombre` | text | no | 1–120 («Finca El Carmen, lote 3»); único `inmuebles_nombre_unico (empresa_id, nombreNormalizado(nombre))` |
| `situacion_registral` | text | no | `in ('inscrito','posesorio')` |
| `registro` | text | sí | `in ('general','segundo')` (Registro General de la Propiedad o Segundo Registro, Quetzaltenango) |
| `numero_de_finca`, `folio`, `libro` | text | sí | 1–20 cada uno, `^[A-Za-z0-9 ./-]+$` (los libros llevan letras: «345E») |
| `departamento_registral` | char(2) | sí | FK `core.departamentos (codigo)`: el departamento del libro |
| — | | | Check `inmuebles_registro_completo`: `(situacion_registral = 'inscrito') = (registro, numero_de_finca, folio, libro no nulos)` |
| `documento_posesorio` | text | sí | 1–300 (escritura de derechos posesorios: número, notario, fecha); solo `posesorio` |
| `titulacion_supletoria_en_tramite` | boolean | no | `default false`; `not … or situacion_registral = 'posesorio'` |
| `titularidad` | text | no | `in ('propia','copropiedad','de_tercero')` |
| `porcentaje_de_copropiedad` | numeric(5,2) | sí | `> 0 and < 100`; `(titularidad = 'copropiedad') = (… is not null)` |
| `titular` | text | sí | 1–150: nombre del dueño registral si es `de_tercero` |
| `matricula_fiscal` | text | sí | 1–30 (DICABI o municipalidad) |
| `administra_iusi` | text | sí | `in ('dicabi','municipalidad')` |
| `codigo_catastral` | text | sí | 1–40 (RIC, donde haya catastro) |
| ~~`uso_declarado`~~ | | | **Quitado [V-6], [C-3]**: «agrícola» no es categoría del Decreto 18-2026 y el decreto no crea una «declaración de uso». Va como `categoria_iusi` **por fecha** en §5.2 (PA-21). El uso real ya lo dicen las parcelas o `observaciones` |
| `departamento_codigo`, `municipio_codigo` | char(2) | sí | Ubicación física; FK `core.municipios`; los dos o ninguno |
| `direccion` | text | sí | 1–300 |
| `superficie_registral_m2` | numeric(14,2) | sí | `> 0`: la de la escritura |
| `cantidad_original`, `unidad_original`, `varas_por_lado_de_cuerda` | numeric(16,4), text, smallint | sí | La cifra de la escritura como en `mediciones` (§5.5) |
| `localidad_id` | uuid | sí | FK compuesta a `localidades (id, empresa_id)`; índice parcial |
| `escritura_archivo_id` | uuid | sí | FK `core.archivos`, `recurso_dueno = 'empresas.inmuebles'`; único parcial |
| `activo` | boolean | no | `default true` |
| `observaciones` | text | sí | 1–500 |

Únicos: `inmuebles_id_empresa_unico (id, empresa_id)`; `inmuebles_registro_unico (empresa_id, registro, departamento_registral,
upper(numero_de_finca), upper(folio), upper(libro)) where situacion_registral = 'inscrito'` (la misma finca dos veces en
la empresa es un error); índice `(empresa_id, matricula_fiscal) where matricula_fiscal is not null` (búsqueda, sin
único: una matrícula puede cubrir varias fincas). RLS: `politicaPorEmpresa()` +
`politicaPorAlcanceOpcional(ALCANCE_DE_LOCALIDADES, 'localidad_id')` (sin localidad, lo ven todos).

**Por empresa y no por cuenta** (PA-14): la matrícula, el IUSI y el activo son de quien es dueño; si dos empresas de la
misma cuenta usan la misma finca (una dueña, otra arrendataria), cada una la registra con su titularidad. Compartirla
por cuenta obligaría a una política por cuenta y a decidir de quién es el valor de matrícula.

### 5.2 `empresas.valores_de_inmueble` (paso PA-0b, `0015_valores_de_inmueble`) **[V-2], [C-4]**

Antes `valores_de_matricula`, con una sola serie. Ahora hay una serie por **fuente** (el art. 26 de la LAT admite la
matrícula fiscal o el catastro municipal, y Activos fijos toma el mayor de los dos).

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `empresa_id` | uuid | no | FK `core.empresas` on delete cascade |
| `inmueble_id` | uuid | no | FK compuesta `(inmueble_id, empresa_id) → inmuebles (id, empresa_id)` **on delete cascade** (solo se elimina un inmueble sin uso, §6.1) |
| `fuente` | text | no | `in ('matricula_fiscal','catastro_municipal')` |
| `vigente_desde` | date | no | Fecha del avalúo o de la declaración |
| `origen` | text | no | `in ('avaluo_dicabi','avaluo_municipal','autoavaluo','valuador_autorizado','otro')`: cómo se obtuvo el valor (independiente de la fuente) |
| `valor_terreno`, `valor_construcciones`, `valor_cultivos_permanentes` | numeric(14,2) | sí | `>= 0` cada uno. `valor_construcciones` nulo = no separa el edificio (Activos fijos presume el 70 %, §4.2) |
| `valor_total` | numeric(14,2) | no | `> 0`; check: si vienen los tres, `valor_total = suma`; si vienen algunos, su suma `<= valor_total` |
| `categoria_iusi` | text | sí | `in ('vivienda','residencial','mixto','comercial','otros')` (Decreto 18-2026, art. 11 reformado del Decreto 15-98, **[V-6]**); check `categoria_iusi is null or fuente = 'matricula_fiscal'` (la categoría va con la base del IUSI). Por fecha según PA-21 |
| `documento` | text | sí | 1–150 (número de avalúo o recibo) |
| `archivo_id` | uuid | sí | FK `core.archivos`, `recurso_dueno = 'empresas.inmuebles'`; único parcial |

Únicos `valores_de_inmueble_id_empresa_unico (id, empresa_id)` y `valores_de_inmueble_fecha_unico (inmueble_id, fuente,
vigente_desde)`. El vigente de una fuente en una fecha es el de mayor `vigente_desde <= fecha` **de esa fuente**; puede
haber dos vigentes a la vez (uno por fuente). Índice `(inmueble_id, fuente, vigente_desde desc)`. RLS:
`politicaPorEmpresa()` (se lee unido al inmueble, que lleva el alcance por localidad; el caso de uso carga el inmueble
antes de escribir). La categoría del IUSI vigente en una fecha es la del valor de matrícula vigente.

**No se edita** (es un histórico). **Se elimina** solo si nadie lo usó en un mes cerrado: el caso de uso publica
`empresas.valor_de_inmueble_por_eliminar` (§4.1) y Activos fijos puede rechazar; si no, se registra otro valor con otra
fecha (hacia adelante, PA-20). Auditoría `eliminar` con el DTO del valor.

**Vigencia de las categorías (pendiente)**: falta confirmar en el Diario de Centro América la fecha en que rige el IUSI
del Decreto 18-2026 (las fuentes secundarias dicen 26-nov-2026) y si DICABI o las municipalidades publican una lista más
fina. No bloquea: la categoría es opcional y Parcelas no calcula el IUSI (PA-8 a, C-8). La ayuda del campo dice «Vivienda,
residencial y mixto: 0 por millar; comercial y otros: 3, 6 o 9 por millar. Una finca rústica caería en “otros”» (ninguna fuente lo dice expresamente: el texto se revisa cuando se confirme).

### 5.3 `parcelas.parcelas`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `localidad_id` | uuid | no | FK compuesta `(localidad_id, empresa_id) → empresas.localidades (id, empresa_id)`; índice |
| `parcela_madre_id` | uuid | sí | FK compuesta `(parcela_madre_id, empresa_id, localidad_id) → parcelas (id, empresa_id, localidad_id)`: **la madre es de la misma localidad** por llave; check `<> id`; índice parcial |
| `nivel` | smallint | no | `between 1 and 5`; check `(nivel = 1) = (parcela_madre_id is null)`; el dominio pone `nivel = madre.nivel + 1` y revisa el tope de configuración |
| `tipo_id` | uuid | no | FK compuesta a `tipos_de_parcela`; índice |
| `codigo` | text | no | 1–20, `^[A-Z0-9-]+$` (mayúsculas, como localidades); único `parcelas_codigo_unico (empresa_id, codigo)` (en la empresa, para que el Excel y los módulos de rubro la encuentren sin decir la localidad) |
| `nombre` | text | no | 1–120; único `parcelas_nombre_unico (empresa_id, localidad_id, nombreNormalizado(nombre))` |
| `forma_de_tenencia` | text | no | `in ('propia','posesion','copropiedad','arrendada','usufructo','comodato','aparceria','otra')` |
| `superficie_total_m2`, `superficie_util_m2` | numeric(14,2) | sí | Copia de la medición vigente (la escribe su caso de uso); `> 0`; `util <= total`; nulas sin medición |
| `latitud`, `longitud` | numeric(9,6) | sí | Rango global; los dos o ninguno |
| `colindancia_norte`, `…_sur`, `…_oriente`, `…_poniente` | text | sí | 1–300 cada una |
| `activo` | boolean | no | `default true` |
| `observaciones` | text | sí | 1–500 |

Únicos: `parcelas_id_empresa_unico (id, empresa_id)` (destino de todo lo demás) y `parcelas_id_empresa_localidad_unico
(id, empresa_id, localidad_id)` (destino de la llave de la madre y de `parcelas_de_contratos`). Índices `(empresa_id,
localidad_id, activo)`, `(parcela_madre_id) where parcela_madre_id is not null`. RLS: `politicaPorEmpresa()` +
**`politicaPorAlcance(ALCANCE_DE_LOCALIDADES, 'localidad_id')`** (obligatoria: toda parcela tiene localidad). Es `for
all` con `with check`: quien no ve la localidad no puede crear parcelas en ella. Sin `recursosConAlcance` propio (PA-16).

### 5.4 `parcelas.tipos_de_parcela` (si se aprueba PA-11 b)

`id`; `nombre` 1–60, único normalizado por empresa; `activo boolean default true`; `tipos_de_parcela_id_empresa_unico`.
RLS: empresa. Semilla perezosa al listar por primera vez (como `SembrarTiposDeLocalidad` y los conceptos de gasto):
Potrero, Lote, Parcela, Tablón, Cuadro, Bosque.

### 5.5 `parcelas.mediciones`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `parcela_id` | uuid | no | FK compuesta a `parcelas` |
| `vigente_desde` | date | no | Fecha de la medición o de la escritura |
| `fuente` | text | no | `in ('escritura','plano_topografico','gps','estimacion','otra')` |
| `superficie_total_m2` | numeric(14,2) | no | `> 0` |
| `superficie_util_m2` | numeric(14,2) | no | `> 0`, `<= superficie_total_m2` (si no se conoce, igual a la total) |
| `cantidad_original` | numeric(16,4) | no | `> 0`: la cifra como se escribió (total) |
| `unidad_original` | text | no | `in ('m2','hectarea','manzana','cuerda','vara_cuadrada','caballeria')` (caballería = 645,816 varas², [V-1]) |
| `varas_por_lado_de_cuerda` | smallint | sí | `between 1 and 100`; `(unidad_original = 'cuerda') = (… is not null)` |
| `documento` | text | sí | 1–150 («Plano del ing. X, 2019») |
| `archivo_id` | uuid | sí | FK `core.archivos`, `recurso_dueno = 'parcelas.mediciones'`; único parcial |
| anulación completa | | | `vigente` / `anulada` |

Único parcial `(parcela_id, vigente_desde) where estado = 'vigente'`. Índice `(parcela_id, vigente_desde desc) where
estado = 'vigente'`. RLS: empresa (se lee unido a `parcelas`; el caso de uso carga la parcela antes de escribir, como
`activos_fijos.costos`). El total en m² lo calcula el dominio desde la cifra original y se guarda (para que una
corrección de factores no cambie el pasado); la útil se escribe en la unidad que elija el usuario y se guarda en m².

### 5.6 `parcelas.parcelas_de_inmuebles` (N:M, PA-2 b)

`(parcela_id, inmueble_id)` PK; `empresa_id`; FK compuestas a `parcelas (id, empresa_id)` **on delete cascade** y a
`empresas.inmuebles (id, empresa_id)` (no action); `superficie_m2 numeric(14,2) null` (`> 0`; la porción de esa finca
registral). Índice `(inmueble_id)`. RLS: empresa. Avisos (no bloqueos): la suma de porciones de un inmueble pasa su
superficie registral; la suma de porciones de una parcela no coincide con su total.

### 5.7 `parcelas.usos`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `parcela_id` | uuid | no | FK compuesta a `parcelas` |
| `uso` | text | no | Lista de §3.6 |
| `detalle` | text | sí | 1–120; obligatorio si `uso = 'otro'` (check) |
| `desde` | date | no | |
| `hasta` | date | sí | `>= desde` |
| `licencia_inab` | text | sí | 1–60 |
| `contrato_id` | uuid | sí | FK compuesta a `contratos`: el uso `cedida_a_terceros` que abrió un contrato otorgado; índice parcial |
| `observaciones` | text | sí | 1–300 |

Exclusión `usos_sin_traslape EXCLUDE USING gist (parcela_id WITH =, daterange(desde, hasta, '[]') WITH &&)` (migración
`--custom`, como `0004_l2_vigencias_sin_traslape.sql`; `hasta` nulo = sin fin). Índice `(parcela_id, desde desc)`. RLS:
empresa. Los usos se **corrigen eliminando** el período (auditoría `eliminar` con el DTO) o cerrándolo; no hay
anulación porque no tienen efecto contable.

### 5.8 `parcelas.contratos`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `numero`, `anio_de_numero` | integer | no | Correlativo `parcelas.contratos` (`core.correlativos`); único por empresa |
| `localidad_id` | uuid | no | FK compuesta a `empresas.localidades`; índice |
| `clase` | text | no | `in ('arrendamiento','usufructo','comodato','aparceria','otro')` |
| `lado` | text | no | `in ('recibido','otorgado')` |
| `contraparte_id` | uuid | no | FK `terceros.terceros (id)`; índice. El dominio exige que sea de la cuenta de la empresa (como Cuentas por liquidar) |
| `contraparte` | text | no | Nombre como estaba al registrar |
| `fecha_de_inicio` | date | no | |
| `fecha_de_fin` | date | sí | `> fecha_de_inicio`; **último día** del contrato (incluido); nulo = indefinido |
| `prorroga_automatica` | boolean | no | `default false` |
| `forma_de_renta` | text | sí | `in ('dinero','especie_cantidad','especie_porcentaje')`; nula en comodato y usufructo gratuito; check `(clase = 'comodato') → forma_de_renta is null` |
| `periodicidad` | text | sí | `in ('mensual','bimestral','trimestral','semestral','anual','por_cosecha','unica')`; `(forma_de_renta is null) = (periodicidad is null)` |
| `monto_por_periodo` | numeric(14,2) | sí | `> 0`; `(forma_de_renta = 'dinero') = (… is not null)` |
| `moneda` | char(3) | sí | FK `core.monedas`; con el monto (check) |
| `monto_incluye_iva` | boolean | sí | Con el monto (check); informativo |
| `cantidad_por_periodo` | numeric(14,3) | sí | `> 0`; `(forma_de_renta = 'especie_cantidad') = (… is not null)` |
| `unidad_de_especie` | text | sí | 1–30; con la cantidad |
| `porcentaje_de_cosecha` | numeric(5,2) | sí | `> 0 and <= 100`; `(forma_de_renta = 'especie_porcentaje') = (… is not null)` |
| `producto` | text | sí | 1–80; obligatorio en las dos especies (check) |
| `dia_de_vencimiento` | smallint | sí | `between 1 and 31`; día del período en que vence (si no, el del inicio) |
| `meses_de_renta_anticipada` | smallint | no | `default 0`, `>= 0` |
| `iusi_a_cargo_de` | text | no | `in ('arrendador','arrendatario')`, `default 'arrendador'` |
| `tipo_de_documento` | text | sí | `in ('escritura_publica','documento_privado','documento_privado_legalizado','verbal')` **[V-3]** (art. 1576: el que debe inscribirse va en escritura pública); nulo = no se sabe |
| `documento` | text | sí | 1–300 (escritura número, notario, fecha; o «documento privado con firmas legalizadas») |
| `archivo_id` | uuid | sí | FK `core.archivos`, `recurso_dueno = 'parcelas.contratos'`; único parcial |
| `inscrito` | boolean | no | `default false` |
| `fecha_de_inscripcion`, `datos_de_inscripcion` | date, text | sí | `(inscrito) = (fecha_de_inscripcion is not null)`; datos 1–150 |
| `estado` | text | no | `in ('vigente','terminado','anulado')` |
| `fecha_de_terminacion`, `motivo_de_terminacion` | date, text | sí | `(estado = 'terminado') = (los dos no nulos)` |
| anulación | | | `anulado_en`, `anulado_por`, `motivo_de_anulacion` (registrado por error) |
| `observaciones` | text | sí | 1–500 |

Únicos `contratos_id_empresa_unico (id, empresa_id)` y `contratos_id_empresa_localidad_unico (id, empresa_id,
localidad_id)`. Índices `(empresa_id, estado, fecha_de_fin)`, `(contraparte_id)`. RLS: `politicaPorEmpresa()` +
`politicaPorAlcance(ALCANCE_DE_LOCALIDADES, 'localidad_id')`. El aviso de inscripción se calcula (no se guarda) con la
regla de §3.5 **[C-5]**: `not inscrito and (clase = 'usufructo' or (clase in ('arrendamiento','aparceria') and
(fecha_de_fin >= fecha_de_inicio + make_interval(months => umbral) or meses_de_renta_anticipada > umbral_de_anticipo)))`,
**por fecha** y no por meses enteros; el aviso suave (indefinido o con prórroga, PA-22) y el de escritura pública
(art. 1576) salen del mismo cálculo (`dominio/aviso-de-inscripcion.ts`), que en SQL se repite solo para filtrar la lista
y el reporte.

### 5.9 `parcelas.parcelas_de_contratos`

`(contrato_id, parcela_id)` PK; `empresa_id`, `localidad_id`; FK compuestas `(contrato_id, empresa_id, localidad_id) →
contratos` **on delete cascade** y `(parcela_id, empresa_id, localidad_id) → parcelas` (no action): **la parcela es de la
localidad del contrato por llave**. `superficie_m2 numeric(14,2) null` (si el contrato cubre parte). Índice `(parcela_id)`.
RLS: empresa. Dominio: dos contratos **recibidos** vigentes no pueden cubrir la misma parcela en fechas que se
traslapan (aviso, no bloqueo: puede haber subarriendos o contratos sobre porciones distintas).

### 5.10 `parcelas.cuotas_de_renta`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | uuid | no | PK |
| `contrato_id` | uuid | no | FK compuesta a `contratos` **on delete cascade** |
| `numero` | smallint | no | 1…n dentro del contrato; único `(contrato_id, numero)` |
| `vencimiento` | date | no | |
| `periodo_desde`, `periodo_hasta` | date | no | Lo que cubre la cuota (para el devengo lineal de Contabilidad en las cuotas fijas, NIIF para las Pymes, Sección 20 **[C-2]**; la renta en porcentaje de la cosecha es contingente y no se devenga en línea recta, V-7) |
| `monto` | numeric(14,2) | sí | Dinero |
| `cantidad` | numeric(14,3) | sí | Especie por cantidad; en `especie_porcentaje` las dos son nulas |
| `estado` | text | no | `in ('pendiente','documentada','omitida')` |
| `referencia` | text | sí | 1–150 (factura o recibo, texto) |
| `marcada_en`, `marcada_por` | timestamptz, uuid | sí | `(estado <> 'pendiente') = (los dos no nulos)` |
| `motivo_de_omision` | text | sí | 1–300; `(estado = 'omitida') = (… is not null)` |

Índices `(empresa_id, estado, vencimiento)` (el reporte de por vencer) y `(contrato_id, vencimiento)`. RLS: empresa
(se lee unido al contrato, que filtra por alcance). Las cuotas no se borran salvo con su contrato anulado o eliminado.

### 5.11 `parcelas.cuerdas_por_localidad` (solo si se aprueba PA-5 c)

`(empresa_id, localidad_id)` PK; FK compuesta a `empresas.localidades` on delete cascade; `varas_por_lado smallint`
(1–100). RLS: empresa + `politicaPorAlcance(…, 'localidad_id')`.

### 5.12 Migraciones y datos existentes

- **Empresas** `0014_inmuebles` (PA-0a: inmuebles y auditoría permanente) y `0015_valores_de_inmueble` (PA-0b). La
  `0013` ya es `0013_nombres_de_ubicaciones`; si otro paso toma la `0014` antes, se usa el siguiente número libre al
  programar. Van primero: Parcelas apunta a `inmuebles`.
- **Activos fijos** `00xx_af_p23_inmueble` (paso AF-P23, después de PA-0b): `inmueble_id` con su llave e índice; quita las
  tres columnas y sus dos checks (§4.2). Aborta si alguna fila tiene valores (hoy, ninguna).
- **Parcelas**: `npm run generar -- modulo parcelas --nombre "Parcelas" --descripcion "Fincas, potreros y lotes: superficie,
  uso y tenencia" --icono LandPlot` crea el esqueleto y `0000_esquema`. Después, con `bd:generar -w servidor -- parcelas
  <nombre>`: `0001_pa1_parcelas` (tipos, parcelas, mediciones, parcelas de inmuebles, auditoría permanente de
  contratos), `0002_pa2_usos` (tabla) y `0003_pa2_usos_sin_traslape` (`--custom`, exclusión), `0004_pa3_contratos`
  (contratos, parcelas de contratos; la FK `usos.contrato_id` se agrega aquí), `0005_pa4_cuotas_de_renta`.
- **Sin datos que convertir** (tablas nuevas; la base de desarrollo no tiene nada que migrar) y **sin migración de
  permisos** (todos nuevos: el rol con acceso total los recibe solo). Los correlativos no necesitan fila previa.
- La prueba `llaves-entre-esquemas` acepta las llaves de Parcelas a `empresas` (esencial), `core` y `terceros` (directo).

## 6. Reglas (un caso de uso por acción)

Todas corren en `UnidadDeTrabajo.ejecutar` con RLS de la empresa y del alcance por localidad.

### 6.1 Inmuebles (Empresas: `CrearInmueble`, `EditarInmueble`, `InactivarInmueble`, `ReactivarInmueble`, `EliminarInmueble`, `RegistrarValorDeInmueble`, `EliminarValorDeInmueble`)

Inscrito exige registro, finca, folio, libro y departamento; posesorio, el documento. Eliminar solo sin parcelas ni
activos ligados (la llave; 409 con mensaje claro); si no, inactivar. Un valor del inmueble no se edita **[V-2 c]**:
registrar uno publica `empresas.valor_de_inmueble_registrado`; eliminarlo publica `empresas.valor_de_inmueble_por_eliminar`
(Activos fijos rechaza si ya lo usó en un mes cerrado, error `valor_de_inmueble_usado_en_cierre`) y audita `eliminar`.
Si no se puede eliminar, se registra otro con otra fecha. `categoria_iusi` solo en la serie `matricula_fiscal`.

### 6.2 Parcelas (`CrearParcela`, `EditarParcela`, `InactivarParcela`, `ReactivarParcela`, `EliminarParcela`)

- Crear: localidad visible y activa; madre activa, de la misma localidad y con `nivel < tope`; código en mayúsculas.
  Puede traer la primera medición y el primer uso en la misma transacción (formulario completo).
- Editar: nombre, tipo, tenencia, punto, colindancias, observaciones y los inmuebles ligados. Localidad y madre **no**
  (PA-12).
- Inactivar: exige que las hijas estén inactivas; pregunta a los módulos con el aviso `parcelas.parcela_por_inactivar`
  (§9.1: Ganadería o Cultivos lo rechazan si hay una ocupación o un ciclo abierto); cierra el uso vigente con la fecha
  dada; audita `inactivar`. Con contratos vigentes que la incluyan, avisa.
- Eliminar: solo sin hijas, usos, mediciones vigentes ni contratos; pregunta con el aviso `parcelas.parcela_por_eliminar`
  (los módulos de rubro la tendrán referenciada con llave, que de todas formas lo impide); audita `eliminar` con el DTO.

### 6.3 Mediciones (`RegistrarMedicion`, `AnularMedicion`)

Convierte la cifra original a m² con los factores vigentes (§3.3); copia la vigente a `parcelas`. Si la útil baja,
pregunta con `parcelas.superficie_por_cambiar` (Cultivos rechaza si un ciclo abierto sembró más que la útil nueva, o
solo avisa: lo decide Cultivos). Anular recalcula la vigente; audita `anular`. Avisos: suma de hijas mayor que la
madre; diferencia mayor de 10 % con la superficie registral de los inmuebles ligados.

### 6.4 Usos (`AbrirUso`, `CerrarUso`, `EliminarUso`)

Abrir cierra el vigente el día anterior (si lo hay y es anterior); de `bosque`, `plantacion_forestal` o `conservacion` a
otro uso, aviso del INAB (§3.6, **[V-5]**). Cerrar o
eliminar el vigente pregunta con `parcelas.uso_por_cerrar` (Cultivos rechaza si hay un ciclo abierto que dependa del
uso). Eliminar audita `eliminar`; cerrar uno ya cerrado con otra fecha audita `corregir`.

### 6.5 Contratos (`RegistrarContrato`, `EditarContrato`, `TerminarContrato`, `AnularContrato`, `EliminarContrato`, `AdjuntarDocumento`)

- Registrar: contraparte de la cuenta; parcelas de la localidad; renta coherente con la clase; genera las cuotas
  (§3.5); si es otorgado, abre (si se pidió) el uso `cedida_a_terceros`. Avisos: inscripción; parcela `arrendada` sin
  contrato; otro contrato recibido vigente sobre la misma parcela.
- Editar: datos descriptivos libres; condiciones de renta o fechas regeneran solo las cuotas **pendientes** con
  vencimiento desde hoy (auditoría `corregir` con el contrato anterior y las cuotas que se reemplazaron).
- Terminar: fecha y motivo; las cuotas pendientes posteriores pasan a `omitida` («Contrato terminado»); propone cerrar
  el uso cedido; audita `cerrar`.
- Anular (registrado por error): solo sin cuotas documentadas; audita `anular` con el DTO y sus cuotas.
- Eliminar: solo vigente, sin cuotas documentadas ni vencidas (PA-17 b); audita `eliminar` con el DTO y sus cuotas. Si
  no se puede, se anula.

### 6.6 Cuotas (`MarcarCuota`, `DesmarcarCuota`, `OmitirCuota`, `ExtenderCalendario`)

Marcar `documentada` con referencia opcional; desmarcar vuelve a `pendiente` (audita `devolver`); omitir con motivo
(audita `anular` con la cuota). `ExtenderCalendario` corre al listar contratos indefinidos o con prórroga automática
cuyo horizonte quede a menos de 12 meses (idempotente por el único `(contrato_id, numero)`).

## 7. Cálculos (dominio puro, con pruebas)

- `dominio/superficie.ts`: conversión a centésimas de m² y de vuelta para mostrar (ha con 4 decimales, mz con 4, cuerdas
  con 2). Ejemplos de prueba (factores del dictamen, V-1): 1 mz = 6,987.37 m²; 16 cuerdas de 25 varas = 1 mz; 1 ha =
  1.4311 mz; 1 cuerda de 40 varas = 1,117.98 m²; 1 caballería = 645,816 varas² = 451,255.64 m² ≈ 45.1256 ha (con 64.58 mz
  saldrían 451,244.46: la prueba fija la diferencia de V-1).
- `dominio/calendario-de-renta.ts`: vencimientos por periodicidad desde el inicio (fin de mes cuando el día no existe:
  31 → 28/29/30), período cubierto, última cuota proporcional **no** (la renta de la última cuota es completa salvo que
  el usuario la edite: lo dice el contrato, no el sistema). `por_cosecha` y `unica` generan una sola cuota en la fecha
  dada.
- `dominio/aviso-de-inscripcion.ts` **[V-3], [C-5]**: usufructo siempre; arrendamiento y aparcería por **fecha**
  (`fin >= inicio + 36 meses`, con el fin incluido) o anticipo `> 12`; aviso suave en indefinidos o con prórroga que ya pasaron el plazo
  (PA-22); escritura pública (art. 1576). Pruebas: 1-ene-2026 a 1-ene-2029 avisa; a 31-dic-2028 no; inicio 29-feb-2024 +
  36 meses = 28-feb-2027 (como PostgreSQL); usufructo de un año avisa; comodato nunca.

## 8. Carga inicial (EM-2)

Parcelas **no tiene saldos** (no lleva dinero): no exige la carga abierta para nada y los usos y contratos pueden tener
fechas anteriores a la fecha de inicio. Responde `empresas.revisar_cierre_de_carga` (`RevisarCierreDeCargaEnParcelas`)
solo cuando tiene algo que decir (PA-18); si no, `null`:

| Código | Nivel | Mensaje |
|---|---|---|
| `rentas_vencidas_sin_documentar` | aviso | **[C-7]** «N cuotas de renta de contratos recibidos vencieron antes del dd/mm/aaaa y siguen pendientes: Q x; US$ y; 20 quintales de maíz; 1 cuota en porcentaje de la cosecha. Si se deben al corte, son deuda: cárguelas como saldo inicial en Cuentas por pagar. Sin factura, no son gasto deducible.» Montos **sumados por moneda** y la especie aparte por producto y unidad (con `registro` = el contrato, hasta 20) |
| `rentas_por_cobrar_sin_documentar` | aviso | Igual para contratos otorgados: «…cárguelas en Cuentas por cobrar cuando exista» |
| `contrato_sin_inscribir` | aviso | «N contratos vigentes al corte deberían estar inscritos (usufructos, o arrendamientos de más de 3 años o con renta anticipada mayor de un año).» Con la regla de §3.5; el aviso suave no entra aquí |

Cifras: Parcelas activas (cantidad), Superficie total (m², como `cantidad` entera: el tipo `CifraDelCuadre` solo admite
`monto` y `cantidad`), Contratos vigentes al corte (cantidad). Resumen: «N parcelas en M localidades; K contratos
vigentes». Ruta: `/parcelas/contratos`. No escucha `empresas.fecha_de_inicio_por_cambiar` (nada depende de ella).

## 9. Integración y eventos (`core/contratos/parcelas.contratos.ts`)

### 9.1 Mediador (dentro de la transacción)

| Nombre | Tipo | Datos → respuesta | Para qué |
|---|---|---|---|
| `parcelas.obtener_parcela_en_fecha` | orden | `{ parcelaId, fecha }` → `{ codigo, nombre, localidadId, nivel, activa, superficieTotalM2, superficieUtilM2, uso, detalleDeUso, formaDeTenencia, cedidaATerceros }` (superficies como texto) | Ganadería (carga animal, UA/ha) y Cultivos (área sembrada ≤ útil) sin leer las tablas de Parcelas |
| `parcelas.parcela_por_inactivar` | aviso | `{ parcelaId, fecha }` | Cada módulo de rubro lanza su error si la parcela tiene una ocupación o ciclo abierto; deshace la inactivación |
| `parcelas.parcela_por_eliminar` | aviso | `{ parcelaId }` | Igual, para eliminar |
| `parcelas.uso_por_cerrar` | aviso | `{ parcelaId, usoId, uso, hasta }` | Cultivos impide cerrar un uso de cultivo con un ciclo abierto después de `hasta` |
| `parcelas.superficie_por_cambiar` | aviso | `{ parcelaId, desde, superficieUtilM2 }` | Cultivos revisa el área sembrada |
| `parcelas.parcela_guardada` | aviso | `{ parcelaId, secciones }` | Ganadería y Cultivos guardan su sección (pasto, agua, cerca; cultivo permanente sembrado) como `empresas.empresa_guardada` |

Ganadería y Cultivos dependerán de `parcelas` y podrán además **leer** sus tablas desde su `infraestructura` y poner
llave a `parcelas.parcelas (id, empresa_id)` (PLAN §3.2). La orden existe para las reglas, no para los reportes.

### 9.2 Eventos del bus (después de confirmar), para Contabilidad y los módulos de rubro

Todos llevan `empresaId`, `localidadId` y `fecha`; los montos en **centavos** con su `moneda`.

| Evento | Cuándo | Datos propios |
|---|---|---|
| `parcelas.parcela_creada` / `parcela_inactivada` / `parcela_reactivada` | Alta e (in)activación | `parcelaId`, `parcelaMadreId`, `codigo` |
| `parcelas.superficie_medida` | Medición registrada o anulada | `parcelaId`, total y útil |
| `parcelas.uso_cambiado` | Abrir, cerrar o eliminar un uso | `parcelaId`, uso anterior y nuevo, `desde` |
| `parcelas.contrato_registrado` | Registrar o editar un contrato | `contratoId`, `clase`, `lado`, `contraparteId`, fechas, forma de renta, `cuotas: [{ cuotaId, vencimiento, periodoDesde, periodoHasta, montoCentavos, cantidad }]`, `parcelaIds` |
| `parcelas.contrato_terminado` / `contrato_anulado` | Terminar o anular | `contratoId`, fecha, cuotas omitidas |
| `parcelas.cuota_marcada` | Marcar, desmarcar u omitir | `cuotaId`, estado, referencia |

**Contabilidad (futura)**: con `contrato_registrado` puede devengar el arrendamiento operativo **en línea recta**
(NIIF para las Pymes, Sección 20, **[C-2]**) con `periodo_desde`/`periodo_hasta` y reconocer la renta anticipada; la renta
en porcentaje de la cosecha es **contingente** y se reconoce al conocer la cosecha, no en línea recta (por eso el evento
lleva `forma_de_renta`, **[V-7]**); la factura y el pago le llegan por
los eventos de Libro de compras y Cuentas por pagar. Parcelas **no** publica partidas ni cuentas.

**Dimensión de costo (PA-10)** **[corrige el dictamen §1.5 y §8]**: que la parcela sea dimensión de costo **no** exige
nada en Parcelas v1 salvo la llave `(id, empresa_id)` y que los eventos lleven la localidad. Los costos por ciclo ×
parcela (Cultivos) y por potrero o lote (Ganadería) los capturarán **esos** módulos, que dependen de Parcelas y del
Libro de compras, como Activos fijos capitaliza líneas del libro desde su bandeja. Poner una columna «parcela» en las
líneas del libro, los comprobantes de caja chica o las notas de Bancos obligaría a módulos generales a depender de uno
de rubro, que la hoja de ruta prohíbe. La alternativa general (dimensiones analíticas en `core`, que cualquier módulo
pueda llenar) se decide con Contabilidad.

## 10. Permisos, auditoría, errores y configuración

### 10.1 Permisos (PLAN §3.5)

| Recurso | Permisos |
|---|---|
| Inmuebles (Empresas) | `empresas.inmuebles.ver`, `.crear`, `.editar` (inactivar, reactivar, valores de matrícula), `.eliminar`, `.importar`, `.exportar` |
| Tipos de parcela | `parcelas.tipos-de-parcela.ver`, `.crear`, `.editar`, `.eliminar`, `.importar`, `.exportar` |
| Parcelas | `parcelas.parcelas.ver`, `.crear`, `.editar` (inactivar, reactivar, inmuebles ligados), `.eliminar`, `.importar`, `.exportar` |
| Mediciones | `parcelas.mediciones.crear`, `.anular` (se ven con `parcelas.ver`) |
| Usos | `parcelas.usos.crear` (abrir y cerrar), `.eliminar`, `.importar` |
| Contratos | `parcelas.contratos.ver`, `.crear`, `.editar`, `.terminar`, `.anular`, `.eliminar`, `.importar`, `.exportar` |
| Cuotas de renta | `parcelas.rentas.ver`, `.marcar` (marcar, desmarcar, omitir) |
| Reportes | `parcelas.reportes.ver`, `.exportar` |

`contratos.ver` y `rentas.ver` van aparte de `parcelas.ver`: el encargado de la finca ve sus potreros sin ver lo que la
empresa paga de renta. Sin `recursosConAlcance` propio: usa el de `empresas.localidades` (`ver-todas` y su ventana de
asignación).

### 10.2 Auditoría (dentro de la unidad de trabajo; `core.auditoria` solo se agrega)

| Caso de uso | `recurso` | `accion` | `anterior` |
|---|---|---|---|
| Inactivar, reactivar, eliminar inmueble | `empresas.inmuebles` | `inactivar` / `reactivar` / `eliminar` | DTO con sus valores (las dos series) |
| Eliminar valor del inmueble | `empresas.inmuebles` | `eliminar` | DTO del valor |
| Inactivar, reactivar, eliminar tipo de parcela | `parcelas.tipos-de-parcela` | según la acción | DTO |
| Inactivar, reactivar, eliminar parcela | `parcelas.parcelas` | según la acción | DTO de la parcela con mediciones, inmuebles y usos |
| Quitar un inmueble ligado | `parcelas.parcelas` | `quitar` | La liga con su porción |
| Anular medición | `parcelas.mediciones` | `anular` | DTO |
| Eliminar uso; corregir el cierre | `parcelas.usos` | `eliminar` / `corregir` | DTO |
| Editar condiciones, terminar, anular, eliminar contrato | `parcelas.contratos` | `corregir` / `cerrar` / `anular` / `eliminar` | DTO con sus parcelas y cuotas |
| Desmarcar u omitir cuota | `parcelas.cuotas-de-renta` | `devolver` / `anular` | DTO de la cuota |

Permanentes (§4.3): `empresas.inmuebles` y `parcelas.contratos`.

### 10.3 Errores nuevos (código propio, familias del core)

`parcela_de_otra_localidad`, `nivel_maximo_de_parcelas`, `parcela_con_hijas_activas`, `parcela_con_registros`
(`ReglaDeNegocioInfringida`), `madre_inactiva`, `localidad_fuera_de_alcance`, `codigo_de_parcela_repetido`,
`nombre_de_parcela_repetido` (`DatoInvalido`), `superficie_util_mayor_que_total`, `unidad_sin_varas_de_cuerda`,
`usos_traslapados` (traduce la violación de la exclusión), `uso_otro_sin_detalle`, `contraparte_de_otra_cuenta`,
`renta_incoherente_con_la_clase`, `contrato_con_cuotas_documentadas`, `contrato_no_vigente`, `inmueble_registro_incompleto`,
`inmueble_repetido`, `inmueble_en_uso`, `tipo_de_parcela_en_uso`, `valor_de_inmueble_repetido` (misma fuente y fecha),
`categoria_iusi_fuera_de_matricula` (`DatoInvalido`). `valor_de_inmueble_usado_en_cierre` (`ReglaDeNegocioInfringida`) es
de Activos fijos (AF-P23).

### 10.4 Configuración (`configuracion.ts`; solo niveles `instalacion` y `empresa`)

| Clave | Nivel | Por omisión | Para qué |
|---|---|---|---|
| `parcelas.unidades.metros_por_vara` | instalación | `0.835905` | Factor del INE (dictamen §2) |
| `parcelas.unidades.varas_cuadradas_por_manzana` | instalación | `10000` | |
| `parcelas.unidades.varas_cuadradas_por_caballeria` | instalación | `645816` | **[V-1], [C-6]** (64.5816 mz, tabla del INE), en la misma base que la manzana (PA-23; si el usuario prefiere manzanas, `manzanas_por_caballeria = 64.5816`) |
| `parcelas.unidades.varas_por_lado_de_cuerda` | empresa, instalación | `25` | PA-5; `publica: true` (el formulario muestra la conversión en vivo) |
| `parcelas.unidades.unidad_para_mostrar` | empresa, instalación | `manzana` | Unidad de las listas y reportes (`manzana`, `hectarea`, `cuerda`, `m2`); `publica: true` |
| `parcelas.jerarquia.niveles_maximos` | instalación | `3` | PA-7 |
| `parcelas.contratos.meses_para_inscribir` | instalación | `36` | Aviso de inscripción; se suma a la fecha de inicio y se compara por fecha (V-3) |
| `parcelas.contratos.meses_de_anticipo_para_inscribir` | instalación | `12` | Idem |
| `parcelas.contratos.dias_de_aviso_de_renta` | empresa, instalación | `15` | «Por vencer» en la lista y el reporte |

Los factores de unidades son también `publica: true` para que el cliente convierta en vivo con la misma lógica (la
función pura se comparte copiándola en `cliente/.../edicion-de-superficie.ts` con las mismas pruebas).

## 11. API (todas con `proteger({ permiso })`; superficies y dinero como texto)

| Método y ruta | Permiso |
|---|---|
| `GET/POST /empresas/inmuebles`, `GET/PUT/DELETE …/:id`, `POST …/:id/inactivar`, `/reactivar`; `POST/DELETE …/:id/valores[/:valorId]` (PA-0b); `POST …/:id/escritura` (multipart), `GET …/:id/escritura`; `GET …/exportar`, `…/plantilla`, `POST …/importar` | `empresas.inmuebles.*` |
| `GET/POST /parcelas/tipos-de-parcela` y el resto del catálogo con Excel | `parcelas.tipos-de-parcela.*` |
| `GET /parcelas/parcelas` (filtros: localidad, madre, tipo, uso vigente, tenencia, activas, texto; `?arbol=true` devuelve la jerarquía de una localidad), `GET …/:id` (ficha con mediciones, usos, inmuebles, contratos si tiene `contratos.ver`) | `parcelas.parcelas.ver` |
| `POST /parcelas/parcelas`, `PUT …/:id`, `POST …/:id/inactivar`, `/reactivar`, `DELETE …/:id`; `GET …/exportar`, `…/plantilla`, `POST …/importar` | `parcelas.parcelas.*` |
| `POST /parcelas/parcelas/:id/mediciones`, `POST /parcelas/mediciones/:id/anular`, `POST …/:id/archivo` | `parcelas.mediciones.*` |
| `POST /parcelas/parcelas/:id/usos`, `POST /parcelas/usos/:id/cerrar`, `DELETE /parcelas/usos/:id`; `GET /parcelas/usos/plantilla`, `POST …/importar` (usos históricos) | `parcelas.usos.*` |
| `GET/POST /parcelas/contratos`, `GET/PUT/DELETE …/:id`, `POST …/:id/terminar`, `/anular`, `POST …/:id/documento` (multipart), `GET …/:id/documento`; Excel | `parcelas.contratos.*` |
| `GET /parcelas/rentas` (filtros: estado, desde, hasta, lado, localidad), `POST /parcelas/rentas/:id/marcar`, `/desmarcar`, `/omitir` | `parcelas.rentas.*` |
| `GET /parcelas/reportes/<reporte>` y `…/<reporte>/exportar` | `parcelas.reportes.*` |

Archivos con el `limitarSubidas` de archivos y `recurso_dueno` propio.

## 12. Cliente

| Sección del menú | Pantalla | Forma |
|---|---|---|
| Administración (Empresas) | **Inmuebles** (con Excel) | Recurso completo: lista, formulario en página (`CamposDeInmueble`) y ficha con «Valores» (dos listas, matrícula fiscal y catastro municipal, y ventana; la categoría del IUSI solo en matrícula) y la escritura |
| Administración | **Parcelas** (con Excel) | Lista por localidad en **árbol** (tarjetas con sangría: código, nombre, tipo, superficie en la unidad de la empresa, uso vigente, tenencia, etiquetas «Arrendada», «Cedida», «Inactiva»). Formulario en página (`CamposDeParcela`) con **calculadora de superficie** (cifra + unidad + varas de cuerda → m², ha y mz en vivo), punto en el mapa y secciones aportadas por otros módulos. Ficha con pestañas: Datos, Mediciones, Usos (línea de tiempo), Inmuebles, Contratos |
| Administración | **Tipos de parcela** (con Excel) | Catálogo (lista y ventana) |
| Administración | **Contratos de tenencia** (con Excel) | Lista con filtros (lado, clase, estado, localidad, por vencer) y etiquetas «Debe inscribirse», «Vence en N días»; formulario en página con la renta según la forma; ficha con el calendario de cuotas y el documento |
| Operación | **Rentas** | Lista de cuotas pendientes y vencidas (agrupadas por mes), con «Marcar documentada» (referencia) y «Omitir» (motivo). Sin Excel (operación) |
| Reportes | §13 | Imprimir y exportar |

Notas: la página solo arma; composables `usarParcelas`, `usarArbolDeParcelas`, `usarContratos`, `usarRentas`; la lógica
pura (conversión de superficie, armado del árbol, calendario de vista previa, aviso de inscripción) en `edicion-de-*.ts`
con pruebas. **Sin dependencias nuevas** en v1. La pestaña de Usos cambia el uso desde la ficha (`usos.crear`). El
generador sirve para tipos de parcela (catálogo) e inmuebles (completo); Parcelas y Contratos parten del generador
completo y se ajustan (árbol, calendario).

## 13. Reportes (sección Reportes: imprimir y exportar)

| Reporte | Contenido | Filtros |
|---|---|---|
| **Superficie por localidad y uso** | Hojas activas agrupadas por localidad y uso a una fecha: total, útil, en m², ha y mz; total de la localidad | Fecha, localidad, uso |
| **Historial de usos** | Períodos por parcela (para incentivos forestales, rotación, auditoría) | Desde, hasta, localidad, uso |
| **Contratos de tenencia** | Vigentes a una fecha: contraparte, parcelas, superficie, renta, vencimiento, inscrito, IUSI a cargo; los que deben inscribirse y los que vencen pronto | Fecha, lado, clase, localidad |
| **Calendario de rentas** | Cuotas por vencimiento con estado; totales por moneda y por especie (producto y unidad) | Desde, hasta, lado, estado, localidad |
| **Inmuebles y valores** | Inmuebles con matrícula, valor vigente de cada fuente desglosado (matrícula fiscal y catastro), fecha del avalúo y su antigüedad, categoría del IUSI vigente, quién paga el IUSI según los contratos (lo que pide el dictamen §6 como «recordatorio») | Fecha, titularidad, localidad |
| **Parcelas sin inmueble o sin medición** | Control de datos incompletos | Localidad |

Respetan el alcance por localidad; el encabezado dice «Solo las localidades asignadas» cuando corresponde.

## 14. Excel (según la sección del menú)

| Pantalla | Sección | Importar | Exportar |
|---|---|---|---|
| Inmuebles | Administración | Sí: una fila por inmueble; desde PA-0b, con el valor vigente de matrícula y el de catastro (opcionales, con su fecha, origen y la categoría del IUSI); localidad y departamento por nombre | Sí |
| Tipos de parcela | Administración | Sí | Sí |
| Parcelas | Administración | Sí: una fila por parcela con localidad (nombre), código de la madre (en el mismo archivo, ordenado por nivel, o ya cargada), tipo, tenencia, cifra y unidad de la medición inicial, útil, uso vigente con su fecha, punto, inmuebles por nombre separados por «;» | Sí |
| Usos históricos | Administración (desde Parcelas) | Sí: código de parcela, uso, detalle, desde, hasta | Con el de Parcelas no (el historial va en el reporte) |
| Contratos de tenencia | Administración | Sí: una fila por contrato; contraparte por NIT o nombre; parcelas por código separadas por «;»; el calendario se genera | Sí |
| Rentas | Operación | No | No (va en el reporte) |
| Reportes | Reportes | No | Sí |

Importar es todo o nada, con ensayo, 5,000 filas; cada fila pasa por el mismo caso de uso que el formulario. No hay
`sinAsignarAlCrear` que aplicar (no hay alcance propio).

## 15. Convivencia y riesgos

| # | Tema | Qué pasa | Qué se hace |
|---|---|---|---|
| R-1 | Encargado con alcance por localidad | Ve sus parcelas, contratos y rentas; los reportes solo lo suyo | Prueba de aislamiento con dos usuarios de localidades distintas (parcelas, contratos, cuotas leídas unidas al contrato) |
| R-2 | Localidad inactivada o eliminada en Empresas | Eliminar lo impide la llave (`no action`, 409 «en uso»). Inactivarla deja parcelas activas colgando | La lista de parcelas marca «Localidad inactiva»; crear bajo una localidad inactiva se rechaza. No se agrega un aviso a Empresas en v1 |
| R-3 | Ganadería y Cultivos todavía no existen | Los avisos de §9.1 no tienen quién responda | Se declaran y se publican igual (el mediador salta lo inactivo); sus pruebas usan un escucha falso |
| R-4 | Renta en dólares | El contrato guarda la moneda; las cuotas su monto en esa moneda | Sin conversión (no hay saldo ni partida en Parcelas). El reporte totaliza por moneda |
| R-5 | Arrendador rural sin FEL (dictamen §5) | El gasto no es deducible ni da crédito; la renta devengada sí es deuda (C-7) | No es tema de Parcelas: lo resuelve el registro en Libro de compras (o «no se muestra en reportes SAT»). La ficha del contrato recibido muestra una nota fija con el texto del dictamen y la de §3.5 (V-7) |
| R-6 | Activos fijos ya programó AF-2 con `valor_de_matricula`, `valor_catastral` y `valores_del_inmueble_completo` (§1.1) | Hoy hay dos lugares posibles para el mismo dato | Paso AF-P23 (§4.2, §16) antes de AF-5; sin datos que convertir; mientras tanto la pantalla de activos sigue pidiendo las cifras (nadie las usa: no hay cierres) |
| R-7 | Una matrícula fiscal que cubre varias fincas | Pasa en la práctica | Índice sin único; los valores se registran en un inmueble y el otro se liga como «misma matrícula» en observaciones (v1) |
| R-8 | Dos empresas de la cuenta con la misma finca | Cada una la registra (PA-14) | Sin llave entre ellas; el reporte por cuenta no existe en v1 |
| R-9 | Volumen | Una finca grande: cientos de parcelas, miles de usos; contratos indefinidos con cuotas mensuales | Índices por `(empresa_id, localidad_id)`; el calendario se extiende de 24 en 24 meses, no al infinito |
| R-10 | Configuración de factores cambiada | Las mediciones guardan m² y la cifra original | Solo cambia lo nuevo; el reporte muestra la cifra original |

## 16. Pasos (un commit cada uno; servidor y cliente por separado, con pruebas)

Revisada el 2026-11-19 con las respuestas del usuario y la validación del contador. **«Depende de»** = pasos que tienen
que estar en `main` antes. **«Espera»** = respuesta del usuario (§17.1) o pendiente (§18.1) sin la cual el paso no se
puede cerrar; «—» = nada. Los archivos (escritura, avalúo, plano, contrato) salen de los pasos de datos y van juntos en
PA-AR, después de la revisión de `seguridad`: así ningún paso de datos espera esa revisión (las columnas `*_archivo_id`
nulas se crean igual en su tabla).

| Paso | Qué | Quién | Depende de | Espera |
|---|---|---|---|---|
| **PA-0a** (hecho 2026-11-19) | Empresas: `inmuebles` (`0014_inmuebles`, §5.1, **sin** `uso_declarado`) con `politicaPorEmpresa` + alcance opcional por localidad; crear, editar, inactivar, reactivar, eliminar (409 `inmueble_en_uso` al traducir la llave); permisos `empresas.inmuebles.*`; auditoría y auditoría permanente (motivo con C-9); Excel sin valores. Pruebas de tablas (checks del registro, único registral, copropiedad), aislamiento por localidad y empresa, API y Excel | backend | — | — |
| PA-0ac (hecho 2026-11-19, sin QA en el navegador) | Empresas → Inmuebles (recurso completo con el generador; sin valores ni escritura) | frontend | PA-0a | — |
| **PA-0b** (hecho 2026-11-23) | `valores_de_inmueble` (`0015`, §5.2): dos series, categoría del IUSI, registrar y eliminar, avisos `empresas.valor_de_inmueble_registrado` y `…_por_eliminar` en `core/contratos/empresas.contratos.ts` (prueba con un escucha falso que rechaza), columnas de valores en el Excel de inmuebles (también `GET …/:id/valores` para listar; PA-20 y PA-21 respondidas con la recomendación) | backend | PA-0a | — |
| PA-0bc (hecho 2026-11-23, sin QA en el navegador) | Ficha del inmueble → Valores (dos listas y ventana) | frontend | PA-0b, PA-0ac | — |
| AF-P23d | Llevar AF-P23 a `diseno-activos-fijos.md` (§3.5.1, §5.3, §6.5, pasos AF-5 y AF-7, pregunta AF-P23 respondida por PA-1 c) | arquitecto | — | PA-20 |
| **AF-P23** | Activos fijos: `00xx_af_p23_inmueble` (`inmueble_id`, quita las tres columnas y sus checks; aborta si hay valores), dominio y DTO, manejadores de los dos avisos (sin cierres aún, no rechazan: el rechazo real llega con AF-5) | backend | PA-0b, AF-P23d | — |
| AF-P23c | `CamposDeActivo`: selector de inmueble en edificios y terrenos en vez de matrícula y catastro | frontend | AF-P23 | — |
| **PA-1** (hecho 2026-11-23, con las correcciones de la revisión: varas en el Excel, localidad activa, bloqueos, límites y fecha no futura) | Esqueleto de `parcelas` (`dependeDe: ['terceros']`), configuración (§10.4, caballería en varas²), `tipos_de_parcela` (semilla perezosa, Excel), `parcelas`, `mediciones`, `parcelas_de_inmuebles` (`0001`), `dominio/superficie.ts` con las pruebas de §7, crear/editar/inactivar/eliminar, `parcelas.obtener_parcela_en_fecha` y avisos de inactivar y eliminar en `parcelas.contratos.ts`, Excel de parcelas; pruebas de jerarquía (misma localidad por llave, tope de niveles), aislamiento por localidad y llaves entre esquemas | backend | PA-0a | — (PA-23 respondida con la opción a) |
| PA-1c | Tipos de parcela (catálogo); Parcelas: árbol, formulario con calculadora, ficha (Datos, Mediciones, Inmuebles); `edicion-de-superficie.ts` con las mismas pruebas | frontend | PA-1, PA-0ac | — |
| **PA-2** | `usos` (`0002`, `0003 --custom`), abrir, cerrar, eliminar, aviso del INAB desde bosque, plantación forestal y conservación (texto sin cita literal, V-5), `uso_por_cerrar` y `superficie_por_cambiar`, importar usos históricos, evento `uso_cambiado`; prueba de la exclusión y de la concurrencia (dos aperturas a la vez) | backend | PA-1 | — |
| PA-2c | Pestaña Usos (línea de tiempo y cambio de uso) | frontend | PA-2, PA-1c | — |
| **PA-3** | `contratos` (con `tipo_de_documento`) y `parcelas_de_contratos` (`0004`), registrar, editar, terminar, anular, eliminar, `dominio/aviso-de-inscripcion.ts` (§7), uso cedido, notas fijas (V-7, C-10, R-5), Excel, eventos; pruebas de coherencia de la renta y de la localidad por llave | backend | PA-2 | PA-22 (si no ha llegado, se programa sin el aviso suave y se agrega después) |
| PA-3c | Contratos de tenencia (lista, formulario, ficha con las notas) y pestaña Contratos de la parcela | frontend | PA-3, PA-2c | — |
| **PA-4** | `cuotas_de_renta` (`0005`), `dominio/calendario-de-renta.ts` con pruebas puras, marcar, desmarcar, omitir, extender, respuesta a `empresas.revisar_cierre_de_carga` con los mensajes de C-7 (por moneda y especie aparte) | backend | PA-3 | — |
| PA-4c | Rentas (operación) y el calendario en la ficha del contrato | frontend | PA-4, PA-3c | — |
| **PA-AR** | Archivos: escritura del inmueble, documento del valor, plano de la medición y documento del contrato (`core.archivos`, qpdf, `recurso_dueno`, `limitarSubidas`), rutas de §11 | backend | PA-0b, PA-1, PA-3 | revisión de `seguridad` (§18) |
| PA-ARc | Subir y ver los archivos en las cuatro fichas | frontend | PA-AR | — |
| **PA-5** | Reportes de §13 (consultas y exportar), «Inmuebles y valores» con las dos series y la categoría vigente | backend | PA-4, PA-0b | — |
| PA-5c | Pantallas de reportes | frontend | PA-5 | — |
| PA-QA | Punta a punta: inmueble con valores → parcelas en árbol con mediciones en cuerdas y caballerías → usos (aviso del INAB) → contrato recibido con calendario (aviso de inscripción) → marcar cuotas → cierre de la carga con el aviso; usuario con una sola localidad | pruebas-qa | todo lo anterior | — |
| PA-6 (v2) | Polígonos: `geometria jsonb` (GeoJSON RFC 7946, WGS84, hasta 2,000 vértices y 256 KB, validado en el servidor), `area_calculada_m2` informativa, `sistema_de_origen` (`wgs84`, `gtm`); importación de KML y de coordenadas GTM convertidas en el servidor con fórmulas propias de la Transversa de Mercator (sin PostGIS, PA-19); mapa en el cliente con una dependencia nueva revisada por `seguridad` | backend y frontend | v1 completa | — |

**Primer paso programable: PA-0a** (no depende de nada ni espera respuestas). Después se pueden llevar en paralelo
PA-0ac, PA-0b (cuando lleguen PA-20 y PA-21) y PA-1 (cuando llegue PA-23). AF-P23 tiene que entrar **antes que AF-5**
(el cierre de Activos fijos es el primero que lee el tope del inmueble). Ningún pendiente de §18.1 bloquea un paso: todos
afectan textos de aviso o umbrales configurables.

## 17. Preguntas para el usuario

_**Respondidas el 2026-11-19**: PA-1 a PA-19 según la recomendación (ver «Respuestas del usuario» al final). Las preguntas
nuevas de la validación del contador están en §17.1._

Las PA-1 a PA-8 son las del dictamen (con la recomendación del arquitecto, que coincide salvo donde se dice).

| # | Pregunta | Opciones | Recomendación |
|---|---|---|---|
| PA-1 | ¿Dónde viven los inmuebles registrales (finca, folio, libro, matrícula)? | a) En Parcelas; b) en Activos fijos; c) en Empresas, como catálogo general | **c**: es un dato único que usan Parcelas, Activos fijos (tope de la matrícula) y cualquier empresa con oficinas; Empresas es esencial y cualquier módulo le pone llave. Implica ajustar el diseño de Activos fijos (§4.2) |
| PA-2 | ¿Parcela con finca registral? | a) Una finca por parcela; b) N:M con la porción | **b** |
| PA-3 | ¿Contratos en v1? | a) Solo la forma de tenencia; b) contrato con calendario de rentas informativo | **b**, sin calcular impuestos ni crear deudas (el calendario recuerda; la factura y el pago van por el libro y Cuentas por pagar) |
| PA-4 | ¿Renta en especie? | a) Solo dinero; b) dinero, especie por cantidad o porcentaje de la cosecha | **b** |
| PA-5 | ¿Varas de la cuerda? | a) Fija; b) por empresa; c) por empresa con excepción por localidad | **b** en v1 (cada medición guarda las varas que usó, así que una finca con otra cuerda se mide con su número sin perder nada); **c** solo si una misma empresa usa cuerdas distintas a menudo |
| PA-6 | ¿Mapa en v1? | a) Sin mapa; b) un punto; c) polígono con GTM y KML | **b** en v1, **c** en v2 |
| PA-7 | ¿Cuántos niveles? | a) Solo parcela; b) hasta 3 bajo la localidad (configurable); c) sin límite | **b** |
| PA-8 | ¿Calcular el IUSI? | a) No, datos y reporte; b) sí | **a** |
| PA-9 | ¿La contraparte de un contrato? | a) Un tercero de Clientes (`dependeDe: ['terceros']`); b) texto libre (sin dependencias) | **a**: después se cruza con el proveedor que factura la renta en el libro, y el NIT queda en un solo lugar |
| PA-10 | ¿Costos por parcela en v1? | a) No: los capturan Cultivos y Ganadería (que dependen de Parcelas y del libro); b) una columna «parcela» en las líneas del libro, caja chica y bancos; c) dimensiones analíticas en `core` | **a**. b obliga a los módulos generales a depender de uno de rubro; c es buena pero se decide con Contabilidad |
| PA-11 | ¿Tipos de parcela? | a) Lista fija (potrero, lote, parcela, tablón); b) catálogo editable por empresa con semilla | **b**, como los tipos de localidad: cada región los llama distinto |
| PA-12 | ¿Mover una parcela a otra madre o localidad? | a) No en v1 (inactivar y crear otra); b) sí, recalculando niveles | **a**: evita ciclos y que se muevan los datos de Ganadería y Cultivos de una finca a otra |
| PA-13 | ¿Ligar la cuota de renta con su factura del Libro de compras? | a) Referencia de texto; b) llave al documento (`dependeDe` suma `libro-de-compras`) | **a** en v1; **b** si se quiere el control «renta sin factura» automático |
| PA-14 | ¿Inmuebles por empresa o por cuenta? | a) Por empresa; b) compartidos por la cuenta | **a**: matrícula, IUSI y activo son del dueño |
| PA-15 | ¿Auditoría permanente de contratos e inmuebles? | a) Sí; b) no (60 meses como lo demás) | **a**: un arrendamiento dura más que la conservación |
| PA-16 | ¿Quién ve qué parcelas? | a) Todas (solo permisos); b) por localidad, con el alcance de Empresas | **b**, sin ventana de asignación propia |
| PA-17 | ¿Eliminar un contrato? | a) Nunca, solo anular; b) solo sin cuotas documentadas ni vencidas | **b**, con auditoría |
| PA-18 | ¿Parcelas responde al cierre de la carga inicial? | a) No (no tiene saldos); b) solo con avisos de rentas vencidas y contratos sin inscribir | **b**: ayuda a no olvidar la renta que se debía al corte |
| PA-19 | Para v2, ¿PostGIS o JSONB? | a) PostGIS (cambiar la imagen de PostgreSQL en desarrollo, producción y respaldo); b) JSONB con validación y cálculo en el servidor | **b** mientras no se necesiten consultas espaciales (cruces, «qué parcela contiene este punto»). PostGIS no está en `postgres:16-alpine` |

### 17.1 Preguntas nuevas (validación del contador, 2026-11-19)

Ninguna corrección del contador contradice una respuesta del usuario: PA-1 c (inmuebles en Empresas) se mantiene y las
correcciones de V-2 solo cambian cómo se guardan los valores. Estas cuatro son las preguntas del propio dictamen
(§3 de `dictamen-parcelas-validacion-2026-11-19.md`); el diseño ya está escrito con la recomendación, y si el usuario
elige otra cosa se cambia antes del paso que la espera (§16).

| # | Pregunta | Opciones | Recomendación | Paso que la espera |
|---|---|---|---|---|
| PA-20 | (V-2) ¿Los valores del inmueble se llevan en dos series y un valor ya usado no se borra? | a) Dos series (matrícula fiscal y catastro municipal), y un valor que Activos fijos ya usó en un mes cerrado no se elimina: se registra otro hacia adelante; b) una sola serie y se corrige eliminando | **a**: el art. 26 admite las dos bases y Activos fijos ya acordó tomar la mayor (A3); borrar un valor usado cambiaría depreciaciones ya declaradas. Cuesta una columna `fuente` y un aviso del mediador | PA-0b, AF-P23d |
| PA-21 | (V-6) ¿Cómo se guarda la categoría del IUSI (vivienda, residencial, mixto, comercial, otros)? | a) Por fecha, en cada valor de matrícula; b) un solo dato del inmueble, con auditoría de sus cambios | **a**: la categoría cambia la tasa y puede variar con el tiempo; si algún día se calcula el IUSI hace falta la que regía en cada trimestre, y con b solo se reconstruye leyendo la auditoría. Costo: la categoría se repite en cada avalúo | PA-0b |
| PA-22 | (V-3.2) ¿Avisar «Revise si debe inscribirse» en contratos indefinidos o con prórroga automática que ya pasaron de tres años? | a) Sí, aviso suave; b) no | **a**: la ley habla del plazo pactado y estos contratos se escapan de la regla; un aviso suave no molesta y nunca bloquea | PA-3 (no lo bloquea: se agrega después) |
| PA-23 | (V-1) ¿La caballería se declara en varas cuadradas? | a) `varas_cuadradas_por_caballeria = 645816`; b) `manzanas_por_caballeria = 64.5816` | **a**: misma base que la manzana (vara²), sin decimales que redondear; las dos dan el mismo resultado | PA-1 |

## 18. Para validar antes de programar

Con `contador-guatemala`: **validado el 2026-11-19** (`dictamen-parcelas-validacion-2026-11-19.md`, «correcto con
ajustes»).

| # | Punto | Propuesta del diseño | Dictamen | Dónde quedó |
|---|---|---|---|---|
| V-1 | Factor exacto de la caballería y de la vara | Factores en configuración de instalación | Vara y manzana correctas; **caballería 645,816 varas² (64.5816 mz)**, no 64.58 | §3.3, §7, §10.4; PA-23 |
| V-2 | parcela → inmueble ← activo, y Activos fijos lee la matrícula del inmueble | §4.2 | Correcto con tres ajustes: **dos series** (matrícula y catastro), tope según AF §3.5.1 (70 % sin cultivos permanentes), **no borrar** un valor usado en meses cerrados | §4.1, §4.2, §5.2, §6.1; PA-20; AF-P23 |
| V-3 | CC arts. 1125.6 y 1901.6 | Umbrales 36 y 12; avisos | Correcto con ajustes: **comparar por fecha**, usufructo siempre, aviso suave en indefinidos, escritura pública (art. 1576); aparcería con los umbrales del arrendamiento **(pendiente** de un abogado**)** | §3.5, §5.8, §7; PA-22 |
| V-4 | Usos `plantacion_forestal` y `cedida_a_terceros` | §3.6 | **Correcto**; la clasificación contable la decide Contabilidad | §3.6 |
| V-5 | Ley Forestal art. 46 | Aviso con licencia opcional | Correcto con ajustes: aviso también desde plantación forestal y conservación, **sin cita literal** (texto oficial pendiente) | §3.6, §6.4 |
| V-6 | Lista de «uso declarado» y la fecha en que rige | §5.1 | **Corregir**: `categoria_iusi` (vivienda, residencial, mixto, comercial, otros); «agrícola» no existe; vigencia **pendiente** | §5.1, §5.2; PA-21 |
| V-7 | La renta en especie no genera montos | §3.5 | Correcto; la nota fija advierte su efecto en IVA e ISR y que la renta en porcentaje es contingente | §3.5, §9.2 |

Otras correcciones del dictamen: C-1 y C-2 (citas NIIF: Secciones 16 y 20 de la NIIF para las Pymes, §3.6, §5.10,
§9.2), C-7 (mensaje de rentas vencidas por moneda y especie, §8), C-9 (motivo de la auditoría permanente, §4.3) y C-10
(texto de ayuda del IUSI a cargo del arrendatario, §3.5). C-8: sin cambio.

### 18.1 Pendientes (ninguno bloquea un paso; §16)

| # | Qué | Afecta | Quién |
|---|---|---|---|
| P-1 | Texto oficial del art. 46 de la Ley Forestal (PDF del INAB; extraerlo con `pdftotext`) | Solo el texto del aviso (§3.6), que hoy no cita el artículo | contador |
| P-2 | Fecha en que rige el IUSI del Decreto 18-2026 (Diario de Centro América; ≈ 26-nov-2026) y si DICABI o las municipalidades publican una lista de categorías más fina | La ayuda de `categoria_iusi` (§5.2); la lista del check si aparece otra | contador |
| P-3 | Texto oficial de los arts. 1125, 1576 y 1901 del Código Civil (CENADOJ) y si regula la aparcería | Umbrales y textos del aviso de inscripción (configurables) | contador y un abogado |
| P-4 | El dictamen escribe `fecha_de_fin > fecha_de_inicio + 3 años`, pero su ejemplo (1-ene-2026 a 1-ene-2029 avisa) solo se cumple con `>=`, porque la fecha de fin es el último día del contrato. El diseño usa `>=` (§3.5) | `dominio/aviso-de-inscripcion.ts` (PA-3) | contador (confirmar) |

Con `seguridad` (**pendiente**; solo espera el paso PA-AR): los archivos nuevos (escritura del inmueble, documento del
valor, plano de la medición, documento del contrato) con `core.archivos`, qpdf y `recurso_dueno`; y en v2, la dependencia
del mapa y el límite del GeoJSON.

## 19. Pendientes que este diseño deja anotados

- Activos fijos: cambiar `valor_de_matricula`, `valor_catastral` y `valores_del_inmueble_completo` por `inmueble_id`
  (§4.2) y su pregunta **AF-P23** (pasos AF-P23d, AF-P23 y AF-P23c de §16). AF-P22 es otra (nombres de localidades).
- Con Contabilidad: dimensiones analíticas (PA-10 c), devengo del arrendamiento, renta en especie.
- Con Cuentas por cobrar / Ventas: el lado otorgado del contrato (cobro de la renta).
- Tareas y recordatorios (futuro): avisos de rentas por vencer, avalúos viejos y contratos por terminar fuera de la app.
- v2: polígonos (PA-6), colindancia con la parcela vecina como llave, mover parcelas (PA-12 b).

## Respuestas del usuario (2026-11-19)

- **PA-1 a PA-19 (§17): aceptó todas las recomendaciones.** Quedan así: PA-1 c (inmuebles en Empresas), PA-2 b (N:M con la
  porción), PA-3 b (contratos con calendario informativo), PA-4 b (dinero o especie), PA-5 b (varas de la cuerda por
  empresa), PA-6 b (un punto en v1; polígono en v2), PA-7 b (hasta 3 niveles, configurable), PA-8 a (no calcular el
  IUSI), PA-9 a (contraparte de Clientes), PA-10 a (costos en Cultivos y Ganadería), PA-11 b (tipos editables con
  semilla), PA-12 a (no mover parcelas en v1), PA-13 a (referencia de texto a la factura), PA-14 a (inmuebles por
  empresa), PA-15 a (auditoría permanente), PA-16 b (alcance por localidad), PA-17 b (eliminar sin cuotas documentadas ni
  vencidas), PA-18 b (avisos en el cierre de la carga), PA-19 b (JSONB en v2).
- El mismo día el contador validó V-1 a V-7 (`dictamen-parcelas-validacion-2026-11-19.md`); sus correcciones están en el
  texto y sus preguntas son PA-20 a PA-23 (§17.1), **sin responder**.
- **PA-20 y PA-21 (2026-11-23): se programan con la opción recomendada** (dos series de valores, un valor usado en un mes
  cerrado no se borra; la categoría del IUSI por fecha en el valor de matrícula).
- **PA-23 (2026-11-23): se programa con la opción recomendada** (`parcelas.unidades.varas_cuadradas_por_caballeria = 645816`,
  en la misma base que la manzana).
- La pregunta del inmueble para Activos fijos se renombra **AF-P23** (AF-P22 ya existía); PA-1 c la deja decidida en
  principio y falta llevarla a `diseno-activos-fijos.md` (paso AF-P23d).
