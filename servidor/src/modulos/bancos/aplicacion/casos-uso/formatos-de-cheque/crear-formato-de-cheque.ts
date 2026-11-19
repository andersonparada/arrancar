import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { FormatoGuardado } from '../../../dominio/formato-guardado.js';
import type { FormatoDeChequeDto, SolicitudDeFormatoDeCheque } from '../../dto/formato-de-cheque.dto.js';
import { resolverFormato } from '../../formatos-de-cheque/resolucion-de-formato.js';
import type { DependenciasDeFormatosDeCheque } from './dependencias-de-formatos-de-cheque.js';

/** Crea un formato de la cuenta: una plantilla de fábrica y sus ajustes, revisados completos. */
export class CrearFormatoDeCheque {
  constructor(private readonly dependencias: DependenciasDeFormatosDeCheque) {}

  /**
   * @throws NombreDeFormatoInvalido si el nombre no sirve.
   * @throws FormatoDeChequeInvalido si los ajustes no cumplen el esquema estricto.
   * @throws RecursoDuplicado si la cuenta ya tiene un formato con ese nombre.
   */
  async ejecutar(operador: Operador, solicitud: SolicitudDeFormatoDeCheque): Promise<FormatoDeChequeDto> {
    const { unidadDeTrabajo, repositorio, consultas } = this.dependencias;
    resolverFormato(solicitud.base, solicitud.ajustes);
    const formato = FormatoGuardado.crear(Identificador.desde(operador.cuentaId), solicitud);
    return unidadDeTrabajo.ejecutar(operador, async () => {
      await repositorio.agregar(formato);
      return consultas.obtener(formato.id.valor);
    });
  }
}
