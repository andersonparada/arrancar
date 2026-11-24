import { normalizar } from '../../core/intercambio/aplicacion/columnas.js';
import type { FuenteDeMedicion } from '../dominio/medicion.js';
import { ParcelaInvalida } from '../dominio/errores-de-parcela.js';
import type { UnidadDeSuperficie } from '../dominio/superficie.js';
import type { SolicitudDeMedicion } from './dto/medicion.dto.js';
import type { ParcelaDto, SolicitudDeParcela } from './dto/parcela.dto.js';

/** La medición inicial que trae una fila del Excel: la cifra como se escribió (la útil en la misma unidad). */
export interface MedicionEnExcel {
  cantidadOriginal: string | null;
  unidadOriginal: UnidadDeSuperficie | null;
  /** Solo la cuerda las lleva; si se omiten, se usan las de la configuración de la empresa. */
  varasPorLadoDeCuerda: number | null;
  cantidadUtil: string | null;
  fuente: FuenteDeMedicion | null;
  vigenteDesde: string | null;
}

/** Una parcela exportada: sus datos, la medición vigente con su cifra original y los nombres de sus inmuebles (con «;»). */
export type FilaDeParcelaEnExcel = ParcelaDto & MedicionEnExcel & { inmuebles: string | null };

/** Una fila importada: la madre y los inmuebles se escriben por su código y su nombre. */
export type SolicitudDeParcelaEnExcel = Omit<SolicitudDeParcela, 'parcelaMadreId' | 'medicion' | 'inmuebles'> &
  MedicionEnExcel & { parcelaMadreCodigo: string | null; inmuebles: string | null };

const SEPARADOR = ';';

/** Los nombres escritos en la celda, uno por inmueble. */
export const nombresDeInmuebles = (texto: string | null): string[] =>
  (texto ?? '')
    .split(SEPARADOR)
    .map((nombre) => nombre.trim())
    .filter(Boolean);

/** Los nombres de los inmuebles de una parcela, como se escriben en la celda. */
export const celdaDeInmuebles = (nombres: readonly string[] | undefined): string | null =>
  nombres?.length ? nombres.join(`${SEPARADOR} `) : null;

/** Busca cada nombre entre los inmuebles de la empresa (sin mayúsculas ni tildes). */
export function inmueblesPorNombre(
  nombres: readonly string[],
  existentes: ReadonlyArray<{ id: string; nombre: string }>,
): string[] {
  const normalizados = nombres.map(normalizar);
  if (new Set(normalizados).size !== normalizados.length) {
    throw new ParcelaInvalida('Un inmueble no puede repetirse en la misma parcela.');
  }
  return nombres.map((nombre) => {
    const encontrado = existentes.find((inmueble) => normalizar(inmueble.nombre) === normalizar(nombre));
    if (!encontrado) throw new ParcelaInvalida(`No existe el inmueble "${nombre}".`);
    return encontrado.id;
  });
}

const sinMedicion = ({ cantidadOriginal, unidadOriginal, cantidadUtil }: MedicionEnExcel) =>
  !cantidadOriginal && !unidadOriginal && !cantidadUtil;

/** La medición de la fila, si trae cifra: toma hoy y «otra» cuando faltan la fecha y la fuente. */
export function medicionDeLaFila(
  fila: MedicionEnExcel,
  predeterminados: { hoy: string; varasPorLadoDeCuerda: number },
): SolicitudDeMedicion | null {
  if (sinMedicion(fila)) return null;
  const { cantidadOriginal, unidadOriginal } = fila;
  if (!cantidadOriginal || !unidadOriginal) {
    throw new ParcelaInvalida('Escriba la superficie y su unidad, o ninguna de las dos.');
  }
  const varas =
    unidadOriginal === 'cuerda'
      ? (fila.varasPorLadoDeCuerda ?? predeterminados.varasPorLadoDeCuerda)
      : fila.varasPorLadoDeCuerda;
  return {
    vigenteDesde: fila.vigenteDesde ?? predeterminados.hoy,
    fuente: fila.fuente ?? 'otra',
    cantidadOriginal,
    unidadOriginal,
    varasPorLadoDeCuerda: varas,
    cantidadUtil: fila.cantidadUtil,
    documento: null,
  };
}
