import { computed, ref, type ComputedRef, type Ref } from 'vue';
import { useRouter } from 'vue-router';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { apiComprobantes } from '../../servicios/comprobantes.api';
import type { ComprobanteDeLaBandeja } from '../../servicios/tipos-de-comprobantes';
import type { Vale } from '../../servicios/tipos-de-vales';
import { apiValesProvisionales } from '../../servicios/vales-provisionales.api';
import {
  edicionDeAsignacion,
  faltantesDeLaAsignacion,
  resumenDeAsignacion,
  sePuedeMarcar,
  type EdicionDeAsignacion,
} from '../comprobantes/armado-de-asignacion';
import { edicionDeVale, faltaDelGastoSinFactura, type EdicionDeVale } from '../comprobantes/edicion-de-vale';
import { usarConceptosDeGasto } from '../comprobantes/usar-conceptos-de-gasto';
import { usarVentanaDeAccion } from '../usar-ventana-de-accion';
import {
  cuadroDeLaLiquidacion,
  cuerpoDeLaLiquidacion,
  resumenDeLaConfirmacion,
  type CuadroDeLaLiquidacion,
} from './edicion-de-liquidacion';

/** Lo que se elige para justificar el vale: documentos de la bandeja y gastos sin factura. */
interface Elegidos {
  documentos: ComprobanteDeLaBandeja[];
  gastos: EdicionDeVale[];
}

/** Los gastos sin factura que se arman en la página: la ventana los valida y los agrega a la lista, sin enviar nada. */
function usarGastosSinFactura() {
  const gastos = ref<EdicionDeVale[]>([]);
  const { conceptos, traer } = usarConceptosDeGasto();
  const ventana = usarVentanaDeAccion({
    inicial: edicionDeVale,
    validar: faltaDelGastoSinFactura,
    alAbrir: traer,
    enviar: async (edicion) => ({ ...edicion }),
    exito: 'Gasto agregado a la liquidación.',
    alTerminar: (gasto) => gastos.value.push(gasto),
  });
  return { gastos, conceptos, ventana, quitar: (indice: number) => gastos.value.splice(indice, 1) };
}

/** Qué documentos de la bandeja se marcaron para justificar el vale. */
function usarMarcados(documentos: Ref<ComprobanteDeLaBandeja[]>) {
  const marcados = ref<string[]>([]);
  const elegidos = computed(() => documentos.value.filter(({ id }) => marcados.value.includes(id)));
  const alternar = (documento: ComprobanteDeLaBandeja): void => {
    if (!sePuedeMarcar(documento)) return;
    const ya = marcados.value.includes(documento.id);
    marcados.value = ya ? marcados.value.filter((id) => id !== documento.id) : [...marcados.value, documento.id];
  };
  return { marcados, elegidos, alternar };
}

/** Lo que `usarEnvio` necesita para liquidar. */
interface DatosDelEnvio {
  vale: Ref<Vale | null>;
  elegidos: ComputedRef<Elegidos>;
  asignacion: Ref<EdicionDeAsignacion>;
  cuadro: ComputedRef<CuadroDeLaLiquidacion>;
}

/** Revisa los motivos, pide la confirmación, liquida y vuelve a la ficha del fondo con el enlace a la hoja del vale. */
function usarEnvio({ vale, elegidos, asignacion, cuadro }: DatosDelEnvio) {
  const router = useRouter();
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();

  async function liquidar(): Promise<void> {
    const actual = vale.value;
    errores.value = faltantesDeLaAsignacion(elegidos.value.documentos, asignacion.value);
    if (!actual || Object.keys(errores.value).length > 0) return;
    const mensaje = resumenDeLaConfirmacion(actual, cuadro.value);
    if (!(await avisos.confirmar({ titulo: 'Liquidar el vale', mensaje, textoConfirmar: 'Liquidar' }))) return;
    const cuerpo = cuerpoDeLaLiquidacion(elegidos.value, asignacion.value);
    let hecho: Vale | undefined;
    const bien = await enviar(async () => (hecho = await apiValesProvisionales.liquidar(actual.id, cuerpo)));
    if (!bien || !hecho) return;
    avisos.exito(`Vale ${hecho.numero} liquidado. Regresaron al fondo ${formatearMonto(hecho.devuelto)}.`, {
      texto: 'Imprimir el vale',
      ruta: { name: 'caja-chica.vales.imprimir', params: { id: hecho.id } },
    });
    hecho.avisos.forEach((aviso) => avisos.info(aviso));
    await router.push({ name: 'caja-chica.fondos.ficha', params: { id: hecho.fondoId } });
  }
  return { enviando, errores, liquidar };
}

/** El vale y la bandeja de documentos, que se traen al abrir la página. */
function usarCargas(valeId: string) {
  const vale = usarCarga(
    () => apiValesProvisionales.obtener(valeId),
    null as Vale | null,
    'No se pudo cargar el vale.',
  );
  const bandeja = usarCarga(
    () => apiComprobantes.bandeja(),
    [] as ComprobanteDeLaBandeja[],
    'No se pudo cargar la bandeja.',
  );
  return { vale, bandeja };
}

/**
 * Liquidar un vale provisional en un solo paso: marcar los documentos de la bandeja que lo justifican, agregar los gastos
 * sin factura y ver al momento cuánto se gastó y cuánto regresa al fondo. Los motivos de las excepciones (retención, tope)
 * se piden una sola vez para todos los documentos.
 */
export function usarLiquidacionDeVale(valeId: string) {
  const { vale, bandeja } = usarCargas(valeId);
  const documentos = usarMarcados(bandeja.datos);
  const gastos = usarGastosSinFactura();
  const asignacion = ref(edicionDeAsignacion());
  const elegidos = computed(() => ({ documentos: documentos.elegidos.value, gastos: gastos.gastos.value }));
  const cuadro = computed(() => cuadroDeLaLiquidacion(vale.datos.value ?? { monto: '0.00' }, elegidos.value));
  const envio = usarEnvio({ vale: vale.datos, elegidos, asignacion, cuadro });

  return {
    ...documentos,
    ...envio,
    vale: vale.datos,
    cargando: vale.cargando,
    bandeja: bandeja.datos,
    gastos: gastos.gastos,
    conceptos: gastos.conceptos,
    ventanaDeGasto: gastos.ventana,
    quitarGasto: gastos.quitar,
    asignacion,
    resumenDeDocumentos: computed(() => resumenDeAsignacion(documentos.elegidos.value)),
    cuadro,
  };
}
