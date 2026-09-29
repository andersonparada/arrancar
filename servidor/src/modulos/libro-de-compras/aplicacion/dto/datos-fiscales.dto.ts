import type {
  AgenteDeRetencionDeIva,
  RegimenDeIsrDeEmpresa,
  RegimenDeIva,
} from '../../dominio/datos-fiscales-de-empresa.js';
import type { RegimenDeIsrDeProveedor } from '../../dominio/datos-fiscales-de-proveedor.js';

/** Datos fiscales de una empresa tal como los ve el usuario; `guardado` es falso si son los valores por omisión. */
export interface DatosFiscalesDeEmpresaDto {
  empresaId: string;
  regimenIva: RegimenDeIva;
  regimenIsr: RegimenDeIsrDeEmpresa;
  agenteDeRetencionIva: AgenteDeRetencionDeIva;
  esAgenteDeRetencionIsr: boolean;
  guardado: boolean;
}

/** Datos fiscales de un proveedor tal como los ve el usuario; `guardado` es falso si son los valores por omisión. */
export interface DatosFiscalesDeProveedorDto {
  proveedorId: string;
  esPequenoContribuyente: boolean;
  regimenIsr: RegimenDeIsrDeProveedor | null;
  esAgenteDeRetencionIva: boolean;
  seLeRetieneIva: boolean;
  seLeRetieneIsr: boolean;
  seLeRetieneIvaPequenoContribuyente: boolean;
  guardado: boolean;
}
