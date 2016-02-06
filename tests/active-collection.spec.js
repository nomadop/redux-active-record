import { createStore } from 'redux';
import ReduxActiveRecord from '../src/redux-active-record';
import ActiveModel from '../src/active-model';
import { createActiveCollection } from '../src/active-collection';

function rejectArray(array, ...elements) {
  return array.filter(element => {
    return elements.indexOf(element) === -1;
  });
}

describe('Utility | Redux Active Record | Active Collection', () => {
  class MyModel extends ActiveModel {}
  const reduxActiveRecord = new ReduxActiveRecord();
  const finalCreateStore = reduxActiveRecord.synchronise(MyModel)(createStore);
  finalCreateStore();

  const model1 = MyModel.create({ name: 'model 1' });
  const model2 = MyModel.create({ name: 'model 2' });
  const model3 = MyModel.create({ name: 'model 3' });

  let activeCollection;
  beforeEach(() => {
    activeCollection = createActiveCollection(MyModel)(model1, model2, model3);
  });

  it('should have property same as array', () => {
    let collectionPropertyNames = Object.getOwnPropertyNames(createActiveCollection()());
    collectionPropertyNames = rejectArray(collectionPropertyNames, '__adapter__', '__activeModel__', 'toArray');
    let arrayPropertyNames = Object.getOwnPropertyNames(Array.prototype);
    arrayPropertyNames = rejectArray(arrayPropertyNames, 'constructor', 'toString', 'toLocaleString');
    expect(collectionPropertyNames.sort()).toEqual(arrayPropertyNames.sort());
  });

  it('should throw error if create with non-active-model object', () => {
    expect(
      () => {
        createActiveCollection()(1, 2, 3);
      }
    ).toThrow();
  });

  it('should get element as array', () => {
    expect(activeCollection[0]).toBe(model1);
    expect(activeCollection[1]).toBe(model2);
    expect(activeCollection[2]).toBe(model3);
  });

  it('should respond to length', () => {
    expect(activeCollection.length).toBe(3);
  });

  it('should set element as array in range', () => {
    const newModel = new MyModel({ name: 'new model' });
    activeCollection[0] = newModel;
    expect(activeCollection.toArray()).toEqual([newModel, model2, model3]);
  });

  it('should not set element as array out range', () => {
    const newModel = new MyModel({ name: 'new model' });
    activeCollection[4] = newModel;
    expect(activeCollection.toArray()).toEqual([model1, model2, model3]);
  });

  it('should respond to push', () => {
    const newModel = new MyModel({ name: 'new model' });
    activeCollection.push(newModel);
    expect(activeCollection.toArray()).toEqual([model1, model2, model3, newModel]);
  });

  it('should throw error if push non-active-model object', () => {
    expect(
      () => {
        activeCollection.push(1);
      }
    ).toThrow();
  });

  it('should respond to map', () => {
    expect(activeCollection.map(record => record.name)).toEqual(['model 1', 'model 2', 'model 3']);
  });

  it('should respond to filter', () => {
    expect(activeCollection.filter(record => record.name === 'model 1').toArray()).toEqual([model1]);
  });

  it('should be equal to MyModel.all', () => {
    expect(activeCollection).toEqual(MyModel.all());
  });

  it('should respond to updateAll', () => {
    activeCollection.updateAll({ age: 1 });
    expect(activeCollection.toArray()).toEqual([
      { name: 'model 1', age: 1 },
      { name: 'model 2', age: 1 },
      { name: 'model 3', age: 1 },
    ]);
  });

  it('should respond to save', () => {
    model2.age = 2;
    model3.age = 3;
    activeCollection.save();
    expect(MyModel.all().toArray()).toEqual([
      { name: 'model 1', age: 1 },
      { name: 'model 2', age: 2 },
      { name: 'model 3', age: 3 },
    ]);
  });
});
