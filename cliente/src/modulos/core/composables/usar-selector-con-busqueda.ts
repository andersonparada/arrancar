import { computed, ref, type ComputedRef, type Ref } from 'vue';
import {
  filtrarOpciones,
  indiceDeOpcionElegida,
  moverIndiceActivo,
  UMBRAL_PARA_MOSTRAR_BUSCADOR,
  type OpcionBuscable,
} from '../utilidades/busqueda-de-opciones';

interface EstadoSelector<T> {
  abierto: Ref<boolean>;
  busqueda: Ref<string>;
  indiceActivo: Ref<number>;
  opciones: Ref<OpcionBuscable<T>[]>;
  modelo: Ref<T | undefined>;
}

function opcionesFiltradasDe<T>(estado: EstadoSelector<T>): OpcionBuscable<T>[] {
  return filtrarOpciones(estado.opciones.value, estado.busqueda.value);
}

function abrirSelector<T>(estado: EstadoSelector<T>): void {
  if (estado.abierto.value) return;
  estado.abierto.value = true;
  estado.busqueda.value = '';
  estado.indiceActivo.value = indiceDeOpcionElegida(estado.opciones.value, estado.modelo.value as T);
}

function cerrarSelector<T>(estado: EstadoSelector<T>): void {
  estado.abierto.value = false;
  estado.busqueda.value = '';
  estado.indiceActivo.value = -1;
}

function elegirOpcion<T>(estado: EstadoSelector<T>, opcion: OpcionBuscable<T>): void {
  estado.modelo.value = opcion.valor;
  cerrarSelector(estado);
}

function moverOpcionActiva<T>(estado: EstadoSelector<T>, paso: 1 | -1): void {
  const cantidad = opcionesFiltradasDe(estado).length;
  estado.indiceActivo.value = moverIndiceActivo(estado.indiceActivo.value, cantidad, paso);
}

function elegirOpcionActiva<T>(estado: EstadoSelector<T>): void {
  const opcion = opcionesFiltradasDe(estado)[estado.indiceActivo.value];
  if (opcion) elegirOpcion(estado, opcion);
}

function manejarTeclaCerrado<T>(estado: EstadoSelector<T>, evento: KeyboardEvent): void {
  if (evento.key !== 'ArrowDown' && evento.key !== 'Enter') return;
  evento.preventDefault();
  abrirSelector(estado);
}

function manejarTeclaConAbierto<T>(estado: EstadoSelector<T>, evento: KeyboardEvent): void {
  if (evento.key === 'ArrowDown') {
    evento.preventDefault();
    moverOpcionActiva(estado, 1);
  } else if (evento.key === 'ArrowUp') {
    evento.preventDefault();
    moverOpcionActiva(estado, -1);
  } else if (evento.key === 'Enter') {
    evento.preventDefault();
    elegirOpcionActiva(estado);
  } else if (evento.key === 'Escape') {
    evento.preventDefault();
    cerrarSelector(estado);
  } else if (evento.key === 'Tab') {
    cerrarSelector(estado);
  }
}

/**
 * El estado y los eventos de un selector con buscador (patrón combobox + listbox):
 * abrir/cerrar, filtrar opciones al escribir, mover la opción activa con las flechas
 * y elegir con Enter o con clic. El `.vue` solo conecta esto con el DOM (foco, clics
 * fuera, posición del panel).
 */
export function usarSelectorConBusqueda<T extends string | number | null>(
  opciones: Ref<OpcionBuscable<T>[]>,
  modelo: Ref<T | undefined>,
) {
  const abierto = ref(false);
  const busqueda = ref('');
  const indiceActivo = ref(-1);
  const estado: EstadoSelector<T> = { abierto, busqueda, indiceActivo, opciones, modelo };

  const opcionesFiltradas = computed(() => opcionesFiltradasDe(estado));
  const muestraBuscador = computed(() => opciones.value.length > UMBRAL_PARA_MOSTRAR_BUSCADOR);
  const textoElegido = computed(() => opciones.value.find((opcion) => opcion.valor === modelo.value)?.texto ?? '');

  function alPresionarTecla(evento: KeyboardEvent): void {
    if (abierto.value) manejarTeclaConAbierto(estado, evento);
    else manejarTeclaCerrado(estado, evento);
  }

  return construirSelector(estado, { opcionesFiltradas, muestraBuscador, textoElegido, alPresionarTecla });
}

interface ComputadasSelector<T> {
  opcionesFiltradas: ComputedRef<OpcionBuscable<T>[]>;
  muestraBuscador: ComputedRef<boolean>;
  textoElegido: ComputedRef<string>;
  alPresionarTecla: (evento: KeyboardEvent) => void;
}

function construirSelector<T>(estado: EstadoSelector<T>, computadas: ComputadasSelector<T>) {
  return {
    abierto: estado.abierto,
    busqueda: estado.busqueda,
    indiceActivo: estado.indiceActivo,
    ...computadas,
    abrir: () => abrirSelector(estado),
    cerrar: () => cerrarSelector(estado),
    elegir: (opcion: OpcionBuscable<T>) => elegirOpcion(estado, opcion),
  };
}
