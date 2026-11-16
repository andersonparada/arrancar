import { clienteHttp, type ClienteHttp, type Consulta } from '@/modulos/core/servicios/cliente-http';
import { intercambioDe, type IntercambioDeDatos } from '@/modulos/core/servicios/intercambio';
import type { GrupoDeEntero, RetencionDelMes } from './retenciones.api';

/** Una retención practicada que todavía no tiene constancia, con los plazos de su entero y de su constancia. */
export interface ConstanciaPendiente {
  /** Primer día del mes de la retención (`AAAA-MM-01`). */
  mes: string;
  grupo: GrupoDeEntero;
  nombreDelGrupo: string;
  plazoDelGrupo: string;
  /** Días de calendario para el plazo del entero; negativo si ya pasó. */
  diasParaElPlazo: number;
  plazoVencido: boolean;
  enterado: boolean;
  /** `null` si el impuesto no tiene plazo propio (IVA). */
  plazoDeLaConstancia: string | null;
  diasParaLaConstancia: number | null;
  constanciaVencida: boolean;
  notaDelPlazo: string | null;
  retencion: RetencionDelMes;
}

/** Lo pendiente de un mes y grupo (solo documentos vigentes). */
export interface TotalPendiente {
  mes: string;
  grupo: GrupoDeEntero;
  nombreDelGrupo: string;
  plazoDelGrupo: string;
  cantidad: number;
  retenido: string;
}

export interface ConstanciasPendientes {
  /** Primer día del último mes incluido. */
  hasta: string;
  hoy: string;
  filtros: { grupo: GrupoDeEntero | null; proveedorId: string | null };
  pendientes: ConstanciaPendiente[];
  /** De documentos anulados con la resolución pendiente: aparte, no suman. */
  anuladas: ConstanciaPendiente[];
  totales: TotalPendiente[];
  total: { cantidad: number; retenido: string };
}

export interface FiltrosDeConstanciasPendientes {
  /** Último mes incluido (`AAAA-MM`). */
  hasta: string;
  grupo: GrupoDeEntero | '';
  proveedorId: string;
}

const RUTA = '/libro-de-compras/retenciones/constancias-pendientes';

/** Las constancias de retención que faltan, de todos los meses, y su Excel. */
export class ApiConstanciasPendientes {
  readonly intercambio: IntercambioDeDatos;

  constructor(private readonly http: ClienteHttp) {
    this.intercambio = intercambioDe(http, RUTA);
  }

  listar(consulta: Consulta) {
    return this.http.obtener<ConstanciasPendientes>(RUTA, consulta);
  }
}

export const apiConstanciasPendientes = new ApiConstanciasPendientes(clienteHttp);
