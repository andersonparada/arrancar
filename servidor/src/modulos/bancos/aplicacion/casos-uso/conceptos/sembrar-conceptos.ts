import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { Concepto } from '../../../dominio/concepto.js';
import { CONCEPTOS_INICIALES } from '../../../dominio/conceptos-iniciales.js';
import type { RepositorioConceptos } from '../../puertos/repositorio-conceptos.js';

/**
 * Da a la empresa su catálogo de conceptos: los de sistema y la lista sugerida. Solo actúa
 * si la empresa no tiene ninguno (empresas nuevas o que contratan Bancos después de la
 * migración); una vez sembrado, el usuario manda y nada se vuelve a agregar.
 *
 * Corre dentro de la unidad de trabajo de quien la llama.
 */
export class SembrarConceptos {
  constructor(private readonly repositorio: RepositorioConceptos) {}

  async ejecutar(operador: Operador): Promise<void> {
    if (await this.repositorio.hayAlguno()) return;
    const empresaId = Identificador.desde<'Empresa'>(operador.empresaId);
    const conceptos = CONCEPTOS_INICIALES.map(({ claveDeSistema, datos }) =>
      claveDeSistema ? Concepto.crearDeSistema(empresaId, claveDeSistema, datos) : Concepto.crear(empresaId, datos),
    );
    await this.repositorio.sembrar(conceptos);
  }
}
