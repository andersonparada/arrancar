import type { FastifyPluginAsync } from 'fastify';
import { AnularVale } from '../aplicacion/casos-uso/vales-provisionales/anular-vale.js';
import { ListarVales, ObtenerVale } from '../aplicacion/casos-uso/vales-provisionales/consultas-de-vales.js';
import type { DependenciasDeVales } from '../aplicacion/casos-uso/vales-provisionales/dependencias-de-vales.js';
import { EntregarVale } from '../aplicacion/casos-uso/vales-provisionales/entregar-vale.js';
import { LiquidarVale } from '../aplicacion/casos-uso/vales-provisionales/liquidar-vale.js';
import { ValesProvisionalesControlador } from '../http/vales-provisionales.controlador.js';
import { rutasDeValesProvisionales } from '../http/vales-provisionales.rutas.js';
import { ConfiguracionDeValesEnConfiguracion } from '../infraestructura/apoyos-de-vales.js';
import { CustodiosDeFondosDrizzle } from '../infraestructura/persistencia/apoyos-de-fondos.drizzle.js';
import {
  ConsultasDeValesDrizzle,
  RepositorioDeValesDrizzle,
} from '../infraestructura/persistencia/repositorio-de-vales-provisionales.drizzle.js';
import { dependenciasDeComprobantes } from './comprobantes.js';

/** Raíz de composición de los vales provisionales: lista, ficha, entregar, liquidar y anular. */
export function rutasDeValesProvisionalesComponidas(): FastifyPluginAsync {
  const dependencias = dependenciasDeVales();
  return rutasDeValesProvisionales(
    new ValesProvisionalesControlador({
      listar: new ListarVales(dependencias),
      obtener: new ObtenerVale(dependencias),
      entregar: new EntregarVale(dependencias),
      liquidar: new LiquidarVale(dependencias),
      anular: new AnularVale(dependencias),
    }),
  );
}

export function dependenciasDeVales(): DependenciasDeVales {
  return {
    ...dependenciasDeComprobantes(),
    vales: new RepositorioDeValesDrizzle(),
    consultasDeVales: new ConsultasDeValesDrizzle(),
    configuracionDeVales: new ConfiguracionDeValesEnConfiguracion(),
    usuarios: new CustodiosDeFondosDrizzle(),
  };
}
