# Dictamen del contador: roles de enlace de Contabilidad (2026-11-23)

Validación de `contador-guatemala` sobre CT-0e/0f, CT-1, CT-2 y CT-2c. Corrige en parte el dictamen 2026-11-18 §2 y §8, que
mezclaba «cuadra con algo» con «es cuenta de control». Aplicado en `diseno-contabilidad.md` §5.3 y `diseno-cp5-reportes.md` §2.3.

## Leyenda de documentos eliminados (CT-0e/0f)
Correcta con ajustes. Texto: «Este reporte no incluye documentos eliminados, aunque se hayan eliminado después de la fecha de
corte. Si ya cerró ese mes con un reporte anterior, el saldo puede ser distinto.» Se muestra siempre mientras no exista un aviso
condicional (como `registrados_despues_del_corte`, con cantidad y monto); entonces se retira. Lo cerrado no se altera, se corrige
con asiento (C. Com. art. 373, según dictamen 2026-11-18 §0.8): con Contabilidad activa, en período cerrado se anula y se reversa.

## Criterio de rol de auxiliar (cuenta de control)
Solo si (1) un módulo responde su saldo por rol y llave en `saldos_de_auxiliares`, (2) registra lo que aumenta y lo que extingue
el saldo y (3) nadie necesita partida manual en la cuenta en la operación normal. Confirmados: `proveedores`,
`documentos_por_asignar`, `pagos_por_aplicar`, `efectivo_para_pagos`, `cuenta_bancaria`, `caja_chica`, `anticipos_por_liquidar`,
`activo_fijo`, `depreciacion_acumulada`, `construcciones_en_curso`, `retencion_por_pagar`. Se quitan `saldos_por_regularizar`
(el contador lo salda a mano; como `apertura_por_regularizar`: cierre con `pide_motivo`, CxP no lo responde en cuadratura; la
«transitoria R11» de §4.4 es `pagos_por_aplicar`) y `cuentas_por_cobrar_a_empleados` (nadie registra su recuperación; control
sustituto: `pide_tercero`). `puente_compras_de_activos` solo con Activos fijos activo. Sin marca: `iva_credito_fiscal` (su
liquidación mensual es partida manual; se revisa con el movimiento Debe del mes, dato propio que falta en el contrato),
`puente_de_apertura`, `apertura_por_regularizar`, `iva_por_rectificar`.

## Retención por pagar
Mayor = retenido vigente − enterado vigente (`enteros_de_retenciones.impuesto`), no «constancias no enteradas»: la obligación
nace al pagar o acreditar (LAT, Decreto 10-2012, art. 48). Responde Libro de compras. Multas, intereses y mora no rebajan el
pasivo. Cuadrar por grupo si varias reglas lo comparten. Falta el evento de entero (a `arquitecto-de-datos`); una sola fuente de
la partida: el movimiento de Bancos enlazado a la cuenta de retención.

## Retenciones de saldo inicial
CxP las responde solo con `proposito = apertura`. Opción A (recomendada): rol `retenciones_de_apertura`; opción B: misma cuenta y
partidas conciliatorias. La elección es del usuario. El gasto con retención no enterada no es deducible hasta enterarla (LAT art. 23 lit. c).

## Otros
- Cuenta y superior: mismo `tipo` siempre (el cierre anual salda resultados y arrastra balance; C. Com. art. 379); la `naturaleza`
  puede diferir (contracuentas).
- Enlace: es configuración, no registro contable; la auditoría del quitar debe mostrar la cuenta realmente enlazada.
- Cuenta general obligatoria en `proveedores` y `caja_chica`; roles según la operación no impiden el verde pero no se dan por
  cubiertos (art. 47 LAT: no inferir de `agenteDeRetencionIva`).
- Mensajes al quitar: opcional; registro con cuenta general; cuenta general con enlaces específicos («los registros con cuenta
  propia siguen igual; los demás quedarán por contabilizar con error»); sin respaldo. Siempre «Lo ya contabilizado no cambia»
  (salvo `RegenerarPeriodo` en período abierto). No decir que el IVA al costo «es deducible».
