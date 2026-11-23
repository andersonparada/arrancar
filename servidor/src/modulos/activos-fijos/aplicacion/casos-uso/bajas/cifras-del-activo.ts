import { aCentavos } from '../../../../core/compartido/dominio/centavos.js';
import type { Activo } from '../../../dominio/activo.js';
import { cifrasDeBaja } from '../../../dominio/depreciacion/cifras-de-baja.js';
import type { PrimerMes } from '../../../dominio/depreciacion/meses.js';
import type { CifrasDeBaja } from '../../../dominio/tipos-de-baja.js';
import { baseFiscalDeUso, costoFiscalDeActivo } from '../activos/base-fiscal-de-uso.js';
import { IncisosDeClases } from '../traslados/dependencias-de-traslados.js';
import { cargarEstado } from '../mejoras/planear-cambio-de-libros.js';
import type { DependenciasDeBajas } from './dependencias-de-bajas.js';

/** Un bien de control o de terceros lleva los montos en cero (§5.12): no tiene libros. */
const CIFRAS_EN_CERO: CifrasDeBaja = {
  costoCentavos: 0,
  depreciacionAcumuladaContableCentavos: 0,
  valorEnLibrosCentavos: 0,
  costoFiscalCentavos: 0,
  baseFiscalCentavos: 0,
  depreciacionAcumuladaFiscalCentavos: 0,
  valorFiscalPorDepreciarCentavos: 0,
  cuotaDelMesContableCentavos: 0,
  cuotaDelMesFiscalCentavos: 0,
};

interface PedidoDeCifras {
  activo: Activo;
  fecha: string;
  primerMes: PrimerMes;
}

/**
 * Lo que valía el activo al día de la baja, para congelarlo (§6.8): costo, costo fiscal, base fiscal y las acumuladas de
 * los dos libros (con la cuota del propio mes si la convención la deprecia). El activo debe estar bloqueado.
 */
export async function cifrasDelActivo(
  dependencias: DependenciasDeBajas,
  pedido: PedidoDeCifras,
): Promise<CifrasDeBaja> {
  const propiedades = pedido.activo.instantanea();
  if (propiedades.tipoDeRegistro !== 'activo') return CIFRAS_EN_CERO;
  const id = propiedades.id.valor;
  const costos = (await dependencias.costos.vigentesDeActivo(id)).map((costo) => costo.instantanea());
  const saldo = await dependencias.saldos.fiscalDeActivo(id);
  const incisoFiscal = await new IncisosDeClases(dependencias.clases).de(propiedades.claseId);
  const ganado = propiedades.valorComoGanadoComun === null ? 0 : aCentavos(propiedades.valorComoGanadoComun);
  return cifrasDeBaja({
    estado: await cargarEstado(dependencias, id),
    fechaDeBaja: pedido.fecha,
    primerMes: pedido.primerMes,
    costoCentavos: costos.reduce((suma, costo) => suma + costo.montoCentavos, 0),
    costoFiscalCentavos: costoFiscalDeActivo(costos, saldo),
    baseFiscalCentavos: baseFiscalDeUso({ incisoFiscal, costos, inmueble: propiedades, ganado }, saldo),
  });
}
