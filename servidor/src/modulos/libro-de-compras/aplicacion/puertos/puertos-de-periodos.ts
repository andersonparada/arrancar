import type { DeclaracionCitada } from '../../dominio/periodos/avisos-de-periodos.js';
import type { FotoDelPeriodo } from '../../dominio/periodos/foto-del-periodo.js';
import type { EventoDeDeclaracion, FormularioDeDeclaracion } from '../../dominio/periodos/reglas-de-declaracion.js';
import type { TipoDeLibro } from '../../dominio/libro/tipo-de-libro.js';

/** `consultar` solo lee (vista previa, avisos); `bloquear` toma la fila del período para que declarar espere. */
export type ModoDeControl = 'consultar' | 'bloquear';

export interface EstadoDelPeriodo {
  periodo: string;
  declarado: boolean;
  /** Declarado **y** con el bloqueo encendido: no admite registrar, anular ni eliminar. */
  bloquea: boolean;
  ultimaDeclaracion: DeclaracionCitada | null;
}

/**
 * Qué períodos están declarados y si eso bloquea (lo decide el ajuste de la empresa). Corre dentro de la unidad de
 * trabajo en curso.
 */
export interface ControlDePeriodos {
  /** Sin bloqueo encendido nunca escribe; con él, `bloquear` toma la fila con `for share` contra el `for update` de declarar. */
  estadoDe(periodo: string, modo: ModoDeControl): Promise<EstadoDelPeriodo>;
  /** Los períodos declarados que hoy bloquean: ninguno si el bloqueo está apagado. */
  bloqueados(): Promise<string[]>;
}

/** El bloqueo de períodos declarados de una empresa, con quién lo cambió por última vez. */
export interface AjusteDelControl {
  encendido(): Promise<boolean>;
  detalle(): Promise<DetalleDelAjuste>;
  establecer(encendido: boolean): Promise<void>;
}

export interface DetalleDelAjuste {
  encendido: boolean;
  actualizadoEn: Date | null;
  actualizadoPor: { id: string; nombre: string } | null;
}

export interface FilaDePeriodo {
  periodo: string;
  estado: 'abierto' | 'declarado';
  declaradoEn: Date | null;
  declaradoPor: { id: string; nombre: string } | null;
}

export interface DeclaracionGuardada {
  id: string;
  periodo: string;
  secuencia: number;
  evento: EventoDeDeclaracion;
  formulario: FormularioDeDeclaracion | null;
  numeroDeFormulario: string | null;
  fechaDePresentacion: string | null;
  tipoDeLibro: TipoDeLibro | null;
  foto: FotoDelPeriodo | null;
  diferencia: unknown;
  motivo: string | null;
  creadoEn: Date;
  creadoPor: { id: string; nombre: string } | null;
}

export type DeclaracionNueva = Omit<DeclaracionGuardada, 'id' | 'secuencia' | 'creadoEn' | 'creadoPor'>;

/** Los períodos y su historial; la tabla de declaraciones solo se agrega. */
export interface RepositorioDePeriodos {
  /** Crea la fila abierta si falta y la toma con `for update`: quien registra en ese período espera. */
  bloquear(empresaId: string, periodo: string): Promise<FilaDePeriodo>;
  buscar(periodo: string): Promise<FilaDePeriodo | null>;
  marcarDeclarado(empresaId: string, periodo: string, declaradoPor: string): Promise<void>;
  reabrir(empresaId: string, periodo: string): Promise<void>;
  agregarDeclaracion(empresaId: string, declaracion: DeclaracionNueva): Promise<DeclaracionGuardada>;
  /** De la más vieja a la más nueva. */
  historial(periodo: string): Promise<DeclaracionGuardada[]>;
  filasDelAnio(anio: number): Promise<FilaDePeriodo[]>;
  /** La última declaración o rectificación de cada período del año (sin foto ni diferencia). */
  ultimasDelAnio(anio: number): Promise<DeclaracionGuardada[]>;
}

export interface DocumentoCambiado {
  documentoId: string;
  cambio: 'registrado' | 'anulado';
  tipoDte: string | null;
  serie: string | null;
  numero: string;
  total: string;
}

/** Lo que la revisión y la diferencia de una declaración consultan fuera del libro. */
export interface ConsultasDelPeriodo {
  /** Los documentos del período registrados o anulados después de `desde`. */
  documentosCambiadosDesde(periodo: string, desde: Date): Promise<DocumentoCambiado[]>;
  /**
   * `null` si la empresa no tiene lotes de la bandeja cuyas fechas de emisión toquen el período o los dos meses
   * anteriores; si los tiene, cuántos DTE siguen pendientes en esas fechas.
   */
  dtePendientesQuePuedenIrEn(periodo: string): Promise<number | null>;
}
