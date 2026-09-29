import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { exigirConceptoElegible, type TipoDeMovimiento } from '../dominio/asignacion-de-concepto.js';
import type { Concepto } from '../dominio/concepto.js';
import { ConceptoObligatorio } from '../dominio/errores-de-conceptos.js';
import { SembrarConceptos } from './casos-uso/conceptos/sembrar-conceptos.js';
import type { RepositorioConceptos } from './puertos/repositorio-conceptos.js';

interface EleccionOpcional {
  /** El concepto que el movimiento ya tenía (al corregirlo): no se le exige que siga activo. */
  actual?: string;
}

/**
 * Da a las notas, los cheques, las transferencias y el saldo inicial el concepto que les toca (H3b): el que
 * elige el usuario, revisado con las reglas del contador, o el de sistema que asigna el propio sistema.
 * Corre dentro de la unidad de trabajo de quien lo llama.
 */
export class ConceptosDeMovimientos {
  private readonly sembrar: SembrarConceptos;

  constructor(private readonly repositorio: RepositorioConceptos) {
    this.sembrar = new SembrarConceptos(repositorio);
  }

  /** @throws RecursoNoEncontrado si no existe o es de otra empresa. */
  async existente(conceptoId: string): Promise<Concepto> {
    const concepto = await this.repositorio.buscar(Identificador.desde(conceptoId));
    if (!concepto) throw new RecursoNoEncontrado('El concepto');
    return concepto;
  }

  /**
   * El concepto que eligió el usuario para una nota o un cheque original.
   * @throws ConceptoObligatorio si no eligió; RecursoNoEncontrado si no existe o es de otra empresa.
   * @throws ConceptoDeSistemaNoSeElige, ConceptoInactivo o ConceptoIncompatible.
   */
  async elegido(
    conceptoId: string | undefined,
    tipo: TipoDeMovimiento,
    { actual }: EleccionOpcional = {},
  ): Promise<Concepto> {
    if (!conceptoId) throw new ConceptoObligatorio();
    const concepto = await this.existente(conceptoId);
    exigirConceptoElegible(concepto.instantanea(), tipo, { yaAsignado: actual === conceptoId });
    return concepto;
  }

  /** El concepto de sistema con esa clave; siembra el catálogo si la empresa todavía no lo tiene. */
  async deSistema(operador: Operador, clave: string): Promise<Concepto> {
    await this.sembrar.ejecutar(operador);
    const concepto = await this.repositorio.buscarDeSistema(clave);
    if (!concepto) throw new Error(`La empresa no tiene el concepto de sistema "${clave}".`);
    return concepto;
  }
}
