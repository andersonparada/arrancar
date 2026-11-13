import type { EstadoDeDocumento, TipoDeDocumento } from './tipos';

/** Cómo está la carga inicial de la empresa: sin fecha de inicio no se carga; cerrada, ya no se agrega ni corrige. */
export interface EstadoDeLaCarga {
  fechaDeInicio: string | null;
  cerrada: boolean;
}

/** Lo que se manda para cargar o corregir un saldo inicial; el dinero va como texto en quetzales. */
export interface DatosDeSaldoInicial {
  proveedorId: string;
  tipo: TipoDeDocumento;
  serie: string | null;
  numero: string;
  referencia: string | null;
  fechaEmision: string;
  vencimiento: string | null;
  total: string;
  retenciones: string;
  retencionesPorPracticar: string;
  saldoPendiente: string;
  tieneActivoFijo: boolean;
}

/** Un saldo inicial tal como lo manda el servidor, con lo que se puede hacer con él. */
export interface SaldoInicial extends DatosDeSaldoInicial {
  id: string;
  proveedorNombre: string;
  proveedorNit: string | null;
  /** Pagos y notas anteriores a la fecha de inicio. */
  anterioresAlInicio: string;
  /** Lo que se debe hoy, tras notas y pagos. */
  saldo: string;
  estado: EstadoDeDocumento;
  creadoEn: string;
  puedeCorregir: boolean;
  puedeEliminar: boolean;
}

export interface PaginaDeSaldosIniciales {
  carga: EstadoDeLaCarga;
  elementos: SaldoInicial[];
  total: number;
  pagina: number;
  limite: number;
}

export interface TotalesDelCuadre {
  documentos: number;
  cargos: string;
  notasAFavor: string;
  /** Cargos menos notas a favor; puede ser negativo (saldo deudor). */
  neto: string;
  retencionesPorPracticar: string;
}

export interface CuadreDeProveedor extends TotalesDelCuadre {
  proveedorId: string;
  proveedorNombre: string;
  proveedorNit: string | null;
}

export interface CuadreDeSaldosIniciales {
  carga: EstadoDeLaCarga;
  proveedores: CuadreDeProveedor[];
  general: TotalesDelCuadre;
}

export interface ConsultaDeSaldosIniciales {
  proveedorId?: string;
  pagina?: number;
  limite?: number;
}

/** Un proveedor para escoger en la ventana; `activo` falso solo se ve si es el que ya tenía el saldo. */
export interface ProveedorParaSaldo {
  id: string;
  nombre: string;
  activo: boolean;
}
