import { isNull, lte, or, sql } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { datosFiscalesDeEmpresa } from '../../../libro-de-compras/infraestructura/persistencia/datos-fiscales.tablas.js';
import type { LectorDeDatosFiscales } from '../../aplicacion/puertos/lector-de-datos-fiscales.js';
import type { DatosFiscalesDeLaVenta } from '../../dominio/costo-fiscal-de-control.js';

const SIN_DATOS_FISCALES: DatosFiscalesDeLaVenta = {
  tipoDePersona: null,
  regimenDeIva: null,
  regimenDeIsr: null,
  llevaContabilidadCompleta: null,
};

function datosDeFila(fila: {
  tipo: string;
  regimenIva: string;
  regimenIsr: string | null;
  contabilidadCompleta: boolean;
}): DatosFiscalesDeLaVenta {
  const { tipo } = fila;
  return {
    tipoDePersona: tipo === 'individual' || tipo === 'juridica' ? tipo : null,
    regimenDeIva: fila.regimenIva,
    regimenDeIsr: fila.regimenIsr,
    llevaContabilidadCompleta: fila.contabilidadCompleta,
  };
}

/** El tipo de persona y los regímenes de la empresa con la vigencia de la fecha; todo `null` si no hay datos fiscales. */
export async function datosFiscalesEn(fecha: string): Promise<DatosFiscalesDeLaVenta> {
  const [fila] = await transaccionEnCurso()
    .select({
      tipo: datosFiscalesDeEmpresa.tipoDePersona,
      regimenIva: datosFiscalesDeEmpresa.regimenIva,
      regimenIsr: datosFiscalesDeEmpresa.regimenIsr,
      contabilidadCompleta: datosFiscalesDeEmpresa.esAgenteDeRetencionIsr,
    })
    .from(datosFiscalesDeEmpresa)
    .where(or(isNull(datosFiscalesDeEmpresa.vigenteDesde), lte(datosFiscalesDeEmpresa.vigenteDesde, fecha)))
    .orderBy(sql`${datosFiscalesDeEmpresa.vigenteDesde} desc nulls last`)
    .limit(1);
  return fila ? datosDeFila(fila) : SIN_DATOS_FISCALES;
}

/** Los datos fiscales de la empresa en la transacción en curso, para las ventas. */
export class DatosFiscalesDrizzle implements LectorDeDatosFiscales {
  en(fecha: string): Promise<DatosFiscalesDeLaVenta> {
    return datosFiscalesEn(fecha);
  }
}
