import { describe, expect, it } from 'vitest';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';
import { CuentaBancaria, CuentaBancariaInvalido, NumeroDeCuentaRepetido } from './cuenta-bancaria.js';

const datos = (numero: string) => ({
  nombre: 'Operación',
  bancoId: '00000000-0000-4000-8000-000000000001',
  numero,
  tipo: 'monetaria' as const,
  observaciones: null,
  activo: true,
});

const empresaId = Identificador.nuevo<'Empresa'>();

describe('número de la cuenta bancaria', () => {
  it('conserva lo que escribió el usuario y calcula su forma normalizada', () => {
    const cuenta = CuentaBancaria.crear(empresaId, datos(' 001-23 45 ')).instantanea();

    expect(cuenta.numero).toBe('001-23 45');
    expect(cuenta.numeroNormalizado).toBe('0012345');
  });

  it('recalcula la forma normalizada al cambiar el número', () => {
    const cuenta = CuentaBancaria.crear(empresaId, datos('111'));
    cuenta.cambiarDatos(datos('ab-9'));

    expect(cuenta.instantanea().numeroNormalizado).toBe('AB9');
  });

  it('no acepta un número sin letras ni dígitos', () => {
    expect(() => CuentaBancaria.crear(empresaId, datos('- -'))).toThrow(CuentaBancariaInvalido);
  });

  it('NumeroDeCuentaRepetido es una regla de negocio que dice qué número se repite', () => {
    const error = new NumeroDeCuentaRepetido('001-23 45');

    expect(error).toBeInstanceOf(ReglaDeNegocioInfringida);
    expect(error.codigo).toBe('numero_de_cuenta_repetido');
    expect(error.message).toBe('Ya existe la cuenta 001-23 45 en ese banco.');
  });
});
