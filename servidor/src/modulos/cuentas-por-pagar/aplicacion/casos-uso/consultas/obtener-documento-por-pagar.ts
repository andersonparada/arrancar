import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { FichaDelDocumentoPorPagarDto } from '../../dto/documento-por-pagar.dto.js';
import type { TopeDeDiferenciaMenor } from '../../puertos/puertos-de-ajustes.js';
import type { CargaInicial } from '../../puertos/puertos-de-saldos-iniciales.js';
import { puntoDeVistaDe, type DependenciasDeConsultas } from './dependencias-de-consultas.js';
import { fichaDeUnDocumento } from './ficha-de-un-documento.js';

/** Lo que además necesita la ficha: la fecha de inicio y el tope de la diferencia menor. */
export interface DependenciasDeLaFicha extends DependenciasDeConsultas {
  cargaInicial: CargaInicial;
  topeDeDiferencia: TopeDeDiferenciaMenor;
}

/** La ficha de un documento: sus saldos, las notas que lo corrigen, las aplicaciones y, en una nota, sus ajustes. */
export class ObtenerDocumentoPorPagar {
  constructor(private readonly dependencias: DependenciasDeLaFicha) {}

  /** @throws RecursoNoEncontrado si no existe o es de otra empresa. */
  ejecutar(operador: Operador, id: string): Promise<FichaDelDocumentoPorPagarDto> {
    const { unidadDeTrabajo, consultas, reloj, cargaInicial, topeDeDiferencia } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const fila = await consultas.buscar(id);
      if (!fila) throw new RecursoNoEncontrado('El documento');
      const extras = {
        fechaDeInicio: (await cargaInicial.obtener(operador)).fechaDeInicio,
        topeDiferenciaMenorCentavos: await topeDeDiferencia.centavos(operador),
      };
      return fichaDeUnDocumento(consultas, fila, { vista: await puntoDeVistaDe(reloj, operador), extras });
    });
  }
}
