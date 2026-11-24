import { Identificador } from '../../../core/compartido/dominio/identificador.js';
import type { MedicionDto } from '../../aplicacion/dto/medicion.dto.js';
import { Medicion } from '../../dominio/medicion.js';
import type { mediciones } from './mediciones.tablas.js';

type Fila = typeof mediciones.$inferSelect;

/** Traduce entre la fila de la tabla, la entidad y lo que ve la pantalla. */
export const mapeadorDeMedicion = {
  aEntidad({ id, empresaId, creadoEn, actualizadoEn, creadoPor, actualizadoPor, ...campos }: Fila): Medicion {
    return Medicion.reconstruir({
      ...campos,
      id: Identificador.desde(id),
      empresaId: Identificador.desde(empresaId),
    });
  },

  aFila(medicion: Medicion): typeof mediciones.$inferInsert {
    const { id, empresaId, ...datos } = medicion.instantanea();
    return { ...datos, id: id.valor, empresaId: empresaId.valor };
  },

  aDto(fila: Fila): MedicionDto {
    return {
      id: fila.id,
      parcelaId: fila.parcelaId,
      vigenteDesde: fila.vigenteDesde,
      fuente: fila.fuente,
      superficieTotalM2: fila.superficieTotalM2,
      superficieUtilM2: fila.superficieUtilM2,
      cantidadOriginal: fila.cantidadOriginal,
      unidadOriginal: fila.unidadOriginal,
      varasPorLadoDeCuerda: fila.varasPorLadoDeCuerda,
      documento: fila.documento,
      estado: fila.estado,
      anuladaEn: fila.anuladaEn?.toISOString() ?? null,
      motivoDeAnulacion: fila.motivoDeAnulacion,
    };
  },
};
