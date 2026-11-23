# Módulo `libro-de-ventas` — se muestra como **Libro de ventas**

Estado: **en programación** (LV-1 hecho en el servidor el 2026-11-23). El diseño aprobado y sus pasos están en
`docs/modulos/diseno-cuentas-por-cobrar-y-ventas.md`; este documento resume lo que ya existe.

## Propósito

Ventas, retenciones recibidas y libro de ventas de la empresa, de cualquier rubro y régimen.

**Es de este módulo:** los conceptos de ingreso, los datos fiscales del cliente y, en los pasos siguientes del diseño,
los documentos emitidos, la bandeja de DTE emitidos, las retenciones recibidas con sus constancias, el libro del período
y los datos para el SAT-2237, el SAT-2046 y el ISR mensual.
**No es de este módulo:** la cartera, los cobros y los saldos (Cuentas por cobrar), el depósito (Bancos), emitir FEL ni
la contabilidad.

## Decisiones acordadas

| Tema | Decisión |
|---|---|
| Alcance | Por empresa (`empresa_id`, RLS por empresa); los datos fiscales del cliente son de la cuenta (RLS por cuenta) |
| Dependencia | Solo `libro-de-compras` (trae `terceros`): el historial fiscal y los períodos declarados viven allí |
| Conceptos | Semilla perezosa de cuatro; `venta_de_activo_fijo` es de sistema (no se edita, inactiva ni elimina) |
| Datos fiscales del cliente | Sección aportada al formulario de Clientes; sin fila el cliente no retiene nada |
| Auditoría permanente | `libro-de-ventas.documentos` y `.retenciones` (migración `0001`) |

## Recursos

| Recurso | Pantalla | Baja |
|---|---|---|
| Concepto de ingreso | Conceptos de ingreso (Administración) | Inactivar; eliminar solo sin líneas y si no es de sistema |
| Datos fiscales de cliente | Sección «Datos fiscales (ventas)» de Clientes (LV-1c) | Se van con el cliente |

## Tablas (esquema `libro_de_ventas`)

- `conceptos_de_ingreso`: único `(empresa_id, nombre normalizado)`, `check` de nombre (1–80), tipo y clave de sistema, único
  parcial por clave de sistema, llave `(id, empresa_id)`.
- `datos_fiscales_de_cliente`: PK `cliente_id`, llave compuesta `(cliente_id, cuenta_id)` a `terceros.clientes`
  (cascada), `check` del agente de retención, de «exporta productos agropecuarios» (solo exportador) y de «retiene IVA a
  pequeño contribuyente» (solo agente).

## Reglas (las garantiza el dominio)

- Los datos fiscales se contradicen si dice que exporta productos agropecuarios sin ser exportador, o que retiene IVA a
  pequeño contribuyente sin ser agente de retención.
- Un cambio de los datos fiscales de un cliente queda en la auditoría como `corregir` con lo anterior.

## Configuración

`libro-de-ventas.ict.tasa_general` (1.5), `.ict.tasa_exportacion` (2), `.ict.tasa_margen_bovino` (10),
`.pequeno_contribuyente.limites_anuales` (`{ "2026": 500285 }`), `.destino.consumidor_final` (`sin_cartera`) y
`.anticipos.tratamiento` (`aviso`). Las de la retención de la tarjeta se declaran en CXC-5.

## Permisos

| Permiso | Permite |
|---|---|
| `libro-de-ventas.conceptos-de-ingreso.ver` | Ver los conceptos de ingreso |
| `libro-de-ventas.conceptos-de-ingreso.crear` | Registrar conceptos de ingreso |
| `libro-de-ventas.conceptos-de-ingreso.editar` | Editar, inactivar y reactivar conceptos de ingreso |
| `libro-de-ventas.conceptos-de-ingreso.eliminar` | Eliminar conceptos de ingreso sin documentos |
| `libro-de-ventas.conceptos-de-ingreso.importar` / `.exportar` | Excel de conceptos de ingreso |

Los datos fiscales del cliente se leen con `terceros.ver` y se guardan con el permiso del formulario de Clientes.

## Pantallas

Conceptos de ingreso (generada). La sección de Clientes y el eliminar, en LV-1c.

## Eventos

Los de la futura Contabilidad (diseño §10.3), en pasos posteriores.
