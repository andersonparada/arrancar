import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';

/** Una cuenta bancaria activa, para elegirla al entregar o depositar. */
export interface CuentaParaElFondo {
  id: string;
  nombre: string;
}

/** Una chequera activa con los cheques que le quedan. */
export interface ChequeraParaElFondo {
  id: string;
  cuentaBancariaNombre: string;
  serie: string | null;
  disponibles: number;
}

export interface LocalidadParaElFondo {
  id: string;
  nombre: string;
}

export interface UsuarioParaElFondo {
  id: string;
  nombre: string;
}

export interface ConceptoParaElVale {
  id: string;
  nombre: string;
}

/** Todo lo que Caja chica ofrece para elegir; lo arma el servidor de Caja chica, sin pedir permisos de otros módulos. */
export interface CatalogosDeCajaChicaDatos {
  cuentas: CuentaParaElFondo[];
  chequeras: ChequeraParaElFondo[];
  localidades: LocalidadParaElFondo[];
  usuarios: UsuarioParaElFondo[];
  conceptosDeGasto: ConceptoParaElVale[];
}

/** `GET /caja-chica/catalogos`: lo piden las ventanas de abrir, aumentar, disminuir, custodio y vale de gasto. */
export class CatalogosDeCajaChica {
  constructor(private readonly http: ClienteHttp) {}

  obtener(): Promise<CatalogosDeCajaChicaDatos> {
    return this.http.obtener<CatalogosDeCajaChicaDatos>('/caja-chica/catalogos');
  }
}

export const catalogosDeCajaChica = new CatalogosDeCajaChica(clienteHttp);
