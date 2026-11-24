import { computed, onMounted, reactive, ref, watch } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { alDejarDeEscribir } from '@/modulos/core/composables/al-dejar-de-escribir';
import { apiAnticipos, type AnticipoResumen, type ConsultaDeAnticipos } from '../../servicios/anticipos.api';
import { apiOpciones } from '../../servicios/opciones.api';
import { fechaDeHoy } from '../reportes/fechas-de-reportes';
import { paginasEnTotal } from '../paginacion';
import { ANTICIPOS_POR_PAGINA, consultaDeAnticipos, filtrosInicialesDeAnticipos } from './lista-de-anticipos';

/** Pide la página de anticipos; si llegan dos respuestas, solo vale la de la última petición. */
function usarPeticionDeAnticipos(construirConsulta: () => ConsultaDeAnticipos) {
  const avisos = usarAvisos();
  const anticipos = ref<AnticipoResumen[]>([]);
  const total = ref(0);
  const totalPorJustificar = ref('0.00');
  const cargando = ref(true);
  let ultimaPeticion = 0;

  async function cargar(): Promise<void> {
    const peticion = ++ultimaPeticion;
    cargando.value = true;
    try {
      const respuesta = await apiAnticipos.listar(construirConsulta());
      if (peticion !== ultimaPeticion) return;
      anticipos.value = respuesta.elementos;
      total.value = respuesta.total;
      totalPorJustificar.value = respuesta.totalPorJustificar;
    } catch (error) {
      if (peticion !== ultimaPeticion) return;
      avisos.error(error instanceof Error ? error.message : 'No se pudo cargar la lista de anticipos.');
    }
    if (peticion === ultimaPeticion) cargando.value = false;
  }

  return { anticipos, total, totalPorJustificar, cargando, cargar };
}

/** Los beneficiarios para filtrar la lista (el catálogo propio del módulo, sin pedir `terceros.ver`). */
function usarBeneficiariosParaFiltrar() {
  const beneficiarios = ref<{ valor: string; texto: string }[]>([]);
  onMounted(async () => {
    const terceros = await apiOpciones.beneficiarios().catch(() => []);
    beneficiarios.value = [
      { valor: '', texto: 'Todos los beneficiarios' },
      ...terceros
        .map(({ id, nombreMostrar }) => ({ valor: id, texto: nombreMostrar }))
        .sort((a, b) => a.texto.localeCompare(b.texto, 'es', { sensitivity: 'base' })),
    ];
  });
  return beneficiarios;
}

/** La pantalla «Anticipos»: filtros (con la fecha de corte), página y recarga cuando cambian. */
export function usarAnticipos() {
  const filtros = reactive(filtrosInicialesDeAnticipos());
  const pagina = ref(1);
  const { anticipos, total, totalPorJustificar, cargando, cargar } = usarPeticionDeAnticipos(() =>
    consultaDeAnticipos(filtros, pagina.value),
  );

  alDejarDeEscribir(filtros, () => (pagina.value === 1 ? cargar() : (pagina.value = 1)));
  watch(pagina, cargar);
  onMounted(cargar);

  return {
    anticipos,
    total,
    totalPorJustificar,
    pagina,
    cargando,
    filtros,
    beneficiarios: usarBeneficiariosParaFiltrar(),
    recargar: cargar,
    hoy: computed(() => fechaDeHoy()),
    paginas: computed(() => paginasEnTotal(total.value, ANTICIPOS_POR_PAGINA)),
    limite: ANTICIPOS_POR_PAGINA,
    quitarFiltros: () => Object.assign(filtros, filtrosInicialesDeAnticipos()),
  };
}
