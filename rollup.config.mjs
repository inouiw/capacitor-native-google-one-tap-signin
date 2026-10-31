import { nodeResolve } from '@rollup/plugin-node-resolve';

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
  // @madauth/google-identity is ESM only and has no global build, so it is bundled into these two builds.
  // The ESM build (dist/esm) imports it, so that app bundlers share one copy.
  plugins: [nodeResolve({ resolveOnly: ['@madauth/google-identity'] })],
  external: ['@capacitor/core', 'scriptjs', 'jwt-decode'],
};
