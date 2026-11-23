import { aCentavos } from '../../../../core/compartido/dominio/centavos.js';
import { PrecioNoRepartible } from '../../../dominio/errores-de-baja.js';
import { repartirEnProporcion } from '../../../dominio/resultados-de-venta.js';
import type { DatosDeBaja, DatosDeVenta } from '../../../dominio/tipos-de-baja.js';
import type { SolicitudDeBaja, SolicitudDeVenta } from '../../dto/baja.dto.js';

function ventaEnCentavos(venta: SolicitudDeVenta): DatosDeVenta {
  const { precio, iva, ...resto } = venta;
  return { ...resto, precioCentavos: aCentavos(precio), ivaCentavos: aCentavos(iva) };
}

/** Lo que escribió quien da de baja, con el dinero ya en centavos; la validación la hace el dominio. */
export function datosDeBajaDe(solicitud: SolicitudDeBaja): DatosDeBaja {
  const { fecha, causa, descripcion, autorizadaPor, destinoDelBien, numeroDeDenuncia, inventarioId } = solicitud;
  return {
    ...{ fecha, causa, descripcion, autorizadaPor, destinoDelBien, numeroDeDenuncia, inventarioId },
    venta: solicitud.venta ? ventaEnCentavos(solicitud.venta) : null,
  };
}

/**
 * La venta que le toca a cada activo cuando se vende uno con sus componentes: el precio y el IVA se reparten en
 * proporción al costo de cada uno (el sobrante, al último). Un activo solo se queda con la venta entera.
 * @throws PrecioNoRepartible si a algún activo le tocaría menos de un centavo.
 */
export function ventasPorActivo(venta: DatosDeVenta | null, costos: readonly number[]): (DatosDeVenta | null)[] {
  if (!venta) return costos.map(() => null);
  if (costos.length === 1) return [venta];
  const precios = repartirEnProporcion(venta.precioCentavos, costos);
  const ivas = repartirEnProporcion(venta.ivaCentavos, costos);
  if (precios.some((precio) => precio <= 0)) throw new PrecioNoRepartible();
  return precios.map((precioCentavos, i) => ({ ...venta, precioCentavos, ivaCentavos: ivas[i]! }));
}
