import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { LocalidadDto } from '../../dto/localidad.dto.js';
import type { MiembroDeLaEmpresa } from '../../dto/accesos-a-localidades.dto.js';
import type { DependenciasDeAccesos } from './dependencias-de-accesos.js';

interface Cambio {
  accion: 'asignar' | 'quitar';
  miembro: MiembroDeLaEmpresa;
  localidad: LocalidadDto;
  aSiMismo: boolean;
}

interface Plan {
  miembro: MiembroDeLaEmpresa;
  existentes: Map<string, LocalidadDto>;
  actuales: string[];
  deseadas: string[];
  aSiMismo: boolean;
}

/** Las diferencias entre lo que tiene el usuario y lo que debe tener: primero lo que se asigna, luego lo que se quita. */
function planificar({ miembro, existentes, actuales, deseadas, aSiMismo }: Plan): Cambio[] {
  const cambios = (accion: Cambio['accion'], ids: string[]) =>
    ids.flatMap((id) => {
      const localidad = existentes.get(id);
      return localidad ? [{ accion, miembro, localidad, aSiMismo }] : [];
    });
  return [
    ...cambios(
      'asignar',
      deseadas.filter((id) => !actuales.includes(id)),
    ),
    ...cambios(
      'quitar',
      actuales.filter((id) => !deseadas.includes(id)),
    ),
  ];
}

export class ReemplazarAccesosDeUsuario {
  constructor(private readonly dependencias: DependenciasDeAccesos) {}

  /**
   * Deja al usuario con exactamente esas localidades: inserta las nuevas, borra las que sobran y audita
   * cada cambio (`asignar` o `quitar`, con `aSiMismo` si el operador se lo hace a sí mismo).
   * @throws RecursoNoEncontrado si el usuario no trabaja en la empresa o alguna localidad no existe (no escribe nada).
   */
  ejecutar(operador: Operador, datos: { usuarioId: string; localidadIds: string[] }): Promise<string[]> {
    const { unidadDeTrabajo, asignaciones } = this.dependencias;
    const deseadas = [...new Set(datos.localidadIds)];
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const miembro = await asignaciones.miembro(datos.usuarioId);
      if (!miembro) throw new RecursoNoEncontrado('El usuario');
      const existentes = await this.localidadesPorId(deseadas);
      const actuales = await asignaciones.localidadIdsDelUsuario(datos.usuarioId);
      const aSiMismo = datos.usuarioId === operador.usuarioId;
      await this.aplicar(planificar({ miembro, existentes, actuales, deseadas, aSiMismo }));
      return deseadas;
    });
  }

  private async localidadesPorId(deseadas: string[]): Promise<Map<string, LocalidadDto>> {
    const todas = new Map((await this.dependencias.consultas.listar()).map((localidad) => [localidad.id, localidad]));
    if (deseadas.some((id) => !todas.has(id))) throw new RecursoNoEncontrado('La localidad');
    return todas;
  }

  private async aplicar(cambios: Cambio[]): Promise<void> {
    const { asignaciones, auditoria } = this.dependencias;
    for (const { accion, miembro, localidad, aSiMismo } of cambios) {
      const asignacion = { usuarioId: miembro.usuarioId, localidadId: localidad.id };
      await (accion === 'asignar' ? asignaciones.asignar(asignacion) : asignaciones.quitar(asignacion));
      await auditoria.registrar({
        recurso: 'empresas.accesos-a-localidades',
        registroId: localidad.id,
        accion,
        anterior: {
          usuarioId: miembro.usuarioId,
          usuario: miembro.usuario,
          localidadId: localidad.id,
          codigo: localidad.codigo,
          nombre: localidad.nombre,
          aSiMismo,
        },
      });
    }
  }
}
