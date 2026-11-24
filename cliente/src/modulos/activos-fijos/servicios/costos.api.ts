import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';

export type ClaseDeCostoElegible =
  'adquisicion' | 'importacion' | 'flete' | 'instalacion' | 'construccion' | 'honorarios' | 'desmantelamiento' | 'otro';
export type ClaseDeCosto = ClaseDeCostoElegible | 'nota_de_credito' | 'nota_de_debito';
export type OrigenDeCosto = 'linea_de_compra' | 'manual' | 'saldo_inicial';

/** Un costo del activo; el monto es texto con dos decimales (negativo en una nota de crédito). */
export interface Costo {
  id: string;
  activoId: string;
  origen: OrigenDeCosto;
  claseDeCosto: ClaseDeCosto;
  mejoraId: string | null;
  documentoDeCompraId: string | null;
  lineaDeDocumentoId: string | null;
  documento: string | null;
  proveedorNombre: string | null;
  fecha: string;
  monto: string;
  aplicaAlLibroFiscal: boolean;
  motivoFueraDelLibroFiscal: string | null;
  noEsEdificacion: boolean;
  documentoDeSoporte: string | null;
  descripcion: string | null;
  estado: 'vigente' | 'anulado';
  anuladoEn: string | null;
  motivoDeAnulacion: string | null;
}

export interface CostosDeActivo {
  costos: Costo[];
  /** La suma de los costos vigentes. */
  total: string;
}

/** Lo que se manda para registrar un costo a mano. */
export interface DatosDeCostoManual {
  claseDeCosto: ClaseDeCostoElegible;
  fecha: string;
  monto: string;
  documentoDeSoporte: string;
  descripcion: string | null;
  aplicaAlLibroFiscal: boolean;
  motivoFueraDelLibroFiscal: string | null;
  noEsEdificacion: boolean;
}

export class ApiCostos {
  constructor(private readonly http: ClienteHttp) {}

  listar(activoId: string) {
    return this.http.obtener<CostosDeActivo>(`/activos-fijos/activos/${activoId}/costos`);
  }

  registrarManual(activoId: string, datos: DatosDeCostoManual) {
    return this.http.crear<Costo>(`/activos-fijos/activos/${activoId}/costos`, datos);
  }

  anular(costoId: string, motivo: string) {
    return this.http.crear<Costo>(`/activos-fijos/costos/${costoId}/anular`, { motivo });
  }
}

export const apiCostos = new ApiCostos(clienteHttp);
