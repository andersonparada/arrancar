import { deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import { accionesDeDocumento, type HechosDeUnDocumento } from '../../../dominio/baja-de-documento.js';
import { FAMILIAS_QUE_ADMITEN_NOTA_DE_DEBITO } from '../../../dominio/tipos-de-documento.js';
import type { DocumentoFichaDto, NotaDeFacturaDto } from '../../dto/documento-ficha.dto.js';
import type { DocumentoGuardado, NotaDeFactura } from '../../puertos/puertos-de-baja-de-documentos.js';
import { dtoDeDocumento } from './dto-de-documento.js';

/** Los hechos que deciden si se anula o se elimina: el estado, lo que dijo el destino y las notas. */
export function hechosDe({ estado, procesadoEnDestinoEn, notas }: DocumentoGuardado): HechosDeUnDocumento {
  return {
    anulado: estado === 'anulado',
    procesadoEnElDestino: procesadoEnDestinoEn !== null,
    notasVigentes: notas.filter((nota) => nota.estado === 'vigente').length,
    notasEnTotal: notas.length,
  };
}

function dtoDeNota(nota: NotaDeFactura): NotaDeFacturaDto {
  return {
    id: nota.id,
    tipo: nota.tipo,
    serie: nota.serie,
    numero: nota.numero,
    fechaEmision: nota.fechaEmision,
    total: deCentavos(nota.total),
    estado: nota.estado,
  };
}

/** El total de la factura más sus notas de débito vigentes menos sus notas de crédito vigentes; `null` si no es factura. */
function totalAjustadoDe(guardado: DocumentoGuardado): string | null {
  if (!FAMILIAS_QUE_ADMITEN_NOTA_DE_DEBITO.includes(guardado.documento.tipo)) return null;
  const vigentes = guardado.notas.filter((nota) => nota.estado === 'vigente');
  const suma = (tipo: NotaDeFactura['tipo']) =>
    vigentes.filter((nota) => nota.tipo === tipo).reduce((acumulado, nota) => acumulado + nota.total, 0);
  const ajustado = guardado.documento.totales.total + suma('nota_de_debito') - suma('nota_de_credito');
  return deCentavos(ajustado);
}

/** La ficha de un documento guardado; también es el «antes» que queda en la auditoría de anular y eliminar. */
export function dtoDeFicha(guardado: DocumentoGuardado): DocumentoFichaDto {
  const documento = dtoDeDocumento(guardado.documento, true);
  return {
    ...documento,
    id: guardado.documento.id,
    estado: guardado.estado,
    anuladoEn: guardado.anuladoEn?.toISOString() ?? null,
    anuladoPor: guardado.anuladoPor,
    motivoDeAnulacion: guardado.motivoDeAnulacion,
    causaDeAnulacion: guardado.causaDeAnulacion,
    procesadoEnDestinoEn: guardado.procesadoEnDestinoEn?.toISOString() ?? null,
    ...accionesDeDocumento(hechosDe(guardado)),
    motivoDeLaFactura: guardado.motivoDeLaFactura,
    notas: guardado.notas.map(dtoDeNota),
    totalAjustado: totalAjustadoDe(guardado),
  };
}
