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

/** La vista de la auditoría: guarda el cierre tal como estaba, sin recortes. */
const VISTA_COMPLETA: VistaDelKardex = { verCostos: true, veTodasLasBodegas: true };

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

/** Lo que ve cada usuario de los totales: sin `costos.ver` no hay montos (§10.1). */
export function totalesVisiblesADto(totales: TotalesDelCierre, vista: VistaDelKardex): TotalesDelCierreDto {
  const completos = totalesADto(totales);
  if (vista.verCostos) return completos;
  return { ...completos, valorTotal: null, porTipo: [] };
}

export function revisionADto(armado: CierreArmado, vista: VistaDelKardex): RevisionDelCierreDto {
  const { periodo, hallazgos, totales, metodo, regimenIsr, huella } = armado;
  return {
    periodo,
    hallazgos,
    puedeCerrar: hallazgos.every((hallazgo) => hallazgo.nivel !== 'bloquea'),
    totales: totalesVisiblesADto(totales, vista),
    metodo,
    regimenIsr,
    huella,
  };
}

/** Sin `costos.ver` no lleva el valor; sin alcance total tampoco las cifras de la empresa entera (§5.10, §10.1). */
export function cierreADto(cierre: CierreGuardado, vista: VistaDelKardex): CierreDto {
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
    valorTotal: vista.verCostos && vista.veTodasLasBodegas ? deCentavosEnteros(cierre.valorTotal) : null,
    articulosConExistencia: vista.veTodasLasBodegas ? cierre.articulosConExistencia : null,
  };
}

export function cierreConTiposADto(cierre: CierreGuardado, porTipo: TotalesDelCierre['porTipo']): CierreConTiposDto {
  return {
    ...cierreADto(cierre, VISTA_COMPLETA),
    valorTotal: deCentavosEnteros(cierre.valorTotal),
    articulosConExistencia: cierre.articulosConExistencia,
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
