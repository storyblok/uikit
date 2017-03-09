var fs          = require('fs');
var path        = require('path');
var glob        = require('glob');
var gulp        = require('gulp');
var rename      = require('gulp-rename');
var replace     = require('gulp-replace');
var sass        = require('gulp-sass');
var Promise     = require('promise');

gulp.task('styles', function () {
  return gulp.src('./src/scss/uikit.scss')
             .pipe(sass())
             .pipe(gulp.dest('./dist/css/'))
});

gulp.task('sass-copy', function() {
  return gulp.src('./src/less/**/*.less').pipe(rename(function (path) {
    path.extname = ".scss";
  })).pipe(gulp.dest('./src/scss'));
});

gulp.task('sass-convert', ['sass-copy'], function() {

  return gulp.src('./src/scss/**/*.scss')
             .pipe(replace(/\/less\//g, '/scss/'))                              // change less/ dir to scss/ on imports
             .pipe(replace(/\.less/g, '.scss'))                                 // change .less extensions to .scss on imports
             .pipe(replace(/@/g, '$'))                                          // convert variables
             .pipe(replace(/\\\$/g, '@'))                                       // convert variables
             .pipe(replace(/ e\(/g, ' unquote('))                               // convert escape function
             .pipe(replace(/\.([\w\-]*)\s*\((.*)\)\s*\{/g, '@mixin $1($2){'))   // hook -> mixins
             .pipe(replace(/\.svg-fill/g, '@svg-fill'))   // hook -> mixins
             .pipe(replace(/when \(/g, '@if ('))   // hook -> mixins
             .pipe(replace(/@mixin ([\w\-]*)\s*\((.*)\)\s*\{\s*\}/g, '// @mixin $1($2){}'))   // comment empty mixins
             .pipe(replace(/\.(hook[a-zA-Z\-\d]+);/g, '@include $1();'))        // hook calls
             .pipe(replace(/\$(import|media|font-face|page|-ms-viewport|keyframes|-webkit-keyframes)/g, '@$1')) // replace valid '@' statements
             .pipe(replace(/(\$[\w\-]*)\s*:(.*);\n/g, '$1: $2 !default;\n'))    // make variables optional
             .pipe(replace(/\$\{/g, '#{$'))                                     // string literals: from: /~"(.*)"/g, to: '#{"$1"}'
             .pipe(replace(/~('[^']+')/g, 'unquote($1)'))                       // string literals: for real
             .pipe(replace(/:extend\((.*?)\)/g,"{@extend $1}"))
             .pipe(replace(/@extend\s*(.*?)\s*?all/g,"@extend $1;"))
             .pipe(replace(/@s /g,"\\@s "))
             .pipe(replace(/@m /g,"\\@m "))
             .pipe(replace(/@l /g,"\\@l "))
             .pipe(replace(/@xl /g,"\\@xl "))
             .pipe(replace(/@s,/g,"\\@s,"))
             .pipe(replace(/@m,/g,"\\@m,"))
             .pipe(replace(/@l,/g,"\\@l,"))
             .pipe(replace(/@xl,/g,"\\@xl,"))
             .pipe(replace('@if ($inverse-global-color-mode = light)',""))
             .pipe(replace('@if ($inverse-global-color-mode = dark)',""))
             .pipe(replace('@import "components/_import.components.scss";','@import "uikit-mixins.scss";\n@import "components/variables.scss";\n@import "uikit-variables.scss";\n@import "components/_import.components.scss";'))
             .pipe(replace('$supports (-webkit-background-clip: text)','.supports-background-clip'))
             .pipe(gulp.dest('./src/scss'));
});

gulp.task('sass', ['sass-convert'], function(done) {

  glob('./src/scss/**/*.scss', function (err, files) {

    if (err) return;

    var re     = /\/\/ @mixin ([\w\-]*)\s*\((.*)\)\s*\{\s*\}/g,
    mixins = [],
    promises = [],
    cache = {};

    files.forEach(function(file) {

      promises.push(new Promise(function(resolve, reject){


        fs.readFile(file, {encoding: 'utf-8'},function read(err, content) {

          if (err) throw err;

          var matches, tmp;

          while(matches = re.exec(content)) {

            tmp = matches[0].replace(/\/\/\s*/, '');

            if (!cache[tmp]) {
              mixins.push(String(tmp));
              cache[tmp] = true;
            }
          }

          resolve();
        });

      }));
    });

    Promise.all(promises).then(function(){
      fs.writeFile('./src/scss/uikit-mixins.scss', mixins.join('\n'), function (err) {
        if (err) throw err;
        done();
      });
    });
  });
});

gulp.task('dist-variables', function(done) {

  var regexp  = /(@[\w\-]+\s*:(.*);?)/g, variables = [], promises = [], cache = {};

  glob('./src/less/**/*.less', function (err, files) {

    files.forEach(function(file, index){

      promises.push(new Promise(function(resolve, reject) {

        fs.readFile(file, "utf-8", function(err, data) {

          var matches, tmp;

          while(matches = regexp.exec(data)) {
            tmp = matches[0].split(':')[0].trim();

            if (!cache[tmp]) {
              variables.push(matches[0]);
              cache[tmp] = true;
            }
          }

          resolve();
        });
      }));
    });

    Promise.all(promises).then(function(){

      fs.writeFile('./src/less-variables/uikit-variables.less', variables.join('\n'), function (err) {
        if (err) throw err;
        done();
      });
    });
  });
});