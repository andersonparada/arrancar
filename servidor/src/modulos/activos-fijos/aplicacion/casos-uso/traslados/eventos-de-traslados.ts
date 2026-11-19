import type { Activo } from '../../../dominio/activo.js';
import { periodoDe } from '../../../dominio/depreciacion/meses.js';
import { ActivoTrasladado, TrasladoAnulado } from '../../../dominio/eventos.js';
import type { IncisoFiscal } from '../../../dominio/incisos-fiscales.js';
import type { Traslado } from '../../../dominio/traslado.js';

interface DatosDelEvento {
  activo: Activo;
  incisoFiscal: IncisoFiscal;
  traslado: Traslado;
}

/** Quién es el activo para quien escucha y la ubicación en que quedó. */
function datosComunes({ activo, incisoFiscal, traslado }: DatosDelEvento) {
  const { id, empresaId, claseId, localidadId, departamentoId } = activo.instantanea();
  const { id: trasladoId, grupoId, fecha } = traslado.instantanea();
  return {
    empresaId: empresaId.valor,
    activoId: id.valor,
    claseId,
    incisoFiscal,
    localidadId,
    departamentoId,
    fecha,
    periodo: periodoDe(fecha),
    trasladoId: trasladoId.valor,
    grupoId,
  };
}

/** El evento de que el activo ya está en su destino; `origen` es donde estaba. */
export function eventoDeTraslado(datos: DatosDelEvento, origen: ActivoTrasladado['datos']['origen']): ActivoTrasladado {
  const { numero, responsable, aBodega } = datos.traslado.instantanea();
  return new ActivoTrasladado({ ...datosComunes(datos), numeroDeBoleta: numero, origen, responsable, aBodega });
}

/** El evento de que la boleta se anuló y el activo volvió a su ubicación anterior (ya puesta en el activo). */
export function eventoDeTrasladoAnulado(datos: DatosDelEvento): TrasladoAnulado {
  return new TrasladoAnulado(datosComunes(datos));
}
