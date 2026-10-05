# Módulo `libro-de-compras`

Estado: **en planificación** (2026-09-28; corregido el 2026-09-29 con
`validacion-h7-h11-retenciones.md` y las «Respuestas del usuario (2026-09-29)» de
`plan-hallazgos-contables.md`, que mandan sobre este documento). No se programa hasta
que el usuario apruebe este documento.

> **Nota (2026-09-29, PLAN §3.5):** donde este documento dice `gestionar` léase `crear`, `editar` y `eliminar` (el que corresponda a cada acción; inactivar y reactivar van con `editar`), y `reabrir` ya no es solo de acceso total: `soloAccesoTotal` se eliminó.

## Propósito

Ser el **registro único de los documentos fiscales de compra** de cada empresa:
facturas y notas de crédito de proveedores, su clasificación por concepto de gasto,
el IDP de los combustibles y las retenciones de IVA e ISR. De aquí salen el **Libro
de compras y servicios** que pide la SAT, el crédito fiscal del IVA y las
constancias de retención.

Tiene **una sola pantalla de captura**, «Ingreso de facturas», donde el operador
registra el documento y elige su **destino**. El módulo de destino lo recibe en su
bandeja de pendientes y completa lo suyo:

| Destino | Qué hace con la factura | Contrapartida contable (con Contabilidad) |
|---|---|---|
| **Cuentas por pagar** | Pone el vencimiento, la provisiona y la paga por contraseña | Proveedores |
| **Caja chica** (futuro) | La asigna a una liquidación del fondo; no se provisiona | Fondo de caja chica |
| **Cuentas por liquidar** (futuro) | La descuenta del anticipo del empleado | Cuenta por liquidar del empleado |

**Es de este módulo:** el documento fiscal, sus líneas, el IDP, sus retenciones, el
destino, los conceptos de gasto, los combustibles y los reportes fiscales.
**No es de este módulo:** provisionar, pagar, reponer o liquidar. Eso lo hace el
módulo de destino.

## Decisiones acordadas

| Tema | Decisión |
|---|---|
| Módulos separados | Cuentas por pagar, Caja chica y Cuentas por liquidar son módulos separados que **dependen** de este. Este se activa solo cuando se activa cualquiera de ellos. |
| Ingreso único | Pantalla de Operación **«Ingreso de facturas»**: datos fiscales + destino. Solo se ofrecen los destinos cuyo módulo está activo. |
| Destino sugerido | Al elegir el proveedor, el sistema **sugiere el destino que se usó la última vez con ese proveedor** en esa empresa. El usuario lo puede cambiar. |
| Bandeja del destino | Cada módulo de destino tiene su bandeja de documentos pendientes de procesar. Así la pantalla de ingreso no conoce los campos de cada módulo. |
| Excel | «Ingreso de facturas» **importa Excel** (excepción acordada a la regla de Operación, para trabajar más rápido). Formato: el de los DTE recibidos que descarga la SAT (se investiga en su paso). Cada fila toma el destino sugerido de su proveedor. Después se evaluará traerlos directo de la SAT. |
| Documento único | Único **en toda la instalación** por NIT del emisor + tipo + serie + número, y por UUID de FEL. Si ya existe en otra empresa, el mensaje no dice dónde. Un documento anulado libera su número. |
| Clasificación | En **líneas**: concepto de gasto, descripción, tipo (**bien** o **servicio**), monto y monto exento o no afecto. Una línea de bien puede ser de **combustible** o de **activo fijo**. |
| Tasas de la ley | Retenciones: tasas, mínimos y escalones en **configuración de instalación** (la ley es igual para todas las empresas; soporte la cambia una vez). Nada fijo en el código. |
| Datos fiscales de la empresa | En el **formulario de Empresas** (ver abajo), no en configuración. Razón social, nombre comercial y fecha de inicio **ya existen** (H5a, esquema `empresas`); este módulo agrega solo regímenes y agentes de retención. |
| Datos fiscales del proveedor | En el **formulario de Proveedores** (ver abajo), no en una sección aparte. |
| Retenciones | Se calculan y **fijan al registrar** el documento (respuesta del usuario, 2026-09-29), no al autorizar. El módulo de destino solo las **descuenta** (Cuentas por pagar, en el primer pago). |
| Se muestra en reportes SAT | Casilla en el documento, **marcada por omisión** (ver abajo). Desmarcada: sin crédito fiscal ni retenciones. |
| Comisiones bancarias (H7) | Los servicios bancarios están **exentos** (Ley del IVA, art. 7.4): la comisión se registra en **Bancos**; la FEL exenta del banco se puede registrar aquí como compra exenta (opcional). No hay destino «Bancos» ni tabla que ligue facturas con notas: la liga es la contraseña de Cuentas por pagar. |
| NIT del emisor (H10) | Obligatorio y distinto de CF; manda el del DTE. Si no coincide con el del proveedor elegido, **se rechaza**. |
| Plazo del crédito fiscal (H11) | Se guarda el **período** (mes del libro). Fuera de plazo **se registra con aviso** y el IVA va al costo. |
| Período declarado | Control **opcional por empresa, apagado por omisión**. |
| Activos fijos (P2) | La línea dice si es **activo fijo** (propuesto por su concepto de gasto); Cuentas por pagar paga esas facturas con un concepto bancario de **Inversión**. |
| Factura especial | **No** en esta versión: llega con el módulo de Factura electrónica. |
| Moneda | Solo GTQ hasta que exista *Moneda extranjera*. |

## Documentos

| Tipo | Uso |
|---|---|
| Factura | Compra a un contribuyente del régimen general. |
| Factura de pequeño contribuyente | Compra a un pequeño contribuyente. |
| Nota de crédito | Rebaja una factura del mismo proveedor (devolución, descuento). Siempre apunta a su factura y va al mismo destino. Lleva el número y la fecha de la factura (Ley del IVA, art. 17). |
| *Factura especial* | *Futuro (módulo de Factura electrónica).* |
| *Declaración aduanera (DUCA)* | *Futuro (importaciones).* |

Datos: tipo, proveedor (id, NIT y nombre como estaban al registrar), serie,
número, UUID de autorización FEL, fecha de emisión, **fecha de recepción** (fecha de
la retención de IVA), **período** (mes del libro), **se muestra en reportes SAT**,
**motivo sin crédito fiscal** (nulo si da crédito), líneas, base, IVA, IDP, exento,
total, retenciones, **destino** (módulo), estado en el destino (pendiente o
procesado), estado (vigente o anulado) y, si es nota de crédito, la factura que
rebaja.

### Se muestra en reportes SAT

Casilla del documento, **marcada por omisión**. Se desmarca para lo que no es una
factura FEL válida para crédito (p. ej. un recibo) pero hay que pagar:

- **No** da crédito fiscal ni lleva retenciones; todo el monto va **al costo**.
- **No** entra en el Libro de compras ni en el reporte de retenciones: solo sirve
  para el **control de pagos** del destino.
- Ver en «Preguntas para el usuario» qué reglas de documento (NIT, UUID, unicidad)
  aplican cuando está desmarcada.

### NIT del emisor (H10)

Al registrar, **Libro de compras** exige un `Nit` válido y distinto de CF; en
*Clientes* el NIT sigue opcional. Manda el NIT del **DTE**: si el proveedor elegido
tiene otro, **se rechaza**; si no tiene, se propone completarlo con el del DTE (orden
`terceros.completar_nit`, en la misma transacción y con el permiso del ingreso). Error
`ProveedorSinNit` con enlace para completarlo. El documento guarda `nit_emisor` como
estaba. Detalle en `plan-hallazgos-contables.md`, H10.

### Período y crédito fiscal (H11)

Ley del IVA, art. 20: la factura se reporta en el período de su **emisión** o, a más
tardar, en los **dos meses siguientes** (factura de enero: período de enero, febrero
o marzo; el de marzo se declara en abril). Después no da derecho a crédito.

- `periodo` (primer día del mes) ≥ mes de emisión; se propone el mes de recepción, con aviso si es anterior al mes actual (puede estar declarado).
- **Motivo sin crédito fiscal** (en vez de un sí o no): `fuera_de_plazo`,
  `no_vinculado`, `pequeno_contribuyente` o `exento`. Con motivo `fuera_de_plazo` el
  período puede pasar de emisión + 2; sin motivo, no (`check`).
- **Fuera de plazo: se registra con aviso** (es costo y deuda real). El IVA va al
  costo, a la **cuenta configurable por empresa** (gasto deducible o no deducible;
  la cuenta contable llega con *Contabilidad*), y el documento **sí va** en el libro
  del período de registro, en la columna sin crédito fiscal (AG 311-97 art. 38;
  confirmar en el AG 5-2013).
- **Notas de crédito del proveedor** (Ley del IVA art. 17): rebajan el crédito del
  **período en que se reciben**, sin los dos meses de gracia. Si su factura quedó sin
  crédito fiscal, la nota rebaja el **costo**, no el crédito. Aviso si la nota es más
  de dos meses posterior a la factura.
- **Períodos declarados** (opcional por empresa, apagado por omisión):
  `libro_de_compras.periodos (empresa_id, periodo, estado 'abierto'|'declarado',
  declarado_en, declarado_por)`. Con el control encendido, no se registra ni se anula
  en un período declarado; declarar y reabrir con permiso propio y auditoría.
- Diseño de columnas y `check` en `plan-hallazgos-contables.md`, H11 (`iva_acreditable`
  pasa a ser el motivo).

### Comisiones y cargos bancarios (H7)

Validado por el contador (2026-09-29) y decidido por el usuario:

- Comisiones, manejo de cuenta, cheques rechazados, transferencias e intereses de
  entidades fiscalizadas por la SIB están **exentos** (Ley del IVA art. 7.4; Decreto
  10-2012 art. 22.4.e): no hay crédito fiscal que perder. La comisión se registra
  solo en **Bancos** (concepto «Comisiones bancarias»).
- Si el banco emite una **FEL exenta**, se puede registrar aquí como **compra exenta**
  (opcional; columna sin crédito fiscal).
- Lo que sí trae IVA y se debita en la cuenta (primas de seguro, débitos automáticos
  de terceros, comisiones de entidades no fiscalizadas por la SIB) se registra como
  cualquier factura. La liga con la nota de débito que lo pagó se hace con la
  **contraseña de Cuentas por pagar**; no hay destino «Bancos» ni tabla
  `bancos.documentos_de_notas`.
- Sin retenciones al banco (ya cobró el total; entre agentes no se retiene). Si el
  proveedor sería sujeto de retención, **aviso** (Decreto 20-2006 art. 7).

## Combustibles e IDP

El combustible es un **bien**; el Libro de compras lo lleva en su propia columna
porque el **IDP no forma parte de la base del IVA**.

**Ventana de Administración «Combustibles»** (configuración del usuario, no del
sistema; con Excel), **por empresa** (una empresa puede haber comprado en una gasolinera que todavía no vendía con etanol):

| Campo | Ejemplo |
|---|---|
| Nombre del combustible | Gasolina regular E10 |
| IDP por galón (Q) | 4.60 |
| Porcentaje de etanol | 10 % (solo la parte que no es etanol paga IDP) |
| Vigente desde | 2026-08-22 |
| Vigente hasta | vacío = es la tasa actual |

- El IDP se cobra **por galón en quetzales** (no es un porcentaje). El etanol baja
  la parte que paga IDP: con E10, solo el 90 % del galón paga IDP.
- Un mismo combustible no puede tener dos vigencias que se traslapen. Al registrar
  una tasa nueva, la anterior se cierra el día antes.
- Así se manejan también las **exenciones temporales**: una vigencia con IDP 0.

**En la línea de combustible** el usuario elige el combustible y escribe los
**galones** y el **total**. El sistema busca la tasa vigente en la fecha de la
factura y calcula:

> **IDP** = galones × IDP por galón × (1 − % de etanol)
> **IVA** = (total − IDP − exento) ÷ 1.12 × 12 %

## Datos fiscales de la empresa (formulario de Empresas)

**Ya hecho en H5a** (esquema `empresas`): razón social y nombre comercial
(`empresas.datos_fiscales`), fecha de inicio y carga inicial
(`empresas.cargas_iniciales`), y la orden `empresas.obtener_datos_de_empresa`
(nombre, NIT, razón social, nombre comercial). El NIT sigue en `core.empresas`
(nulable): Libro de compras lo **exige** al registrar (regla del caso de uso).

Lo que agrega este módulo, en `libro_de_compras.datos_fiscales_de_empresa` (1 a 1,
`empresa_id` único). Son campos que se ven **solo si Libro de compras está activo**
(falta el «espacio» para que un módulo aporte su sección al formulario de Empresas;
lo crea L1); los edita quien puede editar empresas:

- **Régimen de IVA:** general o pequeño contribuyente (el pequeño contribuyente no
  aprovecha crédito fiscal, así que su libro se lleva distinto).
- **Régimen de ISR:** sobre utilidades u opcional simplificado sobre ingresos.
- **Agente de retención de IVA:** ninguno, exportador, contribuyente especial o
  sector público.
- **Agente de retención de ISR:** sí o no.

## Datos fiscales del proveedor (formulario de Proveedores)

Campos que se ven **solo si Libro de compras está activo**, en el formulario y también en la **ficha del proveedor**:

- **Es pequeño contribuyente** (sí o no). Los reportes (Libro de compras y
  retenciones) **desglosan** lo comprado a pequeños contribuyentes.
- **Régimen de ISR:** sobre utilidades, opcional simplificado o no domiciliado (el
  pequeño contribuyente no tiene régimen de ISR aparte).
- **Es agente de retención de IVA** (entre agentes no se retiene).
- **Se le retiene IVA** (sí o no; por omisión según su régimen).
- **Se le retiene ISR** (sí o no; por omisión según su régimen).
- **Se le retiene el IVA de pequeño contribuyente** (sí o no).

Los tres «se le retiene» existen porque hay proveedores exentos por resolución de
la SAT, cooperativas u otros casos: el usuario manda sobre lo que diría el régimen.

Nada de esto existe todavía: *Clientes* (`terceros`) solo tiene el NIT opcional. Los
guarda este módulo en su esquema (ver «Preguntas para el usuario» sobre si van por
cuenta o por empresa), y se muestran con el mismo «espacio» de secciones que el
formulario de Empresas.

**Futuro, con Contabilidad:** en el mismo formulario, la **cuenta contable por
defecto del proveedor, por empresa** (cada empresa tiene su propia nomenclatura).
Se planifica con el módulo de Contabilidad.

## Retenciones

Solo se calculan si **la empresa es agente de retención**, **al proveedor se le
retiene** y el documento **se muestra en reportes SAT**. Las reglas y sus números van
en configuración de instalación; el código solo las aplica.

### IVA

| Agente (empresa) | Regla por omisión |
|---|---|
| Exportador, compra de productos agropecuarios | 65 % del IVA |
| Exportador, otros bienes y servicios | 15 % del IVA |
| Contribuyente especial u otro agente | 15 % del IVA |
| Sector público | 25 % del IVA, compras desde Q30,000 |
| Cualquier agente, compra a pequeño contribuyente | 5 % del total (Ley del IVA art. 48). Solo si el total de la factura es **mayor a Q2,500.00** (art. 49 del AG 5-2013; umbral configurable), y solo si la empresa es agente de retención del IVA (ver `validacion-h7-h11-retenciones.md`, sección del mínimo). |

- No se retiene si el proveedor también es agente de retención.
- Monto mínimo general: Q2,500 (configurable).
- Si la empresa es exportadora, cada **concepto de gasto** dice si es producto
  agropecuario (65 %) o no (15 %).

### ISR

| Régimen del proveedor | Regla por omisión |
|---|---|
| Opcional simplificado sobre ingresos | 5 % de la base sin IVA hasta Q30,000; 7 % sobre el excedente. Solo facturas con base mayor de Q2,500. |
| Sobre utilidades | No se retiene. |
| Pequeño contribuyente | No se retiene. |
| No domiciliado | 5 %, 15 % o 25 % según el concepto. *El modelo lo soporta; la pantalla, después.* |

### Cómo se calculan

- Cada regla es una **estrategia** (patrón Strategy) con su base (IVA, base sin
  IVA o total), su tasa o escalones y su mínimo, leídos de la configuración.
- Al registrar el documento, el sistema **propone** las retenciones; el usuario
  puede quitarlas o ajustar el monto, y queda en la auditoría. Al guardar quedan
  **fijadas** en el documento: el destino no las recalcula.
- **Fecha de cada retención** (la de su constancia y su mes en el reporte), según
  `validacion-h7-h11-retenciones.md`:

  | Retención | Fecha |
  |---|---|
  | ISR (régimen opcional simplificado) | **Fecha de la factura** (Decreto 10-2012 art. 48) |
  | IVA por agente (exportador, especial, otro, sector público) | **Fecha de recepción** (Decreto 20-2006; AG 425-2006 art. 10) |
  | IVA 5 % a pequeño contribuyente | **Al autorizar o pagar**, lo primero (Ley del IVA art. 48). El monto se fija al registrar; la fecha la informa el destino (orden `libro-de-compras.fechar_retencion`). En Cuentas por pagar siempre es la de autorizar, porque solo se paga lo autorizado. |

- Si el plazo de entero de ese mes ya pasó (15 días hábiles del mes siguiente para
  IVA; 10 días para ISR), **aviso** de multa e intereses; no se impide.
- El destino **descuenta** las retenciones del saldo una sola vez (Cuentas por
  pagar, en el **primer pago** de la factura), así el proveedor recibe el neto.
- Una nota de crédito sobre una factura con retención **ajusta la retención en
  proporción**.
- El número y la fecha de la **constancia** (RetenIVA o RetenISR) se anotan después,
  desde el reporte de retenciones.

## Conceptos de gasto

Catálogo **por empresa** (cada empresa tiene su propia nomenclatura contable):
nombre, tipo por omisión (bien o servicio), si es producto agropecuario (para la
retención de exportadores), si es **activo fijo** (lo propone en la línea; P2) y
activo o inactivo. Contabilidad, cuando exista, ligará
cada concepto con su cuenta contable por empresa.

## Configuración (instalación)

| Variable | Contenido |
|---|---|
| `libro-de-compras.retenciones.iva` | Porcentajes por tipo de agente, el de pequeño contribuyente y los mínimos |
| `libro-de-compras.retenciones.isr` | Escalones del régimen opcional simplificado y su mínimo |

Solo el superacceso cambia la configuración (acordado el 2026-09-28).

## Configuración (empresa)

| Variable | Contenido | Por omisión |
|---|---|---|
| `libro-de-compras.credito_fiscal.cuenta_fuera_de_plazo` | A dónde va el IVA sin crédito por fuera de plazo: gasto **deducible** o **no deducible** (la cuenta contable, con *Contabilidad*) | Ver «Preguntas para el usuario» |
| `libro-de-compras.periodos.control_de_declarados` | Encender el estado «declarado» de los períodos | Apagado |

## Permisos

| Permiso | Para |
|---|---|
| `libro-de-compras.documentos.ver` / `.registrar` / `.anular` / `.importar` | Ingreso de facturas |
| `libro-de-compras.conceptos.ver` / `.gestionar` / `.importar` / `.exportar` | Conceptos de gasto |
| `libro-de-compras.combustibles.ver` / `.gestionar` / `.importar` / `.exportar` | Combustibles e IDP |
| `libro-de-compras.libro.ver` / `.exportar` | Reporte del Libro de compras |
| `libro-de-compras.retenciones.ver` / `.exportar` / `.constancias` | Reporte de retenciones y anotar constancias |
| `libro-de-compras.periodos.declarar` / `.reabrir` | Períodos declarados (solo con el control encendido) |

Los datos fiscales de la empresa y del proveedor se editan con los permisos de
editar empresas y proveedores.

## Pantallas

- **Operación:** **Ingreso de facturas** (con importar Excel, por excepción).
- **Administración:** Conceptos de gasto y Combustibles (Excel: importar y exportar).
- **Reportes** (imprimir y exportar):
  - **Libro de compras y servicios** por período: bienes, servicios, combustibles,
    exento, base, IVA, **sin crédito fiscal** (con su motivo), compras a pequeños
    contribuyentes desglosadas y resumen mensual. No lleva los documentos con «Se
    muestra en reportes SAT» desmarcado.
  - **Retenciones** por mes (según la fecha de cada retención), IVA e ISR, con su
    constancia.
- Campos fiscales en los formularios de **Empresas** y **Proveedores**.

## Comunicación con otros módulos (patrón Mediator; L0 hecho)

Órdenes que este plan ya prevé: `libro-de-compras.recibir_documento` hacia el destino
(p. ej. Cuentas por pagar), `libro-de-compras.fechar_retencion` desde el destino (fecha
del 5 % a pequeño contribuyente), `terceros.completar_nit` (H10) y
`empresas.obtener_datos_de_empresa` (ya existe, H5a).

Los módulos **no se importan entre sí**. Se comunican por un **mediador** del core
con **contratos** (mensajes con su forma y su respuesta) en `core/contratos/`:

- **Orden** (p. ej. `RecibirDocumentoEnCuentasPorPagar`): la atiende **un solo**
  módulo, en la **misma transacción**, y devuelve un resultado. Si falla, se deshace
  todo.
- **Aviso** (p. ej. `MovimientoDeOrigenAnulado`): lo escuchan cero o varios
  módulos **dentro de la misma transacción**, para revertir lo suyo; si uno falla,
  se deshace todo. Solo lo reciben los módulos activos.
- **Evento** (los de siempre, p. ej. `DocumentoAnulado`): se publican **después**
  de confirmar la transacción, para reacciones que pueden ir aparte.
- Antes de pasar una orden, el mediador revisa que el **módulo destino esté
  activo** para la cuenta.
- La orden corre con el **mismo usuario y la misma empresa** (la seguridad por
  filas sigue aplicando) y el módulo que la atiende aplica todas sus reglas. No
  existe ninguna ruta HTTP para ella: un usuario solo llega por la ruta protegida
  del módulo que origina.
- **Permisos:** el del módulo que origina autoriza la operación completa (no se
  pide además el del otro módulo), para no romper la separación de funciones.
- Cada módulo declara su **puerto** en `aplicacion/puertos/` y lo implementa en
  `infraestructura/` enviando la orden al mediador. Su dominio no conoce a los
  demás.
- ESLint prohíbe importar otro módulo; solo `core/contratos`.

## Pasos (un commit cada uno)

Los módulos y sus ventanas se crean con el **generador** (`npm run generar --
modulo`, `definicion` y `recurso`); lo que el generador no cubra se completa a
mano sobre lo generado.

1. **L0 Mediator: hecho (2026-09-28).** Órdenes y avisos con contratos en el core
   (`core/mediador`, `core/contratos/mediador.contratos.ts`), revisión del módulo
   activo y documentación en `ARQUITECTURA.md` (sección 4.8); solo el core, sin
   contratos de negocio reales todavía. Ver la bitácora de `docs/PLAN.md`
   (2026-09-28) para el detalle. Cuando este módulo empiece a programarse, le toca
   crear `core/contratos/libro-de-compras.contratos.ts` con sus órdenes reales
   (p. ej. `libro-de-compras.recibir_documento`) y registrar sus manejadores en
   `modulo.ts`.
2. **L1 Datos fiscales (hecho, 2026-09-29; sin menú):** razón social, nombre comercial y fecha de inicio **ya
   existen** (H5a); no se vuelven a crear. Falta: el «espacio» para que un módulo
   aporte su sección a los formularios de Empresas y Proveedores (visible si el
   módulo está activo); `libro_de_compras.datos_fiscales_de_empresa` (regímenes y
   agentes de retención); los datos fiscales del proveedor (pequeño contribuyente,
   régimen de ISR, agente de retención de IVA y los tres «se le retiene»), también
   en su ficha.
3. **L2 Catálogos:** conceptos de gasto (con producto agropecuario y activo fijo) y
   combustibles con vigencias (servidor, cliente y Excel).
4. **L3 Documentos:** ingreso de facturas y notas de crédito con líneas, IDP,
   retenciones **fijadas al registrar** con su fecha (estrategias y configuración;
   la regla del mínimo del 5 % a pequeño contribuyente, **pendiente de la
   investigación del mínimo**, ver `validacion-h7-h11-retenciones.md`), casilla «Se
   muestra en reportes SAT», NIT de la empresa y del emisor (**H10**), período,
   motivo sin crédito fiscal y cuenta de fuera de plazo (**H11**), unicidad en la
   instalación, destino sugerido y órdenes al destino (`recibir_documento`,
   `fechar_retencion`). **H7** no pide nada más: la FEL exenta del banco es una compra
   exenta; ya no hay paso H7 en Bancos después de L3.
5. **L4 Excel de DTE recibidos:** investigar el formato de la SAT e importarlo.
6. **L5 Reportes y períodos:** Libro de compras y retenciones, con constancias; el
   control de períodos declarados (opcional por empresa).

## Fuera de esta versión

Factura especial, DUCA, no domiciliados en pantalla, generar las constancias en la
SAT, leer el XML de la FEL y traer los DTE directo de la SAT.

## Respuestas del usuario (2026-09-29, tarde)

Mandan sobre las preguntas de abajo.

| Tema | Decisión |
|---|---|
| Casilla SAT desmarcada | NIT y UUID **opcionales**; se sigue exigiendo que el documento no se repita (mismo proveedor, serie y número). |
| Datos fiscales del proveedor | **De la cuenta** (se capturan una vez para todas las empresas). |
| FEL exenta del banco | Destino **Cuentas por pagar**; se paga ligando la nota de débito de Bancos marcada para Cuentas por pagar. |
| IVA fuera de plazo | Se suma **al costo de cada línea** y hereda su deducibilidad (gasto, activo fijo, inventario); sin cuenta aparte. Plazo: art. **20** de la Ley del IVA (no el 18). Ver `validacion-h7-h11-retenciones.md`. |
| Nota de crédito bajo el mínimo del 5 % | La retención se **fija al registrar** y una nota posterior no la cambia (decisión del usuario, con el riesgo anotado en `validacion-h7-h11-retenciones.md`). |

## Preguntas para el usuario

Contradicciones o huecos que quedan tras las respuestas del 2026-09-29:

1. **Casilla SAT desmarcada (recibo):** ¿se sigue exigiendo NIT válido (H10) y la
   unicidad NIT + tipo + serie + número? Un recibo puede no tener NIT, serie ni UUID.
   Recomendación: sin NIT obligatorio ni UUID; único por proveedor + número.
2. **FEL exenta del banco registrada como compra exenta:** ¿a qué destino va? El banco
   ya cobró con la nota de débito, así que no hay nada que pagar. Recomendación: a
   Cuentas por pagar, y la contraseña se «paga» ligando la nota de débito que ya
   existe en Bancos (ver la pregunta 1 de `cuentas-por-pagar.md`).
3. **Cuenta del IVA fuera de plazo:** ¿qué valor por omisión, deducible o no
   deducible? El contador lo apoya como deducible (Decreto 10-2012 art. 21.15) pero es
   interpretación sin criterio SAT.
4. **Datos fiscales del proveedor:** el proveedor es de la **cuenta** (`terceros`,
   `politicaPorCuenta`). ¿Sus datos fiscales (régimen, «se le retiene») son iguales
   para todas las empresas de la cuenta (tabla por cuenta en este módulo) o cada
   empresa puede tenerlos distintos? Recomendación: por cuenta, porque el régimen es
   del proveedor, no de quien le compra. Diseño para el `arquitecto-de-datos`.
5. **Mínimo de la retención del 5 %:** investigado (mayor a Q2,500.00 por factura, art.
   49 del AG 5-2013; ver `validacion-h7-h11-retenciones.md`). Falta decidir qué pasa
   si una nota de crédito deja la factura en Q2,500.00 o menos después de retenida.
