const path = require('path');

const toRel = (files, sub) =>
  files
    .map((f) => path.relative(path.join(process.cwd(), sub), f).replace(/\\/g, '/'))
    .map((f) => `"${f}"`)
    .join(' ');

module.exports = {
  'backend/**/*.ts': (files) => {
    const rel = toRel(files, 'backend');
    return [
      `npm --prefix backend exec -- prettier --write ${rel}`,
      'npm --prefix backend run lint',
      `npm --prefix backend exec -- vitest related --run --passWithNoTests ${rel}`,
    ];
  },
  'frontend/**/*.{ts,tsx,js,jsx}': (files) => {
    const rel = toRel(files, 'frontend');
    return [
      `npm --prefix frontend exec -- prettier --write ${rel}`,
      'npm --prefix frontend run lint',
      `npm --prefix frontend exec -- vitest related --run --passWithNoTests ${rel}`,
    ];
  },
};
