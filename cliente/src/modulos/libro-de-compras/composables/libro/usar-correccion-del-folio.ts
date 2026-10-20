import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { apiLibro } from '../../servicios/libro.api';
import { conAyuda, proximoFolio, revisarCorreccion } from './datos-de-emisiones';
import { usarVentanaConMotivo } from './usar-ventana-con-motivo';

/** Corregir el último folio cuando las hojas habilitadas no coinciden con las contadas por Arrancar. */
export function usarCorreccionDelFolio(alTerminar: () => Promise<void>) {
  const { abierta, motivo, enviando, errores, enviar, abrir } = usarVentanaConMotivo();
  const folio = ref<string | number>('');

  async function guardar(): Promise<void> {
    const revision = revisarCorreccion(folio.value, motivo.value);
    if ('errores' in revision) {
      errores.value = revision.errores;
      return;
    }
    const bien = await enviar(() => conAyuda(apiLibro.corregirFolio(revision.folio, revision.motivo)));
    if (!bien) return;
    abierta.value = false;
    const siguiente = proximoFolio(revision.folio);
    usarAvisos().exito(`Último folio corregido: la próxima emisión empezará en el folio ${siguiente}.`);
    await alTerminar();
  }

  const abrirConFolio = (ultimoFolio: number) => {
    abrir();
    folio.value = ultimoFolio;
  };

  return { abierta, folio, motivo, enviando, errores, abrir: abrirConFolio, guardar };
}
