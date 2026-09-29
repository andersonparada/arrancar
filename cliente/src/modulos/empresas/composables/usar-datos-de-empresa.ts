import { ref, watch, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { apiDatosDeEmpresa, type CargaInicial } from '../servicios/datos-de-empresa.api';
import {
  camposGuardados,
  DATOS_DE_EMPRESA_VACIOS,
  fechaPorGuardar,
  fiscalesPorGuardar,
  type CamposDeDatosDeEmpresa,
} from './datos-de-empresa';
import type { EdicionDeEmpresa } from './edicion-de-empresa';

async function traerDatos(empresaId: string) {
  const [fiscales, carga] = await Promise.all([
    apiDatosDeEmpresa.obtenerDatosFiscales(empresaId),
    apiDatosDeEmpresa.obtenerCargaInicial(empresaId),
  ]);
  return { carga, guardado: camposGuardados(fiscales, carga) };
}

/** Guarda los datos fiscales y la fecha de inicio si cambiaron (la fecha, solo con la carga abierta); devuelve la carga vigente. */
async function guardarCambios(
  empresaId: string,
  actual: CamposDeDatosDeEmpresa,
  guardado: { campos: CamposDeDatosDeEmpresa; carga: CargaInicial },
): Promise<CargaInicial> {
  const fiscales = fiscalesPorGuardar(actual, guardado.campos);
  const fecha = fechaPorGuardar(actual, guardado.campos, guardado.carga.cerrada);
  if (fiscales) await apiDatosDeEmpresa.guardarDatosFiscales(empresaId, fiscales);
  return fecha ? apiDatosDeEmpresa.establecerFechaDeInicio(empresaId, fecha) : guardado.carga;
}

/** Avisa con el id de la empresa cuando se abre su ventana, y con null cuando se cierra. */
function alAbrirOCerrarLaVentana(edicion: Ref<EdicionDeEmpresa>, alcambiar: (empresaId: string | null) => void): void {
  watch(() => (edicion.value.abierta ? edicion.value.empresaId : null), alcambiar);
}

/**
 * Los datos fiscales y la fecha de inicio de la empresa que se edita: los trae al abrir la ventana,
 * los pone en el formulario y guarda solo lo que cambió.
 */
export function usarDatosDeEmpresa(edicion: Ref<EdicionDeEmpresa>) {
  const avisos = usarAvisos();
  const carga = ref<CargaInicial | null>(null);
  const guardado = ref<CamposDeDatosDeEmpresa>({ ...DATOS_DE_EMPRESA_VACIOS });

  async function traer(empresaId: string): Promise<void> {
    try {
      const datos = await traerDatos(empresaId);
      if (edicion.value.empresaId !== empresaId) return;
      [carga.value, guardado.value] = [datos.carga, datos.guardado];
      Object.assign(edicion.value, datos.guardado);
    } catch (error) {
      avisos.error(error instanceof Error ? error.message : 'No se pudieron cargar los datos de la empresa.');
    }
  }

  alAbrirOCerrarLaVentana(edicion, (empresaId) => {
    carga.value = null;
    if (empresaId) void traer(empresaId);
  });

  async function guardar(empresaId: string): Promise<void> {
    if (carga.value)
      carga.value = await guardarCambios(empresaId, edicion.value, { campos: guardado.value, carga: carga.value });
  }

  return { carga, guardar };
}
