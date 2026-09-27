import { onMounted, reactive, ref } from 'vue';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiTerceros, type CategoriaProveedor } from '../servicios/terceros.api';

interface EdicionDeCategoria {
  abierta: boolean;
  id: string | null;
  nombre: string;
  activo: boolean;
}

function edicionDe(existente?: CategoriaProveedor): EdicionDeCategoria {
  return {
    abierta: true,
    id: existente?.id ?? null,
    nombre: existente?.nombre ?? '',
    activo: existente?.activo ?? true,
  };
}

function guardarCategoria({ id, nombre, activo }: EdicionDeCategoria) {
  return id
    ? apiTerceros.cambiarCategoriaProveedor(id, { nombre, activo })
    : apiTerceros.crearCategoriaProveedor(nombre);
}

/** Las categorías de proveedor de la cuenta: crearlas, renombrarlas y activarlas o no. */
export function usarCategoriasDeProveedor() {
  const { enviando, errores, enviar } = usarFormulario();
  const categorias = ref<CategoriaProveedor[]>([]);
  const edicion = reactive<EdicionDeCategoria>({ abierta: false, id: null, nombre: '', activo: true });

  const cargar = async () => (categorias.value = await apiTerceros.listarCategoriasProveedor());
  const abrir = (existente?: CategoriaProveedor) => Object.assign(edicion, edicionDe(existente));

  async function guardar(): Promise<void> {
    if (!(await enviar(() => guardarCategoria(edicion)))) return;
    edicion.abierta = false;
    await cargar();
  }

  onMounted(cargar);
  return { categorias, edicion, enviando, errores, abrir, guardar };
}
