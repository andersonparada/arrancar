import { describe, expect, it } from 'vitest';
import { CrearDefinicion, pluralDe } from '../comandos/crear-definicion.js';
import { DefinicionDeOtroModulo, GenerarRecurso, ModuloInexistente } from '../comandos/generar-recurso.js';
import { correo, decimal, lista, referencia, telefono, texto } from '../definicion/campos.js';
import { definirRecurso, type EntradaDeRecurso } from '../definicion/definir-recurso.js';
import { ErrorDelGenerador } from '../definicion/errores.js';
import { EscritorDeArchivos } from '../motor/escritor-de-archivos.js';
import { SistemaDeArchivosEnMemoria } from '../motor/sistema-de-archivos.js';

const MODULO = '/p/servidor/src/modulos/ganado';
const MODULO_TS = `import { rutasDelModulo } from '../core/modulos-sistema/rutas-del-modulo.js';
// generador: importaciones
export const moduloGanado = {
  nombre: 'Ganado bovino',
  permisos: [
    // generador: permisos
  ],
  rutas: rutasDelModulo([
    // generador: rutas
  ]),
};
`;

const animal: EntradaDeRecurso = {
  modulo: 'ganado',
  entidad: 'Animal',
  plural: 'Animales',
  alcance: 'empresa',
  pantalla: 'catalogo',
  campos: {
    arete: texto({ requerido: true, unico: true }),
    sexo: lista(['macho', 'hembra']),
    peso: decimal(),
    correo: correo(),
    telefonoDelDueno: telefono({ requerido: true }),
  },
};

async function generar(entrada: EntradaDeRecurso, ruta = 'ganado/animal') {
  const disco = new SistemaDeArchivosEnMemoria({ [`${MODULO}/modulo.ts`]: MODULO_TS });
  const escritor = new EscritorDeArchivos(disco, '/p');
  await new GenerarRecurso(escritor, async () => definirRecurso(entrada)).ejecutar(ruta);
  return { disco, leer: (archivo: string) => disco.leer(`${MODULO}/${archivo}`) };
}

describe('generar un recurso en el servidor', () => {
  it('escribe todas las capas, sus pruebas y la prueba de API', async () => {
    const { disco } = await generar(animal);

    expect([...disco.archivos.keys()]).toEqual(
      expect.arrayContaining([
        `${MODULO}/dominio/animal.ts`,
        `${MODULO}/aplicacion/casos-uso/animales/eliminar-animal.ts`,
        `${MODULO}/infraestructura/persistencia/animales.tablas.ts`,
        `${MODULO}/http/animales.rutas.ts`,
        `${MODULO}/composicion/animales.ts`,
        '/p/servidor/src/pruebas-api/ganado-animales.api.prueba.ts',
      ]),
    );
  });

  it('cada tipo de campo toma su forma en el dominio, la tabla y el esquema', async () => {
    const { leer } = await generar(animal);

    expect(leer('dominio/animal.ts')).toContain("sexo: 'macho' | 'hembra' | null;");
    expect(leer('dominio/animal.ts')).toContain('telefonoDelDueno: Telefono;');
    expect(leer('infraestructura/persistencia/animales.tablas.ts')).toContain(
      "unique('animales_arete_unico').on(t.empresaId, t.arete)",
    );
    expect(leer('http/animales.esquemas-http.ts')).toContain('peso: decimalOpcional(2),');
    expect(leer('aplicacion/datos-de-animal.ts')).toContain(
      'telefonoDelDueno: Telefono.crear(solicitud.telefonoDelDueno)',
    );
  });

  it('registra permisos y rutas en el módulo', async () => {
    const { leer } = await generar(animal);

    expect(leer('modulo.ts')).toContain("import { rutasDeAnimales } from './composicion/animales.js';");
    expect(leer('modulo.ts')).toContain(
      "{ clave: 'ganado.animales.gestionar', descripcion: 'Registrar, editar y eliminar animales' },",
    );
    expect(leer('modulo.ts')).toContain('rutasDeAnimales(),');
  });

  it('con baja por inactivación lleva "activo" y no el caso de eliminar', async () => {
    const { disco, leer } = await generar({ ...animal, baja: 'inactivar', alcance: 'cuenta' });

    expect(leer('dominio/animal.ts')).toContain('activo: boolean;');
    expect(leer('infraestructura/persistencia/animales.tablas.ts')).toContain('politicaPorCuenta()');
    expect(disco.existe(`${MODULO}/aplicacion/casos-uso/animales/eliminar-animal.ts`)).toBe(false);
    expect(leer('http/animales.rutas.ts')).not.toContain('app.delete');
  });

  it('si algo no se puede generar, no escribe nada', async () => {
    const conReferencia = { ...animal, campos: { ...animal.campos, potrero: referencia('Potrero') } };
    const disco = new SistemaDeArchivosEnMemoria({ [`${MODULO}/modulo.ts`]: MODULO_TS });
    const escritor = new EscritorDeArchivos(disco, '/p');

    const generando = new GenerarRecurso(escritor, async () => definirRecurso(conReferencia)).ejecutar('ganado/animal');

    await expect(generando).rejects.toThrow(ErrorDelGenerador);
    expect([...disco.archivos.keys()]).toEqual([`${MODULO}/modulo.ts`]);
    expect(disco.leer(`${MODULO}/modulo.ts`)).toBe(MODULO_TS);
  });

  it('exige que el módulo exista y que la definición sea suya', async () => {
    await expect(generar(animal, 'siembras/animal')).rejects.toThrow(ModuloInexistente);
    await expect(generar({ ...animal, modulo: 'otro' })).rejects.toThrow(DefinicionDeOtroModulo);
  });
});

describe('crear una definición', () => {
  it('forma el plural en español', () => {
    expect(['vaca', 'potrero', 'corral', 'lombriz'].map(pluralDe)).toEqual([
      'vacas',
      'potreros',
      'corrales',
      'lombrices',
    ]);
  });

  it('deja un ejemplo para completar, con el plural de la primera palabra', () => {
    const disco = new SistemaDeArchivosEnMemoria();

    new CrearDefinicion(new EscritorDeArchivos(disco, '/p')).ejecutar('terceros/categoria-de-proveedor');

    const definicion = disco.leer('/p/generador/definiciones/terceros/categoria-de-proveedor.ts');
    expect(definicion).toContain("entidad: 'CategoriaDeProveedor',");
    expect(definicion).toContain("plural: 'CategoriasDeProveedor',");
  });
});
