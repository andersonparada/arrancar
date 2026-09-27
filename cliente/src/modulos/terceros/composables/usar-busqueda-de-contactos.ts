import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { alDejarDeEscribir } from '@/modulos/core/composables/al-dejar-de-escribir';
import { apiTerceros, type ContactoEncontrado } from '../servicios/terceros.api';

const MINIMO_DE_CARACTERES = 2;

/** "Buscar contacto": busca mientras se escribe, a partir de dos caracteres. */
export function usarBusquedaDeContactos() {
  const avisos = usarAvisos();
  const texto = ref('');
  const encontrados = ref<ContactoEncontrado[]>([]);
  const buscando = ref(false);

  async function buscar(): Promise<void> {
    const buscado = texto.value.trim();
    buscando.value = buscado.length >= MINIMO_DE_CARACTERES;
    try {
      encontrados.value = buscando.value ? await apiTerceros.buscarContactos(buscado) : [];
    } catch (error) {
      avisos.error(error instanceof Error ? error.message : 'No se pudo buscar.');
    } finally {
      buscando.value = false;
    }
  }

  alDejarDeEscribir(texto, buscar);
  return { texto, encontrados, buscando, minimo: MINIMO_DE_CARACTERES };
}
