import { Identificador } from '../../../core/compartido/dominio/identificador.js';
import type { CuentaDto } from '../../aplicacion/dto/cuenta.dto.js';
import { Cuenta, type CuentaId } from '../../dominio/cuenta.js';
import type { cuentas } from './cuentas.tablas.js';

type Fila = typeof cuentas.$inferSelect;

/** Traduce entre la fila de la tabla, la entidad y lo que ve la pantalla. */
export const mapeadorDeCuenta = {
  aEntidad({ id, empresaId, padreId, creadoEn, actualizadoEn, creadoPor, actualizadoPor, ...campos }: Fila): Cuenta {
    return Cuenta.reconstruir({
      ...campos,
      id: Identificador.desde(id),
      empresaId: Identificador.desde(empresaId),
      padreId: padreId ? (Identificador.desde(padreId) as CuentaId) : null,
    });
  },

  aFila(cuenta: Cuenta): typeof cuentas.$inferInsert {
    const { id, empresaId, padreId, ...datos } = cuenta.instantanea();
    return { ...datos, id: id.valor, empresaId: empresaId.valor, padreId: padreId?.valor ?? null };
  },

  aDto({
    empresaId,
    creadoEn,
    actualizadoEn,
    creadoPor,
    actualizadoPor,
    ...dto
  }: Fila & Pick<CuentaDto, 'padreCodigo'>): CuentaDto {
    return dto;
  },
};
