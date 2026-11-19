import type { Auditoria } from '../../../compartido/aplicacion/auditoria.js';
import { RecursoNoEncontrado } from '../../../compartido/aplicacion/errores.js';
import type { Operador } from '../../../compartido/aplicacion/operador.js';
import type { TareasDeLaTransaccion } from '../../../compartido/aplicacion/tareas-de-la-transaccion.js';
import type { UnidadDeTrabajo } from '../../../compartido/aplicacion/unidad-de-trabajo.js';
import { verificarCupos } from '../../dominio/cupos-de-correo.js';
import { CorreoNoReintentable, CorreoSinContenido } from '../errores-del-historial.js';
import type { CorreoDto } from '../dto/correo.dto.js';
import type { Despertador } from '../puertos/despertador.js';
import type { HistorialDeCorreos } from '../puertos/historial-de-correos.js';
import type { ParametrosDeCorreo } from '../puertos/parametros-de-correo.js';
import type { RepositorioDeCorreos } from '../puertos/repositorio-de-correos.js';
import { RECURSO_DE_CORREOS } from './cancelar-correo.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  historial: HistorialDeCorreos;
  repositorio: RepositorioDeCorreos;
  parametros: ParametrosDeCorreo;
  auditoria: Auditoria;
  tareas: TareasDeLaTransaccion;
  despertador: Despertador;
}

/** Vuelve a poner en la bandeja un correo que falló, con los cupos al día. Queda en la auditoría. */
export class ReintentarCorreo {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws RecursoNoEncontrado, CorreoNoReintentable, CorreoSinContenido (409), CupoDeCorreosAgotado (429).
   */
  ejecutar(operador: Operador, id: string): Promise<CorreoDto> {
    const { unidadDeTrabajo, historial, auditoria, tareas, despertador, repositorio } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const antes = await historial.buscar(id);
      if (!antes) throw new RecursoNoEncontrado('El correo');
      if (antes.estado !== 'fallido') throw new CorreoNoReintentable();
      if (antes.contenidoDepurado) throw new CorreoSinContenido();
      const direcciones = antes.destinatarios.map((destinatario) => destinatario.direccion);
      await this.exigirCupo(direcciones);
      if (!(await historial.reintentar(id))) throw new CorreoNoReintentable();
      await repositorio.marcarReintento(id, direcciones);
      await auditoria.registrar({
        recurso: RECURSO_DE_CORREOS,
        registroId: id,
        accion: 'reabrir',
        anterior: { estado: antes.estado, intentos: antes.intentos, asunto: antes.asunto },
      });
      await tareas.despuesDeConfirmar(async () => despertador.despertar(), 'despertar la bandeja de correo');
      return (await historial.buscar(id)) as CorreoDto;
    });
  }

  private async exigirCupo(direcciones: string[]): Promise<void> {
    const { repositorio, parametros } = this.dependencias;
    const [uso, topes] = await Promise.all([repositorio.reservarCupo(direcciones), parametros.topes()]);
    verificarCupos(uso, topes, direcciones);
  }
}
