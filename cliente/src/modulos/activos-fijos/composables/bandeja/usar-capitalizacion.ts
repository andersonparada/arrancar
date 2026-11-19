import { computed, reactive, ref, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { ErrorApi } from '@/modulos/core/servicios/cliente-http';
import { apiBandeja, type Capitalizacion, type LineaDeBandeja } from '../../servicios/bandeja.api';
import { asignacionAdicional, asignacionInicial, sinRepartirDeLaLinea } from './edicion-de-capitalizacion';
import type { EdicionDeAsignacion } from './edicion-de-capitalizacion';
import { solicitudDeCapitalizacion, type ContextoDeSolicitud } from './solicitud-de-capitalizacion';
import { mensajeDeCapitalizado, resumenDeCapitalizacion } from './textos-de-bandeja';
import { usarCatalogosDeCapitalizacion } from './usar-catalogos-de-capitalizacion';
import { erroresDeCapitalizacion, erroresDeRenglones, type RenglonRechazado } from './validar-capitalizacion';

type Catalogos = ReturnType<typeof usarCatalogosDeCapitalizacion>;

/** Los renglones que el servidor rechazó por código repetido o usado, si el error es de esos. */
function renglonesRechazados(error: unknown): RenglonRechazado[] | null {
  if (!(error instanceof ErrorApi) || error.codigo !== 'codigos_de_unidades_repetidos') return null;
  return (error.detalles as { renglones?: RenglonRechazado[] } | undefined)?.renglones ?? null;
}

/** Las líneas elegidas y su reparto en partes: cada línea empieza con una y se puede repartir en más. */
function usarPartesDeCapitalizacion() {
  const lineas = ref<LineaDeBandeja[]>([]);
  const partes = ref<EdicionDeAsignacion[]>([]);
  let siguienteClave = 1;

  function empezar(elegidas: LineaDeBandeja[]): void {
    lineas.value = elegidas;
    partes.value = elegidas.map((linea) => asignacionInicial(linea, siguienteClave++));
  }

  function repartir(linea: LineaDeBandeja): void {
    const deLaLinea = partes.value.filter((parte) => parte.lineaId === linea.lineaId);
    const despues = partes.value.indexOf(deLaLinea[deLaLinea.length - 1]!) + 1;
    const resto = sinRepartirDeLaLinea(linea, deLaLinea);
    partes.value.splice(despues, 0, asignacionAdicional(linea, siguienteClave++, resto));
  }

  const quitar = (clave: number): void => {
    partes.value = partes.value.filter((parte) => parte.clave !== clave);
  };

  return { lineas, partes, empezar, repartir, quitar };
}

type ErroresRef = Ref<Record<string, string>>;

/** Manda la capitalización; si el servidor rechaza códigos de la cuadrícula, los marca en su renglón. */
async function mandarCapitalizacion(partes: EdicionDeAsignacion[], contexto: ContextoDeSolicitud, errores: ErroresRef) {
  try {
    return await apiBandeja.capitalizar(solicitudDeCapitalizacion(partes, contexto));
  } catch (error) {
    const rechazados = renglonesRechazados(error);
    if (rechazados) errores.value = erroresDeRenglones(rechazados, partes);
    throw error;
  }
}

/** Revisa antes de mandar, manda y reparte los errores del servidor entre los campos y los renglones. */
function usarEnvio(lineas: Ref<LineaDeBandeja[]>, partes: Ref<EdicionDeAsignacion[]>, catalogos: Catalogos) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();

  /** @returns `true` si el servidor capitalizó. */
  async function confirmar(): Promise<boolean> {
    const contexto = { lineas: lineas.value, clases: catalogos.clases, activos: catalogos.activos };
    errores.value = erroresDeCapitalizacion(partes.value, contexto);
    if (Object.keys(errores.value).length > 0) {
      avisos.error('Revise los campos marcados antes de capitalizar.');
      return false;
    }
    let resultado: Capitalizacion | null = null;
    if (!(await enviar(async () => (resultado = await mandarCapitalizacion(partes.value, contexto, errores)))))
      return false;
    if (resultado) avisos.exito(mensajeDeCapitalizado(resultado));
    return true;
  }

  return { enviando, errores, confirmar };
}

/**
 * La ventana «Capitalizar»: las líneas elegidas, su reparto en partes (cada una con su destino) y el envío. Revisa
 * antes de mandar y pone cada error en su campo; los códigos de la cuadrícula que el servidor rechaza, en su renglón.
 */
export function usarCapitalizacion(alTerminar: () => Promise<void>) {
  const catalogos = usarCatalogosDeCapitalizacion();
  const { lineas, partes, empezar, ...edicion } = usarPartesDeCapitalizacion();
  const { enviando, errores, confirmar: enviar } = usarEnvio(lineas, partes, catalogos);
  const abierta = ref(false);
  const resumen = computed(() => resumenDeCapitalizacion(partes.value, lineas.value));

  async function abrir(elegidas: LineaDeBandeja[]): Promise<void> {
    empezar(elegidas);
    errores.value = {};
    abierta.value = true;
    await catalogos.cargar();
  }

  async function confirmar(): Promise<void> {
    if (!(await enviar())) return;
    abierta.value = false;
    await alTerminar();
  }

  return reactive({ abierta, lineas, partes, errores, enviando, resumen, catalogos, abrir, confirmar, ...edicion });
}
