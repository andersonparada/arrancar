import { ParcelaInvalida } from './errores-de-parcela.js';

const CODIGO_VALIDO = /^[A-Z0-9-]{1,20}$/;
const COORDENADA = /^-?\d{1,3}(\.\d{1,6})?$/;

/** Los límites aproximados de Guatemala (`docs/modulos/diseno-parcelas.md` §3.7): fuera de ellos solo se avisa. */
const LIMITES_DE_GUATEMALA = { latitud: [13.5, 18.0], longitud: [-92.3, -88.2] } as const;

/** Recorta un texto; vacío es «sin dato». */
export function textoOpcional(texto: string | null, campo: string, largoMaximo: number): string | null {
  const limpio = texto?.trim();
  if (!limpio) return null;
  if (limpio.length > largoMaximo) throw new ParcelaInvalida(`"${campo}" admite hasta ${largoMaximo} caracteres.`);
  return limpio;
}

/** El texto obligatorio, recortado y con su largo máximo. */
export function textoObligatorio(texto: string, campo: string, largoMaximo: number): string {
  const limpio = textoOpcional(texto, campo, largoMaximo);
  if (!limpio) throw new ParcelaInvalida(`Escriba "${campo}".`);
  return limpio;
}

/** El código va en mayúsculas, con letras, dígitos y guiones (hasta 20), como el de las localidades. */
export function codigoValido(codigo: string): string {
  const limpio = codigo.trim().toUpperCase();
  if (!CODIGO_VALIDO.test(limpio)) {
    throw new ParcelaInvalida('El código admite letras, números y guiones, hasta 20 caracteres.');
  }
  return limpio;
}

function coordenada(valor: string | null, campo: string, limite: number): string | null {
  if (valor === null) return null;
  const limpio = valor.trim();
  if (!COORDENADA.test(limpio) || Math.abs(Number(limpio)) > limite) {
    throw new ParcelaInvalida(`"${campo}" no es una coordenada válida (hasta 6 decimales).`);
  }
  return limpio;
}

/** El punto en el mapa: la latitud y la longitud van juntas o ninguna, dentro del rango del planeta. */
export function puntoValido(
  latitud: string | null,
  longitud: string | null,
): { latitud: string | null; longitud: string | null } {
  if ((latitud === null) !== (longitud === null)) {
    throw new ParcelaInvalida('Escriba la latitud y la longitud juntas, o ninguna.');
  }
  return { latitud: coordenada(latitud, 'Latitud', 90), longitud: coordenada(longitud, 'Longitud', 180) };
}

/** Avisos (nunca bloqueos) sobre el punto: el error más común es invertir el signo o el orden de las coordenadas. */
export function avisosDelPunto(latitud: string | null, longitud: string | null): string[] {
  if (latitud === null || longitud === null) return [];
  const [latitudMinima, latitudMaxima] = LIMITES_DE_GUATEMALA.latitud;
  const [longitudMinima, longitudMaxima] = LIMITES_DE_GUATEMALA.longitud;
  const dentro =
    Number(latitud) >= latitudMinima &&
    Number(latitud) <= latitudMaxima &&
    Number(longitud) >= longitudMinima &&
    Number(longitud) <= longitudMaxima;
  return dentro
    ? []
    : ['El punto queda fuera de Guatemala: revise que la latitud y la longitud tengan su signo y su orden.'];
}
