import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { CargoDeContrasena, DocumentosDisponibles, NotaDisponible } from '../../servicios/tipos-de-contrasenas';
import {
  alternarMarca,
  datosDeContrasena,
  documentosMarcados,
  edicionDeContrasenaVacia,
  erroresDeContrasena,
  fechaDePagoSugerida,
  notasQueTocanBancarizacion,
  resumenDeContrasena,
  totalesDeLaContrasena,
} from './edicion-de-contrasena';
import { repartirEnVivo } from './reparto-de-contrasena';

const cargo = (id: string, cambios: Partial<CargoDeContrasena> = {}): CargoDeContrasena => ({
  documentoId: id,
  tipo: 'factura',
  serie: 'A',
  numero: id,
  origen: 'libro_de_compras',
  fechaEmision: '2026-10-01',
  vencimiento: '2026-11-01',
  estado: 'autorizado',
  total: '100.00',
  retenciones: '0.00',
  rebajado: '0.00',
  saldo: '100.00',
  retencionesPorPracticar: null,
  sobreUmbralDeBancarizacion: false,
  ...cambios,
});

const nota = (id: string, saldoLibre: string, cambios: Partial<NotaDisponible> = {}): NotaDisponible => ({
  documentoId: id,
  serie: null,
  numero: id,
  fechaEmision: '2026-10-05',
  saldoLibre,
  ...cambios,
});

const disponibles = (cargos: CargoDeContrasena[], notas: NotaDisponible[] = []): DocumentosDisponibles => ({
  cargos,
  notas,
  fechaDePagoPropuesta: '2026-11-14',
  umbralDeBancarizacion: '30000.00',
});

const marcando = (cargos: string[], notas: string[] = []) => ({
  ...edicionDeContrasenaVacia('2026-11-14'),
  proveedorId: 'p1',
  fechaDePagoEscrita: false,
  cargos,
  notas,
});

// Los formatos de fecha y monto leen la sesión (Pinia).
beforeEach(() => setActivePinia(createPinia()));

describe('reparto en vivo de las notas', () => {
  it('rebaja primero el cargo que vence antes y deja libre lo que sobra', () => {
    const cargos = [cargo('b', { vencimiento: '2026-12-01' }), cargo('a', { vencimiento: '2026-11-01' })];
    const reparto = repartirEnVivo(cargos, [nota('n', '130.00')]);
    expect(reparto.aplicaciones).toEqual([
      { notaId: 'n', cargoId: 'a', centavos: 10000 },
      { notaId: 'n', cargoId: 'b', centavos: 3000 },
    ]);
    expect(reparto.saldoPorCargo).toEqual({ a: 0, b: 7000 });
    expect(reparto.libreDeNota.n).toBe(0);
  });

  it('una nota mayor que lo debido sigue libre en lo que sobra', () => {
    const reparto = repartirEnVivo([cargo('a')], [nota('n', '150.00')]);
    expect(reparto.libreDeNota.n).toBe(5000);
  });

  it('un cargo sin vencimiento va al final', () => {
    const cargos = [cargo('a', { vencimiento: null }), cargo('b', { vencimiento: '2026-12-01' })];
    expect(repartirEnVivo(cargos, [nota('n', '10.00')]).aplicaciones[0]?.cargoId).toBe('b');
  });
});

describe('totales y marcas', () => {
  it('suma lo marcado y descuenta las notas del saldo', () => {
    const datos = disponibles([cargo('a', { retenciones: '5.00' }), cargo('b')], [nota('n', '40.00')]);
    const marcados = documentosMarcados(marcando(['a', 'b'], ['n']), datos);
    const totales = totalesDeLaContrasena(marcados, repartirEnVivo(marcados.cargos, marcados.notas));
    expect(totales).toEqual({
      total: '200.00',
      retenciones: '5.00',
      rebajadoAntes: '0.00',
      notasAplicadas: '40.00',
      saldo: '160.00',
    });
  });

  it('lo ya rebajado de un cargo (saldo inicial) se muestra aparte para que los totales cuadren', () => {
    const datos = disponibles(
      [cargo('a', { total: '1120.00', retenciones: '120.00', rebajado: '300.00', saldo: '700.00' })],
      [nota('n', '24.00')],
    );
    const marcados = documentosMarcados(marcando(['a'], ['n']), datos);
    const totales = totalesDeLaContrasena(marcados, repartirEnVivo(marcados.cargos, marcados.notas));
    expect(totales).toMatchObject({ rebajadoAntes: '300.00', notasAplicadas: '24.00', saldo: '676.00' });
  });

  it('alternar agrega y quita sin repetir', () => {
    expect(alternarMarca(['a'], 'b')).toEqual(['a', 'b']);
    expect(alternarMarca(['a', 'b'], 'a')).toEqual(['b']);
  });
});

describe('fecha de pago sugerida', () => {
  it('es la mayor fecha de vencimiento de lo marcado', () => {
    const cargos = [cargo('a', { vencimiento: '2026-11-20' }), cargo('b', { vencimiento: '2026-12-05' })];
    expect(fechaDePagoSugerida(cargos, '2026-11-14', '2026-11-14')).toBe('2026-12-05');
  });

  it('si todo venció antes de la contraseña, usa la fecha de la contraseña', () => {
    expect(fechaDePagoSugerida([cargo('a', { vencimiento: '2026-10-01' })], '2026-11-14', '2026-11-14')).toBe(
      '2026-11-14',
    );
  });

  it('sin vencimientos usa la del servidor', () => {
    expect(fechaDePagoSugerida([cargo('a', { vencimiento: null })], '2026-11-14', '2026-11-30')).toBe('2026-11-30');
  });
});

describe('aviso de bancarización', () => {
  it('avisa de la nota que compensa un cargo sobre el umbral', () => {
    const datos = disponibles(
      [cargo('a', { sobreUmbralDeBancarizacion: true })],
      [nota('n', '10.00'), nota('m', '10.00')],
    );
    const marcados = documentosMarcados(marcando(['a'], ['n']), datos);
    const avisadas = notasQueTocanBancarizacion(marcados, repartirEnVivo(marcados.cargos, marcados.notas));
    expect(avisadas.map((n) => n.documentoId)).toEqual(['n']);
  });

  it('no avisa si el cargo marcado no llega al umbral o la nota no se usa', () => {
    const datos = disponibles([cargo('a')], [nota('n', '10.00')]);
    const marcados = documentosMarcados(marcando(['a'], ['n']), datos);
    expect(notasQueTocanBancarizacion(marcados, repartirEnVivo(marcados.cargos, marcados.notas))).toEqual([]);
  });
});

describe('errores antes de enviar', () => {
  const datos = disponibles([cargo('a'), cargo('b', { fechaEmision: '2026-11-10' })], [nota('n', '500.00')]);

  it('pide proveedor y al menos un cargo', () => {
    const errores = erroresDeContrasena(edicionDeContrasenaVacia('2026-11-14'), datos, '2026-11-14');
    expect(errores.proveedorId).toBeTruthy();
    expect(errores.documentos).toMatch(/al menos una factura/);
  });

  it('una nota sola no basta', () => {
    expect(erroresDeContrasena(marcando([], ['n']), datos, '2026-11-14').documentos).toMatch(/al menos una factura/);
  });

  it('avisa si las notas cubren todo', () => {
    expect(erroresDeContrasena(marcando(['a'], ['n']), datos, '2026-11-14').documentos).toMatch(/nada que pagar/);
  });

  it('la fecha no puede ser futura ni anterior a la emisión de lo marcado', () => {
    const futura = { ...marcando(['a']), fecha: '2026-11-20' };
    expect(erroresDeContrasena(futura, datos, '2026-11-14').fecha).toMatch(/futura/);
    const antes = { ...marcando(['b']), fecha: '2026-11-05' };
    expect(erroresDeContrasena(antes, datos, '2026-11-14').fecha).toMatch(/anterior a la emisión/);
  });

  it('la fecha de pago no puede ser anterior a la contraseña', () => {
    const edicion = { ...marcando(['a']), fechaDePago: '2026-11-01' };
    expect(erroresDeContrasena(edicion, datos, '2026-11-14').fechaDePago).toMatch(/anterior/);
  });

  it('sin problemas no devuelve errores', () => {
    expect(erroresDeContrasena(marcando(['a']), datos, '2026-11-14')).toEqual({});
  });

  it('las observaciones pasan de 500 caracteres', () => {
    const edicion = { ...marcando(['a']), observaciones: 'x'.repeat(501) };
    expect(erroresDeContrasena(edicion, datos, '2026-11-14').observaciones).toBeTruthy();
  });

  it('más de 100 documentos se rechaza con cómo corregirlo', () => {
    const muchos = Array.from({ length: 101 }, (_, i) => cargo(`c${i}`));
    const edicion = marcando(muchos.map((c) => c.documentoId));
    expect(erroresDeContrasena(edicion, disponibles(muchos), '2026-11-14').documentos).toMatch(/hasta 100/);
  });
});

describe('solicitud y resumen', () => {
  it('manda cargos y notas, observaciones vacías como nulas', () => {
    const edicion = { ...marcando(['a'], ['n']), observaciones: '  ' };
    expect(datosDeContrasena(edicion)).toEqual({
      proveedorId: 'p1',
      fecha: '2026-11-14',
      fechaDePago: '2026-11-14',
      observaciones: null,
      documentos: ['a', 'n'],
    });
  });

  it('el resumen cuenta documentos y dice cuánto se promete pagar', () => {
    const datos = disponibles([cargo('a')], [nota('n', '40.00')]);
    const marcados = documentosMarcados(marcando(['a'], ['n']), datos);
    const totales = totalesDeLaContrasena(marcados, repartirEnVivo(marcados.cargos, marcados.notas));
    expect(resumenDeContrasena(marcados, totales)).toMatch(/2 documentos.*notas a favor.*pagar/);
  });
});
