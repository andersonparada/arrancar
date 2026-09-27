import { onMounted, ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { apiTerceros, type CategoriaProveedor, type FichaTercero } from '../servicios/terceros.api';

/** La ficha de un cliente o proveedor y las categorías para mostrar la de su papel de proveedor. */
export function usarFichaDeTercero(terceroId: string) {
  const avisos = usarAvisos();
  const ficha = ref<FichaTercero | null>(null);
  const categorias = ref<CategoriaProveedor[]>([]);

  async function cargar(): Promise<void> {
    try {
      ficha.value = await apiTerceros.obtener(terceroId);
    } catch (error) {
      avisos.error(error instanceof Error ? error.message : 'No se pudo cargar la ficha.');
    }
  }

  onMounted(async () => {
    categorias.value = await apiTerceros.listarCategoriasProveedor().catch(() => []);
    await cargar();
  });

  const nombreDeCategoria = (categoriaId: string | null) =>
    categorias.value.find((categoria) => categoria.id === categoriaId)?.nombre ?? 'Sin categoría';

  return { ficha, categorias, cargar, nombreDeCategoria };
}
