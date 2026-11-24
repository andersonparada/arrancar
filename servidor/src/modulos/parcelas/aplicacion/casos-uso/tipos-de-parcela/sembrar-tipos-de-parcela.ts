import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { TipoDeParcela } from '../../../dominio/tipo-de-parcela.js';
import { TIPOS_DE_PARCELA_INICIALES } from '../../../dominio/tipos-de-parcela-iniciales.js';
import type { RepositorioTiposDeParcela } from '../../puertos/repositorio-tipos-de-parcela.js';

/**
 * Da a la empresa del operador su lista sugerida de tipos de parcela. Solo actúa si no tiene ninguno; una vez
 * sembrada, la empresa manda y nada se vuelve a agregar.
 *
 * Corre dentro de la unidad de trabajo de quien la llama.
 */
export class SembrarTiposDeParcela {
  constructor(private readonly repositorio: RepositorioTiposDeParcela) {}

  async ejecutar(operador: Operador): Promise<void> {
    if (await this.repositorio.hayAlguno()) return;
    const empresaId = Identificador.desde<'Empresa'>(operador.empresaId);
    const tipos = TIPOS_DE_PARCELA_INICIALES.map((nombre) => TipoDeParcela.crear(empresaId, { nombre, activo: true }));
    await this.repositorio.sembrar(tipos);
  }
}
