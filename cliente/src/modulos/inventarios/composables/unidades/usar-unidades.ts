import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarIntercambio } from '@/modulos/core/composables/intercambio/usar-intercambio';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { textosDeCatalogo } from '../compartido/textos-de-catalogo';
import { usarAccionesDeCatalogo } from '../compartido/usar-acciones-de-catalogo';
import { apiUnidades, type Unidad } from '../../servicios/unidades.api';
import { datosDeUnidad, edicionDe, type EdicionDeUnidad } from './edicion-de-unidad';

const SIN_REGISTROS: Unidad[] = [];

const ACCIONES = {
  textos: textosDeCatalogo({
    nombre: 'unidad de medida',
    femenino: true,
    alInactivar: 'Dejará de ofrecerse al registrar artículos, pero los que ya la usan se conservan.',
    sePuedeEliminar: 'si ningún artículo la tiene de unidad base ni en sus conversiones',
  }),
  nombreDe: (unidad: Unidad) => unidad.nombre,
  cambiarActivo: (unidad: Unidad, activo: boolean) =>
    apiUnidades.actualizar(unidad.id, datosDeUnidad({ ...edicionDe(unidad), activo })),
  eliminar: (unidad: Unidad) => apiUnidades.eliminar(unidad.id),
};

const guardarUnidad = (edicion: EdicionDeUnidad) =>
  edicion.id ? apiUnidades.actualizar(edicion.id, datosDeUnidad(edicion)) : apiUnidades.crear(datosDeUnidad(edicion));

/** La ventana de las unidades de medida: abrirla y guardar lo escrito, avisando y recargando la lista. */
function usarVentanaDeUnidades(cargar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const edicion = ref<EdicionDeUnidad>({ ...edicionDe(), abierta: false });

  function abrir(unidad?: Unidad): void {
    edicion.value = edicionDe(unidad);
    errores.value = {};
  }

  async function guardar(): Promise<void> {
    const esNuevo = edicion.value.id === null;
    if (!(await enviar(() => guardarUnidad(edicion.value)))) return;
    avisos.exito(esNuevo ? 'Unidad de medida registrada.' : 'Unidad de medida actualizada.');
    edicion.value.abierta = false;
    await cargar();
  }

  return { edicion, enviando, errores, abrir, guardar };
}

/** Las unidades de medida de la empresa: listarlas, registrarlas, editarlas, inactivarlas y eliminarlas. */
export function usarUnidades() {
  const {
    datos: registros,
    cargando,
    cargar,
  } = usarCarga(() => apiUnidades.listar(), SIN_REGISTROS, 'No se pudieron cargar las unidades de medida.');
  const ventana = usarVentanaDeUnidades(cargar);
  const acciones = usarAccionesDeCatalogo(ACCIONES, cargar);

  const intercambio = usarIntercambio(apiUnidades.intercambio, cargar);

  return { registros, cargando, cargar, intercambio, ...ventana, ...acciones };
}
