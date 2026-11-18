import type { DependenciasCompartidas } from '../../core/compartido/aplicacion/dependencias-compartidas.js';
import type { AlcanceDelOperador } from '../aplicacion/alcance-del-operador.js';
import { AbrirBalanceDeApertura } from '../aplicacion/casos-uso/balance-de-apertura/abrir-balance-de-apertura.js';
import type { DependenciasDelBalanceDeApertura } from '../aplicacion/casos-uso/balance-de-apertura/dependencias.js';
import { QuitarBalanceDeApertura } from '../aplicacion/casos-uso/balance-de-apertura/quitar-balance-de-apertura.js';
import { SubirBalanceDeApertura } from '../aplicacion/casos-uso/balance-de-apertura/subir-balance-de-apertura.js';
import { EjecutorEnEmpresa } from '../aplicacion/ejecutor-en-empresa.js';
import type { ConsultasEmpresas } from '../aplicacion/puertos/consultas-empresas.js';
import { BalanceDeAperturaControlador } from '../http/balance-de-apertura.controlador.js';
import { rutasDelBalanceDeApertura } from '../http/balance-de-apertura.rutas.js';
import { ConsultasDeDatosDeEmpresaDrizzle } from '../infraestructura/persistencia/consultas-de-datos-de-empresa.drizzle.js';
import { RepositorioDeCargasInicialesDrizzle } from '../infraestructura/persistencia/repositorio-de-cargas-iniciales.drizzle.js';

interface EmpresasDeLaCuenta {
  consultas: ConsultasEmpresas;
  alcance: AlcanceDelOperador;
}

/** Raíz de composición del balance de apertura firmado de la carga inicial. */
export function rutasDelBalanceDeAperturaComponidas(
  { unidadDeTrabajo, documentos, auditoria }: DependenciasCompartidas,
  empresas: EmpresasDeLaCuenta,
) {
  const dependencias: DependenciasDelBalanceDeApertura = {
    ejecutorEnEmpresa: new EjecutorEnEmpresa({ unidadDeTrabajo, ...empresas }),
    repositorioCargas: new RepositorioDeCargasInicialesDrizzle(),
    consultas: new ConsultasDeDatosDeEmpresaDrizzle(),
    documentos,
    auditoria,
  };
  return rutasDelBalanceDeApertura(
    new BalanceDeAperturaControlador({
      subir: new SubirBalanceDeApertura(dependencias),
      quitar: new QuitarBalanceDeApertura(dependencias),
      abrir: new AbrirBalanceDeApertura(dependencias),
    }),
  );
}
