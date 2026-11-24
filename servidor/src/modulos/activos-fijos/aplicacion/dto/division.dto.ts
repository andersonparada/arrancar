import type { CausaDeDivision, EstadoDeDivision } from '../../dominio/division.js';

/** Una división tal como la ve el usuario: dinero con dos decimales; el código del activo nuevo se conserva al anular. */
export interface DivisionDto {
  id: string;
  activoOrigenId: string;
  activoNuevoId: string | null;
  codigoDelActivoNuevo: string;
  fecha: string;
  periodo: string;
  cantidadOriginal: number;
  cantidadSeparada: number;
  causa: CausaDeDivision;
  motivo: string;
  costoSeparado: string;
  costoFiscalSeparado: string;
  acumuladaContableSeparada: string;
  acumuladaFiscalSeparada: string;
  residualSeparado: string;
  estado: EstadoDeDivision;
  anuladoEn: string | null;
  motivoDeAnulacion: string | null;
}

/** Lo que se recibe para dividir a mano: cuántas piezas se separan, desde cuándo, por qué y con qué código. */
export interface SolicitudDeDivision {
  cantidad: number;
  fecha: string;
  motivo: string;
  /** El código del activo nuevo; sin él se propone el siguiente. */
  codigo: string | null;
}

/** Separar un activo de N piezas en N activos de una (hasta 200 en total). */
export interface SolicitudDeSepararEnUnidades {
  fecha: string;
  motivo: string;
  /** Los códigos de los activos nuevos, en orden; los que falten se proponen. */
  codigos: string[];
}
