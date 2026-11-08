import { Nit } from '../../core/compartido/dominio/objetos-valor/nit.js';
import type { ConsultasEmpresas } from './puertos/consultas-empresas.js';

/**
 * Avisa, sin impedir nada, que otra empresa de la cuenta ya tiene el mismo NIT. No nombra a la otra empresa porque
 * el usuario podría no tener acceso a ella. Debe correr dentro de la unidad de trabajo.
 */
export async function avisosDeNitRepetido(
  consultas: ConsultasEmpresas,
  empresa: { id: string; cuentaId: string; nit: string | null },
): Promise<string[]> {
  if (!empresa.nit) return [];
  const nit = Nit.crear(empresa.nit);
  if (nit.esConsumidorFinal()) return [];
  const repetido = await consultas.nitRepetidoEnCuenta({
    cuentaId: empresa.cuentaId,
    nit: nit.valor,
    excluirEmpresaId: empresa.id,
  });
  if (!repetido) return [];
  return [
    `Otra empresa de esta cuenta ya tiene el NIT ${nit.formateado()}. Los documentos de la SAT se registran una ` +
      'sola vez por cuenta: un DTE registrado en una de las dos no se podrá registrar en la otra.',
  ];
}
