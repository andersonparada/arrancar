import { usarSesion } from '../almacenes/sesion';
import { AJUSTES_REGIONALES_PREDETERMINADOS as PREDETERMINADOS, FormatoRegional } from './formato-regional';

/**
 * El único lugar desde donde las pantallas dan formato a fechas y números: toma
 * los ajustes regionales de la empresa activa (llegan con la sesión).
 */
function formatoDeLaEmpresa(): FormatoRegional {
  const { config } = usarSesion();
  return new FormatoRegional({
    zonaHoraria: config('core.regional.zona_horaria', PREDETERMINADOS.zonaHoraria),
    formatoFecha: config('core.regional.formato_fecha', PREDETERMINADOS.formatoFecha),
    decimalesMontos: config('core.regional.decimales_montos', PREDETERMINADOS.decimalesMontos),
    decimalesCantidades: config('core.regional.decimales_cantidades', PREDETERMINADOS.decimalesCantidades),
  });
}

type Instante = string | Date | null | undefined;
type Numero = string | number | null | undefined;

export const formatearFecha = (valor: Instante) => formatoDeLaEmpresa().fecha(valor);

export const formatearFechaHora = (valor: Instante) => formatoDeLaEmpresa().fechaHora(valor);

export const formatearMonto = (valor: Numero, moneda?: string) => formatoDeLaEmpresa().monto(valor, moneda);

export const formatearCantidad = (valor: Numero, unidad?: string) => formatoDeLaEmpresa().cantidad(valor, unidad);

/** La cantidad de un artículo de inventario, con hasta 4 decimales (la unidad es opcional). */
export const formatearCantidadDeInventario = (valor: Numero, unidad?: string) =>
  formatoDeLaEmpresa().cantidadDeInventario(valor, unidad);

/** El costo de una unidad de inventario, con hasta 6 decimales. */
export const formatearCostoUnitario = (valor: Numero, moneda?: string) =>
  formatoDeLaEmpresa().costoUnitario(valor, moneda);

const DIGITOS_DE_TELEFONO_LOCAL = 8;

/**
 * El servidor guarda los teléfonos sin separadores ("55551234"); los locales de
 * Guatemala se leen mejor en dos grupos ("5555-1234"). Los internacionales se
 * muestran tal cual.
 */
export function formatearTelefono(telefono: string | null | undefined): string {
  if (!telefono) return '';
  const esLocal = telefono.length === DIGITOS_DE_TELEFONO_LOCAL && /^\d+$/.test(telefono);
  return esLocal ? `${telefono.slice(0, 4)}-${telefono.slice(4)}` : telefono;
}

/**
 * Un NIT se guarda sin guion ("1234567K"); se muestra con el dígito verificador separado ("123456-7"). "CF", lo que ya
 * trae guion y lo que no parece un NIT se muestran tal cual.
 */
export function formatearNit(nit: string | null | undefined): string {
  if (!nit) return '';
  const limpio = nit.trim();
  return /^\d{2,12}[\dK]$/i.test(limpio) ? `${limpio.slice(0, -1)}-${limpio.slice(-1).toUpperCase()}` : limpio;
}

const SIN_VALOR = '—';

/** Un texto o número tal cual; si falta, una raya. */
export const formatearTexto = (valor: string | number | null | undefined) =>
  valor === null || valor === undefined || valor === '' ? SIN_VALOR : String(valor);

export const formatearSiNo = (valor: boolean) => (valor ? 'Sí' : 'No');

/** El texto de una opción de lista a partir de su valor guardado. */
export const formatearOpcion = (opciones: Record<string, string>, valor: string | null) =>
  valor === null ? SIN_VALOR : (opciones[valor] ?? valor);

const DECIMALES_DEL_TIPO_DE_CAMBIO = 5;

/**
 * Un tipo de cambio («quetzales por unidad») con al menos 5 decimales y sin ceros sobrantes más allá de ellos:
 * `7.64489000` se ve `7.64489` y `0.0512` se ve `0.05120`. Recibe el texto del servidor para no perder precisión.
 */
export function formatearTipoDeCambio(
  valor: string | number | null | undefined,
  decimales = DECIMALES_DEL_TIPO_DE_CAMBIO,
): string {
  if (valor === null || valor === undefined || valor === '' || Number.isNaN(Number(valor))) return SIN_VALOR;
  const [entera = '0', fraccion = ''] = String(valor).trim().split('.');
  return `${entera}.${fraccion.replace(/0+$/, '').padEnd(decimales, '0')}`;
}
