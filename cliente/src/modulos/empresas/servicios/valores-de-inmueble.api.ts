import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';

export type FuenteDeValor = 'matricula_fiscal' | 'catastro_municipal';
export type OrigenDeValor = 'avaluo_dicabi' | 'avaluo_municipal' | 'autoavaluo' | 'valuador_autorizado' | 'otro';
export type CategoriaDeIusi = 'vivienda' | 'residencial' | 'mixto' | 'comercial' | 'otros';

/** Valor de un inmueble desde una fecha, tal como lo manda el servidor (los montos, como texto). */
export interface ValorDeInmueble {
  id: string;
  inmuebleId: string;
  fuente: FuenteDeValor;
  vigenteDesde: string;
  origen: OrigenDeValor;
  valorTerreno: string | null;
  valorConstrucciones: string | null;
  valorCultivosPermanentes: string | null;
  valorTotal: string;
  categoriaIusi: CategoriaDeIusi | null;
  documento: string | null;
  archivoId: string | null;
}

export type DatosValorDeInmueble = Omit<ValorDeInmueble, 'id' | 'inmuebleId' | 'archivoId'>;

const ruta = (inmuebleId: string) => `/empresas/inmuebles/${inmuebleId}/valores`;

export class ApiValoresDeInmueble {
  constructor(private readonly http: ClienteHttp) {}

  /** Del más reciente al más antiguo. */
  listar(inmuebleId: string) {
    return this.http.obtener<ValorDeInmueble[]>(ruta(inmuebleId));
  }

  registrar(inmuebleId: string, datos: DatosValorDeInmueble) {
    return this.http.crear<ValorDeInmueble>(ruta(inmuebleId), datos);
  }

  eliminar(inmuebleId: string, valorId: string) {
    return this.http.eliminar(`${ruta(inmuebleId)}/${valorId}`);
  }
}

export const apiValoresDeInmueble = new ApiValoresDeInmueble(clienteHttp);
