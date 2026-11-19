import { deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import type { Comprobante } from '../../../dominio/comprobantes.js';
import { avisoDeValeViejo, diasAbiertoDelVale } from '../../../dominio/reglas-de-vales-provisionales.js';
import { efectoEnLoPendiente } from '../../../dominio/reglas-de-comprobantes.js';
import type { ValeProvisional } from '../../../dominio/vales-provisionales.js';
import type { ValeProvisionalDto, ValeProvisionalResumenDto } from '../../dto/vales-provisionales.dto.js';
import { comprobanteDto } from '../comprobantes/armado-del-comprobante.js';

/** Cuándo y con cuántos días se avisa el vale viejo. */
export interface ContextoDelVale {
  hoy: string;
  diasParaAvisar: number;
  /** Avisos que no son del vale viejo (los de la liquidación). */
  avisos?: readonly string[];
}

/** El vale como lo ve la lista de un fondo. */
export function resumenDelVale(vale: ValeProvisional, contexto: ContextoDelVale): ValeProvisionalResumenDto {
  const { montoCentavos, devueltoCentavos, anioDeNumero: _anio, ...resto } = vale;
  const viejo =
    vale.estado === 'abierto'
      ? avisoDeValeViejo({
          numero: vale.numero,
          fecha: vale.fecha,
          hoy: contexto.hoy,
          diasParaAvisar: contexto.diasParaAvisar,
        })
      : null;
  return {
    ...resto,
    monto: deCentavos(montoCentavos),
    devuelto: deCentavos(devueltoCentavos),
    diasAbierto: diasAbiertoDelVale(vale, contexto.hoy),
    avisos: [...(contexto.avisos ?? []), ...(viejo === null ? [] : [viejo])],
  };
}

/** La ficha del vale con los comprobantes con los que se liquidó. */
export function fichaDelVale(
  por: { vale: ValeProvisional; comprobantes: readonly Comprobante[] },
  contexto: ContextoDelVale,
): ValeProvisionalDto {
  const vigentes = por.comprobantes.filter(({ estado }) => estado === 'vigente');
  const gastado = vigentes.reduce((suma, comprobante) => suma + efectoEnLoPendiente(comprobante), 0);
  return {
    ...resumenDelVale(por.vale, contexto),
    gastado: deCentavos(gastado),
    comprobantes: por.comprobantes.map(comprobanteDto),
  };
}
