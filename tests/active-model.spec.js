import { createStore } from 'redux';
import ReduxActiveRecord from '../src/redux-active-record';
import ActiveModel from '../src/active-model';

describe('Utility | Redux Active Record | Active Model', () => {
  const beforeSaveFunc = jest.genMockFunction();
  const afterSaveFunc = jest.genMockFunction();
  const beforeCreateFunc = jest.genMockFunction();
  const afterCreateFunc = jest.genMockFunction();
  class User extends ActiveModel {
    beforeSave() {
      beforeSaveFunc();
    }

    afterSave() {
      afterSaveFunc();
    }

    beforeCreate() {
      beforeCreateFunc();
    }

    afterCreate() {
      afterCreateFunc();
    }

    get nameAge() {
      return `${this.name}${this.age}`;
    }
  }
  const reduxActiveRecord = new ReduxActiveRecord();
  const finalCreateStore = reduxActiveRecord.synchronise(User)(createStore);
  finalCreateStore();

  let user;
  let anotherUser;
  beforeEach(() => {
    User.destroyAll();
    user = User.create({ name: 'a', age: 1 });
    anotherUser = User.create({ name: 'b', age: 2 });
  });

  it('should call before and after create callback', () => {
    expect(beforeCreateFunc).toBeCalled();
    expect(afterCreateFunc).toBeCalled();
  });

  it('should to json', () => {
    expect(user.jsonData).toEqual({ name: 'a', age: 1, nameAge: 'a1' });
  });

  it('should create from array', () => {
    User.destroyAll();
    expect(User.all().length).toEqual(0);

    User.create([
      { name: 'a', age: 1 },
      { name: 'b', age: 2 },
    ]);
    expect(User.all().length).toEqual(2);
  });

  it('should find all', () => {
    expect(User.all().toArray()).toEqual([user, anotherUser]);
  });

  it('should destroy all', () => {
    User.destroyAll();

    expect(User.all().toArray()).toEqual([]);
  });

  it('should find by id', () => {
    expect(User.find(user.__id__)).toEqual(user);
  });

  it('should not find by non-existent id', () => {
    expect(User.find(0)).not.toBeDefined();
  });

  it('should destroy record', () => {
    user.destroy();

    expect(User.all().toArray()).toEqual([anotherUser]);
    expect(User.find(user.__id__)).not.toBeDefined();
  });

  it('should select by props', () => {
    expect(User.where({ age: 1 }).toArray()).toEqual([user]);
  });

  it('should select by props range', () => {
    expect(User.where({ age: [1, 2] }).toArray()).toEqual([user, anotherUser]);
  });

  it('should be empty when select by non-existent props', () => {
    expect(User.where({ age: 123 }).toArray()).toEqual([]);
  });

  it('should find by props', () => {
    expect(User.find({ age: 1 })).toEqual(user);
  });

  it('should not find by non-existent props', () => {
    expect(User.find({ name: 'abcde' })).not.toBeDefined();
  });

  it('should find or create by props', () => {
    expect(User.findOrCreate({ name: 'a', age: 1 })).toEqual(user);

    const newUser = User.findOrCreate({ name: 'c', age: 2 });
    expect(User.find(newUser.__id__)).toEqual(newUser);
  });

  it('should update props', () => {
    user.update({ name: 'abc' });

    expect(user.name).toEqual('abc');
    expect(User.find(user.__id__).name).toEqual('abc');
  });

  it('should save changes', () => {
    user.name = 'def';
    user.age = 123;
    user.save();

    expect(user.jsonData).toEqual({ name: 'def', age: 123, nameAge: 'def123' });
    expect(User.find(user.__id__).jsonData).toEqual({ name: 'def', age: 123, nameAge: 'def123' });
  });

  it('should call before and after save callback', () => {
    expect(beforeSaveFunc).toBeCalled();
    expect(afterSaveFunc).toBeCalled();
  });
});

describe('Utility | Redux Active Record | Active Relationship', () => {
  class User extends ActiveModel {}
  User.modelName = 'user';
  class Account extends ActiveModel {}
  Account.modelName = 'account';
  User.hasMany(Account);
  Account.belongsTo(User);
  const reduxActiveRecord = new ReduxActiveRecord();
  const finalCreateStore = reduxActiveRecord.synchronise(
    User,
    Account
  )(createStore);
  finalCreateStore();

  let user;
  let account;
  beforeEach(() => {
    User.destroyAll();
    user = User.create({ name: 'a', age: 1 });
    Account.destroyAll();
    account = Account.create({ amount: 100 });
  });

  it('should create setter by hasMany', () => {
    expect(account.userId).not.toBeDefined();
    user.account = [account];
    expect(account.userId).toEqual(user.__id__);
  });

  it('should create setter by belongsTo', () => {
    expect(account.userId).not.toBeDefined();
    account.user = user;
    expect(account.userId).toEqual(user.__id__);
  });

  it('should create getter by hasMany', () => {
    expect(user.account.toArray()).toEqual([]);
    account.update({ userId: user.__id__ });
    expect(user.account.toArray()).toEqual([account]);
  });

  it('should create getter by belongsTo', () => {
    expect(account.user).not.toBeDefined();
    account.update({ userId: user.__id__ });
    expect(account.user).toEqual(user);
  });

  it('should create cachedGetter by hasMany', () => {
    account.update({ userId: user.__id__ });
    expect(user.account.toArray()).toEqual([{ amount: 100, userId: user.__id__ }]);
    account.update({ userId: -1 });
    expect(user.account.toArray()).toEqual([{ amount: 100, userId: user.__id__ }]);
    expect(user.reload.account.toArray()).toEqual([]);
  });

  it('should create cachedGetter by belongsTo', () => {
    account.update({ userId: user.__id__ });
    expect(account.user).toEqual(user);
    account.update({ userId: -1 });
    expect(account.user).toEqual(user);
    expect(account.reload.user).not.toBeDefined();
  });

  it('should inject toJSON method by hasMany', () => {
    user.account = [account];
    expect(user.jsonData).toEqual({
      name: 'a',
      age: 1,
      account: [account],
    });
  });

  it('should inject toJSON method by belongsTo', () => {
    account.user = user;
    expect(account.jsonData).toEqual({
      amount: 100,
      user: user,
      userId: user.__id__,
    });
  });
});
