import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { FormatoDeChequeInactivo } from '../../../dominio/errores-de-impresion.js';
import type { FormatoDeLaChequera } from '../../../dominio/chequera.js';
import type { ChequeraDto } from '../../dto/chequera.dto.js';
import type { ConsultasChequeras } from '../../puertos/consultas-chequeras.js';
import type { RepositorioChequeras } from '../../puertos/repositorio-chequeras.js';
import type { RepositorioFormatosDeCheque } from '../../puertos/repositorio-formatos-de-cheque.js';
import { chequeraExistente } from './dependencias-de-chequeras.js';

export interface DependenciasDeAsignacionDeFormato {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioChequeras;
  repositorioDeFormatos: RepositorioFormatosDeCheque;
  consultas: ConsultasChequeras;
}

interface AsignacionDeFormato extends FormatoDeLaChequera {
  chequeraId: string;
}

/** Elige cómo se imprimen los cheques de una chequera: un formato de la cuenta, una plantilla de fábrica o ninguno. */
export class AsignarFormatoALaChequera {
  constructor(private readonly dependencias: DependenciasDeAsignacionDeFormato) {}

  /**
   * @throws RecursoNoEncontrado si la chequera o el formato no existen o no son de la empresa o de la cuenta (el formato
   *   se busca con la seguridad por cuenta: la llave foránea no pasa por ella).
   * @throws FormatoDeChequeInactivo si el formato está inactivo.
   * @throws ChequeraInvalida si pide un formato y una plantilla; ChequeraDeAperturaSinFormato si es de la carga inicial.
   */
  ejecutar(operador: Operador, { chequeraId, ...formato }: AsignacionDeFormato): Promise<ChequeraDto> {
    const { unidadDeTrabajo, repositorio, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const chequera = await chequeraExistente(repositorio, chequeraId);
      await this.exigirFormatoUsable(formato.formatoDeChequeId);
      chequera.asignarFormato(formato);
      await repositorio.guardar(chequera);
      return consultas.obtener(chequeraId);
    });
  }

  private async exigirFormatoUsable(formatoDeChequeId: string | null): Promise<void> {
    if (!formatoDeChequeId) return;
    const formato = await this.dependencias.repositorioDeFormatos.buscar(Identificador.desde(formatoDeChequeId));
    if (!formato) throw new RecursoNoEncontrado('El formato de cheque');
    if (!formato.estaActivo) throw new FormatoDeChequeInactivo();
  }
}
