import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiEmpresas, type Empresa } from '../servicios/empresas.api';
import { datosDeLaEmpresa, edicionDe, type EdicionDeEmpresa } from './edicion-de-empresa';

const guardarEmpresa = (edicion: EdicionDeEmpresa) =>
  edicion.empresaId
    ? apiEmpresas.actualizar(edicion.empresaId, datosDeLaEmpresa(edicion))
    : apiEmpresas.crear(datosDeLaEmpresa(edicion));

/** Las empresas de la cuenta: listarlas, crearlas y editarlas en una ventana. */
export function usarEmpresas() {
  const sesion = usarSesion();
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const { datos: empresas, cargar } = usarCarga(
    () => apiEmpresas.listar(),
    [] as Empresa[],
    'No se pudieron cargar las empresas.',
  );
  const edicion = ref<EdicionDeEmpresa>({ ...edicionDe(), abierta: false });

  function abrir(empresa?: Empresa): void {
    edicion.value = edicionDe(empresa);
    errores.value = {};
  }

  /** La sesión se recarga para que el selector muestre la empresa nueva o su nombre nuevo. */
  async function guardar(): Promise<void> {
    const esNueva = edicion.value.empresaId === null;
    if (!(await enviar(() => guardarEmpresa(edicion.value)))) return;
    avisos.exito(esNueva ? 'Empresa creada. Ya puede elegirla en el selector.' : 'Empresa actualizada.');
    edicion.value.abierta = false;
    await Promise.all([cargar(), sesion.cargar()]);
  }

  return { empresas, edicion, enviando, errores, abrir, guardar };
}
