import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import type { DestinoDeDocumento } from './documentos.api';
import type {
  DatosFiscalesContestados,
  DocumentoCalculado,
  LineaSolicitada,
  SolicitudDeDocumento,
} from './registro-de-documentos.api';

export type EstadoDeDte = 'pendiente' | 'registrado' | 'descartado' | 'bloqueado';
export type EstadoDeDteEnLaSat = 'vigente' | 'anulado';
export type MotivoDeBloqueo = 'registrado_en_otra_empresa';

/** Lo que el usuario completó de una fila; `null` es «sin completar» (se usa la propuesta). */
export interface BorradorDeDte {
  proveedorId: string | null;
  conceptoId: string | null;
  destino: DestinoDeDocumento | null;
  fechaRecepcion: string | null;
  periodo: string | null;
  noVinculado: boolean;
  documentoAfectadoId: string | null;
}

/** Lo que se usaría si el usuario no cambia nada; solo en las filas pendientes. */
export interface PropuestaDeDte {
  /** `null`: proveedor nuevo, que se crea al confirmar. */
  proveedorId: string | null;
  conceptoId: string | null;
  destino: DestinoDeDocumento | null;
  fechaRecepcion: string;
  /** Agente de retención del IVA: la recepción no se supone y hay que escribirla o aplicar la propuesta. */
  recepcionObligatoria: boolean;
  periodo: string;
  avisoDelPeriodo: string | null;
}

/** Una fila de la bandeja; el dinero viaja como texto con dos decimales. */
export interface DteRecibido {
  id: string;
  autorizacionFel: string;
  tipoDte: string;
  serie: string;
  numero: string;
  fechaEmision: string;
  nitEmisor: string;
  nombreEmisor: string;
  nitReceptor: string;
  total: string;
  iva: string;
  idp: string;
  otrosImpuestos: string;
  /** El detalle por impuesto que trajo el archivo (nombre corto y monto). */
  otrosImpuestosDetalle: Record<string, string>;
  estadoSat: EstadoDeDteEnLaSat;
  anuladoEnLaSatEl: string | null;
  loteId: string;
  estado: EstadoDeDte;
  documentoId: string | null;
  motivoDeDescarte: string | null;
  descartadoEn: string | null;
  motivoDeBloqueo: MotivoDeBloqueo | null;
  borrador: BorradorDeDte;
  propuesta: PropuestaDeDte | null;
}

export interface PaginaDeDteRecibidos {
  elementos: DteRecibido[];
  total: number;
  pagina: number;
  limite: number;
}

/** Lo que se pide a la bandeja; lo que falta no filtra. `desde` y `hasta` miden la fecha de emisión. */
export interface ConsultaDeDteRecibidos {
  estado?: EstadoDeDte;
  desde?: string;
  hasta?: string;
  busqueda?: string;
  tipoDte?: string;
  conProveedor?: boolean;
  pagina?: number;
  limite?: number;
  [clave: string]: string | number | boolean | undefined;
}

export type CampoConPropuesta = 'proveedorId' | 'conceptoId' | 'destino' | 'fechaRecepcion' | 'periodo';

/** Los campos del borrador que se pueden cambiar; los que no vienen no se tocan y `null` los deja sin completar. */
export type CambiosAlBorrador = Partial<BorradorDeDte>;

export interface PeticionDeCompletar {
  ids: string[];
  cambios: CambiosAlBorrador;
  aplicarPropuestas: CampoConPropuesta[];
}

/** Lo que el usuario contestó de un proveedor sin datos fiscales guardados, por su id o por el NIT si es nuevo. */
export type DatosFiscalesPorProveedor = Record<string, DatosFiscalesContestados>;

export interface PeticionDeConfirmacion {
  ids: string[];
  datosFiscalesPorProveedor: DatosFiscalesPorProveedor;
}

export interface ErrorDeFila {
  codigo: string;
  mensaje: string;
  detalles?: unknown;
}

/** Una fila confirmada (su documento y los avisos del registro) o el error que la dejó pendiente. */
export type ResultadoDeConfirmacion =
  { id: string; documentoId: string; avisos: string[] } | { id: string; error: ErrorDeFila };

export type ResultadoDeVistaPrevia =
  { id: string; documento: DocumentoCalculado; avisos: string[] } | { id: string; error: ErrorDeFila };

/** Una línea con el concepto sin elegir: el DTE no lo trae. */
export type LineaDeSolicitudDeDte = Omit<LineaSolicitada, 'conceptoId'> & { conceptoId: string | null };

/** La solicitud de registro de una fila, con el proveedor, el concepto y el destino que falten en `null`. */
export type SolicitudDeDte = Omit<SolicitudDeDocumento, 'proveedorId' | 'destino' | 'lineas'> & {
  proveedorId: string | null;
  destino: DestinoDeDocumento | null;
  lineas: LineaDeSolicitudDeDte[];
};

export interface SolicitudConAvisos {
  solicitud: SolicitudDeDte;
  avisos: string[];
}

/** Una fila del archivo que no entró a la bandeja, con el motivo. */
export interface RechazoDeLote {
  fila: number;
  autorizacion: string | null;
  motivo: string;
  detalle: string;
}

/** El resumen de una carga del archivo de la SAT: lo que se guarda de cada archivo (nunca el archivo). */
export interface LoteDeDte {
  id: string;
  formato: 'xlsx' | 'xls' | 'csv';
  nombreDelArchivo: string;
  emisionDesde: string | null;
  emisionHasta: string | null;
  filasLeidas: number;
  filasNuevas: number;
  filasActualizadas: number;
  filasSinCambio: number;
  filasRechazadas: number;
  anuladasEnLaSat: number;
  /** Hasta 1,000; el total está en `filasRechazadas`. */
  rechazos: RechazoDeLote[];
  encabezadosNoReconocidos: string[];
}

export interface ResultadoDeImportarDte {
  lote: LoteDeDte;
  avisos: string[];
}

const RUTA = '/libro-de-compras/dte-recibidos';

/** La bandeja de DTE recibidos de la SAT: ver, completar, confirmar en lote, descartar y restaurar. */
export class ApiDteRecibidos {
  constructor(private readonly http: ClienteHttp) {}

  listar(consulta: ConsultaDeDteRecibidos) {
    return this.http.obtener<PaginaDeDteRecibidos>(RUTA, consulta);
  }

  completar(peticion: PeticionDeCompletar) {
    return this.http.modificar<{ elementos: DteRecibido[] }>(RUTA, peticion);
  }

  vistaPrevia(peticion: PeticionDeConfirmacion) {
    return this.http.crear<{ resultados: ResultadoDeVistaPrevia[] }>(`${RUTA}/vista-previa`, peticion);
  }

  confirmar(peticion: PeticionDeConfirmacion) {
    return this.http.crear<{ resultados: ResultadoDeConfirmacion[] }>(`${RUTA}/confirmar`, peticion);
  }

  /** La solicitud propuesta, para abrir el formulario de registro ya lleno. */
  solicitud(id: string) {
    return this.http.obtener<SolicitudConAvisos>(`${RUTA}/${id}/solicitud`);
  }

  descartar(ids: string[], motivo: string) {
    return this.http.crear<{ elementos: DteRecibido[] }>(`${RUTA}/descartar`, { ids, motivo });
  }

  /** Carga el archivo de la SAT (.xls, .xlsx o CSV): todo o nada; el servidor responde el lote y sus avisos. */
  importar(archivo: File) {
    return this.http.subir<ResultadoDeImportarDte>(`${RUTA}/importar`, archivo);
  }

  restaurar(id: string) {
    return this.http.crear<DteRecibido>(`${RUTA}/${id}/restaurar`);
  }
}

export const apiDteRecibidos = new ApiDteRecibidos(clienteHttp);
