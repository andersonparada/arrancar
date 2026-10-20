import type { OpcionBuscable } from '@/modulos/core/utilidades/busqueda-de-opciones';
import type {
  DatosDelPago,
  GrupoDeEntero,
  GrupoDelMes,
  MatrizDeEnteros,
  PagoDeEntero,
} from '../../servicios/retenciones.api';
import { etiquetaDePeriodo } from '../documentos/filtros-de-documentos';
import { aCentavos, deCentavos } from './dinero';

/** Lo que el usuario escribe al registrar o corregir un pago. */
export interface PagoEnEdicion {
  fechaDePago: string;
  documentoDePago: string;
  monto: string;
  observaciones: string;
}

const dosDigitos = (n: number) => String(n).padStart(2, '0');

/** La fecha de hoy como `AAAA-MM-DD`, con la fecha del equipo. */
export const fechaDeHoy = (hoy: Date): string =>
  `${hoy.getFullYear()}-${dosDigitos(hoy.getMonth() + 1)}-${dosDigitos(hoy.getDate())}`;

/** Un pago nuevo: de hoy y, si falta pagar, por lo que falta (el usuario lo puede cambiar). */
export function pagoNuevo(grupo: GrupoDelMes, hoy: Date): PagoEnEdicion {
  const falta = aCentavos(grupo.diferencia) ?? 0;
  return {
    fechaDePago: fechaDeHoy(hoy),
    documentoDePago: '',
    monto: falta > 0 ? deCentavos(falta) : '',
    observaciones: '',
  };
}

export const pagoParaCorregir = (pago: PagoDeEntero): PagoEnEdicion => ({
  fechaDePago: pago.fechaDePago,
  documentoDePago: pago.documentoDePago,
  monto: pago.monto,
  observaciones: pago.observaciones ?? '',
});

/** Revisa solo lo que falta o no es un importe; el resto lo valida el servidor. */
export function revisarPago(pago: PagoEnEdicion): Record<string, string> {
  const errores: Record<string, string> = {};
  if (!pago.fechaDePago) errores.fechaDePago = 'Escriba la fecha en que pagó.';
  if (!pago.documentoDePago.trim()) {
    errores.documentoDePago = 'Escriba el número del formulario o de la boleta de pago.';
  }
  const monto = aCentavos(pago.monto);
  if (monto === null) errores.monto = 'Escriba el monto con números, por ejemplo 1250.50.';
  else if (monto <= 0) errores.monto = 'El monto debe ser mayor que cero.';
  return errores;
}

/** Lo que se manda al servidor: monto con punto decimal y sin espacios sobrantes. */
export function cuerpoDelPago(pago: PagoEnEdicion): DatosDelPago {
  return {
    fechaDePago: pago.fechaDePago,
    documentoDePago: pago.documentoDePago.trim(),
    monto: deCentavos(aCentavos(pago.monto) ?? 0),
    observaciones: pago.observaciones.trim() || null,
  };
}

/**
 * Lo que quedaría por pagar (negativo si se paga de más) con el monto escrito; si se corrige un pago, su monto
 * anterior ya no cuenta. Solo ayuda a ver el efecto: el servidor da la cuenta oficial.
 */
export function faltanteTrasElPago(
  grupo: GrupoDelMes,
  monto: string,
  corrigiendo?: PagoDeEntero | null,
): string | null {
  const nuevo = aCentavos(monto);
  if (nuevo === null) return null;
  const anterior = corrigiendo ? (aCentavos(corrigiendo.monto) ?? 0) : 0;
  const retenido = aCentavos(grupo.retenido) ?? 0;
  const pagado = aCentavos(grupo.pagado) ?? 0;
  return deCentavos(retenido - (pagado - anterior + nuevo));
}

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
