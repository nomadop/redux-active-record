import templateConfig from './jest.config';
import fs from 'fs';
import path from 'path';

// create jest.config.json before test
// Jest's "collectCoverageOnlyFrom" config allows only specific files.
// We want coverage for all files under director "src"

const arrayToObject = (array) => {
  const entries = array.map((p) => {
    return { [p]: true };
  });
  return Object.assign({}, ...entries);
};

const listFiles = (dir) => {
  return fs.readdirSync(dir).reduce((accu, f) => {
    const file = path.join(dir, f);
    const isFile = !(fs.statSync(file).isDirectory());

    // for .js files only
    if (isFile && !f.match(/\.js$/)) {
      return accu;
    }

    return accu.concat(isFile ? file : listFiles(file));
  }, []);
};

const modulePathArray = listFiles('src');
templateConfig.collectCoverageOnlyFrom = arrayToObject(modulePathArray);

fs.writeFileSync('jest.config.json', JSON.stringify(templateConfig));
