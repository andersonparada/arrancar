import { beforeAll, describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import {
  RUTA_DE_PARCELAS as RUTA,
  crearLocalidadDePrueba,
  cuerpoDeParcela,
  tipoDeParcelaDePrueba,
} from './soporte/escenario-de-parcelas.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let otraCuenta: CuentaDePrueba;
let localidadId: string;
let otraLocalidadId: string;
let tipoId: string;
let contador = 0;

/** Inserta con el dueño de la base (sin pasar por el dominio) para que solo respondan las restricciones de la tabla. */
async function insertar(cambios: Record<string, unknown>): Promise<string> {
  contador += 1;
  const columnas = {
    empresa_id: cuenta.empresaId,
    localidad_id: localidadId,
    tipo_id: tipoId,
    nivel: 1,
    codigo: `T-${contador}`,
    nombre: `Tabla ${contador}`,
    forma_de_tenencia: 'propia',
    ...cambios,
  };
  const nombres = Object.keys(columnas);
  const [fila] = await comoPropietario<{ id: string }>(
    `insert into parcelas.parcelas (${nombres.join(', ')}) values (${nombres.map((_, i) => `$${i + 1}`).join(', ')}) returning id`,
    Object.values(columnas),
  );
  return fila!.id;
}

beforeAll(async () => {
  const modulos = ['terceros', 'parcelas'];
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Tablas de parcelas', usuario: 'propietariotablasparc', modulos });
  otraCuenta = await darDeAltaCuenta(entorno, {
    nombre: 'Ajena de parcelas',
    usuario: 'propietarioajenoparc',
    modulos,
  });
  localidadId = await crearLocalidadDePrueba(cuenta.propietario, 'TAB-1');
  otraLocalidadId = await crearLocalidadDePrueba(cuenta.propietario, 'TAB-2');
  tipoId = await tipoDeParcelaDePrueba(cuenta.propietario);
});

describe('restricciones de parcelas.parcelas', () => {
  it('la madre debe ser de la misma localidad por llave, y el nivel concuerda con tener madre', async () => {
    const madre = await insertar({});

    await expect(insertar({ parcela_madre_id: madre, nivel: 2, localidad_id: otraLocalidadId })).rejects.toThrow(
      'parcelas_madre_fk',
    );
    await expect(insertar({ parcela_madre_id: madre, nivel: 1 })).rejects.toThrow('parcelas_nivel_y_madre');
    await expect(insertar({ nivel: 2 })).rejects.toThrow('parcelas_nivel_y_madre');
    await expect(insertar({ nivel: 6 })).rejects.toThrow('parcelas_nivel_valido');
    expect(await insertar({ parcela_madre_id: madre, nivel: 2 })).toBeTruthy();
  });

  it('el código y el nombre no se repiten sin importar mayúsculas o tildes', async () => {
    await insertar({ codigo: 'UNI-1', nombre: 'Árbol' });

    await expect(insertar({ codigo: 'UNI-1' })).rejects.toThrow('parcelas_codigo_unico');
    await expect(insertar({ nombre: 'arbol' })).rejects.toThrow('parcelas_nombre_unico');
    expect(await insertar({ nombre: 'arbol', localidad_id: otraLocalidadId })).toBeTruthy();
  });

  it('la superficie va completa, positiva y con la útil dentro de la total', async () => {
    await expect(insertar({ superficie_total_m2: '100' })).rejects.toThrow('parcelas_superficie_completa');
    await expect(insertar({ superficie_total_m2: '100', superficie_util_m2: '101' })).rejects.toThrow(
      'parcelas_superficie_valida',
    );
    await expect(insertar({ superficie_total_m2: '0', superficie_util_m2: '0' })).rejects.toThrow(
      'parcelas_superficie_valida',
    );
  });

  it('el punto va completo y dentro del rango del planeta; el código, en mayúsculas', async () => {
    await expect(insertar({ latitud: '14.5' })).rejects.toThrow('parcelas_punto_completo');
    await expect(insertar({ latitud: '91', longitud: '10' })).rejects.toThrow('parcelas_punto_valido');
    await expect(insertar({ codigo: 'minuscula' })).rejects.toThrow('parcelas_codigo_valido');
    await expect(insertar({ forma_de_tenencia: 'robada' })).rejects.toThrow('parcelas_tenencia_valida');
  });

  it('el tipo, la localidad y el inmueble no pueden ser de otra empresa', async () => {
    const [{ id: tipoAjeno }] = await comoPropietario<{ id: string }>(
      'insert into parcelas.tipos_de_parcela (empresa_id, nombre) values ($1, $2) returning id',
      [otraCuenta.empresaId, 'Ajeno'],
    ).then((filas) => filas as [{ id: string }]);

    await expect(insertar({ tipo_id: tipoAjeno })).rejects.toThrow('parcelas_tipo_fk');
  });
});

describe('llaves entre esquemas', () => {
  it('un inmueble ligado a una parcela no se elimina (409 inmueble_en_uso) pero se inactiva', async () => {
    const inmueble = await cuenta.propietario.post('/api/empresas/inmuebles', {
      nombre: 'Finca con parcela',
      situacionRegistral: 'posesorio',
      documentoPosesorio: 'Derechos',
      titularidad: 'propia',
    });
    const parcela = await cuenta.propietario.post(RUTA, {
      ...cuerpoDeParcela({ localidadId, tipoId }, { codigo: 'LL-1', nombre: 'Con inmueble' }),
      inmuebles: [{ inmuebleId: inmueble.cuerpo.id, superficieM2: null }],
    });

    const eliminar = await cuenta.propietario.delete(`/api/empresas/inmuebles/${inmueble.cuerpo.id}`);
    const inactivar = await cuenta.propietario.post(`/api/empresas/inmuebles/${inmueble.cuerpo.id}/inactivar`);

    expect(parcela.estado).toBe(201);
    expect(eliminar.estado).toBe(409);
    expect(eliminar.cuerpo.error.codigo).toBe('inmueble_en_uso');
    expect(inactivar.cuerpo.activo).toBe(false);
  });

  it('una localidad con parcelas no se elimina, y un tipo en uso no se elimina pero se inactiva', async () => {
    await cuenta.propietario.post(
      RUTA,
      cuerpoDeParcela({ localidadId, tipoId }, { codigo: 'LL-2', nombre: 'Con tipo' }),
    );

    const localidad = await cuenta.propietario.delete(`/api/empresas/localidades/${localidadId}`);
    const tipo = await cuenta.propietario.delete(`/api/parcelas/tipos-de-parcela/${tipoId}`);
    const inactivo = await cuenta.propietario.put(`/api/parcelas/tipos-de-parcela/${tipoId}`, {
      nombre: 'Potrero',
      activo: false,
    });
    await cuenta.propietario.put(`/api/parcelas/tipos-de-parcela/${tipoId}`, { nombre: 'Potrero', activo: true });

    expect([localidad.estado, tipo.estado]).toEqual([409, 409]);
    expect(inactivo.cuerpo.activo).toBe(false);
  });

  it('la auditoría permanente incluye los contratos de tenencia', async () => {
    const filas = await comoPropietario(
      "select recurso from core.recursos_de_auditoria_permanente where recurso = 'parcelas.contratos'",
      [],
    );

    expect(filas).toHaveLength(1);
  });
});
