import { EventoDominio } from '../../core/compartido/dominio/evento-dominio.js';
import type { CausaDeAjuste, EfectoDelAjuste } from './ajustes.js';

export interface DatosDeAjusteRegistrado {
  empresaId: string;
  ajusteId: string;
  documentoId: string;
  proveedorId: string;
  /** Serie y número de la nota, para la glosa de la partida. */
  serie: string | null;
  numero: string;
  montoCentavos: number;
  fecha: string;
  causa: CausaDeAjuste;
  efecto: EfectoDelAjuste;
  referencia: string | null;
}

/**
 * Se dio de baja o se trasladó parte del saldo a favor de una nota. Se publica tras confirmar; `efecto` le dice a
 * Contabilidad qué cuenta usar sin adivinar.
 */
export class AjusteRegistrado extends EventoDominio<DatosDeAjusteRegistrado> {
  readonly nombre = 'cuentas-por-pagar.ajuste_registrado';

  constructor(datos: DatosDeAjusteRegistrado) {
    super(datos);
  }
}

export interface DatosDeAjusteAnulado {
  empresaId: string;
  ajusteId: string;
  documentoId: string;
  /** La de la anulación: la reversión va con esa fecha. */
  fecha: string;
  montoCentavos: number;
  efecto: EfectoDelAjuste;
}

/** Un ajuste se anuló y el saldo libre volvió a la nota. Repite monto y efecto para que la reversión no dependa de la fila. */
export class AjusteAnulado extends EventoDominio<DatosDeAjusteAnulado> {
  readonly nombre = 'cuentas-por-pagar.ajuste_anulado';

  constructor(datos: DatosDeAjusteAnulado) {
    super(datos);
  }
}
