/**
 * Prueba de integración contra PostgreSQL: el envío de la bandeja (resultado de cada intento, reintentos, arriendo
 * vencido, autenticación, adjunto perdido). Solo el disco y el servidor SMTP son dobles.
 */
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  MENSAJE,
  PDF,
  usarBandejaCompleta,
  type MontajeDeBandeja,
  type OperadorDePrueba,
} from '../../pruebas/bandeja-completa.soporte.js';

const bandeja = usarBandejaCompleta();
const { filas } = bandeja;
let operador: OperadorDePrueba;
let montaje: MontajeDeBandeja;

beforeAll(() => {
  ({ operador } = bandeja);
});

beforeEach(() => {
  montaje = bandeja.montaje;
});

const encolar = (quien = operador, mensaje = MENSAJE) =>
  montaje.unidadDeTrabajo.ejecutar(quien, () => montaje.encolar.ejecutar(quien, mensaje));

describe('envío', () => {
  const estadoDe = async (id: string) => (await filas('select * from core.correos_salientes where id = $1', [id]))[0];

  it('envía con el transporte, anota el intento y el resultado de cada destinatario', async () => {
    const { id } = await encolar();
    montaje.transporte.programarRespuesta({ resultado: 'enviado', rechazados: ['empresa@ejemplo.com'] });

    expect(await montaje.lote.ejecutar()).toBe(1);

    const [mensaje] = montaje.transporte.enviados;
    expect(mensaje?.adjuntos[0]).toMatchObject({ nombre: 'comprobante-de-pago-12.pdf', contenido: PDF });
    expect(mensaje?.desde.nombre).toBe('Rancho Los Pinos por medio de Arrancar');
    expect(await estadoDe(id)).toMatchObject({ estado: 'enviado', intentos: 1, bloqueado_hasta: null });
    const resultados = await filas('select direccion, resultado from core.destinatarios_de_correos order by direccion');
    expect(resultados).toEqual([
      { direccion: 'empresa@ejemplo.com', resultado: 'rechazado' },
      { direccion: 'proveedor@ejemplo.com', resultado: 'aceptado' },
    ]);
    expect(await filas('select numero, resultado from core.intentos_de_correos')).toEqual([
      { numero: 1, resultado: 'enviado' },
    ]);
  });

  it('un fallo temporal lo deja pendiente con espera; al vencer se reintenta y sale con el mismo Message-ID', async () => {
    const { id } = await encolar();
    montaje.transporte.programarRespuesta({ resultado: 'temporal', codigo: 'ETIMEDOUT' });
    await montaje.lote.ejecutar();
    const despues = await estadoDe(id);
    expect(despues).toMatchObject({ estado: 'pendiente', intentos: 1, ultimo_error_codigo: 'ETIMEDOUT' });
    expect(await montaje.lote.ejecutar()).toBe(0);

    await bandeja.propietario.query(`update core.correos_salientes set proximo_intento = now() where id = $1`, [id]);
    await montaje.lote.ejecutar();

    expect(await estadoDe(id)).toMatchObject({ estado: 'enviado', intentos: 2, ultimo_error_codigo: null });
    expect(montaje.transporte.enviados[0]?.messageId).toBe(despues.message_id);
    expect((await filas('select numero from core.intentos_de_correos order by numero')).map((f) => f.numero)).toEqual([
      1, 2,
    ]);
  });

  it('un fallo permanente lo deja fallido sin más intentos', async () => {
    const { id } = await encolar();
    montaje.transporte.programarRespuesta({ resultado: 'permanente', codigo: '550' });

    await montaje.lote.ejecutar();

    expect(await estadoDe(id)).toMatchObject({ estado: 'fallido', ultimo_error_codigo: '550' });
    expect(await montaje.lote.ejecutar()).toBe(0);
  });

  it('con 8 fallos temporales seguidos queda fallido', async () => {
    const { id } = await encolar();
    for (let i = 0; i < 8; i++) {
      montaje.transporte.programarRespuesta({ resultado: 'temporal', codigo: 'ETIMEDOUT' });
      await bandeja.propietario.query(`update core.correos_salientes set proximo_intento = now() where id = $1`, [id]);
      await montaje.lote.ejecutar();
    }

    expect(await estadoDe(id)).toMatchObject({ estado: 'fallido', intentos: 8 });
  });

  it('un error de autenticación no gasta intento y no toca a los demás correos', async () => {
    const primero = await encolar();
    const segundo = await encolar();
    montaje.transporte.programarRespuesta({ resultado: 'autenticacion', codigo: 'EAUTH' });

    await montaje.lote.ejecutar();

    expect(await estadoDe(primero.id)).toMatchObject({
      estado: 'pendiente',
      intentos: 0,
      ultimo_error_codigo: 'EAUTH',
    });
    expect(await estadoDe(segundo.id)).toMatchObject({ estado: 'pendiente', intentos: 0 });
    expect(montaje.transporte.enviados).toHaveLength(0);
  });

  it('con el servidor apagado no toma nada: todo espera en la bandeja', async () => {
    const { id } = await encolar();
    await bandeja.propietario.query('update core.servidor_de_correo set activo = false');

    expect(await montaje.lote.ejecutar()).toBe(0);
    expect(await estadoDe(id)).toMatchObject({ estado: 'pendiente', intentos: 0 });
  });

  it('si el proceso cayó con el correo enviando, al vencer el arriendo otro lo retoma y lo envía', async () => {
    const { id } = await encolar();
    await montaje.cola.tomar(10, 5);
    expect(await estadoDe(id)).toMatchObject({ estado: 'enviando', intentos: 1 });
    expect(await montaje.lote.ejecutar()).toBe(0);

    await bandeja.propietario.query(
      `update core.correos_salientes set bloqueado_hasta = now() - interval '1 minute' where id = $1`,
      [id],
    );
    await montaje.lote.ejecutar();

    expect(await estadoDe(id)).toMatchObject({ estado: 'enviado', intentos: 2 });
  });

  it('si el PDF desapareció del almacenamiento falla de forma permanente con el código ADJUNTO', async () => {
    const { id } = await encolar();
    montaje.almacenamiento.contenidos.clear();

    await montaje.lote.ejecutar();

    expect(await estadoDe(id)).toMatchObject({ estado: 'fallido', ultimo_error_codigo: 'ADJUNTO' });
  });
});
