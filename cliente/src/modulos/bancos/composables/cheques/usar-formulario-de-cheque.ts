import { computed, ref, watch } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiCheques } from '../../servicios/cheques.api';
import { opcionesDeConcepto } from '../conceptos/opciones-de-concepto';
import { usarCatalogoDeConceptos } from '../conceptos/usar-catalogo-de-conceptos';
import { datosDeEmisionDeCheque, edicionDeCheque, type EdicionDeCheque } from './edicion-de-cheque';
import { usarSeleccionDeCheque } from './usar-seleccion-de-cheque';

/** La ventana de emitir un cheque desde Cheques: elegir cuenta, número y concepto, y guardarlo. */
export function usarFormularioDeCheque(alGuardar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const edicion = ref<EdicionDeCheque>({ ...edicionDeCheque(), abierta: false });
  const cuentaElegida = computed(() => edicion.value.cuentaBancariaId);
  const { opciones: opcionesDeCheque, sugerido } = usarSeleccionDeCheque(cuentaElegida);
  const { conceptos } = usarCatalogoDeConceptos();
  const opcionesDeConceptos = computed(() => opcionesDeConcepto(conceptos.value, ['cheque']));

  watch(sugerido, (chequeId) => (edicion.value.chequeId = chequeId));

  function nueva(): void {
    edicion.value = edicionDeCheque();
    errores.value = {};
  }

  async function guardar(): Promise<void> {
    const { chequeId } = edicion.value;
    if (!chequeId) return;
    if (!(await enviar(() => apiCheques.emitir(chequeId, datosDeEmisionDeCheque(edicion.value))))) return;
    avisos.exito('Cheque emitido.');
    edicion.value.abierta = false;
    await alGuardar();
  }

  return { edicion, enviando, errores, opcionesDeCheque, opcionesDeConcepto: opcionesDeConceptos, nueva, guardar };
}
