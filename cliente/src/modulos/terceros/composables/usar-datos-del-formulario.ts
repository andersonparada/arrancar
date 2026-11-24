import { onMounted, ref } from 'vue';
import { usarGeografia } from '@/modulos/core/composables/usar-geografia';
import {
  apiTerceros,
  type CategoriaProveedor,
  type DatosContacto,
  type FichaTercero,
  type PapelTercero,
} from '../servicios/terceros.api';
import { datosDeLaFicha, datosVacios, papelesVacios } from './datos-de-tercero';

/** Lo que el formulario completo muestra y edita; al editar, lo llena con la ficha. */
export function usarDatosDelFormulario(terceroId: string | null) {
  const datos = ref(datosVacios());
  const papeles = ref(papelesVacios());
  const contactos = ref<DatosContacto[]>([]);
  const categorias = ref<CategoriaProveedor[]>([]);
  const nombreActual = ref('');
  /** Lo que los módulos activos aportan al formulario del papel de la pantalla; cada sección lo llena sola. */
  const secciones = ref<Record<string, unknown>>({});
  /** El cliente y el proveedor que se editan (los datos de las secciones son suyos); `null` si aún no lo son. */
  const idsPapel = ref<Record<PapelTercero, string | null>>({ cliente: null, proveedor: null });

  function llenarConLaFicha(ficha: FichaTercero): void {
    datos.value = datosDeLaFicha(ficha);
    nombreActual.value = ficha.nombreMostrar;
    if (ficha.cliente) papeles.value.cliente = { ...ficha.cliente };
    if (ficha.proveedor) papeles.value.proveedor = { ...ficha.proveedor };
    idsPapel.value = { cliente: ficha.cliente?.id ?? null, proveedor: ficha.proveedor?.id ?? null };
  }

  onMounted(async () => {
    categorias.value = await apiTerceros.listarCategoriasProveedor().catch(() => []);
    if (terceroId) llenarConLaFicha(await apiTerceros.obtener(terceroId));
  });

  return { datos, papeles, contactos, categorias, nombreActual, secciones, idsPapel, ...usarGeografia(datos) };
}

export type DatosDelFormulario = ReturnType<typeof usarDatosDelFormulario>;
