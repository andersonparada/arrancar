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
