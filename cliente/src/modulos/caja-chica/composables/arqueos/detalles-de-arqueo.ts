import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { PropuestaDeArqueo } from '../../servicios/tipos-de-arqueos';

/** Lo que el sistema sabe del fondo antes de contar, tal como lo calculó el servidor. */
export function partesDeLaPropuesta(propuesta: PropuestaDeArqueo): DetalleDeRegistro[] {
  return [
    { etiqueta: 'El sistema espera en caja', valor: formatearMonto(propuesta.efectivoEsperado) },
    { etiqueta: 'Comprobantes pendientes de reponer', valor: formatearMonto(propuesta.pendienteDeReponer) },
    { etiqueta: 'Vales provisionales abiertos', valor: formatearMonto(propuesta.valesAbiertos) },
    { etiqueta: 'Monto del fondo', valor: formatearMonto(propuesta.monto) },
  ];
}
