import { inArray } from 'drizzle-orm';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { EfectoFiscalDeBancarizacion } from '../../../core/contratos/libro-de-compras.contratos.js';
import type { EfectosFiscalesDeDocumentos } from '../../aplicacion/puertos/puertos-de-bancarizacion.js';
import { datosFiscalesDeEmpresa } from './datos-fiscales.tablas.js';
import { documentos } from './documentos.tablas.js';

type Vigencia = typeof datosFiscalesDeEmpresa.$inferSelect;

/** La vigencia que rige en la fecha: la de `vigente_desde` más reciente que no la pase (nula es «desde el inicio»). */
function vigenteEn(vigencias: readonly Vigencia[], fecha: string): Vigencia | null {
  const rigen = vigencias.filter(({ vigenteDesde }) => vigenteDesde === null || vigenteDesde <= fecha);
  return rigen.sort((a, b) => (b.vigenteDesde ?? '').localeCompare(a.vigenteDesde ?? ''))[0] ?? null;
}

/**
 * Qué perdería cada documento sin bancarización. El IVA solo da crédito si el régimen que el documento copió al registrarse
 * era el general y le quedó IVA acreditable; el ISR solo deduce con ISR sobre utilidades según el régimen de la empresa en
 * el período del documento (RLS limita a la empresa activa).
 */
export class EfectosFiscalesDeDocumentosDrizzle implements EfectosFiscalesDeDocumentos {
  async de(documentoIds: readonly string[]): Promise<Map<string, EfectoFiscalDeBancarizacion>> {
    const efectos = new Map<string, EfectoFiscalDeBancarizacion>();
    if (documentoIds.length === 0) return efectos;
    const transaccion = transaccionEnCurso();
    const vigencias = await transaccion.select().from(datosFiscalesDeEmpresa);
    const filas = await transaccion
      .select({
        id: documentos.id,
        regimenIva: documentos.regimenIvaDeLaEmpresa,
        iva: documentos.iva,
        ivaNoAcreditable: documentos.ivaNoAcreditable,
        periodo: documentos.periodo,
      })
      .from(documentos)
      .where(inArray(documentos.id, [...documentoIds]));
    for (const fila of filas) {
      const daCredito = fila.regimenIva === 'general' && aCentavos(fila.iva) - aCentavos(fila.ivaNoAcreditable) > 0;
      const isr = vigenteEn(vigencias, fila.periodo)?.regimenIsr === 'utilidades';
      efectos.set(fila.id, { iva: daCredito, isr });
    }
    return efectos;
  }
}
