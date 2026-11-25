import { aCentavos } from '../../../../core/compartido/dominio/centavos.js';
import {
  BienDeTercerosSinConfirmar,
  BienDeTercerosSinDestino,
  PrecioNoRepartible,
} from '../../../dominio/errores-de-baja.js';
import { repartirEnProporcion } from '../../../dominio/resultados-de-venta.js';
import type { TipoDeRegistro } from '../../../dominio/tipos-de-activo.js';
import { CAUSAS_QUE_NO_SE_HACEN_A_TERCEROS } from '../../../dominio/reglas-de-baja.js';
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

/** Lo que se sabe de un activo para armar su baja dentro de un acto con otros activos. */
export interface ParteDeLaBaja {
  codigo: string;
  tipoDeRegistro: TipoDeRegistro;
  venta: DatosDeVenta | null;
  /** Va con su principal (el pedido es el principal; los demás son sus componentes). */
  esComponente: boolean;
  /** Quien da de baja confirmó el destino de este bien de terceros (su código viene en la solicitud). */
  confirmado: boolean;
}

/**
 * Un principal que es bien de control no recibe precio cuando algún componente lleva libros (el precio es de ellos):
 * se va con su venta como «otra» causa. Cualquier otro principal conserva lo pedido y el dominio lo valida.
 */
function principalSinPrecio(datos: DatosDeBaja, tipoDeRegistro: TipoDeRegistro): DatosDeBaja {
  const sinPrecio = datos.causa === 'venta' && tipoDeRegistro === 'bien_de_control';
  return sinPrecio ? { ...datos, causa: 'otra', venta: null } : { ...datos, venta: null };
}

/**
 * Los datos de la baja de un activo en un acto con otros (§3.8). El principal conserva lo pedido y el dominio lo valida
 * (un principal de terceros no se vende; uno de control solo si ningún componente lleva libros). Un componente sin venta propia en una venta queda como «otra»
 * causa (un bien de control se va sin precio). Un componente de terceros no se vende, ni se dona, ni se da por obsoleto
 * con su principal; en las demás causas no hereda la del principal en silencio: quien da de baja confirma cada bien.
 * @throws BienDeTercerosSinDestino si un componente de terceros iría con una venta, donación u obsolescencia.
 * @throws BienDeTercerosSinConfirmar si falta confirmar un componente de terceros.
 */
export function datosDelActivo(datos: DatosDeBaja, parte: ParteDeLaBaja): DatosDeBaja {
  const { codigo, tipoDeRegistro, venta, esComponente, confirmado } = parte;
  if (venta) return { ...datos, venta };
  if (!esComponente) return principalSinPrecio(datos, tipoDeRegistro);
  if (tipoDeRegistro === 'de_terceros') {
    if (CAUSAS_QUE_NO_SE_HACEN_A_TERCEROS.includes(datos.causa)) throw new BienDeTercerosSinDestino(codigo);
    if (!confirmado) throw new BienDeTercerosSinConfirmar(codigo);
  }
  return datos.causa === 'venta' ? { ...datos, causa: 'otra', venta: null } : datos;
}
