import type { DefinicionDeRecurso } from '../definicion/definir-recurso.js';
import { GeneracionDeRecurso, type Archivo } from '../generacion-de-recurso.js';
import { rellenar } from '../motor/plantillas.js';
import { referenciasDe } from '../referencias.js';
import { camposDelCliente } from './campos-del-cliente.js';
import { fragmentosDeEdicion } from './fragmentos-de-edicion.js';
import { fragmentosDePantalla } from './fragmentos-de-pantalla.js';
import { fragmentosDeReferenciasEnCliente } from './fragmentos-de-referencias.js';
import { rutasDelRecurso } from './rutas-del-recurso.js';

const MODULO = 'cliente/src/modulos/{{moduloClave}}';
const COMPOSABLES = `${MODULO}/composables/{{pluralClave}}`;
const COMPONENTES = `${MODULO}/componentes/{{pluralClave}}`;

/** Lo que comparten las dos pantallas: el servicio, la edición, los detalles y los campos. */
const COMUNES: Archivo[] = [
  ['api.ts', `${MODULO}/servicios/{{pluralClave}}.api.ts`],
  ['edicion.ts', `${COMPOSABLES}/edicion-de-{{entidadClave}}.ts`],
  ['edicion.prueba.ts', `${COMPOSABLES}/edicion-de-{{entidadClave}}.prueba.ts`],
  ['detalles.ts', `${COMPOSABLES}/detalles-de-{{entidadClave}}.ts`],
  ['campos.vue', `${COMPONENTES}/CamposDe{{Entidad}}.vue`],
];

/** Lista con tarjetas y una ventana para registrar y editar. */
const CATALOGO: Archivo[] = [
  ['usar.ts', `${COMPOSABLES}/usar-{{pluralClave}}.ts`],
  ['ventana.vue', `${COMPONENTES}/VentanaDe{{Entidad}}.vue`],
  ['pagina.vue', `${MODULO}/paginas/ListaDe{{Plural}}.vue`],
];

/** Lista que lleva a la ficha, formulario en página y ficha. */
const COMPLETA: Archivo[] = [
  ['usar-lista.ts', `${COMPOSABLES}/usar-lista-de-{{pluralClave}}.ts`],
  ['usar-formulario.ts', `${COMPOSABLES}/usar-formulario-de-{{entidadClave}}.ts`],
  ['usar-ficha.ts', `${COMPOSABLES}/usar-ficha-de-{{entidadClave}}.ts`],
  ['lista.vue', `${MODULO}/paginas/ListaDe{{Plural}}.vue`],
  ['formulario.vue', `${MODULO}/paginas/FormularioDe{{Entidad}}.vue`],
  ['ficha.vue', `${MODULO}/paginas/FichaDe{{Entidad}}.vue`],
];

const SOLO_SI_SE_ELIMINA: Archivo[] = [
  ['usar-eliminacion.ts', `${COMPOSABLES}/usar-eliminacion-de-{{entidadClave}}.ts`],
];

const SOLO_SI_ELIGE_OTROS: Archivo[] = [['referencias.ts', `${COMPOSABLES}/referencias-de-{{entidadClave}}.ts`]];

/**
 * Las pantallas de un recurso, de catálogo (lista y ventana) o completa (lista,
 * formulario en página y ficha), y su lugar en las rutas, el menú y los textos del módulo.
 */
export class GenerarRecursoEnCliente extends GeneracionDeRecurso {
  protected readonly carpeta = 'recurso/cliente';

  protected archivos(definicion: DefinicionDeRecurso): Archivo[] {
    return [
      ...COMUNES,
      ...(definicion.pantalla === 'completa' ? COMPLETA : CATALOGO),
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

  protected registrar(definicion: DefinicionDeRecurso, valores: Record<string, string>): void {
    this.registrarTextos(valores);
    this.registrarEnElModulo(definicion, valores);
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

  private registrarEnElModulo(definicion: DefinicionDeRecurso, valores: Record<string, string>): void {
    const modulo = rellenar(`${MODULO}/modulo.ts`, valores);
    const { icono, MODULO: constante, plural, moduloClave, pluralClave, permisoVer } = valores;
    const titulo = `VENTANAS_${constante}.${plural}.titulo`;
    // Una por una: el ícono puede estar ya importado por el módulo o por otro recurso.
    this.escritor.insertarEnMarca(modulo, 'importaciones', [`import { ${icono} } from 'lucide-vue-next';`]);
    this.escritor.insertarEnMarca(modulo, 'importaciones', [`import { VENTANAS_${constante} } from './textos';`]);
    const rutas = rutasDelRecurso(definicion, valores).map((linea) => rellenar(linea, valores));
    this.escritor.insertarEnMarca(modulo, 'rutas', rutas);
    this.escritor.insertarEnMarca(modulo, 'menu', [
      `{ titulo: ${titulo}, ruta: '/${moduloClave}/${pluralClave}', icono: ${icono}, seccion: '${definicion.seccion}', permiso: '${permisoVer}' },`,
    ]);
  }
}
