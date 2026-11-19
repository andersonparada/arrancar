import { describe, expect, it } from 'vitest';
import { UnidadDeTrabajoEnMemoria, operadorDePrueba } from '../../../compartido/pruebas/dobles-compartidos.js';
import { CatalogoDeMonedasEnMemoria } from '../../pruebas/catalogo-de-monedas-en-memoria.js';
import { TiposDeCambioEnMemoria } from '../../pruebas/tipos-de-cambio-en-memoria.js';
import { TiposDeCambio } from '../tipos-de-cambio.js';
import { RegistrarTipoDeCambio } from './registrar-tipo-de-cambio.js';

const operador = operadorDePrueba({ esSuperacceso: true });

function armar() {
  const guardados = new TiposDeCambioEnMemoria();
  const tiposDeCambio = new TiposDeCambio({ guardados, reloj: { hoy: async () => '2026-11-18' } });
  const registrar = new RegistrarTipoDeCambio({
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    guardados,
    catalogo: new CatalogoDeMonedasEnMemoria(),
    tiposDeCambio,
  });
  return { guardados, tiposDeCambio, registrar };
}

const solicitud = { moneda: 'USD', fecha: '2026-11-17', referencia: '7.65', motivo: 'El Banguat no respondió' };

describe('RegistrarTipoDeCambio', () => {
  it('agrega una versión manual con el usuario y el motivo', async () => {
    const { registrar, guardados } = armar();

    const creado = await registrar.ejecutar(operador, solicitud);

    expect(creado).toMatchObject({ moneda: 'USD', origen: 'manual', motivo: 'El Banguat no respondió' });
    expect(creado.registradoPor).toBe(operador.usuarioId);
    expect(guardados.filas).toHaveLength(1);
  });

  it('corregir agrega otra versión y no cambia la anterior', async () => {
    const { registrar, guardados } = armar();
    const primera = await registrar.ejecutar(operador, solicitud);
    const copiaDeLaPrimera = { ...primera };

    await registrar.ejecutar(operador, { ...solicitud, referencia: '7.70', motivo: 'Corrección' });

    expect(guardados.filas).toHaveLength(2);
    expect(guardados.filas[0]).toEqual(copiaDeLaPrimera);
    expect((await guardados.versiones('USD', '2026-11-17')).map((v) => v.referencia)).toEqual(['7.7', '7.65']);
  });

  it('el servicio ve la versión nueva de inmediato aunque ya hubiera leído el día', async () => {
    const { registrar, tiposDeCambio, guardados } = armar();
    guardados.poner('USD', '2026-11-17', '7.64');
    expect((await tiposDeCambio.vigente('USD', '2026-11-17')).referencia).toBe('7.64');

    await registrar.ejecutar(operador, solicitud);

    expect((await tiposDeCambio.vigente('USD', '2026-11-17')).referencia).toBe('7.65');
  });

  it('normaliza los decimales y guarda compra y venta si vienen', async () => {
    const { registrar } = armar();

    const creado = await registrar.ejecutar(operador, {
      ...solicitud,
      referencia: '7.65000',
      compra: '7.6',
      venta: ' 7.7 ',
    });

    expect(creado).toMatchObject({ referencia: '7.65', compra: '7.6', venta: '7.7' });
  });

  it('rechaza un tipo inválido', async () => {
    const { registrar } = armar();

    for (const referencia of ['0', '-1', 'abc', '1.123456789']) {
      await expect(registrar.ejecutar(operador, { ...solicitud, referencia })).rejects.toMatchObject({
        codigo: 'tipo_de_cambio_invalido',
      });
    }
    await expect(registrar.ejecutar(operador, { ...solicitud, compra: '0' })).rejects.toMatchObject({
      codigo: 'tipo_de_cambio_invalido',
    });
  });

  it('el quetzal no tiene tipo y una moneda inexistente es no encontrada', async () => {
    const { registrar } = armar();

    await expect(registrar.ejecutar(operador, { ...solicitud, moneda: 'GTQ' })).rejects.toMatchObject({
      codigo: 'tipo_de_cambio_del_quetzal',
    });
    await expect(registrar.ejecutar(operador, { ...solicitud, moneda: 'XXX' })).rejects.toMatchObject({
      codigo: 'no_encontrado',
    });
  });
});
