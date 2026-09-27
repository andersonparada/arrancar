import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import type { AccesosAEmpresas } from './puertos/accesos-a-empresas.js';

/**
 * Qué empresas de su cuenta puede ver un operador: soporte ve todas; los demás,
 * solo aquellas de las que son miembros. Una empresa fuera de su alcance se
 * trata como inexistente, para no revelar que existe.
 */
export class AlcanceDelOperador {
  constructor(private readonly accesos: AccesosAEmpresas) {}

  async filtrar<Empresa extends { id: string }>(operador: Operador, empresas: Empresa[]): Promise<Empresa[]> {
    if (operador.esSuperacceso) return empresas;
    const propias = await this.accesos.empresasDelUsuario(operador.usuarioId);
    return empresas.filter((empresa) => propias.has(empresa.id));
  }

  async exigirAcceso(operador: Operador, empresaId: string): Promise<void> {
    if (operador.esSuperacceso) return;
    const propias = await this.accesos.empresasDelUsuario(operador.usuarioId);
    if (!propias.has(empresaId)) throw new RecursoNoEncontrado('La empresa');
  }
}
