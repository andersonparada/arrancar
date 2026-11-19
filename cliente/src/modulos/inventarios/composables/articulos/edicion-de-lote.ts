import { textoONulo } from '@/modulos/core/utilidades/edicion';
import type { DatosDeLote } from '../../servicios/articulos.api';

/** Lo que muestra cada campo de la ventana mientras se registra un lote. */
export interface EdicionDeLote {
  abierta: boolean;
  codigo: string;
  fechaDeVencimiento: string;
  fechaDeFabricacion: string;
  observaciones: string;
}

/** La ventana abierta y vacía. */
export const edicionDeLoteNuevo = (): EdicionDeLote => ({
  abierta: true,
  codigo: '',
  fechaDeVencimiento: '',
  fechaDeFabricacion: '',
  observaciones: '',
});

/** Lo que se manda al servidor: las fechas y observaciones vacías como `null`. */
export const datosDeLote = (edicion: EdicionDeLote): DatosDeLote => ({
  codigo: edicion.codigo,
  fechaDeVencimiento: textoONulo(edicion.fechaDeVencimiento),
  fechaDeFabricacion: textoONulo(edicion.fechaDeFabricacion),
  observaciones: textoONulo(edicion.observaciones),
});
