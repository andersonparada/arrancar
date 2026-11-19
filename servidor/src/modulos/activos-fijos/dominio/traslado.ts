import { Entidad } from '../../core/compartido/dominio/entidad.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { TrasladoInvalido, TrasladoNoAnulable } from './errores-de-traslado.js';
import { textoOpcional } from './reglas-de-activo.js';

export type TrasladoId = Identificador<'Traslado'>;
export type EstadoDeTraslado = 'vigente' | 'anulado';

const RECIBIDO_POR_MAXIMO = 150;
const MOTIVO_MAXIMO = 300;

/** Dónde queda el activo: la ubicación nueva y si se guarda en la bodega de activos (AFI). */
export interface DestinoDeTraslado {
  localidadId: string | null;
  departamentoId: string | null;
  responsable: string | null;
  aBodega: boolean;
}

/** Lo que escribe quien traslada: la fecha, el destino, quien recibe y por qué. */
export interface DatosDeTraslado extends DestinoDeTraslado {
  fecha: string;
  recibidoPor: string;
  motivo: string;
}

/** La boleta a la que pertenece el traslado: su grupo y el número que le tocó del correlativo. */
export interface BoletaDeTraslado {
  grupoId: string;
  numero: number;
  anioDeNumero: number;
}

export interface PropiedadesDeTraslado extends DatosDeTraslado, BoletaDeTraslado {
  id: TrasladoId;
  empresaId: Identificador<'Empresa'>;
  activoId: string;
  estado: EstadoDeTraslado;
  anuladoEn: Date | null;
  anuladoPor: string | null;
  motivoDeAnulacion: string | null;
}

function textoObligatorio(valor: string, { nombre, maximo }: { nombre: string; maximo: number }): string {
  const limpio = valor.trim();
  if (!limpio) throw new TrasladoInvalido(`Escriba ${nombre}.`);
  if (limpio.length > maximo) throw new TrasladoInvalido(`${nombre} no puede pasar de ${maximo} caracteres.`);
  return limpio;
}

/**
 * Un renglón de una boleta de traslado: un activo que cambia de ubicación (diseño §5.11). El historial no se borra:
 * un traslado equivocado se anula y la fila queda como rastro.
 */
export class Traslado extends Entidad<TrasladoId> {
  private constructor(private propiedades: PropiedadesDeTraslado) {
    super(propiedades.id);
  }

  /**
   * @throws TrasladoInvalido si la fecha es futura o falta quien recibe o el motivo.
   */
  static registrar(
    entrada: { empresaId: Identificador<'Empresa'>; activoId: string } & BoletaDeTraslado,
    datos: DatosDeTraslado,
    hoy: string,
  ): Traslado {
    if (datos.fecha > hoy) throw new TrasladoInvalido('La fecha del traslado no puede ser futura.');
    const { fecha, localidadId, departamentoId, aBodega } = datos;
    return new Traslado({
      ...entrada,
      fecha,
      localidadId,
      departamentoId,
      aBodega,
      id: Identificador.nuevo(),
      responsable: textoOpcional(datos.responsable, 'Responsable', 150),
      recibidoPor: textoObligatorio(datos.recibidoPor, { nombre: 'quien recibe', maximo: RECIBIDO_POR_MAXIMO }),
      motivo: textoObligatorio(datos.motivo, { nombre: 'el motivo', maximo: MOTIVO_MAXIMO }),
      estado: 'vigente',
      anuladoEn: null,
      anuladoPor: null,
      motivoDeAnulacion: null,
    });
  }

  static reconstruir(propiedades: PropiedadesDeTraslado): Traslado {
    return new Traslado(propiedades);
  }

  /**
   * @throws TrasladoNoAnulable si ya está anulado.
   * @throws TrasladoInvalido si falta el motivo.
   */
  anular({ motivo, usuarioId, ahora }: { motivo: string; usuarioId: string; ahora: Date }): void {
    if (this.propiedades.estado === 'anulado') throw new TrasladoNoAnulable();
    const limpio = textoObligatorio(motivo, { nombre: 'el motivo de la anulación', maximo: MOTIVO_MAXIMO });
    this.propiedades = {
      ...this.propiedades,
      estado: 'anulado',
      anuladoEn: ahora,
      anuladoPor: usuarioId,
      motivoDeAnulacion: limpio,
    };
  }

  instantanea(): Readonly<PropiedadesDeTraslado> {
    return { ...this.propiedades };
  }
}
