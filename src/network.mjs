import Hyperswarm from 'hyperswarm';
import DHT from 'hyperdht';
import { bootstrapOptions } from './common.mjs';
export function makeSwarm(options) {
  // Hyperswarm no reenvía host/firewalled al DHT; una instancia explícita sí.
  return new Hyperswarm({ dht: new DHT(bootstrapOptions(options)) });
}
