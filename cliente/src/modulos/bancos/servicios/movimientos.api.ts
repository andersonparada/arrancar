import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import { intercambioDe } from '@/modulos/core/servicios/intercambio';

/** Movimiento tal como lo manda el servidor. */
export interface Movimiento {
  id: string;
  cuentaBancariaId: string;
  tipo: 'credito' | 'debito';
  fecha: string;
  monto: string;
  saldoInicial: boolean;
  referencia: string | null;
  beneficiario: string | null;
  observaciones: string | null;
  cuentaBancariaNombre: string | null;
  anuladoEn: string | null;
  motivoDeAnulacion: string | null;
}

export type DatosMovimiento = Omit<Movimiento, 'id' | 'cuentaBancariaNombre' | 'anuladoEn' | 'motivoDeAnulacion'>;

/** Qué movimientos listar: de una cuenta y entre dos fechas (incluidas); lo que falte no filtra. */
export interface FiltroDeMovimientos {
  cuentaBancariaId?: string;
  desde?: string;
  hasta?: string;
  [clave: string]: string | undefined;
}

const RUTA = '/bancos/movimientos';

export class ApiMovimientos {
  constructor(private readonly http: ClienteHttp) {}

  /** Importar en Excel (los saldos iniciales); sin exportar: lo registrado se consulta en los reportes. */
  get intercambio() {
    return intercambioDe(this.http, RUTA);
  }

  listar(filtro: FiltroDeMovimientos = {}) {
    return this.http.obtener<Movimiento[]>(RUTA, filtro);
  }

  obtener(id: string) {
    return this.http.obtener<Movimiento>(`${RUTA}/${id}`);
  }

  crear(datos: DatosMovimiento) {
    return this.http.crear<Movimiento>(RUTA, datos);
  }

  actualizar(id: string, datos: DatosMovimiento) {
    return this.http.reemplazar<Movimiento>(`${RUTA}/${id}`, datos);
  }

  /** Anula el movimiento con un motivo; no se puede deshacer y no hay ruta para eliminar. */
  anular(id: string, motivo: string) {
    return this.http.crear<Movimiento>(`${RUTA}/${id}/anular`, { motivo });
  }
}

export const apiMovimientos = new ApiMovimientos(clienteHttp);
