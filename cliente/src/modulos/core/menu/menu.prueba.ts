import { describe, expect, it } from 'vitest';
import { nextTick, ref } from 'vue';
import type { DefinicionModuloCliente } from '../tipos';
import { construirMenu, plegablesDeLaRuta, type FiltroMenu } from './construir-menu';
import { usarPlegablesAbiertos, type Almacen } from './usar-plegables-abiertos';

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
            permiso: 'proveedores.editar',
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
    expect(clientes?.conSecciones).toBe(true);
  });

  it('con una sola sección visible no muestra el separador', () => {
    const soloAdministra = { ...propietario, puede: (permiso: string) => permiso === 'proveedores.editar' };

    const [clientes] = construirMenu(modulos, soloAdministra);

    expect(clientes?.conSecciones).toBe(false);
    expect(clientes?.secciones[0]?.entradas.map((e) => e.titulo)).toEqual(['Categorías']);
  });

  it('oculta lo que el usuario no tiene permiso de ver', () => {
    const [clientes] = construirMenu(modulos, propietario);

    expect(clientes?.secciones.flatMap((s) => s.entradas.map((e) => e.titulo))).not.toContain('Categorías');
  });

  it('no muestra módulos inactivos ni grupos vacíos', () => {
    const sinClientes = { ...propietario, moduloActivo: (clave: string) => clave !== 'terceros' };

    expect(construirMenu(modulos, sinClientes)).toEqual([]);
  });

  it('reconoce el grupo y la sección de una ruta y de sus subpáginas', () => {
    const grupos = construirMenu(modulos, propietario);

    expect(plegablesDeLaRuta(grupos, '/proveedores/123')).toEqual(['clientes', 'clientes/administracion']);
    expect(plegablesDeLaRuta(grupos, '/usuarios')).toEqual([]);
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

describe('grupos y secciones abiertos', () => {
  it('abre el grupo y la sección de la página actual y recuerda lo que el usuario cierra', async () => {
    const almacen = almacenEnMemoria(['empresas']);
    const actual = ref(['clientes', 'clientes/operacion']);
    const { abiertos, alternar } = usarPlegablesAbiertos(actual, almacen);

    alternar('empresas');
    await nextTick();

    expect([...abiertos.value]).toEqual(['clientes', 'clientes/operacion']);
    expect(JSON.parse(almacen.valor ?? '[]')).toEqual(['clientes', 'clientes/operacion']);
  });

  it('al cambiar de página abre la sección nueva sin cerrar las demás', async () => {
    const actual = ref(['clientes', 'clientes/operacion']);
    const { abiertos } = usarPlegablesAbiertos(actual, almacenEnMemoria());

    actual.value = ['clientes', 'clientes/administracion'];
    await nextTick();

    expect([...abiertos.value]).toEqual(['clientes', 'clientes/operacion', 'clientes/administracion']);
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

    const { abiertos, alternar } = usarPlegablesAbiertos(ref(['cuenta']), bloqueado);
    alternar('soporte');

    expect([...abiertos.value].sort()).toEqual(['cuenta', 'soporte']);
  });
});
