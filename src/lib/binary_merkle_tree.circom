// Refer to:
// https://github.com/appliedzkp/maci/blob/master/circuits/circom/trees/incrementalMerkleTree.circom

include "../../node_modules/circomlib/circuits/mux1.circom";
include "../../node_modules/circomlib/circuits/comparators.circom";
include "poseidon.circom";

template HashLeftRight() {
  signal input left;
  signal input right;

  signal output hash;

  component hasher = Poseidon(2);
  left ==> hasher.inputs[0];
  right ==> hasher.inputs[1];

  hash <== hasher.out;
}

template CalculateRootFromMerklePath(nLevels) {
    signal input leaf;
    signal input pathIndex[nLevels];
    signal input pathElements[nLevels][1];
    signal output root;

    component hashers[nLevels];
    component mux[nLevels];

    signal levelHashes[nLevels + 1];
    levelHashes[0] <== leaf;

    for (var i = 0; i < nLevels; i++) {
        // Should be 0 or 1
        pathIndex[i] * (1 - pathIndex[i]) === 0;

        hashers[i] = HashLeftRight();
        mux[i] = MultiMux1(2);

        mux[i].c[0][0] <== levelHashes[i];
        mux[i].c[0][1] <== pathElements[i][0];

        mux[i].c[1][0] <== pathElements[i][0];
        mux[i].c[1][1] <== levelHashes[i];

        mux[i].s <== pathIndex[i];
        hashers[i].left <== mux[i].out[0];
        hashers[i].right <== mux[i].out[1];

        levelHashes[i + 1] <== hashers[i].hash;
    }

    root <== levelHashes[nLevels];
}

template CheckLeafExists(levels){
  // Ensures that a leaf exists within a merkletree with given `root`

  signal input enabled;

  // levels is depth of tree
  signal input leaf;

  signal private input pathElements[levels][1];
  signal private input pathIndex[levels];

  signal input root;

  component merkletree = CalculateRootFromMerklePath(levels);
  merkletree.leaf <== leaf;
  for (var i = 0; i < levels; i++) {
    merkletree.pathIndex[i] <== pathIndex[i];
    merkletree.pathElements[i][0] <== pathElements[i][0];
  }

  component check = ForceEqualIfEnabled();
  check.enabled <== enabled;
  check.in[0] <== root;
  check.in[1] <== merkletree.root;
}

template CheckLeafUpdate(levels) {
  signal input enabled;
  signal input oldLeaf;
  signal input newLeaf;
  signal private input pathElements[levels][1];
  signal private input pathIndex[levels];
  signal input oldRoot;
  signal input newRoot;
  component oldTree = CheckLeafExists(levels);
  oldTree.enabled <== enabled;
  oldTree.leaf <== oldLeaf;
  // we should implement batch signal assign & constrain later, to avoid the boilerplate code
  for (var i = 0; i < levels; i++) {
    oldTree.pathIndex[i] <== pathIndex[i];
    oldTree.pathElements[i][0] <== pathElements[i][0];
  }
  oldTree.root <== oldRoot;
  component newTree = CheckLeafExists(levels);
  newTree.enabled <== enabled;
  newTree.leaf <== newLeaf;
  for (var i = 0; i < levels; i++) {
    newTree.pathIndex[i] <== pathIndex[i];
    newTree.pathElements[i][0] <== pathElements[i][0];
  }
  newTree.root <== newRoot;
}

template CalculateRootFromLeaves(levels) {
    // Given a Merkle root and a list of leaves, check if the root is the
    // correct result of inserting all the leaves into the tree (in the given
    // order)

    // Circom has some perticularities which limit the code patterns we can
    // use.

    // You can only assign a value to a signal once.

    // A component's input signal must only be wired to another component's output
    // signal.

    // Variables are only used for loops, declaring sizes of things, and anything
    // that is not related to inputs of a circuit.

    // The total number of leaves
    var totalLeaves = 2 ** levels;

    // The number of HashLeftRight components which will be used to hash the
    // leaves
    var numLeafHashers = totalLeaves / 2;

    // The number of HashLeftRight components which will be used to hash the
    // output of the leaf hasher components
    var numIntermediateHashers = numLeafHashers - 1;

    // Inputs to the snark
    signal private input leaves[totalLeaves];

    // The output
    signal output root;

    // The total number of hashers
    var numHashers = totalLeaves - 1;
    component hashers[numHashers];

    // Instantiate all hashers
    var i;
    for (i=0; i < numHashers; i++) {
        hashers[i] = HashLeftRight();
    }

    // Wire the leaf values into the leaf hashers
    for (i=0; i < numLeafHashers; i++){
        hashers[i].left <== leaves[i*2];
        hashers[i].right <== leaves[i*2+1];
    }

    // Wire the outputs of the leaf hashers to the intermediate hasher inputs
    var k = 0;
    for (i=numLeafHashers; i<numLeafHashers + numIntermediateHashers; i++) {
        hashers[i].left <== hashers[k*2].hash;
        hashers[i].right <== hashers[k*2+1].hash;
        k++;
    }

    // Wire the output of the final hash to this circuit's output
    root <== hashers[numHashers-1].hash;
}

template CalculateRootFromRepeatedLeaves(nLevels) {
    signal input leaf;
    signal output root;

    component hashers[nLevels];
    for (var i = 0; i < nLevels; i++) {
        hashers[i] = HashLeftRight();
    }

    hashers.left <== leaf;
    hashers.right <== leaf;

    for (var i = 1; i < nLevels; i++) {
        hashers[i].left <== hashers[i-1].hash;
        hashers[i].right <== hashers[i-1].hash;
    }

    root <== hashers[nLevels-1].hash;
}
