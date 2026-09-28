import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import type { Movimiento } from './movimientos.api';

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
}

export interface DatosDeEmisionDeCheque {
  fecha: string;
  monto: string;
  beneficiario: string;
  noNegociable: boolean;
  referencia: string | null;
  observaciones: string | null;
}

/** Emitir y anular cheques: desde Movimientos (operación); sin Excel. */
export class ApiCheques {
  constructor(private readonly http: ClienteHttp) {}

  listarDeLaChequera(chequeraId: string, estado?: EstadoDelCheque) {
    return this.http.obtener<Cheque[]>(`/bancos/chequeras/${chequeraId}/cheques`, estado ? { estado } : undefined);
  }

  siguienteDisponible(cuentaBancariaId: string) {
    return this.http.obtener<Cheque | null>(`/bancos/cuentas-bancarias/${cuentaBancariaId}/siguiente-cheque`);
  }

  emitir(chequeId: string, datos: DatosDeEmisionDeCheque) {
    return this.http.crear<Movimiento>(`/bancos/cheques/${chequeId}/emitir`, datos);
  }

  /** Anula el cheque (disponible o emitido) con un motivo; no se puede deshacer. */
  anular(chequeId: string, motivo: string) {
    return this.http.crear<Cheque>(`/bancos/cheques/${chequeId}/anular`, { motivo });
  }
}

export const apiCheques = new ApiCheques(clienteHttp);
