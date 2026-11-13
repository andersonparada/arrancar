import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import { intercambioDe } from '@/modulos/core/servicios/intercambio';
import type {
  ConsultaDeSaldosIniciales,
  CuadreDeSaldosIniciales,
  DatosDeSaldoInicial,
  PaginaDeSaldosIniciales,
  ProveedorParaSaldo,
  SaldoInicial,
} from './tipos-de-saldos-iniciales';

export type * from './tipos-de-saldos-iniciales';

const RUTA = '/cuentas-por-pagar/saldos-iniciales';

interface TerceroConProveedor {
  nombreMostrar: string;
  proveedor: { id: string; activo: boolean } | null;
}

/** Los saldos iniciales de Cuentas por pagar: cargarlos, corregirlos, eliminarlos, su Excel y su cuadre. */
export class ApiSaldosIniciales {
  constructor(private readonly http: ClienteHttp) {}

  /** Importar, exportar y bajar la plantilla del Excel. */
  get intercambio() {
    return intercambioDe(this.http, RUTA);
  }

  /** Solo exportar: el cuadre se baja a Excel pero no se importa. */
  get intercambioDelCuadre() {
    return intercambioDe(this.http, `${RUTA}/cuadre`);
  }

  listar(consulta: ConsultaDeSaldosIniciales) {
    return this.http.obtener<PaginaDeSaldosIniciales>(RUTA, { ...consulta });
  }

  obtener(id: string) {
    return this.http.obtener<SaldoInicial>(`${RUTA}/${id}`);
  }

  cuadre() {
    return this.http.obtener<CuadreDeSaldosIniciales>(`${RUTA}/cuadre`);
  }

  crear(datos: DatosDeSaldoInicial) {
    return this.http.crear<SaldoInicial>(RUTA, datos);
  }

  actualizar(id: string, datos: DatosDeSaldoInicial) {
    return this.http.reemplazar<SaldoInicial>(`${RUTA}/${id}`, datos);
  }

  /** Elimina de verdad el saldo; el motivo queda en la auditoría. */
  eliminar(id: string, motivo: string) {
    return this.http.eliminar(`${RUTA}/${id}`, { motivo });
  }

  /** Los proveedores de la cuenta (activos o no): el filtro debe encontrar también lo cargado antes. */
  async listarProveedores(): Promise<ProveedorParaSaldo[]> {
    const terceros = await this.http.obtener<TerceroConProveedor[]>('/terceros', { papel: 'proveedor' });
    return terceros.flatMap(({ nombreMostrar, proveedor }) =>
      proveedor ? [{ id: proveedor.id, nombre: nombreMostrar, activo: proveedor.activo }] : [],
    );
  }
}

export const apiSaldosIniciales = new ApiSaldosIniciales(clienteHttp);
