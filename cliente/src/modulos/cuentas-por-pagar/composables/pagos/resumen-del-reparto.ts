import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { centavosDe, textoDeCentavos } from '../dinero';
import {
  lineasDelProveedor,
  proveedoresConPago,
  quedaDelRetiro,
  totalDelProveedor,
  totalDelReparto,
  type ProveedorDelReparto,
} from './reparto-de-efectivo';

/** La regla y lo que se pierde (texto E-5 de §5.3, cotejado por el contador); el servidor dice qué efecto aplica de verdad. */
function reglaDeBancarizacion(umbral: string): string {
  return (
    `Los pagos de ${formatearMonto(umbral)} o más (el umbral de bancarización) a un mismo proveedor en el mes, o de una operación de ese monto aunque se ` +
    'pague por partes, deben hacerse por cheque, transferencia o tarjeta a nombre del proveedor. Si se paga en efectivo, ' +
    'según el régimen de la empresa y el documento se pierde el costo deducible del ISR, el crédito fiscal del IVA o ambos; ' +
    'si ya lo tomó, rectifique la declaración de ese mes (Código Tributario, art. 106). Arrancar solo suma los pagos ' +
    'registrados en Arrancar. Si a la empresa le afecta, el sistema no deja pagar en efectivo: pague con cheque o ' +
    'transferencia, o, con permiso, escriba el motivo.'
  );
}

/**
 * Anticipa la bancarización: el mes del proveedor con este pago llega al umbral, o algún documento pagado es de ese monto o
 * más (aunque se pague por partes). No bloquea: el servidor decide según el régimen y el documento.
 */
export function avisoDeUmbral(proveedor: ProveedorDelReparto): string | null {
  const { datos } = proveedor;
  if (!datos) return null;
  const umbral = centavosDe(datos.umbralDeBancarizacion) ?? 0;
  const suma = (centavosDe(datos.sumaDelMesAlProveedor) ?? 0) + totalDelProveedor(proveedor);
  const unaFactura = lineasDelProveedor(proveedor).some(({ cargo }) => cargo.sobreUmbralDeBancarizacion);
  if (umbral === 0 || (suma < umbral && !unaFactura)) return null;
  const motivo = unaFactura
    ? 'uno de los documentos que paga es de ese monto o más'
    : `lo pagado a ${proveedor.nombre} en el mes llega a ${formatearMonto(textoDeCentavos(suma))}`;
  return `Bancarización (Decreto 20-2006, art. 20): ${motivo}. ${reglaDeBancarizacion(datos.umbralDeBancarizacion)}`;
}

/** El texto de la regla para quien debe escribir el motivo: el anticipo si lo hay y, si no, la regla general. */
export const explicacionDeBancarizacion = (proveedor: ProveedorDelReparto): string =>
  avisoDeUmbral(proveedor) ??
  `Bancarización (Decreto 20-2006, art. 20): ${reglaDeBancarizacion(proveedor.datos?.umbralDeBancarizacion ?? '30000.00')}`;

const CUANTOS = (cantidad: number, uno: string, varios: string): string =>
  `${cantidad} ${cantidad === 1 ? uno : varios}`;

/** Una línea del resumen: «A cada proveedor: Q… (2 contraseñas, 3 documentos)». */
function lineaDelResumen(proveedor: ProveedorDelReparto): string {
  const lineas = lineasDelProveedor(proveedor);
  const contrasenas = new Set(lineas.map(({ cargo }) => cargo.contrasenaId)).size;
  const detalle = `${CUANTOS(contrasenas, 'contraseña', 'contraseñas')}, ${CUANTOS(lineas.length, 'documento', 'documentos')}`;
  const sin = proveedor.pedirMotivo && proveedor.motivoSinBancarizar.trim() ? ', sin bancarizar' : '';
  return `• ${proveedor.nombre}: ${formatearMonto(textoDeCentavos(totalDelProveedor(proveedor)))} (${detalle}${sin})`;
}

/** Lo que va a pasar al confirmar: de qué retiro, a quiénes, cuánto, con qué fecha y cuánto queda. */
export function resumenDelReparto(
  retiro: { numero: string; custodio: string; disponible: string },
  proveedores: readonly ProveedorDelReparto[],
): string {
  const conPago = proveedoresConPago(proveedores);
  const total = formatearMonto(textoDeCentavos(totalDelReparto(conPago)));
  const queda = formatearMonto(textoDeCentavos(quedaDelRetiro(retiro.disponible, conPago)));
  return [
    `Se pagarán ${total} en efectivo del retiro ${retiro.numero} (${retiro.custodio}) a ${CUANTOS(conPago.length, 'proveedor', 'proveedores')}:`,
    ...conPago.map(lineaDelResumen),
    `Cada proveedor tendrá su pago y su recibo para firmar. Al retiro le quedarán ${queda}.`,
    'Si algo falla, no se guarda ningún pago.',
  ].join('\n');
}
