import { watch, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiArticulos, type DatosArticulo, type Articulo } from '../../servicios/articulos.api';
import type { Categoria } from '../../servicios/categorias.api';
import { datosDeArticulo, edicionDe, type EdicionDeArticulo } from './edicion-de-articulo';
import { usarReferenciasDeArticulo } from './referencias-de-articulo';
import { aplicarManejaLotes, aplicarManejaVencimiento, tipoPropuestoPor } from './reglas-de-articulo';

const guardarArticulo = (id: string | null, datos: DatosArticulo) =>
  id ? apiArticulos.actualizar(id, datos) : apiArticulos.crear(datos);

/** El artículo nuevo con el código que propone la empresa (prefijo y correlativo); si no se puede, queda para escribirlo. */
async function conCodigoPropuesto(edicion: EdicionDeArticulo): Promise<EdicionDeArticulo> {
  try {
    return { ...edicion, codigo: (await apiArticulos.codigoPropuesto()).codigo };
  } catch {
    return edicion;
  }
}

/** Mantiene al día lo que depende de otra cosa: lotes y vencimiento, y el tipo que propone la categoría. */
function usarReglasDelFormulario(
  edicion: Ref<EdicionDeArticulo>,
  categorias: Ref<Categoria[]>,
  esNuevo: boolean,
): void {
  watch(
    () => edicion.value.manejaLotes,
    () => aplicarManejaLotes(edicion.value),
  );
  watch(
    () => edicion.value.manejaVencimiento,
    () => aplicarManejaVencimiento(edicion.value),
  );
  watch(
    () => edicion.value.categoriaId,
    (categoriaId) => {
      if (!esNuevo) return;
      edicion.value.tipoDeInventario = tipoPropuestoPor(categorias.value, categoriaId, edicion.value.tipoDeInventario);
    },
  );
}

/** Registrar un artículo o editarlo en página completa; sin id es nuevo. */
export function usarFormularioDeArticulo(articuloId: string | null) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const { datos: edicion, cargando } = usarCarga(
    async () => {
      if (articuloId) return edicionDe(await apiArticulos.obtener(articuloId));
      return conCodigoPropuesto(edicionDe());
    },
    edicionDe(),
    'No se pudo cargar el artículo.',
  );
  const { opciones: referencias, categorias } = usarReferenciasDeArticulo();
  usarReglasDelFormulario(edicion, categorias, articuloId === null);

  /** @returns El artículo guardado, o `null` si el servidor no lo aceptó. */
  async function guardar(): Promise<Articulo | null> {
    let guardado: Articulo | null = null;
    const aceptado = await enviar(async () => {
      guardado = await guardarArticulo(articuloId, datosDeArticulo(edicion.value));
    });
    if (aceptado) avisos.exito(articuloId ? 'Artículo actualizado.' : 'Artículo registrado.');
    return guardado;
  }

  return { edicion, cargando, enviando, errores, referencias, guardar };
}
