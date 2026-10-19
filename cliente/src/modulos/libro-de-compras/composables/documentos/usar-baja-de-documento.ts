import { ref, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiDocumentos, type FichaDeDocumento } from '../../servicios/documentos.api';
import {
  datosDeAnulacion,
  edicionDeAnulacionVacia,
  erroresDeAnulacion,
  mensajeDeEliminacion,
  type EdicionDeAnulacion,
} from './reglas-de-baja-de-documento';

type FichaActual = Readonly<Ref<FichaDeDocumento | null>>;
type Peticion = ReturnType<typeof usarPeticion>;

/** Envía a la API y devuelve la respuesta, o `null` si falló (los errores ya se mostraron en la pantalla). */
function usarPeticion() {
  const { enviando, errores, enviar } = usarFormulario();

  async function pedir<T>(accion: () => Promise<T>): Promise<{ respuesta: T } | null> {
    let resultado: { respuesta: T } | null = null;
    await enviar(async () => {
      resultado = { respuesta: await accion() };
    });
    return resultado;
  }

  return { enviando, errores, pedir };
}

/** Los avisos que no bloquean (p. ej. período que puede estar declarado) se muestran uno por uno. */
function mostrarAvisos(lista: string[]): void {
  const avisos = usarAvisos();
  lista.forEach((aviso) => avisos.info(aviso));
}

function usarAnulacion(ficha: FichaActual, { errores, pedir }: Peticion, alAnular: (f: FichaDeDocumento) => void) {
  const edicion = ref<EdicionDeAnulacion>(edicionDeAnulacionVacia());

  function abrir(): void {
    edicion.value = { ...edicionDeAnulacionVacia(), abierta: true };
    errores.value = {};
  }

  async function anular(): Promise<void> {
    if (!ficha.value) return;
    errores.value = erroresDeAnulacion(edicion.value);
    if (Object.keys(errores.value).length > 0) return;
    const { id } = ficha.value;
    const resultado = await pedir(() => apiDocumentos.anular(id, datosDeAnulacion(edicion.value)));
    if (!resultado) return;
    edicion.value.abierta = false;
    alAnular(resultado.respuesta.documento);
    usarAvisos().exito('Registro anulado. La factura sigue vigente en la SAT.');
    mostrarAvisos(resultado.respuesta.avisos);
  }

  return { edicion, abrir, anular };
}

async function eliminarConConfirmacion(ficha: FichaDeDocumento, { pedir }: Peticion, alEliminar: () => void) {
  const avisos = usarAvisos();
  const confirmado = await avisos.confirmar({
    titulo: 'Eliminar factura',
    mensaje: mensajeDeEliminacion(ficha),
    textoConfirmar: 'Eliminar',
    peligroso: true,
  });
  const resultado = confirmado ? await pedir(() => apiDocumentos.eliminar(ficha.id)) : null;
  if (!resultado) return;
  alEliminar();
  avisos.exito('Factura eliminada.');
  mostrarAvisos(resultado.respuesta?.avisos ?? []);
}

/**
 * Anular el registro (con causa y motivo, en una ventana) y eliminarlo (con confirmación). `alAnular` recibe la
 * ficha ya anulada y `alEliminar` se llama cuando el documento dejó de existir.
 */
export function usarBajaDeDocumento(
  ficha: FichaActual,
  alAnular: (ficha: FichaDeDocumento) => void,
  alEliminar: () => void,
) {
  const peticion = usarPeticion();
  const { edicion, abrir, anular } = usarAnulacion(ficha, peticion, alAnular);

  function eliminar(): Promise<void> {
    // Si se pidió desde la ventana de anular, se cierra para que la confirmación quede a la vista.
    edicion.value.abierta = false;
    return ficha.value ? eliminarConConfirmacion(ficha.value, peticion, alEliminar) : Promise.resolve();
  }

  return { edicion, enviando: peticion.enviando, errores: peticion.errores, abrirAnulacion: abrir, anular, eliminar };
}
