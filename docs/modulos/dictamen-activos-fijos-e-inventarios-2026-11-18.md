# Dictamen: compra de varios bienes de uso, bodega y entrega (Activos fijos e Inventarios)

_Fecha: 2026-11-18. Agente `contador-guatemala`, a pedido del usuario: «debemos hacer una integración que se pueda
utilizar activos fijos e inventarios, porque puedo comprar varios tractores y llevar stock, también en el caso de las
sillas». Diseño que lo aterriza: `diseno-integracion-activos-fijos-e-inventarios.md`._

## Conclusión
La necesidad del usuario es válida: comprar varios tractores o 50 sillas, guardarlos y entregarlos poco a poco. Pero **el modelo tal como se plantea es incorrecto en lo contable**. Ese modelo es: existencias en bodega, que se vuelven activo al entregarse y se deprecian desde que se usan. Hay dos errores:

1. **Un bien comprado para usarlo** (no para venderlo ni para consumirlo) **es propiedad, planta y equipo desde que se compra**, aunque esté en una bodega. No es inventario.
2. **La depreciación contable empieza cuando el bien está disponible para usarse**, no cuando se entrega a alguien. Y no se detiene cuando el bien se guarda.

Por eso la «existencia» de bienes de uso **debe vivir en Activos fijos, no en Inventarios**. La entrega es un **traslado con su responsiva**, no un alta de activo. Lo de Inventarios hacia Activos fijos queda solo para tres casos: materiales de obra, la reclasificación de mercadería que se destina a uso propio y los repuestos menores.

## 1. NIIF para las Pymes: ¿inventario o propiedad, planta y equipo?

| Párrafo | Regla | Aplicación | Certeza |
|---|---|---|---|
| 13.1 | Inventario es lo que se tiene **para vender**, lo que está en producción para venderse, o los **materiales o suministros que se consumen** en la producción o en los servicios | Un tractor o una silla no se venden ni se consumen: **no son inventario** | A |
| 17.2 | Propiedad, planta y equipo son activos tangibles que se tienen **para usar** en la producción, para arrendar o para la administración, y que se usarán **más de un período** | Lo que decide es **para qué se tiene el bien**, no dónde está. Un tractor en bodega esperando asignación es propiedad, planta y equipo | A |
| 17.5 (enmienda 2015, igual que la NIC 16.8) | Las **piezas de repuesto, el equipo de reserva y el equipo auxiliar** son propiedad, planta y equipo cuando cumplen su definición. **Si no, son inventario** | Un motor de recambio o un tractor y una planta eléctrica de reserva: activo fijo. Filtros, aceite, llantas de recambio y repuestos menores: inventario de tipo «repuestos», que sale a «mantenimiento del activo X» (ya está en INV-AF) | A en la regla; M en la redacción literal (no pude extraer el PDF oficial) |
| 17.20 | La depreciación empieza cuando el bien está **disponible para su uso**, es decir, en el lugar y en las condiciones para operar como quiere la gerencia. **No cesa** aunque el bien esté sin usarse o retirado del uso activo | Un tractor nuevo, listo y guardado se **deprecia desde que se recibe en condiciones de operar**. Volver a guardarlo no detiene la depreciación (es la bandera «ocioso» que ya existe) | A (CTCP y CIJUF reproducen el texto) |
| 17.10 / 17.4 | Si el bien todavía necesita armado, instalación o un implemento para operar, sigue **en construcción** | Usar `en_construccion` solo en ese caso, no como «guardado» | A |
| NIC 16.9, aplicada por analogía (NIIF Pymes 10.6) | Se pueden **agregar** partidas que una por una son poco importantes (herramientas, moldes) | Justifica el **grupo** de 50 sillas | M |
| 27 | Un bien ocioso por largo tiempo, o que se piensa vender, es un indicio de deterioro | Reporte de activos ociosos o sin asignar para revisar deterioro. La NIIF para las Pymes **no** tiene la categoría «mantenido para la venta»: el bien sigue en Activos fijos | A |

**Excepción:** si la empresa **vende** tractores o sillas (distribuidor), esos bienes son mercadería (13.1) y van a Inventarios. Si después toma uno para su propio uso, se **reclasifica** al costo: sale del inventario y entra a un activo. Eso ya lo cubre la salida `obra_de_activo_fijo` de INV-AF, hacia un activo en construcción que luego se pone en uso.

## 2. ISR (Decreto 10-2012)

| Tema | Regla | Fuente | Certeza |
|---|---|---|---|
| Qué se deprecia | Bienes propios que se usan para generar renta gravada. La cuota de un año que no se deduce se pierde | Art. 25 | A |
| Base, método y porcentajes | Base: costo de adquisición e instalación hasta que el bien está listo (art. 26). Línea recta (art. 27). Máximos del art. 28: maquinaria y vehículos 20 %, mobiliario 20 %, herramientas 25 %, equipo de computación 33.33 % | Arts. 26-28 | A |
| **Desde cuándo** | **La ley no lo dice.** El art. 25 habla de bienes que se usan para la actividad. En la práctica se empieza el mes en que el bien se pone en uso o está disponible | Práctica (dictamen de Activos fijos §1.1) | M |
| Bien de uso guardado en bodega | Se declara como **activo fijo** en el balance de la declaración anual y en el Libro de inventarios (Código de Comercio arts. 368 y 374: el inventario de cierre incluye el activo fijo). **No va en el reporte semestral de inventarios** | Art. 42 num. 3; Código de Comercio | A en lo semestral (ese reporte es de existencias: mercadería, materia prima, en proceso, terminado…); M en el Libro de inventarios |
| Riesgo de llevarlo en Inventarios | Inflaría el inventario que se reporta a la SAT cada semestre y no cuadraría con el balance. Es un error de deber formal (Código Tributario art. 94) | Arts. 42 num. 3 y 94 | M |
| Bienes de poco valor que se van al gasto | **No hay umbral legal** en el ISR. El art. 28 trata todo bien mueble como depreciable (mobiliario al 20 %, herramientas al 25 %). Mandar al gasto una silla o una herramienta durable es una **política contable** con riesgo de ajuste si la SAT audita: puede reclasificarla y aceptar solo el 20 % o 25 % del año. No encontré un criterio de la SAT sobre esto | Art. 28; búsqueda sin resultado | **B** en la postura de la SAT |

**Fecha fiscal, mi opinión:** usar **la misma fecha** en los dos libros, la de «disponible para uso». Separarlas obliga a llevar dos fechas por activo para diferencias de uno o dos meses, que casi nunca importan. Además, empezar después de la disponibilidad expone a perder cuotas por el art. 25 si la SAT sostiene que el bien ya estaba apto. Certeza M.

## 3. IVA (Decreto 27-92)

| Tema | Regla | Fuente | Certeza |
|---|---|---|---|
| Crédito en la compra | Da el mismo 12 % si el bien es activo fijo vinculado a la actividad gravada (art. 16) o si es inventario o gasto vinculado (arts. 15-18). Lo que cambia es la **casilla del SAT-2237**: «activos fijos» o «compras». Por eso la marca `es_activo_fijo` de la línea debe ponerse bien **desde la compra** | Arts. 15-16, 20 | A en el crédito; M en los números de casilla |
| Entregar o trasladar el bien dentro de la empresa | **No es hecho generador**: no hay transferencia de dominio | Art. 2 y art. 3 num. 1 | A |
| Mercadería que pasa a uso propio del negocio | No es «retiro para uso personal» (art. 3 num. 6, que habla del dueño o su familia): se reclasifica sin factura | Art. 3 num. 6 | M (opinión) |
| Faltante en la bodega de activos, robo o destrucción | Puede generar débito, salvo caso fortuito, fuerza mayor o delito comprobado con acta o denuncia. Ya está en el diseño de bajas | Art. 3 num. 7; Reglamento (AG 5-2013) art. 5 | M |
| Pequeño contribuyente | Sin crédito: el IVA va al costo. El libro ya lo hace | Art. 47 y siguientes | A |

## 4. Práctica en Guatemala y lo que piden los auditores

| Práctica | Comentario |
|---|---|
| «Bodega de activos» o «activos por asignar» | Es común como **ubicación**, no como cuenta de inventario. El auditor **cuenta físicamente** lo que está en bodega, revisa que se deprecie desde la recepción y busca ociosos para el deterioro |
| «Tarjeta de responsabilidad» | Es el término del **sector público** (Contraloría). En las empresas privadas se dice **responsiva** o **acta de entrega**. El auditor pide las firmas y que la ubicación esté al día. Sugiero que el nombre del documento se configure por empresa |
| Etiqueta al recibir | Se pone la placa o el código **al recibir**, no al entregar: así el bien en bodega ya se puede contar |
| Repuestos importantes en una cuenta de inventario | Error frecuente que los auditores reclasifican (17.5) |
| Auxiliar contra mayor | El total de Activos fijos, con lo que está en bodega, cuadra con el mayor. Inventarios no debe tener bienes de uso |

## 5. El caso de las sillas

| Opción | ¿Es correcta? | Cuándo |
|---|---|---|
| a) Activo **grupo** (50 sillas, mobiliario 20 %) | **Sí** | Cuando la compra en conjunto es importante. El umbral se mide **por línea o por compra**, como ya hace la bandeja (NIC 16.9 por analogía) |
| b) **Bien de control** (gasto con control físico) | Sí en lo contable, si no es importante | Bienes baratos sueltos. Riesgo fiscal B (§2): dejar el umbral moderado y aprobado por el contador de la empresa |
| c) Inventario de suministros | **No** | Una silla no se consume. Sí es inventario la vajilla desechable, la papelería o el café |
| Entregar 20 de las 50 | El grupo hoy solo admite una ubicación y la baja total (AF-P10 b) | Hace falta **dividir el grupo**: 50 → 20 y 30, con su costo y su depreciación acumulada proporcionales en los dos libros. AF-P10 lo dejó como paso posterior; **esta necesidad lo vuelve necesario** |

## 6. Recomendación de modelo

**El stock de bienes de uso vive en Activos fijos.**

1. **Al capitalizar:** en la bandeja «Por capitalizar», una línea de 3 tractores se **reparte en N activos iguales**. El sistema divide el costo y deja el sobrante del redondeo en el último. Cada tractor queda con su serie (identificación individual). Las 50 sillas quedan en un grupo o en un bien de control.
2. **Al recibirlo listo:** **poner en uso con la fecha de disponibilidad**, en la ubicación «bodega de activos» (localidad o departamento) y sin responsable. Desde ahí se deprecia en los dos libros.
3. **Entregar:** es un **traslado** con boleta y responsiva, uno a uno o por lotes (el `grupo_id` ya existe). Si es una parte de un grupo, se divide antes de forma automática.
4. **Devolver a bodega:** traslado de vuelta y, si corresponde, bandera **ocioso**, que sigue depreciando. **Nunca** vuelve a Inventarios.
5. **Si necesita armado o instalación:** queda `en_construccion` hasta que esté listo.
6. **Inventarios** se queda con los repuestos menores y los suministros. Sus salidas a «mantenimiento» o a «obra» (que también sirve para reclasificar mercadería a uso propio) siguen como en INV-AF.

### Cambios para `arquitecto-de-datos` (no son migraciones escritas)

| # | Cambio |
|---|---|
| D1 | Capitalizar una línea en N activos iguales: parámetro de la operación de la bandeja, con el sobrante del redondeo en el último. El libro no tiene cantidad por línea, así que N lo escribe el usuario |
| D2 | **Dividir un grupo** (adelantar el paso posterior de AF-P10): activo nuevo con la cantidad separada; costos, tramos, cuotas y acumulada proporcionales en los dos libros; auditoría; prohibido en un mes cerrado salvo hacia adelante |
| D3 | Reporte «Activos sin asignar o en bodega»: en uso y sin responsable, o en la ubicación marcada como bodega de activos, con meses ociosos. Sirve para el deterioro (27) |
| D4 | Constancia por responsable (responsiva o tarjeta): todos los bienes a cargo de una persona, para firmar. El nombre del documento se configura por empresa |
| D5 | En Inventarios, un aviso al crear un artículo de tipo `repuestos` o `suministros` cuyo costo unitario pase del umbral de Activos fijos: «¿es un bien de uso? (17.5)». Es un aviso, no un bloqueo |
| D6 | La exclusión entre `es_activo_fijo` y `es_inventario` se queda como está: es correcta |

## 7. Decisiones para el usuario

| # | Pregunta | Opciones | Recomendación |
|---|---|---|---|
| U1 | ¿Dónde vive el stock de tractores, sillas o computadoras sin asignar? | a) Activos fijos (ubicación «bodega»); b) Inventarios, con una salida que crea el activo; c) que cada empresa elija | **a**. La b clasifica mal el balance, los mete en el reporte semestral de la SAT y retrasa la depreciación |
| U2 | ¿Desde cuándo se deprecia lo guardado? | a) Desde que está disponible (recibido y listo), en los dos libros; b) desde la entrega; c) configurable | **a** (17.20). La b es contraria a la NIIF |
| U3 | ¿Cómo se entrega una parte de un grupo? | a) Dividir el grupo de forma automática al trasladar; b) registrar cada silla aparte; c) no permitirlo | **a** (D2) |
| U4 | ¿Capitalizar una línea en N unidades iguales? | a) Sí; b) no, se reparte a mano | **a** (D1) |
| U5 | Bienes de control y el ISR (régimen sobre las utilidades) | a) Gasto también en lo fiscal, con un aviso sobre el riesgo; b) llevar un libro fiscal aunque sea bien de control | **a**, con umbral moderado aprobado por el contador. La b complica el modelo para montos menores |
| U6 | ¿Equipo de reserva y repuestos importantes van como activo, depreciándose aunque no se usen? | a) Sí (17.5); b) inventario | **a** |

## Veredicto
**Incorrecto tal como se planteó** (inventario que se vuelve activo al entregarse y se deprecia desde el uso), por NIIF 13.1, 17.2, 17.5 y 17.20 y por el reporte semestral del art. 42 num. 3. **La necesidad se resuelve dentro de Activos fijos con ajustes:** D1 a D5 y las decisiones U1 a U6. No hace falta ningún paso nuevo entre Inventarios y Activos fijos.

## Fuentes
- Decreto 10-2012, Ley de Actualización Tributaria, arts. 21, 25-28, 41, 42 num. 3: https://www.congreso.gob.gt/assets/uploads/info_legislativo/decretos/2012/010-2012.pdf y la copia de ICNL: https://www.icnl.org/wp-content/uploads/leydeacttrib.pdf
- Ley del IVA, Decreto 27-92, arts. 2, 3, 15-16 y 20: https://gt.vlex.com/vid/ley-impuesto-valor-agregado-1075701258
- Reglamento de la Ley del IVA, AG 5-2013, art. 5: https://cgab.org.gt/wp-content/uploads/2023/10/Reglamento-de-la-Ley-del-IVA-Acuerdo-Gubernativo-5-2013_3.pdf
- NIIF para las Pymes (IASB): https://www.ifrs.org/issued-standards/ifrs-for-smes/ ; enmiendas de 2015 a la 17.5 sobre repuestos y equipo de reserva: https://iasplus.com/content/be8318a2-c8d5-42d9-ba5f-3676f9275fa1
- NIC 16, párrafos 8 y 9, en español: https://www.ifrs.org/content/dam/ifrs/publications/html-standards/spanish/2025/issued/ias16.html
- NIIF Pymes 17.20, texto reproducido por el CTCP: https://accounter.co/normatividad/obligatoriedad-de-depreciar-la-propiedad-planta-y-equipo-en-entidades-que-aplican-marcos-tecnicos-niif , https://accounter.co/niif/propiedad-planta-y-equipo-cambio-de-metodo-de-depreciacion-niif-concepto-849-ctcp-de-2020 y https://cijuf.org.co/sites/cijuf.org.co/files/normatividad/2019/concepto%20661.pdf
- Repuestos y equipo auxiliar: https://accounter.co/niif/tratamiento-de-las-piezas-de-repuesto-herramientas-y-equipo-auxiliar-en-las-niif
- Reporte semestral de inventarios: https://portal.sat.gob.gt/portal/sistemas-web/reportedeinventarios/ y https://www.deloitte.com/latam/es/industries/consumer/perspectives/nueva-plataforma-informe-semestral-inventarios.html
- Documentos del repositorio: /home/aparada/proyectos/arrancar/docs/modulos/diseno-activos-fijos.md (§3.2, §3.4, AF-P10), /home/aparada/proyectos/arrancar/docs/modulos/diseno-inventarios.md (§3.7, §4.3), /home/aparada/proyectos/arrancar/docs/modulos/dictamen-activos-fijos-2026-11-18.md y /home/aparada/proyectos/arrancar/docs/modulos/dictamen-inventarios-2026-11-18.md

**Límites de este dictamen:** no pude extraer el texto oficial de los PDF de la NIIF para las Pymes ni del Decreto 10-2012 (los PDF no tienen texto legible). Las reglas de 17.20 y 17.5 se confirmaron con fuentes secundarias que las reproducen. No encontré un criterio de la SAT sobre bienes de poco valor (por eso queda en certeza B). No verifiqué si la tercera edición de la NIIF para las Pymes (vigente desde 2027) cambia la sección 17.
