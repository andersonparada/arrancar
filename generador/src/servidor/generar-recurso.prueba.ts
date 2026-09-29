import { describe, expect, it } from 'vitest';
import { CrearDefinicion, pluralDe } from '../comandos/crear-definicion.js';
import { DefinicionDeOtroModulo, GenerarRecurso, ModuloInexistente } from '../comandos/generar-recurso.js';
import { correo, decimal, lista, referencia, telefono, texto } from '../definicion/campos.js';
import { definirRecurso, type EntradaDeRecurso } from '../definicion/definir-recurso.js';
import { ErrorDelGenerador } from '../definicion/errores.js';
import { EscritorDeArchivos } from '../motor/escritor-de-archivos.js';
import { SistemaDeArchivosEnMemoria } from '../motor/sistema-de-archivos.js';
import { generarEnMemoria, MODULO_GENERADO, SERVIDOR } from '../pruebas/modulo-de-prueba.js';

const animal: EntradaDeRecurso = {
  modulo: 'ganado',
  entidad: 'Animal',
  plural: 'Animales',
  alcance: 'empresa',
  pantalla: 'catalogo',
  seccion: 'administracion',
  campos: {
    arete: texto({ requerido: true, unico: true }),
    sexo: lista(['macho', 'hembra']),
    peso: decimal(),
    correo: correo(),
    telefonoDelDueno: telefono({ requerido: true }),
  },
};

async function generar(entrada: EntradaDeRecurso, ruta?: string) {
  const disco = await generarEnMemoria(entrada, ruta);
  return { disco, leer: (archivo: string) => disco.leer(`${SERVIDOR}/${archivo}`) };
}

describe('generar un recurso en el servidor', () => {
  it('escribe todas las capas, sus pruebas y la prueba de API', async () => {
    const { disco } = await generar(animal);

    expect([...disco.archivos.keys()]).toEqual(
      expect.arrayContaining([
        `${SERVIDOR}/dominio/animal.ts`,
        `${SERVIDOR}/aplicacion/casos-uso/animales/eliminar-animal.ts`,
        `${SERVIDOR}/infraestructura/persistencia/animales.tablas.ts`,
        `${SERVIDOR}/http/animales.rutas.ts`,
        `${SERVIDOR}/composicion/animales.ts`,
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
    expect(leer('modulo.ts')).toContain("{ clave: 'ganado.animales.crear', descripcion: 'Registrar animales' },");
    expect(leer('modulo.ts')).toContain("{ clave: 'ganado.animales.editar', descripcion: 'Editar animales' },");
    expect(leer('modulo.ts')).toContain("{ clave: 'ganado.animales.eliminar', descripcion: 'Eliminar animales' },");
    expect(leer('http/animales.rutas.ts')).toContain("proteger({ permiso: 'ganado.animales.eliminar' })");
    expect(leer('modulo.ts')).toContain('rutasDeAnimales(),');
  });

  it('el Excel lleva las columnas del formulario y cada acción su permiso', async () => {
    const { leer } = await generar(animal);

    const columnas = leer('http/animales.columnas.ts');
    expect(columnas).toContain("{ clave: 'arete', titulo: 'Arete', requerido: true, tipo: 'texto' },");
    expect(columnas).toContain("tipo: 'lista', opciones: { macho: 'Macho', hembra: 'Hembra' } },");
    expect(columnas).toContain("{ clave: 'peso', titulo: 'Peso', requerido: false, tipo: 'decimal' },");
    expect(leer('modulo.ts')).toContain(
      "{ clave: 'ganado.animales.importar', descripcion: 'Importar animales desde Excel' },",
    );
    expect(leer('modulo.ts')).toContain(
      "{ clave: 'ganado.animales.exportar', descripcion: 'Exportar animales a Excel' },",
    );
    expect(leer('http/animales.rutas.ts')).toContain('rutasDeIntercambio(');
  });

  it('operación no genera nada de Excel: ni columnas, ni permisos, ni rutas ni pruebas', async () => {
    const { disco, leer } = await generar({ ...animal, seccion: 'operacion' });

    expect(disco.existe(`${SERVIDOR}/http/animales.columnas.ts`)).toBe(false);
    const modulo = leer('modulo.ts');
    expect(modulo).not.toContain('animales.importar');
    expect(modulo).not.toContain('animales.exportar');
    const rutas = leer('http/animales.rutas.ts');
    expect(rutas).not.toContain('rutasDeIntercambio');
    expect(rutas).not.toContain('OpcionesDeIntercambio');
    const composicion = leer('composicion/animales.ts');
    expect(composicion).not.toContain('intercambioDeAnimales');
    expect(composicion).not.toContain('crearIntercambio');
    const prueba = disco.leer('/p/servidor/src/pruebas-api/ganado-animales.api.prueba.ts');
    expect(prueba).not.toContain('/exportar');
    expect(prueba).not.toContain('/plantilla');
    expect(prueba).not.toContain('/importar');
  });

  it('reportes solo exporta: sin permiso de importar, sin plantilla ni prueba de revisar', async () => {
    const { disco, leer } = await generar({ ...animal, seccion: 'reportes' });

    expect(disco.existe(`${SERVIDOR}/http/animales.columnas.ts`)).toBe(true);
    const modulo = leer('modulo.ts');
    expect(modulo).not.toContain('animales.importar');
    expect(modulo).toContain("{ clave: 'ganado.animales.exportar', descripcion: 'Exportar animales a Excel' },");
    const rutas = leer('http/animales.rutas.ts');
    expect(rutas).toContain('rutasDeIntercambio(');
    expect(rutas).toContain("permisos: { exportar: 'ganado.animales.exportar' }");
    expect(rutas).not.toContain('importar:');
    const prueba = disco.leer('/p/servidor/src/pruebas-api/ganado-animales.api.prueba.ts');
    expect(prueba).toContain('get(`${RUTA}/exportar`)');
    expect(prueba).not.toContain('/plantilla');
    expect(prueba).not.toContain('/importar');
  });

  it('con baja por inactivación lleva "activo" y no el caso de eliminar', async () => {
    const { disco, leer } = await generar({ ...animal, baja: 'inactivar', alcance: 'cuenta' });

    expect(leer('dominio/animal.ts')).toContain('activo: boolean;');
    expect(leer('infraestructura/persistencia/animales.tablas.ts')).toContain('politicaPorCuenta()');
    expect(disco.existe(`${SERVIDOR}/aplicacion/casos-uso/animales/eliminar-animal.ts`)).toBe(false);
    expect(leer('http/animales.rutas.ts')).not.toContain('app.delete');
  });

  it('si algo no se puede generar, no escribe nada', async () => {
    const conReferencia = { ...animal, campos: { ...animal.campos, potrero: referencia('Potrero') } };
    const disco = new SistemaDeArchivosEnMemoria(MODULO_GENERADO);
    const escritor = new EscritorDeArchivos(disco, '/p');

    const generando = new GenerarRecurso(escritor, async () => definirRecurso(conReferencia)).ejecutar('ganado/animal');

    await expect(generando).rejects.toThrow(ErrorDelGenerador);
    expect(Object.fromEntries(disco.archivos)).toEqual(MODULO_GENERADO);
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
    const escritor = new EscritorDeArchivos(disco, '/p');

    new CrearDefinicion(escritor).ejecutar('terceros/categoria-de-proveedor');
    escritor.confirmar();

    const definicion = disco.leer('/p/generador/definiciones/terceros/categoria-de-proveedor.ts');
    expect(definicion).toContain("entidad: 'CategoriaDeProveedor',");
    expect(definicion).toContain("plural: 'CategoriasDeProveedor',");
  });
});
