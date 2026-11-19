import { beforeEach, describe, expect, it } from 'vitest';
import { DevolverALaBandeja } from '../comprobantes/devolver-a-la-bandeja.js';
import { FONDO_ID } from '../comprobantes/dobles-de-comprobantes.soporte.js';
import { ListarVales, ObtenerVale } from './consultas-de-vales.js';
import { armarEscenarioDeVales, AyudasDeVales, type EscenarioDeVales } from './dobles-de-vales.soporte.js';

let m: EscenarioDeVales;
let ayudas: AyudasDeVales;

beforeEach(async () => {
  m = await armarEscenarioDeVales(1_000_000);
  ayudas = new AyudasDeVales(m);
});

describe('consultas de los vales', () => {
  it('lista los vales del fondo y avisa del vale viejo pasados los días configurados', async () => {
    await ayudas.entregar({ fecha: '2026-11-10' });
    await ayudas.entregar({ fecha: '2026-11-17' });
    const liquidado = await ayudas.entregar({ fecha: '2026-11-01' });
    await ayudas.liquidar(liquidado.id, { fecha: '2026-11-02' });

    const lista = await new ListarVales(m.dependenciasDeVales).ejecutar(ayudas.operador, FONDO_ID);

    expect(lista.map(({ numero, diasAbierto }) => [numero, diasAbierto])).toEqual([
      [3, 0],
      [2, 1],
      [1, 8],
    ]);
    expect(lista.find(({ numero }) => numero === 1)!.avisos).toEqual(['El vale 1 lleva 8 días abierto: liquídelo.']);
    expect(lista.find(({ numero }) => numero === 2)!.avisos).toEqual([]);
    expect(lista.find(({ numero }) => numero === 3)!.avisos).toEqual([]);
  });

  it('con 0 días no avisa nunca, y la ficha trae los comprobantes y lo gastado', async () => {
    m.valores.diasParaAvisar = 0;
    const vale = await ayudas.entregar({ fecha: '2026-11-02' });
    await ayudas.liquidar(vale.id, { valesDeGasto: [ayudas.gasto()] });
    const abierto = await ayudas.entregar({ fecha: '2026-11-02' });

    const ficha = await new ObtenerVale(m.dependenciasDeVales).ejecutar(ayudas.operador, vale.id);

    expect(ficha).toMatchObject({ gastado: '50.00', devuelto: '450.00' });
    expect(ficha.comprobantes).toHaveLength(1);
    expect((await new ObtenerVale(m.dependenciasDeVales).ejecutar(ayudas.operador, abierto.id)).avisos).toEqual([]);
  });

  it('un vale que no existe no se encuentra', async () => {
    await expect(new ObtenerVale(m.dependenciasDeVales).ejecutar(ayudas.operador, 'no-existe')).rejects.toMatchObject({
      codigo: 'no_encontrado',
    });
  });
});

describe('un comprobante con el que se liquidó un vale', () => {
  it('no vuelve a la bandeja', async () => {
    const vale = await ayudas.entregar();
    const documentoId = await ayudas.enLaBandeja(30_000);
    await ayudas.liquidar(vale.id, { documentos: [{ comprobanteId: documentoId }] });

    await expect(
      new DevolverALaBandeja(m.dependencias).ejecutar(ayudas.operador, { comprobanteId: documentoId, motivo: 'x' }),
    ).rejects.toMatchObject({ codigo: 'comprobante_de_un_vale' });
  });
});
