const babel = require('babel-core');

module.exports = {
  process: function(src, filename) {
    // Ignore all files within node_modules
    if (filename.indexOf('node_modules') !== -1) {
      return src;
    }

    var transformedCode;

    try {
      transformedCode = babel.transform(src, {
        filename: filename,
        presets: ['es2015'],
        retainLines: true,
      }).code;
    } catch (e) {
      console.log(e);
    }

    return transformedCode;
  },
};
