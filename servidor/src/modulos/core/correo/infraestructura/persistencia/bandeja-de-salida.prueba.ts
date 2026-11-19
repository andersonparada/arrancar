/**
 * Prueba de integración contra PostgreSQL: encolar dentro de la unidad de trabajo (adjunto en `core.archivos`, despertar,
 * deshacer), los cupos con bloqueo por cuenta y la depuración. Solo el disco y el servidor SMTP son dobles.
 */
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DepurarCorreos } from '../../aplicacion/casos-uso/depurar-correos.js';
import { CupoDeCorreosAgotado } from '../../dominio/errores-de-la-bandeja.js';
import { ParametrosFijos } from '../../pruebas/dobles-de-la-bandeja.js';
import {
  armarBandejaCompleta,
  MENSAJE,
  PDF,
  usarBandejaCompleta,
  type MontajeDeBandeja,
  type OperadorDePrueba,
} from '../../pruebas/bandeja-completa.soporte.js';
import type { EscenarioDeBandeja } from '../../pruebas/bandeja.soporte.js';

const bandeja = usarBandejaCompleta();
const { operadorDe, filas } = bandeja;
let escenario: EscenarioDeBandeja;
let operador: OperadorDePrueba;
let montaje: MontajeDeBandeja;

beforeAll(() => {
  ({ escenario, operador } = bandeja);
});

beforeEach(() => {
  montaje = bandeja.montaje;
});

const encolar = (quien = operador, mensaje = MENSAJE) =>
  montaje.unidadDeTrabajo.ejecutar(quien, () => montaje.encolar.ejecutar(quien, mensaje));

class Deshacer extends Error {}

describe('encolar', () => {
  it('guarda el correo y sus destinatarios en la empresa y cuenta de la transacción, con autoría', async () => {
    const dto = await encolar();

    const [correo] = await filas('select * from core.correos_salientes where id = $1', [dto.id]);
    expect(correo).toMatchObject({
      empresa_id: escenario.empresaA1,
      cuenta_id: escenario.cuentaA,
      creado_por: operador.usuarioId,
      estado: 'pendiente',
      intentos: 0,
      asunto: 'Aviso de pago 12',
      recurso_origen: 'prueba.pagos',
      nombre_visible: 'Rancho Los Pinos por medio de Arrancar',
      responder_a: 'empresa@ejemplo.com',
    });
    expect(correo.message_id).toMatch(/^<[0-9a-f-]{36}@arrancar\.test>$/);
    const destinatarios = await filas(
      'select clase, direccion, origen, resultado from core.destinatarios_de_correos where correo_saliente_id = $1 order by clase desc',
      [dto.id],
    );
    expect(destinatarios).toEqual([
      { clase: 'para', direccion: 'proveedor@ejemplo.com', origen: 'contacto', resultado: null },
      { clase: 'copia', direccion: 'empresa@ejemplo.com', origen: 'empresa', resultado: null },
    ]);
  });

  it('guarda el PDF como documento de core dueño `core.correos_salientes` y conserva su huella', async () => {
    const dto = await encolar();

    const [correo] = await filas('select * from core.correos_salientes where id = $1', [dto.id]);
    const [archivo] = await filas('select * from core.archivos where id = $1', [correo.adjunto_archivo_id]);
    expect(archivo).toMatchObject({
      recurso_dueno: 'core.correos_salientes',
      clase: 'documento',
      empresa_id: escenario.empresaA1,
    });
    expect(correo).toMatchObject({ adjunto_nombre: 'comprobante-de-pago-12.pdf' });
    expect(correo.adjunto_sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(montaje.almacenamiento.contenidos.get(archivo.ruta_original)).toEqual(PDF);
  });

  it('despierta al trabajador solo después de confirmar', async () => {
    await expect(
      montaje.unidadDeTrabajo.ejecutar(operador, async () => {
        await montaje.encolar.ejecutar(operador, MENSAJE);
        throw new Deshacer();
      }),
    ).rejects.toThrow(Deshacer);
    expect(montaje.despertares.cuenta).toBe(0);

    await encolar();

    expect(montaje.despertares.cuenta).toBe(1);
  });

  it('si la transacción se deshace no queda el correo ni el archivo', async () => {
    await expect(
      montaje.unidadDeTrabajo.ejecutar(operador, async () => {
        await montaje.encolar.ejecutar(operador, MENSAJE);
        throw new Deshacer();
      }),
    ).rejects.toThrow(Deshacer);

    expect(await filas('select 1 from core.correos_salientes')).toEqual([]);
    expect(await filas('select 1 from core.archivos')).toEqual([]);
    expect(montaje.almacenamiento.contenidos.size).toBe(0);
  });

  it('con un destinatario inválido no toca la base', async () => {
    const malo = { ...MENSAJE, destinatarios: [{ ...MENSAJE.destinatarios[0]!, direccion: 'a@b.com,c@d.com' }] };

    await expect(encolar(operador, malo)).rejects.toThrow();
    expect(await filas('select 1 from core.correos_salientes')).toEqual([]);
  });
});

describe('cupos', () => {
  // El mensaje de prueba lleva dos destinatarios (para y copia): un tope de 2 por hora deja pasar exactamente uno.
  const topes = { porHoraPorCuenta: 2, porDiaPorCuenta: 500, porDiaPorDestinatario: 20, porHoraDeLaInstalacion: 1000 };

  it('con dos peticiones a la vez de una cuenta con cupo para una, solo pasa una (candado por cuenta)', async () => {
    montaje = armarBandejaCompleta(topes);
    const otraEmpresa = operadorDe(escenario.empresaA2, escenario.cuentaA);

    const resultados = await Promise.allSettled([encolar(operador), encolar(otraEmpresa)]);

    expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rechazado = resultados.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect(rechazado.reason).toBeInstanceOf(CupoDeCorreosAgotado);
    expect(await filas('select 1 from core.correos_salientes')).toHaveLength(1);
  });

  it('el cupo cuenta destinatarios: un mensaje con para y copia no cabe en un tope de 1 por hora', async () => {
    montaje = armarBandejaCompleta({ ...topes, porHoraPorCuenta: 1 });

    await expect(encolar()).rejects.toMatchObject({ codigo: 'cupo_de_correos_agotado', detalles: { limite: 'hora' } });
    expect(await filas('select 1 from core.correos_salientes')).toHaveLength(0);
  });

  it('otra cuenta tiene su propio cupo', async () => {
    montaje = armarBandejaCompleta(topes);
    await encolar(operador);

    const deOtraCuenta = await encolar(operadorDe(escenario.empresaB, escenario.cuentaB));

    expect(deOtraCuenta.estado).toBe('pendiente');
  });

  it('cuenta los correos de todas las empresas de la cuenta y rechaza con 429 al pasarse', async () => {
    montaje = armarBandejaCompleta(topes);
    await encolar(operador);

    await expect(encolar(operadorDe(escenario.empresaA2, escenario.cuentaA))).rejects.toMatchObject({
      codigo: 'cupo_de_correos_agotado',
      detalles: { limite: 'hora' },
    });
  });

  it('el tope por destinatario cuenta lo ya enviado a esa dirección sin distinguir mayúsculas', async () => {
    montaje = armarBandejaCompleta({ ...topes, porHoraPorCuenta: 100, porDiaPorDestinatario: 1 });
    await encolar(operador);
    const mayusculas = {
      ...MENSAJE,
      destinatarios: [{ ...MENSAJE.destinatarios[0]!, direccion: 'PROVEEDOR@ejemplo.com' }],
    };

    await expect(encolar(operador, mayusculas)).rejects.toMatchObject({ detalles: { limite: 'destinatario' } });
  });
});

describe('depuración', () => {
  it('borra el cuerpo y el adjunto de lo viejo ya terminado y deja la huella', async () => {
    const { id } = await encolar();
    await montaje.lote.ejecutar();
    await bandeja.propietario.query(
      `update core.correos_salientes set creado_en = now() - interval '40 days' where id = $1`,
      [id],
    );
    const depurar = new DepurarCorreos({ depurador: montaje.cola, parametros: new ParametrosFijos() });

    expect(await depurar.ejecutar()).toEqual({ contenido: 1, filas: 0 });

    const [correo] = await filas('select * from core.correos_salientes where id = $1', [id]);
    expect(correo).toMatchObject({
      cuerpo_texto: null,
      cuerpo_html: null,
      adjunto_archivo_id: null,
      adjunto_nombre: 'comprobante-de-pago-12.pdf',
    });
    expect(correo?.adjunto_sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(await filas('select 1 from core.archivos')).toEqual([]);
  });
});
