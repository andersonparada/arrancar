import { beforeEach, describe, expect, it } from 'vitest';
import { Activo } from '../../../dominio/activo.js';
import { CostoInvalido, DemasiadasUnidades, MontoDeCostoInvalido } from '../../../dominio/errores-de-costo.js';
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

const costosDe = (activoId: string) =>
  [...e.costos.registros.values()].map((c) => c.instantanea()).filter((c) => c.activoId === activoId);
const codigos = () => [...e.activos.registros.values()].map((a) => a.instantanea().codigo);

describe('a qué activos se puede capitalizar', () => {
  const sembrarActivo = async (tipoDeRegistro: 'activo' | 'bien_de_control') => {
    const linea = lineaDePrueba();
    e.lineas.sembrar(linea);
    const resultado = await e.capitalizar.ejecutar(operador, {
      asignaciones: [asignacion(linea.lineaId, 100_000, { activoNuevo: activoNuevo(e.claseId, { tipoDeRegistro }) })],
    });
    return e.activos.registros.get(resultado.activos[0]!.id)!;
  };

  it('un bien de control (nace en uso) recibe costos de referencia', async () => {
    const control = await sembrarActivo('bien_de_control');
    const otra = lineaDePrueba({ costoCentavos: 5_000 });
    e.lineas.sembrar(otra);

    await e.capitalizar.ejecutar(operador, {
      asignaciones: [asignacion(otra.lineaId, 5_000, { activoId: control.id.valor })],
    });

    expect(costosDe(control.id.valor)).toHaveLength(2);
  });

  it('uno en uso con libros, uno de terceros o uno dado de baja no', async () => {
    const activo = await sembrarActivo('activo');
    const base = activo.instantanea();
    const enUso = Activo.reconstruir({ ...base, estado: 'en_uso', fechaDeInicioDeUso: '2026-11-02' });
    const dadoDeBaja = Activo.reconstruir({ ...base, estado: 'dado_de_baja', fechaDeBaja: '2026-11-03' });
    const deTerceros = Activo.reconstruir({ ...base, tipoDeRegistro: 'de_terceros' });
    const otra = lineaDePrueba({ costoCentavos: 5_000 });
    e.lineas.sembrar(otra);

    for (const [candidato, codigo] of [
      [enUso, 'costo_posterior_no_disponible'],
      [dadoDeBaja, 'activo_dado_de_baja'],
      [deTerceros, 'activo_de_terceros_sin_costos'],
    ] as const) {
      e.activos.registros.set(base.id.valor, candidato);
      await expect(
        e.capitalizar.ejecutar(operador, {
          asignaciones: [asignacion(otra.lineaId, 5_000, { activoId: base.id.valor })],
        }),
      ).rejects.toMatchObject({ codigo });
    }
  });

  it('un activo que no existe es un recurso no encontrado', async () => {
    const linea = lineaDePrueba();
    e.lineas.sembrar(linea);

    await expect(
      e.capitalizar.ejecutar(operador, {
        asignaciones: [asignacion(linea.lineaId, 1_000, { activoId: crypto.randomUUID() })],
      }),
    ).rejects.toMatchObject({ codigo: 'no_encontrado' });
  });

  it('«no es edificación» solo se marca en edificios', async () => {
    const linea = lineaDePrueba();
    e.lineas.sembrar(linea);
    const pedir = (claseId: string) =>
      e.capitalizar.ejecutar(operador, {
        asignaciones: [asignacion(linea.lineaId, 1_000, { activoNuevo: activoNuevo(claseId), noEsEdificacion: true })],
      });

    await expect(pedir(e.claseId)).rejects.toBeInstanceOf(CostoInvalido);
    await pedir(e.edificiosId);
    expect([...e.costos.registros.values()][0]!.instantanea().noEsEdificacion).toBe(true);
  });
});

describe('tope de unidades', () => {
  const pedirUnidades = (...unidades: number[]) => {
    const linea = lineaDePrueba({ costoCentavos: 10_000_000 });
    e.lineas.sembrar(linea);
    return e.capitalizar.ejecutar(operador, {
      asignaciones: unidades.map((n) =>
        asignacion(linea.lineaId, 100_000, { activoNuevo: activoNuevo(e.claseId, { unidades: n }) }),
      ),
    });
  };

  it('200 unidades caben en una operación', async () => {
    const resultado = await pedirUnidades(200);

    expect(resultado.activos).toHaveLength(200);
    expect(new Set(codigos()).size).toBe(200);
  });

  it('201 unidades en una asignación, o 100 y 101 en dos, pasan del tope y no guardan nada', async () => {
    await expect(pedirUnidades(201)).rejects.toBeInstanceOf(DemasiadasUnidades);
    await expect(pedirUnidades(100, 101)).rejects.toBeInstanceOf(DemasiadasUnidades);
    expect(e.activos.registros.size).toBe(0);
  });

  it('una cantidad absurda se rechaza antes de crear nada', async () => {
    await expect(pedirUnidades(2_000_000_000)).rejects.toBeInstanceOf(DemasiadasUnidades);
  });

  it('un monto que no alcanza un centavo por unidad se rechaza', async () => {
    const linea = lineaDePrueba();
    e.lineas.sembrar(linea);

    await expect(
      e.capitalizar.ejecutar(operador, {
        asignaciones: [asignacion(linea.lineaId, 5, { activoNuevo: activoNuevo(e.claseId, { unidades: 10 }) })],
      }),
    ).rejects.toBeInstanceOf(MontoDeCostoInvalido);
  });
});
