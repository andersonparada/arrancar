import { DatosFiscalesDeEmpresa } from '../../../dominio/datos-fiscales-de-empresa.js';
import type { RepositorioDeDatosFiscalesDeEmpresa } from '../../puertos/repositorios-de-datos-fiscales.js';

/**
 * Si la empresa acredita hoy el IVA de sus compras (sin datos guardados, valen los de omisión). Es lo que usan
 * las bajas para decidir si avisan de rectificar; el paso R1-4 lo cambiará por el régimen del período del documento.
 */
export async function empresaConCreditoFiscal(
  datosFiscales: RepositorioDeDatosFiscalesDeEmpresa,
  empresaId: string,
): Promise<boolean> {
  const datos = (await datosFiscales.buscar(empresaId)) ?? DatosFiscalesDeEmpresa.porOmision();
  return datos.daCreditoFiscal();
}
