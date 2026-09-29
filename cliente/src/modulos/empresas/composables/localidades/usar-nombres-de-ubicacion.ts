import { ref, watch, type Ref } from 'vue';
import { apiGeografia } from '@/modulos/core/servicios/geografia.api';
import { llaveDeMunicipio, type NombresDeUbicacion } from './detalles-de-localidad';

async function traerDepartamentos(nombres: Ref<NombresDeUbicacion>): Promise<void> {
  const lista = await apiGeografia.listarDepartamentos();
  nombres.value.departamentos = Object.fromEntries(lista.map((d) => [d.codigo, d.nombre]));
}

async function traerMunicipios(nombres: Ref<NombresDeUbicacion>, departamento: string): Promise<void> {
  const lista = await apiGeografia.listarMunicipios(departamento);
  for (const m of lista) nombres.value.municipios[llaveDeMunicipio(departamento, m.codigo)] = m.nombre;
}

/**
 * Los nombres de departamento y municipio de Guatemala para las localidades que se
 * muestran (la API guarda solo el código). Trae cada departamento y sus municipios una vez.
 */
export function usarNombresDeUbicacion(localidades: Ref<{ departamentoCodigo: string | null }[]>) {
  const nombres = ref<NombresDeUbicacion>({ departamentos: {}, municipios: {} });
  const pedidos = new Set<string>();

  const pedir = (llave: string, traer: () => Promise<void>): void => {
    if (pedidos.has(llave)) return;
    pedidos.add(llave);
    traer().catch(() => pedidos.delete(llave));
  };

  watch(
    localidades,
    (registros) => {
      pedir('*', () => traerDepartamentos(nombres));
      for (const r of registros) {
        const codigo = r.departamentoCodigo;
        if (codigo) pedir(codigo, () => traerMunicipios(nombres, codigo));
      }
    },
    { immediate: true },
  );

  return nombres;
}
