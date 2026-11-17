import { EventoDominio } from '../../core/compartido/dominio/evento-dominio.js';
import type { EfectoDeReintegro, FormaDeReintegro } from './reintegros.js';

/** Lo que un reintegro devolvió de una nota, para que Contabilidad reparta la partida. */
export interface NotaDelEvento {
  documentoId: string;
  montoCentavos: number;
  /** La factura de la nota (o la nota misma) es de activo fijo: el depósito va a Inversión. */
  tieneActivoFijo: boolean;
}

export interface DatosDeReintegroRegistrado {
  empresaId: string;
  reintegroId: string;
  numero: number;
  proveedorId: string;
  forma: FormaDeReintegro;
  fecha: string;
  montoCentavos: number;
  movimientoId: string | null;
  efecto: EfectoDeReintegro;
  notas: NotaDelEvento[];
}

/** Se registró un reintegro del proveedor (cobro por depósito o en efectivo). Se publica tras confirmar la transacción. */
export class ReintegroRegistrado extends EventoDominio<DatosDeReintegroRegistrado> {
  readonly nombre = 'cuentas-por-pagar.reintegro_registrado';

  constructor(datos: DatosDeReintegroRegistrado) {
    super(datos);
  }
}

export interface DatosDeReintegroAnulado {
  empresaId: string;
  reintegroId: string;
  /** La fecha contable de la anulación (CP5-a). */
  fecha: string;
  /** La del reintegro. */
  fechaOriginal: string;
  montoCentavos: number;
  forma: FormaDeReintegro;
  efecto: EfectoDeReintegro;
  /** `null` en el efectivo: nada se anula en Bancos. */
  anulacionEnBancos: 'sin_inverso' | 'con_inverso' | null;
}

/** Se anuló un reintegro: Contabilidad revierte su partida con `fecha` (o la cancela si fue «sin inverso»). */
export class ReintegroAnulado extends EventoDominio<DatosDeReintegroAnulado> {
  readonly nombre = 'cuentas-por-pagar.reintegro_anulado';

  constructor(datos: DatosDeReintegroAnulado) {
    super(datos);
  }
}
