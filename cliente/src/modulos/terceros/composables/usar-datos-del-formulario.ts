import { onMounted, ref } from 'vue';
import { usarGeografia } from '@/modulos/core/composables/usar-geografia';
import { apiTerceros, type CategoriaProveedor, type DatosContacto, type FichaTercero } from '../servicios/terceros.api';
import { datosDeLaFicha, datosVacios, papelesVacios } from './datos-de-tercero';

/** Lo que el formulario completo muestra y edita; al editar, lo llena con la ficha. */
export function usarDatosDelFormulario(terceroId: string | null) {
  const datos = ref(datosVacios());
  const papeles = ref(papelesVacios());
  const contactos = ref<DatosContacto[]>([]);
  const categorias = ref<CategoriaProveedor[]>([]);
  const nombreActual = ref('');

  function llenarConLaFicha(ficha: FichaTercero): void {
    datos.value = datosDeLaFicha(ficha);
    nombreActual.value = ficha.nombreMostrar;
    if (ficha.cliente) papeles.value.cliente = { ...ficha.cliente };
    if (ficha.proveedor) papeles.value.proveedor = { ...ficha.proveedor };
  }

  onMounted(async () => {
    categorias.value = await apiTerceros.listarCategoriasProveedor().catch(() => []);
    if (terceroId) llenarConLaFicha(await apiTerceros.obtener(terceroId));
  });

  return { datos, papeles, contactos, categorias, nombreActual, ...usarGeografia(datos) };
}

export type DatosDelFormulario = ReturnType<typeof usarDatosDelFormulario>;
