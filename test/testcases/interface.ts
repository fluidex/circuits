interface TestComponent {
  src: string;
  main: string;
}
interface SimpleTest {
  getTestData(): Array<{ name: string; input: any; output?: any }>;
  getComponent(): TestComponent;
}

export { TestComponent, SimpleTest };
