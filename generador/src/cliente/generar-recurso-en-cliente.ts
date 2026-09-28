import type { DefinicionDeRecurso } from '../definicion/definir-recurso.js';
import { GeneracionDeRecurso, type Archivo } from '../generacion-de-recurso.js';
import { rellenar } from '../motor/plantillas.js';
import { referenciasDe } from '../referencias.js';
import { camposDelCliente } from './campos-del-cliente.js';
import { fragmentosDeEdicion } from './fragmentos-de-edicion.js';
import { fragmentosDePantalla } from './fragmentos-de-pantalla.js';
import { fragmentosDeReferenciasEnCliente } from './fragmentos-de-referencias.js';

const MODULO = 'cliente/src/modulos/{{moduloClave}}';
const COMPOSABLES = `${MODULO}/composables/{{pluralClave}}`;

const ARCHIVOS: Archivo[] = [
  ['api.ts', `${MODULO}/servicios/{{pluralClave}}.api.ts`],
  ['edicion.ts', `${COMPOSABLES}/edicion-de-{{entidadClave}}.ts`],
  ['edicion.prueba.ts', `${COMPOSABLES}/edicion-de-{{entidadClave}}.prueba.ts`],
  ['detalles.ts', `${COMPOSABLES}/detalles-de-{{entidadClave}}.ts`],
  ['usar.ts', `${COMPOSABLES}/usar-{{pluralClave}}.ts`],
  ['ventana.vue', `${MODULO}/componentes/{{pluralClave}}/VentanaDe{{Entidad}}.vue`],
  ['pagina.vue', `${MODULO}/paginas/ListaDe{{Plural}}.vue`],
];

const SOLO_SI_SE_ELIMINA: Archivo[] = [
  ['usar-eliminacion.ts', `${COMPOSABLES}/usar-eliminacion-de-{{entidadClave}}.ts`],
];

const SOLO_SI_ELIGE_OTROS: Archivo[] = [['referencias.ts', `${COMPOSABLES}/referencias-de-{{entidadClave}}.ts`]];

/**
 * La pantalla de catálogo de un recurso (lista con tarjetas y ventana para
 * registrar y editar), y su lugar en las rutas, el menú y los textos del módulo.
 */
export class GenerarRecursoEnCliente extends GeneracionDeRecurso {
  protected readonly carpeta = 'recurso/cliente';

  protected archivos(definicion: DefinicionDeRecurso): Archivo[] {
    return [
      ...ARCHIVOS,
      ...(definicion.baja === 'eliminar' ? SOLO_SI_SE_ELIMINA : []),
      ...(referenciasDe(definicion).length ? SOLO_SI_ELIGE_OTROS : []),
    ];
  }

  protected fragmentos(definicion: DefinicionDeRecurso): Record<string, string> {
    const campos = camposDelCliente(definicion);
    return {
      ...fragmentosDeEdicion(campos, definicion),
      ...fragmentosDePantalla(campos, definicion),
      ...fragmentosDeReferenciasEnCliente(definicion),
    };
  }

  protected registrar(_definicion: DefinicionDeRecurso, valores: Record<string, string>): void {
    this.registrarTextos(valores);
    this.registrarEnElModulo(valores);
  }

  private registrarTextos(valores: Record<string, string>): void {
    const { plural, PluralTitulo, LosPlural, laEmpresaOCuenta, tituloNuevo, tituloEditar } = valores;
    this.escritor.insertarEnMarca(rellenar(`${MODULO}/textos.ts`, valores), 'ventanas', [
      `${plural}: {`,
      `  titulo: '${PluralTitulo}',`,
      `  descripcion: '${LosPlural} de ${laEmpresaOCuenta}.',`,
      `  nuevo: '${tituloNuevo}',`,
      `  editar: '${tituloEditar}',`,
      '},',
    ]);
  }

  private registrarEnElModulo(valores: Record<string, string>): void {
    const modulo = rellenar(`${MODULO}/modulo.ts`, valores);
    const { icono, MODULO: constante, plural, moduloClave, pluralClave, Plural, permisoVer } = valores;
    const ruta = `/${moduloClave}/${pluralClave}`;
    const titulo = `VENTANAS_${constante}.${plural}.titulo`;
    // Una por una: el ícono puede estar ya importado por el módulo o por otro recurso.
    this.escritor.insertarEnMarca(modulo, 'importaciones', [`import { ${icono} } from 'lucide-vue-next';`]);
    this.escritor.insertarEnMarca(modulo, 'importaciones', [`import { VENTANAS_${constante} } from './textos';`]);
    this.escritor.insertarEnMarca(modulo, 'rutas', [
      '{',
      `  path: '${ruta}',`,
      `  name: '${moduloClave}.${pluralClave}',`,
      `  component: () => import('./paginas/ListaDe${Plural}.vue'),`,
      `  meta: { permiso: '${permisoVer}', titulo: ${titulo} },`,
      '},',
    ]);
    this.escritor.insertarEnMarca(modulo, 'menu', [
      `{ titulo: ${titulo}, ruta: '${ruta}', icono: ${icono}, seccion: 'administracion', permiso: '${permisoVer}' },`,
    ]);
  }
}
