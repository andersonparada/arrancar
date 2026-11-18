import { computed, onMounted, reactive, ref, watch } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { alDejarDeEscribir } from '@/modulos/core/composables/al-dejar-de-escribir';
import { apiPagos, type ConsultaDePagos, type PagoResumen } from '../../servicios/pagos.api';
import { paginasEnTotal } from '../filtros-de-documentos';
import { usarProveedoresDelFiltro } from '../usar-lista-de-documentos';
import { consultaDePagos, filtrosInicialesDePagos, PAGOS_POR_PAGINA } from './lista-de-pagos';

/** Pide la página de pagos; si llegan dos respuestas, solo vale la de la última petición. */
function usarPeticionDePagos(construirConsulta: () => ConsultaDePagos) {
  const avisos = usarAvisos();
  const pagos = ref<PagoResumen[]>([]);
  const total = ref(0);
  const cargando = ref(true);
  let ultimaPeticion = 0;

  async function cargar(): Promise<void> {
    const peticion = ++ultimaPeticion;
    cargando.value = true;
    try {
      const respuesta = await apiPagos.listar(construirConsulta());
      if (peticion !== ultimaPeticion) return;
      pagos.value = respuesta.elementos;
      total.value = respuesta.total;
    } catch (error) {
      if (peticion !== ultimaPeticion) return;
      avisos.error(error instanceof Error ? error.message : 'No se pudo cargar la lista de pagos.');
    }
    if (peticion === ultimaPeticion) cargando.value = false;
  }

  return { pagos, total, cargando, cargar };
}

/** Las cuentas bancarias para el filtro; sin permiso de ver pagos no se piden. */
function usarCuentasDelFiltro() {
  const cuentas = ref<{ valor: string; texto: string }[]>([]);
  onMounted(async () => {
    try {
      const medios = await apiPagos.medios();
      const todas = medios.cuentas.map(({ cuentaBancariaId, nombre }) => ({ valor: cuentaBancariaId, texto: nombre }));
      todas.sort((a, b) => a.texto.localeCompare(b.texto, 'es', { sensitivity: 'base' }));
      cuentas.value = [{ valor: '', texto: 'Todas las cuentas' }, ...todas];
    } catch {
      // El filtro por cuenta es un extra: la lista funciona sin él.
    }
  });
  return cuentas;
}

/** La pantalla «Pagos»: filtros, página y recarga cuando cambian. */
export function usarPagos() {
  const filtros = reactive(filtrosInicialesDePagos());
  const pagina = ref(1);
  const { pagos, total, cargando, cargar } = usarPeticionDePagos(() => consultaDePagos(filtros, pagina.value));

  alDejarDeEscribir(filtros, () => (pagina.value === 1 ? cargar() : (pagina.value = 1)));
  watch(pagina, cargar);
  onMounted(cargar);

  const sesion = usarSesion();
  return {
    pagos,
    total,
    pagina,
    cargando,
    filtros,
    proveedores: usarProveedoresDelFiltro(),
    cuentas: usarCuentasDelFiltro(),
    puedeNuevo: computed(() => sesion.puede('cuentas-por-pagar.pagos.emitir')),
    paginas: computed(() => paginasEnTotal(total.value, PAGOS_POR_PAGINA)),
    limite: PAGOS_POR_PAGINA,
    quitarFiltros: () => Object.assign(filtros, filtrosInicialesDePagos()),
  };
}
