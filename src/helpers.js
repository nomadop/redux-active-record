export function extractProps(caller, from, extractAll) {
  const keys = Object.getOwnPropertyNames(from);
  return keys.reduce((result, key) => {
    const ownPropertyDescriptor = Object.getOwnPropertyDescriptor(from, key);
    const { value, enumerable } = ownPropertyDescriptor;
    const getter = ownPropertyDescriptor.get;
    if (!enumerable && !extractAll) {
      return result;
    }

    if (!(value instanceof Function)) {
      result[key] = value;
    }

    if (getter) {
      const getValue = getter.apply(caller);
      result[key] = getValue.toArray ? getValue.toArray() : getValue;
    }

    return result;
  }, {});
}
