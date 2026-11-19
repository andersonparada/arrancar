/** IC-4: el catálogo de formatos de cheque, su prueba de alineación y su asignación a las chequeras. */
import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { EscenarioDeCheques } from './soporte/escenario-de-impresion-de-cheques.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import { auditoriaDe } from './soporte/ordenes-de-bancos.js';

const RUTA = '/api/bancos/formatos-de-cheque';
const entorno = usarEntornoApi();
let e: EscenarioDeCheques;
let otra: CuentaDePrueba;
let secuencia = 0;

const cuerpo = (cambios: Record<string, unknown> = {}) => ({
  nombre: `Formato ${(secuencia += 1)}`,
  base: 'cheque_suelto',
  ajustes: {},
  ...cambios,
});
const crear = async (cambios: Record<string, unknown> = {}, usuario: ClienteApi = e.propietario) => {
  const creado = await usuario.post(RUTA, cuerpo(cambios));
  expect(creado.estado, JSON.stringify(creado.cuerpo)).toBe(201);
  return creado.cuerpo as { id: string; nombre: string };
};

beforeAll(async () => {
  e = await EscenarioDeCheques.preparar(entorno, 'icformatos');
  otra = await darDeAltaCuenta(entorno, { nombre: 'Otra de formatos', usuario: 'icformatosotra', modulos: ['bancos'] });
});

describe('crear, ver y cambiar', () => {
  it('crea, lista y trae el detalle con las medidas resueltas', async () => {
    const formato = await crear({ ajustes: { desplazamiento: { xMm: 2, yMm: -1 } } });

    const lista = await e.propietario.get(RUTA);
    const detalle = await e.propietario.get(`${RUTA}/${formato.id}`);

    expect(lista.cuerpo.map((f: { id: string }) => f.id)).toContain(formato.id);
    expect(detalle.cuerpo).toMatchObject({ nombre: formato.nombre, activo: true, probadoEn: null, danado: false });
    expect(detalle.cuerpo.resuelto.desplazamiento).toEqual({ xMm: 2, yMm: -1 });
    expect(detalle.cuerpo.resuelto.papel).toEqual({ anchoMm: 175, altoMm: 76 });
  });

  it('un campo libre o una medida fuera de rango se rechaza', async () => {
    const libre = await e.propietario.post(RUTA, cuerpo({ ajustes: { anotacion: { xMm: 1, yMm: 1 } } }));
    const fuera = await e.propietario.post(RUTA, cuerpo({ ajustes: { letra: { tamanoPt: 40 } } }));
    const base = await e.propietario.post(RUTA, cuerpo({ base: 'de_otro_banco' }));

    expect(libre.estado).toBe(400);
    expect(libre.cuerpo.error.codigo).toBe('formato_de_cheque_invalido');
    expect(fuera.estado).toBe(400);
    expect(base.estado).toBe(400);
  });

  it('el nombre es único en la cuenta; otra cuenta puede repetirlo pero no ve ni toca los ajenos', async () => {
    const formato = await crear({ nombre: 'Cheque Banrural' });

    const repetido = await e.propietario.post(RUTA, cuerpo({ nombre: 'CHEQUE  banrural' }));
    const deOtra = await crear({ nombre: 'Cheque Banrural' }, otra.propietario);

    expect(repetido.estado).toBe(409);
    expect(deOtra.id).not.toBe(formato.id);
    expect((await otra.propietario.get(`${RUTA}/${formato.id}`)).estado).toBe(404);
    expect((await otra.propietario.patch(`${RUTA}/${formato.id}`, cuerpo())).estado).toBe(404);
    expect((await otra.propietario.post(`${RUTA}/${formato.id}/inactivar`)).estado).toBe(404);
    expect((await otra.propietario.delete(`${RUTA}/${formato.id}`, { motivo: 'Prueba' })).estado).toBe(404);
    const lista = await otra.propietario.get(RUTA);
    expect(lista.cuerpo.map((f: { id: string }) => f.id)).not.toContain(formato.id);
  });

  it('«probado» se guarda y se pierde al cambiar los ajustes, no el nombre', async () => {
    const formato = await crear();
    const probado = await e.propietario.post(`${RUTA}/${formato.id}/probado`);
    expect(probado.cuerpo.probadoEn).not.toBeNull();

    const soloNombre = await e.propietario.patch(`${RUTA}/${formato.id}`, cuerpo({ nombre: 'Renombrado' }));
    expect(soloNombre.cuerpo.probadoEn).not.toBeNull();

    const conAjustes = await e.propietario.patch(
      `${RUTA}/${formato.id}`,
      cuerpo({ nombre: 'Renombrado', ajustes: { desplazamiento: { xMm: 1 } } }),
    );
    expect(conAjustes.cuerpo.probadoEn).toBeNull();
  });
});

describe('inactivar, reactivar y eliminar', () => {
  it('cada baja deja auditoría', async () => {
    const formato = await crear();

    await e.propietario.post(`${RUTA}/${formato.id}/inactivar`);
    await e.propietario.post(`${RUTA}/${formato.id}/reactivar`);
    const eliminado = await e.propietario.delete(`${RUTA}/${formato.id}`, { motivo: 'Ya no hay impresora' });

    expect(eliminado.estado).toBe(204);
    expect((await auditoriaDe(formato.id)).map((a) => `${a.recurso}:${a.accion}`)).toEqual([
      'bancos.formatos-de-cheque:inactivar',
      'bancos.formatos-de-cheque:reactivar',
      'bancos.formatos-de-cheque:eliminar',
    ]);
    expect((await e.propietario.get(`${RUTA}/${formato.id}`)).estado).toBe(404);
  });

  it('un formato que usa una chequera no se elimina', async () => {
    const formato = await crear();
    const chequeraId = await e.crearChequera(1001, 1010, 'EL');
    await e.propietario.patch(`/api/bancos/chequeras/${chequeraId}/formato`, {
      formatoDeChequeId: formato.id,
      plantillaDeCheque: null,
    });

    const respuesta = await e.propietario.delete(`${RUTA}/${formato.id}`, { motivo: 'Prueba' });

    expect(respuesta.estado).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('formato_de_cheque_en_uso');
    const lista = await e.propietario.get(RUTA);
    expect(lista.cuerpo.find((f: { id: string }) => f.id === formato.id).chequerasQueLoUsan).toBe(1);
  });
});

describe('asignar el formato a la chequera', () => {
  const asignar = (chequeraId: string, formatoDeChequeId: string | null, plantillaDeCheque: string | null) =>
    e.propietario.patch(`/api/bancos/chequeras/${chequeraId}/formato`, { formatoDeChequeId, plantillaDeCheque });

  it('acepta un formato de la cuenta o una plantilla de fábrica y los muestra en la chequera', async () => {
    const formato = await crear({ nombre: 'Para asignar' });
    const chequeraId = await e.crearChequera(2001, 2010, 'AS');

    const conFormato = await asignar(chequeraId, formato.id, null);
    expect(conFormato.cuerpo).toMatchObject({ formatoDeChequeId: formato.id, formatoNombre: 'Para asignar' });

    const conPlantilla = await asignar(chequeraId, null, 'voucher_carta_arriba');
    expect(conPlantilla.cuerpo).toMatchObject({ formatoDeChequeId: null, plantillaDeCheque: 'voucher_carta_arriba' });

    const ninguno = await asignar(chequeraId, null, null);
    expect(ninguno.cuerpo).toMatchObject({ formatoDeChequeId: null, plantillaDeCheque: null });
  });

  it('no admite los dos, ni una plantilla inventada, ni un formato de otra cuenta, ni uno inactivo', async () => {
    const formato = await crear();
    const ajeno = await crear({}, otra.propietario);
    const chequeraId = await e.crearChequera(3001, 3010, 'AJ');

    expect((await asignar(chequeraId, formato.id, 'cheque_suelto')).estado).toBe(400);
    expect((await asignar(chequeraId, null, 'de_otro_banco')).estado).toBe(400);
    const deOtra = await asignar(chequeraId, ajeno.id, null);
    expect(deOtra.estado).toBe(404);
    await e.propietario.post(`${RUTA}/${formato.id}/inactivar`);
    const inactivo = await asignar(chequeraId, formato.id, null);
    expect(inactivo.estado).toBe(422);
    expect(inactivo.cuerpo.error.codigo).toBe('formato_de_cheque_inactivo');
  });

  it('una chequera nueva se imprime como la última de su cuenta', async () => {
    const formato = await crear();
    const anterior = await e.crearChequera(4001, 4010, 'NU');
    await asignar(anterior, formato.id, null);

    const nueva = await e.propietario.get(`/api/bancos/chequeras?cuentaBancariaId=${e.cuentaBancariaId}`);
    const siguiente = await e.crearChequera(4011, 4020, 'NU');

    const chequera = (await e.propietario.get('/api/bancos/chequeras')).cuerpo.find(
      (c: { id: string }) => c.id === siguiente,
    );
    expect(nueva.estado).toBe(200);
    expect(chequera.formatoDeChequeId).toBe(formato.id);
  });
});

describe('la prueba de alineación y las plantillas', () => {
  it('lista las cuatro plantillas de fábrica con sus medidas aproximadas', async () => {
    const plantillas = await e.propietario.get(`${RUTA}/plantillas`);

    expect(plantillas.cuerpo.map((p: { clave: string }) => p.clave)).toEqual([
      'voucher_carta_arriba',
      'voucher_carta_en_medio',
      'cheque_suelto',
      'cheque_suelto_casillas',
    ]);
    expect(plantillas.cuerpo[2].descripcion).toContain('Medidas aproximadas');
  });

  it('arma la hoja de prueba de un formato y de una plantilla sin marcar nada', async () => {
    const formato = await crear();

    const hoja = await e.propietario.get(`${RUTA}/${formato.id}/prueba`);
    const dePlantilla = await e.propietario.get(`${RUTA}/plantillas/cheque_suelto_casillas/prueba`);

    expect(hoja.cuerpo.probado).toBe(false);
    const beneficiario = hoja.cuerpo.cheque.campos.find((c: { clave: string }) => c.clave === 'beneficiario');
    expect(beneficiario.texto).toMatch(/^PRUEBA — SIN VALOR\*+$/);
    expect(hoja.cuerpo.cheque.campos.find((c: { clave: string }) => c.clave === 'fecha').texto).toMatch(
      /^Guatemala, \d{1,2} de \w+ de \d{4}$/,
    );
    expect(dePlantilla.cuerpo.cheque.campos.map((c: { clave: string }) => c.clave)).toContain('dia');
    expect((await e.propietario.get(`${RUTA}/${formato.id}`)).cuerpo.probadoEn).toBeNull();
    expect((await e.propietario.get(`${RUTA}/plantillas/inventada/prueba`)).estado).toBe(400);
  });
});

describe('permisos', () => {
  it('sin permisos, cada ruta responde 403; con solo ver, no se escribe', async () => {
    const sin = await crearUsuarioConPermisos(entorno, e.cuenta, {
      nombres: 'Sin',
      apellidos: 'Formatos',
      permisos: [],
    });
    const soloVer = await crearUsuarioConPermisos(entorno, e.cuenta, {
      nombres: 'Mira',
      apellidos: 'Formatos',
      permisos: ['bancos.formatos-de-cheque.ver'],
    });
    const formato = await crear();
    const id = formato.id;

    for (const usuario of [sin]) {
      expect((await usuario.get(RUTA)).estado).toBe(403);
      expect((await usuario.get(`${RUTA}/${id}`)).estado).toBe(403);
      expect((await usuario.get(`${RUTA}/${id}/prueba`)).estado).toBe(403);
      expect((await usuario.get(`${RUTA}/plantillas`)).estado).toBe(403);
    }
    expect((await soloVer.get(RUTA)).estado).toBe(200);
    expect((await soloVer.post(RUTA, cuerpo())).estado).toBe(403);
    expect((await soloVer.patch(`${RUTA}/${id}`, cuerpo())).estado).toBe(403);
    expect((await soloVer.post(`${RUTA}/${id}/inactivar`)).estado).toBe(403);
    expect((await soloVer.post(`${RUTA}/${id}/probado`)).estado).toBe(403);
    expect((await soloVer.delete(`${RUTA}/${id}`, { motivo: 'Prueba' })).estado).toBe(403);
    const chequeraId = await e.crearChequera(5001, 5010, 'PE');
    const asignacion = { formatoDeChequeId: null, plantillaDeCheque: 'cheque_suelto' };
    expect((await soloVer.patch(`/api/bancos/chequeras/${chequeraId}/formato`, asignacion)).estado).toBe(403);
  });
});
