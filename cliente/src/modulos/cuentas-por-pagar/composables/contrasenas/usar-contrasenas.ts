import { computed, onMounted, reactive, ref, watch } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { alDejarDeEscribir } from '@/modulos/core/composables/al-dejar-de-escribir';
import { apiContrasenas, type ConsultaDeContrasenas, type ContrasenaResumen } from '../../servicios/contrasenas.api';
import { paginasEnTotal } from '../filtros-de-documentos';
import { usarProveedoresDelFiltro } from '../usar-lista-de-documentos';
import { consultaDeContrasenas, CONTRASENAS_POR_PAGINA, filtrosInicialesDeContrasenas } from './filtros-de-contrasenas';

/** Pide la página de contraseñas; si llegan dos respuestas, solo vale la de la última petición. */
function usarPeticionDeContrasenas(construirConsulta: () => ConsultaDeContrasenas) {
  const avisos = usarAvisos();
  const contrasenas = ref<ContrasenaResumen[]>([]);
  const total = ref(0);
  const cargando = ref(true);
  let ultimaPeticion = 0;

  async function cargar(): Promise<void> {
    const peticion = ++ultimaPeticion;
    cargando.value = true;
    try {
      const respuesta = await apiContrasenas.listar(construirConsulta());
      if (peticion !== ultimaPeticion) return;
      contrasenas.value = respuesta.elementos;
      total.value = respuesta.total;
    } catch (error) {
      if (peticion !== ultimaPeticion) return;
      avisos.error(error instanceof Error ? error.message : 'No se pudo cargar la lista de contraseñas.');
    }
    cargando.value = false;
  }

  return { contrasenas, total, cargando, cargar };
}

/** La pantalla «Contraseñas»: filtros, página y recarga cuando cambian. */
export function usarContrasenas() {
  const filtros = reactive(filtrosInicialesDeContrasenas());
  const pagina = ref(1);
  const { contrasenas, total, cargando, cargar } = usarPeticionDeContrasenas(() =>
    consultaDeContrasenas(filtros, pagina.value),
  );

  // Cambiar un filtro vuelve a la primera página; si ya estaba en ella, recarga directo.
  alDejarDeEscribir(filtros, () => (pagina.value === 1 ? cargar() : (pagina.value = 1)));
  watch(pagina, cargar);
  onMounted(cargar);

  return {
    contrasenas,
    total,
    pagina,
    cargando,
    filtros,
    proveedores: usarProveedoresDelFiltro(),
    paginas: computed(() => paginasEnTotal(total.value, CONTRASENAS_POR_PAGINA)),
    limite: CONTRASENAS_POR_PAGINA,
    quitarFiltros: () => Object.assign(filtros, filtrosInicialesDeContrasenas()),
  };
}
