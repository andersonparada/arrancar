import { reactive } from 'vue';
import { useRouter } from 'vue-router';
import { usarCambioDeFormulario } from '../cheques/usar-cambio-de-formulario';
import { usarHistorialDeImpresiones } from './usar-historial-de-impresiones';
import { usarReimpresionDeCheque } from './usar-reimpresion-de-cheque';

/**
 * Todo lo que se hace con el papel de un cheque desde su tarjeta: imprimirlo (lleva a la vista previa), reimprimirlo, ver
 * su historia de impresiones y pasar su pago a otro formulario o anularlo como extraviado. `alTerminar` recarga la lista.
 */
export function usarImpresionDeUnCheque(alTerminar: () => Promise<void>) {
  const router = useRouter();
  const imprimir = (cheque: { id: string }) =>
    router.push({ name: 'bancos.cheques.imprimir', query: { ids: cheque.id } });
  return {
    imprimir,
    reimpresion: reactive(usarReimpresionDeCheque()),
    historial: reactive(usarHistorialDeImpresiones()),
    cambio: reactive(usarCambioDeFormulario(alTerminar)),
  };
}

export type ImpresionDeUnCheque = ReturnType<typeof usarImpresionDeUnCheque>;
