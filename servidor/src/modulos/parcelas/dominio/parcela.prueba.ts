import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import type { DatosDeParcela } from './datos-de-parcela.js';
import {
  MadreInactiva,
  NivelMaximoDeParcelas,
  ParcelaDeOtraLocalidad,
  ParcelaInvalida,
  SuperficieUtilMayorQueTotal,
} from './errores-de-parcela.js';
import { Parcela } from './parcela.js';
import { avisosDelPunto } from './reglas-de-parcela.js';

const empresaId = Identificador.nuevo<'Empresa'>();
const localidadId = randomUUID();

const datos = (cambios: Partial<DatosDeParcela> = {}): DatosDeParcela => ({
  tipoId: randomUUID(),
  codigo: 'p-1',
  nombre: 'Potrero 1',
  formaDeTenencia: 'propia',
  latitud: null,
  longitud: null,
  colindanciaNorte: null,
  colindanciaSur: null,
  colindanciaOriente: null,
  colindanciaPoniente: null,
  observaciones: null,
  ...cambios,
});

const crear = (cambios: Partial<DatosDeParcela> = {}, madre: Parcela | null = null, nivelesMaximos = 3) =>
  Parcela.crear(empresaId, datos(cambios), { localidadId, madre, nivelesMaximos });

describe('parcela', () => {
  it('una parcela sin madre es de nivel 1, con el código en mayúsculas y activa', () => {
    const parcela = crear().instantanea();

    expect(parcela).toMatchObject({ nivel: 1, codigo: 'P-1', activo: true, parcelaMadreId: null });
    expect(parcela.superficieTotalM2).toBeNull();
  });

  it('una subparcela es de un nivel más que su madre y de su misma localidad', () => {
    const madre = crear();

    const hija = Parcela.crear(empresaId, datos({ codigo: 'P-1A', nombre: 'Tablón A' }), {
      localidadId,
      madre,
      nivelesMaximos: 3,
    });

    expect(hija.instantanea()).toMatchObject({ nivel: 2, parcelaMadreId: madre.id.valor, localidadId });
  });

  it('no pasa del tope de niveles', () => {
    const nivel1 = crear();
    const nivel2 = crear({ codigo: 'P-2' }, nivel1, 2);

    expect(() => crear({ codigo: 'P-3' }, nivel2, 2)).toThrow(NivelMaximoDeParcelas);
  });

  it('la madre debe estar activa y ser de la misma localidad', () => {
    const inactiva = crear();
    inactiva.inactivar();
    const ajena = Parcela.crear(empresaId, datos({ codigo: 'AJ' }), {
      localidadId: randomUUID(),
      madre: null,
      nivelesMaximos: 3,
    });

    expect(() => crear({ codigo: 'H1' }, inactiva)).toThrow(MadreInactiva);
    expect(() => crear({ codigo: 'H2' }, ajena)).toThrow(ParcelaDeOtraLocalidad);
  });

  it('exige código válido, nombre y punto completo', () => {
    expect(() => crear({ codigo: 'con espacio' })).toThrow(ParcelaInvalida);
    expect(() => crear({ nombre: '  ' })).toThrow(ParcelaInvalida);
    expect(() => crear({ latitud: '14.5' })).toThrow(/juntas/);
    expect(() => crear({ latitud: '95', longitud: '10' })).toThrow(ParcelaInvalida);
  });

  it('cambia lo editable pero no el código, la localidad ni la madre', () => {
    const parcela = crear();

    parcela.cambiarDatos({ ...datos({ nombre: 'Potrero Norte', formaDeTenencia: 'arrendada' }), tipoId: randomUUID() });

    expect(parcela.instantanea()).toMatchObject({
      nombre: 'Potrero Norte',
      formaDeTenencia: 'arrendada',
      codigo: 'P-1',
    });
  });

  it('la superficie útil no pasa de la total', () => {
    const parcela = crear();

    parcela.fijarSuperficie({ total: '1000.00', util: '900.00' });
    expect(parcela.instantanea().superficieUtilM2).toBe('900.00');
    expect(() => parcela.fijarSuperficie({ total: '1000.00', util: '1000.01' })).toThrow(SuperficieUtilMayorQueTotal);
    parcela.fijarSuperficie(null);
    expect(parcela.instantanea().superficieTotalM2).toBeNull();
  });

  it('avisa, sin bloquear, si el punto queda fuera de Guatemala', () => {
    expect(avisosDelPunto('14.6349', '-90.5069')).toEqual([]);
    expect(avisosDelPunto('14.6349', '90.5069')).toHaveLength(1);
    expect(avisosDelPunto(null, null)).toEqual([]);
    expect(crear({ latitud: '14.6349', longitud: '90.5069' }).instantanea().latitud).toBe('14.6349');
  });
});
