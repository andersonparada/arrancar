import { describe, expect, it } from 'vitest';
import type { DatosUnidad, Unidad } from '../../servicios/unidades.api';
import { datosDeUnidad, edicionDe, llevaFactor } from './edicion-de-unidad';

const datos: DatosUnidad = {
  nombre: 'Quintal',
  simbolo: 'qq',
  magnitud: 'masa',
  factorALaReferencia: '100.00000000',
  activo: true,
};
const unidad: Unidad = { id: 'unidad-1', ...datos };

describe('ventana de unidades de medida', () => {
  it('lo que se abre para editar se manda igual si no se cambia nada', () => {
    expect(datosDeUnidad(edicionDe(unidad))).toEqual({ ...datos, factorALaReferencia: '100' });
    expect(edicionDe(unidad).id).toBe(unidad.id);
  });

  it('un registro nuevo empieza sin id y sin factor', () => {
    expect(edicionDe()).toMatchObject({ abierta: true, id: null, factorALaReferencia: '' });
  });

  it('solo masa, volumen, longitud y superficie llevan factor', () => {
    expect((['masa', 'volumen', 'longitud', 'superficie'] as const).map(llevaFactor)).toEqual([true, true, true, true]);
    expect((['cantidad', 'empaque'] as const).map(llevaFactor)).toEqual([false, false]);
  });

  it('al cambiar a una magnitud sin factor, el factor escrito no se manda', () => {
    const caja = { ...edicionDe(unidad), magnitud: 'empaque' as const };

    expect(datosDeUnidad(caja)).toMatchObject({ magnitud: 'empaque', factorALaReferencia: null });
  });
});
