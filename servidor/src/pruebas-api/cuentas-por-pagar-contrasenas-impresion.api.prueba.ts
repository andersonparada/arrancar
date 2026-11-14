/**
 * Imprimir una contraseña de pago (CP3-5): la vista previa no cambia nada, la primera impresión guarda `impresa_en` y
 * la segunda sale como reimpresión (también dos a la vez), con lo fijo y lo vivo, la compensación de las notas, la
 * retención por emitir de un saldo inicial, la leyenda por omisión o la de la empresa, y los permisos.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { notaConSaldoLibre } from './soporte/cuentas-por-pagar-notas.js';
import {
  cuerpoDeContrasena as cuerpoDe,
  EscenarioDeContrasenas,
  RUTA_DE_CONTRASENAS as RUTA,
} from './soporte/cuentas-por-pagar-contrasenas.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { consultar, haceDias } from './soporte/escenario-de-documentos.js';

const LEYENDA = 'cuentas-por-pagar.contrasenas.leyenda';
const POR_OMISION = 'Documentos recibidos para revisión. Esta contraseña no implica aceptación de las facturas;';
const entorno = usarEntornoApi();
let mundo: EscenarioDeContrasenas;

beforeAll(async () => {
  mundo = await EscenarioDeContrasenas.preparar(entorno, 'cxpcontrasenasimpresion');
  await entorno.soporte.put('/api/sesion/empresa-activa', { empresaId: mundo.escenario.cuenta.empresaId });
});

const propietario = () => mundo.propietario();
const vista = (id: string) => propietario().get(`${RUTA}/${id}/impresion`);
const imprimir = (id: string) => propietario().post(`${RUTA}/${id}/impresiones`, {});
const impresaEn = async (id: string) =>
  (
    await consultar<{ impresa_en: string | null }>(
      'select impresa_en::text from cuentas_por_pagar.contrasenas where id = $1',
      [id],
    )
  )[0]!.impresa_en;

async function contrasenaConNota() {
  const proveedor = await mundo.unProveedor();
  const nota = await notaConSaldoLibre(mundo.documentos, proveedor);
  const cargo = await mundo.unCargo(proveedor);
  const creada = await mundo.crear(cuerpoDe(proveedor.proveedorId, [cargo, nota.notaPropia]));
  expect(creada.estado, JSON.stringify(creada.cuerpo)).toBe(201);
  return creada.cuerpo;
}

async function contrasenaDeUnCargo() {
  const proveedor = await mundo.unProveedor();
  const creada = await mundo.crear(cuerpoDe(proveedor.proveedorId, [await mundo.unCargo(proveedor)]));
  expect(creada.estado, JSON.stringify(creada.cuerpo)).toBe(201);
  return creada.cuerpo;
}

describe('el contenido', () => {
  it('lleva la empresa, lo fijo, lo vivo al día, la compensación con la nota y la leyenda por omisión', async () => {
    const contrasena = await contrasenaConNota();

    const respuesta = await vista(contrasena.id);

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo).toMatchObject({
      empresa: { nombre: expect.any(String) },
      contrasena: { id: contrasena.id, numero: contrasena.numero, estado: 'vigente' },
      proveedor: { nombre: contrasena.proveedorNombre },
      hojas: [{ rotulo: 'ORIGINAL — PROVEEDOR' }, { rotulo: 'COPIA — EMPRESA' }],
      cargos: [expect.objectContaining({ total: '1120.00', rebajado: '100.00', saldo: '1020.00' })],
      totales: { total: '1120.00', rebajado: '100.00', saldo: '1020.00' },
      compensaciones: [
        expect.objectContaining({ monto: '100.00', texto: expect.stringMatching(/^Compensación con nota /) }),
      ],
      leyenda: expect.stringContaining(POR_OMISION),
      alDia: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      reimpresion: false,
      impresoPorNombre: expect.any(String),
      anulacion: null,
    });
  });

  it('un saldo inicial informa la retención por emitir sin restarla y lleva la leyenda de constancias', async () => {
    const saldo = await mundo.documentos.sembrarSaldoInicial({ fechaEmision: haceDias(40) });
    const creada = await mundo.crear(cuerpoDe(mundo.escenario.proveedorId, [saldo]));
    expect(creada.estado, JSON.stringify(creada.cuerpo)).toBe(201);

    const { cuerpo } = await vista(creada.cuerpo.id);

    expect(cuerpo.cargos[0]).toMatchObject({ retenciones: '120.00', saldo: '700.00' });
    expect(cuerpo.retencionesPorEmitir).toEqual([
      expect.objectContaining({
        monto: '50.00',
        texto: 'Retención por emitir: Q50.00; se entregará su constancia',
      }),
    ]);
    expect(cuerpo).toMatchObject({
      hayRetenciones: true,
      leyendaDeRetenciones: 'Las retenciones se documentan con su constancia.',
    });
  });

  it('la leyenda de la empresa reemplaza la de por omisión y vacía no se imprime', async () => {
    const contrasena = await contrasenaDeUnCargo();
    const poner = (valor: string) => entorno.soporte.put(`/api/configuracion/${LEYENDA}`, { nivel: 'empresa', valor });

    expect((await poner('Pagos los viernes de 8 a 12.')).estado).toBe(204);
    expect((await vista(contrasena.id)).cuerpo.leyenda).toBe('Pagos los viernes de 8 a 12.');
    expect((await poner('')).estado).toBe(204);
    expect((await vista(contrasena.id)).cuerpo.leyenda).toBeNull();
    await entorno.soporte.delete(`/api/configuracion/${LEYENDA}?nivel=empresa`);

    expect((await vista(contrasena.id)).cuerpo.leyenda).toContain(POR_OMISION);
  });

  it('una anulada se imprime con su anulación', async () => {
    const contrasena = await contrasenaDeUnCargo();
    await propietario().post(`${RUTA}/${contrasena.id}/anular`, { motivo: 'Se perdió el papel' });

    const { cuerpo } = await vista(contrasena.id);

    expect(cuerpo).toMatchObject({
      contrasena: { estado: 'anulada' },
      anulacion: expect.objectContaining({ motivo: 'Se perdió el papel' }),
    });
  });
});

describe('la marca de impresión', () => {
  it('la vista previa no cambia nada; la primera impresión no es reimpresión y la segunda sí', async () => {
    const contrasena = await contrasenaDeUnCargo();

    expect((await vista(contrasena.id)).cuerpo.reimpresion).toBe(false);
    expect(await impresaEn(contrasena.id)).toBeNull();

    const primera = await imprimir(contrasena.id);
    expect(primera.estado, JSON.stringify(primera.cuerpo)).toBe(200);
    expect(primera.cuerpo.reimpresion).toBe(false);
    const marca = await impresaEn(contrasena.id);
    expect(marca).not.toBeNull();

    expect((await imprimir(contrasena.id)).cuerpo.reimpresion).toBe(true);
    expect((await vista(contrasena.id)).cuerpo.reimpresion).toBe(true);
    expect(await impresaEn(contrasena.id)).toBe(marca);
    expect((await propietario().get(`${RUTA}/${contrasena.id}`)).cuerpo.impresa).toBe(true);
  });

  it('dos impresiones a la vez de una sin imprimir: solo una es la primera', async () => {
    const contrasena = await contrasenaDeUnCargo();

    const respuestas = await Promise.all([imprimir(contrasena.id), imprimir(contrasena.id)]);

    expect(respuestas.map(({ estado }) => estado)).toEqual([200, 200]);
    expect(respuestas.map(({ cuerpo }) => cuerpo.reimpresion).sort()).toEqual([false, true]);
  });
});

describe('permisos y errores', () => {
  it('quien solo ve puede ver e imprimir; sin permiso de contraseñas no; una inexistente da 404', async () => {
    const contrasena = await contrasenaDeUnCargo();
    const { soloVer, sinPermisos } = mundo.usuarios;

    expect((await soloVer.get(`${RUTA}/${contrasena.id}/impresion`)).estado).toBe(200);
    expect((await soloVer.post(`${RUTA}/${contrasena.id}/impresiones`, {})).estado).toBe(200);
    expect((await sinPermisos.get(`${RUTA}/${contrasena.id}/impresion`)).estado).toBe(403);
    expect((await sinPermisos.post(`${RUTA}/${contrasena.id}/impresiones`, {})).estado).toBe(403);
    const inexistente = '00000000-0000-4000-8000-000000000000';
    expect((await vista(inexistente)).estado).toBe(404);
    expect((await imprimir(inexistente)).estado).toBe(404);
  });
});
