import { computed } from 'vue';
import { detallesDeEmpresa } from './detalles-de-empresa';
import { usarEmpresas } from './usar-empresas';

/** La ficha de una empresa: sus datos y la ventana de edición, que es la misma de la lista. */
export function usarFichaDeEmpresa(empresaId: string) {
  const pantalla = usarEmpresas();
  const empresa = computed(() => pantalla.empresas.value.find(({ id }) => id === empresaId) ?? null);
  const detalles = computed(() => (empresa.value ? detallesDeEmpresa(empresa.value) : []));
  return { ...pantalla, empresa, detalles };
}
