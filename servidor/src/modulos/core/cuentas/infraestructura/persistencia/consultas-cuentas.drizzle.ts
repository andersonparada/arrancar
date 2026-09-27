import { asc, count, eq } from 'drizzle-orm';
import type { BaseDatos } from '../../../base-datos/conexion.js';
import { empresas } from '../../../esquemas/empresas.esquema.js';
import type { CuentaDto } from '../../aplicacion/dto/cuenta.dto.js';
import type { ConsultasCuentas } from '../../aplicacion/puertos/repositorio-cuentas.js';
import { cuentas } from './cuentas.tablas.js';

export class ConsultasCuentasDrizzle implements ConsultasCuentas {
  constructor(private readonly bd: BaseDatos) {}

  listar(): Promise<CuentaDto[]> {
    return this.bd
      .select({
        id: cuentas.id,
        nombre: cuentas.nombre,
        activa: cuentas.activa,
        creadoEn: cuentas.creadoEn,
        totalEmpresas: count(empresas.id),
      })
      .from(cuentas)
      .leftJoin(empresas, eq(empresas.cuentaId, cuentas.id))
      .groupBy(cuentas.id)
      .orderBy(asc(cuentas.nombre));
  }
}
