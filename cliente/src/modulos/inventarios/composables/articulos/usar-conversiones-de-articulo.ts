import { ref, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiArticulos, type ConversionDeArticulo } from '../../servicios/articulos.api';
import { apiUnidades, type Unidad } from '../../servicios/unidades.api';
import {
  agregarFila,
  datosDeConversiones,
  edicionDeConversiones,
  marcarParaCompras,
  quitarFila,
  unidadesDisponibles,
  type EdicionDeConversiones,
} from './edicion-de-conversiones';

const SIN_CONVERSIONES: ConversionDeArticulo[] = [];

/** Las filas de la ventana: agregar, quitar, marcar la de compras y qué unidades ofrece cada una. */
function usarFilasDeConversiones(edicion: Ref<EdicionDeConversiones>, unidades: Ref<Unidad[]>) {
  return {
    agregar: () => agregarFila(edicion.value),
    quitar: (indice: number) => quitarFila(edicion.value, indice),
    marcarParaCompras: (indice: number) => marcarParaCompras(edicion.value, indice),
    disponibles: (indice: number) => unidadesDisponibles(unidades.value, edicion.value, indice),
  };
}

interface Origen {
  articuloId: string;
  unidadBaseId: Ref<string | undefined>;
  conversiones: Ref<ConversionDeArticulo[]>;
}

/** La ventana de conversiones: abrirla con lo que ya tiene el artículo y guardar lo escrito. */
function usarVentanaDeConversiones({ articuloId, unidadBaseId, conversiones }: Origen, recargar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const edicion = ref<EdicionDeConversiones>({ abierta: false, filas: [] });
  const unidades = ref<Unidad[]>([]);

  /** Las unidades se piden al abrir: quien solo mira las conversiones no necesita ver el catálogo. */
  async function abrir(): Promise<void> {
    try {
      unidades.value = (await apiUnidades.listar()).filter((unidad) => unidad.id !== unidadBaseId.value);
    } catch {
      avisos.error('No se pudieron cargar las unidades de medida.');
      return;
    }
    errores.value = {};
    edicion.value = edicionDeConversiones(conversiones.value);
  }

  async function guardar(): Promise<void> {
    const datos = datosDeConversiones(edicion.value);
    if (!(await enviar(() => apiArticulos.reemplazarConversiones(articuloId, datos)))) return;
    avisos.exito('Conversiones actualizadas.');
    edicion.value.abierta = false;
    await recargar();
  }

  return { edicion, enviando, errores, abrir, guardar, ...usarFilasDeConversiones(edicion, unidades) };
}

/** Las conversiones del artículo («caja de 24») y la ventana para cambiarlas. */
export function usarConversionesDeArticulo(articuloId: string, unidadBaseId: Ref<string | undefined>) {
  const { datos: conversiones, cargar } = usarCarga(
    () => apiArticulos.conversiones(articuloId),
    SIN_CONVERSIONES,
    'No se pudieron cargar las conversiones.',
  );
  return { conversiones, ...usarVentanaDeConversiones({ articuloId, unidadBaseId, conversiones }, cargar) };
}
