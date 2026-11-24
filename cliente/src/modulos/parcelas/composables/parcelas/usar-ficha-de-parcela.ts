import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiParcelas, type FichaDeParcela, type NodoDeParcela, type Parcela } from '../../servicios/parcelas.api';
import { usarMedicionesDeParcela } from '../mediciones/usar-mediciones-de-parcela';
import { usarAjustesDeSuperficie } from '../superficie/usar-ajustes-de-superficie';
import { sumasDeSubparcelas } from './arbol-de-parcelas';
import { usarBajaDeParcela } from './usar-baja-de-parcela';

/** Las pestañas de la ficha: los datos, las mediciones y los inmuebles que abarca. */
export const PESTANAS_DE_PARCELA = [
  { clave: 'datos', texto: 'Datos' },
  { clave: 'mediciones', texto: 'Mediciones' },
  { clave: 'inmuebles', texto: 'Inmuebles' },
] as const;
export type PestanaDeParcela = (typeof PESTANAS_DE_PARCELA)[number]['clave'];

/** Los datos de la ficha y sus subparcelas, que se vuelven a leer juntos. */
function usarDatosDeLaFicha(parcelaId: string) {
  const ficha = usarCarga(
    () => apiParcelas.obtener(parcelaId),
    null as FichaDeParcela | null,
    'No se pudo cargar la parcela.',
  );
  const hijas = usarCarga(
    () => apiParcelas.listar({ parcelaMadreId: parcelaId }),
    [] as Parcela[],
    'No se pudieron cargar las subparcelas.',
  );
  // El árbol activo de su localidad, completo: de ahí salen las sumas de las subparcelas a toda profundidad.
  const arbol = usarCarga(
    async () => {
      const localidadId = ficha.datos.value?.localidadId ?? (await apiParcelas.obtener(parcelaId)).localidadId;
      return apiParcelas.arbol({ localidadId, texto: '', soloActivas: true });
    },
    [] as NodoDeParcela[],
    'No se pudo calcular la superficie de las subparcelas.',
  );
  const recargar = async () => {
    await Promise.all([ficha.cargar(), hijas.cargar(), arbol.cargar()]);
  };
  const sumas = computed(() => sumasDeSubparcelas(arbol.datos.value));
  return { registro: ficha.datos, cargando: ficha.cargando, subparcelas: hijas.datos, sumas, recargar };
}

/** Las acciones que llevan a otra pantalla: editar la parcela o agregarle una subparcela. */
function usarNavegacionDeLaFicha(parcelaId: string, localidadId: () => string | undefined) {
  const router = useRouter();
  return {
    editar: () => router.push({ name: 'parcelas.parcelas.editar', params: { parcelaId } }),
    nuevaSubparcela: () =>
      router.push({ name: 'parcelas.parcelas.nueva', query: { localidad: localidadId(), madre: parcelaId } }),
  };
}

/** La ficha de la parcela: sus datos, sus subparcelas, lo que se hace con ella y sus mediciones. */
export function usarFichaDeParcela(parcelaId: string) {
  const { mostrar } = usarAjustesDeSuperficie();
  const datos = usarDatosDeLaFicha(parcelaId);
  return {
    ...datos,
    mostrar,
    pestana: ref<PestanaDeParcela>('datos'),
    ...usarNavegacionDeLaFicha(parcelaId, () => datos.registro.value?.localidadId),
    mediciones: usarMedicionesDeParcela(parcelaId, datos.recargar),
    ...usarBajaDeParcela(datos.registro, datos.recargar),
  };
}
