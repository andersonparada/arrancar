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
function catalogoDe(conExistencia: string[]): CatalogoDeRenglones {
  return {
    articulos: ref([articulo]),
    cargarDetalle: async () => undefined,
    lotesDe: () => [lote('agotado', '2099-01-01'), lote('con', '2099-06-01')],
    existenciasDeLotes: { cargar: async () => undefined, conExistencia: () => new Set(conExistencia) },
  } as unknown as CatalogoDeRenglones;
}

const preparar = (renglones: EdicionDeRenglon[], esSalida = false, conExistencia: string[] = []) => {
  const lista = ref(renglones);
  const acciones = usarRenglones(lista, catalogoDe(conExistencia), { esSalida, bodegaId: () => 'b1' });
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
