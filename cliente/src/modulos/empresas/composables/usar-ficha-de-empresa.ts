import { computed, watch } from 'vue';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiDatosDeEmpresa, type CargaInicial } from '../servicios/datos-de-empresa.api';
import { detallesDeCargaInicial, detallesDeEmpresa } from './detalles-de-empresa';
import { usarEmpresas } from './usar-empresas';

/** La ficha de una empresa: sus datos, la fecha de inicio y la ventana de edición, que es la misma de la lista. */
export function usarFichaDeEmpresa(empresaId: string) {
  const pantalla = usarEmpresas();
  const { datos: cargaDeLaFicha, cargar: recargarCarga } = usarCarga<CargaInicial | null>(
    () => apiDatosDeEmpresa.obtenerCargaInicial(empresaId),
    null,
    'No se pudo cargar la carga inicial de la empresa.',
  );
  // Al cerrar la ventana de edición la fecha o el estado de la carga pudieron cambiar.
  watch(
    () => pantalla.edicion.value.abierta,
    (abierta) => {
      if (!abierta) void recargarCarga();
    },
  );
  const empresa = computed(() => pantalla.empresas.value.find(({ id }) => id === empresaId) ?? null);
  const detalles = computed(() => [
    ...(empresa.value ? detallesDeEmpresa(empresa.value) : []),
    ...(cargaDeLaFicha.value ? detallesDeCargaInicial(cargaDeLaFicha.value) : []),
  ]);
  return { ...pantalla, empresa, detalles };
}
