import { computed, ref, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { formatearFecha } from '@/modulos/core/utilidades/formato';
import type { RevisionDeCierre } from '../servicios/cierre-de-carga.tipos';
import { apiDatosDeEmpresa, type CargaInicial } from '../servicios/datos-de-empresa.api';
import { RECORDATORIO_DE_CUADRE } from './datos-de-empresa';
import {
  AVISO_DE_REVISION_DESACTUALIZADA,
  interpretarErrorDelCierre,
  motivoParaEnviar,
  problemaDelMotivo,
} from './revision-de-cierre';

/** Lo que explica la ventana antes de pedir la confirmación. */
export const textoDelCierre = (fechaDeInicio: string | null) =>
  `La fecha de inicio (${formatearFecha(fechaDeInicio)}) quedará fija y ya no se podrán registrar saldos iniciales. Solo quien tenga el permiso de reabrir la carga inicial podrá reabrirla, indicando el motivo. ${RECORDATORIO_DE_CUADRE}`;

/** La revisión que muestra la ventana y cómo traerla del servidor. */
function usarRevisionDelCierre() {
  const avisos = usarAvisos();
  const revision = ref<RevisionDeCierre | null>(null);
  const cargando = ref(false);

  async function traer(empresaId: string): Promise<boolean> {
    cargando.value = true;
    try {
      revision.value = await apiDatosDeEmpresa.revisionDeCierre(empresaId);
      return true;
    } catch (error) {
      avisos.error(error instanceof Error ? error.message : 'No se pudo revisar la carga inicial.');
      return false;
    } finally {
      cargando.value = false;
    }
  }

  return { revision, cargando, traer };
}

/** Lo que hay en pantalla mientras la ventana está abierta. */
function usarEstadoDeLaVentana() {
  const abierta = ref(false);
  const motivo = ref('');
  const avisoDeCambio = ref('');
  return { abierta, motivo, avisoDeCambio };
}

type RevisionDelCierre = ReturnType<typeof usarRevisionDelCierre>;
type EstadoDeLaVentana = ReturnType<typeof usarEstadoDeLaVentana>;

interface ContextoDelCierre {
  carga: Ref<CargaInicial | null>;
  errores: Ref<Record<string, string>>;
  revision: RevisionDelCierre;
  ventana: EstadoDeLaVentana;
}

/**
 * `true` si se cerró. Si el servidor pidió volver a revisar o corregir el motivo, deja la ventana lista (revisión
 * nueva, aviso o error en el campo) y da `false`; cualquier otro error se propaga.
 */
async function intentarCerrar(empresaId: string, { carga, errores, revision, ventana }: ContextoDelCierre) {
  try {
    const huella = revision.revision.value?.huella;
    carga.value = await apiDatosDeEmpresa.cerrarCargaInicial(empresaId, {
      motivo: motivoParaEnviar(ventana.motivo.value),
      huella,
    });
    return true;
  } catch (error) {
    const resultado = interpretarErrorDelCierre(error);
    if (resultado.tipo === 'otro') throw error;
    if (resultado.revision) revision.revision.value = resultado.revision;
    else if (resultado.tipo === 'desactualizada') await revision.traer(empresaId);
    if (resultado.tipo === 'motivo') errores.value = { motivo: resultado.mensaje };
    else ventana.avisoDeCambio.value = AVISO_DE_REVISION_DESACTUALIZADA;
    return false;
  }
}

/** Abre la ventana vacía y trae la revisión; si no se pudo revisar, no la deja abierta. */
async function abrirVentana(empresaId: string, { errores, revision, ventana }: ContextoDelCierre): Promise<void> {
  [ventana.motivo.value, ventana.avisoDeCambio.value, revision.revision.value] = ['', '', null];
  [errores.value, ventana.abierta.value] = [{}, true];
  if (!(await revision.traer(empresaId))) ventana.abierta.value = false;
}

type Enviar = ReturnType<typeof usarFormulario>['enviar'];

/** Revisa el motivo, cierra y, si todo salió bien, cierra la ventana y lo avisa. */
async function confirmarCierre(empresaId: string, contexto: ContextoDelCierre, enviar: Enviar): Promise<void> {
  const vista = contexto.revision.revision.value;
  if (!vista) return;
  const problema = problemaDelMotivo(contexto.ventana.motivo.value, vista.pideMotivo, vista.diferencias);
  if (problema) return void (contexto.errores.value = { motivo: problema });
  let cerrada = false;
  if (!(await enviar(async () => (cerrada = await intentarCerrar(empresaId, contexto)))) || !cerrada) return;
  contexto.ventana.abierta.value = false;
  usarAvisos().exito('Carga inicial cerrada. Quedó registrada en la auditoría.');
}

/**
 * Cerrar la carga inicial de la empresa que se edita: abre una ventana con lo que encontró cada módulo, pide el
 * motivo solo si algún hallazgo lo exige y manda junto la huella de lo que se vio; si los saldos cambiaron mientras
 * tanto, el servidor rechaza el cierre y la ventana muestra la revisión nueva.
 */
export function usarCierreDeCarga(empresaId: () => string | null, carga: Ref<CargaInicial | null>) {
  const { enviando, errores, enviar } = usarFormulario();
  const revision = usarRevisionDelCierre();
  const ventana = usarEstadoDeLaVentana();
  const contexto = { carga, errores, revision, ventana };
  const conId = (accion: (id: string) => Promise<void>) => async () => {
    const id = empresaId();
    if (id) await accion(id);
  };

  return {
    ...ventana,
    cargandoRevision: revision.cargando,
    revision: revision.revision,
    pideMotivo: computed(() => revision.revision.value?.pideMotivo ?? false),
    enviando,
    errores,
    abrir: conId((id) => abrirVentana(id, contexto)),
    confirmar: conId((id) => confirmarCierre(id, contexto, enviar)),
    cancelar: () => (ventana.abierta.value = false),
    fijarMotivo: (texto: string) => (ventana.motivo.value = texto),
  };
}
