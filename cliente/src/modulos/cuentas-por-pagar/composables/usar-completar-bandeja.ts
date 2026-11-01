import type { Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiCuentasPorPagar, type DocumentoPorPagar } from '../servicios/cuentas-por-pagar.api';
import {
  documentosACompletar,
  erroresDeCompletar,
  resumenDeCompletar,
  type VencimientosPorDocumento,
} from './completar-bandeja';

interface DatosParaCompletar {
  escogidos: Ref<DocumentoPorPagar[]>;
  vencimientos: Ref<VencimientosPorDocumento>;
  errores: Ref<Record<string, string>>;
  /** Se llama cuando el servidor completó los documentos. */
  alTerminar: () => Promise<void>;
}

/** «Completar»: revisa los vencimientos, pide confirmar con un resumen y envía todo el lote (todo o nada). */
export function usarCompletarBandeja({ escogidos, vencimientos, errores, alTerminar }: DatosParaCompletar) {
  const avisos = usarAvisos();
  const { enviando, enviar } = usarFormulario();

  const confirmar = (): Promise<boolean> =>
    avisos.confirmar({
      titulo: 'Completar documentos',
      mensaje: resumenDeCompletar(escogidos.value),
      textoConfirmar: 'Completar',
    });

  async function completar(): Promise<void> {
    errores.value = erroresDeCompletar(escogidos.value, vencimientos.value);
    if (Object.keys(errores.value).length > 0) return avisos.error('Revise los vencimientos marcados.');
    if (!(await confirmar())) return;
    const cantidad = escogidos.value.length;
    const documentos = documentosACompletar(escogidos.value, vencimientos.value);
    if (!(await enviar(() => apiCuentasPorPagar.completar(documentos)))) return;
    avisos.exito(cantidad === 1 ? 'Documento completado.' : `${cantidad} documentos completados.`);
    await alTerminar();
  }

  return { enviando, completar };
}
