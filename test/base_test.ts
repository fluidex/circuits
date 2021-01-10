interface TestComponent {
  src: string;
  main: string;
}
interface SimpleTest {
  getInput();
  getOutput();
  getComponent(): TestComponent;
}

export { TestComponent, SimpleTest };
