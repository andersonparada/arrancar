import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import type { CargoParaAplicar, CargosParaAplicar, DatosDeAplicacion } from '../servicios/tipos';
import { centavosDe, textoDeCentavos } from './dinero';

export const MAXIMO_DE_LA_REFERENCIA = 100;

/** Lo que se ve y se escribe en la ventana de aplicar; `montos` va por id de cargo, vacío es «nada». */
export interface EdicionDeAplicacion {
  abierta: boolean;
  saldoLibre: string;
  fechaMinima: string | null;
  cargos: CargoParaAplicar[];
  montos: Record<string, string>;
  fecha: string;
  referencia: string;
}

export const edicionDeAplicacionVacia = (): EdicionDeAplicacion => ({
  abierta: false,
  saldoLibre: '0.00',
  fechaMinima: null,
  cargos: [],
  montos: {},
  fecha: '',
  referencia: '',
});

/** El monto propuesto por el servidor solo se pone donde hay algo que aplicar. */
export function montosPropuestos(cargos: readonly CargoParaAplicar[]): Record<string, string> {
  const montos: Record<string, string> = {};
  for (const cargo of cargos) montos[cargo.id] = (centavosDe(cargo.propuesto) ?? 0) > 0 ? cargo.propuesto : '';
  return montos;
}

/** La ventana al abrirse: la propuesta del servidor y la fecha de hoy. */
export function edicionDeAplicacion(datos: CargosParaAplicar, hoy: string): EdicionDeAplicacion {
  return {
    abierta: true,
    saldoLibre: datos.saldoLibre,
    fechaMinima: datos.fechaMinima,
    cargos: datos.cargos,
    montos: montosPropuestos(datos.cargos),
    fecha: hoy,
    referencia: '',
  };
}

const centavosDelMonto = (monto: string | undefined): number => centavosDe(monto ?? '') ?? 0;

/** Los cargos con un monto escrito mayor que cero, en el orden en que se ofrecen. */
export function cargosElegidos({ cargos, montos }: EdicionDeAplicacion): CargoParaAplicar[] {
  return cargos.filter((cargo) => centavosDelMonto(montos[cargo.id]) > 0);
}

/** Lo que suman los montos escritos, en centavos. */
export function totalAplicado({ cargos, montos }: EdicionDeAplicacion): number {
  return cargos.reduce((suma, cargo) => suma + centavosDelMonto(montos[cargo.id]), 0);
}

/** Lo que queda del saldo libre después de lo escrito (negativo si se pasó), en centavos. */
export const restanteDeLaNota = (edicion: EdicionDeAplicacion): number =>
  (centavosDe(edicion.saldoLibre) ?? 0) - totalAplicado(edicion);

/** El monto más alto que cabe en un cargo: su saldo, y lo que le queda libre a la nota sin contar lo ya escrito ahí. */
export function montoMaximoDelCargo(edicion: EdicionDeAplicacion, cargo: CargoParaAplicar): string {
  const libre = restanteDeLaNota(edicion) + centavosDelMonto(edicion.montos[cargo.id]);
  return textoDeCentavos(Math.max(0, Math.min(centavosDelMonto(cargo.saldo), libre)));
}

/** La fecha más antigua que se puede escribir: la de la nota o la de recepción del cargo más reciente que se elige. */
export function fechaMinimaDeAplicacion(edicion: EdicionDeAplicacion): string | null {
  const fechas = [edicion.fechaMinima, ...cargosElegidos(edicion).map((cargo) => cargo.fechaRecepcion)];
  const validas = fechas.filter((fecha): fecha is string => !!fecha);
  return validas.length > 0 ? validas.reduce((mayor, fecha) => (fecha > mayor ? fecha : mayor)) : null;
}

/** Hay compensación contra algún documento que llega al umbral de bancarización. */
export const tocaBancarizacion = (edicion: EdicionDeAplicacion): boolean =>
  cargosElegidos(edicion).some((cargo) => cargo.sobreUmbralDeBancarizacion);

function errorDelMonto(texto: string, cargo: CargoParaAplicar): string | null {
  if (!texto.trim()) return null;
  const centavos = centavosDe(texto);
  if (centavos === null || centavos <= 0) return 'Escriba un monto mayor que cero, con hasta dos decimales.';
  return centavos > centavosDelMonto(cargo.saldo) ? `El documento solo debe ${formatearMonto(cargo.saldo)}.` : null;
}

/** Errores por campo antes de molestar al servidor; las claves de los montos son `monto-<cargoId>`. */
export function erroresDeAplicacion(edicion: EdicionDeAplicacion, hoy: string): Record<string, string> {
  const errores: Record<string, string> = {};
  for (const cargo of edicion.cargos) {
    const error = errorDelMonto(edicion.montos[cargo.id] ?? '', cargo);
    if (error) errores[`monto-${cargo.id}`] = error;
  }
  Object.assign(errores, erroresDeLaFecha(edicion, hoy), erroresDelTotal(edicion));
  if (edicion.referencia.trim().length > MAXIMO_DE_LA_REFERENCIA)
    errores.referencia = `Acórtela a ${MAXIMO_DE_LA_REFERENCIA} caracteres o menos.`;
  return errores;
}

function erroresDelTotal(edicion: EdicionDeAplicacion): Record<string, string> {
  if (cargosElegidos(edicion).length === 0) return { total: 'Escriba el monto de al menos un documento.' };
  return restanteDeLaNota(edicion) < 0
    ? {
        total: `Lo escrito pasa del saldo a favor de la nota (${formatearMonto(edicion.saldoLibre)}). Baje algún monto.`,
      }
    : {};
}

function erroresDeLaFecha(edicion: EdicionDeAplicacion, hoy: string): Record<string, string> {
  if (!edicion.fecha) return { fecha: 'Escriba la fecha del acuerdo.' };
  if (edicion.fecha > hoy) return { fecha: 'La fecha no puede ser futura.' };
  const minima = fechaMinimaDeAplicacion(edicion);
  return minima && edicion.fecha < minima
    ? { fecha: `No puede ser anterior al ${formatearFecha(minima)}, cuando se recibió el documento más reciente.` }
    : {};
}

/** El cuerpo de la solicitud; solo se llama con la edición ya validada. */
export function datosDeAplicacion(edicion: EdicionDeAplicacion): DatosDeAplicacion {
  return {
    fecha: edicion.fecha,
    referencia: edicion.referencia.trim() || null,
    aplicaciones: cargosElegidos(edicion).map((cargo) => ({
      cargoId: cargo.id,
      monto: textoDeCentavos(centavosDelMonto(edicion.montos[cargo.id])),
    })),
  };
}

/**
 * Pasa los errores del servidor (`aplicaciones.<i>.monto`, `aplicaciones.<i>.cargoId`) a las claves de la ventana,
 * donde cada fila lleva su cargo.
 */
export function erroresDelServidor(
  errores: Record<string, string>,
  enviados: DatosDeAplicacion,
): Record<string, string> {
  const resultado: Record<string, string> = {};
  for (const [campo, mensaje] of Object.entries(errores)) {
    const fila = /^aplicaciones\.(\d+)\./.exec(campo);
    const cargoId = fila ? enviados.aplicaciones[Number(fila[1])]?.cargoId : undefined;
    resultado[cargoId ? `monto-${cargoId}` : campo] = mensaje;
  }
  return resultado;
}

/** Lo que va a pasar, para leerlo antes de confirmar. */
export function resumenDeAplicacion(edicion: EdicionDeAplicacion): string {
  const cuantos = cargosElegidos(edicion).length;
  const total = formatearMonto(textoDeCentavos(totalAplicado(edicion)));
  const sobra = restanteDeLaNota(edicion);
  const queda = sobra > 0 ? ` A la nota le quedan ${formatearMonto(textoDeCentavos(sobra))} a favor.` : '';
  return `Se aplicarán ${total} a ${cuantos === 1 ? '1 documento' : `${cuantos} documentos`}.${queda}`;
}
