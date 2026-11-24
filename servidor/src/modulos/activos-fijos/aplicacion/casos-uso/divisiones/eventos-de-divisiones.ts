import type { Activo } from '../../../dominio/activo.js';
import type { Division } from '../../../dominio/division.js';
import { ActivoDividido, DivisionAnulada } from '../../../dominio/eventos.js';
import type { IncisoFiscal } from '../../../dominio/incisos-fiscales.js';

/** Quién es el activo de origen para quien escucha: su clase, su inciso fiscal y dónde está. */
function datosDelOrigen(origen: Activo, incisoFiscal: IncisoFiscal, division: Division) {
  const { empresaId, id, claseId, localidadId, departamentoId } = origen.instantanea();
  const { fecha, periodo } = division.instantanea();
  return {
    empresaId: empresaId.valor,
    activoId: id.valor,
    claseId,
    incisoFiscal,
    localidadId,
    departamentoId,
    fecha,
    periodo,
  };
}

/** El evento de que un activo se dividió, con lo que se llevó el activo nuevo (en centavos). */
export function eventoDeActivoDividido(datos: {
  origen: Activo;
  division: Division;
  incisoFiscal: IncisoFiscal;
}): ActivoDividido {
  const { origen, division, incisoFiscal } = datos;
  const d = division.instantanea();
  return new ActivoDividido({
    ...datosDelOrigen(origen, incisoFiscal, division),
    divisionId: d.id.valor,
    activoOrigenId: d.activoOrigenId,
    activoNuevoId: d.activoNuevoId!,
    cantidadSeparada: d.cantidadSeparada,
    costoCentavos: d.costoSeparadoCentavos,
    costoFiscalCentavos: d.costoFiscalSeparadoCentavos,
    acumuladaContableCentavos: d.acumuladaContableSeparadaCentavos,
    acumuladaFiscalCentavos: d.acumuladaFiscalSeparadaCentavos,
    causa: d.causa,
  });
}

/** El evento de que se anuló una división. */
export function eventoDeDivisionAnulada(datos: {
  origen: Activo;
  division: Division;
  incisoFiscal: IncisoFiscal;
}): DivisionAnulada {
  const { origen, division, incisoFiscal } = datos;
  return new DivisionAnulada({
    ...datosDelOrigen(origen, incisoFiscal, division),
    divisionId: division.id.valor,
  });
}
