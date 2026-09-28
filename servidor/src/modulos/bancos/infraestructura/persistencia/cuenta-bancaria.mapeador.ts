import { Identificador } from '../../../core/compartido/dominio/identificador.js';
import type { CuentaBancariaDto } from '../../aplicacion/dto/cuenta-bancaria.dto.js';
import { CuentaBancaria } from '../../dominio/cuenta-bancaria.js';
import type { cuentasBancarias } from './cuentas-bancarias.tablas.js';

type Fila = typeof cuentasBancarias.$inferSelect;

/** Traduce entre la fila de la tabla, la entidad y lo que ve la pantalla. */
export const mapeadorDeCuentaBancaria = {
  aEntidad({ id, empresaId, creadoEn, actualizadoEn, creadoPor, actualizadoPor, ...campos }: Fila): CuentaBancaria {
    return CuentaBancaria.reconstruir({
      ...campos,
      id: Identificador.desde(id),
      empresaId: Identificador.desde(empresaId),
    });
  },

  aFila(cuentaBancaria: CuentaBancaria): typeof cuentasBancarias.$inferInsert {
    const { id, empresaId, ...datos } = cuentaBancaria.instantanea();
    return { ...datos, id: id.valor, empresaId: empresaId.valor };
  },

  aDto({
    empresaId,
    creadoEn,
    actualizadoEn,
    creadoPor,
    actualizadoPor,
    ...dto
  }: Fila & Pick<CuentaBancariaDto, 'bancoNombre' | 'saldo'>): CuentaBancariaDto {
    return dto;
  },
};
