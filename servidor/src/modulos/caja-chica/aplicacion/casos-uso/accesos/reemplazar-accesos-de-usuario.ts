import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { MiembroDeLaEmpresa } from '../../dto/accesos-a-fondos.dto.js';
import type { FondoDeLaEmpresa } from '../../puertos/asignaciones-de-fondos.js';
import type { DependenciasDeAccesos } from './accesos-a-fondos.js';

interface Cambio {
  accion: 'asignar' | 'quitar';
  miembro: MiembroDeLaEmpresa;
  fondo: FondoDeLaEmpresa;
  aSiMismo: boolean;
}

interface Plan {
  miembro: MiembroDeLaEmpresa;
  existentes: Map<string, FondoDeLaEmpresa>;
  actuales: string[];
  deseados: string[];
  aSiMismo: boolean;
}

/** Las diferencias entre lo que tiene el usuario y lo que debe tener: primero lo que se asigna, luego lo que se quita. */
function planificar({ miembro, existentes, actuales, deseados, aSiMismo }: Plan): Cambio[] {
  const cambios = (accion: Cambio['accion'], ids: string[]) =>
    ids.flatMap((id) => {
      const fondo = existentes.get(id);
      return fondo ? [{ accion, miembro, fondo, aSiMismo }] : [];
    });
  return [
    ...cambios(
      'asignar',
      deseados.filter((id) => !actuales.includes(id)),
    ),
    ...cambios(
      'quitar',
      actuales.filter((id) => !deseados.includes(id)),
    ),
  ];
}

export class ReemplazarAccesosDeUsuario {
  constructor(
    private readonly dependencias: Pick<DependenciasDeAccesos, 'unidadDeTrabajo' | 'asignaciones' | 'auditoria'>,
  ) {}

  /**
   * Deja al usuario con exactamente esos fondos: inserta los nuevos, borra los que sobran y audita cada cambio (`asignar`
   * o `quitar`, con `aSiMismo` si el operador se lo hace a sí mismo).
   * @throws RecursoNoEncontrado si el usuario no trabaja en la empresa o algún fondo no existe (no escribe nada).
   */
  ejecutar(operador: Operador, datos: { usuarioId: string; fondoIds: string[] }): Promise<string[]> {
    const { unidadDeTrabajo, asignaciones } = this.dependencias;
    const deseados = [...new Set(datos.fondoIds)];
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const miembro = await asignaciones.miembro(datos.usuarioId);
      if (!miembro) throw new RecursoNoEncontrado('El usuario');
      const existentes = await this.fondosPorId(deseados);
      const actuales = await asignaciones.fondoIdsDelUsuario(datos.usuarioId);
      const aSiMismo = datos.usuarioId === operador.usuarioId;
      await this.aplicar(planificar({ miembro, existentes, actuales, deseados, aSiMismo }));
      return deseados;
    });
  }

  private async fondosPorId(deseados: string[]): Promise<Map<string, FondoDeLaEmpresa>> {
    const todos = new Map((await this.dependencias.asignaciones.fondos()).map((fondo) => [fondo.id, fondo]));
    if (deseados.some((id) => !todos.has(id))) throw new RecursoNoEncontrado('El fondo');
    return todos;
  }

  private async aplicar(cambios: Cambio[]): Promise<void> {
    const { asignaciones, auditoria } = this.dependencias;
    for (const { accion, miembro, fondo, aSiMismo } of cambios) {
      const asignacion = { usuarioId: miembro.usuarioId, fondoId: fondo.id };
      await (accion === 'asignar' ? asignaciones.asignar(asignacion) : asignaciones.quitar(asignacion));
      await auditoria.registrar({
        recurso: 'caja-chica.accesos-a-fondos',
        registroId: fondo.id,
        accion,
        anterior: {
          usuarioId: miembro.usuarioId,
          usuario: miembro.usuario,
          fondoId: fondo.id,
          nombre: fondo.nombre,
          aSiMismo,
        },
      });
    }
  }
}
