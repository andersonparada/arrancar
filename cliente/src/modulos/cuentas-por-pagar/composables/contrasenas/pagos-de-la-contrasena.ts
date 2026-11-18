import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import type { CargoDeContrasena, FichaDeContrasena } from '../../servicios/tipos-de-contrasenas';
import { centavosDe } from '../dinero';
import { marcasDelPago, nombreDeLaForma } from '../pagos/detalles-de-pago';
import { PERMISO_DE_FORMA } from '../pagos/opciones-del-pago';

/** Un cargo con pagos (vigentes o comprometidos por un posfechado) no se quita de la contraseña: primero se anulan sus pagos. */
export const cargoConPagos = (cargo: Pick<CargoDeContrasena, 'pagado' | 'comprometido'>): boolean =>
  (centavosDe(cargo.pagado) ?? 0) > 0 || (centavosDe(cargo.comprometido) ?? 0) > 0;

/** Los cargos que el servidor ya autorizó y todavía deben algo: lo que «Registrar pago» ofrecería. */
export const cargosPagables = (ficha: Pick<FichaDeContrasena, 'cargos'>): CargoDeContrasena[] =>
  ficha.cargos.filter((cargo) => cargo.estado === 'autorizado' && (centavosDe(cargo.saldo) ?? 0) > 0);

/** «Registrar pago» se ofrece en una contraseña vigente con algo autorizado por pagar y alguna forma permitida. */
export function puedeRegistrarPago(ficha: FichaDeContrasena, puede: (permiso: string) => boolean): boolean {
  const formas = [PERMISO_DE_FORMA.cheque, PERMISO_DE_FORMA.nota_ligada, PERMISO_DE_FORMA.cuenta_de_apertura];
  return ficha.estado === 'vigente' && cargosPagables(ficha).length > 0 && formas.some(puede);
}

/** A «Nuevo pago» con el proveedor y esta contraseña abiertos. */
export const destinoDeNuevoPago = (ficha: Pick<FichaDeContrasena, 'id' | 'proveedorId'>) => ({
  name: 'cuentas-por-pagar.pagos.nuevo',
  query: { proveedorId: ficha.proveedorId, contrasenaId: ficha.id },
});

/** Un pago en la sección «Pagos» de la ficha. */
export interface FilaDePagoDeLaContrasena {
  id: string;
  titulo: string;
  detalle: string;
  monto: string;
  marcas: string[];
  anulado: boolean;
}

/** Los pagos de la contraseña (más antiguo primero, como los manda el servidor), con lo que cada uno entregó dentro de ella. */
export function filasDePagosDeLaContrasena(ficha: Pick<FichaDeContrasena, 'pagos'>): FilaDePagoDeLaContrasena[] {
  return ficha.pagos.map((pago) => ({
    id: pago.pagoId,
    titulo: `Pago ${pago.numero} · ${nombreDeLaForma(pago.forma)}`,
    detalle: formatearFecha(pago.fecha),
    monto: formatearMonto(pago.monto),
    marcas: marcasDelPago(pago),
    anulado: pago.estado === 'anulado',
  }));
}
