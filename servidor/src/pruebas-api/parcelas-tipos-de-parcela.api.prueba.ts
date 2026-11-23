import { beforeAll, describe, expect, it } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const RUTA = '/api/parcelas/tipos-de-parcela';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let otraCuenta: CuentaDePrueba;

const datos = (cambios: Record<string, unknown> = {}) => ({
  nombre: 'Registro de prueba',
  activo: true,
  ...cambios,
});

beforeAll(async () => {
  const modulos = ['terceros', 'parcelas'];
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Generada', usuario: 'propietariogenerado', modulos });
  otraCuenta = await darDeAltaCuenta(entorno, { nombre: 'Ajena', usuario: 'propietarioajeno', modulos });
});

describe('tipos de parcela por API', () => {
  it('la primera vez que se lista se siembran los tipos sugeridos; después la empresa manda', async () => {
    const primera = (await cuenta.propietario.get(RUTA)).cuerpo as Array<{ id: string; nombre: string }>;
    await cuenta.propietario.delete(`${RUTA}/${primera.find(({ nombre }) => nombre === 'Cuadro')!.id}`);
    const despues = (await cuenta.propietario.get(RUTA)).cuerpo as Array<{ nombre: string }>;

    expect(primera.map(({ nombre }) => nombre).sort()).toEqual([
      'Bosque',
      'Cuadro',
      'Lote',
      'Parcela',
      'Potrero',
      'Tablón',
    ]);
    expect(despues.map(({ nombre }) => nombre)).not.toContain('Cuadro');
    expect(despues).toHaveLength(5);
  });

  it('se registran, se listan y se cambian', async () => {
    const creado = await cuenta.propietario.post(RUTA, datos());
    const id = creado.cuerpo.id;
    const cambiado = await cuenta.propietario.put(`${RUTA}/${id}`, datos({ nombre: 'Registro cambiado' }));

    expect(creado.estado).toBe(201);
    expect((await cuenta.propietario.get(`${RUTA}/${id}`)).cuerpo).toEqual(cambiado.cuerpo);
    expect((await cuenta.propietario.get(RUTA)).cuerpo).toContainEqual(cambiado.cuerpo);
    expect(cambiado.cuerpo.nombre).toBe('Registro cambiado');
  });

  it('se inactivan sin perder sus datos', async () => {
    const creado = await cuenta.propietario.post(RUTA, datos());
    const inactivo = await cuenta.propietario.put(`${RUTA}/${creado.cuerpo.id}`, datos({ activo: false }));

    expect(inactivo.cuerpo).toEqual({ ...creado.cuerpo, activo: false });
  });

  it('otra cuenta no los ve', async () => {
    const ajeno = await otraCuenta.propietario.post(RUTA, datos());

    expect((await cuenta.propietario.get(`${RUTA}/${ajeno.cuerpo.id}`)).estado).toBe(404);
    expect((await otraCuenta.propietario.get(RUTA)).cuerpo).toContainEqual(ajeno.cuerpo);
    expect((await cuenta.propietario.get(RUTA)).cuerpo).not.toContainEqual(ajeno.cuerpo);
  });

  it('lo exportado se puede revisar para importarlo de nuevo', async () => {
    await cuenta.propietario.post(RUTA, datos());
    const exportado = await cuenta.propietario.get(`${RUTA}/exportar`);

    const revision = await cuenta.propietario.subirImagen('POST', `${RUTA}/importar?ensayo=true`, {
      nombreArchivo: 'tipos-de-parcela.xlsx',
      tipoMime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      contenido: exportado.cuerpo,
    });

    expect(exportado.estado).toBe(200);
    expect(revision.cuerpo).toMatchObject({ guardado: false, filas: expect.any(Number) });
  });

  it('para registrar hace falta el permiso de crear', async () => {
    const lector = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Solo',
      apellidos: 'Lectura',
      permisos: ['parcelas.tipos-de-parcela.ver'],
    });

    expect((await lector.get(RUTA)).estado).toBe(200);
    expect((await lector.post(RUTA, datos())).estado).toBe(403);
    expect((await lector.get(`${RUTA}/exportar`)).estado).toBe(403);
    expect((await lector.get(`${RUTA}/plantilla`)).estado).toBe(403);
  });
});
