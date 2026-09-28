import { asc, eq, getTableColumns } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { exigirQueExista } from '../../../core/compartido/infraestructura/exigir-que-exista.js';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { CuentaBancariaDto, SolicitudDeCuentaBancaria } from '../../aplicacion/dto/cuenta-bancaria.dto.js';
import type { ConsultasCuentasBancarias } from '../../aplicacion/puertos/consultas-cuentas-bancarias.js';
import { mapeadorDeCuentaBancaria } from './cuenta-bancaria.mapeador.js';
import { cuentasBancarias } from './cuentas-bancarias.tablas.js';
import { bancos } from './bancos.tablas.js';

const banco = alias(bancos, 'banco');

const columnas = { ...getTableColumns(cuentasBancarias), bancoNombre: banco.nombre };

export class ConsultasCuentasBancariasDrizzle implements ConsultasCuentasBancarias {
  async listar(): Promise<CuentaBancariaDto[]> {
    const filas = await this.consulta().orderBy(asc(cuentasBancarias.nombre));
    return filas.map(mapeadorDeCuentaBancaria.aDto);
  }

  async obtener(cuentaBancariaId: string): Promise<CuentaBancariaDto> {
    const [fila] = await this.consulta().where(eq(cuentasBancarias.id, cuentaBancariaId));
    if (!fila) throw new RecursoNoEncontrado('La cuenta bancaria');
    return mapeadorDeCuentaBancaria.aDto(fila);
  }

  /** Lo elegido debe existir y ser de la empresa: la seguridad por filas oculta lo ajeno. */
  async exigirReferencias(solicitud: SolicitudDeCuentaBancaria): Promise<void> {
    await exigirQueExista(bancos, solicitud.bancoId, 'El banco');
  }

  private consulta() {
    return transaccionEnCurso()
      .select(columnas)
      .from(cuentasBancarias)
      .leftJoin(banco, eq(cuentasBancarias.bancoId, banco.id));
  }
}
