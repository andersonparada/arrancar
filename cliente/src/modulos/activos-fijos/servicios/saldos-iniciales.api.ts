import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import { intercambioDe } from '@/modulos/core/servicios/intercambio';
import type { Clase } from './clases.api';

/** El saldo inicial de un activo tal como lo ve la pantalla; los montos son texto con dos decimales. */
export interface SaldoInicial {
  activoId: string;
  codigo: string;
  descripcion: string;
  claseId: string;
  claseNombre: string;
  incisoFiscal: Clase['incisoFiscal'];
  activoPadreId: string | null;
  activoPadreCodigo: string | null;
  enConstruccion: boolean;
  fechaDeCorte: string;
  fechaDeAdquisicion: string;
  fechaDeInicioDeUso: string | null;
  cantidad: number;
  costo: string;
  depreciacionAcumuladaContable: string;
  valorEnLibros: string;
  costoFiscal: string;
  baseFiscal: string;
  depreciacionAcumuladaFiscal: string;
  porcentajeFiscal: string | null;
  vidaUtilRestanteMeses: number | null;
  valorResidual: string | null;
  valorComoGanadoComun: string | null;
  valorDeMatricula: string | null;
  valorCatastral: string | null;
  valoresDelInmuebleCompleto: boolean;
  marca: string | null;
  modelo: string | null;
  numeroDeSerie: string | null;
  placa: string | null;
  enBodega: boolean;
  localidadId: string | null;
  localidadNombre: string | null;
  departamentoId: string | null;
  departamentoNombre: string | null;
  responsable: string | null;
  observaciones: string | null;
}

/** Lo que suman los saldos iniciales. */
export interface TotalesDeSaldos {
  activos: number;
  costo: string;
  depreciacionAcumuladaContable: string;
  valorEnLibros: string;
  costoFiscal: string;
  baseFiscal: string;
  depreciacionAcumuladaFiscal: string;
}

export interface TotalDeClaseDeSaldos {
  claseId: string;
  clase: string;
  costo: string;
  depreciacionAcumuladaContable: string;
}

/** El estado de la carga, el cuadre y cada activo de saldo inicial. */
export interface ListaDeSaldosIniciales {
  fechaDeInicio: string | null;
  fechaDeCorte: string | null;
  cargaCerrada: boolean;
  totales: TotalesDeSaldos;
  porClase: TotalDeClaseDeSaldos[];
  saldos: SaldoInicial[];
}

/** Lo que se manda para cargar o corregir un saldo; lo vacío va como `null` y el servidor propone lo que falta. */
export interface DatosDeSaldoInicial {
  codigo: string | null;
  descripcion: string;
  claseId: string;
  activoPadreId: string | null;
  fechaDeAdquisicion: string;
  fechaDeInicioDeUso: string | null;
  enConstruccion: boolean;
  cantidad: number;
  costo: string;
  depreciacionAcumuladaContable: string;
  costoFiscal: string | null;
  baseFiscal: string | null;
  depreciacionAcumuladaFiscal: string;
  porcentajeFiscal: string | null;
  vidaUtilRestanteMeses: number | null;
  valorResidual: string | null;
  valorComoGanadoComun: string | null;
  valorDeMatricula: string | null;
  valorCatastral: string | null;
  valoresDelInmuebleCompleto: boolean;
  marca: string | null;
  modelo: string | null;
  numeroDeSerie: string | null;
  placa: string | null;
  observaciones: string | null;
  localidadId: string | null;
  departamentoId: string | null;
  responsable: string | null;
  enBodega: boolean;
}

const RUTA = '/activos-fijos/saldos-iniciales';

export class ApiSaldosIniciales {
  constructor(private readonly http: ClienteHttp) {}

  /** Exportar e importar en Excel. */
  get intercambio() {
    return intercambioDe(this.http, RUTA);
  }

  listar() {
    return this.http.obtener<ListaDeSaldosIniciales>(RUTA);
  }

  obtener(activoId: string) {
    return this.http.obtener<SaldoInicial>(`${RUTA}/${activoId}`);
  }

  guardar(datos: DatosDeSaldoInicial) {
    return this.http.crear<SaldoInicial>(RUTA, datos);
  }

  corregir(activoId: string, datos: DatosDeSaldoInicial) {
    return this.http.reemplazar<SaldoInicial>(`${RUTA}/${activoId}`, datos);
  }

  eliminar(activoId: string) {
    return this.http.eliminar(`${RUTA}/${activoId}`);
  }
}

export const apiSaldosIniciales = new ApiSaldosIniciales(clienteHttp);
