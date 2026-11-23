import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ReglaDeNegocioInfringida } from '../modulos/core/compartido/dominio/errores.js';
import '../modulos/core/contratos/empresas.contratos.js';
import { mediador } from '../modulos/core/mediador/contexto.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const RUTA = '/api/empresas/inmuebles';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let otraCuenta: CuentaDePrueba;
let contador = 0;
const valoresProtegidos = new Set<string>();
const avisados: Array<{ aviso: string; fuente: string }> = [];

class UsadoEnCierre extends ReglaDeNegocioInfringida {
  readonly codigo = 'valor_de_inmueble_usado_en_cierre';
}

const inmueble = () => ({
  nombre: `Finca ${++contador}`,
  situacionRegistral: 'inscrito',
  registro: 'general',
  numeroDeFinca: String(contador),
  folio: '1',
  libro: '1A',
  departamentoRegistral: '01',
  titularidad: 'propia',
});

const valor = (cambios: Record<string, unknown> = {}) => ({
  fuente: 'matricula_fiscal',
  vigenteDesde: '2026-01-01',
  origen: 'avaluo_dicabi',
  valorTotal: '1000000.00',
  ...cambios,
});

async function nuevoInmueble(usuario = cuenta.propietario): Promise<string> {
  return (await usuario.post(RUTA, inmueble())).cuerpo.id as string;
}

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Valores', usuario: 'propietariovalores' });
  otraCuenta = await darDeAltaCuenta(entorno, { nombre: 'Valores ajena', usuario: 'propietarioajenovalores' });
  mediador.escuchar('empresas', 'empresas.valor_de_inmueble_registrado', async ({ fuente }) => {
    avisados.push({ aviso: 'registrado', fuente });
  });
  mediador.escuchar('empresas', 'empresas.valor_de_inmueble_por_eliminar', async ({ valorId }) => {
    if (valoresProtegidos.has(valorId)) throw new UsadoEnCierre('Un activo ya lo usó en un mes cerrado.');
  });
});

afterAll(() => valoresProtegidos.clear());

describe('valores del inmueble por API', () => {
  it('se registran en dos series, se listan del más reciente al más antiguo y avisan al mediador', async () => {
    const id = await nuevoInmueble();
    const antes = avisados.length;

    const viejo = await cuenta.propietario.post(
      `${RUTA}/${id}/valores`,
      valor({ vigenteDesde: '2025-01-01', valorTotal: '800000.00' }),
    );
    const catastro = await cuenta.propietario.post(
      `${RUTA}/${id}/valores`,
      valor({
        fuente: 'catastro_municipal',
        origen: 'avaluo_municipal',
        valorTerreno: '300000.00',
        valorConstrucciones: '500000.00',
        valorCultivosPermanentes: '100000.00',
        valorTotal: '900000.00',
        documento: 'Avalúo 55',
      }),
    );
    const matricula = await cuenta.propietario.post(
      `${RUTA}/${id}/valores`,
      valor({ vigenteDesde: '2026-06-01', categoriaIusi: 'comercial' }),
    );
    const lista = await cuenta.propietario.get(`${RUTA}/${id}/valores`);

    expect([viejo.estado, catastro.estado, matricula.estado]).toEqual([201, 201, 201]);
    expect(catastro.cuerpo).toMatchObject({ documento: 'Avalúo 55', archivoId: null, valorTotal: '900000.00' });
    expect(lista.cuerpo.map((v: { vigenteDesde: string }) => v.vigenteDesde)).toEqual([
      '2026-06-01',
      '2026-01-01',
      '2025-01-01',
    ]);
    expect(avisados.slice(antes).map((a) => a.fuente)).toEqual([
      'matricula_fiscal',
      'catastro_municipal',
      'matricula_fiscal',
    ]);
  });

  it('la misma fecha en la misma fuente no se repite, pero sí en la otra', async () => {
    const id = await nuevoInmueble();
    await cuenta.propietario.post(`${RUTA}/${id}/valores`, valor());

    const repetido = await cuenta.propietario.post(`${RUTA}/${id}/valores`, valor({ valorTotal: '1.00' }));
    const otraFuente = await cuenta.propietario.post(`${RUTA}/${id}/valores`, valor({ fuente: 'catastro_municipal' }));

    expect(repetido.estado).toBe(400);
    expect(repetido.cuerpo.error.codigo).toBe('valor_de_inmueble_repetido');
    expect(otraFuente.estado).toBe(201);
  });

  it('la categoría del IUSI solo va con la matrícula y las partes no pasan del total', async () => {
    const id = await nuevoInmueble();

    const enCatastro = await cuenta.propietario.post(
      `${RUTA}/${id}/valores`,
      valor({ fuente: 'catastro_municipal', categoriaIusi: 'vivienda' }),
    );
    const partes = await cuenta.propietario.post(`${RUTA}/${id}/valores`, valor({ valorTerreno: '2000000.00' }));
    const sinTotal = await cuenta.propietario.post(`${RUTA}/${id}/valores`, { ...valor(), valorTotal: '0' });

    expect(enCatastro.cuerpo.error.codigo).toBe('categoria_iusi_fuera_de_matricula');
    expect(partes.cuerpo.error.codigo).toBe('valor_de_inmueble_invalido');
    expect(sinTotal.cuerpo.error.codigo).toBe('valor_de_inmueble_invalido');
  });

  it('eliminar uno deja el rastro en la auditoría con cómo estaba', async () => {
    const id = await nuevoInmueble();
    const creado = await cuenta.propietario.post(`${RUTA}/${id}/valores`, valor({ documento: 'Recibo 9' }));

    const baja = await cuenta.propietario.delete(`${RUTA}/${id}/valores/${creado.cuerpo.id}`);
    const rastro = await comoPropietario<{ anterior: { documento: string; vigenteDesde: string } }>(
      "select anterior from core.auditoria where recurso = 'empresas.valores_de_inmueble' and accion = 'eliminar' and registro_id = $1",
      [creado.cuerpo.id],
    );

    expect(baja.estado).toBe(204);
    expect((await cuenta.propietario.get(`${RUTA}/${id}/valores`)).cuerpo).toEqual([]);
    expect(rastro.map((fila) => fila.anterior.documento)).toEqual(['Recibo 9']);
  });

  it('si Activos fijos lo rechaza por un mes cerrado, el valor sigue y no queda rastro de baja', async () => {
    const id = await nuevoInmueble();
    const creado = await cuenta.propietario.post(`${RUTA}/${id}/valores`, valor());
    valoresProtegidos.add(creado.cuerpo.id);

    const baja = await cuenta.propietario.delete(`${RUTA}/${id}/valores/${creado.cuerpo.id}`);
    const sigue = await cuenta.propietario.get(`${RUTA}/${id}/valores`);
    const rastro = await comoPropietario('select 1 from core.auditoria where registro_id = $1', [creado.cuerpo.id]);

    expect(baja.estado).toBeGreaterThanOrEqual(400);
    expect(baja.cuerpo.error.codigo).toBe('valor_de_inmueble_usado_en_cierre');
    expect(sigue.cuerpo).toHaveLength(1);
    expect(rastro).toEqual([]);
  });

  it('otra cuenta no ve ni toca los valores, y el valor de un inmueble no se borra por otro', async () => {
    const id = await nuevoInmueble();
    const otro = await nuevoInmueble();
    const creado = await cuenta.propietario.post(`${RUTA}/${id}/valores`, valor());

    const ajena = await otraCuenta.propietario.get(`${RUTA}/${id}/valores`);
    const ajenaBaja = await otraCuenta.propietario.delete(`${RUTA}/${id}/valores/${creado.cuerpo.id}`);
    const cruzada = await cuenta.propietario.delete(`${RUTA}/${otro}/valores/${creado.cuerpo.id}`);

    expect([ajena.estado, ajenaBaja.estado, cruzada.estado]).toEqual([404, 404, 404]);
    expect((await cuenta.propietario.get(`${RUTA}/${id}/valores`)).cuerpo).toHaveLength(1);
  });

  it('ver pide `ver`; registrar y eliminar piden `editar`', async () => {
    const id = await nuevoInmueble();
    const creado = await cuenta.propietario.post(`${RUTA}/${id}/valores`, valor());
    const lector = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Solo',
      apellidos: 'Valores',
      permisos: ['empresas.inmuebles.ver'],
    });

    expect((await lector.get(`${RUTA}/${id}/valores`)).estado).toBe(200);
    expect((await lector.post(`${RUTA}/${id}/valores`, valor({ vigenteDesde: '2027-01-01' }))).estado).toBe(403);
    expect((await lector.delete(`${RUTA}/${id}/valores/${creado.cuerpo.id}`)).estado).toBe(403);
  });

  it('al eliminar el inmueble se van sus valores', async () => {
    const id = await nuevoInmueble();
    await cuenta.propietario.post(`${RUTA}/${id}/valores`, valor());

    const baja = await cuenta.propietario.delete(`${RUTA}/${id}`);
    const quedan = await comoPropietario('select 1 from empresas.valores_de_inmueble where inmueble_id = $1', [id]);

    expect(baja.estado).toBe(204);
    expect(quedan).toEqual([]);
  });
});
