import { onMounted, ref, watch, type Ref } from 'vue';
import { apiGeografia, type Departamento, type Municipio } from '../servicios/geografia.api';

/** Cualquier dato que tenga ubicación en Guatemala (un cliente, una finca…). */
export interface Ubicacion {
  departamentoCodigo: string | null;
  municipioCodigo: string | null;
}

/**
 * Departamentos de Guatemala y los municipios del departamento elegido. Si se
 * cambia el departamento y el municipio ya no le pertenece, lo deja en blanco.
 */
export function usarGeografia(ubicacion: Ref<Ubicacion>) {
  const departamentos = ref<Departamento[]>([]);
  const municipios = ref<Municipio[]>([]);

  onMounted(async () => {
    departamentos.value = await apiGeografia.listarDepartamentos();
  });

  watch(
    () => ubicacion.value.departamentoCodigo,
    async (codigo) => {
      municipios.value = codigo ? await apiGeografia.listarMunicipios(codigo) : [];
      const actual = ubicacion.value.municipioCodigo;
      if (!municipios.value.some((m) => m.codigo === actual)) ubicacion.value.municipioCodigo = null;
    },
    { immediate: true },
  );

  return { departamentos, municipios };
}
