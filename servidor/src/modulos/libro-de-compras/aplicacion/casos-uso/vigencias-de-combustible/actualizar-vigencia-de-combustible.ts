import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { datosDeVigenciaDeCombustible } from '../../datos-de-vigencia-de-combustible.js';
import type {
  VigenciaDeCombustibleDto,
  SolicitudDeVigenciaDeCombustible,
} from '../../dto/vigencia-de-combustible.dto.js';
import {
  vigenciaDeCombustibleExistente,
  type DependenciasDeVigenciasDeCombustible,
} from './dependencias-de-vigencias-de-combustible.js';

interface CambioDeVigenciaDeCombustible {
  vigenciaDeCombustibleId: string;
  solicitud: SolicitudDeVigenciaDeCombustible;
}

export class ActualizarVigenciaDeCombustible {
  constructor(private readonly dependencias: DependenciasDeVigenciasDeCombustible) {}

  /**
   * Un cambio de la tasa, el etanol o las fechas queda en la auditoría como corrección, con cómo estaba.
   * @throws RecursoNoEncontrado si no existe o no es de la empresa.
   * @throws VigenciaDeCombustibleEnUso si documentos ya la usaron y el cambio lo contradice.
   */
  ejecutar(
    operador: Operador,
    { vigenciaDeCombustibleId, solicitud }: CambioDeVigenciaDeCombustible,
  ): Promise<VigenciaDeCombustibleDto> {
    const { unidadDeTrabajo, repositorio, consultas, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const vigenciaDeCombustible = await vigenciaDeCombustibleExistente(repositorio, vigenciaDeCombustibleId);
      const datos = datosDeVigenciaDeCombustible(solicitud);
      const anterior = await consultas.obtener(vigenciaDeCombustibleId);
      await consultas.exigirReferencias(solicitud);
      await repositorio.bloquearCombustible(anterior.combustibleId);
      const corrige = vigenciaDeCombustible.seCorrigeCon(datos);
      vigenciaDeCombustible.cambiarDatos(datos, await repositorio.enUso(vigenciaDeCombustible.id));
      await repositorio.guardar(vigenciaDeCombustible);
      if (corrige) {
        await auditoria.registrar({
          recurso: 'libro-de-compras.vigencias-de-combustible',
          registroId: vigenciaDeCombustibleId,
          accion: 'corregir',
          anterior,
        });
      }
      return consultas.obtener(vigenciaDeCombustibleId);
    });
  }
}
