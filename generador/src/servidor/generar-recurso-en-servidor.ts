import type { DefinicionDeRecurso } from '../definicion/definir-recurso.js';
import { GeneracionDeRecurso, type Archivo } from '../generacion-de-recurso.js';
import { rellenar } from '../motor/plantillas.js';
import { camposDelServidor } from './campos-del-recurso.js';
import { fragmentosDeDominio } from './fragmentos-de-dominio.js';
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

/** Todo el código de un recurso en el servidor, en las capas del módulo, y su registro en `modulo.ts`. */
export class GenerarRecursoEnServidor extends GeneracionDeRecurso {
  protected readonly carpeta = 'recurso/servidor';

  protected archivos(definicion: DefinicionDeRecurso): Archivo[] {
    return definicion.baja === 'eliminar' ? [...ARCHIVOS, ...SOLO_SI_SE_ELIMINA] : ARCHIVOS;
  }

  protected fragmentos(definicion: DefinicionDeRecurso): Record<string, string> {
    const campos = camposDelServidor(definicion);
    return {
      ...fragmentosDeDominio(campos, definicion.entidad.pascal),
      ...fragmentosDeTablaYHttp(campos, definicion),
      ...fragmentosDePruebas(campos, definicion),
      ...fragmentosDeReferencias(definicion),
    };
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
    ]);
    this.escritor.insertarEnMarca(modulo, 'rutas', [`rutasDe${Plural}(),`]);
  }
}
