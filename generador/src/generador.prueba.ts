import { describe, expect, it } from 'vitest';
import { ClaveDeModuloInvalida, GenerarModulo, ModuloExistente } from './comandos/generar-modulo.js';
import { lista, texto } from './definicion/campos.js';
import { definirRecurso, type EntradaDeRecurso } from './definicion/definir-recurso.js';
import { DefinicionInvalida } from './definicion/errores.js';
import { leerOrden } from './linea-de-comandos.js';
import { EscritorDeArchivos, MarcaNoEncontrada } from './motor/escritor-de-archivos.js';
import { HuecoSinValor, leerPlantilla, rellenar } from './motor/plantillas.js';
import { SistemaDeArchivosEnMemoria } from './motor/sistema-de-archivos.js';
import { nombresDeClave, nombresDeCodigo } from './nombres.js';

describe('nombres', () => {
  it('da todas las formas de una clave con guiones', () => {
    expect(nombresDeClave('moneda-extranjera')).toEqual({
      clave: 'moneda-extranjera',
      pascal: 'MonedaExtranjera',
      camel: 'monedaExtranjera',
      constante: 'MONEDA_EXTRANJERA',
      serpiente: 'moneda_extranjera',
      legible: 'Moneda extranjera',
    });
  });

  it('parte los nombres de código por sus mayúsculas', () => {
    expect(nombresDeCodigo('CategoriasDeProveedor')).toMatchObject({
      clave: 'categorias-de-proveedor',
      camel: 'categoriasDeProveedor',
    });
    expect(nombresDeCodigo('fechaDeNacimiento').legible).toBe('Fecha de nacimiento');
  });
});

describe('definición de un recurso', () => {
  const animal: EntradaDeRecurso = {
    modulo: 'ganado',
    entidad: 'Animal',
    plural: 'Animales',
    alcance: 'empresa',
    pantalla: 'completa',
    seccion: 'administracion',
    campos: { arete: texto({ requerido: true, unico: true }), sexo: lista(['macho', 'hembra']) },
  };

  it('completa nombres, textos, permisos y el campo que nombra al registro', () => {
    const definicion = definirRecurso(animal);

    expect(definicion.permisos).toEqual({
      ver: 'ganado.animales.ver',
      crear: 'ganado.animales.crear',
      editar: 'ganado.animales.editar',
      eliminar: 'ganado.animales.eliminar',
      importar: 'ganado.animales.importar',
      exportar: 'ganado.animales.exportar',
    });
    expect(definirRecurso({ ...animal, baja: 'inactivar' }).permisos).not.toHaveProperty('eliminar');
    expect(definicion.textos).toEqual({ singular: 'animal', plural: 'animales' });
    expect(definicion.mostrar).toBe('arete');
    expect(definicion.baja).toBe('eliminar');
    expect(definicion.campos[1]!.campo).toMatchObject({ opciones: { macho: 'Macho', hembra: 'Hembra' } });
  });

  it('avisa de todos los problemas juntos', () => {
    const mala = { ...animal, entidad: 'animal', campos: { 'Mal nombre': lista([]) } };

    expect(() => definirRecurso(mala)).toThrow(DefinicionInvalida);
    try {
      definirRecurso(mala);
    } catch (error) {
      expect((error as DefinicionInvalida).problemas).toHaveLength(4);
    }
  });
});

describe('escritor de archivos', () => {
  const escritorCon = (archivos: Record<string, string> = {}) => {
    const disco = new SistemaDeArchivosEnMemoria(archivos);
    return { disco, escritor: new EscritorDeArchivos(disco, '/p') };
  };

  it('no pisa un archivo que ya existe', () => {
    const { disco, escritor } = escritorCon({ '/p/a.ts': 'mío' });

    escritor.crear('a.ts', 'generado');

    expect(disco.leer('/p/a.ts')).toBe('mío');
    expect(escritor.resumen).toEqual([{ ruta: 'a.ts', accion: 'omitido' }]);
  });

  it('inserta antes de la marca con su sangría, y no repite si ya está', () => {
    const { disco, escritor } = escritorCon({ '/p/i.ts': '[\n  a,\n  // generador: modulos\n];\n' });

    escritor.insertarEnMarca('i.ts', 'modulos', ['b,']);
    escritor.insertarEnMarca('i.ts', 'modulos', ['b,']);
    escritor.confirmar();

    expect(disco.leer('/p/i.ts')).toBe('[\n  a,\n  b,\n  // generador: modulos\n];\n');
    expect(escritor.resumen.map(({ accion }) => accion)).toEqual(['insertado', 'ya-estaba']);
  });

  it('reconoce lo que ya insertó aunque Prettier lo haya reacomodado', () => {
    const reacomodado = "[\n  {\n    titulo: 'Animales',\n    ruta: '/animales',\n  },\n  // generador: menu\n];\n";
    const { escritor } = escritorCon({ '/p/m.ts': reacomodado });

    escritor.insertarEnMarca('m.ts', 'menu', ["{ titulo: 'Animales', ruta: '/animales' },"]);

    expect(escritor.resumen.map(({ accion }) => accion)).toEqual(['ya-estaba']);
  });

  it('sin la marca, explica dónde falta', () => {
    const { escritor } = escritorCon({ '/p/i.ts': '[]' });

    expect(() => escritor.insertarEnMarca('i.ts', 'modulos', ['b,'])).toThrow(MarcaNoEncontrada);
  });
});

describe('plantillas', () => {
  it('rellena los huecos y no deja ninguno sin valor', () => {
    expect(rellenar('modulo{{Pascal}}', { Pascal: 'Ganado' })).toBe('moduloGanado');
    expect(() => rellenar('{{a}} {{b}}', { a: '1' })).toThrow(HuecoSinValor);
  });
});

describe('generar un módulo', () => {
  const INDICES = {
    '/p/servidor/src/modulos/indice.ts': '// generador: importaciones\n[\n  // generador: modulos\n]\n',
    '/p/cliente/src/modulos/indice.ts': '// generador: importaciones\n[\n  // generador: modulos\n  moduloCore,\n]\n',
  };
  const generar = (clave: string, disco = new SistemaDeArchivosEnMemoria(INDICES)) => {
    const escritor = new EscritorDeArchivos(disco, '/p');
    new GenerarModulo(escritor).ejecutar({ clave, nombre: "Ganado d'Ana", fecha: '2026-09-27' });
    escritor.confirmar();
    return disco;
  };

  it('crea el esqueleto en el servidor, el cliente y la documentación', () => {
    const disco = generar('ganado');

    expect([...disco.archivos.keys()]).toEqual(
      expect.arrayContaining([
        '/p/servidor/src/modulos/ganado/modulo.ts',
        '/p/cliente/src/modulos/ganado/modulo.ts',
        '/p/cliente/src/modulos/ganado/textos.ts',
        '/p/docs/modulos/ganado.md',
      ]),
    );
    expect(disco.leer('/p/servidor/src/modulos/ganado/modulo.ts')).toContain("nombre: 'Ganado d\\'Ana',");
    expect(disco.leer('/p/cliente/src/modulos/ganado/textos.ts')).toContain('export const NOMBRE_GANADO');
  });

  it('lo registra en los dos índices, antes del core en el cliente', () => {
    const disco = generar('ganado');

    expect(disco.leer('/p/servidor/src/modulos/indice.ts')).toContain(
      "import { moduloGanado } from './ganado/modulo.js';",
    );
    expect(disco.leer('/p/cliente/src/modulos/indice.ts')).toMatch(
      /moduloGanado,\n {2}\/\/ generador: modulos\n {2}moduloCore/,
    );
  });

  it('no acepta una clave mal escrita ni un módulo que ya existe', () => {
    expect(() => generar('Ganado')).toThrow(ClaveDeModuloInvalida);
    expect(() => generar('ganado', generar('ganado'))).toThrow(ModuloExistente);
  });

  it('las plantillas reales no tienen huecos sin valor', () => {
    expect(() =>
      rellenar(leerPlantilla('modulo/servidor-modulo.ts'), { clave: '', Pascal: '', nombre: '', descripcion: '' }),
    ).not.toThrow();
  });
});

describe('línea de comandos', () => {
  it('separa comando, argumentos y opciones', () => {
    expect(leerOrden(['modulo', 'ganado', '--nombre', 'Ganado bovino'])).toEqual({
      comando: 'modulo',
      argumentos: ['ganado'],
      opciones: { nombre: 'Ganado bovino' },
    });
  });
});
