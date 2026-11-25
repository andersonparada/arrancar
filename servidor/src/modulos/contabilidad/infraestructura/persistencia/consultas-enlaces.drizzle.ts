import { asc, eq, getTableColumns, sql } from 'drizzle-orm';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { EnlaceDto } from '../../aplicacion/dto/enlace.dto.js';
import type { ConsultasEnlaces } from '../../aplicacion/puertos/enlaces.js';
import { cuentas } from './cuentas.tablas.js';
import { mapeadorDeEnlace } from './enlace.mapeador.js';
import { enlaces } from './enlaces.tablas.js';

const columnas = { ...getTableColumns(enlaces), cuentaCodigo: cuentas.codigo, cuentaNombre: cuentas.nombre };

export class ConsultasEnlacesDrizzle implements ConsultasEnlaces {
  /** Por rol y, dentro de cada rol, por nombre de la llave (la del rol sin llave primero). */
  async listar(): Promise<EnlaceDto[]> {
    const filas = await this.consulta().orderBy(asc(enlaces.rol), sql`${enlaces.llaveNombre} nulls first`);
    return filas.map(mapeadorDeEnlace.aDto);
  }

  async obtener(enlaceId: string): Promise<EnlaceDto> {
    const [fila] = await this.consulta().where(eq(enlaces.id, enlaceId));
    if (!fila) throw new RecursoNoEncontrado('El enlace');
    return mapeadorDeEnlace.aDto(fila);
  }

  private consulta() {
    return transaccionEnCurso().select(columnas).from(enlaces).innerJoin(cuentas, eq(enlaces.cuentaId, cuentas.id));
  }
}
