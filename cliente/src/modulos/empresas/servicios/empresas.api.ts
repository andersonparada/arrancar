import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import { intercambioDe } from '@/modulos/core/servicios/intercambio';

export interface Empresa {
  id: string;
  nombre: string;
  nit: string | null;
  direccion: string | null;
  telefono: string | null;
  correo: string | null;
  monedaBase: string;
  activa: boolean;
  actualizadoEn: string;
}

/** Lo que responden crear y actualizar: la empresa y avisos que no impiden guardar (p. ej. NIT repetido en la cuenta). */
export interface EmpresaGuardada extends Empresa {
  avisos: string[];
}

export interface DatosEmpresa {
  nombre: string;
  nit: string | null;
  direccion: string | null;
  telefono: string | null;
  correo: string | null;
  activa: boolean;
  /** Por qué se quita o cambia el NIT (obligatorio en ese caso). */
  motivoDelNit?: string | null;
  /** Lo que los módulos activos aportan al formulario (`secciones[<módulo>]`). */
  secciones?: Record<string, unknown>;
}

export class ApiEmpresas {
  constructor(private readonly http: ClienteHttp) {}

  /** Exportar e importar en Excel. */
  get intercambio() {
    return intercambioDe(this.http, '/empresas');
  }

  listar() {
    return this.http.obtener<Empresa[]>('/empresas');
  }

  crear(datos: DatosEmpresa) {
    return this.http.crear<EmpresaGuardada>('/empresas', datos);
  }

  actualizar(id: string, datos: DatosEmpresa) {
    return this.http.reemplazar<EmpresaGuardada>(`/empresas/${id}`, datos);
  }
}

export const apiEmpresas = new ApiEmpresas(clienteHttp);
