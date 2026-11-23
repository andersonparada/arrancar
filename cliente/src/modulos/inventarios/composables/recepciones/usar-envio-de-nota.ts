import type { Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import type { Documento } from '../../servicios/documentos.api';

/** Lo que cambia entre una devolución y una rebaja: qué revisar, qué decir, qué enviar. */
interface Envio {
  /** Lo que falta en la ventana, antes de molestar al servidor. */
  revisar: () => Record<string, string>;
  /** Lo que va a pasar, para confirmarlo. */
  pregunta: { titulo: string; mensaje: string; textoConfirmar: string };
  mandar: () => Promise<Documento>;
  exito: (documento: Documento) => string;
}

/**
 * Enviar una nota de crédito aplicada (devolución o rebaja): revisa, confirma con el resumen, envía, avisa con lo que el
 * servidor recomienda, cierra la ventana y recarga la bandeja.
 */
export function usarEnvioDeNota(ventana: Ref<{ abierta: boolean }>, alTerminar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();

  async function guardar(envio: Envio): Promise<void> {
    errores.value = envio.revisar();
    if (Object.keys(errores.value).length) return avisos.error('Revise los campos marcados.');
    if (!(await avisos.confirmar(envio.pregunta))) return;
    const guardado: { documento: Documento | null } = { documento: null };
    const aceptado = await enviar(async () => {
      guardado.documento = await envio.mandar();
    });
    if (!aceptado || !guardado.documento) return;
    avisos.exito(envio.exito(guardado.documento));
    guardado.documento.avisos.forEach((aviso) => avisos.info(aviso));
    ventana.value.abierta = false;
    await alTerminar();
  }

  return { enviando, errores, guardar };
}
