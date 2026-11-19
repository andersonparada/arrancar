import { apiUsuarios } from '@/modulos/core/servicios/usuarios.api';
import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';

/** Una cuenta bancaria activa con su saldo, para elegirla al entregar o depositar. */
export interface CuentaParaElFondo {
  id: string;
  nombre: string;
  saldo: string;
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

interface CuentaDeBancos extends CuentaParaElFondo {
  activo: boolean;
}

interface ChequeraDeBancos extends ChequeraParaElFondo {
  activa: boolean;
  deApertura: boolean;
}

interface ConDeNombre {
  id: string;
  nombre: string;
  activo: boolean;
}

/**
 * Lo que Caja chica necesita elegir y que viene de otros módulos (Bancos, Empresas, Libro de compras) y de Usuarios.
 * Se leen por sus rutas de API, sin importar el código de esos módulos; cada lectura exige el permiso de ver de su módulo,
 * así que si el usuario no lo tiene esa lista no llega y el formulario sigue con ella vacía.
 */
export class CatalogosDeCajaChica {
  constructor(private readonly http: ClienteHttp) {}

  async cuentas(): Promise<CuentaParaElFondo[]> {
    const cuentas = await this.http.obtener<CuentaDeBancos[]>('/bancos/cuentas-bancarias');
    return cuentas.filter((c) => c.activo).map(({ id, nombre, saldo }) => ({ id, nombre, saldo }));
  }

  async chequeras(): Promise<ChequeraParaElFondo[]> {
    const chequeras = await this.http.obtener<ChequeraDeBancos[]>('/bancos/chequeras');
    return chequeras
      .filter((c) => c.activa && !c.deApertura)
      .map(({ id, cuentaBancariaNombre, serie, disponibles }) => ({ id, cuentaBancariaNombre, serie, disponibles }));
  }

  async localidades(): Promise<LocalidadParaElFondo[]> {
    const localidades = await this.http.obtener<ConDeNombre[]>('/empresas/localidades');
    return localidades.filter((l) => l.activo).map(({ id, nombre }) => ({ id, nombre }));
  }

  async usuarios(): Promise<UsuarioParaElFondo[]> {
    const usuarios = await apiUsuarios.listar();
    return usuarios.filter((u) => u.activo).map((u) => ({ id: u.id, nombre: `${u.nombres} ${u.apellidos}`.trim() }));
  }

  async conceptosDeGasto(): Promise<ConceptoParaElVale[]> {
    const conceptos = await this.http.obtener<ConDeNombre[]>('/libro-de-compras/conceptos-de-gasto');
    return conceptos.filter((c) => c.activo).map(({ id, nombre }) => ({ id, nombre }));
  }
}

export const catalogosDeCajaChica = new CatalogosDeCajaChica(clienteHttp);
