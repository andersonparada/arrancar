import type { CausaDeTramo } from '../../dominio/depreciacion/tramo.js';
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
  grupoId: string | null;
  numero: number | null;
  anioDeNumero: number | null;
  motivoDeAnulacion: string | null;
  fecha: string;
  localidadNombre: string | null;
  departamentoNombre: string | null;
  responsable: string | null;
  recibidoPor: string | null;
  motivo: string | null;
  aBodega: boolean;
  estado: 'vigente' | 'anulado';
}

/** Un tramo de depreciación vigente del activo (§5.8); el contable lleva `meses` y el fiscal, `porcentaje` y su base. */
export interface TramoDto {
  libro: 'contable' | 'fiscal';
  desdePeriodo: string;
  causa: CausaDeTramo;
  porDepreciar: string;
  valorResidual: string;
  meses: number | null;
  porcentaje: string | null;
  baseDelPorcentaje: string | null;
  cuotaMensual: string;
  excesoDeNotaDeCredito: string;
}

/** La ficha del activo: sus datos, su historial de ubicación y los tramos de depreciación vigentes. */
export interface ActivoFichaDto extends ActivoDto {
  traslados: TrasladoDto[];
  tramos: TramoDto[];
}

/** Los parámetros de depreciación que el usuario puede cambiar; lo que no escribe lo propone la clase. */
export interface ParametrosEscritosDeUso {
  porcentajeFiscal?: string | null;
  vidaUtilContableMeses?: number | null;
  valorResidual?: string | null;
}

/**
 * Dónde queda el bien al ponerlo «Disponible para uso» (AFI-3). Sin `enBodega`, queda en la bodega de activos si no se
 * escribe responsable.
 */
export interface UbicacionAlPonerEnUso {
  localidadId: string | null;
  departamentoId: string | null;
  responsable: string | null;
  enBodega?: boolean;
}

/**
 * Lo que se recibe para poner un activo en uso («Disponible para uso»). Lo que no se escribe lo propone la clase:
 * porcentaje fiscal, vida útil contable y valor residual (en monto, con dos decimales). Con `ubicacion` se fija dónde
 * queda el bien; sin ella conserva la que tiene.
 */
export interface SolicitudDePonerEnUso extends ParametrosEscritosDeUso {
  fechaDeInicioDeUso: string;
  ubicacion?: UbicacionAlPonerEnUso | null;
}

/** Los parámetros propios de un activo del lote, si no sirven los propuestos por su clase. */
export interface AjusteDeUsoPorActivo extends ParametrosEscritosDeUso {
  activoId: string;
}

/** Poner en uso varios activos a la vez (hasta 200): una fecha y una ubicación para todos; todo o nada. */
export interface SolicitudDePonerEnUsoVarios {
  activoIds: string[];
  fechaDeInicioDeUso: string;
  ubicacion?: UbicacionAlPonerEnUso | null;
  ajustes?: AjusteDeUsoPorActivo[];
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
