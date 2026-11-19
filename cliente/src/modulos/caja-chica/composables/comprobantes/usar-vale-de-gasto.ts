import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { apiComprobantes } from '../../servicios/comprobantes.api';
import { usarVentanaDeAccion } from '../usar-ventana-de-accion';
import { cuerpoDeVale, edicionDeVale } from './edicion-de-vale';
import { usarConceptosDeGasto } from './usar-conceptos-de-gasto';

/** El vale de gasto de un fondo: gasto menor sin factura. Trae los conceptos de gasto la primera vez que se abre. */
export function usarValeDeGasto(fondoId: () => string, alTerminar: () => Promise<unknown>) {
  const avisos = usarAvisos();
  const { conceptos, traer } = usarConceptosDeGasto();

  const ventana = usarVentanaDeAccion({
    inicial: edicionDeVale,
    alAbrir: traer,
    enviar: (edicion) => apiComprobantes.registrarVale(fondoId(), cuerpoDeVale(edicion)),
    exito: 'Vale de gasto registrado.',
    alTerminar: async (resultado) => {
      resultado.avisos.forEach((aviso) => avisos.info(aviso));
      await alTerminar();
    },
  });
  return { ...ventana, conceptos };
}
