import { computed, onMounted, ref, watch, type Ref } from 'vue';
import { useRouter } from 'vue-router';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { apiReposiciones } from '../../servicios/reposiciones.api';
import type { Comprobante } from '../../servicios/tipos-de-comprobantes';
import type { Reposicion, SolicitudDeReposicion } from '../../servicios/tipos-de-reposiciones';
import { edicionDeEntrega, type EdicionDeEntrega } from '../fondos/edicion-de-fondo';
import { usarCatalogosDelFondo } from '../fondos/usar-catalogos-del-fondo';
import {
  cuerpoDeReposicion,
  faltantesDeLaReposicion,
  idsPorOmision,
  resumenDeReposicion,
} from './edicion-de-reposicion';

/** Lo que se avisa al terminar: el éxito con el enlace para imprimir, y los avisos que no bloquean. */
function avisarDelResultado(reposicion: Reposicion): void {
  const avisos = usarAvisos();
  avisos.exito(`Reposición ${reposicion.numero} registrada por ${formatearMonto(reposicion.monto)}.`, {
    texto: 'Imprimir la reposición',
    ruta: { name: 'caja-chica.reposiciones.imprimir', params: { id: reposicion.id } },
  });
  reposicion.avisos.forEach((aviso) => avisos.info(aviso));
}

/** Los comprobantes marcados: todos por omisión en cuanto llega lo pendiente. */
function usarSeleccion(pendientes: Ref<Comprobante[]>) {
  const elegidos = ref<string[]>([]);
  watch(pendientes, (lista) => (elegidos.value = idsPorOmision(lista)));
  const alternar = (id: string): void => {
    elegidos.value = elegidos.value.includes(id) ? elegidos.value.filter((x) => x !== id) : [...elegidos.value, id];
  };
  const alternarTodos = (): void => {
    elegidos.value = elegidos.value.length === pendientes.value.length ? [] : idsPorOmision(pendientes.value);
  };
  return { elegidos, alternar, alternarTodos };
}

/** Valida, envía y, si salió bien, avisa y vuelve a la ficha del fondo. */
function usarEnvio(fondoId: string, datos: { edicion: Ref<EdicionDeEntrega>; elegidos: Ref<string[]> }) {
  const router = useRouter();
  const { enviando, errores, enviar } = usarFormulario();

  async function reponer(custodio: string | null): Promise<void> {
    const { edicion, elegidos } = datos;
    errores.value = faltantesDeLaReposicion(edicion.value, elegidos.value);
    if (Object.keys(errores.value).length > 0) return;
    let hecha: Reposicion | undefined;
    const bien = await enviar(async () => {
      hecha = await apiReposiciones.registrar(fondoId, cuerpoDeReposicion(edicion.value, elegidos.value, custodio));
    });
    if (!bien || !hecha) return;
    avisarDelResultado(hecha);
    await router.push({ name: 'caja-chica.fondos.ficha', params: { id: fondoId } });
  }
  return { enviando, errores, reponer };
}

/**
 * Reponer un fondo: trae lo pendiente (todo marcado por omisión), deja desmarcar lo que no se repone y pide cómo sale el
 * dinero. Al terminar vuelve a la ficha del fondo con el enlace para imprimir la reposición.
 */
export function usarReposicion(fondoId: string) {
  const catalogos = usarCatalogosDelFondo();
  const solicitud = usarCarga(
    () => apiReposiciones.solicitud(fondoId),
    null as SolicitudDeReposicion | null,
    'No se pudo cargar lo pendiente del fondo.',
  );
  const edicion = ref(edicionDeEntrega());
  const pendientes = computed(() => solicitud.datos.value?.pendientes ?? []);
  const seleccion = usarSeleccion(pendientes);
  const envio = usarEnvio(fondoId, { edicion, elegidos: seleccion.elegidos });
  onMounted(catalogos.cargar);

  return {
    ...seleccion,
    solicitud: solicitud.datos,
    cargando: solicitud.cargando,
    catalogos,
    edicion,
    pendientes,
    resumen: computed(() => resumenDeReposicion(pendientes.value, seleccion.elegidos.value)),
    errores: envio.errores,
    enviando: envio.enviando,
    reponer: () => envio.reponer(solicitud.datos.value?.custodio ?? null),
  };
}
