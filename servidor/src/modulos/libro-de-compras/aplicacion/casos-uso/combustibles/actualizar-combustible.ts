import { auditarCambioDeEstado } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { datosDeCombustible } from '../../datos-de-combustible.js';
import type { CombustibleDto, SolicitudDeCombustible } from '../../dto/combustible.dto.js';
import { combustibleExistente, type DependenciasDeCombustibles } from './dependencias-de-combustibles.js';

interface CambioDeCombustible {
  combustibleId: string;
  solicitud: SolicitudDeCombustible;
}

export class ActualizarCombustible {
  constructor(private readonly dependencias: DependenciasDeCombustibles) {}

  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  ejecutar(operador: Operador, { combustibleId, solicitud }: CambioDeCombustible): Promise<CombustibleDto> {
    const { unidadDeTrabajo, repositorio, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const combustible = await combustibleExistente(repositorio, combustibleId);
      const anterior = await consultas.obtener(combustibleId);
      combustible.cambiarDatos(datosDeCombustible(solicitud));
      await repositorio.guardar(combustible);
      await auditarCambioDeEstado(this.dependencias.auditoria, {
        recurso: 'libro-de-compras.combustibles',
        registroId: combustibleId,
        anterior,
        activoAntes: anterior.activo,
        activoDespues: solicitud.activo,
      });
      return consultas.obtener(combustibleId);
    });
  }
}
