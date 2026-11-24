import { useRouter } from 'vue-router';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import type { Documento } from '../../servicios/documentos.api';

interface Registro {
  /** Lo que falta en el formulario, antes de molestar al servidor. */
  errores: () => Record<string, string>;
  /** Lo que va a pasar, para confirmarlo. */
  resumen: () => string;
  titulo: string;
  enviar: () => Promise<Documento>;
}

/**
 * Registrar un documento: revisa lo escrito, pide confirmar con el resumen, lo envía y lleva a la ficha. Los avisos
 * del servidor (recomendaciones que no impidieron guardar) se muestran al guardar y quedan en la ficha.
 */
export function usarRegistroDeDocumento() {
  const router = useRouter();
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();

  async function registrar({ errores: revisar, resumen, titulo, enviar: mandar }: Registro): Promise<void> {
    const faltantes = revisar();
    errores.value = faltantes;
    if (Object.keys(faltantes).length) {
      avisos.error('Revise los campos marcados: falta información para guardar.');
      return;
    }
    if (!(await avisos.confirmar({ titulo, mensaje: resumen(), textoConfirmar: 'Registrar' }))) return;
    let documento: Documento | null = null;
    if (!(await enviar(async () => (documento = await mandar())))) return;
    const guardado = documento as Documento | null;
    if (!guardado) return;
    avisos.exito(`Documento n.º ${guardado.numero} registrado.`);
    guardado.avisos.forEach((aviso) => avisos.info(aviso));
    await router.push({ name: 'inventarios.movimientos.ficha', params: { documentoId: guardado.id } });
  }

  return { enviando, errores, registrar };
}
