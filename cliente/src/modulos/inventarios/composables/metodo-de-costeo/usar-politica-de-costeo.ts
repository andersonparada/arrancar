import { computed, ref, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiMetodoDeCosteo, type MetodoDeCosteo, type PoliticaDeCosteo } from '../../servicios/metodo-de-costeo.api';
import { preguntaDeElegir, resumenDeLaPolitica, sePuedeElegir } from './textos-de-politica';

/** Confirma con lo que va a pasar y guarda el método elegido. */
function usarGuardadoDelMetodo(elegido: Ref<MetodoDeCosteo | null>, recargar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviando, enviar } = usarFormulario();

  async function guardar(): Promise<void> {
    const metodo = elegido.value;
    if (!metodo) return;
    const mensaje = preguntaDeElegir(metodo);
    const opciones = { titulo: 'Elegir método de costeo', mensaje, textoConfirmar: 'Guardar método' };
    if (!(await avisos.confirmar(opciones))) return;
    if (!(await enviar(() => apiMetodoDeCosteo.elegir(metodo)))) return;
    avisos.exito('Método de costeo guardado.');
    elegido.value = null;
    await recargar();
  }

  return { enviando, guardar };
}

/** La política de costeo: lo que rige, su historia y, mientras ningún movimiento la use, elegir el método. */
export function usarPoliticaDeCosteo() {
  const {
    datos: politica,
    cargando,
    cargar,
  } = usarCarga(
    () => apiMetodoDeCosteo.obtener(),
    null as PoliticaDeCosteo | null,
    'No se pudo cargar la política de costeo.',
  );
  const elegido = ref<MetodoDeCosteo | null>(null);

  return {
    politica,
    cargando,
    elegido,
    ...usarGuardadoDelMetodo(elegido, cargar),
    resumen: computed(() => (politica.value ? resumenDeLaPolitica(politica.value) : null)),
    sePuedeElegir: computed(() => (politica.value ? sePuedeElegir(politica.value) : false)),
    /** Hay algo que guardar: eligió un método distinto del que se muestra o nadie había elegido. */
    hayCambio: computed(() => !!elegido.value && (!politica.value?.elegido || elegido.value !== politica.value.metodo)),
  };
}
