
function initTestCase() {
  
}

let test_case = initTestCase();
class TestPlaceOrder implements SimpleTest {
  getInput() {
    let input = {
      txsType: test_case.txsType,
      encodedTxs: test_case.encodedTxs,
      balance_path_elements: test_case.balance_path_elements,
      order_path_elements: test_case.order_path_elements,
      account_path_elements: test_case.account_path_elements,
      orderRoots: test_case.orderRoots,
      oldAccountRoots: test_case.oldAccountRoots,
      newAccountRoots: test_case.newAccountRoots,
    };
    //console.log(JSON.stringify(input, null, 2));
    return input;
  }
  getOutput() {
    return {};
  }
  getComponent(): TestComponent {
    return {
      src: path.join(__dirname, '..', 'src', 'block.circom'),
      main: `Block(${nTxs}, ${balanceLevels}, ${orderLevels}, ${accountLevels})`,
    };
  }
}

export { TestPlaceOrder };
