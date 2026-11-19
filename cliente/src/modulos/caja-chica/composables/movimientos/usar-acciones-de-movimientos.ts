import type { Ref, UnwrapNestedRefs } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import type { Fondo } from '../../servicios/tipos-de-fondos';
import { apiValesProvisionales } from '../../servicios/vales-provisionales.api';
import { usarAnulacionDeMovimientos } from '../anulaciones/usar-anulacion-de-movimientos';
import { usarCierreDelFondo } from '../cierre/usar-cierre-del-fondo';
import { usarVentanaDeAccion } from '../usar-ventana-de-accion';
import {
  cuerpoDeEntregaDeVale,
  edicionDeEntregaDeVale,
  faltaDeLaEntregaDelVale,
} from '../vales/edicion-de-vale-provisional';

interface Contexto {
  fondo: Ref<Fondo | null>;
  recargar: () => Promise<unknown>;
  /** Trae las cuentas y los usuarios que las ventanas ofrecen. */
  alAbrir: () => void | Promise<void>;
}

/** Entregar un vale provisional: efectivo del fondo a alguien que lo justifica después. */
function ventanaDeEntregaDeVale({ fondo, recargar, alAbrir }: Contexto) {
  const avisos = usarAvisos();
  return usarVentanaDeAccion({
    inicial: edicionDeEntregaDeVale,
    validar: faltaDeLaEntregaDelVale,
    alAbrir,
    enviar: (edicion) => apiValesProvisionales.entregar(fondo.value?.id ?? '', cuerpoDeEntregaDeVale(edicion)),
    exito: (vale) => `Vale ${vale.numero} entregado a ${vale.entregadoA}. Imprímalo desde «Vales provisionales».`,
    alTerminar: async (vale) => {
      vale.avisos.forEach((aviso) => avisos.info(aviso));
      await recargar();
    },
  });
}

/**
 * Lo que se hace desde la ficha con el dinero del fondo, además de las acciones del propio fondo: entregar un vale
 * provisional, cerrar el fondo y anular reposiciones, arqueos y vales. Reponer y arquear son páginas aparte.
 */
export function usarAccionesDeMovimientos(contexto: Contexto) {
  return {
    entregaDeVale: ventanaDeEntregaDeVale(contexto),
    cierre: usarCierreDelFondo(contexto.fondo, contexto),
    anulacion: usarAnulacionDeMovimientos(contexto.recargar),
  };
}

/** Lo que devuelve `usarAccionesDeMovimientos` envuelto en `reactive`, como lo recibe la ventana. */
export type AccionesDeMovimientosEnVista = UnwrapNestedRefs<ReturnType<typeof usarAccionesDeMovimientos>>;
