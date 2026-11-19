import type { EnlaceDeAviso } from '@/modulos/core/almacenes/avisos';

/**
 * El enlace «Imprimir el cheque» que acompaña al aviso de éxito al emitir; `undefined` si el usuario no puede imprimir
 * (no tiene el permiso): el servidor valida igual al imprimir.
 */
export function enlaceParaImprimir(chequeId: string, puedeImprimir: boolean): EnlaceDeAviso | undefined {
  if (!puedeImprimir) return undefined;
  return { texto: 'Imprimir el cheque', ruta: { name: 'bancos.cheques.imprimir', query: { ids: chequeId } } };
}
