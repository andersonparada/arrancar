import { auditarCambioDeEstado } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { FormatoDeChequeDto } from '../../dto/formato-de-cheque.dto.js';
import { formatoExistente, type DependenciasDeFormatosDeCheque } from './dependencias-de-formatos-de-cheque.js';

interface CambioDeEstadoDeFormato {
  formatoId: string;
  activo: boolean;
}

/** Inactiva o reactiva el formato; la baja deja rastro en la auditoría, en la misma transacción. */
export class CambiarEstadoDeFormatoDeCheque {
  constructor(private readonly dependencias: DependenciasDeFormatosDeCheque) {}

  /** @throws RecursoNoEncontrado si no existe o no es de la cuenta. */
  ejecutar(operador: Operador, { formatoId, activo }: CambioDeEstadoDeFormato): Promise<FormatoDeChequeDto> {
    const { unidadDeTrabajo, repositorio, consultas, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const formato = await formatoExistente(repositorio, formatoId);
      const anterior = await consultas.obtener(formatoId);
      if (activo) formato.reactivar();
      else formato.inactivar();
      await repositorio.guardar(formato);
      await auditarCambioDeEstado(auditoria, {
        recurso: 'bancos.formatos-de-cheque',
        registroId: formatoId,
        anterior,
        activoAntes: anterior.activo,
        activoDespues: activo,
      });
      return consultas.obtener(formatoId);
    });
  }
}
