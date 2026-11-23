import { auditarCambioDeEstado } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { datosDeConceptoDeIngreso } from '../../datos-de-concepto-de-ingreso.js';
import type { ConceptoDeIngresoDto, SolicitudDeConceptoDeIngreso } from '../../dto/concepto-de-ingreso.dto.js';
import {
  conceptoDeIngresoExistente,
  type DependenciasDeConceptosDeIngreso,
} from './dependencias-de-conceptos-de-ingreso.js';

interface CambioDeConceptoDeIngreso {
  conceptoDeIngresoId: string;
  solicitud: SolicitudDeConceptoDeIngreso;
}

export class ActualizarConceptoDeIngreso {
  constructor(private readonly dependencias: DependenciasDeConceptosDeIngreso) {}

  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  ejecutar(
    operador: Operador,
    { conceptoDeIngresoId, solicitud }: CambioDeConceptoDeIngreso,
  ): Promise<ConceptoDeIngresoDto> {
    const { unidadDeTrabajo, repositorio, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const conceptoDeIngreso = await conceptoDeIngresoExistente(repositorio, conceptoDeIngresoId);
      const anterior = await consultas.obtener(conceptoDeIngresoId);
      conceptoDeIngreso.cambiarDatos(datosDeConceptoDeIngreso(solicitud));
      await repositorio.guardar(conceptoDeIngreso);
      await auditarCambioDeEstado(this.dependencias.auditoria, {
        recurso: 'libro-de-ventas.conceptos-de-ingreso',
        registroId: conceptoDeIngresoId,
        anterior,
        activoAntes: anterior.activo,
        activoDespues: solicitud.activo,
      });
      return consultas.obtener(conceptoDeIngresoId);
    });
  }
}
