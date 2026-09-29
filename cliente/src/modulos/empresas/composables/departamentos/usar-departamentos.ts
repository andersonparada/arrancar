import { computed, ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarIntercambio } from '@/modulos/core/composables/intercambio/usar-intercambio';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { ErrorApi } from '@/modulos/core/servicios/cliente-http';
import { apiDepartamentos, type Departamento } from '../../servicios/departamentos.api';
import { datosDeDepartamento, edicionDe, type EdicionDeDepartamento } from './edicion-de-departamento';
import { usarReferenciasDeDepartamento } from './referencias-de-departamento';
import { usarEliminacionDeDepartamento } from './usar-eliminacion-de-departamento';

const SIN_REGISTROS: Departamento[] = [];

const guardarDepartamento = (edicion: EdicionDeDepartamento) =>
  edicion.id
    ? apiDepartamentos.actualizar(edicion.id, datosDeDepartamento(edicion))
    : apiDepartamentos.crear(datosDeDepartamento(edicion));

/** Un 409 (código o nombre repetido) no es un fallo: se devuelve su mensaje para mostrarlo en la ventana. */
async function intentarGuardar(edicion: EdicionDeDepartamento): Promise<string | null> {
  try {
    await guardarDepartamento(edicion);
    return null;
  } catch (error) {
    if (error instanceof ErrorApi && error.estado === 409) return error.message;
    throw error;
  }
}

/** La ventana de los departamentos: abrirla y guardar lo escrito, avisando y recargando la lista. */
function usarVentanaDeDepartamentos(cargar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const edicion = ref<EdicionDeDepartamento>({ ...edicionDe(), abierta: false });
  const conflicto = ref('');

  function abrir(departamento?: Departamento): void {
    edicion.value = edicionDe(departamento);
    errores.value = {};
    conflicto.value = '';
  }

  async function guardar(): Promise<void> {
    const esNuevo = edicion.value.id === null;
    conflicto.value = '';
    if (!(await enviar(async () => (conflicto.value = (await intentarGuardar(edicion.value)) ?? '')))) return;
    if (conflicto.value) return;
    avisos.exito(esNuevo ? 'Departamento registrado.' : 'Departamento actualizado.');
    edicion.value.abierta = false;
    await cargar();
  }

  return { edicion, enviando, errores, conflicto, abrir, guardar };
}

/** Los departamentos de la empresa: listarlos, registrarlos, editarlos en una ventana y eliminarlos. */
export function usarDepartamentos() {
  const {
    datos: registros,
    cargando,
    cargar,
  } = usarCarga(() => apiDepartamentos.listar(), SIN_REGISTROS, 'No se pudieron cargar los departamentos.');
  const ventana = usarVentanaDeDepartamentos(cargar);
  const referencias = usarReferenciasDeDepartamento(computed(() => ventana.edicion.value.localidadId));
  const intercambio = usarIntercambio(apiDepartamentos.intercambio, cargar);
  const { eliminar } = usarEliminacionDeDepartamento(cargar);

  return { registros, cargando, cargar, intercambio, referencias, eliminar, ...ventana };
}
