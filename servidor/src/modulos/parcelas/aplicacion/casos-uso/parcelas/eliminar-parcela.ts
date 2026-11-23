import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { ParcelaConRegistros } from '../../../dominio/errores-de-parcela.js';
import { fichaDeParcela, parcelaExistente, type DependenciasDeParcelas } from './dependencias-de-parcelas.js';

export class EliminarParcela {
  constructor(private readonly dependencias: DependenciasDeParcelas) {}

  /**
   * Solo si no tiene subparcelas ni mediciones vigentes (ni nada de otros módulos, que la base lo impide); las
   * mediciones anuladas se van con ella. Queda en la auditoría la parcela como estaba, con sus mediciones e inmuebles.
   * @throws RecursoNoEncontrado si no existe o el operador no la ve.
   * @throws ParcelaConRegistros si tiene subparcelas, mediciones vigentes u otros registros: entonces se inactiva.
   * @throws ErrorEsperado de un módulo de rubro si la parcela tiene una ocupación o un ciclo abierto.
   */
  ejecutar(operador: Operador, parcelaId: string): Promise<void> {
    const { unidadDeTrabajo, repositorio, consultas, consultasDeMediciones, mediciones, avisos, auditoria } =
      this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const parcela = await parcelaExistente(repositorio, parcelaId);
      if ((await consultas.contarHijas(parcelaId)) > 0 || (await consultasDeMediciones.hayVigentes(parcelaId))) {
        throw new ParcelaConRegistros();
      }
      await avisos.porEliminar(operador, { parcelaId });
      const anterior = await fichaDeParcela(this.dependencias, parcelaId);
      await mediciones.eliminarAnuladasDe(parcelaId);
      await repositorio.eliminar(parcela);
      await auditoria.registrar({ recurso: 'parcelas.parcelas', registroId: parcelaId, accion: 'eliminar', anterior });
    });
  }
}
