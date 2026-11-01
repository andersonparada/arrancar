import { computed, onMounted, ref, type Ref } from 'vue';
import type { OpcionBuscable } from '@/modulos/core/utilidades/busqueda-de-opciones';
import { apiConceptosDeGasto, type ConceptoDeGasto } from '../../servicios/conceptos-de-gasto.api';
import type { DestinoDeDocumento } from '../../servicios/documentos.api';
import { apiRegistroDeDocumentos } from '../../servicios/registro-de-documentos.api';
import { DESTINOS_DE_DOCUMENTO } from '../../textos-de-documentos';

const DEJAR_COMO_ESTA = 'Dejar como está';
const porTexto = (a: OpcionBuscable<string | null>, b: OpcionBuscable<string | null>) =>
  a.texto.localeCompare(b.texto, 'es', { sensitivity: 'base' });

/** Los conceptos activos por nombre, con «Dejar como está» al principio. */
export function opcionesDeConceptos(conceptos: readonly ConceptoDeGasto[]): OpcionBuscable<string | null>[] {
  const activos = conceptos.filter(({ activo }) => activo).map(({ id, nombre }) => ({ valor: id, texto: nombre }));
  return [{ valor: null, texto: DEJAR_COMO_ESTA }, ...activos.sort(porTexto)];
}

/** Los destinos activos por nombre, con «Dejar como está» al principio. */
export function opcionesDeDestinos(
  destinos: readonly DestinoDeDocumento[],
): OpcionBuscable<DestinoDeDocumento | null>[] {
  const lista = destinos.map((clave) => ({ valor: clave, texto: DESTINOS_DE_DOCUMENTO[clave] }));
  return [{ valor: null, texto: DEJAR_COMO_ESTA }, ...lista.sort(porTexto)];
}

async function cargarCatalogos(conceptos: Ref<ConceptoDeGasto[]>, destinos: Ref<DestinoDeDocumento[]>) {
  const [deConceptos, deDestinos] = await Promise.allSettled([
    apiConceptosDeGasto.listar(),
    apiRegistroDeDocumentos.destinos(),
  ]);
  if (deConceptos.status === 'fulfilled') conceptos.value = deConceptos.value;
  if (deDestinos.status === 'fulfilled') destinos.value = deDestinos.value.map(({ clave }) => clave);
}

/**
 * Los conceptos de gasto y los destinos que ofrece «Completar». Si no se pueden leer (por falta de permiso, por
 * ejemplo) las listas quedan vacías: la bandeja se ve igual y las propuestas del servidor siguen valiendo.
 */
export function usarCatalogosDeLaBandeja() {
  const conceptos = ref<ConceptoDeGasto[]>([]);
  const destinos = ref<DestinoDeDocumento[]>([]);
  onMounted(() => cargarCatalogos(conceptos, destinos));

  return {
    /** Todos, activos o no: una propuesta puede apuntar a un concepto que ya no se ofrece. */
    nombresDeConceptos: computed(() => new Map(conceptos.value.map(({ id, nombre }) => [id, nombre]))),
    opcionesDeConceptos: computed(() => opcionesDeConceptos(conceptos.value)),
    opcionesDeDestinos: computed(() => opcionesDeDestinos(destinos.value)),
  };
}
