import { describe, expect, it } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { conceptoGeneral, crearCuentaBancaria } from './soporte/escenarios-de-bancos.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { darDeAltaCuenta } from './soporte/escenarios.js';

const entorno = usarEntornoApi();

async function normalizar(texto: string | null): Promise<string | null> {
  const [fila] = await comoPropietario<{ valor: string | null }>('select bancos.nombre_para_comparar($1) as valor', [
    texto,
  ]);
  return fila?.valor ?? null;
}

describe('bancos.nombre_para_comparar (P7, S1)', () => {
  it('quita acentos, mayúsculas, signos, formas jurídicas y conectores', async () => {
    expect(await normalizar('Agroservicios El Rancho, S.A.')).toBe('agroservicios rancho');
    expect(await normalizar('AGROSERVICIOS  el rancho sa')).toBe('agroservicios rancho');
    expect(await normalizar('Ferretería «La Ñ» y Cía. Ltda.')).toBe('ferreteria n');
    expect(await normalizar('Comercial de R.L. S. de R.L.')).toBe('comercial r l');
    expect(await normalizar('Sociedad Anónima Los Pinos')).toBe('pinos');
  });

  it('no quita letras sueltas dentro de una palabra', async () => {
    expect(await normalizar('Sanchez y Salazar')).toBe('sanchez salazar');
    expect(await normalizar('Casa Delgado')).toBe('casa delgado');
  });

  it('un texto vacío, de solo signos o de puras palabras quitadas es nulo, y nulo sigue nulo', async () => {
    expect(await normalizar('   ')).toBeNull();
    expect(await normalizar('.,;')).toBeNull();
    expect(await normalizar('S.A.')).toBeNull();
    expect(await normalizar(null)).toBeNull();
  });

  it('la columna generada del movimiento la calcula la base y no se ve en la API', async () => {
    const cuenta = await darDeAltaCuenta(entorno, {
      nombre: 'Normal',
      usuario: 'propietarionormal',
      modulos: ['bancos'],
    });
    const cuentaBancariaId = await crearCuentaBancaria(cuenta.propietario, 'Normal');
    const creada = await cuenta.propietario.post('/api/bancos/notas', {
      cuentaBancariaId,
      tipo: 'debito',
      fecha: '2026-02-01',
      monto: '10.00',
      referencia: null,
      beneficiario: 'Agroservicios El Rancho, S.A.',
      observaciones: null,
      conceptoId: await conceptoGeneral(cuenta.propietario),
    });
    expect(creada.estado).toBe(201);
    expect(creada.cuerpo).not.toHaveProperty('beneficiarioParaComparar');
    const [fila] = await comoPropietario<{ clave: string }>(
      'select beneficiario_para_comparar as clave from bancos.movimientos where id = $1',
      [creada.cuerpo.id],
    );
    expect(fila?.clave).toBe('agroservicios rancho');
  });
});
