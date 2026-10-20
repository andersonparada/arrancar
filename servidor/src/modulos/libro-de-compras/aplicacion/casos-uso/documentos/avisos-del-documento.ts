import { avisosDeRetenciones, type ContextoDeEntero } from '../../../dominio/avisos-de-retenciones.js';
import { avisosDelProveedor } from '../../../dominio/avisos-del-proveedor.js';
import { avisosDeLaFacturaEspecial } from '../../../dominio/factura-especial.js';
import { avisosDeLaFamilia } from '../../../dominio/familia-del-documento.js';
import { avisosDeConsumidorFinal } from '../../../dominio/fuera-del-libro.js';
import { avisosDeNotaTardia } from '../../../dominio/reglas-de-notas-de-credito.js';
import { avisosDeNotaDeDebito } from '../../../dominio/reglas-de-notas-de-debito.js';
import type { SolicitudDeDocumento } from '../../dto/solicitud-de-documento.js';
import type { DocumentoResuelto } from './armado-del-documento.js';
import type { ContextoFiscal } from './cargador-de-contexto-fiscal.js';

const contextoDeEntero = (contexto: ContextoFiscal): ContextoDeEntero => ({
  hoy: contexto.hoy,
  diasHabilesIva: contexto.configuracion.diasHabilesIva,
  diasHabilesIsr: contexto.configuracion.diasHabilesIsr,
  calendario: contexto.calendario,
  empresaConIsrSobreUtilidades: contexto.datosDeLaEmpresa.tieneIsrSobreUtilidades(),
});

/** Los avisos propios de la factura especial y de la nota de débito; los demás tipos no tienen. */
function avisosDeLaFactura(solicitud: SolicitudDeDocumento, contexto: ContextoFiscal): string[] {
  if (solicitud.tipo === 'nota_de_debito')
    return avisosDeNotaDeDebito({ empresa: contexto.datosDeLaEmpresa, claseDeCargo: solicitud.claseDeCargo });
  if (solicitud.tipo !== 'factura_especial') return [];
  return avisosDeLaFacturaEspecial({ empresa: contexto.datosDeLaEmpresa, proveedor: contexto.datosDelProveedor });
}

/**
 * Todos los avisos del documento, que no bloquean: período, FEL, factura especial, nota de débito, nota tardía, proveedor, retención ya practicada
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
    ...resuelto.lineas.avisos,
    ...resuelto.encabezado.avisos,
    ...avisosDeLaFamilia(solicitud.tipo),
    ...avisosDeLaFactura(solicitud, contexto),
    ...avisosDeConsumidorFinal(
      { motivo: solicitud.motivoFueraDelLibro, total: resuelto.calculado.totales.total },
      contexto.datosDeLaEmpresa.tieneIsrSobreUtilidades(),
    ),
    ...(factura && solicitud.tipo === 'nota_de_credito'
      ? avisosDeNotaTardia(solicitud.fechaEmision, factura.fechaEmision)
      : []),
    ...avisosDelProveedor(contexto.datosDelProveedor),
    ...resuelto.practicada.avisos,
    ...avisosDeRetenciones(resuelto.retenciones, contextoDeEntero(contexto)),
  ];
}
