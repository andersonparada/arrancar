import { computed, ref, watch, type Ref } from 'vue';
import { useRouter, type Router } from 'vue-router';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import type { RetencionDeDocumento } from '../../servicios/documentos.api';
import {
  apiRegistroDeDocumentos,
  type RespuestaDeDocumento,
  type SolicitudDeDocumento,
} from '../../servicios/registro-de-documentos.api';
import { dejarAvisosDelRegistro } from './avisos-del-registro';
import { cuerpoDeDocumento, type EdicionDeDocumento } from './edicion-de-documento';
import { errorDelTipo, problemaDeError, type ProblemaDelFormulario } from './errores-del-registro';

type Avisos = ReturnType<typeof usarAvisos>;

const confirmarElRegimen = (avisos: Avisos, mensaje: string): Promise<boolean> =>
  avisos.confirmar({
    titulo: 'El proveedor cambió de régimen',
    mensaje: `${mensaje} ¿Confirma que esta factura es anterior al cambio de régimen del proveedor?`,
    textoConfirmar: 'Sí, registrarla',
  });

type EstadoDelEnvio = ReturnType<typeof crearEstadoDelEnvio>;

/** Lo que el envío deja a la vista: el problema del formulario y el error del campo «Tipo de documento». */
function crearEstadoDelEnvio() {
  const problema = ref<ProblemaDelFormulario | null>(null);
  const delTipo = ref<Record<string, string>>({});
  return {
    problema,
    delTipo,
    limpiar: () => {
      problema.value = null;
      delTipo.value = {};
    },
  };
}

/** Deja a la vista un error que se corrige en el formulario; `false` si no es de esos y debe relanzarse. */
function mostrarElProblema(estado: EstadoDelEnvio, error: unknown): boolean {
  const delTipo = errorDelTipo(error);
  const problema = problemaDeError(error);
  if (delTipo) estado.delTipo.value = delTipo;
  if (problema && problema.tipo !== 'regimen') estado.problema.value = problema;
  return !!delTipo || !!problema;
}

/**
 * Pide registrar. Los errores que se corrigen dentro del formulario quedan a la vista (y devuelve `null`); el del
 * cambio de régimen se confirma con el usuario y se reenvía. Los de validación por campo se relanzan.
 */
function crearRegistrador(edicion: EdicionDeDocumento, avisos: Avisos, estado: EstadoDelEnvio) {
  const intentar = async (cuerpo: SolicitudDeDocumento): Promise<RespuestaDeDocumento | null> => {
    try {
      return await apiRegistroDeDocumentos.registrar(cuerpo);
    } catch (error) {
      const encontrado = problemaDeError(error);
      if (encontrado?.tipo === 'regimen' && (await confirmarElRegimen(avisos, encontrado.mensaje))) {
        edicion.confirmarCambioDeRegimen = true;
        return intentar({ ...cuerpo, confirmarCambioDeRegimen: true });
      }
      if (!mostrarElProblema(estado, error)) throw error;
      return null;
    }
  };
  return intentar;
}

/** Tras registrar: deja los avisos del servidor para la ficha y va a ella. */
function irAlDocumento(router: Router, avisos: Avisos, { documento, avisos: delServidor }: RespuestaDeDocumento): void {
  avisos.exito('Documento registrado.');
  if (!documento.id) {
    void router.push({ name: 'libro-de-compras.documentos' });
    return;
  }
  dejarAvisosDelRegistro(documento.id, delServidor);
  void router.push({ name: 'libro-de-compras.documentos.ficha', params: { documentoId: documento.id } });
}

/**
 * El envío del formulario: registra el documento, explica dentro del formulario los errores que se pueden corregir
 * (datos fiscales del proveedor, repetido, empresa sin datos…) y, al terminar, va a la ficha del documento.
 */
export function usarEnvioDeDocumento(edicion: EdicionDeDocumento, retenciones: Ref<RetencionDeDocumento[]>) {
  const router = useRouter();
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const estado = crearEstadoDelEnvio();
  const registrado = ref(false);
  const intentar = crearRegistrador(edicion, avisos, estado);

  // Corregir cualquier campo da por atendido el problema anterior.
  watch(edicion, estado.limpiar, { deep: true });

  async function registrar(): Promise<void> {
    const cuerpo = cuerpoDeDocumento(edicion, retenciones.value, 'registro');
    if (!cuerpo) return;
    estado.limpiar();
    const respuesta = ref<RespuestaDeDocumento | null>(null);
    await enviar(async () => (respuesta.value = await intentar(cuerpo)));
    if (!respuesta.value) return;
    registrado.value = true;
    irAlDocumento(router, avisos, respuesta.value);
  }

  const erroresDelEnvio = computed(() => ({ ...errores.value, ...estado.delTipo.value }));
  return { registrar, enviando, errores: erroresDelEnvio, problema: estado.problema, registrado };
}
