import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ContrasenaResumen } from '../../servicios/tipos-de-contrasenas';
import {
  cantidadDeFiltrosDeContrasenas,
  consultaDeContrasenas,
  detallesDeContrasena,
  filtrosInicialesDeContrasenas,
  marcaDeContrasena,
} from './filtros-de-contrasenas';

const resumen = (cambios: Partial<ContrasenaResumen> = {}): ContrasenaResumen => ({
  id: 'c1',
  numero: '2026-15',
  fecha: '2026-11-01',
  fechaDePago: '2026-11-30',
  proveedorNombre: 'Agro',
  documentos: 3,
  saldo: '1250.00',
  disponible: '1250.00',
  estado: 'vigente',
  pagoVencido: false,
  estadoDePago: 'pendiente',
  ...cambios,
});

// Los formatos de fecha y monto leen la sesión (Pinia).
beforeEach(() => setActivePinia(createPinia()));

describe('filtros de contraseñas', () => {
  it('al abrir pide las vigentes y no manda filtros vacíos', () => {
    expect(consultaDeContrasenas(filtrosInicialesDeContrasenas(), 1)).toMatchObject({
      estado: 'vigente',
      pagina: 1,
      proveedorId: undefined,
      desde: undefined,
    });
  });

  it('cuenta los filtros distintos de lo inicial', () => {
    expect(cantidadDeFiltrosDeContrasenas(filtrosInicialesDeContrasenas())).toBe(0);
    const filtros = { ...filtrosInicialesDeContrasenas(), proveedorId: 'p1', estado: 'todas' as const };
    expect(cantidadDeFiltrosDeContrasenas(filtros)).toBe(2);
    expect(consultaDeContrasenas(filtros, 3)).toMatchObject({ proveedorId: 'p1', estado: 'todas', pagina: 3 });
  });
});

describe('tarjeta de contraseña', () => {
  it('anulada pesa más que pago vencido', () => {
    expect(marcaDeContrasena(resumen({ estado: 'anulada', pagoVencido: true }))).toBe('Anulada');
    expect(marcaDeContrasena(resumen({ pagoVencido: true }))).toBe('Pago vencido');
    expect(marcaDeContrasena(resumen())).toBeUndefined();
  });

  it('muestra cómo va el pago salvo que no se haya pagado nada', () => {
    expect(marcaDeContrasena(resumen({ estadoDePago: 'en_parte' }))).toBe('Pagado en parte');
    expect(marcaDeContrasena(resumen({ estadoDePago: 'pagado' }))).toBe('Pagado');
    expect(marcaDeContrasena(resumen({ estadoDePago: 'comprometido' }))).toBe('Comprometido');
    expect(marcaDeContrasena(resumen({ estadoDePago: 'en_parte', pagoVencido: true }))).toBe('Pago vencido');
  });

  it('muestra proveedor, fechas, documentos y saldo', () => {
    const etiquetas = detallesDeContrasena(resumen()).map((detalle) => detalle.etiqueta);
    expect(etiquetas).toEqual(['Proveedor', 'Fecha', 'Pago prometido', 'Documentos', 'Saldo']);
  });
});
