import { computed, ref, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiChequeras } from '../../servicios/chequeras.api';
import { apiCheques, type Cheque, type ChequePasado } from '../../servicios/cheques.api';
import { tituloDeCheque } from '../impresion-de-cheques/usar-reimpresion-de-cheque';
import {
  cambioCerrado,
  cambioNuevo,
  datosDeCambio,
  datosDeExtravio,
  opcionesDeDestino,
  type DisponiblesDeChequera,
  type EdicionDeCambioDeFormulario,
} from './edicion-de-cambio-de-formulario';

type Enviar = ReturnType<typeof usarFormulario>['enviar'];
type Resultado = ChequePasado | Cheque;
type ParteDelCheque = { serie?: string | null; numero: number; puedePasarAOtroFormulario: boolean };

/** Los cheques disponibles de las chequeras activas de la misma cuenta bancaria que la del cheque (el servidor valida lo demás). */
async function disponiblesDeLaCuenta(chequeraId: string): Promise<DisponiblesDeChequera[]> {
  const chequeras = await apiChequeras.listar();
  const propia = chequeras.find((chequera) => chequera.id === chequeraId);
  const candidatas = chequeras.filter(
    (c) => c.activa && c.disponibles > 0 && c.cuentaBancariaId === propia?.cuentaBancariaId,
  );
  return Promise.all(
    candidatas.map(async (c) => ({ serie: c.serie, cheques: await apiCheques.listarDeLaChequera(c.id, 'disponible') })),
  );
}

/** Pasa el pago a otro formulario o anula como extraviado, según lo que se eligió en la ventana. */
const enviarCambio = (chequeId: string, edicion: EdicionDeCambioDeFormulario): Promise<Resultado> =>
  edicion.destino === 'inutilizar'
    ? apiCheques.cambiarFormulario(chequeId, datosDeCambio(edicion))
    : apiCheques.anularComoExtraviado(chequeId, datosDeExtravio(edicion));

/** Dice qué pasó, con los avisos fijos del servidor (reimprimir el comprobante, avisar al banco). */
function avisarResultado(avisos: ReturnType<typeof usarAvisos>, resultado: Resultado): void {
  if ('destino' in resultado) {
    avisos.exito(`Listo: el pago pasó al cheque No. ${resultado.destino.numero}.`);
    resultado.avisos.forEach((aviso) => avisos.info(aviso));
    return;
  }
  avisos.exito('Cheque anulado como extraviado.');
  if (resultado.aviso) avisos.info(resultado.aviso);
}

/** La ventana abierta para un cheque, con los cheques disponibles de las chequeras de su cuenta como destino posible. */
function usarVentanaDelCambio(errores: Ref<Record<string, string>>) {
  const avisos = usarAvisos();
  const edicion = ref<EdicionDeCambioDeFormulario>(cambioCerrado());
  const disponibles = ref<DisponiblesDeChequera[]>([]);
  const opciones = computed(() => opcionesDeDestino(disponibles.value));

  async function abrir(cheque: Parameters<typeof cambioNuevo>[0] & ParteDelCheque) {
    edicion.value = cambioNuevo(cheque, tituloDeCheque(cheque), cheque.puedePasarAOtroFormulario);
    errores.value = {};
    disponibles.value = [];
    if (!cheque.puedePasarAOtroFormulario) return;
    try {
      disponibles.value = await disponiblesDeLaCuenta(cheque.chequeraId);
      edicion.value.chequeDestinoId = opciones.value[0]?.valor ?? null;
    } catch (error) {
      avisos.error(error instanceof Error ? error.message : 'No se pudieron traer los cheques disponibles.');
    }
  }

  return { edicion, opciones, abrir, cerrar: () => (edicion.value.abierta = false) };
}

/** Confirmar: avisar el resultado, cerrar la ventana y recargar la lista. */
function usarConfirmacionDelCambio(
  edicion: Ref<EdicionDeCambioDeFormulario>,
  enviar: Enviar,
  alTerminar: () => Promise<void>,
) {
  const avisos = usarAvisos();
  return async (): Promise<void> => {
    const { chequeId } = edicion.value;
    if (!chequeId) return;
    let resultado: Resultado | null = null;
    const llamar = async () => {
      resultado = await enviarCambio(chequeId, edicion.value);
    };
    if (!(await enviar(llamar)) || !resultado) return;
    avisarResultado(avisos, resultado);
    edicion.value.abierta = false;
    await alTerminar();
  };
}

/**
 * El papel de un cheque impreso: pasar su pago a otro formulario (con las dos confirmaciones) o, si el papel salió de la
 * empresa, anularlo como extraviado. Los dos usan el permiso de anular; el servidor valida las confirmaciones.
 */
export function usarCambioDeFormulario(alTerminar: () => Promise<void>) {
  const { enviando, errores, enviar } = usarFormulario();
  const ventana = usarVentanaDelCambio(errores);
  const confirmar = usarConfirmacionDelCambio(ventana.edicion, enviar, alTerminar);
  return { ...ventana, enviando, errores, confirmar };
}
