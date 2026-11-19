import { describe, expect, it } from 'vitest';
import { activo, clase, linea } from './datos-de-prueba.soporte';
import { alCambiarLasUnidades, asignacionInicial } from './edicion-de-capitalizacion';
import { solicitudDeCapitalizacion } from './solicitud-de-capitalizacion';

describe('capitalizar: solicitud', () => {
  const lineas = [linea()];
  const contexto = {
    lineas,
    clases: [clase('k1'), clase('ed', 'edificios')],
    activos: [activo({ id: 'a1', incisoFiscal: 'edificios' })],
  };

  it('un activo nuevo manda sus unidades, la cuadrícula y solo ese destino', () => {
    const parte = asignacionInicial(lineas[0]!, 1);
    parte.nuevo.unidades = '3';
    alCambiarLasUnidades(parte.nuevo);
    parte.nuevo.renglones[0]!.numeroDeSerie = 'SN-1';
    const [enviada] = solicitudDeCapitalizacion([parte], contexto);
    expect(enviada).toMatchObject({
      lineaId: 'l1',
      monto: '750000.01',
      activoId: null,
      altaConjuntaId: null,
      claseDeCosto: null,
    });
    expect(enviada?.activoNuevo).toMatchObject({ unidades: 3, cantidadPorActivo: 1, origen: 'compra', claseId: 'k1' });
    expect(enviada?.activoNuevo?.detalleDeUnidades).toHaveLength(3);
    expect(enviada?.activoNuevo?.detalleDeUnidades[0]?.numeroDeSerie).toBe('SN-1');
  });

  it('una nota de crédito manda el monto negativo y sin clase de costo', () => {
    const nota = linea({
      tipoDeDocumento: 'nota_de_credito',
      pendiente: '-500.00',
      costo: '-500.00',
      activoSugeridoId: 'a1',
    });
    const [enviada] = solicitudDeCapitalizacion([asignacionInicial(nota, 1)], { ...contexto, lineas: [nota] });
    expect(enviada).toMatchObject({ monto: '-500.00', activoId: 'a1', activoNuevo: null, claseDeCosto: null });
  });

  it('a un activo existente manda su clase de costo y la marca de edificación solo si es un edificio', () => {
    const parte = {
      ...asignacionInicial(lineas[0]!, 1),
      destino: 'existente' as const,
      activoId: 'a1',
      claseDeCosto: 'flete' as const,
      noEsEdificacion: true,
    };
    expect(solicitudDeCapitalizacion([parte], contexto)[0]).toMatchObject({
      claseDeCosto: 'flete',
      noEsEdificacion: true,
    });
    const sinEdificio = { ...contexto, activos: [activo({ id: 'a1', incisoFiscal: 'computo' })] };
    expect(solicitudDeCapitalizacion([parte], sinEdificio)[0]?.noEsEdificacion).toBe(false);
  });

  it('a una compra conjunta manda solo su id', () => {
    const parte = { ...asignacionInicial(lineas[0]!, 1), destino: 'conjunta' as const, altaConjuntaId: 'alta-1' };
    expect(solicitudDeCapitalizacion([parte], contexto)[0]).toMatchObject({
      altaConjuntaId: 'alta-1',
      activoId: null,
      activoNuevo: null,
    });
  });
});
