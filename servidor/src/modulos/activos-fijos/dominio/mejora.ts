import { Entidad } from '../../core/compartido/dominio/entidad.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { MejoraInvalida, MejoraNoAnulable } from './errores-de-mejora.js';

export const CLASES_DE_MEJORA = ['mejora', 'costo_posterior'] as const;
export type ClaseDeMejora = (typeof CLASES_DE_MEJORA)[number];
export type EstadoDeMejora = 'vigente' | 'anulada';
export type MejoraId = Identificador<'Mejora'>;

const DESCRIPCION_MAXIMA = 300;
const VIDA_UTIL_MAXIMA = 1200;

export interface PropiedadesDeMejora {
  id: MejoraId;
  empresaId: Identificador<'Empresa'>;
  activoId: string;
  numero: number;
  anioDeNumero: number;
  clase: ClaseDeMejora;
  fecha: string;
  descripcion: string;
  /** Solo en una mejora: la nueva vida útil contable que le queda al activo. */
  vidaUtilRestanteContableMeses: number | null;
  noEsEdificacion: boolean;
  estado: EstadoDeMejora;
  anuladaEn: Date | null;
  anuladaPor: string | null;
  motivoDeAnulacion: string | null;
}

/** Lo que escribe quien registra una mejora o un costo posterior. */
export interface DatosDeMejora {
  clase: ClaseDeMejora;
  fecha: string;
  descripcion: string;
  vidaUtilRestanteContableMeses: number | null;
  noEsEdificacion: boolean;
}

/** El número que le tocó del correlativo de la empresa. */
export interface NumeroDeMejora {
  numero: number;
  anioDeNumero: number;
}

function exigirDescripcion(descripcion: string): string {
  const limpia = descripcion.trim();
  if (!limpia) throw new MejoraInvalida('Escriba la descripción de la mejora.');
  if (limpia.length > DESCRIPCION_MAXIMA)
    throw new MejoraInvalida(`La descripción no puede pasar de ${DESCRIPCION_MAXIMA} caracteres.`);
  return limpia;
}

function exigirVida({ clase, vidaUtilRestanteContableMeses: vida }: DatosDeMejora): void {
  if (vida === null) return;
  if (clase !== 'mejora') throw new MejoraInvalida('La vida útil restante solo se indica en una mejora.');
  if (!Number.isInteger(vida) || vida < 1 || vida > VIDA_UTIL_MAXIMA)
    throw new MejoraInvalida(`La vida útil restante va de 1 a ${VIDA_UTIL_MAXIMA} meses.`);
}

/** Una mejora (alarga la vida o sube la capacidad) o un costo posterior (flete atrasado, nota de crédito) de un activo en uso. */
export class Mejora extends Entidad<MejoraId> {
  private constructor(private propiedades: PropiedadesDeMejora) {
    super(propiedades.id);
  }

  /** @throws MejoraInvalida si falta la descripción o la vida útil restante no va con la clase. */
  static registrar(
    entrada: { empresaId: Identificador<'Empresa'>; activoId: string } & NumeroDeMejora,
    datos: DatosDeMejora,
  ): Mejora {
    exigirVida(datos);
    return new Mejora({
      ...entrada,
      ...datos,
      id: Identificador.nuevo(),
      descripcion: exigirDescripcion(datos.descripcion),
      estado: 'vigente',
      anuladaEn: null,
      anuladaPor: null,
      motivoDeAnulacion: null,
    });
  }

  static reconstruir(propiedades: PropiedadesDeMejora): Mejora {
    return new Mejora(propiedades);
  }

  /**
   * Anula la mejora con su motivo; la fila queda como rastro.
   * @throws MejoraNoAnulable si ya está anulada.
   * @throws MejoraInvalida si falta el motivo.
   */
  anular({ motivo, usuarioId, ahora }: { motivo: string; usuarioId: string; ahora: Date }): void {
    if (this.propiedades.estado === 'anulada') throw new MejoraNoAnulable();
    const limpio = motivo.trim();
    if (!limpio) throw new MejoraInvalida('Escriba el motivo de la anulación.');
    if (limpio.length > DESCRIPCION_MAXIMA)
      throw new MejoraInvalida(`El motivo no puede pasar de ${DESCRIPCION_MAXIMA} caracteres.`);
    this.propiedades = {
      ...this.propiedades,
      estado: 'anulada',
      anuladaEn: ahora,
      anuladaPor: usuarioId,
      motivoDeAnulacion: limpio,
    };
  }

  instantanea(): Readonly<PropiedadesDeMejora> {
    return { ...this.propiedades };
  }
}
