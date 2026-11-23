import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { MadreInactiva, ParcelaConHijasActivas } from '../../../dominio/errores-de-parcela.js';
import type { FichaDeParcelaDto } from '../../dto/parcela.dto.js';
import { fichaDeParcela, parcelaExistente, type DependenciasDeParcelas } from './dependencias-de-parcelas.js';

/** Quién da de baja o de alta una parcela y desde qué fecha. */
export interface CambioDeEstadoDeParcela {
  parcelaId: string;
  /** Solo la inactivación la usa (la reciben los módulos de rubro); por omisión, hoy. */
  fecha?: string;
}

/**
 * Inactivar y reactivar una parcela: los datos no cambian, solo su estado, y la auditoría guarda cómo estaba (sin
 * ruido si ya estaba así).
 */
export abstract class CambiarEstadoDeParcela {
  protected abstract readonly activoDespues: boolean;

  constructor(private readonly dependencias: DependenciasDeParcelas) {}

  /**
   * @throws RecursoNoEncontrado si no existe o el operador no la ve.
   * @throws ParcelaConHijasActivas al inactivar una parcela con subparcelas activas.
   * @throws MadreInactiva al reactivar una subparcela cuya madre sigue inactiva.
   * @throws ErrorEsperado de un módulo de rubro si la parcela tiene una ocupación o un ciclo abierto.
   */
  ejecutar(operador: Operador, cambio: CambioDeEstadoDeParcela): Promise<FichaDeParcelaDto> {
    const { unidadDeTrabajo, repositorio, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const parcela = await parcelaExistente(repositorio, cambio.parcelaId);
      const antes = await fichaDeParcela(this.dependencias, cambio.parcelaId);
      if (antes.activo === this.activoDespues) return antes;
      await this.revisar(operador, antes, cambio);
      if (this.activoDespues) parcela.reactivar();
      else parcela.inactivar();
      await repositorio.guardar(parcela);
      const accion = this.activoDespues ? 'reactivar' : 'inactivar';
      await auditoria.registrar({
        recurso: 'parcelas.parcelas',
        registroId: cambio.parcelaId,
        accion,
        anterior: antes,
      });
      return fichaDeParcela(this.dependencias, cambio.parcelaId);
    });
  }

  /** Una subparcela solo se reactiva si su madre está activa. */
  private async exigirMadreActiva({ parcelaMadreId }: FichaDeParcelaDto): Promise<void> {
    if (parcelaMadreId === null) return;
    const madre = await parcelaExistente(this.dependencias.repositorio, parcelaMadreId, 'La parcela madre');
    if (!madre.instantanea().activo) throw new MadreInactiva();
  }

  private async revisar(operador: Operador, antes: FichaDeParcelaDto, cambio: CambioDeEstadoDeParcela): Promise<void> {
    const { avisos, reloj } = this.dependencias;
    if (this.activoDespues) return this.exigirMadreActiva(antes);
    if (antes.hijasActivas > 0) throw new ParcelaConHijasActivas();
    const fecha = cambio.fecha ?? (await reloj.hoy(operador));
    await avisos.porInactivar(operador, { parcelaId: cambio.parcelaId, fecha });
  }
}
