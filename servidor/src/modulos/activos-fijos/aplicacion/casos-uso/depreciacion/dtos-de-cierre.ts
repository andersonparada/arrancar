import { deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import type { TotalesDelCierre } from '../../../dominio/depreciacion/cierre-del-mes.js';
import type { CierreGuardado } from '../../../dominio/depreciacion/cierre-guardado.js';
import type { CierreConClasesDto, CierreDto, RevisionDelCierreDto, TotalesDelCierreDto } from '../../dto/cierre.dto.js';
import type { TotalDeClase } from '../../puertos/consultas-de-cierre.js';
import type { CierreArmado } from './armador-del-cierre.js';

export function totalesADto(totales: TotalesDelCierre): TotalesDelCierreDto {
  return {
    contable: deCentavos(totales.contableCentavos),
    fiscal: deCentavos(totales.fiscalCentavos),
    activosDepreciados: totales.activosDepreciados,
  };
}

export function revisionADto(armado: CierreArmado): RevisionDelCierreDto {
  const { periodo, hallazgos, totales, regimenIsr, huella } = armado;
  return {
    periodo,
    hallazgos,
    puedeCerrar: hallazgos.every((hallazgo) => hallazgo.nivel !== 'bloquea'),
    totales: totalesADto(totales),
    regimenIsr,
    huella,
  };
}

export function cierreADto(cierre: CierreGuardado): CierreDto {
  return {
    periodo: cierre.periodo,
    estado: cierre.estado,
    cerradoEn: cierre.cerradoEn.toISOString(),
    cerradoPor: cierre.cerradoPor,
    reabiertoEn: cierre.reabiertoEn?.toISOString() ?? null,
    reabiertoPor: cierre.reabiertoPor,
    motivoDeReapertura: cierre.motivoDeReapertura,
    regimenIsr: cierre.regimenIsr,
    totalContable: deCentavos(cierre.totalContableCentavos),
    totalFiscal: deCentavos(cierre.totalFiscalCentavos),
    activosDepreciados: cierre.activosDepreciados,
  };
}

export function cierreConClasesADto(cierre: CierreGuardado, porClase: readonly TotalDeClase[]): CierreConClasesDto {
  return {
    ...cierreADto(cierre),
    porClase: porClase.map((total) => ({
      claseId: total.claseId,
      clase: total.clase,
      contable: deCentavos(total.contableCentavos),
      fiscal: deCentavos(total.fiscalCentavos),
    })),
  };
}
