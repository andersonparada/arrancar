import { Entidad } from '../../core/compartido/dominio/entidad.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { DivisionInvalida, DivisionNoAnulable } from './errores-de-division.js';

export const CAUSAS_DE_DIVISION = ['manual', 'traslado', 'baja', 'inventario', 'separar_en_unidades'] as const;
export type CausaDeDivision = (typeof CAUSAS_DE_DIVISION)[number];
export type EstadoDeDivision = 'vigente' | 'anulada';
export type DivisionId = Identificador<'Division'>;

const MOTIVO_MAXIMO = 300;

export interface PropiedadesDeDivision {
  id: DivisionId;
  empresaId: Identificador<'Empresa'>;
  activoOrigenId: string;
  /** Nulo solo cuando la división se anuló y el activo nuevo se borró. */
  activoNuevoId: string | null;
  /** Copia del código del activo nuevo, para la historia. */
  codigoDelActivoNuevo: string;
  fecha: string;
  /** Primer día del mes desde el que rigen los tramos de la división. */
  periodo: string;
  cantidadOriginal: number;
  cantidadSeparada: number;
  causa: CausaDeDivision;
  motivo: string;
  costoSeparadoCentavos: number;
  costoFiscalSeparadoCentavos: number;
  acumuladaContableSeparadaCentavos: number;
  acumuladaFiscalSeparadaCentavos: number;
  residualSeparadoCentavos: number;
  estado: EstadoDeDivision;
  anuladoEn: Date | null;
  anuladoPor: string | null;
  motivoDeAnulacion: string | null;
}

/** Lo que se sabe al dividir: de dónde sale, qué se llevó el activo nuevo y por qué. */
export type DatosDeDivision = Omit<
  PropiedadesDeDivision,
  'id' | 'estado' | 'anuladoEn' | 'anuladoPor' | 'motivoDeAnulacion'
>;

function motivoLimpio(motivo: string, etiqueta: string): string {
  const limpio = motivo.trim();
  if (!limpio) throw new DivisionInvalida(`Escriba ${etiqueta}.`);
  if (limpio.length > MOTIVO_MAXIMO)
    throw new DivisionInvalida(
      `${etiqueta[0]!.toUpperCase()}${etiqueta.slice(1)} no puede pasar de ${MOTIVO_MAXIMO} caracteres.`,
    );
  return limpio;
}

/** Una división: de un activo con cantidad N salió otro con K unidades y su parte del costo y de lo depreciado. */
export class Division extends Entidad<DivisionId> {
  private constructor(private propiedades: PropiedadesDeDivision) {
    super(propiedades.id);
  }

  /** @throws DivisionInvalida si falta el motivo o las cantidades no son `1 <= k < n`. */
  static registrar(datos: DatosDeDivision): Division {
    const { cantidadSeparada: k, cantidadOriginal: n } = datos;
    if (!Number.isInteger(k) || !Number.isInteger(n) || k < 1 || k >= n)
      throw new DivisionInvalida('La cantidad separada va desde 1 hasta menos que la del activo.');
    return new Division({
      ...datos,
      id: Identificador.nuevo(),
      motivo: motivoLimpio(datos.motivo, 'el motivo de la división'),
      estado: 'vigente',
      anuladoEn: null,
      anuladoPor: null,
      motivoDeAnulacion: null,
    });
  }

  static reconstruir(propiedades: PropiedadesDeDivision): Division {
    return new Division(propiedades);
  }

  /**
   * Anula la división con su motivo: el activo nuevo se borró, así que su llave queda en nulo y el código se conserva.
   * @throws DivisionNoAnulable si ya está anulada.
   * @throws DivisionInvalida si falta el motivo.
   */
  anular({ motivo, usuarioId, ahora }: { motivo: string; usuarioId: string; ahora: Date }): void {
    if (this.propiedades.estado === 'anulada') throw new DivisionNoAnulable();
    this.propiedades = {
      ...this.propiedades,
      activoNuevoId: null,
      estado: 'anulada',
      anuladoEn: ahora,
      anuladoPor: usuarioId,
      motivoDeAnulacion: motivoLimpio(motivo, 'el motivo de la anulación'),
    };
  }

  instantanea(): Readonly<PropiedadesDeDivision> {
    return { ...this.propiedades };
  }
}
