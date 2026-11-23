import type { DestinoDeDocumentoDeVenta } from '../../core/contratos/libro-de-ventas.contratos.js';
import type { LineaCalculada } from './calculo-de-lineas.js';
import type { Receptor } from './receptor.js';
import type { RegimenDeIsr, RegimenDeIva } from './regimen-de-la-empresa.js';
import type { FacturaAnteriorEscrita } from './reglas-de-notas.js';
import type { TipoDeDocumento, TipoDte } from './tipos-de-documento.js';
import type { TotalesDelDocumento } from './totales-del-documento.js';

/** El documento de venta completo que se registra: encabezado con totales y líneas. Nunca se edita. */
export interface DocumentoDeVenta {
  id: string;
  empresaId: string;
  tipo: TipoDeDocumento;
  /** El código de la SAT; `null` en un documento sin FEL (papel). */
  tipoDte: TipoDte | null;
  origen: 'manual';
  clienteId: string | null;
  receptor: Receptor;
  serie: string | null;
  numero: string;
  autorizacionFel: string | null;
  localidadId: string | null;
  fechaEmision: string;
  /** Primer día del mes de emisión: ahí cae el débito. */
  periodo: string;
  /** La foto del régimen de la empresa en el mes del documento: no cambia aunque después se corrija el historial. */
  regimenIvaDeLaEmpresa: RegimenDeIva;
  regimenIsrDeLaEmpresa: RegimenDeIsr | null;
  documentoAfectadoId: string | null;
  /** La factura del sistema anterior que corrige una nota (en lugar de `documentoAfectadoId`). */
  facturaAnterior: FacturaAnteriorEscrita | null;
  destino: DestinoDeDocumentoDeVenta | null;
  muestraEnReportesSat: boolean;
  observaciones: string | null;
  totales: TotalesDelDocumento;
  lineas: LineaCalculada[];
}
