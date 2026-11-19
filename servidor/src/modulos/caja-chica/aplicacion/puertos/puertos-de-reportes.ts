import type { Arqueo, DestinoDelFaltante } from '../../dominio/arqueos.js';
import type { Comprobante } from '../../dominio/comprobantes.js';
import type { Reposicion } from '../../dominio/reposiciones.js';

/** Un comprobante con el nombre de su fondo y su concepto de gasto, ya resuelto. */
export interface ComprobanteDeReporte {
  comprobante: Comprobante;
  fondoNombre: string;
  concepto: string;
}

export interface FiltroAlCorte {
  corte: string;
  fondoId?: string;
}

export interface FiltroDePeriodo {
  /** Fechas contables, ambas incluidas. */
  desde: string;
  hasta: string;
  fondoId?: string;
}

/** Una reposición vigente con su respaldo en Bancos y los comprobantes que cubre (monto firmado). */
export interface ReposicionDeReporte {
  reposicion: Reposicion;
  fondoNombre: string;
  /** El número del cheque o de la nota de Bancos; nulo en la compensada al cerrar. */
  referenciaDeBancos: string | null;
  lineas: { comprobante: ComprobanteDeReporte; montoCentavos: number }[];
}

/** Las cifras de un fondo a una fecha de corte. */
export interface EstadoDeFondoAlCorte {
  fondoId: string;
  nombre: string;
  custodio: string | null;
  montoCentavos: number;
  pendienteCentavos: number;
  valesCentavos: number;
  ultimoArqueo: { realizadoEn: string; diferenciaCentavos: number } | null;
}

export interface FiltroDeArqueosDelPeriodo extends FiltroDePeriodo {
  /** La zona horaria de la empresa: el día de un arqueo es el de su reloj de pared. */
  zonaHoraria: string;
}

export interface FiltroDeFondosAlCorte extends FiltroAlCorte {
  zonaHoraria: string;
}

export interface ArqueoDeReporte {
  arqueo: Arqueo;
  fondoNombre: string;
  destino: DestinoDelFaltante | null;
}

/** Las lecturas que solo piden los reportes. Las tablas tienen seguridad por empresa y por el alcance de fondos (RLS). */
export interface LecturasDeReportesDeCajaChica {
  /** CC-R1: comprobantes vigentes al corte que no estaban en una reposición vigente al corte (§5.10). */
  pendientesAlCorte(filtro: FiltroAlCorte): Promise<ComprobanteDeReporte[]>;
  /** CC-R2: las reposiciones vigentes del período con sus comprobantes. */
  reposicionesDelPeriodo(filtro: FiltroDePeriodo): Promise<ReposicionDeReporte[]>;
  /** CC-R3: los vales de gasto y los documentos fuera del libro vigentes del período. */
  sinDocumentoFiscal(filtro: FiltroDePeriodo): Promise<ComprobanteDeReporte[]>;
  /** CC-R4: los fondos abiertos al corte con sus cifras de ese día. */
  fondosAlCorte(filtro: FiltroDeFondosAlCorte): Promise<EstadoDeFondoAlCorte[]>;
  /** CC-R5: los arqueos vigentes del período. */
  arqueosDelPeriodo(filtro: FiltroDeArqueosDelPeriodo): Promise<ArqueoDeReporte[]>;
}
