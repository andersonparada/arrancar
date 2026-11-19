/**
 * Los catálogos de las ventanas de Caja chica (CC-8): se piden con los permisos de Caja chica, sin los de Bancos,
 * Empresas, Libro de compras ni Usuarios; ver los fondos solo no alcanza.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { EscenarioDeCajaChica } from './soporte/caja-chica-fondos.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
const RUTA = '/api/caja-chica/catalogos';
let e: EscenarioDeCajaChica;
let quienAbre: ClienteApi;
let soloVe: ClienteApi;
let deOtroModulo: ClienteApi;
let quienLiquidaCierraOEntrega: ClienteApi[];

beforeAll(async () => {
  e = await EscenarioDeCajaChica.preparar(entorno, 'cajachicacatalogos');
  const comoUsuario = (apellidos: string, permisos: string[]) =>
    crearUsuarioConPermisos(entorno, e.cuenta, { nombres: `Catálogo ${apellidos}`, apellidos: 'Prueba', permisos });
  quienAbre = await comoUsuario('Abre', ['caja-chica.fondos.ver', 'caja-chica.fondos.crear']);
  soloVe = await comoUsuario('Ve', ['caja-chica.fondos.ver']);
  quienLiquidaCierraOEntrega = [
    await comoUsuario('Liquida', ['caja-chica.fondos.ver', 'caja-chica.vales.liquidar']),
    await comoUsuario('Cierra', ['caja-chica.fondos.ver', 'caja-chica.fondos.cerrar']),
    await comoUsuario('Entrega', ['caja-chica.fondos.ver', 'caja-chica.vales.crear']),
  ];
  deOtroModulo = await comoUsuario('Bancos', ['bancos.cuentas-bancarias.ver']);
});

describe('catálogos de Caja chica', () => {
  it('quien puede abrir un fondo recibe cuentas, chequeras y usuarios sin permisos de Bancos ni de Usuarios', async () => {
    const respuesta = await quienAbre.get(RUTA);

    expect(respuesta.estado).toBe(200);
    const { cuentas, chequeras, usuarios, localidades, conceptosDeGasto } = respuesta.cuerpo;
    expect(cuentas.map((c: { id: string }) => c.id)).toContain(e.cuentaBancariaId);
    expect(chequeras.map((c: { id: string }) => c.id)).toContain(e.chequeraId);
    expect(chequeras[0]).toEqual(
      expect.objectContaining({ cuentaBancariaNombre: expect.any(String), disponibles: expect.any(Number) }),
    );
    expect(usuarios.map((u: { nombre: string }) => u.nombre)).toContain('Catálogo Abre Prueba');
    expect(Array.isArray(localidades)).toBe(true);
    expect(Array.isArray(conceptosDeGasto)).toBe(true);
  });

  it('las listas vienen por nombre', async () => {
    const { usuarios, cuentas } = (await quienAbre.get(RUTA)).cuerpo;
    const nombres = usuarios.map((u: { nombre: string }) => u.nombre);
    expect(nombres).toEqual([...nombres].sort((a, b) => a.localeCompare(b, 'es')));
    const deCuentas = cuentas.map((c: { nombre: string }) => c.nombre);
    expect(deCuentas).toEqual([...deCuentas].sort((a: string, b: string) => a.localeCompare(b, 'es')));
  });

  it('quien liquida, cierra o entrega vales también recibe los catálogos', async () => {
    for (const cliente of quienLiquidaCierraOEntrega) expect((await cliente.get(RUTA)).estado).toBe(200);
  });

  it('con solo ver los fondos, o sin permisos de Caja chica, se niega', async () => {
    expect((await soloVe.get(RUTA)).estado).toBe(403);
    expect((await deOtroModulo.get(RUTA)).estado).toBe(403);
  });
});
