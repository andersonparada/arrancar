import { computed, reactive, ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiChequeras, type Chequera } from '../../servicios/chequeras.api';
import { apiFormatosDeCheque } from '../../servicios/formatos-de-cheque.api';
import type { FormatoDeChequeGuardado, PlantillaDeCheque } from '../../servicios/tipos-de-formatos-de-cheque';
import {
  formatoDeChequeraDeValor,
  opcionesDeFormatoDeChequera,
  valorDelFormatoDeChequera,
} from './formato-de-chequera';

/** Los formatos de la cuenta y las plantillas de fábrica: se traen al abrir la ventana, no antes. */
function usarCatalogoDeFormatos() {
  const avisos = usarAvisos();
  const formatos = ref<FormatoDeChequeGuardado[]>([]);
  const plantillas = ref<PlantillaDeCheque[]>([]);

  async function traer(): Promise<boolean> {
    try {
      [formatos.value, plantillas.value] = await Promise.all([
        apiFormatosDeCheque.listar(),
        apiFormatosDeCheque.plantillas(),
      ]);
      return true;
    } catch (error) {
      avisos.error(error instanceof Error ? error.message : 'No se pudieron cargar los formatos.');
      return false;
    }
  }

  const opciones = (actual: string) => opcionesDeFormatoDeChequera(formatos.value, plantillas.value, actual);
  return { opciones, traer };
}

/**
 * Elegir con qué formato se imprimen los cheques de una chequera; al guardar se recarga la lista. `formato` es lo que
 * muestra la ventana (la chequera elegida, la opción, las opciones, el envío y los errores).
 */
export function usarFormatoDeChequera(alTerminar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const catalogo = usarCatalogoDeFormatos();
  const chequera = ref<Chequera | null>(null);
  const valor = ref('');
  const opciones = computed(() => catalogo.opciones(valor.value));

  async function abrirFormato(elegida: Chequera): Promise<void> {
    if (!(await catalogo.traer())) return;
    valor.value = valorDelFormatoDeChequera(elegida);
    errores.value = {};
    chequera.value = elegida;
  }

  async function guardarFormato(): Promise<void> {
    const destino = chequera.value;
    if (!destino) return;
    const asignar = () => apiChequeras.asignarFormato(destino.id, formatoDeChequeraDeValor(valor.value));
    if (!(await enviar(asignar))) return;
    avisos.exito('Formato de impresión asignado.');
    chequera.value = null;
    await alTerminar();
  }

  const formato = reactive({ chequera, valor, opciones, enviando, errores });
  return { formato, abrirFormato, guardarFormato, cerrarFormato: () => (chequera.value = null) };
}
