# Módulo `libro-de-compras`

Estado: **en planificación** (2026-09-28). No se programa hasta que el usuario
apruebe este documento.

## Propósito

Ser el **registro único de los documentos fiscales de compra** de cada empresa:
facturas y notas de crédito de proveedores, su clasificación por concepto de gasto
y sus retenciones de IVA e ISR. De aquí salen el **Libro de compras y servicios**
que pide la SAT, el crédito fiscal del IVA y las constancias de retención.

Es un módulo **base**: no tiene pantallas de captura. Lo usan los módulos que
registran facturas, cada uno desde su propia pantalla:

| Módulo | Qué hace con la factura | Contrapartida contable (con Contabilidad) |
|---|---|---|
| **Cuentas por pagar** | La provisiona y la paga por contraseña | Proveedores |
| **Caja chica** (futuro) | La liquida y repone el fondo; no se provisiona | Fondo de caja chica |
| **Cuentas por liquidar** (futuro) | La descuenta del anticipo del empleado | Cuenta por liquidar del empleado |

**Es de este módulo:** el documento fiscal (emisor, serie, número, UUID, fecha,
montos, IVA), sus líneas por concepto, sus retenciones, el catálogo de conceptos
de gasto, los datos fiscales del proveedor y los reportes fiscales.
**No es de este módulo:** provisionar, pagar, reponer o liquidar. Eso lo decide el
módulo que registró el documento (su **origen**).

## Decisiones acordadas

| Tema | Decisión |
|---|---|
| Módulos separados | Cuentas por pagar, Caja chica y Cuentas por liquidar son módulos separados que **dependen** de este. Este se activa solo cuando se activa cualquiera de ellos. |
| Origen | Cada documento guarda el **módulo que lo registró** y el id del registro de ese módulo. Lo pone el sistema según la pantalla donde se captura; el usuario no lo elige. Un documento tiene un solo origen. |
| Documento único | Único **en toda la instalación** por NIT del emisor + tipo + serie + número, y por UUID de FEL. Si ya existe en otra empresa, el mensaje no dice dónde. Un documento anulado libera su número. |
| Clasificación | En **líneas**: cada línea tiene concepto de gasto, descripción, si es **bien o servicio** (el libro los separa) y monto. |
| Retenciones | Tasas en **configuración de instalación** (las cambia la ley); qué tipo de agente es la empresa, en **configuración de empresa**; el régimen del proveedor, en sus **datos fiscales**. El sistema propone y el usuario puede ajustar. |
| Factura especial | **No** en esta versión: llega con el módulo de Factura electrónica. El modelo queda listo para agregarla. |
| Moneda | Solo GTQ hasta que exista *Moneda extranjera*. |

## Documentos

| Tipo | Uso |
|---|---|
| Factura | Compra a un contribuyente del régimen general. |
| Factura de pequeño contribuyente | Compra a un pequeño contribuyente (IVA incluido, sin crédito fiscal separado). |
| Nota de crédito | Rebaja una factura del mismo proveedor (devolución, descuento). Siempre apunta a su factura. |
| *Factura especial* | *Futuro (módulo de Factura electrónica).* |
| *Declaración aduanera (DUCA)* | *Futuro (importaciones).* |

Datos: tipo, proveedor (id, NIT y nombre como estaban al registrar), serie,
número, UUID de autorización FEL, fecha de emisión, líneas, base, IVA, total,
retenciones, origen (módulo e id), estado (vigente o anulado) y, si es nota de
crédito, la factura que rebaja.

## Retenciones

### IVA (solo si la empresa es agente de retención)

| Agente (configuración de empresa) | Regla (configuración de instalación) |
|---|---|
| Exportador, compra de productos agropecuarios | 65 % del IVA |
| Exportador, otros bienes y servicios | 15 % del IVA |
| Contribuyente especial u otro agente | 15 % del IVA |
| Sector público | 25 % del IVA, compras desde Q30,000 |
| Cualquier agente, compra a pequeño contribuyente | 5 % del total, facturas desde Q2,500.01 |

- No se retiene si el proveedor también es agente de retención.
- Monto mínimo general configurable (Q2,500 por omisión).
- El tipo de agente de la empresa se configura; si es exportador, cada **concepto
  de gasto** dice si es producto agropecuario (65 %) o no (15 %).

### ISR (solo si la empresa es agente de retención de ISR)

| Régimen del proveedor | Regla |
|---|---|
| Opcional simplificado sobre ingresos | 5 % de la base sin IVA hasta Q30,000; sobre el excedente, 7 %. Solo facturas con base mayor de Q2,500. |
| Sobre utilidades | No se retiene. |
| Pequeño contribuyente | No se retiene. |
| No domiciliado | 5 %, 15 % o 25 % según el concepto. *El modelo lo soporta; la pantalla, después.* |

### Cómo se calculan

- Cada regla es una **estrategia** (patrón Strategy) con su clave, su base (IVA,
  base sin IVA o total), su tasa o escalones y su mínimo, leídos de la configuración.
- Al registrar el documento, el sistema **propone** las retenciones; el usuario
  puede quitarlas o ajustar el monto, y queda en la auditoría.
- Una nota de crédito sobre una factura con retención **ajusta la retención en
  proporción**.
- El número y la fecha de la **constancia** (RetenIVA o RetenISR) se anotan después,
  desde el reporte de retenciones.

## Datos fiscales del proveedor

Sección **«Datos fiscales»** en la ficha del proveedor (módulo Clientes). Solo se
ve si este módulo está activo:

- Régimen de IVA: general o pequeño contribuyente.
- Régimen de ISR: sobre utilidades, opcional simplificado, pequeño contribuyente
  o no domiciliado.
- Si es agente de retención de IVA.

## Conceptos de gasto

Catálogo **por cuenta** (compartido por sus empresas, como los proveedores):
nombre, si es bien o servicio por omisión, si es producto agropecuario (para la
retención de exportadores) y activo o inactivo. Contabilidad, cuando exista, ligará
cada concepto con su cuenta contable por empresa.

## Configuración

| Variable | Niveles | Por omisión |
|---|---|---|
| `libro-de-compras.retenciones.reglas` | instalación | Las tasas y mínimos de las tablas de arriba |
| `libro-de-compras.retenciones.agente_iva` | empresa | `ninguno` (`exportador`, `especial`, `sector_publico`) |
| `libro-de-compras.retenciones.agente_isr` | empresa | `false` |

Solo el superacceso cambia la configuración (acordado el 2026-09-28).

## Permisos

| Permiso | Para |
|---|---|
| `libro-de-compras.conceptos.ver` / `.gestionar` / `.importar` / `.exportar` | Catálogo de conceptos de gasto |
| `libro-de-compras.datos-fiscales.gestionar` | Editar los datos fiscales del proveedor |
| `libro-de-compras.libro.ver` / `.exportar` | Reporte del Libro de compras |
| `libro-de-compras.retenciones.ver` / `.exportar` / `.constancias` | Reporte de retenciones y anotar constancias |

Registrar o anular documentos no tiene permiso aquí: lo da el módulo de origen
(p. ej. `cuentas-por-pagar.facturas.registrar`).

## Pantallas

- **Administración:** Conceptos de gasto (Excel: importar y exportar).
- **Reportes** (imprimir y exportar):
  - **Libro de compras y servicios** por mes: separa bienes y servicios, base, IVA
    y resumen mensual.
  - **Retenciones** por mes, IVA e ISR, con su constancia.
- Sección «Datos fiscales» en la ficha del proveedor.

## Cómo lo usan los otros módulos (decisión de arquitectura a aprobar)

Hoy la regla es que los módulos **nunca** se llaman entre sí: solo por eventos.
Aquí no alcanza: registrar la factura en Cuentas por pagar y su documento fiscal
debe ser **una sola transacción**, y la unicidad se revisa antes de guardar.

Propuesta: un módulo puede usar la **API pública** de un módulo del que **depende**
(declarado en `dependeDe`), nunca al revés.

- El módulo que ofrece publica una fachada en `modulos/<clave>/publico.ts`, con
  casos de uso y DTO pensados para otros módulos (p. ej. `registrarDocumento`,
  `anularDocumento`, `calcularRetenciones`).
- El módulo que usa declara su propio **puerto** en `aplicacion/puertos/` y lo
  implementa en `infraestructura/` llamando a esa fachada. Su dominio y su
  aplicación no conocen al otro módulo.
- Corre en la misma transacción (la unidad de trabajo ya es una por petición).
- Para avisar hacia atrás (p. ej. Bancos avisa que se anuló un cheque) se siguen
  usando **eventos**.
- ESLint lo hace cumplir: solo se puede importar `modulos/<otro>/publico.ts`, y solo
  si `<otro>` está en `dependeDe`.

Lo mismo usará Cuentas por pagar con Bancos para emitir cheques y notas de débito.

## Pasos (un commit cada uno)

1. **L0 Arquitectura:** regla de la API pública, con su ESLint y su documentación
   en `ARQUITECTURA.md`. Que un módulo pueda aportar una sección a la ficha de un
   proveedor.
2. **L1 Servidor:** conceptos de gasto (con Excel), datos fiscales del proveedor,
   documentos con líneas y retenciones, unicidad en la instalación, estrategias de
   retención, configuración y fachada pública.
3. **L2 Cliente:** conceptos de gasto, sección de datos fiscales y reportes del
   Libro de compras y de retenciones.

## Fuera de esta versión

Factura especial, DUCA, IDP de combustibles, no domiciliados en pantalla,
generar las constancias en la SAT y leer el XML de la FEL para llenar la factura.
