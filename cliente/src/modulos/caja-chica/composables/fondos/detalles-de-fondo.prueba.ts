import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Fondo } from '../../servicios/tipos-de-fondos';
import { detallesDeLaFicha, detallesDeLaTarjeta, partesDeLaEcuacion, textoDelEstado } from './detalles-de-fondo';
import { opcionesDeChequeras, opcionesDeLocalidades, opcionesDeNombres } from './opciones-de-fondos';

// Los formatos leen la sesión (Pinia).
beforeEach(() => setActivePinia(createPinia()));

const fondo: Fondo = {
  id: 'f-1',
  nombre: 'Caja de la finca',
  localidadId: 'l-1',
  localidadNombre: 'Finca El Roble',
  custodio: 'Ana',
  custodioUsuarioId: null,
  estado: 'abierto',
  fechaDeApertura: '2026-10-01',
  aperturaAnulada: false,
  monto: '5000.00',
  efectivoEsperado: '3200.00',
  pendienteDeReponer: '1800.00',
  valesAbiertos: '0.00',
  ultimoArqueo: null,
  avisos: [],
  topePorComprobante: null,
  cuentaBancariaId: null,
  cuentaBancariaNombre: null,
  fechaDeCierre: null,
  motivoDeCierre: null,
  observaciones: null,
  custodios: [],
  cambiosDeMonto: [],
  puedeEditar: true,
  puedeAumentar: true,
  puedeDisminuir: true,
  puedeCambiarCustodio: true,
  puedeAnularApertura: false,
};

describe('detalles del fondo', () => {
  it('la tarjeta dice quién lo tiene y que nunca se arqueó', () => {
    const detalles = detallesDeLaTarjeta(fondo);
    expect(detalles.find((d) => d.etiqueta === 'Custodio')?.valor).toBe('Ana');
    expect(detalles.find((d) => d.etiqueta === 'Último arqueo')?.valor).toBe('Nunca');
  });

  it('la tarjeta muestra los vales abiertos solo cuando hay', () => {
    expect(detallesDeLaTarjeta(fondo).some((d) => d.etiqueta === 'Vales abiertos')).toBe(false);
    const conVales = detallesDeLaTarjeta({ ...fondo, valesAbiertos: '500.00' });
    expect(conVales.find((d) => d.etiqueta === 'Vales abiertos')?.valor).toContain('500.00');
  });

  it('la ecuación lista las cuatro partes que calculó el servidor', () => {
    expect(partesDeLaEcuacion(fondo).map((p) => p.etiqueta)).toEqual([
      'Efectivo esperado en caja',
      'Comprobantes pendientes de reponer',
      'Vales provisionales abiertos',
      'Monto del fondo',
    ]);
  });

  it('la ficha muestra la cuenta para reponer solo si el fondo la tiene', () => {
    expect(detallesDeLaFicha(fondo).some((d) => d.etiqueta === 'Cuenta para reponer')).toBe(false);
    const conCuenta = { ...fondo, cuentaBancariaId: 'c-1', cuentaBancariaNombre: 'Banrural 001' };
    expect(detallesDeLaFicha(conCuenta).find((d) => d.etiqueta === 'Cuenta para reponer')?.valor).toBe('Banrural 001');
  });

  it('la ficha agrega el cierre solo si el fondo se cerró', () => {
    expect(detallesDeLaFicha(fondo).some((d) => d.etiqueta === 'Cierre')).toBe(false);
    const cerrado = { ...fondo, estado: 'cerrado' as const, fechaDeCierre: '2026-11-01', motivoDeCierre: 'Se cerró' };
    expect(detallesDeLaFicha(cerrado).some((d) => d.etiqueta === 'Motivo del cierre')).toBe(true);
  });

  it('el estado distingue la apertura anulada', () => {
    expect(textoDelEstado(fondo)).toBe('Abierto');
    expect(textoDelEstado({ estado: 'cerrado', aperturaAnulada: true })).toBe('Apertura anulada');
  });
});

describe('opciones de los selectores', () => {
  it('van por nombre y la localidad lleva primero la opción vacía', () => {
    const opciones = opcionesDeLocalidades(
      [
        { id: '2', nombre: 'Zacapa' },
        { id: '1', nombre: 'Aldea' },
      ],
      'Sin localidad',
    );
    expect(opciones.map((o) => o.texto)).toEqual(['Sin localidad', 'Aldea', 'Zacapa']);
    expect(opcionesDeNombres([{ id: '1', nombre: 'b' }], 'Elija')[0]?.valor).toBeNull();
  });

  it('una chequera sin cheques se ve apagada', () => {
    const [agotada, con] = opcionesDeChequeras([
      { id: 'a', cuentaBancariaNombre: 'Banco A', serie: null, disponibles: 0 },
      { id: 'b', cuentaBancariaNombre: 'Banco B', serie: 'X', disponibles: 1 },
    ]);
    expect(agotada?.deshabilitada).toBe(true);
    expect(con?.texto).toContain('1 cheque disponible');
  });
});
