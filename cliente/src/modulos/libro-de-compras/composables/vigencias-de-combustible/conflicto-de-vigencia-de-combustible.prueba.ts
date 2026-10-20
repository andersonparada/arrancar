import { describe, expect, it } from 'vitest';
import type { VigenciaDeCombustible } from '../../servicios/vigencias-de-combustible.api';
import { edicionDe, type EdicionDeVigenciaDeCombustible } from './edicion-de-vigencia-de-combustible';
import {
  CODIGO_VIGENCIA_EN_USO,
  camposDelConflictoDeUso,
  erroresDeUsoDeVigencia,
} from './conflicto-de-vigencia-de-combustible';

const guardada: VigenciaDeCombustible = {
  id: 'v-1',
  combustibleId: 'c-1',
  combustibleNombre: 'Diésel',
  idpPorGalon: '4.70',
  porcentajeDeEtanol: '0.00',
  ivaExento: false,
  vigenteDesde: '2026-01-01',
  vigenteHasta: null,
};

const enUso = { codigo: CODIGO_VIGENCIA_EN_USO, message: 'Esta vigencia ya se usó en documentos.' };

/** La ventana de la tasa guardada con un cambio. */
const conCambio = (cambios: Partial<EdicionDeVigenciaDeCombustible>): EdicionDeVigenciaDeCombustible => ({
  ...edicionDe(guardada),
  ...cambios,
});

describe('campos que señala el conflicto de uso', () => {
  it('marca la exención de IVA si el usuario la cambió', () => {
    expect(camposDelConflictoDeUso(guardada, conCambio({ ivaExento: true }))).toEqual(['ivaExento']);
  });

  it('marca la tasa, el etanol y el inicio si cambiaron', () => {
    const edicion = conCambio({ idpPorGalon: '5', porcentajeDeEtanol: '10', vigenteDesde: '2026-02-01' });
    expect(camposDelConflictoDeUso(guardada, edicion)).toEqual(['idpPorGalon', 'porcentajeDeEtanol', 'vigenteDesde']);
  });

  it('compara los números por valor, no por texto', () => {
    expect(camposDelConflictoDeUso(guardada, conCambio({ idpPorGalon: '4.7' }))).toEqual(['vigenteHasta']);
  });

  it('si solo cambió el cierre, el conflicto es de «Vigente hasta»', () => {
    expect(camposDelConflictoDeUso(guardada, conCambio({ vigenteHasta: '2026-03-01' }))).toEqual(['vigenteHasta']);
  });
});

describe('errores por campo del conflicto de uso', () => {
  it('pone el mensaje del servidor en la exención de IVA que se quiso cambiar', () => {
    expect(erroresDeUsoDeVigencia(guardada, conCambio({ ivaExento: true }), enUso)).toEqual({
      ivaExento: enUso.message,
    });
  });

  it('no marca campos si el error no es de uso', () => {
    const otro = { codigo: 'validacion', message: 'Revise los datos enviados.' };
    expect(erroresDeUsoDeVigencia(guardada, conCambio({ ivaExento: true }), otro)).toEqual({});
  });

  it('no marca campos para una tasa nueva, que no tiene uso', () => {
    expect(erroresDeUsoDeVigencia(null, edicionDe(), enUso)).toEqual({});
  });
});
