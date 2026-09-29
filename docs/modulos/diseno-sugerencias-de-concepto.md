# P7: sugerencias de concepto en Bancos — diseño (arquitecto de datos, 2026-09-29)

Pedido del usuario (tabla de respuestas de `plan-hallazgos-contables.md` y `DONDE-QUEDAMOS.md`):
sugerir el concepto de lo que está en la bandeja «Sin clasificar», **siempre con confirmación**, con
un cálculo estadístico mejor que «el último concepto usado con ese beneficiario». Este documento
compara tres alternativas, recomienda una con su algoritmo exacto y la divide en pasos. No cambia
nada de lo acordado en H3b ni en «Ajustes de conceptos» (`bancos.md`).

## 1. Lo que hay hoy (revisado en el código y en la base)

- `bancos.movimientos`: `tipo` (`credito`, `debito`, `cheque`; el cheque cuenta como débito), `fecha`,
  `monto numeric(14,2)`, `beneficiario text null` (texto libre; obligatorio en cheques), `referencia`,
  `observaciones`, `cuenta_bancaria_id`, `concepto_id not null` (llave compuesta con la empresa),
  `modulo_de_origen`/`documento_de_origen_id`, `revierte_a_id`, `transferencia_id`, `saldo_inicial`,
  `anulado_en`, `revertido_en`. RLS solo por empresa (`politicaPorEmpresa`). Índices útiles:
  `(cuenta_bancaria_id, fecha)` y `(empresa_id, concepto_id, fecha)`. **No hay índice por beneficiario.**
- `bancos.conceptos`: `aplica_a` (`credito`, `debito`, `ambos`), `clave_de_sistema` (4 de sistema:
  `transferencia`, `pago_a_proveedor`, `saldo_inicial`, `sin_clasificar`), `activo`.
- Bancos **no** declara `recursosConAlcance`: el alcance por cuenta bancaria nunca se programó
  (`diseno-accesos-por-modulo.md`). Hoy «lo que el usuario ve» = toda la empresa activa.
- Bandeja (`BandejaDeSinClasificar.vue`, `usar-bandeja-de-sin-clasificar.ts`): lee el reporte de
  movimientos filtrado por el concepto `sin_clasificar`, deja marcar hasta 200 y los clasifica todos con
  **un** concepto (`POST /bancos/notas/reclasificar`, permiso `bancos.notas.editar`, auditoría `corregir`
  por movimiento, arrastra al inverso).
- Al capturar una **nota**, el cliente ya sugiere «el último concepto con este beneficiario» con las
  notas que tiene cargadas (`sugerirConcepto` en `opciones-de-concepto.ts`; normaliza solo
  mayúsculas y espacios). En cheques no hay sugerencia.
- `pg_trgm` 1.6 está instalado en `public` (lo creó la migración `0001` de terceros); `unaccent` está
  disponible pero no instalado (y no es `immutable`, no sirve para un índice). La base usa `C.UTF-8`
  (`lower('ÁÉÑ')` sí devuelve `áéñ`).

### Hallazgos críticos antes de diseñar

1. **La bandeja estará vacía.** Solo la migración `0018` puso «Sin clasificar» (C5: nunca en una
   captura), no hay nada en producción y la base de desarrollo tiene **0 movimientos**. Ninguna ruta,
   importación ni módulo crea movimientos sin clasificar. El cálculo solo tendría trabajo en la bandeja si
   en el futuro entra algo sin concepto (p. ej. importar un estado de cuenta). **Donde sí sirve es al
   registrar una nota o un cheque**, que hoy tiene la sugerencia débil del cliente. Por eso el diseño hace
   un solo motor con dos entradas (bandeja y captura). Ver pregunta 1.
2. **«Pago a proveedores» no se puede clasificar desde la bandeja.** `ReclasificarMovimientos` llama a
   `exigirConceptoElegible` sin la tolerancia de P3, así que lo rechaza siempre
   (`concepto_de_sistema_no_se_elige`), aunque al emitir un cheque sí se puede elegir si Cuentas por pagar
   no está activo. Es incoherente con P3. Ver pregunta 2.
3. **Arranque en frío.** Sin datos etiquetados no hay nada que sugerir: todo el historial migrado es
   «Sin clasificar» y no sirve de ejemplo. Lo que se clasifica (a mano, en la captura o en la bandeja)
   pasa a ser el ejemplo del siguiente. Por eso la recencia se mide **contra la fecha del movimiento
   pendiente** y no contra hoy: si no, clasificar a mano un pendiente de hace un año casi no pesaría para
   sus vecinos de la misma época.
4. **Un error en lote no tiene deshacer.** «Sin clasificar» no se puede volver a asignar (C5) y un cheque
   mal clasificado no tiene pantalla para reclasificarse (la bandeja solo muestra lo pendiente). Aceptar
   en lote exige una confirmación clara. Ver pregunta 5.

## 2. Datos de aprendizaje y candidatos (valen para las tres alternativas)

**Ejemplo (historial):** un movimiento de la misma empresa (RLS) que cumple todo esto:

- original: `revierte_a_id is null`; no es de transferencia (`transferencia_id is null`); no es saldo inicial;
- sin origen: `modulo_de_origen is null` (el concepto lo fijó otro módulo con sus reglas, no una persona);
- su concepto no es de sistema, o es `pago_a_proveedor` en un cheque (P3, elegido a mano);
- **sí** cuentan los anulados y los revertidos: el concepto lo eligió una persona y sigue siendo dato.

**Pendiente:** original vigente con concepto `sin_clasificar`, sin origen, sin transferencia, no saldo
inicial y `anulado_en is null` (lo mismo que hoy muestra la bandeja con `puedeReclasificar`).

**Conceptos que se pueden ofrecer a un pendiente:** activos, no de sistema y compatibles con su tipo
(las mismas reglas de `exigirConceptoElegible`). `pago_a_proveedor` solo si el pendiente es un cheque,
Cuentas por pagar no está activo (puerto `CuentasPorPagarActivo`) y la pregunta 2 se responde que sí.
Un concepto inactivo o incompatible **no se ofrece**, pero sus votos sí cuentan en el total (ver §4):
si 8 de 10 casos usaban un concepto hoy inactivo, no hay por qué confiar en los otros 2.

Solo votan ejemplos de la **misma dirección** (entrada = crédito; salida = débito o cheque).

## 3. Alternativas

### (a) Frecuencia ponderada por recencia, por beneficiario normalizado

Cada ejemplo con el mismo beneficiario normalizado vota por su concepto con peso
`2^(−días de distancia / vida media)`; gana el de mayor suma.

- **Aciertos esperados** (estimación, no hay datos para medir): alta precisión cuando el beneficiario
  siempre recibe lo mismo (planilla, IGSS, un proveedor de un solo rubro), que en un rancho es la mayoría
  de los pagos repetidos. Falla en beneficiarios con varios conceptos (el banco: comisiones y cuota del
  préstamo; un socio: aporte y retiro) y no dice nada de las notas sin beneficiario (comisiones,
  intereses, cargos que pone el banco).
- **Explicación:** la más clara: «4 de 5 movimientos de este beneficiario».
- **Costo:** una consulta por índice `(empresa_id, beneficiario_para_comparar, fecha)`; milisegundos.
- **Tablas:** una columna generada y un índice; sin caché.

### (b) La anterior más cercanía de monto y, sin beneficiario, la misma cuenta y el texto

Votación de vecinos: el peso del ejemplo se multiplica por qué tan parecido es su monto y, cuando el
pendiente no tiene beneficiario, se buscan ejemplos sin beneficiario de la misma cuenta y se comparan
las palabras de referencia y observaciones. Opcional: beneficiarios **parecidos** (errores de escritura)
con trigramas de `pg_trgm`.

- **Aciertos esperados:** los de (a) más los beneficiarios con varios conceptos (el monto los separa:
  Q30 es comisión, Q5,000 es la cuota) y las notas del banco sin beneficiario (misma cuenta, monto
  repetido, «comisión» en observaciones). El monto nunca descarta un caso: solo reordena.
- **Explicación:** igual de clara, con el rango de montos: «4 de 5 de este beneficiario, de Q150.00 a
  Q1,200.00; el último el 12/08/2026».
- **Costo:** dos o tres consultas por índice y el cálculo en TypeScript sobre pocos cientos de filas.
  Con miles de movimientos por empresa, decenas de milisegundos.
- **Tablas:** columna generada e índice btree; GIN de trigramas solo si se hacen los parecidos. Sin caché.

### (c) Clasificador Naive Bayes (tokens de beneficiario y texto, dirección, rango de monto, cuenta)

`P(c | x) ∝ P(c) · Π P(rasgo | c)` con conteos ponderados por recencia y suavizado de Laplace.

- **Aciertos esperados:** mejor que (b) **solo** con beneficiarios nunca vistos cuyo nombre o texto
  comparte palabras con otros («Agroservicios …»), y eso con bastante historial. Con el historial de un
  rancho (cientos de ejemplos, casi todos de beneficiarios repetidos) no se espera ganancia apreciable y
  sí más ruido.
- **Explicación:** difícil («por las palabras "agro" y "servicios" y el monto»). Sus probabilidades
  salen demasiado seguras (Naive Bayes no está calibrado): un «97 %» engaña.
- **Costo:** necesita todo el historial de la ventana en cada consulta (decenas de miles de filas) o un
  modelo guardado (`bancos.modelo_de_sugerencias` con conteos por rasgo y concepto). Guardado, hay que
  invalidarlo en cada captura, reclasificación, inactivación o corrección y **rompe la seguridad por
  registro futura**: un conteo agregado mezcla cuentas bancarias que el usuario quizá no pueda ver.
- **Tablas:** una tabla de caché por empresa con su RLS y su mantenimiento.

### Comparación

| | (a) | (b) recomendada | (c) |
|---|---|---|---|
| Beneficiario siempre igual | Bien | Bien | Bien |
| Beneficiario con varios conceptos | Mal (manda la mayoría) | Bien (monto) | Bien |
| Notas del banco sin beneficiario | Nada | Bien (cuenta, monto, texto) | Bien |
| Beneficiario nuevo o mal escrito | Nada | Parecidos (paso opcional) | Regular |
| «Por qué» entendible | Muy claro | Claro | Difícil |
| % honesto | Sí (con suavizado) | Sí (con suavizado) | No sin calibrar |
| Costo | Mínimo | Bajo | Alto o caché |
| Seguridad por registro futura | Sí | Sí | No con caché |

## 4. Recomendación: (b), votación ponderada de vecinos, calculada al vuelo

Se calcula en cada consulta, dentro de la unidad de trabajo, con las tablas vivas: RLS garantiza solo
datos de la empresa y, si algún día hay alcance por cuenta bancaria (`politicaPorAlcance` en
`movimientos`), el cálculo lo respeta sin cambiar nada. **No hay tabla de caché ni de modelo.** Las
confirmaciones enseñan solas: lo clasificado deja de ser pendiente y pasa a ser ejemplo; un rechazo
(elegir otro concepto) también, porque el concepto elegido es el que queda.

### 4.1 Normalizar el beneficiario (en la base, una sola fuente)

Función `bancos.nombre_para_comparar(texto text) returns text`, `language sql immutable strict
parallel safe`, con `set search_path = pg_catalog`:

1. `translate` de acentos en mayúsculas y minúsculas (`ÁÉÍÓÚÜÑáéíóúüñ` → `AEIOUUNaeiouun`), luego `lower`;
2. todo lo que no sea `[a-z0-9]` → espacio;
3. quita, como palabras completas (`\m…\M`): formas jurídicas (`s a`, `sa`, `s de r l`, `srl`, `ltda`,
   `cia`, `sociedad anonima`) y conectores (`de`, `del`, `la`, `el`, `los`, `las`, `y`);
4. junta espacios y recorta; si queda vacío, `null`.

Ejemplo: «Agroservicios El Rancho, S.A.» y «AGROSERVICIOS  el rancho sa» → `agroservicios rancho`.
La misma función normaliza las observaciones y la referencia para comparar palabras (§4.3), así
TypeScript nunca repite la regla (en H4 se repitió y hay que cuidar que coincidan).

**Columna nueva** `bancos.movimientos.beneficiario_para_comparar text null`, `generated always as
(bancos.nombre_para_comparar(beneficiario)) stored`. Los datos existentes se llenan solos al agregarla
(reescribe la tabla; no hay producción). Si un día cambia la función, hay que quitar y volver a agregar
la columna en una migración. Los mapeadores y los DTO la dejan fuera; Drizzle no la escribe.

**Índice** `movimientos_beneficiario_para_comparar_idx` btree `(empresa_id, beneficiario_para_comparar,
fecha)` `where beneficiario_para_comparar is not null`.

### 4.2 Candidatos de un pendiente `x`

Ventana: `|fecha_x − fecha_i| ≤ 4·H` días (con `H` = vida media; más allá el peso es menor que 1/16).
Máximo 300 candidatos por clave, los más cercanos en fecha.

| Caso de `x` | Candidatos `i` (ejemplos, misma dirección, `i ≠ x`) | Similitud `s_i` | Base del «por qué» |
|---|---|---|---|
| Con beneficiario | mismo `beneficiario_para_comparar` | 1 | `mismo_beneficiario` |
| Con beneficiario y sin ninguno igual (paso S5) | `similarity ≥ 0.6` con `pg_trgm` | `0.8 · similarity` | `beneficiario_parecido` |
| Sin beneficiario | sin beneficiario **y de la misma cuenta bancaria** | `0.5 + 0.5 · J` | `misma_cuenta_sin_beneficiario` |

`J` = índice de Jaccard entre las palabras normalizadas de referencia y observaciones de `x` y de `i`,
sin las palabras de solo dígitos ni las de menos de 3 letras (0 si alguno no tiene palabras).

### 4.3 Peso, puntaje y confianza

```
r_i = 2 ^ ( −|fecha_x − fecha_i| / H )                                  recencia
a_i = β + (1 − β) · exp( −(ln m_x − ln m_i)² / (2σ²) )                  cercanía de monto (centavos)
w_i = r_i · s_i · a_i

S(c) = Σ w_i   de los candidatos con concepto c
W    = Σ S(c)  de todos los conceptos, también los que no se pueden ofrecer
confianza(c) = S(c) / (W + α)
```

| Parámetro | Valor | Dónde vive |
|---|---|---|
| `H` vida media | 180 días | configurable: `bancos.sugerencias.vida_media_dias` |
| `θ` confianza mínima para «Sugerido» | 60 % | configurable: `bancos.sugerencias.confianza_minima` |
| `α` peso del «no sé» | 1 | constante del dominio |
| `β` piso del monto | 0.2 | constante del dominio |
| `σ` | ln 1.5 | constante del dominio (×1.2 → 0.92; ×1.5 → 0.69; ×2 → 0.38; ×3 → 0.22) |
| Alternativa mínima | 10 % | constante del dominio |

`α` es un suavizado bayesiano (prior de Dirichlet hacia «no sé»): un solo caso idéntico da 50 %, dos
dan 67 %, cuatro 80 %. Así, con los valores por omisión, **hacen falta dos casos que coincidan** para
que aparezca «Sugerido» (pregunta 3).

**Resultado de `x`:** los conceptos que se pueden ofrecer, por confianza (empate: mayor `S`, luego el
caso más cercano en fecha, luego el nombre). `sugerido` = el primero si `confianza ≥ θ`; si no, nulo.
`alternativas` = los siguientes con confianza ≥ 10 %: hasta 2 si hay sugerido, hasta 3 si no.

Ejemplos (aproximados, con casos a unos 30 días): 5 pagos a una ferretería, todos «Mantenimiento»,
montos parecidos → unos 80 %. El banco con 6 comisiones de Q30 y 2 cuotas de Q5,000: un débito de Q35 →
«Comisiones» unos 78 %; uno de Q5,000 → «Pago de préstamo» unos 46 % y «Comisiones» 27 %, sin sugerido
(dos casos no bastan).

El % se muestra como **confianza**, no como probabilidad: «qué parte de los casos parecidos usó ese
concepto, descontando cuando hay pocos». No está calibrado hasta medirlo (§7).

### 4.4 Configuración (en `modulo.ts` de Bancos)

```ts
definirConfiguracion({
  clave: 'bancos.sugerencias.vida_media_dias',
  descripcion: 'Días tras los cuales un movimiento clasificado pesa la mitad al sugerir el concepto de otro.',
  esquema: z.number().int().min(30).max(1095), predeterminado: 180,
  niveles: ['instalacion', 'empresa'], publica: false,
}),
definirConfiguracion({
  clave: 'bancos.sugerencias.confianza_minima',
  descripcion: 'Confianza (en %) desde la que un concepto se muestra como sugerido.',
  esquema: z.number().int().min(30).max(95), predeterminado: 60,
  niveles: ['instalacion', 'empresa'], publica: false,
}),
```

Las aplica el servidor y las devuelve en la respuesta (el cliente no decide nada).

## 5. API

### 5.1 Sugerencias de la bandeja

`GET /api/bancos/notas/sugerencias-de-concepto?cuentaBancariaId=&desde=&hasta=` — permiso
`bancos.notas.editar` (el mismo de reclasificar: solo quien puede clasificar necesita sugerencias). Los
filtros son los de la bandeja; el servidor busca él mismo los pendientes (hasta 2,000; si hay más,
`truncado: true` y la pantalla pide acotar fechas).

```ts
interface RespuestaDeSugerencias {
  confianzaMinima: number;          // θ aplicada
  vidaMediaDias: number;            // H aplicada
  truncado: boolean;
  sugerencias: SugerenciaDeMovimiento[];   // una por pendiente, también las vacías
}
interface SugerenciaDeMovimiento {
  movimientoId: string;
  sugerido: OpcionSugerida | null;
  alternativas: OpcionSugerida[];
  casosComparados: number;          // candidatos que votaron (de todos los conceptos)
}
interface OpcionSugerida {
  conceptoId: string;
  conceptoNombre: string;
  confianza: number;                // entero 0 a 100
  porque: {
    base: 'mismo_beneficiario' | 'beneficiario_parecido' | 'misma_cuenta_sin_beneficiario';
    casos: number;                  // cuántos votaron por este concepto
    ultimaFecha: string;            // AAAA-MM-DD del caso más cercano
    montoMinimo: string;            // numeric como texto, igual que el resto de la API
    montoMaximo: string;
    beneficiarioParecido: string | null;   // el texto original, solo con base beneficiario_parecido
  };
}
```

La frase («4 de 5 movimientos de este beneficiario, de Q150.00 a Q1,200.00; el último el 12/08/2026»)
la arma el cliente con `utilidades/formato.ts`.

### 5.2 Aceptar sugerencias en lote (conceptos distintos en un mismo lote)

`POST /api/bancos/notas/reclasificar-varios` — permiso `bancos.notas.editar`. Cuerpo
`{ asignaciones: [{ movimientoId, conceptoId }] (1 a 200, sin ids repetidos), porSugerencia: boolean }`.
Todo o nada en una transacción; por cada asignación, las mismas reglas, auditoría `corregir` y arrastre
al inverso que `ReclasificarMovimientos` (se extrae su paso por movimiento para no duplicarlo). Con
`porSugerencia`, el motivo de la auditoría termina en « (sugerencia aceptada)», que permite medir
cuántas se aceptan. Responde `{ reclasificados, sinCambio }`. La ruta vieja queda igual.

El servidor **no** recalcula la sugerencia al aceptar: la persona confirmó un concepto concreto por
movimiento y el servidor valida que se pueda asignar.

### 5.3 Sugerencia al capturar (pasos S6 y C3, si la pregunta 1 es sí)

`POST /api/bancos/notas/sugerir-concepto` (permiso `bancos.notas.crear`) y
`POST /api/bancos/cheques/sugerir-concepto` (permiso `bancos.cheques.emitir`; tipo fijo `cheque`).
Cuerpo `{ tipo?, cuentaBancariaId, fecha?, monto?, beneficiario?, referencia?, observaciones? }`
(`POST` para que el nombre del beneficiario no quede en los registros de URLs). Responde una
`SugerenciaDeMovimiento` sin `movimientoId`. El beneficiario se normaliza con
`select bancos.nombre_para_comparar($1)`. Reemplaza al `sugerirConcepto` del cliente.

## 6. Capas, seguridad, Excel y auditoría

- **Dominio** (puro, con pruebas; `dominio/sugerencias/`): `pesos.ts` (recencia, monto, Jaccard),
  `votacion.ts` (puntajes, confianza, orden, sugerido y alternativas) y `conceptos-ofrecibles.ts`
  (reusa las reglas de `asignacion-de-concepto.ts`).
- **Aplicación**: caso de uso `SugerirConceptosDeSinClasificar` (y luego `SugerirConceptoAlCapturar`);
  puerto `ConsultasDeSugerencias` con `pendientes(filtro)`, `ejemplosPorBeneficiario(claves, rango)`,
  `ejemplosSinBeneficiario(cuentas, rango)` y, en S5, `ejemplosParecidos(claves, rango)`.
  `ReclasificarVarios` para §5.2.
- **Infraestructura**: consultas Drizzle con `transaccionEnCurso()`. La condición de «pendiente» se
  comparte con el reporte (`consultas-movimientos.drizzle.ts`, hoy en línea) para no divergir. En S5,
  `unnest($claves) cross join lateral (… where beneficiario_para_comparar % clave order by similarity desc
  limit 300)` con `set local pg_trgm.similarity_threshold = 0.6`, revisando el plan con `explain`.
- **RLS**: sin políticas nuevas; la columna nueva hereda las de `movimientos`. Nada se guarda.
- **Permisos**: ninguno nuevo; no hay migración de roles.
- **Excel**: ninguno. La bandeja y la captura son de Operación (no importa ni exporta).
- **Auditoría**: leer sugerencias no se audita; aceptar sí, con `corregir` como hoy (§5.2).
- **Convivencia**: lo que viene de Cuentas por pagar (con origen) ni se sugiere ni enseña. Cuando
  exista elegir el beneficiario de Terceros (pendiente en `bancos.md`), la clave pasará a ser el
  `tercero_id` y el texto quedará para lo escrito a mano.

## 7. Pruebas

- **Dominio**: recencia (`H` días → 0.5), monto (piso β, ×2 → 0.38), Jaccard sin dígitos; confianza con
  uno, dos y cuatro casos (50, 67, 80 %); un concepto inactivo resta confianza y no se ofrece; dirección
  contraria no vota; `pago_a_proveedor` solo en cheque y sin Cuentas por pagar; empates; sin candidatos.
- **Calidad (regresión)**: un año sintético de un rancho (planilla quincenal, IGSS mensual, tres
  proveedores, comisiones y cuota del banco, notas sin beneficiario, un socio con aporte y retiro):
  aprender de nueve meses y medir los tres siguientes; con los valores por omisión, precisión del
  sugerido ≥ 90 % y cobertura ≥ 60 %. Sirve para no empeorar al tocar parámetros.
- **API**: la función de normalización (acentos, «S.A.», solo espacios → nulo); otra empresa con el mismo
  beneficiario no influye (RLS); 403 sin `bancos.notas.editar`; no enseñan ni se sugieren los de origen,
  inversos, transferencias, saldo inicial ni «Sin clasificar»; aprender: clasificar dos y el tercero sale
  sugerido; `truncado`; `reclasificar-varios` todo o nada, conceptos distintos, tope 200, motivo con
  «(sugerencia aceptada)» y arrastre al inverso; la configuración de la empresa cambia el resultado.
- **Cliente**: lógica pura `frase-de-sugerencia` y `lote-de-sugerencias` (agrupar por concepto, tope 200,
  solo marcados con sugerido) con `*.prueba.ts`.
- **Medir en uso**: el porcentaje de aceptadas sale de los motivos de la auditoría. Si baja de 70 %,
  revisar parámetros o considerar (c).

## 8. Interfaz (alto nivel)

- En cada `TarjetaDePendiente`: una insignia «Sugerido: Planilla · 85 %» con «¿Por qué?» (un
  `details` con la frase) y el botón «Usar»; sin sugerido, «Posibles: X 45 %, Y 27 %» en gris; sin nada,
  no se muestra nada. Las alternativas también se pueden usar con un clic.
- «Usar» en una tarjeta es la confirmación de ese movimiento (clic explícito, nunca automático).
- En la barra: filtro «Solo con sugerencia» y botón «Aceptar lo sugerido de lo marcado (N)», que abre
  una confirmación agrupada: «Se clasificarán 37 movimientos: 20 como Planilla (Q…) y 17 como
  Comisiones (Q…). Solo cambia el concepto y queda en la auditoría». El «Clasificar como…» actual sigue.
- Después de cada clasificación se recargan pendientes y sugerencias (lo recién clasificado ya enseña).
  La bandeja ordena por beneficiario para que clasificar uno a mano ayude a sus vecinos.
- Captura (S6/C3): bajo el selector de concepto de la nota y del cheque, «Sugerido: X · 85 % (usar)»
  con su «por qué», consultando 350 ms después de escribir el beneficiario o el monto.

## 9. Pasos de implementación (un commit cada uno)

**Servidor** (S1, S2, S3, S4 y S6 hechos el 2026-09-29; falta S5, que el usuario dejó para después)

1. **S1** (hecho) Migración `--custom`: función `bancos.nombre_para_comparar`; luego la generada por
   `bd:generar`: columna `beneficiario_para_comparar` e índice. `when` mayor que 1790701982970 (la
   `0023`). Prueba API de la función.
2. **S2** (hecho) Dominio puro `dominio/sugerencias/` con sus pruebas y la de calidad sintética.
3. **S3** (hecho) Puerto, consultas Drizzle, caso de uso, las dos variables en `modulo.ts`,
   `GET /bancos/notas/sugerencias-de-concepto` y pruebas de casos de uso y API.
4. **S4** (hecho) `ReclasificarVarios` y `POST /bancos/notas/reclasificar-varios`; si la pregunta 2 es sí,
   tolerancia de P3 en ambos reclasificar. Pruebas.
5. **S5** (opcional) Beneficiarios parecidos: `create extension if not exists pg_trgm` en la migración
   de bancos (no depende del orden de terceros), índice GIN `gin_trgm_ops` y consulta con `lateral`.
6. **S6** (hecho) (si la pregunta 1 es sí) Las dos rutas de captura y sus pruebas.

**Cliente** (C1, C2 y C3 hechos el 2026-09-29, junto con «Reclasificar» en el reporte de Movimientos)

7. **C1** (hecho) Servicio y tipos; lógica pura `frase-de-sugerencia` y `lote-de-sugerencias` con pruebas.
8. **C2** (hecho) Bandeja: insignia, «¿Por qué?», «Usar», filtro, «Aceptar lo sugerido» con confirmación
   agrupada, recarga y orden por beneficiario.
9. **C3** (hecho) (si la pregunta 1 es sí) Sugerencia en la nota y el cheque desde el servidor; quitar
   `sugerirConcepto` local.

Al terminar: actualizar `bancos.md`, `concepto-de-notas-y-cheques.md` (fila del cheque manual),
`plan-hallazgos-contables.md` y `DONDE-QUEDAMOS.md`.

## 10. Preguntas para el usuario

1. **¿Usamos el mismo cálculo al registrar una nota o un cheque?** Hoy no hay nada «Sin clasificar» ni
   lo habrá (solo lo creó la migración y no hay datos en producción), así que en la bandeja casi nunca
   se verá. **Recomiendo sí** (pasos S6 y C3): ahí es donde ayuda todos los días.
2. **¿Se puede clasificar un cheque como «Pago a proveedores» desde la bandeja cuando Cuentas por pagar
   no está activo?** Hoy al emitirlo sí se puede, pero la bandeja lo rechaza. **Recomiendo sí**, con la
   misma regla que al emitir.
3. **¿Bastan dos casos iguales para sugerir?** Con los valores propuestos, un solo caso da 50 % y no se
   marca como «Sugerido» (se muestra como posible); dos dan 67 %. **Recomiendo dejarlo así**; se puede
   cambiar por empresa con la confianza mínima.
4. **Aceptar:** ¿un clic en «Usar» en una tarjeta basta como confirmación, y el lote pide una ventana con
   el resumen por concepto? **Recomiendo sí.**
5. **Corregir un error:** un cheque mal clasificado hoy no tiene pantalla para cambiarle el concepto.
   ¿Agregamos «Reclasificar» en el reporte de movimientos (paso aparte, fuera de P7)? **Recomiendo sí**,
   antes de habilitar aceptar en lote.
6. **Beneficiarios mal escritos** (paso S5): ¿se hace ya o después de ver cuánto se usa? **Recomiendo
   después.**

## Respuestas del usuario (2026-09-29)

Mandan sobre las preguntas de arriba; todas con lo recomendado.

1. **Mismo cálculo al capturar** notas y cheques: sí (pasos S6 y C3).
2. **«Pago a proveedores» en la bandeja** para cheques: sí, con la misma regla de P3
   (solo si Cuentas por pagar no está activo).
3. **Desde 2 casos iguales** se muestra «Sugerido» (mínimo configurable).
4. **«Usar» confirma** un movimiento; el **lote** pide una ventana con el resumen por
   concepto y casilla de confirmación.
5. **«Reclasificar»** en el reporte de movimientos (notas y cheques, con permiso y
   auditoría): sí, antes de aceptar en lote.
6. **Beneficiarios mal escritos** (`pg_trgm`, S5): después, con datos reales.

## Hecho en el servidor (2026-09-29)

S1, S2, S3, S4 y S6 están hechos; el detalle y las decisiones están en `bancos.md` (sección «P7: sugerencias de concepto»). También
la parte de servidor de dos respuestas: «Pago a proveedores» en la bandeja para cheques (misma regla de P3) y **Reclasificar** un
cheque (`POST /bancos/cheques/reclasificar`, permiso `bancos.cheques.reclasificar`). Cliente (C1 a C3 y «Reclasificar» del reporte) hecho después el mismo día; pendiente solo S5.
