# Diseño: proveedor nuevo desde «DTE de la SAT» (error 1 del QA del 2026-11-01) y errores medios 2 a 5

Estado: **propuesta**, pendiente de las preguntas del final. Corrige el error 1 (alto) de
`docs/modulos/informe-qa-2026-11-01.md` y propone los medios 2 a 5. Completa el bloque «Proveedor nuevo» de
`diseno-datos-libro-de-compras.md` §3.3b.8 y la decisión **L4-k** (§3.3b.15); donde choquen, manda este documento.

## 0. Qué pasa hoy

- `VistaPreviaDeDteRecibidos` (`servidor/src/modulos/libro-de-compras/aplicacion/casos-uso/bandeja/vista-previa-de-dte-recibidos.ts`)
  lanza `DteSinProveedor` (`dte_sin_proveedor`) si la fila no tiene `proveedorId`; el cliente la cuenta como error
  (`separarVistaPrevia`) y `usarConfirmacionDeFilas` solo manda las `listas`: el DTE nunca se confirma.
- `ConfirmadorDeFila.crearProveedor` sí crea el proveedor (orden `terceros.crear_proveedor_desde_dte`), pero **adivina**
  el tipo con `tipoDePersonaDelNombre` y pone el nombre entero en `nombres` (individual) o `razon_social` (jurídica),
  sin que el usuario lo vea. Además, el formulario de Terceros limita `nombres` y `apellidos` a 80 y `razonSocial` a 150;
  hoy un nombre largo deja un proveedor que no se puede volver a guardar sin recortarlo.
- Los datos fiscales deducidos del código (FPEQ → pequeño contribuyente, etc.) ya los guarda `RegistrarDocumento`
  (`datosDelProveedorPorGuardar`), y FACT/FCAM sin datos ya pide régimen de ISR y agente de IVA (opción C, «Falta saber
  del proveedor»). Eso **no cambia**.

## 1. Decisión: dentro de confirmar (no ruta aparte)

**Recomendación: seguir creando el proveedor dentro de `POST …/dte-recibidos/confirmar`** y no programar
`POST …/dte-recibidos/proveedores`.

- Ya está programado y probado (creación, reutilizar el NIT, papel a un cliente existente, inactivo, permiso, asignar a
  las pendientes del NIT); solo falta que el usuario confirme tipo y nombre, que es un dato más del cuerpo.
- Un solo clic («Registrar N facturas») en vez de dos acciones con estados intermedios (proveedores creados sin
  factura si el usuario cierra la ventana a la mitad).
- La vista previa puede revisar lo mismo que hará confirmar con un **ensayo** (crear y deshacer, como `core/intercambio`),
  sin tocar el cálculo de documentos.
- Lo que se pierde (crear proveedores sin confirmar facturas) ya lo cubre Proveedores → «Nuevo»; la fila lo toma sola.

## 2. Contrato del servidor

### 2.1 Cuerpo de vista previa y confirmar (mismo esquema)

En `http/dte-recibidos.esquemas-http.ts`:

```ts
/** Lo que el usuario confirmó del proveedor nuevo de un NIT (L4-k); mismos límites que el formulario de Terceros. */
const esquemaProveedorNuevo = z.discriminatedUnion('tipoDePersona', [
  z.strictObject({ tipoDePersona: z.literal('individual'), nombres: textoObligatorio(80), apellidos: textoOpcional(80) }),
  z.strictObject({ tipoDePersona: z.literal('juridica'), razonSocial: textoObligatorio(150) }),
]);

export const esquemaConfirmarDteRecibidos = z.object({
  ids: idsHasta(MAXIMO_DE_FILAS_A_CONFIRMAR),
  datosFiscalesPorProveedor: esquemaDatosFiscalesPorProveedor,
  /** Clave: el NIT del emisor tal como viene en la fila (`nitEmisor`). */
  proveedoresNuevos: z
    .record(z.string().max(40), esquemaProveedorNuevo)
    .refine((r) => Object.keys(r).length <= MAXIMO_DE_FILAS_A_CONFIRMAR, 'Demasiados proveedores nuevos.')
    .default({}),
});
```

`textoObligatorio`/`textoOpcional` son los de `core/compartido/http/esquemas-comunes.ts`. Tipo de aplicación:
`ProveedoresNuevosPorNit = Readonly<Record<string, ProveedorNuevoPedido>>` en `decisiones-del-dte.ts` (junto a
`DatosFiscalesPorProveedor`). El controlador pasa `puedeCrearProveedores` (`proveedores.crear`) **también** a la vista
previa.

### 2.2 Respuesta de la vista previa

La fila sin proveedor ya no es error. Se agrega un campo opcional a la fila con documento:

```ts
type ResultadoDeVistaPrevia =
  | { id; documento; avisos; proveedorNuevo?: ProveedorNuevoDeLaFila }
  | { id; error: { codigo; mensaje; detalles? } };

interface ProveedorNuevoDeLaFila {
  nit: string;               // nitEmisor de la fila
  nombreDelDte: string;      // nombreEmisor tal cual
  /** `crear`: no hay tercero con ese NIT. `agregar_papel`: hay un tercero (p. ej. cliente) y solo se le da el papel. */
  accion: 'crear' | 'agregar_papel';
  /** El nombre del tercero que ya existe (solo con `agregar_papel`). */
  nombreExistente: string | null;
  /** Lo que se usó en el ensayo: lo pedido para ese NIT o, si no vino, la propuesta en su tipo propuesto. */
  usado: ProveedorNuevoPedido;
  /** Las dos formas propuestas, para cambiar el tipo en la ventana sin partir el nombre en el cliente. */
  propuesta: {
    tipoDePersona: 'individual' | 'juridica';
    individual: { nombres: string; apellidos: string | null };
    juridica: { razonSocial: string };
  };
}
```

La respuesta de confirmar no cambia.

### 2.3 Reglas

Nueva clase `ProveedorDeLaFila` (`aplicacion/casos-uso/bandeja/proveedor-de-la-fila.ts`), usada por la vista previa y
por `ConfirmadorDeFila` (sale de él el `crearProveedor` de hoy):

```ts
resolver(operador, fila, { decisiones, proveedoresNuevos, puedeCrearProveedores, exigirConfirmado })
  : Promise<{ proveedorId: string; nuevo: ProveedorNuevoDeLaFila | null }>
```

1. Con `decisiones.proveedorId` → lo devuelve (`nuevo: null`).
2. Sin `puedeCrearProveedores` → `ProveedorNuevoSinPermiso` (antes de llamar al mediador; Terceros sigue revisándolo).
3. `pedido = proveedoresNuevos[nitEmisor]`. Sin él: en confirmar (`exigirConfirmado: true`) →
   `ProveedorNuevoSinConfirmar`; en la vista previa se usa `propuestaDeProveedorNuevo(nombreEmisor)` en su tipo.
4. Orden `terceros.crear_proveedor_desde_dte` con `{ nit, tipoDePersona, nombres, apellidos, razonSocial,
   puedeCrearProveedores }`; luego `filas.asignarProveedorALasPendientes(nit, proveedorId)` (como hoy).

**Vista previa con ensayo:** `deUna` corre en **una** unidad de trabajo: armar, `ProveedorDeLaFila.resolver`
(`exigirConfirmado: false`), `previsualizar.ejecutar` (se une a la transacción) y al final lanza siempre una
`VistaPreviaTerminada(resultado)` privada para deshacer (mismo patrón que `EnsayoTerminado` de
`core/intercambio/aplicacion/intercambio-de-recurso.ts`). Así la vista previa revisa NIT, nombre, tercero o proveedor
inactivo y unicidad con las mismas reglas que confirmar, y sabe `accion` (respuesta `creado`). `exigirLoQueNecesitaElCalculo`
ya no revisa el proveedor; `DteSinProveedor` se borra (queda sin uso).

**Orden del mediador** (`core/contratos/terceros.contratos.ts`, `terceros/.../crear-proveedor-desde-dte.ts`,
`libro-de-compras/infraestructura/vecinos-en-mediador.ts`, puerto `PedidoDeProveedorNuevo`):
- `datos: { nit; tipoDePersona; nombres: string | null; apellidos: string | null; razonSocial: string | null;
  puedeCrearProveedores }` (sale `nombre`). `identidadDe` pasa esos campos a `IdentidadDeTercero.crear` tal cual.
- `respuesta: { proveedorId; terceroId; creado; nombre }` (`nombre` = `nombreParaMostrar` del tercero, nuevo o existente).
- Si el NIT ya es de un tercero, se ignora la identidad pedida (como hoy).

**Propuesta** (dominio, función pura con pruebas, `libro-de-compras/dominio/propuesta-de-proveedor-nuevo.ts`, junto a
`tipo-de-persona-del-nombre.ts`): `propuestaDeProveedorNuevo(nombreDelDte)` → `{ tipoDePersona, individual, juridica }`.
- `tipoDePersona` = `tipoDePersonaDelNombre` (sin cambio).
- `juridica.razonSocial` = el nombre del DTE sin espacios repetidos.
- `individual` = `partirNombreDePersona(nombre)`, regla **sacada del archivo real** de la SAT (`consulta.xls` del
  usuario, 2026-11-01, 17 DTE; ver §2.3a):
  1. **Formato del RTU** (4 comas: `APELLIDO1,APELLIDO2,APELLIDO_DE_CASADA,NOMBRE1,NOMBRE2`, con campos vacíos): los tres
     primeros no vacíos son apellidos (el de casada con «DE» delante) y los dos últimos, nombres.
     `PARADA,ALVIZURES,,ANDERSON,MAGDIEL` → `ANDERSON MAGDIEL` / `PARADA ALVIZURES`.
  2. **Una coma: `NOMBRES , APELLIDOS`** (así lo escribe la SAT en su FPEQ y G4S Documenta; espacios alrededor de la
     coma opcionales). `RONALD ABEL , PENSAMIENTO MONTES` → `RONALD ABEL` / `PENSAMIENTO MONTES`. **No** es
     «APELLIDOS, NOMBRES», como suponía la versión provisional.
  3. Sin coma, por palabras, pegando las partículas (`DE`, `DEL`, `LA`, `LAS`, `LOS`, `Y`, `VDA.`) a la palabra que
     sigue: 1 palabra → solo nombres; 2 → 1 + 1; 3 → 1 nombre + 2 apellidos; 4 o más → 2 nombres + el resto apellidos.
     `ANDERSON MAGDIEL PARADA ALVIZURES` → `ANDERSON MAGDIEL` / `PARADA ALVIZURES`; `ANA DE LEON` → `ANA` / `DE LEON`.
  4. Se conserva la escritura del DTE (mayúsculas, P2 respondida: tal cual); se quitan espacios repetidos; no se
     recorta: si pasa de 80/150, la ventana pide acortarlo.

#### 2.3a Lo que mostró el archivo real

- Encabezados: los 33 del mapa actual, sin columnas desconocidas; el lector y `leerDteDeLaSat` leen las 17 filas sin
  rechazos ni avisos (fechas con y sin zona y milisegundos, IVA con 6–8 decimales, total `220.000007`, un `RDON`, una
  `NCRE` en positivo y un anulado con su fecha).
- **El nombre del emisor individual a veces es su nombre comercial**, no el de la persona (`SOY FETICHE`, NIT
  4960742; posiblemente `FARMACIA CRUZ VERDE TIQUISATE 2`). Ninguna regla lo arregla: la tarjeta de la ventana debe
  decir, cuando el tipo es individual y el nombre no tiene coma, «Revise que sea el nombre de la persona (como está en
  el RTU) y no el de su negocio».
- `tipoDePersonaDelNombre` no reconoce `FOUNDATION` (inglés): agregar `FOUNDATION`, `INC`, `CORP`, `LLC` y `LTD`.
  `, S.A` sin punto final ya se reconoce.
- El nombre del receptor (la empresa) viene en cinco formas distintas según el certificador para la misma persona,
  incluida `PARADA ALVIZURES  ANDERSON MAGDIEL` (apellidos primero, doble espacio). No se usa al crear proveedores; se
  anota por si un emisor llega así (la regla 3 lo partiría mal; la ventana deja corregirlo).

### 2.4 Errores (nuevos y los que llegan por fila)

| Código | Clase (archivo) | Familia | Cuándo | Mensaje |
|---|---|---|---|---|
| `proveedor_nuevo_sin_permiso` | `ProveedorNuevoSinPermiso` (`libro-de-compras/aplicacion/errores.ts`, extiende `AccesoDenegado`) | 403 | fila sin proveedor y sin `proveedores.crear`; `detalles: { nit }` | «El proveedor de este DTE (NIT x) aún no existe y usted no puede crear proveedores. Pida que lo creen en Proveedores; la fila lo tomará sola.» |
| `proveedor_nuevo_sin_confirmar` | `ProveedorNuevoSinConfirmar` (`dominio/errores-de-bandeja.ts`, `ReglaDeNegocioInfringida`) | 422 | confirmar sin `proveedoresNuevos[nit]`; `detalles: { nit, campo: 'proveedoresNuevos' }` | «Confirme el tipo de persona y el nombre del proveedor nuevo (NIT x) antes de registrar.» |
| `falta_el_nombre`, `nit_invalido`, `nit_de_proveedor_sin_numero`, `proveedor_inactivo`, `tercero_inactivo` | de Terceros, sin cambio | 400/422 | por fila, en la vista previa y al confirmar | los suyos |

Todos van **por fila** (no frenan las demás), en `{ resultados }` con 200, como hoy.

### 2.5 Varios NIT, varias filas del mismo NIT, tandas de 100

- La vista previa hace un ensayo por fila: cada fila del mismo NIT «crea» y deshace por su cuenta, con el mismo
  `proveedoresNuevos[nit]`, así que todas dan lo mismo. Grupos en paralelo del cliente con el mismo NIT solo esperan
  el índice único del NIT hasta el `rollback` (sin bloqueo mutuo: un solo `insert`).
- Al confirmar (orden de emisión, facturas antes que notas), la primera fila del NIT crea y asigna el proveedor a todas
  las pendientes del NIT; las siguientes ya lo traen en el borrador y `proveedoresNuevos[nit]` se ignora.
- El cliente manda el mismo `proveedoresNuevos` (todos los NIT de lo marcado) en cada tanda de 100; en la segunda tanda
  los NIT ya creados se ignoran. El tope de 100 claves basta porque cada tanda tiene a lo sumo 100 filas; si lo
  marcado trae más de 100 NIT distintos, el cliente manda en cada tanda solo los NIT de sus filas.
- Como hoy, el proveedor creado **queda** aunque el registro de su fila falle (otra transacción); la fila lo toma y el
  usuario la confirma de nuevo.
- Una nota (`NCRE`/`NDEB`) de un proveedor nuevo sigue pidiendo su factura (`dte_nota_sin_factura`): se completa
  después de confirmar la factura de ese proveedor.
- Si las filas de un NIT traen códigos de régimen distintos (FACT y FPEQ), manda la primera registrada; la siguiente
  puede dar `tipo_no_corresponde_al_proveedor` (camino de siempre).

### 2.6 Auditoría y seguridad

- Alta de proveedor: **no se audita** (regla de CLAUDE.md: solo bajas, inactivar, reactivar, anular); `creado_por`
  queda con el usuario de la transacción. El ensayo no deja nada.
- Mismas rutas, permisos (`documentos.crear`) y límite (`limitarConfirmaciones`). El permiso de crear proveedores se
  revisa en el caso de uso (dos veces: Libro de compras y Terceros).

## 3. Cliente: la ventana

**Dónde:** dentro de «Confirmar los DTE marcados» (`VentanaDeConfirmarDte.vue`), como sección «Proveedores nuevos»
**arriba** de la lista de filas, en lugar del aviso amarillo «Se crearán N proveedores nuevos…». No hay ventana previa
(dos modales apilados son malos en celular y el cálculo no depende del nombre ni del tipo de persona).

**Una tarjeta por NIT** (`TarjetaDeProveedorNuevo.vue`, `<fieldset>` con `<legend>` «Proveedor nuevo · NIT x»):
- Línea gris: «En el DTE: «nombre del DTE» · N facturas».
- `accion = 'agregar_papel'`: sin campos, «Ya está en Terceros como «nombreExistente»: se le agregará el papel de
  proveedor».
- `accion = 'crear'`: «Tipo de persona» con dos botones de opción (Individual / Empresa (jurídica)), preseleccionado
  el propuesto; Individual → «Nombres»* y «Apellidos»; Empresa → «Razón social»*. Ayuda: «Lo propuso Arrancar con el
  nombre del DTE: revíselo; se guarda así en Proveedores.»
- Cambiar de tipo **no parte ni junta** nada en el cliente: cada tipo guarda su edición, iniciada con
  `propuesta.individual` / `propuesta.juridica`; al volver, se ve lo que el usuario había escrito.
- Las filas listas de un proveedor nuevo llevan la marca «Proveedor nuevo» (ícono `UserPlus`) en `FilasDeLaVistaPrevia`.

**Botón «Registrar N facturas»:** N = `listas` (ya incluye las de proveedor nuevo). Si a una tarjeta le falta un dato o
pasa el largo, al pulsar no se envía: se marca el campo (`aria-invalid`, mensaje con `aria-describedby`) y se lleva el
foco al primero. Cambiar tipo o nombre **no** obliga a «Volver a calcular».

**Sin `proveedores.crear`:** el servidor responde `proveedor_nuevo_sin_permiso` en esas filas; salen en rojo con el
mensaje (no hay sección «Proveedores nuevos») y `COMO_CORREGIR` no agrega nada (el mensaje ya dice la salida). El filtro
de la bandeja dice «Proveedor nuevo (se crea al confirmar)» solo si `sesion.puede('proveedores.crear')`; si no,
«Proveedor nuevo (falta crearlo en Proveedores)». `COMO_CORREGIR` suma `proveedor_inactivo` y `tercero_inactivo`:
«Reactívelo en Proveedores y vuelva a calcular.»

**Celular (380 px):** tarjetas a lo ancho, campos uno bajo otro, opciones de tipo como botones de 44 px de alto,
NIT y nombre del DTE con `break-words`; el cuerpo de la ventana se desplaza y el pie queda fijo. Modo oscuro con la
paleta fija (`campo`, `tierra`, `trigo`).

**Piezas y archivos:**
- `composables/bandeja/datos-de-proveedores-nuevos.ts` (lógica pura) y su `.prueba.ts`:
  `proveedoresNuevosDeLaVistaPrevia(resultados, filas)` (agrupa por NIT, cuenta filas, toma la propuesta de la fila de
  emisión más reciente), `edicionInicial(grupos, actual)` (agrega los NIT nuevos sin pisar lo editado),
  `problemasDelProveedorNuevo(edicion)` (por campo: obligatorio y 80/80/150), `hayProblemas(...)`,
  `proveedoresNuevosParaEnviar(edicion, nits?)` (el `Record` por NIT del tipo elegido, con `usado` para `agregar_papel`).
- `composables/bandeja/usar-proveedores-nuevos.ts`: la edición (`ref` por NIT) que se rehace con cada vista previa;
  lo usa `usarVistaPreviaDeFilas` (manda `proveedoresNuevos` también al recalcular) y lo expone a la ventana.
- `usarConfirmacionDeFilas.confirmar`: si `hayProblemas`, no envía y pide el foco; `confirmarEnGrupos` manda
  `proveedoresNuevos` en cada tanda.
- `componentes/bandeja/ProveedoresNuevosDelDte.vue` (la sección, lista de tarjetas) y `TarjetaDeProveedorNuevo.vue`
  (`defineModel` con la edición del NIT; emite nada más). Solo `import type` de servicios.
- `servicios/dte-recibidos.api.ts`: tipos `ProveedorNuevoPedido`, `ProveedorNuevoDeLaFila`, `proveedoresNuevos` en la
  petición. `resumenDeLaSeleccion.proveedoresNuevos` se queda solo para el filtro y el contador de la bandeja.

## 4. Pasos (un commit cada uno; `npm run revisar`; bitácora de `PLAN.md`)

Antes: traer a `main` el commit del QA `7c8283b` (rama `worktree-agent-a126dba4a3b543436`: informe y pruebas).

**PN-1 (servidor) — orden del mediador.** Contrato nuevo de `terceros.crear_proveedor_desde_dte` (nombres, apellidos,
razón social; `nombre` en la respuesta), `CrearProveedorDesdeDte.identidadDe`, `PedidoDeProveedorNuevo`,
`vecinos-en-mediador.ts`. Pruebas: individual con nombres y apellidos; jurídica con razón social; individual sin
nombres → `falta_el_nombre`; tercero existente devuelve su `nombre` y `creado: false`.

**PN-2 (servidor) — propuesta.** `propuesta-de-proveedor-nuevo.ts` y `partirNombreDePersona` con sus pruebas (los
ejemplos de §2.3, partículas, espacios repetidos, coma).

**PN-3 (servidor) — confirmar con lo confirmado.** Esquema `proveedoresNuevos`; `ProveedorDeLaFila`;
`ConfirmadorDeFila` lo usa con `exigirConfirmado: true` (fuera `tipoDePersonaDelNombre` de ahí); errores
`ProveedorNuevoSinPermiso` y `ProveedorNuevoSinConfirmar`. Pruebas en `casos-uso-de-la-bandeja.prueba.ts`: crea con lo
pedido (individual partido, jurídica); sin `proveedoresNuevos[nit]` → `proveedor_nuevo_sin_confirmar` y no crea nada;
sin permiso → `proveedor_nuevo_sin_permiso`; dos filas del mismo NIT crean un solo proveedor; tercero cliente recibe el
papel; esquema rechaza nombres de 81 y razón social de 151.

**PN-4 (servidor) — vista previa con ensayo.** `deUna` en una transacción que siempre se deshace; `proveedorNuevo` en la
fila; controlador pasa `puedeCrearProveedores`; borrar `DteSinProveedor`. Pruebas: fila sin proveedor sale con
documento y `proveedorNuevo` (`accion: 'crear'`, `usado` = propuesta); con `proveedoresNuevos` usa lo pedido; después de
la vista previa **no** existe el tercero ni cambió la fila; tercero cliente → `agregar_papel`; proveedor inactivo →
`proveedor_inactivo`; sin permiso → `proveedor_nuevo_sin_permiso`. Prueba de API en
`servidor/src/pruebas-api/` (vista previa + confirmar de punta a punta con un NIT nuevo, 200 y documento registrado).

**PN-5 (cliente) — lógica y composables.** `datos-de-proveedores-nuevos.ts` con pruebas; `usar-proveedores-nuevos.ts`;
cambios en `usarVistaPreviaDeFilas`, `usarConfirmacionDeFilas`, `dte-recibidos.api.ts` y `COMO_CORREGIR`.
**Quitar el `it.fails`:** borrar `datos-de-la-confirmacion-qa.prueba.ts` (su entrada `dte_sin_proveedor` ya no existe) y
poner en `datos-de-la-confirmacion.prueba.ts` un `it` normal: una fila con `documento` y `proveedorNuevo` queda en
`listas` y aparece en `proveedoresNuevosDeLaVistaPrevia`; una con `proveedor_nuevo_sin_permiso` queda en `conError`.

**PN-6 (cliente) — ventana.** `ProveedoresNuevosDelDte.vue`, `TarjetaDeProveedorNuevo.vue`, marca en
`FilasDeLaVistaPrevia.vue`, texto del filtro según el permiso; `VentanaDeConfirmarDte.vue` sin el aviso amarillo.

**PN-7 (QA, `pruebas-qa`).** Repetir el paso del error 1 en el navegador (escritorio y 380 px, claro y oscuro): NIT
nuevo individual y jurídico, cambiar tipo ida y vuelta, nombre vacío, 3 filas del mismo NIT, 120 filas (dos tandas),
usuario sin `proveedores.crear`, tercero que ya es cliente. Actualizar `diseno-datos-libro-de-compras.md` §3.3b.8
(bloque «Proveedor nuevo» → «ver `diseno-proveedor-nuevo-desde-dte.md`»).

## 5. Errores medios 2 a 5 (propuesta breve)

**2. Autorizar algo ya autorizado.** En `cuentas-por-pagar/dominio/ciclo-de-vida.ts`, `exigirRegistrado` elige el error
por estado: `autorizado` → nuevo `DocumentoYaAutorizado` (`documento_ya_autorizado`, 422, «El documento B-105 ya está
autorizado.»); `anulado` → `DocumentoYaAnulado` (ya existe); `pendiente` → `DocumentoNoRegistrado` (como hoy). El lote
sigue **todo o nada** (el resumen «aprueban a pagar Q…» debe cuadrar); el cliente, al recibir
`documento_ya_autorizado`, avisa y recarga la lista. Quitar el `it.fails` de
`servidor/src/pruebas-api/cuentas-por-pagar-qa-hallazgos.api.prueba.ts` y sumar el caso de anulado.

**3. Proveedores de «Documentos por pagar» sin depender de Terceros.** Ruta nueva
`GET /api/cuentas-por-pagar/proveedores` con `cuentas-por-pagar.documentos.ver`, que responde `[{ id, nombre, activo }]`
de los proveedores **con algún documento por pagar en la empresa** (lo que sirve al filtro y no expone toda la cartera).
Consulta Drizzle en `cuentas-por-pagar/infraestructura` leyendo `proveedores` y `terceros` (ya lo hace
`consultas-de-saldos.drizzle.ts`), dentro de la unidad de trabajo (RLS). Cliente: `apiCuentasPorPagar.listarProveedores`
usa la ruta nueva; si falla, la pantalla avisa con `usarAvisos().error` (no solo la consola). Prueba de API: usuario con
solo permisos de Cuentas por pagar → 200; sin `documentos.ver` → 403.

**4. Fechas futuras en constancias y enteros. Recomendación: rechazar.** Una constancia no se emite ni un entero se paga
en el futuro, y el entero futuro deja el mes «enterado» sin serlo. Dominio: `constanciaValida(constancia, fechaDeLaRetencion,
hoy)` → `ConstanciaConFechaFutura` (`constancia_con_fecha_futura`, 400, campo `fecha`); `enteroValido(peticion, hoy)` →
`FechaDePagoFutura` (`fecha_de_pago_futura`, 400, campo `fechaDePago`); `hoy` del `Reloj` (zona de Guatemala) en
`anotar-constancia`, `anotar-constancias-en-lote` y `registrar-entero`. Cliente: `max` en los campos de fecha.
**Validar con `contador-guatemala`:** que no haya un caso legítimo de fecha posterior a hoy (p. ej. constancia
preimpresa o pago programado en banca en línea que el usuario anote antes).

**5. Entero mayor a lo retenido. Recomendación: avisar, no rechazar.** Varios pagos, rectificaciones o un pago que
incluye multa o intereses pueden pasar lo retenido. `RegistrarEntero` responde `avisos` (como el registro de documentos):
«Lo pagado en este grupo (Q537.14) pasa lo retenido (Q218.57) por Q318.57. Si incluye multa o intereses, anótelo en las
observaciones.» El cliente, antes de enviar, pide `confirmar` si el monto más lo ya pagado pasa lo retenido (los datos
ya están en pantalla) y muestra el aviso de la respuesta. **Validar con `contador-guatemala`:** si multa e intereses
van en la misma boleta o formulario del entero, y si conviene un campo aparte para ellos en vez de la nota.

## 6. Preguntas para el usuario

**P1. Partir el nombre de una persona individual — respondida (2026-11-01):** el usuario entregó el archivo real;
la regla de §2.3 sale de él (formato del RTU, `NOMBRES , APELLIDOS` con coma, y por palabras sin coma).

**P2. Escritura del nombre — respondida (2026-11-01):** tal cual el DTE (mayúsculas).


## 7. Validación del contador (errores 4 y 5, 2026-11-01)

**Error 4 — de acuerdo, rechazar fechas futuras** (fecha de hoy en hora de Guatemala, `Reloj`):

- Constancia: nunca es legítimamente futura (se emite al retener, en RetenIVA o Retenciones Web; Decreto 10-2012 art.
  48; Decreto 20-2006 y AG 425-2006 art. 10).
- Entero: un pago «programado» en banca no es un pago; contarlo como enterado oculta intereses (Código Tributario art.
  59), multa (art. 91: 100 %, 50 % antes del requerimiento) y mora (art. 92). Si se quisiera registrar pagos agendados,
  haría falta otro estado («programado») que no cuente como enterado.
- Ajuste: **avisar** (sin rechazar) si la fecha de pago es anterior al fin del mes de las retenciones.

**Error 5 — avisar sin rechazar, pero con campos aparte para los accesorios:**

- Un entero tardío se paga en la misma declaración y boleta (SAT-1331 para ISR; boleta SAT-2000 por el total con
  multa, intereses y mora), así que pagado > retenido es normal en ese caso.
- Guardar `impuesto` (lo que se aplica contra lo retenido), `multa`, `intereses` y `mora` (`numeric(14,2)`, ≥ 0, 0 por
  omisión) y el total como suma. El estado «enterado» y el aviso de exceso comparan **solo el impuesto**. Los accesorios
  son gasto y, en general, no deducibles para ISR (Decreto 10-2012 art. 21 num. 15). El sistema no los
  calcula: se copian de la boleta. El cambio de tabla lo planifica `arquitecto-de-datos`.
- Correcciones: las retenciones de ISR se declaran en el **SAT-1331** (no SAT-1311); el SAT-2046 es el IVA del pequeño
  contribuyente.

**Dudas resueltas** (`dictamen-pendientes-libro-de-compras-2026-11-08.md`): las retenciones de IVA se declaran en el
SAT-2340 (Retenciones Web IVA; RetenIVA terminó en 2021) y se pagan con la boleta SAT-2000; en el pago tardío de
retenciones van multa (art. 91) e intereses, sin mora (art. 90); la no deducibilidad es del art. 21 num. 15. Fuentes de Declaraguate secundarias (el portal de
la SAT respondió 403): Vesco (SAT-1331), Código Tributario en Wikisource.

**Respuestas del usuario (2026-11-01):** rechazar fechas futuras (sin estado «programado»), con aviso si el pago es
anterior al fin del mes; **tres campos** de accesorios (`multa`, `intereses`, `mora`) además del `impuesto`; el estado y
el aviso de exceso comparan solo el impuesto.

## 8. Plan de datos de los errores 4 y 5

Estado: **propuesta** del `arquitecto-de-datos` (2026-11-01) sobre lo decidido en §7. Nada en producción; la base de
desarrollo tiene **0 filas** en `libro_de_compras.enteros_de_retenciones` y **0 constancias con fecha futura** (leído el
2026-11-01), así que la migración no tiene datos que convertir; igual se escribe para que funcione con filas.

### 8.1 Qué lee hoy el monto del entero (y qué no)

| Dónde | Uso del `monto` | Cambia |
|---|---|---|
| `dominio/retenciones/retencion-del-reporte.ts` → `pagadoDe` | suma de pagos vigentes → `armarGrupo` (estado, `pagado`, `diferencia`) y avisos de `RegistrarEntero` | **sí**: suma `impuesto` |
| `dominio/retenciones/estado-del-entero.ts` | recibe `pagado` ya sumado | no (la regla «pagado = retenido → enterado» queda igual; lo que cambia es qué es `pagado`) |
| `tieneEnteroVigente`, `retenciones-de-la-baja.ts`, `cargador-de-contexto-fiscal.ts` (`gruposEnterados`), `por-resolver.ts` | solo «hay un pago vigente» | no (con `impuesto > 0`, ver 8.2) |
| `http/retenciones.columnas.ts` (Excel del reporte) | **no** lee pagos (grupo y plazo) | no |
| `hojas-del-sat-2237.ts`, `hojas-del-libro.ts`, PDF del libro, análisis, períodos | **no** leen enteros | no |
| `aplicacion/dto/retenciones.dto.ts` (`EnteroDto`, `dtoDeEntero`, `GrupoDelReporteDto`) | lo expone | **sí** |
| Cliente: `retenciones.api.ts`, `datos-de-pagos.ts`, `usar-pago-de-entero.ts`, `VentanaDePago.vue`, `VentanaDePagosDelMes.vue`, `resumenes-de-acciones.ts`, `textos-de-retenciones.ts` | captura y muestra | **sí** |

Los enteros no se importan ni exportan en Excel (Retenciones es reporte: solo exporta las retenciones). **No cambia**:
la regla de Excel queda como está; no hace falta columna nueva en el Excel del reporte.

### 8.2 Cambio de la tabla `libro_de_compras.enteros_de_retenciones`

**Opciones para el monto:**

- **A (recomendada): renombrar `monto` → `impuesto` y agregar `multa`, `intereses`, `mora`; el total no se guarda** (lo
  calcula el dominio: `impuesto + multa + intereses + mora`). Cada columna dice lo que es; lo que compara el estado es
  una columna sin restas; no hay dato duplicado que pueda descuadrar.
- B: dejar `monto` como **total** y agregar `impuesto` y los tres accesorios, con check `monto = impuesto + multa +
  intereses + mora`. Redundante: un dato que solo puede valer lo que dicen los otros cuatro; obliga a mantener el check y
  confunde (`monto` ya no es lo que se compara).
- C: A más una columna generada `total numeric(14,2) generated always as (impuesto + multa + intereses + mora) stored`.
  Sirve si un día Bancos o Contabilidad leen el total por SQL; hoy nadie lo lee. Se puede agregar después sin tocar
  datos. No se recomienda ahora (YAGNI).

**Columnas (opción A):**

| Columna | Tipo | Nulo | Omisión | Regla |
|---|---|---|---|---|
| `impuesto` (antes `monto`) | numeric(14,2) | no | — | `> 0`; lo que se aplica contra lo retenido del mes y grupo |
| `multa` | numeric(14,2) | no | `0` | `>= 0`; Código Tributario art. 91 |
| `intereses` | numeric(14,2) | no | `0` | `>= 0`; art. 59 |
| `mora` | numeric(14,2) | no | `0` | `>= 0`; art. 92 |

Las demás columnas no cambian (`retenido_al_marcar` sigue siendo la foto de lo retenido al marcar).

**Restricciones `check`:**

- `enteros_de_retenciones_monto_positivo` → se borra y se crea `enteros_de_retenciones_impuesto_positivo`
  (`impuesto > 0`). Al renombrar la columna PostgreSQL actualiza la expresión del check, pero el **nombre** quedaría
  mintiendo; se cambia para que la prueba de checks y los mensajes digan `impuesto`.
- `enteros_de_retenciones_multa_no_negativa` (`multa >= 0`), `enteros_de_retenciones_intereses_no_negativos`
  (`intereses >= 0`), `enteros_de_retenciones_mora_no_negativa` (`mora >= 0`): uno por columna (la prueba de checks
  sabe cuál falló).
- **No** se pone check de «fecha no futura» en la base: `current_date` va en la zona de la sesión (UTC, 6 horas adelante
  de Guatemala) y no en la de la empresa, y las pruebas fijan «hoy» con `RelojFijo`. La regla vive en el dominio
  (8.4), como la de la fecha de la constancia (tampoco tiene check hoy).

**Índices y RLS:** sin cambio (`enteros_de_retenciones_mes_idx (empresa_id, mes, grupo)`, `politicaPorEmpresa()`). No
hay llaves foráneas nuevas. Permisos: sin cambio (`libro-de-compras.retenciones.enterar`).

**Datos existentes:** el `monto` de cada fila pasa a `impuesto` (era todo impuesto: no había dónde anotar accesorios) y
los tres accesorios quedan en `0` por el `default`. Ningún estado cambia.

**Migración:** `0032_l5_accesorios_del_entero` (idx 32; el `when` más alto del journal es `1793564701275`, de
`0031_l4_formato_xls_del_lote`; el que ponga drizzle-kit con la hora de hoy es mayor). Pasos:

1. Cambiar `enteros-de-retenciones.tablas.ts` (columna `impuesto`, tres `numeric(14,2).notNull().default('0')`, checks
   nuevos en `restriccionesDelPago`; el tipo `Columnas` suma las tres claves y cambia `monto` por `impuesto`).
2. `npm run bd:generar -w servidor -- libro-de-compras l5_accesorios_del_entero --custom` (drizzle-kit, sin
   `--custom`, pregunta en la consola si es renombre o borrar y crear; con `--custom` el SQL se escribe a mano y el
   snapshot sale de las tablas). SQL:

```sql
-- L5 (errores 4 y 5 del QA del 2026-11-01): el entero separa el impuesto (lo que se compara con lo retenido) de los
-- accesorios que se pagan en la misma boleta (multa, intereses y mora). Lo ya registrado era todo impuesto.
ALTER TABLE "libro_de_compras"."enteros_de_retenciones" RENAME COLUMN "monto" TO "impuesto";--> statement-breakpoint
ALTER TABLE "libro_de_compras"."enteros_de_retenciones" DROP CONSTRAINT "enteros_de_retenciones_monto_positivo";--> statement-breakpoint
ALTER TABLE "libro_de_compras"."enteros_de_retenciones" ADD COLUMN "multa" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "libro_de_compras"."enteros_de_retenciones" ADD COLUMN "intereses" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "libro_de_compras"."enteros_de_retenciones" ADD COLUMN "mora" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "libro_de_compras"."enteros_de_retenciones" ADD CONSTRAINT "enteros_de_retenciones_impuesto_positivo" CHECK ("libro_de_compras"."enteros_de_retenciones"."impuesto" > 0);--> statement-breakpoint
ALTER TABLE "libro_de_compras"."enteros_de_retenciones" ADD CONSTRAINT "enteros_de_retenciones_multa_no_negativa" CHECK ("libro_de_compras"."enteros_de_retenciones"."multa" >= 0);--> statement-breakpoint
ALTER TABLE "libro_de_compras"."enteros_de_retenciones" ADD CONSTRAINT "enteros_de_retenciones_intereses_no_negativos" CHECK ("libro_de_compras"."enteros_de_retenciones"."intereses" >= 0);--> statement-breakpoint
ALTER TABLE "libro_de_compras"."enteros_de_retenciones" ADD CONSTRAINT "enteros_de_retenciones_mora_no_negativa" CHECK ("libro_de_compras"."enteros_de_retenciones"."mora" >= 0);
```

3. Revisar: correr `bd:generar` sin `--custom` debe decir que no hay cambios (el snapshot `0032` coincide con las
   tablas); `bd:migrar` en desarrollo y `\d libro_de_compras.enteros_de_retenciones` (solo lectura) muestra las cuatro
   columnas y los checks. El `ADD COLUMN … DEFAULT '0' NOT NULL` no reescribe la tabla (PostgreSQL 11+).

### 8.3 Dominio y consultas (servidor)

- `entero-de-retenciones.ts`: `PeticionDeEntero` y `DatosDelEntero` cambian `monto` por `impuesto`, `multa`,
  `intereses`, `mora` (centavos). `enteroValido(peticion, hoy)`: `impuesto` entero `> 0` (`MontoDelEnteroInvalido` pasa a
  `ImpuestoDelEnteroInvalido`, código `impuesto_del_entero_invalido`, campo `impuesto`, «El impuesto pagado debe ser mayor
  que cero.»); cada accesorio entero `>= 0` (`AccesorioDelEnteroInvalido`, código `accesorio_del_entero_invalido`,
  campo `multa`/`intereses`/`mora`, «La multa, los intereses y la mora no pueden ser negativos.»); fecha (8.4). Función
  `totalDelEntero(datos) = impuesto + multa + intereses + mora`.
- `retencion-del-reporte.ts`: `EnteroGuardado` con los cuatro montos; `pagadoDe` suma **`impuesto`**; nueva
  `accesoriosDe(pagos, mes, grupo)` (suma de multa + intereses + mora de los vigentes).
- `retencion-del-reporte.mapeador.ts` (`enteroGuardado`), `enteros-de-retenciones.drizzle.ts` (`crear`, `corregir`),
  `puertos-de-retenciones.ts` (`RepositorioDeEnteros.corregir`: `Pick` con los cuatro), `registrar-entero.ts`
  (`soloLoEscrito`), `pruebas/dobles-de-retenciones.ts` (`agregarVigente(mes, grupo, impuesto)`).
- `retenciones.dto.ts`: `EnteroDto` cambia `monto` por `impuesto`, `multa`, `intereses`, `mora` y agrega `total` (texto);
  `GrupoDelReporteDto.pagado` pasa a ser **el impuesto pagado** (su TSDoc lo dice) y se agrega `accesorios` (texto, suma
  de multa + intereses + mora de los vigentes) para que la tarjeta y la matriz los muestren aparte. `diferencia` sigue
  siendo `retenido − pagado`.
- `grupos-del-reporte.ts` (`armarGrupo`): `accesorios`. `estado-del-entero.ts`: solo el TSDoc («lo pagado» = el impuesto).

### 8.4 Fechas futuras (error 4)

- `constancia-de-retencion.ts`: `constanciaValida(constancia, fechaDeLaRetencion, hoy)`; después de
  `ConstanciaAnteriorALaRetencion`, si `fecha > hoy` → `ConstanciaConFechaFutura` (código `constancia_con_fecha_futura`,
  `DatoInvalido` → 400, `detalles: { campo: 'fecha' }`, «La fecha de la constancia no puede ser posterior a hoy
  (dd/mm/aaaa).»). `prepararConstancia(retencion, peticion, hoy)`; `AnotarConstancia` y `AnotarConstanciasEnLote` piden
  `hoy` **una vez** con `reloj.hoy(operador)` (`DependenciasDeConstancias` suma `reloj: Reloj`; `dependenciasBase()` ya
  lo trae). En el lote el error sale por fila (`problemaDe` toma `campo: 'fecha'`), todo o nada como hoy.
- `entero-de-retenciones.ts`: `fechaDePagoValida(fecha, mes, hoy)`: después de `FechaDePagoInvalida` (anterior al mes),
  si `fecha > hoy` → `FechaDePagoFutura` (código `fecha_de_pago_futura`, 400, `detalles: { campo: 'fechaDePago' }`, «La
  fecha de pago no puede ser posterior a hoy (dd/mm/aaaa): registre el pago cuando lo haya hecho.»).
  `RegistrarEntero` y `CorregirEntero` piden `hoy` al `Reloj` (sus `Dependencias` suman `reloj`) y validan dentro de la
  unidad de trabajo.
- Aviso (no rechaza) en `avisosDelPago` o una función de dominio `avisoDeFechaDePago(datos)`: si `fechaDePago` es
  **anterior al último día del mes** de las retenciones (el último día no avisa: puede haber retenciones de ese día ya
  pagadas): «La fecha de pago (15/03/2026) es anterior al cierre del mes de las retenciones (31/03/2026): revise que la
  fecha y el mes sean los correctos.» Va en `RegistrarEntero` y `CorregirEntero`.

### 8.5 Contrato HTTP del entero

`POST /api/libro-de-compras/retenciones/enteros` (201) y `PUT …/enteros/:id` (200), permiso `retenciones.enterar`:

```ts
// http/retenciones.esquemas-http.ts
const accesorio = dinero.default('0');
const camposDelPago = {
  fechaDePago: z.iso.date(),
  documentoDePago: texto,
  impuesto: dinero,     // antes «monto»
  multa: accesorio,
  intereses: accesorio,
  mora: accesorio,
  observaciones: z.string().trim().nullish(),
};
// POST: { mes, grupo, ...camposDelPago }   PUT: camposDelPago (reemplaza todo: si falta un accesorio, queda en 0)
```

`monto` deja de existir en el cuerpo (no hay clientes externos; `z.object` lo ignora si llega). El controlador
(`datosDelPago`) pasa los cuatro montos a centavos.

Respuesta (POST, PUT y `POST …/:id/anular`, sin cambio de forma):

```jsonc
{
  "entero": {
    "id": "…", "mes": "2026-03-01", "grupo": "iva_agentes", "fechaDePago": "2026-04-20", "documentoDePago": "SAT2000-123",
    "impuesto": "218.57", "multa": "218.57", "intereses": "5.10", "mora": "0.00", "total": "442.24",
    "retenidoAlMarcar": "218.57", "observaciones": null, "estado": "vigente", "anuladoEn": null,
    "motivoDeAnulacion": null, "registradoPor": "Ana López"
  },
  "avisos": ["…"]
}
```

`GET …/retenciones?mes=` y `GET …/retenciones/enteros?anio=`: cada grupo suma `accesorios` y sus `pagos[]` traen el
`EnteroDto` nuevo; `pagado` = impuesto pagado.

**Avisos** (no bloquean; comparan solo el impuesto de los pagos vigentes del mes y grupo, después de guardar):

| Cuándo | Texto |
|---|---|
| impuesto pagado < retenido | «Falta enterar Q90.00 de lo retenido en ese mes y grupo.» (el de hoy) |
| impuesto pagado > retenido | «El impuesto pagado en ese mes y grupo (Q537.14) pasa lo retenido (Q218.57) por Q318.57. La multa, los intereses y la mora van en sus casillas y no cuentan aquí: revise que no los sumó al impuesto.» |
| `fechaDePago` antes del último día del mes | el de 8.4 |
| impuesto pagado = retenido y hay accesorios | ninguno |

**Errores:** `fecha_de_pago_futura` y `constancia_con_fecha_futura` (400, por campo), `impuesto_del_entero_invalido` y
`accesorio_del_entero_invalido` (400, por campo; reemplazan a `monto_del_entero_invalido`), más los que ya había
(`fecha_de_pago_invalida`, `documento_de_pago_invalido`, `sin_retenciones_que_enterar`, `entero_ya_anulado`…).

**Auditoría:** sin cambio de reglas. `corregir` y `anular` ya registran el `EnteroDto` anterior, que ahora lleva los
cuatro montos y el total. El alta no se audita.

### 8.6 Pasos (un commit cada uno; `npm run revisar`; bitácora de `PLAN.md`)

**E45-1 (servidor) — fechas futuras.** 8.4 completo (errores, `Reloj` en constancias y enteros, aviso de fin de mes).
Pruebas: `constancia-de-retencion.prueba.ts` (hoy pasa; mañana → `ConstanciaConFechaFutura`; anterior a la retención
sigue dando su error), `entero-de-retenciones.prueba.ts` (hoy pasa, mañana → `FechaDePagoFutura`; aviso con el día 15 y
sin aviso el último día del mes), casos de uso con `RelojFijo` (lote: una fila futura → `constancias_en_lote_invalidas`
con `campo: 'fecha'` y no guarda ninguna), API en `libro-de-compras-retenciones-enteros.api.prueba.ts` (`haceDias(-1)`
→ 400 `fecha_de_pago_futura`; también al corregir) y en la de constancias (400 `constancia_con_fecha_futura`). Las
pruebas de API usan `HOY` en hora de Guatemala (`escenario-de-documentos.ts`), así que no fallan de noche.

**E45-2 (servidor) — tabla.** 8.2: `tablas.ts`, migración `0032_l5_accesorios_del_entero`. Pruebas en
`retenciones-por-resolver-y-enteros.prueba.ts`: la lista de checks cambia `monto_positivo` por `impuesto_positivo` y
suma `multa_no_negativa`, `intereses_no_negativos`, `mora_no_negativa`; un entero sin accesorios queda con `0.00`.
Este paso cambia el nombre en tablas, mapeador, repositorio, dominio y DTO para que compile (`impuesto` en vez de
`monto`, accesorios aún en 0 en el caso de uso).

**E45-3 (servidor) — accesorios y avisos.** 8.3 y 8.5: esquemas, controlador, `enteroValido` con accesorios,
`totalDelEntero`, `EnteroDto.total`, `accesorios` del grupo, texto nuevo del aviso de exceso. Pruebas: dominio (accesorio
negativo → `accesorio_del_entero_invalido` con su campo; total = suma), `retencion-del-reporte.prueba.ts` (`pagadoDe`
ignora accesorios y anulados), `estado-del-entero` sin cambio; API: retenido 180 + pago con impuesto 180 y multa 50 →
estado `enterado`, `pagado: '180.00'`, `accesorios: '50.00'`, `total: '230.00'`, sin aviso de exceso; impuesto 200 →
`con_diferencia` y aviso de exceso; corregir quitando la multa la deja en 0 y audita el anterior con `multa: '50.00'`;
sin `multa` en el cuerpo → 0. Actualizar `diseno-datos-libro-de-compras.md` §3.9.6.4 (tabla de columnas y «enterado
= Σ impuesto vigente = retenido»).

**E45-4 (cliente) — datos y composables.** `retenciones.api.ts` (`PagoDeEntero` y `DatosDelPago` con `impuesto`,
`multa`, `intereses`, `mora`, `total`; `GrupoDelMes.accesorios`); `datos-de-pagos.ts`: `PagoEnEdicion` con los cuatro
(accesorios en blanco = 0), `pagoNuevo` propone lo que falta en `impuesto`, `revisarPago` (impuesto > 0, accesorios
vacíos o ≥ 0), `cuerpoDelPago` (manda los cuatro siempre), `faltanteTrasElPago` con el impuesto, `totalDelPago(pago)` y
`pasaLoRetenido(grupo, pago, corrigiendo)`; `usar-pago-de-entero.ts`: si `pasaLoRetenido`, `confirmar` antes de enviar
(«El impuesto escrito más lo ya pagado pasa lo retenido por Q…. ¿Registrar de todos modos? Si incluye multa, intereses o
mora, escríbalos en sus casillas.»); los `avisos` de la respuesta con `avisos.info` (como hoy). `errores-del-…`: los
códigos nuevos van al campo de su `detalles.campo`. Pruebas en `datos-de-pagos.prueba.ts`.

**E45-5 (cliente) — ventanas.** `VentanaDePago.vue`: «Impuesto enterado»*, y un grupo «Multa, intereses y mora (si los
pagó en la misma boleta)» con tres campos opcionales y el total de la boleta abajo; `max` = hoy (fecha del equipo, el
servidor manda) en la fecha de pago y en la fecha de `VentanaDeConstancias.vue`. `VentanaDePagosDelMes.vue`: cada pago
muestra el total y, si hay accesorios, «impuesto Q… + multa Q… + intereses Q… + mora Q…». `CifrasDelGrupo.vue` /
`TarjetasDeGrupos.vue` / `MatrizDeEnteros.vue`: «Pagado» es el impuesto; los accesorios aparte si no son 0.
`resumenes-de-acciones.ts` (anular): «Se anula el pago de Q{total}…». Textos en `textos-de-retenciones.ts`. Celular
380 px: los tres accesorios uno bajo otro.

**E45-6 (QA, `pruebas-qa`).** Repetir los pasos de los errores 4 y 5 del informe: fecha de mañana en constancia (una
y en lote) y en el pago; pago con fecha antes del fin del mes (aviso); pago tardío con multa e intereses (queda
«enterado» y muestra el total); impuesto de más (confirmación y aviso). Escritorio y 380 px, claro y oscuro.

### 8.7 Dudas para el usuario

1. **¿Un pago de solo accesorios?** Con `impuesto > 0` no se puede registrar una boleta que solo pague multa o intereses
   (por ejemplo, si la SAT los cobra después de un entero tardío pagado sin ellos). Recomendación: **dejar `impuesto > 0`
   por ahora** (lo que el contador describe es todo en la misma boleta, y así «hay un entero vigente» sigue significando
   «se pagó impuesto», que usan la baja de documentos y los avisos); si aparece el caso, una migración cambia el check a
   `impuesto >= 0` con total `> 0` y esas reglas pasan a mirar `impuesto > 0`.
2. **Total guardado o calculado.** Recomendación: calculado (opción A); la columna generada (C) se agrega cuando otro
   módulo la necesite.

**Respuestas del usuario al plan de datos (2026-11-01):** el impuesto del entero sigue siendo `> 0` (no se registran
pagos de solo accesorios por ahora); el total no se guarda, se calcula.
