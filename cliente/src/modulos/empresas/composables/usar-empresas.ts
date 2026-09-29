import { ref, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiEmpresas, type Empresa } from '../servicios/empresas.api';
import { datosDeLaEmpresa, edicionDe, type EdicionDeEmpresa } from './edicion-de-empresa';
import { usarCierreDeCarga } from './usar-cierre-de-carga';
import { usarDatosDeEmpresa } from './usar-datos-de-empresa';
import { usarReaperturaDeCarga } from './usar-reapertura-de-carga';

const guardarEmpresa = (edicion: EdicionDeEmpresa) =>
  edicion.empresaId
    ? apiEmpresas.actualizar(edicion.empresaId, datosDeLaEmpresa(edicion))
    : apiEmpresas.crear(datosDeLaEmpresa(edicion));

const listarEmpresas = () =>
  usarCarga(() => apiEmpresas.listar(), [] as Empresa[], 'No se pudieron cargar las empresas.');

interface FormularioDeEmpresa {
  edicion: Ref<EdicionDeEmpresa>;
  guardarDatos: (empresaId: string) => Promise<void>;
  recargar: () => Promise<void>;
}

/** Abrir la ventana y guardar: la empresa y, si ya existía, sus datos fiscales y su fecha de inicio. */
function usarFormularioDeEmpresa({ edicion, guardarDatos, recargar }: FormularioDeEmpresa) {
  const sesion = usarSesion();
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();

  function abrir(empresa?: Empresa): void {
    edicion.value = edicionDe(empresa);
    errores.value = {};
  }

  /** La sesión se recarga para que el selector muestre la empresa nueva o su nombre nuevo. */
  async function guardar(): Promise<void> {
    const esNueva = edicion.value.empresaId === null;
    const empresaYDatos = async () => {
      const empresa = await guardarEmpresa(edicion.value);
      if (!esNueva) await guardarDatos(empresa.id);
    };
    if (!(await enviar(empresaYDatos))) return;
    avisos.exito(esNueva ? 'Empresa creada. Ya puede elegirla en el selector.' : 'Empresa actualizada.');
    edicion.value.abierta = false;
    await Promise.all([recargar(), sesion.cargar()]);
  }

  return { enviando, errores, abrir, guardar };
}

/** Las empresas de la cuenta: listarlas, crearlas y editarlas en una ventana, con cierre y reapertura de la carga inicial. */
export function usarEmpresas() {
  const { datos: empresas, cargar } = listarEmpresas();
  const edicion = ref<EdicionDeEmpresa>({ ...edicionDe(), abierta: false });
  const { carga, guardar: guardarDatos } = usarDatosDeEmpresa(edicion);
  const idEnEdicion = () => edicion.value.empresaId;
  const formulario = usarFormularioDeEmpresa({ edicion, guardarDatos, recargar: cargar });

  return {
    empresas,
    edicion,
    carga,
    ...formulario,
    ...usarCierreDeCarga(idEnEdicion, carga),
    ...usarReaperturaDeCarga(idEnEdicion, carga),
  };
}
