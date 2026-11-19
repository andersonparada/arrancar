import { beforeEach, describe, expect, it } from 'vitest';
import { Activo } from '../../../dominio/activo.js';
import {
  AltaConjuntaSinActivosVigentes,
  CodigosDeUnidadesRepetidos,
  CostoInvalido,
} from '../../../dominio/errores-de-costo.js';
import {
  activoNuevo,
  armarCostos,
  asignacion,
  lineaDePrueba,
  operador,
  type EscenarioDeCostos,
} from '../../../pruebas/escenario-de-costos.soporte.js';

let e: EscenarioDeCostos;

beforeEach(async () => {
  e = await armarCostos();
});

const activos = () => [...e.activos.registros.values()].map((a) => a.instantanea());
const costosPor = (activoId: string) =>
  [...e.costos.registros.values()].map((c) => c.instantanea()).filter((c) => c.activoId === activoId);

describe('capitalizar en N unidades (identificación específica)', () => {
  it('3 tractores de Q750,000.01: 250,000.00, 250,000.00 y 250,000.01, y comparten la compra conjunta', async () => {
    const linea = lineaDePrueba({ costoCentavos: 75_000_001 });
    e.lineas.sembrar(linea);

    const resultado = await e.capitalizar.ejecutar(operador, {
      asignaciones: [asignacion(linea.lineaId, 75_000_001, { activoNuevo: activoNuevo(e.claseId, { unidades: 3 }) })],
    });

    expect(resultado.activos.map((a) => [a.codigo, a.costo])).toEqual([
      ['AF-0001', '250000.00'],
      ['AF-0002', '250000.00'],
      ['AF-0003', '250000.01'],
    ]);
    const altas = new Set(activos().map((a) => a.altaConjuntaId));
    expect(altas.size).toBe(1);
    expect([...altas][0]).toBe(resultado.altaConjuntaIds[0]);
    expect(activos().every((a) => a.cantidad === 1 && a.estado === 'en_construccion')).toBe(true);
  });

  it('un solo activo no lleva compra conjunta', async () => {
    const linea = lineaDePrueba();
    e.lineas.sembrar(linea);

    const resultado = await e.capitalizar.ejecutar(operador, {
      asignaciones: [asignacion(linea.lineaId, 100_000, { activoNuevo: activoNuevo(e.claseId) })],
    });

    expect(resultado.altaConjuntaIds).toEqual([]);
    expect(activos()[0]!.altaConjuntaId).toBeNull();
  });

  it('50 sillas son un grupo: una unidad de cantidad 50', async () => {
    const linea = lineaDePrueba({ costoCentavos: 1_500_000 });
    e.lineas.sembrar(linea);

    await e.capitalizar.ejecutar(operador, {
      asignaciones: [
        asignacion(linea.lineaId, 1_500_000, { activoNuevo: activoNuevo(e.claseId, { cantidadPorActivo: 50 }) }),
      ],
    });

    expect(activos()).toHaveLength(1);
    expect(activos()[0]).toMatchObject({ cantidad: 50 });
  });

  it('la suma de los costos de las unidades es siempre el monto, con sobrante en el último', async () => {
    const linea = lineaDePrueba({ costoCentavos: 1_000_003 });
    e.lineas.sembrar(linea);

    await e.capitalizar.ejecutar(operador, {
      asignaciones: [asignacion(linea.lineaId, 1_000_003, { activoNuevo: activoNuevo(e.claseId, { unidades: 7 }) })],
    });

    const porActivo = activos().map((a) => costosPor(a.id.valor)[0]!.montoCentavos);
    expect(porActivo.slice(0, 6)).toEqual(Array(6).fill(142_857));
    expect(porActivo[6]).toBe(142_861);
    expect(porActivo.reduce((s, m) => s + m, 0)).toBe(1_000_003);
  });

  it('las unidades heredan el mismo tipo de registro, la clase, la ubicación y la marca', async () => {
    const linea = lineaDePrueba();
    e.lineas.sembrar(linea);

    await e.capitalizar.ejecutar(operador, {
      asignaciones: [
        asignacion(linea.lineaId, 100_000, {
          activoNuevo: activoNuevo(e.claseId, {
            unidades: 2,
            tipoDeRegistro: 'bien_de_control',
            marca: 'John Deere',
            enBodega: true,
          }),
        }),
      ],
    });

    for (const activo of activos())
      expect(activo).toMatchObject({
        tipoDeRegistro: 'bien_de_control',
        estado: 'en_uso',
        marca: 'John Deere',
        enBodega: true,
        claseId: e.claseId,
      });
  });
});

describe('cuadrícula de unidades', () => {
  const asignar = (linea: ReturnType<typeof lineaDePrueba>, unidades: number, detalleDeUnidades: object[]) =>
    e.capitalizar.ejecutar(operador, {
      asignaciones: [
        asignacion(linea.lineaId, linea.costoCentavos, {
          activoNuevo: activoNuevo(e.claseId, { unidades, detalleDeUnidades: detalleDeUnidades as never }),
        }),
      ],
    });

  it('cada renglón pone su serie, placa, marca y modelo, y su código si lo escribió', async () => {
    const linea = lineaDePrueba({ costoCentavos: 90_000 });
    e.lineas.sembrar(linea);

    await asignar(linea, 3, [
      { codigo: 'TR-01', numeroDeSerie: 'S-1', placa: 'P-111', marca: null, modelo: '5075E' },
      { codigo: null, numeroDeSerie: 'S-2', placa: 'P-222', marca: null, modelo: null },
    ]);

    expect(activos().map((a) => [a.codigo, a.numeroDeSerie, a.placa, a.modelo])).toEqual([
      ['TR-01', 'S-1', 'P-111', '5075E'],
      ['AF-0001', 'S-2', 'P-222', null],
      ['AF-0002', null, null, null],
    ]);
  });

  it('los códigos propuestos saltan los que escribió el usuario y los que ya usa otro activo', async () => {
    const primera = lineaDePrueba({ costoCentavos: 10_000 });
    const linea = lineaDePrueba({ costoCentavos: 90_000 });
    e.lineas.sembrar(primera);
    e.lineas.sembrar(linea);
    await asignar(primera, 1, [{ codigo: 'AF-0001' }]);

    await asignar(linea, 3, [{ codigo: 'af-0002' }]);

    expect(activos().map((a) => a.codigo)).toEqual(['AF-0001', 'af-0002', 'AF-0003', 'AF-0004']);
  });

  it('códigos repetidos en la cuadrícula (sin importar mayúsculas) se rechazan con su renglón y no guardan nada', async () => {
    const linea = lineaDePrueba({ costoCentavos: 90_000 });
    e.lineas.sembrar(linea);

    const error = await asignar(linea, 3, [{ codigo: 'TR-1' }, { codigo: 'OTRO' }, { codigo: 'tr-1' }]).catch(
      (fallo: unknown) => fallo,
    );

    expect(error).toBeInstanceOf(CodigosDeUnidadesRepetidos);
    expect((error as CodigosDeUnidadesRepetidos).detalles).toEqual({
      renglones: [
        { asignacion: 0, renglon: 0, codigo: 'TR-1', causa: 'repetido_en_la_cuadricula' },
        { asignacion: 0, renglon: 2, codigo: 'tr-1', causa: 'repetido_en_la_cuadricula' },
      ],
    });
    expect(activos()).toHaveLength(0);
    expect(e.costos.registros.size).toBe(0);
  });

  it('un código que ya usa otro activo se rechaza con su renglón', async () => {
    const primera = lineaDePrueba({ costoCentavos: 10_000 });
    const linea = lineaDePrueba({ costoCentavos: 90_000 });
    e.lineas.sembrar(primera);
    e.lineas.sembrar(linea);
    await asignar(primera, 1, [{ codigo: 'TR-1' }]);

    const error = await asignar(linea, 2, [{ codigo: 'LIBRE' }, { codigo: 'tr-1' }]).catch((fallo: unknown) => fallo);

    expect((error as CodigosDeUnidadesRepetidos).detalles).toEqual({
      renglones: [{ asignacion: 0, renglon: 1, codigo: 'tr-1', causa: 'ya_usado_por_otro_activo' }],
    });
    expect(activos()).toHaveLength(1);
  });

  it('el mismo código en dos asignaciones de la misma operación también se rechaza', async () => {
    const linea = lineaDePrueba({ costoCentavos: 90_000 });
    e.lineas.sembrar(linea);

    await expect(
      e.capitalizar.ejecutar(operador, {
        asignaciones: [
          asignacion(linea.lineaId, 40_000, {
            activoNuevo: activoNuevo(e.claseId, { detalleDeUnidades: [{ codigo: 'X-1' } as never] }),
          }),
          asignacion(linea.lineaId, 40_000, {
            activoNuevo: activoNuevo(e.claseId, { detalleDeUnidades: [{ codigo: 'X-1' } as never] }),
          }),
        ],
      }),
    ).rejects.toBeInstanceOf(CodigosDeUnidadesRepetidos);
  });

  it('una cuadrícula con más renglones que unidades se rechaza', async () => {
    const linea = lineaDePrueba({ costoCentavos: 90_000 });
    e.lineas.sembrar(linea);

    await expect(asignar(linea, 1, [{ codigo: 'A' }, { codigo: 'B' }])).rejects.toBeInstanceOf(CostoInvalido);
  });
});

describe('costos que llegan después a una compra conjunta', () => {
  const crearTractores = async (unidades: number) => {
    const linea = lineaDePrueba({ costoCentavos: 90_000_000 });
    e.lineas.sembrar(linea);
    return e.capitalizar.ejecutar(operador, {
      asignaciones: [asignacion(linea.lineaId, 90_000_000, { activoNuevo: activoNuevo(e.claseId, { unidades }) })],
    });
  };

  it('el flete se reparte igual entre sus activos vigentes y el sobrante va al último', async () => {
    const compra = await crearTractores(3);
    const flete = lineaDePrueba({ documento: 'B-9', costoCentavos: 1_000_001 });
    e.lineas.sembrar(flete);

    await e.capitalizar.ejecutar(operador, {
      asignaciones: [
        asignacion(flete.lineaId, 1_000_001, { altaConjuntaId: compra.altaConjuntaIds[0]!, claseDeCosto: 'flete' }),
      ],
    });

    const fletes = compra.activos.map((a) => costosPor(a.id).find((c) => c.claseDeCosto === 'flete')!.montoCentavos);
    expect(fletes).toEqual([333_333, 333_333, 333_335]);
  });

  it('no cuenta los activos dados de baja: el reparto es entre los vigentes', async () => {
    const compra = await crearTractores(3);
    const baja = e.activos.registros.get(compra.activos[0]!.id)!;
    e.activos.registros.set(
      compra.activos[0]!.id,
      Activo.reconstruir({ ...baja.instantanea(), estado: 'dado_de_baja', fechaDeBaja: '2026-11-10' }),
    );
    const flete = lineaDePrueba({ costoCentavos: 10_001 });
    e.lineas.sembrar(flete);

    await e.capitalizar.ejecutar(operador, {
      asignaciones: [asignacion(flete.lineaId, 10_001, { altaConjuntaId: compra.altaConjuntaIds[0]! })],
    });

    expect(costosPor(compra.activos[0]!.id)).toHaveLength(1);
    expect(costosPor(compra.activos[1]!.id).map((c) => c.montoCentavos)).toEqual([30_000_000, 5_000]);
    expect(costosPor(compra.activos[2]!.id).map((c) => c.montoCentavos)).toEqual([30_000_000, 5_001]);
  });

  it('una compra conjunta sin activos vigentes, o que no existe, no recibe costos', async () => {
    const flete = lineaDePrueba({ costoCentavos: 10_000 });
    e.lineas.sembrar(flete);

    await expect(
      e.capitalizar.ejecutar(operador, {
        asignaciones: [asignacion(flete.lineaId, 10_000, { altaConjuntaId: crypto.randomUUID() })],
      }),
    ).rejects.toBeInstanceOf(AltaConjuntaSinActivosVigentes);
  });

  it('la regla de la línea sigue: el flete no pasa de lo que costó', async () => {
    const compra = await crearTractores(2);
    const flete = lineaDePrueba({ costoCentavos: 10_000 });
    e.lineas.sembrar(flete);

    await expect(
      e.capitalizar.ejecutar(operador, {
        asignaciones: [asignacion(flete.lineaId, 10_001, { altaConjuntaId: compra.altaConjuntaIds[0]! })],
      }),
    ).rejects.toMatchObject({ codigo: 'linea_sobrecapitalizada' });
  });
});
