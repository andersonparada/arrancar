# Módulo `bancos`

Estado: **en planificación** (2026-09-27). No se programa hasta cerrar los puntos
de "Por confirmar".

## Propósito

Llevar el **flujo del dinero** de cada empresa: cuánto entra y sale de cada cuenta
bancaria, con qué documento, y cuadrarlo cada mes contra el estado de cuenta del
banco.

**Es de este módulo:** bancos, cuentas bancarias, chequeras y cheques, notas de
crédito y de débito, transferencias entre cuentas propias y conciliaciones.
**No es de este módulo:** préstamos, plazos fijos, inversiones, ni las cuentas de
terceros. Arrancar no es una app de banco: solo registra el dinero que se mueve.

## Decisiones acordadas

| Tema | Decisión |
|---|---|
| Alcance | **Por empresa.** Cada empresa crea sus propios bancos; los de la empresa A nunca se ven en la B. |
| Bancos | Pantalla para que el usuario los registre; **no se precargan**. |
| Cuentas bancarias | Hijas de un banco (llave foránea) y, como él, por empresa. Número, tipo (monetaria o de ahorro), un nombre corto ("Banrural operación"), moneda (solo GTQ hasta que exista *Moneda extranjera*), activa o inactiva. El saldo inicial es su primer movimiento. Una cuenta con movimientos no se borra. |
| Tipos de movimiento | **Nota de crédito** (entra dinero: depósitos, intereses, acreditaciones), **nota de débito** (sale dinero: comisiones, cargos, transferencias a terceros) y **cheque** (sale dinero). No hay "depósito" aparte: es una nota de crédito. |
| Transferencia entre cuentas propias | Una ventana que crea, en una sola operación, una nota de débito en la cuenta A y una nota de crédito en la cuenta B, enlazadas, con la misma fecha y el mismo monto. Se anulan juntas. |
| Transferencia a terceros | Es una nota de débito: no se lleva la cuenta del tercero. |
| Datos de cada movimiento | Cuenta, fecha, monto, referencia, observaciones, beneficiario u origen, foto del comprobante (opcional) y si está conciliado. |
| Beneficiario u origen | Se puede elegir del módulo Clientes (si está activo) o escribir a mano. Bancos guarda el id y el nombre, sin depender de Clientes. |
| Chequeras | El usuario indica desde qué número empieza y hasta cuál termina; se crean todos los cheques de la chequera como **disponibles**. Al emitir se completan sus datos. |
| Cheques | Estados: **disponible → emitido**, o **anulado**. No se lleva si se cobró: la conciliación ya lo dice, y un cheque que no se cobrará se anula. Un cheque anulado conserva su número, con el motivo. Lleva beneficiario y la marca "no negociable". La impresión del cheque y del voucher queda para después. |
| Conciliación | **Por mes y por cuenta.** Se registra el saldo del estado de cuenta, se marcan los movimientos que aparecen en él y el sistema muestra la diferencia. Al cerrar, esos movimientos quedan **bloqueados**; los que no aparecieron siguen abiertos para el mes siguiente. Los meses se concilian en orden. |
| Borrar una conciliación | Solo en orden inverso (la última primero), y queda registrado en la **bitácora** del módulo (quién, cuándo, qué mes, qué cuenta). |
| Reglas de edición | Un movimiento se corrige mientras no esté conciliado; después ya no se toca. Nada se borra: se anula con su motivo. |
| Sobregiro | Variable de configuración **por empresa**: si se permite o no que el saldo quede negativo. |
| Destino del gasto | Cada salida podrá apuntar a su destino (una siembra, un lote de ganado…). El campo se deja listo y se usa cuando existan esos módulos. |
| Permisos | Ver, registrar, anular, conciliar y emitir cheques por separado. **Alcance por cuenta**: un usuario puede ver solo ciertas cuentas (`recursosConAlcance`). |
| Importación | Saldos iniciales de las cuentas desde Excel en esta entrega; el estado de cuenta del banco, más adelante. |
| Montos | **Siempre positivos.** El tipo dice la dirección: la nota de crédito suma; la nota de débito y el cheque restan. |
| Saldo inicial | Una **nota marcada** con `saldoInicial` (sí/no): de crédito si el saldo es positivo, de débito si es negativo. El estado de cuenta sale de una sola tabla. Una sola por cuenta, la primera por fecha, nunca un cheque (lo hace cumplir la base de datos). Contabilidad la tratará como apertura, no como ingreso o gasto. |
| Sobregiro | Variable `bancos.cuentas.permitir_sobregiro`, niveles empresa e instalación; **no se permite** por omisión. |
| Referencia | **Un solo campo**: número de boleta o de autorización, opcional. |
| Bitácora | Regla de **toda la app** (ver "Bitácora de auditoría"): cada borrado, inactivación, reactivación o anulación queda registrado. En Bancos: anular movimientos y cheques, inactivar bancos y cuentas, y borrar conciliaciones. |
| Chequeras | Máximo de cheques por chequera en la variable `bancos.chequeras.maximo_cheques` (5,000 por omisión), niveles empresa e instalación. Cada módulo declara sus variables en su `modulo.ts`. |
| Fechas cerradas | Dos niveles. **Bancos**: no se registra ni se anula nada con fecha dentro de un mes conciliado de esa cuenta. **Core**: *fecha de cierre* por empresa ("cerrado hasta el 31/08"); antes de guardar, cualquier módulo pregunta si la fecha está abierta. Hoy la mueve el dueño a mano; Contabilidad la moverá al cerrar sus períodos. Se construye en el paso B2. |

## Bitácora de auditoría (core)

Acordado el 2026-09-27: toda ventana que borre, inactive o anule un registro deja
rastro para auditoría.

- Tabla general en el core: quién, cuándo, empresa, módulo, recurso e id, acción
  (eliminar, inactivar, reactivar, anular), motivo si lo hay y el registro como
  estaba antes.
- La escribe el caso de uso **en la misma transacción** que el cambio.
- El **generador** la incluye en todo recurso con baja `eliminar` o `inactivar`.
- Se ajusta lo existente: inactivar clientes, proveedores y empresas, quitar un
  papel y eliminar contactos.
- Registra también las **reactivaciones**.
- **Se conserva un año** (variable de instalación
  `core.auditoria.meses_de_conservacion`, 12 por omisión); lo anterior se borra
  una vez al día y se consulta en los respaldos. Como la app no puede borrar la
  auditoría, lo hace la función `core.depurar_auditoria` (con los permisos del
  dueño de la tabla, y nunca menos de un mes).
- Es un paso propio, **B0**, antes de B1.

**B0 hecho (2026-09-27).** Tabla `core.auditoria` (solo agregar y leer, por
cuenta; cuenta, empresa y usuario salen de la transacción), puerto `Auditoria`
en las dependencias compartidas y `auditarCambioDeEstado` para inactivar y
reactivar. Ya auditan: clientes y proveedores (tercero, papeles, contactos y
categorías), empresas, roles y usuarios (sin el hash de la contraseña). La
activación de módulos la hace soporte fuera de la cuenta y queda pendiente. El
generador escribe la auditoría en eliminar e inactivar y la autoría en la tabla.
Corregido de paso (venía del G4.1): la prueba de API de un recurso que solo
apunta a sí mismo dejaba sin usar el parámetro `usuario`. 291 pruebas del
servidor (nuevas: integración de auditoría, autoría y depuración, y una prueba
de API de bajas), 45 del cliente y 38 del generador.

## Autoría de cada registro (core)

Acordado el 2026-09-27: toda tabla de negocio lleva `creado_por` y
`actualizado_por` (usuario), junto a `creado_en` y `actualizado_en`. Se llenan
solos desde la variable de la transacción (`app.usuario_id`, la que fija la
unidad de trabajo), sin código en repositorios ni casos de uso. El generador las
incluye; lo existente se ajusta en B0.

Convención de nombres: en la base de datos `snake_case` (`creado_por`); en el
código `camelCase` (`creadoPor`). Drizzle convierte solo (`casing: 'snake_case'`).

## Importar y exportar (core y generador)

Acordado el 2026-09-27: cada ventana de lista ofrece **Exportar** e **Importar**.

- **Exportar**: la lista a Excel tal como se ve (con filtros y formato; las
  referencias por nombre).
- **Importar**: plantilla para descargar, subir, revisión completa con errores por
  fila y columna, y confirmar todo o nada. Las referencias se escriben por nombre.
  Al principio solo **crea** registros; actualizar desde Excel queda para después.
- **Permisos propios** en cada ventana: `<modulo>.<plural>.importar` y
  `<modulo>.<plural>.exportar`. Ver una lista no da derecho a bajarla entera: así
  un trabajador no se lleva, por ejemplo, todos los clientes en un Excel.
- El generador los agrega a cada recurso. Es el paso **B0.2**, antes de B1; los
  saldos iniciales de bancos se importan con este mismo motor.

## Configuración

Las variables nuevas usan solo los niveles **empresa** e **instalación**. Las que
ya existen (por ejemplo, las de Clientes) conservan también el de cuenta.

## Pantallas (propuesta)

- **Bancos**: catálogo con ventana (generado).
- **Cuentas bancarias**: lista, formulario y ficha (generado). La ficha muestra el saldo, sus chequeras y sus últimos movimientos.
- **Movimientos**: lista por cuenta y por fechas, con ventanas para nota de crédito, nota de débito, transferencia entre cuentas y emisión de cheque.
- **Chequeras**: en la ficha de la cuenta; ver los cheques disponibles, emitidos y anulados.
- **Conciliaciones**: por cuenta, un mes tras otro; la pantalla de conciliar marca los movimientos y muestra la diferencia.

## Pasos (un commit cada uno)

| Paso | Contenido |
|---|---|
| **B0 Bitácora y autoría** | Bitácora de auditoría (tabla y puerto en el core) y columnas `creado_por` / `actualizado_por`; en el generador y en lo existente (clientes, proveedores, contactos y empresas). |
| **B0.2 Importar y exportar** | Motor en el core (Excel), botones y plantillas generados para cada recurso. |
| **B1 Bancos y cuentas** | Recursos Banco y CuentaBancaria con `npm run generar -- recurso`; variables de sobregiro y de máximo de cheques. |
| **B2 Notas** | Movimientos (base generada, dominio a mano): saldo inicial, notas de crédito y débito, anulación, saldo de la cuenta y bitácora. En el core, la fecha de cierre por empresa. |
| **B3 Transferencias** | Transferencia entre cuentas propias (débito y crédito enlazados). |
| **B4 Chequeras y cheques** | Chequeras por rango, emisión y anulación de cheques. |
| **B5 Conciliación** | Conciliación mensual, bloqueo de movimientos y bitácora. |
