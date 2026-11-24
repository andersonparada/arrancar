import { computed, ref, watch, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { opcionesDeRegistros, type OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import {
  apiCatalogosDeParcelas,
  type CatalogosDeParcelas,
  type OpcionDeCatalogo,
  type TipoParaElegir,
} from '../../servicios/catalogos.api';
import { apiParcelas, type InmuebleDeParcela, type Parcela } from '../../servicios/parcelas.api';
import type { EdicionDeParcela } from './edicion-de-parcela';
import { ordenarComoArbol } from './orden-de-madres';

const SIN_CATALOGOS: CatalogosDeParcelas = { localidades: [], inmuebles: [], tipos: [] };

/** «P-1 · Potrero 1», con una sangría según el nivel para que el árbol se lea en el selector. */
export const nombreDeMadre = (parcela: Parcela): string =>
  `${'— '.repeat(Math.max(0, parcela.nivel - 1))}${parcela.codigo} · ${parcela.nombre}`;

/** Los inmuebles activos y los que la parcela ya tiene ligados (aunque estén inactivos), sin repetir, por nombre. */
export function inmueblesParaElegir(activos: OpcionDeCatalogo[], ligados: InmuebleDeParcela[]): OpcionDeCatalogo[] {
  const porId = new Map(activos.map((inmueble) => [inmueble.id, inmueble]));
  for (const { inmuebleId, inmuebleNombre } of ligados) {
    if (!porId.has(inmuebleId)) porId.set(inmuebleId, { id: inmuebleId, nombre: inmuebleNombre });
  }
  return [...porId.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

/**
 * Las parcelas activas de la localidad elegida, donde puede colgar una parcela nueva. Si la madre que llegó en la
 * dirección no se puede usar (inactiva o de otra localidad), se avisa y se quita; si la carga falla, no se toca.
 */
function usarMadresPosibles(edicion: Ref<EdicionDeParcela>) {
  const avisos = usarAvisos();
  const madres = ref<Parcela[]>([]);

  async function cargar(localidadId: string | null): Promise<void> {
    if (edicion.value.id !== null) return;
    try {
      madres.value = localidadId ? ordenarComoArbol(await apiParcelas.listar({ localidadId, soloActivas: true })) : [];
    } catch (error) {
      avisos.error(error instanceof Error ? error.message : 'No se pudieron cargar las parcelas de la localidad.');
      return;
    }
    const pedida = edicion.value.parcelaMadreId;
    if (pedida === null || madres.value.some(({ id }) => id === pedida)) return;
    edicion.value.parcelaMadreId = null;
    if (localidadId)
      avisos.error('La parcela madre elegida no está activa en esta localidad: no se puede usar como madre.');
  }

  watch(() => edicion.value.localidadId, cargar, { immediate: true });
  return madres;
}

/** Lo que se ofrece en cada selector, ya por nombre. */
interface FuentesDeOpciones {
  catalogos: CatalogosDeParcelas;
  tipos: TipoParaElegir[];
  madres: Parcela[];
}

/** Las opciones de los selectores; el tipo inactivo que la parcela ya tiene se conserva para no perderlo al editar. */
export function opcionesDeParcela(fuentes: FuentesDeOpciones, tipoActual: string | null, ligados: InmuebleDeParcela[]) {
  const nombre = ({ nombre: texto }: { nombre: string }) => texto;
  return {
    localidadId: opcionesDeRegistros(fuentes.catalogos.localidades, nombre, true),
    tipoId: opcionesDeRegistros(
      fuentes.tipos.filter(({ activo, id }) => activo || id === tipoActual),
      nombre,
      true,
    ),
    parcelaMadreId: [
      { valor: null, texto: 'Ninguna: es una parcela de primer nivel' },
      ...fuentes.madres.map((parcela) => ({ valor: parcela.id, texto: nombreDeMadre(parcela) })),
    ] as OpcionDeRegistro[],
    inmuebleId: opcionesDeRegistros(inmueblesParaElegir(fuentes.catalogos.inmuebles, ligados), nombre, true),
  };
}

/** Si la empresa tiene una sola localidad, la parcela nueva ya nace en ella. */
function preseleccionarLocalidadUnica(catalogos: Ref<CatalogosDeParcelas>, edicion: Ref<EdicionDeParcela>): void {
  watch([catalogos, edicion], () => {
    const [unica] = catalogos.value.localidades;
    if (catalogos.value.localidades.length === 1 && unica && edicion.value.id === null && !edicion.value.localidadId) {
      edicion.value.localidadId = unica.id;
    }
  });
}

/**
 * Lo que se puede elegir en los selectores de la parcela: localidad, tipo, parcela madre e inmuebles, todos por nombre.
 */
export function usarReferenciasDeParcela(edicion: Ref<EdicionDeParcela>, ligados: Ref<InmuebleDeParcela[]>) {
  const { datos: catalogos } = usarCarga(
    () => apiCatalogosDeParcelas.obtener(),
    SIN_CATALOGOS,
    'No se pudieron cargar las localidades, los tipos y los inmuebles.',
  );
  const madres = usarMadresPosibles(edicion);
  preseleccionarLocalidadUnica(catalogos, edicion);

  return computed(() =>
    opcionesDeParcela(
      { catalogos: catalogos.value, tipos: catalogos.value.tipos, madres: madres.value },
      edicion.value.tipoId,
      ligados.value,
    ),
  );
}
