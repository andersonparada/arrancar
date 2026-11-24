import { beforeAll, describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let otraCuenta: CuentaDePrueba;
let inmuebleId: string;
let inmuebleAjeno: string;

async function sembrarInmueble(empresaId: string, nombre: string): Promise<string> {
  const [fila] = await comoPropietario<{ id: string }>(
    `insert into empresas.inmuebles (empresa_id, nombre, situacion_registral, titularidad, documento_posesorio)
     values ($1, $2, 'posesorio', 'propia', 'Escritura') returning id`,
    [empresaId, nombre],
  );
  return fila!.id;
}

/** Inserta con el dueño de la base (sin pasar por el dominio) para que solo respondan las restricciones de la tabla. */
async function insertar(cambios: Record<string, unknown>, empresaId = cuenta.empresaId, inmueble = inmuebleId) {
  const base = {
    empresa_id: empresaId,
    inmueble_id: inmueble,
    fuente: 'matricula_fiscal',
    vigente_desde: '2026-01-01',
    origen: 'autoavaluo',
    valor_total: '1000.00',
    ...cambios,
  };
  const nombres = Object.keys(base);
  await comoPropietario(
    `insert into empresas.valores_de_inmueble (${nombres.join(', ')}) values (${nombres.map((_, i) => `$${i + 1}`).join(', ')})`,
    Object.values(base),
  );
}

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Tablas valores', usuario: 'propietariotablasvalores' });
  otraCuenta = await darDeAltaCuenta(entorno, { nombre: 'Ajena valores', usuario: 'propietarioajenatablas' });
  inmuebleId = await sembrarInmueble(cuenta.empresaId, 'Finca de la tabla');
  inmuebleAjeno = await sembrarInmueble(otraCuenta.empresaId, 'Finca ajena');
});

describe('restricciones de empresas.valores_de_inmueble', () => {
  it('la fuente y el origen son de su lista', async () => {
    await expect(insertar({ fuente: 'otra' })).rejects.toThrow('valores_de_inmueble_fuente_valida');
    await expect(insertar({ origen: 'inventado' })).rejects.toThrow('valores_de_inmueble_origen_valido');
  });

  it('el total es positivo, las partes no son negativas y suman a lo más el total', async () => {
    await expect(insertar({ valor_total: '0' })).rejects.toThrow('valores_de_inmueble_total_positivo');
    await expect(insertar({ valor_terreno: '-1' })).rejects.toThrow('valores_de_inmueble_partes_no_negativas');
    await expect(insertar({ valor_terreno: '600', valor_construcciones: '500' })).rejects.toThrow(
      'valores_de_inmueble_total_coherente',
    );
    await expect(
      insertar({ valor_terreno: '300', valor_construcciones: '300', valor_cultivos_permanentes: '300' }),
    ).rejects.toThrow('valores_de_inmueble_total_coherente');
    await insertar({ vigente_desde: '2020-01-01', valor_terreno: '300', valor_construcciones: '700' });
  });

  it('la categoría del IUSI es de su lista y solo va con la matrícula fiscal', async () => {
    await expect(insertar({ categoria_iusi: 'agricola' })).rejects.toThrow('valores_de_inmueble_categoria_valida');
    await expect(insertar({ fuente: 'catastro_municipal', categoria_iusi: 'vivienda' })).rejects.toThrow(
      'valores_de_inmueble_categoria_valida',
    );
    await insertar({ vigente_desde: '2020-02-01', categoria_iusi: 'mixto' });
  });

  it('una fuente no repite fecha en el inmueble, pero la otra fuente sí', async () => {
    await insertar({ vigente_desde: '2021-01-01' });

    await expect(insertar({ vigente_desde: '2021-01-01' })).rejects.toThrow('valores_de_inmueble_fecha_unico');
    await insertar({ vigente_desde: '2021-01-01', fuente: 'catastro_municipal' });
  });

  it('no apunta a un inmueble de otra empresa', async () => {
    await expect(insertar({}, cuenta.empresaId, inmuebleAjeno)).rejects.toThrow('valores_de_inmueble_inmueble_fk');
  });

  it('la seguridad por empresa oculta los valores de otra cuenta', async () => {
    await insertar({ vigente_desde: '2022-01-01' }, otraCuenta.empresaId, inmuebleAjeno);

    const lista = await cuenta.propietario.get(`/api/empresas/inmuebles/${inmuebleAjeno}/valores`);

    expect(lista.estado).toBe(404);
  });
});
