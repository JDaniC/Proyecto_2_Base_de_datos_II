import { generarClaveIdempotencia } from './idempotency';
/** Retiene solo la última intención por recurso, también si se pierde la respuesta. */
export function stableCommandKeys() {
  const intents = new Map<string, {body: string; key: string}>();
  return (resource: string, body: unknown) => {
    const serialized = JSON.stringify(body);
    if (intents.get(resource)?.body !== serialized) intents.set(resource, {body: serialized, key: generarClaveIdempotencia()});
    return intents.get(resource)!.key;
  };
}
