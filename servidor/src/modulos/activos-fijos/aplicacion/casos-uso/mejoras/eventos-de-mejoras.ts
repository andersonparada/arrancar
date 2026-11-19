import { deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import type { Activo } from '../../../dominio/activo.js';
import { vidaTotalContable } from '../../../dominio/depreciacion/estado-de-los-libros.js';
import { periodoDe } from '../../../dominio/depreciacion/meses.js';
import type { TramoCalculado, TramoGuardado } from '../../../dominio/depreciacion/tramo.js';
import { VidaUtilTotalExcedida } from '../../../dominio/errores-de-mejora.js';
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

const VIDA_UTIL_TOTAL_MAXIMA = 1200;

/**
 * Deja en el activo la vida útil y el residual del último tramo contable vigente (el nuevo o el que vuelve a regir): así
 * la ficha siempre dice con qué estimación se deprecia. La vida se cuenta desde el primer tramo contable. Si nada
 * cambia, no reescribe el activo y devuelve `false`.
 * @throws VidaUtilTotalExcedida si la vida guardada pasaría de 1,200 meses.
 */
export function aplicarEstimacion(activo: Activo, tramosVigentes: readonly TramoGuardado[]): boolean {
  const contables = tramosVigentes.filter((tramo) => tramo.libro === 'contable').sort(porDesde);
  const vigente = contables.at(-1);
  if (!vigente || !activo.instantanea().fechaDeInicioDeUso) return false;
  const vida = vidaTotalContable(contables[0]!.desdePeriodo, vigente);
  if (vida > VIDA_UTIL_TOTAL_MAXIMA) throw new VidaUtilTotalExcedida(vida);
  const residual = deCentavos(vigente.valorResidualCentavos);
  const { vidaUtilContableMeses, valorResidual } = activo.instantanea();
  if (vidaUtilContableMeses === vida && valorResidual === residual) return false;
  activo.ajustarEstimacion({ vidaUtilContableMeses: vida, valorResidual: residual });
  return true;
}

function porDesde(a: TramoGuardado, b: TramoGuardado): number {
  return a.desdePeriodo.localeCompare(b.desdePeriodo);
}
