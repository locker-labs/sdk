// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../../src/plugins/split/SplitPlugin.sol";
import "forge-std/Vm.sol";

// Minimal ERC20 mock to simulate token behavior
contract MockERC20 is IERC20 {
    string public name = "Mock Token";
    string public symbol = "MCK";
    uint8 public decimals = 18;
    uint256 public totalSupply;
    mapping(address => uint256) internal balances;
    mapping(address => mapping(address => uint256)) internal allowances;

    function mint(address to, uint256 amount) external {
        totalSupply += amount;
        balances[to] += amount;
    }

    function balanceOf(address account) external view override returns (uint256) {
        return balances[account];
    }

    function transfer(address to, uint256 amount) external override returns (bool) {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        balances[to] += amount;
        return true;
    }

    function allowance(address owner, address spender) external view override returns (uint256) {
        return allowances[owner][spender];
    }

    function approve(address spender, uint256 amount) external override returns (bool) {
        allowances[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external override returns (bool) {
        require(balances[from] >= amount, "Insufficient balance");
        require(allowances[from][msg.sender] >= amount, "Allowance exceeded");
        balances[from] -= amount;
        allowances[from][msg.sender] -= amount;
        balances[to] += amount;
        return true;
    }
}

contract MockERC20Fail is IERC20 {

    string public name = "Mock Fail Token";
    string public symbol = "MCKF";
    uint8 public decimals = 18;
     uint256 public totalSupply;
    mapping(address => uint256) internal balances;
    mapping(address => mapping(address => uint256)) internal allowances;

    function mint(address to, uint256 amount) external {
        totalSupply += amount;
        balances[to] += amount;
    }

    function balanceOf(address account) external view override returns (uint256) {
        return balances[account];
    }

    function transfer(address to, uint256 amount) external override returns (bool) {
        revert("Transfer failed");
    }

    function allowance(address owner, address spender) external view override returns (uint256) {
        return allowances[owner][spender];
    }

    function approve(address spender, uint256 amount) external override returns (bool) {
        allowances[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external override returns (bool) {
        require(balances[from] >= amount, "Insufficient balance");
        require(allowances[from][msg.sender] >= amount, "Allowance exceeded");
        balances[from] -= amount;
        allowances[from][msg.sender] -= amount;
        balances[to] += amount;
        return true;
    }
}
// A minimal executor contract that implements IPluginExecutor
contract TestExecutor is IPluginExecutor {
    event Executed(address token, uint256 value, bytes data);
    SplitPlugin public plugin;

    constructor(SplitPlugin _plugin) {
        plugin = _plugin;
    }

    // This function is called from the plugin's split() function.
    function executeFromPluginExternal(address target, uint256 value, bytes calldata data) external payable override returns (bytes memory) {
        (bool success, ) = target.call(data);
        require(success, "Execution failed");
        emit Executed(target, value, data);
    }

    // Helper to call the plugin.split() function from this contract.
    function callSplit(uint256 configIndex) public {
        plugin.split(configIndex);
    }
    function executeFromPlugin(bytes calldata data) external payable override returns (bytes memory){
        // This function is not used in this test, but must be implemented.
        revert("Not implemented");
    }

}

contract SplitPluginTest is Test {
    SplitPlugin public splitPlugin;
    MockERC20 public token;
    TestExecutor public executor;
    address public user = address(0x1);

    function setUp() public {
        // Deploy the SplitPlugin contract.
        splitPlugin = new SplitPlugin();
        // Deploy the Mock ERC20 token.
        token = new MockERC20();
        // Deploy the executor contract with the SplitPlugin.
        executor = new TestExecutor(splitPlugin);

        // Label addresses for clarity during tests.
        vm.label(user, "User");
        vm.label(address(splitPlugin), "SplitPlugin");
        vm.label(address(token), "Token");
        vm.label(address(executor), "Executor");
    }

    function testCreateSplit() public {
        // Simulate a call from the user.
        vm.prank(user);
        address[] memory recipients = new address[](2);
        uint32[] memory percentages =  new uint32[](2);
        recipients[0] = address(0x100);
        recipients[1] = address(0x101);

        percentages[0] = 50000000;
        percentages[1] = 50000000;

        // Expect an event to be emitted.
        vm.expectEmit(true, false, false, true);
        emit SplitPlugin.SplitConfigCreated(user, 0);
        splitPlugin.createSplit(address(token), recipients, percentages);

        // Verify the configuration.
        (
            address tokenAddr,
            address[] memory addrs,
            uint32[] memory percs,
            uint256 minAmount,
            bool isEnabled
        ) = splitPlugin.getSplitConfig(0);
        uint256 tokenAmount = 100_000_000/50000000;
        assertEq(tokenAddr, address(token));
        assertEq(addrs.length, 2);
        assertEq(minAmount, tokenAmount);
        assertEq(percs[0], 50000000);
        assertTrue(isEnabled);
    }


    function testCreateSplitRevertsInvalidPercentages() public {
        vm.prank(user);
        address [] memory recipients = new address[](2);
        uint32 [] memory percentages = new uint32[](2);

        recipients[0] = address(0x100);
        recipients[1] = address(0x101);
    
        percentages[0] = 50000000;
        percentages[1] = 40000000;
    
        vm.expectRevert("SplitPlugin: Invalid percentages");
        splitPlugin.createSplit(address(token), recipients, percentages);
    }

    function testCreateSplitRevertsInvalidConfig() public {
        vm.prank(user);
        address [] memory recipients = new address[](2);
        uint32 [] memory percentages = new uint32[](1);

        recipients[0] = address(0x100);
        recipients[1] = address(0x101);
    
        percentages[0] = 100_000_000;
    
        vm.expectRevert("SplitPlugin: Number of split addresses and percentages must be the same");
        splitPlugin.createSplit(address(token), recipients, percentages);
    }


    function testToggleIsSplitEnabled() public {
        vm.prank(user);
        address[] memory recipients = new address[](1);
        uint32[] memory percentages = new uint32[](1);
        recipients[0] = address(0x200);
        percentages[0] = 100000000;
        splitPlugin.createSplit(address(token), recipients, percentages);

        vm.prank(user);
        vm.expectEmit(true, false, false, true);
        emit SplitPlugin.AutomationSwitched(0, false);
        splitPlugin.toggleIsSplitEnabled(0);

        (, , , , bool isEnabled) = splitPlugin.getSplitConfig(0);
        assertFalse(isEnabled);

        vm.prank(user);
        vm.expectEmit(true, false, false, true);
        emit SplitPlugin.AutomationSwitched(0, true);
        splitPlugin.toggleIsSplitEnabled(0);
        (, , , , isEnabled) = splitPlugin.getSplitConfig(0);
        assertTrue(isEnabled);
    }

    function testUpdateSplitConfig() public {
        vm.prank(user);
        address[] memory recipients =  new address[](2);
        uint32[] memory percentages =  new uint32[](2);
        recipients[0] = address(0x300);
        recipients[1] = address(0x301);
        percentages[0] = 40000000;
        percentages[1] = 60000000;
        splitPlugin.createSplit(address(token), recipients, percentages);

        address[] memory newRecipients =  new address[](2);
        uint32[] memory newPercentages =  new uint32[](2);
        newRecipients[0] = address(0x302);
        newRecipients[1] = address(0x303);

        newPercentages[0] = 70000000;
        newPercentages[1] = 30000000;

        vm.prank(user);
        splitPlugin.updateSplitConfig(0, newRecipients, newPercentages);

        (, address[] memory updatedRecipients, uint32[] memory updatedPercentages, ,) = splitPlugin.getSplitConfig(0);
        assertEq(updatedRecipients[0], address(0x302));
        assertEq(updatedPercentages[0], 70000000);
    }

    function testDeleteSplitConfig() public {
        vm.prank(user);
        address[] memory recipients =  new address[](1);
        uint32[] memory percentages =  new uint32[](1);
        recipients[0] = address(0x400);
        percentages[0] = 100000000;
        splitPlugin.createSplit(address(token), recipients, percentages);

        uint256[] memory indexes = splitPlugin.getSplitIndexes(user);
        assertEq(indexes.length, 1);

        vm.prank(user);
        vm.expectEmit(true, false, false, true);
        emit SplitPlugin.SplitConfigDeleted(0);
        splitPlugin.deleteSplitConfig(0);

        indexes = splitPlugin.getSplitIndexes(user);
        assertEq(indexes.length, 0);
    }

    function testSplitExecution() public {
        vm.prank(user);
        address[] memory recipients =  new address[](2);
        uint32[] memory percentages =  new uint32[](2);

        recipients[0] = address(0x500);
        recipients[1] = address(0x501);
        percentages[0] = 50000000;
        percentages[1] = 50000000;
        splitPlugin.createSplit(address(token), recipients, percentages);

        uint256 mintAmount = 1000 ether;
        token.mint(address(executor), mintAmount);

        uint256 initialBalance1 = token.balanceOf(address(0x500));
        uint256 initialBalance2 = token.balanceOf(address(0x501));

        executor.callSplit(0);

        uint256 expectedAmount = mintAmount * 5000000 / 10000000;
        uint256 finalBalance1 = token.balanceOf(address(0x500));
        uint256 finalBalance2 = token.balanceOf(address(0x501));

        assertEq(finalBalance1 - initialBalance1, expectedAmount);
        assertEq(finalBalance2 - initialBalance2, expectedAmount);
    }

    function testPostExecutionHookGasUsage() public {
     uint8 MAX_TOKEN_CONFIGS = 10;
    uint8 MAX_SPLIT_RECEIPIENTS = 10;
     uint32 MAX_PERCENTAGE = 100000000; 
    
    MockERC20[] memory newTokens = new MockERC20[](MAX_TOKEN_CONFIGS);
    address[] memory recipients = new address[](MAX_SPLIT_RECEIPIENTS);
        uint32[] memory percentages = new uint32[](MAX_SPLIT_RECEIPIENTS);

        for(uint8 i =0 ; i < MAX_SPLIT_RECEIPIENTS; i++){
            recipients[i] = address(uint160(0x600 + i));
            percentages[i] = MAX_PERCENTAGE/MAX_SPLIT_RECEIPIENTS; 
        }

    for (uint8 i = 0; i < MAX_TOKEN_CONFIGS; i++) {
        MockERC20 newToken = new MockERC20();
        newTokens[i] = newToken;
        

        vm.prank(address(executor));
        splitPlugin.createSplit(address(newToken), recipients, percentages);

        newToken.mint(address(executor), 1000 ether);
    }
    
    vm.prank(address(executor));
    uint256 gasBefore = gasleft();
    splitPlugin.postExecutionHook(0, "");
    uint256 gasAfter = gasleft();
    uint256 gasUsed = gasBefore - gasAfter;
    
    uint256 gasThreshold = 30_000_000/2; // 50% of threshold 
    assertLt(gasUsed, gasThreshold);

    uint256 expectedPerRecipient = 1000 ether / MAX_SPLIT_RECEIPIENTS;
    for (uint8 j = 0; j < MAX_SPLIT_RECEIPIENTS; j++) {
        assertEq(
            newTokens[j].balanceOf(recipients[j]),
            expectedPerRecipient,
            "recipient balance wrong"
        );
    }

    assertEq(
        newTokens[0].balanceOf(address(executor)),
        0,
        "executor should have zero left"
    );
}

    function testPostExecutionHookHandlesFailures() public {
        MockERC20Fail badToken = new MockERC20Fail();
        address[] memory recipientsFail = new address[](1);
        uint32[] memory percFail = new uint32[](1);
        recipientsFail[0] = address(0x700);
        percFail[0] = 100_000_000;  // 100%
        vm.prank(address(executor));
        splitPlugin.createSplit(address(badToken), recipientsFail, percFail);
        vm.stopPrank();
        badToken.mint(address(executor), 1_000 ether);

        MockERC20 goodToken = new MockERC20();
        address [] memory recipientsGood = new address[](2);
        uint32 [] memory percGood = new uint32[](2);
        recipientsGood[0] = address(0x800);
        recipientsGood[1] = address(0x801);
        percGood[0]       = 50_000_000;  // 50%
        percGood[1]       = 50_000_000;  // 50%
        vm.prank(address(executor));
        splitPlugin.createSplit(address(goodToken), recipientsGood, percGood);
        vm.stopPrank();
        goodToken.mint(address(executor), 1_000 ether);

        

        vm.prank(address(executor));
        splitPlugin.postExecutionHook(0, "");
        vm.prank(address(executor));


        assertEq(badToken.balanceOf(recipientsFail[0]), 0, "Bad-token recipient got nothing");
        assertEq(badToken.balanceOf(address(executor)), 1_000 ether, "Executor kept full bad-token balance");

        uint256 expected = (1_000 ether * 50_000_000) / 100_000_000;
        require(goodToken.balanceOf(recipientsGood[0]) > 0, "Good-token recipient got nothing");
        assertEq(
            goodToken.balanceOf(recipientsGood[1]),
            expected,
            "Good-token recipient got wrong amount"
        );
    }
}
