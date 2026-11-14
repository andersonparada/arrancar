import { ref, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { quitarErrorAlCambiar, usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiContrasenas, type DocumentosDisponibles, type FichaDeContrasena } from '../../servicios/contrasenas.api';
import { usarAccionConMotivo } from '../usar-baja-con-motivo';
import { alternarMarca, SIN_DOCUMENTOS_DISPONIBLES } from './edicion-de-contrasena';
import {
  AVISO_DE_RECUPERAR_EL_ORIGINAL,
  AVISO_DE_REIMPRESION,
  cambiosDeContrasena,
  edicionDeCambioDe,
  edicionDeCambioVacia,
  erroresDeCambio,
  resumenDeAgregarDocumentos,
} from './ficha-de-contrasena';

export type FichaActual = Readonly<Ref<FichaDeContrasena | null>>;
type AlTerminar = () => Promise<void>;

/** El estado común de una ventana: lo que se escribe, los errores por campo y cerrarla sin perder el resto. */
function usarVentana<T extends { abierta: boolean }>(inicial: T) {
  const { enviando, errores, enviar } = usarFormulario();
  const edicion = ref(inicial) as Ref<T>;
  const cerrar = (): void => {
    edicion.value.abierta = false;
  };
  return { edicion, enviando, errores, enviar, cerrar };
}

/** Cambiar la fecha prometida (con motivo) y las observaciones, en una ventana. */
export function usarCambioDeContrasena(ficha: FichaActual, alTerminar: AlTerminar) {
  const { edicion, enviando, errores, enviar, cerrar } = usarVentana(edicionDeCambioVacia());
  for (const campo of ['fechaDePago', 'observaciones', 'motivo'] as const) {
    quitarErrorAlCambiar(errores, campo, () => edicion.value[campo]);
  }
  const abrir = (): void => {
    if (ficha.value) edicion.value = edicionDeCambioDe(ficha.value);
    errores.value = {};
  };

  async function guardar(): Promise<void> {
    if (!ficha.value) return;
    const { id, impresa } = ficha.value;
    errores.value = erroresDeCambio(edicion.value, ficha.value);
    const cambios = cambiosDeContrasena(edicion.value, ficha.value);
    if (Object.keys(errores.value).length > 0 || !cambios) return;
    if (!(await enviar(() => apiContrasenas.editar(id, cambios)))) return;
    cerrar();
    usarAvisos().exito(impresa ? `Contraseña actualizada. ${AVISO_DE_REIMPRESION}` : 'Contraseña actualizada.');
    await alTerminar();
  }

  return { edicion, enviando, errores, abrir, cerrar, guardar };
}

/** Quitar un documento de la contraseña, con motivo; si ya se imprimió, el aviso final recuerda cambiar el papel. */
export function usarQuitarDocumento(ficha: FichaActual, id: () => string, alTerminar: AlTerminar) {
  return usarAccionConMotivo(
    (documentoId, motivo) => apiContrasenas.quitarDocumento(id(), documentoId, motivo),
    () => (ficha.value?.impresa ? `Documento quitado. ${AVISO_DE_REIMPRESION}` : 'Documento quitado.'),
    alTerminar,
  );
}

/** Anular la contraseña, con motivo. */
export function usarAnularContrasena(ficha: FichaActual, id: () => string, alTerminar: AlTerminar) {
  return usarAccionConMotivo(
    (_, motivo) => apiContrasenas.anular(id(), motivo),
    () =>
      ficha.value?.impresa
        ? `Contraseña anulada. ${AVISO_DE_RECUPERAR_EL_ORIGINAL}`
        : 'Contraseña anulada: sus documentos quedaron libres.',
    alTerminar,
  );
}

/** Lo que se marca en la ventana de agregar: ids de facturas y de notas. */
export interface MarcasParaAgregar {
  abierta: boolean;
  cargos: string[];
  notas: string[];
}

/** Trae lo que el proveedor de la contraseña tiene disponible (no incluye lo que ya está en una contraseña vigente). */
function usarDisponiblesDelProveedor() {
  const disponibles = ref<DocumentosDisponibles>(SIN_DOCUMENTOS_DISPONIBLES);
  const cargando = ref(false);
  async function traer(proveedorId: string): Promise<void> {
    disponibles.value = SIN_DOCUMENTOS_DISPONIBLES;
    cargando.value = true;
    try {
      disponibles.value = await apiContrasenas.disponibles(proveedorId);
    } catch (error) {
      usarAvisos().error(error instanceof Error ? error.message : 'No se pudieron cargar los documentos.');
    } finally {
      cargando.value = false;
    }
  }
  return { disponibles, cargando, traer };
}

/** Las casillas de la ventana de agregar. */
function usarMarcasParaAgregar(edicion: Ref<MarcasParaAgregar>, disponibles: Ref<DocumentosDisponibles>) {
  return {
    alternarCargo: (id: string) => (edicion.value.cargos = alternarMarca(edicion.value.cargos, id)),
    alternarNota: (id: string) => (edicion.value.notas = alternarMarca(edicion.value.notas, id)),
    marcarCargos: (marcar: boolean) =>
      (edicion.value.cargos = marcar ? disponibles.value.cargos.map((cargo) => cargo.documentoId) : []),
    marcarNotas: (marcar: boolean) =>
      (edicion.value.notas = marcar ? disponibles.value.notas.map((nota) => nota.documentoId) : []),
  };
}

const sinMarcas = (): MarcasParaAgregar => ({ abierta: false, cargos: [], notas: [] });

type Ventana = ReturnType<typeof usarVentana<MarcasParaAgregar>>;

/** Confirma (solo si ya se imprimió, porque cambia el papel) y agrega los documentos; devuelve `true` si se agregaron. */
async function enviarLoAgregado(ficha: FichaDeContrasena, documentos: string[], ventana: Ventana): Promise<boolean> {
  const mensaje = resumenDeAgregarDocumentos(ficha, documentos.length);
  const confirmado =
    !ficha.impresa ||
    (await usarAvisos().confirmar({ titulo: 'Agregar documentos', mensaje, textoConfirmar: 'Agregar' }));
  return confirmado && ventana.enviar(() => apiContrasenas.agregarDocumentos(ficha.id, documentos));
}

/** El botón «Agregar» de la ventana: pide al menos un documento, confirma si hace falta y recarga la ficha. */
function usarEnvioDeLoAgregado(ficha: FichaActual, ventana: Ventana, alTerminar: AlTerminar) {
  return async (): Promise<void> => {
    const documentos = [...ventana.edicion.value.cargos, ...ventana.edicion.value.notas];
    if (!ficha.value) return;
    const { impresa } = ficha.value;
    if (documentos.length === 0) {
      ventana.errores.value = { documentos: 'Marque al menos un documento para agregar.' };
      return;
    }
    if (!(await enviarLoAgregado(ficha.value, documentos, ventana))) return;
    ventana.cerrar();
    usarAvisos().exito(impresa ? `Documentos agregados. ${AVISO_DE_REIMPRESION}` : 'Documentos agregados.');
    await alTerminar();
  };
}

/** Agregar documentos: trae lo disponible del proveedor, deja marcar y, si ya se imprimió, confirma el aviso. */
export function usarAgregarDocumentos(ficha: FichaActual, alTerminar: AlTerminar) {
  const ventana = usarVentana(sinMarcas());
  const proveedor = usarDisponiblesDelProveedor();
  const abrir = async (): Promise<void> => {
    if (!ficha.value) return;
    ventana.edicion.value = { ...sinMarcas(), abierta: true };
    ventana.errores.value = {};
    await proveedor.traer(ficha.value.proveedorId);
  };
  return {
    ...ventana,
    ...proveedor,
    abrir,
    agregar: usarEnvioDeLoAgregado(ficha, ventana, alTerminar),
    ...usarMarcasParaAgregar(ventana.edicion, proveedor.disponibles),
  };
}
