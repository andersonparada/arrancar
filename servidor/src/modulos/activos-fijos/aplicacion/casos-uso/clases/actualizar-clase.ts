import { auditarCambioDeEstado } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { datosDeClase } from '../../datos-de-clase.js';
import type { ClaseDto, SolicitudDeClase } from '../../dto/clase.dto.js';
import { claseExistente, type DependenciasDeClases } from './dependencias-de-clases.js';

interface CambioDeClase {
  claseId: string;
  solicitud: SolicitudDeClase;
}

export class ActualizarClase {
  constructor(private readonly dependencias: DependenciasDeClases) {}

  /**
   * Cambiar el porcentaje o la vida no toca a los activos que ya tiene la clase. Inactivar y reactivar quedan
   * en la auditoría.
   * @throws RecursoNoEncontrado si no existe o no es de la empresa.
   * @throws ClaseConPorcentajeSobreElMaximo si el porcentaje pasa del tope de ley del inciso.
   */
  async ejecutar(operador: Operador, { claseId, solicitud }: CambioDeClase): Promise<ClaseDto> {
    const { unidadDeTrabajo, repositorio, consultas, topes, auditoria } = this.dependencias;
    const topesDeLey = await topes.paraEmpresa(operador);
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const clase = await claseExistente(repositorio, claseId);
      const anterior = await consultas.obtener(claseId);
      clase.cambiarDatos(datosDeClase(solicitud), topesDeLey[solicitud.incisoFiscal]);
      await repositorio.guardar(clase);
      await auditarCambioDeEstado(auditoria, {
        recurso: 'activos-fijos.clases',
        registroId: claseId,
        anterior,
        activoAntes: anterior.activo,
        activoDespues: solicitud.activo,
      });
      return consultas.obtener(claseId);
    });
  }
}
