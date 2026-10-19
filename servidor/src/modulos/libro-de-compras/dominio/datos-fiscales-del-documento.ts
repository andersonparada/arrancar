import type { DatosFiscalesDeEmpresa } from './datos-fiscales-de-empresa.js';
import {
  DatosFiscalesDeProveedor,
  REGIMENES_DE_ISR_DE_PROVEEDOR,
  type RegimenDeIsrDeProveedor,
  type RegimenDeIvaDeProveedor,
} from './datos-fiscales-de-proveedor.js';
import { FaltanDatosFiscalesDelProveedor } from './errores-de-documento.js';
import type { TipoDeDocumento, TipoDte } from './tipos-de-documento.js';

/** Lo que el usuario contesta en el mismo documento cuando el proveedor no tiene datos fiscales guardados. */
export interface DatosFiscalesPedidos {
  /** Si no llega, se deduce: no domiciliado si el ISR lo es y general en los demás casos. */
  regimenIva?: RegimenDeIvaDeProveedor | null;
  regimenIsr: RegimenDeIsrDeProveedor;
  esAgenteDeRetencionIva: boolean;
}

export interface EntradaDeDatosFiscalesDelDocumento {
  tipo: TipoDeDocumento;
  /** El código de la SAT; distingue al primario del pecuario. `null` sin FEL. */
  tipoDte?: TipoDte | null;
  /** El documento va en el libro (casilla «Se muestra en reportes SAT» marcada). */
  enElLibro: boolean;
  empresa: DatosFiscalesDeEmpresa;
  /** Lo guardado del proveedor; `null` si nunca se guardó. */
  guardados: DatosFiscalesDeProveedor | null;
  /** Lo que llegó en el cuerpo; `null` si no vino. */
  pedidos: DatosFiscalesPedidos | null;
}

export interface DatosFiscalesResueltos {
  /** Con los que se calcula el documento. */
  vigentes: DatosFiscalesDeProveedor;
  /** Los que hay que guardar con el documento; `null` si no hay nada nuevo que guardar. */
  porGuardar: DatosFiscalesDeProveedor | null;
}

const retieneAlgo = (empresa: DatosFiscalesDeEmpresa): boolean => {
  const { agenteDeRetencionIva, esAgenteDeRetencionIsr } = empresa.instantanea();
  return agenteDeRetencionIva !== 'ninguno' || esAgenteDeRetencionIsr;
};

const OPCIONES_DE_REGIMEN: Record<RegimenDeIsrDeProveedor, string> = {
  utilidades: 'Régimen sobre las utilidades de actividades lucrativas',
  opcional_simplificado: 'Régimen opcional simplificado sobre ingresos',
  no_domiciliado: 'No domiciliado en el país',
  exento: 'Exento de ISR',
};

const OPCIONES_DE_REGIMEN_DE_IVA: Partial<Record<RegimenDeIvaDeProveedor, string>> = {
  general: 'Régimen general',
  no_domiciliado: 'No domiciliado en el país',
};

/** Las preguntas que la pantalla le hace al usuario; viajan en los `detalles` del error. */
export function preguntasDeDatosFiscales() {
  return {
    campo: 'datosFiscalesDelProveedor',
    preguntas: [
      {
        campo: 'regimenIva',
        pregunta: '¿En qué régimen de IVA está el proveedor?',
        opciones: Object.entries(OPCIONES_DE_REGIMEN_DE_IVA).map(([valor, texto]) => ({ valor, texto })),
      },
      {
        campo: 'regimenIsr',
        pregunta: '¿En qué régimen de ISR está el proveedor?',
        opciones: REGIMENES_DE_ISR_DE_PROVEEDOR.map((valor) => ({ valor, texto: OPCIONES_DE_REGIMEN[valor] })),
      },
      {
        campo: 'esAgenteDeRetencionIva',
        pregunta: '¿Es agente de retención del IVA? (la FEL lo indica)',
        opciones: [
          { valor: true, texto: 'Sí' },
          { valor: false, texto: 'No' },
        ],
      },
    ],
  };
}

const base = (pedidos: DatosFiscalesPedidos) => ({
  regimenIva: pedidos.regimenIva ?? (pedidos.regimenIsr === 'no_domiciliado' ? 'no_domiciliado' : 'general'),
  regimenIsr: pedidos.regimenIsr,
  esAgenteDeRetencionIva: pedidos.esAgenteDeRetencionIva,
});

/** El régimen que dice la familia (y el código) cuando el proveedor no tiene datos (el vendedor de la factura especial no está inscrito); `null` si no se deduce. */
function regimenDeducido(tipo: TipoDeDocumento, tipoDte: TipoDte | null): RegimenDeIvaDeProveedor | null {
  if (tipo === 'factura_pequeno_contribuyente') return 'pequeno_contribuyente';
  if (tipo === 'factura_pequeno_contribuyente_electronico') return 'pequeno_contribuyente_electronico';
  if (tipo === 'factura_contribuyente_agropecuario') return 'contribuyente_agropecuario';
  if (tipo === 'factura_especial') return 'sin_inscripcion';
  if (tipo !== 'factura_primario_pecuario') return null;
  return tipoDte === 'FPEC' || tipoDte === 'FCPC' ? 'pecuario' : 'primario';
}

/** Los derogados se calculan pero no se guardan: sería el régimen de hoy de un proveedor que ya no puede tenerlo. */
const SE_GUARDA: readonly RegimenDeIvaDeProveedor[] = [
  'pequeno_contribuyente',
  'primario',
  'pecuario',
  'sin_inscripcion',
];

/** Las familias sin IVA deducen el régimen de su tipo y código; los derogados se calculan pero no se guardan. */
function deducidosDeLaFamilia(entrada: EntradaDeDatosFiscalesDelDocumento): DatosFiscalesResueltos | null {
  const regimen = regimenDeducido(entrada.tipo, entrada.tipoDte ?? null);
  if (!regimen) return null;
  const datos = DatosFiscalesDeProveedor.porOmision({ regimenIva: regimen });
  return { vigentes: datos, porGuardar: entrada.enElLibro && SE_GUARDA.includes(regimen) ? datos : null };
}

/** Una factura del libro: lo que contesta el usuario, o los valores por omisión si la empresa no retiene nada. */
function deFacturaGeneral(entrada: EntradaDeDatosFiscalesDelDocumento): DatosFiscalesResueltos {
  const { empresa, pedidos } = entrada;
  if (pedidos) {
    const contestados = DatosFiscalesDeProveedor.porOmision(base(pedidos));
    return { vigentes: contestados, porGuardar: contestados };
  }
  if (retieneAlgo(empresa)) throw new FaltanDatosFiscalesDelProveedor(preguntasDeDatosFiscales());
  return { vigentes: DatosFiscalesDeProveedor.porOmision(), porGuardar: null };
}

/**
 * Los datos fiscales con que se calcula el documento y los que hay que guardar (opción C). Lo guardado manda. Sin
 * fila guardada: las familias sin IVA lo deducen de su tipo y código (pequeño contribuyente, primario o pecuario se
 * guardan en el libro; los derogados solo se usan para calcular); una factura del libro necesita lo que contesta el
 * usuario si la empresa retiene algo (si no, se usan los valores por omisión); recibos, documentos fuera del libro y
 * notas usan los valores por omisión sin avisar nada.
 * @throws FaltanDatosFiscalesDelProveedor si hacen falta y no llegaron.
 */
export function resolverDatosFiscalesDelProveedor(entrada: EntradaDeDatosFiscalesDelDocumento): DatosFiscalesResueltos {
  if (entrada.guardados) return { vigentes: entrada.guardados, porGuardar: null };
  const deducidos = deducidosDeLaFamilia(entrada);
  if (deducidos) return deducidos;
  if (entrada.tipo !== 'factura' || !entrada.enElLibro) {
    return { vigentes: DatosFiscalesDeProveedor.porOmision(), porGuardar: null };
  }
  return deFacturaGeneral(entrada);
}
