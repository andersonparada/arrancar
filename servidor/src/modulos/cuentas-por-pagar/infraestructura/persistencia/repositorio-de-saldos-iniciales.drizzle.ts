import { eq, sql } from 'drizzle-orm';
import { deCentavos } from '../../../core/compartido/dominio/centavos.js';
import {
  contextoEnCurso,
  transaccionEnCurso,
} from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  RepositorioDeSaldosIniciales,
  SaldoInicialAGuardar,
} from '../../aplicacion/puertos/puertos-de-saldos-iniciales.js';
import type { DocumentoPorPagar } from '../../dominio/documento-por-pagar.js';
import { mapeadorDeDocumento } from './documento.mapeador.js';
import { documentos } from './documentos.tablas.js';

/** Lo que cambia al cargar o corregir: el documento, el dinero y quién lo completó (siempre quien lo carga o corrige). */
function valoresDe(saldo: SaldoInicialAGuardar, registradoPor: string) {
  return {
    tipo: saldo.tipo,
    proveedorId: saldo.proveedorId,
    serie: saldo.serie,
    numero: saldo.numero,
    fechaEmision: saldo.fechaEmision,
    vencimiento: saldo.vencimiento,
    total: deCentavos(saldo.totalCentavos),
    retenciones: deCentavos(saldo.retencionesCentavos),
    saldoAlInicio: deCentavos(saldo.saldoPendienteCentavos),
    retencionesPorPracticar: deCentavos(saldo.retencionesPorPracticarCentavos),
    referencia: saldo.referencia,
    tieneActivoFijo: saldo.tieneActivoFijo,
    registradoEn: sql`now()`,
    registradoPor,
  };
}

/** La tabla tiene seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioDeSaldosInicialesDrizzle implements RepositorioDeSaldosIniciales {
  async agregar(saldo: SaldoInicialAGuardar, registradoPor: string): Promise<DocumentoPorPagar> {
    const valores = {
      ...valoresDe(saldo, registradoPor),
      empresaId: contextoEnCurso().empresaId,
      origen: 'saldo_inicial' as const,
      estado: 'registrado' as const,
    };
    const [fila] = await transaccionEnCurso().insert(documentos).values(valores).returning();
    return mapeadorDeDocumento.aDominio(fila!);
  }

  async reemplazar(id: string, saldo: SaldoInicialAGuardar, registradoPor: string): Promise<void> {
    await transaccionEnCurso().update(documentos).set(valoresDe(saldo, registradoPor)).where(eq(documentos.id, id));
  }
}
