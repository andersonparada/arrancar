import { ref, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiTraslados } from '../../servicios/traslados.api';
import { fechaDeHoyEn } from '../activos/fecha-de-hoy';
import {
  datosDeTraslado,
  edicionDeTrasladoNueva,
  erroresDeTraslado,
  mensajeDeTraslado,
  numeroDeBoleta,
  type ActivoPorTrasladar,
  type DestinoElegido,
  type EdicionDeTraslado,
} from './edicion-de-traslado';
import { usarDestinosDeTraslado } from './usar-destinos-de-traslado';

/** Lo que el envío necesita de la ventana: lo escrito, los activos y cómo se llama el destino elegido. */
interface ContextoDeTraslado {
  edicion: Ref<EdicionDeTraslado>;
  activos: Ref<ActivoPorTrasladar[]>;
  ventanaAbierta: Ref<boolean>;
  destino: () => DestinoElegido;
}

/** El aviso de éxito, con el enlace para ver e imprimir la boleta. */
function avisarDeLaBoleta({ grupoId, numero }: { grupoId: string; numero: string }): void {
  usarAvisos().exito(`Traslado registrado en la boleta ${numero}.`, {
    texto: 'Ver e imprimir la boleta',
    ruta: { name: 'activos-fijos.boleta', params: { grupoId } },
  });
}

/** Revisa, confirma el efecto y manda el traslado; al terminar avisa con el enlace a la boleta. */
function usarEnvioDeTraslado(
  contexto: ContextoDeTraslado,
  formulario: ReturnType<typeof usarFormulario>,
  alTrasladar: () => Promise<void>,
) {
  const avisos = usarAvisos();
  const { edicion, activos, ventanaAbierta } = contexto;

  return async function trasladar(): Promise<void> {
    formulario.errores.value = erroresDeTraslado(edicion.value);
    if (Object.keys(formulario.errores.value).length > 0) return;
    const mensaje = mensajeDeTraslado(activos.value, edicion.value, contexto.destino());
    if (!(await avisos.confirmar({ titulo: 'Confirmar traslado', mensaje, textoConfirmar: 'Trasladar' }))) return;
    const solicitud = datosDeTraslado(activos.value, edicion.value);
    let boleta = { grupoId: '', numero: '' };
    const aceptado = await formulario.enviar(async () => {
      const creada = await apiTraslados.trasladar(solicitud);
      boleta = { grupoId: creada.grupoId, numero: numeroDeBoleta(creada.numero, creada.anioDeNumero) };
    });
    if (!aceptado) return;
    ventanaAbierta.value = false;
    avisarDeLaBoleta(boleta);
    await alTrasladar();
  };
}

/** Lo escrito en la ventana, los activos que se trasladan y si está abierta. */
function usarEstadoDeTraslado() {
  const { config } = usarSesion();
  const hoy = () => fechaDeHoyEn(config('core.regional.zona_horaria', 'America/Guatemala'));
  const edicion = ref(edicionDeTrasladoNueva(hoy()));
  const activos = ref<ActivoPorTrasladar[]>([]);
  const ventanaAbierta = ref(false);

  function empezar(porTrasladar: ActivoPorTrasladar[]): void {
    activos.value = porTrasladar;
    edicion.value = edicionDeTrasladoNueva(hoy(), porTrasladar);
    ventanaAbierta.value = true;
  }

  return { edicion, activos, ventanaAbierta, empezar };
}

/**
 * La ventana de traslado de uno o varios activos con una sola boleta. Al terminar avisa con un enlace a la boleta
 * para imprimirla y llama a `alTrasladar` para refrescar lo que se ve.
 */
export function usarTrasladoDeActivos(alTrasladar: () => Promise<void>) {
  const formulario = usarFormulario();
  const { empezar, ...estado } = usarEstadoDeTraslado();
  const destinos = usarDestinosDeTraslado(estado.edicion);
  const trasladar = usarEnvioDeTraslado({ ...estado, destino: destinos.elegido }, formulario, alTrasladar);

  async function abrir(porTrasladar: ActivoPorTrasladar[]): Promise<void> {
    empezar(porTrasladar);
    formulario.errores.value = {};
    await destinos.cargar();
  }

  return {
    ...estado,
    enviando: formulario.enviando,
    errores: formulario.errores,
    opciones: destinos.opciones,
    abrir,
    trasladar,
    cerrar: () => (estado.ventanaAbierta.value = false),
  };
}
