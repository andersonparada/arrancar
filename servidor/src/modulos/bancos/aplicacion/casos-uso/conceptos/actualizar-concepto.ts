import { auditarCambioDeEstado } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { datosDeConcepto } from '../../datos-de-concepto.js';
import type { ConceptoDto, SolicitudDeConcepto } from '../../dto/concepto.dto.js';
import { conceptoExistente, type DependenciasDeConceptos } from './dependencias-de-conceptos.js';

interface CambioDeConcepto {
  conceptoId: string;
  solicitud: SolicitudDeConcepto;
}

export class ActualizarConcepto {
  constructor(private readonly dependencias: DependenciasDeConceptos) {}

  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  ejecutar(operador: Operador, { conceptoId, solicitud }: CambioDeConcepto): Promise<ConceptoDto> {
    const { unidadDeTrabajo, repositorio, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const concepto = await conceptoExistente(repositorio, conceptoId);
      const anterior = await consultas.obtener(conceptoId);
      concepto.cambiarDatos(datosDeConcepto(solicitud));
      await repositorio.guardar(concepto);
      await auditarCambioDeEstado(this.dependencias.auditoria, {
        recurso: 'bancos.conceptos',
        registroId: conceptoId,
        anterior,
        activoAntes: anterior.activo,
        activoDespues: solicitud.activo,
      });
      return consultas.obtener(conceptoId);
    });
  }
}
