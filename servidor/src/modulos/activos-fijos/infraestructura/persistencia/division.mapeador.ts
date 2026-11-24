import { aCentavos, deCentavos } from '../../../core/compartido/dominio/centavos.js';
import { Identificador } from '../../../core/compartido/dominio/identificador.js';
import { Division, type DivisionId } from '../../dominio/division.js';
import type { divisiones } from './divisiones.tablas.js';

type Fila = typeof divisiones.$inferSelect;

/** Traduce entre la fila (montos con dos decimales) y la entidad (centavos enteros); sin marcas de tiempo ni autoría. */
export const mapeadorDeDivision = {
  aEntidad(fila: Fila): Division {
    return Division.reconstruir({
      id: Identificador.desde(fila.id) as DivisionId,
      empresaId: Identificador.desde(fila.empresaId),
      activoOrigenId: fila.activoOrigenId,
      activoNuevoId: fila.activoNuevoId,
      codigoDelActivoNuevo: fila.codigoDelActivoNuevo,
      fecha: fila.fecha,
      periodo: fila.periodo,
      cantidadOriginal: fila.cantidadOriginal,
      cantidadSeparada: fila.cantidadSeparada,
      causa: fila.causa,
      motivo: fila.motivo,
      costoSeparadoCentavos: aCentavos(fila.costoSeparado),
      costoFiscalSeparadoCentavos: aCentavos(fila.costoFiscalSeparado),
      acumuladaContableSeparadaCentavos: aCentavos(fila.acumuladaContableSeparada),
      acumuladaFiscalSeparadaCentavos: aCentavos(fila.acumuladaFiscalSeparada),
      residualSeparadoCentavos: aCentavos(fila.residualSeparado),
      estado: fila.estado,
      anuladoEn: fila.anuladoEn,
      anuladoPor: fila.anuladoPor,
      motivoDeAnulacion: fila.motivoDeAnulacion,
    });
  },

  aFila(division: Division): typeof divisiones.$inferInsert {
    const propiedades = division.instantanea();
    return {
      id: propiedades.id.valor,
      empresaId: propiedades.empresaId.valor,
      activoOrigenId: propiedades.activoOrigenId,
      activoNuevoId: propiedades.activoNuevoId,
      codigoDelActivoNuevo: propiedades.codigoDelActivoNuevo,
      fecha: propiedades.fecha,
      periodo: propiedades.periodo,
      cantidadOriginal: propiedades.cantidadOriginal,
      cantidadSeparada: propiedades.cantidadSeparada,
      causa: propiedades.causa,
      motivo: propiedades.motivo,
      costoSeparado: deCentavos(propiedades.costoSeparadoCentavos),
      costoFiscalSeparado: deCentavos(propiedades.costoFiscalSeparadoCentavos),
      acumuladaContableSeparada: deCentavos(propiedades.acumuladaContableSeparadaCentavos),
      acumuladaFiscalSeparada: deCentavos(propiedades.acumuladaFiscalSeparadaCentavos),
      residualSeparado: deCentavos(propiedades.residualSeparadoCentavos),
      estado: propiedades.estado,
      anuladoEn: propiedades.anuladoEn,
      anuladoPor: propiedades.anuladoPor,
      motivoDeAnulacion: propiedades.motivoDeAnulacion,
    };
  },
};
