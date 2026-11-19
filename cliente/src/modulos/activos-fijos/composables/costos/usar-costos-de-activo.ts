import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiCostos, type Costo, type CostosDeActivo } from '../../servicios/costos.api';
import { fechaDeHoyEn } from '../activos/fecha-de-hoy';
import { datosDeCosto, edicionDeCostoNueva, erroresDeCosto } from './edicion-de-costo';

const SIN_COSTOS: CostosDeActivo = { costos: [], total: '0.00' };

/** La ventana para registrar un costo a mano: abrirla, revisar lo escrito y mandarlo. */
function usarRegistroDeCosto(activoId: string, esEdificio: () => boolean, alRegistrar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { config } = usarSesion();
  const { enviando, errores, enviar } = usarFormulario();
  const hoy = () => fechaDeHoyEn(config('core.regional.zona_horaria', 'America/Guatemala'));
  const edicion = ref(edicionDeCostoNueva(hoy()));
  const ventanaAbierta = ref(false);

  function abrir(): void {
    edicion.value = edicionDeCostoNueva(hoy());
    errores.value = {};
    ventanaAbierta.value = true;
  }

  async function registrar(): Promise<void> {
    errores.value = erroresDeCosto(edicion.value);
    if (Object.keys(errores.value).length > 0) return;
    const datos = datosDeCosto(edicion.value, esEdificio());
    if (!(await enviar(() => apiCostos.registrarManual(activoId, datos)))) return;
    ventanaAbierta.value = false;
    avisos.exito('Costo registrado.');
    await alRegistrar();
  }

  return { edicion, ventanaAbierta, enviando, errores, abrir, registrar, enviar };
}

/**
 * Los costos de un activo, registrar uno a mano y anular uno. `alCambiar` refresca lo demás de la ficha (el costo
 * total del encabezado). `esEdificio` dice si se pregunta «no es edificación».
 */
export function usarCostosDeActivo(activoId: string, esEdificio: () => boolean, alCambiar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { datos, cargando, cargar } = usarCarga(
    () => apiCostos.listar(activoId),
    SIN_COSTOS,
    'No se pudieron cargar los costos.',
  );
  const refrescar = async () => {
    await Promise.all([cargar(), alCambiar()]);
  };
  const registro = usarRegistroDeCosto(activoId, esEdificio, refrescar);

  /** Anula un costo con su motivo; devuelve `true` si el servidor lo aceptó. */
  async function anular(costo: Costo, motivo: string): Promise<boolean> {
    if (!(await registro.enviar(() => apiCostos.anular(costo.id, motivo)))) return false;
    avisos.exito('Costo anulado.');
    await refrescar();
    return true;
  }

  return { datos, cargando, ...registro, anular };
}
