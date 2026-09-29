import { beforeAll, describe, expect, it } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearCuentaBancaria } from './soporte/escenarios-de-bancos.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const RUTA_NOTAS = '/api/bancos/notas';
const RUTA_TRANSFERENCIAS = '/api/bancos/transferencias';
const REINICIO_ANUAL = 'core.correlativos.reinicio_anual';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let cuentaBancariaId: string;
let destinoId: string;

const nota = (fecha: string) => ({
  cuentaBancariaId,
  tipo: 'credito',
  fecha,
  monto: '10.00',
  referencia: null,
  beneficiario: null,
  observaciones: null,
});

const transferencia = (fecha: string) => ({
  cuentaOrigenId: cuentaBancariaId,
  cuentaDestinoId: destinoId,
  fecha,
  monto: '1.00',
  referencia: null,
  observaciones: null,
});

/** La configuración es solo de soporte: el superacceso entra a la empresa y cambia la variable en su nivel. */
const reiniciarCadaAnio = (valor: boolean) =>
  entorno.soporte.put(`/api/configuracion/${REINICIO_ANUAL}`, { nivel: 'empresa', valor });

async function creditos(): Promise<Array<{ anio: number; ultimo: number; emitidos: number; huecos: unknown[] }>> {
  const reporte = await cuenta.propietario.get('/api/bancos/correlativos?clave=bancos.notas_de_credito');
  return reporte.cuerpo.correlativos;
}

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Anual', usuario: 'propietarioanual', modulos: ['bancos'] });
  cuentaBancariaId = await crearCuentaBancaria(cuenta.propietario, 'Anual');
  destinoId = await crearCuentaBancaria(cuenta.propietario, 'Anual destino');
  await entorno.soporte.put('/api/sesion/empresa-activa', { empresaId: cuenta.empresaId });
});

describe('correlativos que se reinician cada año', () => {
  it('por omisión no se reinician: el número sigue aunque cambie el año', async () => {
    const de2026 = await cuenta.propietario.post(RUTA_NOTAS, nota('2026-12-31'));
    const de2027 = await cuenta.propietario.post(RUTA_NOTAS, nota('2027-01-02'));

    expect([de2026.cuerpo.numero, de2027.cuerpo.numero]).toEqual([1, 2]);
    expect([de2026.cuerpo.anioDeNumero, de2027.cuerpo.anioDeNumero]).toEqual([0, 0]);
  });

  it('la variable se declara solo en los niveles empresa e instalación', async () => {
    const variables = await entorno.soporte.get('/api/configuracion');

    const variable = variables.cuerpo.find((v: { clave: string }) => v.clave === REINICIO_ANUAL);
    expect(variable).toMatchObject({ predeterminado: false, niveles: ['instalacion', 'empresa'] });
  });

  it('activada, cada año empieza en 1, el número lleva su año y el reporte separa los años', async () => {
    expect((await reiniciarCadaAnio(true)).estado).toBe(204);

    const primera2026 = await cuenta.propietario.post(RUTA_NOTAS, nota('2026-06-01'));
    const primera2027 = await cuenta.propietario.post(RUTA_NOTAS, nota('2027-06-01'));
    const segunda2027 = await cuenta.propietario.post(RUTA_NOTAS, nota('2027-06-02'));

    expect(primera2026.cuerpo).toMatchObject({ numero: 1, anioDeNumero: 2026 });
    expect(primera2027.cuerpo).toMatchObject({ numero: 1, anioDeNumero: 2027 });
    expect(segunda2027.cuerpo).toMatchObject({ numero: 2, anioDeNumero: 2027 });
    const porAnio = Object.fromEntries((await creditos()).map((c) => [c.anio, c.ultimo]));
    expect(porAnio).toEqual({ 0: 2, 2026: 1, 2027: 2 });
  });

  it('las transferencias también se reinician con su año', async () => {
    const de2026 = await cuenta.propietario.post(RUTA_TRANSFERENCIAS, transferencia('2026-07-01'));
    const de2027 = await cuenta.propietario.post(RUTA_TRANSFERENCIAS, transferencia('2027-07-01'));

    expect(de2026.cuerpo).toMatchObject({ numero: 1, anioDeNumero: 2026 });
    expect(de2027.cuerpo).toMatchObject({ numero: 1, anioDeNumero: 2027 });
  });

  it('un hueco de un año se explica solo con lo eliminado en ese año', async () => {
    const eliminable = await cuenta.propietario.post(RUTA_NOTAS, nota('2027-06-03'));
    await cuenta.propietario.delete(`${RUTA_NOTAS}/${eliminable.cuerpo.id}`, { motivo: 'Duplicada de 2027' });

    const de2027 = (await creditos()).find((c) => c.anio === 2027)!;
    const de2026 = (await creditos()).find((c) => c.anio === 2026)!;

    expect(de2027.huecos).toEqual([expect.objectContaining({ numero: 3, estado: 'explicado' })]);
    expect(de2026.huecos).toEqual([]);
  });

  it('al desactivarla vuelve al correlativo sin año, que sigue donde iba', async () => {
    expect((await reiniciarCadaAnio(false)).estado).toBe(204);

    const nueva = await cuenta.propietario.post(RUTA_NOTAS, nota('2027-08-01'));

    expect(nueva.cuerpo).toMatchObject({ numero: 3, anioDeNumero: 0 });
  });
});
