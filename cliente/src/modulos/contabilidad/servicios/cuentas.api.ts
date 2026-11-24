import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import { intercambioDe } from '@/modulos/core/servicios/intercambio';

export type Naturaleza = 'deudora' | 'acreedora';
export type TipoDeCuenta = 'balance' | 'resultados';
export type ClaseDeFlujo = 'efectivo' | 'operacion' | 'inversion' | 'financiamiento' | 'ninguna';
export type TratamientoFiscal =
  'deducible' | 'no_deducible' | 'exento' | 'costo_de_renta_exenta' | 'renta_de_capital' | 'no_aplica';

/** Lo que el usuario escribe de una cuenta (la cuenta superior y el nivel salen del código). */
export interface DatosDeCuenta {
  codigo: string;
  nombre: string;
  esDeDetalle: boolean;
  naturaleza: Naturaleza;
  tipo: TipoDeCuenta;
  rubro: string | null;
  corriente: boolean;
  claseDeFlujo: ClaseDeFlujo | null;
  esMonetaria: boolean;
  pideTercero: boolean;
  pideCentroDeCosto: boolean;
  esDeControl: boolean;
  tratamientoFiscal: TratamientoFiscal;
  activo: boolean;
}

export interface Cuenta extends DatosDeCuenta {
  id: string;
  padreId: string | null;
  padreCodigo: string | null;
  nivel: number;
  monedaCodigo: string | null;
}

export class ApiCuentas {
  constructor(private readonly http: ClienteHttp) {}

  /** Exportar e importar la nomenclatura en Excel. */
  get intercambio() {
    return intercambioDe(this.http, '/contabilidad/cuentas');
  }

  listar() {
    return this.http.obtener<Cuenta[]>('/contabilidad/cuentas');
  }

  crear(datos: DatosDeCuenta) {
    return this.http.crear<Cuenta>('/contabilidad/cuentas', datos);
  }

  actualizar(id: string, datos: DatosDeCuenta) {
    return this.http.reemplazar<Cuenta>(`/contabilidad/cuentas/${id}`, datos);
  }

  eliminar(id: string) {
    return this.http.eliminar(`/contabilidad/cuentas/${id}`);
  }
}

export const apiCuentas = new ApiCuentas(clienteHttp);
