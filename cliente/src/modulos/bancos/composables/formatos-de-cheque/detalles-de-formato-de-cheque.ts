import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import { formatearFechaHora } from '@/modulos/core/utilidades/formato';
import type { FormatoDeChequeGuardado, PlantillaDeCheque } from '../../servicios/tipos-de-formatos-de-cheque';

/** Lo que muestra la tarjeta de un formato además de su nombre. */
export function detallesDeFormatoDeCheque(
  registro: FormatoDeChequeGuardado,
  plantillas: readonly PlantillaDeCheque[],
): DetalleDeRegistro[] {
  const base = plantillas.find((plantilla) => plantilla.clave === registro.base)?.nombre ?? registro.base;
  const usos = registro.chequerasQueLoUsan;
  return [
    { etiqueta: 'Plantilla de fábrica', valor: base },
    { etiqueta: 'Chequeras que lo usan', valor: String(usos) },
    {
      etiqueta: 'Prueba de alineación',
      valor: registro.probadoEn ? `Hecha el ${formatearFechaHora(registro.probadoEn)}` : 'Sin hacer',
    },
  ];
}
