import { describe, expect, it } from 'vitest';
import { operadorDePrueba } from '../../core/compartido/pruebas/dobles-compartidos.js';
import { ConceptosEnMemoria } from '../pruebas/dobles-de-conceptos.js';
import { ConceptosDeMovimientos } from './conceptos-de-movimientos.js';

describe('ConceptosDeMovimientos.deSistema', () => {
  it('siembra el catálogo si la empresa todavía no lo tiene y devuelve el de esa clave', async () => {
    const catalogo = new ConceptosEnMemoria();
    const conceptos = new ConceptosDeMovimientos(catalogo);

    const concepto = await conceptos.deSistema(operadorDePrueba(), 'transferencia');

    expect(concepto.instantanea()).toMatchObject({
      claveDeSistema: 'transferencia',
      nombre: 'Transferencia entre cuentas',
    });
    expect((await catalogo.listar()).length).toBeGreaterThan(5);
  });

  it('no vuelve a sembrar: usa el que ya existe', async () => {
    const catalogo = new ConceptosEnMemoria();
    const conceptos = new ConceptosDeMovimientos(catalogo);
    const operador = operadorDePrueba();

    const primero = await conceptos.deSistema(operador, 'saldo_inicial');
    const segundo = await conceptos.deSistema(operador, 'saldo_inicial');

    expect(segundo.id.valor).toBe(primero.id.valor);
  });
});
