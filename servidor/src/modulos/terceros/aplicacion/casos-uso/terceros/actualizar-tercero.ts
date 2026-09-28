import { auditarCambioDeEstado, type Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { PublicadorEventos } from '../../../../core/compartido/aplicacion/publicador-eventos.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { AvisoDeParecidos } from '../../aviso-de-parecidos.js';
import { datosDeTercero } from '../../conversiones.js';
import type { SolicitudDeTercero, TerceroDto } from '../../dto/tercero.dto.js';
import { terceroExistente } from '../../existentes.js';
import type { ConsultasTerceros } from '../../puertos/consultas.js';
import type { RepositorioTerceros } from '../../puertos/repositorios.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioTerceros;
  consultas: ConsultasTerceros;
  avisoDeParecidos: AvisoDeParecidos;
  publicadorEventos: PublicadorEventos;
  auditoria: Auditoria;
}

export class ActualizarTercero {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * Si con el cambio queda inactivo, también se inactivan sus papeles.
   * @throws RecursoNoEncontrado si no existe en la cuenta.
   * @throws HayTercerosParecidos si se parece a otro y no se confirmó.
   */
  async ejecutar(
    operador: Operador,
    cambio: { terceroId: string; solicitud: SolicitudDeTercero },
  ): Promise<TerceroDto> {
    const { unidadDeTrabajo, repositorio, consultas, avisoDeParecidos, publicadorEventos } = this.dependencias;
    const datos = datosDeTercero(cambio.solicitud);

    const { tercero, actualizado } = await unidadDeTrabajo.ejecutar(operador, async () => {
      const tercero = await terceroExistente(repositorio, cambio.terceroId);
      const anterior = await consultas.obtener(cambio.terceroId);
      tercero.cambiarDatos(datos);
      await avisoDeParecidos.exigirQueNoHaya(tercero, cambio.solicitud.confirmarDuplicado);
      await repositorio.guardar(tercero);
      await this.auditar(anterior, datos.activo);
      return { tercero, actualizado: await consultas.obtener(cambio.terceroId) };
    });
    await publicadorEventos.publicar(tercero.extraerEventos());
    return actualizado;
  }

  private auditar(anterior: TerceroDto, activoDespues: boolean): Promise<void> {
    return auditarCambioDeEstado(this.dependencias.auditoria, {
      recurso: 'terceros.terceros',
      registroId: anterior.id,
      anterior,
      activoAntes: anterior.activo,
      activoDespues,
    });
  }
}
