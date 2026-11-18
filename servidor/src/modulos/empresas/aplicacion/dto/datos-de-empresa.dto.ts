import type { RevisionDeCierreDeModulo } from '../../../core/contratos/empresas.contratos.js';
import type { UltimoCierreDto } from './historial-de-carga.dto.js';
/** Razón social y nombre comercial de una empresa; vacíos mientras nadie los haya guardado. */
export interface DatosFiscalesDto {
  empresaId: string;
  razonSocial: string | null;
  nombreComercial: string | null;
}

/** Lo que se recibe para guardar los datos fiscales, ya validado en su forma. */
export interface SolicitudDeDatosFiscales {
  razonSocial: string | null;
  nombreComercial: string | null;
}

/** El balance de apertura firmado que se adjuntó (PDF). Nunca trae la ruta ni el id del archivo. */
export interface BalanceDeAperturaDto {
  tamanoBytes: number;
  paginas: number;
  /** Huella del contenido guardado. */
  sha256: string;
  nombreOriginal: string | null;
  subidoEn: Date;
  /** Nombre de quien lo subió. */
  subidoPorNombre: string | null;
}

/** Fecha de inicio de la empresa y estado de su carga inicial; sin fecha mientras nadie la haya registrado. */
export interface CargaInicialDto {
  empresaId: string;
  /** `aaaa-mm-dd`. */
  fechaDeInicio: string | null;
  cerrada: boolean;
  cerradaEn: Date | null;
  /** Nombre de quien la cerró. */
  cerradaPor: string | null;
  /** Lo que dijo el último cierre (diferencias, avisos y motivo); `null` mientras la carga esté abierta. */
  ultimoCierre: UltimoCierreDto | null;
  /** El balance de apertura firmado, si se adjuntó. */
  balanceDeApertura: BalanceDeAperturaDto | null;
}

/** Lo que responde la orden `empresas.obtener_datos_de_empresa`. */
export interface DatosDeIdentificacionDto {
  nombre: string;
  nit: string | null;
  razonSocial: string | null;
  nombreComercial: string | null;
}

/** Lo que Empresas y los módulos activos encontraron al revisar la carga inicial antes de cerrarla. */
export interface RevisionDeCierreDto {
  carga: CargaInicialDto;
  /** El bloque de la empresa va primero (`nombreDelModulo` «Empresa», sin ruta); después, cada módulo en su orden. */
  modulos: RevisionDeCierreDeModulo[];
  /** Hallazgos que piden motivo. */
  diferencias: number;
  /** Hallazgos que solo avisan. */
  avisos: number;
  pideMotivo: boolean;
  /** sha256 de lo revisado (hallazgos y cifras): si cambia entre revisar y cerrar, el cierre se rechaza. */
  huella: string;
}
