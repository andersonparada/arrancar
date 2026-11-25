import { eq, getTableColumns, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { CuentaDto } from '../../aplicacion/dto/cuenta.dto.js';
import type { ConsultasCuentas } from '../../aplicacion/puertos/consultas-cuentas.js';
import { mapeadorDeCuenta } from './cuenta.mapeador.js';
import { cuentas } from './cuentas.tablas.js';

const padre = alias(cuentas, 'padre');

const columnas = { ...getTableColumns(cuentas), padreCodigo: padre.codigo };

export class ConsultasCuentasDrizzle implements ConsultasCuentas {
  /** Por código y con la colación «C»: la colación del idioma ignora los puntos y revuelve el árbol. */
  async listar(): Promise<CuentaDto[]> {
    const filas = await this.consulta().orderBy(sql`${cuentas.codigo} collate "C"`);
    return filas.map(mapeadorDeCuenta.aDto);
  }

  async obtener(cuentaId: string): Promise<CuentaDto> {
    const [fila] = await this.consulta().where(eq(cuentas.id, cuentaId));
    if (!fila) throw new RecursoNoEncontrado('La cuenta');
    return mapeadorDeCuenta.aDto(fila);
  }

  private consulta() {
    return transaccionEnCurso().select(columnas).from(cuentas).leftJoin(padre, eq(cuentas.padreId, padre.id));
  }
}
