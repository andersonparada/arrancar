import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { ArqueoResumen } from '../../servicios/tipos-de-arqueos';
import type { ReposicionResumen } from '../../servicios/tipos-de-reposiciones';
import type { ValeResumen } from '../../servicios/tipos-de-vales';

/** Lo que se puede anular desde la ficha del fondo: una reposición, un arqueo o un vale provisional. */
export type Movimiento =
  | { tipo: 'reposicion'; registro: ReposicionResumen }
  | { tipo: 'arqueo'; registro: ArqueoResumen }
  | { tipo: 'vale'; registro: ValeResumen };

/** Lo que dice la ventana: título, qué va a pasar si confirma, texto del botón y si pide fecha del inverso en Bancos. */
export interface TextosDeLaAnulacion {
  titulo: string;
  resumen: string;
  textoDelBoton: string;
  conFecha: boolean;
  exito: string;
}

function deLaReposicion({ numero, monto }: ReposicionResumen): TextosDeLaAnulacion {
  return {
    titulo: 'Anular la reposición',
    resumen: `Se anula la reposición ${numero} de ${formatearMonto(monto)}: Bancos registra el movimiento inverso del cheque o la nota y sus comprobantes vuelven a quedar pendientes de reponer. Si el banco ya pagó el cheque, no se puede anular.`,
    textoDelBoton: 'Anular reposición',
    conFecha: true,
    exito: `Reposición ${numero} anulada.`,
  };
}

function delArqueo({ numero }: ArqueoResumen): TextosDeLaAnulacion {
  return {
    titulo: 'Anular el arqueo',
    resumen: `Se anula el arqueo ${numero}. Si dejó un faltante o un sobrante que todavía no se repuso, ese comprobante también se anula; si ya se repuso, anule primero la reposición.`,
    textoDelBoton: 'Anular arqueo',
    conFecha: false,
    exito: `Arqueo ${numero} anulado.`,
  };
}

function delVale({ numero, monto, entregadoA }: ValeResumen): TextosDeLaAnulacion {
  return {
    titulo: 'Anular el vale provisional',
    resumen: `Se anula el vale ${numero} de ${formatearMonto(monto)} entregado a ${entregadoA}: ese efectivo vuelve a contar como del fondo. Solo se puede si el vale está abierto y no tiene comprobantes.`,
    textoDelBoton: 'Anular vale',
    conFecha: false,
    exito: `Vale ${numero} anulado.`,
  };
}

export function textosDeLaAnulacion(movimiento: Movimiento): TextosDeLaAnulacion {
  switch (movimiento.tipo) {
    case 'reposicion':
      return deLaReposicion(movimiento.registro);
    case 'arqueo':
      return delArqueo(movimiento.registro);
    case 'vale':
      return delVale(movimiento.registro);
  }
}
