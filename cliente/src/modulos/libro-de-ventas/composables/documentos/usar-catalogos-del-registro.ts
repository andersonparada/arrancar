import { computed, onMounted, ref, watch } from 'vue';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { apiConceptosDeIngreso, type ConceptoDeIngreso } from '../../servicios/conceptos-de-ingreso.api';
import { apiDocumentos, type ClienteParaVentas, type DocumentoEnLista } from '../../servicios/documentos.api';
import { ordenarPorNombre } from '../comunes/cambio-de-estado';
import type { EdicionDeDocumento } from './edicion-de-documento';
import { admiteNota, esNota } from './tipos-de-documento';

const MAXIMO_DE_FACTURAS = 200;

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

/** Las facturas vigentes del cliente escogido, para que una nota diga a cuál corrige. */
function usarFacturasDelCliente(edicion: EdicionDeDocumento) {
  const facturas = ref<DocumentoEnLista[]>([]);
  const cargando = ref(false);
  async function cargar(): Promise<void> {
    if (!esNota(edicion.tipo) || !edicion.clienteId) {
      facturas.value = [];
      return;
    }
    const pedido = edicion.clienteId;
    cargando.value = true;
    try {
      const pagina = await apiDocumentos.listar({ clienteId: pedido, estado: 'vigente', limite: MAXIMO_DE_FACTURAS });
      if (pedido === edicion.clienteId) facturas.value = pagina.elementos.filter((f) => admiteNota(f.tipo));
    } catch {
      facturas.value = [];
    } finally {
      cargando.value = false;
    }
  }
  watch(() => [edicion.tipo, edicion.clienteId], cargar, { immediate: true });
  return { facturas, cargandoFacturas: cargando };
}

/** Todo lo que el formulario necesita leer: clientes, conceptos, facturas de las notas y si hay cartera. */
export function usarCatalogosDelRegistro(edicion: EdicionDeDocumento) {
  const sesion = usarSesion();
  return {
    ...usarClientes(),
    ...usarConceptos(),
    ...usarFacturasDelCliente(edicion),
    conCartera: computed(() => sesion.moduloActivo('cuentas-por-cobrar')),
  };
}
