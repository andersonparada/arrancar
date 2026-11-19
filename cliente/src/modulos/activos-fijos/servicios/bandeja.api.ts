import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import type { OrigenDeActivo } from './activos.api';
import type { ClaseDeCostoElegible } from './costos.api';

/** Una línea del libro con costo por capitalizar. Los montos son texto con dos decimales; en una nota de crédito, negativos. */
export interface LineaDeBandeja {
  lineaId: string;
  documentoId: string;
  numeroDeLinea: number;
  tipoDeDocumento: string;
  documento: string;
  fechaEmision: string;
  proveedorNombre: string;
  conceptoId: string;
  conceptoNombre: string;
  descripcion: string | null;
  tipoDeLinea: 'bien' | 'servicio';
  costo: string;
  capitalizado: string;
  pendiente: string;
  claseSugeridaId: string | null;
  claseSugeridaNombre: string | null;
  bajoElUmbral: boolean;
  anteriorALaFechaDeInicio: boolean;
  activoSugeridoId: string | null;
  activoSugeridoCodigo: string | null;
}

export interface Bandeja {
  /** El umbral de la empresa en quetzales, o `null` si no tiene. */
  umbral: string | null;
  lineas: LineaDeBandeja[];
}

/** Filtros de la bandeja; los vacíos no se mandan. */
export type FiltrosDeBandeja = {
  desde?: string;
  hasta?: string;
  conPropuesta?: boolean;
};

/** Un renglón de la cuadrícula; lo vacío va como `null` (el código lo propone el servidor). */
export interface DetalleDeUnidad {
  codigo: string | null;
  numeroDeSerie: string | null;
  placa: string | null;
  marca: string | null;
  modelo: string | null;
}

/** El activo (o los activos iguales) que nace de una asignación. */
export interface ActivoNuevoDeAsignacion {
  descripcion: string;
  claseId: string;
  tipoDeRegistro: 'activo' | 'bien_de_control';
  origen: OrigenDeActivo;
  activoPadreId: null;
  localidadId: string | null;
  departamentoId: string | null;
  responsable: string | null;
  enBodega: boolean;
  marca: string | null;
  modelo: string | null;
  valorComoGanadoComun: string | null;
  valorDeMatricula: string | null;
  valorCatastral: string | null;
  valoresDelInmuebleCompleto: boolean;
  observaciones: string | null;
  unidades: number;
  cantidadPorActivo: number;
  detalleDeUnidades: DetalleDeUnidad[];
}

/** Una parte de una línea con su destino: exactamente uno de `activoId`, `activoNuevo` o `altaConjuntaId`. */
export interface AsignacionDeLinea {
  lineaId: string;
  /** Con dos decimales; negativo en las líneas de una nota de crédito. */
  monto: string;
  activoId: string | null;
  activoNuevo: ActivoNuevoDeAsignacion | null;
  altaConjuntaId: string | null;
  claseDeCosto: ClaseDeCostoElegible | null;
  noEsEdificacion: boolean;
}

export interface Capitalizacion {
  activos: { id: string; codigo: string; costo: string }[];
  costos: number;
  altaConjuntaIds: string[];
}

export interface Descarte {
  lineaId: string;
  avisos: string[];
}

const RUTA = '/activos-fijos/bandeja';

export class ApiBandeja {
  constructor(private readonly http: ClienteHttp) {}

  obtener(filtros: FiltrosDeBandeja = {}) {
    return this.http.obtener<Bandeja>(RUTA, filtros);
  }

  capitalizar(asignaciones: AsignacionDeLinea[]) {
    return this.http.crear<Capitalizacion>(`${RUTA}/capitalizar`, { asignaciones });
  }

  descartar(lineaId: string, motivo: string) {
    return this.http.crear<Descarte>(`${RUTA}/${lineaId}/descartar`, { motivo });
  }

  devolver(lineaId: string) {
    return this.http.crear<void>(`${RUTA}/${lineaId}/devolver`);
  }
}

export const apiBandeja = new ApiBandeja(clienteHttp);
