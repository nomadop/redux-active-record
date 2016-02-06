import { extractProps } from './helpers';

function actionTypeFor(modelOrCollection, action) {
  const modelName = modelOrCollection.modelName;
  return `${action.toUpperCase()}_${modelName.toUpperCase()}_MODEL`;
}

function createModel(model) {
  return {
    type: actionTypeFor(model, 'create'),
    model,
  };
}

function createAllModel(collection) {
  return {
    type: actionTypeFor(collection, 'createAll'),
    collection,
  };
}

function updateModel(model) {
  return {
    type: actionTypeFor(model, 'update'),
    id: model.__id__,
    json: extractProps(model, model, false),
  };
}

function updateAllModel(collection, json) {
  return {
    type: actionTypeFor(collection, 'updateAll'),
    collection,
    json,
  };
}

function destroyModel(model) {
  return {
    type: actionTypeFor(model, 'destroy'),
    id: model.__id__,
  };
}

function destroyAllModel(model) {
  return {
    type: actionTypeFor(model, 'destroyAll'),
  };
}

class ReduxAdapter {
  constructor(store) {
    this.store = store;
  }

  getRecords(modelName) {
    const state = this.store.getState();
    const activeState = state.__activeRecord__;
    return modelName ? activeState[modelName] : activeState;
  }

  create(model) {
    this.store.dispatch(createModel(model));
  }

  createAll(collection) {
    if (!collection.length) {
      return;
    }

    this.store.dispatch(createAllModel(collection));
  }

  update(model) {
    this.store.dispatch(updateModel(model));
  }

  updateAll(collection, json) {
    if (!collection.length) {
      return;
    }

    this.store.dispatch(updateAllModel(collection, json));
  }

  destroy(model) {
    this.store.dispatch(destroyModel(model));
  }

  destroyAll(model) {
    this.store.dispatch(destroyAllModel(model));
  }
}

export default class ReduxActiveRecord {
  getModelReducers() {
    return this.models.map(model => {
      return {
        modelName: model.modelName,
        reducer: (state = [], action) => {
          let newState;
          switch (action.type) {
          case actionTypeFor(model, 'create'):
            newState = state.slice();
            const _model = action.model;
            newState.push(Object.assign({ __id__: _model.__id__ }, extractProps(_model, _model, false)));
            return newState;
          case actionTypeFor(model, 'createAll'):
            newState = state.slice();
            action.collection.forEach(record => {
              newState.push(Object.assign({ __id__: record.__id__ }, extractProps(record, record, false)));
            });
            return newState;
          case actionTypeFor(model, 'update'):
            return state.map(record => {
              if (record.__id__ === action.id) {
                return Object.assign({}, record, action.json);
              }

              return record;
            });
          case actionTypeFor(model, 'updateAll'):
            newState = state.slice();
            action.collection.forEach(record => {
              const storeRecord = newState.find(r => r.__id__ === record.__id__);
              const json = action.json || extractProps(record, record, false);
              if (storeRecord) {
                Object.assign(storeRecord, json);
              } else {
                newState.push(Object.assign({ __id__: record.__id__ }, json));
              }
            });
            return newState;
          case actionTypeFor(model, 'destroy'):
            newState = state.slice();
            const index = newState.findIndex(record => record.__id__ === action.id);
            if (index >= 0) {
              newState.splice(index, 1);
            }

            return newState;
          case actionTypeFor(model, 'destroyAll'):
            return [];
          default:
            return state;
          }
        },
      };
    });
  }

  getAdapter() {
    if (!this.adapter) {
      this.adapter = new ReduxAdapter(this.store);
    }

    return this.adapter;
  }

  getActiveReducer() {
    return (state = {}, action) => {
      const modelReducers = this.getModelReducers();

      return modelReducers.reduce((result, modelReducer) => {
        const modelName = modelReducer.modelName;
        const reducer = modelReducer.reducer;
        result[modelName] = reducer(state[modelName], action);
        return result;
      }, {});
    };
  }

  injectReducer(reducer) {
    const activeReducer = this.getActiveReducer();
    if (reducer) {
      return (state = {}, action) => {
        const newState = Object.assign({}, state);
        const activeReduced = activeReducer(newState.__activeRecord__, action);
        delete newState.__activeRecord__;
        const originalReduced = reducer(newState, action);
        return Object.assign({}, originalReduced, { __activeRecord__: activeReduced });
      };
    }

    return (state = {}, action) => {
      return {
        __activeRecord__: activeReducer(state.__activeRecord__, action),
      };
    };
  }

  synchronise() {
    this.models = Array.apply(null, arguments);

    return (createStore) => {
      return (reducer) => {
        const injectedReducer = this.injectReducer(reducer);
        this.store = createStore(injectedReducer);
        this.models.forEach(model => {
          model.__idGenerator__ = 0;
          model.__adapter__ = this.getAdapter();
        });
        return this.store;
      };
    };
  }

  getModel(name) {
    return this.models.find(model => model.modelName === name);
  }

  static synchronise() {
    const reduxActiveRecord = new this();
    this.instance = reduxActiveRecord;
    return reduxActiveRecord.synchronise(...arguments);
  }

  static getInstance() {
    return this.instance;
  }

  static getModel(name) {
    return this.instance.getModel(name);
  }
}
