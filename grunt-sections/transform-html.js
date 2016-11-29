'use strict';

var fs = require('fs');
var extend = require('util')._extend;
var featureDetector = require('../feature-detector');

module.exports = function (grunt) {
  function arrayToObj(arr) {
    return typeof arr.reduce === 'function' ? arr.reduce(function (obj, replace) {
      if (typeof replace.from === 'string') {
        obj[replace.from] = replace.to;
      } else {
        obj.$$preserve.push(replace);
      }
      return obj;
    }, { $$preserve: [] }) : arr;
  }

  function objToArray(obj) {
    var arr = obj.$$preserve || [];
    for (var key in obj) {
      if (key !== '$$preserve') {
        arr.push({ from: key, to: obj[key] });
      }
    }
    return arr;
  }

  function loadReplacements() {
    var preserve, replacements = {};

    var replaceConfPath = process.cwd() + '/replace.conf.js';
    var replacePrivateConfPath = process.cwd() + '/replace.private.conf.js';
    if (fs.existsSync(replaceConfPath)) {
      extend(replacements, arrayToObj(require(replaceConfPath)));
      preserve = replacements.$$preserve;
      if (fs.existsSync(replacePrivateConfPath)) {
        extend(replacements, arrayToObj(require(replacePrivateConfPath)));
        if (preserve) {
          replacements.$$preserve = preserve.concat(replacements.$$preserve);
        }
      }
    }
    return objToArray(replacements);
  }

  function loadVelocityData() {
    var object = {};
    try {
      extend(object, require(process.cwd() + '/velocity.data.js'));
      extend(object, require(process.cwd() + '/velocity.private.data.js'));
    } catch (e) {
    }
    return object;
  }

  function tryToLoadReplacements() {
    var replacements = {};
    if (fs.existsSync(process.cwd() + '/replace.conf.js')) {
      extend(replacements, require(process.cwd() + '/replace.conf.js'));
    }
    return replacements;
  }

  grunt.registerTask('hamlIfEnabled', function () {
    if (grunt.task.exists('haml') && featureDetector.isHamlEnabled()) {
      grunt.task.run('newer:haml');
    }
  });

  grunt.registerTask('replaceOrVelocity', function () {
    if (grunt.task.exists('replace') && !featureDetector.isVelocityEnabled()) {
      grunt.task.run('replace:dist');
    } else {
      grunt.task.run('velocity:dist');
    }
  });

  return {
    ejs: {
      serve: {
        options: tryToLoadReplacements(),
        src: 'app/index.ejs',
        dest: '.tmp/index.html',
      },
      dist: {
        options: extend(tryToLoadReplacements(), { debug: false }),
        src: 'dist/index.ejs',
        dest: 'dist/index.html',
      }
    },
    replace: {
      dist: {
        src: ['app/*.vm'],
        dest: '.tmp/',
        replacements: loadReplacements()
      },
      wixStyleToBrackets: {
        src: ['.tmp/{styles,modules}/**/*.css'],
        overwrite: true,
        replacements: [{
          from: /font: ?; ?{{([^}]+)}};/g,
          to: 'font: [[$1]];'
        }, {
            from: /{{([^}]+)}}/g,
            to: '[[$1]]'
          }]
      },
      wixStyleToCurlies: {
        src: ['.tmp/{styles,modules}/**/*.css'],
        overwrite: true,
        replacements: [{
          from: /font: \[\[([^\]]+)\]\];/g,
          to: 'font:;{{$1}};'
        }, {
            from: /\[\[([^\]}]+)\]\]/g,
            to: '{{$1}}'
          }]
      }
    },
    velocity: {
      dist: {
        options: {
          data: loadVelocityData()
        },
        files: [{
          expand: true,
          cwd: 'app',
          src: '*.vm',
          dest: '.tmp'
        }]
      }
    },
    haml: {
      dist: {
        options: {
          bundleExec: true
        },
        files: [{
          expand: true,
          cwd: 'app',
          src: '{views,modules}/**/*.haml',
          dest: '.tmp',
          ext: '.html',
          extDot: 'last'
        }]
      }
    }
  };
};
