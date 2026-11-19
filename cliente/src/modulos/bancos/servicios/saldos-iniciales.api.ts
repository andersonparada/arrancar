import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import { intercambioDe } from '@/modulos/core/servicios/intercambio';
import type {
  CabeceraGuardada,
  DatosDeAnulacionDePartida,
  DatosDeCabecera,
  DatosDePartida,
  ParteQueSeAgrega,
  PartidaGuardada,
  SaldoInicialDeCuenta,
  SaldosIniciales,
} from './tipos-de-saldos-iniciales';

const RUTA = '/bancos/saldos-iniciales';

/** Los saldos iniciales por cuenta con sus partidas de apertura (docs/modulos/diseno-bancos-segunda-parte.md §8). */
export class ApiSaldosIniciales {
  constructor(private readonly http: ClienteHttp) {}

  /** Excel de los saldos por cuenta (administración: importa y exporta). */
  get intercambio() {
    return intercambioDe(this.http, RUTA);
  }

  /** Excel de las partidas de apertura. */
  get intercambioDePartidas() {
    return intercambioDe(this.http, `${RUTA}/partidas`);
  }

  listar() {
    return this.http.obtener<SaldosIniciales>(RUTA);
  }

  obtener(cuentaBancariaId: string) {
    return this.http.obtener<SaldoInicialDeCuenta>(`${RUTA}/${cuentaBancariaId}`);
  }

  /** Crea o corrige la cabecera (y el saldo del banco); también convierte un saldo «de antes» en partidas. */
  guardar(cuentaBancariaId: string, datos: DatosDeCabecera) {
    return this.http.reemplazar<CabeceraGuardada>(`${RUTA}/${cuentaBancariaId}`, datos);
  }

  /** Elimina la cabecera con todas sus partidas; el motivo queda en la auditoría. */
  eliminar(cuentaBancariaId: string, motivo: string) {
    return this.http.eliminar(`${RUTA}/${cuentaBancariaId}`, { motivo });
  }

  agregarPartida(cuentaBancariaId: string, parte: ParteQueSeAgrega, datos: DatosDePartida) {
    return this.http.crear<PartidaGuardada>(`${RUTA}/${cuentaBancariaId}/partidas`, { parte, ...datos });
  }

  corregirPartida(cuentaBancariaId: string, movimientoId: string, datos: DatosDePartida) {
    return this.http.reemplazar<PartidaGuardada>(`${RUTA}/${cuentaBancariaId}/partidas/${movimientoId}`, datos);
  }

  eliminarPartida(cuentaBancariaId: string, movimientoId: string, motivo: string) {
    return this.http.eliminar(`${RUTA}/${cuentaBancariaId}/partidas/${movimientoId}`, { motivo });
  }

  /** Anula con inverso; llega con BS-3 en el servidor, y el cliente solo la ofrece si `puedeAnular`. */
  anularPartida(cuentaBancariaId: string, movimientoId: string, datos: DatosDeAnulacionDePartida) {
    return this.http.crear(`${RUTA}/${cuentaBancariaId}/partidas/${movimientoId}/anular`, datos);
  }
}

export const apiSaldosIniciales = new ApiSaldosIniciales(clienteHttp);
