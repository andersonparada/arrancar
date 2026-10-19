import { computed, onMounted, ref, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { apiCombustibles, type Combustible } from '../../servicios/combustibles.api';
import { apiConceptosDeGasto, type ConceptoDeGasto } from '../../servicios/conceptos-de-gasto.api';
import type { DestinoDeDocumento } from '../../servicios/documentos.api';
import { apiRegistroDeDocumentos, type ProveedorParaRegistro } from '../../servicios/registro-de-documentos.api';

const porNombre = (a: { nombre: string }, b: { nombre: string }) =>
  a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });

function crearListas() {
  return {
    proveedores: ref<ProveedorParaRegistro[]>([]),
    conceptos: ref<ConceptoDeGasto[]>([]),
    combustibles: ref<Combustible[]>([]),
    destinos: ref<DestinoDeDocumento[]>([]),
    destinosCargados: ref(false),
    nitDeLaEmpresa: ref<string | null>(null),
  };
}

type Listas = ReturnType<typeof crearListas>;

const traerTodo = () =>
  Promise.allSettled([
    apiRegistroDeDocumentos.proveedores(),
    apiConceptosDeGasto.listar(),
    apiCombustibles.listar(),
    apiRegistroDeDocumentos.destinos(),
  ]);

type Resultados = Awaited<ReturnType<typeof traerTodo>>;

/** Pone en cada lista lo que sí se pudo traer; los catálogos inactivos no se ofrecen. */
function repartir([deProveedores, deConceptos, deCombustibles, deDestinos]: Resultados, listas: Listas): void {
  if (deProveedores.status === 'fulfilled') listas.proveedores.value = deProveedores.value;
  if (deConceptos.status === 'fulfilled') listas.conceptos.value = deConceptos.value.filter(({ activo }) => activo);
  if (deCombustibles.status === 'fulfilled') {
    listas.combustibles.value = deCombustibles.value.filter(({ activo }) => activo);
  }
  if (deDestinos.status === 'fulfilled') {
    listas.destinos.value = deDestinos.value.map(({ clave }) => clave);
    listas.destinosCargados.value = true;
  }
}

/** El mensaje del primer catálogo que falló, o `null` si todos llegaron. */
function mensajeDelFallo(resultados: Resultados): string | null {
  const fallo = resultados.find((resultado) => resultado.status === 'rejected');
  if (fallo?.status !== 'rejected') return null;
  const motivo = fallo.reason instanceof Error ? ` ${fallo.reason.message}` : '';
  return `No se pudo cargar todo lo que ofrece el formulario.${motivo}`;
}

/** El NIT de la empresa es el emisor de la factura especial; si no hay permiso para verlo, se dice solo «su empresa». */
function traerElNitDeLaEmpresa(nit: Ref<string | null>): void {
  const empresaId = usarSesion().empresa?.id;
  if (!empresaId) return;
  apiRegistroDeDocumentos
    .nitDeLaEmpresa(empresaId)
    .then((valor) => (nit.value = valor))
    .catch(() => undefined);
}

/**
 * Lo que el formulario ofrece para escoger: proveedores, conceptos de gasto, combustibles y destinos activos.
 * Si un catálogo no se puede leer (por falta de permiso, por ejemplo) avisa una sola vez y ese selector queda vacío.
 */
export function usarCatalogosDelRegistro() {
  const avisos = usarAvisos();
  const listas = crearListas();
  const cargando = ref(true);

  onMounted(async () => {
    traerElNitDeLaEmpresa(listas.nitDeLaEmpresa);
    const resultados = await traerTodo();
    repartir(resultados, listas);
    const fallo = mensajeDelFallo(resultados);
    if (fallo) avisos.error(fallo);
    cargando.value = false;
  });

  return {
    ...listas,
    proveedores: computed(() => [...listas.proveedores.value].sort(porNombre)),
    conceptos: computed(() => [...listas.conceptos.value].sort(porNombre)),
    combustibles: computed(() => [...listas.combustibles.value].sort(porNombre)),
    cargando,
  };
}
