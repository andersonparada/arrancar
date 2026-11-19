import type { Operador } from '../../../core/compartido/aplicacion/operador.js';
import type { ClaveDePlantilla } from '../../dominio/formatos-de-cheque/plantillas.js';
import type { FormatoDeCheque } from '../../dominio/formatos-de-cheque/tipos.js';
import type { DetalleDelOrigenDto, ImpresionRegistradaDto } from '../dto/impresion-de-cheque.dto.js';

/** Un cheque con todo lo que hace falta para imprimirlo: de su chequera, de su movimiento y de su cuenta. */
export interface ChequeParaImprimir {
  chequeId: string;
  numero: number;
  estado: 'disponible' | 'emitido' | 'anulado';
  impresoEn: Date | null;
  noNegociable: boolean;
  chequeraId: string;
  serie: string | null;
  chequeraDeApertura: boolean;
  formatoDeChequeId: string | null;
  plantillaDeCheque: ClaveDePlantilla | null;
  /** `null` mientras el cheque no se emite. */
  movimiento: {
    id: string;
    fecha: string;
    montoCentavos: number;
    beneficiario: string;
    conceptoNombre: string;
    referencia: string | null;
    observaciones: string | null;
    paraAbonoEnCuenta: boolean;
    moduloDeOrigen: string | null;
    /** Quien emitió el cheque (el que creó el movimiento). */
    elaboro: string | null;
  } | null;
  cuenta: { nombre: string; numero: string; banco: string };
  /** Cuántas veces se imprimió (original y reimpresiones). */
  impresiones: number;
}

/** Lo que se guarda de cada impresión: el formato resuelto que se usó, tal cual. */
export interface NuevaImpresionDeCheque {
  empresaId: string;
  chequeId: string;
  movimientoId: string;
  tipo: 'original' | 'reimpresion';
  conCheque: boolean;
  motivo: string | null;
  loteId: string | null;
  formato: FormatoDeCheque;
}

/** Lecturas para imprimir: los cheques y su historia de impresiones. */
export interface ConsultasDeImpresionDeCheques {
  /** Los cheques pedidos con lo necesario para imprimir; los que no existan o no sean de la empresa no vienen. */
  chequesParaImprimir(ids: readonly string[]): Promise<ChequeParaImprimir[]>;
  /** Las impresiones de un cheque, de la primera a la última. */
  historial(chequeId: string): Promise<ImpresionRegistradaDto[]>;
}

/** Solo agrega: una impresión no se cambia ni se borra. */
export interface RepositorioDeImpresionesDeCheques {
  agregar(impresion: NuevaImpresionDeCheque): Promise<void>;
}

/** Los datos de la empresa activa que encabezan el comprobante de egreso (los da el módulo Empresas por el mediador). */
export interface DatosDeLaEmpresaParaCheques {
  obtener(operador: Operador): Promise<{ nombre: string; nit: string | null }>;
}

/**
 * El detalle del documento que originó el cheque (hoy, el pago de Cuentas por pagar con sus retenciones). Devuelve `null`
 * si el cheque nació en Bancos, si el módulo de origen no está activo o si no sabe dar detalle: el comprobante sale sin él.
 */
export interface DetallesDelOrigen {
  de(
    operador: Operador,
    movimiento: { moduloDeOrigen: string; movimientoId: string },
  ): Promise<DetalleDelOrigenDto | null>;
}
