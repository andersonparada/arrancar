import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { Unidad } from '../../../dominio/unidad.js';
import { UNIDADES_SUGERIDAS } from '../../../dominio/unidades-iniciales.js';
import type { DependenciasDeUnidades } from './dependencias-de-unidades.js';

/**
 * Da a la empresa su lista sugerida de unidades de medida. Solo actúa si no tiene ninguna (empresa nueva o que
 * activa el módulo después); una vez sembrada, la empresa manda y nada se vuelve a agregar. Corre dentro de la
 * unidad de trabajo de quien la llama, con la empresa a sembrar como empresa activa.
 */
export class SembrarUnidades {
  constructor(private readonly dependencias: Pick<DependenciasDeUnidades, 'repositorio'>) {}

  async ejecutar(operador: Operador): Promise<void> {
    const { repositorio } = this.dependencias;
    if (await repositorio.hayAlguna()) return;
    const empresaId = Identificador.desde<'Empresa'>(operador.empresaId);
    const unidades = UNIDADES_SUGERIDAS.map((sugerida) => Unidad.crear(empresaId, { ...sugerida, activo: true }));
    await repositorio.sembrar(unidades);
  }
}
