import { ref, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { quitarErrorAlCambiar, usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiPagos, type FichaDePago, type LineaDeLaFicha } from '../../servicios/pagos.api';
import { errorDelMotivo } from '../reglas-de-acciones';
import {
  mueveDinero,
  resumenDeAnularPago,
  resumenDeSaldarDiferencia,
  solicitudDeSaldarDiferencia,
} from './ficha-de-pago';

type FichaActual = Readonly<Ref<FichaDePago | null>>;
type AlTerminar = () => Promise<void>;

/** Lo que se ve en la ventana de anular: qué pasará, el motivo y, si mueve dinero, la fecha del inverso (opcional). */
export interface EdicionDeAnulacionDePago {
  abierta: boolean;
  resumen: string;
  motivo: string;
  fecha: string;
  conFecha: boolean;
}

const sinAnulacion = (): EdicionDeAnulacionDePago => ({
  abierta: false,
  resumen: '',
  motivo: '',
  fecha: '',
  conFecha: false,
});

/** El estado de la ventana de anular: se abre con el resumen de lo que pasará y se cierra sin perder la ficha. */
function usarVentanaDeAnulacion(ficha: FichaActual) {
  const { enviando, errores, enviar } = usarFormulario();
  const edicion = ref(sinAnulacion());
  quitarErrorAlCambiar(errores, 'motivo', () => edicion.value.motivo);
  quitarErrorAlCambiar(errores, 'fecha', () => edicion.value.fecha);
  const abrir = (): void => {
    if (!ficha.value) return;
    const { resumen, conFecha } = { resumen: resumenDeAnularPago(ficha.value), conFecha: mueveDinero(ficha.value) };
    edicion.value = { ...sinAnulacion(), abierta: true, resumen, conFecha };
    errores.value = {};
  };
  const cerrar = (): void => {
    edicion.value.abierta = false;
  };
  return { edicion, enviando, errores, enviar, abrir, cerrar };
}

/** Anular el pago: resumen de lo que pasará, motivo y, si mueve dinero, la fecha que Bancos usará para el inverso. */
export function usarAnulacionDePago(ficha: FichaActual, alTerminar: AlTerminar) {
  const { edicion, enviando, errores, enviar, abrir, cerrar } = usarVentanaDeAnulacion(ficha);

  async function confirmar(): Promise<void> {
    if (!ficha.value) return;
    const error = errorDelMotivo(edicion.value.motivo);
    if (error) {
      errores.value = { motivo: error };
      return;
    }
    const { motivo, fecha } = edicion.value;
    const { id, numero } = ficha.value;
    const solicitud = { motivo: motivo.trim(), ...(fecha ? { fecha } : {}) };
    if (!(await enviar(() => apiPagos.anular(id, solicitud)))) return;
    cerrar();
    usarAvisos().exito(`Pago ${numero} anulado: sus documentos recuperaron el saldo.`);
    await alTerminar();
  }

  return { edicion, enviando, errores, abrir, cerrar, confirmar };
}

/** Dar por saldada la diferencia de una línea: confirma con el resumen y envía lo que el servidor ofreció. */
export function usarSaldarDiferencia(ficha: FichaActual, alTerminar: AlTerminar) {
  const procesando = ref(false);
  async function saldar(linea: LineaDeLaFicha): Promise<void> {
    const actual = ficha.value;
    if (!actual) return;
    const confirmado = await usarAvisos().confirmar({
      titulo: 'Dar por saldada la diferencia',
      mensaje: resumenDeSaldarDiferencia(actual, linea),
      textoConfirmar: 'Dar por saldada',
    });
    if (!confirmado) return;
    procesando.value = true;
    try {
      await apiPagos.saldarDiferencia(actual.id, solicitudDeSaldarDiferencia(linea));
      usarAvisos().exito('Diferencia saldada.');
      await alTerminar();
    } catch (error) {
      usarAvisos().error(error instanceof Error ? error.message : 'No se pudo saldar la diferencia.');
    } finally {
      procesando.value = false;
    }
  }
  return { saldar, procesando };
}
