import { normalizar, type Columna, type OpcionDeReferencia, type TipoDeColumna } from './columnas.js';

/** El valor que va a la solicitud, o el problema que tiene la celda. */
export type Lectura = { valor: unknown } | { error: string };

const valor = (dato: unknown): Lectura => ({ valor: dato });
const error = (mensaje: string): Lectura => ({ error: mensaje });

/** El texto de una celda; un número o una fecha escritos como texto también sirven. */
const textoDe = (celda: unknown) => (celda instanceof Date ? celda.toISOString() : String(celda)).trim();

const esVacia = (celda: unknown) => celda === null || celda === undefined || textoDe(celda) === '';

const dosDigitos = (numero: number) => String(numero).padStart(2, '0');

/** Excel guarda las fechas sin zona horaria: se leen en UTC para no correr el día. */
const fechaIso = (fecha: Date) =>
  `${fecha.getUTCFullYear()}-${dosDigitos(fecha.getUTCMonth() + 1)}-${dosDigitos(fecha.getUTCDate())}`;

function leerFecha(celda: unknown): Lectura {
  if (celda instanceof Date) return valor(fechaIso(celda));
  const partes =
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(textoDe(celda)) ?? /^(\d{4})-(\d{2})-(\d{2})$/.exec(textoDe(celda));
  if (!partes) return error('Escriba una fecha como 15/03/2024.');
  const [dia, mes, anio] =
    partes[1]!.length === 4 ? [partes[3], partes[2], partes[1]] : [partes[1], partes[2], partes[3]];
  const fecha = new Date(Date.UTC(Number(anio), Number(mes) - 1, Number(dia)));
  return fecha.getUTCDate() === Number(dia) ? valor(fechaIso(fecha)) : error('Esa fecha no existe.');
}

function leerEntero(celda: unknown): Lectura {
  const numero = Number(textoDe(celda).replace(/,/g, ''));
  return Number.isInteger(numero) ? valor(numero) : error('Escriba un número entero.');
}

/** Los decimales viajan como texto ("1250.50"), igual que en la API. */
function leerDecimal(celda: unknown): Lectura {
  const numero = Number(textoDe(celda).replace(/,/g, ''));
  return Number.isFinite(numero) ? valor(String(numero)) : error('Escriba un número.');
}

const SI = new Set(['si', 'sí', 's', 'x', 'true', '1', 'verdadero']);
const NO = new Set(['no', 'n', 'false', '0', 'falso']);

function leerSiNo(celda: unknown): Lectura {
  const texto = normalizar(textoDe(celda));
  if (celda === true || SI.has(texto)) return valor(true);
  if (celda === false || NO.has(texto)) return valor(false);
  return error('Escriba Sí o No.');
}

/** Una opción de lista se puede escribir con su texto ("Hembra") o su valor ("hembra"). */
function leerOpcion(celda: unknown, opciones: Readonly<Record<string, string>>): Lectura {
  const buscado = normalizar(textoDe(celda));
  const encontrada = Object.entries(opciones).find(([clave, texto]) =>
    [clave, texto].map(normalizar).includes(buscado),
  );
  return encontrada ? valor(encontrada[0]) : error(`Use una de estas opciones: ${Object.values(opciones).join(', ')}.`);
}

function leerReferencia(celda: unknown, opciones: OpcionDeReferencia[], titulo: string): Lectura {
  const buscado = normalizar(textoDe(celda));
  const encontradas = opciones.filter((opcion) => normalizar(opcion.nombre) === buscado);
  if (encontradas.length === 1) return valor(encontradas[0]!.id);
  if (encontradas.length > 1) return error(`Hay varios con el nombre "${textoDe(celda)}" en ${titulo}.`);
  return error(`No existe "${textoDe(celda)}" en ${titulo}.`);
}

type Lector = (celda: unknown, columna: Columna, opciones: OpcionDeReferencia[]) => Lectura;

/** Cómo se lee cada tipo de columna (patrón Strategy). */
const LECTORES: Record<TipoDeColumna, Lector> = {
  texto: (celda) => valor(textoDe(celda)),
  entero: leerEntero,
  decimal: leerDecimal,
  fecha: leerFecha,
  siNo: leerSiNo,
  lista: (celda, columna) => leerOpcion(celda, columna.tipo === 'lista' ? columna.opciones : {}),
  referencia: (celda, columna, opciones) => leerReferencia(celda, opciones, columna.titulo),
};

/** Una celda vacía: falta el dato si es obligatorio; si no, `null` (sí/no queda sin valor y toma su predeterminado). */
const leerVacia = (columna: Columna): Lectura => {
  if (columna.requerido) return error('Falta este dato.');
  return valor(columna.tipo === 'siNo' ? undefined : null);
};

/**
 * Convierte una celda en el valor de la solicitud según su columna. Las
 * referencias necesitan sus opciones ya consultadas.
 */
export const leerCelda = (celda: unknown, columna: Columna, opciones: OpcionDeReferencia[] = []): Lectura =>
  esVacia(celda) ? leerVacia(columna) : LECTORES[columna.tipo](celda, columna, opciones);

type Escritor = (dato: unknown, columna: Columna) => unknown;

/** Cómo se escribe cada tipo al exportar: el mismo formato que se acepta al importar. */
const ESCRITORES: Partial<Record<TipoDeColumna, Escritor>> = {
  fecha: (dato) => new Date(`${String(dato)}T00:00:00Z`),
  decimal: (dato) => Number(dato),
  siNo: (dato) => (dato ? 'Sí' : 'No'),
  lista: (dato, columna) => (columna.tipo === 'lista' ? columna.opciones[String(dato)] : undefined) ?? dato,
};

/** El valor de la celda al exportar; de una referencia, el nombre de lo elegido. */
export function escribirCelda(registro: Record<string, unknown>, columna: Columna): unknown {
  if (columna.tipo === 'referencia') return registro[columna.campoDeNombre] ?? null;
  const dato = registro[columna.clave];
  if (dato === null || dato === undefined) return null;
  return ESCRITORES[columna.tipo]?.(dato, columna) ?? dato;
}
