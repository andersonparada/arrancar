import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarIntercambio } from '@/modulos/core/composables/intercambio/usar-intercambio';
import { apiSaldosIniciales, type SaldoInicial } from '../../servicios/saldos-iniciales.api';
import { situacionDeLaCarga } from './detalles-de-saldo-inicial';
import { usarCuadreDeSaldosIniciales } from './usar-cuadre-de-saldos-iniciales';
import { usarEliminacionDeSaldoInicial } from './usar-eliminacion-de-saldo-inicial';
import { usarFormularioDeSaldoInicial } from './usar-formulario-de-saldo-inicial';
import { usarListaDeSaldosIniciales } from './usar-lista-de-saldos-iniciales';

const SIN_PODER_CORREGIR =
  'Este saldo ya no se puede corregir aquí: está autorizado, tiene notas o pagos aplicados, o la carga está cerrada. Si está autorizado, desautorícelo primero desde Documentos por pagar.';

/** Abre la corrección del saldo que pide el enlace «Corregir en Saldos iniciales» (`?corregir=<id>`), una sola vez. */
function usarCorreccionDesdeEnlace(corregir: (saldo: SaldoInicial) => void) {
  const ruta = useRoute();
  const router = useRouter();
  const avisos = usarAvisos();
  onMounted(async () => {
    const id = ruta.query.corregir;
    if (typeof id !== 'string') return;
    await router.replace({ query: {} });
    try {
      const saldo = await apiSaldosIniciales.obtener(id);
      if (saldo.puedeCorregir) corregir(saldo);
      else avisos.error(SIN_PODER_CORREGIR);
    } catch (error) {
      avisos.error(error instanceof Error ? error.message : 'No se pudo abrir el saldo inicial.');
    }
  });
}

/** La pantalla «Saldos iniciales»: la lista, la ventana de cargar o corregir, eliminar, el Excel y el cuadre. */
export function usarSaldosIniciales() {
  const lista = usarListaDeSaldosIniciales();
  const cuadre = usarCuadreDeSaldosIniciales();
  const recargar = async (): Promise<void> => void (await Promise.all([lista.cargar(), cuadre.cargar()]));
  const formulario = usarFormularioDeSaldoInicial(recargar);
  const eliminacion = usarEliminacionDeSaldoInicial(recargar);
  const intercambio = usarIntercambio(apiSaldosIniciales.intercambio, recargar);
  const intercambioDelCuadre = usarIntercambio(apiSaldosIniciales.intercambioDelCuadre, recargar);
  usarCorreccionDesdeEnlace(formulario.corregir);

  const situacion = computed(() => (lista.carga.value ? situacionDeLaCarga(lista.carga.value) : null));
  return { ...lista, cuadre, situacion, formulario, eliminacion, intercambio, intercambioDelCuadre };
}
