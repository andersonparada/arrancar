# Módulo `bancos`

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
- **Movimientos**: lista por cuenta y por fechas, con ventanas para nota de crédito, nota de débito, transferencia entre cuentas y emisión de cheque.
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
Excel. La única excepción hoy es Movimientos, que importa a mano (saldos
iniciales). Los reportes se diseñarán aparte (no son un CRUD).

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
