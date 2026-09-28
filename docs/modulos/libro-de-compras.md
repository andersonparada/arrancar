# Módulo `libro-de-compras`

Estado: **en planificación** (2026-09-28). No se programa hasta que el usuario
apruebe este documento.

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
| Clasificación | En **líneas**: concepto de gasto, descripción, tipo (**bien** o **servicio**), monto y monto exento o no afecto. Una línea de bien puede ser de **combustible**. |
| Tasas de la ley | Retenciones: tasas, mínimos y escalones en **configuración de instalación** (la ley es igual para todas las empresas; soporte la cambia una vez). Nada fijo en el código. |
| Datos fiscales de la empresa | En el **formulario de Empresas** (ver abajo), no en configuración. |
| Datos fiscales del proveedor | En el **formulario de Proveedores** (ver abajo), no en una sección aparte. |
| Factura especial | **No** en esta versión: llega con el módulo de Factura electrónica. |
| Moneda | Solo GTQ hasta que exista *Moneda extranjera*. |

## Documentos

| Tipo | Uso |
|---|---|
| Factura | Compra a un contribuyente del régimen general. |
| Factura de pequeño contribuyente | Compra a un pequeño contribuyente. |
| Nota de crédito | Rebaja una factura del mismo proveedor (devolución, descuento). Siempre apunta a su factura y va al mismo destino. |
| *Factura especial* | *Futuro (módulo de Factura electrónica).* |
| *Declaración aduanera (DUCA)* | *Futuro (importaciones).* |

Datos: tipo, proveedor (id, NIT y nombre como estaban al registrar), serie,
número, UUID de autorización FEL, fecha de emisión, líneas, base, IVA, IDP,
exento, total, retenciones, **destino** (módulo), estado en el destino (pendiente o
procesado), estado (vigente o anulado) y, si es nota de crédito, la factura que
rebaja.

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

Campos que se ven **solo si Libro de compras está activo**; los edita quien puede
editar empresas:

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

**Futuro, con Contabilidad:** en el mismo formulario, la **cuenta contable por
defecto del proveedor, por empresa** (cada empresa tiene su propia nomenclatura).
Se planifica con el módulo de Contabilidad.

## Retenciones

Solo se calculan si **la empresa es agente de retención** y **al proveedor se le
retiene**. Las reglas y sus números van en configuración de instalación; el código
solo las aplica.

### IVA

| Agente (empresa) | Regla por omisión |
|---|---|
| Exportador, compra de productos agropecuarios | 65 % del IVA |
| Exportador, otros bienes y servicios | 15 % del IVA |
| Contribuyente especial u otro agente | 15 % del IVA |
| Sector público | 25 % del IVA, compras desde Q30,000 |
| Cualquier agente, compra a pequeño contribuyente | 5 % del total, facturas desde Q2,500.01 |

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
  puede quitarlas o ajustar el monto, y queda en la auditoría.
- Una nota de crédito sobre una factura con retención **ajusta la retención en
  proporción**.
- El número y la fecha de la **constancia** (RetenIVA o RetenISR) se anotan después,
  desde el reporte de retenciones.

## Conceptos de gasto

Catálogo **por empresa** (cada empresa tiene su propia nomenclatura contable):
nombre, tipo por omisión (bien o servicio), si es producto agropecuario (para la
retención de exportadores) y activo o inactivo. Contabilidad, cuando exista, ligará
cada concepto con su cuenta contable por empresa.

## Configuración (instalación)

| Variable | Contenido |
|---|---|
| `libro-de-compras.retenciones.iva` | Porcentajes por tipo de agente, el de pequeño contribuyente y los mínimos |
| `libro-de-compras.retenciones.isr` | Escalones del régimen opcional simplificado y su mínimo |

Solo el superacceso cambia la configuración (acordado el 2026-09-28).

## Permisos

| Permiso | Para |
|---|---|
| `libro-de-compras.documentos.ver` / `.registrar` / `.anular` / `.importar` | Ingreso de facturas |
| `libro-de-compras.conceptos.ver` / `.gestionar` / `.importar` / `.exportar` | Conceptos de gasto |
| `libro-de-compras.combustibles.ver` / `.gestionar` / `.importar` / `.exportar` | Combustibles e IDP |
| `libro-de-compras.libro.ver` / `.exportar` | Reporte del Libro de compras |
| `libro-de-compras.retenciones.ver` / `.exportar` / `.constancias` | Reporte de retenciones y anotar constancias |

Los datos fiscales de la empresa y del proveedor se editan con los permisos de
editar empresas y proveedores.

## Pantallas

- **Operación:** **Ingreso de facturas** (con importar Excel, por excepción).
- **Administración:** Conceptos de gasto y Combustibles (Excel: importar y exportar).
- **Reportes** (imprimir y exportar):
  - **Libro de compras y servicios** por mes: bienes, servicios, combustibles,
    exento, base, IVA y resumen mensual.
  - **Retenciones** por mes, IVA e ISR, con su constancia.
- Campos fiscales en los formularios de **Empresas** y **Proveedores**.

## Comunicación con otros módulos (patrón Mediator; se sigue discutiendo)

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

1. **L0 Mediator:** órdenes y eventos con contratos en el core, revisión del módulo
   activo, ESLint y documentación en `ARQUITECTURA.md`.
2. **L1 Datos fiscales:** campos en los formularios de Empresas y Proveedores
   (visibles si el módulo está activo).
3. **L2 Catálogos:** conceptos de gasto y combustibles con vigencias (servidor,
   cliente y Excel).
4. **L3 Documentos:** ingreso de facturas y notas de crédito con líneas, IDP,
   retenciones (estrategias y configuración), unicidad en la instalación, destino
   sugerido y órdenes al destino.
5. **L4 Excel de DTE recibidos:** investigar el formato de la SAT e importarlo.
6. **L5 Reportes:** Libro de compras y retenciones, con constancias.

## Fuera de esta versión

Factura especial, DUCA, no domiciliados en pantalla, generar las constancias en la
SAT, leer el XML de la FEL y traer los DTE directo de la SAT.
