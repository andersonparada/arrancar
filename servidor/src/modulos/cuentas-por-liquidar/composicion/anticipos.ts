import type { FastifyPluginAsync } from 'fastify';
import '../../core/contratos/bancos.contratos.js';
import '../../core/contratos/cuentas-por-liquidar.contratos.js';
import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { mediador } from '../../core/mediador/contexto.js';
import { AnularAnticipo } from '../aplicacion/casos-uso/anticipos/anular-anticipo.js';
import { AtenderMovimientoDeAnticipoPorCambiar } from '../aplicacion/casos-uso/anticipos/atender-movimiento-de-anticipo-por-cambiar.js';
import { ListarAnticipos, ObtenerAnticipo } from '../aplicacion/casos-uso/anticipos/consultas-de-anticipos.js';
import type { DependenciasDeAnticipos } from '../aplicacion/casos-uso/anticipos/dependencias-de-anticipos.js';
import { EntregarAnticipo } from '../aplicacion/casos-uso/anticipos/entregar-anticipo.js';
import { AnticiposControlador } from '../http/anticipos.controlador.js';
import { rutasDeAnticipos } from '../http/anticipos.rutas.js';
import { OrdenesABancosEnMediador } from '../infraestructura/ordenes-a-bancos-en-mediador.js';
import { PoliticaDeAnticiposEnConfiguracion } from '../infraestructura/politica-de-anticipos-en-configuracion.js';
import { ConsultasDeAnticiposDrizzle } from '../infraestructura/persistencia/consultas-de-anticipos.drizzle.js';
import { MovimientosDeBancosDrizzle } from '../infraestructura/persistencia/movimientos-de-bancos.drizzle.js';
import { ReferenciasDelAnticipoDrizzle } from '../infraestructura/persistencia/referencias-del-anticipo.drizzle.js';
import { RepositorioDeAnticiposDrizzle } from '../infraestructura/persistencia/repositorio-de-anticipos.drizzle.js';

/**
 * Raíz de composición de los anticipos. También atiende el aviso de Bancos antes de cambiar el cheque o la nota de la entrega
 * de un anticipo (o su devolución o su reembolso).
 */
export function rutasDeAnticiposComponidas(): FastifyPluginAsync {
  const dependencias = dependenciasDeAnticipos();
  const atender = new AtenderMovimientoDeAnticipoPorCambiar(dependencias);
  mediador.escuchar('cuentas-por-liquidar', 'bancos.movimiento_por_cambiar', (aviso, operador) =>
    atender.ejecutar(operador, aviso),
  );
  return rutasDeAnticipos(
    new AnticiposControlador({
      entregar: new EntregarAnticipo(dependencias),
      listar: new ListarAnticipos(dependencias),
      obtener: new ObtenerAnticipo(dependencias),
      anular: new AnularAnticipo(dependencias),
    }),
  );
}

function dependenciasDeAnticipos(): DependenciasDeAnticipos {
  const { unidadDeTrabajo, reloj, correlativos, auditoria, publicadorEventos } = dependenciasCompartidas();
  const movimientos = new MovimientosDeBancosDrizzle();
  return {
    unidadDeTrabajo,
    anticipos: new RepositorioDeAnticiposDrizzle(),
    consultas: new ConsultasDeAnticiposDrizzle(),
    referencias: new ReferenciasDelAnticipoDrizzle(),
    politica: new PoliticaDeAnticiposEnConfiguracion(),
    bancos: new OrdenesABancosEnMediador(movimientos),
    movimientos,
    correlativos,
    auditoria,
    publicadorEventos,
    reloj,
  };
}
