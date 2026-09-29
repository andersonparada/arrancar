import { Identificador } from '../../../core/compartido/dominio/identificador.js';
import type { DepartamentoDto } from '../../aplicacion/dto/departamento.dto.js';
import { Departamento } from '../../dominio/departamento.js';
import type { departamentos } from './departamentos.tablas.js';

type Fila = typeof departamentos.$inferSelect;

/** Traduce entre la fila de la tabla, la entidad y lo que ve la pantalla. */
export const mapeadorDeDepartamento = {
  aEntidad({ id, empresaId, creadoEn, actualizadoEn, creadoPor, actualizadoPor, ...campos }: Fila): Departamento {
    return Departamento.reconstruir({
      ...campos,
      id: Identificador.desde(id),
      empresaId: Identificador.desde(empresaId),
    });
  },

  aFila(departamento: Departamento): typeof departamentos.$inferInsert {
    const { id, empresaId, ...datos } = departamento.instantanea();
    return { ...datos, id: id.valor, empresaId: empresaId.valor };
  },

  aDto({
    empresaId,
    creadoEn,
    actualizadoEn,
    creadoPor,
    actualizadoPor,
    ...dto
  }: Fila & Pick<DepartamentoDto, 'localidadNombre'>): DepartamentoDto {
    return dto;
  },
};
