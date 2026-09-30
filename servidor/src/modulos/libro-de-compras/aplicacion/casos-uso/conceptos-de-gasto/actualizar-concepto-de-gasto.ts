import { auditarCambioDeEstado } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { datosDeConceptoDeGasto } from '../../datos-de-concepto-de-gasto.js';
import type { ConceptoDeGastoDto, SolicitudDeConceptoDeGasto } from '../../dto/concepto-de-gasto.dto.js';
import { conceptoDeGastoExistente, type DependenciasDeConceptosDeGasto } from './dependencias-de-conceptos-de-gasto.js';

interface CambioDeConceptoDeGasto {
  conceptoDeGastoId: string;
  solicitud: SolicitudDeConceptoDeGasto;
}

export class ActualizarConceptoDeGasto {
  constructor(private readonly dependencias: DependenciasDeConceptosDeGasto) {}

  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  ejecutar(operador: Operador, { conceptoDeGastoId, solicitud }: CambioDeConceptoDeGasto): Promise<ConceptoDeGastoDto> {
    const { unidadDeTrabajo, repositorio, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const conceptoDeGasto = await conceptoDeGastoExistente(repositorio, conceptoDeGastoId);
      const anterior = await consultas.obtener(conceptoDeGastoId);
      conceptoDeGasto.cambiarDatos(datosDeConceptoDeGasto(solicitud));
      await repositorio.guardar(conceptoDeGasto);
      await auditarCambioDeEstado(this.dependencias.auditoria, {
        recurso: 'libro-de-compras.conceptos-de-gasto',
        registroId: conceptoDeGastoId,
        anterior,
        activoAntes: anterior.activo,
        activoDespues: solicitud.activo,
      });
      return consultas.obtener(conceptoDeGastoId);
    });
  }
}
