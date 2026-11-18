import { computed, onMounted, reactive, ref, watch } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { alDejarDeEscribir } from '@/modulos/core/composables/al-dejar-de-escribir';
import { apiRetiros, type ConsultaDeRetiros, type RetiroResumen } from '../../servicios/retiros.api';
import { fechaDeHoy } from '../dinero';
import { paginasEnTotal } from '../filtros-de-documentos';
import { consultaDeRetiros, filtrosInicialesDeRetiros, RETIROS_POR_PAGINA } from './lista-de-retiros';

/** Pide la página de retiros; si llegan dos respuestas, solo vale la de la última petición. */
function usarPeticionDeRetiros(construirConsulta: () => ConsultaDeRetiros) {
  const avisos = usarAvisos();
  const retiros = ref<RetiroResumen[]>([]);
  const total = ref(0);
  const totalDisponible = ref('0.00');
  const cargando = ref(true);
  let ultimaPeticion = 0;

  async function cargar(): Promise<void> {
    const peticion = ++ultimaPeticion;
    cargando.value = true;
    try {
      const respuesta = await apiRetiros.listar(construirConsulta());
      if (peticion !== ultimaPeticion) return;
      retiros.value = respuesta.elementos;
      total.value = respuesta.total;
      totalDisponible.value = respuesta.totalDisponible;
    } catch (error) {
      if (peticion !== ultimaPeticion) return;
      avisos.error(error instanceof Error ? error.message : 'No se pudo cargar la lista de retiros.');
    }
    if (peticion === ultimaPeticion) cargando.value = false;
  }

  return { retiros, total, totalDisponible, cargando, cargar };
}

/** La pantalla «Retiros de efectivo»: filtros (con la fecha de corte), página y recarga cuando cambian. */
export function usarRetiros() {
  const filtros = reactive(filtrosInicialesDeRetiros());
  const pagina = ref(1);
  const { retiros, total, totalDisponible, cargando, cargar } = usarPeticionDeRetiros(() =>
    consultaDeRetiros(filtros, pagina.value),
  );

  alDejarDeEscribir(filtros, () => (pagina.value === 1 ? cargar() : (pagina.value = 1)));
  watch(pagina, cargar);
  onMounted(cargar);

  return {
    retiros,
    total,
    totalDisponible,
    pagina,
    cargando,
    filtros,
    recargar: cargar,
    hoy: computed(() => fechaDeHoy()),
    paginas: computed(() => paginasEnTotal(total.value, RETIROS_POR_PAGINA)),
    limite: RETIROS_POR_PAGINA,
    quitarFiltros: () => Object.assign(filtros, filtrosInicialesDeRetiros()),
  };
}
