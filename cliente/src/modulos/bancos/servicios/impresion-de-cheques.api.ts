import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import type {
  ChequeParaImprimir,
  DatosDeReimpresion,
  ImpresionRegistrada,
  VistaDeImpresion,
} from './tipos-de-impresion-de-cheques';

const RUTA = '/bancos/cheques';

/** Imprimir cheques: la vista previa no cambia nada; imprimir y reimprimir registran la impresión (y su auditoría). */
export class ApiImpresionDeCheques {
  constructor(private readonly http: ClienteHttp) {}

  /** Uno o varios cheques de una misma chequera (hasta 50), en orden de número. */
  vistaPrevia(ids: readonly string[]) {
    return this.http.obtener<VistaDeImpresion>(`${RUTA}/impresion`, { ids: ids.join(',') });
  }

  /** La primera impresión (todo o nada): marca cada cheque como impreso y responde lo mismo que la vista previa. */
  imprimir(ids: readonly string[]) {
    return this.http.crear<VistaDeImpresion>(`${RUTA}/impresiones`, { ids });
  }

  /** Reimprime un cheque ya impreso: con motivo; `conCheque` falso es solo el comprobante. */
  reimprimir(chequeId: string, datos: DatosDeReimpresion) {
    return this.http.crear<ChequeParaImprimir>(`${RUTA}/${chequeId}/reimpresiones`, datos);
  }

  historial(chequeId: string) {
    return this.http.obtener<ImpresionRegistrada[]>(`${RUTA}/${chequeId}/impresiones`);
  }
}

export const apiImpresionDeCheques = new ApiImpresionDeCheques(clienteHttp);
