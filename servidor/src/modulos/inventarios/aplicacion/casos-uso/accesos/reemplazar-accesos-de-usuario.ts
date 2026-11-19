import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { BodegaDto } from '../../dto/bodega.dto.js';
import type { MiembroDeLaEmpresa } from '../../dto/accesos-a-bodegas.dto.js';
import type { DependenciasDeAccesos } from './dependencias-de-accesos.js';

interface Cambio {
  accion: 'asignar' | 'quitar';
  miembro: MiembroDeLaEmpresa;
  bodega: BodegaDto;
  aSiMismo: boolean;
}

interface Plan {
  miembro: MiembroDeLaEmpresa;
  existentes: Map<string, BodegaDto>;
  actuales: string[];
  deseadas: string[];
  aSiMismo: boolean;
}

/** Las diferencias entre lo que tiene el usuario y lo que debe tener: primero lo que se asigna, luego lo que se quita. */
function planificar({ miembro, existentes, actuales, deseadas, aSiMismo }: Plan): Cambio[] {
  const cambios = (accion: Cambio['accion'], ids: string[]) =>
    ids.flatMap((id) => {
      const bodega = existentes.get(id);
      return bodega ? [{ accion, miembro, bodega, aSiMismo }] : [];
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
   * Deja al usuario con exactamente esas bodegas: inserta las nuevas, borra las que sobran y audita
   * cada cambio (`asignar` o `quitar`, con `aSiMismo` si el operador se lo hace a sí mismo).
   * @throws RecursoNoEncontrado si el usuario no trabaja en la empresa o alguna bodega no existe (no escribe nada).
   */
  ejecutar(operador: Operador, datos: { usuarioId: string; bodegaIds: string[] }): Promise<string[]> {
    const { unidadDeTrabajo, asignaciones } = this.dependencias;
    const deseadas = [...new Set(datos.bodegaIds)];
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const miembro = await asignaciones.miembro(datos.usuarioId);
      if (!miembro) throw new RecursoNoEncontrado('El usuario');
      const existentes = await this.bodegasPorId(deseadas);
      const actuales = await asignaciones.bodegaIdsDelUsuario(datos.usuarioId);
      const aSiMismo = datos.usuarioId === operador.usuarioId;
      await this.aplicar(planificar({ miembro, existentes, actuales, deseadas, aSiMismo }));
      return deseadas;
    });
  }

  private async bodegasPorId(deseadas: string[]): Promise<Map<string, BodegaDto>> {
    const todas = new Map((await this.dependencias.consultas.listar()).map((bodega) => [bodega.id, bodega]));
    if (deseadas.some((id) => !todas.has(id))) throw new RecursoNoEncontrado('La bodega');
    return todas;
  }

  private async aplicar(cambios: Cambio[]): Promise<void> {
    const { asignaciones, auditoria } = this.dependencias;
    for (const { accion, miembro, bodega, aSiMismo } of cambios) {
      const asignacion = { usuarioId: miembro.usuarioId, bodegaId: bodega.id };
      await (accion === 'asignar' ? asignaciones.asignar(asignacion) : asignaciones.quitar(asignacion));
      await auditoria.registrar({
        recurso: 'inventarios.accesos-a-bodegas',
        registroId: bodega.id,
        accion,
        anterior: {
          usuarioId: miembro.usuarioId,
          usuario: miembro.usuario,
          bodegaId: bodega.id,
          codigo: bodega.codigo,
          nombre: bodega.nombre,
          aSiMismo,
        },
      });
    }
  }
}
