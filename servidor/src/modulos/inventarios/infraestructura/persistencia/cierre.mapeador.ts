import type { CierreGuardado } from '../../dominio/cierre/cierre-guardado.js';
import type { RenglonDelCierre } from '../../dominio/cierre/existencias-del-cierre.js';
import { aCentavosEnteros, deCentavosEnteros, deDiezmilesimas, deMillonesimas } from '../../dominio/decimales.js';
import type { CierreNuevo } from '../../aplicacion/puertos/repositorio-de-cierres.js';
import type { cierres } from './cierres.tablas.js';
import type { existenciasAlCierre } from './existencias-al-cierre.tablas.js';

type FilaDeCierre = typeof cierres.$inferSelect;

/** Traduce entre las filas (montos con decimales) y los cierres y renglones del dominio (enteros). */
export const mapeadorDeCierre = {
  aCierre(fila: FilaDeCierre): CierreGuardado {
    return {
      periodo: fila.periodo,
      estado: fila.estado,
      cerradoEn: fila.cerradoEn,
      cerradoPor: fila.cerradoPor,
      reabiertoEn: fila.reabiertoEn,
      reabiertoPor: fila.reabiertoPor,
      motivoDeReapertura: fila.motivoDeReapertura,
      metodo: fila.metodo,
      regimenIsr: fila.regimenIsr,
      valorTotal: aCentavosEnteros(fila.valorTotal),
      articulosConExistencia: fila.articulosConExistencia,
    };
  },

  /** Lo que se escribe del cierre: es lo mismo al crearlo que al volver a cerrar un mes reabierto. */
  aFila(nuevo: CierreNuevo) {
    return {
      estado: 'cerrado',
      cerradoEn: nuevo.ahora,
      cerradoPor: nuevo.cerradoPor,
      reabiertoEn: null,
      reabiertoPor: null,
      motivoDeReapertura: null,
      metodo: nuevo.metodo,
      regimenIsr: nuevo.regimenIsr,
      valorTotal: deCentavosEnteros(nuevo.totales.valorTotal),
      articulosConExistencia: nuevo.totales.articulosConExistencia,
    } satisfies Partial<typeof cierres.$inferInsert>;
  },

  aFilaDeRenglon(
    empresaId: string,
    periodo: string,
    renglon: RenglonDelCierre,
  ): typeof existenciasAlCierre.$inferInsert {
    return {
      empresaId,
      periodo,
      articuloId: renglon.articuloId,
      bodegaId: renglon.bodegaId,
      tipoDeInventario: renglon.tipoDeInventario,
      enTransitoInterno: renglon.enTransitoInterno,
      cantidad: deDiezmilesimas(renglon.cantidad),
      costoUnitario: deMillonesimas(renglon.costoUnitario),
      valor: deCentavosEnteros(renglon.valor),
    };
  },
};
