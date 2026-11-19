import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { SaldoInicial } from '../../servicios/saldos-iniciales.api';
import { detallesDeSaldoEnFicha, motivoDeCargaBloqueada } from './detalles-de-saldo';
import {
  datosDeSaldo,
  edicionDeSaldo,
  edicionDeSaldoNueva,
  erroresDeSaldo,
  sinDepreciacion,
  valorEnLibrosEscrito,
} from './edicion-de-saldo-inicial';

beforeEach(() => setActivePinia(createPinia()));

const llena = () => ({
  ...edicionDeSaldoNueva(),
  descripcion: ' Tractor ',
  claseId: 'c1',
  fechaDeAdquisicion: '2024-02-01',
  fechaDeInicioDeUso: '2024-03-01',
  costo: '100000.00',
  depreciacionAcumuladaContable: '20000.00',
  depreciacionAcumuladaFiscal: '30000.00',
});

describe('formulario del saldo inicial', () => {
  it('pide lo indispensable y dice cómo corregirlo', () => {
    const errores = erroresDeSaldo(edicionDeSaldoNueva(), 'maquinaria_y_vehiculos');
    expect(Object.keys(errores).sort()).toEqual(['claseId', 'costo', 'descripcion', 'fechaDeAdquisicion']);
    expect(erroresDeSaldo(llena(), 'maquinaria_y_vehiculos')).toEqual({});
  });

  it('no acepta montos vacíos ni negativos en la depreciación', () => {
    const edicion = { ...llena(), depreciacionAcumuladaContable: '', depreciacionAcumuladaFiscal: '-5' };
    expect(Object.keys(erroresDeSaldo(edicion, 'computo'))).toEqual([
      'depreciacionAcumuladaContable',
      'depreciacionAcumuladaFiscal',
    ]);
  });

  it('una obra sin terminar o un terreno no piden depreciación y la mandan en cero', () => {
    const obra = { ...llena(), enConstruccion: true, depreciacionAcumuladaContable: '' };
    expect(sinDepreciacion(obra, 'edificios')).toBe(true);
    expect(sinDepreciacion(llena(), 'terrenos')).toBe(true);
    expect(erroresDeSaldo(obra, 'edificios')).toEqual({});
    const datos = datosDeSaldo({ ...obra, fechaDeInicioDeUso: '2024-03-01' }, 'edificios');
    expect(datos.fechaDeInicioDeUso).toBeNull();
    expect(datos.depreciacionAcumuladaContable).toBe('0.00');
    expect(datos.depreciacionAcumuladaFiscal).toBe('0.00');
  });

  it('manda lo vacío como null para que el servidor proponga y deja fuera lo que no es del inciso', () => {
    const datos = datosDeSaldo(
      { ...llena(), valorDeMatricula: '500', valorComoGanadoComun: '9' },
      'maquinaria_y_vehiculos',
    );
    expect(datos).toMatchObject({
      descripcion: 'Tractor',
      codigo: null,
      costoFiscal: null,
      baseFiscal: null,
      porcentajeFiscal: null,
      vidaUtilRestanteMeses: null,
      valorResidual: null,
      valorDeMatricula: null,
      valorComoGanadoComun: null,
    });
  });

  it('en un edificio manda matrícula y catastro; en un reproductor, el valor como ganado común', () => {
    const base = { ...llena(), valorDeMatricula: '500', valorCatastral: '400', valorComoGanadoComun: '90' };
    expect(datosDeSaldo(base, 'edificios')).toMatchObject({ valorDeMatricula: '500', valorCatastral: '400' });
    expect(datosDeSaldo(base, 'reproductores').valorComoGanadoComun).toBe('90');
  });

  it('calcula el valor en libros mientras se escribe', () => {
    expect(valorEnLibrosEscrito(llena())).toBe(80000);
    expect(valorEnLibrosEscrito({ costo: '', depreciacionAcumuladaContable: '0' })).toBeNull();
    expect(valorEnLibrosEscrito({ costo: '10.10', depreciacionAcumuladaContable: '0.20' })).toBe(9.9);
  });
});

describe('saldo cargado', () => {
  const saldo = (cambios: Partial<SaldoInicial> = {}): SaldoInicial => ({
    activoId: 'a1',
    codigo: 'AF-0001',
    descripcion: 'Tractor',
    claseId: 'c1',
    claseNombre: 'Maquinaria',
    incisoFiscal: 'maquinaria_y_vehiculos',
    activoPadreId: null,
    activoPadreCodigo: null,
    enConstruccion: false,
    fechaDeCorte: '2026-01-01',
    fechaDeAdquisicion: '2024-02-01',
    fechaDeInicioDeUso: '2024-03-01',
    cantidad: 1,
    costo: '100000.00',
    depreciacionAcumuladaContable: '20000.00',
    valorEnLibros: '80000.00',
    costoFiscal: '100000.00',
    baseFiscal: '100000.00',
    depreciacionAcumuladaFiscal: '30000.00',
    porcentajeFiscal: '20.00',
    vidaUtilRestanteMeses: 48,
    valorResidual: null,
    valorComoGanadoComun: null,
    valorDeMatricula: null,
    valorCatastral: null,
    valoresDelInmuebleCompleto: false,
    marca: null,
    modelo: null,
    numeroDeSerie: null,
    placa: null,
    enBodega: false,
    localidadId: null,
    localidadNombre: null,
    departamentoId: null,
    departamentoNombre: null,
    responsable: null,
    observaciones: null,
    ...cambios,
  });

  it('vuelve al formulario con lo cargado, sin perder lo opcional vacío', () => {
    const edicion = edicionDeSaldo(saldo());
    expect(edicion).toMatchObject({ codigo: 'AF-0001', costo: '100000.00', vidaUtilRestanteMeses: '48', marca: '' });
    expect(datosDeSaldo(edicion, 'maquinaria_y_vehiculos').vidaUtilRestanteMeses).toBe(48);
  });

  it('en la ficha muestra la vida restante o una raya', () => {
    const vida = (s: SaldoInicial) => detallesDeSaldoEnFicha(s).find((d) => d.etiqueta === 'Vida útil restante')?.valor;
    expect(vida(saldo())).toBe('48 meses');
    expect(vida(saldo({ vidaUtilRestanteMeses: null }))).toBe('—');
  });

  it('explica por qué no se puede cargar', () => {
    expect(motivoDeCargaBloqueada({ fechaDeInicio: '2026-01-01', cargaCerrada: false }, false)).toBeNull();
    expect(motivoDeCargaBloqueada({ fechaDeInicio: '2026-01-01', cargaCerrada: true }, true)).toContain('cerrada');
    expect(motivoDeCargaBloqueada({ fechaDeInicio: null, cargaCerrada: false }, false)).toContain('fecha de inicio');
  });
});
