import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { nombreDelMedio, medioPorOmision } from '../anticipos/opciones-de-medios';
import { apiAnticipos, type Anticipo } from '../../servicios/anticipos.api';
import { apiGastos, type Gasto } from '../../servicios/gastos.api';
import { apiOpciones, type MediosParaElegir } from '../../servicios/opciones.api';
import { fechaDeHoy } from '../reportes/fechas-de-reportes';
import {
  alEscribirDevuelto,
  alEscribirNoLiquidado,
  cuadreDeLaLiquidacion,
  edicionDeLiquidacionInicial,
  erroresDeLaLiquidacion,
  solicitudDeLiquidacion,
  type EdicionDeLiquidacion,
} from './edicion-de-liquidacion';
import { resumenDeLaLiquidacion } from './resumen-de-liquidacion';

/** El anticipo y las cuentas de Bancos, traídos al abrir; el formulario se arma cuando llega el anticipo. */
function usarDatosDeLaLiquidacion(id: () => string) {
  const avisos = usarAvisos();
  const anticipo = ref<Anticipo | null>(null);
  const medios = ref<MediosParaElegir | null>(null);
  const gastos = ref<Gasto[]>([]);
  const cargando = ref(true);

  onMounted(async () => {
    try {
      [anticipo.value, gastos.value, medios.value] = await Promise.all([
        apiAnticipos.obtener(id()),
        apiGastos.delAnticipo(id()),
        apiOpciones.mediosParaLiquidar(),
      ]);
    } catch (error) {
      avisos.error(error instanceof Error ? error.message : 'No se pudo preparar la liquidación.');
    } finally {
      cargando.value = false;
    }
  });
  return { anticipo, medios, gastos, cargando };
}

/** Los nombres de la cuenta del depósito y del medio del reembolso, para el resumen de confirmación. */
function nombresParaElResumen(edicion: EdicionDeLiquidacion, medios: MediosParaElegir | null) {
  return {
    cuentaDelDeposito: nombreDelMedio('nota_de_debito', medios, edicion.cuentaDelDeposito),
    medioDelReembolso: nombreDelMedio(edicion.formaDelReembolso, medios, edicion.medioDelReembolso),
  };
}

type Datos = ReturnType<typeof usarDatosDeLaLiquidacion>;

/** Lo escrito: se arma con lo que falta por justificar en cuanto llega el anticipo; el medio del reembolso sigue a la forma. */
function usarLoEscrito({ anticipo, medios }: Datos) {
  const edicion = reactive(edicionDeLiquidacionInicial({ porJustificar: '0.00', esEmpleado: true }, fechaDeHoy()));
  watch(anticipo, (actual) => {
    if (!actual) return;
    Object.assign(edicion, edicionDeLiquidacionInicial(actual, fechaDeHoy()));
    edicion.medioDelReembolso = medioPorOmision(edicion.formaDelReembolso, medios.value);
    edicion.cuentaDelDeposito = medioPorOmision('nota_de_debito', medios.value);
  });
  watch(
    () => edicion.formaDelReembolso,
    (forma) => {
      edicion.medioDelReembolso = medioPorOmision(forma, medios.value);
    },
  );
  return edicion;
}

/** Valida, confirma con el resumen y liquida; al terminar avisa (con lo que dijo el servidor) y vuelve a la ficha. */
function usarEnvioDeLaLiquidacion(datos: Datos, edicion: EdicionDeLiquidacion) {
  const router = useRouter();
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();

  async function liquidar(): Promise<void> {
    const actual = datos.anticipo.value;
    if (!actual) return;
    errores.value = erroresDeLaLiquidacion(edicion, actual, fechaDeHoy());
    if (Object.keys(errores.value).length > 0) return;
    const confirmado = await avisos.confirmar({
      titulo: 'Confirmar la liquidación',
      mensaje: resumenDeLaLiquidacion(edicion, actual, nombresParaElResumen(edicion, datos.medios.value)),
      textoConfirmar: 'Liquidar el anticipo',
    });
    if (!confirmado) return;
    const solicitud = solicitudDeLiquidacion(edicion, actual);
    let delServidor: string[] = [];
    if (!(await enviar(async () => (delServidor = (await apiAnticipos.liquidar(actual.id, solicitud)).avisos)))) return;
    avisos.exito(`Anticipo ${actual.numero} liquidado.`);
    delServidor.forEach((aviso) => avisos.info(aviso));
    await router.push({ name: 'cuentas-por-liquidar.anticipos.ficha', params: { id: actual.id } });
  }
  return { enviando, errores, liquidar };
}

/**
 * La pantalla «Liquidar anticipo»: lo que falta por justificar se reparte entre lo devuelto y lo no liquidado (el cuadre se ve en
 * vivo) o, si se gastó de más, se reembolsa. Valida, confirma con el resumen y liquida; al terminar vuelve a la ficha.
 */
export function usarLiquidacion(id: () => string) {
  const datos = usarDatosDeLaLiquidacion(id);
  const { anticipo } = datos;
  const edicion = usarLoEscrito(datos);
  return {
    ...datos,
    ...usarEnvioDeLaLiquidacion(datos, edicion),
    edicion,
    cuadre: computed(() => (anticipo.value ? cuadreDeLaLiquidacion(edicion, anticipo.value) : null)),
    escribirDevuelto: (valor: string): void => {
      if (anticipo.value) alEscribirDevuelto(edicion, anticipo.value, valor);
    },
    escribirNoLiquidado: (valor: string): void => {
      if (anticipo.value) alEscribirNoLiquidado(edicion, anticipo.value, valor);
    },
  };
}
