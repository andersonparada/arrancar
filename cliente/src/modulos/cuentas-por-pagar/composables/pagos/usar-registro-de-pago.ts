import { ref, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiPagos, type NotaParaLigar, type PagoRegistrado, type ParaPagar } from '../../servicios/pagos.api';
import { fechaDeHoy } from '../dinero';
import { lineasDelPago, solicitudDePago, type EdicionDePago } from './edicion-de-pago';
import { erroresDelPago, repartirErroresDelServidor } from './errores-del-pago';
import { notaElegida } from './fechas-del-pago';
import { resumenDelPago, textoDelBoton } from './resumen-del-pago';

/** Muestra el resumen de lo que va a pasar y pide confirmar; `true` si el usuario acepta. */
function confirmarElPago(edicion: EdicionDePago, datos: ParaPagar, nota: NotaParaLigar | null): Promise<boolean> {
  return usarAvisos().confirmar({
    titulo: 'Confirmar el pago',
    mensaje: resumenDelPago(edicion, { datos, nota, hoy: fechaDeHoy() }),
    textoConfirmar: textoDelBoton(edicion.forma),
  });
}

/** Validar, confirmar con el resumen de lo que va a pasar y enviar; los errores del servidor vuelven a su campo. */
export function usarRegistroDePago(edicion: EdicionDePago, datos: Ref<ParaPagar | null>, notas: Ref<NotaParaLigar[]>) {
  const { enviando, errores, enviar } = usarFormulario();
  const resultado = ref<PagoRegistrado | null>(null);

  async function registrar(): Promise<boolean> {
    const paraPagar = datos.value;
    if (!paraPagar) return false;
    errores.value = erroresDelPago(edicion, { datos: paraPagar, notas: notas.value, hoy: fechaDeHoy() });
    if (Object.keys(errores.value).length > 0) return false;
    if (!(await confirmarElPago(edicion, paraPagar, notaElegida(edicion, notas.value)))) return false;
    const lineas = lineasDelPago(edicion, paraPagar);
    const solicitud = solicitudDePago(edicion, paraPagar);
    const guardado = await enviar(async () => {
      resultado.value = await apiPagos.registrar(solicitud);
    });
    if (!guardado) errores.value = repartirErroresDelServidor(errores.value, lineas);
    return guardado;
  }
  return { enviando, errores, resultado, registrar };
}
