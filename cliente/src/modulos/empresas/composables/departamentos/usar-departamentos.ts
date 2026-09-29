import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarIntercambio } from '@/modulos/core/composables/intercambio/usar-intercambio';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiDepartamentos, type Departamento } from '../../servicios/departamentos.api';
import { datosDeDepartamento, edicionDe, type EdicionDeDepartamento } from './edicion-de-departamento';
import { usarReferenciasDeDepartamento } from './referencias-de-departamento';

const SIN_REGISTROS: Departamento[] = [];

const guardarDepartamento = (edicion: EdicionDeDepartamento) =>
  edicion.id
    ? apiDepartamentos.actualizar(edicion.id, datosDeDepartamento(edicion))
    : apiDepartamentos.crear(datosDeDepartamento(edicion));

/** La ventana de los departamentos: abrirla y guardar lo escrito, avisando y recargando la lista. */
function usarVentanaDeDepartamentos(cargar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const edicion = ref<EdicionDeDepartamento>({ ...edicionDe(), abierta: false });

  function abrir(departamento?: Departamento): void {
    edicion.value = edicionDe(departamento);
    errores.value = {};
  }

  async function guardar(): Promise<void> {
    const esNuevo = edicion.value.id === null;
    if (!(await enviar(() => guardarDepartamento(edicion.value)))) return;
    avisos.exito(esNuevo ? 'Departamento registrado.' : 'Departamento actualizado.');
    edicion.value.abierta = false;
    await cargar();
  }

  return { edicion, enviando, errores, abrir, guardar };
}

/** Los departamentos de la empresa: listarlos, registrarlos y editarlos en una ventana. */
export function usarDepartamentos() {
  const {
    datos: registros,
    cargando,
    cargar,
  } = usarCarga(() => apiDepartamentos.listar(), SIN_REGISTROS, 'No se pudieron cargar los departamentos.');
  const referencias = usarReferenciasDeDepartamento();
  const ventana = usarVentanaDeDepartamentos(cargar);

  const intercambio = usarIntercambio(apiDepartamentos.intercambio, cargar);

  return { registros, cargando, cargar, intercambio, referencias, ...ventana };
}
