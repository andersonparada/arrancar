import { aCentavos } from '../../../../core/compartido/dominio/centavos.js';
import { PrecioNoRepartible } from '../../../dominio/errores-de-baja.js';
import { repartirEnProporcion } from '../../../dominio/resultados-de-venta.js';
import type { TipoDeRegistro } from '../../../dominio/tipos-de-activo.js';
import type { CausaDeBaja, DatosDeBaja, DatosDeVenta } from '../../../dominio/tipos-de-baja.js';
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
 * Lo que cada activo aporta al reparto de una venta: su costo si lleva libros; `null` si no entra (un bien de control o de
 * terceros no tiene precio propio). Si ninguno lleva libros, el principal se queda con la venta entera.
 */
export function costosParaRepartir(
  activos: readonly { tipoDeRegistro: TipoDeRegistro; costoCentavos: number }[],
): (number | null)[] {
  const costos = activos.map((a) => (a.tipoDeRegistro === 'activo' ? a.costoCentavos : null));
  return costos.some((costo) => costo !== null) ? costos : activos.map((a, i) => (i === 0 ? a.costoCentavos : null));
}

function repartir(venta: DatosDeVenta, costos: readonly number[]): DatosDeVenta[] {
  if (costos.length === 1) return [venta];
  const precios = repartirEnProporcion(venta.precioCentavos, costos);
  const ivas = repartirEnProporcion(venta.ivaCentavos, costos);
  if (precios.some((precio) => precio <= 0)) throw new PrecioNoRepartible();
  return precios.map((precioCentavos, i) => ({ ...venta, precioCentavos, ivaCentavos: ivas[i]! }));
}

/**
 * La venta que le toca a cada activo cuando se vende uno con sus componentes: el precio y el IVA se reparten solo entre
 * los que llevan libros (`costos` con número), en proporción a su costo; el sobrante, al último. Los de `null` no
 * reciben venta. Un activo solo se queda con la venta entera.
 * @throws PrecioNoRepartible si a algún activo con libros le tocaría menos de un centavo.
 */
export function ventasPorActivo(
  venta: DatosDeVenta | null,
  costos: readonly (number | null)[],
): (DatosDeVenta | null)[] {
  if (!venta) return costos.map(() => null);
  const indices = costos.flatMap((costo, i) => (costo === null ? [] : [i]));
  const partes = repartir(
    venta,
    indices.map((i) => costos[i]!),
  );
  return costos.map((_, i) => partes[indices.indexOf(i)] ?? null);
}

const CAUSAS_QUE_NO_SE_HACEN_A_TERCEROS: readonly CausaDeBaja[] = [
  'venta',
  'donacion',
  'obsolescencia',
  'faltante_de_inventario',
];

/**
 * Los datos de la baja de un activo que se da de baja con otros (§3.8): el que no lleva venta propia en una venta queda
 * como «otra» causa (un bien de control se va con el principal sin precio); un bien de terceros no se vende ni se dona,
 * así que se devuelve a su dueño. Un activo solo conserva su causa y deja que el dominio la valide.
 */
export function datosDelActivo(
  datos: DatosDeBaja,
  parte: { tipoDeRegistro: TipoDeRegistro; venta: DatosDeVenta | null; enConjunto: boolean },
): DatosDeBaja {
  const { tipoDeRegistro, venta, enConjunto } = parte;
  if (venta || !enConjunto) return { ...datos, venta };
  const deTerceros = tipoDeRegistro === 'de_terceros';
  if (deTerceros && CAUSAS_QUE_NO_SE_HACEN_A_TERCEROS.includes(datos.causa))
    return { ...datos, causa: 'devuelto_al_dueno', venta: null };
  return datos.causa === 'venta' ? { ...datos, causa: 'otra', venta: null } : datos;
}
