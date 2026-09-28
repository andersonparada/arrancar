import type { DefinicionDeRecurso } from '../definicion/definir-recurso.js';
import { nombresDeReferencias, omitirReferencias } from '../referencias.js';
import { lineas } from '../servidor/campos-del-recurso.js';
import { conValor } from './campos-en-cliente.js';
import { esLista, funcionesUsadas, importacion, type CampoDelCliente } from './campos-del-cliente.js';
import { nombresEnRegistroDePrueba } from './fragmentos-de-referencias.js';

const conNulo = (tipo: string, requerido: boolean) => (requerido ? tipo : `${tipo} | null`);

const TIPO_EN_FORMULARIO = {
  texto: 'string',
  numero: 'string | number',
  siNo: 'boolean',
  referencia: 'string | null',
} as const;

function tipoEnFormulario(campo: CampoDelCliente): string {
  const { forma } = campo.cliente;
  return forma === 'lista' ? conNulo(campo.tipoPrimitivo, campo.requerido) : TIPO_EN_FORMULARIO[forma];
}

/** Cómo empieza un registro nuevo: vacío, con el valor predeterminado o con la primera opción. */
function valorNuevo({ campo, cliente, requerido }: CampoDelCliente): string {
  if (campo.tipo === 'siNo') return String(campo.predeterminado);
  if (cliente.forma === 'referencia') return 'null';
  if (cliente.forma !== 'lista') return "''";
  return requerido && campo.tipo === 'lista' ? `'${Object.keys(campo.opciones)[0]}'` : 'null';
}

const desdeElRegistro = ({ nombreEnCodigo: nombre, cliente }: CampoDelCliente, entidad: string) =>
  cliente.forma === 'texto' || cliente.forma === 'numero'
    ? `${nombre}: textoDeEdicion(${entidad}.${nombre}),`
    : `${nombre}: ${entidad}.${nombre},`;

const haciaElServidor = ({ nombreEnCodigo: nombre, cliente, requerido }: CampoDelCliente) =>
  `${nombre}: ${conValor(cliente.alServidor[requerido ? 0 : 1], `edicion.${nombre}`)},`;

/** Las opciones de cada lista, una sola vez: la ventana y la tarjeta las usan. */
function opcionesDeListas(campos: CampoDelCliente[]): string {
  return campos
    .filter(esLista)
    .map(({ campo, constanteDeOpciones }) => {
      const opciones = campo.tipo === 'lista' ? campo.opciones : {};
      const entradas = Object.entries(opciones).map(([valor, texto]) => `${valor}: '${texto.replaceAll("'", "\\'")}'`);
      return `\nexport const ${constanteDeOpciones} = { ${entradas.join(', ')} };\n`;
    })
    .join('');
}

function pruebaDeOpcionales(campos: CampoDelCliente[], entidad: string): string {
  const opcionales = campos.filter((campo) => !campo.requerido);
  if (opcionales.length === 0) return '';
  return `
  it('lo que no se llena se manda como null', () => {
    expect(datosDe${entidad}(edicionDe())).toMatchObject({ ${opcionales.map((c) => `${c.nombreEnCodigo}: null`).join(', ')} });
  });
`;
}

/** Huecos del servicio, la edición y su prueba. */
export function fragmentosDeEdicion(campos: CampoDelCliente[], definicion: DefinicionDeRecurso) {
  const { entidad } = definicion;
  const desde = campos.map((campo) => desdeElRegistro(campo, entidad.camel));
  const hacia = campos.map(haciaElServidor);
  return {
    camposTs: lineas(campos.map((c) => `${c.nombreEnCodigo}: ${conNulo(c.tipoPrimitivo, c.requerido)};`)),
    camposDeReferenciasEnTs: nombresDeReferencias(definicion),
    omitirReferencias: omitirReferencias(definicion),
    nombresEnRegistroDePrueba: nombresEnRegistroDePrueba(definicion),
    camposDeEdicion: lineas(campos.map((c) => `${c.nombreEnCodigo}: ${tipoEnFormulario(c)};`)),
    valoresNuevos: lineas(campos.map((c) => `${c.nombreEnCodigo}: ${valorNuevo(c)},`)),
    desdeElRegistro: lineas(desde, '    '),
    haciaElServidor: lineas(hacia),
    importacionesDeEdicion: importacion(funcionesUsadas([...desde, ...hacia]), '@/modulos/core/utilidades/edicion'),
    opcionesDeListas: opcionesDeListas(campos),
    registroDePrueba: lineas(campos.map((c) => `${c.nombreEnCodigo}: ${c.valorDePrueba},`)),
    pruebaDeOpcionales: pruebaDeOpcionales(campos, entidad.pascal),
  };
}
