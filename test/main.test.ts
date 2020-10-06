import '@aws-cdk/assert/jest';
import { Main } from '../src/main';

test('Snapshot', () => {
  const main = new Main();

  main.stack.forEach(s => {
    expect(main.app.synth().getStackArtifact(s.artifactId).template).toMatchSnapshot();
  });
});
