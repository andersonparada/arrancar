import type { CierreGuardado } from '../../../dominio/cierre/cierre-guardado.js';
import type { TotalesDelCierre } from '../../../dominio/cierre/existencias-del-cierre.js';
import { deCentavosEnteros } from '../../../dominio/decimales.js';
import type {
  CierreConTiposDto,
  CierreDto,
  ExistenciaAlCierreDto,
  RevisionDelCierreDto,
  TotalesDelCierreDto,
} from '../../dto/cierre.dto.js';
import type { VistaDelKardex } from '../../dto/documento.dto.js';
import type { ExistenciaAlCierreGuardada } from '../../puertos/repositorio-de-cierres.js';
import type { CierreArmado } from './armador-del-cierre.js';

export function totalesADto(totales: TotalesDelCierre): TotalesDelCierreDto {
  return {
    valorTotal: deCentavosEnteros(totales.valorTotal),
    articulosConExistencia: totales.articulosConExistencia,
    porTipo: totales.porTipo.map(({ tipoDeInventario, valor }) => ({
      tipoDeInventario,
      valor: deCentavosEnteros(valor),
    })),
  };
}

export function revisionADto(armado: CierreArmado): RevisionDelCierreDto {
  const { periodo, hallazgos, totales, metodo, regimenIsr, huella } = armado;
  return {
    periodo,
    hallazgos,
    puedeCerrar: hallazgos.every((hallazgo) => hallazgo.nivel !== 'bloquea'),
    totales: totalesADto(totales),
    metodo,
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
    metodo: cierre.metodo,
    regimenIsr: cierre.regimenIsr,
    valorTotal: deCentavosEnteros(cierre.valorTotal),
    articulosConExistencia: cierre.articulosConExistencia,
  };
}

export function cierreConTiposADto(cierre: CierreGuardado, porTipo: TotalesDelCierre['porTipo']): CierreConTiposDto {
  return {
    ...cierreADto(cierre),
    porTipo: porTipo.map(({ tipoDeInventario, valor }) => ({ tipoDeInventario, valor: deCentavosEnteros(valor) })),
  };
}

/** Sin `costos.ver` el renglón lleva solo la cantidad. */
export function existenciaADto(fila: ExistenciaAlCierreGuardada, vista: VistaDelKardex): ExistenciaAlCierreDto {
  return {
    ...fila,
    costoUnitario: vista.verCostos ? fila.costoUnitario : null,
    valor: vista.verCostos ? fila.valor : null,
  };
}
