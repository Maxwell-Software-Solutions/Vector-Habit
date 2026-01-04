export default function (plop) {
  // React Component (Client or Server)
  plop.setGenerator('component', {
    description: 'Create a new React component',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Component name (PascalCase):',
      },
      {
        type: 'list',
        name: 'type',
        message: 'Component type:',
        choices: ['client', 'server'],
        default: 'server',
      },
      {
        type: 'confirm',
        name: 'withTest',
        message: 'Include test file?',
        default: true,
      },
    ],
    actions: (data) => {
      const actions = [
        {
          type: 'add',
          path: 'components/{{pascalCase name}}.tsx',
          templateFile: 'plop-templates/component.hbs',
        },
      ];

      if (data.withTest) {
        actions.push({
          type: 'add',
          path: 'components/{{pascalCase name}}.test.tsx',
          templateFile: 'plop-templates/component.test.hbs',
        });
      }

      return actions;
    },
  });

  // GraphQL Resolver
  plop.setGenerator('resolver', {
    description: 'Create a new GraphQL resolver',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Resolver name (camelCase):',
      },
      {
        type: 'list',
        name: 'type',
        message: 'Resolver type:',
        choices: ['Query', 'Mutation'],
      },
    ],
    actions: [
      {
        type: 'add',
        path: 'lib/graphql/resolvers/{{camelCase name}}.ts',
        templateFile: 'plop-templates/resolver.hbs',
      },
    ],
  });

  // API Route
  plop.setGenerator('api-route', {
    description: 'Create a new API route',
    prompts: [
      {
        type: 'input',
        name: 'path',
        message: 'API route path (e.g., users/profile):',
      },
    ],
    actions: [
      {
        type: 'add',
        path: 'app/api/{{path}}/route.ts',
        templateFile: 'plop-templates/api-route.hbs',
      },
      {
        type: 'add',
        path: 'app/api/{{path}}/route.test.ts',
        templateFile: 'plop-templates/api-route.test.hbs',
      },
    ],
  });

  // Playwright E2E Test
  plop.setGenerator('e2e-test', {
    description: 'Create a new Playwright E2E test',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Test name (kebab-case):',
      },
    ],
    actions: [
      {
        type: 'add',
        path: 'tests/e2e/{{kebabCase name}}.spec.ts',
        templateFile: 'plop-templates/e2e-test.hbs',
      },
    ],
  });
}
