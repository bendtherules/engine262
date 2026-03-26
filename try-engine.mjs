import { Agent, 
  setSurroundingAgent, 
  ManagedRealm, 
  Value, 
  CreateDataProperty, 
  inspect, 
  CreateBuiltinFunction, 
  AbruptCompletion,
  skipDebugger,
} from './lib/engine262.mjs';

const agent = new Agent({
  onDebugger() {
    debugger; // eslint-disable-line no-debugger
  },
  // ensureCanCompileStrings() {},
  // hasSourceTextAvailable() {},
  // loadImportedModule() {},
  // onNodeEvaluation() {},
  // features: [],
});
setSurroundingAgent(agent);

const realm = new ManagedRealm({
  // promiseRejectionTracker() {},
  // getImportMetaProperties() {},
  // finalizeImportMeta() {},
  // randomSeed() {},
});

realm.scope(() => {
  // Add print function from host
  const print = CreateBuiltinFunction((args) => {
    console.log(...args.map((tmp) => inspect(tmp)));
    return Value.undefined;
  }, 1, Value('print'), []);
  skipDebugger(CreateDataProperty(realm.GlobalObject, Value('print'), print));
});

const result = realm.evaluateScript(`
reject = undefined, p = new Promise((res, rej) => reject = rej)
p.then(print);
reject(123)
`, { specifier: 'code.js' });

if (result instanceof AbruptCompletion) {
  console.error(inspect(result));
}