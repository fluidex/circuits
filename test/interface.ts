interface TestComponent {
  src: string;
  main: string;
}
interface SimpleTest {
  getTestData(): Array<{ name: string; input: object; output?: object }>;
  getComponent(): TestComponent;
}

export { TestComponent, SimpleTest };
