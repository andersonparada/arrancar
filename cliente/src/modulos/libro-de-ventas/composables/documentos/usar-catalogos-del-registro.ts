import { computed, onMounted, onScopeDispose, reactive, ref, watch } from 'vue';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { apiConceptosDeIngreso, type ConceptoDeIngreso } from '../../servicios/conceptos-de-ingreso.api';
import { apiDocumentos, type ClienteParaVentas } from '../../servicios/documentos.api';
import { ordenarPorNombre } from '../comunes/cambio-de-estado';
import type { EdicionDeDocumento } from './edicion-de-documento';
import {
  busquedaDeFacturasVacia,
  consultaDeFacturas,
  resultadoDeFacturas,
  type BusquedaDeFacturas,
} from './busqueda-de-facturas';
import { esNota } from './tipos-de-documento';

/** Los clientes activos por nombre. Si no se pueden leer, el formulario sigue: se registra a consumidor final. */
function usarClientes() {
  const clientes = ref<ClienteParaVentas[]>([]);
  const noDisponibles = ref(false);
  onMounted(async () => {
    try {
      const todos = await apiDocumentos.listarClientes();
      clientes.value = ordenarPorNombre(todos.filter((cliente) => cliente.activo));
    } catch {
      noDisponibles.value = true;
    }
  });
  return { clientes, clientesNoDisponibles: noDisponibles };
}

/** Los conceptos de ingreso activos por nombre; sin permiso para verlos no se puede armar una línea. */
function usarConceptos() {
  const conceptos = ref<ConceptoDeIngreso[]>([]);
  const sinPermiso = ref(false);
  onMounted(async () => {
    try {
      conceptos.value = ordenarPorNombre((await apiConceptosDeIngreso.listar()).filter((c) => c.activo));
    } catch {
      sinPermiso.value = true;
    }
  });
  return { conceptos, conceptosNoDisponibles: sinPermiso };
}

const ESPERA_DE_LA_BUSQUEDA_MS = 300;

/** Lee las facturas de la nota en `facturas`; `vigente` dice si sigue siendo la última búsqueda pedida. */
async function leerFacturas(
  facturas: BusquedaDeFacturas,
  edicion: EdicionDeDocumento,
  consulta: { texto: string; vigente: () => boolean },
): Promise<void> {
  facturas.cargando = true;
  try {
    const pagina = await apiDocumentos.listar(consultaDeFacturas(edicion.clienteId, consulta.texto));
    if (!consulta.vigente()) return;
    const elegida = { id: edicion.documentoAfectadoId, anteriores: facturas.elementos };
    Object.assign(facturas, resultadoDeFacturas(pagina, elegida), { fallo: false });
  } catch {
    if (consulta.vigente()) Object.assign(facturas, { elementos: [], hayMas: false, fallo: true });
  } finally {
    if (consulta.vigente()) facturas.cargando = false;
  }
}

/**
 * Las facturas vigentes que una nota puede corregir: las del cliente escogido o, sin cliente, las de consumidor
 * final. `buscarFacturas` filtra por serie o número en el servidor; si la lectura falla se dice, no se muestra vacía.
 */
function usarFacturasDeLaNota(edicion: EdicionDeDocumento) {
  const facturas = reactive<BusquedaDeFacturas>(busquedaDeFacturasVacia());
  let texto = '';
  let turno = 0;
  let espera: ReturnType<typeof setTimeout> | undefined;

  function cargar(): void {
    const mio = ++turno;
    if (!esNota(edicion.tipo)) return void Object.assign(facturas, busquedaDeFacturasVacia());
    void leerFacturas(facturas, edicion, { texto, vigente: () => mio === turno });
  }

  /** Espera a que termine de escribir; sin texto (o al reintentar con el mismo) busca de inmediato. */
  function buscar(nuevo: string): void {
    texto = nuevo;
    clearTimeout(espera);
    if (nuevo === '') cargar();
    else espera = setTimeout(cargar, ESPERA_DE_LA_BUSQUEDA_MS);
  }

  watch(
    () => [edicion.tipo, edicion.clienteId],
    () => buscar(''),
    { immediate: true },
  );
  onScopeDispose(() => clearTimeout(espera));
  return { facturas, buscarFacturas: buscar };
}

/** Todo lo que el formulario necesita leer: clientes, conceptos, búsqueda de las facturas de las notas y si hay cartera. */
export function usarCatalogosDelRegistro(edicion: EdicionDeDocumento) {
  const sesion = usarSesion();
  return {
    ...usarClientes(),
    ...usarConceptos(),
    ...usarFacturasDeLaNota(edicion),
    conCartera: computed(() => sesion.moduloActivo('cuentas-por-cobrar')),
  };
}
