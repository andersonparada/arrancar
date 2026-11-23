import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { SolicitudDeAnulacionDeMedicion } from '../../dto/medicion.dto.js';
import type { FichaDeParcelaDto } from '../../dto/parcela.dto.js';
import { fichaDeParcela, parcelaExistente, type DependenciasDeParcelas } from '../parcelas/dependencias-de-parcelas.js';
import { recalcularSuperficie } from './medicion-de-parcela.js';

interface AnulacionDeMedicion {
  medicionId: string;
  solicitud: SolicitudDeAnulacionDeMedicion;
}

export class AnularMedicion {
  constructor(private readonly dependencias: DependenciasDeParcelas) {}

  /**
   * Anula la medición (queda como rastro, con su motivo), recalcula la superficie de la parcela y deja en la
   * auditoría la medición como estaba.
   * @throws RecursoNoEncontrado si no existe o la parcela no es del alcance del operador.
   * @throws MedicionYaAnulada si ya estaba anulada.
   */
  ejecutar(operador: Operador, { medicionId, solicitud }: AnulacionDeMedicion): Promise<FichaDeParcelaDto> {
    const { unidadDeTrabajo, mediciones, consultasDeMediciones, repositorio, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const medicion = await mediciones.buscar(Identificador.desde(medicionId));
      if (!medicion) throw new RecursoNoEncontrado('La medición');
      const { parcelaId } = medicion.instantanea();
      const parcela = await parcelaExistente(repositorio, parcelaId);
      const anterior = await consultasDeMediciones.obtener(medicionId);
      medicion.anular({ motivo: solicitud.motivo, usuarioId: operador.usuarioId, cuando: new Date() });
      await mediciones.guardar(medicion);
      await recalcularSuperficie(this.dependencias, parcela);
      await auditoria.registrar({
        recurso: 'parcelas.mediciones',
        registroId: medicionId,
        accion: 'anular',
        anterior,
        motivo: solicitud.motivo,
      });
      return fichaDeParcela(this.dependencias, parcelaId);
    });
  }
}
