import type { FotoDelPeriodo } from '../../dominio/periodos/foto-del-periodo.js';
import type { EventoDeDeclaracion, FormularioDeDeclaracion } from '../../dominio/periodos/reglas-de-declaracion.js';
import type {
  DeclaracionGuardada,
  DetalleDelAjuste,
  DocumentoCambiado,
  FilaDePeriodo,
} from '../puertos/puertos-de-periodos.js';

export interface PersonaDto {
  id: string;
  nombre: string;
}

/** Una declaración, reapertura o rectificación del historial; la foto y la diferencia solo van en el detalle. */
export interface DeclaracionDto {
  id: string;
  secuencia: number;
  evento: EventoDeDeclaracion;
  formulario: FormularioDeDeclaracion | null;
  numeroDeFormulario: string | null;
  fechaDePresentacion: string | null;
  tipoDeLibro: 'completo' | 'simplificado' | null;
  motivo: string | null;
  registradaEn: string;
  registradaPor: PersonaDto | null;
  foto?: FotoDelPeriodo | null;
  diferencia?: unknown;
}

/** Un mes del libro: abierto o declarado, con su última declaración. */
export interface PeriodoDto {
  periodo: string;
  estado: 'abierto' | 'declarado';
  /** El mes ya terminó, así que se puede declarar. */
  terminado: boolean;
  declaradoEn: string | null;
  declaradoPor: PersonaDto | null;
  ultimaDeclaracion: DeclaracionDto | null;
}

/** El bloqueo de períodos declarados de la empresa, con quién y cuándo lo cambió. */
export interface ControlDto {
  encendido: boolean;
  actualizadoEn: string | null;
  actualizadoPor: PersonaDto | null;
}

export interface AvisoDeRevisionDto {
  codigo: 'bandeja_pendiente' | 'anulacion_de_dte';
  mensaje: string;
  cantidad?: number;
}

/** Lo que cambió el libro desde la última declaración, para mostrar «cambió después de declarar». */
export interface CambioDesdeLaDeclaracionDto {
  contraLaSecuencia: number;
  huellaCambio: boolean;
  cambios: Array<{ clave: string; anterior: string; actual: string; cambio: string }>;
  documentos: DocumentoCambiado[];
}

export interface PeriodosDelAnioDto {
  anio: number;
  control: ControlDto;
  periodos: PeriodoDto[];
}

export interface DetalleDePeriodoDto {
  periodo: PeriodoDto;
  control: ControlDto;
  historial: DeclaracionDto[];
  cambioDesdeLaDeclaracion: CambioDesdeLaDeclaracionDto | null;
  revision: AvisoDeRevisionDto[];
}

/** Lo que responden declarar y reabrir. */
export interface ResultadoDeCambioDePeriodoDto {
  periodo: PeriodoDto;
  declaracion: DeclaracionDto;
  avisos: string[];
}

const iso = (fecha: Date | null): string | null => fecha?.toISOString() ?? null;

export function dtoDeDeclaracion(declaracion: DeclaracionGuardada, conFoto: boolean): DeclaracionDto {
  return {
    id: declaracion.id,
    secuencia: declaracion.secuencia,
    evento: declaracion.evento,
    formulario: declaracion.formulario,
    numeroDeFormulario: declaracion.numeroDeFormulario,
    fechaDePresentacion: declaracion.fechaDePresentacion,
    tipoDeLibro: declaracion.tipoDeLibro,
    motivo: declaracion.motivo,
    registradaEn: declaracion.creadoEn.toISOString(),
    registradaPor: declaracion.creadoPor,
    ...(conFoto ? { foto: declaracion.foto, diferencia: declaracion.diferencia ?? null } : {}),
  };
}

/** Un período con su última declaración (sin fila, el período está abierto). */
export function dtoDePeriodo(
  periodo: string,
  datos: { fila: FilaDePeriodo | null; ultima: DeclaracionGuardada | null; hoy: string },
): PeriodoDto {
  const { fila, ultima, hoy } = datos;
  return {
    periodo,
    estado: fila?.estado ?? 'abierto',
    terminado: periodo < `${hoy.slice(0, 7)}-01`,
    declaradoEn: iso(fila?.declaradoEn ?? null),
    declaradoPor: fila?.declaradoPor ?? null,
    ultimaDeclaracion: ultima ? dtoDeDeclaracion(ultima, false) : null,
  };
}

export const dtoDelControl = (ajuste: DetalleDelAjuste): ControlDto => ({
  encendido: ajuste.encendido,
  actualizadoEn: iso(ajuste.actualizadoEn),
  actualizadoPor: ajuste.actualizadoPor,
});
