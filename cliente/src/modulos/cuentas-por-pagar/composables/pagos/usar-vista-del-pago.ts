import { computed, type Ref } from 'vue';
import type { NotaParaLigar, ParaPagar } from '../../servicios/pagos.api';
import { fechaDeHoy } from '../dinero';
import { avisosDeApertura, avisosDelPago } from './avisos-del-pago';
import {
  fechaFijaDeApertura,
  lineasDelPago,
  retencionDelPago,
  totalDelPago,
  type EdicionDePago,
} from './edicion-de-pago';
import { ayudaDeLaFecha, fechaMaximaDelPago, notaElegida } from './fechas-del-pago';
import { textoDelBoton } from './resumen-del-pago';

/** Lo que la pantalla muestra y que sale de lo escrito: líneas, total, avisos, fechas y textos. */
export function usarVistaDelPago(edicion: EdicionDePago, datos: Ref<ParaPagar | null>, notas: Ref<NotaParaLigar[]>) {
  const hoy = fechaDeHoy();
  const lineas = computed(() => (datos.value ? lineasDelPago(edicion, datos.value) : []));
  const avisos = computed(() => {
    if (!datos.value) return [];
    if (edicion.forma === 'cuenta_de_apertura') return avisosDeApertura(datos.value);
    const nota = notaElegida(edicion, notas.value);
    return avisosDelPago({ edicion, datos: datos.value, lineas: lineas.value, hoy, nota });
  });
  return {
    lineas,
    avisos,
    total: computed(() => totalDelPago(lineas.value)),
    retencion: computed(() => retencionDelPago(lineas.value)),
    fechaMaxima: computed(() => fechaMaximaDelPago(edicion.forma, hoy)),
    fechaFija: computed(() => (datos.value ? fechaFijaDeApertura(edicion, datos.value) : null)),
    ayudaDeLaFecha: computed(() =>
      datos.value ? ayudaDeLaFecha(edicion, { datos: datos.value, lineas: lineas.value }) : '',
    ),
    textoDelBoton: computed(() => textoDelBoton(edicion.forma)),
  };
}
