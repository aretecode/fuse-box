// const {compile} = require('google-closure-compiler-js');
//
// class ClosurePluginClass {
//   constructor(config) {
//     this.config = config || {};
//     this.test = /\.(j|t)s(x)?$/
//
//     if (config.test !== undefined) {
//       this.test = config.test;
//       delete config.test;
//     }
//   }
//
//   init(context) {
//     this.context = context;
//     context.allowExtension('.jsx');
//   }
//
//   transform(file, ast) {
//     const flags = {
//       jsCode: [{src: file.contents}],
//     };
//     const result = compile(flags);
//     file.contents = result.compiledCode;
//   }
// }
//
// export const ClosurePlugin = (opts: any) => {
//   return new ClosurePluginClass(opts);
// };
