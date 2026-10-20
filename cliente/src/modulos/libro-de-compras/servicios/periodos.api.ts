import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import type { TipoDeLibro } from './libro.api';

export type EstadoGuardadoDelPeriodo = 'abierto' | 'declarado';
export type EventoDeDeclaracion = 'declaracion' | 'reapertura' | 'rectificacion';
export type FormularioDeDeclaracion = 'SAT-2237' | 'SAT-2046' | 'sin_formulario';

export interface Persona {
  id: string;
  nombre: string;
}

/** Una declaración, rectificación o reapertura del historial de un período. */
export interface DeclaracionDelPeriodo {
  id: string;
  secuencia: number;
  evento: EventoDeDeclaracion;
  formulario: FormularioDeDeclaracion | null;
  numeroDeFormulario: string | null;
  fechaDePresentacion: string | null;
  tipoDeLibro: TipoDeLibro | null;
  motivo: string | null;
  registradaEn: string;
  registradaPor: Persona | null;
}

/** Un mes del libro. `periodo` es el primer día (`AAAA-MM-01`). */
export interface PeriodoDelLibro {
  periodo: string;
  estado: EstadoGuardadoDelPeriodo;
  /** El mes ya terminó, así que se puede declarar. */
  terminado: boolean;
  declaradoEn: string | null;
  declaradoPor: Persona | null;
  ultimaDeclaracion: DeclaracionDelPeriodo | null;
}

/** El bloqueo de períodos declarados de la empresa. */
export interface ControlDePeriodos {
  encendido: boolean;
  actualizadoEn: string | null;
  actualizadoPor: Persona | null;
}

export interface PeriodosDelAnio {
  anio: number;
  control: ControlDePeriodos;
  periodos: PeriodoDelLibro[];
}

export interface CambioDeCifra {
  clave: string;
  anterior: string;
  actual: string;
  cambio: string;
}

export interface DocumentoCambiado {
  documentoId: string;
  cambio: 'registrado' | 'anulado';
  tipoDte: string | null;
  serie: string | null;
  numero: string;
  total: string;
}

/** Lo que cambió el libro desde la última declaración: es lo que se rectifica. */
export interface CambioDesdeLaDeclaracion {
  contraLaSecuencia: number;
  huellaCambio: boolean;
  cambios: CambioDeCifra[];
  documentos: DocumentoCambiado[];
}

export interface AvisoDeRevision {
  codigo: string;
  mensaje: string;
  cantidad?: number;
}

export interface DetalleDelPeriodo {
  periodo: PeriodoDelLibro;
  control: ControlDePeriodos;
  historial: DeclaracionDelPeriodo[];
  cambioDesdeLaDeclaracion: CambioDesdeLaDeclaracion | null;
  revision: AvisoDeRevision[];
}

export interface DatosDeDeclaracion {
  formulario?: FormularioDeDeclaracion;
  numeroDeFormulario?: string;
  fechaDePresentacion?: string;
}

export interface ResultadoDeCambioDePeriodo {
  periodo: PeriodoDelLibro;
  declaracion: DeclaracionDelPeriodo;
  avisos: string[];
}

const RUTA = '/libro-de-compras/periodos';

/** Cliente de la API de períodos: ver, declarar, reabrir y el bloqueo de períodos declarados. */
export class ApiPeriodos {
  constructor(private readonly http: ClienteHttp) {}

  lista(anio: number) {
    return this.http.obtener<PeriodosDelAnio>(RUTA, { anio });
  }

  /** `mes` es `AAAA-MM`. */
  detalle(mes: string) {
    return this.http.obtener<DetalleDelPeriodo>(`${RUTA}/${mes}`);
  }

  declarar(mes: string, datos: DatosDeDeclaracion) {
    return this.http.crear<ResultadoDeCambioDePeriodo>(`${RUTA}/${mes}/declarar`, datos);
  }

  reabrir(mes: string, motivo: string) {
    return this.http.crear<ResultadoDeCambioDePeriodo>(`${RUTA}/${mes}/reabrir`, { motivo });
  }

  encenderControl() {
    return this.http.crear<ControlDePeriodos>(`${RUTA}/control/encender`, {});
  }

  apagarControl(motivo: string) {
    return this.http.crear<ControlDePeriodos>(`${RUTA}/control/apagar`, { motivo });
  }
}

export const apiPeriodos = new ApiPeriodos(clienteHttp);
