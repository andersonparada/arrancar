import { Identificador } from '../../../core/compartido/dominio/identificador.js';
import type { FormatoDeChequeDto } from '../../aplicacion/dto/formato-de-cheque.dto.js';
import { FormatoGuardado } from '../../dominio/formato-guardado.js';
import type { formatosDeCheque } from './formatos-de-cheque.tablas.js';

type Fila = typeof formatosDeCheque.$inferSelect;

/** Traduce entre la fila de la tabla, la entidad y lo que ve la pantalla. */
export const mapeadorDeFormatoDeCheque = {
  aEntidad({ id, cuentaId, creadoEn, actualizadoEn, creadoPor, actualizadoPor, ajustes, base, ...campos }: Fila) {
    return FormatoGuardado.reconstruir({
      ...campos,
      id: Identificador.desde(id),
      cuentaId: Identificador.desde(cuentaId),
      base: base as FormatoDeChequeDto['base'],
      ajustes: ajustes as Record<string, unknown>,
    });
  },

  aFila(formato: FormatoGuardado): typeof formatosDeCheque.$inferInsert {
    const { id, cuentaId, ...datos } = formato.instantanea();
    return { ...datos, id: id.valor, cuentaId: cuentaId.valor };
  },

  aDto(fila: Fila & { chequerasQueLoUsan: number }): FormatoDeChequeDto {
    const { id, nombre, base, ajustes, probadoEn, activo, chequerasQueLoUsan } = fila;
    return {
      id,
      nombre,
      base: base as FormatoDeChequeDto['base'],
      ajustes: ajustes as Record<string, unknown>,
      probadoEn: probadoEn ? probadoEn.toISOString() : null,
      activo,
      chequerasQueLoUsan,
    };
  },
};
