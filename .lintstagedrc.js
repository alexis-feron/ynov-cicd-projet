const path = require('path');

const quote = (files) => files.map((f) => `"${f.replace(/\\/g, '/')}"`).join(' ');

const toRel = (files, sub) =>
  files
    .map((f) => path.relative(path.join(process.cwd(), sub), f).replace(/\\/g, '/'))
    .map((f) => `"${f}"`)
    .join(' ');

module.exports = {
  'backend/**/*.ts': (files) => {
    const abs = quote(files);
    const rel = toRel(files, 'backend');
    return [
      `npx prettier --write ${abs}`,
      'npm --prefix backend run lint',
      `npm --prefix backend exec -- vitest related --run --passWithNoTests ${rel}`,
    ];
  },
  'frontend/**/*.{ts,tsx,js,jsx}': (files) => {
    const abs = quote(files);
    const rel = toRel(files, 'frontend');
    return [
      `npx prettier --write ${abs}`,
      'npm --prefix frontend run lint',
      `npm --prefix frontend exec -- vitest related --run --passWithNoTests ${rel}`,
    ];
  },
};
