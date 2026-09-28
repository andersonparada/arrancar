import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import type { FiltroDeMovimientos, Movimiento } from './movimientos.api';

/** Lo que se manda al registrar o corregir una nota; nunca lleva `saldoInicial` (eso se registra en la cuenta). */
export type DatosNota = Omit<
  Movimiento,
  | 'id'
  | 'saldoInicial'
  | 'cuentaBancariaNombre'
  | 'anuladoEn'
  | 'motivoDeAnulacion'
  | 'transferenciaId'
  | 'chequeId'
  | 'numeroDeCheque'
  | 'conciliacionId'
> & { tipo: 'credito' | 'debito' };

const RUTA = '/bancos/notas';

/** Notas de crédito y de débito: registrarlas, corregirlas y anularlas. Sin Excel (es operación). */
export class ApiNotas {
  constructor(private readonly http: ClienteHttp) {}

  listar(filtro: FiltroDeMovimientos = {}) {
    return this.http.obtener<Movimiento[]>(RUTA, filtro);
  }

  obtener(id: string) {
    return this.http.obtener<Movimiento>(`${RUTA}/${id}`);
  }

  crear(datos: DatosNota) {
    return this.http.crear<Movimiento>(RUTA, datos);
  }

  actualizar(id: string, datos: DatosNota) {
    return this.http.reemplazar<Movimiento>(`${RUTA}/${id}`, datos);
  }

  /** Anula la nota con un motivo; no se puede deshacer y no hay ruta para eliminar. */
  anular(id: string, motivo: string) {
    return this.http.crear<Movimiento>(`${RUTA}/${id}/anular`, { motivo });
  }
}

export const apiNotas = new ApiNotas(clienteHttp);
