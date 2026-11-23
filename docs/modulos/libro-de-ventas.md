# Módulo `libro-de-ventas` — se muestra como **Libro de ventas**

Estado: **en programación** (LV-1 y LV-2 hechos en el servidor el 2026-11-23). El diseño aprobado y sus pasos están en
`docs/modulos/diseno-cuentas-por-cobrar-y-ventas.md`; este documento resume lo que ya existe.

## Propósito

Ventas, retenciones recibidas y libro de ventas de la empresa, de cualquier rubro y régimen.

**Es de este módulo:** los conceptos de ingreso, los datos fiscales del cliente, los documentos emitidos con sus líneas
(LV-2) y, en los pasos siguientes del diseño, la bandeja de DTE emitidos, las retenciones recibidas con sus constancias,
el libro del período y los datos para el SAT-2237, el SAT-2046 y el ISR mensual.
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
| Documento | Inmutable: se anula (queda como rastro y su número no se reutiliza) o se elimina si está «limpio». El régimen de IVA e ISR del **mes de emisión** se copia al documento |
| Período | El mes de emisión. Los períodos declarados y el control de bloqueo son de Libro de compras; aquí se leen |
| Destino | `cuentas-por-cobrar` si la cartera está activa y hay cliente (el consumidor final, según `libro-de-ventas.destino.consumidor_final`); la factura especial recibida y el recibo no son cartera; una nota va al destino de su factura |

## Recursos

| Recurso | Pantalla | Baja |
|---|---|---|
| Concepto de ingreso | Conceptos de ingreso (Administración) | Inactivar; eliminar solo sin líneas y si no es de sistema |
| Datos fiscales de cliente | Sección «Datos fiscales (ventas)» de Clientes (LV-1c) | Se van con el cliente |
| Documento de venta | Lista, formulario y ficha (LV-2c) | Anular con causa y motivo; eliminar solo sin cartera procesada, sin notas y en un mes sin declarar |

## Tablas (esquema `libro_de_ventas`)

- `conceptos_de_ingreso`: único `(empresa_id, nombre normalizado)`, `check` de nombre (1–80), tipo y clave de sistema, único
  parcial por clave de sistema, llave `(id, empresa_id)`.
- `datos_fiscales_de_cliente`: PK `cliente_id`, llave compuesta `(cliente_id, cuenta_id)` a `terceros.clientes`
  (cascada), `check` del agente de retención, de «exporta productos agropecuarios» (solo exportador) y de «retiene IVA a
  pequeño contribuyente» (solo agente).

- `documentos` (`0002`): RLS por empresa; llaves compuestas a `terceros.clientes (id, cuenta_id)`, a `documentos`
  (`documento_afectado_id`, misma empresa), a `empresas.localidades` y a `core.monedas`; único del número
  `(empresa, coalesce(tipo_dte, tipo), coalesce(serie, ''), numero)` (incluye anulados) y de la autorización FEL;
  `check` de familia contra código SAT, receptor (`CF` solo sin cliente), totales que cuadran por columna, período = mes de
  emisión, notas (factura del libro o anterior, nunca las dos), anulación completa y moneda en quetzales.
- `lineas_de_documento`: llave `(documento_id, empresa_id)` con cascada, llave `(concepto_de_ingreso_id, empresa_id)`,
  `check` de clase fiscal, montos y «solo la gravada lleva IVA»; llave única `(id, documento_id, empresa_id)` para que
  Activos fijos e Inventarios la referencien.

## Reglas (las garantiza el dominio)

- Los datos fiscales se contradicen si dice que exporta productos agropecuarios sin ser exportador, o que retiene IVA a
  pequeño contribuyente sin ser agente de retención.
- Un cambio de los datos fiscales de un cliente queda en la auditoría como `corregir` con lo anterior.
- **Registrar** (`docs/modulos/diseno-cuentas-por-cobrar-y-ventas.md` §7.1): sin datos fiscales para el mes o sin NIT no
  se registra; el régimen derogado (o su familia) se rechaza con `regimen_derogado` desde la fecha de la variable de
  Libro de compras, y antes vale como histórico; lo anterior a la fecha de inicio va como saldo inicial; la familia que no
  es del régimen del mes avisa. Solo el régimen general carga débito (más la factura especial recibida); el recibo y la
  nota de abono nunca llevan IVA. El IVA del DTE puede apartarse del calculado hasta `max(5, líneas)` centavos.
- **Notas**: corrigen una factura vigente del mismo cliente (o una del sistema anterior, de antes de la fecha de inicio);
  la de crédito no pasa del total ni del IVA de la factura más sus notas de débito; después de los dos meses de la
  factura avisa (rebaja el débito del mes de la nota); sobre una factura especial recibida es
  `nota_sobre_factura_especial`; la de abono avisa que no rebaja el IVA.
- **Anular**: causa (`fel_anulada_en_la_sat`, `error_de_captura`, `no_corresponde_a_la_empresa`), motivo de hasta 300
  letras y fecha (la de la SAT o la de hoy); avisa a la cartera antes de cambiar nada; con el control de períodos
  encendido el mes declarado no se toca. Por `error_de_captura` de un DTE con FEL pasado el vencimiento de la declaración
  del IVA (último día del mes siguiente, corrido al día hábil), avisa que solo cabe una nota de crédito.
- **Eliminar**: solo lo vigente, sin procesar por la cartera y sin notas (ni anuladas); borra las líneas y deja la ficha
  en la auditoría. Anular o eliminar una nota de débito exige que las notas de crédito de su factura sigan cabiendo.

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
| `libro-de-ventas.documentos.ver` | Ver la lista y la ficha de los documentos de venta |
| `libro-de-ventas.documentos.crear` | Registrar documentos de venta |
| `libro-de-ventas.documentos.anular` | Anular documentos de venta |
| `libro-de-ventas.documentos.eliminar` | Eliminar documentos de venta sin cartera procesada ni notas |

Los datos fiscales del cliente se leen con `terceros.ver` y se guardan con el permiso del formulario de Clientes.

## Pantallas

Conceptos de ingreso (generada). La sección de Clientes y el eliminar, en LV-1c. La lista, el formulario y la ficha de
documentos, en LV-2c.

## API de documentos

`GET /libro-de-ventas/documentos` (filtros `periodo`, `clienteId`, `tipo`, `estado`, `destino`, `texto`, `pagina`,
`limite`), `GET …/:id`, `POST …` (responde 201 con `{ documento, avisos }`), `POST …/:id/anular` y `DELETE …/:id`
(responde 200 con `{ avisos }`). Dinero como texto. No hay «calcular»: el servidor recalcula todo al registrar.

## Decisiones de LV-2 que el diseño dejaba abiertas

- **Único del número**: `(empresa, coalesce(tipo_dte, tipo), coalesce(serie, ''), numero)` en lugar de
  `(tipo_dte, serie, numero) nulls not distinct` del §5.3, porque en papel el código SAT es nulo y una nota y una factura
  con el mismo número habrían chocado. Incluye anulados.
- **Cliente de otra cuenta**: la seguridad por filas lo oculta, así que responde `no_encontrado` (el error
  `cliente_de_otra_cuenta` del §11.4 no se distingue de un cliente inexistente).
- **Columnas de la bandeja**: `origen` ya existe (solo `manual` hoy); `dte_emitido_id` y su llave se agregan en LV-4 junto
  con la tabla de DTE emitidos.
- **Derogación por fecha de emisión**: el régimen y la familia derogados se comparan con la fecha de emisión del
  documento (no con el primer día del mes), igual que Libro de compras con sus familias.
- **Nota de abono y recibo**: nunca llevan IVA; la nota de abono no tiene tope frente a la factura (no toca el débito).
- **Tipos que no son cartera**: la factura especial recibida y el recibo nunca van a Cuentas por cobrar.
- **Nota sobre una factura especial**: cualquier nota (no solo la de crédito) es `nota_sobre_factura_especial`.
- **Plazo de anulación en la SAT**: sin la bandeja (LV-4) no se sabe si la SAT ya lo anuló, así que se trata «sin dato»; el
  vencimiento de la declaración (Ley del IVA art. 40) sigue **por confirmar** con el contador (V-14).
- **Período declarado**: con el control encendido se toma con `for share` la fila de `libro_de_compras.periodos` (se crea
  abierta si falta, como hace Libro de compras); apagado, solo se lee.
- **Sin generador**: el documento es inmutable y con reglas propias, así que no sale de `npm run generar -- recurso`
  (que arma catálogos y formularios editables); se programó a mano con la forma de Libro de compras.

## Eventos

Los de la futura Contabilidad (diseño §10.3), en pasos posteriores.
