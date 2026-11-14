import { computed, reactive, ref, watch, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiContrasenas, type ContrasenaCreada, type DocumentosDisponibles } from '../../servicios/contrasenas.api';
import { fechaDeHoy } from '../dinero';
import { opcionesDeProveedor } from '../filtros-de-documentos';
import { usarProveedoresDelFiltro } from '../usar-lista-de-documentos';
import {
  alternarMarca,
  datosDeContrasena,
  documentosMarcados,
  edicionDeContrasenaVacia,
  erroresDeContrasena,
  fechaDePagoSugerida,
  notasQueTocanBancarizacion,
  resumenDeContrasena,
  totalesDeLaContrasena,
  type EdicionDeContrasena,
} from './edicion-de-contrasena';
import { repartirEnVivo } from './reparto-de-contrasena';

const SIN_DOCUMENTOS: DocumentosDisponibles = { cargos: [], notas: [], fechaDePagoPropuesta: '' };

/** Trae lo que el proveedor tiene disponible; si se cambia de proveedor a mitad, solo vale la última respuesta. */
function usarDocumentosDisponibles() {
  const avisos = usarAvisos();
  const disponibles = ref<DocumentosDisponibles>(SIN_DOCUMENTOS);
  const cargando = ref(false);
  let ultima = 0;

  async function traer(proveedorId: string): Promise<boolean> {
    const peticion = ++ultima;
    disponibles.value = SIN_DOCUMENTOS;
    cargando.value = !!proveedorId;
    if (!proveedorId) return false;
    try {
      const respuesta = await apiContrasenas.disponibles(proveedorId);
      if (peticion !== ultima) return false;
      disponibles.value = respuesta;
      return true;
    } catch (error) {
      if (peticion === ultima)
        avisos.error(error instanceof Error ? error.message : 'No se pudieron cargar los documentos.');
      return false;
    } finally {
      if (peticion === ultima) cargando.value = false;
    }
  }
  return { disponibles, cargando, traer };
}

/** Lo marcado y sus cuentas: reparto de las notas en vivo, totales y aviso de bancarización; las casillas. */
function usarMarcas(edicion: EdicionDeContrasena, disponibles: Ref<DocumentosDisponibles>) {
  const marcados = computed(() => documentosMarcados(edicion, disponibles.value));
  const reparto = computed(() => repartirEnVivo(marcados.value.cargos, marcados.value.notas));
  const ids = (documentos: { documentoId: string }[]) => documentos.map(({ documentoId }) => documentoId);
  return {
    marcados,
    totales: computed(() => totalesDeLaContrasena(marcados.value, reparto.value)),
    notasConAviso: computed(() => notasQueTocanBancarizacion(marcados.value, reparto.value)),
    alternarCargo: (id: string) => (edicion.cargos = alternarMarca(edicion.cargos, id)),
    alternarNota: (id: string) => (edicion.notas = alternarMarca(edicion.notas, id)),
    marcarCargos: (marcar: boolean) => (edicion.cargos = marcar ? ids(disponibles.value.cargos) : []),
    marcarNotas: (marcar: boolean) => (edicion.notas = marcar ? ids(disponibles.value.notas) : []),
  };
}

/** Los proveedores con documentos, por nombre y sin la opción «Todos» del filtro. */
function usarOpcionesDeProveedores() {
  const proveedores = usarProveedoresDelFiltro();
  return computed(() => opcionesDeProveedor(proveedores.value).slice(1));
}

type Marcas = ReturnType<typeof usarMarcas>;

/** Validar, confirmar con el resumen de lo que va a pasar y enviar. */
function usarGuardado(edicion: EdicionDeContrasena, disponibles: Ref<DocumentosDisponibles>, marcas: Marcas) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();

  async function guardar(): Promise<ContrasenaCreada | null> {
    errores.value = erroresDeContrasena(edicion, disponibles.value, fechaDeHoy());
    if (Object.keys(errores.value).length > 0) return null;
    const mensaje = resumenDeContrasena(marcas.marcados.value, marcas.totales.value);
    if (!(await avisos.confirmar({ titulo: 'Crear la contraseña', mensaje, textoConfirmar: 'Crear' }))) return null;
    let creada: ContrasenaCreada | null = null;
    const guardada = await enviar(async () => {
      creada = await apiContrasenas.crear(datosDeContrasena(edicion));
    });
    return guardada ? creada : null;
  }
  return { enviando, errores, guardar };
}

/** La fecha prometida se propone con lo marcado hasta que el usuario la escribe. */
function usarFechaPropuesta(edicion: EdicionDeContrasena, disponibles: Ref<DocumentosDisponibles>, marcas: Marcas) {
  function proponer(): void {
    if (edicion.fechaDePagoEscrita) return;
    const delServidor = disponibles.value.fechaDePagoPropuesta || edicion.fecha;
    edicion.fechaDePago = fechaDePagoSugerida(marcas.marcados.value.cargos, edicion.fecha, delServidor);
  }
  watch(() => [edicion.cargos, edicion.notas, edicion.fecha], proponer, { deep: true });
  return {
    proponer,
    escribirFechaDePago: (fecha: string) => {
      edicion.fechaDePago = fecha;
      edicion.fechaDePagoEscrita = true;
    },
  };
}

/** Al escoger otro proveedor se desmarca todo (lo marcado era de otro) y luego se hace lo que pida la pantalla. */
function alCambiarElProveedor(edicion: EdicionDeContrasena, accion: (proveedorId: string) => Promise<void>): void {
  watch(
    () => edicion.proveedorId,
    async (proveedorId) => {
      edicion.cargos = [];
      edicion.notas = [];
      await accion(proveedorId);
    },
  );
}

/** La pantalla «Nueva contraseña»: proveedor, documentos marcados con su reparto en vivo, fechas y guardado. */
export function usarNuevaContrasena() {
  const edicion = reactive(edicionDeContrasenaVacia(fechaDeHoy()));
  const opcionesDeProveedores = usarOpcionesDeProveedores();
  const { disponibles, cargando, traer } = usarDocumentosDisponibles();
  const marcas = usarMarcas(edicion, disponibles);
  const guardado = usarGuardado(edicion, disponibles, marcas);
  const fecha = usarFechaPropuesta(edicion, disponibles, marcas);

  alCambiarElProveedor(edicion, async (proveedorId) => {
    guardado.errores.value = {};
    if (await traer(proveedorId)) fecha.proponer();
  });

  return {
    ...marcas,
    ...guardado,
    edicion,
    cargando,
    disponibles,
    escribirFechaDePago: fecha.escribirFechaDePago,
    opcionesDeProveedores,
  };
}
