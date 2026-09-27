import {
  comoImportaciones,
  conNulo,
  conObjetoDeValor,
  lineas,
  rutaAlCore,
  type CampoDelServidor,
} from './campos-del-recurso.js';

const rutaDelObjetoDeValor = (campo: CampoDelServidor, niveles: number) =>
  `${rutaAlCore(niveles)}/compartido/dominio/objetos-valor/${campo.servidor.objetoDeValor!.archivo}.js`;

/** `import { Correo } from '…/objetos-valor/correo.js'` para cada objeto de valor que se usa. */
function importarObjetosDeValor(campos: CampoDelServidor[], niveles: number, soloTipo = false): string[] {
  const palabra = soloTipo ? 'import type' : 'import';
  return conObjetoDeValor(campos)
    .map(
      (campo) =>
        `${palabra} { ${campo.servidor.objetoDeValor!.clase} } from '${rutaDelObjetoDeValor(campo, niveles)}';`,
    )
    .sort();
}

const hayOpcionalConObjetoDeValor = (campos: CampoDelServidor[]) =>
  conObjetoDeValor(campos).some((campo) => !campo.requerido);

const importarDeObjetoValor = (funcion: string, niveles: number) =>
  `import { ${funcion} } from '${rutaAlCore(niveles)}/compartido/dominio/objeto-valor.js';`;

/** De texto a objeto de valor: `correo: crearSiHayTexto(solicitud.correo, Correo.crear)`. */
function aObjetoDeValor(campos: CampoDelServidor[], origen: string): string[] {
  return conObjetoDeValor(campos).map(({ nombreEnCodigo: nombre, requerido, servidor }) => {
    const clase = servidor.objetoDeValor!.clase;
    const valor = requerido
      ? `${clase}.crear(${origen}.${nombre})`
      : `crearSiHayTexto(${origen}.${nombre}, ${clase}.crear)`;
    return `${nombre}: ${valor}`;
  });
}

/** Detrás de otras propiedades en la misma línea: `, correo: …`. */
const seguidas = (entradas: string[]) => entradas.map((entrada) => `, ${entrada}`).join('');

/** De objeto de valor a texto: `, correo: valorDe(datos.correo)`. */
function aPrimitivo(campos: CampoDelServidor[]): string {
  return conObjetoDeValor(campos)
    .map(
      ({ nombreEnCodigo: nombre, requerido }) =>
        `, ${nombre}: ${requerido ? `datos.${nombre}.valor` : `valorDe(datos.${nombre})`}`,
    )
    .join('');
}

const textosObligatorios = (campos: CampoDelServidor[]) =>
  campos.filter(({ campo }) => (campo.tipo === 'texto' || campo.tipo === 'textoLargo') && campo.requerido);

/** Las reglas de los datos: hoy, que los textos obligatorios no queden vacíos. */
function reglasDeDatos(campos: CampoDelServidor[], entidad: string): string {
  const obligatorios = textosObligatorios(campos);
  if (obligatorios.length === 0) {
    return `/** Aquí van las reglas que deben cumplir los datos antes de guardarse. */
const datosValidos = (datos: DatosDe${entidad}): DatosDe${entidad} => ({ ...datos });`;
  }
  const exigidos = obligatorios.map(
    ({ nombreEnCodigo: n, etiqueta }) => `${n}: textoObligatorio(datos.${n}, '${etiqueta}')`,
  );
  return `/** Recorta el texto y exige que no quede vacío. */
function textoObligatorio(texto: string, campo: string): string {
  const limpio = texto.trim();
  if (!limpio) throw new ${entidad}Invalido(\`Escriba "\${campo}".\`);
  return limpio;
}

/** Los textos obligatorios no pueden quedar vacíos. */
function datosValidos(datos: DatosDe${entidad}): DatosDe${entidad} {
  return { ...datos, ${exigidos.join(', ')} };
}`;
}

/** Huecos del dominio, los DTO y las conversiones entre la pantalla, la entidad y la tabla. */
export function fragmentosDeDominio(campos: CampoDelServidor[], entidad: string): Record<string, string> {
  const hayOpcional = hayOpcionalConObjetoDeValor(campos);
  return {
    camposDominio: lineas(campos.map((c) => `${c.nombreEnCodigo}: ${conNulo(c.servidor.tipoDominio, c.requerido)};`)),
    camposDto: lineas(campos.map((c) => `${c.nombreEnCodigo}: ${conNulo(c.servidor.tipoPrimitivo, c.requerido)};`)),
    importacionesDominio: comoImportaciones(importarObjetosDeValor(campos, 2, true)),
    reglasDeDatos: reglasDeDatos(campos, entidad),
    importacionesDeDatos: comoImportaciones([
      ...(hayOpcional ? [importarDeObjetoValor('crearSiHayTexto', 2)] : []),
      ...importarObjetosDeValor(campos, 2),
    ]),
    conversionesDeSolicitud: seguidas(aObjetoDeValor(campos, 'solicitud')),
    importacionesMapeador: comoImportaciones([
      ...(hayOpcional ? [importarDeObjetoValor('crearSiHayTexto, valorDe', 3)] : []),
      ...importarObjetosDeValor(campos, 3),
    ]),
    conversionesAEntidad: aObjetoDeValor(campos, 'campos')
      .map((entrada) => `\n      ${entrada},`)
      .join(''),
    conversionesAPrimitivo: aPrimitivo(campos),
    importacionesAPrimitivo: comoImportaciones(hayOpcional ? [importarDeObjetoValor('valorDe', 2)] : []),
  };
}
