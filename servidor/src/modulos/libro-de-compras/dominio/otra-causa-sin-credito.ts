import { OtraCausaSinDetalle, OtraCausaSoloEnFacturas } from './errores-de-factura-anterior.js';
import { esNota, type TipoDeDocumento } from './tipos-de-documento.js';

/**
 * La marca «no dio crédito por otra causa» se pone a mano solo en las facturas y exige explicarla en las
 * observaciones (queda en el documento y en el libro).
 * @throws OtraCausaSoloEnFacturas con una nota o un recibo; OtraCausaSinDetalle sin observaciones.
 */
export function exigirOtraCausaCoherente(datos: {
  tipo: TipoDeDocumento;
  otraCausaSinCredito?: boolean;
  observaciones: string | null;
}): void {
  if (!datos.otraCausaSinCredito) return;
  if (esNota(datos.tipo) || datos.tipo === 'recibo') throw new OtraCausaSoloEnFacturas();
  if (!datos.observaciones?.trim()) throw new OtraCausaSinDetalle();
}
