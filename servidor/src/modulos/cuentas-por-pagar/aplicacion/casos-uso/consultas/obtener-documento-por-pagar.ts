import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { FichaDelDocumentoPorPagarDto } from '../../dto/documento-por-pagar.dto.js';
import {
  dtoDeAnulacion,
  dtoDeAplicacion,
  dtoDeDocumentoPorPagar,
  dtoDeNota,
} from '../../dto/dto-de-documento-por-pagar.js';
import { puntoDeVistaDe, type DependenciasDeConsultas } from './dependencias-de-consultas.js';

/** La ficha de un documento: sus saldos, las notas que lo corrigen y las aplicaciones de notas de crédito. */
export class ObtenerDocumentoPorPagar {
  constructor(private readonly dependencias: DependenciasDeConsultas) {}

  /** @throws RecursoNoEncontrado si no existe o es de otra empresa. */
  ejecutar(operador: Operador, id: string): Promise<FichaDelDocumentoPorPagarDto> {
    const { unidadDeTrabajo, consultas, reloj } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const fila = await consultas.buscar(id);
      if (!fila) throw new RecursoNoEncontrado('El documento');
      const vista = await puntoDeVistaDe(reloj, operador);
      return {
        ...dtoDeDocumentoPorPagar(fila, vista),
        notas: (await consultas.notasDe(fila.documento)).map(dtoDeNota),
        aplicaciones: (await consultas.aplicacionesDe(fila.documento)).map(dtoDeAplicacion),
        anulacion: dtoDeAnulacion(fila),
      };
    });
  }
}
