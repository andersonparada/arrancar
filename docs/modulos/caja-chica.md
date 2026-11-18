# Módulo `caja-chica` — se muestra como **Caja chica**

Estado: **en programación** (CC-1, datos, hecho el 2026-11-18). El diseño aprobado es
`diseno-caja-chica-y-cuentas-por-liquidar.md` (con el dictamen `dictamen-caja-chica-2026-11-18.md` y las respuestas del
usuario al final del diseño); lo que sigue de este documento resume lo ya programado.

## Propósito

Fondos fijos de efectivo a cargo de un custodio para gastos menores sin provisión, con reposición, arqueo y cierre.

**Depende de:** *Libro de compras* (recibe sus documentos con destino `caja-chica`) y *Bancos* (apertura, reposición y
depósitos por cheque o nota). **Es de este módulo:** el fondo, su custodio, los comprobantes (documentos, vales de gasto,
faltantes y sobrantes), las reposiciones, los arqueos y los vales provisionales.
**No es de este módulo:** el retiro de efectivo para pagar pasivos con contraseña (se queda en *Cuentas por pagar*) ni los
anticipos a una persona (*Cuentas por liquidar*).

## Decisiones acordadas (2026-11-18)

| Tema | Decisión |
|---|---|
| Módulos | Dos separados: `caja-chica` y `cuentas-por-liquidar` (CCL-a) |
| Tipo de fondo | Solo fijo (CC-c) |
| Quién ve y opera un fondo | Alcance por registro **por fondo** (`caja-chica.fondos`, tabla `accesos_a_fondos`); la localidad es informativa (CC-d). El custodio que es usuario de la empresa recibe el acceso al nombrarlo (CC-e, disparador) |
| Factura con retención | Se rechaza, salvo con el permiso de excepción `caja-chica.comprobantes.con-retencion` y motivo, auditado (CC-f A′) |
| Bancarización | Al llegar al umbral, aviso y marca `sin_bancarizar`, sin bloquear (CC-h A); por eso no hay permiso de «efectivo sin bancarizar» |
| Tope por comprobante | Permiso `caja-chica.comprobantes.sobre-el-tope` y motivo (CC-i) |

## Tablas (esquema `caja_chica`, migraciones `0000_esquema` y `0001_cc1_fondos_y_comprobantes`)

`fondos` (con alcance), `accesos_a_fondos`, `custodios_de_fondos` (un vigente por fondo), `cambios_de_monto` (apertura,
aumentos, disminuciones y cierre; el monto del fondo sale de aquí), `comprobantes` (la bandeja es `fondo_id` nulo),
`reposiciones` y `reposicion_comprobantes` (las llaves compuestas obligan al **mismo fondo**), `arqueos` y
`vales_provisionales`. Todas con `empresa_id`, RLS por empresa, `marcasDeTiempo` y `autoria`; las de un fondo, además, el
alcance por fondo (`comprobantes` con `politicaPorAlcanceOpcional`: la bandeja la ve quien tiene el permiso). Disparadores:
`asignar_al_creador` en `fondos` y `asignar_fondo_al_custodio` en `custodios_de_fondos`.

## Permisos

`caja-chica.fondos.{ver, ver-todos, asignar, crear, editar, cambiar-monto, cerrar}`,
`caja-chica.comprobantes.{crear, anular, sobre-el-tope, con-retencion}`, `caja-chica.vales.{crear, liquidar, anular}`,
`caja-chica.reposiciones.{crear, anular}`, `caja-chica.arqueos.{crear, anular}` y `caja-chica.reportes.{ver, exportar}`.

## Pendiente (pasos siguientes del diseño §14)

La configuración (§9.5), los casos de uso, la API y las pantallas (CC-2 en adelante) y los conceptos de sistema de
Bancos (CCL-B1); la pregunta `libro-de-compras.pagado_al_proveedor_en_el_mes` (CCL-M, CCL-BZ) y la referencia de destino
del libro (CCL-L1).
