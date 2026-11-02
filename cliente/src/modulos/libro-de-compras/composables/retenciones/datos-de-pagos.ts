import type { OpcionBuscable } from '@/modulos/core/utilidades/busqueda-de-opciones';
import type {
  DatosDelPago,
  GrupoDeEntero,
  GrupoDelMes,
  MatrizDeEnteros,
  PagoDeEntero,
} from '../../servicios/retenciones.api';
import { etiquetaDePeriodo } from '../documentos/filtros-de-documentos';
import { aCentavos, deCentavos, esCero, sumarMontos } from './dinero';

/** Lo que el usuario escribe al registrar o corregir un pago; los accesorios en blanco valen cero. */
export interface PagoEnEdicion {
  fechaDePago: string;
  documentoDePago: string;
  impuesto: string;
  multa: string;
  intereses: string;
  mora: string;
  observaciones: string;
}

const ZONA_DE_GUATEMALA = 'America/Guatemala';
const CAMPOS_ACCESORIOS = ['multa', 'intereses', 'mora'] as const;

/** La fecha de hoy como `AAAA-MM-DD` en hora de Guatemala; `ahora` se fija en las pruebas. */
export const fechaDeHoy = (ahora: Date = new Date()): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_DE_GUATEMALA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ahora);

/** Un pago sin nada escrito. */
export const pagoEnBlanco = (): PagoEnEdicion => ({
  fechaDePago: '',
  documentoDePago: '',
  impuesto: '',
  multa: '',
  intereses: '',
  mora: '',
  observaciones: '',
});

/** Un pago nuevo: de hoy y, si falta pagar, por lo que falta de impuesto (el usuario lo puede cambiar). */
export function pagoNuevo(grupo: GrupoDelMes, hoy: Date): PagoEnEdicion {
  const falta = aCentavos(grupo.diferencia) ?? 0;
  return {
    fechaDePago: fechaDeHoy(hoy),
    documentoDePago: '',
    impuesto: falta > 0 ? deCentavos(falta) : '',
    multa: '',
    intereses: '',
    mora: '',
    observaciones: '',
  };
}

/** Un accesorio en cero se deja en blanco para que el grupo se vea plegado y limpio. */
const accesorioParaEditar = (monto: string): string => (aCentavos(monto) === 0 ? '' : monto);

export const pagoParaCorregir = (pago: PagoDeEntero): PagoEnEdicion => ({
  fechaDePago: pago.fechaDePago,
  documentoDePago: pago.documentoDePago,
  impuesto: pago.impuesto,
  multa: accesorioParaEditar(pago.multa),
  intereses: accesorioParaEditar(pago.intereses),
  mora: accesorioParaEditar(pago.mora),
  observaciones: pago.observaciones ?? '',
});

/** Si alguno de los accesorios tiene algo escrito (para abrir la sección de accesorios). */
export const tieneAccesorios = (pago: Pick<PagoEnEdicion, 'multa' | 'intereses' | 'mora'>): boolean =>
  CAMPOS_ACCESORIOS.some((campo) => pago[campo].trim() !== '');

function revisarAccesorios(pago: PagoEnEdicion, errores: Record<string, string>): void {
  for (const campo of CAMPOS_ACCESORIOS) {
    if (pago[campo].trim() === '') continue;
    const centavos = aCentavos(pago[campo]);
    if (centavos === null) errores[campo] = 'Escriba el importe con números, por ejemplo 25.50, o déjelo en blanco.';
    else if (centavos < 0) errores[campo] = 'No puede ser negativo. Si no hubo, déjelo en blanco.';
  }
}

/** Revisa solo lo que falta o no es un importe; el resto lo valida el servidor. */
export function revisarPago(pago: PagoEnEdicion): Record<string, string> {
  const errores: Record<string, string> = {};
  if (!pago.fechaDePago) errores.fechaDePago = 'Escriba la fecha en que pagó.';
  if (!pago.documentoDePago.trim()) {
    errores.documentoDePago = 'Escriba el número del formulario o de la boleta de pago.';
  }
  const impuesto = aCentavos(pago.impuesto);
  if (impuesto === null) errores.impuesto = 'Escriba el impuesto con números, por ejemplo 1250.50.';
  else if (impuesto <= 0) errores.impuesto = 'El impuesto debe ser mayor que cero.';
  revisarAccesorios(pago, errores);
  return errores;
}

const montoParaEnviar = (monto: string): string => deCentavos(aCentavos(monto) ?? 0);

/** Lo que se manda al servidor: los cuatro montos con punto decimal (los accesorios en blanco, en cero). */
export function cuerpoDelPago(pago: PagoEnEdicion): DatosDelPago {
  return {
    fechaDePago: pago.fechaDePago,
    documentoDePago: pago.documentoDePago.trim(),
    impuesto: montoParaEnviar(pago.impuesto),
    multa: montoParaEnviar(pago.multa),
    intereses: montoParaEnviar(pago.intereses),
    mora: montoParaEnviar(pago.mora),
    observaciones: pago.observaciones.trim() || null,
  };
}

/** Lo que costaría la boleta: impuesto más accesorios; lo que no es un importe no cuenta. */
export function totalDelPago(pago: Pick<PagoEnEdicion, 'impuesto' | 'multa' | 'intereses' | 'mora'>): string {
  return sumarMontos(
    [pago.impuesto, pago.multa, pago.intereses, pago.mora].map((m) => (aCentavos(m) === null ? '0' : m)),
  );
}

/**
 * Lo que quedaría por pagar de impuesto (negativo si se paga de más); si se corrige un pago, su impuesto anterior
 * ya no cuenta. Solo ayuda a ver el efecto: el servidor da la cuenta oficial.
 */
export function faltanteTrasElPago(
  grupo: GrupoDelMes,
  impuesto: string,
  corrigiendo?: PagoDeEntero | null,
): string | null {
  const nuevo = aCentavos(impuesto);
  if (nuevo === null) return null;
  const anterior = corrigiendo ? (aCentavos(corrigiendo.impuesto) ?? 0) : 0;
  const retenido = aCentavos(grupo.retenido) ?? 0;
  const pagado = aCentavos(grupo.pagado) ?? 0;
  return deCentavos(retenido - (pagado - anterior + nuevo));
}

/** Cuánto pasaría el impuesto pagado de lo retenido (por ejemplo `318.57`); `null` si no pasa. */
export function excesoDelPago(grupo: GrupoDelMes, pago: PagoEnEdicion, corrigiendo?: PagoDeEntero | null) {
  const faltante = faltanteTrasElPago(grupo, pago.impuesto, corrigiendo);
  return faltante?.startsWith('-') && !esCero(faltante) ? faltante.slice(1) : null;
}

/** Si el impuesto escrito, sumado a lo ya pagado vigente del grupo, pasa lo retenido. */
export const pasaLoRetenido = (grupo: GrupoDelMes, pago: PagoEnEdicion, corrigiendo?: PagoDeEntero | null): boolean =>
  excesoDelPago(grupo, pago, corrigiendo) !== null;

/** Los montos de un pago que no son cero, para mostrar «impuesto + multa + …». */
export function desgloseDelPago(pago: PagoDeEntero): Array<{ nombre: string; monto: string }> {
  const partes = [
    { nombre: 'impuesto', monto: pago.impuesto },
    { nombre: 'multa', monto: pago.multa },
    { nombre: 'intereses', monto: pago.intereses },
    { nombre: 'mora', monto: pago.mora },
  ];
  return partes.filter(({ monto }) => !esCero(monto));
}

/** El pago tiene multa, intereses o mora. */
export const conAccesorios = (pago: Pick<PagoDeEntero, 'multa' | 'intereses' | 'mora'>): boolean =>
  [pago.multa, pago.intereses, pago.mora].some((m) => !esCero(m));

export const pagosVigentes = (grupo: GrupoDelMes): PagoDeEntero[] => grupo.pagos.filter((p) => p.estado === 'vigente');

/** El grupo de un mes en la matriz del año. */
export function celdaDeLaMatriz(matriz: MatrizDeEnteros | null, mes: string, grupo: GrupoDeEntero) {
  return matriz?.meses.find((m) => m.mes === mes)?.grupos.find((g) => g.grupo === grupo) ?? null;
}

const ANIOS_ATRAS = 5;

/** El año en curso y los cinco anteriores, del más reciente al más antiguo (más el que se esté viendo). */
export function opcionesDeAnio(hoy: Date, actual: number): OpcionBuscable<number>[] {
  const anios = Array.from({ length: ANIOS_ATRAS + 1 }, (_, atras) => hoy.getFullYear() - atras);
  const todos = anios.includes(actual) ? anios : [...anios, actual].sort((a, b) => b - a);
  return todos.map((anio) => ({ valor: anio, texto: String(anio) }));
}

/** «Octubre» a partir de `AAAA-MM-01`. */
export function nombreDelMes(mes: string): string {
  const nombre = etiquetaDePeriodo(mes).split(' de ')[0] ?? mes;
  return nombre.charAt(0).toUpperCase() + nombre.slice(1);
}
