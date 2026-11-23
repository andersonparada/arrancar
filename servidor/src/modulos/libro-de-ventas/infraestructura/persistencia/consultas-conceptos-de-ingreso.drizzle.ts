import { asc, eq, getTableColumns } from 'drizzle-orm';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { ConceptoDeIngresoDto } from '../../aplicacion/dto/concepto-de-ingreso.dto.js';
import type { ConsultasConceptosDeIngreso } from '../../aplicacion/puertos/consultas-conceptos-de-ingreso.js';
import { mapeadorDeConceptoDeIngreso } from './concepto-de-ingreso.mapeador.js';
import { conceptosDeIngreso } from './conceptos-de-ingreso.tablas.js';

const columnas = { ...getTableColumns(conceptosDeIngreso) };

export class ConsultasConceptosDeIngresoDrizzle implements ConsultasConceptosDeIngreso {
  async listar(): Promise<ConceptoDeIngresoDto[]> {
    const filas = await this.consulta().orderBy(asc(conceptosDeIngreso.nombre));
    return filas.map(mapeadorDeConceptoDeIngreso.aDto);
  }

  async obtener(conceptoDeIngresoId: string): Promise<ConceptoDeIngresoDto> {
    const [fila] = await this.consulta().where(eq(conceptosDeIngreso.id, conceptoDeIngresoId));
    if (!fila) throw new RecursoNoEncontrado('El concepto de ingreso');
    return mapeadorDeConceptoDeIngreso.aDto(fila);
  }

  private consulta() {
    return transaccionEnCurso().select(columnas).from(conceptosDeIngreso);
  }
}
