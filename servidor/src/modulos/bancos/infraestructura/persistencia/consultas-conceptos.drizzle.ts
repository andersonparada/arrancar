import { asc, eq, getTableColumns } from 'drizzle-orm';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { ConceptoDto } from '../../aplicacion/dto/concepto.dto.js';
import type { ConsultasConceptos } from '../../aplicacion/puertos/consultas-conceptos.js';
import { mapeadorDeConcepto } from './concepto.mapeador.js';
import { conceptos } from './conceptos.tablas.js';

const columnas = { ...getTableColumns(conceptos) };

export class ConsultasConceptosDrizzle implements ConsultasConceptos {
  async listar(): Promise<ConceptoDto[]> {
    const filas = await this.consulta().orderBy(asc(conceptos.nombre));
    return filas.map(mapeadorDeConcepto.aDto);
  }

  async obtener(conceptoId: string): Promise<ConceptoDto> {
    const [fila] = await this.consulta().where(eq(conceptos.id, conceptoId));
    if (!fila) throw new RecursoNoEncontrado('El concepto');
    return mapeadorDeConcepto.aDto(fila);
  }

  /** Todavía ninguna nota ni cheque lleva concepto (`concepto_id` llega en H3b, que amplía esta consulta). */
  async estaEnUso(_conceptoId: string): Promise<boolean> {
    return false;
  }

  private consulta() {
    return transaccionEnCurso().select(columnas).from(conceptos);
  }
}
