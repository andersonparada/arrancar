import { avisosDeRetenciones } from '../../../dominio/avisos-de-retenciones.js';
import { avisosDelProveedor } from '../../../dominio/avisos-del-proveedor.js';
import { avisosDeNotaTardia } from '../../../dominio/reglas-de-notas-de-credito.js';
import type { SolicitudDeDocumento } from '../../dto/solicitud-de-documento.js';
import type { DocumentoResuelto } from './armado-del-documento.js';
import type { ContextoFiscal } from './cargador-de-contexto-fiscal.js';

/** Todos los avisos del documento, que no bloquean: período, FEL, nota tardía, proveedor y retenciones. */
export function avisosDelDocumento(
  solicitud: SolicitudDeDocumento,
  contexto: ContextoFiscal,
  resuelto: DocumentoResuelto,
): string[] {
  const { factura } = resuelto;
  return [
    ...resuelto.calculado.avisos,
    ...resuelto.encabezado.avisos,
    ...(factura ? avisosDeNotaTardia(solicitud.fechaEmision, factura.fechaEmision) : []),
    ...avisosDelProveedor({
      empresa: contexto.datosDeLaEmpresa,
      proveedor: contexto.datosDelProveedor,
      proveedorSinDatosFiscales: contexto.proveedorSinDatosFiscales,
    }),
    ...avisosDeRetenciones(resuelto.retenciones, {
      hoy: contexto.hoy,
      fechaDeRecepcion: contexto.fechaDeRecepcion,
      diasHabilesIva: contexto.configuracion.diasHabilesIva,
      diasHabilesIsr: contexto.configuracion.diasHabilesIsr,
    }),
  ];
}
