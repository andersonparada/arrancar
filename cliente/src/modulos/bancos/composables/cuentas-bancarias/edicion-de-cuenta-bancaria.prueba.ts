import { describe, expect, it } from 'vitest';
import type { DatosCuentaBancaria, CuentaBancaria } from '../../servicios/cuentas-bancarias.api';
import { datosDeCuentaBancaria, edicionDe } from './edicion-de-cuenta-bancaria';

const datos: DatosCuentaBancaria = {
  nombre: 'Registro de prueba',
  bancoId: '00000000-0000-4000-8000-000000000001',
  numero: 'Registro de prueba',
  tipo: 'monetaria',
  observaciones: 'Una nota de prueba.',
  activo: true,
};
const cuentaBancaria: CuentaBancaria = { id: 'registro-1', ...datos, bancoNombre: null, saldo: '0.00' };

describe('ventana de cuentas bancarias', () => {
  it('lo que se abre para editar se manda igual si no se cambia nada', () => {
    expect(datosDeCuentaBancaria(edicionDe(cuentaBancaria))).toEqual(datos);
    expect(edicionDe(cuentaBancaria).id).toBe(cuentaBancaria.id);
  });

  it('un registro nuevo empieza sin id', () => {
    expect(edicionDe()).toMatchObject({ abierta: true, id: null });
  });

  it('lo que no se llena se manda como null', () => {
    expect(datosDeCuentaBancaria(edicionDe())).toMatchObject({ observaciones: null });
  });
});
