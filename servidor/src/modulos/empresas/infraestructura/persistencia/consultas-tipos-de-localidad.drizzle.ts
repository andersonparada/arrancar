import { asc, eq, getTableColumns } from 'drizzle-orm';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { TipoDeLocalidadDto } from '../../aplicacion/dto/tipo-de-localidad.dto.js';
import type { ConsultasTiposDeLocalidad } from '../../aplicacion/puertos/consultas-tipos-de-localidad.js';
import { mapeadorDeTipoDeLocalidad } from './tipo-de-localidad.mapeador.js';
import { tiposDeLocalidad } from './tipos-de-localidad.tablas.js';

const columnas = { ...getTableColumns(tiposDeLocalidad) };

export class ConsultasTiposDeLocalidadDrizzle implements ConsultasTiposDeLocalidad {
  async listar(): Promise<TipoDeLocalidadDto[]> {
    const filas = await this.consulta().orderBy(asc(tiposDeLocalidad.nombre));
    return filas.map(mapeadorDeTipoDeLocalidad.aDto);
  }

  async obtener(tipoDeLocalidadId: string): Promise<TipoDeLocalidadDto> {
    const [fila] = await this.consulta().where(eq(tiposDeLocalidad.id, tipoDeLocalidadId));
    if (!fila) throw new RecursoNoEncontrado('El tipo de localidad');
    return mapeadorDeTipoDeLocalidad.aDto(fila);
  }

  private consulta() {
    return transaccionEnCurso().select(columnas).from(tiposDeLocalidad);
  }
}
