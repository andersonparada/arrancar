# Diseño EM-2: cierre de la carga inicial con revisión de los módulos, motivo y auditoría

_Agente `arquitecto-de-datos`, 2026-11-18. Diseño corto pedido por `diseno-bancos-segunda-parte.md` §16.1 (EM-2) y §5.6
(revisión de Bancos, que programa BS-2). Resuelve la decisión N-4 (§17) con el usuario. Sin migración._

## 0. Lo ya decidido (no se vuelve a preguntar)

| Tema | Decisión | Fuente |
|---|---|---|
| Cerrar con diferencias o sin el dato | **No se bloquea**: confirmación con motivo y auditoría | C-7, P-10 (`diseno-bancos-segunda-parte.md` §5.6) |
| Hallazgos de Bancos | `no_cuadra` y `sin_dato_de_libros` piden motivo; `sin_evidencia`, `saldo_global`, `sobregiro_sin_permiso` solo avisan | §5.6, P-15 |
| Motivo | 1–500 caracteres, como el de reabrir | §16.1 |
| Dónde vive el cierre | En **Empresas**, porque el cuadre es de todos los módulos | U8 §9.8, dictamen U8 |
| Con Contabilidad (futuro) | El cierre **bloqueará** si la cuenta puente de apertura no queda en cero, con salida por permiso y motivo | U8 §9.8 (queda para Contabilidad) |

## 1. Lo que hay hoy (revisado en el código)

- `empresas.cargas_iniciales` (H5a): `empresa_id` (PK y FK a `core.empresas`, `on delete cascade`), `fecha_de_inicio
  date not null`, `cerrada_en`, `cerrada_por` (check `cargas_iniciales_cierre_completo`), marcas y autoría,
  `politicaPorEmpresa()`. No guarda motivo.
- `CerrarCargaInicial` (`empresas/aplicacion/casos-uso/datos-de-empresa/`) corre en `EjecutorEnEmpresa` (la empresa
  **no tiene por qué ser la activa**: la transacción toma `empresaId` de la ruta), busca la carga con `for update`,
  la cierra y **no audita ni pregunta a nadie**. `ReabrirCargaInicial` sí audita: `recurso
  'empresas.cargas-iniciales'`, `accion 'reabrir'`, `anterior` = `CargaInicialDto`, con motivo.
- Rutas: `POST /empresas/:empresaId/carga-inicial/cerrar` (`empresas.carga-inicial.cerrar`, sin cuerpo) y `…/reabrir`
  (`empresas.carga-inicial.reabrir`, `{ motivo }`).
- Mediador (`core/mediador/aplicacion/mediador.ts`): **órdenes** (un solo módulo responde) y **avisos** (varios
  escuchan, sin respuesta; el que lanza deshace todo). Se salta a los módulos inactivos de la cuenta.
- Órdenes de Empresas: `empresas.obtener_carga_inicial` (toma `for share`: un cierre espera a la escritura de saldos
  iniciales en curso) y `empresas.obtener_datos_de_empresa`. Aviso: `empresas.fecha_de_inicio_por_cambiar`, que
  escuchan Cuentas por pagar y Libro de compras (y Bancos desde BS-2).
- **Cuentas por pagar** (U8): con la carga cerrada no acepta crear, corregir, eliminar ni importar saldos iniciales
  (`CargaInicialCerrada` vía `CargaInicialEnMediador`). Tiene el cuadre `ObtenerCuadreDeSaldosIniciales` (cargos,
  notas a favor, neto, retenciones por practicar), pero **no hay contra qué compararlo** (no se transcribe el saldo de
  proveedores del balance anterior), así que hoy no puede decir «no cuadra».
- **Libro de compras**: solo usa la **fecha de inicio** (aviso de crédito fiscal doble, notas sobre facturas
  anteriores, U8-l); no depende de que la carga esté cerrada ni tiene saldos iniciales. No aporta revisión.
- Cliente: `usar-cierre-de-carga.ts` confirma con un texto fijo y el recordatorio «compare el cuadre de cada módulo
  con el balance de apertura»; `SeccionDeCargaInicial.vue` (92 líneas) y `VentanaDeReapertura.vue`.
- `core.auditoria.accion` es `text` sin `check`: agregar `'cerrar'` a `AccionAuditada` **no necesita migración**.

## 2. Cómo junta Empresas las revisiones (N-4)

| Opción | Cómo | A favor | En contra |
|---|---|---|---|
| **A. Pregunta a todos** (nueva en el mediador) | `mediador.preguntarATodos(operador, nombre, datos)` llama a cada módulo activo que respondió con `responder(...)` y devuelve `{ modulo, respuesta }[]` | Empresas no conoce a nadie; un módulo nuevo (Cuentas por cobrar, Inventarios) solo se suscribe; tipado como las órdenes | Una pieza más en `core/mediador` (≈ 30 líneas y sus pruebas) |
| B. Una orden por módulo | `bancos.revisar_cierre`, `cuentas-por-pagar.revisar_cierre`… y Empresas las envía una a una | Sin tocar el mediador | Empresas (esencial) tendría que conocer la lista de módulos y capturar `ModuloNoDisponible`; cada módulo nuevo toca Empresas |
| C. Aviso con un «recolector» mutable en los datos | Cada oyente empuja en un arreglo que viaja en el aviso | Sin pieza nueva | Rompe el contrato «el aviso no tiene respuesta»; frágil y sin tipo de respuesta |

**Recomendado: A.** Reglas de la pregunta: corre **dentro** de la transacción de quien pregunta (como órdenes y
avisos); salta los módulos inactivos; el orden es el de registro; si un manejador lanza, el error se propaga y se
deshace todo (no se cierra con una revisión incompleta); no revisa permisos del módulo que responde (decisión vigente
del mediador). Contrato nuevo en `core/contratos/mediador.contratos.ts`: `interface PreguntasEntreModulos {}` y
`NombreDePregunta`, que cada módulo amplía con `declare module`.

### 2.1 Contrato (`core/contratos/empresas.contratos.ts`)

```ts
interface PreguntasEntreModulos {
  /** Antes de cerrar la carga: cada módulo con saldos iniciales dice qué encontró. El operador lleva empresaId. */
  'empresas.revisar_cierre_de_carga': {
    datos: { empresaId: string; fechaDeInicio: string };
    respuesta: RevisionDeCierreDeModulo;
  };
}
interface RevisionDeCierreDeModulo {
  nombreDelModulo: string;          // «Bancos»
  resumen: string | null;           // «4 cuentas con saldo inicial al 31/12/2026»
  ruta: string | null;              // pantalla donde se corrige: '/bancos/saldos-iniciales'
  hallazgos: HallazgoDeCierre[];
}
interface HallazgoDeCierre {
  codigo: string;                   // 'no_cuadra', propio del módulo
  nivel: 'pide_motivo' | 'aviso';
  mensaje: string;                  // texto final, ya armado por el módulo (Empresas no conoce sus reglas)
  registro: { id: string; nombre: string } | null;   // la cuenta, el proveedor…
}
```

- Los textos los arma cada módulo (montos con dos decimales y fechas `dd/mm/aaaa`): Empresas solo muestra y audita.
- Un módulo sin nada que decir responde `hallazgos: []` (y su resumen); no responder es no estar activo.
- No hay nivel «bloquea»: un módulo que deba impedir el cierre lanza su error (como en `fecha_de_inicio_por_cambiar`).
  Hoy nadie lo hace (C-7); queda para Contabilidad (cuenta puente).
- **Alcance por registro:** la revisión es de toda la empresa. Hoy ningún recurso con saldos iniciales tiene alcance;
  si algún día lo tiene, el módulo debe contar lo que el operador no ve (o reportarlo como aviso), nunca omitirlo.

### 2.2 Qué responde cada módulo

| Módulo | Hallazgos | Nivel |
|---|---|---|
| **Empresas** (propio, sin mediador) | `fecha_de_inicio_no_es_dia_1` (EM-1, C-2) | aviso |
| **Bancos** (BS-2 ya hace `RevisarCierreDeCargaEnBancos`; EM-2 solo lo conecta) | Los cinco de §5.6, uno por cuenta | `no_cuadra`, `sin_dato_de_libros`: pide motivo; el resto, aviso |
| **Cuentas por pagar** (nuevo, `RevisarCierreDeCargaEnCuentasPorPagar`, sobre el cuadre existente) | `sin_saldos_iniciales` (módulo activo y ningún documento con `origen = 'saldo_inicial'`); `retenciones_por_practicar` (hay documentos con `retenciones_por_practicar > 0`: total y cuántos) | aviso (los dos) |
| **Libro de compras** | No responde (no tiene saldos iniciales) | — |

Resumen de Cuentas por pagar: «N documentos de M proveedores; neto Q x», del cuadre. Bancos podría sumar
`sin_saldos_iniciales` cuando hay cuentas y ninguna tiene saldo inicial (pregunta P-3).

## 3. Servidor

### 3.1 Casos de uso de Empresas

- **`RevisarCierreDeCargaInicial`** (nuevo): en `EjecutorEnEmpresa`; exige carga con fecha (`FechaDeInicioRequerida`)
  y abierta (`CargaInicialCerrada`); arma el hallazgo propio, pregunta a los módulos y devuelve
  `RevisionDeCierreDto { carga, modulos: RevisionDeCierreDeModulo[], pideMotivo: boolean, huella: string }`.
  `huella` = sha256 del JSON canónico de los hallazgos (códigos, niveles, registro, mensaje).
- **`CerrarCargaInicial`** (se reescribe): recibe `{ empresaId, motivo?, huella? }`. Dentro de una sola transacción:
  `for update` de la carga → **vuelve a revisar** (la revisión de la pantalla puede ser vieja) → si `pideMotivo` y no
  hay motivo válido, `MotivoDeCierreRequerido` (422, `detalles` con la revisión) → si llegó `huella` y no coincide,
  `RevisionDeCierreDesactualizada` (422, `detalles` con la revisión nueva) → `carga.cerrar(...)` → **audita** → devuelve la
  carga. El dominio valida el motivo (`MotivoDeCierreInvalido` si pasa de 500 o es solo espacios); el motivo es
  **opcional** cuando no hay hallazgos que lo pidan, y si se escribe igual se audita.
- Concurrencia: el `for update` hace esperar a quien esté guardando saldos iniciales con `for share`; las revisiones
  corren después, así que lo auditado es exactamente lo que había al cerrar.

### 3.2 Auditoría

`auditoria.registrar({ recurso: 'empresas.cargas-iniciales', registroId: empresaId, accion: 'cerrar', anterior: {
carga, revision: { modulos, huella } }, motivo })` **en cada cierre**, con o sin hallazgos. Se agrega `'cerrar'` a
`AccionAuditada` con su TSDoc. El recurso es el mismo que usa reabrir (§16.1 decía `empresas.carga-inicial`: se corrige
a `empresas.cargas-iniciales` para que la historia de cierres y reaperturas de la empresa salga junta).

### 3.3 API

| Método y ruta | Permiso | Cuerpo / respuesta |
|---|---|---|
| `GET /empresas/:empresaId/carga-inicial/revision-de-cierre` | `empresas.carga-inicial.cerrar` | `RevisionDeCierreDto` |
| `POST /empresas/:empresaId/carga-inicial/cerrar` (cambia) | `empresas.carga-inicial.cerrar` | `{ motivo?: string, huella?: string }` (vacío sigue valiendo si no hay hallazgos que pidan motivo); `CargaInicialDto` |

La revisión pide el permiso de **cerrar** y no `empresas.ver`: trae nombres de cuentas y diferencias en dinero que un
usuario que solo ve empresas no debe leer (P-2). Sin permisos nuevos. Sin Excel: no es una lista (la revisión queda
en la auditoría y cada módulo exporta su cuadre).

### 3.4 Errores nuevos (`empresas/dominio/errores.ts`)

| Clase | Familia | Código |
|---|---|---|
| `MotivoDeCierreRequerido` | `ReglaDeNegocioInfringida` (422) | `motivo_de_cierre_requerido` |
| `MotivoDeCierreInvalido` | `DatoInvalido` (400) | `motivo_de_cierre_invalido` |
| `RevisionDeCierreDesactualizada` | `ReglaDeNegocioInfringida` (422; no hay familia de conflicto y `RecursoEnUso` no corresponde) | `revision_de_cierre_desactualizada` |

## 4. Base de datos

**Sin migración.** El motivo y la revisión van solo en `core.auditoria` (como la reapertura); `cerrada_en` y
`cerrada_por` siguen en `empresas.cargas_iniciales`. Alternativa descartada: `motivo_de_cierre text null` en
`cargas_iniciales` (duplica la auditoría y se perdería al reabrir). Datos existentes: las cargas ya cerradas quedan
como están, sin entrada de cierre en la auditoría (no se inventa una).

## 5. Cliente

- `servicios/datos-de-empresa.api.ts`: `revisionDeCierre(id)` y `cerrarCargaInicial(id, { motivo, huella })`.
- `composables/revision-de-cierre.ts` (lógica pura, con `*.prueba.ts`): agrupar por módulo, contar «pide motivo» y
  avisos, decidir si el motivo es obligatorio, validar 1–500.
- `componentes/VentanaDeCierreDeCarga.vue` (reemplaza el `confirmar` de `usar-cierre-de-carga.ts`): el texto actual
  del cierre y el recordatorio del cuadre; un bloque por módulo con su resumen y enlace «Revisar en <módulo>» (si el
  usuario tiene el permiso de esa pantalla); hallazgos que piden motivo en rojo, avisos en ámbar; «Sin observaciones»
  si no hay nada; campo **Motivo** obligatorio solo si algún hallazgo lo pide (contador 0/500), opcional si no.
  Botón peligroso «Cerrar carga inicial». Ante `revision_de_cierre_desactualizada`, recarga la revisión y avisa «Los saldos cambiaron mientras
  revisaba; vuelva a revisar»; ante `motivo_de_cierre_requerido` o `motivo_de_cierre_invalido`, reparte el error al campo Motivo (`usarFormulario`).
- `usar-cierre-de-carga.ts` abre la ventana y trae la revisión con `usarCarga` al abrirla.

## 6. Pasos (un commit cada uno)

| Paso | Qué | Pruebas | Depende de |
|---|---|---|---|
| **EM-2.1** (servidor, core) | `preguntarATodos`/`responder` en el mediador, `PreguntasEntreModulos`, `retirarManejadoresDe` también para preguntas | Varios responden y se juntan en orden; módulo inactivo se salta; nadie responde → `[]`; uno lanza → se propaga; retirar quita la respuesta | — |
| **EM-2.2** (servidor, Empresas) | Contrato `empresas.revisar_cierre_de_carga`, `RevisarCierreDeCargaInicial`, `CerrarCargaInicial` con motivo, huella y auditoría, `'cerrar'` en `AccionAuditada`, ruta `GET …/revision-de-cierre`, cuerpo del `POST …/cerrar`, errores | Sin fecha; ya cerrada; sin hallazgos (cierra sin motivo, audita con motivo nulo); con «pide motivo» sin motivo (422 con detalles) y con motivo (audita motivo y revisión); motivo de 501 o solo espacios (400); huella vieja (422 `revision_de_cierre_desactualizada`); aviso de día 1; empresa no activa del operador; permisos 403 (con `empresas.ver` solo no ve la revisión); con un doble que responde y otro que lanza (no cierra) | EM-2.1 |
| **EM-2.3** (servidor, Bancos) | Responder la pregunta con `RevisarCierreDeCargaEnBancos` (adaptador a `HallazgoDeCierre` con los textos) | Integración: cuenta que no cuadra y sin dato de libros piden motivo; sin evidencia, global y sobregiro avisan; cuenta sin saldo inicial no aparece; Bancos inactivo no responde | EM-2.2 y BS-2 |
| **EM-2.4** (servidor, Cuentas por pagar) | `RevisarCierreDeCargaEnCuentasPorPagar` y su respuesta | Sin saldos iniciales (aviso); con retenciones por practicar (aviso con total); con saldos y sin retenciones (sin hallazgos, con resumen) | EM-2.2 |
| **EM-2.5** (cliente) | API, lógica pura, `VentanaDeCierreDeCarga`, composable | `revision-de-cierre.prueba.ts` (motivo obligatorio u opcional, conteos, 0/500); prueba del composable ante los dos códigos | EM-2.2 (EM-2.3 y 2.4 no hacen falta: la ventana muestra lo que llegue) |
| **EM-2.6** (QA, navegador) | Cerrar sin hallazgos, con avisos, con un `no_cuadra` (exige motivo), saldos que cambian en otra pestaña (vuelve a revisar); ver la entrada en la auditoría; reabrir y volver a cerrar | — | EM-2.3 a EM-2.5 |

EM-2.3 y EM-2.4 son independientes entre sí; EM-2.5 puede ir en paralelo con ellos.

## 7. Preguntas para el usuario

- **P-1. Cómo se juntan las revisiones (N-4).** (A) pregunta a todos en el mediador (**recomendado**: Empresas no
  conoce a los demás módulos y un módulo nuevo solo se suscribe); (B) una orden por módulo; (C) aviso con recolector.
- **P-2. Quién ve la revisión.** (a) Solo quien puede **cerrar** la carga (**recomendado**: trae diferencias en dinero
  de Bancos sin pasar por el permiso de Bancos); (b) también quien ve empresas.
- **P-3. ¿Avisar cuando un módulo activo no tiene ningún saldo inicial?** (a) Sí, aviso sin motivo en Cuentas por
  pagar y en Bancos (**recomendado**: el olvido más común es cerrar sin haber cargado un módulo); (b) no.
- **P-4. Huella de la revisión.** (a) Si los hallazgos cambiaron entre la ventana y el cierre, se rechaza y se vuelve a
  revisar (**recomendado**: lo auditado es lo que la persona vio y justificó); (b) cerrar con la revisión nueva sin
  avisar (el motivo podría justificar otra cosa).
- **P-5. Motivo cuando nada lo pide.** (a) Opcional y se audita si se escribe (**recomendado**); (b) no se ofrece;
  (c) siempre obligatorio.

## 8. Para el contador (`contador-guatemala`)

- Confirmar que en Cuentas por pagar bastan **avisos** (sin saldos iniciales; retenciones por practicar pendientes) y
  que **no** debe pedirse motivo mientras no exista con qué comparar. O, si conviene, que se transcriba el **saldo de
  proveedores del balance de apertura** (como `saldo_segun_libros_anteriores` de Bancos) para tener un `no_cuadra`
  que pida motivo: sería un cambio de U8 con migración, fuera de EM-2.
- Confirmar que una fecha de inicio que no es día 1 solo **avisa** también al cerrar (C-2).
- Confirmar que cerrar con diferencias, con motivo y auditoría, es suficiente control antes de que exista
  Contabilidad (C-7) y que la entrada de auditoría (carga, hallazgos con su texto y motivo, quién y cuándo) sirve como
  respaldo ante una revisión.

## Respuestas del usuario (2026-11-18)

- **P-1:** A, una «pregunta a todos» en el mediador; cada módulo activo responde y Empresas no los conoce.
- **P-2:** (a), solo quien tiene el permiso de cerrar la carga ve la revisión.
- **P-3:** sí, se avisa (sin pedir motivo) cuando un módulo activo no tiene ningún saldo inicial.
- **P-4:** si los hallazgos cambian entre abrir la ventana y confirmar, se rechaza y se vuelve a revisar.
- **P-5:** (a), sin hallazgos que lo exijan el motivo es opcional y se audita si se escribe.
- Lo marcado para el contador se consultó el 2026-11-18 (dictamen aparte).
