import type { FastifyPluginAsync } from 'fastify';
import '../../core/contratos/bancos.contratos.js';
import '../../core/contratos/caja-chica.contratos.js';
import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { AbrirFondo } from '../aplicacion/casos-uso/fondos/abrir-fondo.js';
import { AnularApertura } from '../aplicacion/casos-uso/fondos/anular-apertura.js';
import { AumentarFondo } from '../aplicacion/casos-uso/fondos/aumentar-fondo.js';
import { CambiarCustodio } from '../aplicacion/casos-uso/fondos/cambiar-custodio.js';
import { ListarFondos, ObtenerFondo } from '../aplicacion/casos-uso/fondos/consultas-de-fondos.js';
import type { DependenciasDeFondos } from '../aplicacion/casos-uso/fondos/dependencias-de-fondos.js';
import { DisminuirFondo } from '../aplicacion/casos-uso/fondos/disminuir-fondo.js';
import { EditarFondo } from '../aplicacion/casos-uso/fondos/editar-fondo.js';
import { FondosControlador } from '../http/fondos.controlador.js';
import { rutasDeFondos } from '../http/fondos.rutas.js';
import { ConfiguracionDeArqueosEnConfiguracion } from '../infraestructura/apoyos-de-arqueos.js';
import { FondosEnBancosEnMediador } from '../infraestructura/fondos-en-bancos-en-mediador.js';
import {
  CustodiosDeFondosDrizzle,
  MovimientosDeFondosDrizzle,
  ReferenciasDeFondosDrizzle,
} from '../infraestructura/persistencia/apoyos-de-fondos.drizzle.js';
import { ConsultasDeFondosDrizzle } from '../infraestructura/persistencia/consultas-de-fondos.drizzle.js';
import { RepositorioDeFondosDrizzle } from '../infraestructura/persistencia/repositorio-de-fondos.drizzle.js';

/**
 * Raíz de composición de los fondos: abrir, editar, custodio, aumentar, disminuir, anular la apertura, lista y ficha.
 * El aviso de Bancos antes de cambiar un cheque o una nota se atiende en `avisos-de-bancos.ts` (fondos y reposiciones).
 */
export function rutasDeFondosComponidas(): FastifyPluginAsync {
  const dependencias = dependenciasDeFondos();
  return rutasDeFondos(
    new FondosControlador({
      abrir: new AbrirFondo(dependencias),
      listar: new ListarFondos(dependencias),
      obtener: new ObtenerFondo(dependencias),
      editar: new EditarFondo(dependencias),
      cambiarCustodio: new CambiarCustodio(dependencias),
      aumentar: new AumentarFondo(dependencias),
      disminuir: new DisminuirFondo(dependencias),
      anularApertura: new AnularApertura(dependencias),
    }),
  );
}

export function dependenciasDeFondos(): DependenciasDeFondos {
  const { unidadDeTrabajo, reloj, auditoria, publicadorEventos } = dependenciasCompartidas();
  const movimientos = new MovimientosDeFondosDrizzle();
  return {
    unidadDeTrabajo,
    fondos: new RepositorioDeFondosDrizzle(),
    consultas: new ConsultasDeFondosDrizzle(),
    custodios: new CustodiosDeFondosDrizzle(),
    referencias: new ReferenciasDeFondosDrizzle(),
    bancos: new FondosEnBancosEnMediador(movimientos),
    movimientos,
    auditoria,
    publicadorEventos,
    reloj,
    configuracionDeArqueos: new ConfiguracionDeArqueosEnConfiguracion(),
  };
}
