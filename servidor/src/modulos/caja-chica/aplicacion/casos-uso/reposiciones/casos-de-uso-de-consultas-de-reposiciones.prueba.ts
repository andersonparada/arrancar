import { beforeEach, describe, expect, it } from 'vitest';
import { operadorDePrueba } from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { FONDO_ID } from '../comprobantes/dobles-de-comprobantes.soporte.js';
import { ListarReposiciones, ObtenerReposicion, SolicitarReposicion } from './consultas-de-reposiciones.js';
import {
  armarEscenarioDeReposiciones,
  sembrarComprobante,
  type EscenarioDeReposiciones,
} from './dobles-de-reposiciones.soporte.js';
import { RegistrarReposicion } from './registrar-reposicion.js';

const operador = operadorDePrueba();
let m: EscenarioDeReposiciones;

beforeEach(async () => {
  m = await armarEscenarioDeReposiciones();
});

describe('SolicitarReposicion', () => {
  it('trae lo pendiente del fondo, su total y cómo se repartiría en Bancos', async () => {
    await sembrarComprobante(m, { montoCentavos: 10_000 });
    await sembrarComprobante(m, { montoCentavos: 40_000, conActivoFijo: true });
    await sembrarComprobante(m, { montoCentavos: 1_000, resta: true, esNotaDeCredito: true });
    await sembrarComprobante(m, { montoCentavos: 9_900, estado: 'anulado' });

    const solicitud = await new SolicitarReposicion(m.dependenciasDeReposiciones).ejecutar(operador, FONDO_ID);

    expect(solicitud).toMatchObject({
      fondoId: FONDO_ID,
      fondoNombre: 'Caja',
      custodio: 'Juan Pérez',
      total: '490.00',
      desglose: { operacion: '90.00', activo: '400.00', faltante: '0.00' },
    });
    expect(solicitud.pendientes).toHaveLength(3);
  });

  it('un fondo que no existe o no se ve da «no encontrado»', async () => {
    await expect(
      new SolicitarReposicion(m.dependenciasDeReposiciones).ejecutar(operador, 'no-existe'),
    ).rejects.toMatchObject({ codigo: 'no_encontrado' });
  });
});

describe('ListarReposiciones y ObtenerReposicion', () => {
  it('la lista trae las del fondo y la ficha trae las líneas con su desglose', async () => {
    const gasto = await sembrarComprobante(m, { montoCentavos: 12_345 });
    const repuesta = await new RegistrarReposicion(m.dependenciasDeReposiciones).ejecutar(operador, {
      fondoId: FONDO_ID,
      comprobanteIds: [gasto.id],
      forma: 'cheque',
      chequeraId: 'chequera-1',
    });

    const lista = await new ListarReposiciones(m.dependenciasDeReposiciones).ejecutar(operador, FONDO_ID);
    const ficha = await new ObtenerReposicion(m.dependenciasDeReposiciones).ejecutar(operador, repuesta.id);

    expect(lista).toMatchObject([{ id: repuesta.id, numero: 1, monto: '123.45', estado: 'vigente' }]);
    expect(lista[0]).not.toHaveProperty('lineas');
    expect(ficha.lineas).toMatchObject([{ monto: '123.45', comprobante: { id: gasto.id, reposicionNumero: 1 } }]);
    expect(ficha.desglose.operacion).toBe('123.45');
  });

  it('una reposición que no existe da «no encontrada»', async () => {
    await expect(
      new ObtenerReposicion(m.dependenciasDeReposiciones).ejecutar(operador, 'no-existe'),
    ).rejects.toMatchObject({ codigo: 'no_encontrado' });
  });
});
