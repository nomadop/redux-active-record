import { createActiveCollection } from './active-collection';
import { extractProps } from './helpers';

function genCachedGetter(propName, getter) {
  const cachedPropName = `__${propName}Cached__`;
  return function cachedGetter() {
    let value = this[cachedPropName];
    if (!value || (value.toArray && !value.length)) {
      value = getter.apply(this);
      Object.defineProperty(this, cachedPropName, {
        value,
        configurable: true,
      });
    }

    return value;
  };
}

export default class ActiveModel {
  constructor(json = {}) {
    Object.keys(json).forEach(key => {
      if (key === '__id__' || key === '__isPersisted__') {
        return;
      }

      this[key] = json[key];
    });
  }

  get reload() {
    return this.constructor.find(this.__id__);
  }

  get jsonData() {
    const selfProps = extractProps(this, this, false);
    const proto = this.constructor.prototype;
    const protoProps = extractProps(this, proto, true);
    return Object.assign({}, selfProps, protoProps);
  }

  get __adapter__() {
    return this.constructor.__adapter__;
  }

  get modelName() {
    return this.constructor.modelName;
  }

  update(json) {
    Object.assign(this, json);
    this.save();
  }

  save() {
    if (this.beforeSave instanceof Function) {
      this.beforeSave();
    }

    if (this.__isPersisted__) {
      this.__adapter__.update(this);
    } else {
      if (this.beforeCreate instanceof Function) {
        this.beforeCreate();
      }

      Object.defineProperty(this, '__id__', {
        value: ++this.constructor.__idGenerator__,
      });
      this.__adapter__.create(this);
      Object.defineProperty(this, '__isPersisted__', {
        value: true,
      });

      if (this.afterCreate instanceof Function) {
        this.afterCreate();
      }
    }

    if (this.afterSave instanceof Function) {
      this.afterSave();
    }
  }

  destroy() {
    this.__adapter__.destroy(this);
  }

  static get modelName() {
    return this.__modelName__ || this.name;
  }

  static set modelName(name) {
    this.__modelName__ = name;
  }

  static all() {
    const records = this.__adapter__.getRecords(this.modelName).map(json => {
      const record = new this(json);
      Object.defineProperty(record, '__id__', {
        value: json.__id__,
      });
      Object.defineProperty(record, '__isPersisted__', {
        value: true,
      });
      return record;
    });
    return createActiveCollection(this)(...records);
  }

  static where(opts) {
    let records = this.all();
    Object.keys(opts).forEach(key => {
      records = records.filter(record => {
        if (Array.isArray(opts[key])) {
          return opts[key].indexOf(record[key]) >= 0;
        }

        return record[key] === opts[key];
      });
    });
    return records;
  }

  static find(opts) {
    if (Number.isInteger(opts)) {
      return this.all().find(record => record.__id__ === opts);
    }

    return this.where(opts)[0];
  }

  static create(json) {
    if (Array.isArray(json)) {
      const records = json.map(r => new this(r));
      const collection = createActiveCollection(this)(...records);
      collection.forEach(record => {
        if (record.beforeCreate) { record.beforeCreate(); }

        if (record.beforeSave) { record.beforeSave(); }

        Object.defineProperty(record, '__id__', {
          value: ++this.__idGenerator__,
        });
      });
      this.__adapter__.createAll(collection);
      collection.forEach(record => {
        if (record.afterCreate) { record.afterCreate(); }

        if (record.afterSave) { record.afterSave(); }

        Object.defineProperty(record, '__isPersisted__', {
          value: true,
        });
      });
      return collection;
    }

    const model = new this(json);
    model.save();
    return model;
  }

  static findOrCreate(json) {
    return this.find(json) || this.create(json);
  }

  static destroyAll() {
    this.__adapter__.destroyAll(this);
  }

  static hasMany(Model, opts = {}) {
    const propName = Model.modelName;
    const selfPropName = this.modelName;
    const primaryKey = opts.primaryKey || '__id__';
    const foreignKey = opts.foreignKey || selfPropName + 'Id';
    const getter = function relationGetter() {
      const query = {};
      query[foreignKey] = this[primaryKey];
      return Model.where(query);
    };

    const setter = function relationSetter(records) {
      const updater = {};
      updater[foreignKey] = this[primaryKey];
      records.forEach(record => record.update(updater));
    };

    const cachedGetter = genCachedGetter(propName, getter);
    Object.defineProperty(this.prototype, propName, {
      get: cachedGetter,
      set: setter,
    });
  }

  static belongsTo(Model, opts = {}) {
    const propName = Model.modelName;
    const primaryKey = opts.primaryKey || '__id__';
    const foreignKey = opts.foreignKey || propName + 'Id';
    const getter = function relationGetter() {
      const query = {};
      query[primaryKey] = this[foreignKey];
      return Model.find(query);
    };

    const setter = function relationSetter(record) {
      const updater = {};
      updater[foreignKey] = record[primaryKey];
      this.update(updater);
    };

    const cachedGetter = genCachedGetter(propName, getter);
    Object.defineProperty(this.prototype, propName, {
      get: cachedGetter,
      set: setter,
    });
  }
}
