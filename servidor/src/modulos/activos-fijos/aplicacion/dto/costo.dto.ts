import type { ClaseDeCosto, ClaseDeCostoElegible, EstadoDeCosto, OrigenDeCosto } from '../../dominio/tipos-de-costo.js';

/** Un costo del activo; el monto va como texto con dos decimales (negativo en una nota de crédito). */
export interface CostoDto {
  id: string;
  activoId: string;
  origen: OrigenDeCosto;
  claseDeCosto: ClaseDeCosto;
  documentoDeCompraId: string | null;
  lineaDeDocumentoId: string | null;
  /** Serie y número del documento del libro; nulo si no viene de una línea. */
  documento: string | null;
  proveedorNombre: string | null;
  fecha: string;
  monto: string;
  aplicaAlLibroFiscal: boolean;
  motivoFueraDelLibroFiscal: string | null;
  noEsEdificacion: boolean;
  documentoDeSoporte: string | null;
  descripcion: string | null;
  estado: EstadoDeCosto;
  anuladoEn: string | null;
  motivoDeAnulacion: string | null;
}

/** Los costos de un activo y su suma vigente. */
export interface CostosDeActivoDto {
  costos: CostoDto[];
  total: string;
}

/** Lo que se recibe para registrar un costo manual (E3). */
export interface SolicitudDeCostoManual {
  claseDeCosto: ClaseDeCostoElegible;
  fecha: string;
  montoCentavos: number;
  documentoDeSoporte: string;
  descripcion: string | null;
  aplicaAlLibroFiscal: boolean;
  motivoFueraDelLibroFiscal: string | null;
  noEsEdificacion: boolean;
}
