export default {
  input: 'dist/esm/index.js',
  output: [
    {
      file: 'dist/plugin.js',
      format: 'iife',
      name: 'capacitorNativeGoogleOneTapSignin',
      globals: {
        '@capacitor/core': 'capacitorExports',
        'scriptjs': 'scriptjs',
        'jwt-decode': 'jwtDecode',
      },
      sourcemap: true,
      inlineDynamicImports: true,
    },
    {
      file: 'dist/plugin.cjs.js',
      format: 'cjs',
      sourcemap: true,
      inlineDynamicImports: true,
    },
  ],
  external: ['@capacitor/core', 'scriptjs', 'jwt-decode'],
};
