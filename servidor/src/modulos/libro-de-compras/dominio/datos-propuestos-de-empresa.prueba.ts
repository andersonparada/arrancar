import { describe, expect, it } from 'vitest';
import type { RegimenDeIsrDeEmpresa, RegimenDeIva, TipoDePersona } from './datos-fiscales-de-empresa.js';
import { datosPropuestos } from './datos-propuestos-de-empresa.js';

type Esperado = [regimenIsr: RegimenDeIsrDeEmpresa | null | undefined, esAgenteDeIsr: boolean | undefined];

/** La tabla «R1-e resuelto» de `docs/modulos/diseno-datos-libro-de-compras.md`, fila por fila. */
const TABLA: Array<[RegimenDeIva, TipoDePersona, RegimenDeIsrDeEmpresa | null, Esperado]> = [
  ['general', 'juridica', null, ['utilidades', true]],
  ['general', 'juridica', 'opcional_simplificado', ['opcional_simplificado', true]],
  ['general', 'juridica', 'exento', ['exento', true]],
  ['general', 'individual', null, ['utilidades', true]],
  ['general', 'individual', 'utilidades', ['utilidades', true]],
  ['general', 'individual', 'opcional_simplificado', ['opcional_simplificado', undefined]],
  ['general', 'individual', 'exento', ['utilidades', true]],
  ['pequeno_contribuyente', 'juridica', null, [null, true]],
  ['pequeno_contribuyente', 'individual', null, [null, false]],
  ['pequeno_contribuyente_electronico', 'juridica', null, [null, true]],
  ['pequeno_contribuyente_electronico', 'individual', null, [null, false]],
  ['contribuyente_agropecuario', 'individual', null, [null, false]],
  ['contribuyente_agropecuario', 'juridica', null, [null, undefined]],
  ['primario_pecuario', 'juridica', null, [null, true]],
  ['primario_pecuario', 'individual', null, [null, false]],
  ['no_afiliado', 'juridica', null, ['exento', true]],
  ['no_afiliado', 'juridica', 'utilidades', ['utilidades', true]],
  ['no_afiliado', 'juridica', 'opcional_simplificado', ['opcional_simplificado', true]],
  ['no_afiliado', 'individual', null, [undefined, false]],
  ['no_afiliado', 'individual', 'utilidades', ['utilidades', false]],
  ['no_afiliado', 'individual', 'exento', [undefined, false]],
];

describe('datosPropuestos', () => {
  it.each(TABLA)('%s, %s, ISR escogido %s', (...fila) => {
    const [regimenIva, tipoDePersona, escogido, [regimenIsr, esAgente]] = fila;
    const propuestos = datosPropuestos(regimenIva, tipoDePersona, escogido);

    expect(propuestos).toEqual({ regimenIsr, agenteDeRetencionIva: 'ninguno', esAgenteDeRetencionIsr: esAgente });
  });

  it('el régimen de ISR escogido es opcional: sin él propone el de costumbre', () => {
    expect(datosPropuestos('general', 'individual').regimenIsr).toBe('utilidades');
  });

  it('el agente de IVA siempre se propone ninguno: solo la SAT califica a un agente', () => {
    for (const [regimenIva, tipoDePersona] of TABLA) {
      expect(datosPropuestos(regimenIva, tipoDePersona).agenteDeRetencionIva).toBe('ninguno');
    }
  });
});
