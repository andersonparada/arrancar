import { asc, eq, getTableColumns } from 'drizzle-orm';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { ConceptoDeGastoDto } from '../../aplicacion/dto/concepto-de-gasto.dto.js';
import type { ConsultasConceptosDeGasto } from '../../aplicacion/puertos/consultas-conceptos-de-gasto.js';
import { mapeadorDeConceptoDeGasto } from './concepto-de-gasto.mapeador.js';
import { conceptosDeGasto } from './conceptos-de-gasto.tablas.js';

const columnas = { ...getTableColumns(conceptosDeGasto) };

export class ConsultasConceptosDeGastoDrizzle implements ConsultasConceptosDeGasto {
  async listar(): Promise<ConceptoDeGastoDto[]> {
    const filas = await this.consulta().orderBy(asc(conceptosDeGasto.nombre));
    return filas.map(mapeadorDeConceptoDeGasto.aDto);
  }

  async obtener(conceptoDeGastoId: string): Promise<ConceptoDeGastoDto> {
    const [fila] = await this.consulta().where(eq(conceptosDeGasto.id, conceptoDeGastoId));
    if (!fila) throw new RecursoNoEncontrado('El concepto de gasto');
    return mapeadorDeConceptoDeGasto.aDto(fila);
  }

  private consulta() {
    return transaccionEnCurso().select(columnas).from(conceptosDeGasto);
  }
}
