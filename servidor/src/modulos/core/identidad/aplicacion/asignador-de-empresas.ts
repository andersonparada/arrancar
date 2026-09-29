import type { Auditoria } from '../../compartido/aplicacion/auditoria.js';
import { exigirEmpresasSinRepetir } from '../dominio/acceso-a-empresa.js';
import { EmpresaAjena } from '../dominio/errores.js';
import type { AccesosAEmpresas } from './puertos/accesos-a-empresas.js';
import type { PersonaAdministrada } from './usuario-de-la-cuenta.js';

interface Dependencias {
  accesos: AccesosAEmpresas;
  auditoria: Auditoria;
}

/**
 * Deja al usuario en exactamente las empresas indicadas de la cuenta. Cada empresa
 * que se le da o se le quita queda en la auditoría (`core.empresas-de-usuario`): al
 * quitarla también se borran, en cascada, sus accesos a registros de esa empresa.
 */
export class AsignadorDeEmpresas {
  constructor(private readonly dependencias: Dependencias) {}

  /** @throws EmpresaRepetida o EmpresaAjena si alguna empresa no es válida para la cuenta. */
  async reemplazar(persona: PersonaAdministrada, empresaIds: readonly string[]): Promise<void> {
    const { accesos } = this.dependencias;
    exigirEmpresasSinRepetir(empresaIds);
    const deLaCuenta = await accesos.empresasDeLaCuenta(persona.cuentaId);
    if (empresaIds.some((id) => !deLaCuenta.has(id))) throw new EmpresaAjena();
    const actuales = await accesos.empresasDelUsuario(persona.usuarioId, persona.cuentaId);
    const nuevas = empresaIds.filter((id) => !actuales.has(id));
    const quitadas = [...actuales].filter((id) => !empresaIds.includes(id));
    await accesos.quitar(persona.usuarioId, quitadas);
    await accesos.agregar(persona.usuarioId, nuevas);
    await this.auditar(persona, { accion: 'asignar', ids: nuevas, nombres: deLaCuenta });
    await this.auditar(persona, { accion: 'quitar', ids: quitadas, nombres: deLaCuenta });
  }

  private async auditar(
    { usuarioId, usuario }: PersonaAdministrada,
    {
      accion,
      ids,
      nombres,
    }: { accion: 'asignar' | 'quitar'; ids: readonly string[]; nombres: ReadonlyMap<string, string> },
  ): Promise<void> {
    for (const empresaId of ids) {
      const anterior = { usuarioId, usuario, empresaId, empresaNombre: nombres.get(empresaId) ?? null };
      await this.dependencias.auditoria.registrar({
        recurso: 'core.empresas-de-usuario',
        registroId: usuarioId,
        accion,
        anterior,
      });
    }
  }
}
