import { deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import type { Activo } from '../../../dominio/activo.js';
import { vidaTotalContable } from '../../../dominio/depreciacion/estado-de-los-libros.js';
import { periodoDe } from '../../../dominio/depreciacion/meses.js';
import type { TramoCalculado } from '../../../dominio/depreciacion/tramo.js';
import { BaseFiscalCambiada, MejoraCapitalizada } from '../../../dominio/eventos.js';
import type { IncisoFiscal } from '../../../dominio/incisos-fiscales.js';
import type { Mejora } from '../../../dominio/mejora.js';
import type { ValoresDelInmuebleDeActivo } from '../../../dominio/reglas-de-activo.js';

/** Quién es el activo para quien escucha: su clase, su inciso fiscal y dónde está. */
function datosDelActivo(activo: Activo, incisoFiscal: IncisoFiscal, fecha: string) {
  const { id, empresaId, claseId, localidadId, departamentoId } = activo.instantanea();
  return {
    empresaId: empresaId.valor,
    activoId: id.valor,
    claseId,
    incisoFiscal,
    localidadId,
    departamentoId,
    fecha,
    periodo: periodoDe(fecha),
  };
}

export interface DatosDelEventoDeMejora {
  activo: Activo;
  incisoFiscal: IncisoFiscal;
  mejora: Mejora;
  montoCentavos: number;
  contable: TramoCalculado | null;
  fiscal: TramoCalculado | null;
}

/** El evento de que se registró una mejora o un costo posterior, con lo que una nota de crédito dejó de exceso (V-6). */
export function eventoDeMejora(datos: DatosDelEventoDeMejora): MejoraCapitalizada {
  const { activo, incisoFiscal, mejora, montoCentavos, contable, fiscal } = datos;
  const { id, fecha, clase, vidaUtilRestanteContableMeses } = mejora.instantanea();
  return new MejoraCapitalizada({
    ...datosDelActivo(activo, incisoFiscal, fecha),
    mejoraId: id.valor,
    clase,
    montoCentavos,
    vidaUtilRestanteContableMeses,
    excesoContableCentavos: contable?.excesoDeNotaDeCreditoCentavos ?? 0,
    excesoFiscalCentavos: fiscal?.excesoDeNotaDeCreditoCentavos ?? 0,
  });
}

export interface DatosDelEventoDeMatricula {
  activo: Activo;
  incisoFiscal: IncisoFiscal;
  anteriores: ValoresDelInmuebleDeActivo;
  fiscal: TramoCalculado;
  hoy: string;
}

/** El evento de que cambió la matrícula o el catastro, con los valores de antes y de después y la base fiscal nueva. */
export function eventoDeBaseFiscal(datos: DatosDelEventoDeMatricula): BaseFiscalCambiada {
  const { activo, incisoFiscal, anteriores, fiscal, hoy } = datos;
  const { valorDeMatricula, valorCatastral } = activo.instantanea();
  return new BaseFiscalCambiada({
    ...datosDelActivo(activo, incisoFiscal, hoy),
    valorDeMatriculaAnterior: anteriores.valorDeMatricula,
    valorCatastralAnterior: anteriores.valorCatastral,
    valorDeMatricula,
    valorCatastral,
    baseFiscalCentavos: fiscal.baseDelPorcentajeCentavos ?? 0,
  });
}

/**
 * Deja en el activo la vida útil total y el residual del tramo contable nuevo (o del que vuelve a regir): así la ficha
 * siempre dice con qué estimación se deprecia.
 */
export function aplicarEstimacion(
  activo: Activo,
  contable: Pick<TramoCalculado, 'desdePeriodo' | 'meses' | 'valorResidualCentavos'>,
): void {
  const inicio = activo.instantanea().fechaDeInicioDeUso;
  if (!inicio) return;
  activo.ajustarEstimacion({
    vidaUtilContableMeses: vidaTotalContable(inicio, contable),
    valorResidual: deCentavos(contable.valorResidualCentavos),
  });
}
