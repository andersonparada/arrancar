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

