import { textoONulo } from '@/modulos/core/utilidades/edicion';
import type {
  CargoParaPagar,
  FormaDePagoNuevo,
  LineaSolicitada,
  ParaPagar,
  SolicitudDePago,
} from '../../servicios/tipos-de-pagos';
import { centavosDe, textoDeCentavos } from '../dinero';

export const MAXIMO_DE_REFERENCIA = 100;
export const MAXIMO_DEL_MOTIVO_DEL_PAGO = 300;

/** Lo que se ve y se escribe en «Nuevo pago». `medio` es la chequera (cheque) o la cuenta (nota de débito). */
export interface EdicionDePago {
  forma: FormaDePagoNuevo;
  proveedorId: string;
  /** Las contraseñas del proveedor cuyos cargos entran en el pago. */
  contrasenasIncluidas: string[];
  /** Lo que se paga de cada cargo, por su id; vacío o cero es «no pagar este documento». */
  montos: Record<string, string>;
  /** Los cargos cuya diferencia de centavos se da por saldada. */
  diferencias: string[];
  fecha: string;
  medio: string;
  movimientoId: string;
  noNegociable: boolean;
  referencia: string;
  motivo: string;
  observaciones: string;
}

export const edicionDePagoVacia = (hoy: string): EdicionDePago => ({
  forma: 'cheque',
  proveedorId: '',
  contrasenasIncluidas: [],
  montos: {},
  diferencias: [],
  fecha: hoy,
  medio: '',
  movimientoId: '',
  noNegociable: true,
  referencia: '',
  motivo: '',
  observaciones: '',
});

/** Un cargo con lo que se le paga, en centavos. */
export interface LineaDelPago {
  cargo: CargoParaPagar;
  centavos: number;
}

/** La apertura solo da por pagados saldos iniciales; las demás formas pagan cualquier cargo autorizado. */
export const sirveParaLaForma = (cargo: CargoParaPagar, forma: FormaDePagoNuevo): boolean =>
  forma !== 'cuenta_de_apertura' || cargo.origen === 'saldo_inicial';

/** Los cargos pagables de las contraseñas incluidas, en el orden del servidor (por contraseña y vencimiento). */
export function cargosIncluidos(edicion: EdicionDePago, datos: ParaPagar): CargoParaPagar[] {
  return datos.cargos.filter(
    (cargo) => edicion.contrasenasIncluidas.includes(cargo.contrasenaId) && sirveParaLaForma(cargo, edicion.forma),
  );
}

/** Los cargos con un monto mayor que cero: lo que realmente se paga. */
export function lineasDelPago(edicion: EdicionDePago, datos: ParaPagar): LineaDelPago[] {
  return cargosIncluidos(edicion, datos).flatMap((cargo) => {
    const centavos = centavosDe(edicion.montos[cargo.id] ?? '') ?? 0;
    return centavos > 0 ? [{ cargo, centavos }] : [];
  });
}

export const totalDelPago = (lineas: readonly LineaDelPago[]): number =>
  lineas.reduce((suma, { centavos }) => suma + centavos, 0);

/** La retención que este pago descontaría (constancia); no resta del dinero, el saldo ya viene neto. */
export const retencionDelPago = (lineas: readonly LineaDelPago[]): number =>
  lineas.reduce((suma, { cargo }) => suma + (centavosDe(cargo.retencionPorDescontar) ?? 0), 0);

/** Los montos propuestos (todo el saldo) de los cargos de las contraseñas dadas; no pisa lo ya escrito. */
export function proponerMontos(
  cargos: readonly CargoParaPagar[],
  contrasenaIds: readonly string[],
  actuales: Record<string, string>,
): Record<string, string> {
  const montos = { ...actuales };
  for (const cargo of cargos) {
    if (contrasenaIds.includes(cargo.contrasenaId) && !(cargo.id in montos)) montos[cargo.id] = cargo.propuesto;
  }
  return montos;
}

/** La contraseña con la que se abre y las que entran de entrada: la abierta, o todas si se vino sin una. */
export function contrasenasIniciales(datos: ParaPagar, abierta: string | null): string[] {
  const ids = datos.contrasenas.map(({ id }) => id);
  if (abierta && ids.includes(abierta)) return [abierta];
  return ids;
}

/** Lo que queda sin pagar de un cargo cuando se le paga `monto`, en centavos; cero si no se le paga nada. */
export function residuoDelCargo(cargo: CargoParaPagar, monto: string): number {
  const pagado = centavosDe(monto) ?? 0;
  return pagado > 0 ? Math.max(0, (centavosDe(cargo.disponible) ?? 0) - pagado) : 0;
}

/**
 * El residuo, si es una diferencia de centavos que se puede dar por saldada (mayor que cero y hasta el tope que dice el
 * servidor); `null` si no se ofrece.
 */
export function diferenciaOfrecible(cargo: CargoParaPagar, monto: string, tope: string): number | null {
  const residuo = residuoDelCargo(cargo, monto);
  return residuo > 0 && residuo <= (centavosDe(tope) ?? 0) ? residuo : null;
}

/** Las diferencias marcadas que todavía se ofrecen con los montos de ahora. */
export function diferenciasMarcadas(edicion: EdicionDePago, datos: ParaPagar): LineaSolicitada[] {
  if (edicion.forma === 'cuenta_de_apertura') return [];
  return lineasDelPago(edicion, datos).flatMap(({ cargo }) => {
    const residuo = diferenciaOfrecible(cargo, edicion.montos[cargo.id] ?? '', datos.topeDiferencia);
    return residuo !== null && edicion.diferencias.includes(cargo.id)
      ? [{ cargoId: cargo.id, monto: textoDeCentavos(residuo) }]
      : [];
  });
}

/** La apertura con la carga inicial abierta se registra con la fecha de inicio: no se elige. */
export const fechaFijaDeApertura = (edicion: EdicionDePago, datos: ParaPagar): string | null =>
  edicion.forma === 'cuenta_de_apertura' && !datos.cargaCerrada ? datos.fechaDeInicio : null;

/** Lo común a toda forma: proveedor, fecha, referencia, observaciones, lo que se paga y las diferencias que se saldan. */
function cuerpoComun(edicion: EdicionDePago, datos: ParaPagar) {
  const diferencias = diferenciasMarcadas(edicion, datos);
  return {
    proveedorId: edicion.proveedorId,
    ...(fechaFijaDeApertura(edicion, datos) ? {} : { fecha: edicion.fecha }),
    referencia: textoONulo(edicion.referencia),
    observaciones: textoONulo(edicion.observaciones),
    aplicaciones: lineasDelPago(edicion, datos).map(({ cargo, centavos }) => ({
      cargoId: cargo.id,
      monto: textoDeCentavos(centavos),
    })),
    ...(diferencias.length > 0 ? { diferencias } : {}),
  };
}

/** El cuerpo que recibe el servidor según la forma; el cliente no manda la contraseña de cada línea (la pone el servidor). */
export function solicitudDePago(edicion: EdicionDePago, datos: ParaPagar): SolicitudDePago {
  const base = cuerpoComun(edicion, datos);
  switch (edicion.forma) {
    case 'cheque':
      return { ...base, forma: 'cheque', chequeraId: edicion.medio, noNegociable: edicion.noNegociable };
    case 'nota_de_debito':
      return { ...base, forma: 'nota_de_debito', cuentaBancariaId: edicion.medio };
    case 'nota_ligada':
      return { ...base, forma: 'nota_ligada', movimientoId: edicion.movimientoId };
    case 'cuenta_de_apertura':
      return { ...base, forma: 'cuenta_de_apertura', motivo: edicion.motivo.trim() };
  }
}
