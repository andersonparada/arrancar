import { evaluarFueraDelLibro } from '../../../dominio/fuera-del-libro.js';
import {
  AVISO_DE_CAMBIO_DE_REGIMEN,
  exigirReceptorCoherente,
  exigirReciboFueraDelLibro,
  exigirTipoDelProveedor,
  receptorDelDocumento,
  resolverEmisor,
  type EmisorResuelto,
} from '../../../dominio/reglas-del-encabezado.js';
import type { SolicitudDeDocumento } from '../../dto/solicitud-de-documento.js';
import type { ContextoFiscal } from './cargador-de-contexto-fiscal.js';

/** Lo que se decide del encabezado antes de calcular: si va en el libro, quién emite y a quién. */
export interface EncabezadoResuelto {
  muestraEnReportesSat: boolean;
  emisor: EmisorResuelto;
  nitReceptor: string | null;
  /** El tipo no correspondía al régimen guardado del proveedor y el usuario confirmó el cambio: hay que auditarlo. */
  cambioDeRegimenConfirmado: boolean;
  avisos: string[];
}

/** El NIT o CUI al que dice el documento que se emitió; sin dato queda `null`. */
const receptorEscrito = (solicitud: SolicitudDeDocumento): string | null => receptorDelDocumento(solicitud.nitReceptor);

/**
 * Lo que se guarda en `nit_receptor`: el NIT de la empresa si el documento va en el libro; nada si no tiene FEL; y
 * si es una FEL a otro NIT (o CUI) o a consumidor final, el que dice el documento.
 */
function receptorGuardado(solicitud: SolicitudDeDocumento, contexto: ContextoFiscal): string | null {
  if (solicitud.motivoFueraDelLibro === null) return contexto.nitDeLaEmpresa;
  return solicitud.motivoFueraDelLibro === 'sin_fel' ? null : receptorEscrito(solicitud);
}

/** La casilla «Se muestra en reportes SAT» con sus avisos; una FEL a la empresa no se desmarca. */
function evaluarCasilla(solicitud: SolicitudDeDocumento, contexto: ContextoFiscal) {
  const nitReceptor = receptorEscrito(solicitud);
  exigirReceptorCoherente(solicitud.motivoFueraDelLibro, nitReceptor);
  return evaluarFueraDelLibro({
    motivo: solicitud.motivoFueraDelLibro,
    autorizacionFel: solicitud.autorizacionFel,
    nitReceptor,
    nitDeLaEmpresa: contexto.nitDeLaEmpresa,
    proveedor: { tipoDePersona: contexto.proveedor.tipoDePersona, nit: contexto.proveedor.nit },
  });
}

/**
 * Aplica las reglas del encabezado: casilla SAT (FEL a la empresa no se desmarca), recibo, tipo según el régimen
 * del proveedor y emisor (H10).
 * @throws las reglas del dominio que no se cumplan (ver `evaluarFueraDelLibro` y `reglas-del-encabezado`).
 */
export function resolverEncabezado(solicitud: SolicitudDeDocumento, contexto: ContextoFiscal): EncabezadoResuelto {
  const fuera = evaluarCasilla(solicitud, contexto);
  exigirReciboFueraDelLibro(solicitud.tipo, fuera.muestraEnReportesSat);
  const cambioDeRegimen = exigirTipoDelProveedor(
    solicitud.tipo,
    contexto.datosDelProveedor.instantanea().esPequenoContribuyente,
    solicitud.confirmarCambioDeRegimen,
  );
  const emisor = resolverEmisor({
    muestraEnReportesSat: fuera.muestraEnReportesSat,
    nitEmisor: solicitud.nitEmisor,
    serie: solicitud.serie,
    autorizacionFel: solicitud.autorizacionFel,
    nitDelProveedor: contexto.proveedor.nit,
  });
  return {
    muestraEnReportesSat: fuera.muestraEnReportesSat,
    emisor,
    nitReceptor: receptorGuardado(solicitud, contexto),
    cambioDeRegimenConfirmado: cambioDeRegimen,
    avisos: [...fuera.avisos, ...(cambioDeRegimen ? [AVISO_DE_CAMBIO_DE_REGIMEN] : [])],
  };
}
