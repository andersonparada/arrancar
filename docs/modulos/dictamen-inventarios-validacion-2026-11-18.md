# Validación del contador: diseño de Inventarios (puntos V-1 a V-11 y decisiones del arquitecto)

Revisé `/home/aparada/proyectos/arrancar/docs/modulos/diseno-inventarios.md`, con las respuestas del usuario, y mi dictamen `/home/aparada/proyectos/arrancar/docs/modulos/dictamen-inventarios-2026-11-18.md`.

**Qué tan seguro es cada punto.** **A** = lo dicen la ley o el reglamento y lo vi en más de una fuente. **M** = fuente secundaria (despacho de contadores o tesis) o el número de artículo de memoria. **B** = falta verlo en la fuente oficial.

**Lo que no pude leer.** Los PDF oficiales (Congreso, SAT, TSE, ICNL, USAC) vienen comprimidos o escaneados, o responden 403. El texto que cito lo saqué de fragmentos de buscadores y de vLex.

## 1. Veredicto por punto

| # | Punto | Veredicto | Ajuste concreto |
|---|---|---|---|
| **V-1 / INV-A14** | Desde cuándo vale un método cambiado | **Correcto con ajustes** | Ver §2.1. La regla exacta es «el 1 de enero del año **siguiente** a la fecha de la autorización», no «cualquier 1 de enero». Falta resolver los ajustes que piden la ley y el reglamento. |
| **V-2** | Costos adicionales y rebajas con promedio: `min(1, C / cantidad de la entrada)` | **Incorrecto** | Ver §2.2. Hay que usar el factor exacto del promedio y volver a calcular el reparto en el recálculo. |
| **V-3** | Pequeño contribuyente: el faltante no genera débito | **Correcto con ajustes** | La lista de regímenes está incompleta. No tienen débito: `pequeno_contribuyente`, `pequeno_contribuyente_electronico`, `contribuyente_agropecuario` (impuesto del 5 % sobre ingresos, sin débito ni crédito; Decreto 7-2019, como ya dice `dictamen-cuentas-por-cobrar-y-ventas-2026-11-18.md`), `primario_pecuario` (derogado, solo para fechas anteriores) y `no_afiliado`. Solo `general` lleva débito. `ReglaDeIva` debe preguntar por la lista de regímenes **con** débito (`general`), no excluir uno solo. Certeza M: es mi opinión; la ley no lo dice de forma expresa. |
| **V-4** | Plantilla del reporte semestral y tipos de inventario | **Correcto con ajustes** | Ver §2.3. Los tipos del artículo **no coinciden** con las clases de la SAT, y «en tránsito» **no** es el traslado interno. |
| **V-5** | Con PEPS, el sobrante entra al costo de la última entrada (corrige mi dictamen) | **Correcto con ajustes** | Ver §2.4. Acepto la corrección. |
| **V-6** | `error_de_registro` no es faltante ni genera IVA | **Correcto con ajustes** | No es hecho generador porque no hubo pérdida física; corrige un registro. Tres condiciones. (1) Debe **referirse a la salida que corrige** (`movimiento_de_origen_id`, con el motivo). Si no, sirve para esconder faltantes reales y no pagar el IVA. (2) Entra al **costo de esa salida**, no al costo vigente. (3) El evento **revierte el destino original** (el concepto de gasto o la obra) y **no** va a otros ingresos. Hoy `ajuste_aprobado` mandaría el monto con `destinoDelSobrante`, y eso está mal. El `check` ya lo limita a cantidades positivas: está bien. Una salida registrada de menos no se ajusta: se registra la salida que faltó, con su destino. |
| **V-7** | Muestras gratis como hecho generador | **Correcto (prudente)** | La muestra que se regala sale a título gratuito: no es venta (art. 2 de la Ley del IVA, a título oneroso). Encaja en la donación entre vivos (art. 3 num. 9). No encontré ningún criterio de la SAT que la exceptúe. Se queda `requiere_factura = true` con aviso. Certeza M. **Novedad:** el Decreto 6-2026 (publicado el 2-mar-2026) exentaría del IVA las donaciones entre vivos hasta el 2.º grado de consanguinidad y el 1.º de afinidad (art. 7 num. 3 lit. b, según fuentes secundarias; certeza B). Solo le sirve a una persona individual que dona a su familia, y el retiro del dueño sigue gravado por el art. 3 num. 6. Basta con un aviso; no hace falta una regla. |
| **V-8** | Línea marcada como inventario y descartada en la bandeja: solo aviso | **Correcto con ajustes** | Si la línea sigue marcada `es_inventario` en el libro, Contabilidad la cargará a inventario sin que haya entrada en el kardex, y no cuadrarán. Recomiendo **(a)**: descartar exige quitar la marca en el libro, que entonces vuelve a gasto con su concepto. La otra opción es **(b)**: publicar `inventarios.linea_descartada` con el concepto, para que Contabilidad la mande a gasto. Lo que no puede pasar es que el descarte solo saque la línea de la bandeja. |
| **V-9** | Costo por empresa y no por bodega, frente al art. 41 | **Correcto** | El art. 41 habla de valuar las existencias al cierre con un método de forma consistente; no menciona bodegas. NIIF Pymes 13.18: la misma fórmula para inventarios de igual naturaleza. |
| **V-10** | Donación recibida a costo cero o a valor razonable | **Correcto con ajustes** | En lo contable va a valor razonable con abono a ingresos (práctica de la NIIF). En lo fiscal, sin factura que lo respalde, el costo deducible al venderla puede ser cero (soporte documental del art. 21 del Decreto 10-2012; certeza B). Ajustes: (1) el evento lleva `causa = donacion_recibida` y el valor, para que Contabilidad abone el ingreso; (2) el aviso agrega «sin factura, el costo puede no ser deducible; consulte a su contador». Que el usuario escriba el valor está bien. |
| **V-11** | Nota de crédito que llega con el mes cerrado: rebaja con la fecha de la nota | **Correcto** | Es un hecho nuevo, no un error del mes cerrado. Se reconoce cuando llega (NIIF 13.6, menos rebajas) y la parte de lo ya vendido va al costo del período actual. El IVA de la nota ya lo maneja Libro de compras. No hay que reabrir. |
| Decisión | `movimientos` solo con RLS por empresa | **Correcto** (en lo contable) | El costo es por empresa (INV-A4). El recálculo **tiene** que ver todas las salidas del artículo; si la política las ocultara, el kardex quedaría mal sin que nadie lo note, y eso es inaceptable en una auditoría. Una observación para `seguridad`: cada movimiento lleva `saldo_cantidad`/`saldo_valor` **de toda la empresa**. El kardex por bodega de un bodeguero debe calcular su propio saldo por bodega y no mostrar el de la empresa. |
| Decisión | En un mismo día, primero entradas, luego valores y al final salidas | **Correcto con ajustes** | Es aceptable: el promedio «puede calcularse periódicamente o a medida que se recibe cada envío» (NIC 2.27; la NIIF Pymes 13.18 no lo prohíbe) y evita existencias negativas que no existen. Pero rompe los **traslados** y la **devolución con PEPS**. Ver §2.5. |
| Decisión | Costos adicionales y rebajas: la existencia absorbe su parte y el resto va a resultados | **Correcto en el principio; la fórmula del promedio, incorrecta** | NIIF Pymes 13.6 (costo) y 13.20 (lo vendido es costo de ventas). PEPS con «lo que queda de la capa» está bien. El promedio se corrige como en §2.2. |

## 2. Detalle de los ajustes

### 2.1 Cambio de método (V-1, INV-A14)

- **[Ley]** Art. 41 del Decreto 10-2012: «Al adoptar uno de estos métodos de valuación, no puede ser variado sin autorización previa de la Administración Tributaria y en este caso deben efectuarse los ajustes pertinentes». Certeza A, por varias fuentes que coinciden.
- **[Reglamento]** Art. 31 del AG 213-2013. Para pedir el cambio hay que indicar:
  - la clase de bienes;
  - el sistema que se usa;
  - las razones;
  - «los ajustes contables que se efectúen con motivo del cambio solicitado y sus efectos».
  
  Además: «La resolución de autorización **regirá a partir del ejercicio inmediato siguiente** a aquel en que se autorice el cambio». Certeza M-A: fragmentos coincidentes; el PDF de serincoguatemala.com no abrió.
- **[Ley]** El período de liquidación del ISR es el año calendario (Decreto 10-2012, art. 35; certeza M en el número del artículo).

**Ajustes para el arquitecto:**

1. `desde` = 1 de enero de (año de `fecha_de_autorizacion` + 1), calculado y no escrito a mano. Comprobar que `fecha_de_autorizacion < desde`.
2. Si la autorización se registra tarde, cuando ya hay movimientos de ese año, hoy el diseño la rechaza. Propongo dos casos:
   - si todos los meses desde `desde` están abiertos, se acepta con recálculo (rehacer las capas o el promedio desde el 1 de enero);
   - si alguno está cerrado, el error dice cuáles hay que reabrir.
3. «No cambia el valor de nada» se queda **solo** como opción por omisión. La ley y el reglamento hablan de **ajustes pertinentes**, y la NIIF Pymes 10.11-10.12 pide aplicar el cambio de política hacia atrás salvo que sea impracticable. Ver la pregunta P-1.

### 2.2 Absorción con promedio (V-2): la fórmula está mal

`min(1, C / q)` solo acierta cuando no hubo otras compras. Dos contraejemplos:

- **Hay otras compras.** Entran 100 lb (A), luego 900 lb (B) y salen 500 lb. Llega un flete de Q30 sobre A. Con la fórmula del diseño, `min(1, 500/100) = 1`: se absorbe todo. En promedio, a A le queda la mitad (1 − 500/1000): se deben absorber **Q15** y Q15 van al costo de ventas.
- **El caso típico de una finca.** Entran 100 lb (A), salen 100 y entran 100 más (B). El diseño absorbe el 100 % del flete de A en las unidades de B. Lo correcto es **0 %**: todo va a resultados.

**Corrección:**

- Factor exacto del promedio: `f = Π (1 − q_salida / C_antes_de_esa_salida)`, sobre las salidas vigentes entre la entrada y la fecha del documento de costo. Las entradas posteriores no cambian `f`.
- `absorbido = round(monto × f)`; el resto va a resultados.
- El motor ya recorre esa línea del tiempo.

**Además (vale para promedio y PEPS):** los repartos guardan `absorbido` y `a_resultados` como valores fijos. Si después se registra o se anula una salida **anterior** al documento de costo, el factor cambia. El recálculo de §7.3 debe recalcular también los movimientos de valor desde P, actualizar `repartos_de_costo` e incluir la diferencia en `inventarios.costo_recalculado`.

### 2.3 Reporte semestral (V-4)

Deloitte (2025) enumera las clasificaciones que se reportan:

- bienes disponibles para la venta;
- producto terminado;
- materia prima;
- producto en proceso;
- producto pignorado;
- mercadería en consignación;
- mercadería en tránsito.

Desde el 6-jun-2025 el reporte se presenta en la Agencia Virtual y pide el número de autorización del Libro de inventarios y los folios. **No vi las columnas de la plantilla.** Certeza B hasta que alguien la baje o lea el manual de mayo de 2025.

**Ajustes:**

1. **Tipos y clases de la SAT.** Mantener los 7 tipos internos, que sirven para las cuentas contables, y agregar una **correspondencia fija tipo → clase de la SAT** en el dominio:
   - mercadería → disponibles para la venta;
   - materia prima y empaques → materia prima;
   - en proceso → en proceso;
   - terminado → terminado.
   
   Suministros y repuestos de consumo interno no son bienes para la venta ni materia prima. Propongo reportarlos como materia prima o no reportarlos; esto queda en certeza B y lo decide la plantilla.
2. **Pignorado y consignación** son **estados** de un bien propio, no tipos. Fuera de v1 está bien. La mercadería **de terceros** en consignación no se reporta.
3. **«En tránsito» no es el traslado interno en tránsito**, que sigue dentro de la empresa y se reporta en su clase. Para la SAT, tránsito es la mercadería **comprada y todavía no recibida**, como la importación en camino. En Arrancar son las líneas marcadas como inventario que siguen en la bandeja al corte, si la propiedad ya pasó. Recomiendo que el reporte las saque de la bandeja; la decisión final, cuando se vea la plantilla.

### 2.4 Sobrante con PEPS (V-5)

**Corrijo mi dictamen §4.** «Costo promedio vigente» vale solo para el promedio. Con PEPS, la existencia que queda es la de las capas más recientes, así que el costo de la última entrada es coherente con el método. El art. 41 no fija una regla.

**Ajustes:**

1. «Última entrada» = la última con **costo real**: recepción, saldo inicial, entrada manual con costo mayor que 0 o producción. Se excluyen las entradas de traslado, los sobrantes y la donación a costo 0.
2. El costo unitario es el **de su capa ya ajustado**, con los costos adicionales y las rebajas absorbidos: valor de la capa ÷ su cantidad inicial. No es el costo de la factura sin más.
3. Con promedio y `C = 0`, no hay promedio vigente: se toma el costo de la última entrada y, si no hay ninguna, se pide a mano, igual que en PEPS.
4. `error_de_registro` no sigue esta regla: va al costo de la salida que corrige (V-6).

### 2.5 Orden dentro del día: traslados y devoluciones

1. **Traslados.** La entrada del traslado va con orden 0 y la salida con orden 2, y la entrada copia el costo de la salida. Eso crea una **dependencia circular** en el recálculo. Con PEPS, además, la entrada crearía una **capa nueva** y cambiaría el orden de consumo, lo que contradice §3.2 («el traslado no cambia costos, ni con PEPS»). Con tránsito, la salida bajaría `saldo_valor` de la empresa durante días aunque el bien sigue siendo de la empresa, y el cierre de mes lo omitiría.

   **Corrección:** las dos mitades del traslado son **neutras para el costeo de la empresa**:
   - no cambian `C` ni `V`;
   - no crean ni consumen capas;
   - `saldo_*` sigue igual que antes;
   - su costo unitario es informativo: el costo vigente de la empresa en ese punto;
   - solo cuentan en la revisión de cantidades por bodega;
   - lo que está en tránsito sigue en el valor del artículo y en `existencias_al_cierre`, como «en tránsito interno».
2. **Devolución a proveedor con PEPS.** Debe rebajar **su propia capa**, no la más antigua. Si de esa capa queda menos que lo devuelto, la diferencia se toma al costo de la entrada y se rebaja de las capas siguientes, y el diseño debe decirlo. Con promedio, sacar el bien al costo de su entrada está bien.

## 3. Lo validado (sin cambios)

| # | Punto | Base |
|---|---|---|
| 1 | V-9: costo por artículo y empresa | Art. 41 del Decreto 10-2012; NIIF Pymes 13.18 |
| 2 | V-11: rebaja con la fecha de la nota, sin tocar el mes cerrado | NIIF Pymes 13.6 y 13.20 |
| 3 | V-7: muestras con `requiere_factura` | Art. 2 y art. 3 num. 9 de la Ley del IVA (certeza M) |
| 4 | RLS de `movimientos` solo por empresa (en lo contable) | Costo por empresa; integridad del kardex |
| 5 | Faltantes: los tres casos exceptuados solo con soporte; sin él, aviso de factura | Art. 3 num. 7 de la Ley del IVA (certeza A): «caso fortuito o de fuerza mayor... acta notarial»; delitos: «certificación de la denuncia... ratificados en el juzgado» |
| 6 | Absorción con PEPS: la proporción de la capa que queda | NIIF Pymes 13.6 y 13.20 |

## 4. Ajustes para `arquitecto-de-datos` (resumen)

1. `ReglaDeIva`: débito solo con régimen `general`. Sin débito: los dos pequeños contribuyentes, el agropecuario, `primario_pecuario` y `no_afiliado`.
2. `metodos_de_costeo`:
   - `desde` = 1 de enero del año siguiente a `fecha_de_autorizacion`, calculado;
   - registrar la autorización tarde se acepta con recálculo si los meses están abiertos;
   - campo opcional para el ajuste por el cambio, según la respuesta a P-1.
3. Costo adicional y rebaja con promedio: factor `f = Π(1 − q_s / C_antes)`. Recalcular `repartos_de_costo` en el recálculo, con su diferencia en el evento.
4. Traslados neutros para el costeo de la empresa (sin `C`/`V` ni capas) y lo que está en tránsito dentro del valor y de la foto del cierre.
5. Devolución a proveedor con PEPS sobre su propia capa.
6. Sobrante: la última entrada con costo real, al costo ajustado de su capa; el mismo respaldo con promedio y `C = 0`.
7. `error_de_registro`:
   - `movimiento_de_origen_id` obligatorio (la salida que corrige);
   - entra al costo de esa salida;
   - el evento revierte el destino original y no va a otros ingresos.
8. Descarte en la bandeja: quitar la marca `es_inventario` en el libro (recomendado) o publicar `inventarios.linea_descartada`.
9. Reporte semestral:
   - correspondencia de los 7 tipos con las clases de la SAT;
   - «tránsito» = líneas del libro sin recibir al corte, no el traslado interno;
   - pignorado y consignación como estados, fuera de v1.
10. Donación recibida: el evento lleva el ingreso; el aviso menciona el costo fiscal sin factura.
11. Para `seguridad`: el kardex por bodega no debe mostrar los saldos de toda la empresa.

## 5. Lo que tiene que decidir el usuario (sale de esta revisión)

| # | Pregunta | Opciones | Recomendación |
|---|---|---|---|
| **P-1** | Cuando la SAT autoriza un cambio de método, ¿el sistema registra el ajuste de valor que piden la ley y el reglamento («ajustes pertinentes»)? | a) No: la existencia pasa al nuevo método con el mismo valor (una sola capa al promedio) y el contador hace el ajuste en Contabilidad. b) Sí, opcional: al pasar a PEPS se pueden cargar las capas reales (fecha y costo), y la diferencia sale en un evento «ajuste por cambio de método» hacia utilidades acumuladas (NIIF Pymes 10.12) | **a** en v1: el cambio de método es raro (una vez en la vida de la empresa) y la resolución de la SAT dice qué ajuste hacer. La **b** después, si lo pide un cliente. |
| **P-2** | Al descartar en la bandeja una línea marcada como inventario, ¿qué pasa con la marca del libro? | a) Hay que quitar la marca en el libro (la línea vuelve a gasto); b) se descarta y se publica un evento para Contabilidad | **a**: una sola verdad, la del libro, y Contabilidad no tiene que conciliar dos fuentes. |
| **P-3** | Mermas normales (evaporación de combustible, granos que se secan), ¿causa propia? | a) No: entran como `sin_causa_exceptuada` (factura) o como `perecedero` con acta, como dice la ley; b) causa `merma_normal` con aviso | **a**: el art. 3 num. 7 solo exceptúa perecederos, caso fortuito y delitos. Una causa «merma normal» sin factura induciría a error. Las mermas **dentro del proceso** (NIIF 13.13) se registran como consumo, no como faltante. |

## 6. Veredicto

**Correcto con ajustes.**

- Hay que corregir antes de programar **INV-3** (motor de costeo): la fórmula de absorción con promedio (V-2, hoy incorrecta) y los traslados dentro del orden del día. Si no, el kardex queda mal.
- Antes de **INV-9** (ajustes): la lista de regímenes con débito y `error_de_registro`.
- Antes de **INV-13** (reportes): la correspondencia de clases para la SAT.
- Antes de **INV-14** (cambio de método): la fecha desde la que rige.

Lo demás se puede programar tal como está.

## Fuentes

- Decreto 10-2012, art. 41 (texto de «no puede ser variado sin autorización previa… ajustes pertinentes», tomado de fragmentos): [Congreso](https://www.congreso.gob.gt/assets/uploads/info_legislativo/decretos/2012/010-2012.pdf), [ICNL](https://www.icnl.org/wp-content/uploads/leydeacttrib.pdf), [Tesis USAC 03_5671](http://biblioteca.usac.edu.gt/tesis/03/03_5671.pdf), [Tesis USAC 03_7038](http://biblioteca.usac.edu.gt/tesis/03/03_7038.pdf), [Tesis USAC 03_6526](http://biblioteca.usac.edu.gt/tesis/03/03_6526.pdf)
- AG 213-2013 (Reglamento del Libro I), art. 31 («regirá a partir del ejercicio inmediato siguiente…»): [serincoguatemala.com](https://serincoguatemala.com/wp-content/uploads/2020/04/Acuerdo-Gubernativo-213-2013-Reglamento-Libro-I-LAT.pdf), [Gold Service](https://goldservice.com.sv/Docs/leyes/GUATEMALA/LEY%20DE%20ACTUALIZACI%C3%93N%20TRIBUTARIA%20DE%20GUATEMALA.pdf)
- Ley del IVA (Decreto 27-92), art. 3 nums. 6, 7 y 9 (texto literal): [vLex](https://gt.vlex.com/vid/ley-impuesto-valor-agregado-1075701258); copia en el [TSE](https://www.tse.org.gt/images/UECFFPP/leyes/decreto_27-92-iva.pdf)
- Decreto 6-2026 (exención de donaciones entre familiares; certeza B): [LexLatin](https://lexlatin.com/opinion/decreto-6-2026-guatemala-elimina-impuesto-herencias-legados-donaciones-muerte)
- Reporte semestral (clasificaciones, Agencia Virtual, autorización y folios): [Deloitte 2025](https://www.deloitte.com/latam/es/industries/consumer/perspectives/nueva-plataforma-informe-semestral-inventarios.html), [SAT en X](https://x.com/SATGT/status/1937666422739730559), [manual de usuario de 2025 (Studocu)](https://www.studocu.com/gt/document/universidad-mariano-galvez-de-guatemala/seminario-leyes/manual-de-usuario-reporte-semestral-de-inventarios-sat-2025/134476702), [Portal SAT](https://portal.sat.gob.gt/portal/sistemas-web/reportedeinventarios/) (respondió 403)
- NIIF para las Pymes, secciones 10.8-10.12 y 13.6, 13.13, 13.18 y 13.20; NIC 2.27 (promedio por período o por envío): [IFRS: NIIF para las Pymes](https://www.ifrs.org/issued-standards/ifrs-for-smes/), [IFRS: NIC 2](https://www.ifrs.org/issued-standards/list-of-standards/ias-2-inventories/)
- Régimen de contribuyente agropecuario (5 %, sin débito ni crédito): `/home/aparada/proyectos/arrancar/docs/modulos/dictamen-cuentas-por-cobrar-y-ventas-2026-11-18.md`; regímenes de la empresa en `/home/aparada/proyectos/arrancar/servidor/src/modulos/libro-de-compras/dominio/datos-fiscales-de-empresa.ts`
