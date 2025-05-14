"use strict";

const { src, dest, watch, series, parallel } = require("gulp");

const sass = require("gulp-sass")(require("sass"));
const prefix = require("gulp-autoprefixer");
const minify = require("gulp-clean-css");
const terser = require("gulp-terser");
const imagemin = require("gulp-imagemin");
const pug = require("gulp-pug");
const rename = require("gulp-rename");
const svgstore = require("gulp-svgstore");
const browserSync = require("browser-sync").create();
const concat = require("gulp-concat");
const cheerio = require("gulp-cheerio");
const fs = require("fs");
const path = require("path");

// Compile SCSS
function compilescss() {
  return src("./app/assets/scss/style.scss")
    .pipe(sass())
    .pipe(prefix())
    .pipe(minify())
    .pipe(dest("./build/assets/css"))
    .pipe(browserSync.stream());
}

// Minify and Concatenate JS
function jsmin() {
  return src([
    "./app/assets/js/dep/**/*.js",
    "./app/assets/js/lib/**/*.js",
    "./app/assets/js/app.js",
  ])
    .pipe(concat("app.min.js"))
    .pipe(terser())
    .pipe(dest("./build/assets/js"))
    .on("end", () => browserSync.reload());
}

// Optimize Images
function optimiseimg() {
  return src("./app/assets/images/**/*")
    .pipe(
      imagemin([
        imagemin.mozjpeg({ quality: 80, progressive: true }),
        imagemin.optipng({ optimizationLevel: 2 }),
        imagemin.gifsicle({ interlaced: true }),
      ])
    )
    .pipe(dest("./build/assets/images"))
    .on("end", () => browserSync.reload());
}

// Compile Pug to HTML
function compilePug() {
  return src("./app/views/pages/**/*.pug")
    .pipe(
      pug({
        pretty: true,
      })
    )
    .pipe(dest("./build"))
    .on("end", () => browserSync.reload());
}

// Generate SVG Sprite (with empty fallback)
function svgMap(done) {
  const svgDir = "./app/assets/svg/";
  const outputDir = "./build/assets/svg/";
  const hasSVGs =
    fs.existsSync(svgDir) &&
    fs.readdirSync(svgDir).some((file) => file.endsWith(".svg"));

  if (!hasSVGs) {
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(path.join(outputDir, "svg-sprite.svg"), "");
    console.log("⚠️  No SVG files found. Created an empty svg-sprite.svg.");
    browserSync.reload();
    return done();
  }

  return src(`${svgDir}*.svg`)
    .pipe(
      cheerio({
        run: ($) => {
          $("[fill]").removeAttr("fill");
          $("[class]").removeAttr("class");
          $("[style]").removeAttr("style");
        },
        parserOptions: { xmlMode: true },
      })
    )
    .pipe(rename({ prefix: "icon-" }))
    .pipe(svgstore())
    .pipe(rename({ basename: "svg-sprite" }))
    .pipe(dest(outputDir))
    .on("end", () => browserSync.reload());
}

// Serve and Reload with BrowserSync
function serveTask(done) {
  browserSync.init({
    server: {
      baseDir: "./build",
    },
    port: 8000,
  });
  done();
}

// Watch for changes
function watchTask() {
  watch("./app/assets/scss/**/*.scss", compilescss);
  watch("./app/assets/js/**/*.js", jsmin);
  watch("./app/assets/images/**/*", optimiseimg);
  watch("./app/views/**/*.pug", compilePug);
  watch("./app/assets/svg/**/*.svg", svgMap);
}

// Default task
exports.default = series(
  compilescss,
  jsmin,
  optimiseimg,
  compilePug,
  svgMap,
  parallel(serveTask, watchTask)
);

// Export specific task
exports.svgMap = svgMap;
