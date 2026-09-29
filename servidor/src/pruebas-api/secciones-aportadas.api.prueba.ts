import { beforeAll, describe, expect, it } from 'vitest';
import { SeccionInvalida } from '../modulos/core/compartido/aplicacion/errores-de-seccion.js';
import '../modulos/core/contratos/empresas.contratos.js';
import '../modulos/core/contratos/terceros.contratos.js';
import { mediador } from '../modulos/core/mediador/contexto.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

/**
 * El mecanismo de secciones (L1-3) con un escucha falso: `empresas` y `terceros` avisan dentro de la transacción
 * del formulario y, si el escucha rechaza su sección, no se guarda nada del formulario.
 */
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
const recibidas: Array<{ aviso: string; secciones: unknown; empresaDelOperador: string }> = [];

const seccionMala = { prueba: { malo: true } };
const seccionBuena = { prueba: { malo: false } };

function rechazarSiEsMala(secciones: Readonly<Record<string, unknown>>): void {
  const propia = secciones.prueba as { malo?: boolean } | undefined;
  if (propia?.malo) throw new SeccionInvalida([{ campo: 'secciones.prueba.malo', mensaje: 'La sección es mala.' }]);
}

beforeAll(async () => {
  mediador.escuchar('terceros', 'terceros.proveedor_guardado', async ({ secciones }, operador) => {
    recibidas.push({ aviso: 'proveedor', secciones, empresaDelOperador: operador.empresaId });
    rechazarSiEsMala(secciones);
  });
  mediador.escuchar('empresas', 'empresas.empresa_guardada', async ({ secciones }, operador) => {
    recibidas.push({ aviso: 'empresa', secciones, empresaDelOperador: operador.empresaId });
    rechazarSiEsMala(secciones);
  });
  cuenta = await darDeAltaCuenta(entorno, {
    nombre: 'Secciones',
    usuario: 'propietariosecciones',
    modulos: ['terceros'],
  });
});

const proveedor = (nombres: string, secciones: unknown) => ({
  tipo: 'individual',
  nombres,
  papel: { tipo: 'proveedor' },
  secciones,
});

describe('secciones en el formulario de Proveedores', () => {
  it('registrar con una sección buena avisa con ella y guarda el proveedor', async () => {
    const respuesta = await cuenta.propietario.post('/api/terceros', proveedor('Buena', seccionBuena));

    expect(respuesta.estado).toBe(201);
    expect(recibidas.at(-1)).toMatchObject({ aviso: 'proveedor', secciones: seccionBuena });
  });

  it('una sección inválida devuelve el error por campo con su prefijo y no guarda al tercero', async () => {
    const respuesta = await cuenta.propietario.post('/api/terceros', proveedor('Mala', seccionMala));
    const guardados = await cuenta.propietario.get('/api/terceros?texto=Mala');

    expect(respuesta.estado).toBe(400);
    expect(respuesta.cuerpo.error.detalles).toEqual([
      { campo: 'secciones.prueba.malo', mensaje: 'La sección es mala.' },
    ]);
    expect(guardados.cuerpo).toEqual([]);
  });

  it('asignar el papel con una sección inválida no lo asigna', async () => {
    const tercero = await cuenta.propietario.post('/api/terceros', { tipo: 'individual', nombres: 'Sin papel' });
    const id = tercero.cuerpo.id;

    const rechazada = await cuenta.propietario.put(`/api/terceros/${id}/proveedor`, { secciones: seccionMala });
    const aceptada = await cuenta.propietario.put(`/api/terceros/${id}/proveedor`, { secciones: seccionBuena });
    const ficha = await cuenta.propietario.get(`/api/terceros/${id}`);

    expect(rechazada.estado).toBe(400);
    expect(aceptada.estado).toBe(200);
    expect(ficha.cuerpo.proveedor).not.toBeNull();
  });

  it('sin secciones en el cuerpo, avisa con un objeto vacío', async () => {
    await cuenta.propietario.post('/api/terceros', {
      tipo: 'individual',
      nombres: 'Vacia',
      papel: { tipo: 'proveedor' },
    });

    expect(recibidas.at(-1)).toMatchObject({ aviso: 'proveedor', secciones: {} });
  });
});

describe('secciones en el formulario de Empresas', () => {
  it('crear con una sección inválida no crea la empresa; con una buena avisa con la empresa nueva', async () => {
    const rechazada = await cuenta.propietario.post('/api/empresas', {
      nombre: 'Empresa mala',
      secciones: seccionMala,
    });
    const aceptada = await cuenta.propietario.post('/api/empresas', {
      nombre: 'Empresa buena',
      secciones: seccionBuena,
    });
    const nombres = (await cuenta.propietario.get('/api/empresas')).cuerpo.map((e: { nombre: string }) => e.nombre);

    expect(rechazada.estado).toBe(400);
    expect(nombres).not.toContain('Empresa mala');
    expect(aceptada.estado).toBe(201);
    expect(recibidas.at(-1)).toMatchObject({ aviso: 'empresa', empresaDelOperador: aceptada.cuerpo.id });
  });

  it('editar otra empresa avisa con esa empresa como empresa del operador; si la sección es mala no cambia nada', async () => {
    const otra = await cuenta.propietario.post('/api/empresas', { nombre: 'Para editar' });
    const ruta = `/api/empresas/${otra.cuerpo.id}`;

    const rechazada = await cuenta.propietario.put(ruta, { nombre: 'Cambiada mal', secciones: seccionMala });
    const aceptada = await cuenta.propietario.put(ruta, { nombre: 'Cambiada bien', secciones: seccionBuena });

    expect(rechazada.estado).toBe(400);
    expect(rechazada.cuerpo.error.detalles[0].campo).toBe('secciones.prueba.malo');
    expect(aceptada.cuerpo.nombre).toBe('Cambiada bien');
    expect(recibidas.at(-1)).toMatchObject({ aviso: 'empresa', empresaDelOperador: otra.cuerpo.id });
  });
});
