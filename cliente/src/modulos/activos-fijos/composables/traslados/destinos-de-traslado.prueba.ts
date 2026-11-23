import { createPinia, setActivePinia } from 'pinia';
import { nextTick, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiActivos } from '../../servicios/activos.api';
import { edicionDeTrasladoNueva, mensajeDeTraslado } from './edicion-de-traslado';
import { usarDestinosDeTraslado } from './usar-destinos-de-traslado';

beforeEach(() => setActivePinia(createPinia()));

const activo = { id: 'a1', codigo: 'AF-1', descripcion: 'Tractor', localidadId: 'l1', departamentoId: 'd1' };

describe('destinos de traslado', () => {
  it('conserva el departamento actual mientras las ubicaciones no han cargado', async () => {
    let responder: (valor: unknown) => void = () => undefined;
    vi.spyOn(apiActivos, 'ubicaciones').mockReturnValue(new Promise((r) => (responder = r)) as never);
    const edicion = ref(edicionDeTrasladoNueva('2026-11-20', [activo]));
    const destinos = usarDestinosDeTraslado(edicion);
    const carga = destinos.cargar();
    await nextTick();
    expect(edicion.value.departamentoId).toBe('d1');
    responder({
      localidades: [{ id: 'l1', nombre: 'Finca' }],
      departamentos: [{ id: 'd1', nombre: 'Riego', localidadId: 'l1' }],
    });
    await carga;
    await nextTick();
    expect(edicion.value.departamentoId).toBe('d1');
  });

  it('quita el departamento que no es de la localidad nueva, ya cargadas las ubicaciones', async () => {
    vi.spyOn(apiActivos, 'ubicaciones').mockResolvedValue({
      localidades: [
        { id: 'l1', nombre: 'Finca' },
        { id: 'l2', nombre: 'Casa' },
      ],
      departamentos: [{ id: 'd1', nombre: 'Riego', localidadId: 'l1' }],
    } as never);
    const edicion = ref(edicionDeTrasladoNueva('2026-11-20', [activo]));
    const destinos = usarDestinosDeTraslado(edicion);
    await destinos.cargar();
    edicion.value.localidadId = 'l2';
    await nextTick();
    expect(edicion.value.departamentoId).toBeNull();
  });
});

describe('traslado de un activo en bodega', () => {
  const enBodega = { ...activo, enBodega: true };

  it('parte en la bodega y lo conserva', () => {
    expect(edicionDeTrasladoNueva('2026-11-20', [enBodega]).aBodega).toBe(true);
    expect(edicionDeTrasladoNueva('2026-11-20', [activo]).aBodega).toBe(false);
    expect(edicionDeTrasladoNueva('2026-11-20', [enBodega, activo]).aBodega).toBe(false);
  });

  it('avisa en la confirmación si el bien sale de la bodega', () => {
    const edicion = { ...edicionDeTrasladoNueva('2026-11-20', [enBodega]), aBodega: false, recibidoPor: 'Ana' };
    const destino = { localidad: 'Finca', departamento: 'Riego' };
    expect(mensajeDeTraslado([enBodega], edicion, destino)).toContain('sale de la bodega');
    expect(mensajeDeTraslado([activo], edicion, destino)).not.toContain('sale de la bodega');
  });
});
