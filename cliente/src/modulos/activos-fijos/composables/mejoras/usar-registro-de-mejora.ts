import type { Ref } from 'vue';
import { useRouter } from 'vue-router';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { apiMejoras } from '../../servicios/mejoras.api';
import {
  consultaDeComponente,
  datosDeMejora,
  erroresDeMejora,
  mensajeDeRegistroDeMejora,
  type EdicionDeMejora,
} from './edicion-de-mejora';

/** Lo que el registro necesita saber del activo y de la ventana. */
interface ContextoDeRegistro {
  activoId: string;
  esEdificio: () => boolean;
  costo: () => string;
  edicion: Ref<EdicionDeMejora>;
  ventanaAbierta: Ref<boolean>;
  errores: Ref<Record<string, string>>;
}

/** Dice qué pasará con el costo y la depreciación y espera el sí de quien registra. */
function confirmarRegistro(edicion: EdicionDeMejora, costo: string): Promise<boolean> {
  const titulo = edicion.clase === 'mejora' ? 'Registrar mejora' : 'Registrar costo posterior';
  const mensaje = mensajeDeRegistroDeMejora(edicion, costo);
  return usarAvisos().confirmar({ titulo, mensaje, textoConfirmar: titulo });
}

/**
 * Registrar lo escrito: revisa, confirma el efecto en el costo y la depreciación y lo manda; o lleva a dar de alta
 * un componente en vez de una mejora (V-3). `enviar` es el de `usarFormulario`.
 */
export function usarRegistroDeMejora(
  contexto: ContextoDeRegistro,
  enviar: (accion: () => Promise<unknown>) => Promise<boolean>,
  alRegistrar: () => Promise<void>,
) {
  const avisos = usarAvisos();
  const router = useRouter();
  const { edicion, ventanaAbierta, errores } = contexto;

  async function registrar(): Promise<void> {
    errores.value = erroresDeMejora(edicion.value);
    if (Object.keys(errores.value).length > 0) return;
    if (!(await confirmarRegistro(edicion.value, contexto.costo()))) return;
    const solicitud = datosDeMejora(contexto.activoId, edicion.value, contexto.esEdificio());
    if (!(await enviar(() => apiMejoras.registrar(solicitud)))) return;
    ventanaAbierta.value = false;
    avisos.exito('Registrado. La depreciación se ajusta desde el mes de la fecha indicada.');
    await alRegistrar();
  }

  async function darDeAltaComoComponente(): Promise<void> {
    ventanaAbierta.value = false;
    const query = consultaDeComponente(contexto.activoId, edicion.value.descripcion);
    await router.push({ name: 'activos-fijos.activos.nuevo', query });
  }

  return { registrar, darDeAltaComoComponente };
}
