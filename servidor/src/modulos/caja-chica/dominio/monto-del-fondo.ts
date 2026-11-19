import type { CambioDeMonto, CifrasDelFondo } from './fondos.js';

type CambioParaSumar = Pick<CambioDeMonto, 'tipo' | 'estado' | 'montoCentavos'>;

/** Apertura y aumentos suman; las disminuciones restan; el cierre no cuenta (el fondo ya no existe). */
function efectoDelCambio({ tipo, montoCentavos }: CambioParaSumar): number {
  if (tipo === 'apertura' || tipo === 'aumento') return montoCentavos;
  return tipo === 'disminucion' ? -montoCentavos : 0;
}

/** El monto del fondo: la suma de sus cambios vigentes (§2.3 del diseño). */
export function montoDelFondo(cambios: readonly CambioParaSumar[]): number {
  return cambios
    .filter(({ estado }) => estado === 'vigente')
    .reduce((suma, cambio) => suma + efectoDelCambio(cambio), 0);
}

/** El efectivo que debe haber en la caja: el monto menos lo pendiente de reponer y los vales provisionales abiertos. */
export const efectivoEsperado = ({ montoCentavos, pendienteCentavos, valesCentavos }: CifrasDelFondo): number =>
  montoCentavos - pendienteCentavos - valesCentavos;
