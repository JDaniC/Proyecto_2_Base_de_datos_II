import type { BundlesInstitucionales } from '../puertos/bundle-institucional.js';

export class ConsultarBundlesConfigurados {
  constructor(private readonly bundles: BundlesInstitucionales) {}

  ejecutar(): BundlesInstitucionales {
    return this.bundles;
  }
}
