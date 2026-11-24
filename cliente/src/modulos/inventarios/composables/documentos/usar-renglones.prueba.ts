import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { ref } from 'vue';
import type { Articulo, Lote } from '../../servicios/articulos.api';
import { renglonNuevo, type EdicionDeRenglon } from './edicion-de-renglones';
import type { CatalogoDeRenglones } from './usar-catalogo-de-renglones';
import { usarRenglones } from './usar-renglones';

const articulo = { id: 'a1', codigo: 'ART-1', codigoDeBarras: null, activo: true } as Articulo;
const lote = (id: string, vence: string): Lote =>
  ({
    id,
    articuloId: 'a1',
    codigo: id,
    fechaDeVencimiento: vence,
    fechaDeFabricacion: null,
    observaciones: null,
  }) as Lote;

/** Un catálogo mínimo: un artículo con dos lotes, de los que solo `conExistencia` tiene en la bodega. */
function catalogoDe(conExistencia: string[], puedeVer = true, detalle = async () => {}) {
  return {
    articulos: ref([articulo]),
    cargarDetalle: detalle,
    lotesDe: () => [lote('agotado', '2099-01-01'), lote('con', '2099-06-01')],
    existenciasDeLotes: { cargar: async () => true, conExistencia: () => new Set(conExistencia), puedeVer },
  } as unknown as CatalogoDeRenglones;
}

/** `existencias` son los lotes con existencia, o un catálogo ya armado. */
const preparar = (
  renglones: EdicionDeRenglon[],
  esSalida = false,
  existencias: string[] | CatalogoDeRenglones = [],
) => {
  const catalogo = Array.isArray(existencias) ? catalogoDe(existencias) : existencias;
  const lista = ref(renglones);
  const acciones = usarRenglones(lista, catalogo, { esSalida, bodegaId: () => 'b1' });
  return { lista, acciones };
};

beforeEach(() => setActivePinia(createPinia()));

describe('usarRenglones: leer un código', () => {
  it('escanear un artículo que ya está en otra unidad agrega un renglón nuevo sin tocar el anterior', async () => {
    const enCajas = { ...renglonNuevo('a1', '5'), unidadId: 'caja' };
    const { lista, acciones } = preparar([enCajas]);

    await acciones.leerCodigo('ART-1');

    expect(lista.value.map((r) => [r.cantidad, r.unidadId])).toEqual([
      ['5', 'caja'],
      ['1', null],
    ]);
  });

  it('escanear dos veces el mismo artículo suma en su renglón sin reiniciarlo', async () => {
    const { lista, acciones } = preparar([]);
    await acciones.leerCodigo('ART-1');
    lista.value[0]!.unidadId = null;
    await acciones.leerCodigo('ART-1');
    expect(lista.value.map((r) => r.cantidad)).toEqual(['2']);
  });

  it('un código desconocido no cambia los renglones', async () => {
    const { lista, acciones } = preparar([renglonNuevo('a1', '2')]);
    await acciones.leerCodigo('NO-EXISTE');
    expect(lista.value).toHaveLength(1);
  });
});

describe('usarRenglones: lote propuesto en las salidas', () => {
  it('propone un lote que tiene existencia en la bodega, no uno agotado que vence antes', async () => {
    const { lista, acciones } = preparar([renglonNuevo('a1', '1')], true, ['con']);
    await acciones.alElegirArticulo(lista.value[0]!);
    expect(lista.value[0]!.loteId).toBe('con');
  });

  it('en una entrada no propone lote', async () => {
    const { lista, acciones } = preparar([renglonNuevo('a1', '1')], false, ['con']);
    await acciones.alElegirArticulo(lista.value[0]!);
    expect(lista.value[0]!.loteId).toBeNull();
  });
});

describe('usarRenglones: cambio de bodega y lector', () => {
  it('conserva el lote elegido a mano si tiene existencia en la nueva bodega', async () => {
    const { lista, acciones } = preparar([renglonNuevo('a1', '1')], true, ['agotado', 'con']);
    await acciones.alElegirArticulo(lista.value[0]!);
    lista.value[0]!.loteId = 'agotado';
    await acciones.reproponerLotes();
    expect(lista.value[0]!.loteId).toBe('agotado');
  });

  it('vuelve a proponer el lote que puso el sistema', async () => {
    const { lista, acciones } = preparar([renglonNuevo('a1', '1')], true, ['con']);
    await acciones.alElegirArticulo(lista.value[0]!);
    await acciones.reproponerLotes();
    expect(lista.value[0]!.loteId).toBe('con');
  });

  it('cambia el lote elegido a mano si ya no tiene existencia', async () => {
    const { lista, acciones } = preparar([renglonNuevo('a1', '1')], true, ['con']);
    lista.value[0]!.loteId = 'otro';
    await acciones.reproponerLotes();
    expect(lista.value[0]!.loteId).toBe('con');
  });

  it('sin permiso para ver existencias conserva el lote elegido', async () => {
    const { lista, acciones } = preparar([renglonNuevo('a1', '1')], true, catalogoDe([], false));
    lista.value[0]!.loteId = 'agotado';
    await acciones.reproponerLotes();
    expect(lista.value[0]!.loteId).toBe('agotado');
  });

  it('dos lecturas seguidas con la carga pendiente dejan el lote propuesto en el renglón', async () => {
    let liberar = () => {};
    const espera = new Promise<void>((resolver) => (liberar = resolver));
    const { lista, acciones } = preparar(
      [],
      true,
      catalogoDe(['con'], true, () => espera),
    );
    const primera = acciones.leerCodigo('ART-1');
    const segunda = acciones.leerCodigo('ART-1');
    liberar();
    await Promise.all([primera, segunda]);
    expect(lista.value.map((r) => [r.cantidad, r.loteId])).toEqual([['2', 'con']]);
  });

  it('si la carga de existencias falla conserva el lote elegido a mano', async () => {
    const catalogo = catalogoDe([]);
    catalogo.existenciasDeLotes.cargar = async () => false;
    const { lista, acciones } = preparar([renglonNuevo('a1', '1')], true, catalogo);
    lista.value[0]!.loteId = 'agotado';
    await acciones.reproponerLotes();
    expect(lista.value[0]!.loteId).toBe('agotado');
  });

  it('un lote que el usuario elige mientras carga la existencia no se pisa', async () => {
    let espera: Promise<void> = Promise.resolve();
    const catalogo = catalogoDe(['con', 'agotado']);
    catalogo.existenciasDeLotes.cargar = async () => (await espera, true);
    const { lista, acciones } = preparar([renglonNuevo('a1', '1')], true, catalogo);
    await acciones.alElegirArticulo(lista.value[0]!);
    let liberar = () => {};
    espera = new Promise<void>((resolver) => (liberar = resolver));
    const pendiente = acciones.reproponerLotes();
    lista.value[0]!.loteId = 'con';
    liberar();
    await pendiente;
    expect(lista.value[0]!.loteId).toBe('con');
  });
});
