import fs from 'fs';

// remove jest.config.json after test
if (fs.existsSync('jest.config.json')) {
  fs.unlinkSync('jest.config.json');
}
