import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import type { DatosDeBaja } from './datos-de-baja';
import type { Movimiento } from './movimientos.api';
import type { DatosDeReclasificacion, ResultadoDeReclasificacion } from './notas.api';

/** Por qué se anuló un cheque (nulo si no está anulado). */
export type CausaDeAnulacion = 'manual' | 'caducidad';

export type EstadoDelCheque = 'disponible' | 'emitido' | 'anulado';

/** Cheque tal como lo manda el servidor. */
export interface Cheque {
  id: string;
  chequeraId: string;
  numero: number;
  estado: EstadoDelCheque;
  noNegociable: boolean;
  movimientoId: string | null;
  anuladoEn: string | null;
  motivoDeAnulacion: string | null;
  causaDeAnulacion: CausaDeAnulacion | null;
  /** Lo calcula el servidor: si se puede anular. */
  puedeAnular: boolean;
  /** Lo calcula el servidor: si se puede blanquear (emitido, con su movimiento limpio). */
  puedeBlanquear: boolean;
}

export interface DatosDeEmisionDeCheque {
  fecha: string;
  monto: string;
  beneficiario: string;
  noNegociable: boolean;
  /** El concepto que clasifica el pago (un cheque cuenta como débito). */
  conceptoId: string;
  referencia: string | null;
  observaciones: string | null;
}

/** Un cheque emitido o anulado en la lista de la empresa, con los datos de su movimiento si llegó a emitirse. */
export interface ChequeListado {
  id: string;
  numero: number;
  serie: string | null;
  cuentaBancariaId: string;
  cuentaBancariaNombre: string;
  estado: 'emitido' | 'anulado';
  noNegociable: boolean;
  fecha: string;
  monto: string | null;
  beneficiario: string | null;
  referencia: string | null;
  anuladoEn: string | null;
  motivoDeAnulacion: string | null;
  causaDeAnulacion: CausaDeAnulacion | null;
  puedeAnular: boolean;
  puedeBlanquear: boolean;
}

export interface FiltroDeChequesDeLaEmpresa {
  cuentaBancariaId?: string | null;
  estado?: 'emitido' | 'anulado' | null;
  desde?: string;
  hasta?: string;
}

/** Ver, emitir, anular y blanquear cheques (nunca se eliminan): la lista es operación (los emitidos y anulados); sin Excel. */
export class ApiCheques {
  constructor(private readonly http: ClienteHttp) {}

  /** Los cheques emitidos y anulados de la empresa; los disponibles se ven en su chequera. */
  listar(filtro: FiltroDeChequesDeLaEmpresa) {
    const { cuentaBancariaId, estado, desde, hasta } = filtro;
    return this.http.obtener<ChequeListado[]>('/bancos/cheques', {
      ...(cuentaBancariaId ? { cuentaBancariaId } : {}),
      ...(estado ? { estado } : {}),
      ...(desde ? { desde } : {}),
      ...(hasta ? { hasta } : {}),
    });
  }

  listarDeLaChequera(chequeraId: string, estado?: EstadoDelCheque) {
    return this.http.obtener<Cheque[]>(`/bancos/chequeras/${chequeraId}/cheques`, estado ? { estado } : undefined);
  }

  siguienteDisponible(cuentaBancariaId: string) {
    return this.http.obtener<Cheque | null>(`/bancos/cuentas-bancarias/${cuentaBancariaId}/siguiente-cheque`);
  }

  emitir(chequeId: string, datos: DatosDeEmisionDeCheque) {
    return this.http.crear<Movimiento>(`/bancos/cheques/${chequeId}/emitir`, datos);
  }

  /**
   * Anula el cheque (disponible o emitido). `fecha` solo cuenta si el mes del cheque ya está conciliado:
   * es la de su nota de crédito inversa; si no, se anula sin nota inversa.
   */
  anular(chequeId: string, { motivo, fecha }: DatosDeBaja) {
    return this.http.crear<Cheque>(`/bancos/cheques/${chequeId}/anular`, { motivo, fecha });
  }

  /** Cambia solo el concepto de cheques ya emitidos (pide `bancos.cheques.reclasificar`); queda en la auditoría. */
  reclasificar(datos: DatosDeReclasificacion) {
    return this.http.crear<ResultadoDeReclasificacion>('/bancos/cheques/reclasificar', datos);
  }

  /** Blanquea un cheque emitido por error: vuelve a disponible y su movimiento se elimina. */
  blanquear(chequeId: string, motivo: string) {
    return this.http.crear<Cheque>(`/bancos/cheques/${chequeId}/blanquear`, { motivo });
  }
}

export const apiCheques = new ApiCheques(clienteHttp);
