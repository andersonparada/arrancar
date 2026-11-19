import { describe, expect, it } from 'vitest';
import { armarContenido, validarAdjunto, type PlantillaPorEncolar } from './contenido-de-correo.js';
import { verificarCupos, type TopesDeCorreo, type UsoDeCupos } from './cupos-de-correo.js';
import { normalizarDestinatarios, type DestinatarioPorEncolar } from './destinatarios-de-correo.js';
import { DireccionNoUtilizable, MarcadorDesconocido } from './errores-de-correo.js';
import {
  AdjuntoNoValido,
  ContenidoDeCorreoNoValido,
  CupoDeCorreosAgotado,
  DemasiadosDestinatarios,
  SinDestinatarios,
} from './errores-de-la-bandeja.js';

const TOPES: TopesDeCorreo = {
  porHoraPorCuenta: 100,
  porDiaPorCuenta: 500,
  porDiaPorDestinatario: 20,
  porHoraDeLaInstalacion: 1000,
};
const SIN_USO: UsoDeCupos = { porHora: 0, porDia: 0, deLaInstalacionPorHora: 0, porDestinatario: {} };

describe('verificarCupos', () => {
  const limite = (uso: Partial<UsoDeCupos>, direcciones: string[] = ['a@x.com']) => {
    try {
      verificarCupos({ ...SIN_USO, ...uso }, TOPES, direcciones);
      return null;
    } catch (error) {
      return error instanceof CupoDeCorreosAgotado ? error.limite : 'otro error';
    }
  };

  it('deja pasar mientras quepa uno más', () => {
    expect(
      limite({ porHora: 99, porDia: 499, deLaInstalacionPorHora: 999, porDestinatario: { 'a@x.com': 19 } }),
    ).toBeNull();
  });

  it.each([
    ['la hora de la cuenta', { porHora: 100 }, 'hora'],
    ['el día de la cuenta', { porDia: 500 }, 'dia'],
    ['el día de un destinatario', { porDestinatario: { 'a@x.com': 20 } }, 'destinatario'],
    ['la hora de la instalación', { deLaInstalacionPorHora: 1000 }, 'instalacion'],
  ])('rechaza al pasarse de %s', (_caso, uso, esperado) => {
    expect(limite(uso)).toBe(esperado);
  });

  it.each([
    ['la hora de la cuenta', { porHora: 98 }, 'hora'],
    ['el día de la cuenta', { porDia: 498 }, 'dia'],
    ['la hora de la instalación', { deLaInstalacionPorHora: 998 }, 'instalacion'],
  ])('cuenta cada destinatario y cada copia: con 3 direcciones ya no caben en %s', (_caso, uso, esperado) => {
    expect(limite(uso, ['a@x.com', 'b@x.com', 'c@x.com'])).toBe(esperado);
  });

  it('con 3 direcciones, 97 en la hora todavía deja pasar', () => {
    expect(limite({ porHora: 97 }, ['a@x.com', 'b@x.com', 'c@x.com'])).toBeNull();
  });

  it('cuenta al destinatario sin distinguir mayúsculas', () => {
    expect(limite({ porDestinatario: { 'ana@x.com': 20 } }, ['Ana@x.com'])).toBe('destinatario');
  });

  it('el error es 429 con código propio y dice cuál tope se pasó', () => {
    const error = new CupoDeCorreosAgotado('dia');

    expect(error.codigo).toBe('cupo_de_correos_agotado');
    expect(error.detalles).toEqual({ limite: 'dia' });
  });
});

describe('normalizarDestinatarios', () => {
  const para = (direccion: string, extra: Partial<DestinatarioPorEncolar> = {}): DestinatarioPorEncolar => ({
    direccion,
    nombre: null,
    clase: 'para',
    origen: 'tercero',
    origenId: null,
    ...extra,
  });

  it('valida con la regla estricta de envío y normaliza el dominio', () => {
    const [d] = normalizarDestinatarios([para('Ana@EJEMPLO.com', { nombre: ' Ana\r\nBcc: x ' })]);

    expect(d?.direccion.valor).toBe('Ana@ejemplo.com');
    expect(d?.nombre).toBe('Ana Bcc: x');
  });

  it.each(['a@x.com,b@y.com', '"x>"@y.com', 'a@b', 'a b@x.com'])('rechaza la dirección %s', (direccion) => {
    expect(() => normalizarDestinatarios([para(direccion)])).toThrow(DireccionNoUtilizable);
  });

  it('junta las repetidas y deja «para» si una va como «para» y como «copia»', () => {
    const lista = normalizarDestinatarios([para('a@x.com', { clase: 'copia' }), para('A@x.com'), para('b@x.com')]);

    expect(lista.map((d) => [d.direccion.valor, d.clase])).toEqual([
      ['A@x.com', 'para'],
      ['b@x.com', 'para'],
    ]);
  });

  it('exige al menos uno «para» y no más de 10', () => {
    expect(() => normalizarDestinatarios([])).toThrow(SinDestinatarios);
    expect(() => normalizarDestinatarios([para('a@x.com', { clase: 'copia' })])).toThrow(SinDestinatarios);
    const once = Array.from({ length: 11 }, (_, i) => para(`d${i}@x.com`));
    expect(() => normalizarDestinatarios(once)).toThrow(DemasiadosDestinatarios);
  });
});

describe('armarContenido', () => {
  const plantilla: PlantillaPorEncolar = {
    asunto: 'Aviso {numero} – {empresa}',
    mensaje: 'Estimado {proveedor}: pago {numero} por {monto}.',
    marcadoresDelAsunto: ['numero', 'empresa'],
    marcadoresDelMensaje: ['numero', 'empresa', 'proveedor', 'monto'],
    valores: { numero: '12', empresa: 'Rancho', proveedor: '<b>Pedro</b>', monto: 'Q1,000.00' },
  };
  const datos = { empresa: 'Rancho', aplicacion: 'Arrancar', conRespuesta: true };

  it('reemplaza marcadores, escapa el HTML y arma el nombre visible', () => {
    const contenido = armarContenido(plantilla, datos);

    expect(contenido.asunto).toBe('Aviso 12 – Rancho');
    expect(contenido.nombreVisible).toBe('Rancho por medio de Arrancar');
    expect(contenido.texto).toContain('Estimado <b>Pedro</b>');
    expect(contenido.html).toContain('Estimado &lt;b&gt;Pedro&lt;/b&gt;');
    expect(contenido.html).not.toContain('<b>');
  });

  it('el asunto no admite los marcadores que solo son del mensaje', () => {
    expect(() => armarContenido({ ...plantilla, asunto: 'Pago por {monto}' }, datos)).toThrow(MarcadorDesconocido);
  });

  it('quita los saltos de línea de los valores del asunto (inyección de cabeceras)', () => {
    const contenido = armarContenido(
      { ...plantilla, valores: { ...plantilla.valores, empresa: 'A\r\nBcc: x@y.com' } },
      datos,
    );

    expect(contenido.asunto).not.toMatch(/[\r\n]/);
  });

  it('rechaza un asunto o una empresa vacíos', () => {
    expect(() =>
      armarContenido({ ...plantilla, asunto: '{numero}', valores: { ...plantilla.valores, numero: '\r\n' } }, datos),
    ).toThrow(ContenidoDeCorreoNoValido);
    expect(() => armarContenido(plantilla, { ...datos, empresa: '  ' })).toThrow(ContenidoDeCorreoNoValido);
  });

  it('rechaza un mensaje demasiado largo', () => {
    const largo = { ...plantilla, mensaje: 'x'.repeat(20_001), marcadoresDelMensaje: [] };

    expect(() => armarContenido(largo, datos)).toThrow(ContenidoDeCorreoNoValido);
  });
});

describe('validarAdjunto', () => {
  const pdf = Buffer.from('%PDF-1.7\ncontenido');

  it('acepta un PDF y sanea el nombre (sin rutas y con `.pdf` forzado)', () => {
    const { nombre } = validarAdjunto('../../etc/comprobante.exe', pdf);

    expect(nombre).toMatch(/\.pdf$/);
    expect(nombre).not.toMatch(/[\\/]/);
  });

  it.each([
    ['uno que no es PDF', Buffer.from('<html>')],
    ['uno vacío', Buffer.alloc(0)],
    ['uno de más de 5 MB', Buffer.concat([Buffer.from('%PDF-'), Buffer.alloc(5 * 1024 * 1024)])],
  ])('rechaza %s', (_caso, contenido) => {
    expect(() => validarAdjunto('a.pdf', contenido)).toThrow(AdjuntoNoValido);
  });
});
