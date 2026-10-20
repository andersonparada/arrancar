import { Identificador } from '../../../core/compartido/dominio/identificador.js';
import { DteRecibido } from '../../dominio/dte-recibido.js';
import type { dteRecibidos } from './dte-recibidos.tablas.js';

type Fila = typeof dteRecibidos.$inferSelect;
type FilaNueva = typeof dteRecibidos.$inferInsert;

/** Traduce entre la fila de `dte_recibidos` y la entidad. */
export const mapeadorDeDteRecibido = {
  aEntidad({
    id,
    empresaId,
    cuentaId,
    creadoEn,
    actualizadoEn,
    creadoPor,
    actualizadoPor,
    ...campos
  }: Fila): DteRecibido {
    return DteRecibido.reconstruir({
      ...campos,
      id: Identificador.desde(id),
      empresaId: Identificador.desde(empresaId),
    });
  },

  aFila(dte: DteRecibido): FilaNueva {
    const { id, empresaId, ...datos } = dte.instantanea();
    return { ...datos, id: id.valor, empresaId: empresaId.valor };
  },

  /** Lo único que cambia después de importar: el estado en la bandeja, y el borrador. */
  aCambios(dte: DteRecibido): Partial<FilaNueva> {
    const { estado, documentoId, motivoDeDescarte, descartadoEn, descartadoPor, motivoDeBloqueo } = dte.instantanea();
    const { proveedorId, conceptoId, destino, fechaRecepcion, periodo, noVinculado, documentoAfectadoId } =
      dte.instantanea();
    return {
      ...{ estado, documentoId, motivoDeDescarte, descartadoEn, descartadoPor, motivoDeBloqueo },
      ...{ proveedorId, conceptoId, destino, fechaRecepcion, periodo, noVinculado, documentoAfectadoId },
    };
  },
};
