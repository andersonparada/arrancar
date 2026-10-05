import { deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import { accionesDeDocumento, type HechosDeUnDocumento } from '../../../dominio/baja-de-documento.js';
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
    serie: nota.serie,
    numero: nota.numero,
    fechaEmision: nota.fechaEmision,
    total: deCentavos(nota.total),
    estado: nota.estado,
  };
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
    procesadoEnDestinoEn: guardado.procesadoEnDestinoEn?.toISOString() ?? null,
    ...accionesDeDocumento(hechosDe(guardado)),
    notas: guardado.notas.map(dtoDeNota),
  };
}
