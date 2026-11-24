import { auditarCambioDeEstado } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { BodegaConExistencias, BodegaConTrasladosEnTransito } from '../../../dominio/errores.js';
import { datosDeBodega } from '../../datos-de-bodega.js';
import type { BodegaDto, SolicitudDeBodega } from '../../dto/bodega.dto.js';
import { auditarAsignacionesAlGuardar } from './auditar-asignaciones-al-guardar.js';
import { bodegaExistente, type DependenciasDeBodegas } from './dependencias-de-bodegas.js';

interface CambioDeBodega {
  bodegaId: string;
  solicitud: SolicitudDeBodega;
}

export class ActualizarBodega {
  constructor(private readonly dependencias: DependenciasDeBodegas) {}

  /**
   * Inactivar o reactivar queda en la auditoría. Un responsable nuevo con usuario recibe acceso (disparador) y su
   * asignación también queda registrada; el anterior conserva el suyo hasta que se le quite en la ventana de accesos.
   * @throws RecursoNoEncontrado si no existe o el operador no la ve, o si la localidad o el responsable no existen.
   * @throws BodegaConExistencias si tiene existencias y se inactiva.
   * @throws BodegaConTrasladosEnTransito si es origen o destino de un traslado en camino y se inactiva.
   */
  ejecutar(operador: Operador, { bodegaId, solicitud }: CambioDeBodega): Promise<BodegaDto> {
    const { unidadDeTrabajo, repositorio, consultas, accesos } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const bodega = await bodegaExistente(repositorio, bodegaId);
      const anterior = await consultas.obtener(bodegaId);
      await consultas.exigirReferencias(solicitud);
      if (anterior.activo && !solicitud.activo) await this.exigirSinUso(bodegaId);
      const antes = await accesos.usuariosConAcceso(bodegaId);
      bodega.cambiarDatos(datosDeBodega(solicitud));
      await repositorio.guardar(bodega);
      await auditarCambioDeEstado(this.dependencias.auditoria, {
        recurso: 'inventarios.bodegas',
        registroId: bodegaId,
        anterior,
        activoAntes: anterior.activo,
        activoDespues: solicitud.activo,
      });
      await auditarAsignacionesAlGuardar(this.dependencias, { operador, bodega, antes });
      return consultas.obtener(bodegaId);
    });
  }

  private async exigirSinUso(bodegaId: string): Promise<void> {
    const { uso } = this.dependencias;
    if (await uso.bodegaConExistencias(bodegaId)) throw new BodegaConExistencias();
    if (await uso.bodegaConTrasladosEnTransito(bodegaId)) throw new BodegaConTrasladosEnTransito();
  }
}
