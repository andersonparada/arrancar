import { computed, reactive, ref, watch, type Ref } from 'vue';
import { onBeforeRouteLeave, useRouter } from 'vue-router';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { ErrorApi } from '@/modulos/core/servicios/cliente-http';
import { apiDocumentos, type RegistroDeDocumento } from '../../servicios/documentos.api';
import { avisoDeLaFalta } from './avisos-de-la-falta';
import { dejarAvisosDelRegistro } from './avisos-del-registro';
import {
  datosDeDocumento,
  edicionParaOtro,
  edicionVacia,
  erroresDeEdicion,
  pendientesDeEdicion,
  pendientesDelIvaDeLaNota,
  type EdicionDeDocumento,
} from './edicion-de-documento';
import { usarCatalogosDelRegistro } from './usar-catalogos-del-registro';

/** Si lo escrito se pierde al salir, pregunta antes (una vez registrado ya no hay nada que perder). */
function preguntarAntesDeSalir(edicion: EdicionDeDocumento, registrado: Ref<boolean>) {
  const avisos = usarAvisos();
  let inicial = JSON.stringify(edicion);
  onBeforeRouteLeave(async () => {
    if (registrado.value || JSON.stringify(edicion) === inicial) return true;
    return avisos.confirmar({
      titulo: '¿Salir sin registrar?',
      mensaje: 'Lo que escribió en este documento se perderá.',
      textoConfirmar: 'Salir sin registrar',
      peligroso: true,
    });
  });
  return () => (inicial = JSON.stringify(edicion));
}

/** El servidor no supo el IVA de la nota sobre factura anterior: el campo sale a la vista y se vuelve obligatorio. */
function usarPedidoDeIva(edicion: EdicionDeDocumento) {
  const pideElIva = ref(false);
  watch(
    () => edicion.usaFacturaAnterior,
    () => (pideElIva.value = false),
  );
  const pendientesCon = () => [...pendientesDeEdicion(edicion), ...pendientesDelIvaDeLaNota(edicion, pideElIva.value)];
  return { pideElIva, pendientesCon };
}

/** Registrar el documento: valida lo evidente, envía y deja el motivo del rechazo a la vista, no solo en un aviso. */
function usarEnvio(edicion: EdicionDeDocumento) {
  const { enviando, errores, enviar } = usarFormulario();
  const problema = ref<string | null>(null);
  const intentado = ref(false);
  const { pideElIva, pendientesCon } = usarPedidoDeIva(edicion);

  async function registrar(): Promise<RegistroDeDocumento | null> {
    intentado.value = true;
    const falta = pendientesCon();
    problema.value = falta.length > 0 ? avisoDeLaFalta(falta) : null;
    if (falta.length > 0) return null;
    let creado: RegistroDeDocumento | null = null;
    await enviar(async () => {
      try {
        creado = await apiDocumentos.registrar(datosDeDocumento(edicion));
      } catch (error) {
        pideElIva.value = error instanceof ErrorApi && error.codigo === 'iva_de_la_nota_requerido';
        const deCampos = error instanceof ErrorApi && error.erroresCampos.length > 0;
        problema.value = deCampos ? 'Revise los campos marcados.' : error instanceof Error ? error.message : null;
        throw error;
      }
    });
    return creado;
  }

  return { enviando, errores, problema, intentado, pideElIva, pendientesCon, registrar };
}

/** Registrar: con éxito va a la ficha; «y seguir con otro» deja el formulario listo para el próximo documento. */
function usarAcciones(edicion: EdicionDeDocumento, envio: ReturnType<typeof usarEnvio>, registrado: Ref<boolean>) {
  const router = useRouter();
  const avisos = usarAvisos();
  const reiniciarCambios = preguntarAntesDeSalir(edicion, registrado);

  async function registrar(): Promise<void> {
    const creado = await envio.registrar();
    if (!creado) return;
    registrado.value = true;
    dejarAvisosDelRegistro(creado.documento.id, creado.avisos);
    avisos.exito('Documento registrado.');
    await router.push({ name: 'libro-de-ventas.documentos.ficha', params: { documentoId: creado.documento.id } });
  }

  async function registrarYOtro(): Promise<void> {
    const creado = await envio.registrar();
    if (!creado) return;
    avisos.exito(`Documento ${creado.documento.numero} registrado. Siga con el próximo.`);
    creado.avisos.forEach((aviso) => avisos.info(aviso));
    Object.assign(edicion, edicionParaOtro(edicion));
    envio.intentado.value = false;
    reiniciarCambios();
  }

  return { registrar, registrarYOtro };
}

/** El formulario de un documento nuevo: lo escrito, lo que falta y registrar (y seguir con otro). */
export function usarRegistroDeDocumento() {
  const edicion = reactive(edicionVacia(new Date()));
  const catalogos = usarCatalogosDelRegistro(edicion);
  const envio = usarEnvio(edicion);
  const acciones = usarAcciones(edicion, envio, ref(false));
  const { enviando, errores, problema, intentado, pideElIva } = envio;
  const pendientes = computed(() => envio.pendientesCon());
  const erroresLocales = computed(() => erroresDeEdicion(edicion));

  return {
    edicion,
    catalogos,
    enviando,
    errores,
    problema,
    intentado,
    pideElIva,
    pendientes,
    erroresLocales,
    ...acciones,
  };
}
