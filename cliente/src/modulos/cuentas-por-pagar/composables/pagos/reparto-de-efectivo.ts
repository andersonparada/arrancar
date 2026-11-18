import { textoONulo } from '@/modulos/core/utilidades/edicion';
import type { OpcionBuscable } from '@/modulos/core/utilidades/busqueda-de-opciones';
import type { ParaPagar, ProveedorPorPagar } from '../../servicios/tipos-de-pagos';
import type { PagoEnEfectivoSolicitado, SolicitudDeReparto } from '../../servicios/tipos-de-retiros';
import { centavosDe, textoDeCentavos } from '../dinero';
import {
  contrasenasIniciales,
  diferenciasMarcadas,
  edicionDePagoVacia,
  lineasDelPago,
  proponerMontos,
  totalDelPago,
  type EdicionDePago,
  type LineaDelPago,
} from './edicion-de-pago';
import { opcionesDeProveedores } from './opciones-del-pago';

/** Un reparto lleva de 1 a 20 proveedores y, entre todos, hasta 300 documentos (lo mismo que revisa el servidor). */
export const MAXIMO_DE_PROVEEDORES_EN_EL_REPARTO = 20;
export const MAXIMO_DE_DOCUMENTOS_EN_EL_REPARTO = 300;
export const MAXIMO_DE_QUIEN_RECIBE = 150;
export const MAXIMO_DEL_MOTIVO_SIN_BANCARIZAR = 300;

/**
 * Lo que se le paga a un proveedor del reparto. La edición es la misma de «Nuevo pago» (contraseñas, montos, diferencias,
 * fecha, recibo del proveedor y observaciones): su forma no se usa, solo la apertura cambia las reglas de los cargos.
 */
export interface ProveedorDelReparto {
  proveedorId: string;
  nombre: string;
  nit: string | null;
  datos: ParaPagar | null;
  cargando: boolean;
  edicion: EdicionDePago;
  /** Quien recibe el efectivo por el proveedor y firma el recibo. */
  recibidoPor: string;
  motivoSinBancarizar: string;
  /** El servidor bloqueó este pago por bancarización: se pide el motivo (si el usuario tiene el permiso). */
  pedirMotivo: boolean;
  /** Lo que dijo el servidor al bloquear este pago por bancarización; se queda a la vista mientras se decide. */
  bloqueo: string | null;
  abierto: boolean;
}

/** Un proveedor recién agregado, con la fecha de todos y sin datos hasta que lleguen del servidor. */
export function proveedorDelReparto(proveedor: ProveedorPorPagar, fecha: string): ProveedorDelReparto {
  return {
    proveedorId: proveedor.proveedorId,
    nombre: proveedor.nombre,
    nit: proveedor.nit,
    datos: null,
    cargando: true,
    edicion: { ...edicionDePagoVacia(fecha), proveedorId: proveedor.proveedorId },
    recibidoPor: '',
    motivoSinBancarizar: '',
    pedirMotivo: false,
    bloqueo: null,
    abierto: true,
  };
}

/** Cuando llegan sus cargos: se incluyen las contraseñas (la de la que se vino, o todas) con todo el saldo propuesto. */
export function conLosCargos(proveedor: ProveedorDelReparto, datos: ParaPagar, abierta: string | null): void {
  proveedor.datos = datos;
  proveedor.cargando = false;
  proveedor.edicion.contrasenasIncluidas = contrasenasIniciales(datos, abierta);
  proveedor.edicion.montos = proponerMontos(datos.cargos, proveedor.edicion.contrasenasIncluidas, {});
}

/** Suma una contraseña del proveedor al pago, con todo el saldo de sus documentos propuesto (sin pisar lo ya escrito). */
export function agregarContrasena(proveedor: ProveedorDelReparto, contrasenaId: string): void {
  if (!proveedor.datos || proveedor.edicion.contrasenasIncluidas.includes(contrasenaId)) return;
  proveedor.edicion.contrasenasIncluidas = [...proveedor.edicion.contrasenasIncluidas, contrasenaId];
  proveedor.edicion.montos = proponerMontos(proveedor.datos.cargos, [contrasenaId], proveedor.edicion.montos);
}

export function quitarContrasena(proveedor: ProveedorDelReparto, contrasenaId: string): void {
  proveedor.edicion.contrasenasIncluidas = proveedor.edicion.contrasenasIncluidas.filter((id) => id !== contrasenaId);
}

export const lineasDelProveedor = (proveedor: ProveedorDelReparto): LineaDelPago[] =>
  proveedor.datos ? lineasDelPago(proveedor.edicion, proveedor.datos) : [];

export const totalDelProveedor = (proveedor: ProveedorDelReparto): number =>
  totalDelPago(lineasDelProveedor(proveedor));

/** Los proveedores que de verdad reciben algo: los que llevan al menos un documento con monto. */
export const proveedoresConPago = (proveedores: readonly ProveedorDelReparto[]): ProveedorDelReparto[] =>
  proveedores.filter((proveedor) => lineasDelProveedor(proveedor).length > 0);

export const totalDelReparto = (proveedores: readonly ProveedorDelReparto[]): number =>
  proveedores.reduce((suma, proveedor) => suma + totalDelProveedor(proveedor), 0);

export const documentosDelReparto = (proveedores: readonly ProveedorDelReparto[]): number =>
  proveedores.reduce((suma, proveedor) => suma + lineasDelProveedor(proveedor).length, 0);

/** Lo que queda en el retiro mientras se reparte, en centavos; negativo si se reparte de más. */
export const quedaDelRetiro = (disponible: string, proveedores: readonly ProveedorDelReparto[]): number =>
  (centavosDe(disponible) ?? 0) - totalDelReparto(proveedores);

/** Los proveedores que aún se pueden agregar (cada uno aparece una sola vez), por nombre. */
export function opcionesParaAgregar(
  todos: readonly ProveedorPorPagar[],
  proveedores: readonly ProveedorDelReparto[],
): OpcionBuscable<string>[] {
  const yaEstan = new Set(proveedores.map(({ proveedorId }) => proveedorId));
  return opcionesDeProveedores(todos.filter(({ proveedorId }) => !yaEstan.has(proveedorId)));
}

/** El pago de un proveedor tal como lo recibe el servidor; el cliente no manda la contraseña de cada línea. */
function pagoDelProveedor(proveedor: ProveedorDelReparto): PagoEnEfectivoSolicitado {
  const { edicion, datos } = proveedor;
  const diferencias = datos ? diferenciasMarcadas(edicion, datos) : [];
  return {
    proveedorId: proveedor.proveedorId,
    fecha: edicion.fecha,
    recibidoPor: textoONulo(proveedor.recibidoPor),
    referencia: textoONulo(edicion.referencia),
    observaciones: textoONulo(edicion.observaciones),
    motivoSinBancarizar: proveedor.pedirMotivo ? textoONulo(proveedor.motivoSinBancarizar) : null,
    aplicaciones: lineasDelProveedor(proveedor).map(({ cargo, centavos }) => ({
      cargoId: cargo.id,
      monto: textoDeCentavos(centavos),
    })),
    ...(diferencias.length > 0 ? { diferencias } : {}),
  };
}

/** Un pago por proveedor con algo que pagar, en el orden de la pantalla: de ese orden salen los números de pago. */
export const solicitudDelReparto = (proveedores: readonly ProveedorDelReparto[]): SolicitudDeReparto => ({
  pagos: proveedoresConPago(proveedores).map(pagoDelProveedor),
});
