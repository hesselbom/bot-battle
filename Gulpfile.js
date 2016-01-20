var gulp = require('gulp');
var sass = require('gulp-sass');
var jade = require('gulp-jade');
var connect = require('gulp-connect');
var iconfont = require('gulp-iconfont');
var iconfontCss = require('gulp-iconfont-css');
var runTimestamp = Math.round(Date.now()/1000);
var del = require('del');
var autoprefixer = require('gulp-autoprefixer');
var pixrem = require('gulp-pixrem');
var inject = require('gulp-inject');
var fs = require("fs");

gulp.task('clean:prod', function () {
  return del(['prod/*']);
});

gulp.task('iconfont', function(){
    gulp.src('fonts/**/*', {base: './fonts'})
        .pipe(gulp.dest('./.tmp/fonts/'));

  return gulp.src(['icons/*.svg'])
    .pipe(iconfontCss({
      fontName: 'icons',
      path: 'sass/templates/_icons.scss',
      targetPath: '../../sass/_icons.scss',
      fontPath: '../fonts/'
    }))
    .pipe(iconfont({
      fontName: 'icons', // required 
      appendUnicode: true, // recommended option 
      formats: ['ttf', 'eot', 'woff'], // default, 'woff2' and 'svg' are available 
      timestamp: runTimestamp, // recommended to get consistent builds when watching files 
    }))
    .on('glyphs', function(glyphs, options) {
        // CSS templating, e.g. 
        console.log(glyphs, options);
    })
    .pipe(gulp.dest('./.tmp/fonts/'));
});

gulp.task('styles', function() {
    gulp.src('sass/**/*.s[ac]ss')
        .pipe(sass().on('error', sass.logError))
        .pipe(gulp.dest('./.tmp/css/'));

    gulp.src('css/**/*', {base: './css'})
        .pipe(gulp.dest('./.tmp/css/'));
});

gulp.task('templates', function() {
    gulp.src('jade/**/!(_)*.jade')
        .pipe(jade())
        .pipe(gulp.dest('./.tmp/'))
});

gulp.task('scripts', function() {
    gulp.src('js/**/*.js', {base: './js'})
        .pipe(gulp.dest('./.tmp/js/'));
    gulp.src('js/**/*.map', {base: './js'})
        .pipe(gulp.dest('./.tmp/js/'));
});

gulp.task('images', function() {
    gulp.src('img/**/*', {base: './img'})
        .pipe(gulp.dest('./.tmp/img/'));
    gulp.src('media/**/*', {base: './media'})
        .pipe(gulp.dest('./.tmp/media/'));
});

gulp.task('inject-bots', function() {
    gulp.src('./jade/index.jade')
        .pipe(inject(gulp.src(['./js/bots/*.js'], {read: false}), {
            starttag: '// Inject bots',
            endtag: '// /Inject bots',
            transform: function (filepath, file, i, length) {
                var fileContent = fs.readFileSync('.' + filepath, 'utf8');
                var imgMatch = (/image\s*:\s*['"](.+)['"]/gi.exec(fileContent));
                var image = imgMatch[1];
                var name = filepath.substring('/js/bots/'.length, filepath.length - '.js'.length);
                return 'li: a(data-bot="'+name+'").button' +
                    '\n            img(src="'+image+'")' +
                    '\n            span ' + name;
            }
        }))
        .pipe(gulp.dest('./jade/'));
});

gulp.task('inject-sass', function() {
    gulp.src('./sass/style.sass')
        .pipe(inject(gulp.src([
                './sass/**/*.s[ac]ss',
                '!./sass/libs/**/*',
                '!./sass/templates/**/*',
                '!./sass/style.s[ac]ss',
                '!./sass/_settings.s[ac]ss'], {read: false}), {
            starttag: '// inject',
            endtag: '// endinject',
            transform: function (filepath, file, i, length) {
                return '@import ' + filepath
                    .substring('/sass/'.length, filepath.length - '.sass'.length)
                    .replace('_', '');
            }
        }))
        .pipe(gulp.dest('./sass/'));
});

// Prod

gulp.task('copy:prod', ['clean:prod', 'build:dev'], function(){
    gulp.src('.tmp/fonts/**/*', {base: './.tmp/fonts'})
        .pipe(gulp.dest('./prod/fonts/'));

    gulp.src('.tmp/img/**/*', {base: './.tmp/img'})
        .pipe(gulp.dest('./prod/img/'));
    gulp.src('.tmp/media/**/*', {base: './.tmp/media'})
        .pipe(gulp.dest('./prod/media/'));

    gulp.src('.tmp/js/**/*.js', {base: './.tmp/js'})
        .pipe(gulp.dest('./prod/js/'));

    gulp.src('css/**/*', {base: './css'})
        .pipe(gulp.dest('./prod/css/'));
});

gulp.task('styles:prod', ['clean:prod'], function() {
    gulp.src('sass/**/*.s[ac]ss')
        .pipe(sass({outputStyle: 'compressed'}).on('error', sass.logError))
        .pipe(autoprefixer({
            browsers: ['last 2 versions', 'ie 6-8'],
            cascade: false
        }))
        .pipe(pixrem())
        .pipe(gulp.dest('prod/css/'));
});

gulp.task('templates:prod', function() {
    gulp.src('jade/**/!(_)*.jade')
        .pipe(jade({
            pretty: true
        }))
        .pipe(gulp.dest('prod/'))
});

gulp.task('webserver', function() {
    connect.server({
        port: 1234,
        root: ['.tmp']
    });
});

gulp.task('watch',function() {
    gulp.watch(['sass/**/*.s[ca]ss', '!sass/style.s[ca]ss'], ['inject-sass']);
    gulp.watch('sass/style.s[ca]ss', ['styles']);
    gulp.watch('css/**/*', ['styles']);
    gulp.watch('jade/**/*.jade', ['templates']);
    gulp.watch('js/**/*.js', ['scripts']);
    gulp.watch('img/**/*', ['images']);
    gulp.watch('media/**/*', ['images']);
    gulp.watch('icons/**/*', ['iconfont']);
    gulp.watch('fonts/**/*', ['iconfont']);
});

gulp.task('build:dev', ['iconfont', 'images', 'scripts', 'inject-bots', 'templates', 'inject-sass', 'styles']);
gulp.task('default', ['build:dev', 'webserver', 'watch']);
gulp.task('build', ['clean:prod', 'build:dev', 'copy:prod', 'templates:prod', 'styles:prod']);
