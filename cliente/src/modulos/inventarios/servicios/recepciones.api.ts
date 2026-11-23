import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import type { Documento } from './documentos.api';

/** Una línea del Libro de compras con lo recibido y lo que falta. Los montos viajan como texto. */
export interface LineaPorRecibir {
  lineaId: string;
  documentoId: string;
  numeroDeLinea: number;
  /** `factura`, `nota_de_credito`…; las notas se aplican con una devolución o una rebaja. */
  tipoDeDocumento: string;
  /** La factura que corrige una nota. */
  documentoAfectadoId: string | null;
  documento: string;
  fechaEmision: string;
  proveedorNombre: string;
  conceptoId: string;
  conceptoNombre: string;
  descripcion: string | null;
  costo: string;
  recibido: string;
  pendiente: string;
  articuloSugeridoId: string | null;
  articuloSugeridoCodigo: string | null;
  articuloSugeridoNombre: string | null;
  /** El documento es anterior a la fecha de inicio: si ya estaba en el saldo inicial, se descarta. */
  anteriorALaFechaDeInicio: boolean;
}

export interface FiltrosDePorRecibir {
  desde?: string;
  hasta?: string;
  proveedorId?: string;
  conceptoId?: string;
}

export interface LoteNuevo {
  codigo: string;
  fechaDeVencimiento: string | null;
  fechaDeFabricacion: string | null;
}

export interface RenglonDeRecepcion {
  lineaId: string;
  articuloId: string;
  loteId: string | null;
  loteNuevo: LoteNuevo | null;
  cantidad: string;
  unidadId: string | null;
  /** La parte del costo de la línea que se recibe. */
  monto: string;
}

export interface DatosDeRecepcion {
  fecha: string;
  bodegaId: string;
  observaciones: string | null;
  renglones: RenglonDeRecepcion[];
}

export interface DatosDeDevolucion {
  fecha: string;
  /** La línea de la nota de crédito que respalda la devolución. */
  lineaId: string;
  observaciones: string | null;
  renglones: { movimientoDeEntradaId: string; cantidad: string; unidadId: string | null }[];
}

export interface DatosDeRebaja {
  fecha: string;
  lineaId: string;
  monto: string;
  base: 'valor' | 'cantidad';
  observaciones: string | null;
}

const RUTA = '/inventarios';

export class ApiRecepciones {
  constructor(private readonly http: ClienteHttp) {}

  listar(filtros: FiltrosDePorRecibir = {}) {
    return this.http.obtener<{ lineas: LineaPorRecibir[] }>(`${RUTA}/por-recibir`, { ...filtros });
  }

  /** Crea un documento de recepción por bodega y documento del libro. */
  recibir(datos: DatosDeRecepcion) {
    return this.http.crear<{ documentos: Documento[] }>(`${RUTA}/recepciones`, datos);
  }

  devolver(datos: DatosDeDevolucion) {
    return this.http.crear<Documento>(`${RUTA}/devoluciones-a-proveedor`, datos);
  }

  rebajar(datos: DatosDeRebaja) {
    return this.http.crear<Documento>(`${RUTA}/rebajas-de-costo`, datos);
  }

  /** La línea deja de ser inventario en el Libro de compras; el motivo queda en la auditoría. */
  descartar(lineaId: string, motivo: string) {
    return this.http.crear<{ lineaId: string; avisos: string[] }>(`${RUTA}/por-recibir/${lineaId}/descartar`, {
      motivo,
    });
  }

  /** Deshace un descarte: la línea vuelve a ser inventario y a la bandeja. */
  devolverALaBandeja(lineaId: string) {
    return this.http.crear<void>(`${RUTA}/por-recibir/${lineaId}/devolver`);
  }

  /** Las recepciones vigentes (con sus renglones), para elegir qué devolver de una factura. */
  recepcionesVigentes() {
    return this.http.obtener<Documento[]>(`${RUTA}/documentos`, { clase: 'recepcion_de_compra', estado: 'vigente' });
  }
}

export const apiRecepciones = new ApiRecepciones(clienteHttp);
