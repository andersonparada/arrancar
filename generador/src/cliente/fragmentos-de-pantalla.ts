import type { DefinicionDeRecurso } from '../definicion/definir-recurso.js';
import { conValor } from './campos-en-cliente.js';
import { esLista, funcionesUsadas, importacion, type CampoDelCliente } from './campos-del-cliente.js';

const COMPONENTES_DE_CAMPO = {
  texto: 'CampoTexto',
  numero: 'CampoTexto',
  siNo: 'CampoInterruptor',
  lista: 'CampoSelector',
};

/** El control de la ventana para un campo, con su etiqueta, si es obligatorio y su error. */
function control(campo: CampoDelCliente): string {
  const { nombreEnCodigo: nombre, etiqueta, cliente, requerido } = campo;
  const modelo = `v-model="edicion.${nombre}" etiqueta="${etiqueta}"`;
  const error = `${requerido ? ' requerido' : ''} :error="errores.${nombre}"`;
  if (cliente.forma === 'siNo') return `<CampoInterruptor ${modelo} />`;
  if (cliente.forma === 'lista') {
    const opciones = `:opciones="opcionesDeLista(${campo.constanteDeOpciones}, ${!requerido})"`;
    return `<CampoSelector ${modelo} ${opciones}${error} />`;
  }
  return `<CampoTexto ${modelo}${cliente.atributos ? ` ${cliente.atributos}` : ''}${error} />`;
}

function importacionesDeLaVentana(campos: CampoDelCliente[], entidadClave: string, pluralClave: string): string {
  const componentes = [...new Set(campos.map((campo) => COMPONENTES_DE_CAMPO[campo.cliente.forma]))].sort();
  const listas = campos.filter(esLista);
  return [
    ...componentes.map((nombre) => `import ${nombre} from '@/modulos/core/componentes/${nombre}.vue';\n`),
    importacion(listas.length ? ['opcionesDeLista'] : [], '@/modulos/core/utilidades/edicion'),
    importacion(
      listas.map((campo) => campo.constanteDeOpciones),
      `../../composables/${pluralClave}/edicion-de-${entidadClave}`,
    ),
  ].join('');
}

const valorEnTarjeta = (campo: CampoDelCliente) =>
  esLista(campo)
    ? `formatearOpcion(${campo.constanteDeOpciones}, registro.${campo.nombreEnCodigo})`
    : conValor(campo.cliente.detalle, `registro.${campo.nombreEnCodigo}`);

/** La tarjeta muestra todo menos el campo que la titula y el estado (que va como insignia). */
function fragmentosDeDetalles(campos: CampoDelCliente[], { mostrar, entidad }: DefinicionDeRecurso) {
  const enTarjeta = campos.filter((campo) => campo.nombreEnCodigo !== mostrar && campo.nombreEnCodigo !== 'activo');
  const valores = enTarjeta.map(valorEnTarjeta);
  const listas = enTarjeta.filter(esLista).map((campo) => campo.constanteDeOpciones);
  return {
    detalles: enTarjeta.map((campo, i) => `  { etiqueta: '${campo.etiqueta}', valor: ${valores[i]} },`).join('\n'),
    parametroDeDetalles: enTarjeta.length ? 'registro' : '_registro',
    importacionesDeDetalles:
      importacion(funcionesUsadas(valores), '@/modulos/core/utilidades/formato') +
      importacion(listas, `./edicion-de-${entidad.clave}`),
  };
}

/** Huecos de la ventana y de la tarjeta. */
export function fragmentosDePantalla(campos: CampoDelCliente[], definicion: DefinicionDeRecurso) {
  return {
    controles: campos.map((campo) => `      ${control(campo)}`).join('\n'),
    importacionesDeLaVentana: importacionesDeLaVentana(campos, definicion.entidad.clave, definicion.plural.clave),
    ...fragmentosDeDetalles(campos, definicion),
  };
}
