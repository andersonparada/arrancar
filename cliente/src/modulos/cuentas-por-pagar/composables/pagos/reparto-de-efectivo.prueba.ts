import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ProveedorPorPagar } from '../../servicios/tipos-de-pagos';
import { cargoDeEjemplo, datosDeEjemplo } from './ejemplos-de-pago';
import { claveDeProveedor, erroresDelReparto, repartirErroresDelReparto, separarBloqueos } from './errores-del-reparto';
import {
  agregarContrasena,
  conLosCargos,
  documentosDelReparto,
  lineasDelProveedor,
  opcionesParaAgregar,
  proveedorDelReparto,
  proveedoresConPago,
  quedaDelRetiro,
  quitarContrasena,
  solicitudDelReparto,
  totalDelProveedor,
  totalDelReparto,
  type ProveedorDelReparto,
} from './reparto-de-efectivo';
import { avisoDeUmbral, resumenDelReparto } from './resumen-del-reparto';

beforeEach(() => setActivePinia(createPinia()));

const HOY = '2026-11-15';
const CONTEXTO = { disponible: '5000.00', fechaDelRetiro: '2026-11-10', hoy: HOY };

const porPagar = (id: string, nombre: string): ProveedorPorPagar => ({
  proveedorId: id,
  nombre,
  nit: '1234567',
  porPagar: '1000.00',
  contrasenas: 1,
});

/** Un proveedor del reparto con sus cargos ya cargados (la contraseña c1 incluida, todo el saldo propuesto). */
function proveedor(id: string, nombre: string, cargos = [cargoDeEjemplo(`${id}-a`)]) {
  const nuevo = proveedorDelReparto(porPagar(id, nombre), HOY);
  conLosCargos(nuevo, datosDeEjemplo(cargos), null);
  return nuevo;
}

/** Un proveedor al que se llegó desde una contraseña: solo esa entra al pago. */
function proveedorDeUnaContrasena(abierta: string) {
  const nuevo = proveedorDelReparto(porPagar('p1', 'Agro'), HOY);
  conLosCargos(nuevo, datosDeEjemplo([cargoDeEjemplo('a'), cargoDeEjemplo('b', { contrasenaId: 'c2' })]), abierta);
  return nuevo;
}

describe('un proveedor del reparto', () => {
  it('al llegar sus cargos incluye todas sus contraseñas con el saldo propuesto', () => {
    const p = proveedor('p1', 'Agro', [
      cargoDeEjemplo('a'),
      cargoDeEjemplo('b', { contrasenaId: 'c2', saldo: '250.50', propuesto: '250.50' }),
    ]);
    expect(p.cargando).toBe(false);
    expect(p.edicion.contrasenasIncluidas).toEqual(['c1', 'c2']);
    expect(totalDelProveedor(p)).toBe(125050);
  });

  it('si se vino de una contraseña, solo esa entra', () => {
    const p = proveedorDeUnaContrasena('c2');
    expect(p.edicion.contrasenasIncluidas).toEqual(['c2']);
    expect(lineasDelProveedor(p).map(({ cargo }) => cargo.id)).toEqual(['b']);
  });

  it('se agrega y se quita una contraseña sin pisar lo escrito', () => {
    const p = proveedorDeUnaContrasena('c1');
    p.edicion.montos.a = '300.00';
    agregarContrasena(p, 'c2');
    expect(p.edicion.montos).toEqual({ a: '300.00', b: '1000.00' });
    quitarContrasena(p, 'c1');
    expect(totalDelProveedor(p)).toBe(100000);
  });

  it('sin datos no hay líneas ni total', () => {
    const sinDatos = proveedorDelReparto(porPagar('p9', 'Nuevo'), HOY);
    expect(lineasDelProveedor(sinDatos)).toEqual([]);
    expect(totalDelProveedor(sinDatos)).toBe(0);
  });
});

describe('totales del reparto', () => {
  const a = proveedor('p1', 'Agro');
  const b = proveedor('p2', 'Bodega', [cargoDeEjemplo('b1', { saldo: '500.00', propuesto: '500.00' })]);

  it('suma lo de todos los proveedores y cuenta sus documentos', () => {
    expect(totalDelReparto([a, b])).toBe(150000);
    expect(documentosDelReparto([a, b])).toBe(2);
  });

  it('lo que queda del retiro baja mientras se reparte y puede ser negativo', () => {
    expect(quedaDelRetiro('5000.00', [a, b])).toBe(350000);
    expect(quedaDelRetiro('1000.00', [a, b])).toBe(-50000);
  });

  it('solo reciben pago los proveedores con algún monto', () => {
    const vacio = proveedor('p3', 'Vacío');
    vacio.edicion.montos['p3-a'] = '';
    expect(proveedoresConPago([a, vacio, b]).map(({ proveedorId }) => proveedorId)).toEqual(['p1', 'p2']);
  });

  it('un proveedor ya agregado no se ofrece otra vez y los demás van por nombre', () => {
    const todos = [porPagar('p2', 'Zeta'), porPagar('p1', 'Agro'), porPagar('p3', 'Beta')];
    const opciones = opcionesParaAgregar(todos, [a]);
    expect(opciones.map(({ valor }) => valor)).toEqual(['p3', 'p2']);
  });
});

describe('errores antes de enviar', () => {
  it('un reparto bien hecho no tiene errores', () => {
    expect(erroresDelReparto([proveedor('p1', 'Agro'), proveedor('p2', 'Bodega')], CONTEXTO)).toEqual({});
  });

  it('sin proveedores dice que agregue uno', () => {
    expect(erroresDelReparto([], CONTEXTO).reparto).toContain('Agregue');
  });

  it('un proveedor sin monto pide escribirlo o quitarlo', () => {
    const vacio = proveedor('p3', 'Vacío');
    vacio.edicion.montos['p3-a'] = '';
    expect(erroresDelReparto([vacio], CONTEXTO)[claveDeProveedor('p3', 'sinMonto')]).toContain(
      'quite a este proveedor',
    );
  });

  it('repartir de más que el retiro dice cuánto queda y qué hacer', () => {
    const errores = erroresDelReparto([proveedor('p1', 'Agro')], { ...CONTEXTO, disponible: '600.00' });
    expect(errores.reparto).toContain('solo le quedan Q\u00a0600.00');
    expect(errores.reparto).toContain('registre otro retiro');
  });

  it('un monto mayor al saldo o mal escrito se marca en su documento', () => {
    const p = proveedor('p1', 'Agro');
    p.edicion.montos['p1-a'] = '1500.00';
    expect(erroresDelReparto([p], CONTEXTO)['monto.p1-a']).toContain('solo debe Q\u00a01,000.00');
    p.edicion.montos['p1-a'] = '12,5';
    expect(erroresDelReparto([p], CONTEXTO)['monto.p1-a']).toContain('dos decimales');
  });

  it('la fecha no puede ser futura ni anterior al retiro ni a la emisión', () => {
    const p = proveedor('p1', 'Agro');
    const clave = claveDeProveedor('p1', 'fecha');
    p.edicion.fecha = '2026-11-16';
    expect(erroresDelReparto([p], CONTEXTO)[clave]).toContain('futura');
    p.edicion.fecha = '2026-11-09';
    expect(erroresDelReparto([p], CONTEXTO)[clave]).toContain('la fecha del retiro');
    p.edicion.fecha = '2026-11-12';
    expect(erroresDelReparto([p], { ...CONTEXTO, fechaDelRetiro: '2026-09-01' })).toEqual({});
    p.edicion.fecha = '';
    expect(erroresDelReparto([p], CONTEXTO)[clave]).toContain('Escriba la fecha');
  });

  it('cuando el servidor pidió el motivo, es obligatorio', () => {
    const p = proveedor('p1', 'Agro');
    p.pedirMotivo = true;
    expect(erroresDelReparto([p], CONTEXTO)[claveDeProveedor('p1', 'motivoSinBancarizar')]).toContain('por qué');
    p.motivoSinBancarizar = 'El proveedor solo recibe efectivo';
    expect(erroresDelReparto([p], CONTEXTO)).toEqual({});
  });

  it('más de 20 proveedores o de 300 documentos se rechaza antes de enviar', () => {
    const veintiuno = Array.from({ length: 21 }, (_, i) => proveedor(`p${i}`, `P${i}`));
    expect(erroresDelReparto(veintiuno, { ...CONTEXTO, disponible: '999999.00' }).reparto).toContain('1 a 20');
    const cargos = Array.from({ length: 301 }, (_, i) => cargoDeEjemplo(`c${i}`, { saldo: '1.00', propuesto: '1.00' }));
    expect(
      erroresDelReparto([proveedor('p1', 'Agro', cargos)], { ...CONTEXTO, disponible: '999999.00' }).reparto,
    ).toContain('300 documentos');
  });
});

describe('el cuerpo para el servidor', () => {
  it('manda un pago por proveedor con monto, en el orden de la pantalla, y deja fuera al que no paga', () => {
    const a = proveedor('p1', 'Agro');
    a.recibidoPor = ' María ';
    a.edicion.referencia = '  R-77 ';
    const vacio = proveedor('p3', 'Vacío');
    vacio.edicion.montos['p3-a'] = '';
    const b = proveedor('p2', 'Bodega', [cargoDeEjemplo('b1', { saldo: '500.00', propuesto: '500.00' })]);
    const { pagos } = solicitudDelReparto([a, vacio, b]);
    expect(pagos.map(({ proveedorId }) => proveedorId)).toEqual(['p1', 'p2']);
    expect(pagos[0]).toMatchObject({
      fecha: HOY,
      recibidoPor: 'María',
      referencia: 'R-77',
      observaciones: null,
      motivoSinBancarizar: null,
      aplicaciones: [{ cargoId: 'p1-a', monto: '1000.00' }],
    });
  });

  it('el motivo solo viaja si el servidor lo pidió', () => {
    const p = proveedor('p1', 'Agro');
    p.motivoSinBancarizar = 'Solo efectivo';
    expect(solicitudDelReparto([p]).pagos[0]!.motivoSinBancarizar).toBeNull();
    p.pedirMotivo = true;
    expect(solicitudDelReparto([p]).pagos[0]!.motivoSinBancarizar).toBe('Solo efectivo');
  });

  it('las diferencias de centavos marcadas viajan con su monto', () => {
    const p = proveedor('p1', 'Agro');
    p.edicion.montos['p1-a'] = '999.98';
    p.edicion.diferencias = ['p1-a'];
    expect(solicitudDelReparto([p]).pagos[0]!.diferencias).toEqual([{ cargoId: 'p1-a', monto: '0.02' }]);
  });
});

describe('errores que vuelven del servidor', () => {
  const a = proveedor('p1', 'Agro', [cargoDeEjemplo('a1'), cargoDeEjemplo('a2')]);
  const b = proveedor('p2', 'Bodega');

  it('el de un documento va a su monto, usando el orden en que se mandaron los pagos', () => {
    const errores = repartirErroresDelReparto({ 'pagos.0.aplicaciones.1.monto': 'Pasa del saldo.' }, [a, b]);
    expect(errores).toEqual({ 'monto.a2': 'Pasa del saldo.' });
  });

  it('el de un campo del segundo pago cae en su proveedor', () => {
    const errores = repartirErroresDelReparto({ 'pagos.1.fecha': 'Mal', 'pagos.1.recibidoPor': 'Largo' }, [a, b]);
    expect(errores).toEqual({
      [claveDeProveedor('p2', 'fecha')]: 'Mal',
      [claveDeProveedor('p2', 'recibidoPor')]: 'Largo',
    });
  });

  it('el general del reparto y los demás campos pasan tal cual', () => {
    expect(repartirErroresDelReparto({ pagos: 'Hasta 20.', otro: 'x' }, [a])).toEqual({
      reparto: 'Hasta 20.',
      otro: 'x',
    });
  });

  it('un pago que no existe por índice no se pierde: va al error general', () => {
    expect(repartirErroresDelReparto({ 'pagos.5.fecha': 'Mal' }, [a])).toEqual({ reparto: 'Mal' });
  });

  it('el bloqueo de bancarización se separa de los errores de campo', () => {
    const errores = { [claveDeProveedor('p1', 'motivoSinBancarizar')]: 'Bancarización: …', 'monto.a1': 'x' };
    const { errores: restantes, bloqueos } = separarBloqueos(errores, [a, b]);
    expect(bloqueos).toEqual({ p1: 'Bancarización: …' });
    expect(restantes).toEqual({ 'monto.a1': 'x' });
  });

  it('si el motivo ya se estaba pidiendo, el error queda en su campo', () => {
    const c = proveedor('p3', 'Con motivo');
    c.pedirMotivo = true;
    const errores = { [claveDeProveedor('p3', 'motivoSinBancarizar')]: 'Falta' };
    expect(separarBloqueos(errores, [c])).toEqual({ errores, bloqueos: {} });
  });
});

describe('avisos y resumen', () => {
  it('anticipa el umbral cuando lo del mes con este pago lo alcanza, sin bloquear', () => {
    const p = proveedor('p1', 'Agro');
    expect(avisoDeUmbral(p)).toBeNull();
    p.datos = { ...p.datos!, sumaDelMesAlProveedor: '29500.00' };
    const aviso = avisoDeUmbral(p)!;
    expect(aviso).toContain('Q\u00a030,500.00');
    expect(aviso).toContain('umbral');
    expect(aviso).toContain('cheque');
  });

  it('el resumen dice el retiro, cada proveedor, el total y lo que queda', () => {
    const a: ProveedorDelReparto = proveedor('p1', 'Agro');
    const b = proveedor('p2', 'Bodega', [cargoDeEjemplo('b1', { saldo: '500.00', propuesto: '500.00' })]);
    const texto = resumenDelReparto({ numero: '2026-4', custodio: 'Juan', disponible: '5000.00' }, [a, b]);
    expect(texto).toContain('Q\u00a01,500.00 en efectivo del retiro 2026-4 (Juan) a 2 proveedores');
    expect(texto).toContain('• Agro: Q\u00a01,000.00 (1 contraseña, 1 documento)');
    expect(texto).toContain('• Bodega: Q\u00a0500.00');
    expect(texto).toContain('le quedarán Q\u00a03,500.00');
  });

  it('marca al proveedor que se paga sin bancarizar', () => {
    const a = proveedor('p1', 'Agro');
    a.pedirMotivo = true;
    a.motivoSinBancarizar = 'Solo efectivo';
    expect(resumenDelReparto({ numero: '1', custodio: 'J', disponible: '5000.00' }, [a])).toContain('sin bancarizar');
  });
});
