import { onMounted, ref, reactive, watch } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { alDejarDeEscribir } from '@/modulos/core/composables/al-dejar-de-escribir';
import { apiDteRecibidos, type DteRecibido, type EstadoDeDte } from '../../servicios/dte-recibidos.api';
import { consultaDeLaBandeja, filtrosDeLaBandejaVacios, type FiltrosDeLaBandeja } from './datos-de-la-bandeja';

/** Pide la página de filas; si llegan dos respuestas, solo vale la de la última petición. */
function usarPeticionDeLaBandeja(estado: EstadoDeDte, filtros: FiltrosDeLaBandeja, pagina: { value: number }) {
  const avisos = usarAvisos();
  const filas = ref<DteRecibido[]>([]);
  const total = ref(0);
  const cargando = ref(true);
  let ultimaPeticion = 0;

  async function cargar(): Promise<void> {
    const peticion = ++ultimaPeticion;
    cargando.value = true;
    try {
      const respuesta = await apiDteRecibidos.listar(consultaDeLaBandeja(estado, filtros, pagina.value));
      if (peticion !== ultimaPeticion) return;
      filas.value = respuesta.elementos;
      total.value = respuesta.total;
    } catch (error) {
      if (peticion !== ultimaPeticion) return;
      avisos.error(error instanceof Error ? error.message : 'No se pudo cargar la bandeja.');
    }
    cargando.value = false;
  }

  return { filas, total, cargando, cargar };
}

/** Las filas de una pestaña de la bandeja: filtros, página y recarga cuando cambian. */
export function usarListaDeLaBandeja(estado: EstadoDeDte, busquedaInicial = '') {
  const filtros = reactive({ ...filtrosDeLaBandejaVacios(), busqueda: busquedaInicial });
  const pagina = ref(1);
  const peticion = usarPeticionDeLaBandeja(estado, filtros, pagina);

  /** Pone las filas que el servidor devolvió ya cambiadas, sin volver a pedir la página. */
  const reemplazar = (cambiadas: readonly DteRecibido[]): void => {
    const porId = new Map(cambiadas.map((fila) => [fila.id, fila]));
    peticion.filas.value = peticion.filas.value.map((fila) => porId.get(fila.id) ?? fila);
  };

  // Cambiar un filtro vuelve a la primera página; si ya estaba en ella, recarga directo.
  alDejarDeEscribir(filtros, () => (pagina.value === 1 ? peticion.cargar() : (pagina.value = 1)));
  watch(pagina, peticion.cargar);
  onMounted(peticion.cargar);

  const quitarFiltros = (): void => {
    Object.assign(filtros, filtrosDeLaBandejaVacios());
  };

  return { ...peticion, filtros, pagina, reemplazar, quitarFiltros };
}
