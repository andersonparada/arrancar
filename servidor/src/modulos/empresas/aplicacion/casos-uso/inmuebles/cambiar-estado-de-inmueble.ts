import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { InmuebleDto } from '../../dto/inmueble.dto.js';
import { inmuebleExistente, inmuebleParaAuditar, type DependenciasDeInmuebles } from './dependencias-de-inmuebles.js';

/**
 * Inactivar y reactivar un inmueble: el registro no cambia, solo su estado, y la auditoría guarda cómo estaba
 * (sin ruido si ya estaba así).
 */
export abstract class CambiarEstadoDeInmueble {
  protected abstract readonly activoDespues: boolean;

  constructor(private readonly dependencias: DependenciasDeInmuebles) {}

  /** @throws RecursoNoEncontrado si no existe o el operador no lo ve. */
  ejecutar(operador: Operador, inmuebleId: string): Promise<InmuebleDto> {
    const { unidadDeTrabajo, repositorio, consultas, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const inmueble = await inmuebleExistente(repositorio, inmuebleId);
      const { valores, ...actual } = await inmuebleParaAuditar(this.dependencias, inmuebleId);
      if (actual.activo === this.activoDespues) return actual;
      if (this.activoDespues) inmueble.reactivar();
      else inmueble.inactivar();
      await repositorio.guardar(inmueble);
      await auditoria.registrar({
        recurso: 'empresas.inmuebles',
        registroId: inmuebleId,
        accion: this.activoDespues ? 'reactivar' : 'inactivar',
        anterior: { ...actual, valores },
      });
      return consultas.obtener(inmuebleId);
    });
  }
}
