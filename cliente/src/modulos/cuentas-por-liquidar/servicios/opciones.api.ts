import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';

const RUTA = '/cuentas-por-liquidar';

export interface ChequeraParaElegir {
  chequeraId: string;
  serie: string | null;
  siguienteChequeId: string | null;
  siguienteNumero: number | null;
}

export interface CuentaParaElegir {
  cuentaBancariaId: string;
  nombre: string;
  bancoNombre: string | null;
  numero: string;
  /** Saldo a la fecha pedida, texto con dos decimales. */
  saldo: string;
  chequeras: ChequeraParaElegir[];
}

export interface MediosParaElegir {
  cuentas: CuentaParaElegir[];
}

export interface ConceptoParaGasto {
  id: string;
  nombre: string;
}

/** Un tercero de la cuenta que puede recibir un anticipo. */
export interface Beneficiario {
  id: string;
  nombreMostrar: string;
  nit: string | null;
  activo: boolean;
}

export interface DatosDeBeneficiarioNuevo {
  tipo: 'individual' | 'juridica';
  nombres: string | null;
  apellidos: string | null;
  razonSocial: string | null;
}

/** Las listas que llenan las ventanas: cuentas y chequeras, conceptos de gasto y beneficiarios (terceros). */
export class ApiOpciones {
  constructor(private readonly http: ClienteHttp) {}

  mediosParaEntregar(fecha?: string) {
    return this.http.obtener<MediosParaElegir>(`${RUTA}/medios-para-entregar`, fecha ? { fecha } : {});
  }

  mediosParaLiquidar(fecha?: string) {
    return this.http.obtener<MediosParaElegir>(`${RUTA}/medios-para-liquidar`, fecha ? { fecha } : {});
  }

  conceptosDeGasto() {
    return this.http.obtener<ConceptoParaGasto[]>(`${RUTA}/conceptos-de-gasto`);
  }

  /** Los terceros activos de la cuenta (necesita `terceros.ver`). */
  beneficiarios() {
    return this.http.obtener<Beneficiario[]>('/terceros', { activo: true });
  }

  /** Alta rápida: solo el nombre; lo demás se completa en Terceros (necesita `terceros.crear`). */
  crearBeneficiario(datos: DatosDeBeneficiarioNuevo, confirmarDuplicado: boolean) {
    return this.http.crear<Beneficiario>('/terceros', {
      ...datos,
      nombreComercial: null,
      nit: null,
      dpi: null,
      telefono: null,
      whatsapp: null,
      correo: null,
      departamentoCodigo: null,
      municipioCodigo: null,
      direccion: null,
      fotoArchivoId: null,
      notas: null,
      activo: true,
      confirmarDuplicado,
    });
  }
}

export const apiOpciones = new ApiOpciones(clienteHttp);
