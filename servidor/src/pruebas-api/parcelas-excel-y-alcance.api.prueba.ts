import { beforeAll, describe, expect, it } from 'vitest';
import { filasDeExcel, importarExcel, libroConFilas } from './soporte/apertura-por-api.js';
import type { ClienteApi } from './soporte/cliente-api.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import {
  RUTA_DE_PARCELAS as RUTA,
  crearLocalidadDePrueba,
  cuerpoDeMedicion,
  cuerpoDeParcela,
  tipoDeParcelaDePrueba,
} from './soporte/escenario-de-parcelas.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let encargado: ClienteApi;
let lector: ClienteApi;
let localidadDelPropietario: string;
let localidadDelEncargado: string;
let tipoId: string;

const permisosDe = (recurso: string, acciones: string[]) => acciones.map((accion) => `parcelas.${recurso}.${accion}`);

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, {
    nombre: 'Excel y alcance',
    usuario: 'propietarioparcelasalcance',
    modulos: ['terceros', 'parcelas'],
  });
  encargado = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Encargado',
    apellidos: 'Deparcelas',
    permisos: [
      ...permisosDe('parcelas', ['ver', 'crear', 'editar', 'eliminar']),
      ...permisosDe('mediciones', ['crear', 'anular']),
      ...permisosDe('tipos-de-parcela', ['ver']),
      'empresas.localidades.ver',
      'empresas.localidades.crear',
      'empresas.tipos-de-localidad.ver',
    ],
  });
  lector = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Solo',
    apellidos: 'Lectura',
    permisos: permisosDe('parcelas', ['ver']),
  });
  localidadDelPropietario = await crearLocalidadDePrueba(cuenta.propietario, 'ALC-P');
  localidadDelEncargado = await crearLocalidadDePrueba(encargado, 'ALC-E');
  tipoId = await tipoDeParcelaDePrueba(cuenta.propietario);
});

describe('alcance por localidad', () => {
  it('quien no ve una localidad no ve, crea, cambia, mide, inactiva ni elimina sus parcelas', async () => {
    const ajena = await cuenta.propietario.post(
      RUTA,
      cuerpoDeParcela({ localidadId: localidadDelPropietario, tipoId }, { codigo: 'AJ-1', nombre: 'Ajena' }),
    );
    const propia = await encargado.post(
      RUTA,
      cuerpoDeParcela({ localidadId: localidadDelEncargado, tipoId }, { codigo: 'PR-1', nombre: 'Propia' }),
    );
    const id = ajena.cuerpo.id;

    const visibles = ((await encargado.get(RUTA)).cuerpo as Array<{ id: string }>).map((parcela) => parcela.id);
    const respuestas = [
      await encargado.get(`${RUTA}/${id}`),
      await encargado.put(`${RUTA}/${id}`, cuerpoDeParcela({ localidadId: localidadDelPropietario, tipoId })),
      await encargado.post(`${RUTA}/${id}/mediciones`, cuerpoDeMedicion()),
      await encargado.post(`${RUTA}/${id}/inactivar`, {}),
      await encargado.delete(`${RUTA}/${id}`),
      await encargado.post(
        RUTA,
        cuerpoDeParcela({ localidadId: localidadDelPropietario, tipoId }, { codigo: 'AJ-2', nombre: 'Intrusa' }),
      ),
    ];

    expect(visibles).toContain(propia.cuerpo.id);
    expect(visibles).not.toContain(id);
    expect(respuestas.map(({ estado }) => estado)).toEqual([404, 404, 404, 404, 404, 404]);
  });

  it('la madre de otra localidad que no ve se trata como inexistente', async () => {
    const madre = await cuenta.propietario.post(
      RUTA,
      cuerpoDeParcela({ localidadId: localidadDelPropietario, tipoId }, { codigo: 'AJ-3', nombre: 'Madre ajena' }),
    );

    const hija = await encargado.post(
      RUTA,
      cuerpoDeParcela(
        { localidadId: localidadDelEncargado, tipoId },
        { codigo: 'PR-3', nombre: 'Hija', parcelaMadreId: madre.cuerpo.id },
      ),
    );

    expect(hija.estado).toBe(404);
  });
});

describe('permisos por acción', () => {
  it('quien solo ve no crea, edita, mide, elimina ni usa el Excel', async () => {
    const parcela = await cuenta.propietario.post(
      RUTA,
      cuerpoDeParcela({ localidadId: localidadDelPropietario, tipoId }, { codigo: 'PE-1', nombre: 'Permisos' }),
    );
    const id = parcela.cuerpo.id;

    const respuestas = [
      await lector.get(RUTA),
      await lector.post(RUTA, cuerpoDeParcela({ localidadId: localidadDelPropietario, tipoId })),
      await lector.put(`${RUTA}/${id}`, cuerpoDeParcela({ localidadId: localidadDelPropietario, tipoId })),
      await lector.post(`${RUTA}/${id}/mediciones`, cuerpoDeMedicion()),
      await lector.post(`${RUTA}/${id}/inactivar`, {}),
      await lector.delete(`${RUTA}/${id}`),
      await lector.get(`${RUTA}/exportar`),
      await lector.get(`${RUTA}/plantilla`),
    ];

    expect(respuestas.map(({ estado }) => estado)).toEqual([200, 403, 403, 403, 403, 403, 403, 403]);
  });
});

describe('Excel de parcelas', () => {
  const fila = (codigo: string, extra: Record<string, unknown> = {}) => ({
    Localidad: `Finca ALC-P`,
    Código: codigo,
    Nombre: `Excel ${codigo}`,
    Tipo: 'Potrero',
    Tenencia: 'Propia',
    ...extra,
  });

  it('importa en árbol, con medición en cuerdas y la madre por su código; el ensayo no guarda', async () => {
    const filas = [
      fila('XL-1', { Superficie: 16, 'Unidad de la superficie': 'Cuerdas', 'Superficie útil (misma unidad)': 10 }),
      fila('XL-2', { 'Código de la parcela madre': 'xl-1', Latitud: 14.6349, Longitud: -90.5069 }),
    ];
    const libro = await libroConFilas(cuenta.propietario, RUTA, filas);

    const ensayo = await importarExcel(cuenta.propietario, RUTA, { contenido: libro, ensayo: true });
    const antes = (await cuenta.propietario.get(`${RUTA}?texto=XL-`)).cuerpo as unknown[];
    const real = await importarExcel(cuenta.propietario, RUTA, { contenido: libro, ensayo: false });
    const guardadas = (await cuenta.propietario.get(`${RUTA}?texto=XL-`)).cuerpo as Array<Record<string, unknown>>;

    expect(ensayo.cuerpo).toMatchObject({ guardado: false });
    expect(antes).toEqual([]);
    expect(real.cuerpo).toMatchObject({ guardado: true });
    expect(guardadas.map((parcela) => parcela.codigo)).toEqual(['XL-1', 'XL-2']);
    expect(guardadas[0]).toMatchObject({ superficieTotalM2: '6987.37', superficieUtilM2: '4367.11' });
    expect(guardadas[1]).toMatchObject({ nivel: 2, parcelaMadreCodigo: 'XL-1', latitud: '14.634900' });
  });

  it('una madre que no existe o una unidad sin cifra se informan por fila y nada se guarda', async () => {
    const libro = await libroConFilas(cuenta.propietario, RUTA, [
      fila('XL-3'),
      fila('XL-4', { 'Código de la parcela madre': 'NOEXISTE' }),
      fila('XL-5', { 'Unidad de la superficie': 'Cuerdas' }),
    ]);

    const real = await importarExcel(cuenta.propietario, RUTA, { contenido: libro, ensayo: false });
    const guardadas = (await cuenta.propietario.get(`${RUTA}?texto=XL-3`)).cuerpo as unknown[];

    expect(real.cuerpo).toMatchObject({ guardado: false });
    expect(JSON.stringify(real.cuerpo)).toContain('NOEXISTE');
    expect(guardadas).toEqual([]);
  });

  it('exporta con la medición original y se puede volver a importar', async () => {
    const exportado = await cuenta.propietario.get(`${RUTA}/exportar`);

    const filas = await filasDeExcel(exportado.cuerpo as Buffer);
    const revision = await importarExcel(cuenta.propietario, RUTA, {
      contenido: exportado.cuerpo as Buffer,
      ensayo: true,
    });
    const encabezados = filas[0]!.map((celda) => String(celda).replace(/\s*\*$/, ''));
    const primera = filas.find((celda) => celda.includes('XL-1'))!;

    expect(primera[encabezados.indexOf('Superficie')]).toBe(16);
    expect(primera[encabezados.indexOf('Unidad de la superficie')]).toBe('Cuerdas');
    expect(primera[encabezados.indexOf('Superficie útil (misma unidad)')]).toBe(10);
    expect(revision.cuerpo).toMatchObject({ guardado: false });
  });
});
