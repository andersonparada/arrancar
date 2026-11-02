import { tipoDePersonaDelNombre, type TipoDePersonaDelProveedor } from './tipo-de-persona-del-nombre.js';

export interface NombreDePersona {
  nombres: string;
  apellidos: string | null;
}

/** Las dos formas en que se puede crear el proveedor y la que se propone, para que el usuario cambie de tipo sin partir nada. */
export interface PropuestaDeProveedorNuevo {
  tipoDePersona: TipoDePersonaDelProveedor;
  individual: NombreDePersona;
  juridica: { razonSocial: string };
}

/** Partículas que van pegadas a la palabra que sigue: «DE LEON», «DE LA CRUZ», «VDA. DE PEREZ». */
const PARTICULAS = new Set(['DE', 'DEL', 'LA', 'LAS', 'LOS', 'Y', 'VDA', 'VDA.']);

function sinEspaciosRepetidos(texto: string): string {
  return texto.replace(/\s+/g, ' ').trim();
}

function unir(partes: readonly string[]): string | null {
  const texto = partes.filter(Boolean).join(' ');
  return texto || null;
}

/** Las palabras del nombre, con cada partícula pegada a la palabra que le sigue. */
function palabrasConParticulas(texto: string): string[] {
  const resultado: string[] = [];
  let pendientes: string[] = [];
  for (const palabra of sinEspaciosRepetidos(texto).split(' ').filter(Boolean)) {
    pendientes.push(palabra);
    if (PARTICULAS.has(palabra.toUpperCase())) continue;
    resultado.push(pendientes.join(' '));
    pendientes = [];
  }
  if (pendientes.length > 0) resultado.push(pendientes.join(' '));
  return resultado;
}

/** Sin coma: 1 palabra son nombres; 2, uno y uno; 3, un nombre y dos apellidos; 4 o más, dos nombres y el resto apellidos. */
function partirPorPalabras(texto: string): NombreDePersona {
  const palabras = palabrasConParticulas(texto);
  const cuantosNombres = palabras.length >= 4 ? 2 : 1;
  return { nombres: palabras.slice(0, cuantosNombres).join(' '), apellidos: unir(palabras.slice(cuantosNombres)) };
}

/** `PARADA,ALVIZURES,,ANDERSON,MAGDIEL`: tres apellidos (el tercero, de casada, con «DE» delante) y dos nombres. */
function partirFormatoDelRtu(campos: readonly string[]): NombreDePersona | null {
  const [apellido1, apellido2, casada, nombre1, nombre2] = campos as [string, string, string, string, string];
  const deCasada = casada && !/^DE\s/i.test(casada) ? `DE ${casada}` : casada;
  const nombres = unir([nombre1, nombre2]);
  if (nombres === null) return null;
  return { nombres, apellidos: unir([apellido1, apellido2, deCasada]) };
}

/** `NOMBRES , APELLIDOS`: así escribe la SAT a las personas en su FPEQ y en G4S Documenta. */
function partirConUnaComa(campos: readonly string[]): NombreDePersona | null {
  const [nombres, apellidos] = campos as [string, string];
  return nombres && apellidos ? { nombres, apellidos } : null;
}

/**
 * Parte el nombre que trae el DTE de una persona en nombres y apellidos, sin cambiar su escritura (solo quita espacios
 * repetidos): con 4 comas es el formato del RTU, con una es `NOMBRES , APELLIDOS` y sin coma se parte por palabras.
 * Es una propuesta: el usuario la revisa antes de crear el proveedor.
 */
export function partirNombreDePersona(nombreDelDte: string): NombreDePersona {
  const campos = nombreDelDte.split(',').map(sinEspaciosRepetidos);
  const partido =
    campos.length === 5 ? partirFormatoDelRtu(campos) : campos.length === 2 ? partirConUnaComa(campos) : null;
  return partido ?? partirPorPalabras(campos.join(' '));
}

/** La propuesta de tipo, nombres y razón social para el proveedor nuevo de un DTE, a partir del nombre del emisor. */
export function propuestaDeProveedorNuevo(nombreDelDte: string): PropuestaDeProveedorNuevo {
  return {
    tipoDePersona: tipoDePersonaDelNombre(nombreDelDte),
    individual: partirNombreDePersona(nombreDelDte),
    juridica: { razonSocial: sinEspaciosRepetidos(nombreDelDte) },
  };
}
