import { auditarCambioDeEstado } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { ChequeraDto } from '../../dto/chequera.dto.js';
import { chequeraExistente, type DependenciasDeChequeras } from './dependencias-de-chequeras.js';

interface CambioDeEstadoDeChequera {
  chequeraId: string;
  activa: boolean;
}

/** Inactiva o reactiva la chequera; no se borra ni cambia su rango. */
export class CambiarEstadoDeChequera {
  constructor(private readonly dependencias: DependenciasDeChequeras) {}

  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  ejecutar(operador: Operador, { chequeraId, activa }: CambioDeEstadoDeChequera): Promise<ChequeraDto> {
    const { unidadDeTrabajo, repositorio, consultas, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const chequera = await chequeraExistente(repositorio, chequeraId);
      const anterior = await consultas.obtener(chequeraId);
      if (activa) chequera.reactivar();
      else chequera.inactivar();
      await repositorio.guardar(chequera);
      await auditarCambioDeEstado(auditoria, {
        recurso: 'bancos.chequeras',
        registroId: chequeraId,
        anterior,
        activoAntes: anterior.activa,
        activoDespues: activa,
      });
      return consultas.obtener(chequeraId);
    });
  }
}
