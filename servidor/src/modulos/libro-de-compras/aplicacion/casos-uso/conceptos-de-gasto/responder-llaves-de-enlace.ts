import type { LlaveDeEnlace, RolDeCuenta } from '../../../../core/contratos/contabilidad.contratos.js';
import { NOMBRES_DE_REGLAS_DE_RETENCION } from '../../../dominio/nombres-de-reglas-de-retencion.js';
import { REGLAS_DE_RETENCION } from '../../../dominio/retencion-propuesta.js';
import type { ConsultasConceptosDeGasto } from '../../puertos/consultas-conceptos-de-gasto.js';

/**
 * Responde la pregunta `contabilidad.llaves_de_enlace` con lo que el libro enlaza a una cuenta contable: las reglas de
 * retención (rol `retencion_por_pagar`, las nueve de siempre, todas activas) y sus conceptos de gasto (rol
 * `gasto_por_concepto`). Corre en la transacción de quien pregunta. De los demás roles no dice nada.
 */
export class ResponderLlavesDeEnlaceDelLibro {
  constructor(private readonly conceptos: Pick<ConsultasConceptosDeGasto, 'listar'>) {}

  async ejecutar({ rol }: { rol: RolDeCuenta }): Promise<LlaveDeEnlace[] | null> {
    if (rol === 'retencion_por_pagar') {
      return REGLAS_DE_RETENCION.map((regla) => ({
        llave: regla,
        nombre: NOMBRES_DE_REGLAS_DE_RETENCION[regla],
        activo: true,
      }));
    }
    if (rol === 'gasto_por_concepto') {
      const conceptos = await this.conceptos.listar();
      return conceptos.map(({ id, nombre, activo }) => ({ llave: id, nombre, activo }));
    }
    return null;
  }
}
