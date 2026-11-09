import { aCentavos, deCentavos } from '../../../core/compartido/dominio/centavos.js';
import type { DocumentoNuevo } from '../../aplicacion/puertos/puertos-de-documentos.js';
import type { DocumentoPorPagar } from '../../dominio/documento-por-pagar.js';
import type { documentos } from './documentos.tablas.js';

type FilaDeDocumento = typeof documentos.$inferSelect;
/** La empresa la pone el repositorio con la de la transacción. */
type ValoresDeDocumento = Omit<typeof documentos.$inferInsert, 'empresaId'>;

const centavosONulo = (valor: string | null): number | null => (valor === null ? null : aCentavos(valor));

const montosDe = (fila: FilaDeDocumento) => ({
  totalCentavos: aCentavos(fila.total),
  retencionesCentavos: aCentavos(fila.retenciones),
  saldoAlInicioCentavos: centavosONulo(fila.saldoAlInicio),
  retencionesPorPracticarCentavos: centavosONulo(fila.retencionesPorPracticar),
  referencia: fila.referencia,
});

const seguimientoDe = (fila: FilaDeDocumento) => ({
  estado: fila.estado,
  registradoEn: fila.registradoEn?.toISOString() ?? null,
  registradoPor: fila.registradoPor,
  autorizadoEn: fila.autorizadoEn?.toISOString() ?? null,
  autorizadoPor: fila.autorizadoPor,
  autorizacionPropia: fila.autorizacionPropia,
});

/** Entre la fila de `documentos` y el documento del dominio: el dinero pasa de texto a centavos y de vuelta. */
export const mapeadorDeDocumento = {
  aDominio(fila: FilaDeDocumento): DocumentoPorPagar {
    return {
      id: fila.id,
      origen: fila.origen,
      documentoId: fila.documentoId,
      serie: fila.serie,
      numero: fila.numero,
      tipo: fila.tipo,
      proveedorId: fila.proveedorId,
      documentoAfectadoId: fila.documentoAfectadoId,
      fechaEmision: fila.fechaEmision,
      vencimiento: fila.vencimiento,
      tieneActivoFijo: fila.tieneActivoFijo,
      ingresadoPor: fila.creadoPor,
      ...montosDe(fila),
      ...seguimientoDe(fila),
    };
  },

  aFila(nuevo: DocumentoNuevo): ValoresDeDocumento {
    const { totalCentavos, retencionesCentavos, ...resto } = nuevo;
    return { ...resto, total: deCentavos(totalCentavos), retenciones: deCentavos(retencionesCentavos) };
  },
};
