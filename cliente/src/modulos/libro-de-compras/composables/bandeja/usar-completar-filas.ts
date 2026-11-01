import { computed, ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import type { OpcionBuscable } from '@/modulos/core/utilidades/busqueda-de-opciones';
import { apiRegistroDeDocumentos } from '../../servicios/registro-de-documentos.api';
import { apiDteRecibidos, type DteRecibido } from '../../servicios/dte-recibidos.api';
import { esNotaDeDebito } from '../documentos/tipos-de-documento-sat';
import { opcionesDeFacturas } from '../documentos/reglas-del-formulario-de-documento';
import { valoresDeLaFila } from './datos-de-la-bandeja';
import {
  edicionDeCompletarVacia,
  hayAlgoQueCompletar,
  notaPorCompletar,
  peticionDeCompletar,
} from './datos-de-completar';

type Facturas = OpcionBuscable<string | null>[];
const SIN_FACTURA = { valor: null, texto: 'Elija la factura' };

/** Las facturas vigentes del proveedor de la nota, para elegir la que corrige; sin proveedor o sin permiso, ninguna. */
async function facturasDeLaNota(nota: DteRecibido): Promise<Facturas> {
  const proveedorId = valoresDeLaFila(nota).proveedorId;
  if (!proveedorId) return [];
  const pagina = await apiRegistroDeDocumentos.documentosVigentesDelProveedor(proveedorId).catch(() => null);
  return opcionesDeFacturas(pagina?.elementos ?? [], esNotaDeDebito(nota.tipoDte));
}

/** Lo escogido en la ventana y las filas a las que se aplica. Al abrir, todo vuelve a empezar. */
function usarEstadoDeCompletar(limpiarErrores: () => void) {
  const edicion = ref(edicionDeCompletarVacia());
  const filas = ref<DteRecibido[]>([]);
  const facturas = ref<Facturas>([]);

  async function abrir(marcadas: DteRecibido[]): Promise<void> {
    filas.value = marcadas;
    edicion.value = { ...edicionDeCompletarVacia(), abierta: true };
    limpiarErrores();
    const nota = notaPorCompletar(marcadas);
    facturas.value = nota ? [SIN_FACTURA, ...(await facturasDeLaNota(nota))] : [];
  }

  const cerrar = (): void => {
    edicion.value.abierta = false;
  };

  return { edicion, filas, facturas, abrir, cerrar };
}

/** La ventana «Completar»: lo escogido se aplica a todas las filas marcadas, y lo vacío no toca nada. */
export function usarCompletarFilas(alCompletar: (filas: DteRecibido[]) => void) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const estado = usarEstadoDeCompletar(() => (errores.value = {}));

  async function guardar(): Promise<void> {
    if (!hayAlgoQueCompletar(estado.edicion.value)) {
      errores.value = { general: 'Escoja al menos un dato para completar.' };
      return;
    }
    const ids = estado.filas.value.map(({ id }) => id);
    const guardado = await enviar(async () => {
      alCompletar((await apiDteRecibidos.completar(peticionDeCompletar(ids, estado.edicion.value))).elementos);
    });
    if (!guardado) return;
    avisos.exito(ids.length === 1 ? 'Se completó el DTE.' : `Se completaron ${ids.length} DTE.`);
    estado.cerrar();
  }

  return {
    ...estado,
    errores,
    enviando,
    cantidad: computed(() => estado.filas.value.length),
    guardar,
  };
}
