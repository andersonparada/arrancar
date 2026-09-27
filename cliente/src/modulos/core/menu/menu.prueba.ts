import { describe, expect, it } from 'vitest';
import { nextTick, ref } from 'vue';
import type { DefinicionModuloCliente } from '../tipos';
import { construirMenu, grupoDeLaRuta, type FiltroMenu } from './construir-menu';
import { usarGruposAbiertos, type Almacen } from './usar-grupos-abiertos';

const icono = {};
const modulos: DefinicionModuloCliente[] = [
  {
    clave: 'terceros',
    rutas: [],
    menu: [
      {
        clave: 'clientes',
        titulo: 'Clientes',
        icono,
        entradas: [
          { titulo: 'Proveedores', ruta: '/proveedores', icono, seccion: 'administracion', permiso: 'terceros.ver' },
          { titulo: 'Buscar contacto', ruta: '/contactos', icono, seccion: 'operacion', permiso: 'terceros.ver' },
          {
            titulo: 'Categorías',
            ruta: '/categorias',
            icono,
            seccion: 'administracion',
            permiso: 'proveedores.gestionar',
          },
        ],
      },
    ],
  },
  {
    clave: 'core',
    rutas: [],
    menu: [{ clave: 'soporte', titulo: 'Soporte', icono, soloSuperacceso: true, entradas: [] }],
  },
];

const propietario: FiltroMenu = {
  moduloActivo: () => true,
  puede: (permiso) => permiso === 'terceros.ver',
  esSuperacceso: false,
};

describe('menú por módulo', () => {
  it('ordena las secciones Operación, Administración, Reportes y oculta las vacías', () => {
    const [clientes] = construirMenu(modulos, propietario);

    expect(clientes?.secciones.map((s) => s.titulo)).toEqual(['Operación', 'Administración']);
  });

  it('oculta lo que el usuario no tiene permiso de ver', () => {
    const [clientes] = construirMenu(modulos, propietario);

    expect(clientes?.secciones.flatMap((s) => s.entradas.map((e) => e.titulo))).not.toContain('Categorías');
  });

  it('no muestra módulos inactivos ni grupos vacíos', () => {
    const sinClientes = { ...propietario, moduloActivo: (clave: string) => clave !== 'terceros' };

    expect(construirMenu(modulos, sinClientes)).toEqual([]);
  });

  it('reconoce el grupo de una ruta y de sus subpáginas', () => {
    const grupos = construirMenu(modulos, propietario);

    expect(grupoDeLaRuta(grupos, '/proveedores/123')).toBe('clientes');
    expect(grupoDeLaRuta(grupos, '/usuarios')).toBeNull();
  });
});

function almacenEnMemoria(inicial: string[] = []): Almacen & { valor: string | null } {
  return {
    valor: JSON.stringify(inicial),
    getItem() {
      return this.valor;
    },
    setItem(_llave: string, valor: string) {
      this.valor = valor;
    },
  };
}

describe('grupos abiertos', () => {
  it('abre el grupo de la página actual y recuerda lo que el usuario cierra', async () => {
    const almacen = almacenEnMemoria(['empresas']);
    const actual = ref<string | null>('clientes');
    const { abiertos, alternar } = usarGruposAbiertos(actual, almacen);

    alternar('empresas');
    await nextTick();

    expect([...abiertos.value]).toEqual(['clientes']);
    expect(JSON.parse(almacen.valor ?? '[]')).toEqual(['clientes']);
  });

  it('funciona aunque el navegador no permita guardar', () => {
    const bloqueado: Almacen = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('bloqueado');
      },
    };

    const { abiertos, alternar } = usarGruposAbiertos(ref('cuenta'), bloqueado);
    alternar('soporte');

    expect([...abiertos.value].sort()).toEqual(['cuenta', 'soporte']);
  });
});
