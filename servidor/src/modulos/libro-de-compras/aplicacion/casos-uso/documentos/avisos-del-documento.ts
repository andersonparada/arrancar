import { avisosDeRetenciones } from '../../../dominio/avisos-de-retenciones.js';
import { avisosDelProveedor } from '../../../dominio/avisos-del-proveedor.js';
import { avisosDeConsumidorFinal } from '../../../dominio/fuera-del-libro.js';
import { avisosDeNotaTardia } from '../../../dominio/reglas-de-notas-de-credito.js';
import type { SolicitudDeDocumento } from '../../dto/solicitud-de-documento.js';
import type { DocumentoResuelto } from './armado-del-documento.js';
import type { ContextoFiscal } from './cargador-de-contexto-fiscal.js';

/**
 * Todos los avisos del documento, que no bloquean: período, FEL, nota tardía, proveedor, retención ya practicada
 * en un documento anulado y retenciones.
 */
export function avisosDelDocumento(
  solicitud: SolicitudDeDocumento,
  contexto: ContextoFiscal,
  resuelto: DocumentoResuelto,
): string[] {
  const { factura } = resuelto;
  return [
    ...resuelto.calculado.avisos,
    ...resuelto.encabezado.avisos,
    ...avisosDeConsumidorFinal(solicitud.motivoFueraDelLibro, resuelto.calculado.totales.total),
    ...(factura ? avisosDeNotaTardia(solicitud.fechaEmision, factura.fechaEmision) : []),
    ...avisosDelProveedor(contexto.datosDelProveedor),
    ...resuelto.practicada.avisos,
    ...avisosDeRetenciones(resuelto.retenciones, {
      hoy: contexto.hoy,
      diasHabilesIva: contexto.configuracion.diasHabilesIva,
      diasHabilesIsr: contexto.configuracion.diasHabilesIsr,
      calendario: contexto.calendario,
    }),
  ];
}
