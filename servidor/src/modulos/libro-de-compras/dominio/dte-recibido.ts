import { DatoInvalido } from '../../core/compartido/dominio/errores.js';
import { Entidad } from '../../core/compartido/dominio/entidad.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { exigirTransicion, type EstadoDeDte, type EstadoDeDteEnLaSat, type MotivoDeBloqueo } from './estado-de-dte.js';
import type { TipoDte } from './tipos-de-documento.js';

export type DteRecibidoId = Identificador<'DteRecibido'>;

/** Los datos del DTE tal como los dice la SAT: solo los escribe la importación. Los montos viajan como texto. */
export interface DatosDelDte {
  autorizacionFel: string;
  tipoDte: TipoDte;
  serie: string;
  numero: string;
  fechaEmision: string;
  nitEmisor: string;
  nombreEmisor: string;
  nitReceptor: string;
  total: string;
  iva: string;
  idp: string;
  otrosImpuestos: string;
  otrosImpuestosDetalle: Record<string, string>;
  filaOriginal: Record<string, string>;
  estadoSat: EstadoDeDteEnLaSat;
  anuladoEnLaSatEl: string | null;
}

/** Lo que el usuario completa antes de confirmar; se puede llenar en varias sesiones. */
export interface BorradorDelDte {
  proveedorId: string | null;
  conceptoId: string | null;
  destino: 'cuentas-por-pagar' | 'caja-chica' | 'cuentas-por-liquidar' | null;
  fechaRecepcion: string | null;
  periodo: string | null;
  noVinculado: boolean;
  documentoAfectadoId: string | null;
}

/** Dónde está la fila en la bandeja y por qué. */
export interface SituacionEnLaBandeja {
  estado: EstadoDeDte;
  documentoId: string | null;
  motivoDeDescarte: string | null;
  descartadoEn: Date | null;
  descartadoPor: string | null;
  motivoDeBloqueo: MotivoDeBloqueo | null;
}

export interface PropiedadesDeDteRecibido extends DatosDelDte, BorradorDelDte, SituacionEnLaBandeja {
  id: DteRecibidoId;
  empresaId: Identificador<'Empresa'>;
  /** El último lote que trajo la fila. */
  loteId: string;
  /** El lote que la creó. */
  primerLoteId: string;
}

/** Quién descarta, cuándo y por qué. */
export interface DescarteDeDte {
  motivo: string;
  por: string;
  en: Date;
}

const MAXIMO_DEL_MOTIVO = 300;
const BORRADOR_VACIO: BorradorDelDte = {
  proveedorId: null,
  conceptoId: null,
  destino: null,
  fechaRecepcion: null,
  periodo: null,
  noVinculado: false,
  documentoAfectadoId: null,
};
const LIMPIA: Omit<SituacionEnLaBandeja, 'estado'> = {
  documentoId: null,
  motivoDeDescarte: null,
  descartadoEn: null,
  descartadoPor: null,
  motivoDeBloqueo: null,
};

/** El DTE que se descarta lleva un motivo de 1 a 300 caracteres. */
export class MotivoDeDescarteInvalido extends DatoInvalido {
  readonly codigo = 'motivo_de_descarte_invalido';

  constructor() {
    super('Escriba el motivo del descarte (hasta 300 caracteres).');
  }
}

/** Una fila de la bandeja de DTE recibidos. Los datos de la SAT no cambian aquí: el estado sí, con sus transiciones. */
export class DteRecibido extends Entidad<DteRecibidoId> {
  private constructor(private propiedades: PropiedadesDeDteRecibido) {
    super(propiedades.id);
  }

  /** Una fila nueva: entra `pendiente` y con el borrador vacío. */
  static crear(origen: {
    empresaId: Identificador<'Empresa'>;
    loteId: string;
    datos: DatosDelDte;
    borrador?: Partial<BorradorDelDte>;
  }): DteRecibido {
    const { empresaId, loteId, datos, borrador } = origen;
    return new DteRecibido({
      ...datos,
      ...BORRADOR_VACIO,
      ...borrador,
      ...LIMPIA,
      estado: 'pendiente',
      id: Identificador.nuevo(),
      empresaId,
      loteId,
      primerLoteId: loteId,
    });
  }

  static reconstruir(propiedades: PropiedadesDeDteRecibido): DteRecibido {
    return new DteRecibido(propiedades);
  }

  get estado(): EstadoDeDte {
    return this.propiedades.estado;
  }

  /** @throws TransicionDeDteInvalida si ya está registrada. */
  registrar(documentoId: string): void {
    this.mover('registrado', { documentoId });
  }

  /** Vuelve a `pendiente`: se anuló o eliminó su documento, se restauró un descarte o se liberó un bloqueo. */
  devolverAPendiente(): void {
    this.mover('pendiente', {});
  }

  /** @throws MotivoDeDescarteInvalido si el motivo está vacío o pasa de 300; TransicionDeDteInvalida si no se puede. */
  descartar({ motivo, por, en }: DescarteDeDte): void {
    const limpio = motivo.trim();
    if (limpio.length === 0 || limpio.length > MAXIMO_DEL_MOTIVO) throw new MotivoDeDescarteInvalido();
    this.mover('descartado', { motivoDeDescarte: limpio, descartadoPor: por, descartadoEn: en });
  }

  /** @throws TransicionDeDteInvalida si no está pendiente. */
  bloquear(motivo: MotivoDeBloqueo): void {
    this.mover('bloqueado', { motivoDeBloqueo: motivo });
  }

  /** Copia de solo lectura de sus propiedades, para guardarla. */
  instantanea(): Readonly<PropiedadesDeDteRecibido> {
    return { ...this.propiedades };
  }

  private mover(hacia: EstadoDeDte, datos: Partial<SituacionEnLaBandeja>): void {
    exigirTransicion(this.propiedades.estado, hacia);
    this.propiedades = { ...this.propiedades, ...LIMPIA, ...datos, estado: hacia };
  }
}
