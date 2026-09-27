import { onMounted, reactive, ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { alDejarDeEscribir } from '@/modulos/core/composables/al-dejar-de-escribir';
import { apiTerceros, type FiltrosTerceros, type PapelTercero, type TerceroEnListado } from '../servicios/terceros.api';

export type EstadoBuscado = 'true' | 'false' | '';

export interface FiltrosDelListado {
  texto: string;
  estado: EstadoBuscado;
}

/** Lo que se pide al servidor: siempre del papel de la pantalla; texto y estado solo si se eligieron. */
export function consultaDelListado(papel: PapelTercero, { texto, estado }: FiltrosDelListado): FiltrosTerceros {
  return {
    papel,
    texto: texto.trim() || undefined,
    activo: estado === '' ? undefined : estado === 'true',
  };
}

/** Clientes o proveedores de la cuenta, con búsqueda y filtro de activos. */
export function usarListadoDeTerceros(papel: PapelTercero) {
  const avisos = usarAvisos();
  const terceros = ref<TerceroEnListado[]>([]);
  const cargando = ref(false);
  const filtros = reactive<FiltrosDelListado>({ texto: '', estado: 'true' });

  async function cargar(): Promise<void> {
    cargando.value = true;
    try {
      terceros.value = await apiTerceros.listar(consultaDelListado(papel, filtros));
    } catch (error) {
      avisos.error(error instanceof Error ? error.message : 'No se pudo cargar la lista.');
    } finally {
      cargando.value = false;
    }
  }

  alDejarDeEscribir(filtros, cargar);
  onMounted(cargar);

  return { terceros, cargando, filtros };
}
