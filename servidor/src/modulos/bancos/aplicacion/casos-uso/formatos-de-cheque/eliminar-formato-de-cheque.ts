import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { FormatoDeChequeEnUso } from '../../../dominio/errores-de-impresion.js';
import { formatoExistente, type DependenciasDeFormatosDeCheque } from './dependencias-de-formatos-de-cheque.js';

interface EliminacionDeFormato {
  formatoId: string;
  motivo: string;
}

/** Elimina de verdad un formato que ninguna chequera usa; si alguna lo usa, se inactiva. */
export class EliminarFormatoDeCheque {
  constructor(private readonly dependencias: DependenciasDeFormatosDeCheque) {}

  /**
   * @throws RecursoNoEncontrado si no existe o no es de la cuenta.
   * @throws FormatoDeChequeEnUso si alguna chequera lo usa.
   */
  ejecutar(operador: Operador, { formatoId, motivo }: EliminacionDeFormato): Promise<void> {
    const { unidadDeTrabajo, repositorio, consultas, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const formato = await formatoExistente(repositorio, formatoId);
      const anterior = await consultas.obtener(formatoId);
      if (anterior.chequerasQueLoUsan > 0) throw new FormatoDeChequeEnUso();
      await repositorio.eliminar(formato.id);
      await auditoria.registrar({
        recurso: 'bancos.formatos-de-cheque',
        registroId: formatoId,
        accion: 'eliminar',
        anterior,
        motivo,
      });
    });
  }
}
