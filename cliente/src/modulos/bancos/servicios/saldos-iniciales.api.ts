import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import { intercambioDe } from '@/modulos/core/servicios/intercambio';
import type { Movimiento } from './movimientos.api';

/** Lo que se manda al registrar o corregir el saldo inicial de una cuenta; sin beneficiario (no aplica). */
export interface DatosSaldoInicial {
  cuentaBancariaId: string;
  tipo: 'credito' | 'debito';
  fecha: string;
  monto: string;
  referencia: string | null;
  observaciones: string | null;
}

const RUTA = '/bancos/saldos-iniciales';

/** El saldo inicial de las cuentas bancarias: registrarlo, corregirlo, anularlo e importarlo/exportarlo en Excel. */
export class ApiSaldosIniciales {
  constructor(private readonly http: ClienteHttp) {}

  /** Importar y exportar en Excel (es administración): se ve en la ficha de la cuenta y en la lista de cuentas. */
  get intercambio() {
    return intercambioDe(this.http, RUTA);
  }

  /** El saldo inicial vigente de la cuenta, si lo tiene. */
  async deLaCuenta(cuentaBancariaId: string): Promise<Movimiento | null> {
    const lista = await this.http.obtener<Movimiento[]>(RUTA, { cuentaBancariaId });
    return lista.find((movimiento) => !movimiento.anuladoEn) ?? null;
  }

  crear(datos: DatosSaldoInicial) {
    return this.http.crear<Movimiento>(RUTA, datos);
  }

  actualizar(id: string, datos: DatosSaldoInicial) {
    return this.http.reemplazar<Movimiento>(`${RUTA}/${id}`, datos);
  }

  /** Anula el saldo inicial con un motivo; no se puede deshacer y no hay ruta para eliminar. */
  anular(id: string, motivo: string) {
    return this.http.crear<Movimiento>(`${RUTA}/${id}/anular`, { motivo });
  }
}

export const apiSaldosIniciales = new ApiSaldosIniciales(clienteHttp);
