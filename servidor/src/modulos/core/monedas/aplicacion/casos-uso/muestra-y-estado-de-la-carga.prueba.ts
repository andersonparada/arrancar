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
import { armar, completar, fallo, publicacion } from '../../pruebas/escenario-de-carga.js';
import type { BitacoraDelBanguat, MonedaConCodigoDelBanguat } from '../puertos/bitacora-del-banguat.js';
import { ConsultarEstadoDeLaCarga } from './consultar-estado-de-la-carga.js';
import { EditarMoneda } from './editar-moneda.js';
import { VerMuestraDelBanguat } from './ver-muestra-del-banguat.js';

function armarMuestra() {
  const base = armar();
  const catalogo = new CatalogoDeMonedasEnMemoria();
  const muestra = new VerMuestraDelBanguat({
    fuente: base.fuente,
    delBanguat: new MonedasDelBanguatEnMemoria(),
    catalogo,
    cargas: base.cargas,
    reloj: base.reloj,
    excluidos: new Set([9]),
  });
  return { ...base, muestra };
}

describe('VerMuestraDelBanguat', () => {
  it('trae los últimos 7 días del código, ordenados, sin guardar tipos y con su fila en la bitácora', async () => {
    const { muestra, fuente, cargas } = armarMuestra();
    cargas.poner('USD', '2026-11-17', '7.64489');
    fuente.publicaciones.push(publicacion('EUR', '2026-11-17', '1.1257'), publicacion('EUR', '2026-11-16', '1.125'));

    const hecha = await muestra.ejecutar(24, { usuarioId: 'u1', moneda: 'EUR' });

    expect(hecha).toMatchObject({
      codigo: 24,
      descripcion: 'Euro',
      moneda: 'EUR',
      desde: '2026-11-12',
      hasta: '2026-11-18',
      resultado: 'exito',
      convencion: 'usd_por_unidad',
      valores: [
        { fecha: '2026-11-16', compra: '1.125', venta: '1.125', promedio: '1.125', dolar: null, referencia: null },
        {
          fecha: '2026-11-17',
          compra: '1.1257',
          venta: '1.1257',
          promedio: '1.1257',
          dolar: '7.64489',
          referencia: '8.60585267', // 1.1257 × 7.64489, un solo redondeo a 8 decimales
        },
      ],
    });
    expect(cargas.tipos).toHaveLength(1);
    expect(cargas.consultas).toMatchObject([
      { vuelta: 'muestra', operacion: 'TipoCambioRangoMoneda', moneda: 'EUR', codigoBanguat: 24, disparadaPor: 'u1' },
    ]);
  });

  it('si el código no tiene valores en la semana dice sin_datos', async () => {
    const { muestra } = armarMuestra();

    expect(await muestra.ejecutar(24, { usuarioId: 'u1' })).toMatchObject({ resultado: 'sin_datos', valores: [] });
  });

  it('un fallo del Banguat no lanza: vuelve como error con su mensaje y queda en la bitácora', async () => {
    const { muestra, fuente, cargas } = armarMuestra();
    fuente.fallosPendientes.push(fallo());

    const hecha = await muestra.ejecutar(24, { usuarioId: 'u1' });

    expect(hecha).toMatchObject({ resultado: 'error', mensaje: 'El Banguat no respondió.' });
    expect(cargas.consultas).toMatchObject([{ vuelta: 'muestra', resultado: 'error' }]);
  });

  it('rechaza un código que no está en la lista, ya no está disponible, está excluido o no tiene convención', async () => {
    const { muestra, fuente } = armarMuestra();

    for (const codigo of [77, 99, 9, 98])
      await expect(muestra.ejecutar(codigo, { usuarioId: 'u1' })).rejects.toMatchObject({
        codigo: 'codigo_del_banguat_no_ofrecido',
      });
    expect(fuente.consultas).toBe(0);
  });
});

class BitacoraEnMemoria implements BitacoraDelBanguat {
  monedas: MonedaConCodigoDelBanguat[] = [];
  async ultimasConsultas() {
    return [];
  }
  async monedasConCodigo() {
    return this.monedas;
  }
}

const serie = (moneda: string, extra: Partial<MonedaConCodigoDelBanguat>): MonedaConCodigoDelBanguat => ({
  moneda,
  nombre: moneda,
  codigoBanguat: moneda === 'USD' ? 2 : 24,
  activa: true,
  ultimaFecha: null,
  ...extra,
});

describe('ConsultarEstadoDeLaCarga', () => {
  async function estado(series: MonedaConCodigoDelBanguat[]) {
    const bitacora = new BitacoraEnMemoria();
    bitacora.monedas = series;
    const caso = new ConsultarEstadoDeLaCarga({
      bitacora,
      reloj: { hoy: async () => '2026-11-18' },
    });
    return (await caso.ejecutar({ limite: 50 })).series;
  }

  it('el dólar avisa con más de 1 día de atraso del calendario; con el de ayer o el de mañana no', async () => {
    const hechas = await estado([
      serie('USD', { ultimaFecha: '2026-11-17' }),
      serie('USD', { ultimaFecha: '2026-11-19' }),
      serie('USD', { ultimaFecha: '2026-11-16' }),
    ]);

    expect(hechas.map((s) => [s.diasDeAtraso, s.atrasada])).toEqual([
      [1, false],
      [0, false],
      [2, true],
    ]);
  });

  it('las demás monedas avisan con más de 3 días hábiles: el fin de semana no cuenta', async () => {
    const hechas = await estado([
      serie('EUR', { ultimaFecha: '2026-11-13' }),
      serie('EUR', { ultimaFecha: '2026-11-12' }),
    ]);

    expect(hechas.map((s) => [s.diasDeAtraso, s.atrasada])).toEqual([
      [3, false],
      [4, true],
    ]);
  });

  it('una moneda activa que nunca se cargó avisa; una inactiva no', async () => {
    const hechas = await estado([serie('EUR', {}), serie('GBP', { activa: false })]);

    expect(hechas.map((s) => [s.diasDeAtraso, s.atrasada])).toEqual([
      [null, true],
      [null, false],
    ]);
  });
});

describe('rellenar una moneda recién lista', () => {
  it('pide solo los 45 días con huecos de esa moneda, con la vuelta relleno', async () => {
    const { carga, cargas, fuente } = armar();
    completar(cargas, '2026-11-18');
    const hueco = cargas.tipos.findIndex((t) => t.moneda === 'EUR' && t.fecha === '2026-11-10');
    cargas.tipos.splice(hueco, 1);
    fuente.publicaciones.push(publicacion('EUR', '2026-11-10', '1.15'));

    await carga.rellenarMoneda('EUR');

    expect(cargas.consultas).toMatchObject([{ vuelta: 'relleno', moneda: 'EUR', desde: '2026-11-10' }]);
    expect(cargas.tipos.some((t) => t.moneda === 'EUR' && t.fecha === '2026-11-10')).toBe(true);
  });

  it('una moneda que no se carga (inactiva o sin código) no pide nada; con otra carga en curso, tampoco', async () => {
    const { carga, cargas, fuente, cerrojo } = armar();

    await carga.rellenarMoneda('GBP');
    cerrojo.ocupado = true;
    await carga.rellenarMoneda('EUR');

    expect(fuente.consultas).toBe(0);
    expect(cargas.consultas).toEqual([]);
  });
});

describe('«Actualizar lista» devuelve la consulta hecha', () => {
  it('con lista, dice cuántas monedas llegaron; con error o vacía, no toca nada y dice por qué', async () => {
    const { lista, fuente } = armar();
    fuente.monedasDelBanguat.push({ codigo: 24, descripcion: 'Euro' });
    const buena = await lista.ejecutarAPedido('u1');
    fuente.monedasDelBanguat.length = 0;
    const vacia = await lista.ejecutarAPedido('u1');
    fuente.fallosPendientes.push(fallo(), fallo(), fallo());
    fuente.monedasDelBanguat.push({ codigo: 24, descripcion: 'Euro' });
    const mala = await lista.ejecutarAPedido('u1');

    expect(buena).toMatchObject({ resultado: 'exito', nuevas: 1, noDisponibles: 0 });
    expect(vacia).toMatchObject({ resultado: 'sin_datos', nuevas: 0 });
    expect(mala).toMatchObject({ resultado: 'error', detalle: 'El Banguat no respondió.' });
  });
});

describe('EditarMoneda avisa cuándo traer la serie', () => {
  function editor() {
    const avisos: string[] = [];
    const catalogo = new CatalogoDeMonedasEnMemoria();
    const editar = new EditarMoneda({
      unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
      catalogo,
      delBanguat: new MonedasDelBanguatEnMemoria(),
      auditoria: new AuditoriaEnMemoria(),
      excluidos: new Set(),
      alQuedarParaCargar: (moneda) => avisos.push(moneda),
    });
    return { editar, avisos };
  }
  const operador = operadorDePrueba({ esSuperacceso: true });

  it('al unir el código a una moneda activa o al activar una que ya lo tiene, y no al dejar el mismo estado', async () => {
    const { editar, avisos } = editor();

    await editar.ejecutar(operador, 'EUR', { codigoBanguat: 24 });
    expect(avisos).toEqual([]);
    await editar.ejecutar(operador, 'EUR', { activa: true });
    await editar.ejecutar(operador, 'EUR', { letrasSingular: 'EURO', letrasPlural: 'EUROS' });
    await editar.ejecutar(operador, 'GBP', { activa: true, codigoBanguat: 9 });

    expect(avisos).toEqual(['EUR', 'GBP']);
  });
});
