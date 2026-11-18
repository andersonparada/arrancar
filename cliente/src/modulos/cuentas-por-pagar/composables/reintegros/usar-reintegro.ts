import { computed, ref, type Ref } from 'vue';
import { useRouter } from 'vue-router';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiPagos, type CuentaParaPagar } from '../../servicios/pagos.api';
import { apiReintegros, type Reintegro } from '../../servicios/reintegros.api';
import type { DocumentoPorPagar } from '../../servicios/tipos';
import { fechaDeHoy } from '../dinero';
import {
  AVISO_DE_EFECTIVO,
  edicionDeReintegro,
  edicionDeReintegroVacia,
  type EdicionDeReintegro,
  erroresDeReintegro,
  opcionesDeCuenta,
  resumenDeReintegro,
  solicitudDeReintegro,
} from './reintegro';

/** Las cuentas de Bancos donde pudo caer el depósito; sin permiso o sin Bancos quedan vacías y solo se ofrece el efectivo. */
function usarCuentasDelDeposito() {
  const cuentas = ref<CuentaParaPagar[]>([]);
  const cargando = ref(false);
  async function traer(): Promise<void> {
    cargando.value = true;
    try {
      cuentas.value = (await apiPagos.medios()).cuentas;
    } catch {
      cuentas.value = [];
    } finally {
      cargando.value = false;
    }
  }
  return { cuentas, cargando, traer };
}

/** Avisa del éxito y de lo que dijo el servidor (y Bancos), que no bloquea. */
function avisarElReintegro(reintegro: Reintegro): void {
  const avisos = usarAvisos();
  avisos.exito(`Reintegro ${reintegro.numero} registrado. Imprima el recibo para firmarlo.`);
  reintegro.avisos.forEach((aviso) => avisos.info(aviso));
}

type Bancos = ReturnType<typeof usarCuentasDelDeposito>;

/** Lo que la ventana muestra: las cuentas por nombre, si no hay ninguna, el resumen de lo que va a pasar y el aviso del efectivo. */
const textosDeLaVentana = (edicion: Ref<EdicionDeReintegro>, bancos: Bancos) => ({
  cuentas: computed(() => opcionesDeCuenta(bancos.cuentas.value)),
  sinCuentas: computed(() => !bancos.cargando.value && bancos.cuentas.value.length === 0),
  resumen: computed(() => resumenDeReintegro(edicion.value, bancos.cuentas.value)),
  avisoDeEfectivo: AVISO_DE_EFECTIVO,
});

/** La ventana: se abre con las notas escogidas, trae las cuentas y, sin ninguna, deja solo el efectivo. */
function usarVentanaDeReintegro() {
  const { enviando, errores, enviar } = usarFormulario();
  const edicion = ref(edicionDeReintegroVacia());
  const bancos = usarCuentasDelDeposito();

  async function abrir(notas: readonly DocumentoPorPagar[]): Promise<void> {
    if (notas.length === 0) return;
    edicion.value = edicionDeReintegro(notas, fechaDeHoy());
    errores.value = {};
    await bancos.traer();
    if (bancos.cuentas.value.length === 0) edicion.value.forma = 'efectivo';
  }
  const cerrar = (): void => {
    edicion.value.abierta = false;
  };
  return {
    edicion,
    enviando,
    errores,
    enviar,
    abrir,
    cerrar,
    ...textosDeLaVentana(edicion, bancos),
  };
}

/**
 * Registrar el reintegro de una o varias notas del mismo proveedor. Al abrir trae las cuentas de Bancos (solo se
 * necesitan en el depósito); al registrar lleva al recibo, que es lo que se imprime y se firma.
 */
export function usarReintegro() {
  const router = useRouter();
  const { enviar, ...ventana } = usarVentanaDeReintegro();
  const { edicion, errores, cerrar } = ventana;

  async function registrar(): Promise<void> {
    errores.value = erroresDeReintegro(edicion.value, fechaDeHoy());
    if (Object.keys(errores.value).length > 0) return;
    let id = '';
    const solicitud = solicitudDeReintegro(edicion.value);
    const listo = await enviar(async () => {
      const reintegro = await apiReintegros.registrar(solicitud);
      id = reintegro.id;
      avisarElReintegro(reintegro);
    });
    if (!listo) return;
    cerrar();
    await router.push({ name: 'cuentas-por-pagar.reintegros.recibo', params: { id } });
  }

  return { ...ventana, registrar };
}

export type RegistroDeReintegro = ReturnType<typeof usarReintegro>;
