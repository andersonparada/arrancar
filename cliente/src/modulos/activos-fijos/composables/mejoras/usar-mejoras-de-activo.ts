import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiMejoras, type Mejora } from '../../servicios/mejoras.api';
import { usarAnulacionDeMejora } from './usar-anulacion-de-mejora';
import { usarEdicionDeMejora } from './usar-edicion-de-mejora';
import { usarRegistroDeMejora } from './usar-registro-de-mejora';

/** El activo de la ficha tal como lo necesitan las mejoras. */
interface ActivoDeMejoras {
  activoId: string;
  esEdificio: () => boolean;
  costo: () => string;
}

/**
 * Las mejoras y costos posteriores de un activo: la lista, registrar una y anular una. `alCambiar` refresca lo demás
 * de la ficha (costo, tramos).
 */
export function usarMejorasDeActivo(activo: ActivoDeMejoras, alCambiar: () => Promise<void>) {
  const { datos, cargando, cargar } = usarCarga(
    () => apiMejoras.listar(activo.activoId),
    [] as Mejora[],
    'No se pudieron cargar las mejoras.',
  );
  const refrescar = async () => {
    await Promise.all([cargar(), alCambiar()]);
  };
  const formulario = usarFormulario();
  const ventana = usarEdicionDeMejora(formulario.errores);
  const contexto = { ...activo, ...ventana, errores: formulario.errores };
  const registro = usarRegistroDeMejora(contexto, formulario.enviar, refrescar);
  const anulacion = usarAnulacionDeMejora(formulario, refrescar);
  return {
    mejoras: datos,
    cargando,
    enviando: formulario.enviando,
    errores: formulario.errores,
    ...ventana,
    ...registro,
    anulacion,
  };
}
