# Módulo `bancos`

> **Nota (2026-09-29, PLAN §3.5):** los permisos `<recurso>.gestionar` que se nombran más
> abajo (y en los pasos ya ejecutados) hoy son `.crear`, `.editar` y, si eliminaba,
> `.eliminar` (`notas` y `transferencias` ya tenían `.eliminar` propio); ver la migración
> `0023_permisos_por_accion`.

Estado: **B0 a B5 hechos** (2026-09-28). Queda para después: la foto del
comprobante, elegir el beneficiario de Clientes, el alcance por cuenta, la
moneda extranjera y la impresión de cheques y de vouchers.

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
| Cuentas bancarias | Hijas de un banco (llave foránea) y, como él, por empresa. Número, tipo (monetaria o de ahorro), un nombre corto ("Banrural operación"), moneda (solo GTQ hasta que exista *Moneda extranjera*), activa o inactiva. El saldo inicial es su primer movimiento. Una cuenta con movimientos no se borra. **Número único por banco (H4):** el número se guarda tal como lo escribe el usuario (con guiones, así se imprime y se reconoce) y una columna `numero_normalizado` (solo `[0-9A-Za-z]`, en mayúsculas) sostiene el único `(empresa, banco, numero_normalizado)`; «001-23 45» y «0012345» son la misma cuenta en el mismo banco, pero pueden repetirse en otro banco u otra empresa. El repositorio lo comprueba antes de guardar (`NumeroDeCuentaRepetido`, 422, también en la importación de Excel) y la base lo respalda. La migración `0012_h4_numero_normalizado` rellena la columna y falla con un mensaje claro si ya hubiera duplicados. |
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
| Fechas cerradas | Dos niveles. **Bancos**: no se registra ni se anula nada con fecha dentro de un mes conciliado de esa cuenta. **General**: la *fecha de cierre* llega con Contabilidad (sus períodos contables); el core solo ofrecerá la pregunta "¿esta fecha está abierta?" a los demás módulos. Descartada por ahora (ver "Diseño del B2"). |

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
- Registra también las **reactivaciones** y las **correcciones** de dinero o fechas (acción
  `corregir`, con el estado `anterior`, sin motivo obligatorio): notas y saldo inicial.
- **Se conservan 5 años** (variable de instalación
  `core.auditoria.meses_de_conservacion`, 60 por omisión y mínimo 60); lo anterior se borra
  una vez al día y se consulta en los respaldos. Como la app no puede borrar la
  auditoría, lo hace la función `core.depurar_auditoria` (con los permisos del
  dueño de la tabla, y nunca menos de 60 meses).
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

**B0.2 hecho (2026-09-27).** Motor en `core/intercambio` (exceljs): exportar,
plantilla con una hoja de instrucciones, e importar todo o nada (máximo 5,000
filas) con ensayo previo que crea y deshace, así también detecta los datos
repetidos. Cada fila pasa por el mismo caso de uso que el formulario. En el
cliente, los botones y la ventana de revisión. El generador lo incluye en cada
recurso. Probado de punta a punta con un módulo de prueba (ya borrado). Clientes y
Empresas no salen del generador: su importar y exportar queda como paso aparte.
304 pruebas del servidor, 48 del cliente y 40 del generador.

## Configuración

Las variables nuevas usan solo los niveles **empresa** e **instalación**. Las que
ya existen (por ejemplo, las de Clientes) conservan también el de cuenta.

## Pantallas (propuesta)

- **Bancos**: catálogo con ventana (generado).
- **Cuentas bancarias**: lista, formulario y ficha (generado). La ficha muestra el saldo, sus chequeras y sus últimos movimientos.
- **Notas**, **Transferencias** y **Movimientos** (reporte): desde B6, ver la
  sección "B6 Separación de Movimientos" — esta lista original se dividió por
  sección del menú (operación captura, reportes solo consulta).
- **Chequeras**: en la ficha de la cuenta; ver los cheques disponibles, emitidos y anulados.
- **Conciliaciones**: por cuenta, un mes tras otro; la pantalla de conciliar marca los movimientos y muestra la diferencia.

## Pasos (un commit cada uno)

| Paso | Contenido |
|---|---|
| **B0 Bitácora y autoría** | Bitácora de auditoría (tabla y puerto en el core) y columnas `creado_por` / `actualizado_por`; en el generador y en lo existente (clientes, proveedores, contactos y empresas). |
| **B0.2 Importar y exportar** | Motor en el core (Excel), botones y plantillas generados para cada recurso. |
| **B1 Bancos y cuentas** | Recursos Banco y CuentaBancaria con `npm run generar -- recurso`; variables de sobregiro y de máximo de cheques. |
| **B2 Notas** | Movimientos (base generada, dominio a mano): saldo inicial, notas de crédito y débito, anulación, saldo de la cuenta y bitácora. |
| **B3 Transferencias** | Transferencia entre cuentas propias (débito y crédito enlazados). |
| **B4 Chequeras y cheques** | Chequeras por rango, emisión y anulación de cheques. |
| **B5 Conciliación** | Conciliación mensual, bloqueo de movimientos y bitácora. |

**B1 hecho (2026-09-27).** Recursos Banco (catálogo) y CuentaBancaria (ficha
completa), definiciones en `generador/definiciones/bancos/`, pantallas Vue en
`cliente/src/modulos/bancos/paginas/` (Bancos e índice y fichas de Cuentas
Bancarias), composables para edición e importar/exportar. Variables de
configuración en `servidor/src/modulos/bancos/modulo.ts`:
`bancos.cuentas.permitir_sobregiro` (boolean, false por omisión) y
`bancos.chequeras.maximo_cheques` (entero, 5000 por omisión), niveles empresa e
instalación. Migraciones aplicadas y módulo activado en la cuenta demo. Pruebas:
325 del servidor (nuevas: 11 de API de Bancos y Cuentas), 54 del cliente (nuevas:
6 del módulo), 40 del generador. Corregido en el generador: con un plural largo
(`cuentas-bancarias`) Prettier partía la llamada al intercambio y la función de
rutas pasaba de 25 líneas; ahora sus opciones van en la constante `EN_EXCEL`.
Pendiente para B2: el alcance por cuenta (`recursosConAlcance`, que un usuario vea
solo ciertas cuentas) y la moneda de la cuenta (hoy todo es GTQ).

## Diseño del B2 (2026-09-27)

Se entrega en dos partes (servidor y cliente), cada una revisada antes de seguir.

**Fecha de cierre general: descartada por ahora (2026-09-27).** Se llegó a
programar en el core (columna en `core.empresas`) y se descartó sin commit: el
cierre no es un dato de la empresa, y sin Contabilidad lo único que cierra es la
conciliación. Bancos se protege solo con sus meses conciliados (B5). Cuando exista
Contabilidad, sus períodos contables serán suyos y el core ofrecerá la pregunta
común "¿esta fecha está abierta?", que Contabilidad responde y los demás módulos
consultan.

### B2b Movimientos en el servidor

Base generada (`generador/definiciones/bancos/movimiento.ts`, catálogo, baja
`eliminar` que luego se cambia por anular), tabla `bancos.movimientos`:

| Campo | Tipo | Nota |
|---|---|---|
| `cuenta_bancaria_id` | referencia | requerida; no cambia al corregir |
| `tipo` | `credito` \| `debito` | el cheque llega en B4 |
| `fecha` | fecha | requerida |
| `monto` | dinero | requerido, mayor que cero (check en la base) |
| `saldo_inicial` | sí/no | por omisión no |
| `referencia` | texto | boleta o autorización |
| `beneficiario` | texto | beneficiario u origen, escrito a mano |
| `observaciones` | texto largo | |
| `anulado_en`, `motivo_de_anulacion` | a mano | nada se borra: se anula |

Reglas (en el dominio y los casos de uso):
- (En B5, registrar, corregir y anular exigirán que la fecha no caiga en un mes
  conciliado de la cuenta; al corregir, la fecha anterior y la nueva.)
- La cuenta debe estar activa para registrar.
- Un movimiento anulado no se corrige ni se anula otra vez.
- Saldo inicial: uno vigente por cuenta (índice único parcial en la base), y es el
  primero por fecha: no se registra un saldo inicial con fecha posterior a otro
  movimiento, ni un movimiento con fecha anterior al saldo inicial.
- Sobregiro: si `bancos.cuentas.permitir_sobregiro` es falso, no se acepta un
  débito (ni corregirlo, ni anular un crédito) que deje el **saldo actual** de la
  cuenta negativo. Se revisa contra el saldo total, no día por día.
- Anular pide motivo y queda en la auditoría (`anular`, con el movimiento como
  estaba).
- Saldo de la cuenta = créditos − débitos vigentes; `CuentaBancariaDto` lleva
  `saldo`.
- Listar filtra por cuenta y por rango de fechas; los anulados se muestran
  marcados.
- Importar crea movimientos con las mismas reglas: así se cargan los saldos
  iniciales desde Excel.

**B2b hecho (2026-09-27).** Movimiento generado (catálogo, sección Operación) y
completado a mano:

- Tabla con `anulado_en` y `motivo_de_anulacion`, checks de monto positivo y tipo
  válido, índice único parcial de un saldo inicial vigente por cuenta e índice por
  cuenta y fecha.
- Dominio: `corregir` (conserva la cuenta), `anular` (motivo de 1 a 500
  caracteres) y `efectoEnCentavos`. El dinero se suma en **centavos enteros**
  (`dominio/centavos.ts`), nunca en punto flotante.
- `ReglasDeLaCuenta` (aplicación) reúne las reglas que cruzan movimientos: saldo
  inicial único y primero por fecha, y sobregiro. Registrar, corregir y anular le
  pasan la **diferencia** que causan en el saldo; así corregir cuenta solo lo que
  cambia y anular un crédito también se revisa.
- La variable de sobregiro se lee con el puerto `PoliticaDeSobregiro`
  (`PoliticaDeSobregiroEnConfiguracion`).
- Anular: `POST /bancos/movimientos/:id/anular` con permiso propio
  `bancos.movimientos.anular`, y auditoría con el movimiento como estaba. No hay
  ruta para borrar.
- Listar filtra por `cuentaBancariaId`, `desde` y `hasta`. `CuentaBancariaDto` trae
  el `saldo`, calculado en la base de datos (`saldo-vigente.ts`).
- El generador pide ahora la `seccion` del menú en cada definición (antes todo
  caía en Administración); Bancos y Cuentas bancarias van en Administración y
  Movimientos en Operación, cada uno con su ícono.
- Nota: la primera versión la escribió un modelo más barato y tenía errores
  (sobregiro mal calculado al corregir, sumas en punto flotante, sin reglas del
  saldo inicial al corregir, sin filtros ni saldo en la cuenta); se rehízo la
  aplicación antes de cerrar el paso.

Pruebas: 347 del servidor (reglas de saldo inicial, sobregiro al registrar,
corregir y anular, centavos, y API de filtros, saldo, sobregiro y permiso de
anular), 57 del cliente y 41 del generador.

### B2c Movimientos en el cliente

- Lista de movimientos (filtros de cuenta y fechas), tarjeta con tipo, fecha,
  monto (entradas y salidas en colores distintos) y marca de anulado.
- Ventana para registrar o corregir; "Anular" pide el motivo en su ventana.
- La ficha de la cuenta muestra el saldo y enlaza a sus movimientos.
- Sin Exportar (2026-09-27): las pantallas de operación no exportan; lo registrado
  se consulta en reportes. Importar se conserva para los saldos iniciales. En el
  core, `permisos.exportar` es opcional en `rutasDeIntercambio` y en
  `AccionesDeIntercambio`.

**B2c hecho (2026-09-27).** Filtros, tarjeta, ventanas de registrar/corregir y de
anular, y saldo en la cuenta, completados a mano sobre lo generado:

- Filtros arriba de la lista (cuenta, con "Todas", y desde/hasta); recargan solos
  al cambiar. Por omisión van del primer día del mes actual a hoy
  (`filtros-de-movimientos.ts`, lógica pura con prueba); si la ruta trae
  `?cuenta=<id>` (desde "Ver movimientos" de la ficha), arrancan filtrados por
  esa cuenta.
- Encabezado con "Nota de crédito" y "Nota de débito" (abren la ventana con el
  tipo elegido) en vez de un solo "Nuevo"; sin Exportar, solo "Importar".
- Tarjeta (`TarjetaDeMovimiento.vue`): título "Nota de crédito"/"Nota de
  débito"/"Saldo inicial" según corresponda; monto destacado con "+" en verde
  (crédito) o "−" en rojo (débito); anulados atenuados, con insignia "Anulado" y
  su motivo, sin editar ni anular.
- Ventana de registrar/corregir: al corregir, la cuenta se ve pero no se cambia.
  "Es el saldo inicial de la cuenta" y "Referencia (boleta o autorización)" como
  etiquetas.
- Anular en su propia ventana (`VentanaDeAnulacion.vue`, con motivo obligatorio),
  genérica por `titulo`/`texto` para reutilizarla en transferencias y cheques.
  Ya no hay eliminar: se quitó `usar-eliminacion-de-movimiento.ts` y `eliminable`
  de la tarjeta.
- Ficha de la cuenta: saldo destacado y enlace "Ver movimientos"; la tarjeta de
  la lista de cuentas también lo muestra. `CuentaBancariaDto`/`CuentaBancaria`
  del cliente llevan `saldo`.
- Core: `AccionesDeIntercambio` oculta "Exportar" si no llega el permiso;
  `TarjetaDeRegistro` gana `insignia`, `soloLectura` y los slots `destacado` y
  `acciones-extra` (genéricos, para no duplicar la tarjeta en cada módulo); y
  `CampoSelector` gana `deshabilitado`.

Pruebas: 347 del servidor (sin cambios en este paso), 69 del cliente (57 + 12
nuevas: filtros por omisión y título/color/detalles de la tarjeta) y 41 del
generador.

**Queda para después:** la foto del comprobante (con `core/archivos`), elegir el
beneficiario de Clientes, el alcance por cuenta y la moneda.

## Excel según la sección del menú (generador, 2026-09-27)

Regla del dueño del producto: **administración** importa y exporta; **operación**
no importa ni exporta (lo registrado se consulta en reportes); **reportes** se
imprimen y se exportan. El generador decide por la `seccion` de la definición:
administración genera importar y exportar con sus permisos; operación, nada de
Excel. Los reportes se diseñarán aparte (no son un CRUD).

**Nota (B6, 2026-09-28):** la excepción original ("Movimientos importa a mano
los saldos iniciales") ya no existe. Desde la separación de Movimientos (ver
"B6 Separación de Movimientos"), el saldo inicial se registra e importa/exporta
desde **Saldo inicial**, en la ficha de la cuenta y en la lista de cuentas
bancarias (administración); Movimientos quedó como reporte, solo exporta.

**Hecho (2026-09-28).** El generador (`generador/`) ya aplica la regla completa,
incluido un CRUD de reportes (solo exporta, sin importar ni plantilla), aunque
sea un caso raro. `EXCEL_POR_SECCION` en `definir-recurso.ts` decide sola;
`permisos.importar`/`.exportar` solo existen si la sección los trae, y las
plantillas usan un tercer par de fragmentos (`excel-administracion` la
completa, `excel-operacion` y `excel-reportes` las variantes) al estilo de
`baja-eliminar`/`baja-inactivar`, sin duplicar plantillas enteras. En el core,
`rutasDeIntercambio` y `AccionesDeIntercambio.vue` ya aceptaban
`permisos.exportar` opcional; ahora `permisos.importar` también lo es. Probado
con un módulo desechable (dos recursos, uno de administración y uno de
operación): el código generado pasa `revisar` (Prettier, ESLint, tsc y
vue-tsc) y sus pruebas. Pruebas nuevas: 2 en `generador/src/servidor/` (nada de
Excel en operación; solo exportar en reportes) y 3 en
`generador/src/cliente/` (una por sección), sobre 347 pruebas del servidor, 69
del cliente y 46 del generador en total.

## Diseño de B3 a B5 (2026-09-27)

Decisiones del dueño: la conciliación solo cierra con **diferencia cero**; al
emitir un cheque se propone **el siguiente número disponible**, que se puede
cambiar por otro disponible. Cada paso lleva su commit al quedar en verde.

### B3 Transferencias entre cuentas propias (operación, sin Excel)

- Tabla `bancos.transferencias`: fecha, monto, `cuenta_origen_id`,
  `cuenta_destino_id`, referencia, observaciones, `anulada_en`,
  `motivo_de_anulacion`, autoría. `bancos.movimientos` gana `transferencia_id`
  (opcional, llave foránea).
- Registrar crea en **una transacción** la transferencia, una nota de débito en
  el origen y una de crédito en el destino (misma fecha y monto; beneficiario u
  origen: "Transferencia a/desde <cuenta>"). Reglas: cuentas distintas y activas,
  monto mayor que cero, `ReglasDeLaCuenta` en ambas (saldo inicial y sobregiro del
  origen).
- Una transferencia no se corrige: se anula y se registra otra. Anular la
  transferencia anula sus dos notas (revisando el sobregiro del destino) y queda
  en la auditoría (`bancos.transferencias`). Sus notas no se corrigen ni se anulan
  sueltas (`MovimientoDeTransferencia`).
- Permisos `bancos.transferencias.gestionar` y `.anular`. Sin pantalla propia: en
  Movimientos, botón "Transferencia" (ventana: origen, destino, fecha, monto,
  referencia, observaciones); la tarjeta de una nota de transferencia lo dice y
  "Anular" anula la transferencia completa.

**B3 hecho (2026-09-28).** Servidor y cliente, completados sobre el patrón de
Movimientos:

- Tabla `bancos.transferencias` (con sus checks de monto positivo y de cuentas
  distintas) y `transferencia_id` en `bancos.movimientos`, con índice; migración
  generada y aplicada.
- Dominio `Transferencia` (`crear`/`anular`, valida monto y cuentas distintas).
  `Movimiento` conoce su `transferenciaId`; `corregir` y `anular` lo rechazan si
  pertenece a una transferencia (`MovimientoDeTransferencia`), y ganó
  `anularPorTransferencia`, el único modo por el que se anula una nota enlazada.
- `RegistrarTransferencia`: en una unidad de trabajo exige las dos cuentas
  activas (`consultas.cuentaEstaActiva`, reutilizada de Movimientos), arma el
  beneficiario con el nombre de la otra cuenta (`ConsultasCuentasBancarias`
  ganó `nombreDe`) y revisa `ReglasDeLaCuenta` en las dos notas antes de
  guardar la transferencia y sus dos movimientos.
- `AnularTransferencia`: anula la transferencia y sus dos notas, revisa el
  sobregiro del destino al quitar el crédito y audita
  `{ recurso: 'bancos.transferencias', accion: 'anular' }`. `ObtenerTransferencia`
  trae los nombres de las dos cuentas y los ids de las dos notas (unión con
  `bancos.movimientos` por `transferencia_id` y `tipo`).
- HTTP sin Excel: `POST /bancos/transferencias`, `GET /bancos/transferencias/:id`
  (permiso `bancos.movimientos.ver`) y `POST .../anular`.
- Cliente: botón "Transferencia" en Movimientos (`VentanaDeTransferencia.vue`,
  destino sin la cuenta de origen); la tarjeta de una nota con `transferenciaId`
  muestra la insignia "Transferencia", oculta "Editar" y su "Anular" llama a
  `apiTransferencias.anular` con su propio permiso y un texto distinto en
  `VentanaDeAnulacion`. `TarjetaDeRegistro` (core) ganó `sinEditar`, para ocultar
  solo "Editar" sin perder `acciones-extra` (a diferencia de `soloLectura`).
- Decisión propia: `Transferencia.crear` y las reglas de sobregiro se revisan
  dentro de la unidad de trabajo (no antes), así un dato inválido rechaza la
  promesa en vez de lanzar de forma síncrona, igual que el resto de los casos de
  uso.

Pruebas: 361 del servidor (14 nuevas: 9 de casos de uso con dobles en memoria —
registrar, cuentas distintas, cuenta inactiva, sobregiro del origen, nota suelta
que no se corrige ni se anula, anular ambas notas con auditoría, no anularse dos
veces, sobregiro del destino al anular, y "no existe" — y 5 de API: registrar y
ver en movimientos con los saldos, obtener por id, anular con las dos notas,
403 sin permiso y nota rechazada por la ventana de movimientos), 72 del cliente
(3 nuevas de `edicion-de-transferencia`) y 46 del generador (sin cambios).

### B4 Chequeras y cheques

- `bancos.chequeras`: cuenta, serie (opcional), `desde`, `hasta`, activa,
  autoría. `hasta >= desde`; cantidad hasta `bancos.chequeras.maximo_cheques`; los
  rangos de una cuenta (misma serie) no se traslapan. Al crearla se insertan todos
  sus cheques como **disponibles**. Se inactiva (con auditoría), no se borra.
- `bancos.cheques`: chequera, número (único por chequera), estado (`disponible`,
  `emitido`, `anulado`), `no_negociable`, `movimiento_id` (opcional),
  `anulado_en`, `motivo_de_anulacion`.
- Movimiento gana el tipo `cheque` (sale dinero). **Emitir**: cuenta, número
  (propuesto el menor disponible de sus chequeras activas; se puede elegir otro
  disponible), fecha, monto, beneficiario, no negociable, referencia y
  observaciones; crea el movimiento `cheque` con `ReglasDeLaCuenta` (sobregiro) y
  marca el cheque emitido. Un cheque no se registra ni se corrige por la ventana
  de notas: se anula y se emite otro.
- **Anular** un cheque: si está emitido anula también su movimiento; si está
  disponible (roto, perdido) solo el cheque. Siempre con motivo y auditoría;
  conserva su número.
- Pantallas: chequeras en la ficha de la cuenta (administración de la cuenta:
  "Nueva chequera", ver sus cheques por estado); "Emitir cheque" en Movimientos
  (operación). Permisos `bancos.chequeras.gestionar`, `bancos.cheques.emitir` y
  `bancos.cheques.anular`. La impresión del cheque queda para después.

**B4 hecho (2026-09-28).** Servidor y cliente, completados sobre el patrón de
Movimientos y Transferencias:

- Tablas `bancos.chequeras` (serie, `desde`, `hasta`, `activa`, autoría; checks
  `desde > 0` y `hasta >= desde`) y `bancos.cheques` (chequera, número, estado,
  `no_negociable`, `movimiento_id` opcional, `anulado_en`, `motivo_de_anulacion`;
  único `(chequera_id, numero)`); `bancos.movimientos` gana el tipo `cheque` en su
  check y en el tipo TS. **Decisión:** en vez de una columna `cheque_id` en
  `movimientos` (que habría obligado a un import circular entre
  `movimientos.tablas.ts` y `cheques.tablas.ts`), el dominio distingue una nota de
  cheque por `tipo === 'cheque'` y `MovimientoDto.chequeId`/`numeroDeCheque` salen
  de un `LEFT JOIN` con `cheques.movimiento_id` en `ConsultasMovimientosDrizzle`.
  Migración `0006_chequeras_y_cheques.sql`, generada con `bd:generar` y aplicada.
- Dominio: `Chequera` (rango, `ChequeraDemasiadoGrande` contra
  `bancos.chequeras.maximo_cheques` vía el puerto `LimiteDeChequera`,
  inactivar/reactivar) y `Cheque` (`emitir`, `anular`, con `ChequeNoDisponible` y
  `ChequeAnulado`). `Movimiento.corregir`/`anular` rechazan un movimiento
  `tipo === 'cheque'` con `MovimientoDeCheque`, igual que una nota de
  transferencia; `anularPorCheque` es el modo interno que sí lo anula.
- Casos de uso: `CrearChequera` (cuenta activa, sin traslape por cuenta y serie,
  inserción masiva de sus cheques con `RepositorioCheques.agregarVarios`),
  `CambiarEstadoDeChequera` (con `auditarCambioDeEstado`), `ListarChequeras`,
  `ListarCheques`, `SiguienteChequeDisponible` (menor número disponible por serie
  y número entre las chequeras activas de la cuenta), `EmitirCheque` (una unidad
  de trabajo: cheque disponible + chequera activa + cuenta activa +
  `ReglasDeLaCuenta`; referencia por omisión `"Cheque <serie><número>"`;
  beneficiario obligatorio con `BeneficiarioObligatorio`) y `AnularCheque` (si
  estaba emitido, también anula su movimiento revisando `ReglasDeLaCuenta`).
- HTTP: `GET/POST /bancos/cuentas-bancarias/:id/chequeras`, `POST
  /bancos/chequeras/:id/inactivar|reactivar`, `GET /bancos/chequeras/:id/cheques`,
  `GET /bancos/cuentas-bancarias/:id/siguiente-cheque`, `POST
  /bancos/cheques/:id/emitir` y `POST /bancos/cheques/:id/anular`; sin Excel. El
  esquema Zod de movimientos sigue aceptando solo `credito|debito`.
- Pruebas del servidor: 21 unitarias con dobles (`ChequerasEnMemoria` y
  `ChequesEnMemoria`, vinculadas entre sí para `siguienteDisponible` y los
  conteos por estado) — 9 de chequeras y 12 de cheques — más 5 de API en
  `bancos-cheques.api.prueba.ts` (crear chequera de 1 a 50, ver cheques, siguiente
  disponible, emitir y verlo en movimientos con el saldo, anular, 403 sin
  permisos). `npm run probar -w servidor`: 387 pruebas, todas en verde.
- Cliente: sección "Chequeras" en la ficha de la cuenta (`SeccionDeChequeras.vue`,
  `TarjetaDeChequera.vue`, `VentanaDeChequera.vue`) con "Nueva chequera" e
  inactivar/reactivar (confirmación con `usarAvisos().confirmar`, sin ventana de
  motivo: no es una anulación); página `/bancos/chequeras/:chequeraId`
  (`FichaDeChequera.vue`) con filtro por estado y "Anular" reusando
  `VentanaDeAnulacion.vue`. En Movimientos, botón "Emitir cheque"
  (`AccionesDeMovimientos.vue`, extraído para no pasar de 120 líneas en la
  página) abre `VentanaDeCheque.vue`: al elegir la cuenta se cargan los cheques
  disponibles de sus chequeras activas (`usarSeleccionDeCheque`) y se propone el
  siguiente; el usuario puede elegir otro de la lista. La tarjeta de un
  movimiento tipo cheque dice "Cheque No. <número>", no ofrece "Editar" y
  "Anular" llama a `apiCheques.anular`. `npm run probar -w cliente`: 79 pruebas
  (6 nuevas de `edicion-de-chequera` y `edicion-de-cheque`), todas en verde.
- `npm run revisar` (Prettier + ESLint + `tsc`/`vue-tsc` de los tres paquetes) y
  `npm run probar` (servidor, cliente y generador): los dos en verde.
- Pendiente: impresión del cheque (fuera de alcance, como dice la especificación)
  y una prueba de API específica del máximo de 5,000 cheques (no se crean
  chequeras de esa magnitud en las pruebas de API, por instrucción explícita).

**Pantallas de chequeras y cheques (2026-09-28).** El dueño del producto no
encontraba dónde ver las chequeras ni los cheques (antes solo vivían dentro de
la ficha de la cuenta y del botón "Emitir cheque" de Movimientos): se agregaron
sus propias pantallas de menú.

- Servidor: `GET /bancos/chequeras?cuentaBancariaId=` (`ListarChequerasDeLaEmpresa`,
  nuevo) lista todas las chequeras de la empresa, opcionalmente de una cuenta,
  con el nombre de su cuenta (`ChequeraDto.cuentaBancariaNombre`, columna nueva
  con `INNER JOIN` a `cuentas_bancarias`) y ordenadas por cuenta, serie y desde.
  Permiso nuevo `bancos.chequeras.ver`: reemplaza a `bancos.cuentas-bancarias.ver`
  en las rutas de lectura de chequeras (`GET .../cuentas-bancarias/:id/chequeras`,
  `GET .../chequeras/:id/cheques`) y en la ruta del cliente de la ficha de una
  chequera. `bancos.chequeras.gestionar` (crear, inactivar, reactivar) no cambió.
  Excel de chequeras (es administración): `bancos.chequeras.importar` y
  `bancos.chequeras.exportar`, con el motor de `core/intercambio`
  (`chequeras.columnas.ts`: cuenta por referencia a nombre, serie, desde, hasta);
  importar valida con `esquemaChequeraImportada` (el esquema del formulario más
  `cuentaBancariaId`, que llega resuelto por nombre) y crea con `CrearChequera`,
  así que respeta sus reglas (máximo configurado, traslape, cuenta activa).
- `GET /bancos/cheques?cuentaBancariaId=&estado=&desde=&hasta=`
  (`ListarChequesDeLaEmpresa`, nuevo puerto `ConsultasCheques.listarDeLaEmpresa`)
  lista los cheques **emitidos y anulados** de la empresa (los disponibles no:
  se ven en su chequera), con número, serie, cuenta, estado, no negociable y,
  del movimiento si llegó a emitirse, fecha, monto, beneficiario y referencia;
  un cheque anulado que nunca se emitió no tiene movimiento, así que la fecha
  con la que filtra y ordena es la de su anulación
  (`coalesce(movimientos.fecha, cheques.anulado_en::date)`). Más reciente
  primero. Permiso nuevo `bancos.cheques.ver`; sin Excel. Sin migración: no
  cambió ninguna tabla, solo las consultas y los permisos.
- Cliente: en Administración, `ListaDeChequeras.vue` (ruta `/bancos/chequeras`,
  ícono `NotebookTabs`) con filtro por cuenta, tarjetas (reusa
  `TarjetaDeChequera.vue`, cuyos detalles ahora también muestran la cuenta),
  "Nueva chequera" con selector de cuenta (`CamposDeChequera.vue` gana un
  `CampoSelector` opcional, solo cuando llega `opcionesDeCuenta`: la sección de
  la ficha de la cuenta sigue sin pedirlo, porque ya la conoce) y
  Exportar/Importar. En Operación, `ListaDeCheques.vue` (ruta `/bancos/cheques`,
  ícono `Banknote`) con filtros (cuenta, estado, desde, hasta; por omisión el
  mes actual, patrón de `filtros-de-movimientos.ts`), `TarjetaDeChequeListado.vue`
  ("Cheque No. `<serie><número>`", monto en rojo con "−", insignia "Anulado" con
  su motivo entre los detalles), "Emitir cheque" (reusa `VentanaDeCheque.vue`,
  que se queda también en Movimientos) y "Anular" en los emitidos (reusa
  `VentanaDeAnulacion.vue`). Menú: Operación ahora es Movimientos, Cheques,
  Conciliaciones; Administración, Bancos, Cuentas bancarias, Chequeras.
- El rol `Propietario` tiene `accesoTotal: true` (`Rol.propietario`): sus
  permisos efectivos son todos los del catálogo de módulos activos
  (`ResolutorDeAcceso`, `modulos.permisosDe(...)`), calculados en cada petición
  a partir del registro en código (`DefinicionModulo.permisos`), no de una tabla
  en la base de datos (Arrancar no tiene tabla `permisos`, a diferencia de otros
  proyectos). Así que ve las pantallas nuevas sin ningún paso manual, con solo
  desplegar el código; para otros roles (no `accesoTotal`), los permisos nuevos
  ya aparecen para elegirlos en la pantalla de Roles apenas el servidor arranca
  con este cambio.
- Pruebas del servidor: unitarias `ListarChequerasDeLaEmpresa` (orden por
  cuenta/serie/desde, filtro por cuenta) y `ListarChequesDeLaEmpresa` (sin
  disponibles, con los datos del movimiento, anulado sin movimiento con la
  fecha de su anulación, filtros); de API en `bancos-cheques.api.prueba.ts`:
  listar y filtrar chequeras, exportar/re-importar en ensayo, listar y filtrar
  cheques, 403 sin `bancos.chequeras.ver`/`bancos.cheques.ver`. `npm run probar`:
  servidor 60 archivos / 416 pruebas, cliente 21 archivos / 102 pruebas,
  generador 4 archivos / 46 pruebas, todo en verde.
- Cliente: pruebas nuevas de la lógica pura (`filtros-de-cheques.prueba.ts`,
  `detalles-de-cheque-listado.prueba.ts`).
- `npm run revisar` (Prettier + ESLint + `tsc`/`vue-tsc` de los tres paquetes):
  en verde.
- Decisión: se creó `usar-anulacion-de-cheque-listado.ts` en vez de reusar
  `usar-anulacion-de-cheque.ts` porque este último está tipado sobre `Cheque`
  (con `chequeraId`, `movimientoId`...) y la lista de la empresa trabaja con
  `ChequeListado` (otra forma, del nuevo endpoint); ambos llaman a la misma
  `apiCheques.anular`.

### B5 Conciliación mensual (operación, sin Excel)

- `bancos.conciliaciones`: cuenta, año, mes (única por cuenta y mes),
  `saldo_segun_banco`, `cerrada_en`, autoría. `bancos.movimientos` gana
  `conciliacion_id` (opcional).
- En orden: la primera conciliación de una cuenta puede ser de cualquier mes; las
  siguientes, del mes siguiente a la última. Solo una abierta por cuenta.
- Conciliar: se escribe el saldo del estado de cuenta y se marcan los movimientos
  vigentes con fecha hasta el fin del mes que aparecen en él (incluye los que
  quedaron pendientes de meses anteriores). Saldo conciliado = saldo según banco de
  la conciliación anterior (0 si es la primera) + efecto de los marcados.
  Diferencia = saldo según banco − saldo conciliado. **Cerrar exige diferencia
  cero.**
- Cerrada la conciliación, la cuenta queda **conciliada hasta el fin de ese mes**:
  `ReglasDeLaCuenta` rechaza registrar, corregir o anular (notas, transferencias y
  cheques) con fecha en ese mes o antes (`MesConciliado`). Un cheque viejo que no
  se cobrará se revierte con una nota de crédito del mes abierto.
- Borrar: solo la última (abierta o cerrada), con motivo; suelta sus movimientos y
  queda en la auditoría (`eliminar`). Así se reabre un mes.
- Pantalla (operación): lista por cuenta; la de conciliar muestra saldo según
  banco, los movimientos para marcar, saldo conciliado y diferencia en vivo.
  Permisos `bancos.conciliaciones.ver`, `.conciliar` y `.eliminar`.

**B5 hecho (2026-09-28).** Tabla `bancos.conciliaciones` (cuenta, año, mes con
`check` 1 a 12, única por cuenta y mes, saldo según banco, `cerrada_en`,
autoría) y columna `conciliacion_id` (opcional, con índice) en
`bancos.movimientos`; `movimientos → conciliaciones → cuentas_bancarias`, sin
ciclo. Dominio `Conciliacion` (`crear`, `cambiarSaldoSegunBanco`, `cerrar` con
la diferencia en centavos, `estaCerrada`, `finDelMes`) más `periodoSiguiente` y
`finDelMesDe` como funciones sueltas del módulo. Siete casos de uso
(`IniciarConciliacion`, `ObtenerConciliacion`, `MarcarMovimientos`,
`CambiarSaldoSegunBanco`, `CerrarConciliacion`, `EliminarConciliacion`,
`ListarConciliaciones`); "guardar marcas" recibe la lista completa de
marcados y reemplaza las anteriores en una sola sentencia (evita un
caso `MarcarMovimientos`/`DesmarcarMovimientos` separado). El saldo conciliado
y la diferencia se calculan con las mismas funciones puras en centavos
(`calculo-de-conciliacion.ts`) tanto en la consulta de Postgres como en el
doble en memoria, así que un caso de uso nunca ve las dos fórmulas por
separado.

`ReglasDeLaCuenta.revisar` ganó `fechas: string[]` (todas las fechas que toca
el cambio) y una regla nueva, `revisarMesConciliado`, que consulta
`conciliadaHasta` (fin de mes de la última conciliación **cerrada** de la
cuenta) y lanza `MesConciliado` si alguna fecha cae ahí o antes. Se ajustaron
los siete llamadores existentes (movimientos crear/actualizar/anular,
transferencias registrar/anular, cheques emitir/anular). De paso se corrigió
un hueco real: `AnularTransferencia` solo revisaba las reglas de la cuenta
destino (por el sobregiro); ahora revisa también el origen, así que anular con
fecha en un mes conciliado también se bloquea ahí.

HTTP: `GET /bancos/cuentas-bancarias/:id/conciliaciones`,
`GET /bancos/conciliaciones/:id` (`ver`); `POST /bancos/conciliaciones`,
`PUT .../marcas`, `PUT .../saldo`, `POST .../cerrar` (`conciliar`);
`POST .../eliminar` con `{ motivo }` (`eliminar`, 204 sin cuerpo). Permisos
agregados a `modulo.ts`.

Cliente: entrada "Conciliaciones" en `operacion` (ícono `CheckCheck`), rutas
`/bancos/conciliaciones` (elige cuenta, lista sus conciliaciones, "Nueva
conciliación" con el periodo propuesto por `periodoPropuesto` — mes siguiente
a la última, o el mes anterior al actual si no hay ninguna — y "Eliminar" solo
en la primera de la lista, con `VentanaDeAnulacion.vue`) y
`/bancos/conciliaciones/:id` (`ConciliarCuenta.vue`: saldo según banco
editable mientras está abierta, lista de candidatos con casilla, resumen en
vivo en verde/rojo según la diferencia, "Cerrar conciliación" deshabilitado
hasta que sea cero). El cálculo en vivo es una réplica en el cliente de
`aCentavos`/`efectoEnCentavos`/`calcularSaldoConciliado` (no se pudo compartir
el archivo del servidor: son paquetes npm separados). Por el límite de
ESLint de 25 líneas por función, la pantalla de conciliar no usa un solo
composable orquestador: llama directamente a `usarCarga`,
`usarMarcadoDeMovimientos` y `usarGuardadoDeConciliacion` en su
`<script setup>`, como ya hacían otras páginas del módulo con varios
composables pequeños.

Pruebas nuevas: 15 del servidor (13 unitarias con dobles — orden de los
meses, una abierta a la vez, candidatos que incluyen pendientes de meses
anteriores y excluyen los de otra conciliación, saldo conciliado y diferencia,
no cierra con diferencia, cierra con cero, `MesConciliado` bloquea registrar y
anular, eliminar solo la última y suelta sus movimientos y audita — y 2 de
API: flujo completo iniciar/marcar/cerrar/bloqueo del mes/iniciar el
siguiente/eliminar, y 403 sin permisos) y 14 del cliente (`conAlternado`,
`idsMarcados`, `calcularResumen`, `efectoEnCentavos` y `periodoPropuesto`).
Total: 402 pruebas del servidor, 93 del cliente y 46 del generador.

Decisiones propias al implementar: `conciliacion_id` vive solo en la fila de
`bancos.movimientos` (no en la entidad `Movimiento`), porque ninguna regla de
negocio depende de a qué conciliación pertenece un movimiento — solo de su
fecha frente a `conciliadaHasta`; así `RepositorioConciliaciones.guardarMarcas`
lo actualiza con una sentencia de SQL directa, sin cargar cada `Movimiento`.
`EliminarConciliacion` reutiliza `guardarMarcas(id, [])` para soltar todos los
movimientos de la conciliación que se borra.

### B5.1 Rediseño de la conciliación (acordado el 2026-09-28)

El dueño del producto revisó el B5 y lo corrigió: **el usuario no escribe ningún
monto** (no decide cuánto dinero hay) y necesita **ver qué documentos integran la
conciliación**, para dar seguridad. Método estándar (y conciliación cuadrática
que la SAT pide a contribuyentes especiales):

- Lado banco: saldo del estado de cuenta + depósitos en tránsito − cheques en
  circulación. Lado libros: saldo según libros + notas de crédito del banco no
  registradas − notas de débito del banco no registradas. Ambos dan el saldo
  ajustado. Las notas no registradas se registran en libros (en Arrancar: como
  notas del mes, antes de cerrar).
- Cuadrática: cuatro columnas —saldo inicial, ingresos, egresos, saldo final—
  para el banco y para los libros.

Flujo acordado:

1. **La crea el usuario cuando lo decida** ("Conciliar agosto"), aunque sea
   meses después; solo de meses ya terminados y en orden. Sin saldo que escribir.
2. **El usuario solo marca** qué documentos aparecen en el estado de cuenta
   (cheques cobrados, depósitos acreditados, notas).
3. **El sistema arma el documento de conciliación**, con cada partida detallada:
   saldo según libros al fin de mes; (+) cheques en circulación (número, fecha,
   beneficiario, monto); (+) otros débitos en tránsito; (−) depósitos y créditos
   en tránsito (fecha, referencia, monto); (=) **saldo que debe mostrar el
   estado de cuenta**, calculado. Además, el cuadro cuadrático: banco (saldo
   inicial = el calculado del mes anterior, ingresos y egresos = lo marcado este
   mes, saldo final) y libros (saldo inicial, ingresos y egresos del mes, saldo
   final).
4. El usuario compara el saldo calculado con su estado de cuenta en papel. Si no
   coincide, le falta registrar algo (comisión, interés, cargo): lo registra como
   nota con fecha de ese mes y el documento se recalcula solo.
5. **Elabora uno, autoriza otro:** estados *en proceso* → *elaborada* (quien
   concilia la da por terminada; ya no se cambian marcas, salvo que se devuelva)
   → *autorizada* (otra persona con permiso aparte; aquí se cierra el mes). La
   autorización no la puede hacer quien la elaboró. Se puede devolver de
   elaborada a en proceso, con motivo.
6. Al autorizar se guarda la foto del cálculo (saldos y totales) y el mes queda
   bloqueado (`MesConciliado`, como en el B5). Los documentos no marcados pasan
   al mes siguiente como pendientes.
7. **Documento imprimible**: encabezado (empresa, cuenta, banco, mes), cuadro
   cuadrático, partidas detalladas, y quién la elaboró y autorizó, con fechas.
8. Eliminar: solo la última, con motivo y auditoría (sin cambios).

**B5.1 hecho (2026-09-28).** `bancos.conciliaciones` cambió de saldo escrito +
cierre a estado + foto: se quitaron `saldo_segun_banco` y `cerrada_en`
(migración `0008_quitar_saldo_y_cierre_de_conciliacion.sql`) y se agregaron
`estado` (`en_proceso`/`elaborada`/`autorizada`, con `check`), `elaborada_por`,
`elaborada_en`, `autorizada_por`, `autorizada_en` y cinco columnas
`numeric(14,2)` de la foto —`foto_saldo_segun_libros`,
`foto_saldo_calculado_estado_de_cuenta` y los tres totales de partidas—
(migración `0009_agregar_estado_y_foto_de_conciliacion.sql`; se generaron en
dos pasos, uno de solo quitar y otro de solo agregar, porque `drizzle-kit
generate` pide confirmar interactivamente cualquier posible renombrado y no
hay TTY en este flujo).

Dominio `Conciliacion`: `elaborar(usuarioId)`, `autorizar(usuarioId, foto)`
(`AutorizaQuienElaboro` si autoriza quien elaboró), `devolver()`; `FotoDelCalculo`
son los cinco campos de la foto. Cálculo puro nuevo en
`aplicacion/calculo-de-conciliacion.ts` (`calcularConciliacion`): arma el
cuadro cuadrático de libros y de banco, las partidas pendientes por grupo
(cheques en circulación, otros débitos en tránsito, créditos en tránsito) y el
saldo que debe mostrar el estado de cuenta, todo en centavos; siete pruebas
unitarias, incluida la identidad banco.saldoFinal ==
saldoQueDebeMostrarElEstadoDeCuenta cuando todo está marcado.

Ocho casos de uso: `IniciarConciliacion` (ya no recibe saldo; `MesNoHaTerminado`
si el fin de mes no es anterior a hoy), `MarcarMovimientos`, `TerminarConciliacion`
(en proceso → elaborada), `AutorizarConciliacion` (elaborada → autorizada;
calcula la foto a partir del mismo documento que ve la pantalla y llama
`Conciliacion.autorizar`), `DevolverConciliacion` (elaborada → en proceso, con
motivo, auditoría `devolver` — acción nueva en `AccionAuditada`),
`ObtenerConciliacion`, `ListarConciliaciones`, `EliminarConciliacion` (sin
cambios de fondo). Se quitaron `CambiarSaldoSegunBanco` y `CerrarConciliacion`.

HTTP: `POST .../terminar`, `.../autorizar` y `.../devolver` reemplazan
`.../saldo` y `.../cerrar`; `autorizar` y `devolver` comparten el permiso nuevo
`bancos.conciliaciones.autorizar` (agregado a `modulo.ts`), distinto del que
usan iniciar/marcar/terminar (`bancos.conciliaciones.conciliar`).

Persistencia: `ConsultasConciliacionesDrizzle.obtener` arma el documento
completo (encabezado con nombres de cuenta/banco/empresa y de quién elaboró y
autorizó, vía `leftJoin` a `usuarios` con dos alias) y llama al cálculo puro
con los saldos iniciales de libros y de banco que resuelve
`infraestructura/persistencia/conciliacion-candidatos.drizzle.ts`. Consultas
nuevas en `ConsultasMovimientos`: `saldoAlFinDe` (saldo vigente hasta una
fecha) y `vigentesEntre` (movimientos vigentes de un rango), que también
implementa el doble en memoria.

Decisión: **saldo inicial de banco de la primera conciliación de una cuenta**
= el mismo saldo inicial de libros al fin del mes anterior (sin ajuste),
porque antes de la primera conciliación el sistema no tiene manera de saber
qué partidas ya "vio" el banco; se documenta como caso especial en
`saldosInicialesDe`. Para las siguientes, es el `saldoCalculadoEstadoDeCuenta`
congelado en la foto de la conciliación autorizada del mes exactamente
anterior (el orden obligatorio garantiza que sea autorizada).

Decisión: **la foto solo congela los saldos y totales** (`numeric(14,2)`),
tal como pide la especificación; el detalle de partidas (la lista de cheques,
débitos y créditos pendientes) se sigue calculando en vivo, incluso para una
conciliación ya autorizada, sobre los movimientos vigentes con
`conciliacion_id` nulo o igual a esa conciliación. Si un documento pendiente
finalmente se marca en un mes posterior, la lista impresa de una conciliación
autorizada más antigua puede mostrar menos partidas que cuando se autorizó,
pero `saldoQueDebeMostrarElEstadoDeCuenta` no cambia: `obtener` lo sustituye
por `fotoSaldoCalculadoEstadoDeCuenta` cuando el estado es `autorizada`.

Cliente: se quitó el cálculo en vivo duplicado del servidor
(`calculo-de-conciliacion.ts` del cliente y su prueba) — la especificación
permitía "lógica pura en centavos o recargando del servidor" y se eligió
recargar del servidor, más simple: cada acción (guardar marcas, terminar,
autorizar, devolver) reemplaza el documento completo que devuelve la API.
`ConciliarCuenta.vue` muestra `EncabezadoDeConciliacion` (empresa, cuenta,
banco, número, periodo, estado, quién elaboró/autorizó), `CuadroCuadratico`
(libros y banco), `SaldoDelEstadoDeCuenta` (destacado, con el texto de "compare
con su estado de cuenta…") y `PartidasDeConciliacion` (los tres grupos);
los botones Guardar marcas/Terminar exigen `en_proceso` y el permiso
`conciliar`, Autorizar/Devolver exigen `elaborada` y el permiso `autorizar`
(con `VentanaDeDevolucion` para el motivo), e Imprimir llama a
`window.print()`: `DisenoPrincipal.vue` oculta el menú lateral y el
encabezado móvil con `print:hidden` (Tailwind 4 trae la variante `print:` sin
configuración adicional).

Pruebas nuevas: 428 del servidor (62 archivos; suma neta +26 sobre el B5,
repartidas entre el cálculo puro, los ocho casos de uso —dos archivos,
`casos-uso-de-conciliaciones.prueba.ts` y
`casos-uso-de-conciliaciones-bloqueo-y-eliminar.prueba.ts`, más
`soporte-de-pruebas-de-conciliaciones.ts` con la fábrica de dobles compartida,
por el límite de 250 líneas de los archivos de prueba— y el flujo de API:
iniciar → marcar → terminar → autorizar por otra persona → mes bloqueado →
iniciar el siguiente → eliminar; devolver con motivo; mismo usuario no se
autoriza a sí mismo; 403 sin permiso, incluidos `autorizar` y `devolver`; no
se concilia un mes que no ha terminado) y 96 del cliente (20 archivos; baja
neta frente al B5 porque se quitó la prueba del cálculo en vivo duplicado).
`npm run revisar` (formato, ESLint y TypeScript de los tres paquetes) y
`npm run probar` (servidor, cliente y generador) quedan en verde.

Pendiente: no se hizo una vista impresa separada por ruta (`/imprimir`), solo
`window.print()` con estilos `@media print`; tampoco hay pruebas end-to-end de
la vista de impresión en sí (solo que el documento que ve `ConciliarCuenta.vue`
trae los datos correctos).

## B6 Separación de Movimientos (2026-09-28)

La pantalla **Movimientos** original mezclaba captura y consulta: registraba
notas de crédito/débito, transferencias, cheques y el saldo inicial, e
importaba Excel. Se separó en cuatro pantallas, cada una en la sección del
menú que le corresponde:

| Pantalla | Sección | Qué hace | Excel |
|---|---|---|---|
| **Notas** | Operación | Crear, corregir y anular notas de crédito y débito (no saldos iniciales, no notas de transferencia, no cheques) | Ninguno |
| **Transferencias** | Operación | Registrar y anular transferencias entre cuentas propias, con su propia lista (antes vivían dentro de Movimientos, sin pantalla propia) | Ninguno |
| **Movimientos** (reporte) | Reportes | Solo consulta: filtros, saldo anterior, saldo corrido y saldo final; imprimir y exportar | Solo exportar (con los filtros) |
| **Saldo inicial** | Administración (ficha de la cuenta y lista de cuentas) | Registrar, corregir y anular el saldo inicial de una cuenta; importar/exportar saldos iniciales | Importar y exportar |

### Servidor

- **Dominio**: `Movimiento.corregir` ahora conserva también `saldoInicial`
  (antes solo conservaba la cuenta): una nota no se vuelve saldo inicial ni al
  revés. Nuevo método `Movimiento.exigirClase(esSaldoInicial: boolean)`, que
  lanza `NoEsUnaNota` (si se esperaba una nota y es el saldo inicial: "El saldo
  inicial se registra y corrige desde la ficha de la cuenta.") o
  `NoEsUnSaldoInicial` (al revés: "Este movimiento no es el saldo inicial de
  la cuenta."), ambos en la misma familia que `MovimientoDeTransferencia` y
  `MovimientoDeCheque` (409).
- **Aplicación**: `ActualizarMovimiento` y `AnularMovimiento` reciben
  `esSaldoInicial: boolean` en su entrada y llaman a `exigirClase` antes de
  todo; así el mismo caso de uso sirve para Notas (`esSaldoInicial: false`) y
  para Saldo inicial (`esSaldoInicial: true`), y cada uno rechaza tocar lo del
  otro. `CrearMovimiento` no cambió (el controlador fija `saldoInicial`).
  `FiltroDeMovimientos` suma `clase?: 'notas' | 'saldosIniciales'` (`notas` =
  crédito o débito, sin `transferenciaId`, `saldoInicial` falso;
  `saldosIniciales` = `saldoInicial` verdadero; sin `clase`, todo, para el
  reporte), implementado en `ConsultasMovimientosDrizzle` y en el doble en
  memoria.
- **`ReporteDeMovimientos`** (caso de uso nuevo,
  `casos-uso/movimientos/reporte-de-movimientos.ts`): con filtro
  `{cuentaBancariaId?, desde?, hasta?}` devuelve `{saldoAnterior, filas,
  saldoFinal}`, filas en orden **ascendente**. Solo si se eligió una cuenta:
  `saldoAnterior` = saldo vigente al día anterior a `desde` (o `'0.00'` sin
  `desde`), `saldo` de cada fila = saldo corrido (los anulados no lo mueven y
  llevan el saldo que había), `saldoFinal` = el de la última fila o el
  anterior; sin cuenta, los tres saldos son `null`. El cálculo del saldo
  corrido es una función pura nueva,
  `aplicacion/calculo-de-reporte-de-movimientos.ts`
  (`calcularSaldoCorrido`, en centavos, con `diaAnteriorA` para el día previo
  a `desde`), con pruebas unitarias. Se agregó
  `ConsultasMovimientos.listarAscendente` (Drizzle y doble en memoria) para no
  reordenar en memoria lo que ya viene de la base.
- **Transferencias**: `ConsultasTransferencias.listar(filtro:
  {cuentaBancariaId?, desde?, hasta?})` — la cuenta filtra si es **origen o
  destino**, de la más reciente a la más antigua, incluidas las anuladas.
  Caso de uso `ListarTransferencias`, implementado en Drizzle (con `or` sobre
  las dos columnas de cuenta) y en el doble en memoria.
- **HTTP**:
  - `/bancos/notas`: `GET` (filtros cuenta/desde/hasta, `clase: 'notas'` fija)
    y `GET /:movimientoId` con `bancos.notas.ver`; `POST`/`PUT` con
    `bancos.notas.gestionar`; `POST /:movimientoId/anular` con
    `bancos.notas.anular`. El cuerpo nunca lleva `saldoInicial` (el
    controlador manda `false` al crear y `esSaldoInicial: false` al corregir y
    anular). Sin Excel.
  - `/bancos/saldos-iniciales`: `GET` (filtro `cuentaBancariaId`, `clase:
    'saldosIniciales'` fija) con `bancos.cuentas-bancarias.ver` (se ve en la
    ficha de la cuenta); `POST`/`PUT`/`anular` con
    `bancos.saldos-iniciales.gestionar`. Cuerpo: `cuentaBancariaId, tipo
    ('credito'|'debito', por omisión 'credito'), fecha, monto, referencia,
    observaciones` (sin `beneficiario`, no aplica); el controlador fija
    `saldoInicial: true` / `esSaldoInicial: true`. Excel con
    `permisos: {importar: 'bancos.saldos-iniciales.importar', exportar:
    'bancos.saldos-iniciales.exportar'}`, columnas Cuenta, Tipo, Fecha, Monto,
    Referencia, Observaciones.
  - `/bancos/movimientos` queda de solo lectura: `GET /reporte` (el reporte
    con `bancos.movimientos.ver`) y `GET /:movimientoId` (sin cambios de
    permiso); se quitaron `POST`, `PUT`, `.../anular`, `plantilla` e
    `importar` (nada los usaba fuera de este módulo). Nuevo
    `GET /bancos/movimientos/exportar?cuentaBancariaId&desde&hasta` con
    `bancos.movimientos.exportar`, columnas Fecha, Cuenta, Tipo (Nota de
    crédito/Nota de débito/Cheque), Número de cheque, Referencia,
    Beneficiario u origen, Débito, Crédito, Saldo, Anulado — se mapean las
    filas del reporte (`movimientos.columnas.ts`,
    `aFilaExportadaDelReporte`) porque débito y crédito van en columnas
    separadas.
  - `/bancos/transferencias`: `GET` (lista con filtros) con
    `bancos.transferencias.ver`; `GET /:id` pasó de `bancos.movimientos.ver` a
    `bancos.transferencias.ver` (ya tiene pantalla propia, así que ese
    comentario del archivo de rutas también se corrigió).
  - **Core, `core/intercambio`**: para que `/bancos/movimientos/exportar`
    reciba los mismos filtros que la pantalla, `IntercambioDeRecurso` ganó un
    tercer genérico `Filtro` (por omisión `void`); `DatosDelRecurso.listar` y
    `exportar` ahora aceptan `filtro?: Filtro`. `OpcionesDeIntercambio` ganó
    `filtro?: z.ZodType` opcional: si viene, la ruta de exportar valida
    `solicitud.query` con él y se lo pasa a `intercambio.exportar`. Todo lo
    existente (sin `filtro`) sigue igual.
- **Permisos** (`modulo.ts`): quedan `bancos.movimientos.ver` ("Ver el
  reporte de movimientos") y nuevo `bancos.movimientos.exportar`; se quitan
  `bancos.movimientos.gestionar`, `.anular` e `.importar`. Nuevos:
  `bancos.notas.ver`, `.gestionar`, `.anular`; `bancos.transferencias.ver`
  (se conservan `.gestionar` y `.anular`); `bancos.saldos-iniciales.gestionar`,
  `.importar`, `.exportar`.
- **Migración** `0010_permisos_de_notas.sql` (datos, `--custom`): traduce los
  permisos de los roles existentes con `insert ... select ... on conflict do
  nothing` y borra las claves viejas — quien tenía `bancos.movimientos.gestionar`
  recibe `bancos.notas.ver`, `.gestionar` y `bancos.saldos-iniciales.gestionar`;
  `.anular` → `bancos.notas.anular`; `.importar` → `bancos.saldos-iniciales
  .importar` y `.exportar`; quien tenía `bancos.transferencias.gestionar`
  recibe además `bancos.transferencias.ver`. El rol Propietario
  (`accesoTotal`) se calcula en vivo y no necesitó nada.

### Cliente

- **Servicios**: `notas.api.ts` y `saldos-iniciales.api.ts` nuevos
  (listar/crear/actualizar/anular, y en saldos iniciales también
  `intercambio` e `deLaCuenta`); `movimientos.api.ts` quedó con `reporte(filtro)`,
  `obtener` y el `intercambio` (solo exportar, con filtros); `transferencias.api.ts`
  sumó `listar(filtro)`. En el core, `ClienteHttp.descargar` y
  `IntercambioDeDatos.exportar` ganaron un parámetro `consulta?` opcional, y
  `usarIntercambio().exportar` lo reenvía — así el reporte exporta con sus
  filtros sin un mecanismo aparte.
- **Página Notas** (`ListaDeNotas.vue`, `/bancos/notas`,
  `bancos.notas.ver`): filtros cuenta/desde/hasta (reutiliza
  `FiltrosDeMovimientos.vue` y `filtros-de-movimientos.ts`, generalizado para
  que no dependa del tipo de `movimientos.api.ts`), botones "Nota de
  crédito"/"Nota de débito" (`AccionesDeNotas.vue`, `bancos.notas.gestionar`),
  tarjetas (`TarjetaDeNota.vue`) con Editar y Anular
  (`bancos.notas.anular`), `VentanaDeNota.vue`/`CamposDeNota.vue` (como los de
  movimientos, sin el interruptor de saldo inicial). Sin Excel.
- **Página Transferencias** (`ListaDeTransferencias.vue`,
  `/bancos/transferencias`, `bancos.transferencias.ver`): filtros
  cuenta/desde/hasta, botón "Nueva transferencia"
  (`bancos.transferencias.gestionar`) con la `VentanaDeTransferencia`
  existente, `TarjetaDeTransferencia.vue` (cuenta origen → destino, fecha,
  monto, referencia; insignia "Anulada" y opacidad si lo está), Anular con
  `bancos.transferencias.anular`. Sin Excel.
- **Reporte de Movimientos** (`ReporteDeMovimientos.vue`, reemplaza
  `ListaDeMovimientos.vue`, misma ruta `/bancos/movimientos`,
  `bancos.movimientos.ver`): filtros cuenta/desde/hasta; tabla
  (`TablaDelReporte.vue`, con desplazamiento horizontal dentro de la tabla
  para que no rompa el ancho en celular) con Fecha, Cuenta, Documento (tipo,
  número de cheque o referencia — `fila-del-reporte.ts`, función pura
  `documentoDeFila`), Beneficiario u origen, Débito, Crédito y, si hay cuenta
  elegida, Saldo; fila de "Saldo anterior" al inicio y "Saldo final" al final
  cuando hay cuenta; anulados en gris y tachados, con "Anulado", sin mover el
  saldo. Botones "Imprimir" (`window.print()`, encabezado de impresión con
  empresa, cuenta y periodo, como en `ConciliarCuenta.vue`) y "Exportar"
  (`AccionesDeIntercambio` con `permisos: {exportar:
  'bancos.movimientos.exportar'}`, pasando los filtros actuales). Sin botones
  de crear ni de editar.
- **Saldo inicial en la ficha de la cuenta**
  (`SeccionDeSaldoInicial.vue`, en `FichaDeCuentaBancaria.vue`, antes de
  Chequeras): si hay saldo inicial vigente, muestra fecha, tipo y monto con
  "Corregir" y "Anular" (`bancos.saldos-iniciales.gestionar`); si no, un
  texto y "Registrar saldo inicial". Ventana propia
  (`VentanaDeSaldoInicial.vue`/`CamposDeSaldoInicial.vue`) con la cuenta fija
  (no se muestra: viene de la ficha), tipo (crédito por omisión), fecha,
  monto, referencia, observaciones.
- **Lista de cuentas bancarias**: además del Excel de cuentas, un segundo
  `AccionesDeIntercambio` para importar/exportar saldos iniciales. Para
  distinguir los botones, `AccionesDeIntercambio` ganó una prop opcional
  `nombre` (p. ej. `"saldos iniciales"` → "Exportar saldos iniciales"/
  "Importar saldos iniciales"); sin ella se ve igual que siempre. Su
  `VentanaDeImportacion` con título "Importar saldos iniciales".
- **Menú y rutas** (`modulo.ts`, `textos.ts`): Operación ahora es Notas
  (ícono `FileText`), Transferencias (`ArrowLeftRight`, heredado de la
  Movimientos original), Cheques, Conciliaciones; Reportes gana Movimientos
  (`ScrollText`, `seccion: 'reportes'`). Administración no cambió (el saldo
  inicial vive dentro de Cuentas bancarias, sin entrada propia). El enlace
  "Ver movimientos" de la ficha de la cuenta sigue apuntando a la misma ruta
  con `?cuenta=`, porque el nombre de la ruta (`bancos.movimientos`) y su
  permiso no cambiaron: solo cambió qué componente sirve.
- **Limpieza**: se borraron `ListaDeMovimientos.vue`,
  `AccionesDeMovimientos.vue`, `CamposDeMovimiento.vue`,
  `TarjetaDeMovimiento.vue`, `VentanaDeMovimiento.vue` y los composables
  `usar-movimientos.ts`, `usar-lista-de-movimientos.ts`,
  `usar-formulario-de-movimiento.ts`, `usar-anulacion-de-movimiento.ts`,
  `textos-de-anulacion.ts`, `edicion-de-movimiento.ts` y
  `detalles-de-movimiento.ts` (con sus pruebas). El botón "Emitir cheque" que
  vivía en Movimientos se quitó de ahí porque Cheques ya tenía el suyo
  (`usar-formulario-de-cheque.ts` seguía sirviendo a los dos). Lo que sí se
  reutilizó entre pantallas se movió a un lugar neutral:
  `composables/cuentas-bancarias/referencias-de-cuenta.ts` (antes
  `movimientos/referencias-de-movimiento.ts`, usado también por Cheques y
  Chequeras) y `composables/movimientos/estilo-de-tipo.ts` (colores y signos
  de crédito/débito/cheque, usado también por
  `ListaDeMovimientosConciliables.vue`). Verificado con `grep` que nada
  quedó apuntando a lo borrado.

### Pruebas

Servidor: 450 pruebas (63 archivos), incluidas las nuevas de `exigirClase`
(nota vs. saldo inicial, en ambos sentidos), el filtro por `clase`, el
reporte (con y sin cuenta, saldo anterior y corrido), `ListarTransferencias`
(por origen y por destino, incluidas anuladas), y de API: notas (crear,
corregir, anular, no acepta tocar un saldo inicial), saldos iniciales (crear,
corregir, no acepta tocar una nota, Excel), reporte y su exportar con
filtros, permisos nuevos con 403. Cliente: 105 pruebas (23 archivos),
incluidas las nuevas de `edicion-de-nota.ts`, `detalles-de-nota.ts`,
`edicion-de-saldo-inicial.ts`, `detalles-de-transferencia.ts` y
`fila-del-reporte.ts`. Generador: 46 pruebas, sin cambios (B6 no tocó el
generador). `npm run revisar` (formato, ESLint y TypeScript de los tres
paquetes) y `npm run probar` quedan en verde.

Decisiones propias: el recurso de auditoría de anular una nota se dejó como
`bancos.movimientos` (ya existía y sigue siendo el más claro: "algo pasó con
un movimiento", sin crear un recurso `bancos.notas` de auditoría aparte); el
del saldo inicial usa el mismo `bancos.movimientos` por la misma razón. La
excepción de importar de Movimientos que mencionaba la memoria del usuario
("Movimientos conserva importar para saldos iniciales") ya no existe: se
avisa en el informe final, sin tocar archivos fuera de este repositorio.

## B7 Anular con movimiento inverso y eliminar (acordado y hecho el 2026-09-28)

Hasta el B6, anular solo marcaba el movimiento y lo sacaba del saldo. Desde el B7 se
separan dos operaciones, como en contabilidad:

| Operación | Qué hace | Cuándo se puede |
|---|---|---|
| **Eliminar** | Borra el registro de verdad, para no dejar basura. Queda en la auditoría (`eliminar`) tal como estaba. | Solo si está «limpio»: no está marcado en ninguna conciliación, su fecha no está en un mes conciliado, no revierte ni fue revertido, y no está anulado. Con *Contabilidad*, además, que su partida no esté en un período cerrado (lo decidirá Contabilidad por aviso). |
| **Anular** | Crea el **movimiento inverso**, enlazado al original, y el original queda marcado «revertido». Nada se borra. | Siempre que la **fecha del inverso** no caiga en un mes conciliado. Un movimiento conciliado **no se elimina, pero sí se anula**. |

### Reglas del movimiento inverso

- **Tipo**: una nota de crédito se revierte con una de débito; una nota de débito y un
  cheque, con una nota de crédito. Misma cuenta, mismo monto, mismo beneficiario y la
  referencia «Reversión de…» (si el original no tenía referencia, «Reversión de movimiento
  del AAAA-MM-DD»).
- **Fecha**: la escribe el usuario en la ventana de anular (por omisión, hoy); no puede ser
  anterior a la del original (`FechaDeReversionAnterior`) ni caer en un mes conciliado
  (`MesConciliado`). Variable por empresa `bancos.anulaciones.misma_fecha` (por omisión
  `false`): si está activa y el mes del original no está conciliado, el inverso lleva
  **la misma fecha del original** en vez de la escrita.
- **Saldo**: el original y su inverso cuentan los dos y se cancelan; el saldo ya no excluye
  nada (salvo el cheque anulado a la antigua, ver abajo).
- **Un inverso ni se corrige, ni se revierte, ni se elimina** (`NoSeCorrigeUnInverso`,
  `NoSeRevierteUnInverso`, `NoSeEliminaUnInverso`); un original revertido tampoco
  (`MovimientoYaRevertido`, `NoSeEliminaUnMovimientoRevertido`). Si la anulación fue un
  error, se registra de nuevo el movimiento.
- **Transferencia**: anularla crea los dos inversos (uno en cada cuenta) con la misma fecha;
  la fecha no puede caer en un mes conciliado de ninguna de las dos cuentas.
- **Motivo**: obligatorio (1 a 500 caracteres), en el original y en la auditoría.
- **Origen en otro módulo**: al anular o eliminar un movimiento emitido por otro módulo
  (p. ej. el pago de *Cuentas por pagar*), *Bancos* le avisará por el mediador dentro de la
  transacción; ese módulo revisa sus reglas y revierte lo suyo, o rechaza y no se hace
  nada. (Pendiente: llega con esos módulos.)

### Cheques

Los cheques **no se eliminan**: su número ya se consumió. Tienen dos salidas distintas:

| Caso | Qué pasa |
|---|---|
| **Anular** un cheque cuyo mes **no** está conciliado | Se marca anulado el cheque y su movimiento (`anuladoEn`), **sin nota inversa**; el movimiento **no cuenta** en el saldo ni en los movimientos, como antes del B7. |
| **Anular** un cheque cuyo mes **ya está conciliado** (quedó en circulación y nunca se cobró) | Se crea una **nota de crédito inversa** con la fecha escrita (no en un mes conciliado, no anterior al cheque). El cheque queda anulado en la chequera; su movimiento original **sigue contando** y el inverso lo compensa, así ninguna conciliación autorizada cambia. |
| **Blanquear** (`POST /bancos/cheques/:id/blanquear`, permiso `bancos.cheques.blanquear`, motivo obligatorio) | Solo un cheque emitido cuyo movimiento está limpio (no marcado en conciliación, mes no conciliado, no anulado): el cheque vuelve a **disponible** (sin beneficiario, fecha ni monto; su número se puede reutilizar) y su movimiento se **elimina** con auditoría (`blanquear`, con el cheque como estaba). Pendiente: cuando exista la impresión de cheques, no se blanquea si ya se imprimió (hay un `TODO` en `Cheque.blanquear` y en `BlanquearCheque`). |

Un cheque anulado no se puede blanquear, ni uno disponible.

### Qué se elimina y qué no

| Registro | Eliminar | Anular (inverso) |
|---|---|---|
| Nota de crédito o débito | Sí, si está limpia (`bancos.notas.eliminar`) | Sí (`bancos.notas.anular`) |
| Transferencia | Sí, si sus dos notas están limpias (`bancos.transferencias.eliminar`) | Sí, dos inversos (`bancos.transferencias.anular`) |
| Cheque | No (se puede blanquear) | Sí (`bancos.cheques.anular`) |
| Saldo inicial | Sí, si la cuenta nunca tuvo una conciliación (`bancos.saldos-iniciales.gestionar`) | No (se corrige o se elimina) |
| Movimiento inverso | No | No |
| Movimiento ya revertido | No | No |

Las notas de una transferencia y los movimientos de un cheque no se tocan sueltos: se
anulan o eliminan desde su transferencia o su cheque (`MovimientoDeTransferencia`,
`MovimientoDeCheque`).

### Conciliación

Un original y su inverso que **nunca pasaron por el banco** (ninguno marcado en otra
conciliación) y con fecha hasta el fin del mes que se concilia se marcan **juntos**,
compensados, y no quedan como partidas en tránsito:

- al **iniciar** la conciliación ya arrancan marcados (`IniciarConciliacion` →
  `paresCompensadosPendientes`), así aparecen en la lista de marcados;
- al **guardar las marcas** (`MarcarMovimientos`) se vuelven a incorporar aunque el usuario
  no los incluya, así no se pueden dejar a medias;
- en la pantalla de conciliar, marcar o desmarcar uno marca o desmarca su pareja
  (`conAlternadoConPareja`).

Si el original ya estaba conciliado, el inverso es un movimiento normal: aparece
desmarcado y, mientras el banco no lo muestre, es una partida en tránsito. La regla de que
el documento de un mes autorizado no cambia sigue igual.

### Qué se puede hacer: lo dice el servidor

Para que el cliente no adivine, los DTO traen campos calculados con las reglas de arriba
(`aplicacion/acciones-posibles.ts`, pura y con pruebas; las consultas SQL solo traen los
hechos: marcado en conciliación, mes conciliado, historia de reversión):

- `MovimientoDto`: `puedeAnular`, `puedeEliminar`;
- `TransferenciaDto`: `puedeAnular`, `puedeEliminar`;
- `ChequeDto` y `ChequeListadoDto`: `puedeAnular`, `puedeBlanquear`.

La fecha del inverso no entra en `puedeAnular` (la escribe el usuario después): el servidor
la valida al anular.

### Funciones de reversión

Cada registro que se puede revertir sabe **crear su propio inverso** en su dominio:
`Movimiento.revertir` (nota suelta), `revertirPorTransferencia` y `revertirPorCheque` (los
dos modos internos, para las notas de una transferencia y el movimiento de un cheque en mes
conciliado) y `anularPorCheque` (la anulación a la antigua, sin inverso). El patrón común
(p. ej. una interfaz `Reversible` en `core/compartido/dominio`) se discutirá cuando llegue
`Partida.revertir` en Contabilidad.

### Datos existentes (migración `0011_b7_revertir_movimientos`)

Además de las columnas nuevas (`revertido_en`, `motivo_de_reversion`, `revierte_a_id` y su
índice), la migración convierte los movimientos anulados de hoy en pares original + inverso
para que el saldo de ninguna cuenta cambie: el original pasa a «revertido» (su anulación se
copia a la reversión) y se inserta el inverso con la fecha de la anulación (nunca anterior a
la del original). Quedan como estaban (solo anulados, fuera del saldo) los cheques cuyo mes
sigue abierto y los saldos iniciales anulados. Verificado en la base de desarrollo: los
saldos por cuenta antes y después son idénticos.

### Servidor

- Dominio: `Movimiento` (`revertir`, `revertirPorTransferencia`, `revertirPorCheque`,
  `anularPorCheque`, `exigirEliminable`, `exigirNoMarcadoEnConciliacion`; el efecto en el
  saldo sigue contando al revertido y solo excluye al anulado a la antigua), `Cheque.blanquear`
  y los errores de reversión en `dominio/errores-de-reversion.ts`.
- Casos de uso: `AnularMovimiento`, `EliminarMovimiento`, `EliminarSaldoInicial`,
  `AnularTransferencia`, `EliminarTransferencia`, `AnularCheque` (decide entre las dos
  formas según el mes) y `BlanquearCheque`. `PoliticaDeMismaFechaEnAnulacion` es el puerto
  de `bancos.anulaciones.misma_fecha`.
- API: `POST .../anular` con `{ motivo, fecha? }` (notas, transferencias, cheques);
  `DELETE /bancos/notas/:id`, `/bancos/transferencias/:id` y `/bancos/saldos-iniciales/:id`
  con `{ motivo }`; `POST /bancos/cheques/:id/blanquear`. El saldo inicial ya no tiene
  `anular`. La auditoría admite la acción `blanquear` (`core.auditoria`).

### Cliente

- `VentanaDeMotivo` reemplaza a `VentanaDeAnulacion`: explica lo que pasará, pide el motivo
  y, al anular, la fecha del inverso (hoy por omisión). También sirve para eliminar,
  blanquear y eliminar la última conciliación.
- `usarBajaDeRegistro` (composable común) arma cada ventana; cada pantalla tiene su par:
  `usarBajasDeNota`, `usarBajasDeTransferencia`, `usarBajasDeCheque` (anular y blanquear,
  para la lista de la empresa y para la chequera) y `usarEliminacionDeSaldoInicial`.
- Las tarjetas muestran «Anular», «Eliminar» y «Blanquear» solo si el servidor dice que se
  puede y el usuario tiene el permiso; el original lleva la marca «Revertido» y el inverso
  «Reversión» (`marcaDeReversion`), y ya no se editan. El reporte de Movimientos muestra
  original e inverso con su marca, y el saldo corrido los cancela.
- `ClienteHttp.eliminar` acepta un cuerpo (el motivo).
- Lógica pura con pruebas: `baja-de-registro.ts`, `estado-de-reversion.ts`, `marcas.ts`.

### Pruebas

Servidor: 565 pruebas (76 archivos). Dominio (`movimiento.prueba.ts`, `cheque.prueba.ts`),
las reglas de qué se puede hacer (`acciones-posibles.prueba.ts`), casos de uso (anular y
eliminar notas, transferencias, cheques y saldo inicial; fechas; mes abierto frente a mes
conciliado; blanquear; conciliación con pares compensados) y API (`bancos-anulaciones`,
`bancos-anulaciones-de-cheques` y `bancos-conciliaciones-compensadas`: DELETE y blanquear con
y sin permiso → 403, anular con fecha, cheque de mes abierto frente a conciliado). Cliente:
130 pruebas (26 archivos). Generador: 46, sin cambios.

**Hecho (2026-09-28).** Decisiones propias: (1) un movimiento inverso tampoco se corrige
(error propio `NoSeCorrigeUnInverso`), porque compensa a su original tal como está; (2) los
saldos iniciales anulados de antes del B7 no se convierten en par (siguen anulados): un
original con `saldo_inicial` revertido chocaría con el índice de un solo saldo inicial vigente;
(3) el saldo inicial se elimina si la cuenta no tiene **ninguna** conciliación, de cualquier
estado; (4) blanquear se rechaza también si el movimiento está anulado (`MovimientoAnulado`) o es
de un mes conciliado (`MesConciliado`); (5) el dinero sigue en centavos
enteros, ningún cálculo nuevo usa `parseFloat`.

Pendiente de investigar con *Contabilidad*: en qué otros casos se permite eliminar
(p. ej. registros aún no contabilizados de un período abierto).

## H9 Correlativo interno de comprobantes (servidor hecho el 2026-09-29)

Plan y decisiones: `plan-hallazgos-contables.md`, sección H9 y fila H9 de «Decisiones del usuario».

### Core (H9a)

- Tabla `core.correlativos` (`empresa_id`, `clave`, `anio` por omisión 0, `siguiente` > 0; llave
  primaria `(empresa_id, clave, anio)`; RLS por empresa) y puerto `Correlativos.siguiente(clave, fecha)`,
  que devuelve `{ numero, anio }`. `CorrelativosPostgres` usa un solo
  `insert … on conflict do update … returning` dentro de la unidad de trabajo en curso: la fila
  queda bloqueada hasta el `commit` (dos operaciones de la misma empresa y clave se esperan) y un
  `rollback` deshace también el número, así que un error de validación no deja huecos.
- **Por empresa.** Por omisión **no se reinicia cada año** (`anio` = 0). La variable de empresa
  `core.correlativos.reinicio_anual` (booleana, `false` por omisión, niveles empresa e instalación)
  activa el reinicio: entonces `anio` es el año de la fecha del documento y cada año vuelve a empezar en 1.
- Doble para pruebas: `CorrelativosEnMemoria` (`core/compartido/pruebas/dobles-compartidos.ts`).

### Bancos (H9b)

- Claves: `bancos.notas_de_credito`, `bancos.notas_de_debito` y `bancos.transferencias`.
- `bancos.movimientos.numero integer null` y `anio_de_numero integer not null default 0`;
  `bancos.transferencias.numero` y `anio_de_numero`. Únicos parciales
  `movimientos_numero_unico (empresa_id, tipo, anio_de_numero, numero) where numero is not null` y
  `transferencias_numero_unico (empresa_id, anio_de_numero, numero) where numero is not null`.
  **Por qué el año va en el índice:** con el reinicio anual el mismo número se repite cada año; sin
  `anio_de_numero` el índice del plan (`empresa, tipo, numero`) lo impediría. `anio_de_numero` no
  cambia si después se corrige la fecha de la nota, así que el número no «salta» de año.
- **Quién lleva número:** las notas sueltas y **sus inversos** (del tipo del inverso: el inverso de una
  nota de crédito es de débito y toma el siguiente número de débito), y también el inverso de un cheque
  anulado con el mes conciliado (es una nota de crédito real). **No lo llevan:** los cheques (su número es
  el de la chequera), el saldo inicial, las dos notas de una transferencia ni los inversos de esas dos notas
  (el número va en la transferencia). Lo decide `Movimiento.llevaNumero` y lo asigna
  `numerarSiCorresponde` (`aplicacion/numeracion-de-comprobantes.ts`) dentro de la unidad de trabajo,
  cuando ya pasaron las validaciones.
- Corregir una nota conserva su número, salvo que cambie de tipo (crédito ↔ débito): toma el siguiente de
  su nuevo tipo y el anterior queda como hueco, explicado por la auditoría `corregir` (`anterior.numero`).
- **Eliminar deja un hueco**, que es lo esperado: la auditoría guarda `anterior.numero` con quién, cuándo
  y por qué. Ningún número se reasigna.
- DTO de notas (`MovimientoDto`) y de transferencias (`TransferenciaDto`): `numero` (`null` si no lleva)
  y `anioDeNumero` (0 si la empresa no reinicia por año).
- Migraciones: `0013_h9_numero_de_comprobantes` (columnas e índices) y
  `0014_h9_numerar_datos_existentes` (datos): numera por empresa y tipo en orden `(fecha, creado_en, id)`,
  con la misma regla de arriba, y deja `core.correlativos.siguiente` en el último + 1 (anio 0).

### Reporte de correlativos (solo servidor)

`GET /api/bancos/correlativos?clave=` (permiso `bancos.movimientos.ver`; `clave` opcional, una de las
tres). Devuelve `{ correlativos: [{ clave, nombre, anio, ultimo, emitidos, huecos }] }`, un elemento por
clave y año (`anio` 0 si no se reinicia). Cada hueco es `{ numero, estado, explicaciones }`: `estado` es
`explicado` si `core.auditoria` de la empresa tiene una baja (`eliminar`) o un cambio de tipo (`corregir`)
con ese `anterior.numero` (y mismo tipo y año), con `accion`, `usuarioId`, `usuarioNombre`, `fecha` y
`motivo`; y `alerta` si no hay rastro (por ejemplo, un borrado directo en la base). Los huecos salen de
comparar `1..siguiente-1` con lo que hay en la tabla (`generate_series`), así incluye los del final.

### Pruebas

Dominio (`numeracion-de-movimientos.prueba.ts`), casos de uso (`numeracion-de-notas`,
`numeracion-de-transferencias`, `numeracion-de-cheques` y `reporte-de-correlativos`), Postgres real
(`correlativos-postgres.prueba.ts`: consecutivos, por empresa, por clave, rollback sin hueco,
concurrencia y reinicio anual) y API (`bancos-correlativos`, `bancos-numeracion-anual` y
`bancos-migracion-de-numeracion`, que corre el SQL de la migración sobre datos ya creados).

## H3a Catálogo de conceptos bancarios (servidor hecho el 2026-09-29)

Ver el diseño en `plan-hallazgos-contables.md` (H3). Decisión del usuario: el catálogo
`bancos.conceptos` lo **edita el usuario**; la semilla es solo un punto de partida. Es una
pantalla de **Administración** (importa y exporta Excel). Cliente hecho (ListaDeConceptos: tarjetas por nombre, «Del sistema», inactivar/reactivar por PUT, eliminar con motivo). Falta H3b (`concepto_id`
en notas y cheques).

- **Tabla `bancos.conceptos`** (migración `0015_conceptos`, por empresa con RLS): `nombre` (único
  por empresa), `aplica_a` (`credito`, `debito`, `ambos`), `actividad_de_flujo` (`operacion`,
  `inversion`, `financiamiento`, `ninguna`), `grupo_de_flujo` (texto opcional), `es_cargo_bancario`,
  `pide_datos_de_intereses` (H8), `admite_factura` (H7; **apagada** por omisión y en toda la semilla),
  `clave_de_sistema` (nula, única por empresa cuando existe) y `activo`. Las banderas de H7 y H8 ya
  están para no migrar dos veces.
- **Reglas del dominio** (`dominio/concepto.ts`): nombre obligatorio y recortado; un grupo en blanco se
  guarda como nulo; `pide_datos_de_intereses` no se acepta con `aplica_a = debito` (los intereses de
  H8 se acreditan en una nota de crédito). Un concepto con `clave_de_sistema` **no se edita, inactiva
  ni elimina** (`ConceptoDeSistema`, 422).
- **Casos de uso**: listar, obtener, crear, actualizar (con él se inactiva y se reactiva; la
  inactivación queda en `core.auditoria` como `bancos.conceptos:inactivar`) y **eliminar** (motivo
  obligatorio, auditoría `eliminar`; solo si nadie lo usa: `ConsultasConceptos.estaEnUso`, hoy siempre
  falso porque ninguna nota ni cheque lleva concepto, y H3b lo amplía; si está en uso, `ConceptoEnUso`, 422).
- **Semilla** (`dominio/conceptos-iniciales.ts`): 5 conceptos de sistema (`transferencia`,
  `pago_a_proveedor`, `saldo_inicial`, `sin_clasificar`, `cheque_caduco`) y 11 sugeridos (depósito de
  ventas, comisiones bancarias, intereses ganados, cheque rechazado, planilla, préstamo recibido, pago
  de préstamo, compra de activo, aporte de socios, retiro de socios, impuestos). Se aplica:
  1. **Empresas existentes**: la migración `0016_h3_sembrar_conceptos` la crea en cada empresa cuya
     cuenta contrató Bancos (el SQL repite la lista; si cambia una, cambiar la otra).
  2. **Empresas nuevas o que contratan Bancos después**: `SembrarConceptos` corre dentro de la
     unidad de trabajo de **listar** y de **crear** cuando la empresa no tiene ningún concepto (una
     vez sembrado, nunca más). No se usó el evento `empresas.registrada` porque el alta de cuenta y la
     activación de módulos no publican eventos. H3b debe llamar a `SembrarConceptos` antes de buscar
     un concepto de sistema por su clave.
- La migración `0016` también da `bancos.conceptos.ver|gestionar|importar|exportar` a los roles que ya
  tenían el permiso equivalente de `bancos.bancos.*`.
- **Endpoints** (`/api/bancos/conceptos`): `GET` (lista), `GET /:conceptoId`, `POST`, `PUT /:conceptoId`,
  `DELETE /:conceptoId` (cuerpo `{ motivo }`, 204), `GET /exportar`, `GET /plantilla` y
  `POST /importar?ensayo=true|false`. Permisos: `ver` (leer), `gestionar` (crear, actualizar, eliminar),
  `importar` (plantilla e importación) y `exportar`.
- **DTO** `ConceptoDto`: `id`, `nombre`, `aplicaA`, `actividadDeFlujo`, `grupoDeFlujo`, `esCargoBancario`,
  `pideDatosDeIntereses`, `admiteFactura`, `activo` y `claveDeSistema` (solo lectura; nulo en los del
  usuario). El cuerpo de `POST`/`PUT` es el mismo sin `id` ni `claveDeSistema`. El Excel lleva las mismas
  columnas sin `claveDeSistema`.
- **Pruebas**: dominio (`conceptos-iniciales.prueba.ts`), casos de uso (`casos-uso-de-conceptos.prueba.ts`) y
  API (`bancos-conceptos.api.prueba.ts`: semilla única, duplicados, sistema, eliminar, permisos, Excel).

## H6a Cheques caducos: solo el reporte (servidor hecho el 2026-09-29)

Plan: `plan-hallazgos-contables.md`, sección H6 y fila H6 de «Decisiones del usuario» (que manda: antigüedad
configurable, **7 meses por omisión**, solo cheques **emitidos y no cobrados**; los disponibles que nunca se
emitieron no tienen movimiento y no entran). La anulación en lote es H6b y aún no existe.

- **Variable** `bancos.cheques.meses_de_vencimiento` (empresa e instalación, pública): entero de 1 a 120,
  7 por omisión (`dominio/cheques-en-circulacion.ts`). Un valor fuera de rango se rechaza al guardarla.
- **Consulta** (`ConsultasDeChequesEnCirculacionDrizzle`): `cheques.estado = 'emitido'` con su movimiento
  `tipo = 'cheque'`, sin `conciliacion_id`, sin `revertido_en`, sin `anulado_en` y con
  `fecha < fecha de corte`. La fecha de corte es hoy menos los meses (día recortado al fin de mes, como
  `make_interval`), la calcula el caso de uso (`fechaDeCorteDeCheques`), no la base. Orden: más antiguo primero.
  «Hoy» lo da `Reloj.hoy` (ver «Fecha de hoy» al final).
- **Índice parcial** `movimientos_cheques_en_circulacion_idx (cuenta_bancaria_id, fecha)` donde
  `tipo = 'cheque'` y no está conciliado, revertido ni anulado. Migración `0017_h6_cheques_en_circulacion`
  (su `when` es 1790700500000, mayor que el de 0016, o el migrador la salta); además da los permisos nuevos a
  los roles que ya tenían `bancos.movimientos.ver` y `.exportar`.
- **Endpoint** `GET /api/bancos/cheques-caducos?cuentaBancariaId=&beneficiario=&meses=` (permiso
  `bancos.cheques-caducos.ver`; `meses` de 1 a 120, por omisión la variable; `beneficiario` busca por
  contenido sin distinguir mayúsculas y toma `%` y `_` como texto). Devuelve
  `{ mesesDeAntiguedad, fechaDeCorte, totalDeCheques, montoTotal, cheques }`; cada cheque trae `chequeId`,
  `movimientoId`, `cuentaBancariaId`, `cuentaBancariaNombre`, `serie`, `numero`, `fecha`, `diasDeAntiguedad`,
  `beneficiario`, `monto`, `mesConciliado` (el mes del cheque ya está autorizado: anularlo exigirá nota
  inversa en H6b) y `origen` (`suelto` o `cuentas_por_pagar`; hoy siempre `suelto`).
- **Excel** `GET /api/bancos/cheques-caducos/exportar` con los mismos filtros y el permiso
  `bancos.cheques-caducos.exportar`. Nunca se importa (es reporte).
- **Pruebas**: dominio (`cheques-en-circulacion.prueba.ts`), caso de uso (`reporte-de-cheques-caducos.prueba.ts`)
  y API (`bancos-cheques-caducos.api.prueba.ts`: entra el viejo emitido; no entran el cobrado, el anulado, el
  revertido, el reciente ni el disponible; filtros, variable de la empresa, permisos, Excel y aislamiento).

### H6a en el cliente: pantalla «Cheques caducos» (2026-09-29)

En **Reportes** de Bancos (`/bancos/cheques-caducos`, permiso `bancos.cheques-caducos.ver`; Excel con
`.exportar`; botón Imprimir). Página `ReporteDeChequesCaducos.vue`; componentes en
`componentes/cheques-caducos/` (`FiltrosDeChequesCaducos`, `ResumenDeChequesCaducos`,
`TablaDeChequesCaducos` y `FilaDeChequeCaduco`); composables en `composables/cheques-caducos/`.

- Filtros: cuenta, beneficiario y antigüedad mínima en meses (vacío = plazo de la empresa, que se muestra
  como sugerencia; valida 1 a 120 con un mensaje que dice cómo corregir). La consulta espera 350 ms
  después de escribir para no llamar al servidor por letra.
- Resumen: «N cheques · Q total» y con qué plazo y fecha de corte se armó. Los totales los calcula el servidor.
- Los días de antigüedad se destacan con una insignia: amarilla al pasar el plazo y roja pasado un año
  (`nivelDeAntiguedad`), con los meses completos al lado. «Mes» dice si está conciliado o abierto.
- La tabla se desliza dentro de su tarjeta en el celular (la página no); al imprimir se ve completa. Cada fila
  es un componente aparte (`FilaDeChequeCaduco`) para que H6b le agregue la casilla al inicio y la barra fija de
  «Anular seleccionados» sin tocar la tabla. Aún no hay casillas ni anulación.
- Pruebas de la lógica pura: `filtros-de-cheques-caducos.prueba.ts` y `antiguedad-de-cheques.prueba.ts`.

## Fecha de hoy en la hora de la empresa (2026-09-29)

Antes «hoy» se calculaba con `new Date().toISOString()`, es decir en UTC: entre las 18:00 y la medianoche en
Guatemala contaba como el día siguiente. Ahora el puerto `Reloj` (`core/compartido/aplicacion/reloj.ts`,
`hoy(contexto)`) devuelve la fecha `AAAA-MM-DD` en la zona horaria de la empresa: variable
`core.regional.zona_horaria` (empresa, cuenta o instalación; `America/Guatemala` por omisión). La cuenta pura
es `fechaLocalEn` (`core/compartido/dominio/fecha-local.ts`); `RelojEnZonaHoraria` la une con la configuración y
viene en `dependenciasCompartidas().reloj`. Lo usan `AnularCheque`, `AnularMovimiento`, `AnularTransferencia`,
`IniciarConciliacion` y el reporte de cheques caducos. Las pruebas usan `RelojFijo` o un `RelojEnZonaHoraria`
con la hora fija a las 20:00 de Guatemala. Excepción: el nombre de los archivos Excel exportados usa la zona por
omisión (la capa HTTP no puede llegar a la configuración). No hay más usos de `toISOString()` para «hoy».

## H3b Concepto en notas y cheques (servidor hecho el 2026-09-29)

Manda `concepto-de-notas-y-cheques.md` (informe del contador). Aquí solo lo que **no** depende de las preguntas
P1 a P8: no cambia `cheque_caduco`, ni hay columnas de origen (`modulo_de_origen`), `causa_de_anulacion` ni
conceptos nuevos en la semilla (quedaron hechos en «Ajustes de conceptos», más abajo).

- **Columna** `bancos.movimientos.concepto_id uuid not null`, con llave foránea **compuesta** `(concepto_id, empresa_id)`
  → `bancos.conceptos (id, empresa_id)` (por eso `conceptos` gana `unique (id, empresa_id)`): el concepto es siempre de
  la misma empresa. Índice `movimientos_concepto_fecha_idx (empresa_id, concepto_id, fecha)`.
- **Migración `0018_h3b_concepto_en_movimientos`** (`when` 1790700600000): la columna nace nulable; siembra el catálogo
  (mismos conceptos que `0016`) en las empresas con movimientos y sin conceptos, y agrega los tres de sistema que el
  relleno usa si faltan; rellena con reglas deterministas: notas de transferencia → `transferencia`; saldo inicial →
  `saldo_inicial`; el resto de los originales (notas y cheques, también los anulados a la antigua) → `sin_clasificar`;
  los inversos (incluidos los de transferencias) heredan el de su original, ya clasificado; recién entonces `not null`
  y la llave. Nada se infiere. Probada sobre datos reales (`bancos-migracion-de-conceptos.api.prueba.ts`).
- **Reglas** (`dominio/asignacion-de-concepto.ts`, pura): una nota o un cheque **original** exige un concepto activo,
  compatible con `aplica_a` (el cheque cuenta como débito) y **no de sistema** (así `sin_clasificar` nunca se elige,
  C5). Errores 422: `concepto_de_sistema_no_se_elige`, `concepto_inactivo`, `concepto_incompatible`; `concepto_obligatorio`
  si falta. Transferencias, saldo inicial e inversos los asigna el sistema (`ConceptosDeMovimientos.deSistema`, que
  antes llama a `SembrarConceptos`, como pedía H3a); el inverso **hereda** el concepto sin validar `aplica_a` ni si
  está activo (C2). Al **corregir** una nota se vuelve a validar (con su tipo nuevo); si el concepto es el mismo que ya
  tenía no se le exige seguir activo. Corregir el saldo inicial conserva su concepto de sistema.
- **Emitir cheque** y **registrar o corregir nota** reciben `conceptoId` (obligatorio en el cuerpo); el saldo inicial
  no lo recibe. `ConsultasConceptos.estaEnUso` revisa `bancos.movimientos`: un concepto que clasifica algo no se elimina
  (`concepto_en_uso`), se inactiva.
- **Reclasificar** (`ReclasificarMovimientos`): `POST /api/bancos/notas/reclasificar` con `{ movimientoIds (1 a 200),
  conceptoId }`, todo o nada en una transacción; responde `{ reclasificados, sinCambio }`. Cambia solo el concepto:
  procede en meses conciliados; audita `corregir` por movimiento (`anterior` con el concepto anterior y `motivo`
  «Reclasificado de «X» a «Y»») y **arrastra al inverso** de un movimiento revertido (también auditado). Prohibido en
  inversos, notas de transferencia y saldo inicial. **Permiso:** se reutiliza `bancos.notas.gestionar` (registrar y
  corregir notas); cubre también los cheques (un cheque «sin clasificar» se reclasifica igual).
- **DTO** `MovimientoDto`: `conceptoId`, `conceptoNombre` y `puedeReclasificar` (lo calcula el servidor:
  falso en inversos, notas de transferencia y saldo inicial). Filtro `conceptoId` en `GET /bancos/notas`,
  `GET /bancos/movimientos/reporte` y su Excel (que gana la columna «Concepto»).
- **Reporte de movimientos**: `sinClasificar { cantidad, montoDeEntradas, montoDeSalidas }` con los originales vigentes
  «Sin clasificar» de la cuenta y fechas del filtro, sin importar el filtro de concepto (los inversos no se cuentan
  dos veces). Con `conceptoId` el reporte no trae saldo corrido (un saldo de solo algunas filas no significa nada).
- **Pruebas**: dominio (`asignacion-de-concepto`, `movimiento-y-concepto`, `acciones-posibles`), casos de uso
  (`casos-uso-de-conceptos-en-notas`, `-en-cheques`, `-en-transferencias`, `reclasificar-movimientos`,
  `conceptos-de-movimientos`) y API (`bancos-conceptos-en-movimientos`: rechazos con su código, inverso de débito
  heredado, `estaEnUso` real, reclasificar con auditoría y arrastre, 403, reporte por concepto; y
  `bancos-migracion-de-conceptos`). Los dobles usan un catálogo con ids fijos (`pruebas/conceptos-de-prueba.ts`).

### H3b en el cliente (2026-09-29)

- **Selector de concepto** (`CampoSelector`, requerido) en la ventana de la **nota** (después del beneficiario) y en
  **emitir cheque**. Las opciones salen de `opcionesDeConcepto` (lógica pura, con pruebas): solo conceptos **activos** y
  **propios** (no de sistema, así «Sin clasificar» nunca aparece), compatibles con el tipo (el cheque cuenta como débito),
  por nombre. Al cambiar el tipo de la nota se limpia el concepto si ya no sirve. Al corregir una nota se conserva a la
  vista el concepto que ya tenía, aunque hoy esté inactivo (el servidor no le exige seguir activo).
- **Sugerencia por beneficiario** (solo notas): con el beneficiario escrito y sin concepto elegido, se ofrece «Último
  concepto con este beneficiario: X (usar)», calculado con las notas que la pantalla ya tiene cargadas (las del periodo del
  filtro). Solo sugiere, nunca elige. **Pendiente:** para cheques y para historia de otros periodos haría falta un
  endpoint (último concepto por beneficiario) o traer `conceptoId` en la lista de cheques; no se hizo.
- **Tarjetas de notas** y **reporte de movimientos** muestran el concepto (el reporte, en pantalla, impresión y Excel:
  columna «Concepto»). El reporte gana el filtro «Concepto» (con todos, también los de sistema; con uno elegido no hay saldo
  corrido) y un aviso «N movimientos sin clasificar: Q de entradas y Q de salidas» con enlace a la bandeja.
- **Bandeja «Sin clasificar»** (`/bancos/sin-clasificar`, sección Operación del menú, `BandejaDeSinClasificar.vue`): lista
  los originales sin concepto (según el servidor, `puedeReclasificar`; sin inversos, transferencias ni saldo inicial),
  filtrables por cuenta y fechas, con casilla por tarjeta y «Marcar todo lo que se ve» (tope de 200 por lote), y una barra
  fija con lo marcado (entradas y salidas en centavos exactos), el selector «Clasificar como…» (solo conceptos que sirven a
  **todo** lo marcado: con créditos y débitos juntos, únicamente los «ambos») y el botón. Confirma con un resumen y usa
  `POST /bancos/notas/reclasificar`. Para verla hace falta `bancos.movimientos.ver` (lee el reporte); marcar y clasificar,
  `bancos.notas.gestionar`.
- **Permiso para ver conceptos:** elegir un concepto exige poder listarlos, así que la migración `0019_h3b_ver_conceptos_al_registrar`
  da `bancos.conceptos.ver` a los roles que ya tenían `bancos.notas.gestionar`, `bancos.cheques.emitir` o `bancos.movimientos.ver`
  (solo ver; administrar sigue siendo `bancos.conceptos.gestionar`).
- Lógica pura con pruebas: `opciones-de-concepto`, `seleccion-de-pendientes`, `centavos`, filtros y detalles de nota.

## Ajustes de conceptos (P1, P3, P5, P6 y P8; servidor hecho el 2026-09-29)

Manda la tabla «Respuestas del usuario (2026-09-29)» de `plan-hallazgos-contables.md`. Migraciones
`0021_h3_origen_y_causa_de_anulacion` (`when` 1790700900000) y `0022_h3_conceptos_nuevos_y_sin_cheque_caduco`
(`when` 1790701000000). La API no cambia de rutas; los DTO ganan campos de solo lectura.

- **P6 Origen** (`movimientos.modulo_de_origen text`, `documento_de_origen_id uuid`, ambos nulables, sin llave foránea, con
  `check` de que van juntos o ninguno). Van **solo en `bancos.movimientos`** porque ahí viven las notas, los cheques emitidos y
  las notas de una transferencia (`cheques` y `transferencias` apuntan a sus movimientos, no llevan dinero propio); un origen en
  esas otras tablas duplicaría el dato. `Movimiento.crear(..., { origen: { modulo, documentoId } })` es la única puerta: la API
  de notas y cheques nunca lo acepta. `MovimientoDto` trae `moduloDeOrigen` y `documentoDeOrigenId`; con origen,
  `puedeReclasificar` es falso y reclasificar responde 422 `no_se_reclasifica_lo_de_otro_modulo` (el concepto lo fija el módulo de
  origen). El inverso **no** hereda el origen (no estaba decidido; se dejó nulo).
- **P1 Cheque caduco**: `bancos.cheques.causa_de_anulacion` (`manual` | `caducidad`, nula si no está anulado, con `check`).
  `Cheque.anular(motivo, causa = 'manual')` y `AnularCheque` aceptan `causa`; la API no la expone (H6b llamará al caso de uso con
  `caducidad`). El inverso hereda el concepto del cheque (como ya hacía). `ChequeDto` y `ChequeListadoDto` traen
  `causaDeAnulacion`. La migración 0021 marca `manual` los cheques ya anulados. **Se deja de usar `cheque_caduco`**: ya no está en
  `CONCEPTOS_DE_SISTEMA` (quedan 4) y la migración 0022 lo elimina en cada empresa; si algún movimiento lo referenciara (nada lo
  asigna), se conserva **inactivo**.
- **P8 y P5 Semilla** (`conceptos-iniciales.ts`, 19 sugeridos): «Cheque rechazado» pasa al grupo «Cobros a clientes»; nuevos
  Anticipo a proveedores, Fondo de caja chica (sin flujo), Reintegro de caja chica, IGSS, IRTRA e INTECAP, Dividendos pagados
  (financiamiento), Venta de activo (inversión), Préstamo a empresa relacionada (inversión) y Préstamo de empresa relacionada
  (financiamiento); «Retiro de socios» ya estaba (financiamiento). Sin préstamos a empleados (P4). **Empresas existentes**: la
  migración 0022 agrega los nuevos donde ya hay catálogo (sin tocar lo que tenga ese nombre) y cambia el grupo de «Cheque
  rechazado» solo si sigue en el original «Cheques rechazados». Las empresas sin catálogo lo reciben completo al abrir Conceptos
  (`SembrarConceptos`). Si cambia la lista, cambiar también el SQL de 0022 (y el de 0016/0018 no se toca).
- **P3 «Pago a proveedores» en un cheque manual**: es de sistema y no se elige (regla de H3b), con una excepción solo para el
  cheque: `exigirConceptoElegible(..., { pagoAProveedores })` lo acepta si Cuentas por pagar **no** está activo (`'permitido'`) y
  lo rechaza con 422 `pago_a_proveedores_lo_fija_cuentas_por_pagar` si lo está (`'reservado'`). Las notas siguen sin poder
  elegirlo. El puerto `CuentasPorPagarActivo` (`aplicacion/puertos`) lo implementa
  `CuentasPorPagarActivoEnModulosActivos` sobre `ModulosActivosDeLaCuenta` del mediador, con la clave `cuentas-por-pagar`
  (hoy no existe: siempre `permitido`).
- **P7 Sugerencias de «Sin clasificar»**: el servidor se hizo después con el diseño de
  `docs/modulos/diseno-sugerencias-de-concepto.md` (ver la sección «P7: sugerencias de concepto (servidor hecho el 2026-09-29)»
  al final de este archivo). Hoy el cliente todavía sugiere con lo que ya tiene cargado (pasos C1 a C3 pendientes).
- **Cliente (hecho el 2026-09-29)**: `causaDeAnulacion` («Manual» / «Por caducidad») como dato «Causa de anulación» en la
  tarjeta del cheque (ficha de chequera) y en la de la lista de cheques; `moduloDeOrigen` como dato «Origen» en las tarjetas
  de notas y bajo el concepto en la tabla del reporte de movimientos (lógica en `composables/movimientos/origen-y-causa.ts`).
  Con origen no se ofrece reclasificar porque el cliente sigue `puedeReclasificar`. En el cheque manual, el selector suma
  «Pago a proveedores» (clave `pago_a_proveedor`, `opcionesDeConceptoDeCheque`) solo si `sesion.moduloActivo('cuentas-por-pagar')`
  es falso (la sesión ya trae `modulosActivos`; no hizo falta tocar el servidor). Los 422 nuevos
  (`no_se_reclasifica_lo_de_otro_modulo`, `pago_a_proveedores_lo_fija_cuentas_por_pagar`) se muestran con el mensaje del
  servidor en el aviso de error del formulario.
- **Pruebas**: dominio (`asignacion-de-concepto`, `cheque`, `movimiento-y-concepto`, `conceptos-iniciales`,
  `acciones-posibles`), casos de uso (`casos-uso-de-conceptos-en-cheques`: P3 y causa) y API
  (`bancos-conceptos-ajustes.api.prueba.ts`: migración 0022 repetible, restricciones, origen, P3 y causa).

## H3c Flujo de efectivo y Movimientos por concepto (servidor y cliente hechos el 2026-09-29)

Dos reportes de **solo lectura** en Reportes de Bancos (imprimir y Excel). Manda `concepto-de-notas-y-cheques.md`
(sección «Flujo de efectivo (H3c)» y la tabla de anular) sobre el plan.

- **Una sola lectura agregada** (`ConsultasDeTotalesPorConceptoDrizzle.totalesPorConcepto`): agrupa en la base por
  concepto, sin traer movimientos. Solo movimientos **vigentes** (`anulado_en is null`, igual que el saldo), en el rango
  y la cuenta. **El inverso** (`revierte_a_id` no nulo) se suma en el concepto de su **original** (unión consigo misma) y
  en el mismo sentido del original, restando: `entradas` = créditos originales − débitos inversos; `salidas` = débitos y
  cheques originales − créditos inversos. Así un cheque caduco o una anulación deja su línea en cero aunque el inverso
  caiga en otro mes (en el mes del inverso las salidas salen negativas). `cantidad` cuenta originales y
  `cantidadDeInversos` los inversos. El saldo al inicio y al final sale de otra consulta (`saldosDelRango`).
- **Flujo de efectivo** `GET /api/bancos/flujo-de-efectivo?desde=&hasta=&cuentaBancariaId=` (ambas fechas obligatorias,
  `desde <= hasta`; sin cuenta son todas). Permisos **nuevos** `bancos.flujo-de-efectivo.ver` y `.exportar`
  (migración `0020_h3c_permisos_del_flujo`, `when` 1790700800000: los reciben los roles que ya tenían
  `bancos.movimientos.ver` / `.exportar`). Devuelve `actividades` (siempre operación, inversión y financiamiento, cada una
  con sus líneas por `grupo_de_flujo` o, si no tiene, por nombre del concepto, más sus totales), `lineasAparte` y
  `control`. Reglas de ubicación (`calculo-de-flujo-de-efectivo.ts`, puro y con pruebas):
  - `saldo_inicial` es apertura, no flujo: entra solo al control (`saldosInicialesDelRango`).
  - `transferencia`: con **todas** las cuentas se anulan entre sí y la línea se oculta (si por algún motivo no se
    anularan, se muestra para que se note); con **una cuenta** sale la línea «Transferencias entre cuentas propias».
  - Actividad `ninguna` que no sea transferencia ni saldo inicial: «Otros movimientos sin actividad» (solo si tiene algo).
  - `sin_clasificar`: «Sin clasificar (pendiente)», **siempre visible** (aun en cero); la pantalla enlaza a
    `/bancos/sin-clasificar`.
  - **Control de cuadre**: saldo al inicio + saldos iniciales del rango + flujo neto = saldo calculado, que se compara con el
    saldo al final en libros; `diferencia` y `cuadra`. La apertura va aparte porque el saldo al inicio del rango no puede
    incluir lo que ocurre dentro de él.
  - **Moneda:** hoy las cuentas no tienen moneda (ni el reporte de movimientos la trata), así que no hay nada que separar;
    cuando exista multimoneda habrá que filtrar por una o agrupar por moneda.
- **Movimientos por concepto** `GET /api/bancos/movimientos-por-concepto?desde=&hasta=&cuentaBancariaId=&conceptoIds=`
  (`conceptoIds` separados por coma, hasta 50). Reutiliza `bancos.movimientos.ver` y `.exportar`. Devuelve, por nombre,
  `entradas`, `salidas`, `neto`, `cantidad` y `cantidadDeInversos` de cada concepto (con `esDeSistema`) y el total. Incluye
  todos los conceptos (también transferencias y saldo inicial), porque quien filtra elige. El **detalle** de un concepto
  se pide con el reporte de movimientos que ya existe (`/bancos/movimientos/reporte?conceptoId=&desde=&hasta=&cuentaBancariaId=`):
  el inverso hereda siempre el concepto de su original, así que coincide con estos totales (ese reporte también lista los
  anulados a la antigua, marcados).
- **Excel**: `GET .../exportar` de cada uno con el mismo filtro. Flujo: filas sección/línea/entradas/salidas/neto con el total de
  cada actividad, las líneas aparte y el control de cuadre (con «NO CUADRA» si es el caso). Por concepto: una fila por concepto y
  el total. Nunca se importan.
- **Pruebas**: cálculo puro (`calculo-de-flujo-de-efectivo.prueba.ts`), casos de uso
  (`casos-uso-de-reportes-por-concepto.prueba.ts`) y API (`bancos-flujo-de-efectivo` y `bancos-movimientos-por-concepto`, con el
  escenario compartido `soporte/escenario-de-flujo.ts`: dos cuentas, notas de las tres actividades, sin actividad, sin clasificar,
  una nota anulada, una transferencia y un cheque de enero conciliado que se anula en marzo con su inverso). Cuadran febrero de la
  empresa, febrero de una cuenta, enero, marzo (solo el inverso) y el año completo contra el saldo de las cuentas.

### H3c en el cliente (2026-09-29)

Los dos reportes están en **Reportes** de Bancos (imprimir con `window.print()` y Excel con `AccionesDeIntercambio`; nada de
importar). Rutas y entradas del menú en `reportes-del-modulo.ts` (antes `menu-de-reportes.ts`, para que `modulo.ts` no pase de
200 líneas).

- **Flujo de efectivo** (`/bancos/flujo-de-efectivo`, permiso `bancos.flujo-de-efectivo.ver`; Excel con `.exportar`). Página
  `ReporteDeFlujoDeEfectivo.vue`; componentes en `componentes/flujo-de-efectivo/`: `FiltrosDelFlujo` (cuenta o todas y rango; el
  rango se valida antes de llamar y dice cómo corregir), `SeccionDeActividad` (una tarjeta por actividad, con sus líneas y su
  total, y «Sin movimientos en este rango» si no hay), `LineasAparteDelFlujo` («Otras líneas del período»: transferencias con una
  sola cuenta, sin actividad y **Sin clasificar (pendiente)** con el enlace «Clasificar (N)» a `/bancos/sin-clasificar`, que solo se
  ve con `bancos.movimientos.ver`) y `ControlDeCuadre` (verde si cuadra; si no, tarjeta roja con `role="alert"` y la diferencia).
  Los montos que restan se ven en rojo y con su signo (`MontoDelFlujo`). Sin desplazamiento horizontal de la página en el
  celular: cada tabla se desliza dentro de su tarjeta; al imprimir se ve completa, con un encabezado de empresa, cuenta y periodo.
- **Movimientos por concepto** (`/bancos/movimientos-por-concepto`, `bancos.movimientos.ver` y `.exportar`). Página
  `ReporteDeMovimientosPorConcepto.vue`; componentes en `componentes/movimientos-por-concepto/`: filtros con **selector de varios
  conceptos** (`SelectorDeConceptos`: lista con casillas en un `details`, sin selección = todos, tope de 50), tabla con totales y
  cada concepto **desplegable** (`FilaDeConceptoDelReporte` con `aria-expanded`): el detalle pide el reporte de movimientos ya
  existente con ese concepto, el rango y la cuenta, y muestra los anulados a la antigua tachados y los inversos con su marca.
  Al cambiar un filtro se cierran los detalles.
- **Lógica pura con pruebas**: `rango-de-fechas` (mes actual y errores del rango), `filtros-del-flujo` y `textos-del-flujo`,
  `filtros-por-concepto` (conceptos como lista separada por comas, filtro del detalle, marcar y desmarcar con tope).

## P7: sugerencias de concepto (servidor hecho el 2026-09-29)

Manda `docs/modulos/diseno-sugerencias-de-concepto.md` (con sus respuestas del usuario). Servidor: pasos S1, S2, S3, S4 y S6 y
la parte de servidor de dos respuestas más; falta S5 (`pg_trgm`, «después, con datos reales») y todo el cliente (C1 a C3).

- **S1 (migraciones `0024` y `0025`)**: función `bancos.nombre_para_comparar(text)` (`immutable`, `strict`, `parallel safe`,
  `search_path = pg_catalog`; sin acentos, mayúsculas ni signos; quita formas jurídicas y conectores como palabras completas) y la
  columna generada `movimientos.beneficiario_para_comparar` con el índice `(empresa_id, beneficiario_para_comparar, fecha)`. Los
  mapeadores la dejan fuera de la entidad y del DTO. Si la regla de la función cambia, hay que quitar y volver a agregar la columna.
- **S2 dominio puro** (`dominio/sugerencias/`): `pesos` (recencia, monto, Jaccard), `casos-de-votacion` (qué ejemplos votan),
  `votacion` (confianza `S / (W + α)`, sugerido y alternativas), `conceptos-ofrecibles` (las reglas de `exigirConceptoElegible`),
  `constantes` y `tipos`. Prueba de calidad con un año sintético (`calidad-de-la-sugerencia.prueba.ts`: precisión ≥ 90 % y cobertura ≥ 60 %).
- **S3**: puerto `ConsultasDeSugerencias` (Drizzle, con las tablas vivas y sin caché), `MotorDeSugerencias` (un solo cálculo para la
  bandeja y la captura), `SugerirConceptosDeSinClasificar`, `esPendienteDeClasificar` compartido con el reporte
  (`condiciones-de-clasificacion.ts`). Variables `bancos.sugerencias.vida_media_dias` (180, 30 a 1095) y
  `bancos.sugerencias.confianza_minima` (60, 30 a 95), niveles instalación y empresa, no públicas.
  `GET /api/bancos/notas/sugerencias-de-concepto?cuentaBancariaId=&desde=&hasta=` (permiso `bancos.notas.editar`; hasta 2,000
  pendientes, con `truncado`).
- **S4**: `ReclasificarVarios` y `POST /api/bancos/notas/reclasificar-varios` (permiso `bancos.notas.editar`; 1 a 200 asignaciones sin
  repetir movimiento, todo o nada; con `porSugerencia` el motivo de la auditoría termina en « (sugerencia aceptada)»). El paso por
  movimiento se extrajo a `ReclasificadorDeUnMovimiento`, que comparten los dos casos de uso.
- **«Pago a proveedores» en la bandeja**: al reclasificar un **cheque** rige la regla de P3 (se acepta si Cuentas por pagar no está
  activo; si lo está, 422 `pago_a_proveedores_lo_fija_cuentas_por_pagar`). Una nota nunca lo recibe.
- **Reclasificar un cheque desde el reporte**: `POST /api/bancos/cheques/reclasificar` con el permiso nuevo
  `bancos.cheques.reclasificar` (migración `0026`: lo reciben los roles que ya tenían `bancos.notas.editar`), auditoría `corregir`
  con el concepto anterior y arrastre al inverso. Las rutas de notas aceptan notas y cheques **pendientes** (la bandeja), pero
  rechazan un cheque ya clasificado (422 `un_cheque_se_reclasifica_como_cheque`); la de cheques rechaza una nota
  (422 `no_es_un_cheque_para_reclasificar`). Para una nota suelta basta `POST /notas/reclasificar` con un solo id.
- **S6**: `POST /api/bancos/notas/sugerir-concepto` (permiso `bancos.notas.crear`; `tipo` credito o debito obligatorio) y
  `POST /api/bancos/cheques/sugerir-concepto` (permiso `bancos.cheques.emitir`; tipo fijo cheque). Cuerpo:
  `{ cuentaBancariaId, fecha?, monto?, beneficiario?, referencia?, observaciones? }`; sin fecha, hoy de la empresa; sin monto, el monto
  no distingue. Responde `{ sugerido, alternativas, casosComparados }` sin `movimientoId` y no guarda ni audita nada.
- **Pruebas**: dominio (pesos, votación, casos, ofrecibles, calidad), casos de uso (`casos-uso-de-sugerencias`,
  `reclasificar-cheques-y-varios`) y API (`bancos-nombre-para-comparar`, `bancos-sugerencias-de-concepto`,
  `bancos-migracion-de-permiso-de-reclasificar`).
