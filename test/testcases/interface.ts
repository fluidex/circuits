interface TestComponent {
  src: string;
  main: string;

  // https://docs.circom.io/circom-language/signals/
  // like ['in1', 'in2']
  // component main {public [in1,in2]} = Multiplier2();
  //public: Array<string>;
}
interface SimpleTest {
  getTestData(): Array<{ name: string; input: any; output?: any }>;
  getComponent(): TestComponent;
}

export { TestComponent, SimpleTest };
