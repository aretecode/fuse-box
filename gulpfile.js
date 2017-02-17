const gulp = require('gulp')
const rename = require('gulp-rename');

const replace = require('gulp-replace');
const ts = require('gulp-typescript');
const concat = require('gulp-concat');
const fs = require('fs');
const sourcemaps = require('gulp-sourcemaps');
const runSequence = require('run-sequence');
const bump = require('gulp-bump');
const child_process = require('child_process');
const spawn = child_process.spawn;
const wrap = require('gulp-wrap');
const uglify = require('gulp-uglify');

/**
 * Fail on error if not in watch mode
 */
let watching = false;
function onError(error) {
    if (!watching) {
        process.exit(1);
    }
}

let projectTypings = ts.createProject('src/tsconfig.json');
let projectCommonjs = ts.createProject('src/tsconfig.json');
let projectLoader = ts.createProject('src/loader/tsconfig.json');

/**
 * Used to build the fusebox modules
 * Each of these
 * - is loaded from `src/modules/${name}/index.ts`
 * - built to `modules/${name}/index.js` 
 * 
 * When adding a new module here be sure to .gitignore `modules/${name}/`
 */
const fuseboxModuleTasks = [
    'fsbx-default-css-plugin',
    'fusebox-hot-reload',
    'fusebox-websocket',
].map(fuseboxModule => {
    let project = ts.createProject('src/modules/tsconfig.json');
    const taskName = `dist-modules-${fuseboxModule}`
    gulp.task(taskName, () => {
        return gulp.src(`src/modules/${fuseboxModule}/index.ts`)
        .pipe(project()).on('error', onError).js
        .pipe(gulp.dest(`modules/${fuseboxModule}`))
    });
    return taskName;
});
gulp.task('dist-modules', fuseboxModuleTasks);

/**
 * Loader API building
 */
gulp.task('dist-loader', () => {
    return gulp.src('src/loader/LoaderAPI.ts')
        .pipe(projectLoader()).on('error', onError).js
        .pipe(wrap('(function(__root__){ <%= contents %> \nreturn __root__["FuseBox"] = FuseBox; } )(this)'))
        .pipe(rename('fusebox.js'))
        .pipe(gulp.dest('modules/fuse-box-loader-api'))
        .pipe(rename('fusebox.min.js'))
        .pipe(uglify())
        .pipe(replace(/;$/, ''))
        .pipe(replace(/^\!/, ''))
        .pipe(gulp.dest('modules/fuse-box-loader-api'))

});
gulp.task('minify-loader', function() {
    return gulp.src('modules/fuse-box-loader-api/fusebox.js')
        .pipe(uglify())
        .pipe(rename('fusebox.min.js')).pipe(gulp.dest('modules/fuse-box-loader-api'))
});

gulp.task('dist-typings', () => {
    let result = gulp.src('src/**/*.ts')
        .pipe(projectTypings());
    return result.dts.pipe(gulp.dest('dist/typings'));
});

gulp.task('dist-commonjs', () => {
    return gulp.src(['src/**/*.ts', "!./src/loader/LoaderAPI.ts", "!./src/modules/**/*.ts"])
        .pipe(sourcemaps.init())
        .pipe(projectCommonjs()).on('error', onError).js
        .pipe(gulp.dest('dist/commonjs'));
});

/**
 * Used for tests
 */
let node;
gulp.task('hello', function() {
    if (node) node.kill()
    node = spawn('node', ['hello.js'], {
        stdio: 'inherit'
    })
    node.on('close', function(code) {
        if (code === 8) {
            gulp.log('Error detected, waiting for changes...');
        }
    });
});

/**
 * NPM deploy management
 */
gulp.task('publish', function(done) {
    runSequence('dist', 'increment-version', 'commit-release', 'npm-publish', done);
});
gulp.task('increment-version', function() {
    return gulp.src('./package.json')
        .pipe(bump())
        .pipe(gulp.dest('./'));
});
gulp.task('commit-release', function(done) {
    let json = JSON.parse(fs.readFileSync(__dirname + '/package.json').toString());
    child_process.exec(`git add .; git commit -m "Release ${json.version}" -a; git tag v${json.version}; git push origin master --tags`, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
        console.log(`stderr: ${stderr}`);
        done();
    });
});
gulp.task('npm-publish', function(done) {
    var publish = spawn('npm', ['publish'], {
        stdio: 'inherit'
    })
    publish.on('close', function(code) {
        if (code === 8) {
            gulp.log('Error detected, waiting for changes...');
        }
        done()
    });
});

/**
 * Combined build task
 */
gulp.task('dist', ['dist-typings', 'dist-commonjs', 'dist-loader', 'dist-modules'], function() {});

/**
 * For development workflow
 */
gulp.task('watch', ['dist'], function() {
    watching = true;

    gulp.watch(['dist-loader/**/*.ts'], () => {
        runSequence('dist-loader');
    });
    
    gulp.watch(['src/modules/**/*.ts'], () => {
        runSequence('dist-modules');
    });

    gulp.watch(['src/**/*.ts'], () => {
        runSequence('dist-commonjs');
    });
});
