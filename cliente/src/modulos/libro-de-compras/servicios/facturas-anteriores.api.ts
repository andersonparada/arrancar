import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import type { TipoDeDocumento } from './documentos.api';

/** Por qué una factura del sistema anterior no dio crédito fiscal; `null` es que sí lo dio. */
export type MotivoDeFacturaAnterior =
  'fuera_de_plazo' | 'no_vinculado' | 'exento' | 'empresa_sin_credito' | 'otra_causa_sin_credito';

/** La factura del sistema anterior que corrige una nota, tal como viaja (dinero como texto). */
export interface FacturaAnteriorSolicitada {
  tipo: TipoDeDocumento;
  serie: string | null;
  numero: string;
  fechaEmision: string;
  autorizacionFel: string | null;
  total: string;
  iva: string;
  notasDeDebitoAnterioresTotal: string;
  notasDeDebitoAnterioresIva: string;
  /** `null` es que dio crédito. El de una familia sin IVA lo pone el servidor. */
  motivoSinCredito: MotivoDeFacturaAnterior | null;
  /** Obligatorio con «otra causa». */
  detalleDelMotivo: string | null;
}

/**
 * Una factura anterior que el servidor propone para llenar el formulario. Puede traer el motivo de su familia
 * (pequeño contribuyente…), que no se escribe a mano.
 */
export interface FacturaAnteriorSugerida extends Omit<FacturaAnteriorSolicitada, 'motivoSinCredito'> {
  motivoSinCredito: string | null;
}

/** Lo que el servidor propone al registrar una nota: lo ya citado por notas del proveedor y lo de su bandeja. */
export interface SugerenciasDeFacturasAnteriores {
  /** La fecha de inicio de la empresa; `null` si no tiene (entonces no se ofrece «factura del sistema anterior»). */
  fechaDeInicio: string | null;
  usadas: FacturaAnteriorSugerida[];
  deLaBandeja: FacturaAnteriorSugerida[];
}

/** La factura que corrige una nota, en su ficha: una del libro (con enlace) o una del sistema anterior (sin él). */
export interface DocumentoQueModifica {
  origen: 'libro' | 'sistema_anterior';
  /** El id de la factura en el libro; `null` si es del sistema anterior. */
  documentoId: string | null;
  tipo: TipoDeDocumento;
  serie: string | null;
  numero: string;
  fechaEmision: string;
}

/** Los datos de la factura del sistema anterior que guarda la ficha de una nota. */
export type FacturaAnteriorDeLaFicha = FacturaAnteriorSugerida;

export class ApiFacturasAnteriores {
  constructor(private readonly http: ClienteHttp) {}

  /** Las facturas anteriores del proveedor que se pueden proponer; pide el permiso de registrar documentos. */
  sugerencias(proveedorId: string) {
    return this.http.obtener<SugerenciasDeFacturasAnteriores>(
      `/libro-de-compras/proveedores/${proveedorId}/facturas-anteriores`,
    );
  }
}

export const apiFacturasAnteriores = new ApiFacturasAnteriores(clienteHttp);
