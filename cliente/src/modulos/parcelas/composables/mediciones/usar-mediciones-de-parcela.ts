import { computed, ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { formatearFecha } from '@/modulos/core/utilidades/formato';
import { apiMediciones, type Medicion } from '../../servicios/mediciones.api';
import { usarAjustesDeSuperficie } from '../superficie/usar-ajustes-de-superficie';
import { datosDeMedicion, erroresDeMedicion, medicionNueva, type EdicionDeMedicion } from './edicion-de-medicion';

/** Lo que se le pide al operador para anular una medición: cuál y por qué. */
export interface AnulacionEnCurso {
  abierta: boolean;
  medicion: Medicion | null;
  motivo: string;
}

const SIN_ANULACION: AnulacionEnCurso = { abierta: false, medicion: null, motivo: '' };

/** La ventana para registrar una medición: abrirla y guardar lo escrito. */
function usarRegistroDeMedicion(parcelaId: string, recargar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { ajustes } = usarAjustesDeSuperficie();
  const { enviando, errores, enviar } = usarFormulario();
  const edicion = ref<EdicionDeMedicion>(medicionNueva(ajustes.value, false));

  function abrir(): void {
    edicion.value = medicionNueva(ajustes.value);
    errores.value = {};
  }

  async function guardar(): Promise<void> {
    if (!(await enviar(() => apiMediciones.registrar(parcelaId, datosDeMedicion(edicion.value))))) return;
    avisos.exito('Medición registrada.');
    edicion.value.abierta = false;
    await recargar();
  }

  return { ajustes, edicion, enviando, errores: computed(() => erroresDeMedicion(errores.value)), abrir, guardar };
}

/** La ventana para anular una medición con su motivo. */
function usarAnulacionDeMedicion(recargar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const anulacion = ref<AnulacionEnCurso>({ ...SIN_ANULACION });

  function pedirAnulacion(medicion: Medicion): void {
    anulacion.value = { abierta: true, medicion, motivo: '' };
    errores.value = {};
  }

  async function anular(): Promise<void> {
    const { medicion, motivo } = anulacion.value;
    if (!medicion) return;
    if (!(await enviar(() => apiMediciones.anular(medicion.id, motivo)))) return;
    avisos.exito(`Medición del ${formatearFecha(medicion.vigenteDesde)} anulada.`);
    anulacion.value = { ...SIN_ANULACION };
    await recargar();
  }

  return { anulacion, anulandoEnviando: enviando, erroresDeAnulacion: errores, pedirAnulacion, anular };
}

/** Registrar y anular las mediciones de la parcela de la ficha, avisando y volviendo a leer la ficha. */
export function usarMedicionesDeParcela(parcelaId: string, recargar: () => Promise<void>) {
  return { ...usarRegistroDeMedicion(parcelaId, recargar), ...usarAnulacionDeMedicion(recargar) };
}
