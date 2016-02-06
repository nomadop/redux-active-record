import ActiveModel from './active-model';

class ActiveCollection {
  constructor(activeModel) {
    Object.defineProperty(this, '__activeModel__', { value: activeModel });
  }

  get __adapter__() {
    return this.__activeModel__.__adapter__;
  }

  get __ids__() {
    return this.map(record => record.__id__);
  }

  get reload() {
    const newTarget = this.__activeModel__.where({ __id__: this.__ids__ });
    this.splice(0, this.length, ...newTarget.toArray());
    return this;
  }

  get modelName() {
    return this.__activeModel__.modelName;
  }

  save() {
    this.__adapter__.updateAll(this);
    return this.reload;
  }

  updateAll(json) {
    this.__adapter__.updateAll(this, json);
    return this.reload;
  }
}

function verifyTarget(target) {
  return target.reduce((result, element) => {
    const pass = element instanceof ActiveModel;
    return result && pass;
  }, true);
}

export function createActiveCollection(adapter) {
  return function decoratedCreator() {
    let target = Array.apply(null, arguments);

    const verifyFailureMessage = `Invalid target ${ JSON.stringify(target) }: ActiveCollection can only contains ActiveModel`;
    if (!verifyTarget(target)) {
      throw new Error(verifyFailureMessage);
    }

    const activeCollection = new ActiveCollection(adapter);
    Object.defineProperty(activeCollection, 'toArray', { value: () => target.slice() });
    const defineTargetProxies = () => {
      const targetPropertyNames = Object.getOwnPropertyNames(target);
      targetPropertyNames.forEach(key => {
        if (name in activeCollection) {
          return;
        }

        Object.defineProperty(activeCollection, key, {
          configurable: true,
          enumerable: key !== 'length',
          get: () => target[key],
          set: (val) => target[key] = val,
        });
      });
    };

    defineTargetProxies();

    const genProxyGetter = (name) => {
      return function proxyGetter() {
        const oldTarget = target.slice();
        const result = target[name].apply(target, arguments);
        if (!verifyTarget(target)) {
          target = oldTarget;
          throw new Error(verifyFailureMessage);
        }

        if (target.length !== oldTarget.length) {
          defineTargetProxies();
        }

        if (Array.isArray(result) && verifyTarget(result)) {
          return createActiveCollection(adapter)(...result);
        }

        return result;
      };
    };

    const arrayPropertyNames = Object.getOwnPropertyNames(Array.prototype);
    arrayPropertyNames.forEach((name) => {
      if (name in activeCollection) {
        return;
      }

      Object.defineProperty(activeCollection, name, { value: genProxyGetter(name) });
    });

    return activeCollection;
  };
}
