import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../configuracion.js';
import type { Operador } from '../modulos/core/compartido/aplicacion/operador.js';
import { ReglaDeNegocioInfringida } from '../modulos/core/compartido/dominio/errores.js';
import { dependenciasCompartidas } from '../modulos/core/compartido/infraestructura/dependencias-compartidas.js';
import '../modulos/core/contratos/parcelas.contratos.js';
import { mediador } from '../modulos/core/mediador/contexto.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import {
  RUTA_DE_PARCELAS as RUTA,
  crearLocalidadDePrueba,
  cuerpoDeMedicion,
  cuerpoDeParcela,
  tipoDeParcelaDePrueba,
} from './soporte/escenario-de-parcelas.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let base: { localidadId: string; tipoId: string };
let propietario: pg.Client;
let contador = 0;
const parcelasProtegidas = new Set<string>();

class CicloAbierto extends ReglaDeNegocioInfringida {
  readonly codigo = 'ciclo_abierto';
}

const crear = async () => {
  contador += 1;
  const creada = await cuenta.propietario.post(
    RUTA,
    cuerpoDeParcela(base, { codigo: `M-${contador}`, nombre: `Medida ${contador}` }),
  );
  return creada.cuerpo.id as string;
};

async function operadorDelPropietario(): Promise<Operador> {
  const { rows } = await propietario.query<{ id: string }>('select id from core.usuarios where usuario = $1', [
    cuenta.usuario,
  ]);
  return {
    usuarioId: rows[0]!.id,
    cuentaId: cuenta.cuentaId,
    empresaId: cuenta.empresaId,
    esSuperacceso: false,
    recursosAlcanceTotal: ['empresas.localidades'],
  };
}

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, {
    nombre: 'Con mediciones',
    usuario: 'propietariomediciones',
    modulos: ['terceros', 'parcelas'],
  });
  base = {
    localidadId: await crearLocalidadDePrueba(cuenta.propietario, 'MED-1'),
    tipoId: await tipoDeParcelaDePrueba(cuenta.propietario),
  };
  propietario = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await propietario.connect();
  const rechaza = async ({ parcelaId }: { parcelaId: string }) => {
    if (parcelasProtegidas.has(parcelaId)) throw new CicloAbierto('La parcela tiene un ciclo abierto.');
  };
  mediador.escuchar('parcelas', 'parcelas.parcela_por_inactivar', rechaza);
  mediador.escuchar('parcelas', 'parcelas.parcela_por_eliminar', rechaza);
});

afterAll(async () => {
  parcelasProtegidas.clear();
  await propietario.end();
});

describe('mediciones por API', () => {
  it('la más reciente fija la superficie; en cuerdas guarda las varas por lado', async () => {
    const id = await crear();

    const manzanas = await cuenta.propietario.post(`${RUTA}/${id}/mediciones`, cuerpoDeMedicion());
    const cuerdas = await cuenta.propietario.post(
      `${RUTA}/${id}/mediciones`,
      cuerpoDeMedicion({
        vigenteDesde: '2026-06-01',
        cantidadOriginal: '16',
        unidadOriginal: 'cuerda',
        varasPorLadoDeCuerda: 25,
      }),
    );

    expect([manzanas.estado, cuerdas.estado]).toEqual([201, 201]);
    expect(manzanas.cuerpo.superficieTotalM2).toBe('13974.74');
    expect(cuerdas.cuerpo.superficieTotalM2).toBe('6987.37');
    expect(cuerdas.cuerpo.mediciones).toHaveLength(2);
  });

  it('rechaza la cuerda sin varas, la útil mayor que la total y una fecha repetida', async () => {
    const id = await crear();
    await cuenta.propietario.post(`${RUTA}/${id}/mediciones`, cuerpoDeMedicion());

    const sinVaras = await cuenta.propietario.post(
      `${RUTA}/${id}/mediciones`,
      cuerpoDeMedicion({ unidadOriginal: 'cuerda', vigenteDesde: '2026-02-01' }),
    );
    const utilGrande = await cuenta.propietario.post(
      `${RUTA}/${id}/mediciones`,
      cuerpoDeMedicion({ cantidadUtil: '3', vigenteDesde: '2026-03-01' }),
    );
    const repetida = await cuenta.propietario.post(`${RUTA}/${id}/mediciones`, cuerpoDeMedicion());

    expect(sinVaras.cuerpo.error.codigo).toBe('unidad_sin_varas_de_cuerda');
    expect(utilGrande.cuerpo.error.codigo).toBe('superficie_util_mayor_que_total');
    expect(repetida.estado).toBe(409);
    expect(repetida.cuerpo.error.detalles).toEqual({ campo: 'vigenteDesde' });
  });

  it('anular la vigente devuelve la superficie a la anterior y deja rastro', async () => {
    const id = await crear();
    await cuenta.propietario.post(`${RUTA}/${id}/mediciones`, cuerpoDeMedicion());
    const segunda = await cuenta.propietario.post(
      `${RUTA}/${id}/mediciones`,
      cuerpoDeMedicion({ vigenteDesde: '2026-06-01', cantidadOriginal: '3' }),
    );
    const reciente = segunda.cuerpo.mediciones.find((m: { vigenteDesde: string }) => m.vigenteDesde === '2026-06-01');

    const anulada = await cuenta.propietario.post(`/api/parcelas/mediciones/${reciente.id}/anular`, {
      motivo: 'Medida equivocada',
    });
    const repetida = await cuenta.propietario.post(`/api/parcelas/mediciones/${reciente.id}/anular`, {
      motivo: 'Otra vez',
    });
    const rastro = await propietario.query(
      "select anterior from core.auditoria where recurso = 'parcelas.mediciones' and registro_id = $1 and accion = 'anular'",
      [reciente.id],
    );

    expect(anulada.cuerpo.superficieTotalM2).toBe('13974.74');
    expect(anulada.cuerpo.mediciones.find((m: { id: string }) => m.id === reciente.id)).toMatchObject({
      estado: 'anulada',
      motivoDeAnulacion: 'Medida equivocada',
    });
    expect(repetida.cuerpo.error.codigo).toBe('medicion_ya_anulada');
    expect(rastro.rows).toHaveLength(1);
  });
});

describe('la parcela y el mediador', () => {
  it('un módulo de rubro puede rechazar inactivar o eliminar una parcela con ciclo abierto', async () => {
    const id = await crear();
    parcelasProtegidas.add(id);

    const inactivar = await cuenta.propietario.post(`${RUTA}/${id}/inactivar`, {});
    const eliminar = await cuenta.propietario.delete(`${RUTA}/${id}`);
    parcelasProtegidas.delete(id);
    const inactivada = await cuenta.propietario.post(`${RUTA}/${id}/inactivar`, {});

    expect([inactivar.cuerpo.error.codigo, eliminar.cuerpo.error.codigo]).toEqual(['ciclo_abierto', 'ciclo_abierto']);
    expect(inactivada.cuerpo.activo).toBe(false);
  });

  it('la orden obtener_parcela_en_fecha da la superficie que regía ese día', async () => {
    const id = await crear();
    await cuenta.propietario.post(`${RUTA}/${id}/mediciones`, cuerpoDeMedicion());
    await cuenta.propietario.post(
      `${RUTA}/${id}/mediciones`,
      cuerpoDeMedicion({ vigenteDesde: '2026-06-01', cantidadOriginal: '3' }),
    );
    const operador = await operadorDelPropietario();
    const preguntar = (fecha: string) =>
      dependenciasCompartidas().unidadDeTrabajo.ejecutar(operador, () =>
        mediador.enviar(operador, 'parcelas.obtener_parcela_en_fecha', { parcelaId: id, fecha }),
      );

    const antes = await preguntar('2026-03-01');
    const despues = await preguntar('2026-07-01');

    expect(antes).toMatchObject({
      activa: true,
      nivel: 1,
      superficieTotalM2: '13974.74',
      cedidaATerceros: false,
      uso: null,
    });
    expect(despues.superficieTotalM2).toBe('20962.12');
  });
});
