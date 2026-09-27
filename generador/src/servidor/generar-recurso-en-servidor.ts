import type { DefinicionDeRecurso } from '../definicion/definir-recurso.js';
import type { EscritorDeArchivos } from '../motor/escritor-de-archivos.js';
import { leerPlantilla, rellenar, separarFragmentos } from '../motor/plantillas.js';
import { valoresDelRecurso } from '../valores-del-recurso.js';
import { camposDelServidor } from './campos-del-recurso.js';
import { fragmentosDeDominio } from './fragmentos-de-dominio.js';
import { fragmentosDePruebas } from './fragmentos-de-pruebas.js';
import { fragmentosDeTablaYHttp } from './fragmentos-de-tabla-y-http.js';

const MODULO = 'servidor/src/modulos/{{moduloClave}}';
const CASOS = `${MODULO}/aplicacion/casos-uso/{{pluralClave}}`;
const PERSISTENCIA = `${MODULO}/infraestructura/persistencia`;

/** Cada plantilla y dónde queda. Las de eliminar solo van si el recurso se elimina. */
const ARCHIVOS: [plantilla: string, destino: string][] = [
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

const SOLO_SI_SE_ELIMINA: [plantilla: string, destino: string][] = [
  ['eliminar.ts', `${CASOS}/eliminar-{{entidadClave}}.ts`],
];

/**
 * Lo que cambia según la baja: con `eliminar` van los trozos de ese archivo; con
 * `inactivar`, los del suyo y el resto vacío.
 */
function fragmentosDeBaja(
  definicion: DefinicionDeRecurso,
  valores: Record<string, string>,
  plantilla: (ruta: string) => string,
) {
  const deEliminar = separarFragmentos(plantilla('recurso/servidor/baja-eliminar.fragmentos'));
  const elegidos = separarFragmentos(plantilla(`recurso/servidor/baja-${definicion.baja}.fragmentos`));
  return Object.fromEntries(
    Object.keys(deEliminar).map((nombre) => [nombre, rellenar(elegidos[nombre] ?? '', valores)]),
  );
}

/** Todo el código de un recurso en el servidor, en las capas del módulo, y su registro en `modulo.ts`. */
export class GenerarRecursoEnServidor {
  constructor(
    private readonly escritor: EscritorDeArchivos,
    private readonly plantilla: (ruta: string) => string = leerPlantilla,
  ) {}

  /** Rellena todo antes de escribir: si una plantilla falla, no queda nada a medias. */
  ejecutar(definicion: DefinicionDeRecurso, nombreModulo: string): void {
    const valores = this.valores(definicion, nombreModulo);
    const plantillas = definicion.baja === 'eliminar' ? [...ARCHIVOS, ...SOLO_SI_SE_ELIMINA] : ARCHIVOS;
    const archivos = plantillas.map(([plantilla, destino]) => [
      rellenar(destino, valores),
      rellenar(this.plantilla(`recurso/servidor/${plantilla}`), valores),
    ]);
    for (const [destino, contenido] of archivos) this.escritor.crear(destino!, contenido!);
    this.registrarEnElModulo(definicion, valores);
  }

  private valores(definicion: DefinicionDeRecurso, nombreModulo: string): Record<string, string> {
    const campos = camposDelServidor(definicion);
    const valores = {
      ...valoresDelRecurso(definicion, nombreModulo),
      ...fragmentosDeDominio(campos, definicion.entidad.pascal),
      ...fragmentosDeTablaYHttp(campos, definicion),
      ...fragmentosDePruebas(campos, definicion),
    };
    return { ...valores, ...fragmentosDeBaja(definicion, valores, this.plantilla) };
  }

  private registrarEnElModulo(definicion: DefinicionDeRecurso, valores: Record<string, string>): void {
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
