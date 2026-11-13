import type { Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { formatearFecha } from '@/modulos/core/utilidades/formato';
import { RECORDATORIO_DE_CUADRE } from './datos-de-empresa';
import { apiDatosDeEmpresa, type CargaInicial } from '../servicios/datos-de-empresa.api';

const avisoDelCierre = (fechaDeInicio: string | null) =>
  `La fecha de inicio (${formatearFecha(fechaDeInicio)}) quedará fija y ya no se podrán registrar saldos iniciales. Solo quien tenga el permiso de reabrir la carga inicial podrá reabrirla, indicando el motivo. ${RECORDATORIO_DE_CUADRE}`;

/** Cerrar la carga inicial de la empresa que se edita, con confirmación que explica lo que va a pasar. */
export function usarCierreDeCarga(empresaId: () => string | null, carga: Ref<CargaInicial | null>) {
  const avisos = usarAvisos();
  const { enviando, enviar } = usarFormulario();

  async function cerrar(): Promise<void> {
    const id = empresaId();
    if (!id || !carga.value) return;
    const confirmado = await avisos.confirmar({
      titulo: 'Cerrar la carga inicial',
      mensaje: avisoDelCierre(carga.value.fechaDeInicio),
      textoConfirmar: 'Cerrar carga inicial',
      peligroso: true,
    });
    if (!confirmado) return;
    if (await enviar(async () => (carga.value = await apiDatosDeEmpresa.cerrarCargaInicial(id)))) {
      avisos.exito('Carga inicial cerrada.');
    }
  }

  return { enviandoCierre: enviando, cerrar };
}
