import { computed, ref, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiPagos, type MediosDePago } from '../../servicios/pagos.api';
import { apiRetiros, type Retiro } from '../../servicios/retiros.api';
import { fechaDeHoy } from '../dinero';
import { opcionesDeCuentas } from '../pagos/opciones-del-pago';
import {
  conDevuelto,
  conFaltante,
  erroresDeLaLiquidacion,
  liquidacionCerrada,
  liquidacionDelRetiro,
  resumenDeLaLiquidacion,
  solicitudDeLiquidacion,
  type EdicionDeLiquidacion,
} from './liquidacion';

type FichaActual = Readonly<Ref<Retiro | null>>;

/** Las cuentas donde se puede depositar lo que sobró; sin permiso para verlas, se usa la cuenta del retiro. */
function usarCuentasDelDeposito() {
  const sesion = usarSesion();
  const medios = ref<MediosDePago | null>(null);
  async function traer(): Promise<void> {
    if (!sesion.puede('cuentas-por-pagar.pagos.ver')) return;
    try {
      medios.value = await apiPagos.medios(fechaDeHoy());
    } catch {
      // Sin la lista el depósito va a la cuenta del retiro, que el servidor ya conoce.
    }
  }
  return { medios, traer, opciones: computed(() => opcionesDeCuentas(medios.value)) };
}

/** El estado de la ventana: se abre proponiendo devolver todo y lo devuelto y lo que falta se completan entre sí. */
function usarVentanaDeLiquidacion(ficha: FichaActual, traerCuentas: () => Promise<void>) {
  const edicion = ref(liquidacionCerrada());
  async function abrir(): Promise<void> {
    if (!ficha.value) return;
    edicion.value = liquidacionDelRetiro(ficha.value, fechaDeHoy());
    await traerCuentas();
  }
  const cerrar = (): void => {
    edicion.value.abierta = false;
  };
  const escribirDevuelto = (texto: string): void => {
    edicion.value = conDevuelto(edicion.value, texto);
  };
  const escribirFaltante = (texto: string): void => {
    edicion.value = conFaltante(edicion.value, texto);
  };
  return { edicion, abrir, cerrar, escribirDevuelto, escribirFaltante };
}

/** Confirma con el resumen de lo que pasará en Bancos (depósito y faltante); `true` si el usuario acepta. */
function confirmarLaLiquidacion(edicion: EdicionDeLiquidacion, cuentas: { texto: string; valor: string }[]) {
  const cuenta = cuentas.find(({ valor }) => valor === edicion.cuentaBancariaId)?.texto.split(' · ')[0];
  return usarAvisos().confirmar({
    titulo: 'Confirmar la liquidación',
    mensaje: resumenDeLaLiquidacion(edicion, cuenta ?? 'la cuenta del retiro'),
    textoConfirmar: 'Liquidar el retiro',
  });
}

/**
 * La ventana «Liquidar»: propone devolver todo lo que sobró, deja repartirlo entre lo devuelto y el faltante (con su
 * motivo) y confirma con el resumen de lo que pasará en Bancos. Avisa si quien liquida es el custodio.
 */
export function usarLiquidacionDeRetiro(ficha: FichaActual, alTerminar: () => Promise<void>) {
  const { enviando, errores, enviar } = usarFormulario();
  const cuentas = usarCuentasDelDeposito();
  const ventana = usarVentanaDeLiquidacion(ficha, cuentas.traer);

  async function confirmar(): Promise<void> {
    const retiro = ficha.value;
    if (!retiro) return;
    errores.value = erroresDeLaLiquidacion(ventana.edicion.value, fechaDeHoy());
    if (Object.keys(errores.value).length > 0) return;
    if (!(await confirmarLaLiquidacion(ventana.edicion.value, cuentas.opciones.value))) return;
    const solicitud = solicitudDeLiquidacion(ventana.edicion.value);
    const resultado = ref<Retiro | null>(null);
    if (!(await enviar(async () => void (resultado.value = await apiRetiros.liquidar(retiro.id, solicitud))))) return;
    ventana.cerrar();
    usarAvisos().exito(`Retiro ${retiro.numero} liquidado.`);
    for (const aviso of resultado.value?.avisos ?? []) usarAvisos().info(aviso);
    await alTerminar();
  }

  const abrir = async (): Promise<void> => {
    errores.value = {};
    await ventana.abrir();
  };

  return { ...ventana, abrir, enviando, errores, confirmar, opcionesDeCuentas: cuentas.opciones };
}
