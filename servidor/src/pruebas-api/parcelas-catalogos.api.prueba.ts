import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import { crearLocalidadDePrueba } from './soporte/escenario-de-parcelas.js';

const entorno = usarEntornoApi();
const RUTA = '/api/parcelas/catalogos';
let cuenta: CuentaDePrueba;
let encargado: ClienteApi;
let lector: ClienteApi;

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, {
    nombre: 'Catálogos de parcelas',
    usuario: 'propietariocatalogos',
    modulos: ['terceros', 'parcelas'],
  });
  // Con parcelas.parcelas.ver y .crear basta para elegir; los permisos de localidades solo le sirven para crear la suya.
  encargado = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Encargado',
    apellidos: 'Decatalogos',
    permisos: [
      'parcelas.parcelas.ver',
      'parcelas.parcelas.crear',
      'empresas.localidades.ver',
      'empresas.localidades.crear',
      'empresas.tipos-de-localidad.ver',
    ],
  });
  lector = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Solo',
    apellidos: 'Lecturacatalogos',
    permisos: ['parcelas.parcelas.ver'],
  });
  await crearLocalidadDePrueba(cuenta.propietario, 'CAT-1');
  await crearLocalidadDePrueba(encargado, 'CAT-2');
});

describe('catálogos de parcelas por API', () => {
  it('ofrecen solo las localidades que el operador ve, por nombre, y los inmuebles activos', async () => {
    const respuesta = await encargado.get(RUTA);

    expect(respuesta.estado).toBe(200);
    expect(respuesta.cuerpo.localidades).toEqual([expect.objectContaining({ nombre: 'Finca CAT-2' })]);
    expect(respuesta.cuerpo.inmuebles).toEqual([]);
  });

  it('el dueño de la cuenta ve todas, ordenadas por nombre', async () => {
    const nombres = (await cuenta.propietario.get(RUTA)).cuerpo.localidades.map(
      ({ nombre }: { nombre: string }) => nombre,
    );

    expect(nombres).toEqual(['Finca CAT-1', 'Finca CAT-2']);
  });

  it('quien solo ve las parcelas no necesita elegir nada y no los recibe', async () => {
    expect((await lector.get(RUTA)).estado).toBe(403);
  });
});
