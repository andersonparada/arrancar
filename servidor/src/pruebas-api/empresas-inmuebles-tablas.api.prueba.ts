import { beforeAll, describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;

/** Los datos de un inmueble inscrito válido; la prueba cambia lo que quiere romper. */
const columnasBase = (): Record<string, unknown> => ({
  nombre: 'Finca de la tabla',
  situacion_registral: 'inscrito',
  registro: 'general',
  numero_de_finca: '10',
  folio: '20',
  libro: '30A',
  departamento_registral: '01',
  titularidad: 'propia',
});

/** Inserta con el dueño de la base (sin pasar por el dominio) para que solo respondan las restricciones de la tabla. */
async function insertar(cambios: Record<string, unknown>): Promise<void> {
  const columnas = { ...columnasBase(), ...cambios, empresa_id: cuenta.empresaId };
  const nombres = Object.keys(columnas);
  await comoPropietario(
    `insert into empresas.inmuebles (${nombres.join(', ')}) values (${nombres.map((_, i) => `$${i + 1}`).join(', ')})`,
    Object.values(columnas),
  );
}

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Tablas', usuario: 'propietariotablas' });
});

describe('restricciones de empresas.inmuebles', () => {
  it('un inscrito necesita los cinco datos de su libro y un posesorio no puede traerlos todos', async () => {
    await expect(insertar({ nombre: 'Sin folio', folio: null })).rejects.toThrow('inmuebles_registro_completo');
    await expect(insertar({ nombre: 'Posesorio con libro', situacion_registral: 'posesorio' })).rejects.toThrow(
      'inmuebles_registro_completo',
    );
  });

  it('el libro y la finca solo admiten letras, números, espacio, punto, diagonal y guion', async () => {
    await expect(insertar({ nombre: 'Libro raro', libro: '30#' })).rejects.toThrow('inmuebles_libro_valido');
    await expect(insertar({ nombre: 'Finca larga', numero_de_finca: '1'.repeat(21) })).rejects.toThrow(
      'inmuebles_finca_valida',
    );
  });

  it('la copropiedad lleva su porcentaje, entre 0 y 100 sin tocarlos', async () => {
    await expect(insertar({ nombre: 'Sin porcentaje', titularidad: 'copropiedad' })).rejects.toThrow(
      'inmuebles_copropiedad_con_porcentaje',
    );
    await expect(
      insertar({ nombre: 'Cien', titularidad: 'copropiedad', porcentaje_de_copropiedad: '100' }),
    ).rejects.toThrow('inmuebles_porcentaje_valido');
    await expect(insertar({ nombre: 'Propia con porcentaje', porcentaje_de_copropiedad: '50' })).rejects.toThrow(
      'inmuebles_copropiedad_con_porcentaje',
    );
  });

  it('la finca inscrita no se repite en la empresa aunque cambien las mayúsculas, ni el nombre', async () => {
    await insertar({ nombre: 'Primera', numero_de_finca: '99', libro: '5b' });
    await expect(insertar({ nombre: 'Segunda', numero_de_finca: '99', libro: '5B' })).rejects.toThrow(
      'inmuebles_registro_unico',
    );
    await expect(insertar({ nombre: 'primera', numero_de_finca: '98' })).rejects.toThrow('inmuebles_nombre_unico');
  });

  it('el departamento y el municipio van juntos y existen en Guatemala', async () => {
    await expect(insertar({ nombre: 'Medio', numero_de_finca: '70', departamento_codigo: '01' })).rejects.toThrow(
      'inmuebles_ubicacion_completa',
    );
    await expect(
      insertar({ nombre: 'Inventado', numero_de_finca: '71', departamento_codigo: '01', municipio_codigo: '99' }),
    ).rejects.toThrow('inmuebles_municipio_fk');
  });

  it('la cuerda lleva sus varas y las demás unidades no', async () => {
    const escritura = { cantidad_original: '8', unidad_original: 'cuerda' };

    await expect(insertar({ nombre: 'Cuerda sin varas', numero_de_finca: '80', ...escritura })).rejects.toThrow(
      'inmuebles_varas_validas',
    );
    await expect(
      insertar({ nombre: 'Cuerda con varas', numero_de_finca: '81', ...escritura, varas_por_lado_de_cuerda: 25 }),
    ).resolves.toBeUndefined();
  });
});
