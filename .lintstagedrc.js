module.exports = {
  'backend/**/*.ts': (files) => {
    const filePaths = files.join(' ');
    return [
      `cd backend && npx prettier --write ${filePaths}`,
      'cd backend && npm run lint',
      `cd backend && npx vitest related --run --passWithNoTests ${filePaths}`
    ];
  },
  'frontend/**/*.{ts,tsx,js,jsx}': (files) => {
    const filePaths = files.join(' ');
    return [
      `cd frontend && npx prettier --write ${filePaths}`,
      'cd frontend && npm run lint',
      `cd frontend && npx vitest related --run --passWithNoTests ${filePaths}`
    ];
  },
};
