const { AwsCdkTypeScriptApp, DependenciesUpgradeMechanism } = require('projen');

const AUTOMATION_TOKEN = 'PROJEN_GITHUB_TOKEN';

const project = new AwsCdkTypeScriptApp({
  cdkVersion: '1.77.0',
  name: 'fargate-global',
  authorName: 'Pahud Hsieh',
  authorEmail: 'pahudnet@gmail.com',
  repository: 'https://github.com/pahud/fargate-global.git',
  depsUpgrade: DependenciesUpgradeMechanism.githubWorkflow({
    workflowOptions: {
      labels: ['auto-approve', 'auto-merge'],
      secret: AUTOMATION_TOKEN,
    },
  }),
  autoApproveOptions: {
    secret: 'GITHUB_TOKEN',
    allowedUsernames: ['pahud'],
  },
  cdkDependencies: [
    '@aws-cdk/aws-certificatemanager',
    '@aws-cdk/aws-ec2',
    '@aws-cdk/aws-ecs',
    '@aws-cdk/aws-ecs-patterns',
    '@aws-cdk/aws-globalaccelerator',
    '@aws-cdk/aws-globalaccelerator-endpoints',
    '@aws-cdk/aws-elasticloadbalancingv2',
    '@aws-cdk/aws-route53',
    '@aws-cdk/aws-route53-patterns',
    '@aws-cdk/aws-route53-targets',
    '@aws-cdk/core',
  ],
  deps: ['cdk-remote-stack'],
  defaultReleaseBranch: 'main',
});

const common_exclude = ['cdk.context.json', 'docker-compose.yml', 'yarn-error.log'];
project.npmignore.exclude(...common_exclude);
project.gitignore.exclude(...common_exclude);

project.synth();
