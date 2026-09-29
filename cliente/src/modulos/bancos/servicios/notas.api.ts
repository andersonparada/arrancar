import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import type { DatosDeBaja } from './datos-de-baja';
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
  | 'revertidoEn'
  | 'motivoDeReversion'
  | 'revierteAId'
  | 'puedeAnular'
  | 'puedeEliminar'
> & { tipo: 'credito' | 'debito' };

const RUTA = '/bancos/notas';

/** Notas de crédito y de débito: registrarlas, corregirlas, anularlas (con su inverso) y eliminarlas. Sin Excel (es operación). */
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

  /** Anula la nota: crea su movimiento inverso con la fecha escrita. Nada se borra. */
  anular(id: string, { motivo, fecha }: DatosDeBaja) {
    return this.http.crear<Movimiento>(`${RUTA}/${id}/anular`, { motivo, fecha });
  }

  /** Elimina de verdad una nota limpia; el motivo queda en la auditoría. */
  eliminar(id: string, motivo: string) {
    return this.http.eliminar(`${RUTA}/${id}`, { motivo });
  }
}

export const apiNotas = new ApiNotas(clienteHttp);
