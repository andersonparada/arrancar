import { deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import type { Arqueo } from '../../../dominio/arqueos.js';
import type { Comprobante } from '../../../dominio/comprobantes.js';
import type { ArqueoDto, ArqueoResumenDto, LineaDeConteoDto } from '../../dto/arqueos.dto.js';
import { comprobanteDto } from '../comprobantes/armado-del-comprobante.js';

/** La fila de la lista: lo del arqueo sin el detalle del acta. */
export function resumenDelArqueo(arqueo: Arqueo): ArqueoResumenDto {
  return {
    id: arqueo.id,
    fondoId: arqueo.fondoId,
    numero: arqueo.numero,
    realizadoEn: arqueo.realizadoEn,
    custodio: arqueo.custodio,
    loHizoElCustodio: arqueo.loHizoElCustodio,
    efectivoContado: deCentavos(arqueo.efectivoContadoCentavos),
    valoresPorCambiar: deCentavos(arqueo.valoresPorCambiarCentavos),
    efectivoEsperado: deCentavos(arqueo.efectivoEsperadoCentavos),
    diferencia: deCentavos(arqueo.diferenciaCentavos),
    estado: arqueo.estado,
    fechaDeAnulacion: arqueo.fechaDeAnulacion,
    motivoDeAnulacion: arqueo.motivoDeAnulacion,
  };
}

const lineaDto = ({ denominacionCentavos, cantidad }: Arqueo['conteo'][number]): LineaDeConteoDto => ({
  denominacion: deCentavos(denominacionCentavos),
  cantidad,
  subtotal: deCentavos(denominacionCentavos * cantidad),
});

/** El arqueo completo con su conteo y el faltante o sobrante que originó. */
export function arqueoDto(por: {
  arqueo: Arqueo;
  comprobante: Comprobante | null;
  avisos?: readonly string[];
}): ArqueoDto {
  const { arqueo, comprobante } = por;
  return {
    ...resumenDelArqueo(arqueo),
    arqueadoPor: arqueo.arqueadoPorNombre,
    arqueadoPorId: arqueo.arqueadoPor,
    conteo: arqueo.conteo.map(lineaDto),
    montoDelFondo: deCentavos(arqueo.montoDelFondoCentavos),
    pendienteDeReponer: deCentavos(arqueo.pendienteDeReponerCentavos),
    valesAbiertos: deCentavos(arqueo.valesAbiertosCentavos),
    comprobantesCompletos: arqueo.comprobantesCompletos,
    motivoDeDiferencia: arqueo.motivoDeDiferencia,
    observaciones: arqueo.observaciones,
    destinoDelFaltante: comprobante?.destinoDelFaltante ?? null,
    comprobante: comprobante ? comprobanteDto(comprobante) : null,
    avisos: [...(por.avisos ?? [])],
  };
}
