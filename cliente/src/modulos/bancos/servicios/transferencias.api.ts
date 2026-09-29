import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import type { DatosDeBaja } from './datos-de-baja';

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
  /** La conciliación donde quedó marcada cada nota; `null` si sigue pendiente. */
  conciliacionOrigenId: string | null;
  conciliacionDestinoId: string | null;
  /** Lo calcula el servidor: si se puede anular (crea los dos inversos). */
  puedeAnular: boolean;
  /** Lo calcula el servidor: si se puede eliminar de verdad (sus dos notas están limpias). */
  puedeEliminar: boolean;
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
  | 'conciliacionOrigenId'
  | 'conciliacionDestinoId'
  | 'puedeAnular'
  | 'puedeEliminar'
>;

/** Qué transferencias listar: de una cuenta (como origen o destino) y entre dos fechas (incluidas); incluye anuladas. */
export interface FiltroDeTransferencias {
  cuentaBancariaId?: string;
  desde?: string;
  hasta?: string;
  [clave: string]: string | undefined;
}

const RUTA = '/bancos/transferencias';

/** Sin Excel (es operación): tiene su propia pantalla para listar, registrar, anular y eliminar. */
export class ApiTransferencias {
  constructor(private readonly http: ClienteHttp) {}

  listar(filtro: FiltroDeTransferencias = {}) {
    return this.http.obtener<Transferencia[]>(RUTA, filtro);
  }

  obtener(id: string) {
    return this.http.obtener<Transferencia>(`${RUTA}/${id}`);
  }

  crear(datos: DatosTransferencia) {
    return this.http.crear<Transferencia>(RUTA, datos);
  }

  /** Anula la transferencia: crea los dos inversos con la fecha escrita. Nada se borra. */
  anular(id: string, { motivo, fecha }: DatosDeBaja) {
    return this.http.crear<Transferencia>(`${RUTA}/${id}/anular`, { motivo, fecha });
  }

  /** Elimina de verdad la transferencia y sus dos notas si están limpias; el motivo queda en la auditoría. */
  eliminar(id: string, motivo: string) {
    return this.http.eliminar(`${RUTA}/${id}`, { motivo });
  }
}

export const apiTransferencias = new ApiTransferencias(clienteHttp);
