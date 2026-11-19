import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { FormatoDeChequeDto, SolicitudDeFormatoDeCheque } from '../../dto/formato-de-cheque.dto.js';
import { resolverFormato } from '../../formatos-de-cheque/resolucion-de-formato.js';
import { formatoExistente, type DependenciasDeFormatosDeCheque } from './dependencias-de-formatos-de-cheque.js';

interface CambioDeFormatoDeCheque {
  formatoId: string;
  solicitud: SolicitudDeFormatoDeCheque;
}

/** Cambia el nombre, la plantilla o los ajustes; si cambian estos dos, el formato vuelve a quedar sin probar. */
export class ActualizarFormatoDeCheque {
  constructor(private readonly dependencias: DependenciasDeFormatosDeCheque) {}

  /**
   * @throws RecursoNoEncontrado si no existe o no es de la cuenta.
   * @throws NombreDeFormatoInvalido o FormatoDeChequeInvalido si los datos no sirven.
   * @throws RecursoDuplicado si otro formato de la cuenta tiene ese nombre.
   */
  async ejecutar(operador: Operador, { formatoId, solicitud }: CambioDeFormatoDeCheque): Promise<FormatoDeChequeDto> {
    const { unidadDeTrabajo, repositorio, consultas } = this.dependencias;
    resolverFormato(solicitud.base, solicitud.ajustes);
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const formato = await formatoExistente(repositorio, formatoId);
      formato.cambiarDatos(solicitud);
      await repositorio.guardar(formato);
      return consultas.obtener(formatoId);
    });
  }
}
