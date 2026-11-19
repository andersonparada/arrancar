import { Identificador } from '../../../core/compartido/dominio/identificador.js';
import { Traslado, type TrasladoId } from '../../dominio/traslado.js';
import type { traslados } from './traslados.tablas.js';

type Fila = typeof traslados.$inferSelect;

/** Traduce entre la fila y la entidad: el renglón de una boleta, nunca la fila del alta. */
export const mapeadorDeTraslado = {
  aEntidad(fila: Fila): Traslado {
    return Traslado.reconstruir({
      id: Identificador.desde(fila.id) as TrasladoId,
      empresaId: Identificador.desde(fila.empresaId),
      activoId: fila.activoId,
      grupoId: fila.grupoId!,
      numero: fila.numero!,
      anioDeNumero: fila.anioDeNumero!,
      fecha: fila.fecha,
      localidadId: fila.localidadId,
      departamentoId: fila.departamentoId,
      responsable: fila.responsable,
      recibidoPor: fila.recibidoPor!,
      motivo: fila.motivo!,
      aBodega: fila.aBodega,
      estado: fila.estado,
      anuladoEn: fila.anuladoEn,
      anuladoPor: fila.anuladoPor,
      motivoDeAnulacion: fila.motivoDeAnulacion,
    });
  },

  aFila(traslado: Traslado): typeof traslados.$inferInsert {
    const { id, empresaId, ...datos } = traslado.instantanea();
    return { ...datos, id: id.valor, empresaId: empresaId.valor, esAlta: false };
  },
};
