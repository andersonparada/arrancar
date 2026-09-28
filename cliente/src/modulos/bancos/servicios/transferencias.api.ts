import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';

/** Transferencia tal como la manda el servidor, con el nombre de sus dos cuentas y sus dos notas. */
export interface Transferencia {
  id: string;
  cuentaOrigenId: string;
  cuentaOrigenNombre: string | null;
  cuentaDestinoId: string;
  cuentaDestinoNombre: string | null;
  fecha: string;
  monto: string;
  referencia: string | null;
  observaciones: string | null;
  anuladaEn: string | null;
  motivoDeAnulacion: string | null;
  movimientoOrigenId: string;
  movimientoDestinoId: string;
}

export type DatosTransferencia = Omit<
  Transferencia,
  | 'id'
  | 'cuentaOrigenNombre'
  | 'cuentaDestinoNombre'
  | 'anuladaEn'
  | 'motivoDeAnulacion'
  | 'movimientoOrigenId'
  | 'movimientoDestinoId'
>;

const RUTA = '/bancos/transferencias';

/** Sin listar ni exportar: las transferencias se registran y se anulan desde la lista de movimientos. */
export class ApiTransferencias {
  constructor(private readonly http: ClienteHttp) {}

  obtener(id: string) {
    return this.http.obtener<Transferencia>(`${RUTA}/${id}`);
  }

  crear(datos: DatosTransferencia) {
    return this.http.crear<Transferencia>(RUTA, datos);
  }

  /** Anula la transferencia y sus dos notas; no se puede deshacer y no hay ruta para eliminar. */
  anular(id: string, motivo: string) {
    return this.http.crear<Transferencia>(`${RUTA}/${id}/anular`, { motivo });
  }
}

export const apiTransferencias = new ApiTransferencias(clienteHttp);
