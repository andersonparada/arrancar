import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiArticulos, type Lote } from '../../servicios/articulos.api';
import { datosDeLote, edicionDeLoteNuevo, type EdicionDeLote } from './edicion-de-lote';

const SIN_LOTES: Lote[] = [];

/** Los lotes del artículo y la ventana para registrar uno. */
export function usarLotesDeArticulo(articuloId: string) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const {
    datos: lotes,
    cargando,
    cargar,
  } = usarCarga(() => apiArticulos.lotes(articuloId), SIN_LOTES, 'No se pudieron cargar los lotes.');
  const edicion = ref<EdicionDeLote>({ ...edicionDeLoteNuevo(), abierta: false });

  function abrir(): void {
    edicion.value = edicionDeLoteNuevo();
    errores.value = {};
  }

  async function guardar(): Promise<void> {
    const datos = datosDeLote(edicion.value);
    if (!(await enviar(() => apiArticulos.crearLote(articuloId, datos)))) return;
    avisos.exito('Lote registrado.');
    edicion.value.abierta = false;
    await cargar();
  }

  return { lotes, cargando, edicion, enviando, errores, abrir, guardar };
}
