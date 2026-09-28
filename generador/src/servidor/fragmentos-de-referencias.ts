import type { DefinicionDeRecurso } from '../definicion/definir-recurso.js';
import {
  apuntaASiMisma,
  nombreDeLaReferencia,
  nombresDeReferencias,
  omitirReferencias,
  recursosReferidos,
  referenciasDe,
  type CampoDeReferencia,
} from '../referencias.js';
import { valoresDelRecurso } from '../valores-del-recurso.js';
import { enServidor } from './campos-en-servidor.js';

const importarTabla = ({ plural }: DefinicionDeRecurso) =>
  `import { ${plural.camel} } from './${plural.clave}.tablas.js';\n`;

/** La tabla del registro elegido con otro nombre, para unirla aunque sea la misma: `alias(animales, 'madre')`. */
const aliasDe = (campo: CampoDeReferencia) =>
  `const ${campo.nombre.camel} = alias(${campo.referida.plural.camel}, '${campo.nombre.serpiente}');`;

const unionDe = (campo: CampoDeReferencia, { plural }: DefinicionDeRecurso) =>
  `\n      .leftJoin(${campo.nombre.camel}, eq(${plural.camel}.${campo.nombreEnCodigo}, ${campo.nombre.camel}.id))`;

const exigencia = (campo: CampoDeReferencia) =>
  `    await exigirQueExista(${campo.referida.plural.camel}, solicitud.${campo.nombreEnCodigo}, '${valoresDelRecurso(campo.referida, '').ElSingular}');`;

/** Las consultas unen cada tabla referida para traer el nombre del registro elegido, y comprueban que exista. */
function fragmentosDeConsultas(definicion: DefinicionDeRecurso, campos: CampoDeReferencia[]) {
  if (campos.length === 0)
    return { importacionesDeConsultas: '', aliasDeReferencias: '', exigirReferenciasEnDrizzle: '' };
  const { Entidad, laEmpresaOCuenta } = valoresDelRecurso(definicion, '');
  return {
    importacionesDeConsultas:
      "import { alias } from 'drizzle-orm/pg-core';\n" +
      "import { exigirQueExista } from '../../../core/compartido/infraestructura/exigir-que-exista.js';\n",
    aliasDeReferencias: `\n${campos.map(aliasDe).join('\n')}\n`,
    exigirReferenciasEnDrizzle: `
  /** Lo elegido debe existir y ser de ${laEmpresaOCuenta}: la seguridad por filas oculta lo ajeno. */
  async exigirReferencias(solicitud: SolicitudDe${Entidad}): Promise<void> {
${campos.map(exigencia).join('\n')}
  }
`,
  };
}

/** Los que no pertenecen a un solo archivo: el puerto, los casos de uso, el DTO, el mapeador y los dobles. */
function fragmentosDeCapas(definicion: DefinicionDeRecurso, campos: CampoDeReferencia[]) {
  const hay = campos.length > 0;
  const { Entidad } = valoresDelRecurso(definicion, '');
  const nombres = campos.map((campo) => `'${nombreDeLaReferencia(campo)}'`).join(' | ');
  return {
    importarSolicitudEnConsultas: hay ? `, SolicitudDe${Entidad}` : '',
    exigirReferenciasEnPuerto: hay
      ? `\n  /** @throws RecursoNoEncontrado si algo que se eligió no existe o es ajeno. */\n  exigirReferencias(solicitud: SolicitudDe${Entidad}): Promise<void>;`
      : '',
    exigirReferencias: hay ? '      await consultas.exigirReferencias(solicitud);\n' : '',
    camposDeReferenciasEnDto: nombresDeReferencias(definicion),
    omitirReferencias: omitirReferencias(definicion),
    tipoDeReferenciasEnFila: hay ? ` & Pick<${Entidad}Dto, ${nombres}>` : '',
    columnasDeReferencias: campos
      .map((campo) => `, ${nombreDeLaReferencia(campo)}: ${campo.nombre.camel}.${campo.referida.mostrar}`)
      .join(''),
    unionesDeReferencias: campos.map((campo) => unionDe(campo, definicion)).join(''),
    exigirReferenciasEnDobles: hay
      ? '\n  /** En memoria, todo lo elegido existe. */\n  exigirReferencias(): Promise<void> {\n    return Promise.resolve();\n  }\n'
      : '',
    nombresNulosEnDobles: campos.map((campo) => `, ${nombreDeLaReferencia(campo)}: null`).join(''),
  };
}

/** Los recursos que hay que registrar antes, en orden: primero aquellos de los que dependen los demás. */
function registrosPrevios(definicion: DefinicionDeRecurso, vistos = new Set<string>()): DefinicionDeRecurso[] {
  return recursosReferidos(definicion).flatMap((referida) => {
    if (vistos.has(referida.entidad.pascal)) return [];
    vistos.add(referida.entidad.pascal);
    return [...registrosPrevios(referida, vistos), referida];
  });
}

/** El valor de una referencia en la prueba de API: el registro creado antes, o nada si apunta a sí misma. */
const valorEnApi = (campo: CampoDeReferencia, definicion: DefinicionDeRecurso) =>
  apuntaASiMisma(campo, definicion) ? 'null' : `${campo.referida.entidad.camel}.cuerpo.id as string`;

function cuerpoEnApi(definicion: DefinicionDeRecurso): string {
  const valores = definicion.campos.map((campo) => {
    const valor = campo.referida
      ? valorEnApi(campo as CampoDeReferencia, definicion)
      : enServidor(campo.campo).valoresDePrueba[0];
    return `${campo.nombreEnCodigo}: ${valor}`;
  });
  return `{ ${valores.join(', ')} }`;
}

const registroPrevio = (referida: DefinicionDeRecurso) =>
  `  const ${referida.entidad.camel} = await usuario.post('/api/${referida.modulo.clave}/${referida.plural.clave}', ${cuerpoEnApi(referida)});`;

/** Crea lo que se elige, en orden, y devuelve el id de cada referencia. */
function crearReferencias(definicion: DefinicionDeRecurso, campos: CampoDeReferencia[]): string {
  const devueltas = campos.map((campo) => `${campo.nombreEnCodigo}: ${valorEnApi(campo, definicion)}`);
  const previos = registrosPrevios(definicion).map(registroPrevio);
  // Si solo apunta a sí mismo no hay nada que crear antes, y el usuario no se usa.
  const usuario = previos.length ? 'usuario' : '_usuario';
  return `
/** Lo que el registro necesita elegir, registrado en la cuenta del usuario. */
async function crearReferencias(${usuario}: ClienteApi) {
${previos.map((linea) => `${linea}\n`).join('')}  return { ${devueltas.join(', ')} };
}

let referencias: Awaited<ReturnType<typeof crearReferencias>>;
let referenciasAjenas: Awaited<ReturnType<typeof crearReferencias>>;
`;
}

/** Elegir un registro de otra cuenta responde como si no existiera. */
function pruebaDeReferenciaAjena(definicion: DefinicionDeRecurso, campos: CampoDeReferencia[]): string {
  const ajena = campos.find((campo) => !apuntaASiMisma(campo, definicion));
  if (!ajena) return '';
  const { nombreEnCodigo: nombre, referida } = ajena;
  return `
  it('no acepta ${valoresDelRecurso(referida, '').unSingular} de otra cuenta', async () => {
    const conAjeno = await cuenta.propietario.post(RUTA, datos({ ${nombre}: referenciasAjenas.${nombre} }));

    expect(conAjeno.estado).toBe(404);
  });
`;
}

const SIN_REFERENCIAS_EN_API = {
  importacionClienteApi: '',
  referenciasEnApi: '',
  crearReferenciasEnApi: '',
  referenciasEnDatos: '',
  datosAjenos: '',
  pruebaDeReferenciaAjena: '',
};

/** La prueba de API registra antes, en la cuenta de cada usuario, lo que el recurso necesita elegir. */
function fragmentosDeApi(definicion: DefinicionDeRecurso, campos: CampoDeReferencia[]) {
  if (campos.length === 0) return SIN_REFERENCIAS_EN_API;
  return {
    importacionClienteApi: "import type { ClienteApi } from './soporte/cliente-api.js';\n",
    referenciasEnApi: crearReferencias(definicion, campos),
    crearReferenciasEnApi:
      '  referencias = await crearReferencias(cuenta.propietario);\n  referenciasAjenas = await crearReferencias(otraCuenta.propietario);\n',
    referenciasEnDatos: '  ...referencias,\n',
    datosAjenos: 'referenciasAjenas',
    pruebaDeReferenciaAjena: pruebaDeReferenciaAjena(definicion, campos),
  };
}

/** Huecos de todo lo que cambia cuando el recurso apunta a otros: consultas, comprobaciones y pruebas. */
export function fragmentosDeReferencias(definicion: DefinicionDeRecurso): Record<string, string> {
  const campos = referenciasDe(definicion);
  return {
    importacionesDeTablasReferidas: recursosReferidos(definicion).map(importarTabla).join(''),
    ...fragmentosDeConsultas(definicion, campos),
    ...fragmentosDeCapas(definicion, campos),
    ...fragmentosDeApi(definicion, campos),
  };
}
