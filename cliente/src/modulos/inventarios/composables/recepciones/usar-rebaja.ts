import { ref } from 'vue';
import { apiRecepciones, type LineaPorRecibir } from '../../servicios/recepciones.api';
import { fechaDeHoy } from '../compartido/fechas';
import { datosDeRebaja, erroresDeRebaja, rebajaNueva, resumenDeRebaja, type EdicionDeRebaja } from './edicion-de-nota';
import { usarEnvioDeNota } from './usar-envio-de-nota';

/** La ventana de rebaja de costo: una nota de crédito sin devolución física baja el costo de lo recibido. */
export function usarRebaja(alTerminar: () => Promise<void>) {
  const edicion = ref<EdicionDeRebaja>({ ...rebajaNueva({ pendiente: '0' } as LineaPorRecibir, ''), abierta: false });
  const { enviando, errores, guardar } = usarEnvioDeNota(edicion, alTerminar);

  function abrir(nota: LineaPorRecibir): void {
    errores.value = {};
    edicion.value = rebajaNueva(nota, fechaDeHoy());
  }

  const enviar = () =>
    guardar({
      revisar: () => erroresDeRebaja(edicion.value),
      pregunta: { titulo: 'Rebajar el costo', mensaje: resumenDeRebaja(edicion.value), textoConfirmar: 'Rebajar' },
      mandar: () => apiRecepciones.rebajar(datosDeRebaja(edicion.value)),
      exito: (documento) => `Rebaja de costo n.º ${documento.numero} registrada.`,
    });

  return { edicion, enviando, errores, abrir, guardar: enviar };
}
