import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import { intercambioDe } from '@/modulos/core/servicios/intercambio';

/** Un cheque emitido que el banco no ha cobrado y ya pasó el plazo de vencimiento. */
export interface ChequeCaduco {
  chequeId: string;
  movimientoId: string;
  cuentaBancariaId: string;
  cuentaBancariaNombre: string;
  serie: string | null;
  numero: number;
  fecha: string;
  diasDeAntiguedad: number;
  beneficiario: string | null;
  monto: string;
  /** Si el mes del cheque ya está conciliado: anularlo exige una nota inversa. */
  mesConciliado: boolean;
  origen: 'cuentas_por_pagar' | 'suelto';
}

export interface ReporteDeChequesCaducos {
  /** Los meses con que se armó el reporte: el filtro o la variable de la empresa. */
  mesesDeAntiguedad: number;
  /** Aparecen los cheques con fecha anterior a esta. */
  fechaDeCorte: string;
  totalDeCheques: number;
  montoTotal: string;
  cheques: ChequeCaduco[];
}

/** Lo que se manda al servidor; sin `meses`, manda la variable de la empresa. */
export interface FiltroDeChequesCaducos {
  cuentaBancariaId?: string;
  beneficiario?: string;
  meses?: number;
  [clave: string]: string | number | undefined;
}

/** Lo que se manda al anular en lote: `fecha` es la de todas las notas inversas. */
export interface AnulacionEnLote {
  chequeIds: string[];
  motivo: string;
  fecha: string;
}

export interface ResultadoDeAnulacionEnLote {
  totalDeCheques: number;
  montoTotal: string;
  fecha: string;
}

const RUTA = '/bancos/cheques-caducos';

/** El reporte de cheques caducos, su Excel y su anulación en lote (todo o nada, con nota inversa). */
export class ApiChequesCaducos {
  constructor(private readonly http: ClienteHttp) {}

  /** Solo exportar (es reporte), con el mismo filtro que la pantalla. */
  get intercambio() {
    return intercambioDe(this.http, RUTA);
  }

  reporte(filtro: FiltroDeChequesCaducos = {}) {
    return this.http.obtener<ReporteDeChequesCaducos>(RUTA, filtro);
  }

  anularEnLote(datos: AnulacionEnLote) {
    return this.http.crear<ResultadoDeAnulacionEnLote>('/bancos/cheques/anular-en-lote', datos);
  }
}

export const apiChequesCaducos = new ApiChequesCaducos(clienteHttp);
