import type { Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { guardarArchivo } from '@/modulos/core/utilidades/archivos';
import { apiLibro, type EmisionDelLibro } from '../../servicios/libro.api';
import { conAyuda, exigeMotivo, motivoLimpio, problemaDelMotivo, rangoDeFolios } from './datos-de-emisiones';
import { usarVentanaConMotivo } from './usar-ventana-con-motivo';

/** Baja el PDF recién emitido; si falla, avisa que el libro sí se emitió y dónde está la copia. */
async function bajarElPdf(emision: EmisionDelLibro): Promise<void> {
  try {
    guardarArchivo(await apiLibro.copia(emision.id));
  } catch {
    usarAvisos().error('El libro se emitió, pero no se pudo bajar el archivo. Descárguelo en «Emisiones del período».');
  }
}

/** Emitir con folios: pide el motivo si el período ya se emitió, descarga el PDF y avisa el rango de folios. */
export function usarEmisionDelLibro(
  periodo: Ref<string>,
  emisiones: Ref<EmisionDelLibro[]>,
  alTerminar: () => Promise<void>,
) {
  const { abierta, motivo, enviando, errores, enviar, abrir } = usarVentanaConMotivo();

  async function emitir(): Promise<void> {
    const problema = problemaDelMotivo(motivo.value, exigeMotivo(emisiones.value));
    if (problema) {
      errores.value = { motivo: problema };
      return;
    }
    let emision = null as EmisionDelLibro | null;
    const bien = await enviar(async () => {
      emision = await conAyuda(apiLibro.emitir(periodo.value, motivoLimpio(motivo.value)));
    });
    if (!bien || !emision) return;
    abierta.value = false;
    usarAvisos().exito(`Libro emitido. ${rangoDeFolios(emision)}.`);
    await bajarElPdf(emision);
    await alTerminar();
  }

  return { abierta, motivo, enviando, errores, abrir, emitir };
}
