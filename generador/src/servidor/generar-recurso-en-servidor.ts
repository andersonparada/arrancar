import type { DefinicionDeRecurso } from '../definicion/definir-recurso.js';
import { GeneracionDeRecurso, type Archivo } from '../generacion-de-recurso.js';
import { rellenar } from '../motor/plantillas.js';
import { camposDelServidor } from './campos-del-recurso.js';
import { fragmentosDeDominio } from './fragmentos-de-dominio.js';
import { fragmentosDeIntercambio } from './fragmentos-de-intercambio.js';
import { fragmentosDePruebas } from './fragmentos-de-pruebas.js';
import { fragmentosDeReferencias } from './fragmentos-de-referencias.js';
import { fragmentosDeTablaYHttp } from './fragmentos-de-tabla-y-http.js';

const MODULO = 'servidor/src/modulos/{{moduloClave}}';
const CASOS = `${MODULO}/aplicacion/casos-uso/{{pluralClave}}`;
const PERSISTENCIA = `${MODULO}/infraestructura/persistencia`;

/** Cada plantilla y dónde queda. Las de eliminar solo van si el recurso se elimina. */
const ARCHIVOS: Archivo[] = [
  ['dominio.ts', `${MODULO}/dominio/{{entidadClave}}.ts`],
  ['dto.ts', `${MODULO}/aplicacion/dto/{{entidadClave}}.dto.ts`],
  ['datos.ts', `${MODULO}/aplicacion/datos-de-{{entidadClave}}.ts`],
  ['repositorio.ts', `${MODULO}/aplicacion/puertos/repositorio-{{pluralClave}}.ts`],
  ['consultas.ts', `${MODULO}/aplicacion/puertos/consultas-{{pluralClave}}.ts`],
  ['dependencias.ts', `${CASOS}/dependencias-de-{{pluralClave}}.ts`],
  ['listar.ts', `${CASOS}/listar-{{pluralClave}}.ts`],
  ['obtener.ts', `${CASOS}/obtener-{{entidadClave}}.ts`],
  ['crear.ts', `${CASOS}/crear-{{entidadClave}}.ts`],
  ['actualizar.ts', `${CASOS}/actualizar-{{entidadClave}}.ts`],
  ['casos-de-uso.prueba.ts', `${CASOS}/casos-uso-de-{{pluralClave}}.prueba.ts`],
  ['esquema.tablas.ts', `${PERSISTENCIA}/esquema.tablas.ts`],
  ['tablas.ts', `${PERSISTENCIA}/{{pluralClave}}.tablas.ts`],
  ['mapeador.ts', `${PERSISTENCIA}/{{entidadClave}}.mapeador.ts`],
  ['repositorio.drizzle.ts', `${PERSISTENCIA}/repositorio-{{pluralClave}}.drizzle.ts`],
  ['consultas.drizzle.ts', `${PERSISTENCIA}/consultas-{{pluralClave}}.drizzle.ts`],
  ['esquemas-http.ts', `${MODULO}/http/{{pluralClave}}.esquemas-http.ts`],
  ['controlador.ts', `${MODULO}/http/{{pluralClave}}.controlador.ts`],
  ['rutas.ts', `${MODULO}/http/{{pluralClave}}.rutas.ts`],
  ['composicion.ts', `${MODULO}/composicion/{{pluralClave}}.ts`],
  ['dobles.ts', `${MODULO}/pruebas/dobles-de-{{pluralClave}}.ts`],
  ['api.prueba.ts', 'servidor/src/pruebas-api/{{moduloClave}}-{{pluralClave}}.api.prueba.ts'],
];

const SOLO_SI_SE_ELIMINA: Archivo[] = [['eliminar.ts', `${CASOS}/eliminar-{{entidadClave}}.ts`]];

/** Sin Excel (operación) no hay columnas que exportar ni que importar. */
const SOLO_SI_HAY_EXCEL: Archivo[] = [['columnas.ts', `${MODULO}/http/{{pluralClave}}.columnas.ts`]];

/** Todo el código de un recurso en el servidor, en las capas del módulo, y su registro en `modulo.ts`. */
export class GenerarRecursoEnServidor extends GeneracionDeRecurso {
  protected readonly carpeta = 'recurso/servidor';

  protected archivos(definicion: DefinicionDeRecurso): Archivo[] {
    const hayExcel = definicion.excel.importar || definicion.excel.exportar;
    return [
      ...ARCHIVOS,
      ...(definicion.baja === 'eliminar' ? SOLO_SI_SE_ELIMINA : []),
      ...(hayExcel ? SOLO_SI_HAY_EXCEL : []),
    ];
  }

  protected fragmentos(definicion: DefinicionDeRecurso): Record<string, string> {
    const campos = camposDelServidor(definicion);
    return {
      ...fragmentosDeDominio(campos, definicion.entidad.pascal),
      ...fragmentosDeTablaYHttp(campos, definicion),
      ...fragmentosDePruebas(campos, definicion),
      ...fragmentosDeReferencias(definicion),
      ...fragmentosDeIntercambio(campos, definicion),
    };
  }

  /** Solo hay permiso de importar o de exportar si la sección lo trae (ver `EXCEL_POR_SECCION`). */
  private permisosDeExcel(definicion: DefinicionDeRecurso, valores: Record<string, string>): string[] {
    const { pluralTexto, permisoImportar, permisoExportar } = valores;
    return [
      ...(definicion.excel.importar
        ? [`{ clave: '${permisoImportar}', descripcion: 'Importar ${pluralTexto} desde Excel' },`]
        : []),
      ...(definicion.excel.exportar
        ? [`{ clave: '${permisoExportar}', descripcion: 'Exportar ${pluralTexto} a Excel' },`]
        : []),
    ];
  }

  protected registrar(definicion: DefinicionDeRecurso, valores: Record<string, string>): void {
    const modulo = rellenar(`${MODULO}/modulo.ts`, valores);
    const accion = definicion.baja === 'eliminar' ? 'y eliminar' : 'e inactivar';
    const { Plural, pluralClave, pluralTexto, permisoVer, permisoGestionar } = valores;
    this.escritor.insertarEnMarca(modulo, 'importaciones', [
      `import { rutasDe${Plural} } from './composicion/${pluralClave}.js';`,
    ]);
    this.escritor.insertarEnMarca(modulo, 'permisos', [
      `{ clave: '${permisoVer}', descripcion: 'Ver ${pluralTexto}' },`,
      `{ clave: '${permisoGestionar}', descripcion: 'Registrar, editar ${accion} ${pluralTexto}' },`,
      ...this.permisosDeExcel(definicion, valores),
    ]);
    this.escritor.insertarEnMarca(modulo, 'rutas', [`rutasDe${Plural}(),`]);
  }
}
