import { computed, ref, watch, type Ref } from 'vue';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiCuentasPorPagar, type Bandeja, type DocumentoPorPagar } from '../servicios/cuentas-por-pagar.api';
import { vencimientosIniciales, type VencimientosPorDocumento } from './completar-bandeja';
import { usarCompletarBandeja } from './usar-completar-bandeja';
import { usarSeleccion } from './usar-seleccion';

const PERMISO_PARA_COMPLETAR = 'cuentas-por-pagar.documentos.registrar';

/** Trae la bandeja al abrir y cada vez que se pide `recargar`. */
function usarBandejaCargada() {
  const carga = usarCarga<Bandeja>(
    () => apiCuentasPorPagar.verBandeja(),
    { elementos: [], total: 0 },
    'No se pudo cargar la bandeja.',
  );
  return {
    documentos: computed(() => carga.datos.value.elementos),
    total: computed(() => carga.datos.value.total),
    cargando: carga.cargando,
    recargar: carga.cargar,
  };
}

/** El vencimiento de cada documento (parte del propuesto al recibirlo) y los errores que se le marcan. */
function usarVencimientos(documentos: Ref<DocumentoPorPagar[]>) {
  const vencimientos = ref<VencimientosPorDocumento>({});
  const errores = ref<Record<string, string>>({});
  watch(documentos, (nuevos) => {
    vencimientos.value = vencimientosIniciales(nuevos);
    errores.value = {};
  });
  return { vencimientos, errores };
}

/** La bandeja: los pendientes, la selección y el vencimiento de cada uno, y «Completar». */
export function usarBandeja() {
  const { documentos, total, cargando, recargar } = usarBandejaCargada();
  const seleccion = usarSeleccion(computed(() => documentos.value.filter((d) => d.puedeRegistrar).map((d) => d.id)));
  const escogidos = computed(() => documentos.value.filter((d) => seleccion.seleccion.value.includes(d.id)));
  const { vencimientos, errores } = usarVencimientos(documentos);
  const alTerminar = async (): Promise<void> => {
    seleccion.limpiar();
    await recargar();
  };
  const completado = usarCompletarBandeja({ escogidos, vencimientos, errores, alTerminar });
  const puedeCompletar = usarSesion().puede(PERMISO_PARA_COMPLETAR);

  return { ...seleccion, ...completado, documentos, total, cargando, vencimientos, errores, puedeCompletar };
}
