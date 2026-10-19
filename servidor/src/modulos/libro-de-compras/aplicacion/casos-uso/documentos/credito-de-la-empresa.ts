import type { RepositorioDeDatosFiscalesDeEmpresa } from '../../puertos/repositorios-de-datos-fiscales.js';

/**
 * Lo que las bajas necesitan para decidir si avisan de rectificar: el período del documento y si la empresa acredita
 * el IVA de sus compras en él (el régimen de ese período, no el de hoy). Si por algo no hubiera datos de ese
 * período, vale que sí acredita.
 */
export async function bajaDelPeriodo(
  datosFiscales: RepositorioDeDatosFiscalesDeEmpresa,
  empresaId: string,
  periodo: string,
): Promise<{ periodo: string; empresaConCreditoFiscal: boolean }> {
  const datos = await datosFiscales.vigenteEn(empresaId, periodo);
  return { periodo, empresaConCreditoFiscal: datos?.daCreditoFiscal() ?? true };
}
