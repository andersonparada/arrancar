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

/** Lo que el pago de este proveedor sumaría al mes, para anticipar la bancarización (el servidor decide si bloquea). */
export function avisoDeUmbral(proveedor: ProveedorDelReparto): string | null {
  const { datos } = proveedor;
  if (!datos) return null;
  const umbral = centavosDe(datos.umbralDeBancarizacion) ?? 0;
  const suma = (centavosDe(datos.sumaDelMesAlProveedor) ?? 0) + totalDelProveedor(proveedor);
  if (umbral === 0 || suma < umbral) return null;
  return (
    `Con este pago, lo pagado a ${proveedor.nombre} en el mes llega a ${formatearMonto(textoDeCentavos(suma))} y el umbral de ` +
    `bancarización es ${formatearMonto(datos.umbralDeBancarizacion)}. Si a la empresa le afecta (costo o crédito fiscal), el ` +
    'sistema no dejará pagarlo en efectivo: pague con cheque o transferencia, o, con permiso, escriba el motivo.'
  );
}

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
