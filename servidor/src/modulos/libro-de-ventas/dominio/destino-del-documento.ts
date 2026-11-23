import type { DestinoDeDocumentoDeVenta } from '../../core/contratos/libro-de-ventas.contratos.js';
import { DestinoInactivo, DestinoNoAdmitido } from './errores-de-baja.js';
import { tieneCartera, type TipoDeDocumento } from './tipos-de-documento.js';
import type { TipoDeIdentificacion } from './receptor.js';

export const DESTINOS_DE_DOCUMENTO = ['cuentas-por-cobrar'] as const satisfies readonly DestinoDeDocumentoDeVenta[];

/** Qué hacer con la venta a consumidor final (`libro-de-ventas.destino.consumidor_final`). */
export type DestinoDelConsumidorFinal = 'sin_cartera' | 'cuentas_por_cobrar';

/** El destino que el cuerpo pide: uno, ninguno (`'ninguno'`) o que lo decida el sistema (sin dato). */
export type DestinoSolicitado = DestinoDeDocumentoDeVenta | 'ninguno' | null | undefined;

export interface DatosDelDestino {
  solicitado: DestinoSolicitado;
  tipo: TipoDeDocumento;
  tipoDeIdentificacion: TipoDeIdentificacion;
  tieneCliente: boolean;
  /** Los destinos instalados y activos en la cuenta. */
  activos: readonly DestinoDeDocumentoDeVenta[];
  consumidorFinal: DestinoDelConsumidorFinal;
  /** El destino de la factura que corrige la nota: la nota va al mismo; `undefined` si no corrige una del libro. */
  destinoDeLaFactura?: DestinoDeDocumentoDeVenta | null;
}

/** El destino que se pide es posible: el tipo es cartera, hay cliente y el módulo está activo. */
function exigirDestinoPosible(destino: DestinoDeDocumentoDeVenta, datos: DatosDelDestino): void {
  if (!tieneCartera(datos.tipo)) {
    throw new DestinoNoAdmitido('Este tipo de documento no es cartera: no puede ir a Cuentas por cobrar.');
  }
  if (!datos.tieneCliente)
    throw new DestinoNoAdmitido('Para ir a Cuentas por cobrar el documento necesita un cliente.');
  if (!datos.activos.includes(destino)) throw new DestinoInactivo('Cuentas por cobrar');
}

/** El destino que sale solo: la cartera, si está activa, el documento es cartera, hay cliente y no es CF a «sin cartera». */
function destinoAutomatico(datos: DatosDelDestino): DestinoDeDocumentoDeVenta | null {
  const [destino] = datos.activos;
  if (!destino || !tieneCartera(datos.tipo) || !datos.tieneCliente) return null;
  const esConsumidorFinal = datos.tipoDeIdentificacion === 'cf';
  return esConsumidorFinal && datos.consumidorFinal === 'sin_cartera' ? null : destino;
}

/** La nota va al mismo destino que su factura; pedir otro es error, y el destino debe seguir activo. */
function destinoDeLaNota(
  pedido: DestinoDeDocumentoDeVenta | null | undefined,
  datos: DatosDelDestino & { destinoDeLaFactura: DestinoDeDocumentoDeVenta | null },
): DestinoDeDocumentoDeVenta | null {
  const { destinoDeLaFactura } = datos;
  if (pedido !== undefined && pedido !== destinoDeLaFactura) {
    throw new DestinoNoAdmitido(
      `La nota debe ir al mismo destino que su factura (${destinoDeLaFactura ?? 'ninguno'}).`,
    );
  }
  if (destinoDeLaFactura && !datos.activos.includes(destinoDeLaFactura))
    throw new DestinoInactivo('Cuentas por cobrar');
  return destinoDeLaFactura;
}

/**
 * A dónde va el documento (VC-P5): la cartera si hay cliente identificado y el módulo está activo; a consumidor final,
 * según la configuración. Una nota va al mismo destino que su factura. Pedir uno imposible es error.
 * @throws DestinoNoAdmitido o DestinoInactivo.
 */
export function resolverDestino(datos: DatosDelDestino): DestinoDeDocumentoDeVenta | null {
  const pedido = datos.solicitado === 'ninguno' ? null : (datos.solicitado ?? undefined);
  if (pedido) exigirDestinoPosible(pedido, datos);
  if (datos.destinoDeLaFactura !== undefined) {
    return destinoDeLaNota(pedido, { ...datos, destinoDeLaFactura: datos.destinoDeLaFactura });
  }
  return pedido === undefined ? destinoAutomatico(datos) : pedido;
}
