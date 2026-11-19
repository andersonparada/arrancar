import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarIntercambio } from '@/modulos/core/composables/intercambio/usar-intercambio';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { textosDeCatalogo } from '../compartido/textos-de-catalogo';
import { usarAccionesDeCatalogo } from '../compartido/usar-acciones-de-catalogo';
import { apiCategorias, type Categoria } from '../../servicios/categorias.api';
import { datosDeCategoria, edicionDe, type EdicionDeCategoria } from './edicion-de-categoria';

const SIN_REGISTROS: Categoria[] = [];

const ACCIONES = {
  textos: textosDeCatalogo({
    nombre: 'categoría',
    femenino: true,
    alInactivar: 'Dejará de ofrecerse al registrar artículos, pero los que ya la tienen se conservan.',
    sePuedeEliminar: 'si no tiene artículos',
  }),
  nombreDe: (categoria: Categoria) => categoria.nombre,
  cambiarActivo: (categoria: Categoria, activo: boolean) =>
    apiCategorias.actualizar(categoria.id, datosDeCategoria({ ...edicionDe(categoria), activo })),
  eliminar: (categoria: Categoria) => apiCategorias.eliminar(categoria.id),
};

const guardarCategoria = (edicion: EdicionDeCategoria) =>
  edicion.id
    ? apiCategorias.actualizar(edicion.id, datosDeCategoria(edicion))
    : apiCategorias.crear(datosDeCategoria(edicion));

/** La ventana de las categorías: abrirla y guardar lo escrito, avisando y recargando la lista. */
function usarVentanaDeCategorias(cargar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const edicion = ref<EdicionDeCategoria>({ ...edicionDe(), abierta: false });

  function abrir(categoria?: Categoria): void {
    edicion.value = edicionDe(categoria);
    errores.value = {};
  }

  async function guardar(): Promise<void> {
    const esNuevo = edicion.value.id === null;
    if (!(await enviar(() => guardarCategoria(edicion.value)))) return;
    avisos.exito(esNuevo ? 'Categoría registrada.' : 'Categoría actualizada.');
    edicion.value.abierta = false;
    await cargar();
  }

  return { edicion, enviando, errores, abrir, guardar };
}

/** Las categorías de la empresa: listarlos, registrarlos y editarlos en una ventana. */
export function usarCategorias() {
  const {
    datos: registros,
    cargando,
    cargar,
  } = usarCarga(() => apiCategorias.listar(), SIN_REGISTROS, 'No se pudieron cargar las categorías.');
  const ventana = usarVentanaDeCategorias(cargar);
  const acciones = usarAccionesDeCatalogo(ACCIONES, cargar);

  const intercambio = usarIntercambio(apiCategorias.intercambio, cargar);

  return { registros, cargando, cargar, intercambio, ...ventana, ...acciones };
}
