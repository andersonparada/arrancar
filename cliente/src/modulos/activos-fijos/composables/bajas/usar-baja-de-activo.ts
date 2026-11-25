import { ref, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiBajas, type Baja } from '../../servicios/bajas.api';
import type { ActivoFicha } from '../../servicios/activos.api';
import { fechaDeHoyEn } from '../activos/fecha-de-hoy';
import { datosDeBaja, edicionDeBajaNueva, erroresDeBaja, mensajeDeBaja, type EdicionDeBaja } from './edicion-de-baja';

/** El permiso del contador para escribir el costo fiscal de la venta de un bien de control. */
export const PERMISO_DEL_COSTO_FISCAL = 'activos-fijos.bajas.costo-fiscal-manual';

/** Lo que el envío necesita de la ventana. */
interface ContextoDeBaja {
  activo: () => ActivoFicha | null;
  edicion: Ref<EdicionDeBaja>;
  ventanaAbierta: Ref<boolean>;
  resultado: Ref<Baja | null>;
}

/** Pregunta con el resumen de lo que va a pasar. */
function confirmarBaja(activo: ActivoFicha, edicion: EdicionDeBaja): Promise<boolean> {
  const esDeControl = activo.tipoDeRegistro === 'bien_de_control';
  return usarAvisos().confirmar({
    titulo: 'Confirmar baja',
    mensaje: mensajeDeBaja(`${activo.codigo} · ${activo.descripcion}`, edicion, esDeControl),
    textoConfirmar: 'Dar de baja',
    peligroso: true,
  });
}

/** Revisa, confirma el efecto y manda la baja; guarda el resultado para mostrar sus avisos. */
function usarEnvioDeBaja(
  contexto: ContextoDeBaja,
  formulario: ReturnType<typeof usarFormulario>,
  alRegistrar: () => Promise<void>,
) {
  const { edicion, ventanaAbierta, resultado } = contexto;

  return async function registrar(): Promise<void> {
    const actual = contexto.activo();
    if (!actual) return;
    formulario.errores.value = erroresDeBaja(edicion.value);
    if (Object.keys(formulario.errores.value).length > 0) return;
    if (!(await confirmarBaja(actual, edicion.value))) return;
    const solicitud = datosDeBaja(actual.id, edicion.value);
    const aceptado = await formulario.enviar(async () => {
      resultado.value = await apiBajas.registrar(solicitud);
    });
    if (!aceptado) return;
    ventanaAbierta.value = false;
    await alRegistrar();
  };
}

/**
 * La ventana de baja o venta del activo de la ficha. Al terminar muestra el resultado con los avisos fiscales
 * del servidor y llama a `alRegistrar` para refrescar la ficha.
 */
export function usarBajaDeActivo(activo: () => ActivoFicha | null, alRegistrar: () => Promise<void>) {
  const { config, puede } = usarSesion();
  const formulario = usarFormulario();
  const edicion = ref(edicionDeBajaNueva(''));
  const ventanaAbierta = ref(false);
  const resultado = ref<Baja | null>(null);
  const registrar = usarEnvioDeBaja({ activo, edicion, ventanaAbierta, resultado }, formulario, alRegistrar);

  function abrir(): void {
    edicion.value = edicionDeBajaNueva(fechaDeHoyEn(config('core.regional.zona_horaria', 'America/Guatemala')));
    formulario.errores.value = {};
    ventanaAbierta.value = true;
  }

  return {
    edicion,
    ventanaAbierta,
    resultado,
    enviando: formulario.enviando,
    errores: formulario.errores,
    puedeEscribirElCosto: () => puede(PERMISO_DEL_COSTO_FISCAL) && activo()?.tipoDeRegistro === 'bien_de_control',
    abrir,
    registrar,
    cerrar: () => (ventanaAbierta.value = false),
    cerrarResultado: () => (resultado.value = null),
  };
}
