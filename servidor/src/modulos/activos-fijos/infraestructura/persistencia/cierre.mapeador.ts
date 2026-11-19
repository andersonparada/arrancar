import { aCentavos, deCentavos } from '../../../core/compartido/dominio/centavos.js';
import type { CierreGuardado } from '../../dominio/depreciacion/cierre-guardado.js';
import type { CuotaDelMes } from '../../dominio/depreciacion/cierre-del-mes.js';
import type { CierreNuevo } from '../../aplicacion/puertos/repositorio-cierres.js';
import type { cierres } from './cierres.tablas.js';
import type { cuotas } from './cuotas.tablas.js';

type FilaDeCierre = typeof cierres.$inferSelect;

/** Traduce entre las filas (montos con dos decimales) y los cierres y cuotas del dominio (centavos enteros). */
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
      regimenIsr: fila.regimenIsr,
      totalContableCentavos: aCentavos(fila.totalContable),
      totalFiscalCentavos: aCentavos(fila.totalFiscal),
      activosDepreciados: fila.activosDepreciados,
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
      regimenIsr: nuevo.regimenIsr,
      totalContable: deCentavos(nuevo.totales.contableCentavos),
      totalFiscal: deCentavos(nuevo.totales.fiscalCentavos),
      activosDepreciados: nuevo.totales.activosDepreciados,
    } satisfies Partial<typeof cierres.$inferInsert>;
  },

  aFilaDeCuota(empresaId: string, periodo: string, cuota: CuotaDelMes): typeof cuotas.$inferInsert {
    return {
      empresaId,
      periodo,
      activoId: cuota.activoId,
      libro: cuota.libro,
      tramoId: cuota.tramoId,
      monto: deCentavos(cuota.montoCentavos),
      acumulada: deCentavos(cuota.acumuladaCentavos),
      localidadId: cuota.localidadId,
      departamentoId: cuota.departamentoId,
      ocioso: cuota.ocioso,
    };
  },
};
