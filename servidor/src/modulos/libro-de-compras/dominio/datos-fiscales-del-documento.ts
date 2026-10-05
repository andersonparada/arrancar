import type { DatosFiscalesDeEmpresa } from './datos-fiscales-de-empresa.js';
import {
  DatosFiscalesDeProveedor,
  REGIMENES_DE_ISR_DE_PROVEEDOR,
  type RegimenDeIsrDeProveedor,
} from './datos-fiscales-de-proveedor.js';
import { FaltanDatosFiscalesDelProveedor } from './errores-de-documento.js';
import type { TipoDeDocumento } from './tipos-de-documento.js';

/** Lo que el usuario contesta en el mismo documento cuando el proveedor no tiene datos fiscales guardados. */
export interface DatosFiscalesPedidos {
  regimenIsr: RegimenDeIsrDeProveedor;
  esAgenteDeRetencionIva: boolean;
}

export interface EntradaDeDatosFiscalesDelDocumento {
  tipo: TipoDeDocumento;
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
};

/** Las preguntas que la pantalla le hace al usuario; viajan en los `detalles` del error. */
export function preguntasDeDatosFiscales() {
  return {
    campo: 'datosFiscalesDelProveedor',
    preguntas: [
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
  esPequenoContribuyente: false,
  regimenIsr: pedidos.regimenIsr,
  esAgenteDeRetencionIva: pedidos.esAgenteDeRetencionIva,
});

/**
 * Los datos fiscales con que se calcula el documento y los que hay que guardar (opción C). Lo guardado manda. Sin
 * fila guardada: la factura de pequeño contribuyente lo deduce de su tipo; una factura del libro necesita lo que
 * contesta el usuario si la empresa retiene algo (si no, se usan los valores por omisión); recibos, documentos
 * fuera del libro y notas usan los valores por omisión sin avisar nada.
 * @throws FaltanDatosFiscalesDelProveedor si hacen falta y no llegaron.
 */
export function resolverDatosFiscalesDelProveedor(entrada: EntradaDeDatosFiscalesDelDocumento): DatosFiscalesResueltos {
  const { tipo, enElLibro, empresa, guardados, pedidos } = entrada;
  if (guardados) return { vigentes: guardados, porGuardar: null };
  if (tipo === 'factura_pequeno_contribuyente') {
    const deducidos = DatosFiscalesDeProveedor.porOmision({ esPequenoContribuyente: true });
    return { vigentes: deducidos, porGuardar: enElLibro ? deducidos : null };
  }
  if (tipo !== 'factura' || !enElLibro) return { vigentes: DatosFiscalesDeProveedor.porOmision(), porGuardar: null };
  if (pedidos) {
    const contestados = DatosFiscalesDeProveedor.porOmision(base(pedidos));
    return { vigentes: contestados, porGuardar: contestados };
  }
  if (retieneAlgo(empresa)) throw new FaltanDatosFiscalesDelProveedor(preguntasDeDatosFiscales());
  return { vigentes: DatosFiscalesDeProveedor.porOmision(), porGuardar: null };
}
