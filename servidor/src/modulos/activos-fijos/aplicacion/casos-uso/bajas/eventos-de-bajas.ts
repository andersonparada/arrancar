import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import type { Activo } from '../../../dominio/activo.js';
import type { Baja } from '../../../dominio/baja.js';
import { periodoDe } from '../../../dominio/depreciacion/meses.js';
import { BajaDeActivoAnulada, BajaDeActivoRegistrada, VentaDeActivoRegistrada } from '../../../dominio/eventos.js';
import type { IncisoFiscal } from '../../../dominio/incisos-fiscales.js';

interface DatosDelEvento {
  activo: Activo;
  baja: Baja;
  incisoFiscal: IncisoFiscal;
}

/** Quién es el activo para quien escucha y cuándo se dio de baja. */
function datosComunes({ activo, baja, incisoFiscal }: DatosDelEvento) {
  const { id, empresaId, claseId, localidadId, departamentoId } = activo.instantanea();
  const { id: bajaId, fecha } = baja.instantanea();
  return {
    empresaId: empresaId.valor,
    activoId: id.valor,
    claseId,
    incisoFiscal,
    localidadId,
    departamentoId,
    fecha,
    periodo: periodoDe(fecha),
    bajaId: bajaId.valor,
  };
}

function cifrasDelEvento({ cifras }: ReturnType<Baja['instantanea']>) {
  return {
    costoCentavos: cifras.costoCentavos,
    costoFiscalCentavos: cifras.costoFiscalCentavos,
    depreciacionAcumuladaContableCentavos: cifras.depreciacionAcumuladaContableCentavos,
    depreciacionAcumuladaFiscalCentavos: cifras.depreciacionAcumuladaFiscalCentavos,
    valorEnLibrosCentavos: cifras.valorEnLibrosCentavos,
  };
}

/** `activo_vendido` si es una venta; `activo_dado_de_baja` en las demás causas. */
export function eventoDeBaja(datos: DatosDelEvento): EventoDominio {
  const propiedades = datos.baja.instantanea();
  const { venta } = propiedades;
  if (!venta)
    return new BajaDeActivoRegistrada({
      ...datosComunes(datos),
      ...cifrasDelEvento(propiedades),
      causa: propiedades.causa,
    });
  return new VentaDeActivoRegistrada({
    ...datosComunes(datos),
    ...cifrasDelEvento(propiedades),
    precioCentavos: venta.precioCentavos,
    ivaCentavos: venta.ivaCentavos,
    serieFel: venta.serieFel,
    numeroFel: venta.numeroFel,
    autorizacionFel: venta.autorizacionFel,
    resultadoContableCentavos: propiedades.resultadoContableCentavos!,
    resultadoFiscalCentavos: propiedades.resultadoFiscalCentavos!,
  });
}

/** El evento de que la baja se anuló y el activo volvió a estar en uso. */
export function eventoDeBajaAnulada(datos: DatosDelEvento): BajaDeActivoAnulada {
  return new BajaDeActivoAnulada(datosComunes(datos));
}
