import type { IncisoFiscal } from '../../dominio/incisos-fiscales.js';
import type { DatosEditables, UbicacionDeActivo } from '../../dominio/activo.js';
import type { DatosDeActivo } from '../../dominio/reglas-de-activo.js';
import type { EstadoDeActivo, FormaDeTenencia, OrigenDeActivo, TipoDeRegistro } from '../../dominio/tipos-de-activo.js';

/** Activo tal como lo ve el usuario en la lista y la ficha; la ubicación va con sus nombres (AF-P22 b). */
export interface ActivoDto {
  id: string;
  codigo: string;
  descripcion: string;
  claseId: string;
  claseNombre: string;
  incisoFiscal: IncisoFiscal;
  activoPadreId: string | null;
  tipoDeRegistro: TipoDeRegistro;
  origen: OrigenDeActivo | null;
  propietario: string | null;
  formaDeTenencia: FormaDeTenencia | null;
  estado: EstadoDeActivo;
  ocioso: boolean;
  ociosoDesde: string | null;
  motivoDeOcio: string | null;
  fechaDeAdquisicion: string;
  fechaDeInicioDeUso: string | null;
  fechaDeBaja: string | null;
  porcentajeFiscal: string | null;
  vidaUtilContableMeses: number | null;
  valorResidual: string | null;
  valorComoGanadoComun: string | null;
  valorDeMatricula: string | null;
  valorCatastral: string | null;
  valoresDelInmuebleCompleto: boolean;
  marca: string | null;
  modelo: string | null;
  numeroDeSerie: string | null;
  placa: string | null;
  cantidad: number;
  /** Σ de sus costos vigentes, con dos decimales. */
  costo: string;
  enBodega: boolean;
  altaConjuntaId: string | null;
  localidadId: string | null;
  localidadNombre: string | null;
  departamentoId: string | null;
  departamentoNombre: string | null;
  responsable: string | null;
  observaciones: string | null;
}

/** Una fila del historial de ubicación del activo; la primera es el alta. */
export interface TrasladoDto {
  id: string;
  esAlta: boolean;
  fecha: string;
  localidadNombre: string | null;
  departamentoNombre: string | null;
  responsable: string | null;
  recibidoPor: string | null;
  motivo: string | null;
  aBodega: boolean;
  estado: 'vigente' | 'anulado';
}

/** La ficha del activo: sus datos y su historial de ubicación. */
export interface ActivoFichaDto extends ActivoDto {
  traslados: TrasladoDto[];
}

/** Lo que se recibe para dar de alta un activo a mano; sin código, se propone el siguiente. */
export type SolicitudDeActivo = Omit<DatosDeActivo, 'codigo'> & UbicacionDeActivo & { codigo: string | null };

/** Lo que se recibe para editar un activo. */
export type SolicitudDeEdicionDeActivo = DatosEditables;

/** Marcar o quitar la marca de ocioso. */
export interface SolicitudDeOcio {
  ocioso: boolean;
  fecha: string;
  motivo: string | null;
}

/** Filtros de la lista de activos; todos son opcionales. */
export interface FiltrosDeActivos {
  estado?: EstadoDeActivo;
  claseId?: string;
  tipoDeRegistro?: TipoDeRegistro;
  localidadId?: string;
  departamentoId?: string;
  responsable?: string;
  texto?: string;
  ocioso?: boolean;
  enBodega?: boolean;
}

/** Localidades y departamentos activos de la empresa, para elegir el destino. */
export interface UbicacionesDto {
  localidades: { id: string; codigo: string; nombre: string }[];
  departamentos: { id: string; codigo: string; nombre: string; localidadId: string | null }[];
}
