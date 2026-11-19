import { describe, expect, it } from 'vitest';
import {
  AuditoriaEnMemoria,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../compartido/pruebas/dobles-compartidos.js';
import {
  CatalogoDeMonedasEnMemoria,
  MonedasDelBanguatEnMemoria,
} from '../../pruebas/catalogo-de-monedas-en-memoria.js';
import { EditarMoneda } from './editar-moneda.js';
import { ListarMonedasDelBanguat } from './listar-monedas-del-banguat.js';

const operador = operadorDePrueba({ esSuperacceso: true });

function armar(excluidos: ReadonlySet<number> = new Set()) {
  const catalogo = new CatalogoDeMonedasEnMemoria();
  const delBanguat = new MonedasDelBanguatEnMemoria();
  const auditoria = new AuditoriaEnMemoria();
  const editar = new EditarMoneda({
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    catalogo,
    delBanguat,
    auditoria,
    excluidos,
  });
  return {
    catalogo,
    delBanguat,
    auditoria,
    editar,
    listar: new ListarMonedasDelBanguat({ catalogo, delBanguat, excluidos }),
  };
}

describe('EditarMoneda: el código del Banguat', () => {
  it('une una moneda con un código que el Banguat ofrece y devuelve la moneda con su descripción', async () => {
    const { editar, catalogo } = armar();

    const euro = await editar.ejecutar(operador, 'EUR', { codigoBanguat: 28 });

    expect(euro.codigoBanguat).toBe(28);
    expect((await catalogo.buscar('EUR'))?.codigoBanguat).toBe(28);
  });

  it('asignar un código por primera vez no se audita', async () => {
    const { editar, auditoria } = armar();

    await editar.ejecutar(operador, 'EUR', { codigoBanguat: 28 });

    expect(auditoria.entradas).toEqual([]);
  });

  it('rechaza un código que no está en la lista o que ya no está disponible', async () => {
    const { editar } = armar();

    await expect(editar.ejecutar(operador, 'EUR', { codigoBanguat: 77 })).rejects.toMatchObject({
      codigo: 'codigo_del_banguat_no_ofrecido',
    });
    await expect(editar.ejecutar(operador, 'EUR', { codigoBanguat: 99 })).rejects.toMatchObject({
      codigo: 'codigo_del_banguat_no_ofrecido',
    });
  });

  it('rechaza un código excluido por soporte (DEG, bolívares, colón)', async () => {
    const { editar } = armar(new Set([28]));

    await expect(editar.ejecutar(operador, 'EUR', { codigoBanguat: 28 })).rejects.toMatchObject({
      codigo: 'codigo_del_banguat_no_ofrecido',
    });
  });

  it('rechaza un código que ya es de otra moneda, y dice de cuál', async () => {
    const { editar } = armar();

    await expect(editar.ejecutar(operador, 'EUR', { codigoBanguat: 2 })).rejects.toMatchObject({
      codigo: 'codigo_del_banguat_en_uso',
      detalles: { moneda: 'USD' },
    });
  });

  it('con tipos ya cargados deja el mismo código o quitarlo, pero no cambiarlo', async () => {
    const { editar, catalogo } = armar();
    await editar.ejecutar(operador, 'EUR', { codigoBanguat: 28 });
    catalogo.series.set('EUR', 28);

    await expect(editar.ejecutar(operador, 'EUR', { codigoBanguat: 29 })).rejects.toMatchObject({
      codigo: 'codigo_del_banguat_con_otra_serie',
      detalles: { moneda: 'EUR', codigoDeLaSerie: 28 },
    });
    await expect(editar.ejecutar(operador, 'EUR', { codigoBanguat: 28 })).resolves.toBeDefined();
    expect((await editar.ejecutar(operador, 'EUR', { codigoBanguat: null })).codigoBanguat).toBeNull();
  });

  it('quitar o cambiar el código se audita como corrección, con la moneda como estaba', async () => {
    const { editar, auditoria } = armar();
    await editar.ejecutar(operador, 'EUR', { codigoBanguat: 28 });

    await editar.ejecutar(operador, 'EUR', { codigoBanguat: 29 });
    await editar.ejecutar(operador, 'EUR', { codigoBanguat: null });

    expect(auditoria.acciones()).toEqual(['core.monedas:corregir', 'core.monedas:corregir']);
    expect(auditoria.entradas[0]).toMatchObject({
      registroId: 'EUR',
      anterior: expect.objectContaining({ codigoBanguat: 28 }),
    });
    expect(auditoria.entradas[1]).toMatchObject({ anterior: expect.objectContaining({ codigoBanguat: 29 }) });
  });

  it('el quetzal no admite código', async () => {
    const { editar } = armar();

    await expect(editar.ejecutar(operador, 'GTQ', { codigoBanguat: 2 })).rejects.toMatchObject({
      codigo: 'codigo_del_banguat_en_gtq',
    });
  });
});

describe('EditarMoneda: activar y desactivar', () => {
  it('desactivar y reactivar se auditan; no cambiar el estado no se audita', async () => {
    const { editar, auditoria } = armar();

    await editar.ejecutar(operador, 'USD', { activa: false });
    await editar.ejecutar(operador, 'USD', { activa: false });
    await editar.ejecutar(operador, 'USD', { activa: true });

    expect(auditoria.acciones()).toEqual(['core.monedas:inactivar', 'core.monedas:reactivar']);
    expect(auditoria.entradas[0]).toMatchObject({
      registroId: 'USD',
      anterior: expect.objectContaining({ activa: true }),
    });
  });

  it('no activa una moneda sin dos decimales (el yen) y no audita nada', async () => {
    const { editar, auditoria } = armar();

    await expect(editar.ejecutar(operador, 'JPY', { activa: true })).rejects.toMatchObject({
      codigo: 'moneda_sin_dos_decimales',
    });
    expect(auditoria.entradas).toEqual([]);
  });

  it('el quetzal no se desactiva', async () => {
    const { editar } = armar();

    await expect(editar.ejecutar(operador, 'GTQ', { activa: false })).rejects.toMatchObject({
      codigo: 'moneda_base_no_se_desactiva',
    });
  });

  it('completa las letras del monto', async () => {
    const { editar } = armar();

    const euro = await editar.ejecutar(operador, 'EUR', { letrasSingular: 'EURO', letrasPlural: 'EUROS' });

    expect(euro).toMatchObject({ letrasSingular: 'EURO', letrasPlural: 'EUROS' });
  });

  it('una moneda que no existe es no encontrada', async () => {
    const { editar } = armar();

    await expect(editar.ejecutar(operador, 'XXX', { activa: true })).rejects.toMatchObject({ codigo: 'no_encontrado' });
  });
});

describe('ListarMonedasDelBanguat', () => {
  it('lista lo ofrecido con a quién pertenece cada código y qué está excluido', async () => {
    const { listar } = armar(new Set([29]));

    const opciones = await listar.ejecutar();

    expect(opciones.find((o) => o.codigo === 2)).toMatchObject({ asignadaA: 'USD', excluida: false });
    expect(opciones.find((o) => o.codigo === 28)).toMatchObject({ asignadaA: null, excluida: false, disponible: true });
    expect(opciones.find((o) => o.codigo === 29)).toMatchObject({ excluida: true });
    expect(opciones.find((o) => o.codigo === 99)).toMatchObject({ disponible: false });
  });
});
