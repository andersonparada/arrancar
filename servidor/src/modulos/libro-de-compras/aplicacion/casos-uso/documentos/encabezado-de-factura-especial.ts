import { FacturaEspecialSiempreEnElLibro } from '../../../dominio/errores-de-factura-especial.js';
import { resolverFacturaEspecial } from '../../../dominio/factura-especial.js';
import type { SolicitudDeDocumento } from '../../dto/solicitud-de-documento.js';
import type { ContextoFiscal } from './cargador-de-contexto-fiscal.js';
import type { EncabezadoResuelto } from './encabezado-del-documento.js';

/**
 * El encabezado de una factura especial: va siempre en el libro, emite la empresa y el vendedor (el proveedor) se
 * identifica por NIT o CUI. El `nitEmisor` del cuerpo se ignora: es el NIT de la empresa. Los avisos de la factura
 * especial los junta `avisosDelDocumento`.
 * @throws FacturaEspecialSiempreEnElLibro si se quiso dejar fuera del libro.
 * @throws las reglas de `resolverFacturaEspecial` (serie, autorización y vendedor).
 */
export function encabezadoDeFacturaEspecial(
  solicitud: SolicitudDeDocumento,
  contexto: ContextoFiscal,
): EncabezadoResuelto {
  if (solicitud.motivoFueraDelLibro !== null) throw new FacturaEspecialSiempreEnElLibro();
  const resuelta = resolverFacturaEspecial({
    nitDeLaEmpresa: contexto.nitDeLaEmpresa,
    vendedor: solicitud.nitReceptor,
    serie: solicitud.serie,
    autorizacionFel: solicitud.autorizacionFel,
    proveedor: { nit: contexto.proveedor.nit, dpi: contexto.proveedor.dpi },
  });
  return {
    muestraEnReportesSat: true,
    emisor: { nitEmisor: resuelta.nitEmisor, nitParaCompletar: resuelta.nitParaCompletar },
    nitReceptor: resuelta.nitReceptor,
    dpiParaCompletar: resuelta.dpiParaCompletar,
    cambioDeRegimenConfirmado: false,
    avisos: [],
  };
}
