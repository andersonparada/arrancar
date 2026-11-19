# Diseño EM-2: cierre de la carga inicial con revisión de los módulos, motivo y auditoría

_Agente `arquitecto-de-datos`. Primera versión 2026-11-18 (diseño corto pedido por `diseno-bancos-segunda-parte.md` §16.1
y §5.6). **Revisión del 2026-11-18** con las respuestas del usuario (al final) y el dictamen
`dictamen-em2-cheques-y-posfechado-2026-11-18.md`, Tema 1. Listo para programar salvo lo marcado en §11._

**Qué cambió en esta revisión:** la auditoría de cierres y reaperturas ya no se depura (§6, migración del core); tras
cerrar, la sección muestra «Cerrada el … por …, con N diferencias: motivo» y se puede consultar y exportar cada cierre con
las cifras del cuadre (§5); adjunto opcional del balance de apertura firmado (§7); textos nuevos del aviso de retenciones y
de la fecha que no es día 1, y dos avisos más de Cuentas por pagar (§3.2); paso aparte de U8 para transcribir el saldo del
balance (§10). Ya **no es «sin migración»**: una del core y dos de Empresas.

## 0. Lo ya decidido (no se vuelve a preguntar)

| Tema | Decisión | Fuente |
|---|---|---|
| Cerrar con diferencias o sin el dato | **No se bloquea**: confirmación con motivo y auditoría | C-7, P-10 (`diseno-bancos-segunda-parte.md` §5.6); dictamen Tema 1 (c) |
| Hallazgos de Bancos | `no_cuadra` y `sin_dato_de_libros` piden motivo; `sin_evidencia`, `saldo_global`, `sobregiro_sin_permiso` solo avisan | §5.6, P-15 |
| Motivo | 1–500 caracteres, como el de reabrir; opcional si nada lo pide, y se audita si se escribe | §16.1; P-5 (a) |
| Dónde vive el cierre | En **Empresas**, porque el cuadre es de todos los módulos | U8 §9.8, dictamen U8 |
| Cómo se juntan las revisiones | «Pregunta a todos» en el mediador: Empresas no conoce a los módulos | P-1 (A) |
| Quién ve la revisión antes de cerrar | Solo quien puede **cerrar** la carga | P-2 (a), validado por el contador |
| Módulo activo sin ningún saldo inicial | Aviso, sin motivo (Bancos y Cuentas por pagar) | P-3 |
| Huella | Si la revisión cambia entre abrir la ventana y confirmar, se rechaza y se vuelve a revisar | P-4 (a), validado |
| Cuentas por pagar en EM-2 | **Solo avisos**: no se pide motivo mientras no haya con qué comparar | Dictamen Tema 1 (a) |
| Fecha que no es día 1 | **Solo avisa**, también al cerrar | Dictamen Tema 1 (b) |
| Conservación | Las auditorías de cierre y reapertura se guardan **mientras exista la empresa** | Usuario con el dictamen, ajuste 1 |
| Que se vea | Tras cerrar: «Cerrada el … por …, con N diferencias: motivo»; la revisión se consulta y se exporta | Ajuste 2 |
| Qué se guarda | Hallazgos **y cifras del cuadre** de cada módulo | Ajuste 3 |
| Balance de apertura firmado | Adjunto **opcional**, PDF revisado con qpdf, con auditoría | Usuario con el dictamen |
| Saldo de proveedores y de anticipos del balance | Se transcribe en **U8, después de EM-2**, dos cifras; «no cuadra» pide motivo | Usuario con el dictamen; §10 |
| Con Contabilidad (futuro) | El cierre **bloqueará** si la cuenta puente de apertura no queda en cero, con salida por permiso y motivo | U8 §9.8 |

## 1. Lo que hay hoy (revisado en el código el 2026-11-18)

- `empresas.cargas_iniciales` (H5a): `empresa_id` (PK y FK a `core.empresas`, `on delete cascade`), `fecha_de_inicio
  date not null`, `cerrada_en`, `cerrada_por` (check `cargas_iniciales_cierre_completo`), marcas y autoría,
  `politicaPorEmpresa()`. No guarda motivo ni archivo. Última migración de Empresas: `0009`.
- `CerrarCargaInicial` corre en `EjecutorEnEmpresa` (la transacción toma `empresaId` de la ruta, así que
  `app.empresa_id` es la empresa de la carga aunque no sea la activa), busca la carga con `for update`, la cierra y **no
  audita ni pregunta a nadie**. `ReabrirCargaInicial` audita: `recurso 'empresas.cargas-iniciales'`, `accion
  'reabrir'`, `anterior` = `CargaInicialDto`, con motivo.
- Rutas: `GET /empresas/:empresaId/carga-inicial` (`empresas.ver`), `PUT` (`empresas.editar`), `POST …/cerrar`
  (`empresas.carga-inicial.cerrar`, sin cuerpo) y `POST …/reabrir` (`empresas.carga-inicial.reabrir`, `{ motivo }`).
- Mediador (`core/mediador/aplicacion/mediador.ts`, 114 líneas): órdenes y avisos; se salta los módulos inactivos de la
  cuenta. Una unidad de trabajo anidada con el mismo contexto se une a la que está en curso.
- **Bancos** (BS-2, unido): `RevisarCierreDeCargaEnBancos` devuelve `HallazgoDeCierre[]` (tipo propio de Bancos, con
  `pideMotivo`); `ListarSaldosIniciales` da `SaldosInicialesDto` con cada cuenta (`saldoEnLibrosAlCorte`,
  `saldoSegunLibrosAnteriores`, `diferencia`, `forma`), `totalBancos`, `totalSobregiros` y los hallazgos.
- **Cuentas por pagar** (U8): `ObtenerCuadreDeSaldosIniciales` (por proveedor y general: documentos, cargos, notas a
  favor, neto, retenciones por practicar, saldos con notas posteriores); `ConsultasDeCuadreDrizzle.sumasPorProveedor`.
  Los documentos del libro llevan `origen = 'libro_de_compras'`; los de apertura, `'saldo_inicial'`.
- **Libro de compras**: usa la fecha de inicio (crédito fiscal doble, U8-l); no tiene saldos iniciales.
- **Auditoría:** `core.auditoria` solo se agrega y se lee (`politicasDeSoloAgregar`); `empresa_id` es `on delete set
  null`, `cuenta_id` es `restrict` (la baja de una cuenta la borra a propósito). `core.depurar_auditoria(meses)`
  (migraciones 0009 y 0011, `security definer`) borra todo lo anterior a `greatest(meses, 60)` meses, **sin excepción**.
  El migrador da `select, insert, update, delete` sobre todas las tablas de cada esquema a `arrancar_app`: solo RLS
  impide escribir. Última migración del core: `0023`.
- **Documentos protegidos** (H2, F1–F3 y la fila de qpdf): `DocumentosProtegidos.revisar` (fuera de la transacción),
  `guardarRevisado`, `abrir`, `eliminar` (borra el disco tras confirmar); `leerDocumentoDeSolicitud` y `limitarSubidas`
  en `core/archivos/http`. Precedente: estado de cuenta de la conciliación (`bancos.conciliaciones`).
- Excel de varias hojas: `LibroDeExcel.escribirVarias` (precedente: `libro-de-compras/…/exportar-libro.ts`).
- Cliente: `usar-cierre-de-carga.ts` (32 líneas) confirma con texto fijo; `SeccionDeCargaInicial.vue` (92 líneas);
  `VentanaDeReapertura.vue`. `EstadoDeCuentaAdjunto.vue` y `VisorDeEstadoDeCuenta.vue` viven en Bancos.

## 2. La «pregunta a todos» del mediador (P-1 A)

`mediador.responder(modulo, nombre, manejador)` y `mediador.preguntarATodos(operador, nombre, datos)`, que devuelve
`{ modulo: string; respuesta }[]` con las respuestas **no nulas**, en el orden de registro de los módulos.

Reglas: corre dentro de la transacción de quien pregunta (como órdenes y avisos); salta los módulos inactivos de la
cuenta; si un manejador lanza, el error se propaga y se deshace todo (nunca se cierra con una revisión incompleta); no
revisa permisos del módulo que responde (decisión vigente del mediador); `retirarManejadoresDe(modulo)` también quita
sus respuestas. Contrato en `core/contratos/mediador.contratos.ts`: `interface PreguntasEntreModulos {}` y
`NombreDePregunta`, que cada módulo amplía con `declare module`.

**Sin importarse entre módulos:** Bancos, Cuentas por pagar y Libro de compras registran su respuesta en su propio
`modulo.ts` y solo importan los tipos de `core/contratos/empresas.contratos.ts`. Empresas solo llama a
`preguntarATodos`. Ninguno importa a otro módulo; un módulo nuevo (Cuentas por cobrar, Inventarios) solo se suscribe.

### 2.1 Contrato (`core/contratos/empresas.contratos.ts`)

```ts
interface PreguntasEntreModulos {
  /** Antes de cerrar la carga: cada módulo con saldos iniciales dice qué encontró y con qué cifras. */
  'empresas.revisar_cierre_de_carga': {
    datos: { empresaId: string; fechaDeInicio: string };
    respuesta: RevisionDeCierreDeModulo | null;      // null = no tiene nada que decir de esta carga
  };
}
interface RevisionDeCierreDeModulo {
  nombreDelModulo: string;          // «Bancos»
  resumen: string | null;           // «4 cuentas con saldo inicial al 31/12/2026»
  ruta: string | null;              // pantalla donde se corrige: '/bancos/saldos-iniciales'
  hallazgos: HallazgoDeCierre[];
  cifras: CifraDelCuadre[];         // nuevo (ajuste 3); máximo 200 por módulo
}
interface HallazgoDeCierre {
  codigo: string;                   // 'no_cuadra', propio del módulo
  nivel: 'pide_motivo' | 'aviso';
  mensaje: string;                  // texto final, ya armado por el módulo
  registro: { id: string; nombre: string } | null;
}
interface CifraDelCuadre {
  clave: string;                    // 'total_bancos', 'saldo_en_libros_al_corte'…, propia del módulo
  etiqueta: string;                 // «Saldo en libros al corte»
  tipo: 'monto' | 'cantidad';
  valor: string;                    // monto con dos decimales y signo ('-120.00'); cantidad entera ('14')
  registro: { id: string; nombre: string } | null;   // null = total del módulo
}
```

- Los textos y las cifras los arma cada módulo (montos con dos decimales; fechas `dd/mm/aaaa` en los mensajes): Empresas
  solo muestra, guarda y exporta.
- No hay nivel «bloquea»: quien deba impedir el cierre lanza su error. Hoy nadie lo hace (C-7).
- Tope de 200 cifras por módulo (un módulo que pase lanza un error de programación en las pruebas): las cifras son el
  **resumen numérico**, no el detalle documento por documento, que cada módulo exporta en su propio cuadre.
- **Alcance por registro:** la revisión es de toda la empresa. Hoy ningún recurso con saldos iniciales tiene alcance; si
  algún día lo tiene, el módulo debe contar lo que el operador no ve, nunca omitirlo.

## 3. Qué responde cada módulo

### 3.1 Empresas (hallazgos propios, sin mediador)

| Código | Nivel | Cuándo | Mensaje |
|---|---|---|---|
| `fecha_de_inicio_no_es_dia_1` | aviso | La fecha de inicio no es día 1 | El de EM-1, más la recomendación del dictamen: «La fecha de inicio (dd/mm/aaaa) no es el primer día de un mes. Lo recomendable es iniciar el día 1, con el balance al último día del mes anterior, y mejor el 1 de enero, porque el período del ISR es anual.» |
| `sin_balance_de_apertura` | aviso | No hay balance de apertura adjunto (§7) | «No adjuntó el balance de apertura firmado por el comerciante y el contador (Código de Comercio, art. 374). Puede adjuntarlo después de cerrar.» |

Cifras propias: ninguna (la fecha de inicio va en la cabecera de la revisión).

### 3.2 Los módulos

| Módulo | Código | Nivel | Mensaje (texto final) |
|---|---|---|---|
| **Bancos** | Los cinco de §5.6, uno por cuenta, con los textos de BS-2 | `no_cuadra`, `sin_dato_de_libros`: pide motivo; el resto, aviso | Ya armados por `dominio/hallazgos-de-cierre.ts` |
| | `sin_saldos_iniciales` (P-3) | aviso | «Hay N cuentas bancarias activas y ninguna tiene saldo inicial.» (solo si hay cuentas activas y todas están `sin_saldo`) |
| **Cuentas por pagar** | `sin_saldos_iniciales` (P-3) | aviso | «No hay ningún saldo inicial de proveedores. Si la empresa debía algo al dd/mm/aaaa (día anterior a la fecha de inicio), cárguelo antes de cerrar.» |
| | `retenciones_por_practicar` (texto del dictamen) | aviso | «N documentos con retenciones por practicar por Q x. Verifique que no se hayan acreditado en cuenta antes del dd/mm/aaaa: si así fue, la retención ya debía practicarse y enterarse.» (fecha = fecha de inicio) |
| | `documentos_del_libro_anteriores` (nuevo, dictamen O-4) | aviso | «N documentos del Libro de compras, por Q x, tienen fecha de emisión anterior al dd/mm/aaaa y no son saldo inicial: si se debían a esa fecha, deben estar en el balance de apertura y no contarse dos veces.» Cuenta `origen = 'libro_de_compras'`, `fecha_emision < fecha de inicio`, no anulados; el monto es Σ total de los cargos menos Σ de las notas |
| | `proveedores_con_saldo_a_favor` (nuevo) | aviso | «N proveedores tienen saldo a favor de la empresa por Q x: en el balance de apertura van como anticipo (activo), sin restarlos de Proveedores.» (proveedores con neto del cuadre < 0) |
| **Libro de compras** (nuevo) | `mes_partido` (texto del dictamen) | aviso | Solo si la fecha de inicio no es día 1: «El mes de mm/aaaa queda partido: las compras del 1 al dd no están en el Libro de compras de Arrancar; la declaración de ese mes debe sumarlas.» (dd = día anterior a la fecha de inicio). Si es día 1 responde `null` |

El texto del «mes partido» lo arma Libro de compras y no Empresas a propósito: Empresas no sabe si el módulo está activo,
y con Libro de compras apagado la frase sería falsa. El aviso de Empresas (§3.1) se queda con la recomendación general.

**Cifras por módulo** (tipo entre paréntesis):

| Módulo | Totales (`registro = null`) | Por registro |
|---|---|---|
| Bancos | Cuentas con saldo inicial (cantidad); Total bancos; Total sobregiros (montos, sin compensar, como §6.3 de Bancos) | Por cuenta con saldo inicial: Saldo en libros al corte; Saldo según libros anteriores (si lo hay); Diferencia (si la hay) |
| Cuentas por pagar | Documentos y Proveedores (cantidades); Cargos; Notas a favor; **Saldo de proveedores** (Σ de los netos positivos por proveedor); **Saldo a favor de la empresa** (Σ del valor absoluto de los netos negativos); Retenciones por practicar | Ninguno (el detalle por proveedor ya se exporta en el cuadre de saldos iniciales) |
| Libro de compras | Ninguna | — |

Cuentas por pagar guarda **dos cifras y no el neto** porque son las que se compararán en U8 con el balance (pasivo y
activo no se compensan, NIIF para Pymes 2.52 y 11.38A, dictamen Tema 1 (a)); el neto sigue en su pantalla de cuadre.

Resúmenes: Bancos «N cuentas con saldo inicial al dd/mm/aaaa»; Cuentas por pagar «N documentos de M proveedores».

## 4. Servidor de Empresas: revisar y cerrar

- **`RevisarCierreDeCargaInicial`**: en `EjecutorEnEmpresa`; exige carga con fecha (`FechaDeInicioRequerida`) y abierta
  (`CargaInicialCerrada`); arma lo propio, pregunta a los módulos y devuelve `RevisionDeCierreDto { carga, modulos:
  RevisionDeCierreDeModulo[], diferencias: number, avisos: number, pideMotivo: boolean, huella: string }`.
  `diferencias` = hallazgos `pide_motivo`; `avisos` = hallazgos `aviso`. El bloque de Empresas va primero, con
  `nombreDelModulo 'Empresa'` y `ruta null`.
- **Huella** = sha256 del JSON canónico (llaves ordenadas) de los módulos **con hallazgos y cifras**. Incluir las cifras es
  nuevo: lo guardado debe ser lo que la persona vio y justificó (P-4); si alguien agrega un saldo inicial mientras otro
  revisa, cambian las cifras aunque no cambie ningún hallazgo.
- **`CerrarCargaInicial`** (se reescribe): `{ empresaId, motivo?, huella? }`, una sola transacción: `for update` de la
  carga → vuelve a revisar → si `pideMotivo` y no hay motivo válido, `MotivoDeCierreRequerido` (422, `detalles` con la
  revisión) → si llegó `huella` y no coincide, `RevisionDeCierreDesactualizada` (422, `detalles` con la revisión nueva) →
  `carga.cerrar(...)` → **audita** → devuelve la carga. El dominio valida el motivo (`MotivoDeCierreInvalido`: más de 500
  o solo espacios). El `for update` hace esperar a quien guarda saldos iniciales con `for share`.

### 4.1 La entrada de auditoría del cierre (lo que se conserva)

`auditoria.registrar({ recurso: 'empresas.cargas-iniciales', registroId: empresaId, accion: 'cerrar', motivo, anterior })`
en **cada** cierre, con o sin hallazgos. Se agrega `'cerrar'` a `AccionAuditada` (con su TSDoc; `accion` es `text` sin
`check`: sin migración). `anterior`:

```ts
{
  version: 1,                                   // para leer bien las entradas viejas si el formato cambia
  carga: { empresaId, fechaDeInicio },          // la carga como estaba (abierta)
  revision: { modulos, diferencias, avisos, huella },
  balanceDeApertura: { sha256, nombreOriginal, paginas, tamanoBytes, subidoEn, subidoPorNombre } | null,
}
```

Tamaño: con el tope de 200 cifras por módulo la entrada queda por debajo de ≈ 100 KB aun con muchas cuentas bancarias.
La revisión **no se duplica** en una tabla de Empresas: la entrada de auditoría es la única fuente (§6 explica por qué y
cómo se conserva).

### 4.2 Errores nuevos (`empresas/dominio/errores.ts`)

| Clase | Familia | Código |
|---|---|---|
| `MotivoDeCierreRequerido` | `ReglaDeNegocioInfringida` (422) | `motivo_de_cierre_requerido` |
| `MotivoDeCierreInvalido` | `DatoInvalido` (400) | `motivo_de_cierre_invalido` |
| `RevisionDeCierreDesactualizada` | `ReglaDeNegocioInfringida` (422) | `revision_de_cierre_desactualizada` |
| `CierreDeCargaNoEncontrado` | `RecursoNoEncontrado` (404) | el de la familia |
| `BalanceDeAperturaNoEsPdf` | `DatoInvalido` (400) | `balance_de_apertura_no_es_pdf` |
| `SinBalanceDeApertura` | `RecursoNoEncontrado` (404) | el de la familia |
| `BalanceDeAperturaFijo` | `ReglaDeNegocioInfringida` (422) | `balance_de_apertura_fijo` («Con la carga cerrada no se puede quitar ni reemplazar el balance de apertura: reábrala primero.») |

## 5. Después del cierre: lo que se ve y se exporta (ajuste 2)

### 5.1 La línea de la sección

`CargaInicialDto` gana `ultimoCierre: { diferencias: number; avisos: number; motivo: string | null;
revisionGuardada: boolean } | null` y `balanceDeApertura` (§7.3). `ObtenerCargaInicial` lo lee de la **última** entrada
`accion = 'cerrar'` de la carga, solo si la carga está cerrada. Las cargas cerradas antes de EM-2 no tienen entrada:
`revisionGuardada = false` y la pantalla dice «Cerrada el dd/mm/aaaa por X (antes de que se guardara la revisión).» No se
inventa una entrada.

Texto (lógica pura del cliente): «Cerrada el dd/mm/aaaa por X, con N diferencias: motivo» / «con 1 diferencia: …» / «sin
diferencias.» / «sin diferencias: motivo» si se escribió uno.

La línea sale con `empresas.ver` (la ruta de siempre): diferencias, avisos y motivo no traen montos, y el dictamen pide
justamente que se vea. Las cifras y los hallazgos detallados piden el permiso nuevo (§5.3).

### 5.2 Historial de la carga

`ListarHistorialDeCargaInicial`: las entradas de `core.auditoria` con `recurso = 'empresas.cargas-iniciales'` y
`registro_id = empresaId`, de la más nueva a la más vieja (índice `auditoria_registro_idx` ya existe): cierres
(`cerrar`), reaperturas (`reabrir`) y cambios del balance de apertura (`quitar`), con fecha, quién, motivo y, en los
cierres, `diferencias` y `avisos`. Sin paginar (son pocas por empresa). `ObtenerCierreDeCargaInicial(cierreId)`: la
revisión completa de un cierre (`anterior.revision` y `balanceDeApertura`), 404 si el id no es un cierre de esa carga.

Lectura: puerto `HistorialDeLaCarga` en `empresas/aplicacion/puertos/`, implementado en
`empresas/infraestructura/persistencia/historial-de-la-carga.drizzle.ts`, que lee `core.auditoria` (precedente:
`bancos/…/consultas-de-correlativos.drizzle.ts`) y une `core.usuarios` para el nombre. Corre en `EjecutorEnEmpresa`:
RLS de la cuenta más `empresa_id = empresaId` en la condición. El mapeador lee `version` y rechaza con error de
programación una versión que no conoce.

### 5.3 Exportar (Excel de administración)

`ExportarCierreDeCargaInicial(cierreId)` con `LibroDeExcel.escribirVarias`, archivo
`cierre-carga-inicial-<aaaa-mm-dd>.xlsx`, tres hojas:

| Hoja | Columnas |
|---|---|
| Cierre | Empresa, NIT, Fecha de inicio, Cerrada el, Cerrada por, Diferencias, Avisos, Motivo, Balance de apertura (nombre, páginas, huella sha256 completa), Huella de la revisión |
| Hallazgos | Módulo, Nivel («Pide motivo» / «Aviso»), Registro, Mensaje |
| Cifras | Módulo, Registro (vacío en los totales), Concepto, Valor (número en las cantidades; monto con dos decimales en los montos, como número de Excel) |

Es solo exportar (no hay importación: no es una lista que se cargue). Se sirve con `Cache-Control: private, no-store`.

### 5.4 Permisos nuevos (Empresas)

| Permiso | Para | Quién lo recibe en la migración |
|---|---|---|
| `empresas.carga-inicial.ver-cierres` | Historial, revisión guardada de cada cierre y abrir el balance de apertura | Quien tenga `empresas.carga-inicial.cerrar` **o** `.reabrir` (por rol y por usuario) |
| `empresas.carga-inicial.exportar` | Exportar la revisión de un cierre | Idem |

Por qué no reusar `cerrar`: con la carga cerrada «cerrar» ya no describe lo que se hace, y quien solo reabre (otra
persona, por separación de funciones) también debe poder leer lo que se justificó. Por qué dos: «ver una lista no da
derecho a llevársela entera» (§3.5 del plan). Pregunta P-6 (§11).

### 5.5 API (todas con `proteger({ permiso })`)

| Método y ruta | Permiso | Cuerpo / respuesta |
|---|---|---|
| `GET /empresas/:empresaId/carga-inicial` (cambia) | `empresas.ver` | `CargaInicialDto` con `ultimoCierre` y `balanceDeApertura` |
| `GET …/carga-inicial/revision-de-cierre` | `empresas.carga-inicial.cerrar` | `RevisionDeCierreDto` |
| `POST …/carga-inicial/cerrar` (cambia) | `empresas.carga-inicial.cerrar` | `{ motivo?: string, huella?: string }`; `CargaInicialDto` |
| `GET …/carga-inicial/historial` | `empresas.carga-inicial.ver-cierres` | `EntradaDelHistorialDeCargaDto[]` |
| `GET …/carga-inicial/cierres/:cierreId` | `empresas.carga-inicial.ver-cierres` | `CierreDeCargaInicialDto` |
| `GET …/carga-inicial/cierres/:cierreId/exportar` | `empresas.carga-inicial.exportar` | `.xlsx` |
| `POST …/carga-inicial/balance-de-apertura` | `empresas.carga-inicial.cerrar` + `limitarSubidas(app)` | multipart, campo `archivo`; `CargaInicialDto` |
| `DELETE …/carga-inicial/balance-de-apertura` | `empresas.carga-inicial.cerrar` | `CargaInicialDto` |
| `GET …/carga-inicial/balance-de-apertura` | `empresas.carga-inicial.ver-cierres` | contenido del PDF |

## 6. Conservar sin depurar las auditorías de cierre y reapertura (ajuste 1)

### 6.1 Opciones

| Opción | Cómo | A favor | En contra |
|---|---|---|---|
| **A. Excepción por recurso en `core.depurar_auditoria`, con un catálogo** | Tabla `core.recursos_de_auditoria_permanente`; la función no borra las entradas de esos recursos mientras tengan empresa | Una sola fuente (la auditoría), sin duplicar; protege también las reaperturas **ya registradas** sin copiar nada; sirve tal cual para lo que venga (cierres de período de Contabilidad); cada módulo agrega su recurso en su migración; «mientras exista la empresa» sale solo de la llave `set null` | Toca la función del core (≈ 10 líneas de SQL) y suma una tabla de catálogo |
| B. Excepción fija en la función | `recurso <> ALL (ARRAY['empresas.cargas-iniciales'])` | La migración más corta | El core nombraría recursos de un módulo; cada recurso nuevo es otra migración del core |
| C. Conservación propia en Empresas | Tabla `empresas.cierres_de_carga_inicial` de solo agregar (`politicasDeSoloAgregarPorEmpresa`) con la revisión, además de la auditoría | Columnas con tipo para mostrar y exportar; sin tocar el core | Duplica la auditoría (el diseño anterior ya lo descartó); hay que copiar las reaperturas existentes desde `core.auditoria`; cada módulo que necesite lo mismo inventa su tabla |

**Decisión: A.** Es la menor que cumple el dictamen sin duplicar datos, y deja el mecanismo listo para Contabilidad. La
lectura tipada que daba C se obtiene con el puerto `HistorialDeLaCarga` (§5.2) y la `version` del `anterior`.

### 6.2 Migración del core (`0024_auditoria_permanente`, generada con `bd:generar -w servidor -- core auditoria_permanente` y completada a mano)

Tabla en `core/bitacora/infraestructura/persistencia/recursos-de-auditoria-permanente.tablas.ts`:

| Columna | Tipo | Nulo | Nota |
|---|---|---|---|
| `recurso` | `text` | no | PK. `check recursos_de_auditoria_permanente_recurso_valido (recurso ~ '^[a-z0-9-]+\.[a-z0-9-]+$')` |
| `motivo` | `text` | no | Por qué no se depura (cita legal). `check (char_length(btrim(motivo)) between 1 and 500)` |
| `creado_en` | `timestamptz` | no | `default now()` |

- Catálogo de la instalación: sin `empresa_id` ni `cuenta_id`, sin marcas ni autoría (lo escriben solo las migraciones).
- **RLS:** una sola política `leer_el_catalogo` (`for select to arrancar_app using (true)`). Sin políticas de
  `insert`, `update` ni `delete`: aunque el migrador le dé esos permisos a `arrancar_app`, RLS los rechaza. Es importante:
  si la app pudiera borrar una fila del catálogo, volvería depurable lo que debe conservarse.
- Función (SQL a mano al final del archivo generado):

```sql
CREATE OR REPLACE FUNCTION core.depurar_auditoria(meses integer) RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = core, pg_temp
SET row_security = off
AS $$
  WITH borradas AS (
    DELETE FROM core.auditoria a
    WHERE a.creado_en < now() - make_interval(months => greatest(meses, 60))
      AND NOT (
        a.empresa_id IS NOT NULL
        AND EXISTS (SELECT 1 FROM core.recursos_de_auditoria_permanente p WHERE p.recurso = a.recurso)
      )
    RETURNING 1
  )
  SELECT count(*)::integer FROM borradas;
$$;
```

- `SET row_security = off` (como `core.rutas_de_archivos_registradas`, 0023): si algún día se forzara RLS en el catálogo,
  la función fallaría con error en vez de leerlo vacío y depurar lo que debía conservar.
- `CREATE OR REPLACE` conserva el `REVOKE … FROM PUBLIC` y el `GRANT EXECUTE … TO arrancar_app` de 0009.
- **«Mientras exista la empresa»:** `core.auditoria.empresa_id` es `on delete set null`; si una empresa se borra, sus
  entradas quedan sin empresa y vuelven a la regla general de 60 meses. La baja de una cuenta borra su auditoría a
  propósito (llave `restrict` y proceso explícito), igual que hoy.
- Puerto y caso de uso `DepurarAuditoria` no cambian. Actualizar el TSDoc de `DepuradorDeAuditoriaDrizzle` y la sección
  de auditoría de `CLAUDE.md` / `docs/PLAN.md` («salvo los recursos de `core.recursos_de_auditoria_permanente`»).
- Sin índice nuevo: la depuración diaria ya recorre la tabla por `creado_en`; el `EXISTS` es contra un catálogo de pocas
  filas.

### 6.3 La parte de Empresas

En la migración de Empresas de EM-2.3 (§9): `INSERT INTO core.recursos_de_auditoria_permanente (recurso, motivo) VALUES
('empresas.cargas-iniciales', 'Cierres, reaperturas y balance de apertura de la carga inicial: respaldo de la apertura
mientras la SAT pueda revisar (Código Tributario, arts. 47, 49 y 50) y el comerciante conservar (Código de Comercio, art.
382). Dictamen del 2026-11-18.') ON CONFLICT DO NOTHING;`. Las reaperturas ya registradas quedan protegidas desde ese
momento, sin copiarlas. Una prueba revisa que cada `recurso` del catálogo empiece con la clave de un módulo registrado.

## 7. Balance de apertura firmado (adjunto opcional)

### 7.1 Datos (migración de Empresas de EM-2.4)

`empresas.cargas_iniciales` gana `balance_de_apertura_archivo_id uuid null` → `core.archivos(id)` **sin `on delete`
(NO ACTION)**, con `unique cargas_iniciales_balance_de_apertura_unico (balance_de_apertura_archivo_id)` (sirve de índice de
la llave). Mismo razonamiento que `bancos.conciliaciones.estado_de_cuenta_archivo_id` (H2 §2.1): ambas tablas cuelgan de
`core.empresas` con `cascade` y `restrict` podría romper el borrado de la empresa según el orden de las cascadas. Recurso
dueño del archivo: `empresas.cargas-iniciales` (`RECURSO_DE_BALANCES_DE_APERTURA`). `cargas-iniciales.tablas.ts` importa
`archivos` de `core/archivos/…/archivos.tablas.js` (permitido: hacia el core, desde infraestructura). Sin `check`: el
archivo es opcional. Datos existentes: la columna nace nula.

### 7.2 Reglas

| Carga | Subir (si no hay) | Reemplazar | Quitar |
|---|---|---|---|
| Abierta | Sí | Sí (borra el anterior y audita `quitar`) | Sí (audita `quitar`) |
| Cerrada | **Sí** (el balance firmado suele llegar después) | **No** (`BalanceDeAperturaFijo`) | **No** |

Recomendación (P-7): con la carga cerrada el balance que respalda el cierre no se puede cambiar sin reabrir, que pide motivo
y queda auditado. Reabrir no lo quita.

- **Solo PDF.** `DocumentosProtegidos.revisar` acepta PDF o foto; el caso de uso, después de `guardarRevisado`, exige
  `tipoMime = 'application/pdf'` y si no lanza `BalanceDeAperturaNoEsPdf` («Adjunte el balance en PDF; si lo tiene en papel,
  escanéelo como PDF.»): la transacción se deshace y la tarea «si se deshace» borra el archivo del disco (H2 D2). No se
  cambia la firma del core.
- Topes del core: 10 MB, 300 páginas, la fila de qpdf con su tope por cuenta y las 30 subidas por minuto compartidas.

### 7.3 Casos de uso (copiar la forma de `SubirEstadoDeCuenta`)

| Caso de uso | Transacción |
|---|---|
| `SubirBalanceDeApertura` | **Tres tiempos**: (a) unidad corta en `EjecutorEnEmpresa` que exige carga con fecha y, si está cerrada, que no tenga balance (falla rápido sin gastar qpdf); (b) `documentos.revisar` fuera de transacción; (c) unidad que toma la carga `for update`, vuelve a exigir lo de (a), `guardarRevisado`, exige PDF, pone la columna y, si había uno (solo abierta), `documentos.eliminar(anterior)` y audita `quitar` con `{ balanceDeApertura }` como estaba |
| `QuitarBalanceDeApertura` | Una: `for update`, exige abierta, quita la columna, `documentos.eliminar`, audita `quitar` |
| `AbrirBalanceDeApertura` | Una: `SinBalanceDeApertura` si no hay; `documentos.abrir(id, RECURSO…)`. Cabeceras como H2: `Content-Type` de la base, `inline; filename="balance-de-apertura-aaaa-mm-dd.pdf"` (armado por el servidor), `Cache-Control: private, no-store` |

`CargaInicialDto.balanceDeApertura: { tamanoBytes, paginas, sha256, nombreOriginal, subidoEn, subidoPorNombre } | null`
(nunca la ruta ni el id del archivo). `GET /archivos/:id` no lo sirve (tiene dueño). El cierre guarda esta misma
descripción en su auditoría (§4.1): aunque después se reabra y se reemplace, queda la huella del que respaldó cada cierre.

## 8. Cliente (Empresas, y piezas comunes en core)

| Pieza | Qué hace |
|---|---|
| `servicios/datos-de-empresa.api.ts` | `revisionDeCierre`, `cerrarCargaInicial(id, { motivo, huella })`, `historialDeCarga`, `cierreDeCarga`, `direccionDeExportarCierre`, `subirBalanceDeApertura`, `quitarBalanceDeApertura`, `direccionDelBalanceDeApertura` |
| `composables/revision-de-cierre.ts` + `.prueba.ts` (pura) | Agrupar por módulo, contar, decidir si el motivo es obligatorio, validar 1–500, formatear cifras (montos con `formato.ts`) |
| `composables/resumen-de-cierre.ts` + `.prueba.ts` (pura) | La línea «Cerrada el … por …, con N diferencias: motivo» con sus variantes (1 diferencia, sin diferencias, sin revisión guardada) |
| `componentes/VentanaDeCierreDeCarga.vue` | Reemplaza el `confirmar` de `usar-cierre-de-carga.ts`: texto del cierre y recordatorio del cuadre; un bloque por módulo con resumen, cifras (tabla corta) y «Revisar en <módulo>» si el usuario tiene el permiso de esa pantalla; hallazgos que piden motivo en rojo, avisos en ámbar; «Sin observaciones» si no hay nada; **Motivo** obligatorio solo si algún hallazgo lo pide (contador 0/500). Ante `revision_de_cierre_desactualizada` recarga y avisa «Los saldos cambiaron mientras revisaba; vuelva a revisar»; los errores de motivo van al campo (`usarFormulario`) |
| `componentes/ResumenDelCierre.vue` | La línea del último cierre y los botones «Ver revisión» (`v-permiso` `ver-cierres`) y «Exportar» (`exportar`) |
| `componentes/VentanaDelHistorialDeCarga.vue` + `VentanaDeRevisionGuardada.vue` | Historial (cierres, reaperturas y cambios del balance) y la revisión de un cierre, de solo lectura, con «Exportar» |
| `componentes/BalanceDeApertura.vue` | Usa las piezas comunes; reemplazar y quitar ocultos con la carga cerrada |
| `core/componentes/archivos/DocumentoAdjunto.vue` y `VisorDeDocumento.vue` (nuevos en core) | Versión general de `EstadoDeCuentaAdjunto` y `VisorDeEstadoDeCuenta` (props: dirección, descripción del archivo, `accept`, puede editar). `accept="application/pdf"` para el balance. Bancos **no** se toca en EM-2 (la cadena BS-3 a BS-5 está en curso); pasar Bancos a las piezas comunes queda como limpieza posterior |
| `SeccionDeCargaInicial.vue` | Solo arma: fecha, `ResumenDelCierre`, `BalanceDeApertura`, botones; sigue por debajo de 120 líneas |

Nota: el aviso de EM-1 en el formulario de la fecha de inicio puede agregar la frase del «mes partido» cuando Libro de
compras está activo (`sesion` conoce los módulos). Se deja anotado; no es parte de EM-2.

## 9. Pasos (un commit cada uno, con sus pruebas)

| Paso | Qué toca | Pruebas | Depende de |
|---|---|---|---|
| **EM-2.1** (servidor, core: mediador) | `preguntarATodos`/`responder`, `PreguntasEntreModulos`, `NombreDePregunta`; `retirarManejadoresDe` también para preguntas; respuestas `null` se omiten | Unidad: varios responden y se juntan en orden; `null` se omite; módulo inactivo se salta; nadie responde → `[]`; uno lanza → se propaga; retirar quita la respuesta; responder dos veces el mismo módulo y pregunta → error | — |
| **EM-2.2** (servidor, core: auditoría permanente) | Migración `0024_auditoria_permanente` (tabla, política, función), `recursos-de-auditoria-permanente.tablas.ts`, TSDoc del depurador, `CLAUDE.md` y `docs/PLAN.md` (regla de auditoría) | Integración (como propietario se insertan entradas con `creado_en` de hace 61 meses): la de un recurso del catálogo con empresa se conserva; la misma sin empresa se borra; la de otro recurso se borra; las recientes no se tocan; `arrancar_app` no puede insertar, cambiar ni borrar en el catálogo (RLS); el mínimo de 60 meses sigue | — (en paralelo con EM-2.1) |
| **EM-2.3** (servidor, Empresas: revisar y cerrar) | Contrato `empresas.revisar_cierre_de_carga` con `cifras`; `RevisarCierreDeCargaInicial`; hallazgos propios (§3.1); `CerrarCargaInicial` con motivo, huella (con cifras) y auditoría §4.1; `'cerrar'` en `AccionAuditada`; rutas `GET …/revision-de-cierre` y cuerpo del `POST …/cerrar`; errores. Migración de Empresas `0011_em2_cierre_de_la_carga`: fila del catálogo (§6.3) y los dos permisos (§5.4) por rol y por usuario; declararlos en `modulo.ts` | Sin fecha; ya cerrada; sin hallazgos (cierra sin motivo, audita motivo nulo y `version 1`); «pide motivo» sin motivo (422 con detalles) y con motivo (audita motivo, hallazgos y cifras); motivo de 501 o solo espacios (400); huella vieja (422) y cifras que cambian sin cambiar hallazgos (422); día 1 y no día 1; sin balance (aviso); empresa no activa del operador; 403 sin `cerrar` (con `empresas.ver` solo no ve la revisión); con un doble que responde y otro que lanza (no cierra); más de 200 cifras (error de programación); la migración da los permisos a quien tenía `cerrar` o `reabrir` y la fila del catálogo existe | EM-2.1 y EM-2.2 |
| **EM-2.4** (servidor, Empresas: lo que se ve después) | `ultimoCierre` en `CargaInicialDto`; puerto y consulta `HistorialDeLaCarga`; `ListarHistorialDeCargaInicial`, `ObtenerCierreDeCargaInicial`, `ExportarCierreDeCargaInicial` (tres hojas); sus rutas | Carga cerrada antes de EM-2 (`revisionGuardada false`); cerrar, reabrir y volver a cerrar (historial en orden, `ultimoCierre` es el último); cierre de otra empresa por id → 404; id de una reapertura → 404; Excel: tres hojas, montos como número, huella completa; 403 sin `ver-cierres` y sin `exportar`; versión desconocida en el `anterior` → error de programación | EM-2.3 |
| **EM-2.5** (servidor, Empresas: balance de apertura) | Migración `0012_em2_balance_de_apertura` (columna, `unique`, llave); `SubirBalanceDeApertura` (tres tiempos), `QuitarBalanceDeApertura`, `AbrirBalanceDeApertura`; `balanceDeApertura` en el DTO y en la auditoría del cierre; rutas. **Revisión de `seguridad` antes de unirlo** | PDF real aceptado; foto rechazada con `balance_de_apertura_no_es_pdf` y sin archivo en disco; PDF con JavaScript o contraseña (errores del core); subir con la carga abierta y reemplazar (borra el anterior, audita `quitar`); con la carga cerrada: subir si falta sí, reemplazar y quitar 422; con la carga cerrada y ya con balance, qpdf no corre (el doble lo cuenta); otra empresa 404; `GET /archivos/:id` con ese id 404; cabeceras; cierre con balance guarda su `sha256` | EM-2.3 y H2 paso 1 (hecho) |
| **EM-2.6** (servidor, Bancos) | Responder la pregunta en `modulo.ts` con un adaptador sobre `ListarSaldosIniciales` (hallazgos de BS-2 a `HallazgoDeCierre` del contrato, cifras §3.2, `sin_saldos_iniciales`) | Integración: no cuadra y sin dato de libros piden motivo; sin evidencia, global y sobregiro avisan; cuenta sin saldo inicial no da cifras por cuenta; todas sin saldo → `sin_saldos_iniciales`; sin cuentas bancarias → `null`; totales sin compensar; Bancos inactivo no responde | EM-2.3; **BS-3 unido** (toca los saldos iniciales y los hallazgos) |
| **EM-2.7** (servidor, Cuentas por pagar) | `RevisarCierreDeCargaEnCuentasPorPagar` sobre el cuadre y una consulta nueva de documentos del libro anteriores a la fecha de inicio; respuesta en `modulo.ts`; los cuatro hallazgos y las cifras §3.2 | Sin saldos iniciales (aviso); retenciones (texto con la fecha); documentos del libro anteriores (cuenta, monto, excluye anulados y los de saldo inicial); proveedor con neto negativo (aviso y «Saldo a favor de la empresa»); dos proveedores, uno a favor y otro en contra (las dos cifras no se compensan); sin hallazgos, con resumen | EM-2.3; unir **después** de los pasos de Cuentas por pagar en curso que tocan `modulo.ts` (CP4-10, CP4-11, CP5-5) para no chocar |
| **EM-2.8** (servidor, Libro de compras) | Responder `mes_partido` (o `null`) en `modulo.ts` | Fecha día 1 → `null`; 15/03 → «del 1 al 14» y «03/aaaa»; 1 de enero → `null`; módulo inactivo no responde | EM-2.3 |
| **EM-2.9** (cliente, core) | `DocumentoAdjunto.vue` y `VisorDeDocumento.vue` en `core/componentes/archivos/` | Componentes: con y sin archivo, `accept`, edición deshabilitada, confirmación al quitar, mensajes del servidor | — |
| **EM-2.10** (cliente, Empresas: cierre) | API, `revision-de-cierre.ts`, `VentanaDeCierreDeCarga`, `usar-cierre-de-carga.ts` (abre la ventana y trae la revisión con `usarCarga`) | `revision-de-cierre.prueba.ts` (motivo obligatorio u opcional, conteos, 0/500, cifras); composable ante `revision_de_cierre_desactualizada` y los errores de motivo | EM-2.3 (EM-2.6 a 2.8 no hacen falta: la ventana muestra lo que llegue) |
| **EM-2.11** (cliente, Empresas: después del cierre) | `resumen-de-cierre.ts`, `ResumenDelCierre`, historial, revisión guardada, exportar | `resumen-de-cierre.prueba.ts` (todas las variantes del texto); botones ocultos sin permiso | EM-2.4 y EM-2.10 |
| **EM-2.12** (cliente, Empresas: balance) | `BalanceDeApertura.vue` y su composable | Composable: subir, reemplazar, quitar; con la carga cerrada solo subir si falta | EM-2.5 y EM-2.9 |
| **EM-2.13** (QA, navegador) | Cerrar sin hallazgos, con avisos, con un `no_cuadra` (exige motivo); saldos que cambian en otra pestaña; la línea tras cerrar; historial y Excel; adjuntar un PDF real, intentar una foto; reabrir y volver a cerrar; con Libro de compras y Bancos apagados. Al final, docs: `bancos.md`, `cuentas-por-pagar.md`, bitácora de `PLAN.md` y `DONDE-QUEDAMOS.md` | — | EM-2.6 a EM-2.8, EM-2.11 y EM-2.12 |

Paralelos: EM-2.1, EM-2.2 y EM-2.9 entre sí; EM-2.4, EM-2.5, EM-2.6, EM-2.7, EM-2.8 y EM-2.10 entre sí una vez unido
EM-2.3. Migraciones: revisar al programar el número siguiente del core (`0024`) y de Empresas (`0011`, `0012`; la `0010` la tomó el Excel de Empresas); si otro
paso en curso tomó el número, se genera con el siguiente.

## 10. Después de EM-2: U8-B, saldo de proveedores y de anticipos del balance de apertura (paso aparte)

Fuera de EM-2 (dictamen Tema 1 (a), decisión del usuario). Lo que se sabe hoy, para su diseño corto:

- **Qué:** transcribir del balance de apertura **dos cifras**: «Proveedores» (pasivo) y «Anticipos y saldos a favor con
  proveedores» (activo). Sin compensar.
- **Datos (Cuentas por pagar):** tabla `cuentas_por_pagar.saldos_del_balance_de_apertura` (una fila por empresa;
  `empresa_id` PK y FK a `core.empresas` con `cascade`; `saldo_de_proveedores` y `saldo_de_anticipos` `numeric(14,2) not
  null` con `check >= 0`; qué incluye la cifra de proveedores, p. ej. `incluye_retenciones_por_practicar boolean not
  null`; `observaciones text null`; marcas, autoría, `politicaPorEmpresa()`). Solo se escribe con la carga abierta
  (`CargaInicialEnMediador`, como los saldos iniciales); corregir y eliminar se auditan (`corregir`, `eliminar`).
- **Revisión:** en `RevisarCierreDeCargaEnCuentasPorPagar`, `sin_dato_del_balance` (aviso, como hoy sin el dato) y
  `no_cuadra` por cada cifra que difiera de «Saldo de proveedores» o «Saldo a favor de la empresa» (**pide motivo**); las
  cifras transcritas y las diferencias se suman a las cifras del cuadre.
- **Para el contador antes de programar:** cómo se compara la cifra de proveedores cuando el balance la presenta con o
  sin las retenciones por practicar (el dictamen dice que son parte de lo que se debe al proveedor), y si
  `documentos_del_libro_anteriores` debe entrar en la comparación.
- **Pasos:** U8-B0 diseño corto (arquitecto y contador), U8-B1 servidor (migración, casos de uso, revisión), U8-B2
  cliente (dos campos en la pantalla del cuadre, con «Cuadra» / «Difiere en Q…»). Depende de EM-2.7.

## 11. Preguntas para el usuario (no bloquean EM-2.1 a EM-2.3; se programa con lo recomendado)

- **P-6. Quién consulta y exporta los cierres guardados.** (a) Dos permisos nuevos, `ver-cierres` y `exportar`, que
  reciben quienes hoy pueden cerrar o reabrir (**recomendado**: la revisión trae diferencias en dinero de Bancos; separa
  verla de llevársela); (b) reusar `cerrar`. Lo necesita la migración de EM-2.3.
- **P-7. El balance de apertura con la carga cerrada.** (a) Se puede adjuntar si falta, pero no reemplazar ni quitar sin
  reabrir (**recomendado**: el respaldo del cierre no cambia sin un motivo auditado); (b) se puede cambiar siempre, con
  auditoría; (c) solo con la carga abierta. Lo necesita EM-2.5.
- **P-8. ¿Aviso «sin balance de apertura» al cerrar?** (a) Sí, aviso sin motivo (**recomendado**: recuerda el art. 374
  sin obligar); (b) no.

## Respuestas del usuario (2026-11-18)

- **P-1:** A, una «pregunta a todos» en el mediador; cada módulo activo responde y Empresas no los conoce.
- **P-2:** (a), solo quien tiene el permiso de cerrar la carga ve la revisión.
- **P-3:** sí, se avisa (sin pedir motivo) cuando un módulo activo no tiene ningún saldo inicial.
- **P-4:** si los hallazgos cambian entre abrir la ventana y confirmar, se rechaza y se vuelve a revisar.
- **P-5:** (a), sin hallazgos que lo exijan el motivo es opcional y se audita si se escribe.
- Lo marcado para el contador se consultó el 2026-11-18 (`dictamen-em2-cheques-y-posfechado-2026-11-18.md`, Tema 1).

### Decisiones del usuario con el dictamen (2026-11-18)

- Las auditorías de cierre y reapertura se conservan **mientras exista la empresa** (§6).
- Tras cerrar se muestra «Cerrada el … por …, con N diferencias: motivo» y se guarda y exporta la revisión con las cifras
  del cuadre de cada módulo (§4.1 y §5).
- Adjunto opcional del balance de apertura firmado, PDF revisado con qpdf, con auditoría (§7).
- Después de EM-2, paso de U8 para transcribir el saldo de proveedores y el de anticipos (dos cifras) con «no cuadra» que
  pide motivo (§10).
