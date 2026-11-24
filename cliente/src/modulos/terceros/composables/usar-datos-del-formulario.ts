import { onMounted, ref } from 'vue';
import { usarGeografia } from '@/modulos/core/composables/usar-geografia';
import { apiTerceros, type CategoriaProveedor, type DatosContacto, type FichaTercero } from '../servicios/terceros.api';
import { datosDeLaFicha, datosVacios, papelesVacios } from './datos-de-tercero';

/** Los papeles que la ficha ya tiene, para editarlos. */
const papelesDeLaFicha = (ficha: FichaTercero) => ({
  ...(ficha.cliente ? { cliente: { ...ficha.cliente } } : {}),
  ...(ficha.proveedor ? { proveedor: { ...ficha.proveedor } } : {}),
});

/** Lo que los módulos activos aportan al formulario y el cliente o proveedor al que pertenecen sus datos. */
function usarRegistrosDeLasSecciones() {
  /** Cada sección se llena sola y lo que escribe viaja con el formulario. */
  const secciones = ref<Record<string, unknown>>({});
  /** El proveedor y el cliente que se editan (los datos de las secciones son suyos); `null` si aún no lo son. */
  const proveedorId = ref<string | null>(null);
  const clienteId = ref<string | null>(null);

  function alLlenar(ficha: FichaTercero): void {
    proveedorId.value = ficha.proveedor?.id ?? null;
    clienteId.value = ficha.cliente?.id ?? null;
  }

  return { secciones, proveedorId, clienteId, alLlenar };
}

/** Lo que el formulario completo muestra y edita; al editar, lo llena con la ficha. */
export function usarDatosDelFormulario(terceroId: string | null) {
  const datos = ref(datosVacios());
  const papeles = ref(papelesVacios());
  const contactos = ref<DatosContacto[]>([]);
  const categorias = ref<CategoriaProveedor[]>([]);
  const nombreActual = ref('');
  const { alLlenar, ...registros } = usarRegistrosDeLasSecciones();

  function llenarConLaFicha(ficha: FichaTercero): void {
    datos.value = datosDeLaFicha(ficha);
    nombreActual.value = ficha.nombreMostrar;
    papeles.value = { ...papeles.value, ...papelesDeLaFicha(ficha) };
    alLlenar(ficha);
  }

  onMounted(async () => {
    categorias.value = await apiTerceros.listarCategoriasProveedor().catch(() => []);
    if (terceroId) llenarConLaFicha(await apiTerceros.obtener(terceroId));
  });

  return { datos, papeles, contactos, categorias, nombreActual, ...registros, ...usarGeografia(datos) };
}

export type DatosDelFormulario = ReturnType<typeof usarDatosDelFormulario>;
