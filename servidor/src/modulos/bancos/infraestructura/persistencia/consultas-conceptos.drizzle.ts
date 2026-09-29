import { asc, eq, getTableColumns } from 'drizzle-orm';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { ConceptoDto } from '../../aplicacion/dto/concepto.dto.js';
import type { ConsultasConceptos } from '../../aplicacion/puertos/consultas-conceptos.js';
import { mapeadorDeConcepto } from './concepto.mapeador.js';
import { conceptos } from './conceptos.tablas.js';
import { movimientos } from './movimientos.tablas.js';

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

  /** ¿Alguna nota, cheque o inverso de la empresa usa este concepto? */
  async estaEnUso(conceptoId: string): Promise<boolean> {
    const [fila] = await transaccionEnCurso()
      .select({ id: movimientos.id })
      .from(movimientos)
      .where(eq(movimientos.conceptoId, conceptoId))
      .limit(1);
    return fila !== undefined;
  }

  private consulta() {
    return transaccionEnCurso().select(columnas).from(conceptos);
  }
}
