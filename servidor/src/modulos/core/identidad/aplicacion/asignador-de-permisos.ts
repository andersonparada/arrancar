import type { Auditoria } from '../../compartido/aplicacion/auditoria.js';
import { PermisoDesconocido } from '../../autorizacion/dominio/errores.js';
import { RolAjeno } from '../dominio/errores.js';
import type {
  AsignacionesDeUsuario,
  CambiosDeAsignaciones,
  CatalogoDePermisosAsignables,
} from './puertos/asignaciones-de-usuario.js';
import type { RolConPermisos } from './permisos-efectivos.js';
import type { PersonaAdministrada } from './usuario-de-la-cuenta.js';

interface Dependencias {
  asignaciones: AsignacionesDeUsuario;
  catalogo: CatalogoDePermisosAsignables;
  auditoria: Auditoria;
}

/** Lo que el usuario debe tener al terminar: todos sus roles y todos sus permisos directos. */
export interface AsignacionesSolicitadas {
  rolIds: readonly string[];
  permisos: readonly string[];
}

const sinRepetir = (valores: readonly string[]): string[] => [...new Set(valores)];
const diferencia = (a: readonly string[], b: readonly string[]): string[] => a.filter((x) => !b.includes(x));

/**
 * Deja al usuario con exactamente los roles y permisos directos indicados. Quien lo usa
 * ya comprobó el permiso `usuarios.asignar-permisos`: puede dar cualquier permiso
 * asignable (nunca los de solo superacceso). Cada cambio queda en la auditoría.
 */
export class AsignadorDePermisos {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws RolAjeno si algún rol no es de la cuenta.
   * @throws PermisoDesconocido si algún permiso no existe o no se puede asignar.
   */
  async reemplazar(persona: PersonaAdministrada, solicitadas: AsignacionesSolicitadas): Promise<void> {
    const { asignaciones } = this.dependencias;
    const rolIds = sinRepetir(solicitadas.rolIds);
    const permisos = sinRepetir(solicitadas.permisos);
    const roles = await asignaciones.rolesDeLaCuenta(persona.cuentaId);
    if (rolIds.some((id) => !roles.has(id))) throw new RolAjeno();
    for (const permiso of permisos) this.exigirAsignable(permiso);
    const actuales = await asignaciones.delUsuario(persona.usuarioId, persona.cuentaId);
    const cambios: CambiosDeAsignaciones = {
      rolesNuevos: diferencia(rolIds, actuales.rolIds),
      rolesQuitados: diferencia(actuales.rolIds, rolIds),
      permisosNuevos: diferencia(permisos, actuales.permisos),
      permisosQuitados: diferencia(actuales.permisos, permisos),
    };
    await asignaciones.cambiar(persona, cambios);
    await this.auditarRoles(persona, cambios, roles);
    await this.auditarPermisos(persona, cambios);
  }

  private exigirAsignable(permiso: string): void {
    if (!this.dependencias.catalogo.definicionDe(permiso)) throw new PermisoDesconocido(permiso);
  }

  private async auditarRoles(
    { usuarioId, usuario }: PersonaAdministrada,
    cambios: CambiosDeAsignaciones,
    roles: ReadonlyMap<string, RolConPermisos>,
  ): Promise<void> {
    const movimientos = [
      ...cambios.rolesNuevos.map((rolId) => ({ rolId, accion: 'asignar' as const })),
      ...cambios.rolesQuitados.map((rolId) => ({ rolId, accion: 'quitar' as const })),
    ];
    for (const { rolId, accion } of movimientos) {
      const rol = roles.get(rolId);
      const anterior = { usuarioId, usuario, rolId, rolNombre: rol?.nombre, accesoTotal: rol?.accesoTotal };
      await this.dependencias.auditoria.registrar({
        recurso: 'core.roles-de-usuario',
        registroId: usuarioId,
        accion,
        anterior,
      });
    }
  }

  private async auditarPermisos(
    { usuarioId, usuario }: PersonaAdministrada,
    cambios: CambiosDeAsignaciones,
  ): Promise<void> {
    const movimientos = [
      ...cambios.permisosNuevos.map((permiso) => ({ permiso, accion: 'asignar' as const })),
      ...cambios.permisosQuitados.map((permiso) => ({ permiso, accion: 'quitar' as const })),
    ];
    for (const { permiso, accion } of movimientos) {
      const descripcion = this.dependencias.catalogo.definicionDe(permiso)?.descripcion ?? null;
      const anterior = { usuarioId, usuario, permiso, descripcion };
      await this.dependencias.auditoria.registrar({
        recurso: 'core.permisos-de-usuario',
        registroId: usuarioId,
        accion,
        anterior,
      });
    }
  }
}
