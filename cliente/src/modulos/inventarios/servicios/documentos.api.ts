import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';

export type ClaseDeDocumento =
  'entrada_manual' | 'salida_por_consumo' | 'recepcion_de_compra' | 'devolucion_a_proveedor' | 'rebaja_de_costo';

export type CausaDeEntrada = 'produccion_propia' | 'donacion_recibida' | 'aporte' | 'otra';
export type DestinoDeSalida = 'gasto' | 'obra_de_activo_fijo' | 'mantenimiento_de_activo_fijo';
export type EstadoDeDocumento = 'vigente' | 'anulado';

/** Un renglón de un documento. Sin el permiso de costos, los costos llegan en `null`. */
export interface RenglonDeDocumento {
  movimientoId: string;
  articuloId: string;
  articuloCodigo: string;
  articuloNombre: string;
  loteId: string | null;
  loteCodigo: string | null;
  cantidad: string;
  unidadBaseNombre: string;
  cantidadEscrita: string | null;
  unidadEscritaSimbolo: string | null;
  costoUnitario: string | null;
  costoTotal: string | null;
}

export interface Documento {
  id: string;
  clase: ClaseDeDocumento;
  numero: number;
  fecha: string;
  bodegaId: string | null;
  bodegaNombre: string | null;
  documentoDeCompraId: string | null;
  documentoRelacionadoId: string | null;
  causa: CausaDeEntrada | null;
  destino: DestinoDeSalida | null;
  conceptoDeGastoId: string | null;
  conceptoDeGastoNombre: string | null;
  localidadId: string | null;
  departamentoId: string | null;
  entregadoA: string | null;
  soporte: string | null;
  observaciones: string | null;
  requiereFactura: boolean;
  estado: EstadoDeDocumento;
  motivoDeAnulacion: string | null;
  /** Recomendaciones del servidor que no impidieron guardar. */
  avisos: string[];
  costoTotal: string | null;
  renglones: RenglonDeDocumento[];
}

export interface FiltrosDeDocumentos {
  clase?: ClaseDeDocumento;
  bodegaId?: string;
  articuloId?: string;
  estado?: EstadoDeDocumento;
  desde?: string;
  hasta?: string;
}

/** Un renglón que se manda: la cantidad va en la unidad escrita (la base si no se indica). */
export interface RenglonSolicitado {
  articuloId: string;
  loteId: string | null;
  cantidad: string;
  unidadId: string | null;
  /** Solo en las entradas. */
  costoTotal: string | null;
}

export interface DatosDeEntrada {
  fecha: string;
  bodegaId: string;
  causa: CausaDeEntrada;
  soporte: string;
  observaciones: string | null;
  renglones: RenglonSolicitado[];
}

export interface DatosDeSalida {
  fecha: string;
  bodegaId: string;
  destino: DestinoDeSalida;
  conceptoDeGastoId: string | null;
  localidadId: string | null;
  departamentoId: string | null;
  entregadoA: string | null;
  observaciones: string | null;
  renglones: RenglonSolicitado[];
}

const RUTA = '/inventarios';

/** Cada clase de documento se anula por su propia ruta (y su propio permiso). */
const RUTA_DE_ANULACION: Record<ClaseDeDocumento, string> = {
  entrada_manual: 'entradas',
  salida_por_consumo: 'salidas',
  recepcion_de_compra: 'recepciones',
  devolucion_a_proveedor: 'devoluciones-a-proveedor',
  rebaja_de_costo: 'rebajas-de-costo',
};

export class ApiDocumentos {
  constructor(private readonly http: ClienteHttp) {}

  listar(filtros: FiltrosDeDocumentos = {}) {
    return this.http.obtener<Documento[]>(`${RUTA}/documentos`, { ...filtros });
  }

  obtener(id: string) {
    return this.http.obtener<Documento>(`${RUTA}/documentos/${id}`);
  }

  registrarEntrada(datos: DatosDeEntrada) {
    return this.http.crear<Documento>(`${RUTA}/entradas`, datos);
  }

  registrarSalida(datos: DatosDeSalida) {
    return this.http.crear<Documento>(`${RUTA}/salidas`, datos);
  }

  /** Anula el documento y recalcula el costo desde su fecha; el motivo queda en la auditoría. */
  anular(documento: Pick<Documento, 'id' | 'clase'>, motivo: string) {
    return this.http.crear<Documento>(`${RUTA}/${RUTA_DE_ANULACION[documento.clase]}/${documento.id}/anular`, {
      motivo,
    });
  }
}

export const apiDocumentos = new ApiDocumentos(clienteHttp);
