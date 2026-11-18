import { computed, ref, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiPagos, type FichaDePago, type PagoRegistrado } from '../../servicios/pagos.api';
import {
  candidatosDeReaplicacion,
  edicionDeReaplicacionDe,
  edicionDeReaplicacionVacia,
  erroresDeReaplicacion,
  repartirErroresDeReaplicacion,
  resumenDeReaplicar,
  solicitudDeReaplicar,
  textoDeLaSuma,
  type CandidatoDeReaplicacion,
  type EdicionDeReaplicacion,
} from './reaplicacion';

type FichaActual = Readonly<Ref<FichaDePago | null>>;

/** La ventana: se abre trayendo los cargos de las contraseñas vigentes del proveedor y deja repartir el mismo monto. */
function usarVentanaDeReaplicacion(ficha: FichaActual, errores: Ref<Record<string, string>>) {
  const edicion = ref<EdicionDeReaplicacion>(edicionDeReaplicacionVacia());
  const candidatos = ref<CandidatoDeReaplicacion[]>([]);
  const cargando = ref(false);

  async function abrir(): Promise<void> {
    const actual = ficha.value;
    if (!actual) return;
    cargando.value = true;
    errores.value = {};
    edicion.value = { ...edicionDeReaplicacionVacia(), abierta: true };
    try {
      candidatos.value = candidatosDeReaplicacion(actual, await apiPagos.paraPagar(actual.proveedor.id));
      edicion.value = edicionDeReaplicacionDe(candidatos.value);
    } catch (error) {
      edicion.value.abierta = false;
      usarAvisos().error(error instanceof Error ? error.message : 'No se pudieron traer los documentos del proveedor.');
    } finally {
      cargando.value = false;
    }
  }
  const cerrar = (): void => {
    edicion.value.abierta = false;
  };
  return { edicion, candidatos, cargando, abrir, cerrar };
}

/** Los avisos que Bancos o Cuentas por pagar devuelven al reaplicar, uno por mensaje. */
function mostrarAvisos(pago: PagoRegistrado | null): void {
  for (const aviso of pago?.avisos ?? []) usarAvisos().info(aviso);
}

/** Valida la suma, confirma con el resumen de lo que va a pasar y, si el usuario acepta, deja listo el cuerpo a enviar. */
async function pedirConfirmacion(
  ficha: FichaDePago,
  ventana: ReturnType<typeof usarVentanaDeReaplicacion>,
  errores: Ref<Record<string, string>>,
) {
  const { edicion, candidatos } = ventana;
  errores.value = erroresDeReaplicacion(edicion.value, candidatos.value, ficha);
  if (Object.keys(errores.value).length > 0) return null;
  const aceptado = await usarAvisos().confirmar({
    titulo: 'Reaplicar el pago',
    mensaje: resumenDeReaplicar(edicion.value, candidatos.value, ficha),
    textoConfirmar: 'Reaplicar',
  });
  return aceptado ? solicitudDeReaplicar(edicion.value, candidatos.value) : null;
}

/**
 * Reaplicar el pago a otros cargos del proveedor: valida la suma, confirma con el resumen antes de enviar y devuelve
 * cada error del servidor al cargo que lo causó.
 */
export function usarReaplicacionDePago(ficha: FichaActual, alTerminar: () => Promise<void>) {
  const { enviando, errores, enviar } = usarFormulario();
  const ventana = usarVentanaDeReaplicacion(ficha, errores);

  async function confirmar(): Promise<void> {
    const actual = ficha.value;
    const solicitud = actual && (await pedirConfirmacion(actual, ventana, errores));
    if (!actual || !solicitud) return;
    const respuesta = ref<PagoRegistrado | null>(null);
    if (!(await enviar(async () => (respuesta.value = await apiPagos.reaplicar(actual.id, solicitud))))) {
      errores.value = repartirErroresDeReaplicacion(errores.value, solicitud.aplicaciones);
      return;
    }
    ventana.cerrar();
    usarAvisos().exito(`Pago ${actual.numero} reaplicado.`);
    mostrarAvisos(respuesta.value);
    await alTerminar();
  }

  return {
    ...ventana,
    enviando,
    errores,
    confirmar,
    textoDeLaSuma: computed(() => (ficha.value ? textoDeLaSuma(ventana.edicion.value, ficha.value) : '')),
  };
}
