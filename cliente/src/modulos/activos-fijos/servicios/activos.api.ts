import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import type { Clase } from './clases.api';

export type TipoDeRegistro = 'activo' | 'bien_de_control' | 'de_terceros';
export type EstadoDeActivo = 'en_construccion' | 'en_uso' | 'dado_de_baja';
export type OrigenDeActivo =
  'compra' | 'construccion' | 'importacion' | 'aporte' | 'donacion' | 'saldo_inicial' | 'otro';
export type FormaDeTenencia = 'arrendamiento' | 'comodato' | 'otra';

/** Activo tal como lo manda el servidor; la ubicación ya viene con sus nombres (AF-P22 b). */
export interface Activo {
  id: string;
  codigo: string;
  descripcion: string;
  claseId: string;
  claseNombre: string;
  incisoFiscal: Clase['incisoFiscal'];
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
  enBodega: boolean;
  altaConjuntaId: string | null;
  localidadId: string | null;
  localidadNombre: string | null;
  departamentoId: string | null;
  departamentoNombre: string | null;
  responsable: string | null;
  observaciones: string | null;
}

/** Una fila del historial de ubicación; la primera es el alta. */
export interface Traslado {
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

export interface ActivoFicha extends Activo {
  traslados: Traslado[];
}

/** Lo que se manda para dar de alta un activo a mano; sin código, el servidor propone el siguiente. */
export interface DatosActivo {
  codigo: string | null;
  descripcion: string;
  claseId: string;
  activoPadreId: string | null;
  tipoDeRegistro: TipoDeRegistro;
  origen: OrigenDeActivo | null;
  propietario: string | null;
  formaDeTenencia: FormaDeTenencia | null;
  fechaDeAdquisicion: string;
  valorComoGanadoComun: string | null;
  valorDeMatricula: string | null;
  valorCatastral: string | null;
  valoresDelInmuebleCompleto: boolean;
  marca: string | null;
  modelo: string | null;
  numeroDeSerie: string | null;
  placa: string | null;
  cantidad: number;
  observaciones: string | null;
  localidadId: string | null;
  departamentoId: string | null;
  responsable: string | null;
  enBodega: boolean;
}

/** Filtros de la lista; los vacíos no se mandan. */
export type FiltrosDeActivos = {
  texto?: string;
  estado?: EstadoDeActivo;
  tipoDeRegistro?: TipoDeRegistro;
  claseId?: string;
  ocioso?: boolean;
  enBodega?: boolean;
};

/** Localidades y departamentos activos para elegir el destino (todos, vea o no el usuario la localidad en Empresas). */
export interface UbicacionesDeActivos {
  localidades: { id: string; codigo: string; nombre: string }[];
  departamentos: { id: string; codigo: string; nombre: string; localidadId: string | null }[];
}

const RUTA = '/activos-fijos/activos';

export class ApiActivos {
  constructor(private readonly http: ClienteHttp) {}

  listar(filtros: FiltrosDeActivos = {}) {
    return this.http.obtener<Activo[]>(RUTA, filtros);
  }

  obtener(id: string) {
    return this.http.obtener<ActivoFicha>(`${RUTA}/${id}`);
  }

  crear(datos: DatosActivo) {
    return this.http.crear<ActivoFicha>(RUTA, datos);
  }

  ubicaciones() {
    return this.http.obtener<UbicacionesDeActivos>('/activos-fijos/ubicaciones');
  }
}

export const apiActivos = new ApiActivos(clienteHttp);
