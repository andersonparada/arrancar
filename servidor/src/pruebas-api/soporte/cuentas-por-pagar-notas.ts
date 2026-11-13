import type { DocumentosPorPagarDePrueba } from './cuentas-por-pagar.js';
import { consultar, type EscenarioDeDocumentos } from './escenario-de-documentos.js';

/** Los ids de una factura y de su nota, en Libro de compras y en Cuentas por pagar. */
export interface NotaConSaldoLibre {
  facturaId: string;
  notaId: string;
  facturaPropia: string;
  notaPropia: string;
}

/**
 * Una factura de Q1,120.00 con Q100.00 retenidos y una nota de crédito de Q1,120.00 que la rebaja por completo: la nota
 * aplica Q1,020.00 y le quedan Q100.00 de saldo libre.
 */
export async function notaConSaldoLibre(
  documentos: DocumentosPorPagarDePrueba,
  cambios: Record<string, unknown>,
): Promise<NotaConSaldoLibre> {
  const facturaId = await documentos.registrar(cambios);
  await consultar('update cuentas_por_pagar.documentos set retenciones = 100 where documento_id = $1', [facturaId]);
  const notaId = await documentos.registrarNota('NCRE', facturaId, { total: '1120.00', ...cambios });
  return {
    facturaId,
    notaId,
    facturaPropia: (await documentos.fila(facturaId))!.id,
    notaPropia: (await documentos.fila(notaId))!.id,
  };
}

/** Siembra un ajuste de saldo de la nota (el caso de uso que los crea llega en CP2-4); `anulado` trae su anulación completa. */
export async function sembrarAjuste(
  escenario: EscenarioDeDocumentos,
  notaPropia: string,
  { monto, estado = 'vigente' }: { monto: string; estado?: 'vigente' | 'anulado' },
): Promise<string> {
  const anulado = estado === 'anulado';
  const [usuario] = await consultar<{ id: string }>('select id from core.usuarios where usuario = $1', [
    escenario.cuenta.usuario,
  ]);
  const [fila] = await consultar<{ id: string }>(
    `insert into cuentas_por_pagar.ajustes_de_saldo (empresa_id, proveedor_id, documento_id, monto, fecha, causa, motivo,
       estado, anulado_en, anulado_por, motivo_de_anulacion)
     select empresa_id, proveedor_id, id, $2, current_date, 'no_recuperable', 'El proveedor cerró', $3,
            case when $4 then now() end, case when $4 then $5::uuid end, case when $4 then 'Error' end
       from cuentas_por_pagar.documentos where id = $1 returning id`,
    [notaPropia, monto, estado, anulado, usuario!.id],
  );
  return fila!.id;
}

/** Anula un ajuste sembrado, con su anulación completa. */
export async function anularAjuste(escenario: EscenarioDeDocumentos, ajusteId: string): Promise<void> {
  await consultar(
    `update cuentas_por_pagar.ajustes_de_saldo set estado = 'anulado', anulado_en = now(),
            anulado_por = (select id from core.usuarios where usuario = $2), motivo_de_anulacion = 'Error' where id = $1`,
    [ajusteId, escenario.cuenta.usuario],
  );
}

/** Siembra una aplicación manual de la nota al cargo (el caso de uso que las crea llega en CP2-3). */
export async function sembrarAplicacionManual({
  notaPropia,
  cargoPropio,
  monto,
  referencia = 'Acuerdo 1',
}: {
  notaPropia: string;
  cargoPropio: string;
  monto: string;
  referencia?: string;
}): Promise<string> {
  const [fila] = await consultar<{ id: string }>(
    `insert into cuentas_por_pagar.aplicaciones_de_notas (empresa_id, proveedor_id, nota_id, cargo_id, monto, forma, fecha,
       referencia)
     select empresa_id, proveedor_id, $1, $2, $3, 'manual', current_date, $4
       from cuentas_por_pagar.documentos where id = $1 returning id`,
    [notaPropia, cargoPropio, monto, referencia],
  );
  return fila!.id;
}
